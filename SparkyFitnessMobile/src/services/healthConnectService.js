// Platform-specific health service re-export
// This file automatically imports the correct platform-specific implementation
import { Platform } from 'react-native';

// Re-export all functions from the platform-specific module
if (Platform.OS === 'ios') {
  module.exports = require('./healthConnectService.ios');
} else {
  module.exports = require('./healthConnectService.android');
}

