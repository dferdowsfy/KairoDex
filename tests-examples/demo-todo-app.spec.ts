import { test, expect } from '@playwright/test';

test('add todo item', async ({ page }) => {
    await page.goto('http://localhost:3000'); // Replace with your app's URL
    await page.fill('input[name="todo"]', 'New Todo Item');
    await page.click('button[type="submit"]');
    const todoItem = await page.locator('text=New Todo Item');
    await expect(todoItem).toBeVisible();
});

test('complete todo item', async ({ page }) => {
    await page.goto('http://localhost:3000'); // Replace with your app's URL
    await page.check('input[type="checkbox"]'); // Adjust selector as needed
    const completedItem = await page.locator('text=New Todo Item');
    await expect(completedItem).toHaveClass(/completed/);
});

test('delete todo item', async ({ page }) => {
    await page.goto('http://localhost:3000'); // Replace with your app's URL
    await page.click('button.delete'); // Adjust selector as needed
    const todoItem = await page.locator('text=New Todo Item');
    await expect(todoItem).not.toBeVisible();
});