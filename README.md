# plus-mail

**English** · [Русский](README.ru.md)

Give every visitor their own email address, without changing your inbox.

**979 bytes min+gzip** (1,597 bytes minified ESM). Zero runtime dependencies. ESM, CommonJS and TypeScript declarations.

```js
import { plusMail } from 'plus-mail';
const { id, stop } = plusMail(['sales@example.com']);
// sales@example.com becomes sales+<id>@example.com in text and mailto links.
```

Call after the DOM is available. A random 16-character hex ID is generated with Web Crypto and stored locally. The same browser keeps the same ID across pages. If localStorage is blocked, the ID lasts only for this module instance. Invalid stored IDs are replaced. During SSR it returns `{ id: null, stop() {} }`.

Rewrites configured base addresses case-insensitively in text nodes and mailto recipients, including multiple recipients. Mailto query strings, markup and event handlers stay intact. Handles dynamic content; skips code, form controls, editable content and already tagged addresses. Call `stop()` to disconnect the observer. Base addresses must not already contain a plus tag.

| Option | Default | Behavior |
| --- | --- | --- |
| `storageKey` | `'plus-mail'` | localStorage key for the browser ID. |
| `root` | `document.body` | Element whose text and mailto links are personalized. |

The address list is the first argument. The returned `id` is the generated or stored ID; `stop()` ends observation without undoing replacements.

## What it doesn't do

It does not send or receive email, provision inboxes, identify a person across devices, enforce consent, or send analytics. Your mail provider must support plus addressing. It does not modify email addresses inside HTML attributes other than mailto recipients, shadow roots or iframes. Clearing site storage resets the ID on the next page load.

## Development

`npm ci`, `npm test`, `npm run build`. Build prints minified ESM and gzip bytes (Node 22, level 9), without tree shaking. MIT © 2026 Daniel Raskopin. Extracted from roitrail's browser email personalization.

Part of roitrail → https://github.com/web-frank/roitrail

## Live demo

Open [`demo/index.html`](demo/index.html) directly in your browser. The standalone file includes the library and works offline, without a server or build. `npm run build` refreshes its embedded library from the source.
