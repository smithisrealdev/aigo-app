const { withEntitlementsPlist } = require('expo/config-plugins');

// A free Apple ID (personal team) cannot sign the Sign in with Apple capability, so FREE_APPLE_ID=1 leaves it out of a local test build.
module.exports = ({ config }) => {
  if (!process.env.FREE_APPLE_ID) return config;
  return withEntitlementsPlist({ ...config, ios: { ...config.ios, usesAppleSignIn: false } }, (c) => {
    delete c.modResults['com.apple.developer.applesignin'];
    return c;
  });
};
