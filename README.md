# Cinder — HTML / CSS / JavaScript playground

Cinder is a small, standalone front-end code playground: write HTML, CSS and JavaScript in three editors, run
the result in a sandboxed live preview, and read console output and runtime errors beside it. It is inspired by
CodePen but stays deliberately local: no backend, no accounts, no storage, no build step, and no network requests
of its own.

**Version 1.0.0**

## Quick start

1. Keep the four files together in one folder:
   [`index.html`](index.html), [`styles.css`](styles.css), [`app.js`](app.js) and this README.
2. Open `index.html` directly in a current browser (`file://` works), or serve the folder with any static file
   host if you prefer an HTTP origin.
3. Edit the three panels, then press **Run** (or leave **Auto-run** on).

No installation, package manager, bundler, server, database or internet connection is required. All third-party
CSS and JavaScript is embedded in `index.html`; the app's only requests are for its two companion files.

> Refresh or close the page and the current project is gone. There is intentionally no localStorage, cookie or
> IndexedDB persistence. Use **Export** to keep a project.

## File map

| File | Responsibility |
| --- | --- |
| [`index.html`](index.html) | Semantic layout, Bulma and CodeMirror CSS, CodeMirror/js-beautify bundles, dialogs and the iframe element |
| [`styles.css`](styles.css) | Application layout, light/dark theme tokens, Bulma overrides, CodeMirror theme, responsive rules, dialogs |
| [`app.js`](app.js) | All application logic: editors, preview generation, console bridge, themes, layout, formatting, import/export |
| [`README.md`](README.md) | This documentation |

## Features

### Editors

- Separate **HTML**, **CSS** and **JavaScript** editors built on CodeMirror 5 (bundled, inlined, offline).
- Syntax highlighting with line numbers, active-line highlight, bracket matching, auto-closing brackets,
  multiline editing, selection, native copy/cut/paste, undo/redo and keyboard navigation.
- Tab inserts two spaces; Shift+Tab outdents the current line or selected lines. The indent unit is two spaces.
- A clear active-panel border and, on compact screens, an accessible editor selector.
- Per-panel **Format** button. Formatting is always manual, uses the bundled js-beautify build, and can be undone
  with the editor's normal undo command.
- If the bundled CodeMirror fails to load, the page falls back to labelled native `<textarea>` editors with basic
  tab handling and no syntax highlighting. The app never claims highlighting in that mode.

### Live preview

- The HTML, CSS and JavaScript panels are combined into a complete preview document and mounted in a dedicated
  iframe.
- **Run**, **Rerun**, and **Auto-run** (700 ms debounce) are supported. Auto-run can be turned off; edits then show
  “Press Run to update”.
- The preview status reports `Live · time`, `Running…`, `Changes pending…`, `Press Run to update`,
  `Nothing to preview` or `Preview failed`.
- A useful empty state appears when all three panels are empty, and a separate “imported, ready to run” state
  appears after an import.
- The preview is replaced on every run, which guarantees a clean execution context and no stale timers, event
  listeners or console handlers from earlier runs.

### Console

- Captures `console.log`, `console.info`, `console.warn`, `console.error`, `console.debug`, uncaught exceptions,
  unhandled promise rejections and relevant resource-loading failures.
- Each entry shows a timestamp, a text severity label (`Log`, `Info`, `Warn`, `Error`, `Debug`) and the message.
  Severity is never communicated by color alone.
- Values are serialized defensively inside the iframe: depth, item count, key count and total text are bounded,
  circular references become `[Circular]`, DOM nodes are summarized, and getters that throw are caught.
- Console text is rendered with `textContent`; it is never interpreted as HTML.
- The console opens automatically on the first error. **Clear** removes all entries.
- The list is capped at 250 entries and 4,000 characters per message, with a rate limit in both the iframe bridge
  and the parent. A flood of output produces one warning rather than freezing the interface.
- `console.clear()` from preview code also clears the console.

### Themes

- **Manual** light/dark toggle in the toolbar. The initial theme is light even if the operating system prefers dark.
- Theme is applied through `data-theme="light|dark"` and CSS custom properties; switching never reloads the page,
  never resets source code, and never rebuilds the preview.
- The toggle's accessible name states both the action and current theme, for example
  “Switch to dark mode. Current theme: light.”
- The preview is not automatically themed. The iframe keeps its own neutral canvas and the user's CSS decides how
  the preview looks.

