import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";
import type { MessageAttachment } from "./groups";

// Batas ukuran & tipe file di sisi client. Ini BUKAN pengganti pemindaian
// keamanan — lihat catatan panjang di README soal kenapa upload file
// tanpa backend scanning tetap berisiko meski dibatasi begini.
export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
export const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/json",
];

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File maksimal ${MAX_FILE_SIZE / 1024 / 1024}MB.`;
  }
  if (ALLOWED_TYPES.length && !ALLOWED_TYPES.includes(file.type)) {
    return "Tipe file ini tidak didukung. Coba gambar, PDF, teks, zip, atau JSON.";
  }
  return null;
}

export async function uploadGroupFile(
  groupId: string,
  channelId: string,
  uploaderUid: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<MessageAttachment> {
  const path = `groups/${groupId}/${channelId}/${uploaderUid}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file, { contentType: file.type });

  await new Promise<void>((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => {
        onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      },
      reject,
      () => resolve()
    );
  });

  const url = await getDownloadURL(storageRef);

  return {
    name: file.name,
    url,
    size: file.size,
    contentType: file.type,
    storagePath: path,
    // 'pending' berarti "belum ada verdict pemindaian". Kalau Cloud
    // Function pemindai (lihat functions/) tidak di-deploy, field ini
    // akan tetap 'pending' selamanya — UI pesan file menampilkan ini
    // apa adanya, tidak berpura-pura file sudah aman.
    scanStatus: "pending",
  };
}

export async function deleteGroupFile(storagePath: string) {
  await deleteObject(ref(storage, storagePath)).catch(() => {
    // File mungkin sudah dihapus (mis. oleh Cloud Function karena
    // terdeteksi berbahaya) — abaikan errornya.
  });
}

/** Upload foto profil saat onboarding/edit profil. Gambar saja, maks 5MB. */
export async function uploadAvatar(uid: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File harus berupa gambar.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Ukuran foto maksimal 5MB.");
  }
  const path = `avatars/${uid}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytesResumable(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

/** Upload banner/header profil dari halaman edit profil. Gambar saja, maks 8MB. */
export async function uploadBanner(uid: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File harus berupa gambar.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Ukuran banner maksimal 8MB.");
  }
  const path = `banners/${uid}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytesResumable(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}
