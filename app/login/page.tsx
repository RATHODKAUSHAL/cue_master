import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 px-4 py-12 text-zinc-950">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