### Responsive layout

- **Desktop (≥ 1024 px):** editor workspace and preview sit side by side; all three editors are visible. A
  keyboard-operable separator resizes the split (Arrow keys, Home/End, double-click to reset, pointer drag).
- **Tablet / mobile (≤ 1023 px):** the workspace stacks editor above preview; a native radio group selects which
  one of the three editors is visible. The toolbar becomes sticky so Run and the theme control stay reachable.
- No page-level horizontal scrolling is introduced; editors, console and preview own their internal scroll areas.
- Toolbar buttons keep at least 32 px targets on narrow screens.

### Import

- Import accepts `.html` and `.htm` files up to 2 MB, read entirely in the browser with `FileReader`.
- The file is parsed with `DOMParser` into an inert document. Nothing from the file is inserted into the
  playground document, and nothing executes during import.
- Best-effort extraction: body markup → HTML editor; all `<style>` blocks → CSS editor; inline classic scripts →
  JavaScript editor. External stylesheets and scripts are removed and reported. Module scripts are skipped and
  reported. Some document head markup, the document title, CSS ordering and script ordering cannot be preserved.
- A confirmation dialog explains that imported documents may contain arbitrary executable code, previews the
  extracted content sizes and warnings, and requires an explicit **Replace code** action.
- Auto-run is paused when an import is applied. Imported code runs only after **Run** is pressed, inside the
  sandboxed iframe.

### Export

- Export builds a complete standalone HTML document containing the current HTML, CSS and JavaScript inlined.
- The exported file has a fixed `Cinder project` title, includes the user's markup as body content, and does not
  include any playground interface, CodeMirror, app script or console bridge.
- It is downloaded through a Blob URL as `cinder-project.html` and works independently of the playground.
- A share action is present in the toolbar but does not create URLs (see the scope decision below).

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Run the project | `Ctrl` / `Cmd` + `Enter` |
| Format the active editor | `Alt` + `Shift` + `F` |
| Indent / outdent | `Tab` / `Shift` + `Tab` |
| Undo / redo in an editor | `Ctrl`/`Cmd` + `Z` / `Ctrl`/`Cmd` + `Shift` + `Z` |
| Dismiss a dialog | `Escape` |
| Move focus between toolbar controls | `Tab` / `Shift` + `Tab` |
| Resize the desktop split | Focus the separator and use `←`, `→`, `Home`, `End`; double-click resets |
| Select a visible editor on compact screens | Native radio-group arrow keys |

Shortcuts are ignored while a modal dialog is open.

## Deployment

Cinder is a static site: deploy `index.html`, `styles.css` and `app.js` together. `README.md` is documentation
only. There is no build step, runtime, database or API, so any static file host works as long as it serves
`.html`, `.css` and `.js` with the correct MIME types.

> Keep `.env`, `node_modules/`, `server.mjs`, `server/`, `scripts/` and `package*.json` out of the deployed
directory. They are local tooling and are not needed by the playground. Cinder reads no environment variables
and makes no third-party network requests; never publish a file containing credentials.

### Debian with nginx

The commands below use Debian's packaged nginx. Replace `cinder.example.com` with the hostname or IP address
clients will use. If you already have nginx serving other sites, create the new server block without removing
the existing ones.

1. Install nginx, create a document root and copy the three runtime files:

   ```sh
   sudo apt update
   sudo apt install -y nginx
   sudo install -d -m 0755 /var/www/cinder
   sudo cp index.html styles.css app.js /var/www/cinder/
   sudo chown -R root:root /var/www/cinder
   sudo find /var/www/cinder -type d -exec chmod 0755 {} +
   sudo find /var/www/cinder -type f -exec chmod 0644 {} +
   ```

2. Create `/etc/nginx/sites-available/cinder`:

   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name cinder.example.com;

       root /var/www/cinder;
       index index.html;
       charset utf-8;

       location / {
           try_files $uri $uri/ =404;
       }
   }
   ```

   Use `sudo tee /etc/nginx/sites-available/cinder` with a heredoc if you prefer to create it from the shell.

3. Enable the site and reload nginx:

   ```sh
   sudo ln -sfn /etc/nginx/sites-available/cinder /etc/nginx/sites-enabled/cinder
   sudo nginx -t
   sudo systemctl reload nginx
   ```

   On a dedicated host, remove the stock welcome site if it is still enabled:

   ```sh
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo nginx -t && sudo systemctl reload nginx
   ```

4. Open `http://cinder.example.com/` and verify the response:

   ```sh
   curl -sS -o /dev/null -w '%{http_code}\n' -H 'Host: cinder.example.com' http://127.0.0.1/
   ```

   If a firewall is active, allow HTTP and HTTPS through it, for example:

   ```sh
   sudo ufw allow 'Nginx Full'
   ```

