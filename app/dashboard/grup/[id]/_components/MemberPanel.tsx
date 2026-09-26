"use client";

import type { JoinRequest, Member, MemberRole } from "@/lib/groups";

const ROLE_LABEL: Record<MemberRole, string> = { owner: "Owner", admin: "Admin", member: "Anggota" };

export default function MemberPanel({
  members,
  joinRequests,
  currentUid,
  canManage,
  onSetRole,
  onRemove,
  onApprove,
  onReject,
  onClose,
}: {
  members: Member[];
  joinRequests: JoinRequest[];
  currentUid: string;
  canManage: boolean;
  onSetRole: (uid: string, role: MemberRole) => void;
  onRemove: (uid: string) => void;
  onApprove: (req: JoinRequest) => void;
  onReject: (uid: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="w-72 shrink-0 border-l border-ink-line bg-ink-soft/40 px-4 py-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-wide text-paper-faint">
          Anggota ({members.length})
        </p>
        <button onClick={onClose} className="text-paper-faint hover:text-paper" title="Tutup">
          ✕
        </button>
      </div>

      {canManage && joinRequests.length > 0 && (
        <div className="mt-4">
          <p className="font-mono text-[11px] uppercase tracking-wide text-amber-soft">
            Menunggu persetujuan ({joinRequests.length})
          </p>
          <div className="mt-2 space-y-2">
            {joinRequests.map((req) => (
              <div key={req.uid} className="rounded-md border border-ink-line bg-ink p-2.5">
                <p className="truncate text-sm text-paper">{req.name}</p>
                <div className="mt-1.5 flex gap-2">
                  <button
                    onClick={() => onApprove(req)}
                    className="flex-1 rounded bg-mint/15 py-1 text-xs font-medium text-mint"
                  >
                    Setujui
                  </button>
                  <button
                    onClick={() => onReject(req.uid)}
                    className="flex-1 rounded bg-[#F45D5D]/10 py-1 text-xs font-medium text-[#F45D5D]"
                  >
                    Tolak
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-1">
        {members
          .sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : 0))
          .map((m) => (
            <div key={m.uid} className="group flex items-center gap-2 rounded-md px-1.5 py-1.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-surface text-xs font-semibold text-amber-soft">
                {m.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoURL} alt="" className="h-full w-full object-cover" />
                ) : (
                  m.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-paper">{m.name}</p>
                <p className="text-[11px] text-paper-faint">{ROLE_LABEL[m.role]}</p>
              </div>

              {canManage && m.role !== "owner" && m.uid !== currentUid && (
                <div className="hidden shrink-0 items-center gap-1 group-hover:flex">
                  <button
                    onClick={() => onSetRole(m.uid, m.role === "admin" ? "member" : "admin")}
                    className="rounded px-1.5 py-0.5 text-[10px] text-paper-faint hover:text-paper"
                    title={m.role === "admin" ? "Jadikan anggota biasa" : "Jadikan admin"}
                  >
                    {m.role === "admin" ? "Turunkan" : "Jadikan admin"}
                  </button>
                  <button
                    onClick={() => onRemove(m.uid)}
                    className="rounded px-1.5 py-0.5 text-[10px] text-paper-faint hover:text-[#F45D5D]"
                    title="Keluarkan dari grup"
                  >
                    Keluarkan
                  </button>
                </div>
              )}
              {m.uid !== currentUid && (
                <a
                  href={`/dashboard/pesan?uid=${m.uid}&name=${encodeURIComponent(m.name)}`}
                  className="hidden shrink-0 rounded px-1.5 py-0.5 text-[10px] text-paper-faint hover:text-paper group-hover:block"
                  title="Kirim pesan"
                >
                  ✉
                </a>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
