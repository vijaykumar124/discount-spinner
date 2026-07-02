import { json, redirect } from "@remix-run/node";
import { useState } from "react";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return json({});
};

export default function Index() {
  const [shop, setShop] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const containerStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "radial-gradient(circle at 10% 20%, rgba(124, 58, 237, 0.15) 0%, rgba(0, 0, 0, 1) 90%), radial-gradient(circle at 90% 80%, rgba(245, 158, 11, 0.08) 0%, rgba(0, 0, 0, 1) 90%)",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#ffffff",
    margin: 0,
    padding: "20px",
    boxSizing: "border-box",
  };

  const cardStyle = {
    background: "rgba(255, 255, 255, 0.02)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "24px",
    padding: "48px 40px",
    width: "100%",
    maxWidth: "460px",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
    textAlign: "center",
  };

  const titleStyle = {
    fontSize: "32px",
    fontWeight: "800",
    margin: "0 0 12px 0",
    background: "linear-gradient(135deg, #a78bfa 0%, #f59e0b 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-0.5px",
  };

  const subtitleStyle = {
    fontSize: "15px",
    color: "#9ca3af",
    margin: "0 0 32px 0",
    lineHeight: "1.6",
  };

  const formStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  };

  const inputStyle = {
    background: "rgba(0, 0, 0, 0.4)",
    border: isFocused ? "1px solid #7c3aed" : "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "14px",
    padding: "16px 20px",
    fontSize: "15px",
    color: "#ffffff",
    outline: "none",
    boxShadow: isFocused ? "0 0 0 4px rgba(124, 58, 237, 0.15)" : "none",
    transition: "all 0.2s ease-in-out",
    textAlign: "center",
  };

  const buttonStyle = {
    background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
    border: "none",
    borderRadius: "14px",
    padding: "16px 20px",
    fontSize: "15px",
    fontWeight: "600",
    color: "#ffffff",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(124, 58, 237, 0.25)",
    transition: "all 0.2s ease",
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Discount Spinner</h1>
        <p style={subtitleStyle}>Enter your Shopify store URL to install or log in to the application.</p>
        <form method="get" action="" style={formStyle}>
          <input
            type="text"
            name="shop"
            placeholder="example.myshopify.com"
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={inputStyle}
            required
          />
          <button type="submit" style={buttonStyle}>
            Connect Store
          </button>
        </form>
      </div>
    </div>
  );
}