5. For HTTPS with a DNS name pointed at the machine, add a free certificate:

   ```sh
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d cinder.example.com
   ```

   Certbot updates the nginx block and installs a renewal timer. Reloading nginx after future changes is enough;
   the app itself needs no server-side configuration.

   If the site is served below a path such as `/cinder/`, no base-URL setting is required: the stylesheet and
   script links are relative, so they continue to resolve beneath that path.

### Container

A minimal nginx image is enough. Create this `Dockerfile` next to the app files:

```dockerfile
FROM nginx:stable-alpine
COPY index.html styles.css app.js /usr/share/nginx/html/
```

The base image already serves `/usr/share/nginx/html` with the correct MIME types. The image contains only the
three app runtime files, not the server scaffolding or local environment files.

Because this checkout also contains `node_modules/`, `.env` and tooling, add a `.dockerignore` next to the
`Dockerfile` so those files are not sent to the build daemon:

```gitignore
.git
.env
.env.*
node_modules
```

Build and run:

```sh
sudo docker build -t cinder:1.0.0 .
sudo docker run -d --name cinder --restart unless-stopped -p 8080:80 cinder:1.0.0
```

Open `http://localhost:8080/`. To put the container behind an existing TLS reverse proxy instead, bind it only
to loopback:

```sh
sudo docker run -d --name cinder --restart unless-stopped -p 127.0.0.1:8080:80 cinder:1.0.0
```

Use `docker logs cinder` to inspect requests and `docker rm -f cinder` to remove the container. Podman is also
supported: use `podman build` and `podman run` with the same `Dockerfile`. For production, pin the nginx image
to a specific tag or digest rather than relying on the floating `stable-alpine` tag.

### GitHub Pages

GitHub Pages serves static files only; it does not run `server.mjs`, the `scripts/` directory or any Node
process. Publish only the three runtime files. In this repository, the cleanest option is a dedicated `docs/`
folder so the local server scaffolding is not included in the published site.

1. Assemble the static payload:

   ```sh
   mkdir -p docs
   cp index.html styles.css app.js docs/
   touch docs/.nojekyll
   ```

   `.nojekyll` tells Pages to serve the files exactly as written rather than running Jekyll over them. It is
   optional for this app but avoids surprises with static HTML that contains JavaScript template syntax.

2. Commit and push `docs/` to GitHub.

3. In the repository, open **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, then
   select your default branch (usually `main`) and the `/docs` folder. Save the setting.

4. After the first deployment, the site is available at
   `https://<username>.github.io/<repository>/`. A user or organization site named `<username>.github.io` uses
   `https://<username>.github.io/` instead.

Because all app links are relative, deploying under a repository subpath works without a base URL or build
configuration. To check the deployed page:

```sh
curl -I https://<username>.github.io/<repository>/
```

Alternatively, keep a separate repository containing only `index.html`, `styles.css` and `app.js` at its root
and publish from **/ (root)**. That avoids maintaining a second copy in `docs/`. To use a custom domain, enter
it under **Settings → Pages**, create the DNS record GitHub displays, and enable **Enforce HTTPS**. Private
repositories may require a paid GitHub plan for Pages, and the published site is public; never commit `.env` or
other credentials.

When the app changes, copy the updated three files into `docs/` and commit them (or push to the dedicated
repository). Pages rebuilds automatically from the selected branch and folder.

## Preview security model

The preview is treated as untrusted arbitrary code.

- The iframe uses exactly `sandbox="allow-scripts"`. It deliberately omits `allow-same-origin`, so preview code
  cannot read the playground DOM, its storage or its origin. It also omits `allow-top-navigation`, `allow-popups`,
  `allow-forms`, `allow-modals` and `allow-downloads`.
- The console bridge is installed at the top of the preview `<head>`, before user CSS, markup and JavaScript, so
  console calls and errors from inline HTML scripts are captured too. The JavaScript panel is appended last, after
  the DOM exists.
