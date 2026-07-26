import { OperationsShell } from "@/components/shell/OperationsShell";

const adminNavItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Fleets", href: "/admin/fleets" },
  { label: "Drivers", href: "/admin/drivers" },
  { label: "Orders", href: "/admin/orders" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OperationsShell role="admin" navItems={adminNavItems}>
      {children}
    </OperationsShell>
  );
}
