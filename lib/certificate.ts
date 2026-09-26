import { jsPDF } from "jspdf";

/**
 * Membuat sertifikat penyelesaian buku sebagai PDF, murni di browser
 * (tidak ada server/template terpisah). Dipanggil dari halaman buku
 * begitu semua bab ditandai selesai.
 */
export function downloadCompletionCertificate(input: {
  bookTitle: string;
  authorName: string;
  readerName: string;
  completedDate: Date;
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Warna diambil dari palet TSC (amber/ink) supaya senada dengan brand.
  const ink: [number, number, number] = [19, 19, 24];
  const amber: [number, number, number] = [242, 169, 59];
  const paperDim: [number, number, number] = [128, 125, 143];

  doc.setFillColor(...ink);
  doc.rect(0, 0, width, height, "F");

  // Bingkai dekoratif ganda.
  doc.setDrawColor(...amber);
  doc.setLineWidth(1.2);
  doc.rect(10, 10, width - 20, height - 20);
  doc.setLineWidth(0.4);
  doc.rect(14, 14, width - 28, height - 28);

  doc.setTextColor(...amber);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("TAMA STUDIO COMMUNITY", width / 2, 34, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Sertifikat Penyelesaian", width / 2, 46, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(...paperDim);
  doc.text("Diberikan kepada", width / 2, 66, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(input.readerName, width / 2, 80, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...paperDim);
  doc.text("atas keberhasilan menyelesaikan buku", width / 2, 96, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...amber);
  const titleLines = doc.splitTextToSize(input.bookTitle, width - 60);
  doc.text(titleLines, width / 2, 108, { align: "center" });

  const dateStr = input.completedDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...paperDim);
  doc.text(`Diselesaikan pada ${dateStr}`, width / 2, height - 28, { align: "center" });
  doc.text(`Ditulis oleh ${input.authorName} · Tama Studio Community`, width / 2, height - 21, {
    align: "center",
  });

  const safeName = input.bookTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
  doc.save(`sertifikat-${safeName || "buku"}.pdf`);
}
