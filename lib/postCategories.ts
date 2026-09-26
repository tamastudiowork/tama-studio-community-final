import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Taxonomy kategori/tag postingan.
 *
 * Catatan implementasi: dari daftar yang diminta, "full stack", "fronted"
 * (frontend), dan "pembangunan game" (pembuatan game) sudah muncul lagi
 * persis di grup Platform di bawah — sepertinya kebawa pas nulis draft.
 * Supaya tidak ada tag duplikat/pecah makna, grup "Jenis Postingan" di sini
 * cuma diisi 6 kategori umum yang memang beda konteksnya (curhat, nanya,
 * dst), dan Full Stack/Frontend/Pembuatan Game HANYA ada sekali, di grup
 * Platform sesuai daftar rincinya. Kalau ternyata itu bukan typo dan
 * kamu memang mau kategori terpisah, tinggal tambahkan entri baru di
 * CATEGORY_GROUPS di bawah.
 */

export type PostCategory = {
  slug: string;
  label: string;
};

export type PostCategoryGroup = {
  id: string;
  label: string;
  options: PostCategory[];
};

export const CATEGORY_GROUPS: PostCategoryGroup[] = [
  {
    id: "umum",
    label: "Jenis Postingan",
    options: [
      { slug: "curhat", label: "Curhat" },
      { slug: "nanya", label: "Nanya" },
      { slug: "peluncuran", label: "Peluncuran" },
      { slug: "meme", label: "Meme" },
      { slug: "kenalan", label: "Kenalan" },
      { slug: "minta-tolong", label: "Minta Tolong" },
    ],
  },
  {
    id: "platform",
    label: "Platform",
    options: [
      { slug: "full-stack", label: "Full Stack" },
      { slug: "backend", label: "Backend" },
      { slug: "pembuatan-game", label: "Pembuatan Game" },
      { slug: "android", label: "Android" },
      { slug: "desktop", label: "Desktop" },
      { slug: "keamanan", label: "Keamanan" },
      { slug: "frontend", label: "Frontend" },
      { slug: "vibe-coding", label: "Vibe Coding" },
      { slug: "ios", label: "iOS" },
      { slug: "mobile", label: "Mobile" },
      { slug: "devops", label: "DevOps" },
      { slug: "kecerdasan-buatan", label: "Kecerdasan Buatan" },
    ],
  },
  {
    id: "platform-lanjutan",
    label: "Lanjutan Platform",
    options: [
      { slug: "data", label: "Data" },
      { slug: "iot", label: "IoT" },
      { slug: "open-source", label: "Open Source" },
      { slug: "perangkat-keras", label: "Perangkat Keras" },
      { slug: "ekstensi-chrome", label: "Ekstensi Chrome" },
      { slug: "web3", label: "Web3" },
    ],
  },
  {
    id: "sektor",
    label: "Sektor",
    options: [
      { slug: "indonesia-emas", label: "Indonesia Emas" },
      { slug: "fintech-pembayaran", label: "Fintech & Pembayaran" },
      { slug: "edtech", label: "EdTech" },
      { slug: "media-sosial", label: "Media Sosial" },
      { slug: "bahasa-lokal", label: "Bahasa Lokal" },
      { slug: "pemerintahan", label: "Pemerintahan" },
      { slug: "produktivitas", label: "Produktivitas" },
      { slug: "jabodetabek", label: "Jabodetabek" },
      { slug: "online-to-offline", label: "Online-to-Offline" },
      { slug: "iklim", label: "Iklim" },
      { slug: "e-commerce", label: "E-Commerce" },
      { slug: "umkm", label: "UMKM" },
      { slug: "kesehatan-kebugaran", label: "Kesehatan & Kebugaran" },
      { slug: "logistik", label: "Logistik" },
      { slug: "halal", label: "Halal" },
      { slug: "agritech", label: "Agritech" },
      { slug: "saas", label: "SaaS" },
      { slug: "direct-to-consumer", label: "Direct-to-Consumer" },
      { slug: "pasar-sekunder", label: "Pasar Sekunder" },
    ],
  },
  {
    id: "bahasa",
    label: "Bahasa",
    options: [
      { slug: "javascript", label: "JavaScript" },
      { slug: "python", label: "Python" },
      { slug: "rust", label: "Rust" },
      { slug: "kotlin", label: "Kotlin" },
      { slug: "dart", label: "Dart" },
      { slug: "cpp", label: "C++" },
      { slug: "ruby", label: "Ruby" },
      { slug: "typescript", label: "TypeScript" },
      { slug: "go", label: "Go" },
      { slug: "java", label: "Java" },
      { slug: "swift", label: "Swift" },
      { slug: "csharp", label: "C#" },
      { slug: "php", label: "PHP" },
      { slug: "sql", label: "SQL" },
    ],
  },
];

/** slug -> label, buat nampilin tag di feed/detail tanpa perlu cari di semua grup. */
export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORY_GROUPS.flatMap((g) => g.options.map((o) => [o.slug, o.label]))
);

export function categoryLabel(slug: string): string {
  return CATEGORY_LABELS[slug] ?? slug;
}

export const MIN_TAGS = 2;
/** Batas default kalau belum ada override admin, atau lagi belum sempat kebaca dari Firestore. */
export const DEFAULT_MAX_TAGS = 7;
/** Batas paling kecil yang boleh diset admin waktu traffic lagi ramai. */
export const MIN_ALLOWED_MAX_TAGS = 2;

/**
 * Batas maksimal tag disimpan di Firestore (config/postLimits.maxTags),
 * bukan konstanta statis — supaya admin bisa nurunin dari 6 jadi 2-3 saat
 * server lagi keteteran (banyak request bareng), tanpa perlu redeploy.
 * Diatur dari Dashboard Admin. Kalau dokumennya belum pernah diisi,
 * dianggap DEFAULT_MAX_TAGS.
 */
export function subscribeMaxTags(cb: (maxTags: number) => void) {
  return onSnapshot(doc(db, "config", "postLimits"), (snap) => {
    const value = snap.exists() ? Number(snap.data().maxTags) : DEFAULT_MAX_TAGS;
    cb(Number.isFinite(value) && value >= MIN_ALLOWED_MAX_TAGS ? value : DEFAULT_MAX_TAGS);
  });
}

export async function setMaxTags(maxTags: number) {
  const clamped = Math.max(MIN_ALLOWED_MAX_TAGS, Math.min(DEFAULT_MAX_TAGS, Math.round(maxTags)));
  await setDoc(doc(db, "config", "postLimits"), { maxTags: clamped }, { merge: true });
}
