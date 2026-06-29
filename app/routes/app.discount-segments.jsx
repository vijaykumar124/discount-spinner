import { json } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, Button, Banner,
  TextField, DataTable, Modal, FormLayout, Badge,
} from "@shopify/polaris";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import { getSpinnerConfig, updateSpinnerConfig } from "../models/spinnerConfig.server";

// Shopify GraphQL: create a basic percentage discount code
async function createDiscountCode(admin, code, percentage) {
  const codeClean = code.toUpperCase().trim().slice(0, 30);
  const pct = Math.min(Math.max(Number(percentage) || 10, 1), 100);

  // Check if code exists first
  const checkRes = await admin.graphql(
    `#graphql
    query CheckDiscount($query: String!) {
      discountNodes(first: 1, query: $query) {
        nodes { id }
      }
    }`,
    { variables: { query: `code:${codeClean}` } }
  );
  const checkData = await checkRes.json();
  if (checkData?.data?.discountNodes?.nodes?.length > 0) return { exists: true };

  // Create discount
  const now = new Date().toISOString();
  const res = await admin.graphql(
    `#graphql
    mutation CreateDiscount($discount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $discount) {
        codeDiscountNode { id }
        userErrors { field message }
      }
    }`,
    {
      variables: {
        discount: {
          title: `Discount Spinner — ${codeClean}`,
          code: codeClean,
          startsAt: now,
          customerGets: {
            value: { percentage: pct / 100 },
            items: { all: true },
          },
          customerSelection: { all: true },
          combinesWith: { orderDiscounts: false, productDiscounts: false, shippingDiscounts: false },
        },
      },
    }
  );
  const data = await res.json();
  const errors = data?.data?.discountCodeBasicCreate?.userErrors || [];
  if (errors.length > 0) {
    console.warn(`[Discount] Could not create ${codeClean}:`, errors.map(e => e.message).join(", "));
    return { created: false, errors: errors.map(e => e.message) };
  }
  return { created: true, errors: [] };
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const config = await getSpinnerConfig(session.shop);
  return json({ segments: JSON.parse(config.discountSegments) });
};

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();

  try {
    const segmentsRaw = formData.get("segments");
    const segments = JSON.parse(segmentsRaw);

    if (!Array.isArray(segments)) throw new Error("Invalid segments");
    if (segments.length < 2) throw new Error("Need at least 2 segments");
    if (segments.length > 8) throw new Error("Maximum 8 segments allowed");

    const totalProbability = segments.reduce((sum, s) => sum + Number(s.probability), 0);
    if (totalProbability > 100) throw new Error(`Total probability is ${totalProbability}% — must not exceed 100%`);

    for (const seg of segments) {
      if (!seg.label || typeof seg.label !== "string" || seg.label.length > 30) {
        throw new Error("Each segment must have a label (max 30 chars)");
      }
      if (typeof seg.probability !== "number" || seg.probability < 1 || seg.probability > 100) {
        throw new Error("Each probability must be between 1 and 100");
      }
      if (!seg.code || typeof seg.code !== "string" || seg.code.length > 30) {
        throw new Error("Each segment must have a discount code");
      }
    }

    // Auto-create discount codes in Shopify
    const creationResults = [];
    const allErrors = [];
    for (const seg of segments) {
      // Parse percentage from label like "20% OFF" or "20%"
      const pctMatch = seg.label.match(/(\d+(\.\d+)?)\s*%/);
      const pct = pctMatch ? parseFloat(pctMatch[1]) : 10;
      const result = await createDiscountCode(admin, seg.code, pct);
      creationResults.push({ code: seg.code, ...result });
      if (result.errors && result.errors.length > 0) {
        allErrors.push(...result.errors.map(msg => `${seg.code}: ${msg}`));
      }
    }

    await updateSpinnerConfig(session.shop, { discountSegments: JSON.stringify(segments) });

    const created = creationResults.filter(r => r.created).length;
    const existing = creationResults.filter(r => r.exists).length;

    if (allErrors.length > 0) {
      return json({
        error: `Saved config, but failed to create some Shopify discounts: ${allErrors.join("; ")}`,
      });
    }

    return json({
      success: true,
      message: `Saved! ${created} new code(s) created in Shopify. ${existing} already existed.`,
    });
  } catch (err) {
    return json({ error: err.message || "Failed to save segments" }, { status: 400 });
  }
};

