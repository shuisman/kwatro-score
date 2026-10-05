import { expect, test, type Page } from '@playwright/test';

const BASE = '/kwatro-score/';

/** Fail on console errors (e.g. hydration mismatches) and uncaught exceptions. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

test('root redirects to the browser language', async ({ page }) => {
  await page.goto(BASE);
  await expect(page).toHaveURL(/\/kwatro-score\/nl\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Score bijhouden voor Kwatro');
});

test('content pages are prerendered and hydrate cleanly', async ({ page }) => {
  const errors = watchErrors(page);
  for (const path of ['nl/', 'nl/kwatro/', 'nl/over/', 'en/', 'en/kwatro/', 'en/about/']) {
    await page.goto(BASE + path);
    await expect(page.locator('h1')).toBeVisible();
  }
  await page.goto(`${BASE}nl/kwatro/`);
  await expect(page.locator('#de-gouden-regel')).toBeVisible();
  expect(errors).toEqual([]);
});

test('language switch keeps the page', async ({ page }) => {
  await page.goto(`${BASE}nl/kwatro/`);
  await page.getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/en\/kwatro\/$/);
  await expect(page.locator('h1')).toHaveText('Kwatro: rules and scoring');
});

test('full game: setup, turns, pass, peek, end, summary, play again', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(`${BASE}nl/`);
  await page.getByRole('link', { name: 'Start een spel' }).first().click();
  await expect(page).toHaveURL(/\/nl\/spelen\/nieuw\/$/);

  const input = page.getByPlaceholder('Naam speler');
  for (const name of ['Anna', 'Bram', 'Cas']) {
    await input.fill(name);
    await input.press('Enter');
  }
  await expect(page.getByText('begint', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start spel' }).click();
  await expect(page).toHaveURL(/\/nl\/spelen\/spel\/[^/]+\/$/);

  // Anna's turn, Bram next.
  await expect(page.locator('section').getByText('Anna')).toBeVisible();
  await expect(page.getByText('Daarna:')).toBeVisible();

  const pad = async (digits: string) => {
    for (const d of digits) await page.getByRole('button', { name: d, exact: true }).click();
  };
  await pad('52');
  await page.getByRole('button', { name: 'Anna +52' }).click();
  await expect(page.locator('section .text-3xl')).toHaveText('Bram');
  await expect(page.getByRole('status')).toContainText('+52 voor Anna');

  await page.getByRole('button', { name: 'Passen' }).click();

  // High score asks for confirmation.
  await pad('208');
  await page.getByRole('button', { name: 'Cas +208' }).click();
  await expect(page.getByRole('dialog')).toContainText('Echt 208 punten?');
  await page.getByRole('button', { name: 'Ja, 208 punten' }).click();

  // Round 2, Anna again.
  await expect(page.getByText('Ronde 2')).toBeVisible();

  // Reload on a dynamic URL works (404.html fallback) and keeps state.
  await page.reload();
  await expect(page.getByText('Ronde 2')).toBeVisible();

  await page.getByRole('button', { name: 'Scoreblad' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('tfoot')).toContainText('52');
  await expect(dialog.locator('tfoot')).toContainText('208');
  await expect(dialog).toContainText('pas');
  await dialog.getByRole('button', { name: 'Sluiten' }).click();

  await page.getByRole('button', { name: 'Einde spel' }).click();
  await page.getByRole('button', { name: 'Beëindig spel' }).click();
  await expect(page).toHaveURL(/\/uitslag\/$/);
  await expect(page.locator('h1')).toHaveText('Cas wint!');
  await expect(page.getByText('Hoogste beurt')).toBeVisible();
  await expect(page.getByText('Cas met 208')).toBeVisible();

  // Install hint appears once after the first finished game.
  await expect(page.getByText('Installeer Kwatro Score')).toBeVisible();

  await page.getByRole('link', { name: 'Opnieuw spelen' }).click();
  await expect(page).toHaveURL(/\/nieuw\/\?from=/);
  await expect(page.getByText('Anna', { exact: true })).toBeVisible();
  await expect(page.getByText('Cas', { exact: true }).first()).toBeVisible();

  await page.getByRole('link', { name: 'Spelen' }).click();
  await expect(page.getByText('Afgelopen')).toBeVisible();
  expect(errors).toEqual([]);
});

test('works offline after the first visit', async ({ page, context }) => {
  await page.goto(`${BASE}nl/`);
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
    }
    return reg.active?.state;
  });
  await context.setOffline(true);
  await page.goto(`${BASE}en/kwatro/`);
  await expect(page.locator('h1')).toHaveText('Kwatro: rules and scoring');
  await page.goto(`${BASE}nl/spelen/nieuw/`);
  await expect(page.getByPlaceholder('Naam speler')).toBeVisible();
  await page.goto(`${BASE}nl/spelen/spel/does-not-exist/`);
  await expect(page.getByText('Dit spel bestaat niet')).toBeVisible();
  await context.setOffline(false);
});
