import type { MessageAttachment } from "@/lib/groups";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const STATUS_COPY: Record<MessageAttachment["scanStatus"], { label: string; className: string }> = {
  clean: { label: "✓ Sudah dipindai, tidak terdeteksi masalah", className: "text-mint" },
  flagged: { label: "⚠ Terdeteksi berbahaya — file sudah dihapus dari server", className: "text-[#F45D5D]" },
  pending: { label: "⏳ Belum dipindai — pemindai belum aktif untuk grup ini", className: "text-amber-soft" },
  unscanned: { label: "⚠ Tidak bisa dipastikan aman — unduh dengan hati-hati", className: "text-amber-soft" },
};

export default function AttachmentView({ attachment }: { attachment: MessageAttachment }) {
  const status = STATUS_COPY[attachment.scanStatus] ?? STATUS_COPY.unscanned;
  const isImage = attachment.contentType.startsWith("image/");
  const blocked = attachment.scanStatus === "flagged";

  return (
    <div className="mt-2 max-w-sm rounded-md border border-ink-line bg-ink p-3">
      {isImage && !blocked ? (
        <a href={attachment.url} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={attachment.url} alt={attachment.name} className="max-h-64 rounded-md object-cover" />
        </a>
      ) : (
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg">📎</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-paper">{attachment.name}</p>
            <p className="text-xs text-paper-faint">{formatSize(attachment.size)}</p>
          </div>
        </div>
      )}

      <p className={`mt-2 text-[11px] ${status.className}`}>{status.label}</p>

      {!blocked && (
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          download={attachment.name}
          className="mt-1.5 inline-block text-xs text-amber-soft hover:underline"
        >
          Unduh →
        </a>
      )}
    </div>
  );
}
