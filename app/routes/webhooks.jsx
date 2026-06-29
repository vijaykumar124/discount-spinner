import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);

  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        // Clean up shop data on uninstall
        try {
          const { prisma } = await import("../db.server");
          await prisma.spinnerConfig.deleteMany({ where: { shop } });
        } catch (err) {
          console.error("[Webhook] Failed to cleanup on uninstall:", err.message);
        }
      }
      break;
    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  return json({ received: true });
};
