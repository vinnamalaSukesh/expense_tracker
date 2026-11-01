const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// eslint-disable-next-line no-undef
const config = getDefaultConfig(__dirname);
// Firebase JS SDK's package.json "exports" map resolves to web-only bundles
// under Metro's default package-exports resolution, breaking imports like
// `firebase/firestore` on native. Falling back to "main" fixes it.
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: './global.css' });
