import { test, expect } from "@playwright/test";

test.describe("Editor Page", () => {
  test.beforeEach(async ({ page }) => {
    // Set dev token
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("auth_token", "dev-token"));

    // Navigate to quests and start first quest
    await page.goto("/quests");
    await page.waitForLoadState("networkidle");
    await page.locator("button").filter({ hasText: "자세히 보기" }).first().click();
    await page.locator("button").filter({ hasText: "과제 시작하기" }).click();
    await page.waitForURL("**/editor/**", { timeout: 15000 });
  });

  test("should display quest title in toolbar", async ({ page }) => {
    const title = page.locator("h2").first();
    await expect(title).toBeVisible({ timeout: 15000 });
  });

  test("should load Monaco editor", async ({ page }) => {
    const editor = page.locator(".monaco-editor");
    await expect(editor).toBeVisible({ timeout: 30000 });
  });

  test("should have execute and submit buttons", async ({ page }) => {
    await expect(page.locator("button").filter({ hasText: "실행" })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: "제출" })).toBeVisible();
  });

  test("should have sidebar tabs", async ({ page }) => {
    await expect(page.locator("button").filter({ hasText: "분석결과" })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: "테스트" })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: "타임라인" })).toBeVisible();
  });

  test("should have bottom panel tabs", async ({ page }) => {
    await expect(page.locator("button").filter({ hasText: "콘솔" })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: "미리보기" })).toBeVisible();
  });

  test("should display timer", async ({ page }) => {
    // Timer should show MM:SS format
    const timer = page.locator("text=/\\d+:\\d{2}/").first();
    await expect(timer).toBeVisible({ timeout: 15000 });
  });
});
