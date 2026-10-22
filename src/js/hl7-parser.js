/*
 * HL7Forge — HL7 v2.x parser.
 * Pure function of its input: no I/O, no network, no storage. Runs entirely in the
 * browser (or Node, for tests).
 */
'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HL7Parser = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const HEADER_SEGMENTS = ['MSH', 'BHS', 'FHS'];
  const DEFAULT_DELIMITERS = Object.freeze({
    field: '|', component: '^', repetition: '~', escape: '\\', subcomponent: '&', truncation: null,
  });
  const SEGMENT_ID = /^[A-Z][A-Z0-9]{2}$/;
  const MLLP = /[\x0b\x1c]/g; // MLLP block start / end characters
  const LITERAL_BREAK = /(?:\\r\\n|\\r|\\n)(?=[A-Z][A-Z0-9]{2}[^A-Za-z0-9\s])/;

  /** True when segments are separated by literal "\r" / "\n" text (as copied from logs or JSON). */
  function hasLiteralBreaks(text) {
    return !/[\r\n]/.test(text.trim()) && LITERAL_BREAK.test(text);
  }

  /** Strips BOM and MLLP framing, and splits into non-blank segment lines with their line numbers. */
  function splitLines(text, warnings) {
    let clean = String(text).replace(/^﻿/, '');

    if (hasLiteralBreaks(clean)) {
      clean = clean.replace(new RegExp(LITERAL_BREAK.source, 'g'), '\n');
      warnings.push({ level: 'info', message: 'Segments were separated by literal "\\r" text; treated as line breaks.' });
    }

    // MLLP characters are stripped per line, after splitting: stripping first would merge
    // "\r\x1c\n" into one "\r\n" break and shift every later line number off the editor's.
    const lines = [];
    clean.split(/\r\n|\r|\n/).forEach(function (line, i) {
      const trimmed = line.replace(MLLP, '').replace(/^\s+/, '');
      if (trimmed) lines.push({ text: trimmed, line: i + 1 });
    });
    return lines;
  }

  /** Reads delimiters from a header segment (MSH/BHS/FHS). */
  function readDelimiters(text, warnings, line) {
    const field = text.charAt(3);
    if (!field || /[A-Za-z0-9\s]/.test(field)) {
      warnings.push({ level: 'error', line: line, message: 'Header segment has no valid field separator after "' + text.slice(0, 3) + '"; using "|".' });
      return Object.assign({}, DEFAULT_DELIMITERS);
    }
    const end = text.indexOf(field, 4);
    const enc = end === -1 ? text.slice(4) : text.slice(4, end);
    if (enc.length < 4) {
      warnings.push({ level: 'warning', line: line, message: 'Encoding characters "' + enc + '" are incomplete; defaults used for missing ones.' });
    }
    const d = {
      field: field,
      component: enc.charAt(0) || DEFAULT_DELIMITERS.component,
      repetition: enc.charAt(1) || DEFAULT_DELIMITERS.repetition,
      escape: enc.charAt(2) || DEFAULT_DELIMITERS.escape,
      subcomponent: enc.charAt(3) || DEFAULT_DELIMITERS.subcomponent,
      truncation: enc.charAt(4) || null,
    };
    const chars = [d.field, d.component, d.repetition, d.escape, d.subcomponent];
    if (new Set(chars).size !== chars.length) {
      warnings.push({ level: 'error', line: line, message: 'Delimiter characters are not unique: ' + chars.join(' ') });
    }
    return d;
  }

  const MAX_SP_LINES = 100; // caps "\.spNNN\" so a crafted count can't build a huge string

  function decodeHex(hex) {
    const bytes = new Uint8Array(hex.length >> 1);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    if (typeof TextDecoder !== 'undefined') {
      try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch (e) { /* not UTF-8 */ }
    }
    // Latin-1 fallback, built in chunks: spreading a large array into fromCharCode overflows the stack.
    let out = '';
    for (let i = 0; i < bytes.length; i += 8192) out += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    return out;
  }

  function translateEscape(seq, d) {
    switch (seq) {
      case 'F': return d.field;
      case 'S': return d.component;
      case 'T': return d.subcomponent;
      case 'R': return d.repetition;
      case 'E': return d.escape;
      case 'P': return d.truncation || null;
      case 'H': case 'N': return '';
      case '.br': return '\n';
      case '.fi': case '.nf': case '.ce': return '';
    }
    if (/^X(?:[0-9A-Fa-f]{2})+$/.test(seq)) return decodeHex(seq.slice(1));
    if (/^\.sp\d*$/.test(seq)) return '\n'.repeat(Math.min(MAX_SP_LINES, Math.max(1, parseInt(seq.slice(3), 10) || 1)));
    if (/^\.(?:in|ti|sk)[+-]?\d*$/.test(seq)) return '';
    if (/^[CM][0-9A-Fa-f]+$/.test(seq)) return '';
    return null; // unknown (e.g. Z custom) — leave as-is
  }

  /** Decodes HL7 escape sequences (\F\, \S\, \T\, \R\, \E\, \Xhh\, \.br\ ...). */
  function unescape(value, d) {
    const e = d.escape;
    if (!e || value.indexOf(e) === -1) return value;
    let out = '';
    let i = 0;
    while (i < value.length) {
      if (value.charAt(i) !== e) { out += value.charAt(i++); continue; }
      const end = value.indexOf(e, i + 1);
      if (end === -1) { out += value.slice(i); break; }
      const decoded = translateEscape(value.slice(i + 1, end), d);
      out += decoded === null ? value.slice(i, end + 1) : decoded;
      i = end + 1;
    }
    return out;
  }

  function parseField(raw, position, d, literal) {
    if (literal) {
      return { position: position, raw: raw, value: raw, literal: true,
        repetitions: [{ raw: raw, components: [{ raw: raw, value: raw, subcomponents: [raw] }] }] };
    }
    const repetitions = raw.split(d.repetition).map(function (rep) {
      return {
        raw: rep,
        components: rep.split(d.component).map(function (comp) {
          return {
            raw: comp,
            value: unescape(comp, d),
            subcomponents: comp.split(d.subcomponent).map(function (s) { return unescape(s, d); }),
          };
        }),
      };
    });
    return { position: position, raw: raw, value: unescape(raw, d), literal: false, repetitions: repetitions };
  }

  function parseSegment(text, line, d, warnings) {
    const name = text.slice(0, 3);
    const isHeader = HEADER_SEGMENTS.indexOf(name) !== -1;
    const fields = [];

    if (!SEGMENT_ID.test(name)) {
      warnings.push({ level: 'warning', line: line, message: 'Unrecognized segment ID "' + name + '".' });
    } else if (text.length > 3 && text.charAt(3) !== d.field) {
      warnings.push({ level: 'warning', line: line, message: 'Segment ' + name + ' is not followed by the field separator "' + d.field + '".' });
    }

    const parts = text.split(d.field);
    if (isHeader) {
      fields.push(parseField(d.field, 1, d, true));
      if (parts.length > 1) fields.push(parseField(parts[1], 2, d, true));
      for (let i = 2; i < parts.length; i++) fields.push(parseField(parts[i], i + 1, d, false));
    } else {
      for (let i = 1; i < parts.length; i++) fields.push(parseField(parts[i], i, d, false));
    }
    return { name: name, line: line, raw: text, isHeader: isHeader, fields: fields };
  }

  /**
   * Parses HL7 text, which may contain one message or a batch of several.
   * Returns { messages: [{ segments, delimiters, warnings }], warnings }.
   */
  function parse(text) {
    const warnings = [];
    const lines = splitLines(text, warnings);
    const messages = [];
    if (!lines.length) {
      warnings.push({ level: 'error', message: 'No HL7 content found.' });
      return { messages: messages, warnings: warnings };
    }

    if (!lines.some(function (l) { return l.text.slice(0, 3) === 'MSH'; })) {
      warnings.push({ level: 'error', message: 'No MSH (Message Header) segment found; default delimiters | ^ ~ \\ & were assumed.' });
    }

    let d = Object.assign({}, DEFAULT_DELIMITERS);
    let current = null;
    let pending = []; // segments seen before the first MSH (FHS/BHS etc.)

    lines.forEach(function (l) {
      const id = l.text.slice(0, 3);
      if (HEADER_SEGMENTS.indexOf(id) !== -1) d = readDelimiters(l.text, warnings, l.line);
      if (id === 'MSH') {
        current = { segments: pending, delimiters: d, warnings: [] };
        pending = [];
        messages.push(current);
      }
      const target = current ? current.warnings : warnings;
      const seg = parseSegment(l.text, l.line, d, target);
      if (current) current.segments.push(seg);
      else pending.push(seg);
    });

    // Segments only collect in `pending` before the first MSH, so this is the no-MSH case.
    if (!messages.length) messages.push({ segments: pending, delimiters: d, warnings: [] });

    messages.forEach(function (m) {
      m.segments.forEach(function (s, i) { s.index = i; });
      validate(m);
    });
    return { messages: messages, warnings: warnings };
  }

  function validate(message) {
    const msh = message.segments.filter(function (s) { return s.name === 'MSH'; })[0];
    if (!msh) return;
    if (message.segments[0] !== msh && !/^(FHS|BHS)$/.test(message.segments[0].name)) {
      message.warnings.push({ level: 'warning', line: message.segments[0].line, message: 'MSH is not the first segment of the message.' });
    }
    [[9, 'Message Type'], [10, 'Message Control ID'], [12, 'Version ID']].forEach(function (req) {
      if (!getValue(message, 'MSH-' + req[0])) {
        message.warnings.push({ level: 'warning', line: msh.line, message: 'Required field MSH-' + req[0] + ' (' + req[1] + ') is empty.' });
      }
    });
  }

  const PATH = /^([A-Z][A-Z0-9]{2})(?:\[(\d+)\])?-(\d+)(?:\((\d+)\))?(?:\.(\d+))?(?:\.(\d+))?$/;

  /**
   * Gets a decoded value by terser-style path, e.g. "PID-5.1", "OBX[2]-5", "PID-3(2).1".
   * Segment occurrence and repetition are 1-based and default to 1.
   */
  function getValue(message, path) {
    const m = PATH.exec(path);
    if (!m) throw new Error('Invalid HL7 path: ' + path);
    const occurrence = m[2] ? +m[2] : 1;
    const seg = message.segments.filter(function (s) { return s.name === m[1]; })[occurrence - 1];
    if (!seg) return '';
    const field = seg.fields[+m[3] - 1];
    if (!field) return '';
    const rep = field.repetitions[(m[4] ? +m[4] : 1) - 1];
    if (!rep) return '';
    if (!m[5]) return unescape(rep.raw, message.delimiters);
    const comp = rep.components[+m[5] - 1];
    if (!comp) return '';
    if (!m[6]) return comp.value;
    return comp.subcomponents[+m[6] - 1] || '';
  }

  function countOf(s, ch) {
    let n = 0;
    for (let i = s.indexOf(ch); i !== -1; i = s.indexOf(ch, i + 1)) n++;
    return n;
  }

  function afterLast(s, ch) {
    return s.slice(s.lastIndexOf(ch) + 1);
  }

  /**
   * Describes where a character offset in raw HL7 text falls: line/column, segment and its
   * occurrence, field, repetition, component and sub-component. `path` uses getValue syntax
   * (e.g. "OBX[2]-5", "PID-3(2).4.1"), so getValue(message, path) returns `value`.
   * Line numbers and message indexes match those produced by parse().
   */
  function locate(text, offset) {
    const src = String(text);
    offset = Math.max(0, Math.min(offset, src.length));
    const breaks = new RegExp((hasLiteralBreaks(src) ? LITERAL_BREAK.source + '|' : '') + '\\r\\n|\\r|\\n', 'g');
    let d = Object.assign({}, DEFAULT_DELIMITERS);
    let seen = {};
    let msh = 0;

    // Same cleanup as splitLines: drop MLLP characters anywhere, then leading whitespace.
    const clean = function (lineText) { return lineText.replace(MLLP, '').replace(/^\s+/, ''); };
    const note = function (lineText) {
      const t = clean(lineText);
      if (!t) return null;
      const id = t.slice(0, 3);
      if (HEADER_SEGMENTS.indexOf(id) !== -1) d = readDelimiters(t, [], 0);
      // parse() puts segments seen before the first MSH (FHS, BHS…) into the first message, so
      // occurrence counts carry over into it and only restart at later MSHs.
      if (id === 'MSH') { if (msh) seen = {}; msh++; }
      seen[id] = (seen[id] || 0) + 1;
      return id;
    };

    let line = 1;
    let lineStart = 0;
    let m;
    while ((m = breaks.exec(src)) && m.index < offset) {
      note(src.slice(lineStart, m.index));
      lineStart = m.index + m[0].length;
      line++;
    }
    const raw = src.slice(lineStart, m ? m.index : src.length);
    const segText = clean(raw);
    const indent = raw.replace(MLLP, '').length - segText.length; // leading whitespace, MLLP removed
    const id = note(raw);

    const result = {
      line: line, column: offset - lineStart + 1, message: Math.max(0, msh - 1),
      segment: id, occurrence: id ? seen[id] : 0, field: 0, repetition: 0, component: 0, subcomponent: 0,
      repetitions: 0, components: 0, subcomponents: 0, path: '', value: '', segmentText: segText, delimiters: d,
    };
    if (!id) return result;

    result.path = id + (result.occurrence > 1 ? '[' + result.occurrence + ']' : '');
    // Cut at the caret in the raw line and clean it the same way, so it stays a prefix of segText.
    const prefix = raw.slice(0, offset - lineStart).replace(MLLP, '').slice(indent);
    const seps = countOf(prefix, d.field);
    if (!seps) return result; // on the segment ID

    const isHeader = HEADER_SEGMENTS.indexOf(id) !== -1;
    const fieldRaw = segText.split(d.field)[seps];
    result.field = isHeader ? seps + 1 : seps; // in headers, the first separator is itself field 1
    result.path += '-' + result.field;
    if (isHeader && result.field === 2) { result.value = fieldRaw; return result; }

    const inField = afterLast(prefix, d.field);
    const reps = fieldRaw.split(d.repetition);
    result.repetition = countOf(inField, d.repetition) + 1;
    const inRep = afterLast(inField, d.repetition);
    const comps = reps[result.repetition - 1].split(d.component);
    result.component = countOf(inRep, d.component) + 1;
    const inComp = afterLast(inRep, d.component);
    const subs = comps[result.component - 1].split(d.subcomponent);
    result.subcomponent = countOf(inComp, d.subcomponent) + 1;

    result.repetitions = reps.length;
    result.components = comps.length;
    result.subcomponents = subs.length;
    const showSub = subs.length > 1;
    const showComp = comps.length > 1 || showSub;
    if (reps.length > 1) result.path += '(' + result.repetition + ')';
    if (showComp) result.path += '.' + result.component;
    if (showSub) result.path += '.' + result.subcomponent;
    const unit = showSub ? subs[result.subcomponent - 1] : showComp ? comps[result.component - 1] : reps[result.repetition - 1];
    result.value = unescape(unit, d);
    return result;
  }

  /**
   * Splits raw HL7 text into syntax-highlighting tokens. Lossless: joining every token's text
   * reproduces the input exactly, so the result can be drawn under an editable textarea.
   * Kinds: 'break' (line break, real or literal "\r"), 'space' (leading whitespace), 'segment',
   * 'text', 'escape' (escape sequence), 'encoding' (MSH-2), and the delimiters 'field',
   * 'component', 'repetition', 'subcomponent'. Tokens inside a field carry its `field` position;
   * a 'field' delimiter carries the position of the field it starts, except MSH-1, where the
   * separator is itself the field value (`value: true`).
   * `delimiters` sets the starting delimiters (header segments always supply their own).
   * `literal` says whether literal "\r" text separates segments; by default it is detected from
   * `text`. Pass the full text's answer when tokenizing a slice of it, so both agree.
   */
  function tokenize(text, delimiters, literal) {
    const src = String(text);
    const literalBreaks = literal === undefined ? hasLiteralBreaks(src) : literal;
    const breaks = new RegExp((literalBreaks ? LITERAL_BREAK.source + '|' : '') + '\\r\\n|\\r|\\n', 'g');
    const tokens = [];
    let d = Object.assign({}, delimiters || DEFAULT_DELIMITERS);

    function tokenizeLine(raw) {
      const indent = /^\s*/.exec(raw)[0];
      if (indent) tokens.push({ kind: 'space', text: indent, field: 0 });
      const body = raw.slice(indent.length);
      if (!body) return;
      const id = body.slice(0, 3);
      const isHeader = HEADER_SEGMENTS.indexOf(id) !== -1;
      if (isHeader) d = readDelimiters(body, [], 0);
      tokens.push({ kind: 'segment', text: id, field: 0 });

      let i = 3;
      let field = 0;
      if (isHeader && body.charAt(3) === d.field) {
        tokens.push({ kind: 'field', text: d.field, field: 1, value: true });
        const end = body.indexOf(d.field, 4);
        const enc = body.slice(4, end === -1 ? body.length : end);
        if (enc) tokens.push({ kind: 'encoding', text: enc, field: 2 });
        i = 4 + enc.length;
        field = 2;
      }

      const delimKinds = {};
      delimKinds[d.component] = 'component';
      delimKinds[d.repetition] = 'repetition';
      delimKinds[d.subcomponent] = 'subcomponent';
      let buf = '';
      let close;
      const flush = function () { if (buf) { tokens.push({ kind: 'text', text: buf, field: field }); buf = ''; } };
      // Index of the escape that closes the sequence opened at `from`, or -1. Like parse(), which
      // splits on delimiters before unescaping, a sequence never spans a delimiter.
      const escapeClose = function (s, from) {
        for (let j = from + 1; j < s.length; j++) {
          const c = s.charAt(j);
          if (c === d.escape) return j;
          if (c === d.field || delimKinds[c]) return -1;
        }
        return -1;
      };

      while (i < body.length) {
        const ch = body.charAt(i);
        if (ch === d.field) {
          flush();
          field++;
          tokens.push({ kind: 'field', text: ch, field: field });
          i++;
        } else if (delimKinds[ch]) {
          flush();
          tokens.push({ kind: delimKinds[ch], text: ch, field: field });
          i++;
        } else if (ch === d.escape && (close = escapeClose(body, i)) !== -1) {
          flush();
          tokens.push({ kind: 'escape', text: body.slice(i, close + 1), field: field });
          i = close + 1;
        } else {
          buf += ch;
          i++;
        }
      }
      flush();
    }

    let start = 0;
    let m;
    while ((m = breaks.exec(src))) {
      tokenizeLine(src.slice(start, m.index));
      tokens.push({ kind: 'break', text: m[0], field: 0 });
      start = m.index + m[0].length;
    }
    tokenizeLine(src.slice(start));
    return tokens;
  }

  return {
    parse: parse, getValue: getValue, unescape: unescape, locate: locate, tokenize: tokenize,
    hasLiteralBreaks: hasLiteralBreaks,
    DEFAULT_DELIMITERS: DEFAULT_DELIMITERS,
  };
});
