export type SuggestedQuestion = { label: string; type: "SHORT_TEXT" | "LONG_TEXT" | "LINK"; required: boolean };
export type ReviewTemplateSection = { section: string; questions: string[] };
export type SuggestedOnboardingQuestion = {
  label: string;
  type: "SHORT_TEXT" | "LONG_TEXT" | "LINK" | "MULTIPLE_CHOICE" | "CHECKBOXES";
  required: boolean;
  options: string[];
};
export type CandidateToRank = {
  id: string;
  name: string;
  yearsExperience: string | null;
  location: string | null;
  expectedPay: string | null;
  answers: { label: string; value: string }[];
};
export type CandidateRanking = { candidateId: string; score: number; rationale: string };

const CLAUDE_MODEL = "claude-sonnet-5";
const ONBOARDING_QUESTION_TYPES = ["SHORT_TEXT", "LONG_TEXT", "LINK", "MULTIPLE_CHOICE", "CHECKBOXES"];
const RESULT_TOOL_NAME = "return_result";

// Claude has no "response schema" mode like some other providers -- the reliable way to get
// back JSON matching a shape is to force it to call a single tool whose input_schema is that
// shape. The tool is never actually "run"; its input *is* the structured result we want.
async function callClaude(
  prompt: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resultSchema: Record<string, any>,
  file?: { mimeType: string; data: string },
): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("AI suggestions aren't set up yet. Ask your developer to add an ANTHROPIC_API_KEY.");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = [];
  if (file) {
    content.push({
      type: "document",
      source: { type: "base64", media_type: file.mimeType, data: file.data },
    });
  }
  content.push({ type: "text", text: prompt });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      tools: [{ name: RESULT_TOOL_NAME, description: "Returns the structured result.", input_schema: resultSchema }],
      tool_choice: { type: "tool", name: RESULT_TOOL_NAME },
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error("Claude API error", res.status, errBody);

    if (res.status === 429) {
      throw new Error("Claude is rate-limited right now (too many requests). Wait a moment and try again.");
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("Claude rejected the request. Double-check the ANTHROPIC_API_KEY is correct and active.");
    }
    if (res.status === 400) {
      throw new Error("Claude couldn't process that request. Try again, or with a smaller document.");
    }
    throw new Error(`Claude request failed (${res.status}). Try again in a moment.`);
  }

  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolUse = data.content?.find((block: any) => block.type === "tool_use" && block.name === RESULT_TOOL_NAME);
  if (!toolUse) {
    throw new Error("Claude didn't return any suggestions. Try again in a moment.");
  }

  return toolUse.input;
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

  const result = (await callClaude(prompt, {
    type: "object",
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            type: { type: "string", enum: ["SHORT_TEXT", "LONG_TEXT", "LINK"] },
            required: { type: "boolean" },
          },
          required: ["label", "type", "required"],
        },
      },
    },
    required: ["questions"],
  })) as { questions: SuggestedQuestion[] };

  return result.questions
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

  const result = (await callClaude(prompt, {
    type: "object",
    properties: {
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            section: { type: "string" },
            questions: { type: "array", items: { type: "string" } },
          },
          required: ["section", "questions"],
        },
      },
    },
    required: ["sections"],
  })) as { sections: ReviewTemplateSection[] };

  return result.sections
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

const onboardingQuestionResultSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          type: { type: "string", enum: ONBOARDING_QUESTION_TYPES },
          required: { type: "boolean" },
          options: { type: "array", items: { type: "string" } },
        },
        required: ["label", "type", "required", "options"],
      },
    },
  },
  required: ["questions"],
};

export async function extractOnboardingQuestionsFromDocument(
  input: { text: string } | { file: { mimeType: string; data: string } },
): Promise<SuggestedOnboardingQuestion[]> {
  const prompt =
    "text" in input
      ? `${ONBOARDING_EXTRACTION_INSTRUCTIONS}\n\nDocument content:\n"""\n${input.text}\n"""`
      : `${ONBOARDING_EXTRACTION_INSTRUCTIONS}\n\nThe document is attached.`;

  const result = (await callClaude(
    prompt,
    onboardingQuestionResultSchema,
    "file" in input ? input.file : undefined,
  )) as { questions: SuggestedOnboardingQuestion[] };

  return result.questions
    .filter((q) => q.label && ONBOARDING_QUESTION_TYPES.includes(q.type))
    .map((q) => ({ ...q, options: Array.isArray(q.options) ? q.options.filter(Boolean) : [] }))
    .slice(0, 20);
}

