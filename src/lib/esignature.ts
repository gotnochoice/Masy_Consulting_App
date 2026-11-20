import { createHash } from "crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export function computeDocumentHash(text: string): string {
  return createHash("sha256").update(text, "utf-8").digest("hex");
}

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const FONT_SIZE = 10;
const LINE_HEIGHT = 14;

function wrapLine(line: string, font: import("pdf-lib").PDFFont, maxWidth: number): string[] {
  const words = line.split(" ");
  const wrapped: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, FONT_SIZE) > maxWidth && current) {
      wrapped.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  wrapped.push(current);
  return wrapped;
}

// Renders the document text (paginated) followed by an audit certificate page with the
// signer's typed name, drawn signature, IP, timestamp, and the document's hash -- so a
// dispute later has something concrete to point to, not just a checkbox.
export async function generateSignedPdf(params: {
  title: string;
  documentText: string;
  version: string;
  signerName: string;
  typedName: string;
  signerEmail: string;
  ipAddress: string;
  signedAt: Date;
  documentHash: string;
  signatureImageDataUrl: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const maxWidth = PAGE_WIDTH - MARGIN * 2;

  const rawLines = params.documentText.split("\n");
  const lines = rawLines.flatMap((line) => (line.trim() === "" ? [""] : wrapLine(line, font, maxWidth)));

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  page.drawText(params.title, { x: MARGIN, y, size: 14, font: boldFont });
  y -= 24;

  for (const line of lines) {
    if (y < MARGIN) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    page.drawText(line, { x: MARGIN, y, size: FONT_SIZE, font });
    y -= LINE_HEIGHT;
  }

  const certPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let cy = PAGE_HEIGHT - MARGIN;
  certPage.drawText("Audit Certificate", { x: MARGIN, y: cy, size: 16, font: boldFont });
  cy -= 30;

  const certLines = [
    `Document: ${params.title} (version ${params.version})`,
    `Signed by: ${params.signerName} <${params.signerEmail}>`,
    `Typed signature: ${params.typedName}`,
    `Signed at: ${params.signedAt.toISOString()}`,
    `IP address: ${params.ipAddress}`,
    `Document hash (SHA-256): ${params.documentHash}`,
  ];
  for (const line of certLines) {
    certPage.drawText(line, { x: MARGIN, y: cy, size: FONT_SIZE, font });
    cy -= LINE_HEIGHT * 1.4;
  }

  cy -= 10;
  certPage.drawText("Drawn signature:", { x: MARGIN, y: cy, size: FONT_SIZE, font });
  cy -= 110;
  try {
    const base64 = params.signatureImageDataUrl.split(",")[1] ?? "";
    const bytes = Buffer.from(base64, "base64");
    const image = await pdf.embedPng(bytes);
    const dims = image.scaleToFit(200, 90);
    certPage.drawImage(image, { x: MARGIN, y: cy, width: dims.width, height: dims.height });
    certPage.drawRectangle({
      x: MARGIN - 4,
      y: cy - 4,
      width: 208,
      height: 98,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });
  } catch (err) {
    console.error("[esignature] failed to embed signature image:", err);
  }

  return pdf.save();
}