export default function DiscountSegments() {
  const { segments: initialSegments } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";

  const [segments, setSegments] = useState(initialSegments);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [formLabel, setFormLabel] = useState("");
  const [formProbability, setFormProbability] = useState("25");
  const [formCode, setFormCode] = useState("");

  const totalProbability = segments.reduce((s, seg) => s + Number(seg.probability), 0);

  const openAdd = () => {
    setEditIndex(null); setFormLabel(""); setFormProbability("25"); setFormCode("");
    setModalOpen(true);
  };

  const openEdit = (i) => {
    setEditIndex(i);
    setFormLabel(segments[i].label);
    setFormProbability(String(segments[i].probability));
    setFormCode(segments[i].code);
    setModalOpen(true);
  };

  const saveSegment = () => {
    const newSeg = {
      label: formLabel.trim().slice(0, 30),
      probability: parseInt(formProbability, 10) || 0,
      code: formCode.trim().toUpperCase().slice(0, 30),
    };
    if (editIndex !== null) {
      const updated = [...segments];
      updated[editIndex] = newSeg;
      setSegments(updated);
    } else {
      setSegments([...segments, newSeg]);
    }
    setModalOpen(false);
  };

  const deleteSegment = (i) => setSegments(segments.filter((_, idx) => idx !== i));

  const rows = segments.map((seg, i) => [
    seg.label,
    `${seg.probability}%`,
    <Badge tone="info" key={i}>{seg.code}</Badge>,
    <InlineStack gap="200" key={`a${i}`}>
      <Button size="slim" onClick={() => openEdit(i)}>Edit</Button>
      <Button size="slim" tone="critical" onClick={() => deleteSegment(i)}>Delete</Button>
    </InlineStack>,
  ]);

  return (
    <Page title="Discount Wheel Segments" backAction={{ content: "Dashboard", url: "/app" }}>
      <Layout>
        {actionData?.error && (
          <Layout.Section><Banner tone="critical" title="Error">{actionData.error}</Banner></Layout.Section>
        )}
        {actionData?.success && (
          <Layout.Section>
            <Banner tone="success" title="✓ Saved!">
              {actionData.message}
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text variant="headingMd" as="h2">🎰 Discount Wheel Segments</Text>
                  <Text variant="bodyMd" tone="subdued">
                    Add up to 8 segments. Discount codes are automatically created in Shopify when you save.
                  </Text>
                </BlockStack>
                <Badge tone={totalProbability > 100 ? "critical" : totalProbability === 100 ? "success" : "attention"}>
                  Total: {totalProbability}%
                </Badge>
              </InlineStack>

              <DataTable
                columnContentTypes={["text", "text", "text", "text"]}
                headings={["Label", "Probability", "Discount Code", "Actions"]}
                rows={rows}
              />

              <Form method="post">
                <input type="hidden" name="segments" value={JSON.stringify(segments)} />
                <InlineStack gap="300">
                  <Button onClick={openAdd} disabled={segments.length >= 8}>+ Add Segment</Button>
                  <Button variant="primary" submit loading={isSaving}
                    disabled={totalProbability > 100 || segments.length < 2}>
                    {isSaving ? "Saving & Creating Codes..." : "Save & Auto-Create Codes"}
                  </Button>
                </InlineStack>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <Text variant="headingMd" as="h2">💡 Tips</Text>
              <Text variant="bodyMd">• Clicking "Save & Auto-Create Codes" automatically creates the discount codes in your Shopify Discounts section.</Text>
              <Text variant="bodyMd">• Label format like "25% OFF" auto-detects the percentage when creating the discount.</Text>
              <Text variant="bodyMd">• Existing codes are not overwritten — they are kept as-is.</Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editIndex !== null ? "Edit Segment" : "Add Segment"}
        primaryAction={{ content: "Save", onAction: saveSegment }}
        secondaryActions={[{ content: "Cancel", onAction: () => setModalOpen(false) }]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField label="Label (shown on wheel)" value={formLabel} onChange={setFormLabel}
              helpText='e.g. "25% OFF" — percentage is auto-detected' autoComplete="off" maxLength={30} />
            <TextField label="Probability (%)" type="number" value={formProbability}
              onChange={setFormProbability} helpText="Chance this segment is selected (1–99)"
              autoComplete="off" min="1" max="99" />
            <TextField label="Discount Code" value={formCode} onChange={setFormCode}
              helpText="Will be auto-created in Shopify (e.g. SPIN25)" autoComplete="off" maxLength={30} />
          </FormLayout>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
