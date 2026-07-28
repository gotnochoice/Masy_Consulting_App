import { db } from "@/lib/db";
import { suggestReviewTemplate, type ReviewTemplateSection } from "@/lib/ai";

export type { ReviewTemplateSection };

const STATIC_TEMPLATES: Record<string, ReviewTemplateSection[]> = {
  "personal assistant": [
    {
      section: "Task Execution",
      questions: ["What were your main tasks this month?", "Were all tasks completed on time? If not, why?"],
    },
    {
      section: "Content Posting & Management",
      questions: [
        "How many posts were scheduled and published?",
        "Were you consistent with timing and frequency?",
        "What challenges affected posting consistency?",
      ],
    },
    {
      section: "Communication & Responsiveness",
      questions: [
        "How did you handle emails, DMs, and client inquiries?",
        "What steps did you take to improve response time?",
        "Did you miss or delay any important messages?",
      ],
    },
    {
      section: "Coordination & Implementation",
      questions: [
        "How did you implement ideas and briefs from the team?",
        "Did you seek clarification when instructions were unclear?",
        "How did you ensure tasks were executed correctly?",
      ],
    },
    {
      section: "Organization & Workflow",
      questions: ["How did you use tools to stay organized?", "What systems worked well for you this month?"],
    },
  ],
  "brand strategist": [
    {
      section: "Brand Strategy & Direction",
      questions: [
        "What strategic ideas or campaigns did you develop this month? State clearly for each brand and the total number.",
        "Which of the ideas were implemented, and how many?",
        "How did the strategies improve brand positioning or visibility?",
      ],
    },
    {
      section: "Content & Brand Alignment",
      questions: [
        "How did you guide content (social media, blogs, campaigns) this month?",
        "How did you ensure consistency across all brands?",
      ],
    },
    {
      section: "Strategic Contributions",
      questions: [
        "What new ideas, concepts, or initiatives did you propose?",
        "Which of them do you believe had the most impact, and why?",
      ],
    },
    {
      section: "Market Insight & Growth",
      questions: [
        "What trends, insights, or opportunities did you identify?",
        "What recommendations did you make for growth or improvement?",
      ],
    },
    {
      section: "Collaboration",
      questions: [
        "How did you communicate your ideas to the team?",
        "How did you give feedback on work submitted to you?",
      ],
    },
  ],
  "video editor": [
    {
      section: "Video Delivery",
      questions: [
        "What videos did you complete this month?",
        "Were all videos delivered on time? If not, why?",
      ],
    },
    {
      section: "Quality & Brand Alignment",
      questions: [
        "How did you ensure your video edits matched the brand style and expectations?",
        "What feedback did you receive, and how did you improve on it?",
      ],
    },
    {
      section: "Captions & Content Clarity",
      questions: ["How did you approach captions, text overlays, and overall message delivery in your videos?"],
    },
    {
      section: "Revisions & Responsiveness",
      questions: [
        "How quickly did you respond to feedback and corrections?",
        "How many revisions were required, and why?",
      ],
    },
    {
      section: "Communication & Brief Understanding",
      questions: [
        "Did you receive clear direction for all tasks?",
        "When unclear, did you ask questions or request clarification?",
      ],
    },
    {
      section: "Creativity & Initiative",
      questions: ["Did you suggest any ideas or improvements to your work this month? If yes, explain."],
    },
  ],
};

const ROLE_ALIASES: Record<string, string> = {
  "executive assistant": "personal assistant",
  ea: "personal assistant",
};

const GENERIC_TEMPLATE: ReviewTemplateSection[] = [
  {
    section: "Core Responsibilities",
    questions: [
      "What were your main responsibilities and tasks this cycle?",
      "Were they all completed on time? If not, why?",
    ],
  },
  {
    section: "Quality & Delivery",
    questions: [
      "How did you ensure the quality of your work met expectations?",
      "What feedback did you receive, and how did you act on it?",
    ],
  },
  {
    section: "Communication & Collaboration",
    questions: [
      "How did you communicate and collaborate with your team this cycle?",
      "Did you seek clarification when instructions were unclear?",
    ],
  },
];

const CLOSING_SECTIONS: ReviewTemplateSection[] = [
  { section: "Challenges", questions: ["What challenges affected your delivery or performance this cycle?"] },
  { section: "Improvements for Next Cycle", questions: ["What will you do differently next cycle to improve?"] },
  { section: "Support Needed", questions: ["What support or clarity do you need from your manager?"] },
];

function withClosing(sections: ReviewTemplateSection[]): ReviewTemplateSection[] {
  return [...sections, ...CLOSING_SECTIONS];
}

function isTemplate(value: unknown): value is ReviewTemplateSection[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (s) =>
        typeof s === "object" &&
        s !== null &&
        typeof (s as { section?: unknown }).section === "string" &&
        Array.isArray((s as { questions?: unknown }).questions),
    )
  );
}

export async function getReviewTemplate(
  employeeId: string,
  roleTitle: string,
  cached: unknown,
): Promise<ReviewTemplateSection[]> {
  if (isTemplate(cached)) {
    return cached;
  }

  const key = roleTitle.trim().toLowerCase();
  const staticMatch = STATIC_TEMPLATES[ROLE_ALIASES[key] ?? key];
  if (staticMatch) {
    const template = withClosing(staticMatch);
    await db.employee.update({ where: { id: employeeId }, data: { reviewTemplate: template } });
    return template;
  }

  try {
    const generated = await suggestReviewTemplate(roleTitle);
    if (generated.length > 0) {
      const template = withClosing(generated);
      await db.employee.update({ where: { id: employeeId }, data: { reviewTemplate: template } });
      return template;
    }
  } catch (err) {
    console.error("Failed to generate role-based review template, using generic default", err);
  }

  return withClosing(GENERIC_TEMPLATE);
}
