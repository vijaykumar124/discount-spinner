import { json } from "@remix-run/node";
import { prisma } from "../db.server";

/**
 * POST /api/claim-offer
 * Body: { shop, email, discountCode, productLabel, variantId }
 * Saves lead to local DB. Does NOT call Klaviyo.
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
