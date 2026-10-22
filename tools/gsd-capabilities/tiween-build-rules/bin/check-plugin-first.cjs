#!/usr/bin/env node
'use strict';
// Gate: plans must put new Strapi code in local plugins. Any PLAN.md whose
// files_modified touches apps/strapi/src/api/ needs a plugin_waiver reason in its
// frontmatter. Exit 0 passes, non-zero blocks.
const fs = require('node:fs');
const path = require('node:path');
const { readFrontmatter } = require('./frontmatter.cjs');

const OUTSIDE_PLUGINS = /^apps\/strapi\/src\/api\//;

function main(phaseDir) {
  if (!phaseDir || !fs.existsSync(phaseDir)) {
    console.error(`phase directory not found: ${phaseDir || '(empty)'}`);
    return 1;
  }
  const plans = fs.readdirSync(phaseDir).filter((f) => f.endsWith('-PLAN.md'));
  const violations = [];
  for (const plan of plans) {
    const fm = readFrontmatter(path.join(phaseDir, plan));
    if (fm.status === 'superseded' || fm.plugin_waiver) continue;
    const files = Array.isArray(fm.files_modified) ? fm.files_modified : [];
    const outside = files.filter((f) => OUTSIDE_PLUGINS.test(f.replace(/^\.\//, '')));
    if (outside.length) violations.push(`${plan}: ${outside.join(', ')}`);
  }
  if (violations.length) {
    console.error(
      `plugin-first gate failed:\n- ${violations.join('\n- ')}\n` +
        'Move this code into a local plugin under apps/strapi/src/plugins/, or add plugin_waiver: "<reason>" to the plan frontmatter.',
    );
    return 1;
  }
  console.log(`plugin-first gate passed (${plans.length} plans checked)`);
  return 0;
}

process.exitCode = main(process.argv[2]);
