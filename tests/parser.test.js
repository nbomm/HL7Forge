'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/js/hl7-parser.js');
const D = require('../src/js/hl7-definitions.js');
require('../src/js/samples.js');
const samples = globalThis.HL7Samples;

test('parses MSH delimiters and header fields', () => {
  const { messages, warnings } = P.parse(samples.adt);
  assert.equal(messages.length, 1);
  assert.deepEqual(warnings, []);
  const m = messages[0];
  assert.deepEqual(m.warnings, []);
  assert.equal(m.delimiters.field, '|');
  assert.equal(m.delimiters.escape, '\\');
  assert.equal(P.getValue(m, 'MSH-1'), '|');
  assert.equal(P.getValue(m, 'MSH-2'), '^~\\&');
  assert.equal(P.getValue(m, 'MSH-9.1'), 'ADT');
  assert.equal(P.getValue(m, 'MSH-9.2'), 'A01');
  assert.equal(P.getValue(m, 'MSH-10'), 'MSG00001');
  assert.equal(P.getValue(m, 'MSH-12'), '2.5.1');
});

test('handles repetitions, components and segment occurrences', () => {
  const m = P.parse(samples.adt).messages[0];
  assert.equal(P.getValue(m, 'PID-3.1'), '100234567');
  assert.equal(P.getValue(m, 'PID-3(2).1'), '987-65-4320');
  assert.equal(P.getValue(m, 'PID-3(2).5'), 'SS');
  assert.equal(P.getValue(m, 'PID-5.2'), 'JOHN');
  assert.equal(P.getValue(m, 'PID-13(2).4'), 'john.doe@example.com');
  const oru = P.parse(samples.oru).messages[0];
  assert.equal(P.getValue(oru, 'OBX[3]-5'), '3.1');
  assert.equal(P.getValue(oru, 'OBX[3]-8'), 'L');
  assert.equal(P.getValue(oru, 'OBX[9]-5'), '');
});

test('decodes escape sequences', () => {
  const oru = P.parse(samples.oru).messages[0];
  assert.equal(P.getValue(oru, 'OBX[5]-5'), 'Specimen slightly hemolyzed & re-check advised.');
  assert.equal(P.getValue(oru, 'NTE-3'), 'Glucose drawn non-fasting.\nPlease correlate clinically.');
  const d = P.DEFAULT_DELIMITERS;
  assert.equal(P.unescape('a\\F\\b\\S\\c\\R\\d\\E\\e', d), 'a|b^c~d\\e');
  assert.equal(P.unescape('\\X41C3A9\\', d), 'Aé');
  assert.equal(P.unescape('\\Zcustom\\', d), '\\Zcustom\\');
});

test('accepts \\n, \\r\\n, MLLP framing and literal "\\r" separators', () => {
  const lines = samples.ack.split('\r');
  for (const text of [lines.join('\n'), lines.join('\r\n'), '\x0b' + lines.join('\r') + '\x1c\r', lines.join('\\r')]) {
    const { messages } = P.parse(text);
    assert.equal(messages.length, 1);
    assert.deepEqual(messages[0].segments.map(s => s.name), ['MSH', 'MSA', 'ERR']);
    assert.equal(P.getValue(messages[0], 'MSA-1'), 'AE');
  }
});

test('honors non-default delimiters', () => {
  const m = P.parse('MSH#$*@%#APP#FAC\nPID#1##123$$$X$MR*456##DOE$JANE%Q').messages[0];
  assert.equal(P.getValue(m, 'MSH-2'), '$*@%');
  assert.equal(P.getValue(m, 'PID-3.5'), 'MR');
  assert.equal(P.getValue(m, 'PID-3(2).1'), '456');
  assert.equal(P.getValue(m, 'PID-5.2.1'), 'JANE');
  assert.equal(P.getValue(m, 'PID-5.2.2'), 'Q');
});

test('splits batches into messages', () => {
  const batch = ['FHS|^~\\&|A', 'BHS|^~\\&|A', samples.ack.replace(/\r/g, '\n'), samples.adt.replace(/\r/g, '\n'), 'BTS|2', 'FTS|1'].join('\n');
  const { messages } = P.parse(batch);
  assert.equal(messages.length, 2);
  assert.deepEqual(messages[0].segments.slice(0, 3).map(s => s.name), ['FHS', 'BHS', 'MSH']);
  assert.deepEqual(messages[1].segments.slice(-2).map(s => s.name), ['BTS', 'FTS']);
  assert.equal(P.getValue(messages[1], 'MSH-9.1'), 'ADT');
});