// Pure triage aid: scores candidates against a role so a reviewer can scan the strongest
// first, and nothing more. No stage changes, no emails, no decisions -- every candidate
// stays exactly where they are regardless of score.
export async function rankCandidates(
  role: { title: string; description: string | null },
  candidates: CandidateToRank[],
): Promise<CandidateRanking[]> {
  const candidateBlock = candidates
    .map((c, i) => {
      const details = [
        c.yearsExperience && `Years of experience: ${c.yearsExperience}`,
        c.location && `Location: ${c.location}`,
        c.expectedPay && `Expected pay: ${c.expectedPay}`,
        ...c.answers.map((a) => `${a.label}: ${a.value}`),
      ].filter(Boolean);
      return `Candidate ${i + 1} (id: "${c.id}"):\nName: ${c.name}\n${details.join("\n")}`;
    })
    .join("\n---\n");

  const prompt = `You are helping a recruiter triage a pile of job applications. You are NOT deciding who gets
rejected or advanced -- you are only ranking candidates so a human reviewer can scan the strongest ones first.
Every candidate stays in the pipeline regardless of score; nothing gets auto-rejected, and the recruiter makes
every actual decision.

Role: ${role.title}
Role description: ${role.description || "not provided"}

Score each candidate below from 0 to 100 on how well they fit this specific role, based only on what they
actually wrote in their answers -- do not infer anything they didn't state. Give a short, specific one-sentence
rationale citing something they actually said (not a generic summary). Do not penalize a short answer that still
clearly and sufficiently answers the question.

${candidateBlock}`;

  const result = (await callClaude(prompt, {
    type: "object",
    properties: {
      rankings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            candidateId: { type: "string" },
            score: { type: "integer", minimum: 0, maximum: 100 },
            rationale: { type: "string" },
          },
          required: ["candidateId", "score", "rationale"],
        },
      },
    },
    required: ["rankings"],
  })) as { rankings: CandidateRanking[] };

  const validIds = new Set(candidates.map((c) => c.id));
  return result.rankings.filter(
    (r) => validIds.has(r.candidateId) && typeof r.score === "number" && r.score >= 0 && r.score <= 100,
  );
}

export type ReviewQualityCheck = { hasIssue: boolean; message: string };

// Catches a one-word/thin self-assessment at submission time so the employee can add detail
// before it ever reaches Masy, rather than Masy discovering it's unusable after the fact.
// Deliberately lenient: a short answer that genuinely and sufficiently answers the question
// is not an issue -- only answers that don't actually engage with what was asked are.
export async function checkReviewQuality(
  sections: { section: string; answers: { question: string; answer: string }[] }[],
): Promise<ReviewQualityCheck> {
  const qaBlock = sections
    .map((s) => `${s.section}:\n${s.answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join("\n")}`)
    .join("\n\n");

  const prompt = `You are checking a submitted employee self-assessment for quality before it's accepted.

Flag it ONLY if one or more answers are too thin to be useful to a reviewer -- a single word, "fine", "nothing",
"n/a" on a question that clearly expects more, or an answer that doesn't actually address what was asked. Do NOT
flag an answer just because it's short -- a brief answer that genuinely and sufficiently answers its question is
fine as-is.

${qaBlock}

If there's a real issue, write a short, friendly message (1-2 sentences) telling the employee specifically which
answer(s) need more detail and why, so they can revise before resubmitting. If everything is adequate, hasIssue
should be false and message should be empty.`;

  const result = (await callClaude(prompt, {
    type: "object",
    properties: {
      hasIssue: { type: "boolean" },
      message: { type: "string" },
    },
    required: ["hasIssue", "message"],
  })) as ReviewQualityCheck;

  return { hasIssue: !!result.hasIssue, message: result.message || "" };
}

