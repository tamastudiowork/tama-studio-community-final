/**
 * BOT AI TSC — dibangun bertahap, ini fondasi + 2 tugas pertama.
 *
 * Dari dokumen brief awal, "Tama Bot" sebenarnya disebut buat beberapa
 * hal berbeda: (1) scan file/link di chat grup [SUDAH ada, non-AI, lihat
 * index.ts scanGroupFileUpload + lib/linkSafety.ts], (2) bantu
 * review/tulis konten, (3) moderasi otomatis, (4) Error Translator, (5)
 * Rubber Duck AI, (6) bot pengecekan saat publish e-book pakai Firebase
 * sendiri. Yang dikerjakan di file ini: #2 dan #3 — dua yang paling jelas
 * scope-nya dan langsung dikonfirmasi. #4, #5, #6 BELUM disentuh, itu
 * pekerjaan besar terpisah (terutama #6 yang butuh seluruh alur publish
 * BYOB yang belum pernah dibangun sama sekali).
 *
 * Cara ambil API key Gemini: baca metadata dari Firestore
 * `apiKeyMeta` (dokumen dengan type == 'gemini'), ambil `secretName`-nya,
 * lalu tarik NILAI ASLINYA dari Secret Manager (bukan dari Firestore).
 * Kalau belum ada key Gemini yang di-publish dari dashboard admin,
 * kedua fungsi di bawah akan menolak dengan pesan yang jelas — bukan
 * pura-pura jalan dengan hasil kosong.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import fetch from "node-fetch";

if (!admin.apps.length) admin.initializeApp();

const secretClient = new SecretManagerServiceClient();

async function getGeminiKey(): Promise<string> {
  const snap = await admin
    .firestore()
    .collection("apiKeyMeta")
    .where("type", "==", "gemini")
    .limit(1)
    .get();

  if (snap.empty) {
    throw new HttpsError(
      "failed-precondition",
      "Belum ada API key Gemini yang di-publish. Admin perlu isi dulu di Dashboard Admin > API Keys."
    );
  }

  const secretName = snap.docs[0].data().secretName as string;
  const [version] = await secretClient.accessSecretVersion({ name: `${secretName}/versions/latest` });
  const value = version.payload?.data?.toString();
  if (!value) throw new HttpsError("internal", "Gagal membaca API key Gemini dari Secret Manager.");
  return value;
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new HttpsError("internal", `Gemini API menolak permintaan (${res.status}). ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as any;
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new HttpsError("internal", "Gemini tidak mengembalikan jawaban yang bisa dibaca.");
  return text as string;
}

/**
 * Callable — dipanggil dari tombol "Minta review AI" di editor bab buku
 * (dan bisa dipakai lagi nanti untuk deskripsi repo, dst). Siapa saja
 * yang login boleh pakai ini untuk karyanya sendiri; ini BUKAN endpoint
 * admin-only.
 */
export const reviewContent = onCall(
  { region: "us-central1", memory: "256MiB", timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Harus login.");

    const { text, kind } = request.data as { text: string; kind: "book-chapter" | "repo-description" };
    if (!text || text.trim().length < 10) {
      throw new HttpsError("invalid-argument", "Tulisannya terlalu pendek untuk direview.");
    }

    const apiKey = await getGeminiKey();
    const context =
      kind === "book-chapter"
        ? "Ini adalah draf bab buku pembelajaran pemrograman untuk komunitas Tama Studio Community."
        : "Ini adalah deskripsi sebuah repository kode.";

    const prompt = `${context} Bacakan dan beri masukan singkat dalam Bahasa Indonesia yang santai dan membangun (bukan menggurui): apa yang sudah bagus, apa yang bisa diperjelas/diperbaiki, dan (kalau ada) typo/kesalahan teknis yang kelihatan. Maksimal 5 poin, format bullet list singkat, jangan menulis ulang keseluruhan teksnya.\n\n---\n${text}\n---`;

    const feedback = await callGemini(apiKey, prompt);
    return { feedback };
  }
);

/**
 * Trigger otomatis — jalan tiap ada pesan baru di channel teks grup mana
 * pun. Sengaja TIDAK menghapus pesan secara otomatis — AI bisa saja
 * salah tebak (false positive), dan menghapus pesan orang tanpa jejak
 * itu berat sebelah. Sebagai gantinya, pesan yang dicurigai cuma DITANDAI
 * (`flaggedByAI`) dan dicatat di `moderationLog` — admin/owner grup yang
 * memutuskan mau dihapus atau tidak lewat tombol Hapus yang sudah ada.
 */
