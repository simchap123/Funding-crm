import mammoth from "mammoth";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function convertDocxToPdfBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  // Create a hidden container to render HTML
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.width = "816px"; // 8.5in at 96dpi
  container.style.padding = "48px";
  container.style.fontFamily = "Arial, sans-serif";
  container.style.fontSize = "12pt";
  container.style.lineHeight = "1.5";
  container.style.background = "white";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF("p", "mm", "letter");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Handle multi-page if content is taller than one page
    let yOffset = 0;
    while (yOffset < imgHeight) {
      if (yOffset > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, -yOffset, imgWidth, imgHeight);
      yOffset += pageHeight;
    }

    const base64 = pdf.output("datauristring").split(",")[1];
    return base64;
  } finally {
    document.body.removeChild(container);
  }
}

export function isConvertibleToDoc(mimeType: string, fileName: string): boolean {
  const ext = fileName.toLowerCase().split(".").pop();
  return (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword" ||
    ext === "docx" ||
    ext === "doc"
  );
}
