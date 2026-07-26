import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard — LEOPARD Operations",
};

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
        Admin Dashboard
      </h1>
      <p style={{ color: "#6b7280" }}>
        Welcome to the administration dashboard.
      </p>
    </div>
  );
}
