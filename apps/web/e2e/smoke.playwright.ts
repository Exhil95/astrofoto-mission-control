import { expect, test, type Page } from "@playwright/test";

const authStorageKey = "astrofoto-auth-session";

const smokeAuthSession = {
  email: "smoke@local",
  displayName: "Smoke Observatory",
  mode: "demo",
  createdAt: "2026-01-01T00:00:00.000Z"
};

test.beforeEach(async ({ page }) => {
  await page.route(/http:\/\/127\.0\.0\.1:5174\/api\/.*/, (route) => route.abort());
});

test("start screen offers login, registration, and demo entry", async ({ page }) => {
  await openApp(page, { withAuth: false });

  await expect(page.getByRole("heading", { name: "Astrofoto Mission Control" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Logowanie" })).toBeVisible();
  await page.getByRole("tab", { name: "Rejestracja" }).click();
  await expect(page.getByLabel("Nazwa profilu")).toBeVisible();

  await page.getByRole("button", { name: "Wejdz demo bez konta" }).click();
  await expect(page.getByRole("navigation", { name: "Workspace modes" })).toBeVisible();
});

test("planner workflow renders the target selector, sky map, and session controls", async ({ page }) => {
  await openApp(page);

  await expect(page.getByRole("navigation", { name: "Workspace modes" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Planner workspace" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Interactive sky map" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Planner controls" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Session controls" })).toBeVisible();
});

test("session workflow opens the capture runbook and tonight board", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "Capture" }).click();

  await expect(page.getByRole("region", { name: "Capture workspace" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Session controls" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Capture runbook" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Tonight Board", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "MD" })).toBeVisible();
});

test("frames workflow exposes FITS ingest and calibration context", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "Frames" }).click();

  await expect(page.getByRole("region", { name: "Frames workspace" })).toBeVisible();
  await expect(page.getByRole("region", { name: "FITS metadata ingest" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Scan" }).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Expected capture frames" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Calibration library" })).toBeVisible();
});

test("multi-session workflow renders range controls and best-night list", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "Multi" }).click();

  await expect(page.getByRole("region", { name: "Multi-session workspace" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Multi-session planner" })).toBeVisible();
  await expect(page.getByRole("button", { name: "3n" })).toBeVisible();
  await expect(page.getByRole("button", { name: "7n" })).toBeVisible();
  await expect(page.getByRole("button", { name: "14n" })).toBeVisible();
  await expect(page.getByText("Best Sessions")).toBeVisible();
  await expect(page.getByRole("button", { name: "ICS" })).toBeVisible();
});

async function openApp(page: Page, { withAuth = true }: { withAuth?: boolean } = {}) {
  await page.addInitScript(
    ({ session, storageKey, withAuth: shouldSeedAuth }) => {
      window.localStorage.clear();
      window.localStorage.setItem("astrofoto-language", "en");
      if (shouldSeedAuth) {
        window.localStorage.setItem(storageKey, JSON.stringify(session));
      }
    },
    {
      session: smokeAuthSession,
      storageKey: authStorageKey,
      withAuth
    }
  );
  await page.goto("/");
}
