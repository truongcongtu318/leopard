import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const tsconfigDirectory = path.resolve(testDirectory, '../tsconfig');

async function loadConfig(configPath) {
  const config = JSON.parse(await readFile(configPath, 'utf8'));

  if (!config.extends) {
    return config;
  }

  const parentPath = path.resolve(path.dirname(configPath), config.extends);
  const parentConfig = await loadConfig(parentPath);

  return {
    ...parentConfig,
    ...config,
    compilerOptions: {
      ...parentConfig.compilerOptions,
      ...config.compilerOptions,
    },
  };
}

for (const configName of ['base', 'node', 'react-native', 'nextjs']) {
  test(`${configName} tsconfig inherits strict mode`, async () => {
    const config = await loadConfig(path.join(tsconfigDirectory, `${configName}.json`));

    assert.equal(config.compilerOptions.strict, true);
  });
}