test('reports problems instead of throwing', () => {
  assert.equal(P.parse('   ').warnings[0].level, 'error');
  const noMsh = P.parse('PID|1||123');
  assert.ok(noMsh.warnings.some(w => /No MSH/.test(w.message)));
  assert.equal(P.getValue(noMsh.messages[0], 'PID-3'), '123');
  const missing = P.parse('MSH|^~\\&|APP').messages[0];
  assert.equal(missing.warnings.filter(w => /Required field/.test(w.message)).length, 3);
  const bad = P.parse('MSH|^~\\&|A||||||ADT^A01|1|P|2.5\nxx1|a').messages[0];
  assert.ok(bad.warnings.some(w => /Unrecognized segment/.test(w.message)));
});

test('locates the cursor within segments, fields, repetitions and components', () => {
  const at = (text, needle, delta = 1) => P.locate(text, text.indexOf(needle) + delta);
  const adt = samples.adt;

  let loc = at(adt, 'JOHN^QUINCY');
  assert.equal(loc.line, 3);
  assert.equal(loc.path, 'PID-5.2');
  assert.equal(loc.value, 'JOHN');
  assert.equal(loc.segment, 'PID');

  assert.equal(at(adt, '987-65').path, 'PID-3(2).1');
  assert.equal(at(adt, 'ADT^A01').path, 'MSH-9.1');
  assert.equal(P.locate(adt, 5).path, 'MSH-2');
  assert.equal(at(adt, 'PID|').path, 'PID');
  assert.equal(at(adt, 'PID|').field, 0);
  assert.equal(at(samples.oru, '3.1|').path, 'OBX[3]-5');
  assert.equal(at(samples.oru, '\\T\\').value, 'Specimen slightly hemolyzed & re-check advised.');

  const custom = 'MSH#$*@%#APP#FAC\nPID#1##123$$$X$MR*456##DOE$JANE%Q';
  loc = at(custom, '%Q', 2);
  assert.equal(loc.path, 'PID-5.2.2');
  assert.equal(loc.value, 'Q');
  assert.equal(loc.column, custom.split('\n')[1].indexOf('%Q') + 3); // caret after "Q", 1-based

  assert.equal(P.locate('', 0).segment, null);
  assert.equal(P.locate('MSH|^~\\&|A\n\nPID|1', 11).segment, null);
});

test('locate paths round-trip through getValue at every offset', () => {
  const batch = ['FHS|^~\\&|A', samples.ack, samples.oru, 'FTS|1'].join('\r');
  for (const text of [samples.adt, samples.oru, samples.ack, batch, samples.ack.split('\r').join('\\r')]) {
    const { messages } = P.parse(text);
    for (let i = 0; i <= text.length; i++) {
      const loc = P.locate(text, i);
      if (!loc.field || loc.path.endsWith('-2') && loc.segment === 'MSH') continue;
      assert.equal(P.getValue(messages[loc.message], loc.path), loc.value, `offset ${i}: ${loc.path}`);
      const seg = messages[loc.message].segments.find(s => s.line === loc.line);
      assert.equal(seg && seg.name, loc.segment, `offset ${i}: line ${loc.line}`);
    }
  }
});

test('tokenize is lossless and agrees with locate on field positions', () => {
  const custom = 'MSH#$*@%#APP#FAC\nPID#1##123$$$X$MR*456##DOE$JANE%Q';
  const inputs = [samples.adt, samples.oru, samples.ack, custom, samples.ack.split('\r').join('\\r'),
    '  MSH|^~\\&|A\r\n\r\nxx|bad\\\nPID', '', 'MSH', 'MSH|'];
  for (const text of inputs) {
    const tokens = P.tokenize(text);
    assert.equal(tokens.map(t => t.text).join(''), text);
    let offset = 0;
    for (const t of tokens) {
      if ((t.kind === 'text' || t.kind === 'escape' || t.kind === 'encoding') && t.field > 0) {
        assert.equal(P.locate(text, offset + 1).field, t.field, `${JSON.stringify(t)} at ${offset}`);
      }
      offset += t.text.length;
    }
  }
});

