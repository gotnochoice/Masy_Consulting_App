export type SuggestedQuestion = { label: string; type: "SHORT_TEXT" | "LONG_TEXT" | "LINK"; required: boolean };
export type ReviewTemplateSection = { section: string; questions: string[] };
export type SuggestedOnboardingQuestion = {
  label: string;
  type: "SHORT_TEXT" | "LONG_TEXT" | "LINK" | "MULTIPLE_CHOICE" | "CHECKBOXES";
  required: boolean;
  options: string[];
};

const GEMINI_MODEL = "gemini-2.0-flash";
const ONBOARDING_QUESTION_TYPES = ["SHORT_TEXT", "LONG_TEXT", "LINK", "MULTIPLE_CHOICE", "CHECKBOXES"];

async function callGemini(
  prompt: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responseSchema: Record<string, any>,
  file?: { mimeType: string; data: string },
): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("AI suggestions aren't set up yet. Ask your developer to add a GEMINI_API_KEY.");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [{ text: prompt }];
  if (file) parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
    },
  );

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error("Gemini API error", res.status, errBody);

    if (res.status === 429) {
      throw new Error(
        "Gemini's free tier is rate-limited right now (too many requests). Wait a minute and try again. " +
          "If it keeps happening, check your usage and quota at aistudio.google.com.",
      );
    }
    if (res.status === 400 || res.status === 403) {
      throw new Error("Gemini rejected the request. Double-check the GEMINI_API_KEY is correct and active.");
    }
    throw new Error(`Gemini request failed (${res.status}). Try again in a moment.`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini didn't return any suggestions. Try again in a moment.");
  }

  return JSON.parse(text);
}

export async function suggestRoleQuestions(title: string, description: string | null): Promise<SuggestedQuestion[]> {
  const prompt = `You are helping a recruiter build screening questions for a job application form.

Role title: ${title}
Role description: ${description || "not provided"}

The form already collects name, email, phone, years of experience, and a CV/resume link. Do not suggest those.
Suggest 4 to 6 concise screening questions specific to this role that help judge fit (skills, tools, availability,
portfolio, situational judgment, etc). For each, choose the best answer type: SHORT_TEXT for a brief factual answer,
LONG_TEXT for an answer needing a paragraph, LINK for a URL such as a portfolio or work sample. Mark "required" true
only for questions essential to screening this candidate, false for nice-to-have ones.`;

  const parsed = (await callGemini(prompt, {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        label: { type: "STRING" },
        type: { type: "STRING", enum: ["SHORT_TEXT", "LONG_TEXT", "LINK"] },
        required: { type: "BOOLEAN" },
      },
      required: ["label", "type", "required"],
    },
  })) as SuggestedQuestion[];

  return parsed
    .filter((q) => q.label && ["SHORT_TEXT", "LONG_TEXT", "LINK"].includes(q.type))
    .slice(0, 6);
}

export async function suggestReviewTemplate(roleTitle: string): Promise<ReviewTemplateSection[]> {
  const prompt = `You are building a structured end-of-cycle performance self-assessment form for an employee.

Employee's role/job title: ${roleTitle}

Design 3 to 5 sections specific to this role (for example "Task Delivery", "Quality & Brand Alignment",
"Communication & Collaboration") that probe the skills, responsibilities, and outcomes that matter most for
someone in this specific role. Each section should have 2 to 4 concise questions inviting a few sentences of
honest reflection, not yes/no answers. Do not include generic closing sections like "Challenges",
"Improvements for Next Month", or "Support Needed" — those are added separately.`;

  const parsed = (await callGemini(prompt, {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        section: { type: "STRING" },
        questions: { type: "ARRAY", items: { type: "STRING" } },
      },
      required: ["section", "questions"],
    },
  })) as ReviewTemplateSection[];

  return parsed
    .filter((s) => s.section && Array.isArray(s.questions) && s.questions.length > 0)
    .slice(0, 5);
}

const ONBOARDING_EXTRACTION_INSTRUCTIONS = `You are helping an HR team turn an existing paper or document form
(for example a guarantor form, next-of-kin form, or role-specific intake form) into digital form fields a new
hire fills in online.

Read the document and extract every distinct question or field it asks for. Skip anything that's just a title,
section heading, instructions, a signature line, or a date-of-signing line. For each question found:
- Write a clear, concise label a new hire would understand (rephrase clunky legal or form wording if needed).
- Choose the best answer type: SHORT_TEXT for a brief factual answer (name, phone, relationship, etc.), LONG_TEXT
  for anything needing a paragraph, LINK only if it explicitly asks for a URL, MULTIPLE_CHOICE if the document
  offers a small fixed set of options to pick exactly one from (e.g. Yes/No, Male/Female, Single/Married),
  CHECKBOXES if more than one option can be picked. For MULTIPLE_CHOICE and CHECKBOXES, list the options exactly
  as given in the document (use "Yes" and "No" for a yes/no question). Leave options empty for every other type.
- Mark "required" true unless the document clearly marks the field optional.`;

const onboardingQuestionSchema = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      label: { type: "STRING" },
      type: { type: "STRING", enum: ONBOARDING_QUESTION_TYPES },
      required: { type: "BOOLEAN" },
      options: { type: "ARRAY", items: { type: "STRING" } },
    },
    required: ["label", "type", "required", "options"],
  },
};

export async function extractOnboardingQuestionsFromDocument(
  input: { text: string } | { file: { mimeType: string; data: string } },
): Promise<SuggestedOnboardingQuestion[]> {
  const prompt =
    "text" in input
      ? `${ONBOARDING_EXTRACTION_INSTRUCTIONS}\n\nDocument content:\n"""\n${input.text}\n"""`
      : `${ONBOARDING_EXTRACTION_INSTRUCTIONS}\n\nThe document is attached.`;

  const parsed = (await callGemini(
    prompt,
    onboardingQuestionSchema,
    "file" in input ? input.file : undefined,
  )) as SuggestedOnboardingQuestion[];

  return parsed
    .filter((q) => q.label && ONBOARDING_QUESTION_TYPES.includes(q.type))
    .map((q) => ({ ...q, options: Array.isArray(q.options) ? q.options.filter(Boolean) : [] }))
    .slice(0, 20);
}
