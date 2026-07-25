import { db } from "@/lib/db";
import { suggestReviewQuestions } from "@/lib/ai";

export const DEFAULT_REVIEW_QUESTIONS = [
  "What were your key accomplishments this review cycle?",
  "What challenges did you face, and how did you handle them?",
  "Where do you feel you've grown the most in this role?",
  "What support or resources would help you do your job better?",
  "What are your goals for the next review cycle?",
];

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((q) => typeof q === "string");
}

export async function getReviewQuestions(employeeId: string, roleTitle: string, cached: unknown): Promise<string[]> {
  if (isStringArray(cached)) {
    return cached;
  }

  try {
    const generated = await suggestReviewQuestions(roleTitle);
    if (generated.length > 0) {
      await db.employee.update({ where: { id: employeeId }, data: { reviewQuestions: generated } });
      return generated;
    }
  } catch (err) {
    console.error("Failed to generate role-based review questions, using defaults", err);
  }

  return DEFAULT_REVIEW_QUESTIONS;
}
