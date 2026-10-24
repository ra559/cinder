# System Requirements Documentation

> * Goal: A standalone web based code playground for HTML/CSS/JS
> * Document type: Requirements and technical Design
> * Status: Initial specifications
> * Version: 1.0.0

---

## Project Overview:

### Purpose 
* Build a lightweight, browser-based coding playground inspired by CodePen. Users can write HTML, CSS, and JavaScript in separate editors and see the resulting output in a live preview.
* The application must be deliverable as a single standalone HTML file that can be opened directly in a modern browser. It must not require a backend, database, build process, or application server.
* The application is intended for experimentation, prototyping, learning, and testing small frontend snippets.

### Core Principles
* **Four-file deployment:** The application is composed of: 
  * `index.html`: Layout
  * `styles.css`: Extension of Bulma CSS
  * `app.js`    : Where all the logic lives
  * `README.md` : The project's documentation
* **No backend:** All execution and interface behavior happen in the browser.
* **No required storage:** The application must work without cookies, local storage, IndexedDB, or a remote persistence service.
* **Semantic HTML:** Prefer meaningful native HTML elements over generic containers.
* **Bulma CSS:** Use Bulma for layout primitives, buttons, forms, controls, and responsive styling.
* **Manual theme selection:** Users explicitly choose light or dark mode.
* **Responsive design:** The interface must work on desktop, tablet, and mobile devices.
* **Progressive enhancement:** Core functionality must not depend on optional external services.

### Scope

The initial release includes:

* HTML, CSS, and JavaScript editors.
* Live preview and manual Run control.
* JavaScript console output and error reporting.
* Light and dark themes.
* Adjustable editor and preview layout.
* Import and export of project code.
* Responsive and keyboard-accessible controls.

The initial release **does not include** user accounts, collaboration, cloud saving, project hosting, a server-side execution environment, or URL-based project sharing.


--- 

## Functional Foundational Requirements

### FR-01: Standalone Application

The application must be distributed as 4 Files:
* `index.html`: Layout preferring semantic HTML
* `styles.css`: Application-specific CSS which extends or overwrite Bulma CSS. 
* `app.js`    : Where all the logic lives using vanilla Javascript. 
* `README.md` : The project's documentation

**Do not use any Javascript runtime such as Node.js, Bun, Deno, etc.**

> **Acceptance criteria** Opening the HTML file in a supported modern browser displays the playground. Opening the file in an outdate web browser like Microsoft Internet Explorer will generate a red warning but the page should load the basic components at least. No backend endpoint is required for the application to function.

---

### FR-02: HTML, CSS, and JavaScript Editors

Provide three separate code editors with syntax highlighting

* HTML
* CSS
* JavaScript

#### Editors must support:

* Text entry and selection.
* Copy, cut, and paste.
* Undo and redo where supported by the editor implementation.
* Keyboard navigation.
* Multiline editing.
* Tab indentation appropriate for source code.
* Clear indication of the currently selected editor or panel.
* A code pretty printer for quick formatting via button. This should never be automatic. 
* A syntax-highlighting editor is preferred. CodeMirror may be used if its required assets can be bundled into the standalone HTML file.
* A native `<textarea>` implementation is acceptable for an initial minimal version, but it must not be represented as providing syntax highlighting if it does not.

#### Acceptance criteria:

* Users can edit each language independently.
* Editing one panel does not overwrite the content of another.
* The editor content can be exported and restored.

---

### FR-03: Live Preview
The preview must render the combined HTML, CSS, and JavaScript.

*   The preview must run in an `<iframe>` with an appropriate sandbox configuration.
*   **Implementation Checklist:**
    *   Inject the `HTML` into the preview document.
    *   Apply the `CSS` to the rendered page.
    *   Execute `JavaScript` in the preview context.
    *   Update the preview when the user runs the project.
    *   Offer an automatic preview mode with a short debounce delay.
    *   Allow automatic preview to be disabled.
    *   Display a useful empty state when no code has been entered.

