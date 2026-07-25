export type SuggestedQuestion = { label: string; type: "SHORT_TEXT" | "LONG_TEXT" | "LINK"; required: boolean };

const GEMINI_MODEL = "gemini-2.0-flash";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callGemini(prompt: string, responseSchema: Record<string, any>): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("AI suggestions aren't set up yet. Ask your developer to add a GEMINI_API_KEY.");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
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

export async function suggestReviewQuestions(roleTitle: string): Promise<string[]> {
  const prompt = `You are helping build a performance self-assessment form for an employee.

Employee's role/job title: ${roleTitle}

Write 5 concise, specific self-assessment questions for this role that go deeper than generic "what did you
accomplish" questions, probing the skills, responsibilities, and outcomes that matter most for someone in this
specific role. Each question should invite a few sentences of honest reflection, not a yes/no answer.`;

  const parsed = (await callGemini(prompt, {
    type: "ARRAY",
    items: { type: "STRING" },
  })) as string[];

  return parsed.filter((q) => typeof q === "string" && q.trim().length > 0).slice(0, 6);
}
