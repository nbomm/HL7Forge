/*
 * HL7Forge — user interface.
 * Message text only ever lives in this page's memory. Nothing here performs network
 * requests or writes message content to storage. DOM is built with textContent only,
 * so message content can never be interpreted as HTML.
 */
'use strict';
(function () {
  const P = window.HL7Parser;
  const D = window.HL7Defs;
  const $ = function (id) { return document.getElementById(id); };

  const el = {
    input: $('hl7-input'), parseBtn: $('parse-btn'), clearBtn: $('clear-btn'), fileInput: $('file-input'), openBtn: $('open-btn'),
    sampleSelect: $('sample-select'), results: $('results'), empty: $('empty-state'), summary: $('summary'),
    warnings: $('warnings'), nav: $('segment-nav'), segView: $('segment-view'), rawView: $('raw-view'),
    tabSegments: $('tab-segments'), tabRaw: $('tab-raw'), messageSelect: $('message-select'),
    filter: $('filter-input'), hideEmpty: $('hide-empty'), expandBtn: $('expand-btn'),
    toast: $('toast'), themeToggle: $('theme-toggle'), privacyText: $('privacy-text'), privacyBadge: $('privacy-badge'),
    saveBtn: $('save-btn'), savedCount: $('saved-count'), savedList: $('saved-list'), clearAllBtn: $('clear-all-btn'),
    savedKeys: $('saved-keys'), switcher: $('switcher'), switcherInput: $('switcher-input'), switcherList: $('switcher-list'),
    idleSelect: $('idle-select'), idleBanner: $('idle-banner'), idleText: $('idle-text'), idleKeep: $('idle-keep'),
    inputForm: $('input-form'), cursorPos: $('cursor-pos'), cursorPath: $('cursor-path'),
    cursorCrumbs: $('cursor-crumbs'), cursorValue: $('cursor-value'), editor: $('editor'), highlight: $('hl7-highlight'),
  };

  // `text` is the input that `result` was parsed from.
  const state = { result: null, text: null, messageIndex: 0, view: 'segments' };

  const AUTO_PARSE_LIMIT = 1000000; // characters; larger inputs parse on demand (Parse / Ctrl+Enter)
  let largeInputHinted = false;

  // ---------- DOM helper ----------

  function h(tag, attrs) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        const v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') node.className = v;
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
      });
    }
    for (let i = 2; i < arguments.length; i++) append(node, arguments[i]);
    return node;
  }

  function append(node, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) child.forEach(function (c) { append(node, c); });
    else node.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
  }

  // ---------- Formatting ----------

  const TS_RE = /^(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\.\d{1,4})?([+-]\d{4})?$/;

  /** Formats an HL7 TS/DT/DTM ("20261021143005-0500") without timezone conversion. */
  function formatTimestamp(v) {
    const m = TS_RE.exec(v);
    if (!m) return null;
    const month = m[2] ? +m[2] : null;
    const day = m[3] ? +m[3] : null;
    if ((month && (month < 1 || month > 12)) || (day && (day < 1 || day > 31))) return null;
    if ((m[4] && +m[4] > 23) || (m[5] && +m[5] > 59) || (m[6] && +m[6] > 59)) return null;
    let out = m[1] + (m[2] ? '-' + m[2] : '') + (m[3] ? '-' + m[3] : '');
    if (m[4]) out += ' ' + m[4] + ':' + (m[5] || '00') + (m[6] ? ':' + m[6] : '') + (m[7] || '');
    if (m[8]) out += ' (UTC' + m[8].slice(0, 3) + ':' + m[8].slice(3) + ')';
    return out;
  }

  const DATE_TYPES = { TS: true, DT: true, DTM: true };

  /** Human-readable interpretation of a leaf value, or null. */
  function interpret(value, type, segName, position) {
    if (!value) return null;
    const code = position ? D.codeMeaning(segName, position, value) : null;
    if (code) return code;
    if (DATE_TYPES[type] && value.length >= 8) return formatTimestamp(value);
    return null;
  }

  function personName(comps) {
    // comps are XPN components (family, given, middle, suffix, prefix, degree)
    const family = comps[0] || '';
    const rest = [comps[4], comps[1], comps[2]].filter(Boolean).join(' ');
    let name = family && rest ? family + ', ' + rest : family || rest;
    if (comps[3]) name += ' ' + comps[3];
    if (comps[5]) name += ', ' + comps[5];
    return name;
  }

  function componentValues(message, path) {
    const out = [];
    for (let i = 1; i <= 7; i++) out.push(P.getValue(message, path + '.' + i));
    return out;
  }

  /** Key identifying facts about a message, shared by the summary and saved-message labels. */
  function describeMessage(m) {
    const code = P.getValue(m, 'MSH-9.1');
    const trigger = P.getValue(m, 'MSH-9.2');
    return {
      type: code + (trigger ? '^' + trigger : ''),
      event: D.eventName(code, trigger),
      controlId: P.getValue(m, 'MSH-10'),
      patient: personName(componentValues(m, 'PID-5')),
    };
  }

  // ---------- Field model helpers ----------

  function fieldType(seg, def) {
    if (!def) return '';
    if (def.type === '*') {
      const vt = seg.fields[1] ? seg.fields[1].value : '';
      return vt || 'varies';
    }
    return def.type;
  }

  function isComposite(rep) {
    return rep.components.length > 1 || rep.components[0].subcomponents.length > 1;
  }

  function summarizeRep(rep) {
    return rep.components.map(function (c) { return c.subcomponents.filter(Boolean).join(' & '); })
      .filter(Boolean).join(' · ');
  }

  // ---------- Parse & render ----------

  function parseInput() {
    const text = el.input.value;
    if (!text.trim()) { reset(); return; }
    largeInputHinted = false;
    try {
      state.result = P.parse(text);
      state.text = text;
      state.messageIndex = Math.min(state.messageIndex, Math.max(0, state.result.messages.length - 1));
      renderEditor();
    } catch (e) {
      showRenderError(e);
      return;
    }
    renderResults();
    syncActive();
    scheduleCursor();
  }

  /** renderAll, but a failure clears the results rather than leaving a stale, partial page. */
  function renderResults() {
    try { renderAll(); } catch (e) { showRenderError(e); }
  }

  function showRenderError(e) {
    // Never leave an earlier message's results on screen beside input they don't describe.
    reset();
    el.empty.hidden = true;
    el.results.hidden = false;
    renderWarnings([{ level: 'error', message: 'This message could not be displayed: ' + e.message }]);
  }

  function reset() {
    state.result = null;
    state.text = null;
    state.messageIndex = 0;
    el.results.hidden = true;
    el.empty.hidden = false;
    [el.summary, el.warnings, el.nav, el.segView, el.rawView].forEach(function (n) { n.replaceChildren(); });
    navItems = [];
    cancelCards(); // drops queued segments (message data) along with the pending work
    rawPending = null;
    // Both synchronous, so a cleared message never lingers in the highlight layer or cursor bar
    // (animation frames don't run in hidden tabs, where idle auto-clear usually happens).
    renderEditor();
    if (cursorFrame) { cancelAnimationFrame(cursorFrame); cursorFrame = 0; }
    updateCursor();
  }

  function currentMessage() {
    return state.result && state.result.messages[state.messageIndex];
  }

  function renderAll() {
    const result = state.result;
    el.empty.hidden = true;
    el.results.hidden = false;

    const count = result.messages.length;
    el.messageSelect.hidden = count < 2;
    el.messageSelect.replaceChildren();
    if (count > 1) {
      result.messages.forEach(function (m, i) {
        const type = describeMessage(m).type;
        el.messageSelect.appendChild(h('option', { value: i }, 'Message ' + (i + 1) + ' of ' + count + (type ? ' — ' + type : '')));
      });
      el.messageSelect.value = String(state.messageIndex);
    }

    const message = currentMessage();
    const labels = message ? segmentLabels(message) : [];
    renderSummary(message);
    renderWarnings(result.warnings.concat(message ? message.warnings : []));
    renderNav(message, labels);
    renderSegments(message, labels);
    renderRaw(message);
    applyFilter();
  }

  function renderSummary(m) {
    el.summary.replaceChildren();
    if (!m) return;
    const tiles = [];
    const add = function (label, value, sub) { if (value) tiles.push({ label: label, value: value, sub: sub }); };

    const info = describeMessage(m);
    add('Message type', info.type, info.event);
    add('Control ID', info.controlId);
    const proc = P.getValue(m, 'MSH-11.1');
    add('Version', P.getValue(m, 'MSH-12.1') && 'v' + P.getValue(m, 'MSH-12.1'), proc && (D.codeMeaning('MSH', 11, proc) || proc));
    const ts = P.getValue(m, 'MSH-7.1');
    add('Sent', ts && (formatTimestamp(ts) || ts));
    const from = [P.getValue(m, 'MSH-3.1'), P.getValue(m, 'MSH-4.1')].filter(Boolean).join(' @ ');
    const to = [P.getValue(m, 'MSH-5.1'), P.getValue(m, 'MSH-6.1')].filter(Boolean).join(' @ ');
    add('Route', from || to ? (from || '?') + ' → ' + (to || '?') : '');

    const mrn = P.getValue(m, 'PID-3.1');
    const idType = P.getValue(m, 'PID-3.5');
    add('Patient', info.patient, mrn ? (idType || 'ID') + ' ' + mrn : null);
    const dob = P.getValue(m, 'PID-7.1');
    const sex = P.getValue(m, 'PID-8');
    add('Born / sex', [dob && (formatTimestamp(dob) || dob), sex && (D.codeMeaning('PID', 8, sex) || sex)].filter(Boolean).join(' · '));
    const ack = P.getValue(m, 'MSA-1');
    add('Acknowledgment', ack && ack + (D.codeMeaning('MSA', 1, ack) ? ' — ' + D.codeMeaning('MSA', 1, ack) : ''), P.getValue(m, 'MSA-3'));
    add('Segments', String(m.segments.length));

    tiles.forEach(function (t) {
      el.summary.appendChild(h('div', { class: 'tile' },
        h('div', { class: 'tile-label' }, t.label),
        h('div', { class: 'tile-value' }, t.value),
        t.sub ? h('div', { class: 'tile-sub' }, t.sub) : null));
    });
  }

  function renderWarnings(list) {
    el.warnings.replaceChildren();
    if (!list.length) return;
    el.warnings.appendChild(h('ul', null, list.map(function (w) {
      return h('li', { class: 'warning is-' + w.level },
        h('span', { class: 'warning-level' }, w.level),
        w.line ? h('span', { class: 'warning-line' }, 'line ' + w.line) : null,
        w.message);
    })));
  }

  /** Display labels by segment index: "OBX [3]" when a segment repeats, else just "OBX". One pass. */
  function segmentLabels(m) {
    const totals = new Map();
    m.segments.forEach(function (s) { totals.set(s.name, (totals.get(s.name) || 0) + 1); });
    const seen = new Map();
    return m.segments.map(function (s) {
      const n = (seen.get(s.name) || 0) + 1;
      seen.set(s.name, n);
      return totals.get(s.name) > 1 ? s.name + ' [' + n + ']' : s.name;
    });
  }

  let navItems = []; // nav buttons by segment index, so filtering needs no selector lookups

  function renderNav(m, labels) {
    el.nav.replaceChildren();
    navItems = [];
    if (!m) return;
    m.segments.forEach(function (seg) {
      const item = h('button', {
        class: 'nav-item', type: 'button', 'data-seg': seg.index,
        onclick: function () { showSegment(seg.index); },
      }, h('span', { class: 'nav-id' }, labels[seg.index]), h('span', { class: 'nav-name' }, D.segmentName(seg.name)));
      navItems[seg.index] = item;
      el.nav.appendChild(item);
    });
  }

  // Cards are built in short time slices: the first screen appears at once and the page stays
  // responsive while a very large message finishes. Code that needs a particular card calls
  // ensureCard(index) first.
  const CARD_SLICE_MS = 24; // under the 50 ms "long task" mark, with room for the frame that follows
  let cardQueue = null; // { m, labels, next, timer } while cards remain to be built
  let allCollapsed = false; // "Collapse all" applies to cards built later, too

  function renderSegments(m, labels) {
    cancelCards();
    el.segView.replaceChildren();
    allCollapsed = false;
    el.expandBtn.textContent = 'Collapse all';
    if (!m) return;
    cardQueue = { m: m, labels: labels, next: 0, timer: 0 };
    appendCards(-1);
  }

  /** Builds queued cards: up to and including `until`, or (when -1) for one time slice. */
  function appendCards(until) {
    const q = cardQueue;
    if (!q) return;
    clearTimeout(q.timer);
    q.timer = 0;
    const segs = q.m.segments;
    const started = performance.now();
    const added = [];
    const frag = document.createDocumentFragment();
    while (q.next < segs.length && (until >= 0 ? q.next <= until : performance.now() - started < CARD_SLICE_MS)) {
      const seg = segs[q.next++];
      const card = segmentCard(seg, q.labels[seg.index]);
      if (allCollapsed) setCollapsed(card, true);
      frag.appendChild(card);
      added.push(card);
    }
    el.segView.appendChild(frag);
    filterCards(added);
    highlightCursorRow(cursorLoc); // the cursor's row may be in this batch
    if (q.next >= segs.length) cardQueue = null;
    else q.timer = setTimeout(nextCardSlice, 0);
  }

  function nextCardSlice() {
    try { appendCards(-1); } catch (e) { showRenderError(e); } // same guarantee as renderResults
  }

  function ensureCard(index) {
    if (cardQueue && cardQueue.next <= index) appendCards(index);
  }

  function cancelCards() {
    if (cardQueue) clearTimeout(cardQueue.timer);
    cardQueue = null;
  }

  function segmentCard(seg, label) {
    const segDef = D.segment(seg.name);
    const known = !!segDef;
    const rows = [];
    const defCount = known ? segDef.fields.length : 0;

    seg.fields.forEach(function (field) {
      const def = D.fieldDef(seg.name, field.position);
      rows.push(fieldRow(seg, field, def));
    });

    const filled = seg.fields.filter(function (f) { return f.raw !== ''; }).length;
    const body = h('table', { class: 'fields' },
      h('thead', null, h('tr', null, h('th', { class: 'col-pos' }, 'Field'), h('th', { class: 'col-name' }, 'Name'),
        h('th', { class: 'col-type' }, 'Type'), h('th', null, 'Value'))),
      h('tbody', null, rows));

    const toggle = function () { setCollapsed(card, !card.classList.contains('is-collapsed')); };
    const head = h('header', {
      class: 'seg-head', role: 'button', tabindex: '0', 'aria-expanded': 'true', onclick: toggle,
      onkeydown: function (e) {
        if (e.target === head && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(); }
      },
    },
      h('span', { class: 'seg-id' + (/^Z/.test(seg.name) ? ' is-custom' : '') }, label),
      h('span', { class: 'seg-name' }, D.segmentName(seg.name)),
      h('span', { class: 'seg-meta' }, filled + ' of ' + seg.fields.length + ' fields populated · line ' + seg.line +
        (known && seg.fields.length > defCount ? ' · ' + (seg.fields.length - defCount) + ' beyond v2.5.1 definition' : '')),
      h('span', { class: 'chevron', 'aria-hidden': 'true' }));
    const card = h('article', { class: 'seg-card', id: 'seg-' + seg.index, 'data-seg': seg.index, 'data-name': seg.name },
      head, h('div', { class: 'seg-body' }, filled ? null : h('p', { class: 'seg-empty' }, 'No populated fields.'), body));
    return card;
  }

  function setCollapsed(card, collapsed) {
    card.classList.toggle('is-collapsed', collapsed);
    card.firstChild.setAttribute('aria-expanded', String(!collapsed));
  }

  function fieldRow(seg, field, def) {
    const path = seg.name + '-' + field.position;
    const type = fieldType(seg, def);
    const name = def ? def.name : (/^Z/.test(seg.name) ? 'Custom field' : 'Field ' + field.position);
    const empty = field.raw === '';

    return h('tr', {
      class: 'field-row' + (empty ? ' is-empty' : ''), id: 'f-' + seg.index + '-' + field.position,
      'data-search': (path + ' ' + name + ' ' + field.value).toLowerCase(),
    },
    h('td', { class: 'col-pos' }, h('code', { class: 'path' }, path)),
    h('td', { class: 'col-name' }, name),
    h('td', { class: 'col-type' }, type ? h('span', { class: 'type', title: D.dataTypeName(type) || '' }, type) : null),
    h('td', { class: 'col-value' }, valueCell(seg, field, type, path, empty)));
  }

  function valueCell(seg, field, type, path, empty) {
    if (empty) return h('span', { class: 'muted' }, '—');
    if (field.raw === '""') return h('span', { class: 'null-value' }, '"" — explicit null (receiver should clear this value)');
    if (field.literal) return h('code', { class: 'literal' }, field.raw);

    const multi = field.repetitions.length > 1;
    return h('div', { class: 'value-wrap' },
      copyButton(field.value),
      field.repetitions.map(function (rep, r) {
        const repPath = multi ? path + '(' + (r + 1) + ')' : path;
        return h('div', { class: 'rep' + (multi ? ' is-multi' : '') },
          multi ? h('div', { class: 'rep-label' }, 'Repetition ' + (r + 1)) : null,
          repContent(seg, field, rep, type, repPath));
      }));
  }

  function repContent(seg, field, rep, type, path) {
    if (!isComposite(rep)) {
      const v = rep.components[0].value;
      if (!v) return h('span', { class: 'muted' }, '—');
      const meaning = interpret(v, type, seg.name, field.position);
      return h('div', { class: 'leaf' }, h('span', { class: 'value' }, v), meaning ? h('span', { class: 'meaning' }, meaning) : null);
    }

    const summary = summarizeRep(rep);
    const rows = rep.components.map(function (comp, c) {
      const cPath = path + '.' + (c + 1);
      const cName = D.componentName(type, c + 1) || 'Component ' + (c + 1);
      const isEmpty = comp.raw === '';
      let value;
      if (isEmpty) value = h('span', { class: 'muted' }, '—');
      else if (comp.subcomponents.length > 1) {
        value = h('ul', { class: 'subs' }, comp.subcomponents.map(function (s, i) {
          return h('li', { class: s ? null : 'is-empty' }, h('code', { class: 'path sm' }, cPath + '.' + (i + 1)), s || h('span', { class: 'muted' }, '—'));
        }));
      } else {
        const compType = type === 'TS' && c === 0 ? 'TS' : (/Date/.test(cName) ? 'DT' : '');
        const meaning = interpret(comp.value, compType, null, null);
        value = h('span', { class: 'leaf' }, h('span', { class: 'value' }, comp.value), meaning ? h('span', { class: 'meaning' }, meaning) : null);
      }
      return h('tr', { class: isEmpty ? 'is-empty' : null },
        h('td', null, h('code', { class: 'path sm' }, cPath)), h('td', { class: 'comp-name' }, cName), h('td', null, value));
    });

    let headline = summary;
    if (type === 'XPN' || type === 'XCN') {
      const comps = rep.components.map(function (c) { return c.value; });
      headline = personName(type === 'XCN' ? comps.slice(1) : comps) || summary;
    } else if (type === 'MSG') {
      const ev = D.eventName(rep.components[0].value, rep.components[1] ? rep.components[1].value : '');
      if (ev) headline = summary + ' — ' + ev;
    } else if (type === 'TS') {
      headline = formatTimestamp(rep.components[0].value) || summary;
    }
    return h('div', { class: 'composite' },
      h('div', { class: 'headline' }, headline),
      h('table', { class: 'components' }, h('tbody', null, rows)));
  }

  function copyButton(text) {
    return h('button', {
      class: 'copy-btn', type: 'button', title: 'Copy value', 'aria-label': 'Copy value',
      onclick: function (e) { e.stopPropagation(); copy(text); },
    }, '⧉');
  }

  // ---------- Raw view ----------

  const TOKEN_CLASS = {
    segment: 'raw-seg', field: 'd-field', component: 'd-comp', repetition: 'd-rep', subcomponent: 'd-sub',
    escape: 'esc', encoding: 'enc',
  };

  /**
   * Appends syntax-highlighted tokens (from HL7Parser.tokenize) to `parent`. With `onField`,
   * each field's tokens are grouped into one clickable span titled with the field name.
   */
  function renderTokens(parent, tokens, onField) {
    let segName = '';
    let group = null;
    tokens.forEach(function (t) {
      if (t.kind === 'break' || t.kind === 'space') {
        parent.appendChild(document.createTextNode(t.text));
        group = null;
        return;
      }
      if (t.kind === 'segment') segName = t.text;
      let cls = t.kind === 'text' ? 'f' + (t.field % 2) : TOKEN_CLASS[t.kind];
      if (t.kind === 'segment' && /^Z/.test(t.text)) cls += ' is-custom';
      // Hot path (one span per token), so the DOM calls are made directly rather than through h().
      const span = document.createElement('span');
      span.className = cls;
      span.textContent = t.text;

      const inField = t.field > 0 && (t.kind !== 'field' || t.value);
      if (!onField || !inField) { parent.appendChild(span); group = null; return; }
      if (!group || +group.getAttribute('data-field') !== t.field) {
        const def = D.fieldDef(segName, t.field);
        const position = t.field;
        group = h('span', {
          class: 'raw-field', 'data-field': position, title: segName + '-' + position + (def ? ' ' + def.name : ''),
          onclick: function () { onField(position); },
        });
        parent.appendChild(group);
      }
      group.appendChild(span);
    });
  }

  // The Raw view is built the first time it is shown for a message: big messages make it large.
  let rawPending = null;

  function renderRaw(m) {
    rawPending = m || null;
    el.rawView.replaceChildren();
    if (state.view === 'raw') buildRaw();
  }

  function buildRaw() {
    const m = rawPending;
    rawPending = null;
    if (!m) return;
    const frag = document.createDocumentFragment();
    m.segments.forEach(function (seg) {
      const line = h('div', { class: 'raw-line' });
      renderTokens(line, P.tokenize(seg.raw, m.delimiters), function (position) { jumpToField(seg.index, position); });
      frag.appendChild(line);
    });
    el.rawView.appendChild(frag);
  }

  // ---------- Highlighted input ----------
  // The textarea's own text is transparent; a highlighted copy is drawn underneath it with
  // identical metrics and kept scrolled in sync. Typing, selection and undo stay native.
  // Only the lines around the viewport are colored (re-rendered as it scrolls); the rest of the
  // layer is plain text, which keeps its size identical. A keystroke then costs about the same
  // in a 100-line message as in a 10,000-line one.

  const HIGHLIGHT_LIMIT = 2000000; // characters; above this the textarea shows its own plain text
  const WINDOW_CHAR_LIMIT = 50000; // a window longer than this (very long lines) stays uncolored
  let shown = { text: null, from: 0, to: -1 }; // text in the layer and its colored line range
  let lineHeight = 0;

  // The layer is always [text before the window][colored window][text after]["\n"]. The plain
  // parts are updated only when their text changes: re-creating them would make the browser lay
  // out the whole message again on every keystroke.
  const layerBefore = document.createTextNode('');
  const layerWindow = document.createElement('span');
  const layerAfter = document.createTextNode('');
  el.highlight.replaceChildren(layerBefore, layerWindow, layerAfter, document.createTextNode('\n'));

  function setLayerText(node, text) {
    if (node.data !== text) node.data = text;
  }

  /** Offset where 0-based line `n` starts, or text.length if there are fewer lines. */
  function lineOffset(text, n) {
    let i = 0;
    for (let line = 0; line < n; line++) {
      i = text.indexOf('\n', i);
      if (i === -1) return text.length;
      i++;
    }
    return i;
  }

  function renderEditor() {
    const text = el.input.value;
    const plain = text.length > HIGHLIGHT_LIMIT;
    // Read scroll state before touching the DOM, so it doesn't force a layout.
    const scrollTop = el.input.scrollTop;
    const scrollLeft = el.input.scrollLeft;
    if (!lineHeight) lineHeight = parseFloat(getComputedStyle(el.input).lineHeight) || 19;
    const first = Math.max(0, Math.floor(scrollTop / lineHeight) - 1);
    const last = first + Math.ceil(el.input.clientHeight / lineHeight) + 2;
    if (text === shown.text && (plain || (first >= shown.from && last <= shown.to))) return;

    el.editor.classList.toggle('is-plain', plain);
    const frag = document.createDocumentFragment();
    let from = 0;
    let to = Infinity;
    let before = '';
    let after = '';
    if (!plain) {
      const slack = last - first; // a screen of extra lines each way, so small scrolls reuse the layer
      from = Math.max(0, first - slack);
      to = last + slack;
      const start = lineOffset(text, from);
      const end = lineOffset(text, to + 1);
      if (end - start <= WINDOW_CHAR_LIMIT) {
        before = text.slice(0, start);
        after = text.slice(end);
        // Delimiters in force at the window (from the last header above it) and the whole text's
        // literal-"\r" mode, so the window is colored exactly as if the full text were tokenized.
        const delimiters = start ? P.locate(text, start).delimiters : undefined;
        renderTokens(frag, P.tokenize(text.slice(start, end), delimiters, P.hasLiteralBreaks(text)), null);
      } else {
        before = text;
        from = 0;
        to = Infinity;
      }
    }
    setLayerText(layerBefore, before);
    layerWindow.replaceChildren(frag);
    setLayerText(layerAfter, after);
    shown = { text: text, from: from, to: to };
    el.highlight.scrollTop = scrollTop;
    el.highlight.scrollLeft = scrollLeft;
  }

  let editorFrame = 0;
  function scheduleEditor() {
    if (!editorFrame) editorFrame = requestAnimationFrame(function () { editorFrame = 0; renderEditor(); });
  }

  function syncEditorScroll() {
    el.highlight.scrollTop = el.input.scrollTop;
    el.highlight.scrollLeft = el.input.scrollLeft;
  }

  el.input.addEventListener('input', renderEditor);
  // Keep the layers aligned at once; re-color in the next frame if the viewport left the window.
  el.input.addEventListener('scroll', function () { syncEditorScroll(); scheduleEditor(); });
  if (window.ResizeObserver) new ResizeObserver(scheduleEditor).observe(el.input);

  // ---------- Navigation, filter, view ----------

  function setView(view) {
    state.view = view;
    const seg = view === 'segments';
    el.tabSegments.classList.toggle('is-active', seg);
    el.tabRaw.classList.toggle('is-active', !seg);
    el.tabSegments.setAttribute('aria-selected', String(seg));
    el.tabRaw.setAttribute('aria-selected', String(!seg));
    el.segView.hidden = !seg;
    el.rawView.hidden = seg;
    if (!seg) buildRaw();
  }

  function flash(node) {
    node.classList.remove('flash');
    void node.offsetWidth; // restart animation
    node.classList.add('flash');
  }

  function showSegment(index) {
    setView('segments');
    ensureCard(index);
    const card = $('seg-' + index);
    if (!card) return;
    setCollapsed(card, false);
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    flash(card);
    navItems.forEach(function (n, i) { n.classList.toggle('is-active', i === index); });
  }

  function jumpToField(segIndex, position) {
    setView('segments');
    ensureCard(segIndex);
    const row = $('f-' + segIndex + '-' + position);
    const card = $('seg-' + segIndex);
    if (card) setCollapsed(card, false);
    const target = row && row.offsetParent ? row : card;
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    flash(target);
  }

  function applyFilter() {
    el.segView.classList.toggle('hide-empty', el.hideEmpty.checked && !el.filter.value.trim());
    filterCards(el.segView.querySelectorAll('.seg-card'));
  }

  /** Shows or hides the given cards and their rows for the current filter text. */
  function filterCards(cards) {
    const q = el.filter.value.trim().toLowerCase();
    cards.forEach(function (card) {
      const segMatch = q && card.getAttribute('data-name').toLowerCase() === q;
      let any = false;
      card.querySelectorAll('.field-row').forEach(function (row) {
        const match = !q || segMatch || row.getAttribute('data-search').indexOf(q) !== -1;
        row.hidden = !match;
        if (match) any = true;
      });
      card.hidden = !!q && !any;
      const nav = navItems[+card.getAttribute('data-seg')];
      if (nav) nav.hidden = card.hidden;
    });
  }

  // ---------- Cursor location ----------

  let cursorLoc = null;
  let cursorFrame = 0;

  function scheduleCursor() {
    if (!cursorFrame) cursorFrame = requestAnimationFrame(function () { cursorFrame = 0; updateCursor(); });
  }

  function caretOffset() {
    const i = el.input;
    return i.selectionDirection === 'backward' ? i.selectionStart : i.selectionEnd;
  }

  function updateCursor() {
    const text = el.input.value;
    const loc = text ? P.locate(text, caretOffset()) : null;
    cursorLoc = loc;
    el.cursorCrumbs.replaceChildren();
    el.cursorValue.textContent = '';
    el.cursorPath.hidden = !(loc && loc.segment);
    highlightCursorRow(loc);

    if (!loc) { el.cursorPos.textContent = 'Click inside a message to see the segment, field and component at the cursor.'; return; }
    el.cursorPos.textContent = 'Ln ' + loc.line + ', Col ' + loc.column;
    if (!loc.segment) return;

    el.cursorPath.textContent = loc.path;
    el.cursorPath.disabled = !loc.field;
    const crumbs = [D.segmentName(loc.segment)];
    if (!loc.field) crumbs.push('segment ID');
    else {
      const def = D.fieldDef(loc.segment, loc.field);
      let type = def ? def.type : '';
      if (type === '*') type = loc.segmentText.split(loc.delimiters.field)[2] || 'varies'; // OBX-5 typed by OBX-2
      crumbs.push((def ? def.name : 'Field ' + loc.field) + (type ? ' (' + type + ')' : ''));
      if (loc.repetitions > 1) crumbs.push('repetition ' + loc.repetition + ' of ' + loc.repetitions);
      const showSub = loc.subcomponents > 1;
      if (loc.components > 1 || showSub) crumbs.push(D.componentName(type, loc.component) || 'Component ' + loc.component);
      if (showSub) crumbs.push('sub-component ' + loc.subcomponent);

      const v = loc.value.length > 80 ? loc.value.slice(0, 80) + '…' : loc.value;
      const meaning = loc.components <= 1 ? D.codeMeaning(loc.segment, loc.field, loc.value) : null;
      el.cursorValue.textContent = v ? '= ' + JSON.stringify(v) + (meaning ? ' (' + meaning + ')' : '') : '(empty)';
    }
    crumbs.forEach(function (c, i) {
      if (i) el.cursorCrumbs.appendChild(h('span', { class: 'sep', 'aria-hidden': 'true' }, '›'));
      el.cursorCrumbs.appendChild(h('span', null, c));
    });
  }

  /** Parsed segment for a cursor location, if the rendered results are for the same message. */
  function cursorSegment(loc) {
    const m = state.result && state.result.messages[loc.message];
    return m ? m.segments.find(function (s) { return s.line === loc.line; }) : null;
  }

  let cursorRow = null; // tracked, not queried: a selector scan of a big results page is slow

  function highlightCursorRow(loc) {
    if (cursorRow) { cursorRow.classList.remove('is-cursor'); cursorRow = null; }
    if (!loc || !loc.field || loc.message !== state.messageIndex) return;
    const seg = cursorSegment(loc);
    const row = seg && $('f-' + seg.index + '-' + loc.field);
    if (row) { row.classList.add('is-cursor'); cursorRow = row; }
  }

  el.cursorPath.addEventListener('click', function () {
    if (!cursorLoc || !cursorLoc.field) return;
    parseInput(); // make sure results reflect the latest text
    const loc = P.locate(el.input.value, caretOffset());
    if (loc.message !== state.messageIndex) { state.messageIndex = loc.message; renderResults(); }
    const seg = cursorSegment(loc);
    if (seg) jumpToField(seg.index, loc.field);
  });

  ['input', 'keyup', 'click', 'focus', 'select', 'mouseup', 'selectionchange'].forEach(function (type) {
    el.input.addEventListener(type, scheduleCursor);
  });
  document.addEventListener('selectionchange', function () { if (document.activeElement === el.input) scheduleCursor(); });

  // ---------- Session store (memory only) ----------
  // Saved messages live solely in this closure. They are never written to any storage API,
  // so they are gone when the tab closes, the page reloads, or the session is cleared.

  const MAX_SAVED = 200;
  const MAX_SAVED_CHARS = 20 * 1024 * 1024;
  const saved = [];
  let activeId = 0;
  let nextId = 1;

  const MSH_LINE = /^[ \t\x0b]*MSH/gm;

  function savedLabel(text, id) {
    let first;
    let count;
    if (state.result && state.text === text) {
      first = state.result.messages[0];
      count = state.result.messages.length;
    } else {
      // Label from the first message only; parsing a whole large batch again here is slow.
      MSH_LINE.lastIndex = 0;
      const starts = [];
      let m;
      while ((m = MSH_LINE.exec(text))) starts.push(m.index);
      if (starts.length > 1) {
        first = P.parse(text.slice(0, starts[1])).messages[0];
        count = starts.length;
      } else { // one message, or segments separated by literal "\r" text: parse it all
        const messages = P.parse(text).messages;
        first = messages[0];
        count = messages.length;
      }
    }
    const info = first ? describeMessage(first) : {};
    const label = [info.type, info.patient || info.controlId].filter(Boolean).join(' · ') || 'Message ' + id;
    return count > 1 ? label + ' (+' + (count - 1) + ' more)' : label;
  }

  function saveCurrent() {
    const text = el.input.value;
    if (!text.trim()) { toast('Nothing to save'); return; }
    const existing = saved.find(function (s) { return s.text === text; });
    if (existing) { activeId = existing.id; renderSaved(); toast('Already saved'); return; }
    const total = saved.reduce(function (n, s) { return n + s.text.length; }, 0);
    if (saved.length >= MAX_SAVED || total + text.length > MAX_SAVED_CHARS) {
      toast('Session limit reached — delete some saved messages');
      return;
    }
    const id = nextId++;
    saved.push({ id: id, label: savedLabel(text, id), text: text, savedAt: new Date() });
    activeId = id;
    renderSaved();
    toast('Saved for this session');
  }

  function loadSaved(entry) {
    el.input.value = entry.text;
    state.messageIndex = 0;
    parseInput();
  }

  function renameSaved(entry) {
    const name = window.prompt('Rename saved message', entry.label);
    if (name === null || !name.trim()) return;
    entry.label = name.trim().slice(0, 80);
    renderSaved();
  }

  function deleteSaved(entry) {
    saved.splice(saved.indexOf(entry), 1);
    if (activeId === entry.id) activeId = 0;
    renderSaved();
  }

  /** Marks the saved entry matching the current input, if any. */
  function syncActive() {
    const match = saved.find(function (s) { return s.text === el.input.value; });
    const id = match ? match.id : 0;
    if (id !== activeId) { activeId = id; renderSaved(); }
  }

  function savedTime(entry) {
    return entry.savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /** True when the input holds text that no saved entry matches, so switching would lose it. */
  function hasUnsavedInput() {
    const text = el.input.value;
    return text.trim() !== '' && !saved.some(function (s) { return s.text === text; });
  }

  /** For clicks, menus and drops: asks before replacing input that isn't saved. */
  function confirmReplace() {
    return !hasUnsavedInput() || window.confirm('Replace the current message? It hasn’t been saved, so it will be lost.');
  }

  /** Keyboard switching: loads an entry unless that would discard unsaved input. */
  function switchTo(entry) {
    if (el.input.value === entry.text) return;
    if (hasUnsavedInput()) { toast('Current message isn’t saved — Save (Ctrl+S) or Clear it first'); return; }
    loadSaved(entry);
    toast((saved.indexOf(entry) + 1) + '/' + saved.length + ' · ' + entry.label);
  }

  function stepSaved(dir) {
    if (!saved.length) { toast('No saved messages'); return; }
    const i = saved.findIndex(function (s) { return s.text === el.input.value; });
    const next = i < 0 ? (dir > 0 ? 0 : saved.length - 1) : (i + dir + saved.length) % saved.length;
    switchTo(saved[next]);
  }

  function renderSaved() {
    el.savedCount.textContent = String(saved.length);
    el.clearAllBtn.disabled = !saved.length;
    el.savedList.hidden = !saved.length;
    el.savedKeys.hidden = !saved.length;
    el.savedList.replaceChildren();
    saved.forEach(function (entry, i) {
      const time = savedTime(entry);
      const keyHint = i < 9 ? ' · Alt+' + (i + 1) : '';
      el.savedList.appendChild(h('div', { class: 'chip' + (entry.id === activeId ? ' is-active' : '') },
        h('button', {
          class: 'chip-main', type: 'button', title: entry.label + ' — saved ' + time + keyHint + ' (double-click to rename)',
          onclick: function () { if (el.input.value !== entry.text && confirmReplace()) loadSaved(entry); },
          ondblclick: function () { renameSaved(entry); },
        }, h('span', { class: 'chip-label' }, entry.label), h('span', { class: 'chip-time' }, time)),
        h('button', { class: 'chip-btn', type: 'button', title: 'Rename', 'aria-label': 'Rename ' + entry.label,
          onclick: function () { renameSaved(entry); } }, '✎'),
        h('button', { class: 'chip-btn', type: 'button', title: 'Delete', 'aria-label': 'Delete ' + entry.label,
          onclick: function () { deleteSaved(entry); } }, '×')));
    });
    if (el.switcher.open) renderSwitcher();
  }

  // ---------- Quick switcher (Ctrl+K) ----------

  let switcherMatches = [];
  let switcherIndex = 0;

  function openSwitcher() {
    if (!saved.length) { toast('No saved messages'); return; }
    el.switcherInput.value = '';
    switcherIndex = -1; // start on the active entry
    el.switcher.showModal();
    renderSwitcher();
    el.switcherInput.focus();
  }

  function renderSwitcher() {
    const q = el.switcherInput.value.trim().toLowerCase();
    switcherMatches = saved.filter(function (s) { return s.label.toLowerCase().indexOf(q) !== -1; });
    if (switcherIndex < 0) switcherIndex = Math.max(0, switcherMatches.findIndex(function (s) { return s.id === activeId; }));
    switcherIndex = Math.min(switcherIndex, Math.max(0, switcherMatches.length - 1));
    el.switcherList.replaceChildren();
    if (!switcherMatches.length) {
      el.switcherList.appendChild(h('div', { class: 'switcher-empty' }, 'No saved messages match'));
      el.switcherInput.removeAttribute('aria-activedescendant');
      return;
    }
    switcherMatches.forEach(function (entry, i) {
      const n = saved.indexOf(entry);
      const selected = i === switcherIndex;
      el.switcherList.appendChild(h('div', {
        class: 'switcher-item' + (selected ? ' is-selected' : '') + (entry.id === activeId ? ' is-active' : ''),
        id: 'switcher-opt-' + entry.id, role: 'option', 'aria-selected': String(selected),
        onmousedown: function (e) { e.preventDefault(); }, // keep focus in the search box
        onclick: function () { chooseSwitcher(entry); },
      }, h('span', { class: 'switcher-label' }, entry.label),
        h('span', { class: 'chip-time' }, savedTime(entry)),
        n < 9 ? h('kbd', null, 'Alt+' + (n + 1)) : null));
    });
    const current = switcherMatches[switcherIndex];
    el.switcherInput.setAttribute('aria-activedescendant', 'switcher-opt-' + current.id);
    $('switcher-opt-' + current.id).scrollIntoView({ block: 'nearest' });
  }

  function chooseSwitcher(entry) {
    el.switcher.close();
    switchTo(entry);
  }

  /** Erases every saved message and the current input, including every copy shown in the page. */
  function clearSession() {
    if (el.switcher.open) el.switcher.close();
    el.switcherList.replaceChildren();
    el.switcherInput.value = '';
    el.switcherInput.removeAttribute('aria-activedescendant');
    switcherMatches = [];
    saved.length = 0;
    activeId = 0;
    el.input.value = '';
    el.filter.value = '';
    clearToast(); // switch notices name the patient
    reset();
    renderSaved();
  }

  function hasSessionData() {
    return saved.length > 0 || el.input.value !== '';
  }

  // ---------- Idle auto-clear ----------
  // Uses wall-clock timestamps rather than one long timer, so throttled background tabs and
  // a sleeping computer still clear as soon as the page runs again.

  const WARN_MS = 60 * 1000;
  let idleMs = 15 * 60 * 1000;
  let lastActivity = Date.now();
  let clearedNotice = false;

  // Test hook: "?idle=<seconds>" sets a custom timeout (used by automated checks). Capped at the
  // longest menu choice, so a link can shorten auto-clear but never stretch it past 60 minutes.
  const idleParam = /[?&]idle=(\d{1,4})(?:&|$)/.exec(location.search);
  if (idleParam && +idleParam[1] > 0 && +idleParam[1] <= 3600) {
    el.idleSelect.appendChild(h('option', { value: idleParam[1] }, 'after ' + idleParam[1] + ' s idle'));
    idleMs = +idleParam[1] * 1000;
  }

  // The menu must always show the timeout in force, even if the browser restores an old choice.
  function syncIdleSelect() { el.idleSelect.value = String(idleMs / 1000); }
  syncIdleSelect();

  function showBanner(text, keepButton) {
    el.idleText.textContent = text;
    el.idleKeep.hidden = !keepButton;
    el.idleBanner.hidden = false;
  }

  function markActive() {
    // Activity after the deadline (e.g. the first click after waking a sleeping laptop, before the
    // interval runs) must clear the session, not revive it.
    if (idleMs && !clearedNotice && hasSessionData() && Date.now() - lastActivity >= idleMs) { checkIdle(); return; }
    lastActivity = Date.now();
    if (!el.idleBanner.hidden) { el.idleBanner.hidden = true; clearedNotice = false; }
  }

  function checkIdle() {
    if (clearedNotice) return;
    if (!idleMs || !hasSessionData()) { el.idleBanner.hidden = true; return; }
    const idle = Date.now() - lastActivity;
    if (idle >= idleMs) {
      clearSession();
      clearedNotice = true;
      showBanner('Messages were cleared after ' + formatDuration(idleMs) + ' of inactivity.', false);
    } else if (idle >= idleMs - Math.min(WARN_MS, idleMs / 2)) {
      showBanner('Clearing all messages in ' + Math.ceil((idleMs - idle) / 1000) + ' s due to inactivity.', true);
    }
  }

  function formatDuration(ms) {
    return ms >= 60000 ? Math.round(ms / 60000) + ' min' : Math.round(ms / 1000) + ' s';
  }

  ['pointerdown', 'keydown', 'wheel', 'scroll', 'paste', 'input', 'touchstart'].forEach(function (type) {
    document.addEventListener(type, markActive, { capture: true, passive: true });
  });
  // Check as soon as the page can be seen again (wake from sleep, unfrozen tab), not on the next tick.
  document.addEventListener('visibilitychange', function () { if (!document.hidden) checkIdle(); });
  document.addEventListener('resume', checkIdle);
  window.addEventListener('focus', checkIdle);
  window.addEventListener('pageshow', function () { syncIdleSelect(); checkIdle(); });
  setInterval(checkIdle, 1000);

  el.idleSelect.addEventListener('change', function () {
    idleMs = +el.idleSelect.value * 1000;
    markActive();
  });

  // ---------- Page lifecycle ----------

  // Warn before a close or refresh would discard the session.
  window.addEventListener('beforeunload', function (e) {
    if (hasSessionData()) { e.preventDefault(); e.returnValue = ''; }
  });
  // Wipe on leaving so a back/forward-cached copy of the page holds nothing.
  window.addEventListener('pagehide', clearSession);
  // Discard any form state the browser restored into the textarea.
  window.addEventListener('pageshow', function () { if (!saved.length) { el.input.value = ''; renderEditor(); } });

  // ---------- Utilities ----------

  let toastTimer = 0;
  function toast(text) {
    el.toast.textContent = text;
    el.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(clearToast, 1600);
  }

  /** Hides the toast and drops its text, which may name a patient. */
  function clearToast() {
    clearTimeout(toastTimer);
    el.toast.classList.remove('is-visible');
    el.toast.textContent = '';
  }

  function copy(text) {
    // Clipboard writes are local to this computer.
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast('Copied'); }, fallbackCopy.bind(null, text));
    } else fallbackCopy(text);
  }

  function fallbackCopy(text) {
    // Same opt-outs as the input box: some spellcheck and grammar extensions upload text they see.
    const ta = h('textarea', {
      class: 'offscreen', readonly: true, spellcheck: 'false', autocomplete: 'off', 'aria-hidden': 'true',
      'data-gramm': 'false', 'data-gramm_editor': 'false', 'data-enable-grammarly': 'false', 'data-lt-active': 'false',
    });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('Copied'); } catch (e) { toast('Copy failed'); }
    ta.remove();
  }

  function readFile(file) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast('File is larger than 20 MB'); return; }
    if (!confirmReplace()) return;
    const reader = new FileReader(); // reads from local disk only
    reader.onload = function () {
      el.input.value = decodeFile(reader.result);
      state.messageIndex = 0;
      parseInput();
    };
    reader.onerror = function () { toast('Could not read file'); };
    reader.readAsArrayBuffer(file);
  }

  /** UTF-8 when the bytes are valid UTF-8; otherwise Windows-1252, which many HL7 interfaces send. */
  function decodeFile(buffer) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch (e) {
      toast('File isn’t valid UTF-8; read it as Windows-1252');
      return new TextDecoder('windows-1252').decode(buffer);
    }
  }

  function debounce(fn, ms) {
    let t = 0;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  // ---------- Theme (preference only; no message data is stored) ----------

  const THEMES = ['light', 'dark'];
  const THEME_NAMES = { light: 'Light', dark: 'Dark' };
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || (systemDark.matches ? 'dark' : 'light');
  }

  function nextTheme() {
    return THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length];
  }

  /** Applies a theme (or the system default when not one of THEMES) and updates the button. */
  function applyTheme(theme) {
    if (THEMES.indexOf(theme) !== -1) document.documentElement.setAttribute('data-theme', theme);
    else document.documentElement.removeAttribute('data-theme');
    const now = currentTheme();
    el.themeToggle.querySelectorAll('[data-icon]').forEach(function (icon) {
      icon.toggleAttribute('hidden', icon.getAttribute('data-icon') !== now);
    });
    const label = 'Theme: ' + THEME_NAMES[now] + ' (click for ' + THEME_NAMES[nextTheme()] + ')';
    el.themeToggle.title = label;
    el.themeToggle.setAttribute('aria-label', label);
  }

  let savedTheme = null;
  try { savedTheme = localStorage.getItem('hl7forge-theme'); } catch (e) { /* storage unavailable */ }
  applyTheme(savedTheme);
  systemDark.addEventListener('change', function () { applyTheme(document.documentElement.getAttribute('data-theme')); });

  el.themeToggle.addEventListener('click', function () {
    const next = nextTheme();
    applyTheme(next);
    try { localStorage.setItem('hl7forge-theme', next); } catch (e) { /* storage unavailable */ }
  });

  // ---------- Network guard indicator ----------

  let blocked = 0;
  document.addEventListener('securitypolicyviolation', function (e) {
    // Count only blocked loads. Inline styles or scripts (often injected by extensions) aren't requests.
    if (!/^[a-z][a-z0-9+.-]*:/i.test(e.blockedURI || '')) return;
    blocked++;
    el.privacyText.textContent = 'Local only · blocked ' + blocked + ' outbound request' + (blocked === 1 ? '' : 's');
    el.privacyBadge.classList.add('has-blocked');
  });

  // ---------- Events ----------

  el.parseBtn.addEventListener('click', parseInput);
  el.clearBtn.addEventListener('click', function () { el.input.value = ''; el.filter.value = ''; reset(); el.input.focus(); });
  el.input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); parseInput(); }
  });
  // Typing re-parses after a pause, keeping the selected batch message. Very large inputs take
  // seconds to parse, so they wait for Parse / Ctrl+Enter instead of re-parsing on every pause.
  el.input.addEventListener('input', debounce(function () {
    if (el.input.value.length <= AUTO_PARSE_LIMIT) parseInput();
    else if (!largeInputHinted) { largeInputHinted = true; toast('Large input: press Parse (Ctrl+Enter) to update the results'); }
  }, 350));

  el.sampleSelect.addEventListener('change', function () {
    const sample = Object.prototype.hasOwnProperty.call(window.HL7Samples, el.sampleSelect.value)
      ? window.HL7Samples[el.sampleSelect.value] : null;
    el.sampleSelect.value = '';
    if (!sample || !confirmReplace()) return;
    el.input.value = sample;
    state.messageIndex = 0;
    parseInput();
  });

  el.openBtn.addEventListener('click', function () { el.fileInput.click(); });
  el.fileInput.addEventListener('change', function () { readFile(el.fileInput.files[0]); el.fileInput.value = ''; });

  // Drop a file onto the input; prevent the browser from navigating to dropped files elsewhere.
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) { e.preventDefault(); });
  el.input.addEventListener('dragover', function (e) { e.preventDefault(); el.input.classList.add('is-drop'); });
  el.input.addEventListener('dragleave', function () { el.input.classList.remove('is-drop'); });
  el.input.addEventListener('drop', function (e) {
    e.preventDefault();
    el.input.classList.remove('is-drop');
    if (e.dataTransfer.files.length) readFile(e.dataTransfer.files[0]);
    else if (confirmReplace()) { el.input.value = e.dataTransfer.getData('text/plain'); state.messageIndex = 0; parseInput(); }
  });

  el.tabSegments.addEventListener('click', function () { setView('segments'); });
  el.tabRaw.addEventListener('click', function () { setView('raw'); });
  el.messageSelect.addEventListener('change', function () { state.messageIndex = +el.messageSelect.value; renderResults(); });
  el.filter.addEventListener('input', debounce(applyFilter, 120));
  el.hideEmpty.addEventListener('change', applyFilter);
  el.expandBtn.addEventListener('click', function () {
    allCollapsed = !allCollapsed;
    el.segView.querySelectorAll('.seg-card').forEach(function (c) { setCollapsed(c, allCollapsed); });
    el.expandBtn.textContent = allCollapsed ? 'Expand all' : 'Collapse all';
  });

  el.saveBtn.addEventListener('click', saveCurrent);
  document.addEventListener('keydown', function (e) {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 's') {
      e.preventDefault(); // suppress the browser's "Save page" dialog
      saveCurrent();
    } else if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
      e.preventDefault(); // suppress the browser's search-bar shortcut
      if (el.switcher.open) el.switcher.close(); else openSwitcher();
    } else if (e.altKey && !mod && !e.shiftKey && !el.switcher.open && e.target.tagName !== 'SELECT') {
      // (Alt+↑/↓ on a <select> is the standard way to open its list, so leave those alone.)
      // e.code, not e.key: on macOS Option+digit types a symbol instead of the digit.
      const digit = /^Digit([1-9])$/.exec(e.code);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        stepSaved(e.key === 'ArrowDown' ? 1 : -1);
      } else if (digit) {
        e.preventDefault();
        const entry = saved[+digit[1] - 1];
        if (entry) switchTo(entry); else toast('No saved message ' + digit[1]);
      }
    }
  });
  el.switcherInput.addEventListener('input', function () { switcherIndex = 0; renderSwitcher(); });
  el.switcherInput.addEventListener('keydown', function (e) {
    const count = switcherMatches.length;
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && count) {
      e.preventDefault();
      switcherIndex = (switcherIndex + (e.key === 'ArrowDown' ? 1 : -1) + count) % count;
      renderSwitcher();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (count) chooseSwitcher(switcherMatches[switcherIndex]);
    }
  });
  // Clicking the backdrop (outside the panel) closes the switcher.
  el.switcher.addEventListener('click', function (e) { if (e.target === el.switcher) el.switcher.close(); });
  el.clearAllBtn.addEventListener('click', function () {
    if (window.confirm('Erase all ' + saved.length + ' saved message(s) and the current input? This cannot be undone.')) clearSession();
  });
  el.idleKeep.addEventListener('click', markActive);
  el.inputForm.addEventListener('submit', function (e) { e.preventDefault(); });

  el.input.value = '';
  reset();
  renderSaved();
})();
