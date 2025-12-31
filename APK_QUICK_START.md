# APK Build Quick Start

## What's Been Set Up

✅ **Capacitor** - Installed and configured for Android
✅ **GitHub Actions Workflow** - Automated APK builds on push
✅ **Android Configuration** - Ready for APK generation
✅ **API Service** - Updated to work with Android

## Quick Build (GitHub Actions)

The easiest way to build an APK is through GitHub Actions:

1. **Push your code** to GitHub
2. **Go to Actions tab** in your repository
3. **Wait for "Build Android APK" workflow** to complete
4. **Download the APK** from the Artifacts section

## Local Build (First Time Setup)

### Prerequisites
- Node.js 18+
- Android Studio (with Android SDK)
- Java JDK 17+

### Steps

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Build the web app:**
   ```bash
   npm run build
   ```

3. **Initialize Capacitor (first time only):**
   ```bash
   npx cap add android
   ```

4. **Sync to Android:**
   ```bash
   npx cap sync android
   ```

5. **Open in Android Studio:**
   ```bash
   npx cap open android
   ```

6. **Build APK in Android Studio:**
   - Build → Build Bundle(s) / APK(s) → Build APK(s)
   - Find APK at: `android/app/build/outputs/apk/debug/app-debug.apk`

## Configuration

### API URL for Android

The app automatically detects if it's running on Android and uses the appropriate API URL:

- **Development (Emulator):** `http://10.0.2.2:5000/api`
- **Production:** Set `VITE_API_URL` environment variable

To set the production API URL, create a `.env` file in `frontend/`:
```
VITE_API_URL=https://your-backend-url.com/api
```

### App Details

Edit `frontend/capacitor.config.js` to change:
- `appId`: Your app's unique identifier
- `appName`: Display name

## Troubleshooting

### "Android directory doesn't exist"
Run: `npx cap add android` in the `frontend/` directory

### "Gradle build fails"
- Ensure Java JDK 17+ is installed
- Check Android SDK is configured in Android Studio
- Try: `cd android && ./gradlew clean`

### "APK won't install"
- Enable "Install from Unknown Sources" on your device
- Check device architecture matches APK (arm64-v8a, armeabi-v7a, etc.)

## Next Steps

1. **Test the APK** on a real Android device
2. **Configure app icons** (see ANDROID_BUILD.md)
3. **Set up signing** for release builds
4. **Update API URL** for production

For detailed instructions, see `ANDROID_BUILD.md`.

