import { OperationsShell } from "@/components/shell/OperationsShell";

const fleetNavItems = [
  { label: "Dashboard", href: "/fleet" },
  { label: "Drivers", href: "/fleet/drivers" },
  { label: "Orders", href: "/fleet/orders" },
];

export default function FleetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OperationsShell role="fleet_owner" navItems={fleetNavItems}>
      {children}
    </OperationsShell>
  );
}
