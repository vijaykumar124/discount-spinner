import { prisma } from "~/db.server";

/**
 * Get or create the spinner config for a shop
 * @param {string} shop
 */
export async function getSpinnerConfig(shop) {
  let config = await prisma.spinnerConfig.findUnique({ where: { shop } });
  if (!config) {
    config = await prisma.spinnerConfig.create({ data: { shop } });
  }
  return config;
}

/**
 * Update spinner config for a shop
 * @param {string} shop
 * @param {object} data - validated fields to update
 */
export async function updateSpinnerConfig(shop, data) {
  // Validate input fields before saving
  const allowedFields = [
    "popupTitle", "popupSubtitle", "triggerDelay", "triggerEnabled",
    "discountSegments", "productSegments", "timerDuration",
    "klaviyoApiKey", "klaviyoListId",
    "step1Label", "step3Label", "step5Label",
    "primaryColor", "accentColor",
  ];

  const sanitized = {};
  for (const key of allowedFields) {
    if (data[key] !== undefined) {
      // Validate string lengths to prevent overflow
      if (typeof data[key] === "string" && data[key].length > 5000) {
        throw new Error(`Field ${key} exceeds maximum length`);
      }
      sanitized[key] = data[key];
    }
  }

  return prisma.spinnerConfig.upsert({
    where: { shop },
    update: sanitized,
    create: { shop, ...sanitized },
  });
}

/**
 * Get public-safe config (excludes Klaviyo API key)
 * @param {string} shop
 */
export async function getPublicSpinnerConfig(shop) {
  const config = await getSpinnerConfig(shop);
  const { klaviyoApiKey: _excluded, ...publicConfig } = config;
  return publicConfig;
}
