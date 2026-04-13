import { test, expect } from "@playwright/test";

test.describe("Dashboard Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("auth_token", "dev-token"));
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
  });

  test("should display dashboard heading", async ({ page }) => {
    await expect(page.locator("h1").filter({ hasText: /대시보드/ })).toBeVisible();
  });

  test("should display stats cards", async ({ page }) => {
    await expect(page.locator("text=전체 세션")).toBeVisible();
    await expect(page.locator("text=평균 건강도")).toBeVisible();
    await expect(page.locator("h3, .stats").filter({ hasText: "완료" }).first()).toBeVisible();
  });

  test("should have filter tabs", async ({ page }) => {
    await expect(page.locator("button").filter({ hasText: "전체" })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: "진행 중" })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: "완료" })).toBeVisible();
  });

  test("should have new quest button", async ({ page }) => {
    const newQuestBtn = page.locator("a, button").filter({ hasText: /새 과제 시작/ });
    await expect(newQuestBtn).toBeVisible();
  });
});