test('tokenize classifies delimiters, escapes and the MSH header', () => {
  const kinds = P.tokenize('MSH|^~\\&|A^B&C~D|x\\T\\y').map(t => t.kind + ':' + t.text);
  assert.deepEqual(kinds, ['segment:MSH', 'field:|', 'encoding:^~\\&', 'field:|', 'text:A', 'component:^', 'text:B',
    'subcomponent:&', 'text:C', 'repetition:~', 'text:D', 'field:|', 'text:x', 'escape:\\T\\', 'text:y']);
  const msh = P.tokenize('MSH|^~\\&|A');
  assert.equal(msh[1].value, true);
  assert.equal(msh[3].field, 3);
  const pid = P.tokenize('PID|1', P.DEFAULT_DELIMITERS);
  assert.equal(pid[1].field, 1);
  assert.equal(pid[1].value, undefined);
});

test('definitions resolve names, components and code meanings', () => {
  assert.equal(D.fieldDef('PID', 5).name, 'Patient Name');
  assert.equal(D.fieldDef('PID', 5).type, 'XPN');
  assert.equal(D.componentName('XPN', 1), 'Family Name');
  assert.equal(D.codeMeaning('PID', 8, 'F'), 'Female');
  assert.equal(D.codeMeaning('MSA', 1, 'AA'), 'Application Accept');
  assert.equal(D.eventName('ADT', 'A08'), 'Update patient information');
  assert.equal(D.segmentName('ZPI'), 'Custom (Z) segment');
  assert.equal(D.segmentName('PV1'), 'Patient Visit');
  assert.equal(D.dataTypeName('XPN'), 'Extended Person Name');
  assert.equal(D.segment('PID').fields[4].name, 'Patient Name');
});

test('definition lookups ignore Object.prototype keys from message data', () => {
  for (const key of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf']) {
    assert.equal(D.eventName(key, ''), null, 'eventName ' + key);
    assert.equal(D.eventName('ADT', key), null, 'eventName trigger ' + key);
    assert.equal(D.dataTypeName(key), null, 'dataTypeName ' + key);
    assert.equal(D.componentName(key, 1), null, 'componentName ' + key);
    assert.equal(D.segment(key), null, 'segment ' + key);
    assert.equal(D.fieldDef(key, 1), null, 'fieldDef ' + key);
    assert.equal(D.codeMeaning('PID', 8, key), null, 'codeMeaning ' + key);
    assert.equal(D.segmentName(key), 'Unknown segment', 'segmentName ' + key);
  }
  const m = P.parse('MSH|^~\\&|A|B|C|D|2026||__proto__|1|P|2.5').messages[0];
  assert.equal(D.eventName(P.getValue(m, 'MSH-9.1'), P.getValue(m, 'MSH-9.2')), null);
});

test('hostile escape sequences are bounded instead of throwing', () => {
  const d = P.DEFAULT_DELIMITERS;
  assert.equal(P.unescape('\\.sp3\\', d), '\n\n\n');
  assert.equal(P.unescape('\\.sp600000000\\', d).length, 100);
  // 1 MB of bytes that aren't UTF-8 used to overflow the stack in String.fromCharCode.apply.
  const latin1 = P.unescape('\\X' + 'E9'.repeat(1000000) + '\\', d);
  assert.equal(latin1.length, 1000000);
  assert.equal(latin1.charAt(0), 'é');
  assert.equal(P.unescape('\\X' + '41'.repeat(100000) + '\\', d), 'A'.repeat(100000));
});

test('tokenize never lets an escape sequence span a delimiter', () => {
  const text = 'PID|a\\b|c\\d|e';
  const tokens = P.tokenize(text);
  assert.equal(tokens.map(t => t.text).join(''), text);
  assert.deepEqual(tokens.filter(t => t.kind === 'escape'), []);
  assert.deepEqual(tokens.filter(t => t.kind === 'text').map(t => t.text + '@' + t.field), ['a\\b@1', 'c\\d@2', 'e@3']);
  // A real escape inside a component still tokenizes as one.
  assert.deepEqual(P.tokenize('OBX|x\\T\\y^z').filter(t => t.kind === 'escape').map(t => t.text), ['\\T\\']);
});

