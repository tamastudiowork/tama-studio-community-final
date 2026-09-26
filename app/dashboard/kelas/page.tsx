"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { BookService, type Book } from "@/lib/books";

type Tab = "mine" | "public";

function BookCard({ book }: { book: Book }) {
  return (
    <Link
      href={`/dashboard/kelas/${book.id}`}
      className="flex flex-col rounded-card border border-ink-line bg-ink-soft p-5 transition-colors hover:border-paper-dim"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate font-display text-base font-semibold text-paper">{book.title}</p>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
            book.visibility === "private"
              ? "border-amber-dim text-amber-soft"
              : "border-mint-dim text-mint"
          }`}
        >
          {book.visibility === "private" ? "Privat" : "Publik"}
        </span>
      </div>

      {book.description && (
        <p className="mt-2 line-clamp-2 text-sm text-paper-dim">{book.description}</p>
      )}

      {book.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {book.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-ink-surface px-2 py-0.5 font-mono text-[11px] text-paper-faint"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 font-mono text-xs text-paper-faint">
        <span>▤ {book.chaptersCount} bab</span>
        <span>{book.ownerName}</span>
      </div>
    </Link>
  );
}

export default function KelasBrowserPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("mine");
  const [myBooks, setMyBooks] = useState<Book[] | null>(null);
  const [publicBooks, setPublicBooks] = useState<Book[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    BookService.listMine(user.uid).then(setMyBooks);
  }, [user]);

  useEffect(() => {
    if (tab === "public" && publicBooks === null) {
      BookService.listPublic().then(setPublicBooks);
    }
  }, [tab, publicBooks]);

  const list = tab === "mine" ? myBooks : publicBooks;

  const filtered = useMemo(() => {
    if (!list) return null;
    if (!search.trim()) return list;
    return list.filter(
      (b) =>
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [list, search]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">Kelas</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-paper sm:text-3xl">
            Buku Pembelajaran
          </h1>
        </div>
        <Link
          href="/dashboard/kelas/baru"
          className="rounded-md bg-amber px-4 py-2 text-sm font-semibold text-ink shadow-glow transition-transform hover:-translate-y-0.5"
        >
          + Tulis buku
        </Link>
      </div>

      <div className="mt-6 flex gap-1 rounded-md border border-ink-line bg-ink-soft p-1 w-fit">
        <button
          onClick={() => setTab("mine")}
          className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "mine" ? "bg-ink-surface text-paper" : "text-paper-dim"
          }`}
        >
          Buku Saya
        </button>
        <button
          onClick={() => setTab("public")}
          className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "public" ? "bg-ink-surface text-paper" : "text-paper-dim"
          }`}
        >
          Jelajahi
        </button>
      </div>

      <div className="mt-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari buku..."
          className="w-full max-w-xs rounded-md border border-ink-line bg-ink-soft px-3.5 py-2 text-sm text-paper outline-none focus:border-amber"
        />
      </div>

      <div className="mt-6">
        {filtered === null ? (
          <p className="font-mono text-sm text-paper-faint">Memuat...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-ink-line px-6 py-16 text-center">
            <p className="text-sm text-paper-dim">
              {tab === "mine" ? "Belum ada buku. Tulis yang pertama." : "Belum ada buku publik."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
