-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "discountCode" TEXT NOT NULL DEFAULT '',
    "productLabel" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SpinnerConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "popupTitle" TEXT NOT NULL DEFAULT 'Get 25% Off + Gift',
    "popupSubtitle" TEXT NOT NULL DEFAULT 'Join 10,000+ happy customers',
    "triggerDelay" INTEGER NOT NULL DEFAULT 3,
    "triggerEnabled" BOOLEAN NOT NULL DEFAULT true,
    "discountSegments" TEXT NOT NULL DEFAULT '[{"label":"10% OFF","probability":30,"code":"SPIN10"},{"label":"15% OFF","probability":25,"code":"SPIN15"},{"label":"20% OFF","probability":25,"code":"SPIN20"},{"label":"25% OFF","probability":20,"code":"SPIN25"}]',
    "productSegments" TEXT NOT NULL DEFAULT '[{"label":"Free Shipping","probability":40,"productId":"","variantId":"","imageUrl":""},{"label":"Free Gift","probability":30,"productId":"","variantId":"","imageUrl":""},{"label":"Bonus Item","probability":30,"productId":"","variantId":"","imageUrl":""}]',
    "timerDuration" INTEGER NOT NULL DEFAULT 10,
    "klaviyoApiKey" TEXT NOT NULL DEFAULT '',
    "klaviyoListId" TEXT NOT NULL DEFAULT '',
    "step1Label" TEXT NOT NULL DEFAULT 'SPIN TO WIN',
    "step3Label" TEXT NOT NULL DEFAULT 'UNLOCK A BONUS',
    "step5Label" TEXT NOT NULL DEFAULT 'CLAIM MY OFFER',
    "primaryColor" TEXT NOT NULL DEFAULT '#7c3aed',
    "accentColor" TEXT NOT NULL DEFAULT '#f59e0b',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SpinnerConfig" ("accentColor", "createdAt", "discountSegments", "id", "klaviyoApiKey", "klaviyoListId", "popupSubtitle", "popupTitle", "primaryColor", "productSegments", "shop", "step1Label", "step3Label", "step5Label", "timerDuration", "triggerDelay", "triggerEnabled", "updatedAt") SELECT "accentColor", "createdAt", "discountSegments", "id", "klaviyoApiKey", "klaviyoListId", "popupSubtitle", "popupTitle", "primaryColor", "productSegments", "shop", "step1Label", "step3Label", "step5Label", "timerDuration", "triggerDelay", "triggerEnabled", "updatedAt" FROM "SpinnerConfig";
DROP TABLE "SpinnerConfig";
ALTER TABLE "new_SpinnerConfig" RENAME TO "SpinnerConfig";
CREATE UNIQUE INDEX "SpinnerConfig_shop_key" ON "SpinnerConfig"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Lead_shop_idx" ON "Lead"("shop");
