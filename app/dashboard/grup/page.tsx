"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { GroupService, type Group } from "@/lib/groups";

type Tab = "mine" | "public";

const JOIN_LABEL: Record<Group["joinMethod"], string> = {
  public: "Langsung gabung",
  code: "Pakai kode undangan",
  approval: "Perlu persetujuan",
  link: "Lewat link saja",
};

function GroupCard({ group }: { group: Group }) {
  return (
    <Link
      href={`/dashboard/grup/${group.id}`}
      className="flex flex-col rounded-card border border-ink-line bg-ink-soft p-5 transition-colors hover:border-paper-dim"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate font-display text-base font-semibold text-paper">{group.name}</p>
        <span className="shrink-0 rounded-full border border-ink-line px-2 py-0.5 text-[10px] text-paper-faint">
          {JOIN_LABEL[group.joinMethod]}
        </span>
      </div>
      {group.description && (
        <p className="mt-2 line-clamp-2 text-sm text-paper-dim">{group.description}</p>
      )}
      <div className="mt-4 flex items-center gap-4 font-mono text-xs text-paper-faint">
        <span>◎ {group.memberCount} anggota</span>
        <span>{group.ownerName}</span>
      </div>
    </Link>
  );
}

export default function GrupBrowserPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("mine");
  const [myGroups, setMyGroups] = useState<Group[] | null>(null);
  const [publicGroups, setPublicGroups] = useState<Group[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    GroupService.listMine(user.uid).then(setMyGroups);
  }, [user]);

  useEffect(() => {
    if (tab === "public" && publicGroups === null) {
      GroupService.listPublic().then(setPublicGroups);
    }
  }, [tab, publicGroups]);

  const list = tab === "mine" ? myGroups : publicGroups;

  const filtered = useMemo(() => {
    if (!list) return null;
    if (!search.trim()) return list;
    return list.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));
  }, [list, search]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">Grup</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-paper sm:text-3xl">
            Grup Komunitas
          </h1>
        </div>
        <Link
          href="/dashboard/grup/baru"
          className="rounded-md bg-amber px-4 py-2 text-sm font-semibold text-ink shadow-glow transition-transform hover:-translate-y-0.5"
        >
          + Grup baru
        </Link>
      </div>

      <div className="mt-6 flex gap-1 rounded-md border border-ink-line bg-ink-soft p-1 w-fit">
        <button
          onClick={() => setTab("mine")}
          className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "mine" ? "bg-ink-surface text-paper" : "text-paper-dim"
          }`}
        >
          Grup Saya
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
          placeholder="Cari grup..."
          className="w-full max-w-xs rounded-md border border-ink-line bg-ink-soft px-3.5 py-2 text-sm text-paper outline-none focus:border-amber"
        />
      </div>

      <div className="mt-6">
        {filtered === null ? (
          <p className="font-mono text-sm text-paper-faint">Memuat...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-ink-line px-6 py-16 text-center">
            <p className="text-sm text-paper-dim">
              {tab === "mine" ? "Kamu belum gabung grup manapun." : "Belum ada grup publik yang cocok."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
