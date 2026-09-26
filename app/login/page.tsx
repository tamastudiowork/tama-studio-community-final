"use client";

import { Suspense, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { UserService } from "@/lib/users";
import AuthShell from "@/components/AuthShell";
import AuthProviderButtons from "@/components/AuthProviderButtons";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const suspended = searchParams.get("suspended") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await UserService.ensureProfile({
        uid: cred.user.uid,
        name: cred.user.displayName || cred.user.email || "Anonim",
        email: cred.user.email ?? "",
        photoURL: cred.user.photoURL,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? "Email atau password salah."
          : "Gagal masuk, coba lagi."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Masuk ke TSC"
      subtitle="Lanjutin belajar dan proyek kamu."
      footer={
        <>
          Belum punya akun?{" "}
          <Link href="/register" className="font-medium text-amber">
            Daftar di sini
          </Link>
        </>
      }
    >
      <AuthProviderButtons
        onSuccess={() => router.push("/dashboard")}
        onError={setError}
      />

      {suspended && (
        <p className="mt-4 rounded-md border border-[#F45D5D]/40 bg-[#F45D5D]/10 px-3.5 py-2.5 text-sm text-[#F45D5D]">
          Akun ini ditangguhkan oleh admin. Hubungi tim TSC kalau merasa ini keliru.
        </p>
      )}

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-ink-line" />
        <span className="font-mono text-xs text-paper-faint">atau</span>
        <span className="h-px flex-1 bg-ink-line" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm text-paper-dim">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            placeholder="kamu@email.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm text-paper-dim">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-[#F45D5D]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-amber py-2.5 text-sm font-semibold text-ink shadow-glow transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
