import {
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type UserRole = "member" | "admin";
export type UserStatus = "active" | "suspended";
export type Occupation = "software-engineer" | "web-development" | "design" | "other";
export type AvatarShape = "circle" | "square";

export type PersonalFirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  realtimeDbUrl: string;
};

/** Satu entri di Multi Link (kayak Lnk.bio) — IG, YT, donasi, toko, dst. */
export type ProfileLink = {
  id: string;
  label: string;
  url: string;
};

export type UserProfile = {
  uid: string;
  name: string;
  username: string;
  email: string;
  photoURL: string | null;
  bio: string;
  dob: string; // "YYYY-MM-DD", kosong kalau belum diisi
  purpose: string;
  occupation: Occupation | "";
  occupationOther: string;
  personalFirebaseConfig: PersonalFirebaseConfig | null;
  onboardingComplete: boolean;
  role: UserRole;
  status: UserStatus;
  createdAt: number;

  // --- Identitas dasar tambahan ---
  bannerURL: string | null;
  avatarShape: AvatarShape;

  // --- Link & kontak ---
  websiteUrl: string;
  links: ProfileLink[];
  contactEmail: string;
  hideContactEmail: boolean;
  whatsapp: string;

  // --- Kategori & verifikasi ---
  profileCategory: string; // ProfileCategory | ""
  location: string;
  /** Cuma admin yang bisa ubah (lihat UserService.setVerified) — bukan self-service. */
  verified: boolean;

  // --- Kustomisasi & privasi ---
  themeColor: string; // ThemeColorId
  visibility: "public" | "followers" | "private";
  hideLocation: boolean;
  hideLastActive: boolean;
  lastActiveAt: number;

  // --- Fitur sosmed lain ---
  pinnedPostId: string | null;
  highlightPostIds: string[];
  /** Badge custom, cuma admin yang bisa set (mis. "Top Creator"). Badge follower otomatis dihitung terpisah, lihat lib/profileOptions.ts. */
  badge: string;
};

function toMillis(v: Timestamp | number | undefined): number {
  if (!v) return Date.now();
  if (typeof v === "number") return v;
  return v.toMillis();
}

