"use client";

import { useEffect, useState } from "react";
import { getCountFromServer, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ReportService } from "@/lib/reports";
import { DEFAULT_MAX_TAGS, MIN_ALLOWED_MAX_TAGS, setMaxTags, subscribeMaxTags } from "@/lib/postCategories";

type Stats = {
  users: number;
  repos: number;
  books: number;
  groups: number;
  pendingReports: number;
};

function StatCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-card border border-ink-line bg-ink-soft p-5">
      <p className="font-mono text-xs uppercase tracking-wide text-paper-faint">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-paper">
        {value === null ? "—" : value.toLocaleString("id-ID")}
      </p>
    </div>
  );
}

function TagLimitCard() {
  const [maxTags, setMaxTagsState] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const unsub = subscribeMaxTags((v) => {
      setMaxTagsState(v);
      setDraft(String(v));
    });
    return unsub;
  }, []);

  async function handleSave() {
    const value = Number(draft);
    if (!Number.isFinite(value)) return;
    setSaving(true);
    setSaved(false);
    try {
      await setMaxTags(value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-card border border-ink-line bg-ink-soft p-5">
      <p className="font-mono text-xs uppercase tracking-wide text-paper-faint">Batas kategori per postingan</p>
      <p className="mt-1 text-xs text-paper-faint">
        Normalnya {DEFAULT_MAX_TAGS}. Turunkan sementara (mis. jadi 2-3) saat trafik lagi ramai biar server
        lebih ringan — berlaku langsung ke semua orang tanpa perlu deploy ulang.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          min={MIN_ALLOWED_MAX_TAGS}
          max={DEFAULT_MAX_TAGS}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-20 rounded-md border border-ink-line bg-ink-surface px-3 py-1.5 text-sm text-paper outline-none focus:border-amber"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-amber px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        {saved && <span className="text-xs text-mint">Tersimpan.</span>}
      </div>
      <p className="mt-2 font-mono text-xs text-paper-faint">
        Nilai aktif sekarang: {maxTags === null ? "…" : maxTags}
      </p>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function load() {
      const [usersSnap, reposSnap, booksSnap, groupsSnap, reports] = await Promise.all([
        getCountFromServer(collection(db, "users")),
        getCountFromServer(collection(db, "repos")),
        getCountFromServer(collection(db, "books")),
        getCountFromServer(collection(db, "groups")),
        ReportService.listAll(),
      ]);
      setStats({
        users: usersSnap.data().count,
        repos: reposSnap.data().count,
        books: booksSnap.data().count,
        groups: groupsSnap.data().count,
        pendingReports: reports.filter((r) => r.status === "pending").length,
      });
    }
    load();
  }, []);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total pengguna" value={stats?.users ?? null} />
        <StatCard label="Total repo" value={stats?.repos ?? null} />
        <StatCard label="Total buku" value={stats?.books ?? null} />
        <StatCard label="Total grup" value={stats?.groups ?? null} />
        <StatCard label="Laporan menunggu" value={stats?.pendingReports ?? null} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <TagLimitCard />
      </div>

      <p className="mt-6 text-xs text-paper-faint">
        Angka dihitung langsung dari Firestore saat halaman dibuka — cukup
        untuk komunitas skala kecil-menengah. Kalau datanya sudah besar
        sekali, hitungan seperti ini sebaiknya dipindah ke agregat
        terjadwal (Cloud Function) supaya tidak mahal.
      </p>
    </div>
  );
}