test('locate ignores MLLP framing characters, like parse', () => {
  const text = '\x0bMSH|^~\\&|A|B|C|D|2026||ADT^A01|1|P|2.5\nPID|1||X\x1c\n\x1c';
  const m = P.parse(text).messages[0];
  const loc = P.locate(text, text.indexOf('X') + 1);
  assert.equal(loc.path, 'PID-3');
  assert.equal(loc.value, 'X');
  assert.equal(P.getValue(m, loc.path), 'X');
  assert.equal(P.locate(text, text.length).segment, null); // a line holding only \x1c is blank

  // "\r\x1c\n" is two line breaks; stripping \x1c before splitting used to merge them into one.
  const framed = 'MSH|^~\\&|A|B|C|D|2026||ADT^A01|1|P|2.5\r\x1c\nPID|1||42';
  const pid = P.parse(framed).messages[0].segments[1];
  assert.equal(pid.line, 3);
  assert.equal(P.locate(framed, framed.length).line, 3);
});

test('tokenizing a window from any line start matches tokenizing the whole text', () => {
  // The editor colors only the lines near the viewport: tokenize(slice, locate(start).delimiters, literal).
  const custom = 'MSH#$*@%#APP#FAC\nPID#1##123$$$X$MR*456##DOE$JANE%Q';
  const batch = ['FHS|^~\\&|A', samples.ack, custom, samples.oru].join('\n').replace(/\r/g, '\n');
  const key = t => t.kind + ':' + t.text + ':' + t.field + ':' + (t.value || '');
  for (const text of [batch, samples.adt.replace(/\r/g, '\n')]) {
    const full = P.tokenize(text);
    const literal = P.hasLiteralBreaks(text);
    let offset = 0;
    const starts = [];
    full.forEach((t, i) => { if (i === 0 || full[i - 1].kind === 'break') starts.push([offset, i]); offset += t.text.length; });
    for (const [start, index] of starts) {
      for (const end of [text.indexOf('\n', start + 1), text.length]) {
        if (end <= start) continue;
        const win = P.tokenize(text.slice(start, end), start ? P.locate(text, start).delimiters : undefined, literal);
        const expected = full.slice(index, index + win.length);
        assert.deepEqual(win.map(key), expected.map(key), `window at ${start}`);
      }
    }
  }
});

test('randomized inputs: parse never throws, tokenize is lossless, locate agrees with parse', () => {
  let seed = 7;
  const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  const pieces = ['|', '^', '~', '\\', '&', 'A', 'B', '1', ' ', '\n', '\r', '\x0b', '\x1c', 'MSH|^~\\&|', 'PID|', 'OBX|',
    'BHS|^~\\&|', 'FHS|^~\\&|', 'X41', '.br', 'E', '\\F\\', '#', '$', '\\.sp9\\'];
  for (let iter = 0; iter < 3000; iter++) {
    let s = '';
    for (let i = 0, len = 5 + rnd(40); i < len; i++) s += pieces[rnd(pieces.length)];
    const { messages } = P.parse(s);
    const tokens = P.tokenize(s);
    assert.equal(tokens.map(t => t.text).join(''), s, 'lossless: ' + JSON.stringify(s));
    let offset = 0;
    let validId = false; // field numbering is only defined for well-formed segment IDs
    for (const t of tokens) {
      if (t.kind === 'segment') validId = /^[A-Z][A-Z0-9]{2}$/.test(t.text);
      if (validId && (t.kind === 'text' || t.kind === 'escape') && t.field > 0) {
        assert.equal(P.locate(s, offset + 1).field, t.field, `token field: ${JSON.stringify(s)} @${offset}`);
      }
      offset += t.text.length;
    }
    for (let i = 0; i <= s.length; i++) {
      const loc = P.locate(s, i);
      if (!loc.field || (loc.field === 2 && /^(MSH|BHS|FHS)$/.test(loc.segment)) || !/^[A-Z][A-Z0-9]{2}$/.test(loc.segment)) continue;
      const msg = messages[loc.message];
      const where = `${JSON.stringify(s)} @${i} ${loc.path}`;
      assert.ok(msg, 'message exists: ' + where);
      assert.equal(P.getValue(msg, loc.path), loc.value, where);
      const seg = msg.segments.find(x => x.line === loc.line);
      assert.equal(seg && seg.name, loc.segment, where);
    }
  }
});
