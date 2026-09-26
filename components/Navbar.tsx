"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/", label: "Beranda" },
  { href: "/#pengembang", label: "Pengembang" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#saran", label: "Kotak Saran" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-line/70 bg-ink/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tsc-mark-square.png" alt="" className="h-9 w-9 object-contain" />
          <span className="font-display text-lg font-semibold tracking-tight">
            Tama Studio Community
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-mono text-sm text-paper-dim transition-colors hover:text-paper"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-md px-4 py-2 text-sm font-medium text-paper-dim transition-colors hover:text-paper"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-amber px-4 py-2 text-sm font-semibold text-ink shadow-glow transition-transform hover:-translate-y-0.5"
          >
            Daftar Gratis
          </Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-ink-line md:hidden"
          aria-label="Buka menu"
          aria-expanded={open}
        >
          <span className="font-mono text-sm">{open ? "✕" : "☰"}</span>
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-1 border-t border-ink-line px-5 pb-5 pt-3 md:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2.5 font-mono text-sm text-paper-dim hover:bg-ink-surface hover:text-paper"
            >
              {l.label}
            </a>
          ))}
          <div className="mt-2 flex gap-3">
            <Link
              href="/login"
              className="flex-1 rounded-md border border-ink-line px-4 py-2 text-center text-sm font-medium"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="flex-1 rounded-md bg-amber px-4 py-2 text-center text-sm font-semibold text-ink"
            >
              Daftar
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
