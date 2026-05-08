import { test, expect } from '@playwright/test';

test('login page loads completely', async ({ page }) => {
  await page.goto('/login');
  
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/CampusHub/);

  // Expect the login form to be visible by finding the Email input
  const emailInput = page.locator('input[type="email"]');
  await expect(emailInput).toBeVisible();

  const passwordInput = page.locator('input[type="password"]');
  await expect(passwordInput).toBeVisible();

  // Expect Login button to be present
  const submitButton = page.locator('button[type="submit"]');
  await expect(submitButton).toBeVisible();
});
