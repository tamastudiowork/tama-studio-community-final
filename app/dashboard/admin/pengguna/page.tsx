"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { UserService, type UserProfile } from "@/lib/users";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [search, setSearch] = useState("");
  // Draft badge yang lagi diketik per uid, sebelum disimpan — supaya
  // input tidak langsung nulis ke Firestore tiap ketikan.
  const [badgeDrafts, setBadgeDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    UserService.listAll().then(setUsers);
  }, []);

  async function toggleVerified(u: UserProfile) {
    const next = !u.verified;
    await UserService.setVerified(u.uid, next);
    setUsers((prev) => prev?.map((x) => (x.uid === u.uid ? { ...x, verified: next } : x)) ?? prev);
  }

  async function saveBadge(u: UserProfile) {
    const value = badgeDrafts[u.uid] ?? u.badge;
    await UserService.setBadge(u.uid, value);
    setUsers((prev) => prev?.map((x) => (x.uid === u.uid ? { ...x, badge: value.trim() } : x)) ?? prev);
    setBadgeDrafts((prev) => {
      const next = { ...prev };
      delete next[u.uid];
      return next;
    });
  }

  const filtered = useMemo(() => {
    if (!users) return null;
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, search]);

  async function toggleStatus(u: UserProfile) {
    const next = u.status === "active" ? "suspended" : "active";
    await UserService.setStatus(u.uid, next);
    setUsers((prev) => prev?.map((x) => (x.uid === u.uid ? { ...x, status: next } : x)) ?? prev);
  }

  async function toggleRole(u: UserProfile) {
    const next = u.role === "admin" ? "member" : "admin";
    await UserService.setRole(u.uid, next);
    setUsers((prev) => prev?.map((x) => (x.uid === u.uid ? { ...x, role: next } : x)) ?? prev);
  }

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cari nama atau email..."
        className="w-full max-w-xs rounded-md border border-ink-line bg-ink-soft px-3.5 py-2 text-sm text-paper outline-none focus:border-amber"
      />

      <div className="mt-5 overflow-x-auto rounded-card border border-ink-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-soft text-xs uppercase tracking-wide text-paper-faint">
            <tr>
              <th className="px-4 py-3">Pengguna</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Verifikasi</th>
              <th className="px-4 py-3">Badge</th>
              <th className="px-4 py-3">Bergabung</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered === null ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-paper-faint">
                  Memuat...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-paper-faint">
                  Tidak ada yang cocok.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.uid} className="border-t border-ink-line">
                  <td className="px-4 py-3">
                    <p className="text-paper">{u.name}</p>
                    <p className="text-xs text-paper-faint">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${
                        u.role === "admin" ? "border-amber-dim text-amber-soft" : "border-ink-line text-paper-faint"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${
                        u.status === "active" ? "border-mint-dim text-mint" : "border-[#F45D5D]/40 text-[#F45D5D]"
                      }`}
                    >
                      {u.status === "active" ? "Aktif" : "Ditangguhkan"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleVerified(u)}
                      className={`rounded-md border px-2.5 py-1 text-xs ${
                        u.verified ? "border-amber-dim text-amber-soft" : "border-ink-line text-paper-faint"
                      }`}
                    >
                      {u.verified ? "✓ Terverifikasi" : "Belum"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <input
                        value={badgeDrafts[u.uid] ?? u.badge}
                        onChange={(e) => setBadgeDrafts((prev) => ({ ...prev, [u.uid]: e.target.value }))}
                        placeholder="Top Creator..."
                        className="w-32 rounded-md border border-ink-line bg-ink-soft px-2 py-1 text-xs text-paper outline-none focus:border-amber"
                      />
                      {badgeDrafts[u.uid] !== undefined && badgeDrafts[u.uid] !== u.badge && (
                        <button
                          onClick={() => saveBadge(u)}
                          className="rounded-md bg-amber px-2 py-1 text-xs font-semibold text-ink"
                        >
                          Simpan
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-paper-faint">
                    {new Date(u.createdAt).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    {u.uid !== currentUser?.uid && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => toggleRole(u)}
                          className="rounded-md border border-ink-line px-2.5 py-1 text-xs text-paper-dim hover:border-paper-dim"
                        >
                          {u.role === "admin" ? "Cabut admin" : "Jadikan admin"}
                        </button>
                        <button
                          onClick={() => toggleStatus(u)}
                          className={`rounded-md border px-2.5 py-1 text-xs ${
                            u.status === "active"
                              ? "border-[#F45D5D]/40 text-[#F45D5D]"
                              : "border-mint-dim text-mint"
                          }`}
                        >
                          {u.status === "active" ? "Tangguhkan" : "Pulihkan"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
