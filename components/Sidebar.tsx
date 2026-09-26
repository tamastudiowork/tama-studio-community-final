"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useUnreadCounts } from "@/lib/useUnreadCounts";

const items = [
  { href: "/dashboard", label: "Beranda", icon: "⌂" },
  { href: "/dashboard/postingan", label: "Postingan", icon: "💬" },
  { href: "/dashboard/kelas", label: "Kelas", icon: "▤" },
  { href: "/dashboard/kode", label: "Kode", icon: "{}" },
  { href: "/dashboard/grup", label: "Grup", icon: "◎" },
  { href: "/dashboard/pesan", label: "Kotak Pesan", icon: "✉" },
  { href: "/dashboard/showcase", label: "Showcase", icon: "◫" },
  { href: "/dashboard/klip", label: "Tama Clips", icon: "▶" },
  { href: "/dashboard/roadmap", label: "Roadmap", icon: "⌥" },
  { href: "/dashboard/karir", label: "Karir", icon: "⚒" },
  { href: "/dashboard/profil", label: "Profil", icon: "◑" },
];

export default function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { groupsUnread, dmsUnread } = useUnreadCounts();

  const badgeFor: Record<string, number> = {
    "/dashboard/grup": groupsUnread,
    "/dashboard/pesan": dmsUnread,
  };

  async function handleSignOut() {
    await signOut(auth);
    router.push("/");
  }

  const navItems = isAdmin ? [...items, { href: "/dashboard/admin", label: "Admin", icon: "⚑" }] : items;

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-line bg-ink-soft/60 px-4 py-6 md:flex">
      <Link href="/" className="mb-8 flex items-center gap-2.5 px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/tsc-mark-square.png" alt="" className="h-7 w-7 object-contain" />
        <span className="font-display text-sm font-semibold">TSC</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const unread = badgeFor[item.href] ?? 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-ink-surface text-paper"
                  : "text-paper-dim hover:bg-ink-surface/60 hover:text-paper"
              }`}
            >
              <span className="font-mono text-xs text-amber">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {unread > 0 && (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber px-1 font-mono text-[10px] font-semibold text-ink">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleSignOut}
        className="mt-4 rounded-md px-3 py-2.5 text-left text-sm text-paper-faint transition-colors hover:bg-ink-surface/60 hover:text-paper"
      >
        Keluar
      </button>
    </aside>
  );
}
