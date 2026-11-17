export const DEFAULT_ONBOARDING_TASKS = [
  "Signed employment contract on file",
  "Company email & systems access set up",
  "Employee handbook shared",
  "Welcome / intro call scheduled",
  "Introduced to team",
];

export const MAX_ONBOARDING_QUESTION_FILE_LABEL = "8MB";

export const ONBOARDING_STEP_ORDER = [
  "PERSONAL_DETAILS",
  "IDENTITY_DOCUMENTS",
  "GUARANTORS",
  "ACKNOWLEDGMENTS",
  "SIGNATURE",
  "PROPERTY_HANDOVER",
] as const;

export const ONBOARDING_STEP_LABELS: Record<(typeof ONBOARDING_STEP_ORDER)[number], string> = {
  PERSONAL_DETAILS: "Personal details",
  IDENTITY_DOCUMENTS: "Identity & address documents",
  GUARANTORS: "Guarantors",
  ACKNOWLEDGMENTS: "Agreement, handbook & quiz",
  SIGNATURE: "Signature",
  PROPERTY_HANDOVER: "Company property handover",
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
  { key: "verification_and_guarantors", label: "That my guarantors are verification contacts only, not financially liable" },
  { key: "company_property", label: "Company property rules, if equipment is issued to me" },
  { key: "probation_and_notice", label: "My probation period and notice requirements" },
  { key: "confidentiality_and_ip", label: "Confidentiality and intellectual property terms" },
];

export const ONBOARDING_STEP_ROUTES: Record<(typeof ONBOARDING_STEP_ORDER)[number], string> = {
  PERSONAL_DETAILS: "personal-details",
  IDENTITY_DOCUMENTS: "identity-documents",
  GUARANTORS: "guarantors",
  ACKNOWLEDGMENTS: "acknowledgments",
  SIGNATURE: "signature",
  PROPERTY_HANDOVER: "property-handover",
};
