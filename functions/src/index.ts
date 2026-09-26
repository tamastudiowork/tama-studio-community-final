/**
 * PEMINDAI FILE UNGGAHAN GRUP — OPSIONAL, TIDAK OTOMATIS AKTIF.
 *
 * Ini bukan "bot scanning" ajaib. Cara kerjanya:
 * 1. Trigger jalan setiap ada file baru selesai diunggah ke Storage di
 *    path `groups/{groupId}/{channelId}/{uid}/{filename}`.
 * 2. Hitung hash SHA-256 file itu, lalu tanya ke VirusTotal APAKAH hash
 *    ini sudah pernah dilaporkan berbahaya oleh mesin antivirus mereka.
 *    Ini LOOKUP CEPAT berbasis hash yang sudah diketahui — BUKAN analisis
 *    mendalam isi file. File baru/belum pernah beredar akan menghasilkan
 *    "tidak ditemukan di database VirusTotal", dan kita tandai sebagai
 *    'unscanned' (bukan 'clean') karena kita jujur tidak tahu.
 * 3. Kalau VirusTotal bilang beberapa mesin antivirus menandainya
 *    berbahaya → file dihapus dari Storage dan pesannya ditandai
 *    'flagged'. Kalau VirusTotal punya catatan file ini dan 0 mesin
 *    menandainya → 'clean'. Selain itu → 'unscanned'.
 *
 * SETUP (wajib sebelum fungsi ini aktif):
 *   1. Daftar API key gratis di https://www.virustotal.com/gui/join-us
 *   2. `firebase functions:config:set virustotal.key="API_KEY_KAMU"`
 *      (atau pakai Secret Manager kalau pakai functions v2 dengan secrets)
 *   3. `cd functions && npm install && npm run deploy`
 *
 * Tanpa langkah di atas, field `scanStatus` di setiap pesan file akan
 * tetap 'pending' selamanya — dan UI di aplikasi utama SUDAH didesain
 * untuk menampilkan itu apa adanya (peringatan "belum dipindai"), bukan
 * berpura-pura aman.
 */

import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import fetch from "node-fetch";

if (!admin.apps.length) admin.initializeApp();

export { saveApiKey, deleteApiKey } from "./apiKeys";
export { reviewContent, moderateNewGroupMessage, translateError, rubberDuckChat, codeToDiagram } from "./ai";
export {
  mirrorRepos,
  mirrorBooks,
  mirrorGroups,
  mirrorUsers,
  mirrorShowcase,
  mirrorClips,
  mirrorJobs,
  mirrorConversations,
} from "./supabaseMirror";

const VT_API_KEY = process.env.VIRUSTOTAL_API_KEY || "";

async function sha256OfFile(bucket: string, filePath: string): Promise<string> {
  const file = admin.storage().bucket(bucket).file(filePath);
  const hash = crypto.createHash("sha256");
  return new Promise((resolve, reject) => {
    file
      .createReadStream()
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolve(hash.digest("hex")))
      .on("error", reject);
  });
}

async function lookupVirusTotal(sha256: string): Promise<"clean" | "flagged" | "unscanned"> {
  if (!VT_API_KEY) return "unscanned";

  const res = await fetch(`https://www.virustotal.com/api/v3/files/${sha256}`, {
    headers: { "x-apikey": VT_API_KEY },
  });

  if (res.status === 404) return "unscanned"; // belum pernah dilihat VirusTotal sama sekali
  if (!res.ok) return "unscanned"; // gagal hubungi API — jangan asumsikan aman

  const json = (await res.json()) as any;
  const malicious = json?.data?.attributes?.last_analysis_stats?.malicious ?? 0;
  return malicious > 0 ? "flagged" : "clean";
}

/** Cari dokumen pesan yang match storagePath-nya, dengan retry singkat
 * karena dokumen Firestore-nya mungkin baru dibuat sesaat setelah upload
 * selesai (race condition client-side yang wajar). */
async function findMessageDoc(storagePath: string) {
  const db = admin.firestore();
  for (let attempt = 0; attempt < 6; attempt++) {
    const snap = await db
      .collectionGroup("messages")
      .where("attachment.storagePath", "==", storagePath)
      .limit(1)
      .get();
    if (!snap.empty) return snap.docs[0].ref;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

export const scanGroupFileUpload = onObjectFinalized(
  { region: "us-central1", memory: "256MiB", timeoutSeconds: 120 },
  async (event) => {
    const filePath = event.data.name;
    const bucket = event.data.bucket;

    if (!filePath || !filePath.startsWith("groups/")) return;

    const messageRef = await findMessageDoc(filePath);
    if (!messageRef) {
      console.warn(`Tidak ketemu pesan untuk file ${filePath} setelah beberapa kali coba.`);
      return;
    }

    try {
      const sha256 = await sha256OfFile(bucket, filePath);
      const status = await lookupVirusTotal(sha256);

      if (status === "flagged") {
        await admin.storage().bucket(bucket).file(filePath).delete().catch(() => {});
      }

      await messageRef.update({ "attachment.scanStatus": status });
    } catch (err) {
      console.error("Gagal memindai file:", err);
      await messageRef.update({ "attachment.scanStatus": "unscanned" }).catch(() => {});
    }
  }
);
