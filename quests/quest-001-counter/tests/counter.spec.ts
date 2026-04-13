import { test, expect } from "@playwright/test";

test.describe("카운터 앱", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: 실제 게임 환경 URL로 변경
    await page.goto("http://localhost:3000/editor/quest-001-counter/preview");
  });

  test("tc-001: 초기 카운터 값이 0", async ({ page }) => {
    const display = page.locator("#counter-display");
    await expect(display).toHaveText("0");
  });

  test("tc-002: + 버튼 클릭 시 1 증가", async ({ page }) => {
    await page.click("#btn-increase");
    const display = page.locator("#counter-display");
    await expect(display).toHaveText("1");
  });

  test("tc-003: - 버튼 클릭 시 1 감소", async ({ page }) => {
    await page.click("#btn-decrease");
    const display = page.locator("#counter-display");
    await expect(display).toHaveText("-1");
  });

  test("tc-004: Reset 버튼 클릭 시 0으로 초기화", async ({ page }) => {
    await page.click("#btn-increase");
    await page.click("#btn-increase");
    await page.click("#btn-reset");
    const display = page.locator("#counter-display");
    await expect(display).toHaveText("0");
  });

  test("tc-005: 음수일 때 빨간색 표시", async ({ page }) => {
    await page.click("#btn-decrease");
    const display = page.locator("#counter-display");
    const color = await display.evaluate((el) => getComputedStyle(el).color);
    // #EF4444 = rgb(239, 68, 68)
    expect(color).toBe("rgb(239, 68, 68)");
  });
});
