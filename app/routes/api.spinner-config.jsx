import { json } from "@remix-run/node";
import { getPublicSpinnerConfig } from "../models/spinnerConfig.server";

/**
 * Public endpoint: GET /api/spinner-config?shop=xxx.myshopify.com
 * Returns public spinner configuration (NO klaviyo API key)
 * Used by the storefront widget to fetch settings
 */
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop || typeof shop !== "string") {
    return json({ error: "Missing shop parameter" }, { status: 400 });
  }

  // Validate shop domain format
  if (!/^[a-zA-Z0-9-]+\.myshopify\.com$/.test(shop)) {
    return json({ error: "Invalid shop domain" }, { status: 400 });
  }

  try {
    const config = await getPublicSpinnerConfig(shop);
    return json(config, {
      headers: {
        "Cache-Control": "public, max-age=60",
        "Access-Control-Allow-Origin": `https://${shop}`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return json({ error: "Config not found" }, { status: 404 });
  }
};

// No POST allowed on this route
export const action = async () => {
  return json({ error: "Method not allowed" }, { status: 405 });
};
