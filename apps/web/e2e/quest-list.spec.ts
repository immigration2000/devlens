import { test, expect } from "@playwright/test";

test.describe("Quest List Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/quests");
    await page.waitForLoadState("networkidle");
  });

  test("should display quest list heading", async ({ page }) => {
    await expect(page.locator("h1").filter({ hasText: /과제 목록/ })).toBeVisible();
  });

  test("should load quests from API", async ({ page }) => {
    const cards = page.locator(".grid > div");
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test("should have difficulty filter buttons", async ({ page }) => {
    await expect(page.locator("button").filter({ hasText: "전체" })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: "기초" })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: "중급" })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: "고급" })).toBeVisible();
  });

  test("should filter quests by difficulty", async ({ page }) => {
    const allCount = await page.locator(".grid > div").count();

    await page.locator("button").filter({ hasText: "기초" }).click();
    await page.waitForTimeout(300);
    const easyCount = await page.locator(".grid > div").count();
    expect(easyCount).toBeLessThan(allCount);
    expect(easyCount).toBeGreaterThan(0);

    await page.locator("button").filter({ hasText: "전체" }).click();
    await page.waitForTimeout(300);
    expect(await page.locator(".grid > div").count()).toBe(allCount);
  });

  test("should have search input", async ({ page }) => {
    await expect(page.locator("input[placeholder*='검색']")).toBeVisible();
  });

  test("should open quest detail modal on card click", async ({ page }) => {
    await page.locator("button").filter({ hasText: "자세히 보기" }).first().click();
    await expect(page.locator("button").filter({ hasText: "과제 시작하기" })).toBeVisible({ timeout: 3000 });
  });
});
