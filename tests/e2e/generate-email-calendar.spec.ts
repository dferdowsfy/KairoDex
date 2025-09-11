import { test, expect } from '@playwright/test'

/**
 * Assumptions / Setup:
 * - Dev server must be running at http://localhost:3000 before executing this test.
 * - A client is already selectable / default client auto-selected when visiting the Snapshot page.
 * - The UI exposes stable data-testid attributes (added in Snapshot component) for interaction.
 * - Email generation endpoint is accessible and returns a draft quickly.
 */

test.describe('Generate Email + Calendar Date Selection', () => {
  test('select date, generate email, schedule it', async ({ page }) => {
    // Navigate to root (assumes Snapshot visible there; adjust path if different)
    await page.goto('http://localhost:3000/')

    // Open the generate email modal
    await page.getByTestId('open-generate-email').click()

    // Ensure modal content appears (Schedule section / Selected date indicator)
    const calendarGrid = page.getByTestId('calendar-grid')
    await expect(calendarGrid).toBeVisible()

    // Capture a target date button (choose today+2 days if available in current month)
    const today = new Date()
    const target = new Date(today)
    target.setDate(today.getDate() + 2)
    const yyyy = target.getFullYear()
    const mm = String(target.getMonth() + 1).padStart(2, '0')
    const dd = String(target.getDate()).padStart(2, '0')
    const iso = `${yyyy}-${mm}-${dd}`

    const dateBtn = page.getByTestId(`calendar-day-${iso}`)
    if (await dateBtn.count() === 0) {
      test.skip(true, `Target date button ${iso} not found in current rendered month`)
    }

    // Click date and assert aria-pressed toggled
    await dateBtn.click()
    await expect(dateBtn).toHaveAttribute('aria-pressed', 'true')

    // Trigger draft generation (button text 'Generate')
    const generateBtn = page.getByRole('button', { name: /generate/i, exact: false }).first()
    await generateBtn.click()

    // Wait for draft area to populate (text should change from placeholder)
    const draftArea = page.locator('div').filter({ hasText: 'Your AI‑generated draft will appear here.' })
    await expect(draftArea).not.toBeVisible({ timeout: 15000 })

    // Ensure schedule button becomes enabled after draft + selected date
    const scheduleBtn = page.getByTestId('schedule-email')
    await expect(scheduleBtn).toBeEnabled()

    // Click schedule
    await scheduleBtn.click()

    // Expect toast / success indicator (simplest: look for text)
    const successToast = page.locator('text=Email scheduled successfully')
    await expect(successToast).toBeVisible({ timeout: 10000 })
  })
})