#### Acceptance Criteria:
1.  `HTML` changes are reflected in the preview after execution.
2.  `CSS` changes update the rendered appearance.
3.  `JavaScript` executes in the preview context.
4.  Broken user code does not crash the parent application.

---

### FR-04: Run and Reset Controls
Provide the following actions within the interface controls:

*   **Run**: Execute the current source in the preview.
*   **Reset**: Restore the initial example project after confirmation.
*   **Clear console**: Remove existing console messages.
*   **Format controls**: Optional source formatting, provided a formatter is bundled and available offline.

***Note:** Resetting must not silently erase user-entered code.*

---

### FR-05: Console and Errors
Provide a dedicated console panel associated with the preview.

**Required Capabilities:**
The system must capture and display (where technically possible):
*   `console.log()`
*   `console.info()`
*   `console.warn()`
*   `console.error()`
*   Uncaught JavaScript exceptions.
*   Relevant script execution errors.

**Formatting Rules:**
1.  Each message must include a severity indicator and readable text. A timestamp or source location may be included where available.
2.  The console must distinguish informational output, warnings, and errors visually.
3.  The parent page must receive preview messages through a controlled `postMessage` interface. Messages must be validated before being rendered.
4.  Console output must be inserted as text, not interpreted as HTML.

--- 

### FR-06: Manual Light and Dark Themes
Provide an explicit theme toggle in the application toolbar. The toggle must switch between light and dark themes without reloading the page or resetting code.

#### Requirements:

* Theme selection is controlled by the user.
* The initial theme is light unless the product configuration explicitly specifies otherwise.
* The selected theme applies to the application shell, editors, toolbars, buttons, borders, console, and surrounding interface.
* The preview displays the user's code without automatically forcing the application's theme onto the rendered page.
* The toggle exposes its current state accessibly.
* Theme changes must not affect source content or execution.
* Because persistence is not required, the theme may reset to the default when the page is reloaded.

--- 

### FR-07: Responsive Layout

* On desktop, display the editor workspace and preview side by side.
* The editor workspace should contain the three language panels, arranged either horizontally or vertically depending on available space.
* On narrower screens:
  * Stack the editor workspace and preview vertically.
  * Allow users to select which editor is visible.
  * Keep Run, theme, and primary navigation controls accessible.
  * Avoid horizontal page overflow.
  * Ensure controls remain usable with touch input.
* A CSS resize handle or equivalent accessible control should allow the user to adjust the editor-to-preview ratio on desktop.

---

### FR-08: Import and Export

The application must support importing and exporting source code.

* Export:
    * Generate a standalone HTML file containing the current HTML, CSS, and JavaScript.
    * Provide a download action.
    * Include the CSS and JavaScript in the exported document.
    * Do not include the playground's own interface unless explicitly requested.

* Import:
    * Allow users to select a local HTML file.
    * Read the file in the browser.
    * Populate the appropriate editor fields.
    * Clearly communicate that imported documents may contain arbitrary executable code.

> **Note:** The initial importer may accept a complete HTML document and extract its body markup, styles, and scripts on a best-effort basis. Extraction must be documented as potentially lossy for complex documents.

---

### FR-09: URL-Based Sharing
This application does not allowed URL sharing. This is a feature that will be implemented later when storage and user accounts are added.

---

### FR-10: No Required Persistence

* The application must not depend on persistent storage.
* Specifically, the initial release must not require:
    * localStorage
    * sessionStorage
    * IndexedDB
    * Cookies
    * Remote databases
    * Authentication services
    * Cloud APIs
* ZERO user data collection
* ZERO cookies
* The application may retain code in memory while the page is open.
* Users must be informed that refreshing or closing the page can discard unsaved work. Export is the only supported methods for retaining or transferring projects.

---

### FR-11: Accessibility

