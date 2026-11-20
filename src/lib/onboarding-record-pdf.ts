import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { decryptSensitive } from "@/lib/encryption";
import { maskLast4 } from "@/lib/masking";
import { ONBOARDING_STEP_LABELS, ONBOARDING_STEP_ORDER, KEY_TERM_ITEMS } from "@/lib/onboarding";
import { requiredGuarantorCount } from "@/lib/onboarding-process";

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const FONT_SIZE = 10;
const LINE_HEIGHT = 14;

function wrapLine(line: string, font: PDFFont, maxWidth: number): string[] {
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

async function makeWriter(pdf: PDFDocument) {
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const maxWidth = PAGE_WIDTH - MARGIN * 2;
  const state: { page: PDFPage; y: number } = { page: pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]), y: PAGE_HEIGHT - MARGIN };

  function ensureSpace(linesNeeded: number) {
    if (state.y < MARGIN + linesNeeded * LINE_HEIGHT) {
      state.page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      state.y = PAGE_HEIGHT - MARGIN;
    }
  }

  return {
    heading(text: string) {
      ensureSpace(2);
      state.page.drawText(text, { x: MARGIN, y: state.y, size: 13, font: boldFont });
      state.y -= 20;
    },
    text(text: string) {
      for (const wrapped of wrapLine(text, font, maxWidth)) {
        ensureSpace(1);
        state.page.drawText(wrapped, { x: MARGIN, y: state.y, size: FONT_SIZE, font });
        state.y -= LINE_HEIGHT;
      }
    },
    gap(px: number) {
      state.y -= px;
    },
  };
}

