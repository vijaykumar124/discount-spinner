import { json } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation, useFetcher } from "@remix-run/react";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, Button, Banner,
  TextField, FormLayout, Badge, Spinner, Box, Divider,
} from "@shopify/polaris";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import { getSpinnerConfig, updateSpinnerConfig } from "../models/spinnerConfig.server";

// ─── Server: Loader ──────────────────────────────────────────────────────────

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const config = await getSpinnerConfig(session.shop);
  return json({
    klaviyoApiKey: config.klaviyoApiKey || "",
    klaviyoListId: config.klaviyoListId || "",
  });
};

// ─── Server: Action (Save & Test) ────────────────────────────────────────────

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("_action");

  // ── TEST: Try a real Klaviyo API call ──
  if (intent === "test") {
    const apiKey = String(formData.get("klaviyoApiKey") || "").trim().slice(0, 100);
    const listId = String(formData.get("klaviyoListId") || "").trim().slice(0, 50);

    if (!apiKey) return json({ testError: "Please enter your Klaviyo Private API Key." });
    if (!listId) return json({ testError: "Please enter your Klaviyo List ID." });

    if (!apiKey.startsWith("pk_")) {
      return json({ testError: "Private API Keys must start with 'pk_'." });
    }

    try {
      // Test 1: Verify API Key by fetching lists
      const res = await fetch(`https://a.klaviyo.com/api/lists/${listId}/`, {
        method: "GET",
        headers: {
          "Authorization": `Klaviyo-API-Key ${apiKey}`,
          "revision": "2024-02-15",
          "accept": "application/json"
        }
      });

      if (res.ok) {
        return json({ testSuccess: true, listId });
      }
      if (res.status === 401 || res.status === 403) {
        return json({ testError: "❌ Invalid Private API Key. Make sure you copied it correctly." });
      }
      if (res.status === 404) {
        return json({ testError: "❌ List not found. Double-check your List ID in Klaviyo." });
      }
      
      const errText = await res.text().catch(() => "");
      console.error(`[Klaviyo Test] HTTP ${res.status}:`, errText);
      return json({ testError: `Klaviyo returned HTTP ${res.status}. Check your credentials.` });
    } catch (err) {
      console.error("[Klaviyo Test] Network error:", err.message);
      return json({ testError: "Could not reach Klaviyo. Check your internet connection." });
    }
  }

  // ── SAVE ──
  try {
    const klaviyoApiKey = String(formData.get("klaviyoApiKey") || "").trim().slice(0, 100);
    const klaviyoListId = String(formData.get("klaviyoListId") || "").trim().slice(0, 50);
    await updateSpinnerConfig(session.shop, { klaviyoApiKey, klaviyoListId });
    return json({ success: true });
  } catch (err) {
    return json({ error: "Failed to save Klaviyo settings. Please try again." }, { status: 500 });
  }
};

// ─── Client: Component ───────────────────────────────────────────────────────

