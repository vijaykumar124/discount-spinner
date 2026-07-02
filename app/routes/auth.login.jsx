import { useState } from "react";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import {
  AppProvider as PolarisAppProvider,
  Button,
  Card,
  FormLayout,
  Page,
  Text,
  TextField,
  Box,
} from "@shopify/polaris";
import polarisTranslations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { LoginErrorType } from "@shopify/shopify-app-remix/server";

import { login } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

function getLoginErrorMessage(loginErrors) {
  if (loginErrors?.shop === LoginErrorType.MissingShop) {
    return { shop: "Please enter your shop domain to log in" };
  } else if (loginErrors?.shop === LoginErrorType.InvalidShop) {
    return { shop: "Please enter a valid shop domain to log in" };
  }
  return {};
}

export const loader = async ({ request }) => {
  const errors = getLoginErrorMessage(await login(request));
  return json({ errors, polarisTranslations });
};

export const action = async ({ request }) => {
  const errors = getLoginErrorMessage(await login(request));
  return json({ errors });
};

export default function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <PolarisAppProvider i18n={loaderData.polarisTranslations}>
      <Page>
        <Box paddingBlockStart="2000">
          <div style={{ maxWidth: "480px", margin: "0 auto" }}>
            <Card>
              <Form method="post">
                <FormLayout>
                  <Text variant="headingMd" as="h2">
                    Log in
                  </Text>
                  <TextField
                    type="text"
                    name="shop"
                    label="Shop domain"
                    helpText="example.myshopify.com"
                    value={shop}
                    onChange={setShop}
                    autoComplete="on"
                    error={errors.shop}
                  />
                  <Button submit variant="primary">Log in</Button>
                </FormLayout>
              </Form>
            </Card>
          </div>
        </Box>
      </Page>
    </PolarisAppProvider>
  );
}
