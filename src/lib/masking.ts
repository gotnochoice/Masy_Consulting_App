// Shared "last 4 digits only" masking for anything that ends up on a PDF or screen a wider
// audience can see (the onboarding record, HR summaries) -- NIN, ID numbers, bank account
// numbers. Never used for the access-controlled HR-only views that need the real value.
export function maskLast4(value: string | null | undefined): string {
  if (!value) return "Not provided";
  const compact = value.replace(/\s+/g, "");
  if (compact.length <= 4) return "•".repeat(compact.length);
  return "•".repeat(compact.length - 4) + compact.slice(-4);
}
