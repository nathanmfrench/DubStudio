// frontend/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Get default Expo config
const config = getDefaultConfig(__dirname);

// Monorepo/workspace support
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../');

config.watchFolders = [projectRoot, workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Only include these if you're actually using SVG files
// First install: npm install react-native-svg react-native-svg-transformer --save-dev
// Then uncomment this section:
/*
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts.push('svg');
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};
*/

// Remove unless you need specific minification settings
// config.transformer.minifierConfig = { ... };

module.exports = config;