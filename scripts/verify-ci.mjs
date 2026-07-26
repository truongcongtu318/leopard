import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');

function resolveRepo(...segments) {
  return join(repoRoot, ...segments);
}

let failed = false;

function fail(msg) {
  console.error(`[FAIL] ${msg}`);
  failed = true;
}

function ok(msg) {
  console.log(`[OK]   ${msg}`);
}

// ================================================================
// 1. Required files must exist
// ================================================================
const requiredFiles = [
  '.github/workflows/ci.yml',
  '.github/workflows/security.yml',
  '.github/dependabot.yml',
];

for (const file of requiredFiles) {
  if (existsSync(resolveRepo(file))) {
    ok(`${file} exists`);
  } else {
    fail(`${file} is missing`);
  }
}

// ================================================================
// 2. Workflow files use pinned action versions (no @main/@latest/@master)
// ================================================================
const workflowFiles = requiredFiles.filter(
  (f) => f.endsWith('.yml') || f.endsWith('.yaml'),
);

const unpinned = new Set(['main', 'master', 'latest', 'HEAD']);

for (const file of workflowFiles) {
  const fullPath = resolveRepo(file);
  if (!existsSync(fullPath)) continue;

  const content = readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  for (const line of lines) {
    const match = line.match(/^\s*-?\s*uses:\s*(.+)$/);
    if (!match) continue;

    const ref = match[1].trim();
    // Skip local actions (./path or ../path)
    if (ref.startsWith('./') || ref.startsWith('../')) continue;

    // Extract version after the last @
    const atIdx = ref.lastIndexOf('@');
    if (atIdx === -1) {
      fail(`${file}: action "${ref}" has no version pin`);
      continue;
    }

    const version = ref.slice(atIdx + 1);
    if (unpinned.has(version)) {
      fail(`${file}: action "${ref}" uses unpinned version "${version}"`);
    } else {
      ok(`${file}: action "${ref}" pinned to "${version}"`);
    }
  }
}

// ================================================================
// 3. No hardcoded secrets / tokens in workflow files
// ================================================================
const secretChecks = [
  { name: 'GitHub PAT', regex: /\bghp_[A-Za-z0-9]{36}\b/ },
  { name: 'hardcoded token/secret', regex: /\b(token|secret|password|api_key|API_KEY)\s*[:=]\s*["'][A-Za-z0-9_\-+=\/]{8,}["']/gi },
];

let foundSecrets = false;
for (const file of workflowFiles) {
  const fullPath = resolveRepo(file);
  if (!existsSync(fullPath)) continue;

  const content = readFileSync(fullPath, 'utf8');

  for (const { name, regex } of secretChecks) {
    if (regex.test(content)) {
      fail(`${file}: hardcoded ${name} detected`);
      foundSecrets = true;
    }
  }
}
if (!foundSecrets) {
  ok('No hardcoded secrets/tokens in workflow files');
}

// ================================================================
// 4. pnpm-workspace.yaml has valid structure
// ================================================================
const workspacePath = resolveRepo('pnpm-workspace.yaml');
if (existsSync(workspacePath)) {
  const wsContent = readFileSync(workspacePath, 'utf8');
  if (wsContent.includes('apps/*') && wsContent.includes('packages/*')) {
    ok('pnpm-workspace.yaml has valid structure (apps/*, packages/*)');
  } else {
    fail('pnpm-workspace.yaml missing apps/* or packages/*');
  }
} else {
  fail('pnpm-workspace.yaml is missing');
}

// ================================================================
// 5. Required scripts in workspace package manifests
// ================================================================
function collectPackageJsonFiles() {
  const results = [];
  for (const base of ['apps', 'packages']) {
    const basePath = resolveRepo(base);
    if (!existsSync(basePath)) continue;
    const entries = readdirSync(basePath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pkgJsonPath = join(basePath, entry.name, 'package.json');
      if (existsSync(pkgJsonPath)) {
        results.push({ name: entry.name, dir: join(base, entry.name), path: pkgJsonPath });
      }
    }
  }
  return results;
}

const packages = collectPackageJsonFiles();

const requiredScripts = ['lint', 'typecheck', 'test', 'build'];

for (const pkg of packages) {
  let pkgJson;
  try {
    pkgJson = JSON.parse(readFileSync(pkg.path, 'utf8'));
  } catch {
    continue;
  }

  const scripts = pkgJson.scripts || {};

  // Packages that don't need every required script
  const skipBuild = ['config', 'mobile', 'ui'];

  for (const script of requiredScripts) {
    if (script === 'build' && skipBuild.includes(pkg.name)) continue;
    if (script === 'typecheck' && pkg.name === 'config') continue;
    if (script === 'test' && pkg.name === 'config') continue;

    if (scripts[script]) {
      ok(`${pkg.name}: "${script}" script exists`);
    } else {
      fail(`${pkg.name}: "${script}" script is missing`);
    }
  }

  // Mobile needs "export"
  if (pkg.name === 'mobile') {
    if (scripts['export']) {
      ok('mobile: "export" script exists');
    } else {
      fail('mobile: "export" script is missing');
    }
  }

  // API needs e2e, contract, and migration test scripts
  if (pkg.name === 'api') {
    for (const s of ['test:e2e', 'test:contract', 'prisma:migrate:test']) {
      if (scripts[s]) {
        ok(`api: "${s}" script exists`);
      } else {
        fail(`api: "${s}" script is missing`);
      }
    }
  }
}

// ================================================================
// 6. CI workflow structural validation
// ================================================================
const ciPath = resolveRepo('.github/workflows/ci.yml');
if (existsSync(ciPath)) {
  const ciContent = readFileSync(ciPath, 'utf8');

  // Check for expected job names (new format or old "quality" format)
  const expectedJobs = ['lint:', 'typecheck:', 'unit-test:', 'integration-test:', 'build:'];
  const hasNewJobs = expectedJobs.some((job) => ciContent.includes(job));
  const hasQuality = ciContent.includes('quality:');

  if (hasNewJobs || hasQuality) {
    ok('ci.yml defines expected job(s)');
  } else {
    fail('ci.yml is missing expected jobs');
  }

  if (ciContent.includes('--frozen-lockfile')) {
    ok('ci.yml uses pnpm install --frozen-lockfile');
  } else {
    fail('ci.yml must use pnpm install --frozen-lockfile');
  }

  if (ciContent.includes('pull_request') || ciContent.includes('pull_request_target')) {
    ok('ci.yml has pull_request trigger');
  } else {
    fail('ci.yml is missing pull_request trigger');
  }

  if (ciContent.includes('main')) {
    ok('ci.yml references main branch');
  } else {
    fail('ci.yml should reference main branch');
  }
}

// ================================================================
// Summary
// ================================================================
console.log('');
if (failed) {
  console.error('CI configuration verification FAILED.');
  process.exit(1);
} else {
  console.log('All CI configuration checks passed.');
  process.exit(0);
}
