const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");
const nodeProcess = require("node:process");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

nodeProcess.env.EXPO_PROJECT_ROOT = projectRoot;
nodeProcess.env.EXPO_ROUTER_APP_ROOT = path.join(projectRoot, "app");
nodeProcess.env.EXPO_ROUTER_ABS_APP_ROOT = path.join(projectRoot, "app");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
