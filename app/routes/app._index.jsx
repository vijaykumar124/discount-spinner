import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Banner,
  Badge,
  Divider,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getSpinnerConfig } from "../models/spinnerConfig.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const config = await getSpinnerConfig(session.shop);
  return json({
    shop: session.shop,
    triggerEnabled: config.triggerEnabled,
    hasKlaviyo: !!config.klaviyoApiKey && !!config.klaviyoListId,
  });
};

export default function Index() {
  const { shop, triggerEnabled, hasKlaviyo } = useLoaderData();

  return (
    <Page title="Discount Spinner Dashboard">
      <Layout>
        <Layout.Section>
          <Banner title="Welcome to Discount Spinner! 🎰" tone="success">
            <p>
              Your gamified discount popup is ready to engage customers. Configure the
              spinner below, then add the widget block to your Shopify theme.
            </p>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text variant="headingMd" as="h2">Widget Status</Text>
                  <Badge tone={triggerEnabled ? "success" : "critical"}>
                    {triggerEnabled ? "Active" : "Disabled"}
                  </Badge>
                </InlineStack>
                <Text variant="bodyMd" tone="subdued">
                  Shop: {shop}
                </Text>
                <Divider />
                <InlineStack gap="300">
                  <Button variant="primary" url="/app/spinner-settings">
                    ⚙️ Customize Spinner
                  </Button>
                  <Button url="/app/discount-segments">
                    🎰 Discount Wheel
                  </Button>
                  <Button url="/app/product-segments">
                    🎁 Product Wheel
                  </Button>
                  <Button url="/app/klaviyo" tone={hasKlaviyo ? undefined : "critical"}>
                    📧 {hasKlaviyo ? "Klaviyo ✓" : "Setup Klaviyo"}
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">🚀 Quick Setup Guide</Text>
                <BlockStack gap="200">
                  <Text variant="bodyMd">
                    <strong>Step 1:</strong> Go to <a href="/app/spinner-settings">Spinner Settings</a> to configure the popup text and timing.
                  </Text>
                  <Text variant="bodyMd">
                    <strong>Step 2:</strong> Set up <a href="/app/discount-segments">Discount Wheel</a> segments with probabilities.
                  </Text>
                  <Text variant="bodyMd">
                    <strong>Step 3:</strong> Configure <a href="/app/product-segments">Product Wheel</a> with bonus prizes.
                  </Text>
                  <Text variant="bodyMd">
                    <strong>Step 4:</strong> Add your <a href="/app/klaviyo">Klaviyo API Key</a> for email collection.
                  </Text>
                  <Text variant="bodyMd">
                    <strong>Step 5:</strong> In your Shopify Theme Editor, add the "Discount Spinner" block to your theme.
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