* The interface must:
    * Use semantic HTML elements.
    * Associate form labels with their controls.
    * Provide visible keyboard focus indicators.
    * Use accessible names for icon-only buttons.
    * Maintain readable contrast in both themes.
    * Support keyboard operation of all primary controls.
    * Avoid communicating errors through color alone.
    * Respect reduced-motion preferences.
    * Use appropriate landmarks and heading hierarchy.

---

### FR-12: Browser Compatibility

Support current stable versions of major desktop and mobile browsers, including:

* Chrome
* Firefox
* Safari
* Edge

Features must be tested when opening the file directly using the file:// protocol. If a browser restricts a particular operation, the application must provide a useful explanation and, where possible, a workaround.

--- 

## Non-Functional Requirements

### NFR-01: Performance
* The application shell should load quickly on typical desktop and mobile hardware.
* Editing must remain responsive for small and medium-sized code samples.
* Automatic preview updates must be debounced.
* The parent interface must remain responsive when preview code fails.
* No unnecessary network requests should be made.

### NFR-02: Reliability
* A preview exception must not terminate the parent application.
* Malformed URL data must be handled gracefully.
* Empty source files must be supported.
* Import and export errors must be presented clearly.
* Repeated runs must not accumulate duplicate console handlers or stale preview state.

### NFR-03: Security
* User-authored JavaScript is arbitrary executable code. The preview must therefore be treated as untrusted.
* Execute preview code in a sandboxed iframe.
* Do not grant top-level navigation, downloads, popups, or parent-page access by default.
* Avoid combining allow-scripts and allow-same-origin for a same-origin preview when that combination would defeat the intended sandbox isolation.
* Do not use eval() to execute code in the parent application.
* Validate incoming postMessage payloads.
* Render console content as text.
* Do not execute imported content in the parent document.
* Clearly explain the risks of running untrusted code.
* Some sandbox permissions and browser features may prevent particular examples from working. The application should favor isolation over compatibility with unsafe examples.

### NFR-04: Maintainability
* Separate application logic into clearly named functions.
* Use CSS custom properties for colors and theme values.
* Keep application-specific styles separate from Bulma overrides.
* Avoid unnecessary global variables.
* Avoid inline event handlers in HTML.
* Use consistent naming conventions.
* Document important sandboxing and preview-generation decisions.

---

## Technology Stack
* Markup:               HTML5 
* Styling framework:    Bulma CSS
* Application styling:	Custom CSS and CSS custom properties
* Application logic:    Vanilla JavaScript
* Code editor:	        Bundled CodeMirror preferred; native textareas acceptable for MVP
* Preview:          	Sandboxed iframe
* Communication:	    Validated postMessage messaging
* Export:           	Blob and browser download APIs
* Backend:	            None
* Required persistence:	None
* Build system:     	None

### Third-Party Dependencies
Bulma and any editor library must be embedded into the final HTML file. 
Third-party library versions and licenses must be documented in the source or accompanying project documentation.

--- 

## Visual Design
### Design Direction: 
* The interface should resemble a compact developer workspace rather than a traditional content website.
* The visual style should be:
    * Dark, technical, and restrained.
    * Organized into clear panels.
    * Focused on code readability.
    * Consistent across light and dark themes.
    * Accent-driven, using cinnamon wood for primary actions and active states.
    * Minimal in decorative gradients and unnecessary visual effects.
* Bulma provides the structural foundation. Custom CSS supplies the application-specific colors, editor layout, and theme behavior.
### Required Color Palette
* Use the following supplied colors as the foundation of the visual system.

* `--cinnamon-wood	#B05C3The`      application must not transmit source code to a server. 
* Primary actions, selected states, accent details
* `--saddle-brown	#7F4B31`   Secondary accent, hover states, subdued highlights
* `--jet-black	#1F2B35`       Dark surfaces and interface panels
* `--black	#04080C`	        Deep backgrounds and dark editor surfaces
* `--jet-black-2	#1C272F`	Secondary dark surfaces, cards, panel backgrounds

