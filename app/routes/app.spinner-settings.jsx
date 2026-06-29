import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Checkbox,
  Button,
  Banner,
  BlockStack,
  InlineStack,
  Text,
  Divider,
} from "@shopify/polaris";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import { getSpinnerConfig, updateSpinnerConfig } from "../models/spinnerConfig.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const config = await getSpinnerConfig(session.shop);
  return json({ config });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  try {
    // Validate triggerDelay
    const triggerDelay = parseInt(formData.get("triggerDelay") || "3", 10);
    if (isNaN(triggerDelay) || triggerDelay < 0 || triggerDelay > 60) {
      return json({ error: "Trigger delay must be between 0 and 60 seconds" }, { status: 400 });
    }

    // Validate timerDuration
    const timerDuration = parseInt(formData.get("timerDuration") || "10", 10);
    if (isNaN(timerDuration) || timerDuration < 1 || timerDuration > 60) {
      return json({ error: "Timer duration must be between 1 and 60 minutes" }, { status: 400 });
    }

    const data = {
      popupTitle: String(formData.get("popupTitle") || "").slice(0, 100),
      popupSubtitle: String(formData.get("popupSubtitle") || "").slice(0, 200),
      triggerDelay,
      triggerEnabled: formData.get("triggerEnabled") === "true",
      timerDuration,
      step1Label: String(formData.get("step1Label") || "").slice(0, 50),
      step3Label: String(formData.get("step3Label") || "").slice(0, 50),
      step5Label: String(formData.get("step5Label") || "").slice(0, 50),
      primaryColor: String(formData.get("primaryColor") || "#7c3aed").slice(0, 7),
      accentColor: String(formData.get("accentColor") || "#f59e0b").slice(0, 7),
    };

    await updateSpinnerConfig(session.shop, data);
    return json({ success: true });
  } catch (err) {
    return json({ error: "Failed to save settings. Please try again." }, { status: 500 });
  }
};

