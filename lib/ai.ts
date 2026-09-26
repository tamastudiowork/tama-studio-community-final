// AI review helper for book chapters / repo descriptions. Error
// Translator and Rubber Duck AI were removed — those are being rebuilt
// separately outside this project for now.

import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

const reviewContentFn = httpsCallable<
  { text: string; kind: "book-chapter" | "repo-description" },
  { feedback: string }
>(functions, "reviewContent");

export const AiService = {
  /**
   * Minta review AI untuk isi bab buku / deskripsi repo. Melempar error
   * kalau belum ada API key Gemini yang di-publish admin — tangkap dan
   * tampilkan pesannya apa adanya ke pengguna, jangan ditelan diam-diam.
   */
  async reviewContent(text: string, kind: "book-chapter" | "repo-description"): Promise<string> {
    const result = await reviewContentFn({ text, kind });
    return result.data.feedback;
  },
};
