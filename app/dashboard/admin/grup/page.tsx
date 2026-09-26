"use client";

import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { type Group } from "@/lib/groups";

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<Group[] | null>(null);

  useEffect(() => {
    getDocs(collection(db, "groups")).then((snap) => {
      setGroups(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ownerId: data.ownerId,
            ownerName: data.ownerName,
            name: data.name,
            description: data.description ?? "",
            joinMethod: data.joinMethod,
            inviteCode: data.inviteCode ?? null,
            memberCount: data.memberCount ?? 0,
            createdAt: 0,
            updatedAt: 0,
            lastMessageAt: 0,
          } satisfies Group;
        })
      );
    });
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Hapus grup ini? Semua channel dan pesan di dalamnya juga hilang.")) return;
    await deleteDoc(doc(db, "groups", id));
    setGroups((prev) => prev?.filter((g) => g.id !== id) ?? prev);
  }

  return (
    <div className="overflow-x-auto rounded-card border border-ink-line">
      <table className="w-full text-left text-sm">
        <thead className="bg-ink-soft text-xs uppercase tracking-wide text-paper-faint">
          <tr>
            <th className="px-4 py-3">Grup</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Anggota</th>
            <th className="px-4 py-3">Cara gabung</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {groups === null ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-paper-faint">
                Memuat...
              </td>
            </tr>
          ) : groups.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-paper-faint">
                Belum ada grup.
              </td>
            </tr>
          ) : (
            groups.map((g) => (
              <tr key={g.id} className="border-t border-ink-line">
                <td className="px-4 py-3 text-paper">{g.name}</td>
                <td className="px-4 py-3 text-paper-faint">{g.ownerName}</td>
                <td className="px-4 py-3 text-paper-faint">{g.memberCount}</td>
                <td className="px-4 py-3 text-paper-faint">{g.joinMethod}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(g.id)}
                    className="rounded-md border border-[#F45D5D]/40 px-2.5 py-1 text-xs text-[#F45D5D]"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