export async function draftJobDescription(roleTitle: string, brief: string): Promise<string> {
  const prompt = `You are drafting a job application page description for a recruiter to review and edit before
publishing.

Role title: ${roleTitle}
What the recruiter told you about this role: ${brief}

Write a description candidates will see on the application page: what the role involves day to day, and what
makes someone a good fit. 2-4 short paragraphs. Plain, direct language -- no corporate buzzwords ("synergy",
"dynamic self-starter", etc). You may bold a short label like **Key Responsibilities** by wrapping it in ** if it
helps structure the description, but don't overdo formatting. Do not invent specific facts (salary, exact hours,
company history) that weren't given to you in the brief.`;

  const result = (await callClaude(prompt, {
    type: "object",
    properties: { description: { type: "string" } },
    required: ["description"],
  })) as { description: string };

  return result.description.trim();
}

export async function draftContractLetter(details: {
  employeeName: string;
  roleTitle: string;
  companyName: string;
  startDate: string;
  salary: string | null;
}): Promise<string> {
  const prompt = `You are drafting an offer/contract letter for an HR consultancy (Masy Consulting) to review, edit,
and send on behalf of its client company. This is a DRAFT a human will check before it ever goes out -- write it
as a complete, ready-to-send letter, but do not invent any detail not given to you below (no made-up benefits,
notice periods, or clauses).

Employee name: ${details.employeeName}
Role title: ${details.roleTitle}
Company: ${details.companyName}
Start date: ${details.startDate}
${details.salary ? `Monthly salary: ₦${details.salary}` : "Salary: not provided -- leave a clear [SALARY] placeholder for Ops to fill in"}

Write a short, professional offer letter: greeting, confirmation of the role and start date, salary line (or the
placeholder if not provided), a line about Masy Consulting administering HR on the company's behalf, and a warm
closing. Plain text, no markdown formatting, ready to paste into an email or document.`;

  const result = (await callClaude(prompt, {
    type: "object",
    properties: { letter: { type: "string" } },
    required: ["letter"],
  })) as { letter: string };

  return result.letter.trim();
}

export type RoleDraft = { description: string; questions: SuggestedQuestion[] };

// One shot from a work req to everything a new role's application page needs, so Ops only
// has to review and save rather than drafting the description and then separately
// generating questions off of it.
export async function draftRoleFromWorkReq(roleTitle: string, workReq: string): Promise<RoleDraft> {
  const prompt = `You are helping a recruiter set up a new job application page from a work requisition / brief
they wrote internally for their own reference -- it may be informal, a bullet list, or unstructured notes.

Role title: ${roleTitle}
Work requisition:
"""
${workReq}
"""

Produce two things from this:

1. A candidate-facing description for the application page: what the role involves day to day, and what makes
someone a good fit. 2-4 short paragraphs, plain direct language, no corporate buzzwords ("synergy", "dynamic
self-starter", etc). You may bold a short label like **Key Responsibilities** by wrapping it in ** if it helps
structure it, but don't overdo formatting. Do not invent specific facts (salary, exact hours, company history)
that weren't given in the work req.

2. 4 to 6 concise screening questions specific to this role that help judge fit (skills, tools, availability,
portfolio, situational judgment, etc), based on what the work req says this role actually needs. The application
form already collects name, email, phone, years of experience, and a CV/resume link -- do not suggest those. For
each question choose the best answer type: SHORT_TEXT for a brief factual answer, LONG_TEXT for an answer needing
a paragraph, LINK for a URL such as a portfolio or work sample. Mark "required" true only for questions essential
to screening this candidate, false for nice-to-have ones.`;

  const result = (await callClaude(prompt, {
    type: "object",
    properties: {
      description: { type: "string" },
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            type: { type: "string", enum: ["SHORT_TEXT", "LONG_TEXT", "LINK"] },
            required: { type: "boolean" },
          },
          required: ["label", "type", "required"],
        },
      },
    },
    required: ["description", "questions"],
  })) as RoleDraft;

  return {
    description: result.description.trim(),
    questions: result.questions
      .filter((q) => q.label && ["SHORT_TEXT", "LONG_TEXT", "LINK"].includes(q.type))
      .slice(0, 6),
  };
}

