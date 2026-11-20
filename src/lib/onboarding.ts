export const DEFAULT_ONBOARDING_TASKS = [
  "Signed employment contract on file",
  "Company email & systems access set up",
  "Employee handbook shared",
  "Welcome / intro call scheduled",
  "Introduced to team",
];

export const MAX_ONBOARDING_QUESTION_FILE_LABEL = "8MB";

// Property handover and guarantors are both deliberately left out of this sequence for now.
// Property handover is being redesigned (the client will upload their own handover document
// rather than Ops typing in each item). Guarantors is redundant with the emergency contact
// already collected in personal details -- a second, much heavier round of contact-gathering
// (two people, each with relationship/occupation/address/phone/email plus a consent checkbox)
// wasn't worth the extra friction for what the emergency contact already covers. The underlying
// code (src/app/me/onboarding/property-handover/, src/app/me/onboarding/guarantors/,
// CompanyAsset, Guarantor) is untouched; a process created while either was active still has
// that step row, it's just never shown or required since nothing here iterates past this list.
export const ONBOARDING_STEP_ORDER = [
  "PERSONAL_DETAILS",
  "IDENTITY_DOCUMENTS",
  "ACKNOWLEDGMENTS",
  "SIGNATURE",
] as const;

export const ONBOARDING_STEP_LABELS: Record<(typeof ONBOARDING_STEP_ORDER)[number], string> = {
  PERSONAL_DETAILS: "Personal details",
  IDENTITY_DOCUMENTS: "Identity & address documents",
  ACKNOWLEDGMENTS: "Agreement, handbook & quiz",
  SIGNATURE: "Signature",
};

// The "Acknowledgment of Key Terms" checklist -- generic across any client's agreement, since
// these are universal onboarding concepts. What the agreement actually SAYS about each varies
// per client and lives in their own uploaded/drafted text; this is just confirming the new
// hire read and understood that category, for "it wasn't in the contract" disputes later.
export const KEY_TERM_ITEMS: { key: string; label: string }[] = [
  { key: "position_and_duties", label: "My position and duties as described in the agreement" },
  { key: "shift_and_weekends", label: "My shift, working days, and weekend expectations" },
  { key: "clocking_and_reachability", label: "How clocking in/out and reachability during my shift work" },
  { key: "unpaid_time_and_explain", label: "How unpaid time is calculated, and my right to explain before any deduction" },
  { key: "pay_and_bonus", label: "My gross pay, and that any bonus is discretionary, not guaranteed" },
  { key: "review_no_raise", label: "That a performance review does not guarantee a pay raise" },
  { key: "leave", label: "My leave entitlements" },
  { key: "company_property", label: "Company property rules, if equipment is issued to me" },
  { key: "probation_and_notice", label: "My probation period and notice requirements" },
  { key: "confidentiality_and_ip", label: "Confidentiality and intellectual property terms" },
];

// Shown once, before Step 1, ahead of any personal data collection -- a brief, generic notice
// (not the client's own detailed Privacy Notice, which is read in full later at Step 4).
export const EARLY_PRIVACY_CONSENT_NOTICE = [
  "Before you start, here's what happens with your information.",
  "Over the next few steps you'll be asked for personal details, identity documents, your National Identification Number (NIN), and bank details. This is collected to verify who you are, pay you correctly, and meet your employer's legal obligations.",
  "Your identity documents and NIN are visible only to the team handling verification -- never to your employer's other staff. You'll read a full privacy notice, written by your employer, later in this process.",
  "By continuing, you agree to this information being collected for onboarding.",
].join("\n\n");

export const ONBOARDING_STEP_ROUTES: Record<(typeof ONBOARDING_STEP_ORDER)[number], string> = {
  PERSONAL_DETAILS: "personal-details",
  IDENTITY_DOCUMENTS: "identity-documents",
  ACKNOWLEDGMENTS: "acknowledgments",
  SIGNATURE: "signature",
};

// Where to send the employee right after a step is submitted, so they don't have to go back to
// the overview and pick the next one themselves -- the next step's route, or the overview page
// once the last step (signature) is done.
export function nextOnboardingStepPath(current: (typeof ONBOARDING_STEP_ORDER)[number]): string {
  const index = ONBOARDING_STEP_ORDER.indexOf(current);
  const next = ONBOARDING_STEP_ORDER[index + 1];
  return next ? `/me/onboarding/${ONBOARDING_STEP_ROUTES[next]}` : "/me/onboarding";
}