* Define these values as CSS custom properties.

```css
:root {
  --cinnamon-wood: #B05C33;
  --saddle-brown: #7F4B31;
  --jet-black: #1F2B35;
  --black: #04080C;
  --jet-black-2: #1C272F;
}
```
* Do not use the supplied gradient across the entire application as the default background. The palette should be applied through solid surfaces, borders, text, and restrained accent treatments.

### Dark Theme
* The dark theme should be the most visually distinctive theme. 
    * Application background	--black
    * Main toolbar	            --jet-black
    * Editor and preview panels	--jet-black-2
    * Panel borders	A muted variation of --jet-black
    * Primary button	        --cinnamon-wood
    * Primary button hover	    --saddle-brown
    * Main text	                #F2F4F5
    * Secondary text	        #B5BEC5
    * Muted text	            #89959E
* Code editor syntax colors should be selected for readability and should not depend on the accent color alone.

### Light Theme
* The light theme should use the same accent palette but provide neutral, high-contrast surfaces.
* Suggested assignments:
    * Application background     #F5F6F7         
    * Main toolbar               #FFFFFF         
    * Editor and preview panels  #FFFFFF         
    * Borders                    #D8DEE3         
    * Primary button             --cinnamon-wood 
    * Primary button hover       --saddle-brown  
    * Main text                  #1F2B35         
    * Secondary text             #56616A         
    * Muted text                 #697780         

* The cinnamon accent should be checked for sufficient contrast with its foreground text. Use white or a darker foreground only after verifying the relevant contrast ratio.

### Theme Implementation
* Use a theme attribute on the root element.

```html
<html lang="en" data-theme="light">
```

* The application may switch the attribute to dark when the user activates the theme control.
* Theme styles should be defined through custom properties.

```css
:root,
[data-theme="light"] {
  color-scheme: light;

  --app-background: #F5F6F7;
  --surface-primary: #FFFFFF;
  --surface-secondary: #FFFFFF;
  --text-primary: #1F2B35;
  --text-secondary: #56616A;
  --border-color: #D8DEE3;
  --accent: var(--cinnamon-wood);
  --accent-hover: var(--saddle-brown);
}

[data-theme="dark"] {
  color-scheme: dark;

  --app-background: var(--black);
  --surface-primary: var(--jet-black);
  --surface-secondary: var(--jet-black-2);
  --text-primary: #F2F4F5;
  --text-secondary: #B5BEC5;
  --border-color: #34414B;
  --accent: var(--cinnamon-wood);
  --accent-hover: var(--saddle-brown);
}
```

* These are starting values. Verify all text and interactive states for accessibility before release.
* Do not automatically switch themes in response to operating-system preference changes. Manual selection is the required behavior.

---


## Semantic HTML and DOM Design

### General Rule
* Prefer the most appropriate native HTML element for each purpose.
* Do not introduce generic `<div>` elements when a semantic element or a suitable existing element can represent the same structure without compromising the layout or accessibility.
* Use generic containers only when no appropriate semantic element exists or when a layout wrapper is genuinely necessary.

### Recommended Structure

