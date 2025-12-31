# Build Instructions for Device Deployment

This document explains how to build the APSAR Tracker app for devices using GitHub Actions.

## Overview

The app is set up as a Progressive Web App (PWA) that can be installed on:
- **Mobile devices** (iOS, Android)
- **Desktop devices** (Windows, macOS, Linux)
- **Tablets**

## GitHub Actions Workflow

The `.github/workflows/build.yml` file automatically builds the app when you:
- Push to `main` or `develop` branches
- Create a pull request
- Manually trigger the workflow

### Build Artifacts

The workflow creates three build artifacts:

1. **frontend-build**: The built React frontend (ready for deployment)
2. **backend-build**: The Node.js backend code
3. **mobile-build**: A packaged version ready for mobile deployment
4. **release-package**: Complete release package (only on main branch)

### Accessing Build Artifacts

1. Go to your GitHub repository
2. Click on "Actions" tab
3. Select the workflow run
4. Scroll down to "Artifacts" section
5. Download the artifacts you need

## PWA Icons

The app requires icons for installation on devices. Currently, placeholder icons are used.

### Creating Icons

1. Create two PNG images:
   - `icon-192.png` - 192x192 pixels
   - `icon-512.png` - 512x512 pixels

2. Place them in `frontend/public/` directory

3. Recommended: Use a tool like [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator) or [RealFaviconGenerator](https://realfavicongenerator.net/)

### Icon Requirements

- Format: PNG
- Sizes: 192x192 and 512x512 pixels
- Background: Should work on both light and dark backgrounds
- Content: Should represent the APSAR Tracker app

## Installing on Devices

### Android

1. Open the app in Chrome browser
2. Tap the menu (three dots)
3. Select "Add to Home screen" or "Install app"
4. Follow the prompts

### iOS (iPhone/iPad)

1. Open the app in Safari browser
2. Tap the Share button
3. Select "Add to Home Screen"
4. Customize the name if desired
5. Tap "Add"

### Desktop (Chrome/Edge)

1. Open the app in Chrome or Edge
2. Click the install icon in the address bar
3. Or go to Settings > Apps > Install this site as an app

## Local Development

To test the PWA locally:

```bash
cd frontend
npm install
npm run build
npm run preview
```

Then visit `http://localhost:4173` and test the installation.

## Deployment

### Option 1: Static Hosting (Frontend Only)

Deploy the `frontend/dist` folder to:
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront
- Any static hosting service

### Option 2: Full Stack Deployment

Deploy both frontend and backend:
- Render.com
- Heroku
- AWS EC2
- DigitalOcean App Platform
- Railway

### Environment Variables

Make sure to set these environment variables in your deployment:

**Backend:**
- `MONGODB_URI`
- `JWT_SECRET`
- `PORT`

**Frontend:**
- `VITE_API_URL` (if different from default)

## Troubleshooting

### Icons Not Showing

- Ensure icons are in `frontend/public/` directory
- Check that manifest.json references the correct icon paths
- Clear browser cache and try again

### Service Worker Not Registering

- Ensure the app is served over HTTPS (or localhost)
- Check browser console for errors
- Verify `sw.js` is in the public directory

### App Not Installable

- Check that manifest.json is valid
- Ensure service worker is registered
- Verify HTTPS is enabled (required for PWA)
- Check browser console for PWA errors

## Next Steps

1. **Replace placeholder icons** with actual branded icons
2. **Test installation** on various devices
3. **Configure deployment** to your hosting service
4. **Set up automatic deployment** from GitHub Actions (optional)

## Additional Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

