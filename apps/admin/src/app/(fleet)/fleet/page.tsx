import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fleet Dashboard — LEOPARD Operations",
};

export default function FleetDashboardPage() {
  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
        Fleet Dashboard
      </h1>
      <p style={{ color: "#6b7280" }}>
        Welcome to the fleet management dashboard.
      </p>
    </div>
  );
}
