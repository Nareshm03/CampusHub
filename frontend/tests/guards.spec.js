// Hermetic frontend smoke tests: auth guards, login validation, render safety.
// Backend-independent by design (no API dependency); API contracts are
// covered by the backend suite + route-contract audit.
import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';

test('unauthenticated dashboard visits redirect to login', async ({ page }) => {
  for (const url of ['/dashboard/student', '/dashboard/admin', '/dashboard/faculty']) {
    await page.goto(`${BASE}${url}`);
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  }
});

test('login rejects empty submit without navigating away', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1000);
  await expect(page).toHaveURL(/\/login/);
  expect(errors).toEqual([]);
});

test('login and register pages render without runtime errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.goto(`${BASE}/login`);
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await page.goto(`${BASE}/register`);
  await expect(page.locator('form')).toBeVisible();
  expect(errors).toEqual([]);
});
