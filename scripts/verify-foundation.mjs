import { readFile } from 'node:fs/promises';

const workflowFile = new URL('../.github/workflows/ci.yml', import.meta.url);
const requiredSnippets = [
  'pull_request:',
  'develop',
  'main',
  'quality:',
  'node-version: 24',
  'corepack enable',
  'pnpm install --frozen-lockfile',
  'pnpm lint',
  'pnpm typecheck',
  'pnpm test',
  'pnpm build',
  'cancel-in-progress: true',
  '${{ github.event.pull_request.number }}',
];

try {
  const workflow = await readFile(workflowFile, 'utf8');
  const missingSnippets = requiredSnippets.filter(
    (snippet) => !workflow.includes(snippet),
  );

  if (missingSnippets.length > 0) {
    throw new Error(
      `ci.yml is missing required configuration: ${missingSnippets.join(', ')}`,
    );
  }

  console.log('Foundation CI workflow is configured.');
} catch (error) {
  console.error(`Foundation CI verification failed: ${error.message}`);
  process.exitCode = 1;
}