export const moderateNewGroupMessage = onDocumentCreated(
  {
    document: "groups/{groupId}/channels/{channelId}/messages/{messageId}",
    region: "us-central1",
    memory: "256MiB",
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data();
    const text: string = data.text || "";
    if (!text.trim() || data.attachment) return; // pesan file ditangani scanGroupFileUpload terpisah

    let apiKey: string;
    try {
      apiKey = await getGeminiKey();
    } catch {
      return; // belum ada key Gemini ter-setup — diamkan saja, jangan bikin fungsi ini gagal berisik
    }

    const prompt = `Kamu adalah moderator chat komunitas programmer Indonesia. Nilai pesan berikut: apakah ini SPAM (promosi tidak relevan berulang) atau mengandung KATA KASAR/PELECEHAN? Balas HANYA dalam format JSON persis seperti ini, tanpa teks lain: {"flag": true atau false, "reason": "alasan singkat dalam Bahasa Indonesia, atau string kosong kalau flag false"}\n\nPesan: """${text}"""`;

    try {
      const raw = await callGemini(apiKey, prompt);
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned) as { flag: boolean; reason: string };

      if (parsed.flag) {
        await snap.ref.update({ flaggedByAI: true, flaggedReason: parsed.reason });
        await admin.firestore().collection("moderationLog").add({
          groupId: event.params.groupId,
          channelId: event.params.channelId,
          messageId: event.params.messageId,
          text,
          reason: parsed.reason,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (err) {
      // Kalau Gemini balas format yang tidak bisa di-parse dsb, jangan
      // gagalkan pesan pengguna — cukup lewati moderasi untuk pesan ini.
      console.warn("Moderasi AI gagal untuk satu pesan:", err);
    }
  }
);

/**
 * Callable — Error Translator. Tempel pesan error pemrograman, dapat
 * penjelasan santai + 3 solusi dalam bahasa yang diminta. (Bagian
 * "video 1 menit" di brief awal SENGAJA tidak dibuat — generate video
 * butuh infrastruktur AI video terpisah yang jauh di luar scope ini;
 * kalau dipaksakan cuma jadi fitur kosong/link mati.)
 */
export const translateError = onCall(
  { region: "us-central1", memory: "256MiB", timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Harus login.");

    const { errorText, language } = request.data as { errorText: string; language: string };
    if (!errorText || errorText.trim().length < 3) {
      throw new HttpsError("invalid-argument", "Tempel dulu pesan errornya.");
    }

    const apiKey = await getGeminiKey();
    const lang = (language || "Indonesia").trim();
    const prompt = `Kamu Tama Bot, penerjemah error pemrograman untuk programmer pemula. Seseorang menempel pesan error berikut. Jelaskan dengan santai (bukan kaku/akademis) dalam Bahasa ${lang}, lalu kasih PERSIS 3 solusi konkret berurutan dari yang paling mungkin. Balas HANYA dalam JSON persis format ini, tanpa teks lain:\n{"explanation": "...", "solutions": ["...", "...", "..."]}\n\nError:\n"""${errorText}"""`;

    const raw = await callGemini(apiKey, prompt);
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned) as { explanation: string; solutions: string[] };
      return parsed;
    } catch {
      // Kalau Gemini tidak balas JSON valid, tetap kembalikan mentahnya
      // supaya pengguna dapat sesuatu daripada error kosong.
      return { explanation: raw, solutions: [] };
    }
  }
);

/**
 * Callable — Rubber Duck AI. Chat singkat, "bebek"-nya sengaja diarahkan
 * buat balik nanya (metode rubber duck debugging asli), bukan langsung
 * kasih jawaban jadi.
 */
export const rubberDuckChat = onCall(
  { region: "us-central1", memory: "256MiB", timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Harus login.");

    const { history, message } = request.data as {
      history: { role: "user" | "duck"; text: string }[];
      message: string;
    };
    if (!message || !message.trim()) {
      throw new HttpsError("invalid-argument", "Tulis dulu penjelasan kode kamu ke bebeknya.");
    }

    const apiKey = await getGeminiKey();
    const transcript = (history || [])
      .slice(-8) // batasi konteks biar prompt tidak membengkak
      .map((h) => `${h.role === "user" ? "Programmer" : "Bebek"}: ${h.text}`)
      .join("\n");

    const prompt = `Kamu bebek karet AI untuk rubber duck debugging, dipanggil "Tama Duck". Programmer menjelaskan kodenya ke kamu. Tugasmu: ajukan SATU pertanyaan balik yang membantu dia menemukan sendiri di mana masalahnya (metode Socratic) — JANGAN langsung kasih jawaban/solusi kecuali dia benar-benar buntu setelah beberapa putaran. Nada santai, singkat (2-4 kalimat), pakai Bahasa Indonesia.\n\nPercakapan sejauh ini:\n${transcript}\n\nProgrammer: ${message}\nBebek:`;

    const reply = await callGemini(apiKey, prompt);
    return { reply: reply.trim() };
  }
);

/**
 * Callable — Code to Diagram. Ubah kode jadi diagram alur (sintaks
 * Mermaid), dirender di client pakai library mermaid. Kalau kodenya
 * terlalu sederhana/tidak ada alur berarti (mis. cuma deklarasi
 * variabel), Gemini boleh balas diagram minimal — itu wajar, bukan bug.
 */
export const codeToDiagram = onCall(
  { region: "us-central1", memory: "256MiB", timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Harus login.");

    const { code } = request.data as { code: string };
    if (!code || code.trim().length < 5) {
      throw new HttpsError("invalid-argument", "Tempel dulu kodenya.");
    }

    const apiKey = await getGeminiKey();
    const prompt = `Ubah logika kode berikut jadi diagram alur (flowchart) dalam sintaks Mermaid (flowchart TD). Balas HANYA kode Mermaid mentah, tanpa penjelasan, tanpa markdown code fence, tanpa kalimat pembuka/penutup.\n\n---\n${code}\n---`;

    const raw = await callGemini(apiKey, prompt);
    const mermaidSyntax = raw.replace(/```mermaid|```/g, "").trim();
    return { mermaidSyntax };
  }
);
