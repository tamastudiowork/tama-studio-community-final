"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { UserService } from "@/lib/users";
import AuthShell from "@/components/AuthShell";
import AuthProviderButtons from "@/components/AuthProviderButtons";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: username });
      await UserService.ensureProfile({
        uid: cred.user.uid,
        name: username,
        email: cred.user.email ?? email,
        photoURL: cred.user.photoURL,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? "Gagal daftar. Cek lagi email dan password kamu."
          : "Gagal daftar, coba lagi."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Daftar ke TSC"
      subtitle="Gratis. Butuh kurang dari semenit."
      footer={
        <>
          Sudah punya akun?{" "}
          <Link href="/login" className="font-medium text-amber">
            Masuk di sini
          </Link>
        </>
      }
    >
      <AuthProviderButtons
        onSuccess={() => router.push("/dashboard")}
        onError={setError}
      />

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-ink-line" />
        <span className="font-mono text-xs text-paper-faint">atau</span>
        <span className="h-px flex-1 bg-ink-line" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="mb-1.5 block text-sm text-paper-dim">
            Username
          </label>
          <input
            id="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            placeholder="username unik kamu"
          />
        </div>
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
            placeholder="Minimal 8 karakter"
          />
        </div>

        {error && <p className="text-sm text-[#F45D5D]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-amber py-2.5 text-sm font-semibold text-ink shadow-glow transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {loading ? "Memproses..." : "Buat akun"}
        </button>
      </form>
    </AuthShell>
  );
}