function fromDoc(uid: string, data: DocumentData): UserProfile {
  return {
    uid,
    name: data.name ?? "Anonim",
    username: data.username ?? "",
    email: data.email ?? "",
    photoURL: data.photoURL ?? null,
    bio: data.bio ?? "",
    dob: data.dob ?? "",
    purpose: data.purpose ?? "",
    occupation: data.occupation ?? "",
    occupationOther: data.occupationOther ?? "",
    personalFirebaseConfig: data.personalFirebaseConfig ?? null,
    onboardingComplete: Boolean(data.onboardingComplete),
    role: data.role === "admin" ? "admin" : "member",
    status: data.status === "suspended" ? "suspended" : "active",
    createdAt: toMillis(data.createdAt),

    bannerURL: data.bannerURL ?? null,
    avatarShape: data.avatarShape === "square" ? "square" : "circle",

    websiteUrl: data.websiteUrl ?? "",
    links: Array.isArray(data.links) ? data.links : [],
    contactEmail: data.contactEmail ?? "",
    hideContactEmail: Boolean(data.hideContactEmail),
    whatsapp: data.whatsapp ?? "",

    profileCategory: data.profileCategory ?? "",
    location: data.location ?? "",
    verified: Boolean(data.verified),

    themeColor: data.themeColor ?? "amber",
    visibility: data.visibility === "followers" || data.visibility === "private" ? data.visibility : "public",
    hideLocation: Boolean(data.hideLocation),
    hideLastActive: Boolean(data.hideLastActive),
    lastActiveAt: toMillis(data.lastActiveAt),

    pinnedPostId: data.pinnedPostId ?? null,
    highlightPostIds: Array.isArray(data.highlightPostIds) ? data.highlightPostIds : [],
    badge: data.badge ?? "",
  };
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export const UserService = {
  /**
   * Dipanggil setiap kali seseorang login/register (lihat lib/useAuth
   * pemanggilnya di halaman login & register). Membuat dokumen profil
   * kalau belum ada, atau memperbarui name/email/photoURL kalau berubah
   * (mis. ganti foto profil Google) — TANPA menimpa role/status/data
   * onboarding yang sudah diisi sebelumnya.
   */
  async ensureProfile(user: { uid: string; name: string; email: string; photoURL: string | null }) {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        name: user.name,
        username: "",
        email: user.email,
        photoURL: user.photoURL,
        bio: "",
        dob: "",
        purpose: "",
        occupation: "",
        occupationOther: "",
        personalFirebaseConfig: null,
        onboardingComplete: false,
        role: "member",
        status: "active",
        createdAt: serverTimestamp(),

        bannerURL: null,
        avatarShape: "circle",
        websiteUrl: "",
        links: [],
        contactEmail: "",
        hideContactEmail: false,
        whatsapp: "",
        profileCategory: "",
        location: "",
        verified: false,
        themeColor: "amber",
        visibility: "public",
        hideLocation: false,
        hideLastActive: false,
        lastActiveAt: serverTimestamp(),
        pinnedPostId: null,
        highlightPostIds: [],
        badge: "",
      });
    } else {
      await updateDoc(ref, { name: user.name, email: user.email, photoURL: user.photoURL });
    }

    // Indeks kecil email -> uid, SUPAYA fitur "undang kolaborator lewat
    // email" (buku multi-penulis) bisa cari uid tanpa perlu izin
    // "list semua pengguna" (yang sengaja dibatasi admin-only di
    // firestore.rules). Ini cuma pencarian langsung by document ID
    // (getDoc), bukan browsing daftar — jadi tidak membocorkan daftar
    // pengguna ke siapa pun.
    if (user.email) {
      await setDoc(
        doc(db, "emailIndex", user.email.toLowerCase()),
        { uid: user.uid },
        { merge: true }
      );
    }
  },

  /** Cari uid dari email — dipakai fitur undang kolaborator buku. */
  async findUidByEmail(email: string): Promise<string | null> {
    const snap = await getDoc(doc(db, "emailIndex", email.trim().toLowerCase()));
    return snap.exists() ? (snap.data().uid as string) : null;
  },

  async get(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    return fromDoc(snap.id, snap.data());
  },

  subscribe(uid: string, cb: (profile: UserProfile | null) => void) {
    return onSnapshot(doc(db, "users", uid), (snap) => {
      cb(snap.exists() ? fromDoc(snap.id, snap.data()) : null);
    });
  },

  async listAll(): Promise<UserProfile[]> {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => fromDoc(d.id, d.data()));
  },

  async setRole(uid: string, role: UserRole) {
    await updateDoc(doc(db, "users", uid), { role });
  },

  async setStatus(uid: string, status: UserStatus) {
    await updateDoc(doc(db, "users", uid), { status });
  },

  // --- Username (unik, dipakai sebagai handle publik) ---

  async isUsernameAvailable(username: string): Promise<boolean> {
    const normalized = normalizeUsername(username);
    if (!normalized) return false;
    const snap = await getDoc(doc(db, "usernames", normalized));
    return !snap.exists();
  },

  /** Dipakai halaman profil publik /dashboard/u/[username]. */
  async getUidByUsername(username: string): Promise<string | null> {
    const snap = await getDoc(doc(db, "usernames", normalizeUsername(username)));
    return snap.exists() ? (snap.data().uid as string) : null;
  },

  /** Klaim username baru dan lepas username lama (kalau ada & beda). */
  async claimUsername(uid: string, username: string, previousUsername?: string) {
    const normalized = normalizeUsername(username);
    await setDoc(doc(db, "usernames", normalized), { uid });
    if (previousUsername && normalizeUsername(previousUsername) !== normalized) {
      await deleteDoc(doc(db, "usernames", normalizeUsername(previousUsername))).catch(() => {});
    }
  },

  // --- Onboarding ---

  async completeOnboarding(
    uid: string,
    data: {
      name: string;
      username: string;
      bio: string;
      dob: string;
      purpose: string;
      occupation: Occupation;
      occupationOther: string;
      personalFirebaseConfig: PersonalFirebaseConfig | null;
    }
  ) {
    await updateDoc(doc(db, "users", uid), {
      name: data.name.trim(),
      username: normalizeUsername(data.username),
      bio: data.bio.trim(),
      dob: data.dob,
      purpose: data.purpose.trim(),
      occupation: data.occupation,
      occupationOther: data.occupation === "other" ? data.occupationOther.trim() : "",
      personalFirebaseConfig: data.personalFirebaseConfig,
      onboardingComplete: true,
    });
  },

  // --- Edit Profil ---

  /**
   * Simpan semua field yang boleh diedit pengguna sendiri lewat halaman
   * /dashboard/profil/edit. Sengaja SATU fungsi untuk semua field
   * self-editable (bukan field-per-field) supaya satu klik simpan = satu
   * write ke Firestore. `verified` dan `badge` custom SENGAJA tidak ada
   * di sini — itu admin-only, lihat setVerified/setBadge di bawah, dan
   * firestore.rules memblokir pengguna biasa mengubah keduanya lewat
   * updateDoc apa pun (onlyTouchesOwnSyncFields tidak menyertakan
   * field itu).
   */
  async updateProfileDetails(
    uid: string,
    data: {
      name: string;
      bio: string;
      photoURL: string | null;
      bannerURL: string | null;
      avatarShape: AvatarShape;
      websiteUrl: string;
      links: ProfileLink[];
      contactEmail: string;
      hideContactEmail: boolean;
      whatsapp: string;
      profileCategory: string;
      location: string;
      themeColor: string;
      visibility: "public" | "followers" | "private";
      hideLocation: boolean;
      hideLastActive: boolean;
      pinnedPostId: string | null;
      highlightPostIds: string[];
    }
  ) {
    await updateDoc(doc(db, "users", uid), {
      name: data.name.trim(),
      bio: data.bio.trim(),
      photoURL: data.photoURL,
      bannerURL: data.bannerURL,
      avatarShape: data.avatarShape,
      websiteUrl: data.websiteUrl.trim(),
      links: data.links,
      contactEmail: data.contactEmail.trim(),
      hideContactEmail: data.hideContactEmail,
      whatsapp: data.whatsapp.trim(),
      profileCategory: data.profileCategory,
      location: data.location.trim(),
      themeColor: data.themeColor,
      visibility: data.visibility,
      hideLocation: data.hideLocation,
      hideLastActive: data.hideLastActive,
      pinnedPostId: data.pinnedPostId,
      highlightPostIds: data.highlightPostIds,
    });
  },

  /** Catat "terakhir online" — dipanggil throttled dari DashboardLayout, bukan tiap render. */
  async touchLastActive(uid: string) {
    await updateDoc(doc(db, "users", uid), { lastActiveAt: serverTimestamp() }).catch(() => {
      // Kalau gagal (mis. offline sebentar) diamkan saja — bukan operasi kritis.
    });
  },

  /** Centang verifikasi — HANYA admin (dicek juga di firestore.rules), bukan self-service. */
  async setVerified(uid: string, verified: boolean) {
    await updateDoc(doc(db, "users", uid), { verified });
  },

  /** Badge custom seperti "Top Creator" — HANYA admin yang bisa memberikan. */
  async setBadge(uid: string, badge: string) {
    await updateDoc(doc(db, "users", uid), { badge: badge.trim() });
  },
};
