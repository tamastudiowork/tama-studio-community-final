// Heuristik ringan untuk menandai tautan yang PATUT DICURIGAI di chat
// grup — ini BUKAN pemindai malware/virus sungguhan. Deteksi file
// berbahaya yang asli butuh backend khusus (upload ke storage lalu
// discan lewat layanan seperti VirusTotal/ClamAV via Cloud Function),
// yang belum dibangun di tahap ini. Fungsi ini murni pattern-matching
// di sisi browser supaya pengguna dapat sinyal awas, bukan jaminan aman.

const SHORTENER_DOMAINS = [
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "is.gd",
  "cutt.ly",
  "s.id",
  "shorturl.at",
];

const SUSPICIOUS_TLDS = [".zip", ".mov", ".xyz", ".top", ".gq", ".tk"];

export type LinkFlag = {
  url: string;
  reasons: string[];
};

export function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)]+/gi) ?? [];
  return Array.from(new Set(matches));
}

export function flagSuspiciousLinks(text: string): LinkFlag[] {
  const urls = extractUrls(text);
  const flags: LinkFlag[] = [];

  for (const url of urls) {
    const reasons: string[] = [];
    let host = "";
    try {
      host = new URL(url).hostname.toLowerCase();
    } catch {
      continue;
    }

    if (SHORTENER_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
      reasons.push("Pemendek tautan (tujuan asli disembunyikan)");
    }
    if (host.startsWith("xn--")) {
      reasons.push("Domain punycode (bisa menyamar mirip domain lain)");
    }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      reasons.push("Tautan langsung ke alamat IP, bukan nama domain");
    }
    if (SUSPICIOUS_TLDS.some((tld) => host.endsWith(tld))) {
      reasons.push("Domain dengan akhiran yang sering dipakai untuk phishing");
    }

    if (reasons.length) flags.push({ url, reasons });
  }

  return flags;
}
