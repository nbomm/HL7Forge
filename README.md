# HL7Forge

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**A private, in-browser HL7 v2 message viewer.** Paste a message, open a file, or drop one in, and HL7Forge breaks it down into segments, fields, repetitions, components, and sub-components. Every value is labelled with its field name and data type, coded values are decoded (`F` → Female, `AE` → Application Error), and timestamps are shown in a readable form.

It's built for the people who read HL7 all day: interface analysts, integration engineers, and support staff tracing a bad ADT or a missing lab result. It's also built for the data inside those messages. HL7Forge runs entirely in your browser tab, with no server, no build step, and no dependencies. A strict Content-Security-Policy blocks every network request, so patient data never leaves your computer.

**[Try it in your browser →](https://nbomm.github.io/HL7Forge/)**, or download the repository and open `index.html`.

### Highlights

- **Readable breakdown:** names and types for 25+ common segments, decoded code tables, OBX-5 typed by OBX-2, and a summary of message type, route, patient, and ACK status.
- **Syntax-highlighted editor:** the input box colors segments, delimiters, and escape sequences as you type. A cursor bar shows exactly where you are, e.g. `OBX[3]-5.1`.
- **Batches and files:** multi-message batches (FHS/BHS), MLLP framing, custom delimiters, literal `\r` separators copied from logs, and UTF-8 or Windows-1252 files.
- **Session workspace:** save messages for the session and switch with Alt+↑/↓, Alt+1–9, or the Ctrl+K quick switcher. Everything is held in memory only, with idle auto-clear.
- **Private by design:** no network access, no storage of message data, and grammar and spellcheck extensions opted out of the input.
- **Fast on big inputs:** messages with thousands of segments and multi-megabyte files stay responsive.

## Privacy: messages never leave this computer

All parsing happens in your browser tab. HL7Forge has no server, no backend, no analytics, and no third-party resources (no CDNs, no web fonts). The browser enforces this:

- **Content-Security-Policy** in `index.html` sets `connect-src 'none'`. This blocks `fetch`, XHR, WebSocket, EventSource, and `sendBeacon`. `form-action 'none'` blocks form submissions, and image, font, media, frame, and worker sources are restricted to local files or nothing. Even a bug or injected code could not send message data anywhere. `require-trusted-types-for 'script'` with a single allowed policy (`hl7forge-sw`, which can only produce the service worker's script URL and cannot create HTML) makes every HTML-string sink (`innerHTML` and similar) throw in Chromium browsers, so message text can't be turned into markup even by a future code change.
- The privacy badge in the header counts any request the policy blocks, so a blocked attempt is visible.
- Messages are held only in page memory. The app never writes them to `localStorage`, `sessionStorage`, IndexedDB, or cookies, and it writes a file only when you click **Save to file**. The only stored value is your light/dark theme preference. If you install the app, the browser also keeps a cache of the app's own files (never message data) so it can open offline.
- The input box turns off spellcheck, autocorrect, Grammarly, and LanguageTool. Some cloud spellcheckers and grammar extensions upload the text you type.
- Opening files uses the browser's `FileReader`, which reads from local disk. Files are decoded as UTF-8, or as Windows-1252 (with a notice) when they aren't valid UTF-8.
- The DOM is built with `textContent` only, so message content is never interpreted as HTML.

### Saved messages are session-only

**Save** (Ctrl+S) keeps the current message in a "Saved this session" list so you can switch between messages. The list exists only in the tab's memory:

- **Closing the tab destroys it.** It also isn't restored by Ctrl+Shift+T or "continue where you left off". Refreshing destroys it as well, so the browser asks "Leave site?" first.
- **Leaving the page clears it** (`pagehide`), so a page brought back with the Back button returns empty. Any text the browser tries to restore into the input box is discarded.
- **Idle auto-clear:** after 15 minutes with no activity (configurable to 30 or 60 minutes, or off), all saved messages and the input are erased. A 60-second warning appears first. The setting resets to 15 minutes on every page load, so the protection is on by default. Timing uses the clock rather than a single timer, so a sleeping laptop or background tab clears as soon as the page runs again.
- **Tested:** a fresh Edge profile with session restore on was searched byte by byte for a marker string saved in the app. Nothing turned up while the page was open, after the browser closed, or after a restored session.

sessionStorage was deliberately not used: Chromium browsers write it to disk unencrypted and restore it when a closed tab is reopened.

### Limits outside the app's control

- Browser extensions run outside the page's control and can read any page. When working with real PHI, use a browser profile without third-party extensions.
- The operating system may write browser memory to the page file, hibernation file, or crash dumps. Full-disk encryption (e.g. BitLocker) protects these.
- Values you copy go to the system clipboard. Windows clipboard history (Win+V) and cloud clipboard sync can keep them.

## Running

No build step and no dependencies. Open `index.html` directly in Chrome, Edge, or Firefox (double-click it, or drag it into a browser window).

If you host it on an internal web server, also send the same Content-Security-Policy as an HTTP response header, with `frame-ancestors 'none'` added (a `<meta>` policy can't set it, and it stops other sites from framing the page). Also send `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`.

### Installing as an app

When the app is served over HTTPS (such as the GitHub Pages link above) in Chrome or Edge, an **Install** button appears next to the **?** button in the header. Installing gives HL7Forge its own window and lets it open offline. It is still entirely local: the service worker only caches the app's static files, and the same Content-Security-Policy applies. Opened from `index.html` on disk, the app works as before but isn't installable (browsers only allow service workers on HTTPS or localhost). Firefox and Safari don't offer an install prompt through the page, so the button stays hidden there.

## Features

- Accepts `\r`, `\n`, or `\r\n` segment separators, MLLP framing characters, and messages copied from logs with literal `\r` text
- Reads custom delimiters from MSH-1/MSH-2 (also BHS/FHS)
- Decodes escape sequences: `\F\ \S\ \T\ \R\ \E\ \Xhh\ \.br\` and others
- Batch and file support: multiple messages are split at each `MSH` and selectable
- Summary of message type and event, control ID, version, route, patient, and ACK status
- Field names and data types for common segments (MSH, EVN, PID, PD1, NK1, PV1, PV2, ORC, OBR, OBX, NTE, AL1, DG1, PR1, IN1, GT1, MSA, ERR, MRG, RXA, RXR, SPM, batch headers). Unknown and Z-segments display generically.
- OBX-5 components are named according to the value type in OBX-2
- Code lookups (sex, patient class, ACK codes, abnormal flags, result status, order control, …)
- **Save to file** downloads the input as a `.hl7` file (UTF-8, `
` line breaks) through the browser's normal download, with no request made. The file name holds only the message type, e.g. `ADT-A01.hl7`, never patient details
- Save messages for the session (Ctrl+S), switch between them, rename or delete them, and clear all of them; memory only, with idle auto-clear
- Keyboard switching between saved messages: Alt+↑ / Alt+↓ for previous / next, Alt+1–9 to jump to a saved message by position, and Ctrl+K for a quick switcher that filters by name. Switching is refused, with a notice, if the input holds a message that hasn't been saved. Clicking a saved message, loading a sample, opening a file, or dropping text asks before replacing unsaved input.
- Filter by path (`PID-5`), field name, or value; hide empty fields; copy any value
- Cursor location bar: as you click or move through the input, it shows the line and column, the path (e.g. `OBX[3]-6.1`), the segment › field (type) › component names, and the decoded value, and it highlights that field's row. Click the path to jump to the field.
- Syntax highlighting in both the input box and the Raw view: segment IDs, field / component / repetition / sub-component delimiters, alternating field colors, encoding characters and escape sequences. The input stays a normal textarea (typing, selection, undo) with the highlighting drawn underneath it. Only the lines around the visible area are colored, so typing stays fast in long messages; inputs over 2,000,000 characters show plain text.
- Large inputs: results update automatically as you type up to 1,000,000 characters; above that, press Parse (Ctrl+Enter). Messages with thousands of segments show the first segments at once and build the rest in the background.
- Raw view: click a field to jump to it
- Warnings for a missing MSH, empty required header fields, bad segment IDs, or bad delimiters
- A **?** button in the header opens an About dialog describing the app, and a green GitHub button links to this repository (the only outbound link; it opens in a new tab and sends no referrer)
- **Light** and **Dark** themes, switched with the header button. Light is a soft, low-glare palette with no pure white and VS Code Light+–inspired syntax colors. The theme follows the system setting until you pick one. Every text color meets WCAG AA contrast (4.5:1) in both themes. Responsive layout.

## Project layout

```
index.html               Page shell and Content-Security-Policy
css/styles.css           Styles (system fonts only)
js/hl7-parser.js         Parser: pure functions, no I/O
js/hl7-definitions.js    Segment/field/data type names and code tables (v2.5.1)
js/samples.js            Fictional sample messages
js/theme-init.js         Applies the saved theme before first paint
manifest.webmanifest     Web app manifest (name, icons, standalone display)
sw.js                    Service worker: caches the app's own files for offline use
js/pwa.js                Registers the service worker; drives the Install button
icons/                   App icons (icon.svg source, PNGs for install)
js/version.js            Build stamp (commit hash) shown in the About dialog
js/app.js                UI rendering and interaction
scripts/stamp-version.js Regenerates js/version.js; run before committing a release
tests/parser.test.js         Parser tests
LICENSE                      MIT License
```

## Tests

```
node --test tests/parser.test.js
```

The parser can also be used from Node:

```js
const { parse, getValue, locate, tokenize } = require('js/hl7-parser.js');
const msg = parse(text).messages[0];
getValue(msg, 'PID-5.1');     // family name
getValue(msg, 'PID-3(2).1');  // 2nd repetition of PID-3, component 1
getValue(msg, 'OBX[3]-5');    // 3rd OBX segment, field 5
locate(text, 120).path;       // e.g. 'PID-5.2' — what is at character offset 120
tokenize(text);               // lossless syntax-highlighting tokens
```

## License

HL7Forge is released under the [MIT License](LICENSE). Copyright © 2026 [Nathan Bommersbach](https://github.com/nbomm).

HL7® is a registered trademark of Health Level Seven International. HL7Forge is an independent project and is not affiliated with or endorsed by HL7 International.