// Builds and stores the one onboarding summary PDF: personal details, document checklist,
// guarantor/next-of-kin status, declarations, and HR's verification outcome -- masked per the
// addendum (NIN/account number last 4 digits only, no identity files attached). Called once,
// from completeOnboarding, after every step is already confirmed VERIFIED -- never earlier,
// since a half-finished onboarding has nothing worth a record yet. A later correction calls
// this again and gets the next version; the record number itself stays the same.
export async function generateOnboardingRecordPdf(employeeId: string, generatedById: string) {
  const [employee, process, guarantors, required, acks, keyTerms, latestQuiz, documents, existingLatest] = await Promise.all([
    db.employee.findUnique({ where: { id: employeeId }, include: { clientOrg: true } }),
    db.onboardingProcess.findUnique({ where: { employeeId }, include: { steps: true } }),
    db.guarantor.findMany({
      where: { employeeId, replacedAt: null },
      orderBy: { createdAt: "asc" },
      include: { verificationLogs: { orderBy: { verifiedAt: "desc" }, take: 1 } },
    }),
    requiredGuarantorCount(employeeId),
    db.documentAcknowledgment.findMany({ where: { employeeId } }),
    db.keyTermAcknowledgment.findMany({ where: { employeeId } }),
    db.comprehensionAttempt.findFirst({ where: { employeeId, passed: true }, orderBy: { attemptedAt: "desc" } }),
    db.employeeDocument.findMany({ where: { employeeId }, orderBy: { createdAt: "asc" } }),
    db.onboardingRecord.findFirst({ where: { employeeId }, orderBy: { version: "desc" } }),
  ]);
  if (!employee || !process) throw new Error("Employee or onboarding process not found.");

  const verifierIds = [...new Set(process.steps.map((s) => s.verifiedById).filter((id): id is string => !!id))];
  const verifiers = verifierIds.length ? await db.user.findMany({ where: { id: { in: verifierIds } } }) : [];
  const verifierEmail = (id: string | null) => verifiers.find((v) => v.id === id)?.email ?? "Unknown";

  const version = (existingLatest?.version ?? 0) + 1;
  const recordNumber = existingLatest?.recordNumber ?? `OB-${employeeId.slice(0, 8).toUpperCase()}`;

  const pdf = await PDFDocument.create();
  const w = await makeWriter(pdf);

  w.heading("Onboarding Record");
  w.text(`Record ${recordNumber} -- version ${version}`);
  w.text(`${employee.name} -- ${employee.roleTitle} at ${employee.clientOrg.name}`);
  w.text(`Generated ${new Date().toLocaleString()}`);
  w.gap(16);

  w.heading("1. Team member details");
  w.text(`Start date: ${employee.startDate.toLocaleDateString()}`);
  w.text(`Email: ${employee.email}`);
  w.text(`Phone: ${employee.phone || "Not provided"}`);
  w.text(`Address: ${employee.address || "Not provided"}`);
  w.text(`NIN: ${maskLast4(employee.nin ? decryptSensitive(employee.nin) : null)}`);
  w.text(`Bank: ${employee.bankName || "Not provided"}`);
  w.text(`Account holder name: ${employee.bankAccountHolderName || "Not provided"}`);
  w.text(`Account number: ${maskLast4(employee.bankAccountNumber)}`);
  w.text(`Bank name match status: ${employee.bankNameMatchStatus}`);
  w.gap(16);

  w.heading("2. Document checklist");
  if (documents.length === 0) {
    w.text("No documents on file.");
  } else {
    for (const d of documents) w.text(`${d.label} -- uploaded ${d.createdAt.toLocaleString()}`);
  }
  w.gap(16);

  w.heading(required === 1 ? "3. Next of kin" : "3. Guarantors");
  if (guarantors.length === 0) {
    w.text("None recorded.");
  } else {
    for (const g of guarantors) {
      const log = g.verificationLogs[0];
      w.text(`${g.name} (${g.relationship})`);
      w.text(`  HR verification: ${log ? `${log.result}, ${log.method.replace("_", " ")}, ${log.verifiedAt.toLocaleDateString()}` : "Not yet verified"}`);
    }
  }
  w.gap(16);

  w.heading("4. Declarations");
  const findAck = (type: string) => acks.find((a) => a.documentType === type && a.acknowledgedAt);
  const docLabels: Record<string, string> = {
    EMPLOYMENT_AGREEMENT: "Employment agreement",
    HANDBOOK: "Employee handbook",
    PRIVACY_NOTICE: "Privacy notice",
  };
  for (const type of ["EMPLOYMENT_AGREEMENT", "HANDBOOK", "PRIVACY_NOTICE"]) {
    const a = findAck(type);
    w.text(`${docLabels[type]}: ${a ? `acknowledged ${a.acknowledgedAt!.toLocaleString()} (version ${a.version})` : "Not acknowledged"}`);
  }
  for (const item of KEY_TERM_ITEMS) {
    const k = keyTerms.find((k) => k.termKey === item.key);
    w.text(`${item.label}: ${k ? `confirmed ${k.acknowledgedAt.toLocaleString()}` : "Not confirmed"}`);
  }
  w.text(`Comprehension check: ${latestQuiz ? `passed (${latestQuiz.score}%) on ${latestQuiz.attemptedAt.toLocaleString()}` : "Not passed"}`);
  w.gap(16);

  w.heading("5. HR verification outcome");
  for (const stepType of ONBOARDING_STEP_ORDER) {
    const step = process.steps.find((s) => s.stepType === stepType);
    if (!step) continue;
    w.text(
      `${ONBOARDING_STEP_LABELS[stepType]}: ${step.status}` +
        (step.verifiedAt ? ` -- verified ${step.verifiedAt.toLocaleString()} by ${verifierEmail(step.verifiedById)}` : ""),
    );
  }
  w.text(`Onboarding completed: ${process.completedAt ? process.completedAt.toLocaleString() : "Not yet"}`);
  w.gap(20);
  w.text("This record shows the last 4 digits of the NIN and bank account number only. Identity documents are not attached.");

  const bytes = await pdf.save();
  let fileUrl: string | null = null;
  try {
    const blob = await put(`onboarding-records/${employeeId}-v${version}-${Date.now()}.pdf`, Buffer.from(bytes), {
      access: "public",
      contentType: "application/pdf",
    });
    fileUrl = blob.url;
  } catch (err) {
    // The record row is still created below with fileUrl null -- so completion doesn't
    // silently leave no trace that a record was due, and HR can retry (see
    // regenerateOnboardingRecord) once storage is back, rather than this vanishing entirely.
    console.error("[onboarding-record-pdf] failed to upload PDF:", err);
  }

  return db.onboardingRecord.create({
    data: { employeeId, recordNumber, version, fileUrl, generatedById },
  });
}
