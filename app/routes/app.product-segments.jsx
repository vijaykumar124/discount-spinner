import { json } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, Button, Banner,
  DataTable, Modal, FormLayout, TextField, Badge, Thumbnail,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getSpinnerConfig, updateSpinnerConfig } from "../models/spinnerConfig.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const config = await getSpinnerConfig(session.shop);
  return json({ segments: JSON.parse(config.productSegments) });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  try {
    const segmentsRaw = formData.get("segments");
    const segments = JSON.parse(segmentsRaw);

    if (!Array.isArray(segments)) throw new Error("Invalid segments data");
    if (segments.length < 2) throw new Error("Need at least 2 product segments");
    if (segments.length > 8) throw new Error("Maximum 8 product segments allowed");

    const totalProbability = segments.reduce((sum, s) => sum + Number(s.probability), 0);
    if (totalProbability > 100) throw new Error(`Total probability is ${totalProbability}% — must not exceed 100%`);

    for (const seg of segments) {
      if (!seg.label || typeof seg.label !== "string" || seg.label.length > 50) {
        throw new Error("Each segment must have a label (max 50 chars)");
      }
      if (typeof seg.probability !== "number" || seg.probability < 1 || seg.probability > 100) {
        throw new Error("Each probability must be between 1 and 100");
      }
    }

    await updateSpinnerConfig(session.shop, { productSegments: JSON.stringify(segments) });
    return json({ success: true });
  } catch (err) {
    return json({ error: err.message || "Failed to save segments" }, { status: 400 });
  }
};

