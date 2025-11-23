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

The app requires HealthKit to be enabled in Xcode:
1. Open `SparkyFitnessMobile.xcworkspace`
2. Select the SparkyFitnessMobile target
3. Go to "Signing & Capabilities" tab
4. Ensure "HealthKit" capability is added
5. Verify `Info.plist` contains:
   - `NSHealthShareUsageDescription`
   - `NSHealthUpdateUsageDescription`

## CI/CD Pipeline Requirements

Your build pipeline **MUST** include:
```bash
cd SparkyFitnessMobile/ios
pod install
cd ..
```

Before any build commands like `xcodebuild` or `react-native run-ios`.
