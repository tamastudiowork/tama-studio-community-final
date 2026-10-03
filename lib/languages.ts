// ===================================================================
// Lapisan `base` — daftar bahasa prioritas dengan full syntax highlighting.
// Di luar daftar ini, file tetap bisa dibuka & diedit sebagai plain text
// (Monaco tokenizer generik), sesuai kesepakatan scope v1.
// ===================================================================

export type PriorityLanguage = {
  id: string;
  label: string;
  ext: string[];
  runtime?: { language: string; version: string };
};

/**
 * Top 30 bahasa terpopuler (kombinasi indikator TIOBE / Stack Overflow /
 * GitHub Octoverse terbaru) — semua ini sudah native didukung Monaco Editor
 * dengan tokenizer & bracket-matching penuh, jadi tidak perlu grammar tambahan.
 */
export const PRIORITY_LANGUAGES: PriorityLanguage[] = [
  { id: 'javascript', label: 'JavaScript', ext: ['.js', '.mjs', '.cjs', '.jsx'], runtime: { language: 'javascript', version: '18.15.0' } },
  { id: 'typescript', label: 'TypeScript', ext: ['.ts', '.tsx'], runtime: { language: 'typescript', version: '5.0.3' } },
  { id: 'python', label: 'Python', ext: ['.py', '.pyw'], runtime: { language: 'python', version: '3.10.0' } },
  { id: 'java', label: 'Java', ext: ['.java'], runtime: { language: 'java', version: '15.0.2' } },
  { id: 'cpp', label: 'C++', ext: ['.cpp', '.cc', '.cxx', '.hpp'], runtime: { language: 'cpp', version: '10.2.0' } },
  { id: 'c', label: 'C', ext: ['.c', '.h'], runtime: { language: 'c', version: '10.2.0' } },
  { id: 'csharp', label: 'C#', ext: ['.cs'], runtime: { language: 'csharp', version: '6.12.0' } },
  { id: 'go', label: 'Go', ext: ['.go'], runtime: { language: 'go', version: '1.16.2' } },
  { id: 'rust', label: 'Rust', ext: ['.rs'], runtime: { language: 'rust', version: '1.68.2' } },
  { id: 'php', label: 'PHP', ext: ['.php'], runtime: { language: 'php', version: '8.2.3' } },
  { id: 'ruby', label: 'Ruby', ext: ['.rb'], runtime: { language: 'ruby', version: '3.0.1' } },
  { id: 'swift', label: 'Swift', ext: ['.swift'], runtime: { language: 'swift', version: '5.3.3' } },
  { id: 'kotlin', label: 'Kotlin', ext: ['.kt', '.kts'], runtime: { language: 'kotlin', version: '1.8.20' } },
  { id: 'dart', label: 'Dart', ext: ['.dart'], runtime: { language: 'dart', version: '2.19.6' } },
  { id: 'html', label: 'HTML', ext: ['.html', '.htm'] },
  { id: 'css', label: 'CSS', ext: ['.css'] },
  { id: 'scss', label: 'SCSS', ext: ['.scss'] },
  { id: 'sql', label: 'SQL', ext: ['.sql'], runtime: { language: 'sqlite3', version: '3.36.0' } },
  { id: 'shell', label: 'Shell', ext: ['.sh', '.bash', '.zsh'], runtime: { language: 'bash', version: '5.2.0' } },
  { id: 'yaml', label: 'YAML', ext: ['.yml', '.yaml'] },
  { id: 'json', label: 'JSON', ext: ['.json'] },
  { id: 'markdown', label: 'Markdown', ext: ['.md', '.mdx'] },
  { id: 'r', label: 'R', ext: ['.r'], runtime: { language: 'rscript', version: '4.1.1' } },
  { id: 'scala', label: 'Scala', ext: ['.scala'], runtime: { language: 'scala', version: '3.2.2' } },
  { id: 'lua', label: 'Lua', ext: ['.lua'], runtime: { language: 'lua', version: '5.4.4' } },
  { id: 'perl', label: 'Perl', ext: ['.pl'], runtime: { language: 'perl', version: '5.36.0' } },
  { id: 'haskell', label: 'Haskell', ext: ['.hs'], runtime: { language: 'haskell', version: '9.0.1' } },
  { id: 'powershell', label: 'PowerShell', ext: ['.ps1'] },
  { id: 'graphql', label: 'GraphQL', ext: ['.graphql', '.gql'] },
  { id: 'dockerfile', label: 'Dockerfile', ext: ['Dockerfile'] },
];

const EXT_TO_LANGUAGE = PRIORITY_LANGUAGES.reduce<Record<string, string>>((map, lang) => {
  lang.ext.forEach((ext) => {
    map[ext.toLowerCase()] = lang.id;
  });
  return map;
}, {});

/**
 * Deteksi bahasa dari nama file. Bahasa di luar top 30 akan jatuh ke
 * 'plaintext' — file tetap terbuka & bisa diedit, hanya tanpa highlighting
 * berwarna (fallback yang disepakati untuk v1).
 */
export function detectLanguage(filename?: string | null): string {
  if (!filename) return 'plaintext';
  const lower = filename.toLowerCase();

  if (EXT_TO_LANGUAGE[lower]) return EXT_TO_LANGUAGE[lower]; // exact match, e.g. "Dockerfile"

  const dotIndex = lower.lastIndexOf('.');
  if (dotIndex === -1) return 'plaintext';

  const ext = lower.slice(dotIndex);
  return EXT_TO_LANGUAGE[ext] || 'plaintext';
}

export function isPriorityLanguage(languageId: string): boolean {
  return PRIORITY_LANGUAGES.some((lang) => lang.id === languageId);
}

/** Ekstensi default untuk bahasa tertentu — dipakai saat user memilih bahasa
 *  langsung dari dropdown "File Baru" (bukan mengetik nama file manual). */
export function defaultExtensionFor(languageId: string): string {
  const lang = PRIORITY_LANGUAGES.find((l) => l.id === languageId);
  if (!lang) return '';
  const ext = lang.ext[0];
  return ext.startsWith('.') ? ext : ''; // 'Dockerfile' tidak butuh ekstensi tambahan
}

/** Cek apakah suatu bahasa punya runtime eksekusi (bisa di-Run), atau
 *  hanya bahasa markup/config yang tidak bisa dijalankan. */
export function getRuntimeFor(languageId: string): { language: string; version: string } | null {
  return PRIORITY_LANGUAGES.find((l) => l.id === languageId)?.runtime || null;
}