export default function SpinnerSettings() {
  const { config } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";

  const [popupTitle, setPopupTitle] = useState(config.popupTitle);
  const [popupSubtitle, setPopupSubtitle] = useState(config.popupSubtitle);
  const [triggerDelay, setTriggerDelay] = useState(String(config.triggerDelay));
  const [triggerEnabled, setTriggerEnabled] = useState(config.triggerEnabled);
  const [timerDuration, setTimerDuration] = useState(String(config.timerDuration));
  const [step1Label, setStep1Label] = useState(config.step1Label);
  const [step3Label, setStep3Label] = useState(config.step3Label);
  const [step5Label, setStep5Label] = useState(config.step5Label);
  const [primaryColor, setPrimaryColor] = useState(config.primaryColor);
  const [accentColor, setAccentColor] = useState(config.accentColor);

  return (
    <Page
      title="Spinner Settings"
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Layout>
        {actionData?.error && (
          <Layout.Section>
            <Banner title="Error saving settings" tone="critical">
              <p>{actionData.error}</p>
            </Banner>
          </Layout.Section>
        )}
        {actionData?.success && (
          <Layout.Section>
            <Banner title="Settings saved!" tone="success" />
          </Layout.Section>
        )}

        <Form method="post">
          {/* Hidden fields */}
          <input type="hidden" name="triggerEnabled" value={String(triggerEnabled)} />
          <input type="hidden" name="primaryColor" value={primaryColor} />
          <input type="hidden" name="accentColor" value={accentColor} />

          <Layout>
            {/* General Settings */}
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">🎨 Popup Content</Text>
                  <FormLayout>
                    <TextField
                      label="Popup Title"
                      name="popupTitle"
                      value={popupTitle}
                      onChange={setPopupTitle}
                      helpText="Main headline shown on the first screen (max 100 chars)"
                      autoComplete="off"
                      maxLength={100}
                    />
                    <TextField
                      label="Popup Subtitle"
                      name="popupSubtitle"
                      value={popupSubtitle}
                      onChange={setPopupSubtitle}
                      helpText="Supporting text below the title (max 200 chars)"
                      autoComplete="off"
                      maxLength={200}
                    />
                  </FormLayout>
                </BlockStack>
              </Card>
            </Layout.Section>

            {/* Button Labels */}
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">🔘 Button Labels</Text>
                  <FormLayout>
                    <TextField
                      label="Step 1 — CTA Button Text"
                      name="step1Label"
                      value={step1Label}
                      onChange={setStep1Label}
                      helpText="e.g. SPIN TO WIN"
                      autoComplete="off"
                      maxLength={50}
                    />
                    <TextField
                      label="Step 3 — Bonus Button Text"
                      name="step3Label"
                      value={step3Label}
                      onChange={setStep3Label}
                      helpText="e.g. UNLOCK A BONUS"
                      autoComplete="off"
                      maxLength={50}
                    />
                    <TextField
                      label="Step 5 — Final CTA Button Text"
                      name="step5Label"
                      value={step5Label}
                      onChange={setStep5Label}
                      helpText="e.g. UNLOCK MY OFFER"
                      autoComplete="off"
                      maxLength={50}
                    />
                  </FormLayout>
                </BlockStack>
              </Card>
            </Layout.Section>

            {/* Trigger Settings */}
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">⏱️ Display Trigger</Text>
                  <FormLayout>
                    <Checkbox
                      label="Enable Popup Widget on Storefront"
                      checked={triggerEnabled}
                      onChange={setTriggerEnabled}
                    />
                    <TextField
                      label="Trigger Delay (seconds)"
                      name="triggerDelay"
                      type="number"
                      value={triggerDelay}
                      onChange={setTriggerDelay}
                      helpText="How many seconds after page load before the popup appears (0–60)"
                      autoComplete="off"
                      min="0"
                      max="60"
                    />
                  </FormLayout>
                </BlockStack>
              </Card>
            </Layout.Section>

            {/* Timer Settings */}
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">⏰ Countdown Timer</Text>
                  <FormLayout>
                    <TextField
                      label="Timer Duration (minutes)"
                      name="timerDuration"
                      type="number"
                      value={timerDuration}
                      onChange={setTimerDuration}
                      helpText="How many minutes the offer is reserved for after spinning (1–60). When timer expires, the offer disappears."
                      autoComplete="off"
                      min="1"
                      max="60"
                    />
                  </FormLayout>
                </BlockStack>
              </Card>
            </Layout.Section>

            {/* Color Customization */}
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">🎨 Color Theme</Text>
                  <FormLayout>
                    <TextField
                      label="Primary Color (hex)"
                      value={primaryColor}
                      onChange={setPrimaryColor}
                      helpText="Main accent color for buttons and highlights (e.g. #7c3aed)"
                      autoComplete="off"
                      prefix={
                        <span
                          style={{
                            display: "inline-block",
                            width: "16px",
                            height: "16px",
                            background: primaryColor,
                            borderRadius: "3px",
                            border: "1px solid #ccc",
                          }}
                        />
                      }
                    />
                    <TextField
                      label="Accent Color (hex)"
                      value={accentColor}
                      onChange={setAccentColor}
                      helpText="Secondary accent for prizes and highlights (e.g. #f59e0b)"
                      autoComplete="off"
                      prefix={
                        <span
                          style={{
                            display: "inline-block",
                            width: "16px",
                            height: "16px",
                            background: accentColor,
                            borderRadius: "3px",
                            border: "1px solid #ccc",
                          }}
                        />
                      }
                    />
                  </FormLayout>
                </BlockStack>
              </Card>
            </Layout.Section>

            {/* Save Button */}
            <Layout.Section>
              <InlineStack align="end">
                <Button variant="primary" submit loading={isSaving}>
                  {isSaving ? "Saving..." : "Save Settings"}
                </Button>
              </InlineStack>
            </Layout.Section>
          </Layout>
        </Form>
      </Layout>
    </Page>
  );
}
