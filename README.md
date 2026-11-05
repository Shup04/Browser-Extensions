# Browser Extensions

Two small personal utilities for cleaning up Facebook and YouTube feeds. Each is
an independent extension with no settings, account, backend, or build step needed
to use it.

| Extension | What it removes | Source / ZIP |
| --- | --- | --- |
| Facebook Suggested Remover | The nearest `div.x1lliihq` around a span containing `Suggested for you` or `Follow`. | [Folder](FBSudgestedRemove) / [ZIP](FBSudgestedRemove/FBRemover.zip) |
| YouTube Shorts Remover | All `ytd-rich-section-renderer` and `ytd-reel-shelf-renderer` elements. | [Folder](YTShortsRemover) / [ZIP](YTShortsRemover/YTShortsRemove.zip) |

Both run when the page loads and watch for new content with a `MutationObserver`.
The scripts make no network requests and store no data. YouTube's toolbar popup
is an explanatory message, not a toggle.

## Install for personal use

The target is desktop **Chrome/Chromium using Manifest V3**. Facebook already used
V3; YouTube now uses the same format so its `action` popup is valid. Chrome no
longer supports V2 extensions ([Chrome's support timeline](https://developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline)).
Other browser families have not been validated.

1. Download or clone the repository, or download and extract one of the ZIPs above.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Choose **Load unpacked** and select `FBSudgestedRemove`, `YTShortsRemover`, or
   the extracted ZIP folder containing `manifest.json`. Do not select the
   repository root. Load each extension separately if you want both.
4. Open or reload `www.facebook.com` or `www.youtube.com`. They run automatically
   on their matching site; disable them from `chrome://extensions` when needed.

Only the `www` hosts match. Mobile and bare-domain URLs are outside the manifest
scope. The old Facebook `.jsx` filename has been corrected to `contentScript.js`;
it is ordinary JavaScript and needs no compilation. Neither extension needs the
old `activeTab` permission: injection uses the manifest's
[static content-script declarations](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts#inject_with_static_declarations).

## Known limits

These are completed personal utilities with deliberately small filtering rules.
The original filtering scripts are unchanged by the packaging cleanup.

- Facebook depends on English text and a generated CSS class. `Follow` is a broad
  substring match and can remove an ordinary post or follow control with the same
  ancestor structure.
- YouTube removes whole renderer types without checking their contents. It can
  remove non-Shorts sections too; it does not block Shorts URLs, links, or playback.
- Site markup can change. Each observer rescans the document after child-list
  changes, so busy feeds may do unnecessary work.

## Validate and rebuild

Development checks require Node.js 22+ and Python 3.9+ available as `python3`.
Playwright is a development dependency only; the installed extensions have no
npm dependencies.

```sh
npm ci
npm run check
npx playwright install chromium
npm test
```

`npm run check` validates Manifest V3, checks that all declared scripts and the
popup exist, runs `node --check` on JavaScript, and verifies that the committed
ZIPs exactly match reproducible packages made from those files. The packaging
script includes only the manifest, declared content scripts/styles, and popup.
If future changes add icons or other assets, extend it to include them.

After changing a packaged file, run `npm run package` to rebuild both ZIPs, then
`npm test`. Commit the updated ZIPs with their sources. Rebuilding the same files
produces the same bytes, regardless of source timestamps; npm files and tests are
never included.

The browser tests load both source directories and freshly extracted ZIPs in
isolated Chromium profiles. They check initial removal, dynamically added content,
simulated in-site navigation, unaffected fixture content, host boundaries, and
the YouTube popup page. HTTP requests are answered with synthetic HTML; the tests
never visit the real sites or use an account. GitHub Actions runs these checks
for pull requests.

To use an existing Chromium executable, set `CHROMIUM_PATH` when running tests.
If a managed browser forbids extension installation, this reduced check exercises
the scripts directly and **does not validate installation or host matching**:

```sh
CONTENT_SCRIPT_ONLY=1 CHROMIUM_PATH=/usr/bin/chromium npm test
```

## Live-browser review

Automated fixtures cannot establish whether today's Facebook or YouTube markup
still matches the rules. Before relying on the extensions, check in a separate
browser profile and record the browser version and date:

- Both unpacked folders and extracted ZIPs load without extension errors, and
  the YouTube toolbar popup opens.
- Representative recommendations and Shorts shelves disappear. Check ordinary
  posts, videos, and follow controls for unintended removal.
- Scrolling and in-site navigation still work without repeated visible disruption
  or excessive observer activity.

The cloud review on 2026-11-05 used Chromium 155.0.8059.79. Its managed policy
blocks extension installation, so local browser checks use the reduced mode
above. Authenticated live-site behavior and toolbar interaction were not tested.
