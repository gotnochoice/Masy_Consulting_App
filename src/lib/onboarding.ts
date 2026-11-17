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

export const ONBOARDING_STEP_ROUTES: Record<(typeof ONBOARDING_STEP_ORDER)[number], string> = {
  PERSONAL_DETAILS: "personal-details",
  IDENTITY_DOCUMENTS: "identity-documents",
  GUARANTORS: "guarantors",
  ACKNOWLEDGMENTS: "acknowledgments",
  SIGNATURE: "signature",
  PROPERTY_HANDOVER: "property-handover",
};
