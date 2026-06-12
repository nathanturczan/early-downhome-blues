// E2E regression tests for the P0 fixes
// Run with: npm run test:e2e
import { test, expect } from '@playwright/test';

// Collect uncaught exceptions / unhandled rejections and console errors
function trackErrors(page) {
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', err => pageErrors.push(String(err)));
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    return { pageErrors, consoleErrors };
}

// Ignore network/resource failures (CDN samples, fonts) - we only care about JS bugs
function jsErrorsOnly(errors) {
    return errors.filter(e =>
        !/ERR_|Failed to load|404|favicon|net::|CORS|fetch/i.test(e)
    );
}

function scoreNoteCount(page) {
    return page.evaluate(() =>
        document.querySelectorAll('#inline-score-canvas svg .vf-stavenote').length
    );
}

test('loads without uncaught errors (initEnsemble guard)', async ({ page }) => {
    const { pageErrors, consoleErrors } = trackErrors(page);
    await page.goto('/');
    // Give module init (incl. async initEnsemble) time to settle
    await page.waitForTimeout(1500);

    expect(jsErrorsOnly(pageErrors)).toEqual([]);
    expect(jsErrorsOnly(consoleErrors)).toEqual([]);
    await expect(page.locator('#currentNote')).toBeVisible();
});

test('typing in a text input does not trigger notes or chords', async ({ page }) => {
    const { pageErrors } = trackErrors(page);
    await page.goto('/');

    // Inject a text input (the ensemble modal inputs are hidden; this tests the same guard)
    await page.evaluate(() => {
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'pw-test-input';
        document.body.appendChild(input);
    });

    const input = page.locator('#pw-test-input');
    await input.focus();
    await page.keyboard.type('take 145 me home');

    // If the guard failed, Space would have been swallowed (preventDefault)
    // and digits would have started chords / Space added melody notes
    await expect(input).toHaveValue('take 145 me home');
    expect(await page.locator('.history-note').count()).toBe(0);
    expect(await page.locator('.chord-btn.active').count()).toBe(0);

    // Controls still work once focus leaves the input
    await page.evaluate(() => document.getElementById('pw-test-input').remove());
    await page.keyboard.press('Space');
    await expect(page.locator('.history-note')).toHaveCount(1, { timeout: 30000 });

    expect(jsErrorsOnly(pageErrors)).toEqual([]);
});

test('history rewind keeps score in sync (fullHistoryIndex)', async ({ page }) => {
    const { pageErrors } = trackErrors(page);
    await page.goto('/');

    // Play 8 notes (first press also initializes audio - allow time)
    await page.keyboard.press('Space');
    await expect(page.locator('.history-note')).toHaveCount(1, { timeout: 30000 });
    for (let i = 0; i < 7; i++) {
        await page.keyboard.press('Space');
    }
    await expect(page.locator('.history-note')).toHaveCount(8);
    expect(await scoreNoteCount(page)).toBe(8);

    // Rewind to the 4th note
    await page.locator('.history-note').nth(3).click();

    await expect(page.locator('.history-note')).toHaveCount(4);
    expect(await scoreNoteCount(page)).toBe(4);

    // Continue playing after rewind - score grows from the rewound point
    await page.keyboard.press('Space');
    await expect(page.locator('.history-note')).toHaveCount(5);
    expect(await scoreNoteCount(page)).toBe(5);

    expect(jsErrorsOnly(pageErrors)).toEqual([]);
});

test('rapid stepping across stanza boundaries stays consistent', async ({ page }) => {
    test.setTimeout(120000);
    const { pageErrors } = trackErrors(page);
    const consoleLogs = [];
    page.on('console', msg => consoleLogs.push(msg.text()));

    await page.goto('/');

    // Stanzas only complete with phrasing enabled (off by default)
    await page.locator('#phrasingToggle').check();

    // First press initializes audio
    await page.keyboard.press('Space');
    await expect(page.locator('.history-note')).toHaveCount(1, { timeout: 30000 });

    // Hammer through stanzas with no delay between steps until at least one
    // stanza completes (completion is probabilistic - phrases end at sinks/closure)
    let presses = 1;
    const maxPresses = 600;
    while (presses < maxPresses &&
           !consoleLogs.some(m => m.includes('New stanza started'))) {
        await page.keyboard.press('Space');
        presses++;
    }

    // At least one stanza should have completed
    expect(consoleLogs.some(m => m.includes('New stanza started'))).toBe(true);

    // Keep stepping past the boundary - this is where the old delayed buffer
    // reset raced with the next stanza's first notes
    for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Space');
        presses++;
    }

    // Every press produced exactly one score note
    expect(await scoreNoteCount(page)).toBe(presses);

    // Stanza tree rendered without errors
    expect(await page.locator('#stanzaIndicator svg').count()).toBeGreaterThan(0);

    expect(jsErrorsOnly(pageErrors)).toEqual([]);
});
