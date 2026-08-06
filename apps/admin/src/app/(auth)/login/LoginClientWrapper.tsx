"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "../../../features/auth/LoginForm";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExpired = searchParams?.get("expired") === "true";

  const handleSuccess = (role: string) => {
    switch (role) {
      case "ADMIN":
        router.push("/admin");
        break;
      case "FLEET_OWNER":
        router.push("/fleet");
        break;
      case "CUSTOMER":
        router.push("/customer/orders");
        break;
      case "DRIVER":
        router.push("/driver/orders");
        break;
      default:
        router.push("/admin");
        break;
    }
  };

  return <LoginForm sessionExpired={isExpired} onSuccess={handleSuccess} />;
}

export function LoginClientWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
