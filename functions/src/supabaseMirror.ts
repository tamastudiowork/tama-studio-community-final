/**
 * BACKUP KE SUPABASE — lapisan cadangan, BUKAN pengganti Firestore.
 *
 * Firestore tetap satu-satunya sumber kebenaran (source of truth) untuk
 * seluruh aplikasi — semua fitur TSC baca/tulis ke Firestore seperti
 * biasa, tidak berubah sama sekali. File ini CUMA menambahkan: setiap
 * kali dokumen di koleksi-koleksi utama berubah (dibuat/diedit/dihapus),
 * salinannya otomatis dikirim juga ke Supabase — sebagai cadangan kalau
 * suatu saat dibutuhkan (audit, migrasi, atau restore manual), bukan
 * sebagai database yang aktif dipakai membaca data oleh aplikasi.
 *
 * "Supabase 1" dicoba dulu; kalau gagal (belum di-setup, project
 * penuh, dsb), otomatis coba "Supabase 2" sebagai cadangan kedua. Kalau
 * dua-duanya belum di-setup, mirroring dilewati diam-diam — TIDAK PERNAH
 * menggagalkan penyimpanan Firestore aslinya. Backup yang gagal jangan
 * sampai bikin fitur utama ikut gagal.
 *
 * SETUP (sekali di awal, per Supabase project yang mau dipakai):
 *   1. Buat project di supabase.com (gratis untuk skala kecil)
 *   2. Jalankan isi supabase/schema.sql (ada di root project ini) lewat
 *      Supabase Dashboard > SQL Editor > New query > Run
 *   3. Ambil Project URL & service_role key dari Project Settings > API
 *   4. Publish keduanya lewat Dashboard Admin > API Keys > pilih
 *      "Supabase 1" (atau "Supabase 2" untuk cadangan kedua)
 *
 * Tanpa langkah ini, mirroring tidak melakukan apa-apa — dan itu wajar,
 * bukan error, karena fitur utama TSC memang tidak bergantung padanya.
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import fetch from "node-fetch";

if (!admin.apps.length) admin.initializeApp();

const secretClient = new SecretManagerServiceClient();

type SupabaseConfig = { url: string; serviceRoleKey: string };

async function getSupabaseConfig(slot: "supabase-1" | "supabase-2"): Promise<SupabaseConfig | null> {
  const snap = await admin.firestore().collection("apiKeyMeta").where("type", "==", slot).limit(1).get();
  if (snap.empty) return null;

  const secretName = snap.docs[0].data().secretName as string;
  try {
    const [version] = await secretClient.accessSecretVersion({ name: `${secretName}/versions/latest` });
    const raw = version.payload?.data?.toString();
    if (!raw) return null;
    return JSON.parse(raw) as SupabaseConfig;
  } catch {
    return null;
  }
}

async function upsertToSlot(slot: "supabase-1" | "supabase-2", table: string, id: string, data: unknown) {
  const config = await getSupabaseConfig(slot);
  if (!config) return false;

  const res = await fetch(`${config.url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify([{ id, data, updated_at: new Date().toISOString() }]),
  });
  return res.ok;
}

async function deleteFromSlot(slot: "supabase-1" | "supabase-2", table: string, id: string) {
  const config = await getSupabaseConfig(slot);
  if (!config) return false;

  const res = await fetch(`${config.url}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
    },
  });
  return res.ok;
}

async function mirrorUpsert(table: string, id: string, data: unknown) {
  const okFirst = await upsertToSlot("supabase-1", table, id, data).catch(() => false);
  if (okFirst) return;
  await upsertToSlot("supabase-2", table, id, data).catch(() => {
    // Kedua slot gagal/belum di-setup — diamkan, jangan ganggu alur utama.
  });
}

async function mirrorDelete(table: string, id: string) {
  const okFirst = await deleteFromSlot("supabase-1", table, id).catch(() => false);
  if (okFirst) return;
  await deleteFromSlot("supabase-2", table, id).catch(() => {});
}

/** Bikin satu trigger mirror generik untuk satu koleksi top-level. */
function makeMirrorTrigger(documentPath: string, table: string) {
  return onDocumentWritten({ document: documentPath, region: "us-central1", memory: "256MiB" }, async (event) => {
    const after = event.data?.after;
    const id = event.params.id;

    if (!after || !after.exists) {
      await mirrorDelete(table, id);
      return;
    }
    await mirrorUpsert(table, id, after.data());
  });
}

export const mirrorRepos = makeMirrorTrigger("repos/{id}", "repos_mirror");
export const mirrorBooks = makeMirrorTrigger("books/{id}", "books_mirror");
export const mirrorGroups = makeMirrorTrigger("groups/{id}", "groups_mirror");
export const mirrorUsers = makeMirrorTrigger("users/{id}", "users_mirror");
export const mirrorShowcase = makeMirrorTrigger("showcase/{id}", "showcase_mirror");
export const mirrorClips = makeMirrorTrigger("clips/{id}", "clips_mirror");
export const mirrorJobs = makeMirrorTrigger("jobs/{id}", "jobs_mirror");
export const mirrorConversations = makeMirrorTrigger("conversations/{id}", "conversations_mirror");
