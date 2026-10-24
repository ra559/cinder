/* ==========================================================================
   Cinder — application logic (vanilla JavaScript, no build step)

   Security and reliability decisions are documented next to the code that
   implements them. The short version:

   * User code never runs in this document. It runs only inside an <iframe>
     with sandbox="allow-scripts" (no allow-same-origin), so it cannot touch
     the playground, read its storage, or navigate the top-level page.
   * The parent accepts console messages only from the current preview frame,
     only on our channel, and only with a bounded, whitelisted shape.
   * The console bridge is installed before user HTML and JavaScript execute,
     and renders every value with textContent in the parent.
   * No cookies, localStorage, sessionStorage, IndexedDB or network requests.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     Constants
     ------------------------------------------------------------------------ */
  var APP_VERSION = '1.0.0';
  var PREVIEW_CHANNEL = 'cinder:preview:1';
  var AUTO_RUN_DELAY = 700;
  var MIN_SPLIT = 32;
  var MAX_SPLIT = 74;
  var DEFAULT_SPLIT = 56;
  var MAX_IMPORT_BYTES = 2 * 1024 * 1024;
  var MAX_CONSOLE_ENTRIES = 250;
  var MAX_CONSOLE_TEXT = 4000;
  var MESSAGE_BUDGET = 120;
  var LANGUAGES = ['html', 'css', 'js'];
  var LOG_LEVELS = ['log', 'info', 'warn', 'error', 'debug'];
  var LOG_LABELS = { log: 'Log', info: 'Info', warn: 'Warn', error: 'Error', debug: 'Debug' };

  var EDITOR_META = {
    html: { mode: 'htmlmixed', label: 'HTML', heading: 'html-heading' },
    css: { mode: 'css', label: 'CSS', heading: 'css-heading' },
    js: { mode: 'javascript', label: 'JavaScript', heading: 'js-heading' }
  };

  /* The initial example project. Reset restores these exact strings. */
  var DEFAULT_HTML = [
    '<main class="demo">',
    '  <p class="eyebrow">Cinder playground</p>',
    '  <h1>Make something<br><em>small</em> and bright.</h1>',
    '  <p class="lede">',
    '    This page is rendered in a sandboxed iframe. Edit the HTML, CSS and',
    '    JavaScript editors, then press <strong>Run</strong> — or leave auto-run on.',
    '  </p>',
    '',
    '  <button class="spark" type="button" data-spark>',
    '    <span aria-hidden="true">✦</span>',
    '    Spark something',
    '  </button>',
    '',
    '  <p class="count" aria-live="polite">',
    '    Sparks released: <strong data-count>0</strong>',
    '  </p>',
    '</main>'
  ].join('\n');

  var DEFAULT_CSS = [
    ':root { color-scheme: light; }',
    '* { box-sizing: border-box; }',
    '',
    'body {',
    '  margin: 0;',
    '  min-height: 100vh;',
    '  display: grid;',
    '  place-items: center;',
    '  padding: 32px 20px;',
    '  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;',
    '  color: #2A211C;',
    '  background:',
    '    radial-gradient(circle at 12% 18%, rgba(176, 92, 51, 0.14), transparent 42%),',
    '    radial-gradient(circle at 88% 82%, rgba(127, 75, 49, 0.10), transparent 38%),',
    '    #FFF9F2;',
    '}',
    '',
    '.demo {',
    '  width: min(470px, 100%);',
    '}',
    '',
    '.eyebrow {',
    '  margin: 0 0 14px;',
    '  color: #B05C33;',
    '  font-size: 0.7rem;',
    '  font-weight: 700;',
    '  letter-spacing: 0.16em;',
    '  text-transform: uppercase;',
    '}',
    '',
    'h1 {',
    '  margin: 0 0 16px;',
    '  color: #3B2A20;',
    '  font-family: Georgia, "Times New Roman", serif;',
    '  font-size: clamp(2.05rem, 6vw, 3rem);',
    '  font-weight: 500;',
    '  line-height: 1.04;',
    '  letter-spacing: -0.02em;',
    '}',
    '',
    'h1 em {',
    '  color: #B05C33;',
    '  font-style: italic;',
    '}',
    '',
    '.lede {',
    '  margin: 0 0 26px;',
    '  max-width: 38ch;',
    '  color: #6B5A4E;',
    '  font-size: 0.96rem;',
    '  line-height: 1.65;',
    '}',
    '',
    '.lede strong {',
    '  color: #3B2A20;',
    '}',
    '',
    '.spark {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  gap: 9px;',
    '  padding: 13px 22px;',
    '  border: 0;',
    '  border-radius: 999px;',
    '  background: #B05C33;',
    '  color: #FFF9F2;',
    '  font: inherit;',
    '  font-size: 0.95rem;',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '  box-shadow: 0 10px 26px rgba(176, 92, 51, 0.24);',
    '  transition: background-color 0.16s ease, transform 0.16s ease;',
    '}',
    '',
    '.spark:hover {',
    '  background: #7F4B31;',
    '  transform: translateY(-1px);',
    '}',
    '',
    '.spark:active {',
    '  transform: translateY(0) scale(0.99);',
    '}',
    '',
    '.spark:focus-visible {',
    '  outline: 3px solid #2A211C;',
    '  outline-offset: 3px;',
    '}',
    '',
    '.count {',
    '  margin: 18px 0 0;',
    '  color: #7A675A;',
    '  font-size: 0.82rem;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    '',
    '.count strong {',
    '  color: #B05C33;',
    '}',
    '',
    '.sparkle {',
    '  position: fixed;',
    '  pointer-events: none;',
    '  color: #B05C33;',
    '  font-size: 1rem;',
    '  animation: drift 900ms ease-out forwards;',
    '}',
    '',
    '@keyframes drift {',
    '  from { opacity: 1; transform: translate(0, 0) rotate(0deg); }',
    '  to { opacity: 0; transform: translate(var(--dx, 0px), -110px) rotate(120deg); }',
    '}'
  ].join('\n');

  var DEFAULT_JS = [
    "var button = document.querySelector('[data-spark]');",
    "var counter = document.querySelector('[data-count]');",
    'var sparks = 0;',
    '',
    "button.addEventListener('click', function () {",
    '  sparks += 1;',
    '  counter.textContent = String(sparks);',
    "  console.log('Spark #' + sparks + ' released');",
    '',
    '  if (sparks === 5) {',
    "    console.info('Five sparks. The console is listening.');",
    '  }',
    '',
    '  launchSparkle(button);',
    '});',
    '',
    'function launchSparkle(origin) {',
    '  var rect = origin.getBoundingClientRect();',
    "  var sparkle = document.createElement('span');",
    "  sparkle.className = 'sparkle';",
    "  sparkle.textContent = '✦';",
    "  sparkle.style.left = (rect.left + rect.width / 2) + 'px';",
    "  sparkle.style.top = rect.top + 'px';",
    '  var drift = Math.round(Math.random() * 150 - 75);',
    "  sparkle.style.setProperty('--dx', drift + 'px');",
    '  document.body.appendChild(sparkle);',
    "  sparkle.addEventListener('animationend', function () { sparkle.remove(); });",
    '}'
  ].join('\n');

  var DEFAULT_PROJECT = { html: DEFAULT_HTML, css: DEFAULT_CSS, js: DEFAULT_JS };

  var EMPTY_STATES = {
    empty: {
      title: 'Nothing to preview yet',
      text: 'Write some HTML, CSS or JavaScript, then choose Run.'
    },
    imported: {
      title: 'Imported code is ready',
      text: 'Press Run to execute the imported source in the sandboxed preview.'
    }
  };

  /* ------------------------------------------------------------------------
     DOM references and mutable state
     ------------------------------------------------------------------------ */
  var byId = function (id) { return document.getElementById(id); };

  var els = {
    htmlEditor: byId('html-editor'),
    cssEditor: byId('css-editor'),
    jsEditor: byId('js-editor'),
    autoRunInput: byId('auto-run-input'),
    runButton: byId('run-button'),
    rerunButton: byId('rerun-button'),
    themeButton: byId('theme-button'),
    themeLabel: byId('theme-label'),
    shareButton: byId('share-button'),
    importButton: byId('import-button'),
    importInput: byId('import-input'),
    exportButton: byId('export-button'),
    resetButton: byId('reset-button'),
    clearConsoleButton: byId('clear-console-button'),
    notice: byId('notice'),
    noticeText: byId('notice-text'),
    noticeDismiss: byId('notice-dismiss'),
    liveStatus: byId('live-status'),
    alertStatus: byId('alert-status'),
    main: byId('main'),
    splitHandle: byId('split-handle'),
    runShortcut: byId('run-shortcut'),
    previewStatus: byId('preview-status'),
    previewEmpty: byId('preview-empty'),
    previewEmptyTitle: byId('preview-empty-title'),
    previewEmptyText: byId('preview-empty-text'),
    frameArea: byId('preview-frame-area'),
    consolePanel: byId('console-panel'),
    consoleLog: byId('console-log'),
    consoleCount: byId('console-count'),
    consoleEmpty: byId('console-empty'),
    resetDialog: byId('reset-dialog'),
    importDialog: byId('import-dialog'),
    importFilename: byId('import-filename'),
    importSummary: byId('import-summary'),
    shareDialog: byId('share-dialog'),
    shareExportButton: byId('share-export-button')
  };

  var editors = {};
  var activeLanguage = 'html';
  var currentEditor = 'html';
  var currentFrame = null;
  var autoRunTimer = 0;
  var noticeTimer = 0;
  var announceTimer = 0;
  var alertTimer = 0;
  var refreshHandle = 0;
  var suspendChanges = false;
  var dirty = false;
  var messageBudget = MESSAGE_BUDGET;
  var messageWindowStart = Date.now();
  var rateWarningShown = false;
  var runHadError = false;
  var pendingImport = null;
  var consoleCounts = { log: 0, info: 0, warn: 0, error: 0, debug: 0 };
  var dialogSupported = typeof HTMLDialogElement === 'function' &&
    typeof document.createElement('dialog').showModal === 'function';

  var compactQuery = window.matchMedia ? window.matchMedia('(max-width: 1023px)') : null;

  /* ------------------------------------------------------------------------
     Small utilities
     ------------------------------------------------------------------------ */
  function clockTime() {
    var now = new Date();
    try {
      return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (error) {
      return now.toTimeString().slice(0, 8);
    }
  }

  function setStatus(state, text) {
    els.previewStatus.dataset.state = state;
    els.previewStatus.textContent = text;
  }

  function announce(message) {
    if (!els.liveStatus) return;
    var text = String(message || '').slice(0, 260);
    els.liveStatus.textContent = '';
    window.clearTimeout(announceTimer);
    announceTimer = window.setTimeout(function () {
      els.liveStatus.textContent = text;
    }, 60);
  }

  function raiseAlert(message) {
    if (!els.alertStatus) return;
    var text = String(message || '').slice(0, 320);
    els.alertStatus.textContent = '';
    window.clearTimeout(alertTimer);
    alertTimer = window.setTimeout(function () {
      els.alertStatus.textContent = text;
    }, 60);
  }

  function showNotice(message, kind) {
    if (!els.notice) return;
    var type = kind || 'info';
    window.clearTimeout(noticeTimer);
    els.notice.hidden = false;
    els.notice.className = 'app-notice app-notice--' + type;
    els.noticeText.textContent = message;

    if (type === 'error') {
      raiseAlert('Error: ' + message);
    } else {
      announce(message);
    }

    if (type !== 'error') {
      noticeTimer = window.setTimeout(hideNotice, 9000);
    }
  }

  function hideNotice() {
    window.clearTimeout(noticeTimer);
    if (els.notice) els.notice.hidden = true;
  }

  function plural(count, singular) {
    return count + ' ' + singular + (count === 1 ? '' : 's');
  }

  function formatBytes(bytes) {
    if (!bytes || bytes < 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function firstLine(text) {
    return String(text || '').split('\n')[0].slice(0, 160);
  }

  function escapeClosingTag(source, tag) {
    /* Inside a CSS string or JS string/regex, "<\/style" is equivalent to
       "</style" but cannot terminate the enclosing element. This is the only
       transformation applied to user source when building the preview. */
    return String(source || '').replace(new RegExp('</' + tag, 'gi'), '<\\/' + tag);
  }

  function scheduleEditorRefresh() {
    if (refreshHandle) return;
    refreshHandle = window.requestAnimationFrame(function () {
      refreshHandle = 0;
      LANGUAGES.forEach(function (lang) {
        if (editors[lang] && editors[lang].refresh) {
          try { editors[lang].refresh(); } catch (error) { /* not visible yet */ }
        }
      });
    });
  }

  function cancelAutoRun() {
    window.clearTimeout(autoRunTimer);
    autoRunTimer = 0;
  }

  function autoRunEnabled() {
    return Boolean(els.autoRunInput && els.autoRunInput.checked);
  }

  /* ------------------------------------------------------------------------
     Theme management — explicit and independent of source execution
     ------------------------------------------------------------------------ */
  function setTheme(theme, shouldAnnounce) {
    var next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);

    var action = next === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
    if (els.themeButton) {
      els.themeButton.setAttribute('aria-label', action + '. Current theme: ' + next + '.');
      els.themeButton.setAttribute('title', action);
    }
    if (els.themeLabel) {
      els.themeLabel.textContent = next === 'light' ? 'Light' : 'Dark';
    }
    if (shouldAnnounce) {
      announce(next === 'dark' ? 'Dark theme enabled.' : 'Light theme enabled.');
    }
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark', true);
  }

  /* ------------------------------------------------------------------------
     Editor adapters
     ------------------------------------------------------------------------ */
  function insertSoftTab(cm) {
    /* CodeMirror 5's built-in Tab inserts a literal tab character. Insert the
       configured indent unit instead, and indent whole lines when a selection
       is active. */
    if (cm.somethingSelected()) {
      cm.indentSelection('add');
      return;
    }
    var unit = cm.getOption('indentUnit') || 2;
    var spaces = '';
    for (var i = 0; i < unit; i += 1) spaces += ' ';
    cm.replaceSelection(spaces);
  }

  function makeAdapter(lang) {
    var textarea = els[lang + 'Editor'];
    var meta = EDITOR_META[lang];
    var cm = null;

    if (window.CodeMirror && typeof window.CodeMirror.fromTextArea === 'function') {
      try {
        cm = window.CodeMirror.fromTextArea(textarea, {
          mode: meta.mode,
          theme: 'cinder',
          lineNumbers: true,
          lineWrapping: false,
          indentUnit: 2,
          tabSize: 2,
          indentWithTabs: false,
          smartIndent: true,
          autoCloseBrackets: true,
          matchBrackets: true,
          styleActiveLine: true,
          spellcheck: false,
          autocorrect: false,
          autocapitalize: false,
          viewportMargin: 20,
          extraKeys: {
            'Tab': insertSoftTab,
            'Shift-Tab': 'indentLess'
          }
        });

        cm.on('change', function () {
          if (suspendChanges) return;
          onSourceChanged(lang);
        });
        cm.on('focus', function () {
          setActivePanel(lang);
        });

        var input = cm.getInputField();
        if (input) {
          input.setAttribute('aria-labelledby', meta.heading);
          input.setAttribute('aria-describedby', 'editor-hint');
          input.setAttribute('autocorrect', 'off');
          input.setAttribute('autocapitalize', 'off');
          input.setAttribute('spellcheck', 'false');
        }

        return {
          getValue: function () { return cm.getValue(); },
          setValue: function (value) { cm.setValue(value); },
          replaceAll: function (value) {
            cm.operation(function () {
              cm.replaceRange(value,
                { line: 0, ch: 0 },
                { line: cm.lastLine(), ch: cm.getLine(cm.lastLine()).length });
            });
          },
          focus: function () { cm.focus(); },
          refresh: function () { cm.refresh(); },
          getCursor: function () { return cm.getCursor(); },
          setCursor: function (pos) { cm.setCursor(pos); },
          lineCount: function () { return cm.lineCount(); }
        };
      } catch (error) {
        var stale = textarea.nextElementSibling;
        if (stale && stale.classList && stale.classList.contains('CodeMirror')) {
          stale.parentNode.removeChild(stale);
        }
        if (textarea.style) textarea.style.display = '';
      }
    }

    /* Fallback: a plain textarea still edits, tabs and exports correctly. */
    document.documentElement.classList.add('no-codemirror');

    textarea.addEventListener('input', function () { onSourceChanged(lang); });
    textarea.addEventListener('focus', function () { setActivePanel(lang); });
    textarea.addEventListener('keydown', function (event) {
      handleFallbackTab(textarea, event);
    });

    return {
      getValue: function () { return textarea.value; },
      setValue: function (value) { textarea.value = value; },
      replaceAll: function (value) { textarea.value = value; },
      focus: function () { textarea.focus(); },
      refresh: function () {},
      getCursor: function () { return null; },
      setCursor: function () {},
      lineCount: function () { return textarea.value.split('\n').length; }
    };
  }

  function handleFallbackTab(textarea, event) {
    if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();

    var value = textarea.value;
    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;

    if (start === end && !event.shiftKey) {
      textarea.setRangeText('  ', start, end, 'end');
    } else if (start === end && event.shiftKey) {
      var lineStart = value.lastIndexOf('\n', start - 1) + 1;
      var leading = value.slice(lineStart, lineStart + 2);
      var remove = leading === '  ' ? 2 : (leading.charAt(0) === ' ' ? 1 : 0);
      if (remove) textarea.setRangeText('', lineStart, lineStart + remove, 'preserve');
    } else {
      var selected = value.slice(start, end);
      var changed = selected.split('\n').map(function (line) {
        if (event.shiftKey) return line.replace(/^ {1,2}/, '');
        return '  ' + line;
      }).join('\n');
      textarea.setRangeText(changed, start, end, 'select');
    }

    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function initEditors() {
    /* Seed the textareas first so the no-JS fallback and CodeMirror agree. */
    els.htmlEditor.value = DEFAULT_PROJECT.html;
    els.cssEditor.value = DEFAULT_PROJECT.css;
    els.jsEditor.value = DEFAULT_PROJECT.js;

    LANGUAGES.forEach(function (lang) {
      editors[lang] = makeAdapter(lang);
    });
  }

  function readProject() {
    return {
      html: editors.html.getValue(),
      css: editors.css.getValue(),
      js: editors.js.getValue()
    };
  }

  function setProject(project) {
    suspendChanges = true;
    try {
      LANGUAGES.forEach(function (lang) {
        editors[lang].setValue(project[lang] || '');
      });
    } finally {
      suspendChanges = false;
    }
  }

  function isProjectEmpty(project) {
    return !project.html.trim() && !project.css.trim() && !project.js.trim();
  }

  function onSourceChanged(lang) {
    activeLanguage = lang;
    dirty = true;

    if (autoRunEnabled()) {
      setStatus('dirty', 'Changes pending…');
      cancelAutoRun();
      autoRunTimer = window.setTimeout(function () {
        autoRunTimer = 0;
        runPreview({ cause: 'auto' });
      }, AUTO_RUN_DELAY);
    } else {
      setStatus('ready', 'Press Run to update');
    }
  }

  function setActivePanel(lang) {
    if (LANGUAGES.indexOf(lang) === -1) lang = 'html';
    activeLanguage = lang;
    currentEditor = lang;

    var panels = document.querySelectorAll('.editor-panel');
    Array.prototype.forEach.call(panels, function (panel) {
      var isCurrent = panel.getAttribute('data-panel') === lang;
      panel.classList.toggle('is-active', isCurrent);
      if (compactQuery && compactQuery.matches) {
        panel.classList.toggle('is-current', isCurrent);
      }
    });

    var radio = document.querySelector('input[name="visible-editor"][value="' + lang + '"]');
    if (radio && !radio.checked) radio.checked = true;

    if (compactQuery && compactQuery.matches) scheduleEditorRefresh();
  }

  function initEditorSwitcher() {
    document.querySelectorAll('input[name="visible-editor"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (radio.checked) setActivePanel(radio.value);
      });
    });

    function applyCompactState() {
      var panels = document.querySelectorAll('.editor-panel');
      Array.prototype.forEach.call(panels, function (panel) {
        panel.classList.toggle('is-current', panel.getAttribute('data-panel') === currentEditor);
      });
      scheduleEditorRefresh();
    }

    if (compactQuery) {
      if (typeof compactQuery.addEventListener === 'function') {
        compactQuery.addEventListener('change', applyCompactState);
      } else if (typeof compactQuery.addListener === 'function') {
        compactQuery.addListener(applyCompactState);
      }
    }

    setActivePanel('html');
  }

  /* ------------------------------------------------------------------------
     Preview document construction

     Supported source format: the HTML editor is treated as body markup (a
     fragment), not as a complete document. Document-level tags that a user
     types there are passed through and normalised by the browser, but head
     content and the page title are supplied here. Import performs the inverse
     transformation on a best-effort basis.

     Order matters: the console bridge is placed in <head> before user CSS and
     markup so console calls and errors from inline HTML scripts are captured
     too. The JS editor is appended last so the DOM exists when it runs.
     ------------------------------------------------------------------------ */
  function buildDocument(project, options) {
    var isPreview = Boolean(options && options.preview);
    var includeBridge = Boolean(options && options.includeBridge);
    var css = escapeClosingTag(project.css, 'style');
    var js = escapeClosingTag(project.js, 'script');
    var bridge = '';

    if (includeBridge) {
      bridge = '<script>\n(' + previewRuntime.toString() + ')();\n</script>';
    }

    var lines = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      '<title>' + (isPreview ? 'Cinder preview' : 'Cinder project') + '</title>',
      bridge,
      '<style>',
      css,
      '</style>',
      '</head>',
      '<body>',
      project.html,
      js.trim() ? '<script>\n' + js + '\n</script>' : '',
      '</body>',
      '</html>',
      ''
    ];

    return lines.join('\n');
  }

  function buildPreviewDocument(project) {
    return buildDocument(project, { preview: true, includeBridge: true });
  }

  function buildStandaloneDocument(project) {
    return buildDocument(project, { preview: false, includeBridge: false });
  }

  /* ------------------------------------------------------------------------
     Console bridge — runs inside the sandboxed iframe only.
     This function is serialised with toString(), so it must not reference
     anything from the parent scope and must stay self-contained.
     ------------------------------------------------------------------------ */
  function previewRuntime() {
    'use strict';

    var CHANNEL = 'cinder:preview:1';
    var MAX_TEXT = 4000;
    var MAX_DEPTH = 3;
    var BUDGET = 80;
    var budget = BUDGET;
    var budgetStart = Date.now();
    var throttleNotified = false;

    function post(payload) {
      try {
        payload.channel = CHANNEL;
        window.parent.postMessage(payload, '*');
      } catch (error) {
        /* The parent may have navigated away, or a value could not be cloned. */
      }
    }

    function truncate(text) {
      text = String(text == null ? '' : text);
      if (text.length > MAX_TEXT) {
        text = text.slice(0, MAX_TEXT) + '\n… [truncated]';
      }
      return text;
    }

    function send(level, text) {
      var now = Date.now();
      if (now - budgetStart > 1000) {
        budgetStart = now;
        budget = BUDGET;
        throttleNotified = false;
      }
      if (budget <= 0) {
        if (!throttleNotified) {
          throttleNotified = true;
          post({
            type: 'console',
            level: 'warn',
            text: 'Console output was throttled. This preview is producing messages too quickly.'
          });
        }
        return;
      }
      budget -= 1;
      post({ type: 'console', level: level, text: truncate(text) });
    }

    function safeKey(key) {
      return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
    }

    function describe(value, depth, ancestors) {
      var type = typeof value;

      try {
        if (value === null) return 'null';
        if (type === 'undefined') return 'undefined';
        if (type === 'string') {
          if (depth === 0) {
            return value.length > 600 ? value.slice(0, 600) + '…' : value;
          }
          return JSON.stringify(value.length > 220 ? value.slice(0, 220) + '…' : value);
        }
        if (type === 'number') {
          return (value === 0 && 1 / value === -Infinity) ? '-0' : String(value);
        }
        if (type === 'bigint') return String(value) + 'n';
        if (type === 'boolean') return String(value);
        if (type === 'symbol') return String(value);
        if (type === 'function') return '[Function ' + (value.name || 'anonymous') + ']';
        if (type !== 'object') return String(value);
      } catch (primitiveError) {
        return '[unprintable]';
      }

      if (ancestors.indexOf(value) !== -1) return '[Circular]';

      try {
        if (value instanceof Error) {
          var stack = value.stack ? String(value.stack).split('\n').slice(0, 5).join('\n') : '';
          return value.name + ': ' + value.message + (stack ? '\n' + stack : '');
        }

        if (typeof Node !== 'undefined' && value instanceof Node) {
          if (value.nodeType === 1) {
            var tag = String(value.tagName).toLowerCase();
            var label = '<' + tag;
            if (value.id) label += '#' + value.id;
            if (value.classList && value.classList.length) {
              label += '.' + Array.prototype.slice.call(value.classList, 0, 3).join('.');
            }
            return label + '>';
          }
          if (value.nodeType === 3) {
            return '#text "' + String(value.nodeValue || '').slice(0, 80) + '"';
          }
          return '[Node]';
        }

        if (value instanceof Date) {
          return isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString();
        }
        if (value instanceof RegExp) return String(value);

        if (typeof Map !== 'undefined' && value instanceof Map) {
          var mapParts = [];
          value.forEach(function (mapValue, mapKey) {
            if (mapParts.length < 20) {
              mapParts.push(
                describe(mapKey, depth + 1, ancestors.concat([value])) + ' => ' +
                describe(mapValue, depth + 1, ancestors.concat([value]))
              );
            }
          });
          return 'Map(' + value.size + ') {' + mapParts.join(', ') +
            (value.size > 20 ? ', …' : '') + '}';
        }

        if (typeof Set !== 'undefined' && value instanceof Set) {
          var setParts = [];
          value.forEach(function (item) {
            if (setParts.length < 20) {
              setParts.push(describe(item, depth + 1, ancestors.concat([value])));
            }
          });
          return 'Set(' + value.size + ') {' + setParts.join(', ') +
            (value.size > 20 ? ', …' : '') + '}';
        }

        if (Array.isArray(value)) {
          if (depth >= MAX_DEPTH) return '[Array(' + value.length + ')]';
          var items = [];
          var max = Math.min(value.length, 40);
          var index;
          for (index = 0; index < max; index += 1) {
            items.push(describe(value[index], depth + 1, ancestors.concat([value])));
          }
          return '[' + items.join(', ') +
            (value.length > max ? ', … ' + (value.length - max) + ' more' : '') + ']';
        }

        if (depth >= MAX_DEPTH) return '{…}';

        var keys;
        try {
          keys = Object.keys(value);
        } catch (keysError) {
          return '{…}';
        }

        var parts = [];
        var limit = Math.min(keys.length, 25);
        var i;
        for (i = 0; i < limit; i += 1) {
          var key = keys[i];
          var child;
          try {
            child = value[key];
          } catch (getterError) {
            child = '[Getter threw]';
          }
          parts.push(safeKey(key) + ': ' + describe(child, depth + 1, ancestors.concat([value])));
        }

        var prefix = '';
        try {
          var ctor = value.constructor && value.constructor.name;
          if (ctor && ctor !== 'Object') prefix = ctor + ' ';
        } catch (constructorError) { /* ignore */ }

        return prefix + '{' + parts.join(', ') + (keys.length > limit ? ', …' : '') + '}';
      } catch (objectError) {
        return '[unprintable]';
      }
    }

    function describeAll(args) {
      var parts = [];
      var i;
      for (i = 0; i < args.length; i += 1) {
        parts.push(describe(args[i], 0, []));
      }
      return parts.join(' ');
    }

    var consoleObject = window.console || (window.console = {});
    var levels = ['log', 'info', 'warn', 'error', 'debug'];
    var levelIndex;

    for (levelIndex = 0; levelIndex < levels.length; levelIndex += 1) {
      (function (level) {
        var original = consoleObject[level];
        consoleObject[level] = function () {
          send(level, describeAll(arguments));
          if (typeof original === 'function') {
            try { original.apply(consoleObject, arguments); } catch (error) { /* ignore */ }
          }
        };
      }(levels[levelIndex]));
    }

    var originalClear = consoleObject.clear;
    consoleObject.clear = function () {
      post({ type: 'clear' });
      if (typeof originalClear === 'function') {
        try { originalClear.call(consoleObject); } catch (error) { /* ignore */ }
      }
    };

    function modalBlocked(name, args, fallbackDescription) {
      var payload = args.length ? describeAll(args) : 'no message';
      send('warn', name + '(' + payload + ') — modal dialogs are blocked in the sandboxed preview. ' + fallbackDescription);
    }

    window.alert = function () {
      modalBlocked('alert', arguments, 'Nothing was shown.');
    };
    window.confirm = function () {
      modalBlocked('confirm', arguments, 'Returning false.');
      return false;
    };
    window.prompt = function () {
      modalBlocked('prompt', arguments, 'Returning null.');
      return null;
    };

    /* Capture resource failures as well as uncaught script errors. */
    window.addEventListener('error', function (event) {
      var target = event ? event.target : null;
      if (target && target !== window && target.nodeType === 1) {
        send('warn', 'Resource failed to load: <' + String(target.tagName).toLowerCase() + '>');
        return;
      }

      var message = event && event.message ? String(event.message) : 'Unknown script error';
      var location = '';
      if (event && event.lineno) {
        location = ' (line ' + event.lineno;
        if (event.colno) location += ':' + event.colno;
        location += ')';
      }
      send('error', message + location);
    }, true);

    window.addEventListener('unhandledrejection', function (event) {
      var reason = 'Unknown rejection';
      try {
        if (event && 'reason' in event) reason = event.reason;
      } catch (error) { /* keep the fallback text */ }
      send('error', 'Unhandled promise rejection: ' + describe(reason, 0, []));
    });
  }

  /* ------------------------------------------------------------------------
     Preview management
     ------------------------------------------------------------------------ */
  function resetMessageBudget() {
    messageBudget = MESSAGE_BUDGET;
    messageWindowStart = Date.now();
    rateWarningShown = false;
    runHadError = false;
  }

  function mountPreview(documentHtml, announceOnLoad) {
    var previous = els.frameArea.querySelector('.preview-frame');
    if (previous) previous.remove();

    var frame = document.createElement('iframe');
    frame.className = 'preview-frame';
    frame.id = 'preview-frame';
    frame.title = 'Code preview';
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.setAttribute('aria-describedby', 'preview-sandbox-note');

    currentFrame = frame;

    frame.addEventListener('load', function () {
      if (frame !== currentFrame) return;
      setStatus('live', 'Live · ' + clockTime());
      if (announceOnLoad) announce('Preview updated.');
    });

    try {
      /* Sandbox is set before srcdoc so the document can never start with
         more permissions than intended. */
      frame.srcdoc = documentHtml;
    } catch (error) {
      throw new Error('The preview document could not be assigned to the iframe.');
    }

    els.frameArea.appendChild(frame);
  }

  function disposePreview() {
    if (currentFrame) {
      currentFrame.remove();
      currentFrame = null;
    }
    var stale = els.frameArea.querySelector('.preview-frame');
    if (stale) stale.remove();
  }

  function showEmptyState(kind) {
    var state = EMPTY_STATES[kind] || EMPTY_STATES.empty;
    els.previewEmptyTitle.textContent = state.title;
    els.previewEmptyText.textContent = state.text;
    els.previewEmpty.hidden = false;
  }

  function runPreview(options) {
    var opts = options || {};
    var shouldAnnounce = Boolean(opts.announceUpdate) ||
      opts.cause === 'manual' || opts.cause === 'shortcut';

    cancelAutoRun();
    clearConsole({ announce: false });
    resetMessageBudget();
    dirty = false;

    var project;
    try {
      project = readProject();
    } catch (error) {
      failPreview(error);
      return;
    }

    if (isProjectEmpty(project)) {
      disposePreview();
      showEmptyState('empty');
      setStatus('empty', 'Nothing to preview');
      if (shouldAnnounce) announce('Nothing to preview yet.');
      return;
    }

    els.previewEmpty.hidden = true;
    setStatus('ready', 'Running…');

    var documentHtml;
    try {
      documentHtml = buildPreviewDocument(project);
    } catch (error) {
      failPreview(error);
      return;
    }

    try {
      mountPreview(documentHtml, shouldAnnounce);
    } catch (error) {
      failPreview(error);
    }
  }

  function failPreview(error) {
    appendConsole('error', 'Cinder could not build the preview: ' +
      (error && error.message ? error.message : String(error)));
    setStatus('error', 'Preview failed');
    showNotice('The preview could not be generated. Your source code was not changed.', 'error');
  }

  /* ------------------------------------------------------------------------
     Console rendering (parent side)
     ------------------------------------------------------------------------ */
  function updateConsoleSummary() {
    var total = consoleCounts.log + consoleCounts.info + consoleCounts.warn +
      consoleCounts.error + consoleCounts.debug;
    var text = total === 0 ? 'No messages' : plural(total, 'message');

    if (consoleCounts.error > 0) {
      text += ' · ' + plural(consoleCounts.error, 'error');
    } else if (consoleCounts.warn > 0) {
      text += ' · ' + plural(consoleCounts.warn, 'warning');
    }

    els.consoleCount.textContent = text;
    els.consolePanel.setAttribute('data-has-error', consoleCounts.error > 0 ? 'true' : 'false');
    els.consoleEmpty.hidden = total > 0;
  }

  function appendConsole(level, text) {
    if (LOG_LEVELS.indexOf(level) === -1) level = 'log';

    var log = els.consoleLog;
    var nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 48;

    var entry = document.createElement('li');
    entry.className = 'console-entry console-entry--' + level;
    entry.setAttribute('data-level', level);

    var time = document.createElement('time');
    time.className = 'console-time';
    time.dateTime = new Date().toISOString();
    time.textContent = clockTime();

    var severity = document.createElement('span');
    severity.className = 'console-severity';
    severity.textContent = LOG_LABELS[level] || 'Log';

    /* textContent, never innerHTML: console output is untrusted text. */
    var body = document.createElement('span');
    body.className = 'console-text';
    body.textContent = String(text).slice(0, MAX_CONSOLE_TEXT);

    entry.appendChild(time);
    entry.appendChild(severity);
    entry.appendChild(body);
    log.appendChild(entry);

    consoleCounts[level] += 1;

    while (log.children.length > MAX_CONSOLE_ENTRIES) {
      var removed = log.firstElementChild;
      var removedLevel = removed.getAttribute('data-level');
      if (removedLevel && consoleCounts[removedLevel] > 0) {
        consoleCounts[removedLevel] -= 1;
      }
      log.removeChild(removed);
    }

    updateConsoleSummary();

    if (level === 'error') {
      els.consolePanel.open = true;
      if (!runHadError) {
        runHadError = true;
        announce('Preview error: ' + firstLine(text));
      }
    }

    if (nearBottom || level === 'error') {
      log.scrollTop = log.scrollHeight;
    }
  }

  function clearConsole(options) {
    var opts = options || {};
    while (els.consoleLog.firstChild) {
      els.consoleLog.removeChild(els.consoleLog.firstChild);
    }
    consoleCounts = { log: 0, info: 0, warn: 0, error: 0, debug: 0 };
    runHadError = false;
    updateConsoleSummary();
    if (opts.announce) announce('Console cleared.');
  }

  /* ------------------------------------------------------------------------
     Validated postMessage intake
     ------------------------------------------------------------------------ */
  function onPreviewMessage(event) {
    if (!currentFrame || event.source !== currentFrame.contentWindow) return;

    var data = event.data;
    if (!data || typeof data !== 'object' || data.channel !== PREVIEW_CHANNEL) return;

    /* A sandboxed srcdoc frame has an opaque ("null") origin, so a fixed
       origin string is not a useful trust anchor. The window reference check
       above is the strong check; the protocol shape and size checks below keep
       rendering bounded. */
    if (data.type === 'clear') {
      clearConsole({ announce: false });
      return;
    }

    if (data.type !== 'console') return;
    if (typeof data.text !== 'string') return;
    if (LOG_LEVELS.indexOf(data.level) === -1) return;

    var now = Date.now();
    if (now - messageWindowStart > 1000) {
      messageWindowStart = now;
      messageBudget = MESSAGE_BUDGET;
      rateWarningShown = false;
    }

    if (messageBudget <= 0) {
      if (!rateWarningShown) {
        rateWarningShown = true;
        appendConsole('warn', 'Preview message limit reached. Additional messages are ignored.');
      }
      return;
    }
    messageBudget -= 1;

    appendConsole(data.level, data.text);
  }

  /* ------------------------------------------------------------------------
     Formatting (js-beautify is bundled in index.html)
     ------------------------------------------------------------------------ */
  function formatterFor(lang) {
    if (lang === 'html' && typeof window.html_beautify === 'function') return window.html_beautify;
    if (lang === 'css' && typeof window.css_beautify === 'function') return window.css_beautify;
    if (lang === 'js' && typeof window.js_beautify === 'function') return window.js_beautify;
    return null;
  }

  function formatEditor(lang) {
    var meta = EDITOR_META[lang];
    if (!meta) return;

    setActivePanel(lang);

    var source = editors[lang].getValue();
    if (!source.trim()) {
      showNotice('There is nothing to format in the ' + meta.label + ' editor.', 'info');
      return;
    }
    if (source.length > 500000) {
      showNotice('This source is too large to format safely in the browser.', 'error');
      return;
    }

    var formatter = formatterFor(lang);
    if (!formatter) {
      showNotice('The ' + meta.label + ' formatter is not available in this build.', 'error');
      return;
    }

    var formatted;
    try {
      if (lang === 'html') {
        formatted = formatter(source, {
          indent_size: 2,
          indent_with_tabs: false,
          end_with_newline: true,
          max_preserve_newlines: 2,
          wrap_line_length: 0,
          unformatted: ['pre', 'textarea']
        });
      } else if (lang === 'css') {
        formatted = formatter(source, {
          indent_size: 2,
          indent_with_tabs: false,
          end_with_newline: true,
          newline_between_rules: true,
          selector_separator_newline: true,
          space_around_combinator: true
        });
      } else {
        formatted = formatter(source, {
          indent_size: 2,
          indent_with_tabs: false,
          end_with_newline: true,
          max_preserve_newlines: 2,
          brace_style: 'collapse'
        });
      }
    } catch (error) {
      showNotice('The ' + meta.label + ' formatter could not format this code. Your source was not changed.', 'error');
      return;
    }

    if (typeof formatted !== 'string' || !formatted.trim()) {
      showNotice('The ' + meta.label + ' formatter returned no output. Your source was not changed.', 'error');
      return;
    }

    if (formatted === source) {
      announce(meta.label + ' source is already formatted.');
      editors[lang].focus();
      return;
    }

    var cursor = null;
    try { cursor = editors[lang].getCursor(); } catch (error) { cursor = null; }

    suspendChanges = true;
    try {
      editors[lang].replaceAll(formatted);
    } finally {
      suspendChanges = false;
    }
    if (cursor && editors[lang].setCursor) {
      try { editors[lang].setCursor(cursor); } catch (error) { /* clamped by CodeMirror */ }
    }
    editors[lang].focus();
    dirty = true;
    if (autoRunEnabled()) {
      cancelAutoRun();
      autoRunTimer = window.setTimeout(function () {
        autoRunTimer = 0;
        runPreview({ cause: 'auto' });
      }, AUTO_RUN_DELAY);
      setStatus('dirty', 'Changes pending…');
    } else {
      setStatus('ready', 'Press Run to update');
    }
    announce(meta.label + ' source formatted.');
  }

  function initFormatting() {
    var buttons = document.querySelectorAll('[data-format]');
    Array.prototype.forEach.call(buttons, function (button) {
      var lang = button.getAttribute('data-format');
      if (!formatterFor(lang)) {
        button.disabled = true;
        button.title = 'Formatter unavailable';
        return;
      }
      button.addEventListener('click', function () {
        formatEditor(lang);
      });
    });
  }

  /* ------------------------------------------------------------------------
     Import
     ------------------------------------------------------------------------ */
  function extractProject(source) {
    var doc = new DOMParser().parseFromString(source, 'text/html');
    var warnings = [];

    var styleNodes = Array.prototype.slice.call(doc.querySelectorAll('style'));
    var cssParts = styleNodes.map(function (node) { return node.textContent.trim(); }).filter(Boolean);

    var scriptNodes = Array.prototype.slice.call(doc.querySelectorAll('script'));
    var jsParts = [];
    var removableScripts = [];
    var externalScripts = 0;
    var moduleScripts = 0;

    scriptNodes.forEach(function (node) {
      var type = (node.getAttribute('type') || '').toLowerCase();
      if (node.hasAttribute('src')) {
        externalScripts += 1;
        removableScripts.push(node);
        return;
      }
      if (type === 'module') {
        moduleScripts += 1;
        removableScripts.push(node);
        return;
      }
      if (type && type.indexOf('javascript') === -1) {
        /* Inert data blocks (JSON, templates, import maps) stay in the HTML. */
        return;
      }
      var text = node.textContent;
      if (text.trim()) jsParts.push(text.trim());
      removableScripts.push(node);
    });

    var stylesheetLinks = Array.prototype.slice.call(doc.querySelectorAll('link[rel~="stylesheet"]'));
    var headExtras = Array.prototype.filter.call(doc.head.children, function (el) {
      return ['STYLE', 'SCRIPT', 'LINK', 'META', 'TITLE'].indexOf(el.tagName) === -1;
    });

    /* Remove lifted nodes from the body markup. This document is inert; none
       of it has been inserted into the playground. */
    styleNodes.forEach(function (node) { node.remove(); });
    removableScripts.forEach(function (node) { node.remove(); });
    stylesheetLinks.forEach(function (node) { node.remove(); });

    var html = doc.body.innerHTML.trim();
    var css = cssParts.join('\n\n');
    var js = jsParts.join('\n\n');

    if (stylesheetLinks.length) {
      warnings.push(plural(stylesheetLinks.length, 'external stylesheet') + ' could not be imported.');
    }
    if (externalScripts) {
      warnings.push(plural(externalScripts, 'external script') + ' could not be imported.');
    }
    if (moduleScripts) {
      warnings.push(plural(moduleScripts, 'module script') + ' was skipped (module semantics are not supported by the importer).');
    }
    if (headExtras.length) {
      warnings.push('Some document head markup (for example <base> or custom meta tags) was not imported.');
    }

    return {
      project: { html: html, css: css, js: js },
      stats: {
        html: html.length,
        css: css.length,
        js: js.length,
        styleBlocks: cssParts.length,
        scriptBlocks: jsParts.length
      },
      warnings: warnings
    };
  }

  function appendFact(list, label, value) {
    var item = document.createElement('li');
    var strong = document.createElement('strong');
    strong.textContent = label + ': ';
    item.appendChild(strong);
    item.appendChild(document.createTextNode(value));
    list.appendChild(item);
  }

  function renderImportSummary(file, result) {
    els.importFilename.textContent = file.name + ' · ' + formatBytes(file.size);

    var summary = els.importSummary;
    while (summary.firstChild) summary.removeChild(summary.firstChild);

    var facts = document.createElement('ul');
    appendFact(facts, 'HTML', result.stats.html ? result.stats.html.toLocaleString() + ' characters' : 'none found');
    appendFact(facts, 'CSS', result.stats.css
      ? result.stats.css.toLocaleString() + ' characters from ' + plural(result.stats.styleBlocks, 'style block')
      : 'none found');
    appendFact(facts, 'JavaScript', result.stats.js
      ? result.stats.js.toLocaleString() + ' characters from ' + plural(result.stats.scriptBlocks, 'inline script')
      : 'none found');
    summary.appendChild(facts);

    if (result.warnings.length) {
      var heading = document.createElement('p');
      heading.className = 'summary-heading';
      heading.textContent = 'Notes';
      summary.appendChild(heading);

      var warningList = document.createElement('ul');
      result.warnings.forEach(function (warning) {
        var item = document.createElement('li');
        item.textContent = warning;
        warningList.appendChild(item);
      });
      summary.appendChild(warningList);
    }
  }

  function importFile(file) {
    var name = file.name || 'document.html';
    var looksHtml = /\.html?$/i.test(name) || file.type === 'text/html' || file.type === 'application/xhtml+xml';

    if (!looksHtml) {
      showNotice('Choose an .html or .htm file. Other formats are not supported.', 'error');
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      showNotice('That file is larger than the 2 MB import limit. Nothing was imported.', 'error');
      return;
    }

    var reader = new FileReader();
    reader.onerror = function () {
      showNotice('The file could not be read. It may be unavailable, empty, or blocked by the browser.', 'error');
    };
    reader.onload = function () {
      var text = typeof reader.result === 'string' ? reader.result : '';
      if (!text.trim()) {
        showNotice('The selected file is empty. Nothing was imported.', 'error');
        return;
      }

      var result;
      try {
        result = extractProject(text);
      } catch (error) {
        showNotice('This file could not be parsed as HTML. Nothing was imported.', 'error');
        return;
      }

      if (!result.project.html && !result.project.css && !result.project.js) {
        showNotice('No editable HTML, CSS or JavaScript was found in this file. Nothing was imported.', 'error');
        return;
      }

      pendingImport = { file: file, result: result };
      if (!dialogSupported) {
        var proceed = window.confirm(
          'Import ' + name + '?\n\n' +
          'Imported documents can contain arbitrary executable code. It runs only in the sandboxed preview, after you press Run. This replaces your current HTML, CSS and JavaScript.'
        );
        if (proceed) {
          applyImport();
        } else {
          pendingImport = null;
        }
        return;
      }

      renderImportSummary(file, result);
      els.importDialog.returnValue = '';
      els.importDialog.showModal();
    };
    reader.readAsText(file);

    /* Allow selecting the same file again after a failed attempt. */
    els.importInput.value = '';
  }

  function applyImport() {
    if (!pendingImport) return;
    var pending = pendingImport;
    pendingImport = null;

    cancelAutoRun();
    setProject(pending.result.project);
    clearConsole({ announce: false });
    disposePreview();
    showEmptyState('imported');
    setStatus('ready', 'Ready to run');
    dirty = true;
    runHadError = false;

    var wasAutoRun = autoRunEnabled();
    if (wasAutoRun) {
      els.autoRunInput.checked = false;
    }

    var preferred = pending.result.project.js.trim()
      ? 'js'
      : (pending.result.project.html.trim() ? 'html' : 'css');
    setActivePanel(preferred);
    scheduleEditorRefresh();

    var message = 'Imported ' + (pending.file.name || 'document.html') + '. ' +
      (wasAutoRun ? 'Auto-run was paused for safety. ' : '') +
      'Press Run to execute it in the sandboxed preview.';
    showNotice(message, 'info');
  }

  /* ------------------------------------------------------------------------
     Export
     ------------------------------------------------------------------------ */
  function exportProject() {
    try {
      var project = readProject();
      var documentHtml = buildStandaloneDocument(project);
      var blob = new Blob([documentHtml], { type: 'text/html;charset=utf-8' });

      if (!window.URL || typeof window.URL.createObjectURL !== 'function') {
        throw new Error('Object URLs are unavailable.');
      }

      var url = window.URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = 'cinder-project.html';
      link.rel = 'noopener';
      link.hidden = true;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 15000);

      showNotice('Exported cinder-project.html. Check your browser downloads.', 'success');
    } catch (error) {
      showNotice('The export could not be created. Your code is safe; please try again.', 'error');
    }
  }

  /* ------------------------------------------------------------------------
     Dialogs
     ------------------------------------------------------------------------ */
  function openDialog(dialog) {
    if (!dialog) return;
    dialog.returnValue = '';
    if (dialogSupported) {
      try {
        if (!dialog.open) dialog.showModal();
      } catch (error) {
        /* Already open or unavailable; ignore. */
      }
    }
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
  }

  function performReset() {
    cancelAutoRun();
    setProject(DEFAULT_PROJECT);
    clearConsole({ announce: false });
    setActivePanel('html');
    scheduleEditorRefresh();
    runPreview({ cause: 'reset', announceUpdate: false });
    announce('Reset to the example project.');
  }

  function requestReset() {
    if (!dialogSupported) {
      if (window.confirm('Reset to the example project? This replaces your current HTML, CSS and JavaScript and cannot be undone.')) {
        performReset();
      }
      return;
    }
    openDialog(els.resetDialog);
  }

  function requestShare() {
    if (!dialogSupported) {
      window.alert('Link sharing is not available in this release. Use Export to download a standalone HTML file.');
      return;
    }
    openDialog(els.shareDialog);
  }

  function initDialogs() {
    els.resetDialog.addEventListener('close', function () {
      var value = els.resetDialog.returnValue;
      els.resetDialog.returnValue = '';
      if (value === 'reset') performReset();
    });

    els.importDialog.addEventListener('close', function () {
      var value = els.importDialog.returnValue;
      els.importDialog.returnValue = '';
      if (value === 'import') {
        applyImport();
      } else {
        pendingImport = null;
      }
    });

    els.shareDialog.addEventListener('close', function () {
      els.shareDialog.returnValue = '';
    });

    els.shareExportButton.addEventListener('click', function () {
      closeDialog(els.shareDialog);
      exportProject();
    });
  }

  /* ------------------------------------------------------------------------
     Resizable splitter (desktop)
     ------------------------------------------------------------------------ */
  function initSplitter() {
    var handle = els.splitHandle;
    var main = els.main;
    if (!handle || !main) return;

    var dragging = false;
    var pointerId = null;

    function setSplit(percent, announceChange) {
      var value = Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, percent));
      var rounded = Math.round(value);
      main.style.setProperty('--split', rounded + '%');
      handle.setAttribute('aria-valuenow', String(rounded));
      handle.setAttribute('aria-valuetext', rounded + '% editor width');
      scheduleEditorRefresh();
      if (announceChange) announce('Editor width ' + rounded + ' percent.');
    }

    handle.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return;
      dragging = true;
      pointerId = event.pointerId;
      try { handle.setPointerCapture(pointerId); } catch (error) { /* ignore */ }
      document.body.classList.add('is-resizing');
      event.preventDefault();
    });

    handle.addEventListener('pointermove', function (event) {
      if (!dragging) return;
      var rect = main.getBoundingClientRect();
      var style = window.getComputedStyle(main);
      var padLeft = parseFloat(style.paddingLeft) || 0;
      var padRight = parseFloat(style.paddingRight) || 0;
      var contentLeft = rect.left + padLeft;
      var contentWidth = rect.width - padLeft - padRight;
      if (contentWidth <= 0) return;
      setSplit(((event.clientX - contentLeft) / contentWidth) * 100, false);
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove('is-resizing');
      if (pointerId !== null) {
        try {
          if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
        } catch (error) { /* ignore */ }
      }
      pointerId = null;
    }

    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);

    handle.addEventListener('keydown', function (event) {
      var current = Number(handle.getAttribute('aria-valuenow')) || DEFAULT_SPLIT;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSplit(current - 2, true);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setSplit(current + 2, true);
      } else if (event.key === 'Home') {
        event.preventDefault();
        setSplit(MIN_SPLIT, true);
      } else if (event.key === 'End') {
        event.preventDefault();
        setSplit(MAX_SPLIT, true);
      }
    });

    handle.addEventListener('dblclick', function () {
      setSplit(DEFAULT_SPLIT, true);
    });

    setSplit(DEFAULT_SPLIT, false);
  }

  /* ------------------------------------------------------------------------
     Keyboard shortcuts
     ------------------------------------------------------------------------ */
  function isDialogOpen() {
    return Boolean(document.querySelector('dialog[open]'));
  }

  function initShortcuts() {
    document.addEventListener('keydown', function (event) {
      var modifier = event.metaKey || event.ctrlKey;

      if (modifier && (event.key === 'Enter' || event.keyCode === 13)) {
        if (isDialogOpen() || event.altKey) return;
        event.preventDefault();
        runPreview({ cause: 'shortcut', announceUpdate: true });
        return;
      }

      if (event.altKey && event.shiftKey && (event.key === 'F' || event.key === 'f')) {
        if (isDialogOpen()) return;
        event.preventDefault();
        formatEditor(activeLanguage);
      }
    });
  }

  /* ------------------------------------------------------------------------
     Wiring and startup
     ------------------------------------------------------------------------ */
  function initToolbar() {
    els.runButton.addEventListener('click', function () {
      runPreview({ cause: 'manual', announceUpdate: true });
    });
    els.rerunButton.addEventListener('click', function () {
      runPreview({ cause: 'manual', announceUpdate: true });
    });
    els.themeButton.addEventListener('click', toggleTheme);
    els.exportButton.addEventListener('click', exportProject);
    els.resetButton.addEventListener('click', requestReset);
    els.shareButton.addEventListener('click', requestShare);

    els.importButton.addEventListener('click', function () {
      els.importInput.click();
    });
    els.importInput.addEventListener('change', function () {
      var file = els.importInput.files && els.importInput.files[0];
      if (!file) return;
      importFile(file);
    });

    els.clearConsoleButton.addEventListener('click', function () {
      clearConsole({ announce: true });
    });
    els.noticeDismiss.addEventListener('click', hideNotice);

    els.autoRunInput.addEventListener('change', function () {
      if (els.autoRunInput.checked) {
        announce('Auto-run enabled.');
        if (dirty) {
          cancelAutoRun();
          autoRunTimer = window.setTimeout(function () {
            autoRunTimer = 0;
            runPreview({ cause: 'auto' });
          }, 250);
        }
      } else {
        cancelAutoRun();
        announce('Auto-run disabled.');
        if (dirty) setStatus('ready', 'Press Run to update');
      }
    });

    var platform = navigator.platform || navigator.userAgent || '';
    var isApple = /Mac|iPhone|iPad|iPod/i.test(platform);
    if (els.runShortcut) {
      els.runShortcut.textContent = isApple ? '⌘↵' : 'Ctrl↵';
    }
    els.runButton.title = isApple ? 'Run the project (⌘+Enter)' : 'Run the project (Ctrl+Enter)';
    els.rerunButton.title = els.runButton.title;
  }

  function initInterfaceErrorReporting() {
    window.addEventListener('error', function (event) {
      /* Resource errors do not bubble to this listener without capture, but
         guard anyway so a missing optional asset does not alarm the user. */
      if (event && event.target && event.target !== window) return;
      showNotice('The playground interface hit an unexpected problem. Your code was not changed.', 'error');
    });

    window.addEventListener('unhandledrejection', function () {
      showNotice('The playground interface hit an unexpected problem. Your code was not changed.', 'error');
    });

    window.addEventListener('resize', scheduleEditorRefresh);

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) scheduleEditorRefresh();
    });
  }

  function init() {
    if (!els.htmlEditor || !els.previewStatus) return;

    setTheme('light', false);
    initEditors();
    initEditorSwitcher();
    initFormatting();
    initDialogs();
    initSplitter();
    initToolbar();
    initShortcuts();
    initInterfaceErrorReporting();

    currentFrame = els.frameArea.querySelector('.preview-frame');

    window.addEventListener('message', onPreviewMessage);

    clearConsole({ announce: false });
    setStatus('ready', 'Not run yet');
    runPreview({ cause: 'initial', announceUpdate: false });

    /* The initial frame is replaced by runPreview; keep the cached reference
       accurate if it was not. */
    if (!currentFrame) {
      currentFrame = els.frameArea.querySelector('.preview-frame');
    }

    document.documentElement.setAttribute('data-app-ready', 'true');
    document.documentElement.setAttribute('data-app-version', APP_VERSION);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());
