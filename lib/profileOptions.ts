/**
 * Konstanta & tipe untuk fitur Edit Profil.
 */

export type ProfileCategory =
  | "creator"
  | "bisnis"
  | "komunitas"
  | "gamer"
  | "artist"
  | "developer"
  | "lainnya";

export const PROFILE_CATEGORIES: { value: ProfileCategory; label: string }[] = [
  { value: "creator", label: "Creator" },
  { value: "bisnis", label: "Bisnis" },
  { value: "komunitas", label: "Komunitas" },
  { value: "gamer", label: "Gamer" },
  { value: "artist", label: "Artist" },
  { value: "developer", label: "Developer" },
  { value: "lainnya", label: "Lainnya" },
];

export function profileCategoryLabel(value: string): string {
  return PROFILE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

/**
 * Tema warna profil — dipakai buat aksen header/tombol di profil publik.
 * Disimpan sebagai kode hex (bukan cuma nama kelas Tailwind) karena warna
 * ini dinamis per-pengguna dan Tailwind tidak bisa generate kelas dari
 * variabel saat runtime — makanya dipakai lewat inline style di halaman
 * profil publik, bukan className.
 */
export type ThemeColorId = "amber" | "mint" | "rose" | "sky" | "violet" | "slate";

export const THEME_COLORS: { id: ThemeColorId; label: string; hex: string }[] = [
  { id: "amber", label: "Amber", hex: "#F2A93B" },
  { id: "mint", label: "Mint", hex: "#3FD69C" },
  { id: "rose", label: "Rose", hex: "#F45D5D" },
  { id: "sky", label: "Sky", hex: "#3FA9F5" },
  { id: "violet", label: "Violet", hex: "#A374F2" },
  { id: "slate", label: "Slate", hex: "#B9B6C4" },
];

export function themeColorHex(id: string): string {
  return THEME_COLORS.find((t) => t.id === id)?.hex ?? THEME_COLORS[0].hex;
}

export type ProfileVisibility = "public" | "followers" | "private";

// Komunitas ini pakai model follow (satu arah), bukan pertemanan dua arah
// — jadi opsi "Hanya Teman" diadaptasi jadi "Hanya Pengikut".
export const VISIBILITY_OPTIONS: { value: ProfileVisibility; label: string; description: string }[] = [
  { value: "public", label: "Publik", description: "Semua orang bisa lihat profil & postinganmu." },
  { value: "followers", label: "Hanya Pengikut", description: "Cuma yang mengikutimu bisa lihat isi profil." },
  { value: "private", label: "Privat", description: "Cuma kamu sendiri yang bisa lihat profil ini." },
];

export function visibilityLabel(value: string): string {
  return VISIBILITY_OPTIONS.find((v) => v.value === value)?.label ?? value;
}

export const BIO_MAX_LENGTH = 160;
export const DISPLAY_NAME_MIN_LENGTH = 3;
export const DISPLAY_NAME_MAX_LENGTH = 50;
export const MAX_MULTI_LINKS = 8;
export const MAX_HIGHLIGHTS = 6;

/**
 * Badge gamifikasi otomatis berdasarkan jumlah pengikut — dihitung on the
 * fly dari FollowService.countFollowers(), TIDAK disimpan sebagai field
 * di profil (biar tidak basi kalau follower naik/turun). Ini terpisah
 * dari `badge` custom yang cuma admin bisa set (mis. "Top Creator").
 */
export function followerMilestoneBadge(followerCount: number): string | null {
  if (followerCount >= 1000) return "1000+ Pengikut";
  if (followerCount >= 100) return "100+ Pengikut";
  if (followerCount >= 10) return "10+ Pengikut";
  return null;
}