```html
<body>
  <header class="app-header">
    <nav class="navbar" aria-label="Main navigation">
      <!-- Application identity and primary actions -->
    </nav>
  </header>

  <main class="playground">
    <section class="editor-workspace" aria-label="Code editors">
      <article class="editor-panel">
        <header class="editor-panel-header">
          <h2>HTML</h2>
        </header>
        <textarea aria-label="HTML source"></textarea>
      </article>

      <article class="editor-panel">
        <header class="editor-panel-header">
          <h2>CSS</h2>
        </header>
        <textarea aria-label="CSS source"></textarea>
      </article>

      <article class="editor-panel">
        <header class="editor-panel-header">
          <h2>JavaScript</h2>
        </header>
        <textarea aria-label="JavaScript source"></textarea>
      </article>
    </section>

    <section class="preview-workspace" aria-label="Preview">
      <header class="preview-header">
        <h2>Preview</h2>
        <button type="button">Run</button>
      </header>

      <iframe
        title="Code preview"
        sandbox="allow-scripts"
      ></iframe>

      <details class="console-panel">
        <summary>Console</summary>
        <output aria-live="polite"></output>
      </details>
    </section>
  </main>

  <footer class="app-footer">
    <!-- Version or concise usage information -->
  </footer>
</body>
```
* This is a structural example, not a complete implementation. The actual application may need additional controls and wrappers.

### Semantic Element Guidelines
Element	Appropriate use:
* `<header>`    Application or panel heading
* `<nav>`   	Navigation or clearly grouped navigation actions
* `<main>`  	Primary application content
* `<section>`   Editor workspace, preview workspace, settings groups
* `<article>`   An independently meaningful editor panel, if appropriate
* `<h1>`   <h3>	Application and panel headings
* `<button>`    Actions such as Run, Reset, theme toggle
* `<label>` 	Form and input labels
* `<textarea>`  Native source editor fallback
* `<iframe>`    Isolated rendered preview
* `<output>`    Computed or generated status/output
* `<details>    Expandable console or secondary information
* <summary>`    Expandable console or secondary information
* `<footer>`    Application footer or panel footer
* `<fieldset>`  Related settings controls 
* <legend>	    Related settings controls
* `<progress>`  Actual progress reporting when needed

* Semantic correctness takes precedence over choosing an element solely for its default styling.
* Do not use `<article>` simply because it looks like a card. Use it when the content is independently meaningful. Likewise, do not use `<output>` as a general-purpose container if another element is more appropriate.

###  Bulma and Semantic HTML

* Bulma classes should be added to semantic elements whenever possible.
* **Examples**:
    * `.navbar` on `<nav>`.
    * `.button` on `<button>`.
    * `.field` and .control on appropriate form structures.
    * `.columns` and .column on layout wrappers when needed.
    * `.panel` where its expected structure is appropriate.

* Bulma's layout system may require some wrapper elements. These wrappers are acceptable when necessary for layout or framework compatibility.

---


## Application Layout
### Desktop Layout
* The desktop application should contain:
    * Application toolbar.
    * Editor workspace.
    * Preview workspace.
    * Optional console panel.
    * Minimal footer or status line.
* The toolbar should include:
    * Application name.
    * Run button.
    * Automatic preview toggle.
    * Theme toggle.
    * Import control.
    * Export control.
    * Share-link action.
* The editor and preview areas should occupy most of the available viewport height.

### Editor Workspace
* Each editor panel should have:
    * A language label.
    * An optional language icon.
    * A clear or reset action, if provided.
    * A visible editing area.
    * An optional line-number gutter when supported by the editor library.
* Avoid unnecessary panel chrome. The source area should be the primary visual focus.

### Preview Workspace
* The preview panel should include:
    * Preview heading.
    * Refresh or Run action.
    * Optional viewport-size controls.
    * Rendered iframe.
    * Expandable console.
* The preview must have a neutral background so that the rendered project remains visually distinct from the application shell.

### Responsive Behavior
* At desktop widths, use a side-by-side editor/preview arrangement where practical.
* At tablet widths, reduce the number of visible editor panels or permit tabbed editor selection.
* At mobile widths, stack the workspace sections and use editor selection controls to avoid three simultaneously visible, narrow textareas.
* Use CSS Grid or Flexbox for the main application layout. Bulma may provide supporting columns and responsive utilities.

---

##  Interaction Design
### Run Workflow
* The user edits source code.
* The user presses Run, or automatic preview is triggered.
* The application collects the current source values.
* The application constructs a preview document.
* The preview iframe receives the new document.
* Console output and runtime errors are relayed to the parent.
* The preview reflects the current version of the code.

