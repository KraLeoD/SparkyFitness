# iOS Build Instructions

## Prerequisites
- Xcode installed
- CocoaPods installed (`sudo gem install cocoapods`)
- Node.js and npm installed

## Build Steps

### 1. Install JavaScript Dependencies
```bash
cd SparkyFitnessMobile
npm install
```

### 2. Install iOS Native Dependencies (CocoaPods)
```bash
cd ios
pod install
```

**IMPORTANT**: You MUST run `pod install` before building. This installs native dependencies including:
- @kingstinct/react-native-healthkit
- React Native core modules
- Other native libraries

### 3. Build the App

#### Using Xcode:
1. Open `ios/SparkyFitnessMobile.xcworkspace` (NOT .xcodeproj!)
2. Select your target device
3. Click Build (⌘+B) or Run (⌘+R)

#### Using Command Line:
```bash
# From SparkyFitnessMobile directory
npx react-native run-ios
```

## Troubleshooting

### App crashes immediately on launch with SIGABRT
- **Cause**: CocoaPods not installed
- **Solution**: Run `pod install` in the `ios/` directory

### "Undefined symbols" or "Module not found" errors
- **Cause**: Using .xcodeproj instead of .xcworkspace
- **Solution**: Always use `SparkyFitnessMobile.xcworkspace` after running pod install

### Changes not reflected after pod install
- Clean build: Xcode → Product → Clean Build Folder (⇧⌘K)
- Rebuild the app

## HealthKit Configuration

**CRITICAL**: The app REQUIRES HealthKit capability to be enabled or it will crash on startup!

### Adding HealthKit Capability in Xcode:

1. Open `SparkyFitnessMobile.xcworkspace` (not .xcodeproj)
2. Select the **SparkyFitnessMobile** target in the project navigator
3. Go to the **"Signing & Capabilities"** tab
4. Click the **"+ Capability"** button
5. Search for and add **"HealthKit"**
6. Save the project (⌘+S)

This will:
- Create/update the entitlements file
- Add `com.apple.developer.healthkit` entitlement
- Enable HealthKit framework linking

### Verification:

After adding the capability, verify:
- ✅ `SparkyFitnessMobile.entitlements` file exists
- ✅ File contains `com.apple.developer.healthkit` = `true`
- ✅ `Info.plist` contains:
   - `NSHealthShareUsageDescription`
   - `NSHealthUpdateUsageDescription`

### Why This Is Required:

Without the HealthKit capability enabled, when the app tries to import `@kingstinct/react-native-healthkit`, iOS will deny access to the HealthKit framework, causing an immediate SIGABRT crash during JavaScript module initialization.

The app will crash with errors like:
```
EXC_CRASH (SIGABRT)
abort() called
```

## CI/CD Pipeline Requirements

Your build pipeline **MUST** include:
```bash
cd SparkyFitnessMobile/ios
pod install
cd ..
```

Before any build commands like `xcodebuild` or `react-native run-ios`.
