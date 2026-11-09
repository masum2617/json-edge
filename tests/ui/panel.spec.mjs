import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {
  prepareInput,
  fillDummyValues,
} = require('../../dist/src/core/prepare');
const { analyzeJson } = require('../../dist/src/core/analyze');
const { GenerationSession } = require('../../dist/src/core/session');
const { parseClientMessage } = require('../../dist/src/protocol');

// Test the real UI and engine together; only the VS Code transport is substituted.
test.beforeEach(async ({ page }) => {
  const session = new GenerationSession();
  await page.exposeFunction('sendToHost', async (raw) => {
    let reply;
    try {
      const m = parseClientMessage(raw);
      if (m.type === 'analyze') {
        await page.evaluate(() => {
          window.analysisStarted = true;
        });
        await page.waitForFunction(() => !window.pauseAnalysis);
      }
      switch (m.type) {
        case 'ready':
        case 'loadEditor':
          {
            const text =
              m.type === 'loadEditor'
                ? await page.evaluate(() => window.editorText ?? '')
                : '';
            const prepared = text ? prepareInput(text) : { text };
            reply = { type: 'source', revision: m.revision, ...prepared };
          }
          break;
        case 'format':
        case 'dummy':
          await page.waitForFunction(() => !window.pausePreparation);
          session.invalidate(m.revision);
          reply = {
            type: 'source',
            revision: m.revision,
            ...(m.type === 'dummy'
              ? fillDummyValues(m.text)
              : prepareInput(m.text)),
          };
          break;
        case 'invalidate':
          session.invalidate(m.revision);
          break;
        case 'analyze':
          reply = {
            type: 'fields',
            revision: m.revision,
            fields: analyzeJson(m.text).fields,
          };
          break;
        case 'generate':
          reply = {
            type: 'results',
            revision: m.revision,
            ...session.generate(m.revision, m.text, m.fields, m.mutations),
          };
          break;
        case 'copy':
          session.selected(m.revision, m.ids);
          reply = { type: 'notice', message: 'JSON copied to clipboard.' };
          break;
        case 'export':
          session.selected(m.revision, m.ids);
          reply = {
            type: 'notice',
            message: 'Export cancelled. No files written.',
          };
          break;
      }
    } catch (error) {
      reply = { type: 'error', revision: raw.revision, message: error.message };
    }
    if (reply)
      await page.evaluate(
        (message) =>
          window.dispatchEvent(new MessageEvent('message', { data: message })),
        reply,
      );
  });
  await page.addInitScript(() => {
    window.acquireVsCodeApi = () => ({
      postMessage: (m) => {
        void window.sendToHost(m);
      },
    });
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Paste a JSON object');
});

async function makeCases(page) {
  await page.getByRole('button', { name: 'Try sample JSON' }).click();
  await page.getByRole('checkbox', { name: '/email', exact: true }).check();
  await page.getByRole('button', { name: 'Generate edge cases' }).click();
  await expect(page.getByText('4 cases', { exact: true })).toBeVisible();
}

test('generates previews, copies, cancels export, and invalidates changed input/options', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await makeCases(page);
  await page
    .getByRole('button', { name: '/email — Null value', exact: true })
    .click();
  await expect(page.getByLabel('Generated JSON preview')).toContainText(
    '"email": null',
  );
  await page.getByRole('button', { name: 'Copy JSON' }).click();
  await expect(page.getByRole('status')).toHaveText(
    'JSON copied to clipboard.',
  );
  await page.getByRole('button', { name: 'Export selected' }).click();
  await expect(page.getByRole('status')).toContainText('Export cancelled');
  await page
    .getByRole('checkbox', { name: 'Missing field', exact: false })
    .first()
    .uncheck();
  await expect(page.getByRole('button', { name: 'Copy JSON' })).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Export selected' }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Generate edge cases' }).click();
  await expect(page.getByText('3 cases', { exact: true })).toBeVisible();
  await page
    .getByLabel('Example JSON', { exact: true })
    .fill('{"email":"updated@example.com"}');
  await expect(page.getByRole('button', { name: 'Copy JSON' })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('shows strict errors, searches fields, and never interprets HTML keys', async ({
  page,
}) => {
  await page.getByLabel('Example JSON', { exact: true }).fill('{"a":1,"a":2}');
  await expect(page.getByRole('alert')).toContainText('Duplicate property');
  await page
    .getByLabel('Example JSON', { exact: true })
    .fill('{"<img src=x onerror=alert(1)>":"ok","nested":{"a/b":1}}');
  await expect(
    page.getByRole('checkbox', {
      name: '/<img src=x onerror=alert(1)>',
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.locator('img').count()).toBe(0);
  await page
    .getByRole('searchbox', { name: 'Search field paths' })
    .fill('nested');
  await expect(
    page.getByRole('checkbox', { name: '/nested/a~1b', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('checkbox', {
      name: '/<img src=x onerror=alert(1)>',
      exact: true,
    }),
  ).toHaveCount(0);
});

for (const theme of ['dark', 'light', 'high contrast']) {
  test(`keyboard, accessibility and responsive layout in ${theme} theme`, async ({
    page,
  }) => {
    await page.evaluate((theme) => {
      const light = theme === 'light';
      const colors = {
        '--vscode-editor-background': light ? '#ffffff' : '#1f1f1f',
        '--vscode-foreground': light ? '#202020' : '#cccccc',
        '--vscode-descriptionForeground': light ? '#595959' : '#aaaaaa',
        '--vscode-panel-border': light ? '#cccccc' : '#454545',
        '--vscode-input-background': light ? '#ffffff' : '#313131',
        '--vscode-input-foreground': light ? '#202020' : '#eeeeee',
        '--vscode-input-placeholderForeground': light ? '#666666' : '#aaaaaa',
        '--vscode-button-background': '#0067b8',
        '--vscode-button-foreground': '#ffffff',
        '--vscode-button-secondaryBackground': light ? '#e5e5e5' : '#3b3b3b',
        '--vscode-button-secondaryForeground': light ? '#202020' : '#ffffff',
        '--vscode-textLink-foreground': light ? '#005fb8' : '#67b8ff',
        '--vscode-errorForeground': light ? '#b52020' : '#ff9999',
        '--vscode-textCodeBlock-background': light ? '#f4f4f4' : '#181818',
        '--vscode-focusBorder': '#0078d4',
      };
      for (const [key, value] of Object.entries(colors))
        document.documentElement.style.setProperty(key, value);
      document.documentElement.style.colorScheme = theme;
    }, theme);
    if (theme === 'high contrast') {
      await page.emulateMedia({ forcedColors: 'active' });
    }
    await makeCases(page);
    const issues = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(issues.violations).toEqual([]);
    await page.getByRole('button', { name: 'Copy JSON' }).focus();
    await expect(page.getByRole('button', { name: 'Copy JSON' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status')).toHaveText(
      'JSON copied to clipboard.',
    );
    await page.setViewportSize({ width: 400, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole('button', { name: 'Export selected' }),
    ).toBeVisible();
  });
}

test('variation changes during pending analysis recover the field list', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.pauseAnalysis = true;
    window.analysisStarted = false;
  });
  await page
    .getByLabel('Example JSON', { exact: true })
    .fill('{"email":"example@example.test"}');
  await page.waitForFunction(() => window.analysisStarted);
  await page.getByRole('checkbox', { name: 'Missing field' }).uncheck();
  await page.evaluate(() => {
    window.pauseAnalysis = false;
  });
  await page.getByRole('checkbox', { name: '/email', exact: true }).check();
  await expect(
    page.getByRole('button', { name: 'Generate edge cases' }),
  ).toBeEnabled();
});

test('loads both reported editor snippets as strict formatted JSON', async ({
  page,
}) => {
  const input = page.getByLabel('Example JSON', { exact: true });
  await page.evaluate(() => {
    window.editorText =
      '{batchNumber:"",openingQty:"",salesPrice:"",purchasePrice:"",}';
  });
  await page.getByRole('button', { name: 'Load from Active Editor' }).click();
  await expect(input).toHaveValue(
    JSON.stringify(
      { batchNumber: '', openingQty: '', salesPrice: '', purchasePrice: '' },
      null,
      2,
    ),
  );
  await page
    .getByRole('checkbox', { name: '/batchNumber', exact: true })
    .check();
  await expect(page.locator('#input-error')).toBeEmpty();
  await page.evaluate(() => {
    window.editorText =
      'supplierId, supplierName: supplier?.supplierName, warehouseId, warehouseName: warehouse?.name,';
  });
  await page.getByRole('button', { name: 'Load from Active Editor' }).click();
  await expect(input).toHaveValue(
    JSON.stringify(
      { supplierId: '', supplierName: '', warehouseId: '', warehouseName: '' },
      null,
      2,
    ),
  );
  await expect(page.locator('#input-note')).toContainText(
    '4 runtime expressions',
  );
  await page
    .getByRole('checkbox', { name: '/supplierName', exact: true })
    .check();
  await page.getByRole('button', { name: 'Fill dummy values' }).click();
  await expect(input).toHaveValue(
    JSON.stringify(
      {
        supplierId: 1,
        supplierName: 'Example Supplier',
        warehouseId: 1,
        warehouseName: 'Main Warehouse',
      },
      null,
      2,
    ),
  );
  await expect(page.locator('#input-note')).toContainText(
    'Review the values and types',
  );
});

test('formats pasted snippets, invalidates results, and reports unsupported property keys', async ({
  page,
}) => {
  const input = page.getByLabel('Example JSON', { exact: true });
  await makeCases(page);
  await page.getByRole('button', { name: 'Format JSON', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Copy JSON' })).toBeDisabled();
  await input.fill('supplierId, supplierName: supplier?.supplierName,');
  await page.getByRole('button', { name: 'Format JSON', exact: true }).click();
  await expect(input).toHaveValue(
    '{\n  "supplierId": "",\n  "supplierName": ""\n}',
  );
  await input.fill('{ [runtimeKey]: 1 }');
  await page.getByRole('button', { name: 'Format JSON', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(
    'Computed property names',
  );
  await expect(input).toHaveValue('{ [runtimeKey]: 1 }');
});

test('Enter indents nested properties, preserves caret, and Tab can leave the input', async ({
  page,
}) => {
  const input = page.getByLabel('Example JSON', { exact: true });
  await input.fill('{}');
  await input.evaluate((el) => {
    el.focus();
    el.setSelectionRange(1, 1);
  });
  await input.press('Enter');
  await expect(input).toHaveValue('{\n  \n}');
  await input.pressSequentially('"address": {');
  await input.press('Enter');
  await input.pressSequentially('"city": "Dhaka"');
  await expect(input).toHaveValue('{\n  "address": {\n    "city": "Dhaka"\n}');
  await input.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Format JSON', exact: true }),
  ).toBeFocused();
});

test('typing while preparation is pending cannot be overwritten by the old response', async ({
  page,
}) => {
  const input = page.getByLabel('Example JSON', { exact: true });
  await input.fill('{ name: "old" }');
  await page.evaluate(() => {
    window.pausePreparation = true;
  });
  await page.getByRole('button', { name: 'Format JSON', exact: true }).click();
  await input.fill('{"name":"new"}');
  await page.evaluate(() => {
    window.pausePreparation = false;
  });
  await page.getByRole('checkbox', { name: '/name', exact: true }).check();
  await expect(input).toHaveValue('{"name":"new"}');
  await expect(
    page.getByRole('button', { name: 'Format JSON', exact: true }),
  ).toBeEnabled();
});
