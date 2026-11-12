import { test, expect } from "@playwright/test";
import { OPS_LOGIN, CLIENT_LOGIN, EMPLOYEE_LOGIN } from "./helpers";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("MASY_OPS login lands on /ops/overview", async ({ page }) => {
  await login(page, OPS_LOGIN.email, OPS_LOGIN.password);
  await page.waitForURL(/\/ops\/overview/);
  await expect(page).toHaveURL(/\/ops\/overview/);
});

test("CLIENT login lands on /client/staff", async ({ page }) => {
  await login(page, CLIENT_LOGIN.email, CLIENT_LOGIN.password);
  await page.waitForURL(/\/client\/staff/);
  await expect(page).toHaveURL(/\/client\/staff/);
});

test("EMPLOYEE login lands on /me/profile", async ({ page }) => {
  await login(page, EMPLOYEE_LOGIN.email, EMPLOYEE_LOGIN.password);
  await page.waitForURL(/\/me\/profile/);
  await expect(page).toHaveURL(/\/me\/profile/);
});

test("wrong password shows an error and does not navigate", async ({ page }) => {
  await login(page, OPS_LOGIN.email, "wrong-password");
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
