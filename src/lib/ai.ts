export type SuggestedQuestion = { label: string; type: "SHORT_TEXT" | "LONG_TEXT" | "LINK"; required: boolean };

const GEMINI_MODEL = "gemini-2.0-flash";

export async function suggestRoleQuestions(title: string, description: string | null): Promise<SuggestedQuestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("AI question suggestions aren't set up yet — ask your developer to add a GEMINI_API_KEY.");
  }

  const prompt = `You are helping a recruiter build screening questions for a job application form.

Role title: ${title}
Role description: ${description || "not provided"}

The form already collects name, email, phone, years of experience, and a CV/resume link — do not suggest those.
Suggest 4 to 6 concise screening questions specific to this role that help judge fit (skills, tools, availability,
portfolio, situational judgment, etc). For each, choose the best answer type: SHORT_TEXT for a brief factual answer,
LONG_TEXT for an answer needing a paragraph, LINK for a URL such as a portfolio or work sample. Mark "required" true
only for questions essential to screening this candidate, false for nice-to-have ones.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
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
          },
        },
      }),
    },
  );

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error("Gemini API error", res.status, errBody);

    if (res.status === 429) {
      throw new Error(
        "Gemini's free tier is rate-limited right now (too many requests). Wait a minute and try again — " +
          "if it keeps happening, check your usage/quota at aistudio.google.com.",
      );
    }
    if (res.status === 400 || res.status === 403) {
      throw new Error("Gemini rejected the request — double-check the GEMINI_API_KEY is correct and active.");
    }
    throw new Error(`Gemini request failed (${res.status}). Try again in a moment.`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini didn't return any suggestions. Try again, or add a role description first.");
  }

  const parsed = JSON.parse(text) as SuggestedQuestion[];
  return parsed
    .filter((q) => q.label && ["SHORT_TEXT", "LONG_TEXT", "LINK"].includes(q.type))
    .slice(0, 6);
}