- The bridge posts messages to the parent on a private channel: `{ channel, type, level, text }` with `type` limited
  to `console` or `clear`, `level` limited to the five log levels, and text capped. It caps the number of messages
  per second and text length before posting.
- The parent accepts messages only when `event.source` is the **current** preview iframe's window, the channel is
  ours, the type/level are whitelisted, and the text is a bounded string. A sandboxed `srcdoc` frame has an opaque
  origin, so a fixed origin string is not a useful trust anchor; the source reference plus protocol validation is
  used instead. Messages from other frames or from the parent window are ignored.
- Console output is rendered with `textContent`. No imported or logged string is ever interpreted as HTML or run
  in the parent.
- There is no `eval()` in the application. Formatting is done by js-beautify parsing text, not executing it.
- No cookies, localStorage, sessionStorage, IndexedDB, authentication or remote database are used by the app.

### Sandbox limits users may notice

These are intentional, not bugs:

- `alert()`, `confirm()` and `prompt()` cannot open real modal dialogs in the sandbox. The bridge replaces them
  with console messages (`confirm` returns `false`, `prompt` returns `null`).
- Form submission, top-level navigation, popups, downloads and page storage APIs are blocked.
- The sandbox does **not** block network access for resources the user explicitly writes (for example an external
  `<img>`, font or script URL). The playground itself makes no such requests; any such request is user-authored.
  Isolation is a defence-in-depth measure, not a guarantee that arbitrary code is harmless.
- External library `<script src="…">` tags written by the user can still load if the browser allows it; the import
  flow however removes external script and stylesheet references to keep imports self-contained.

## Supported preview input

The HTML editor is treated as **body markup (a fragment)**, not as a complete browser document. A `<style>` or
`<script>` typed into the HTML panel is passed through and behaves as HTML normally would. If a user types closing
`</body>` or `</html>` tags, the browser normalizes the result; head content and the document title are supplied by
the playground.

The builder guards user CSS and JavaScript against prematurely closing their own `<style>` or `<script>` elements
by escaping `</style` and `</script` sequences, which is semantically equivalent inside CSS strings and JS
strings/regexes. The same guard is used for exports.

## Theme and design reference

The supplied palette is defined once as CSS custom properties and extended with neutral, verified tokens:

```css
:root {
  --cinnamon-wood: #B05C33;
  --saddle-brown: #7F4B31;
  --jet-black: #1F2B35;
  --black: #04080C;
  --jet-black-2: #1C272F;
}
```

- Light: app `#F5F6F7`, toolbar/panels `#FFFFFF`, borders `#D8DEE3`, text `#1F2B35`, secondary `#56616A`,
  muted `#5E6B74`.
- Dark: app `--black`, toolbar `--jet-black`, panels `--jet-black-2`, borders a muted jet-black tint, text
  `#F2F4F5`, secondary `#B5BEC5`, muted `#98A6AF`.
- Primary actions: `--cinnamon-wood` with white text; hover/active uses `--saddle-brown`. White on cinnamon
  measures **4.75:1**, passing WCAG AA for normal text.
- Muted text measures 4.97:1 on light muted surfaces and 5.42:1 on dark muted surfaces. Focus rings measure
  6.57:1 (light) and 9.43:1 (dark) against their surroundings. Syntax token colors were chosen for code
  readability and measured between 5.21:1 and 11.05:1 on the code surfaces.
- Gradients are not used for the application shell; the sample preview uses its own decorative gradients inside
  the sandbox, as user content.

## Accessibility notes

- Semantic landmarks: `header`/`nav`, `main`, named `section`s, `article` editor panels, `footer`; one `h1` and
  panel-level `h2`s.
- Skip link to the main region, visible keyboard focus rings, accessible names on icon-only buttons, and labelled
  form controls (explicit or wrapping labels).
- The editor selector is a native radio group with a visually hidden legend; the splitter uses
  `role="separator"`, `aria-orientation`, `aria-valuemin/max/now` and keyboard support.
- Console, status text and dialog warnings use both text and color. The preview status is `aria-live="off"` to
  avoid announcing every keystroke; a separate polite live region announces run/reset/theme actions and the first
  preview error per run. Form errors use an assertive `role="alert"` region.
- `prefers-reduced-motion: reduce` removes transitions and animations. `prefers-contrast: more` strengthens
  borders and muted text.
