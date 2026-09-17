const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.blockList = [
  new RegExp(`${path.resolve(workspaceRoot, 'apps/api')}/.*`),
  new RegExp(`${path.resolve(workspaceRoot, 'apps/admin')}/.*`),
  new RegExp(`${path.resolve(workspaceRoot, 'apps/driver')}/.*`),
  new RegExp(`${path.resolve(workspaceRoot, 'docs')}/.*`),
  new RegExp(`${path.resolve(workspaceRoot, 'infra')}/.*`),
  new RegExp(`${path.resolve(workspaceRoot, '.worktrees')}/.*`),
  /.*\.tmpdir(\/.*)?$/,
];

module.exports = config;


