import { db } from "@/lib/db";
import { suggestReviewTemplate, type ReviewTemplateSection } from "@/lib/ai";

export type { ReviewTemplateSection };

// Generic closing questions appended to templates we generate ourselves (AI or fallback).
// Static templates below are already complete end-to-end, matching the exact source report.
const CLOSING_SECTIONS: ReviewTemplateSection[] = [
  { section: "Challenges", questions: ["What challenges affected your delivery or performance this cycle?"] },
  { section: "Improvements for Next Cycle", questions: ["What will you do differently next cycle to improve?"] },
  { section: "Support Needed", questions: ["What support or clarity do you need from your manager?"] },
];

function withClosing(sections: ReviewTemplateSection[]): ReviewTemplateSection[] {
  return [...sections, ...CLOSING_SECTIONS];
}

// Shared opening/closing used by every Masy Properties & Development role — verbatim from
// their standard "Monthly Performance Report" template.
const MASY_PROPERTIES_OPENING: ReviewTemplateSection = {
  section: "Monthly Activities",
  questions: [
    "What tasks, projects, or responsibilities were assigned to you during this month?",
    "Which of these tasks were completed?",
    "Which tasks remain outstanding?",
    "For any outstanding tasks, explain why they were not completed.",
    "What additional responsibilities did you take on outside your normal duties?",
  ],
};

const MASY_PROPERTIES_CLOSING: ReviewTemplateSection[] = [
  { section: "Challenges", questions: ["What challenges affected your performance this month?"] },
  { section: "Lessons Learned", questions: ["What key lessons did you learn this month?"] },
  { section: "Improvements for Next Month", questions: ["What will you do differently next month?"] },
  {
    section: "Support Needed",
    questions: ["What support, resources, training, or decisions do you need from Management?"],
  },
  {
    section: "Employee Self-Assessment",
    questions: ["On a scale of 1–10, how would you rate your performance this month, and why?"],
  },
];

function masyPropertiesTemplate(middle: ReviewTemplateSection[]): ReviewTemplateSection[] {
  return [MASY_PROPERTIES_OPENING, ...middle, ...MASY_PROPERTIES_CLOSING];
}

const STATIC_TEMPLATES: Record<string, ReviewTemplateSection[]> = {
  // Sasy Couture / BMC-style clients
  "personal assistant": withClosing([
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
  ]),
  "brand strategist": withClosing([
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
  ]),
  "video editor": withClosing([
    {
      section: "Video Delivery",
      questions: ["What videos did you complete this month?", "Were all videos delivered on time? If not, why?"],
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
  ]),

  // Masy Properties & Development Limited
  "executive assistant": masyPropertiesTemplate([
    {
      section: "Executive Support",
      questions: [
        "How many meetings, appointments, inspections, or engagements did you coordinate this month?",
        "What executive tasks required follow-up, and were they successfully completed?",
        "Were there any missed deadlines, appointments, or communication gaps? If yes, explain.",
      ],
    },
    {
      section: "Administration",
      questions: [
        "How many receipts, offer letters, allocation letters, contracts, or other documents did you process?",
        "How did you ensure records remained organized and accurate?",
        "Were there any administrative challenges or errors encountered?",
      ],
    },
    {
      section: "Client & Team Coordination",
      questions: [
        "How many clients did you attend to this month?",
        "What issues did clients raise, and how were they resolved?",
        "How did you support communication between departments?",
      ],
    },
  ]),
  "social media handler and video editor": masyPropertiesTemplate([
    {
      section: "Content Production",
      questions: [
        "How many posts, reels, videos, campaigns, or content pieces were produced this month?",
        "List the major campaigns executed.",
      ],
    },
    {
      section: "Content Performance",
      questions: [
        "Which content performed best, and why do you think it performed well?",
        "Which content performed below expectations?",
      ],
    },
    {
      section: "Audience Growth",
      questions: [
        "How many followers were gained across platforms?",
        "How many inquiries or leads were generated?",
        "How did social media contribute to company objectives this month?",
      ],
    },
    {
      section: "Strategy & Innovation",
      questions: [
        "What new ideas or strategies did you propose?",
        "Which ideas were implemented, and what results did they generate?",
      ],
    },
  ]),
  "operational manager / inspection officer": masyPropertiesTemplate([
    {
      section: "Site Activities",
      questions: [
        "How many site inspections did you conduct this month?",
        "List all sites visited.",
        "What issues were identified, and what actions were taken to resolve them?",
      ],
    },
    {
      section: "Site Supervision",
      questions: [
        "How many contractors, artisans, or site workers were supervised?",
        "Were there any delays, quality concerns, or compliance issues? How were these handled?",
      ],
    },
    {
      section: "Reporting",
      questions: [
        "Were all reports submitted on time?",
        "What were the most important operational updates during the month?",
      ],
    },
    {
      section: "Operational Improvements",
      questions: ["What improvements did you introduce or recommend, and what measurable impact did they have?"],
    },
  ]),
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
  const staticMatch = STATIC_TEMPLATES[key];
  if (staticMatch) {
    await db.employee.update({ where: { id: employeeId }, data: { reviewTemplate: staticMatch } });
    return staticMatch;
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