- The preview iframe has a title and a description of its sandbox; CodeMirror's input field is labelled by its
  panel heading and described by the keyboard hint.
- Screen-reader code editing relies on CodeMirror 5's textarea input. This is usable but less fluid than native
  text editing in some screen-reader/browser combinations; that is a limitation of the bundled editor.

## Import and export limitations

- Extraction is **best effort and lossy**: head markup, document title, external assets, module scripts, attribute
  ordering/formatting and exact whitespace may change.
- Styles are moved from their inline positions into the CSS panel; scripts are moved into the JavaScript panel.
  This can change cascade or execution order in complex documents.
- A 2 MB file limit is enforced to keep the UI responsive.
- Export always uses `cinder-project.html` as the download name. If a browser blocks downloads from `file://`,
  allow downloads for local files, open the page from a local static server, or copy the generated file from the
  browser download prompt.
- Formatting very large sources is disabled above 500,000 characters to avoid locking the page.

## Browser support

| Browser | Status |
| --- | --- |
| Current Chrome / Edge (Chromium) | Tested in Chromium 155 from `http://localhost` and `file://` |
| Current Firefox | Tested in Firefox 153.4 ESR from `http://localhost` and `file://` |
| Current Safari | Expected to work (the app uses current standards and no Chromium-only APIs); not executable in this environment, so a manual Safari pass is recommended |
| Internet Explorer | Not supported. A small ES5 check displays a red warning banner; static HTML/CSS components still load |

The app targets browsers with `file://`, ES2017+, CSS custom properties, `<dialog>`, pointer events, `dvh`,
`:focus-visible` and CSS `overflow: clip`. Those are all available in current Chrome, Edge, Firefox and Safari.

## Third-party dependencies and licenses

All dependencies are embedded in `index.html` so the app is a four-file, offline deployment with no CDN requests.
Versions are also noted in comments next to the embedded blocks.

| Component | Version | License | Source |
| --- | --- | --- | --- |
| Bulma | 0.9.4 | MIT | https://bulma.io |
| CodeMirror | 5.65.16 | MIT | https://codemirror.net |
| CodeMirror modes/addons | xml, javascript, css, htmlmixed, closebrackets, matchbrackets, active-line (same version) | MIT | https://codemirror.net |
| js-beautify | 1.15.4 | MIT | https://github.com/beautifier/js-beautify |

Bulma is inlined unmodified; application-specific styles live in `styles.css`. Bulma 0.9.4 was chosen over Bulma
1.x because 1.x's default CSS bundle is substantially larger and includes automatic `prefers-color-scheme` theme
behavior, which conflicts with this project's manual theme requirement.

MIT license notice for the bundled projects:

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
> documentation files (the "Software"), to deal in the Software without restriction, including without limitation
> the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
> to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of
> the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
> THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
> CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
> DEALINGS IN THE SOFTWARE.

Copyright notices: Bulma © 2022 Jeremy Thomas; CodeMirror © 2017 Marijn Haverbeke and others; js-beautify
© 2007–2018 Einar Lielmanis, Liam Newman, and contributors. No project-wide license was specified for the
playground source itself; add one if you redistribute it as a product.

## Requirement decisions and conflicts

The specification contains a few statements that cannot all be true at once. These are the decisions this
implementation makes, and why:

1. **Four files, not literally one HTML file.** The project overview mentions a single standalone HTML file, while
   FR-01 and the core principles explicitly require `index.html`, `styles.css`, `app.js` and `README.md`. The
   four-file layout is the authoritative, detailed requirement. All dependency CSS/JS is nevertheless embedded in
   `index.html`, so there is no install/build/CDN step and opening `index.html` from `file://` works. If you need a
   literal single file, inline `styles.css` and `app.js` manually; the app has no module loader or fetch logic.
2. **No URL sharing.** FR-09, the scope statement and the future-enhancements list all exclude URL sharing, while
   a few later testing/definition-of-done lines mention it. FR-09 is treated as authoritative: no code is
   serialized into a URL and the app reads no URL data. The toolbar's **Share** action exists for parity with the
   layout spec; it explains that link sharing is not available and offers Export instead.
3. **Manual theme only.** Initial theme is light, `prefers-color-scheme` is not used for the app shell, and theme
   is not persisted. Reloading resets the app shell to light; the preview was never tied to the app theme.
