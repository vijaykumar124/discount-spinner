import { json } from "@remix-run/node";
import { getSpinnerConfig } from "../models/spinnerConfig.server";

// Rate limiting store (in-memory, per-session)
// TODO(security): Replace with Redis-based rate limiting for production horizontal scaling
const submitCooldowns = new Map();
const COOLDOWN_MS = 30000; // 30 seconds between submissions per session

/**
 * POST /api/klaviyo-subscribe
 * Body: { shop, email, sessionId, discountCode, productLabel }
 * Subscribes email to Klaviyo list server-side.
 * Klaviyo API key is NEVER exposed to the client.
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

  const { shop, email, sessionId, discountCode, productLabel } = body;

  // Validate inputs
  if (!shop || typeof shop !== "string" || !/^[a-zA-Z0-9-]+\.myshopify\.com$/.test(shop)) {
    return json({ error: "Invalid shop" }, { status: 400 });
  }

  if (!email || typeof email !== "string") {
    return json({ error: "Email is required" }, { status: 400 });
  }

  // Validate email format
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegex.test(email) || email.length > 254) {
    return json({ error: "Invalid email address" }, { status: 400 });
  }

  // Rate limiting per session
  if (sessionId && typeof sessionId === "string") {
    const key = `${shop}:${sessionId}`;
    const lastSubmit = submitCooldowns.get(key);
    if (lastSubmit && Date.now() - lastSubmit < COOLDOWN_MS) {
      return json({ error: "Please wait before submitting again" }, { status: 429 });
    }
    submitCooldowns.set(key, Date.now());
    // Cleanup old entries to prevent memory leak
    if (submitCooldowns.size > 10000) {
      const now = Date.now();
      for (const [k, v] of submitCooldowns.entries()) {
        if (now - v > COOLDOWN_MS) submitCooldowns.delete(k);
      }
    }
  }

  try {
    const config = await getSpinnerConfig(shop);

    if (!config.klaviyoApiKey || !config.klaviyoListId) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[Klaviyo Dev Mode] Klaviyo not configured. Bypassing to allow testing. Logged: ${email}`);
        return json({ success: true });
      }
      return json({ error: "Klaviyo not configured for this shop" }, { status: 503 });
    }

    // Call Klaviyo API v2024-02 server-side
    const klaviyoResponse = await fetch(
      `https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/`,
      {
        method: "POST",
        headers: {
          "Authorization": `Klaviyo-API-Key ${config.klaviyoApiKey}`,
          "Content-Type": "application/json",
          "revision": "2024-02-15",
        },
        body: JSON.stringify({
          data: {
            type: "profile-subscription-bulk-create-job",
            attributes: {
              profiles: {
                data: [
                  {
                    type: "profile",
                    attributes: {
                      email: email,
                      // ✅ CRITICAL: Without this, Klaviyo won't mark the profile as
                      // subscribed and your Flow (offer email) will never trigger.
                      subscriptions: {
                        email: {
                          marketing: {
                            consent: "SUBSCRIBED",
                          },
                        },
                      },
                      properties: {
                        // Store contextual spin data as profile properties
                        discount_spinner_code: discountCode ? String(discountCode).slice(0, 30) : null,
                        discount_spinner_product: productLabel ? String(productLabel).slice(0, 50) : null,
                        discount_spinner_source: "popup_widget",
                        last_spin_discount_code: discountCode ? String(discountCode).slice(0, 30) : null,
                      },
                    },
                  },
                ],
              },
              historical_import: false,
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
        }),
      }
    );

    if (!klaviyoResponse.ok) {
      const errorText = await klaviyoResponse.text();
      // Log error without exposing API key or raw Klaviyo error to client
      console.error(`[Klaviyo] Subscription failed for shop ${shop}: HTTP ${klaviyoResponse.status}`);
      return json({ error: "Email subscription failed. Please try again." }, { status: 502 });
    }

    // Call Klaviyo Events API to track the 'Spun Discount Spinner' metric
    try {
      await fetch(
        `https://a.klaviyo.com/api/events/`,
        {
          method: "POST",
          headers: {
            "Authorization": `Klaviyo-API-Key ${config.klaviyoApiKey}`,
            "Content-Type": "application/json",
            "revision": "2024-02-15",
          },
          body: JSON.stringify({
            data: {
              type: "event",
              attributes: {
                properties: {
                  discount_code: discountCode ? String(discountCode).slice(0, 30) : null,
                  product_reward: productLabel ? String(productLabel).slice(0, 50) : null,
                  source: "popup_widget",
                },
                metric: {
                  data: {
                    type: "metric",
                    attributes: {
                      name: "Claimed Discount Spinner",
                    },
                  },
                },
                profile: {
                  data: {
                    type: "profile",
                    attributes: {
                      email: email,
                    },
                  },
                },
              },
            },
          }),
        }
      );
    } catch (eventErr) {
      // Log event error but don't fail the request since list subscription succeeded
      console.error(`[Klaviyo] Event tracking failed for shop ${shop}:`, eventErr.message);
    }

    return json({ success: true });
  } catch (err) {
    console.error("[Klaviyo] Unexpected error:", err.message);
    return json({ error: "Internal server error" }, { status: 500 });
  }
};

// GET not allowed
export const loader = async () => {
  return json({ error: "Method not allowed" }, { status: 405 });
};
