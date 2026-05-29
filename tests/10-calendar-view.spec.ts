import { test, expect, BASE_URL } from './fixtures';

test.describe('Feature 10 - Calendar View', () => {
  test('renders month view with holidays and day modal for due todos', async ({
    authedRequest,
    browser,
    sessionToken,
  }) => {
    const dueDate = '2026-08-12T10:00:00+08:00';

    const createdTodo = await authedRequest.post('/api/todos', {
      data: {
        title: 'Calendar smoke todo',
        due_date: dueDate,
      },
    });

    expect(createdTodo.status()).toBe(201);

    const holidaysResponse = await authedRequest.get('/api/holidays');
    expect(holidaysResponse.status()).toBe(200);

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'todo_session',
        value: sessionToken,
        url: BASE_URL,
      },
    ]);

    const page = await context.newPage();
    await page.goto('/calendar?month=2026-08');

    await expect(page.getByText('Month key in URL: 2026-08')).toBeVisible();
    await expect(page.getByText('National Day')).toBeVisible();
    await expect(page.getByText('Calendar smoke todo')).toBeVisible();

    const dayButton = page.locator('button', { hasText: 'Calendar smoke todo' }).first();
    await dayButton.click();

    await expect(page.getByText('Todos on 2026-08-12')).toBeVisible();
    await expect(page.locator('.modal').getByText('Calendar smoke todo', { exact: true })).toBeVisible();

    await context.close();
  });
});
