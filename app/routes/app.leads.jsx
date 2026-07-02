
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, Button, Banner,
  DataTable, Badge, EmptyState, Spinner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const leads = await prisma.lead.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return json({ leads });
};

export default function Leads() {
  const { leads } = useLoaderData();

  const rows = leads.map((lead) => [
    lead.email,
    lead.discountCode || "—",
    lead.productLabel || "—",
    new Date(lead.createdAt).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }),
  ]);

  return (
    <Page title="Captured Leads">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text variant="headingMd" as="h2">📋 Email Leads</Text>
                  <Text variant="bodyMd" tone="subdued">
                    Emails captured when customers claimed their spin reward.
                  </Text>
                </BlockStack>
                <Badge>{leads.length} total</Badge>
              </InlineStack>

              {leads.length === 0 ? (
                <EmptyState
                  heading="No leads yet"
                  image=""
                >
                  <p>Leads will appear here when customers claim offers on your storefront.</p>
                </EmptyState>
              ) : (
                <DataTable
                  columnContentTypes={["text", "text", "text", "text"]}
                  headings={["Email", "Discount Code Won", "Product Won", "Date"]}
                  rows={rows}
                />
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