### Theme Workflow
* The user activates the theme toggle.
* The application changes the root theme attribute.
* Theme-related CSS custom properties update.
* The application remains in the current editing state.
* The toggle must expose an accessible label, such as "Switch to dark mode" or "Switch to light mode."

### Import Workflow
* The user selects Import.
* The user chooses a local HTML file.
* The application reads the file locally.
* The importer attempts to extract HTML, CSS, and JavaScript.
* The application warns if extraction is incomplete.
* The editors are populated only after the import operation succeeds.
* The importer must never insert imported executable content into the application's own document.

### Export Workflow
* The user selects Export.
* The application builds a complete HTML document.
* CSS and JavaScript are embedded in the generated file.
* The browser downloads the generated file.
* The exported document should be usable independently of the playground.

### Error Handling
* Errors must be displayed without blocking continued editing.
* **Examples include:**
    * Invalid project URL.
    * Unsupported import format.
    * Failed file read.
    * URL exceeds the configured sharing limit.
    * Preview script exception.
    * Preview initialization failure.
* Use readable messages and allow the user to dismiss or clear them where appropriate.

---

## Implementation Architecture
### Application Modules
* Organize the JavaScript into logical modules or clearly separated functions.
* **Editor management**
    * Read and update source code.
    * Manage editor instances.
    * Handle automatic preview scheduling.
    * Coordinate editor tabs on narrow screens.
* **Preview management**
    * Construct the preview document.
    * Update the iframe.
    * Manage execution state.
    * Handle preview errors.
* **Console management**
    * Receive preview messages.
    * Validate message types and payloads.
    * Render log entries safely.
    * Clear the console.
* **Theme management**
    * Toggle the root theme attribute.
    * Update accessible control labels.
    * Keep theme behavior independent of source execution.
* **Project import/export**
    * Read imported files.
    * Extract source code on a best-effort basis.
    * Generate standalone HTML.
    * Download exported documents.
* **Sharing**
    * Serialize project source.
    * Encode and decode URL fragments.
    * Enforce length limits.
    * Handle malformed data.

### Preview Document Construction
* The preview generator should produce a complete HTML document with the following conceptual order:
* **Document type and root element**.
    * Head metadata.
    * Embedded user CSS.
    * User HTML content.
    * Console bridge.
    * User JavaScript.
* The actual implementation must ensure that the console bridge is installed before user JavaScript executes.
* Because source snippets may contain document-level markup, imports, or scripts, the generator must document its supported input format. It should not claim to perfectly reproduce a full browser document when source extraction or rewriting changes its semantics.

### Console Messaging
* Use a small message protocol between the iframe and parent window.
* **Every message should include:**
    * A recognizable message type.
    * A payload containing the log level and serialized arguments, or an error description.
    * A bounded message size.
* Validate message origin and source wherever the browser environment provides useful information. Since sandboxed frames without allow-same-origin have an opaque origin, do not rely on a fixed origin string as the only validation mechanism. Validate the expected iframe window reference and protocol shape, and keep the preview sandboxed.
* Avoid serializing arbitrary objects without limits. Large or circular objects must not freeze the parent interface.

### Preview Isolation
* The preview is an execution environment for untrusted source code.
* Use the minimum iframe sandbox permissions required for basic HTML/CSS/JavaScript rendering.
* Do not grant additional permissions merely to make more examples work. If a future feature requires network access, forms, popups, downloads, or other capabilities, document the risk and evaluate it separately. 
* Sandboxing is a defense-in-depth measure, not a guarantee that arbitrary user code is harmless.


