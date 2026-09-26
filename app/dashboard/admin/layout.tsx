"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserProfile } from "@/lib/useUserProfile";

const TABS = [
  { href: "/dashboard/admin", label: "Ringkasan" },
  { href: "/dashboard/admin/pengguna", label: "Pengguna" },
  { href: "/dashboard/admin/grup", label: "Grup" },
  { href: "/dashboard/admin/laporan", label: "Laporan" },
  { href: "/dashboard/admin/api-keys", label: "API Keys" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useUserProfile();
  const pathname = usePathname();

  if (loading) {
    return <p className="font-mono text-sm text-paper-faint">Memuat...</p>;
  }

  if (profile?.role !== "admin") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="font-display text-xl font-semibold text-paper">Khusus admin</p>
        <p className="mt-2 text-sm text-paper-dim">
          Halaman ini cuma bisa diakses akun dengan role admin.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">Admin</p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-paper sm:text-3xl">
        Dashboard Admin
      </h1>

      <div className="mt-6 flex gap-1 rounded-md border border-ink-line bg-ink-soft p-1 w-fit">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${
              pathname === tab.href ? "bg-ink-surface text-paper" : "text-paper-dim"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
