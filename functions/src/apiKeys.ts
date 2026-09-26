/**
 * PENYIMPANAN API KEY (Supabase, Gemini, DeepSeek, dll) — HANYA ADMIN.
 *
 * Kenapa tidak disimpan langsung di Firestore seperti data lain di app
 * ini? Karena API key/secret pihak ketiga itu beda kelas dari data biasa
 * (nama grup, isi pesan, dst) — begitu nilainya ketulis ke Firestore,
 * dia ikut ke-download ke browser SIAPA PUN yang boleh baca dokumen itu
 * (dalam hal ini: semua admin). Kalau suatu saat aturan Firestore salah
 * konfigurasi, atau sesi browser seorang admin dibajak, secret itu bisa
 * bocor. Google Secret Manager didesain khusus supaya nilai rahasia TIDAK
 * PERNAH transit lewat database aplikasi — hanya lewat panggilan
 * function yang diautentikasi, dan cuma function lain (bukan client
 * mana pun) yang bisa membacanya kembali.
 *
 * Firestore di sini CUMA menyimpan metadata (jenis, label, preview
 * ter-mask seperti "sk-ab...9f2k", kapan dibuat) — tidak pernah nilai
 * aslinya.
 *
 * SETUP SEKALI DI AWAL (wajib sebelum fitur ini bisa dipakai):
 *   1. Aktifkan Secret Manager API di project Firebase kamu:
 *      https://console.cloud.google.com/apis/library/secretmanager.googleapis.com
 *   2. Beri izin service account Cloud Functions untuk mengelola secret:
 *        gcloud projects add-iam-policy-binding NAMA_PROJECT_KAMU \
 *          --member="serviceAccount:NAMA_PROJECT_KAMU@appspot.gserviceaccount.com" \
 *          --role="roles/secretmanager.admin"
 *   3. Deploy seperti biasa: `cd functions && npm install && npm run deploy`
 *
 * Tanpa langkah di atas, tombol "Publish" di dashboard admin akan gagal
 * dengan error izin — itu wajar, bukan bug, artinya setup IAM-nya belum
 * dilakukan.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

if (!admin.apps.length) admin.initializeApp();

const secretClient = new SecretManagerServiceClient();

const ALLOWED_TYPES = ["supabase-1", "supabase-2", "gemini", "deepseek", "other"] as const;

async function assertAdmin(uid: string | undefined) {
  if (!uid) throw new HttpsError("unauthenticated", "Harus login.");
  const snap = await admin.firestore().collection("users").doc(uid).get();
  if (snap.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Cuma admin yang boleh mengelola API key.");
  }
}

function maskValue(value: string): string {
  if (value.length <= 8) return "•".repeat(value.length);
  return `${value.slice(0, 4)}${"•".repeat(6)}${value.slice(-4)}`;
}

/** Untuk Supabase, preview yang berguna itu URL project-nya, bukan JSON ter-mask yang tidak terbaca. */
function maskPreview(type: string, value: string): string {
  if (type === "supabase-1" || type === "supabase-2") {
    try {
      const parsed = JSON.parse(value) as { url: string; serviceRoleKey: string };
      return `${parsed.url} (key: ${maskValue(parsed.serviceRoleKey)})`;
    } catch {
      return maskValue(value);
    }
  }
  return maskValue(value);
}

function projectId(): string {
  return process.env.GCLOUD_PROJECT || admin.instanceId().app.options.projectId || "";
}

export const saveApiKey = onCall(
  { region: "us-central1", memory: "256MiB" },
  async (request) => {
    await assertAdmin(request.auth?.uid);

    const { type, label, value } = request.data as { type: string; label: string; value: string };

    if (!ALLOWED_TYPES.includes(type as any)) {
      throw new HttpsError("invalid-argument", "Jenis API key tidak dikenal.");
    }
    if (!value || value.trim().length < 4) {
      throw new HttpsError("invalid-argument", "Nilai API key terlalu pendek atau kosong.");
    }
    if (type === "other" && !label?.trim()) {
      throw new HttpsError("invalid-argument", "Label wajib diisi untuk jenis \"Lainnya\".");
    }

    const db = admin.firestore();
    const docRef = db.collection("apiKeyMeta").doc();
    const secretId = `apikey_${docRef.id}`;
    const parent = `projects/${projectId()}`;

    try {
      await secretClient.createSecret({
        parent,
        secretId,
        secret: { replication: { automatic: {} } },
      });
      await secretClient.addSecretVersion({
        parent: `${parent}/secrets/${secretId}`,
        payload: { data: Buffer.from(value.trim(), "utf8") },
      });
    } catch (err: any) {
      throw new HttpsError(
        "internal",
        "Gagal menyimpan ke Secret Manager. Kemungkinan Secret Manager API belum diaktifkan atau izin IAM belum diberikan — lihat komentar setup di functions/src/apiKeys.ts."
      );
    }

    await docRef.set({
      type,
      label: type === "other" ? label.trim() : null,
      maskedPreview: maskPreview(type, value.trim()),
      secretName: `${parent}/secrets/${secretId}`,
      createdBy: request.auth!.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { id: docRef.id };
  }
);

export const deleteApiKey = onCall(
  { region: "us-central1", memory: "256MiB" },
  async (request) => {
    await assertAdmin(request.auth?.uid);

    const { id } = request.data as { id: string };
    const db = admin.firestore();
    const docRef = db.collection("apiKeyMeta").doc(id);
    const snap = await docRef.get();
    if (!snap.exists) throw new HttpsError("not-found", "API key tidak ditemukan.");

    const secretName = snap.data()?.secretName;
    if (secretName) {
      await secretClient.deleteSecret({ name: secretName }).catch(() => {
        // Kalau secret-nya sudah kehapus manual dari Secret Manager,
        // tetap lanjut hapus metadata-nya di Firestore.
      });
    }
    await docRef.delete();
    return { ok: true };
  }
);
