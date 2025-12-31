# Android APK Build Instructions

This guide explains how to build the APSAR Tracker app as an Android APK.

## Prerequisites

### Local Development
1. **Node.js** (v18 or higher)
2. **Android Studio** (latest version)
3. **Java JDK 17** or higher
4. **Android SDK** (installed via Android Studio)

### For GitHub Actions
The workflow automatically handles all prerequisites.

## Setup Instructions

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Build the Web App

```bash
npm run build
```

### 3. Initialize Capacitor (First Time Only)

```bash
npx cap add android
```

This will create the `android/` directory with the Android project.

### 4. Sync Capacitor

After building, sync the web assets to Android:

```bash
npx cap sync android
```

### 5. Open in Android Studio

```bash
npx cap open android
```

Or manually open `frontend/android/` in Android Studio.

### 6. Build APK in Android Studio

1. Open Android Studio
2. Wait for Gradle sync to complete
3. Go to **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
4. Wait for the build to complete
5. Click **locate** to find your APK in `app/build/outputs/apk/debug/app-debug.apk`

### 7. Build APK from Command Line

```bash
cd frontend/android
./gradlew assembleDebug
```

The APK will be at: `app/build/outputs/apk/debug/app-debug.apk`

## GitHub Actions Build

The `.github/workflows/build-apk.yml` workflow automatically builds the APK on every push.

### Accessing the APK

1. Go to your GitHub repository
2. Click on **Actions** tab
3. Select the latest workflow run
4. Scroll down to **Artifacts**
5. Download **apsar-tracker-apk**

## Configuration

### App ID and Name

Edit `frontend/capacitor.config.ts` to change:
- `appId`: Your app's unique identifier (e.g., `com.apsar.tracker`)
- `appName`: Display name of your app

### API URL Configuration

The app uses the API URL from environment variables. For Android:
- Development: Uses `http://10.0.2.2:5000` (Android emulator localhost)
- Production: Update `VITE_API_URL` in your build process

### Icons and Splash Screen

1. Replace icons in `frontend/android/app/src/main/res/`:
   - `mipmap-mdpi/ic_launcher.png` (48x48)
   - `mipmap-hdpi/ic_launcher.png` (72x72)
   - `mipmap-xhdpi/ic_launcher.png` (96x96)
   - `mipmap-xxhdpi/ic_launcher.png` (144x144)
   - `mipmap-xxxhdpi/ic_launcher.png` (192x192)

2. Or use Android Studio's Image Asset Studio:
   - Right-click `res` → **New** → **Image Asset**
   - Select your icon image
   - Generate all densities

## Building Release APK (Signed)

For production releases, you need to sign the APK:

### 1. Generate Keystore

```bash
keytool -genkey -v -keystore apsar-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias apsar
```

### 2. Configure Signing

Create `frontend/android/key.properties`:

```properties
storePassword=your-store-password
keyPassword=your-key-password
keyAlias=apsar
storeFile=../apsar-release-key.jks
```

### 3. Update build.gradle

The signing configuration should be added to `app/build.gradle` (already configured if using Capacitor).

### 4. Build Release APK

```bash
cd frontend/android
./gradlew assembleRelease
```

The signed APK will be at: `app/build/outputs/apk/release/app-release.apk`

## Troubleshooting

### "Command not found: cap"

Install Capacitor CLI globally:
```bash
npm install -g @capacitor/cli
```

### Gradle Build Fails

1. Ensure Java JDK 17+ is installed
2. Check Android SDK is properly configured
3. Try: `cd android && ./gradlew clean`

### APK Not Installing

1. Enable "Install from Unknown Sources" on your Android device
2. Check the APK is for the correct architecture (arm64-v8a, armeabi-v7a, x86, x86_64)
3. Ensure minimum SDK version matches your device

### Network Requests Failing

1. Check `capacitor.config.ts` has correct `server` configuration
2. For local development, use `http://10.0.2.2:5000` instead of `localhost`
3. Ensure backend allows requests from Android app

## Next Steps

1. **Test the APK** on various Android devices
2. **Configure app signing** for release builds
3. **Set up Google Play Store** listing (optional)
4. **Configure app permissions** in `AndroidManifest.xml` if needed
5. **Add app icons and splash screens**

## Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/)
- [Gradle Build System](https://gradle.org/)

