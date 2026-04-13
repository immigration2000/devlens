import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display DevLens title", async ({ page }) => {
    await expect(page).toHaveTitle(/DevLens/i);
    const heading = page.locator("h1").filter({ hasText: /DevLens/i }).first();
    await expect(heading).toBeVisible();
  });

  test("should display hero section with CTA", async ({ page }) => {
    // "시작하기" link should be visible
    const cta = page.locator("a").filter({ hasText: /시작하기/ }).first();
    await expect(cta).toBeVisible();
  });

  test("should display feature cards", async ({ page }) => {
    await expect(page.locator("text=Monaco 코드 편집기")).toBeVisible();
    await expect(page.locator("text=실시간 AI 분석")).toBeVisible();
    await expect(page.locator("text=학습 대시보드")).toBeVisible();
  });

  test("should display 3-step guide", async ({ page }) => {
    await expect(page.locator("text=과제 선택")).toBeVisible();
    await expect(page.locator("text=코드 작성")).toBeVisible();
    await expect(page.locator("text=분석 확인")).toBeVisible();
  });

  test("should navigate to quests when CTA is clicked", async ({ page }) => {
    const cta = page.locator("a").filter({ hasText: /시작하기/ }).first();
    await cta.click();
    await page.waitForURL("**/quests");
    expect(page.url()).toContain("/quests");
  });

  test("should have accessible navigation", async ({ page }) => {
    const nav = page.locator("nav");
    await expect(nav.first()).toBeVisible();
  });

  test("should have proper heading hierarchy", async ({ page }) => {
    const h1 = page.locator("h1");
    await expect(h1.first()).toBeVisible();
    const headings = page.locator("h1, h2, h3");
    expect(await headings.count()).toBeGreaterThan(2);
  });
});
