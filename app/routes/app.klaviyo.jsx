import { json } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, Button, Banner,
  TextField, FormLayout, Badge,
} from "@shopify/polaris";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import { getSpinnerConfig, updateSpinnerConfig } from "../models/spinnerConfig.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const config = await getSpinnerConfig(session.shop);
  return json({
    klaviyoApiKey: config.klaviyoApiKey,
    klaviyoListId: config.klaviyoListId,
  });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  try {
    const klaviyoApiKey = String(formData.get("klaviyoApiKey") || "").trim().slice(0, 100);
    const klaviyoListId = String(formData.get("klaviyoListId") || "").trim().slice(0, 50);

    // Basic format validation
    if (klaviyoApiKey && !klaviyoApiKey.startsWith("pk_")) {
      return json({ error: "Klaviyo API key should start with 'pk_'" }, { status: 400 });
    }

    await updateSpinnerConfig(session.shop, { klaviyoApiKey, klaviyoListId });
    return json({ success: true });
  } catch (err) {
    return json({ error: "Failed to save Klaviyo settings" }, { status: 500 });
  }
};

export default function KlaviyoSettings() {
  const { klaviyoApiKey, klaviyoListId } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";

  const [apiKey, setApiKey] = useState(klaviyoApiKey || "");
  const [listId, setListId] = useState(klaviyoListId || "");

  const isConnected = !!klaviyoApiKey && !!klaviyoListId;

  return (
    <Page
      title="Klaviyo Integration"
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Layout>
        {actionData?.error && (
          <Layout.Section>
            <Banner tone="critical" title="Error">{actionData.error}</Banner>
          </Layout.Section>
        )}
        {actionData?.success && (
          <Layout.Section>
            <Banner tone="success" title="Klaviyo settings saved! Email collection is active." />
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd" as="h2">📧 Klaviyo Connection</Text>
                <Badge tone={isConnected ? "success" : "warning"}>
                  {isConnected ? "Connected" : "Not Connected"}
                </Badge>
              </InlineStack>

              <Form method="post">
                <FormLayout>
                  <TextField
                    label="Klaviyo Private API Key"
                    name="klaviyoApiKey"
                    type="password"
                    value={apiKey}
                    onChange={setApiKey}
                    helpText="Your Klaviyo Private API Key (starts with pk_). Found in Klaviyo → Account → API Keys."
                    autoComplete="off"
                  />
                  <TextField
                    label="Klaviyo List ID"
                    name="klaviyoListId"
                    value={listId}
                    onChange={setListId}
                    helpText="The ID of the Klaviyo list to subscribe customers to. Found in Klaviyo → Lists → click your list → Settings."
                    autoComplete="off"
                  />
                  <Button variant="primary" submit loading={isSaving}>
                    {isSaving ? "Saving..." : "Save Klaviyo Settings"}
                  </Button>
                </FormLayout>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">🔒 Security Note</Text>
              <Text variant="bodyMd">
                Your Klaviyo API key is <strong>never</strong> exposed to customers or included in the
                storefront widget code. Email subscriptions are processed server-side through our secure API endpoint.
              </Text>
              <Text variant="headingMd" as="h2">📋 How to find your List ID</Text>
              <Text variant="bodyMd">
                1. Log in to Klaviyo → Go to <strong>Lists &amp; Segments</strong>
              </Text>
              <Text variant="bodyMd">
                2. Click the list you want to use → Click <strong>Settings</strong>
              </Text>
              <Text variant="bodyMd">
                3. Copy the List ID shown (e.g. <code>ABC123</code>)
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
