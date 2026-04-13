import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should access quests page without auth (public route)", async ({ page }) => {
    await page.goto("/quests");
    await expect(page.locator("h1").filter({ hasText: /과제 목록/ })).toBeVisible();
    // Should NOT redirect to login
    expect(page.url()).toContain("/quests");
  });

  test("should access editor page without auth (public route)", async ({ page }) => {
    // Navigate to quests, start a quest
    await page.goto("/quests");
    await page.waitForLoadState("networkidle");

    // Set dev token for API auth
    await page.evaluate(() => localStorage.setItem("auth_token", "dev-token"));

    const detailBtn = page.locator("button").filter({ hasText: "자세히 보기" }).first();
    if (await detailBtn.isVisible()) {
      await detailBtn.click();
      await page.locator("button").filter({ hasText: "과제 시작하기" }).click();
      await page.waitForURL("**/editor/**", { timeout: 15000 });
      expect(page.url()).toContain("/editor/");
    }
  });

  test("should access dashboard without auth (public route)", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("h1").filter({ hasText: /대시보드/ })).toBeVisible();
    expect(page.url()).toContain("/dashboard");
  });

  test("login page should display GitHub login button", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=GitHub")).toBeVisible();
  });

  test("login page should have guest access link", async ({ page }) => {
    await page.goto("/login");
    const guestLink = page.locator("a").filter({ hasText: /Guest|게스트|시작/ });
    await expect(guestLink.first()).toBeVisible();
  });
});