4. **Console bridge placement.** The design example places the console bridge after user HTML, but that would
   miss inline scripts inside the HTML panel. The bridge is placed in the preview head before user content so all
   preview scripts are covered. Supported input is documented as body markup.
5. **Console clearing.** Each run clears the console rather than retaining output from an old document. This
   directly supports the requirement that repeated runs do not retain stale preview state. Users can use the
   separate **Clear** action at any time.
6. **Auto-run paused after import.** The import warning promises imported code runs only after pressing Run, so
   applying an import unchecks Auto-run (when it was on) and shows a notice.
7. **Formatting is opt-in.** No source is formatted automatically. js-beautify is bundled and works offline;
   formatting a changed document is undoable through CodeMirror history.

## Verification performed

Checks were run with headless Chromium 155 and headless Firefox 153.4 ESR against both an HTTP origin and
`file://`. The test harnesses were development tools and are not part of the four-file deliverable.

| Area | Result |
| --- | --- |
| Load, no console errors, three editors, live initial preview | Pass (Chromium + Firefox, HTTP + `file://`) |
| Editor independence, syntax highlighting, Tab/Shift+Tab, undo, format (manual, then undoable) | Pass |
| Preview rendering of HTML/CSS/JS, including inline scripts in the HTML panel | Pass (DOM and computed styles inspected in the sandbox frame) |
| Console levels, timestamps/labels, runtime errors, syntax errors, rejection/DOM/circular serialization | Pass |
| Console XSS safety, text-only rendering, 4,000-character cap, 250-entry cap, rate limiting | Pass |
| Source validation: foreign frame, parent window, malformed channel/type/level/payloads ignored | Pass |
| Sandbox: exact `allow-scripts`, parent DOM inaccessible, storage blocked, popups blocked | Pass |
| Auto-run on/off, debounce behavior, manual Run, empty state | Pass |
| Theme switch keeps source and preview state; ARIA action/state updates | Pass |
| Import: dialog/warnings, cancel, replace, no parent execution, no auto-run, execution only after Run | Pass (Chromium + Firefox) |
| Export: standalone document, no playground UI/bridge, renders and runs from `file://` | Pass (Chromium + Firefox) |
| Reset confirmation/cancel/restore; Clear console; empty and CSS-only projects | Pass |
| Responsive at 320, 390, 768, 1023, 1024 and 1440 px: no page overflow, one editor on compact, sticky toolbar, Run reachable | Pass |
| Splitter pointer drag, arrow/Home/End keys, double-click reset | Pass |
| Landmarks, accessible names, skip link, keyboard focus rings, dialog focus/Escape, reduced motion | Pass |
| Contrast audit in both themes (text, controls, focus, syntax) | Pass at WCAG AA |
| `file://` loading of CSS/JS, sandboxed preview, import and export | Pass (Chromium + Firefox) |
| No cookies, localStorage, sessionStorage or external requests from the playground itself | Pass |

Safari and Edge could not be launched in this environment, so they were not executed. Edge shares Chromium's
engine; Safari should receive a manual pass, particularly for `<dialog>` behavior, `file://` downloads and
screen-reader interaction with CodeMirror.

## Known limitations

- **No persistence by design.** Reloading restores the built-in example and the light theme. Export is the only
  supported way to retain work.
- **Imports are lossy** as described above, especially for documents with external assets, modules, complex
  head configuration or order-sensitive inline scripts/styles.
- **No URL sharing** (deliberate; see the requirement decisions).
- **Sandbox restrictions** block storage, forms, popups, downloads and modal dialogs inside the preview. Some
  third-party snippets will need adaptation.
- **Network access is not blocked inside the preview** for resources the user explicitly writes. It is blocked for
  nothing else because nothing else is loaded.
- **Infinite loops** in preview JavaScript can keep the iframe busy. The parent interface remains responsive;
  pressing Run creates a fresh iframe (and the browser eventually reaps the old one).
- **Large documents:** formatting is disabled over 500,000 characters; very large previews may be slow depending
  on the code the user runs. Console output is bounded to protect the shell.
- **Screen-reader editing** is limited by CodeMirror 5's textarea input model, as noted in the accessibility
  section.
- **Single-file distribution** is not provided as a fifth artifact; all vendors are embedded, but the app's own
  CSS and JS remain separate to satisfy FR-01.
