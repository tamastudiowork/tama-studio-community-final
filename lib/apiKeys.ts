import { collection, doc, DocumentData, getDocs, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";

export type ApiKeyType = "supabase-1" | "supabase-2" | "gemini" | "deepseek" | "other";

export const API_KEY_TYPE_LABEL: Record<ApiKeyType, string> = {
  "supabase-1": "Supabase 1",
  "supabase-2": "Supabase 2",
  gemini: "AI Gemini",
  deepseek: "AI DeepSeek",
  other: "Lainnya",
};

export type ApiKeyMeta = {
  id: string;
  type: ApiKeyType;
  label: string | null;
  maskedPreview: string;
  createdBy: string;
  createdAt: number;
};

function toMillis(v: Timestamp | number | undefined): number {
  if (!v) return Date.now();
  if (typeof v === "number") return v;
  return v.toMillis();
}

function fromDoc(id: string, data: DocumentData): ApiKeyMeta {
  return {
    id,
    type: data.type,
    label: data.label ?? null,
    maskedPreview: data.maskedPreview ?? "••••••••",
    createdBy: data.createdBy,
    createdAt: toMillis(data.createdAt),
  };
}

const col = collection(db, "apiKeyMeta");

const saveApiKeyFn = httpsCallable<{ type: ApiKeyType; label: string; value: string }, { id: string }>(
  functions,
  "saveApiKey"
);
const deleteApiKeyFn = httpsCallable<{ id: string }, { ok: boolean }>(functions, "deleteApiKey");

export const ApiKeyService = {
  subscribeAll(cb: (keys: ApiKeyMeta[]) => void) {
    const q = query(col, orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => cb(snap.docs.map((d) => fromDoc(d.id, d.data()))));
  },

  async listAll(): Promise<ApiKeyMeta[]> {
    const q = query(col, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => fromDoc(d.id, d.data()));
  },

  /**
   * Kirim nilai asli API key ke Cloud Function `saveApiKey`, yang
   * menyimpannya ke Google Secret Manager (BUKAN Firestore) dan cuma
   * menyisakan preview ter-mask di sini. Nilai asli tidak pernah
   * tersimpan di database aplikasi.
   */
  async publish(type: ApiKeyType, label: string, value: string): Promise<string> {
    const result = await saveApiKeyFn({ type, label, value });
    return result.data.id;
  },

  async remove(id: string) {
    await deleteApiKeyFn({ id });
  },
};
