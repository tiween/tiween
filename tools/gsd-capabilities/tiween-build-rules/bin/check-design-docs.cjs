#!/usr/bin/env node
'use strict';
// Gate: a planned phase needs DESIGN.md + EXPERIENCE.md, and EXPERIENCE.md must record
// an approved mockup (mockup_status: approved) or a reasoned waiver
// (mockup_status: not-applicable + mockup_waiver). Exit 0 passes, non-zero blocks.
const fs = require('node:fs');
const path = require('node:path');
const { readFrontmatter } = require('./frontmatter.cjs');

function findDoc(dir, name) {
  const hits = fs.readdirSync(dir).filter((f) => f === name || f.endsWith(`-${name}`));
  return hits.length === 1 ? path.join(dir, hits[0]) : hits.length > 1 ? hits : null;
}

function main(phaseDir) {
  if (!phaseDir || !fs.existsSync(phaseDir)) {
    return fail(`phase directory not found: ${phaseDir || '(empty)'}`);
  }
  const problems = [];
  const docs = {};
  for (const name of ['DESIGN.md', 'EXPERIENCE.md']) {
    const found = findDoc(phaseDir, name);
    if (Array.isArray(found)) problems.push(`more than one ${name}: ${found.join(', ')}`);
    else if (!found) problems.push(`missing ${name}`);
    else docs[name] = found;
  }
  if (docs['EXPERIENCE.md']) {
    const fm = readFrontmatter(docs['EXPERIENCE.md']);
    const status = fm.mockup_status;
    if (status === 'not-applicable') {
      if (!fm.mockup_waiver) problems.push('mockup_status is not-applicable but mockup_waiver gives no reason');
    } else if (status !== 'approved') {
      problems.push(`EXPERIENCE.md mockup_status is "${status || '(unset)'}", expected "approved" after owner review of the Claude Design mockups`);
    }
  }
  if (problems.length) {
    return fail(
      `design docs gate failed for ${path.basename(phaseDir)}:\n- ${problems.join('\n- ')}\n` +
        'Write DESIGN.md and EXPERIENCE.md, get the mockups approved, then set mockup_status in EXPERIENCE.md frontmatter.',
    );
  }
  console.log('design docs gate passed');
  return 0;
}

function fail(message) {
  console.error(message);
  return 1;
}

process.exitCode = main(process.argv[2]);
