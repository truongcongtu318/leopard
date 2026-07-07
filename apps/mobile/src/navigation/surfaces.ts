import type { Role } from "@leopard/shared";

export type MobileSurface = "CustomerHome" | "DriverHome";

export interface MobileSection {
  role: Extract<Role, "CUSTOMER" | "DRIVER">;
  label: "Customer" | "Driver";
  initialSurface: MobileSurface;
}

export const mobileSections: MobileSection[] = [
  {
    role: "CUSTOMER",
    label: "Customer",
    initialSurface: "CustomerHome"
  },
  {
    role: "DRIVER",
    label: "Driver",
    initialSurface: "DriverHome"
  }
];

export function getInitialMobileSurface(role: Role): MobileSurface | null {
  return (
    mobileSections.find((section) => section.role === role)?.initialSurface ??
    null
  );
}
