import { expect, test, type Page } from "@playwright/test";

const authStorageKey = "astrofoto-auth-session";

const smokeAuthSession = {
  email: "smoke@local",
  displayName: "Smoke Observatory",
  mode: "demo",
  createdAt: "2026-01-01T00:00:00.000Z"
};

const smokeBearerSession = {
  ...smokeAuthSession,
  mode: "login",
  accessToken: "smoke-bearer-token",
  expiresAt: "2026-07-21T20:00:00Z",
  userId: 42
};

test.beforeEach(async ({ page }) => {
  await page.route(/http:\/\/127\.0\.0\.1:5174\/api\/(?!auth\/).*/, (route) => route.abort());
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

test("registration stores backend bearer session", async ({ page }) => {
  await page.route(/http:\/\/127\.0\.0\.1:5174\/api\/auth\/register/, async (route) => {
    const payload = route.request().postDataJSON() as {
      display_name: string;
      email: string;
      password: string;
    };
    expect(payload).toMatchObject({
      display_name: "Backyard Observatory",
      email: "operator@example.com",
      password: "correct-horse-battery"
    });

    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        access_token: "mock-bearer-token",
        token_type: "bearer",
        expires_at: "2026-07-21T20:00:00Z",
        user: {
          id: 7,
          email: "operator@example.com",
          display_name: "Backyard Observatory",
          created_at: "2026-06-21T20:00:00Z"
        }
      })
    });
  });

  await openApp(page, { withAuth: false });
  await page.getByRole("tab", { name: "Rejestracja" }).click();
  await page.getByLabel("Nazwa profilu").fill("Backyard Observatory");
  await page.getByLabel("E-mail").fill("operator@example.com");
  await page.getByPlaceholder("Minimum 8 znakow").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Utworz konto" }).click();

  await expect(page.getByRole("navigation", { name: "Workspace modes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Log out Backyard Observatory" })).toBeVisible();

  const storedSession = await page.evaluate((storageKey) => {
    return JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as {
      accessToken?: string;
      displayName?: string;
      mode?: string;
      userId?: number;
    };
  }, authStorageKey);

  expect(storedSession).toMatchObject({
    accessToken: "mock-bearer-token",
    displayName: "Backyard Observatory",
    mode: "register",
    userId: 7
  });
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

test("FITS import stores archive with bearer token", async ({ page }) => {
  await page.route(/http:\/\/127\.0\.0\.1:5174\/api\/frames\/fits-scan/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify(mockFitsScan())
    });
  });

  await page.route(/http:\/\/127\.0\.0\.1:5174\/api\/session\/archive.*/, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ contentType: "application/json", status: 200, body: "[]" });
      return;
    }

    expect(route.request().headers().authorization).toBe("Bearer smoke-bearer-token");
    const payload = route.request().postDataJSON() as { target_name: string; status: string };
    expect(payload).toMatchObject({
      target_name: "North America",
      status: "captured"
    });

    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        id: 99,
        ...payload,
        created_at: "2026-06-21T20:00:00Z",
        updated_at: "2026-06-21T20:00:00Z"
      })
    });
  });

  await openApp(page, { session: smokeBearerSession });
  await page.getByRole("button", { name: "Frames" }).click();
  await page.getByRole("button", { name: "Scan" }).first().click();
  await expect(page.getByText("North America Nebula")).toBeVisible();

  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
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

async function openApp(
  page: Page,
  {
    session: authSession = smokeAuthSession,
    withAuth = true
  }: { session?: typeof smokeAuthSession; withAuth?: boolean } = {}
) {
  await page.addInitScript(
    ({ session, storageKey, withAuth: shouldSeedAuth }) => {
      window.localStorage.clear();
      window.localStorage.setItem("astrofoto-language", "en");
      if (shouldSeedAuth) {
        window.localStorage.setItem(storageKey, JSON.stringify(session));
      }
    },
    {
      session: authSession,
      storageKey: authStorageKey,
      withAuth
    }
  );
  await page.goto("/");
}

function mockFitsScan() {
  return {
    scan_path: ".",
    total_files: 2,
    parsed_files: 2,
    rejected_files: 0,
    total_light_seconds: 360,
    filters: ["Ha"],
    frame_types: ["Light"],
    objects: ["North America Nebula"],
    cameras: ["ASI2600MC Pro"],
    exposure_range_seconds: "180s",
    temperature_range_c: "-10.0C",
    groups: [
      {
        label: "Light / Ha / 180s",
        frame_type: "Light",
        filter_name: "Ha",
        frames: 2,
        total_exposure_seconds: 360,
        exposure_seconds: [180],
        temperature_range_c: "-10.0C"
      }
    ],
    frames: [mockFitsFrame("light_001.fit", "2026-06-21T22:10:00Z"), mockFitsFrame("light_002.fit", "2026-06-21T22:13:00Z")],
    warnings: []
  };
}

function mockFitsFrame(fileName: string, dateObs: string) {
  return {
    file_name: fileName,
    relative_path: fileName,
    frame_type: "Light",
    filter_name: "Ha",
    exposure_seconds: 180,
    gain: 100,
    offset: 50,
    sensor_temperature_c: -10,
    binning: "1x1",
    object_name: "North America Nebula",
    date_obs: dateObs,
    camera: "ASI2600MC Pro",
    telescope: "80ED Refractor",
    width_px: 6248,
    height_px: 4176,
    size_mb: 52.4,
    quality_score: 91,
    star_count: 840,
    fwhm_px: 2.4,
    eccentricity: 0.42,
    background_adu: 620,
    background_noise_adu: 11,
    quality_flags: [],
    status: "accepted",
    warnings: []
  };
}
