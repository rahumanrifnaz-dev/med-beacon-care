// @ts-ignore: dev dependency types may not be installed in this environment
import { test, expect } from '@playwright/test';

test('visit root and shows app', async ({ page }: { page: any }) => {
  await page.goto('http://localhost:5173');
  await expect(page).toHaveTitle(/MediCare|Medi/);
});