export default function ProductSegments() {
  const { segments: initialSegments } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";
  const shopify = useAppBridge();

  const [segments, setSegments] = useState(initialSegments);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [formLabel, setFormLabel] = useState("");
  const [formProbability, setFormProbability] = useState("33");
  const [formProductId, setFormProductId] = useState("");
  const [formVariantId, setFormVariantId] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [isPickingProduct, setIsPickingProduct] = useState(false);

  const totalProbability = segments.reduce((s, seg) => s + Number(seg.probability), 0);

  const openAdd = () => {
    setEditIndex(null);
    setFormLabel("");
    setFormProbability("33");
    setFormProductId("");
    setFormVariantId("");
    setFormImageUrl("");
    setModalOpen(true);
  };

  const openEdit = (i) => {
    setEditIndex(i);
    setFormLabel(segments[i].label);
    setFormProbability(String(segments[i].probability));
    setFormProductId(segments[i].productId || "");
    setFormVariantId(segments[i].variantId || "");
    setFormImageUrl(segments[i].imageUrl || "");
    setModalOpen(true);
  };

  const handlePickProduct = useCallback(async () => {
    setIsPickingProduct(true);
    try {
      const result = await shopify.resourcePicker({
        type: "product",
        multiple: false,
        filter: { variants: true, draft: false, archived: false },
      });
      if (result && result.length > 0) {
        const product = result[0];
        const variant = product.variants?.[0];
        // Extract numeric ID from GID
        const productGid = product.id || "";
        const productNumId = productGid.split("/").pop();
        const variantGid = variant?.id || "";
        const variantNumId = variantGid.split("/").pop();
        const image = product.images?.[0]?.originalSrc || "";

        setFormLabel(product.title?.slice(0, 50) || formLabel);
        setFormProductId(productNumId);
        setFormVariantId(variantNumId);
        setFormImageUrl(image);
      }
    } catch (e) {
      // User cancelled picker
    } finally {
      setIsPickingProduct(false);
    }
  }, [shopify, formLabel]);

  const saveSegment = () => {
    const newSeg = {
      label: formLabel.trim().slice(0, 50),
      probability: parseInt(formProbability, 10) || 0,
      productId: formProductId.trim(),
      variantId: formVariantId.trim(),
      imageUrl: formImageUrl.trim().slice(0, 500),
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
    seg.imageUrl ? <Thumbnail source={seg.imageUrl} size="small" alt={seg.label} key={i} /> : "—",
    seg.label,
    `${seg.probability}%`,
    seg.variantId ? <Badge tone="success">Set ✓</Badge> : <Badge tone="warning">Not set</Badge>,
    <InlineStack gap="200" key={`actions-${i}`}>
      <Button size="slim" onClick={() => openEdit(i)}>Edit</Button>
      <Button size="slim" tone="critical" onClick={() => deleteSegment(i)}>Delete</Button>
    </InlineStack>,
  ]);

  return (
    <Page title="Product Wheel Segments" backAction={{ content: "Dashboard", url: "/app" }}>
      <Layout>
        {actionData?.error && (
          <Layout.Section><Banner tone="critical" title="Error">{actionData.error}</Banner></Layout.Section>
        )}
        {actionData?.success && (
          <Layout.Section><Banner tone="success" title="Product segments saved! ✓" /></Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text variant="headingMd" as="h2">🎁 Product Bonus Wheel</Text>
                  <Text variant="bodyMd" tone="subdued">
                    Configure prizes shown on the second spin. Use "Select Product" to pick directly from your store.
                  </Text>
                </BlockStack>
                <Badge tone={totalProbability > 100 ? "critical" : totalProbability === 100 ? "success" : "attention"}>
                  Total: {totalProbability}%
                </Badge>
              </InlineStack>

              <DataTable
                columnContentTypes={["text", "text", "text", "text", "text"]}
                headings={["Image", "Product / Label", "Probability", "Variant", "Actions"]}
                rows={rows}
              />

              <Form method="post">
                <input type="hidden" name="segments" value={JSON.stringify(segments)} />
                <InlineStack gap="300">
                  <Button onClick={openAdd} disabled={segments.length >= 8}>+ Add Prize</Button>
                  <Button variant="primary" submit loading={isSaving}
                    disabled={totalProbability > 100 || segments.length < 2}>
                    {isSaving ? "Saving..." : "Save Segments"}
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
              <Text variant="bodyMd">• Click "+ Add Prize" then "Select Product" to pick a real product from your store.</Text>
              <Text variant="bodyMd">• The Variant ID is needed so the product can be added to the customer's cart automatically when they claim the offer.</Text>
              <Text variant="bodyMd">• Probabilities don't need to total 100%. Leftover % will fall back to the first segment.</Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editIndex !== null ? "Edit Product Prize" : "Add Product Prize"}
        primaryAction={{ content: "Save", onAction: saveSegment }}
        secondaryActions={[{ content: "Cancel", onAction: () => setModalOpen(false) }]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Button onClick={handlePickProduct} loading={isPickingProduct} variant="secondary">
              🔍 Select Product from Store
            </Button>
            {formImageUrl && (
              <InlineStack gap="300" blockAlign="center">
                <Thumbnail source={formImageUrl} size="medium" alt={formLabel} />
                <Text variant="bodyMd" tone="subdued">{formLabel}</Text>
              </InlineStack>
            )}
            <FormLayout>
              <TextField
                label="Label (shown on wheel)"
                value={formLabel}
                onChange={setFormLabel}
                helpText="Auto-filled from product name. You can edit it."
                autoComplete="off"
                maxLength={50}
              />
              <TextField
                label="Probability (%)"
                type="number"
                value={formProbability}
                onChange={setFormProbability}
                helpText="Chance this prize is won (1–99)"
                autoComplete="off"
                min="1"
                max="99"
              />
              <TextField
                label="Product Variant ID"
                value={formVariantId}
                onChange={setFormVariantId}
                helpText="Auto-filled when you select a product. Needed for add-to-cart."
                autoComplete="off"
              />
              <TextField
                label="Product Image URL"
                value={formImageUrl}
                onChange={setFormImageUrl}
                helpText="Auto-filled when you select a product."
                autoComplete="off"
              />
            </FormLayout>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
