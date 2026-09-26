"use client";

import Link from "next/link";
import { useAuth } from "@/lib/useAuth";

export default function DashboardHome() {
  const { user } = useAuth();
  const name = user?.displayName || "kamu";

  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">
        Beranda
      </p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-paper sm:text-3xl">
        Halo, {name} 👋
      </h1>
      <p className="mt-2 text-sm text-paper-dim">
        Ini activity feed kamu — begitu kamu mulai publish kode, gabung
        grup, atau baca buku, aktivitasnya bakal muncul di sini.
      </p>

      {/* Activity feed is populated once Tahap 2–4 (code, books, groups)
          are wired up. Placeholder empty state for now. */}
      <div className="mt-10 flex flex-col items-center justify-center rounded-card border border-dashed border-ink-line px-6 py-16 text-center">
        <span className="font-mono text-2xl text-paper-faint">{"{ }"}</span>
        <p className="mt-4 text-sm text-paper-dim">
          Belum ada aktivitas. Mulai dengan bikin repo pertama atau gabung
          grup.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/dashboard/kode/baru"
            className="rounded-md bg-amber px-4 py-2 text-sm font-semibold text-ink shadow-glow transition-transform hover:-translate-y-0.5"
          >
            + Repo baru
          </Link>
          <Link
            href="/dashboard/kelas/baru"
            className="rounded-md border border-ink-line px-4 py-2 text-sm font-medium text-paper transition-colors hover:border-paper-dim"
          >
            + Tulis buku
          </Link>
          <Link
            href="/dashboard/grup/baru"
            className="rounded-md border border-ink-line px-4 py-2 text-sm font-medium text-paper transition-colors hover:border-paper-dim"
          >
            + Grup baru
          </Link>
        </div>
      </div>
    </div>
  );
}