export default function KlaviyoSettings() {
  const { klaviyoApiKey, klaviyoListId } = useLoaderData();
  const actionData  = useActionData();
  const navigation  = useNavigation();
  const isSaving    = navigation.state === "submitting" && navigation.formData?.get("_action") === "save";

  const testFetcher = useFetcher();
  const isTesting   = testFetcher.state === "submitting" && testFetcher.formData?.get("_action") === "test";
  const testResult  = testFetcher.data;

  const [apiKey, setApiKey] = useState(klaviyoApiKey || "");
  const [listId, setListId] = useState(klaviyoListId || "");

  const isConnected = !!klaviyoApiKey && !!klaviyoListId;

  return (
    <Page
      title="Klaviyo Integration"
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Layout>
        {/* Banners */}
        {actionData?.error && (
          <Layout.Section>
            <Banner tone="critical" title="Error saving settings">
              <p>{actionData.error}</p>
            </Banner>
          </Layout.Section>
        )}
        {actionData?.success && (
          <Layout.Section>
            <Banner tone="success" title="✅ Klaviyo settings saved! Email collection is now active." />
          </Layout.Section>
        )}

        {/* Main Card */}
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="headingMd" as="h2">📧 Klaviyo Connection</Text>
                <Badge tone={isConnected ? "success" : "warning"}>
                  {isConnected ? "Connected" : "Not Connected"}
                </Badge>
              </InlineStack>

              <Divider />

              {/* Save form */}
              <Form method="post">
                <input type="hidden" name="_action" value="save" />
                <FormLayout>
                  <TextField
                    label="Klaviyo Private API Key"
                    name="klaviyoApiKey"
                    type="password"
                    value={apiKey}
                    onChange={setApiKey}
                    helpText={
                      <>
                        This is your <strong>Private API Key</strong> (starts with <code>pk_</code>). Find it in{" "}
                        <strong>Klaviyo → Settings → API Keys → Create Private API Key</strong>.{" "}
                        Needs Full Access for Lists and Profiles.
                      </>
                    }
                    autoComplete="off"
                    placeholder="pk_..."
                  />
                  <TextField
                    label="Klaviyo List ID"
                    name="klaviyoListId"
                    value={listId}
                    onChange={setListId}
                    helpText={
                      <>
                        Found in <strong>Klaviyo → Lists & Segments → your list → Settings tab</strong>.
                        Example: <code>ABC123</code>
                      </>
                    }
                    autoComplete="off"
                    placeholder="e.g. ABC123"
                  />
                  <InlineStack gap="300" blockAlign="center">
                    <Button variant="primary" submit loading={isSaving}>
                      {isSaving ? "Saving..." : "💾 Save Settings"}
                    </Button>
                  </InlineStack>
                </FormLayout>
              </Form>

              <Divider />

              {/* Test Connection */}
              <BlockStack gap="300">
                <Text variant="headingMd" as="h3">🔌 Test Connection</Text>
                <Text variant="bodyMd" tone="subdued">
                  Sends a real test call to Klaviyo to verify your Private API Key and List ID are valid.
                </Text>

                <testFetcher.Form method="post">
                  <input type="hidden" name="_action" value="test" />
                  <input type="hidden" name="klaviyoApiKey" value={apiKey} />
                  <input type="hidden" name="klaviyoListId" value={listId} />
                  <Button
                    variant="secondary"
                    submit
                    loading={isTesting}
                    disabled={!apiKey || !listId}
                  >
                    {isTesting ? "Testing..." : "🔍 Test Connection"}
                  </Button>
                </testFetcher.Form>

                {isTesting && (
                  <InlineStack gap="200" blockAlign="center">
                    <Spinner size="small" />
                    <Text variant="bodyMd" tone="subdued">Connecting to Klaviyo...</Text>
                  </InlineStack>
                )}

                {!isTesting && testResult?.testSuccess && (
                  <Box
                    background="bg-surface-success"
                    borderRadius="200"
                    padding="300"
                    borderColor="border-success"
                    borderWidth="025"
                  >
                    <BlockStack gap="100">
                      <Text variant="bodyMd" fontWeight="bold" tone="success">
                        ✅ Connection successful! Private API Key and List ID are valid.
                      </Text>
                      <Text variant="bodyMd" tone="subdued">
                        Don't forget to click <strong>Save Settings</strong> if you haven't already.
                      </Text>
                    </BlockStack>
                  </Box>
                )}

                {!isTesting && testResult?.testError && (
                  <Box
                    background="bg-surface-critical"
                    borderRadius="200"
                    padding="300"
                    borderColor="border-critical"
                    borderWidth="025"
                  >
                    <Text variant="bodyMd" tone="critical">{testResult.testError}</Text>
                  </Box>
                )}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Help Card */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">📋 Setup Guide</Text>

              <BlockStack gap="200">
                <Text variant="bodyMd" fontWeight="bold">1. Create your Private API Key</Text>
                <Text variant="bodyMd" tone="subdued">
                  Go to <strong>Klaviyo → Settings → API Keys → Create Private API Key</strong>.
                  Name it "Discount Spinner". Grant it Full Access to Lists, Profiles, and Events.
                  Copy the key (starts with <code>pk_</code>).
                </Text>
              </BlockStack>

              <Divider />

              <BlockStack gap="200">
                <Text variant="bodyMd" fontWeight="bold">2. Find your List ID</Text>
                <Text variant="bodyMd" tone="subdued">
                  Go to <strong>Klaviyo → Lists & Segments</strong>. Click the list you want to use.
                  Open the <strong>Settings</strong> tab and copy the List ID (e.g. <code>ABC123</code>).
                </Text>
              </BlockStack>

              <Divider />

              <BlockStack gap="200">
                <Text variant="bodyMd" fontWeight="bold">3. Paste, Test & Save</Text>
                <Text variant="bodyMd" tone="subdued">
                  Paste both values above, click <strong>Test Connection</strong> to verify, then <strong>Save Settings</strong>.
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
