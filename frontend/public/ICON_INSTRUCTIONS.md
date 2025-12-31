# PWA Icon Instructions

This directory should contain two icon files for the Progressive Web App:

1. **icon-192.png** - 192x192 pixels
2. **icon-512.png** - 512x512 pixels

## Quick Setup

### Option 1: Generate Placeholder Icons
Run this command from the frontend directory:
```bash
npm run generate-icons
```

### Option 2: Create Your Own Icons

1. Create or design your app icon
2. Export as PNG files with these exact dimensions:
   - 192x192 pixels → `icon-192.png`
   - 512x512 pixels → `icon-512.png`
3. Place both files in `frontend/public/` directory

### Recommended Tools

- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Figma](https://www.figma.com/) or [Canva](https://www.canva.com/) for design

### Icon Design Tips

- Use a simple, recognizable design
- Ensure it looks good at small sizes (192px)
- Test on both light and dark backgrounds
- Consider using the APSAR logo or a search and rescue theme

## Verification

After adding icons, verify they work:
1. Build the app: `npm run build`
2. Preview: `npm run preview`
3. Open browser DevTools → Application → Manifest
4. Check that icons are listed correctly

