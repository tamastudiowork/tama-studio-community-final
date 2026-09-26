"use client";

import { useEffect, useState, FormEvent } from "react";
import { ApiKeyService, API_KEY_TYPE_LABEL, type ApiKeyMeta, type ApiKeyType } from "@/lib/apiKeys";

const TYPES: ApiKeyType[] = ["supabase-1", "supabase-2", "gemini", "deepseek", "other"];

function isSupabaseType(type: ApiKeyType) {
  return type === "supabase-1" || type === "supabase-2";
}

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyMeta[]>([]);
  const [type, setType] = useState<ApiKeyType>("supabase-1");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseServiceKey, setSupabaseServiceKey] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = ApiKeyService.subscribeAll(setKeys);
    return unsub;
  }, []);

  async function handlePublish(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (isSupabaseType(type)) {
      if (!supabaseUrl.trim() || !supabaseServiceKey.trim()) {
        setError("Project URL dan Service Role Key Supabase wajib diisi keduanya.");
        return;
      }
    } else if (!value.trim()) {
      setError("Isi dulu nilai API key-nya.");
      return;
    }
    if (type === "other" && !label.trim()) {
      setError("Label wajib diisi untuk jenis \"Lainnya\".");
      return;
    }

    setPublishing(true);
    try {
      const finalValue = isSupabaseType(type)
        ? JSON.stringify({ url: supabaseUrl.trim(), serviceRoleKey: supabaseServiceKey.trim() })
        : value;
      await ApiKeyService.publish(type, label, finalValue);
      setValue("");
      setLabel("");
      setSupabaseUrl("");
      setSupabaseServiceKey("");
    } catch (err: any) {
      setError(
        err?.message?.includes("permission-denied") || err?.code === "permission-denied"
          ? "Ditolak — pastikan setup Secret Manager & IAM sudah dilakukan (lihat functions/src/apiKeys.ts)."
          : "Gagal menerbitkan API key. Coba lagi."
      );
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus API key ini? Nilainya akan dihapus permanen dari Secret Manager.")) return;
    await ApiKeyService.remove(id);
  }

  return (
    <div>
      <p className="text-sm text-paper-dim">
        Nilai API key disimpan di{" "}
        <a
          href="https://console.cloud.google.com/security/secret-manager"
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-soft hover:underline"
        >
          Google Secret Manager
        </a>
        , bukan di database aplikasi ini — supaya nilainya tidak pernah
        ikut ke-download ke browser siapa pun, termasuk browser admin
        sendiri. Yang tersimpan di sini cuma metadata & preview ter-mask.
      </p>

      <form onSubmit={handlePublish} className="mt-6 space-y-4 rounded-card border border-ink-line bg-ink-soft p-5">
        <div>
          <label className="mb-1.5 block text-sm text-paper-dim">Jenis API key</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ApiKeyType)}
            className="w-full rounded-md border border-ink-line bg-ink px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {API_KEY_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>

        {type === "other" && (
          <div>
            <label className="mb-1.5 block text-sm text-paper-dim">Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="mis. OpenAI, Resend, Stripe..."
              className="w-full rounded-md border border-ink-line bg-ink px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            />
          </div>
        )}

        {isSupabaseType(type) ? (
          <>
            <div>
              <label className="mb-1.5 block text-sm text-paper-dim">Project URL</label>
              <input
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xxxxxxxx.supabase.co"
                className="w-full rounded-md border border-ink-line bg-ink px-3.5 py-2.5 font-mono text-sm text-paper outline-none focus:border-amber"
              />
              <p className="mt-1 text-xs text-paper-faint">
                Dashboard Supabase → Project Settings → API → Project URL
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-paper-dim">Service Role Key</label>
              <input
                type="password"
                value={supabaseServiceKey}
                onChange={(e) => setSupabaseServiceKey(e.target.value)}
                placeholder="eyJhbGciOi..."
                className="w-full rounded-md border border-ink-line bg-ink px-3.5 py-2.5 font-mono text-sm text-paper outline-none focus:border-amber"
              />
              <p className="mt-1 text-xs text-paper-faint">
                Dashboard Supabase → Project Settings → API → Project API keys →{" "}
                <span className="text-amber-soft">service_role</span> (bukan anon/public — service_role
                punya akses penuh, makanya cuma disimpan lewat Secret Manager, tidak pernah di Firestore)
              </p>
            </div>
          </>
        ) : (
          <div>
            <label className="mb-1.5 block text-sm text-paper-dim">Nilai API key</label>
            <input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Tempel API key di sini"
              className="w-full rounded-md border border-ink-line bg-ink px-3.5 py-2.5 font-mono text-sm text-paper outline-none focus:border-amber"
            />
          </div>
        )}

        {error && <p className="text-sm text-[#F45D5D]">{error}</p>}

        <button
          type="submit"
          disabled={publishing}
          className="rounded-md bg-amber px-5 py-2.5 text-sm font-semibold text-ink shadow-glow disabled:opacity-60"
        >
          {publishing ? "Menerbitkan..." : "Publish"}
        </button>
      </form>

      <div className="mt-8">
        <p className="font-mono text-xs uppercase tracking-wide text-paper-faint">
          Tersimpan ({keys.length})
        </p>
        <div className="mt-3 space-y-2">
          {keys.length === 0 && <p className="text-sm text-paper-faint">Belum ada API key.</p>}
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between rounded-md border border-ink-line bg-ink-soft px-4 py-3">
              <div>
                <p className="text-sm text-paper">
                  {API_KEY_TYPE_LABEL[k.type]}
                  {k.label ? ` — ${k.label}` : ""}
                </p>
                <p className="font-mono text-xs text-paper-faint">{k.maskedPreview}</p>
              </div>
              <button
                onClick={() => handleDelete(k.id)}
                className="rounded-md border border-[#F45D5D]/40 px-3 py-1.5 text-xs text-[#F45D5D]"
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
