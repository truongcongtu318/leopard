import type { Metadata } from "next";
import { LoginClientWrapper } from "./LoginClientWrapper";

export const metadata: Metadata = {
  title: "Login — LEOPARD Operations",
};

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f9fafb",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "#ffffff",
          borderRadius: "0.5rem",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            marginBottom: "0.5rem",
          }}
        >
          LEOPARD Operations
        </h1>
        <p
          style={{
            color: "#6b7280",
            marginBottom: "1.5rem",
            fontSize: "0.875rem",
          }}
        >
          Sign in to manage your fleet operations
        </p>
        <LoginClientWrapper />
      </div>
    </div>
  );
}
