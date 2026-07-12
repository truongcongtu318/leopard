import { readFile } from 'node:fs/promises';

const workspaceFile = new URL('../pnpm-workspace.yaml', import.meta.url);

try {
  const workspace = await readFile(workspaceFile, 'utf8');
  const requiredPackages = ['apps/*', 'packages/*'];
  const missingPackages = requiredPackages.filter(
    (workspacePackage) => !workspace.includes(workspacePackage),
  );

  if (missingPackages.length > 0) {
    throw new Error(
      `pnpm-workspace.yaml is missing required packages: ${missingPackages.join(', ')}`,
    );
  }

  console.log('Workspace packages are configured.');
} catch (error) {
  console.error(`Workspace check failed: ${error.message}`);
  process.exitCode = 1;
}
