# 🎰 Discount Spinner — Shopify App

A fully customizable gamified discount popup widget for Shopify stores. Customers spin two wheels to win discounts and product bonuses, then claim their offer via email (Klaviyo integration included).

## Features

- **Multi-step Gamified Popup**
  - Step 1: Intro screen with CTA
  - Step 2: Discount spinner wheel (customizable segments + probabilities)
  - Step 3: Jackpot reveal screen
  - Step 4: Bonus product wheel (second spin)
  - Step 5: Final rewards with countdown timer + Klaviyo email capture
  - Step 6: Success confirmation

- **Admin Backend** (Shopify Embedded App)
  - General settings (text, trigger delay, timer duration)
  - Discount wheel segments editor with probability controls
  - Product wheel segments editor with Shopify product IDs
  - Klaviyo API key + List ID configuration
  - Color theme customization

- **Security**
  - Klaviyo API key stored server-side only, never in client JS
  - Rate limiting on email subscription endpoint
  - Input validation on all admin forms
  - Secure DOM manipulation (no innerHTML with user data)
  - Security headers (X-Content-Type-Options, X-Frame-Options, etc.)

## Setup

### Prerequisites
- Node.js 18+
- Shopify Partner account
- Shopify CLI installed: `npm install -g @shopify/cli`

### 1. Create Shopify App

1. Go to [Shopify Partners](https://partners.shopify.com)
2. Create a new App → Custom App
3. Note your **API Key** and **API Secret**

### 2. Configure Environment

```bash
cp .env.example .env
```

Fill in your `.env`:
```
DATABASE_URL="file:./dev.db"
SHOPIFY_API_KEY="your_actual_api_key"
SHOPIFY_API_SECRET="your_actual_api_secret"
SHOPIFY_APP_URL="https://your-tunnel.trycloudflare.com"
SCOPES="write_products,read_products,write_discounts,read_discounts"
```

### 3. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 4. Setup Database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Run Development Server

```bash
shopify app dev
```

Or without Shopify CLI:
```bash
npm run build
npm run start
```

### 6. Add Widget to Theme

1. In Shopify Admin → Online Store → Themes → Customize
2. Click **"Add section"** or **"Add block"**
3. Find **"Discount Spinner"** and add it
4. Save your theme

## Admin Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/app` | Overview and quick links |
| General Settings | `/app/spinner-settings` | Text, timing, colors |
| Discount Wheel | `/app/discount-segments` | Segments + probabilities |
| Product Wheel | `/app/product-segments` | Product prizes |
| Klaviyo | `/app/klaviyo` | Email integration |

## Klaviyo Setup

1. Go to Klaviyo → Account Settings → API Keys
2. Create a **Private API Key** with "Full Access"
3. Create a List (Lists & Segments → Create List)
4. Copy the **List ID** from its Settings
5. Enter both in the Klaviyo admin page of this app

## Discount Codes

Create discount codes in Shopify Admin → Discounts **before** adding them to the spinner segments. The spinner will display the code to customers after they spin.

## File Structure

```
discount-spinner/
├── app/
│   ├── routes/
│   │   ├── app.jsx              # Shopify App layout
│   │   ├── app._index.jsx       # Dashboard
│   │   ├── app.spinner-settings.jsx
│   │   ├── app.discount-segments.jsx
│   │   ├── app.product-segments.jsx
│   │   ├── app.klaviyo.jsx
│   │   ├── api.spinner-config.jsx    # Public config API
│   │   ├── api.klaviyo-subscribe.jsx # Email subscribe API
│   │   ├── auth.$.jsx
│   │   └── webhooks.jsx
│   ├── models/
│   │   └── spinnerConfig.server.js
│   ├── shopify.server.js
│   ├── db.server.js
│   ├── root.jsx
│   ├── entry.server.jsx
│   └── entry.client.jsx
├── extensions/
│   └── discount-spinner-widget/
│       ├── assets/
│       │   └── spinner-widget.js    # Storefront widget
│       ├── blocks/
│       │   └── spinner-popup.liquid # Liquid block
│       └── shopify.extension.toml
├── prisma/
│   └── schema.prisma
├── shopify.app.toml
├── vite.config.js
└── package.json
```