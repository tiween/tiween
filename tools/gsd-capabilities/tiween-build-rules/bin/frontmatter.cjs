'use strict';
// Minimal YAML-frontmatter reader for planning docs: top-level scalars and
// block lists ("key:\n  - item"). Enough for the gate fields; not a YAML parser.
const fs = require('node:fs');

function readFrontmatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = {};
  let listKey = null;
  for (const line of match[1].split(/\r?\n/)) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) {
      data[listKey].push(unquote(item[1]));
      continue;
    }
    const pair = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!pair) {
      listKey = null;
      continue;
    }
    const [, key, value] = pair;
    if (value === '') {
      data[key] = [];
      listKey = key;
    } else {
      data[key] = unquote(value);
      listKey = null;
    }
  }
  return data;
}

function unquote(value) {
  const v = value.replace(/\s+#.*$/, '').trim();
  return v.replace(/^(["'])(.*)\1$/, '$2');
}

module.exports = { readFrontmatter };
