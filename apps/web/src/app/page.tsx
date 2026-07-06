import { orderStatuses, roles } from "@leopard/shared";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Phase 1 foundation</p>
        <h1>LEOPARD MVP workspace is ready for implementation.</h1>
        <p>
          This placeholder confirms the Next.js app can import shared contracts for{" "}
          {roles.join(", ")} roles and {orderStatuses.length} order states.
        </p>
      </section>
    </main>
  );
}
