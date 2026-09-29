import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginScreen } from "@/components/auth/LoginScreen";
import "@/styles/auth.css";

export const metadata: Metadata = { title: "Sign in" };

// useSearchParams needs a Suspense boundary for static rendering.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}
