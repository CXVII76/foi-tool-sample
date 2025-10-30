import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('FOI Redaction Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('complete redaction workflow: upload → redact → approve → download', async ({ page }) => {
    // Step 1: Login as redactor
    await test.step('Login as redactor', async () => {
      await expect(page).toHaveTitle(/FOI Redaction Tool/);
      
      // Should be redirected to login page
      await expect(page.locator('h1')).toContainText('FOI Redaction Tool');
      
      // Fill login form
      await page.fill('input[type="email"]', 'redactor@foi.gov.au');
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      
      // Should be redirected to dashboard
      await expect(page.locator('.app-header')).toBeVisible();
      await expect(page.locator('.user-name')).toContainText('John Redactor');
    });

    // Step 2: Upload document
    await test.step('Upload document', async () => {
      // Upload file using file input
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test-document.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('This is a test document with sensitive information that needs redaction.')
      });

      // Wait for upload to complete
      await expect(page.locator('.document-item')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.document-item__name')).toContainText('test-document.txt');
    });

    // Step 3: Select document and create working version
    await test.step('Create working version', async () => {
      // Click on the uploaded document
      await page.click('.document-item__button');
      
      // Document should be selected
      await expect(page.locator('.document-item--active')).toBeVisible();
      
      // Create working version
      await page.click('button:has-text("Create Working Version")');
      
      // Wait for working version to be created
      await expect(page.locator('.status-badge--orange')).toBeVisible();
      await expect(page.locator('button:has-text("Current")')).toBeVisible();
    });

    // Step 4: Create redactions
    await test.step('Create redactions', async () => {
      // Select rectangle redaction tool
      await page.click('button[aria-checked="false"]:has-text("Rectangle")');
      await expect(page.locator('button[aria-checked="true"]:has-text("Rectangle")')).toBeVisible();
      
      // Select reason code
      await page.selectOption('select#reason-code-select', 'FOI s 22');
      
      // Simulate drawing a redaction (this would be more complex in a real test)
      const canvas = page.locator('.redaction-overlay');
      await expect(canvas).toBeVisible();
      
      // Draw redaction rectangle
      await canvas.click({ position: { x: 100, y: 100 } });
      await page.mouse.down();
      await page.mouse.move(200, 150);
      await page.mouse.up();
      
      // Verify redaction was created
      await expect(page.locator('.status-value:has-text("Rectangle")')).toBeVisible();
    });

    // Step 5: Switch to approver and approve
    await test.step('Approve redactions', async () => {
      // Logout current user
      await page.click('.user-menu-trigger');
      await page.click('button:has-text("Sign Out")');
      
      // Login as approver
      await page.fill('input[type="email"]', 'approver@foi.gov.au');
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      
      // Should be logged in as approver
      await expect(page.locator('.user-name')).toContainText('Sarah Approver');
      
      // Select the document
      await page.click('.document-item__button');
      
      // Finalize document
      await page.click('button:has-text("Finalize Document")');
      
      // Confirm finalization
      await page.click('button:has-text("Yes")');
      
      // Wait for finalization to complete
      await expect(page.locator('.status-badge--green')).toBeVisible();
      await expect(page.locator('button:has-text("Download")')).toBeVisible();
    });

    // Step 6: Download final document
    await test.step('Download final document', async () => {
      // Start download
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Download")');
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/test-document.*_final\.txt/);
      
      // Save download for verification
      const downloadPath = path.join(__dirname, 'downloads', download.suggestedFilename());
      await download.saveAs(downloadPath);
    });
  });

  test('accessibility: keyboard navigation and screen reader support', async ({ page }) => {
    // Login first
    await page.fill('input[type="email"]', 'viewer@foi.gov.au');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    await test.step('Keyboard navigation', async () => {
      // Test tab navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAttribute('aria-label', /sidebar/i);
      
      // Test skip links
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveText(/skip to main content/i);
      
      // Use skip link
      await page.keyboard.press('Enter');
      await expect(page.locator(':focus')).toHaveAttribute('id', 'main-content');
    });

    await test.step('ARIA labels and roles', async () => {
      // Check main landmarks
      await expect(page.locator('header[role="banner"]')).toBeVisible();
      await expect(page.locator('main[role="main"]')).toBeVisible();
      await expect(page.locator('aside[role="complementary"]')).toBeVisible();
      
      // Check form labels
      await expect(page.locator('label[for="reason-code-select"]')).toBeVisible();
      
      // Check button descriptions
      await expect(page.locator('button[aria-label="Toggle sidebar"]')).toBeVisible();
      await expect(page.locator('button[aria-expanded]')).toBeVisible();
    });

    await test.step('Screen reader announcements', async () => {
      // Check for live regions
      await expect(page.locator('[role="alert"]')).toHaveCount(0); // No errors initially
      await expect(page.locator('[aria-live]')).toBeVisible();
      
      // Check status announcements
      await expect(page.locator('[role="status"]')).toHaveCount(0); // No loading initially
    });
  });

  test('security: panic clear functionality', async ({ page }) => {
    // Login and upload a document
    await page.fill('input[type="email"]', 'redactor@foi.gov.au');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Upload test document
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'sensitive-document.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Highly sensitive government information.')
    });
    
    await expect(page.locator('.document-item')).toBeVisible();
    
    await test.step('Panic clear removes all data', async () => {
      // Open user menu
      await page.click('.user-menu-trigger');
      
      // Click panic clear
      await page.click('button:has-text("Panic Clear")');
      
      // Confirm panic clear
      await expect(page.locator('.panic-confirm')).toBeVisible();
      await page.click('button:has-text("Yes, Clear All Data")');
      
      // Should be redirected to login
      await expect(page.locator('h1:has-text("FOI Redaction Tool")')).toBeVisible();
      await expect(page.url()).toContain('/login');
    });
  });

  test('responsive design: mobile and tablet viewports', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.fill('input[type="email"]', 'viewer@foi.gov.au');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    await test.step('Mobile layout', async () => {
      // Sidebar should be closed by default on mobile
      await expect(page.locator('.app-sidebar--closed')).toBeVisible();
      
      // Header should be responsive
      await expect(page.locator('.header-center')).toBeHidden();
      await expect(page.locator('.user-info')).toBeHidden();
      
      // Sidebar toggle should work
      await page.click('.sidebar-toggle');
      await expect(page.locator('.app-sidebar--open')).toBeVisible();
    });
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await test.step('Tablet layout', async () => {
      // Should have more space for content
      await expect(page.locator('.main-content')).toBeVisible();
      await expect(page.locator('.sidebar-content')).toBeVisible();
    });
  });

  test('error handling: network failures and invalid files', async ({ page }) => {
    await page.fill('input[type="email"]', 'redactor@foi.gov.au');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    await test.step('Invalid file upload', async () => {
      // Try to upload invalid file type
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'image.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake image data')
      });
      
      // Should show error message
      await expect(page.locator('.file-upload__error')).toBeVisible();
      await expect(page.locator('[role="alert"]')).toContainText(/file type not supported/i);
    });
    
    await test.step('File too large', async () => {
      // Try to upload file that's too large
      const largeBuffer = Buffer.alloc(60 * 1024 * 1024); // 60MB
      await fileInput.setInputFiles({
        name: 'large-file.txt',
        mimeType: 'text/plain',
        buffer: largeBuffer
      });
      
      // Should show size error
      await expect(page.locator('.file-upload__rejections')).toBeVisible();
      await expect(page.locator('[role="alert"]')).toContainText(/file is too large/i);
    });
  });
});