## Testing and Acceptance
### Functional Tests
* Each editor accepts and retains source independently.
* Run renders HTML and CSS correctly.
* JavaScript executes in the preview.
* Runtime exceptions appear in the console.
* Console clearing removes previous entries.
* Automatic preview can be enabled and disabled.
* Light/dark mode switching works without losing code.
* Import populates the editors when extraction succeeds.
* Export generates a usable standalone HTML file.
* URL sharing restores supported projects.
* Invalid URL data produces an understandable error.
* Reset requires confirmation before discarding code.

### Responsive Tests
* Desktop layout uses available space efficiently.
* Tablet layout remains readable and usable.
* Mobile layout does not force three narrow editors onto one row.
* Preview remains accessible on small screens.
* Buttons and inputs remain operable with touch.
* The page does not exhibit unintended horizontal scrolling.
### Accessibility Tests
* All controls have accessible names.
* Keyboard focus is visible.
* The primary workflow is usable without a mouse.
* Text contrast is checked in both themes.
* Errors are announced appropriately without excessive live-region chatter.
* Editor selection and theme state are communicated accessibly.
### Security Tests
* A script error does not crash the parent interface.
* Preview code cannot directly manipulate the parent document.
* Console messages are rendered as text.
* Malformed messages are ignored safely.
* Large console payloads do not freeze the interface.
* Imported HTML is never directly executed in the parent document.
* Sandbox permissions remain minimal.
### Offline Tests
* Open the file with the network disconnected.
* Verify the application shell and editor load.
* Verify Run and preview behavior.
* Verify theme switching.
* Verify local import and export where supported.
* Confirm that no required assets are fetched from a CDN.

---

## Delivery Plan
### Phase 1: Core Playground
* Standalone HTML structure.
* Bulma integration.
* Three source editors.
* Run button.
* Sandboxed preview.
* Basic error reporting.
* Manual light/dark theme toggle.
### Phase 2: Editing Experience
* Bundled syntax-highlighting editor.
* Responsive panel layout.
* Automatic preview mode.
* Resizable workspace.
* Console output and clear action.
### Phase 3: Project Portability
* Standalone HTML export.
* Local HTML import.
* URL-based sharing.
* Malformed input and size-limit handling.
### Phase 4: Polish and Validation
* Accessibility review.
* Contrast review.
* Browser compatibility tests.
* Offline tests.
* Security review.
* Performance improvements.
* A working MVP should prioritize reliable editing and isolated preview execution over advanced features.

---

## Definition of Done
The initial release is complete when:
* The application is available as one HTML file.
* It uses Bulma CSS and semantic HTML.
* It uses the supplied color palette.
* Users can manually switch between light and dark themes.
* HTML, CSS, and JavaScript can be edited independently.
* Code can be executed in an isolated preview.
* Console output and execution errors are presented clearly.
* Import and export work for supported project formats.
* URL sharing works within documented size limits.
* No backend or persistent storage is required.
* Core functionality works offline.
* The interface is responsive and keyboard accessible.
* The primary acceptance and security tests pass.

---

## Future Enhancements
* The following features are explicitly outside the initial release:
    * Persistent browser-local project saving.
    * Multiple named projects.
    * Project history and undo across runs.
    * Code formatting.
    * Responsive device presets.
    * External library dependency management.
    * Markdown preview.
    * Additional languages or preprocessors.
    * Collaboration and cloud storage.
    * User accounts and public project galleries.
    * URL Sharing of code snippets
* Future enhancements must preserve the standalone deployment model unless a change in project scope explicitly permits external services.

---

##  Final Design Decision
* The application will be implemented as 4 file app, client-side playground using HTML5, Bulma CSS, vanilla JavaScript, and an isolated iframe preview.
* Semantic HTML will be preferred over unnecessary generic containers. The supplied cinnamon wood, saddle brown, and dark blue-black palette will define the application's visual identity. Light and dark themes will be manually controlled by the user.
* No server, database, or persistent storage is required. Project retention and sharing will be handled through local file export
* The priority is a fast, accessible, visually cohesive, secure-by-default editing experience