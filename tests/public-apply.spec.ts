import { test, expect } from "@playwright/test";
import { findSeededRole, cleanupZzTestCandidates, pool } from "./helpers";

test("public applicant can submit the multi-step apply form end to end", async ({ page }) => {
  const role = await findSeededRole();
  const email = "zztest-apply@example.com";
  await pool.query(`DELETE FROM "Candidate" WHERE "openRoleId" = $1 AND email = $2`, [role.id, email]);

  await page.goto(`/${role.companySlug}/apply/${role.slug}`);

  // Step 1: the basics
  await page.getByLabel("Full name").fill("ZZTEST Applicant");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 2: personal details (role has all ask* flags on by default)
  await page.getByLabel("Phone").fill("08011111111");
  await page.getByLabel(/Where are you located/).fill("Lekki, Lagos");
  await page.getByLabel(/Years of experience/).fill("5 years");
  await page.getByLabel(/Expected pay/).fill("250000");
  await page.getByLabel(/How did you hear/).selectOption("Referral from someone");
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 3: application materials (resume upload is optional, skip it)
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 4: role's own questions
  await page.getByLabel("Link to your editing reel or portfolio").fill("https://vimeo.com/zztest-reel");
  await page.getByLabel("What editing software are you most comfortable with?").fill("Premiere Pro");

  // Final step's content (follow-us checkboxes) renders alongside the last question step
  const socialCheckboxes = page.locator('input[name="followedSocials"]');
  await socialCheckboxes.nth(0).check();
  await socialCheckboxes.nth(1).check();

  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(page.getByText("Application received")).toBeVisible();

  const { rows } = await pool.query(`SELECT stage, source FROM "Candidate" WHERE "openRoleId" = $1 AND email = $2`, [
    role.id,
    email,
  ]);
  expect(rows).toHaveLength(1);
  expect(rows[0].stage).toBe("APPLIED");
  expect(rows[0].source).toBe("WEBSITE");

  await cleanupZzTestCandidates(role.id);
});
