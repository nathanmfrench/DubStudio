// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);
  const { assetExts, sourceExts } = config.resolver;

  // Critical fixes for connection issues
  config.server = {
    port: 19000, // Force Expo's default port
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        req.url = req.url.replace(/^\/+/, '');
        return middleware(req, res, next);
      };
    },
  };

  return {
    ...config,
    resolver: {
      ...config.resolver,
      assetExts: [...assetExts, 'ttf'], // Your existing TTF config
      sourceExts: [...sourceExts],
    },
    transformer: {
      ...config.transformer,
      assetPlugins: ['expo-asset/tools/hashAssetFiles'], // Your existing asset config
      // Optional: Add if using react-native-svg-transformer
      // babelTransformerPath: require.resolve('react-native-svg-transformer')
    }
  };
})();