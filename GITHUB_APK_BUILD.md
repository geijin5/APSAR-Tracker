# Building APK on GitHub

This guide explains how to build the Android APK automatically using GitHub Actions.

## How It Works

When you push code to GitHub, the **Build Android APK** workflow automatically:
1. ✅ Sets up Node.js, Java, and Android SDK
2. ✅ Installs all dependencies
3. ✅ Builds the React frontend
4. ✅ Initializes Capacitor (if needed)
5. ✅ Syncs web assets to Android
6. ✅ Builds the Android APK using Gradle
7. ✅ Uploads the APK as a downloadable artifact

## Getting Your APK

### Step 1: Push Your Code
```bash
git add .
git commit -m "Setup APK build"
git push
```

### Step 2: Go to GitHub Actions
1. Open your repository on GitHub
2. Click on the **Actions** tab
3. You'll see the **Build Android APK** workflow running

### Step 3: Wait for Build to Complete
- The workflow typically takes 5-10 minutes
- You can watch the progress in real-time
- Green checkmark ✅ means success

### Step 4: Download Your APK
1. Click on the completed workflow run
2. Scroll down to the **Artifacts** section
3. Click on **apsar-tracker-apk**
4. Download the ZIP file
5. Extract the APK from the ZIP

## Manual Trigger

You can also manually trigger the build:

1. Go to **Actions** tab
2. Select **Build Android APK** workflow
3. Click **Run workflow** button
4. Select the branch (usually `main`)
5. Click **Run workflow**

## Troubleshooting

### Build Fails with "Android directory not found"
- This is normal on the first run
- The workflow will create it automatically
- If it still fails, the workflow will show the error

### Build Fails with Gradle Error
- Check the workflow logs for specific errors
- Common issues:
  - Missing Android SDK components
  - Java version mismatch
  - Gradle wrapper issues

### APK Not Found in Artifacts
- Check the "List APK files" step in the workflow logs
- Ensure the build completed successfully
- The APK should be in `app/build/outputs/apk/debug/`

### Build Takes Too Long
- First build is slower (downloads Android SDK)
- Subsequent builds are faster (cached dependencies)
- Typical build time: 5-10 minutes

## What's in the APK

The APK includes:
- ✅ Your React app (built and optimized)
- ✅ Capacitor runtime
- ✅ Android native components
- ✅ All assets and resources

## Installing the APK

1. **Transfer APK to your Android device**
   - Email it to yourself
   - Use USB file transfer
   - Upload to Google Drive/Dropbox

2. **Enable Unknown Sources**
   - Settings → Security → Unknown Sources (enable)
   - Or Settings → Apps → Special Access → Install Unknown Apps

3. **Install the APK**
   - Open the APK file on your device
   - Tap "Install"
   - Wait for installation
   - Tap "Open" to launch

## Configuration

### Changing App Details

Edit `frontend/capacitor.config.js`:
```javascript
{
  appId: 'com.apsar.tracker',  // Change this
  appName: 'APSAR Tracker',    // Change this
}
```

### Setting API URL

For production, set the API URL in your build:
- Add `VITE_API_URL` to GitHub Secrets
- Or update `frontend/src/services/api.js`

## Next Steps

1. ✅ **Test the APK** on a real device
2. ✅ **Configure production API URL**
3. ✅ **Add app icons** (see ANDROID_BUILD.md)
4. ✅ **Set up app signing** for release builds
5. ✅ **Publish to Google Play** (optional)

## Workflow File

The workflow is located at:
`.github/workflows/build-apk.yml`

You can customize it to:
- Build release APKs (signed)
- Build for different architectures
- Upload to Google Play automatically
- Create GitHub releases

## Support

If you encounter issues:
1. Check the workflow logs
2. Review ANDROID_BUILD.md for detailed setup
3. Check Capacitor documentation: https://capacitorjs.com/docs

