import { json } from "@remix-run/node";
import { prisma } from "../db.server";
import { getSpinnerConfig } from "../models/spinnerConfig.server";

/**
 * POST /api/claim-offer
 * Body: { shop, email, discountCode, productLabel, variantId }
 * Saves lead to local DB. Also subscribes to Klaviyo if configured.
 * CORS headers allow storefront to call this directly.
 */
export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, { status: 400 });
  }

  const { shop, email, discountCode, productLabel } = body;

  if (!shop || typeof shop !== "string" || !/^[a-zA-Z0-9-]+\.myshopify\.com$/.test(shop)) {
    return json({ error: "Invalid shop" }, { status: 400 });
  }

  if (!email || typeof email !== "string") {
    return json({ error: "Email required" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || email.length > 254) {
    return json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    await prisma.lead.create({
      data: {
        shop,
        email: email.toLowerCase().trim(),
        discountCode: discountCode ? String(discountCode).slice(0, 30) : "",
        productLabel: productLabel ? String(productLabel).slice(0, 100) : "",
      },
    });

    // ─── Klaviyo Integration ─────────────────────────────────────────────────
    // FIX: The 'subscriptions' field inside profile attributes is INVALID for the
    // profile-subscription-bulk-create-jobs endpoint. That field belongs in PATCH /api/profiles/{id}.
    // Including it in this endpoint's payload causes Klaviyo to create the profile but
    // silently skip the list-subscription step.
    //
    // CORRECT approach: Only pass 'email' in profile.attributes.
    // The endpoint itself IS the subscription action. The list relationship adds them to the list.
    // Custom properties must be set via a separate PATCH call after subscription.
    //
    // Required API Key scopes: Lists (Full), Profiles (Full), Subscriptions (Full)
    try {
      const config = await getSpinnerConfig(shop);
      if (config && config.klaviyoApiKey && config.klaviyoListId) {
        const cleanEmail = email.toLowerCase().trim();

        // ── Step 1: Subscribe to the list ─────────────────────────────────────
        // Only 'email' is valid in profile.attributes for this endpoint.
        // DO NOT include 'subscriptions', 'properties', or any other fields here.
        const subPayload = {
          data: {
            type: "profile-subscription-bulk-create-job",
            attributes: {
              profiles: {
                data: [
                  {
                    type: "profile",
                    attributes: {
                      email: cleanEmail,
                      // ✅ DO NOT add 'subscriptions: { email: { marketing: { consent: ... } } }' here.
                      // That field is for PATCH /api/profiles/{id} only.
                      // This endpoint handles consent implicitly via the list relationship.
                    },
                  },
                ],
              },
              historical_import: false, // false = real-time, respects list opt-in setting
            },
            relationships: {
              list: {
                data: {
                  type: "list",
                  id: config.klaviyoListId,
                },
              },
            },
          },
        };

        console.log(`[Klaviyo] Subscribing ${cleanEmail} to list ${config.klaviyoListId}...`);

        const subRes = await fetch(
          `https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/`,
          {
            method: "POST",
            headers: {
              "Authorization": `Klaviyo-API-Key ${config.klaviyoApiKey}`,
              "Content-Type": "application/json",
              "revision": "2024-10-15", // ✅ Updated from 2024-02-15
            },
            body: JSON.stringify(subPayload),
          }
        );

        // Full response logging for debugging
        const subText = await subRes.text();
        console.log(`[Klaviyo] Subscribe status: ${subRes.status}`);
        if (subText) {
          try {
            const subJson = JSON.parse(subText);
            if (subJson.errors) {
              console.error(`[Klaviyo] Subscribe errors:`, JSON.stringify(subJson.errors, null, 2));
            }
          } catch {
            console.log(`[Klaviyo] Subscribe raw response: ${subText}`);
          }
        }

        if (subRes.status === 202) {
          console.log(`[Klaviyo] ✅ Subscription job accepted for ${cleanEmail} → list ${config.klaviyoListId}`);

          // ── Step 2: Update profile custom properties (separate PATCH call) ──
          // Properties must be set via profile update, NOT inside the subscription job.
          try {
            // First, find or create the profile to get its ID
            const searchRes = await fetch(
              `https://a.klaviyo.com/api/profiles/?filter=equals(email,"${encodeURIComponent(cleanEmail)}")`,
              {
                method: "GET",
                headers: {
                  "Authorization": `Klaviyo-API-Key ${config.klaviyoApiKey}`,
                  "revision": "2024-10-15",
                },
              }
            );

            if (searchRes.ok) {
              const searchData = await searchRes.json();
              const profileId = searchData?.data?.[0]?.id;

              if (profileId) {
                // PATCH the profile to set custom properties
                const patchRes = await fetch(
                  `https://a.klaviyo.com/api/profiles/${profileId}/`,
                  {
                    method: "PATCH",
                    headers: {
                      "Authorization": `Klaviyo-API-Key ${config.klaviyoApiKey}`,
                      "Content-Type": "application/json",
                      "revision": "2024-10-15",
                    },
                    body: JSON.stringify({
                      data: {
                        type: "profile",
                        id: profileId,
                        attributes: {
                          properties: {
                            discount_spinner_code: discountCode ? String(discountCode).slice(0, 30) : null,
                            discount_spinner_product: productLabel ? String(productLabel).slice(0, 50) : null,
                            discount_spinner_source: "popup_widget_claim",
                            last_spin_discount_code: discountCode ? String(discountCode).slice(0, 30) : null,
                          },
                        },
                      },
                    }),
                  }
                );
                console.log(`[Klaviyo] Profile properties updated: ${patchRes.status}`);
              }
            }
          } catch (propErr) {
            // Non-fatal — subscription succeeded even if property update fails
            console.error(`[Klaviyo] Profile property update failed:`, propErr.message);
          }

          // ── Step 3: Track custom event (optional Flow trigger) ────────────
          try {
            const eventRes = await fetch(`https://a.klaviyo.com/api/events/`, {
              method: "POST",
              headers: {
                "Authorization": `Klaviyo-API-Key ${config.klaviyoApiKey}`,
                "Content-Type": "application/json",
                "revision": "2024-10-15",
              },
              body: JSON.stringify({
                data: {
                  type: "event",
                  attributes: {
                    properties: {
                      discount_code: discountCode ? String(discountCode).slice(0, 30) : null,
                      product_reward: productLabel ? String(productLabel).slice(0, 50) : null,
                      source: "popup_widget_claim",
                    },
                    time: new Date().toISOString(),
                    value: 0,
                    metric: {
                      data: {
                        type: "metric",
                        attributes: { name: "Claimed Discount Spinner" },
                      },
                    },
                    profile: {
                      data: {
                        type: "profile",
                        attributes: { email: cleanEmail },
                      },
                    },
                  },
                },
              }),
            });
            console.log(`[Klaviyo] Event tracked: ${eventRes.status}`);
          } catch (eventErr) {
            console.error(`[Klaviyo] Event tracking failed:`, eventErr.message);
          }

        } else {
          console.error(
            `[Klaviyo] ❌ Subscription failed for ${cleanEmail}: HTTP ${subRes.status}\n` +
            `Response: ${subText}\n` +
            `Check: 1) API key has Subscriptions+Lists+Profiles Full Access, 2) List ID "${config.klaviyoListId}" is correct`
          );
        }
      }
    } catch (kErr) {
      console.error("[Klaviyo] Unexpected error during claim:", kErr.message);
    }

    return json({ success: true }, {
      headers: {
        "Access-Control-Allow-Origin": `https://${shop}`,
      },
    });
  } catch (err) {
    console.error("[ClaimOffer] DB error:", err.message);
    return json({ error: "Failed to save lead" }, { status: 500 });
  }
};

export const loader = async () => {
  return json({ error: "Method not allowed" }, { status: 405 });
};
