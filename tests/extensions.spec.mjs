import { test, expect, chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
// Managed browsers may forbid installation. This opt-in mode checks only the
// scripts' DOM behavior; the default and CI always exercise real extensions.
const contentOnly = process.env.CONTENT_SCRIPT_ONLY === '1';
const packages = [
  ['FBSudgestedRemove', 'FBRemover.zip'],
  ['YTShortsRemover', 'YTShortsRemove.zip'],
];
const facebook = `
  <div class="x1lliihq" id="suggested"><div><span>Suggested for you</span></div></div>
  <div class="x1lliihq" id="follow"><span>Follow</span></div>
  <div class="x1lliihq" id="ordinary-post"><span>A friend's post</span></div>
  <div id="outside-post"><span>Suggested for you</span><span>Follow</span></div>`;
const youtube = `
  <ytd-rich-section-renderer id="rich-shelf">Shelf</ytd-rich-section-renderer>
  <ytd-reel-shelf-renderer id="reel-shelf">Shorts</ytd-reel-shelf-renderer>
  <ytd-rich-item-renderer id="ordinary-video">Video</ytd-rich-item-renderer>
  <a id="shorts-link" href="/shorts/example">Shorts link</a>`;
const fixture = `<!doctype html><html><body>${facebook}${youtube}</body></html>`;

for (const mode of ['source', 'ZIP']) {
  test.describe(mode, () => {
    let context;
    let temporary;
    let extensions;

    test.beforeAll(async () => {
      temporary = await mkdtemp(join(tmpdir(), 'browser-extensions-'));
      extensions = packages.map(([folder, archive]) => {
        if (mode === 'source') return join(root, folder);
        const destination = join(temporary, folder);
        execFileSync('python3', ['-m', 'zipfile', '-e', join(root, folder, archive), destination]);
        return destination;
      });
      context = await chromium.launchPersistentContext(join(temporary, 'profile'), {
        channel: 'chromium',
        executablePath: process.env.CHROMIUM_PATH || undefined,
        headless: true,
        args: contentOnly ? [] : [
          `--disable-extensions-except=${extensions.join(',')}`,
          `--load-extension=${extensions.join(',')}`,
        ],
      });
      console.log(`${mode}: Chromium ${context.browser().version()} (${contentOnly ? 'content scripts only' : 'installed extensions'})`);
      // Serve synthetic pages before the network stack; never contact either site.
      await context.route(/^https?:\/\//, route => route.fulfill({
        contentType: 'text/html', body: fixture,
      }));
    });

    test.afterAll(async () => {
      try {
        await context?.close();
      } finally {
        if (temporary) await rm(temporary, { recursive: true, force: true });
      }
    });

    for (const site of ['facebook', 'youtube']) {
      test(`${site}: initial load, inserted content, navigation, and site isolation`, async () => {
        const page = await context.newPage();
        const errors = [];
        let scriptURL;
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => {
          if (message.location().url.startsWith('chrome-extension://')) {
            scriptURL = message.location().url;
          }
        });
        try {
          await page.goto(`https://www.${site}.com/`);
          if (contentOnly) {
            const directory = extensions[site === 'facebook' ? 0 : 1];
            await page.addScriptTag({ path: join(directory, 'contentScript.js') });
          }
          const removed = site === 'facebook' ? '#suggested, #follow' : '#rich-shelf, #reel-shelf';
          const otherSite = site === 'facebook' ? '#rich-shelf, #reel-shelf' : '#suggested, #follow';
          await expect(page.locator(removed)).toHaveCount(0);
          await expect(page.locator(otherSite)).toHaveCount(2);
          await expect(page.locator('#ordinary-post, #outside-post, #ordinary-video, #shorts-link')).toHaveCount(4);

          const added = site === 'facebook'
            ? '<div id="added" class="x1lliihq"><span>Suggested for you</span></div>'
            : '<ytd-reel-shelf-renderer id="added">New shelf</ytd-reel-shelf-renderer>';
          await page.evaluate(html => document.body.insertAdjacentHTML('beforeend', html), added);
          await expect(page.locator('#added')).toHaveCount(0);

          await page.evaluate(html => {
            history.pushState({}, '', '/fixture-navigation');
            document.body.innerHTML = html;
          }, facebook + youtube);
          await expect(page.locator(removed)).toHaveCount(0);
          await expect(page.locator(otherSite)).toHaveCount(2);
          await expect(page.locator('#ordinary-post, #outside-post, #ordinary-video, #shorts-link')).toHaveCount(4);

          if (site === 'youtube') {
            if (contentOnly) {
              await page.setContent(await readFile(join(extensions[1], 'popup.html'), 'utf8'));
            } else {
              expect(scriptURL).toMatch(/^chrome-extension:\/\//);
              await page.goto(new URL('popup.html', scriptURL).href);
            }
            await expect(page).toHaveTitle('YouTube Shorts Remover');
            await expect(page.locator('p')).toHaveText('Removes Shorts shelves from YouTube as the page loads and updates.');
          }
          expect(errors).toEqual([]);
        } finally {
          await page.close();
        }
      });
    }

    test('scripts do not run on bare, mobile, or unrelated hosts', async () => {
      test.skip(contentOnly, 'Host matching requires actual extension installation.');
      const page = await context.newPage();
      try {
        for (const host of ['facebook.com', 'm.facebook.com', 'youtube.com', 'm.youtube.com', 'example.invalid']) {
          await page.goto(`https://${host}/`, { waitUntil: 'networkidle' });
          await expect(page.locator('#suggested, #follow, #rich-shelf, #reel-shelf')).toHaveCount(4);
        }
      } finally {
        await page.close();
      }
    });
  });
}
