import { test, expect } from "@playwright/test";
async function fillDemo(page: import("@playwright/test").Page) {
  for (const [label, value] of [
    ["① 酸素ボンベ残圧", "12"],
    ["② FiO₂", "40"],
    ["③ 分時換気量（MinVent）", "10"],
    ["④ 総リーク量（Total Leak）", "30"],
    ["⑤ 搬送予定時間", "30"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole("button", { name: "計算する" }).click();
}
test("モバイル入力・結果・検証・リセット・設定", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(
    page.getByText("V60・ART70などのNPPV装置 ／ 簡易推定"),
  ).toBeVisible();
  await expect(
    page.getByLabel("④ 総リーク量（Total Leak）", { exact: true }),
  ).toBeVisible();
  const inputBox = await page
    .getByLabel("① 酸素ボンベ残圧", { exact: true })
    .boundingBox();
  expect(inputBox?.height).toBeGreaterThanOrEqual(60);
  await page.screenshot({ path: "/tmp/nppv-mobile-input.png", fullPage: true });
  await expect(
    page.getByLabel("① 酸素ボンベ残圧", { exact: true }),
  ).toHaveValue("");
  await page.getByRole("button", { name: "計算する" }).click();
  await expect(
    page.getByText("FiO₂は21～100%で入力してください"),
  ).toBeVisible();
  await fillDemo(page);
  await expect(page.locator(".big-time")).toHaveText("約28分");
  await expect(
    page.getByText("計算上の推定時間が搬送予定時間を下回っています"),
  ).toBeVisible();
  await expect(page.locator(".simulation-row")).toHaveCount(3);
  await expect(
    page.getByRole("heading", {
      name: "安全係数適用後の推定時間",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "今回の計算設定" }),
  ).toContainText("500 L");
  await expect(
    page.getByRole("region", { name: "今回の計算設定" }),
  ).toContainText("14.7 MPa");
  await expect(
    page.getByRole("region", { name: "今回の計算設定" }),
  ).toContainText("1 MPa");
  await expect(
    page.getByText("Total Leak 30 L/min", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("NPPV装置のバッテリー残量を確認", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/nppv-mobile-results.png",
    fullPage: true,
  });
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByLabel("酸素ボンベ残圧を確認", { exact: true }).check();
  await page.reload();
  await fillDemo(page);
  await expect(
    page.getByLabel("酸素ボンベ残圧を確認", { exact: true }),
  ).not.toBeChecked();
  await page.locator(".settings summary").click();
  await page.getByLabel("安全係数", { exact: true }).fill("50");
  await expect(page.locator(".result-card")).toHaveCount(0);
  await page.getByRole("button", { name: "計算する" }).click();
  await expect(page.locator(".big-time")).toHaveText("約17分");
  await page
    .getByRole("button", { name: "詳細設定をすべて初期値に戻す" })
    .click();
  await expect(page.getByLabel("安全係数", { exact: true })).toHaveValue("80");
  await page.getByLabel("ボンベ容量", { exact: true }).fill("400");
  await page.getByRole("button", { name: "計算する" }).click();
  await expect(
    page.getByRole("region", { name: "今回の計算設定" }),
  ).toContainText("400 L");
  await page.getByLabel("満充填圧", { exact: true }).fill("10");
  await page.getByRole("button", { name: "計算する" }).click();
  await expect(
    page.getByText("ボンベ圧は0より大きく、満充填圧以下で入力してください"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "詳細設定をすべて初期値に戻す" })
    .click();
  await page.getByLabel("② FiO₂", { exact: true }).fill("21");
  await page.getByRole("button", { name: "計算する" }).click();
  await expect(
    page.getByText("FiO₂ 21%では酸素ボンベ消費量計算の対象外です"),
  ).toBeVisible();
  await page.getByLabel("① 酸素ボンベ残圧", { exact: true }).fill("1");
  await page.getByLabel("② FiO₂", { exact: true }).fill("40");
  await page.getByRole("button", { name: "計算する" }).click();
  await expect(page.getByText("使用可能な酸素残量がありません")).toBeVisible();
  await expect(page.locator(".big-time")).toHaveText("約0分");
  await page.getByRole("button", { name: "入力をクリア" }).click();
  await expect(
    page.getByLabel("① 酸素ボンベ残圧", { exact: true }),
  ).toHaveValue("");
  await expect(page.locator(".result-card")).toHaveCount(0);
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await expect(
    page.getByRole("heading", { name: "重要", exact: true }),
  ).toBeVisible();
  expect(await page.locator("body").innerText()).not.toMatch(/NaN|Infinity/);
});
test("PWAキャッシュからオフライン再読込して計算", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await fillDemo(page);
  await expect(page.locator(".big-time")).toHaveText("約28分");
});

test("丸め後の時間に隠れた不足と1分未満の推定時間を明示する", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto("/");
  await fillDemo(page);
  await page.getByLabel("⑤ 搬送予定時間", { exact: true }).fill("27.7");
  await page.getByRole("button", { name: "計算する" }).click();
  await expect(page.locator(".big-time")).toHaveText("約28分");
  await expect(page.getByText("1分未満の不足", { exact: true })).toBeVisible();
  await expect(page.locator(".status.red")).toBeVisible();
  await page.getByLabel("⑤ 搬送予定時間", { exact: true }).fill("27.6");
  await page.getByRole("button", { name: "計算する" }).click();
  await expect(page.getByText("1分未満の余裕", { exact: true })).toBeVisible();
  await expect(page.locator(".status.yellow")).toBeVisible();
  await page.getByLabel("① 酸素ボンベ残圧", { exact: true }).fill("1.1");
  await page.getByRole("button", { name: "計算する" }).click();
  await expect(page.locator(".big-time")).toHaveText("1分未満");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/nppv-sub-minute-result.png",
    fullPage: true,
  });
});
