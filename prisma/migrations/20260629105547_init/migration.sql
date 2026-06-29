-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false
);

-- CreateTable
CREATE TABLE "SpinnerConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "popupTitle" TEXT NOT NULL DEFAULT 'Get 25% Off + Gift',
    "popupSubtitle" TEXT NOT NULL DEFAULT 'Join 10,000+ happy customers',
    "triggerDelay" INTEGER NOT NULL DEFAULT 3,
    "triggerEnabled" BOOLEAN NOT NULL DEFAULT true,
    "discountSegments" TEXT NOT NULL DEFAULT '[{"label":"10% OFF","probability":30,"code":"SPIN10"},{"label":"15% OFF","probability":25,"code":"SPIN15"},{"label":"20% OFF","probability":25,"code":"SPIN20"},{"label":"25% OFF","probability":20,"code":"SPIN25"}]',
    "productSegments" TEXT NOT NULL DEFAULT '[{"label":"Free Shipping","probability":40,"productId":""},{"label":"Free Gift","probability":30,"productId":""},{"label":"Bonus Item","probability":30,"productId":""}]',
    "timerDuration" INTEGER NOT NULL DEFAULT 10,
    "klaviyoApiKey" TEXT NOT NULL DEFAULT '',
    "klaviyoListId" TEXT NOT NULL DEFAULT '',
    "step1Label" TEXT NOT NULL DEFAULT 'SPIN TO PROTECT',
    "step3Label" TEXT NOT NULL DEFAULT 'UNLOCK A BONUS',
    "step5Label" TEXT NOT NULL DEFAULT 'UNLOCK MY OFFER',
    "primaryColor" TEXT NOT NULL DEFAULT '#7c3aed',
    "accentColor" TEXT NOT NULL DEFAULT '#f59e0b',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SpinnerConfig_shop_key" ON "SpinnerConfig"("shop");
