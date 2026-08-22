"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "../../../features/auth/LoginForm";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExpired = searchParams?.get("expired") === "true";

  const handleSuccess = (role: string) => {
    const target =
      role === "ADMIN"
        ? "/admin"
        : role === "FLEET_OWNER"
          ? "/fleet"
          : role === "CUSTOMER"
            ? "/customer/orders"
            : role === "DRIVER"
              ? "/driver/orders"
              : "/admin";
    router.push(target);
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
