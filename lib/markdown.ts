// Markdown ringan tanpa dependency eksternal — dipakai untuk merender isi
// bab buku. Sama persis prinsipnya dengan yang dipakai README di code
// editor (lihat components/code-editor/common/utils/markdown.js): semua
// teks di-escape dulu jadi entity HTML SEBELUM transformasi markdown
// diterapkan, supaya `<script>` dsb yang diketik penulis buku tidak
// pernah tereksekusi walau dirender lewat dangerouslySetInnerHTML.

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*|#[^\s)]*)\)/g, (_m, label, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  return out;
}

export function renderMarkdown(source: string): string {
  const lines = (source || "").replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let listBuffer: string[] = [];
  let listType: "ul" | "ol" | null = null;

  function flushList() {
    if (!listBuffer.length) return;
    const tag = listType === "ol" ? "ol" : "ul";
    html.push(`<${tag}>` + listBuffer.map((item) => `<li>${renderInline(item)}</li>`).join("") + `</${tag}>`);
    listBuffer = [];
    listType = null;
  }

  for (const rawLine of lines) {
    const line = rawLine;

    if (line.trim().startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBuffer = [];
      } else {
        inCodeBlock = false;
        html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const ulItem = line.match(/^\s*[-*]\s+(.*)$/);
    const olItem = line.match(/^\s*\d+\.\s+(.*)$/);

    if (ulItem) {
      if (listType && listType !== "ul") flushList();
      listType = "ul";
      listBuffer.push(ulItem[1]);
      continue;
    }
    if (olItem) {
      if (listType && listType !== "ol") flushList();
      listType = "ol";
      listBuffer.push(olItem[1]);
      continue;
    }

    flushList();

    if (!line.trim()) continue;
    html.push(`<p>${renderInline(line)}</p>`);
  }

  flushList();
  if (inCodeBlock && codeBuffer.length) {
    html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
  }

  return html.join("\n");
}
