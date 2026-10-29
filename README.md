# Browser Extensions

Two small personal browser extensions for removing unwanted recommendation sections from Facebook and YouTube. Facebook's **Suggested for you** posts and YouTube's **Shorts shelves** are the specific targets.

The original description calls these “quick things made for personal use.” The implementation follows that scope: inspect the page already displayed in the browser, remove matching elements, and repeat as more content arrives. There is no service, account system, build pipeline, or filtering backend. The useful idea is being able to change what appears in a personal feed with a few direct DOM operations.

## What each extension does

| Extension | Entry point | Removal rule |
| --- | --- | --- |
| Facebook | [`FBSudgestedRemove/contentScript.jsx`](FBSudgestedRemove/contentScript.jsx) | Find matching English text in spans, walk up to a `div.x1lliihq` ancestor, and remove that ancestor. |
| YouTube | [`YTShortsRemover/contentScript.js`](YTShortsRemover/contentScript.js) | Remove every `ytd-rich-section-renderer` and `ytd-reel-shelf-renderer` element. |

The Facebook script makes two passes: one for spans containing `Suggested for you`, then one for spans containing `Follow`. The ancestor walk is how it attempts to remove the surrounding feed item instead of only its label. The `.jsx` file contains ordinary JavaScript; there is no React or JSX syntax to compile.

The YouTube script uses element names instead of visible text. Its two selectors are intended to catch Shorts-related shelves, but the code does not inspect a section's contents to establish that it contains Shorts. It also does not block a Shorts URL or disable video playback.

Both scripts run once when injected and then attach a `MutationObserver` to `document.body`, watching child-list changes throughout the subtree. This matters because feed content keeps arriving after the initial page load. Each callback rescans the document; neither script limits its search to the newly added nodes.

The [YouTube popup](YTShortsRemover/popup.html) is only an explanatory message. It contains no settings, toggle, or filtering logic. The content scripts themselves make no network requests and store no data; their effect is removing elements from the current page and logging to the browser console.

## Why this approach, and its boundaries

The code treats feed cleanup as a local presentation problem. It does not try to alter a recommendation algorithm or fetch a different feed. A content script can act directly on the elements the site has rendered, and the observer keeps the same rule active during dynamic loading. This explains the project's small size and lack of application infrastructure.

That simplicity depends on specific page structures. Facebook's English labels and generated CSS class are part of the rule. `Follow` is broader than a recommendation label, and YouTube's selectors remove whole renderer types without checking their purpose. Those choices can remove unintended content or stop matching after a site change. Current live-site behavior has not been verified, so the names of the extensions describe their intended targets, not a guarantee about every page they remove.

## Repository and packaging

Each directory contains a manifest and its script. YouTube also contains the popup. The two ZIPs are packaged copies of those files:

- [`FBSudgestedRemove/FBRemover.zip`](FBSudgestedRemove/FBRemover.zip)
- [`YTShortsRemover/YTShortsRemove.zip`](YTShortsRemover/YTShortsRemove.zip)

The archived files were inspected and are byte-for-byte identical to their corresponding source files. The ZIPs do not contain a separate, newer implementation.

**The Facebook package needs a filename correction before loading.** Its [manifest](FBSudgestedRemove/manifest.json) requests `contentScript.js`, but the directory and ZIP both contain `contentScript.jsx`. The manifest and actual filename must agree. This README documents the mismatch; the files have not been repaired.

Facebook declares Manifest V3. The [YouTube manifest](YTShortsRemover/manifest.json) declares Manifest V2 and includes an `action` entry for the popup. Compatibility must be checked against the chosen browser and version; neither package has a recorded current-browser validation here. Both manifests target the `www` host of their respective site and request `activeTab`.

## Loading a development copy

No npm packages, bundler, or compilation step are required.

1. Choose the browser/version that will be supported and use a separate browser profile for checking behavior.
2. Resolve the Facebook manifest/script filename mismatch in the development copy. Check the YouTube manifest fields against that browser's supported extension format.
3. Use the browser's extension-development controls to load the individual extension directory. The repository root contains two independent extensions and is not itself an extension package.
4. Inspect any loading errors, then visit the matching `www.facebook.com` or `www.youtube.com` page. Check the initial feed and newly loaded content while scrolling.
5. Check ordinary posts and videos as well as the sections intended for removal. A console message that something was removed does not establish that the correct content was removed.

Extracting the committed Facebook ZIP does not bypass its filename mismatch. Installing an extension and exercising either live site were not part of the source review behind this README.

## Where development stopped

The two original February 2024 commits uploaded the utilities and added the short personal-use description. There is no later implementation history in this checkout. The core removal routines and dynamic-page observers exist; packaging consistency and a documented browser/site check are the remaining practical requirements for calling these finished personal tools.

## Definition of done

Closure can be a working pair of small extensions for one documented browser/version. It does not require an extension-store release, settings system, or support for every browser.

- [ ] Both extensions load without manifest or missing-file errors in that chosen browser; the Facebook filename mismatch and YouTube manifest compatibility are resolved.
- [ ] On representative pages, the intended Facebook recommendations and YouTube Shorts shelves disappear while ordinary posts, videos, and follow controls that should remain are preserved. Record the cases checked.
- [ ] The same behavior holds after scrolling and in-site navigation, without repeated visible disruption or runaway observer activity.
- [ ] Rebuild the ZIPs from the verified source and confirm that loading their extracted contents reproduces the same behavior. Record the browser/version, verification date, and any known page or language limits.
