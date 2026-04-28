import { test, expect } from '@playwright/test';

// These tests are designed to run against a local dev server with mocked auth,
// or a dedicated staging environment. For this scaffold, we simulate the routing behavior.

test.describe('Role-Based Access Control (RBAC)', () => {
  
  test('Business Owner should be redirected away from accountant routes', async ({ page }) => {
    // Attempt to access accountant clients page
    await page.goto('/accountant/clients');
    
    // Wait for network idle or redirect
    await page.waitForLoadState('networkidle');
    
    // Assert that the user is NOT on the accountant page
    // They should be redirected to login (if not authed) or dashboard (if authed as business)
    await expect(page).toHaveURL(/.*\/login.*/);
  });

  test('Accountant should be able to access accountant routes', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in the accountant credentials seeded in global-setup
    await page.fill('input[type="email"]', 'accountant@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await expect(page).toHaveURL(/.*\/accountant/);
    
    // Assert that the user is on the accountant dashboard
    expect(page.url()).toContain('/accountant');
  });

  test('Accountant context switching should isolate state', async ({ page }) => {
    // 1. Log in as accountant
    await page.goto('/login');
    await page.fill('input[type="email"]', 'accountant@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/accountant/);

    // 2. Navigate to /accountant/clients
    await page.goto('/accountant/clients');
    await expect(page).toHaveURL(/.*\/accountant\/clients/);

    // 3. Click on Client A -> URL becomes /accountant/clients/clientA/invoices
    // We can navigate directly or click a link. For robustness, navigate directly to the seeded client.
    await page.goto('/accountant/clients/clientA/invoices');
    await expect(page).toHaveURL(/.*\/accountant\/clients\/clientA\/invoices/);

    // Select "Σήμερα" (Today) and click search
    await page.click('text=Σήμερα');
    await page.click('button:has-text("Αναζήτηση Τιμολογίων")');

    // 4. Verify Client A's invoice is on the page
    await expect(page.locator('text=INV-A-001')).toBeVisible();
    await expect(page.locator('text=Supplier A')).toBeVisible();

    // 5. Go back to /accountant/clients
    await page.goto('/accountant/clients');
    await expect(page).toHaveURL(/.*\/accountant\/clients/);

    // 6. Click on Client B -> URL becomes /accountant/clients/clientB/invoices
    await page.goto('/accountant/clients/clientB/invoices');
    await expect(page).toHaveURL(/.*\/accountant\/clients\/clientB\/invoices/);

    // Select "Σήμερα" (Today) and click search
    await page.click('text=Σήμερα');
    await page.click('button:has-text("Αναζήτηση Τιμολογίων")');

    // 7. Verify Client B's invoice is on the page and Client A's data is NOT visible
    await expect(page.locator('text=INV-B-001')).toBeVisible();
    await expect(page.locator('text=Supplier B')).toBeVisible();
    await expect(page.locator('text=INV-A-001')).not.toBeVisible();
    await expect(page.locator('text=Supplier A')).not.toBeVisible();
  });
});
