-- Record which specific platforms an applicant claims to follow us on, so Ops
-- can spot-check instead of trusting an unverifiable single "I follow" checkbox.
ALTER TABLE "Candidate" ADD COLUMN "followedSocials" TEXT[] NOT NULL DEFAULT '{}';
