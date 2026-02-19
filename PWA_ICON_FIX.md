# PWA Icon Fix Guide

## Issue
The PWA app icon (`/logo.png`) may not be square, causing it to stretch when displayed as an app icon on mobile devices.

## Solution

### Option 1: Create Square Icon Files (Recommended)

Create properly sized square icon files:

1. **Create square versions of your logo:**
   - `public/icon-192.png` - 192x192 pixels (square)
   - `public/icon-512.png` - 512x512 pixels (square)

2. **Update `public/manifest.json`:**
   ```json
   "icons": [
     { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
     { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
     { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
   ]
   ```

### Option 2: Use Image Editing Tool

If your logo is not square, use an image editor (like GIMP, Photoshop, or online tools) to:
1. Create a square canvas (e.g., 512x512)
2. Place your logo in the center with padding/background
3. Export as PNG
4. Save as `icon-192.png` and `icon-512.png` in the `public/` folder

### Option 3: Use Online Icon Generator

Use tools like:
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Favicon.io](https://favicon.io/)

These tools can generate proper square icons from your existing logo.

## Testing

After creating the icons:
1. Clear browser cache
2. Uninstall the PWA if already installed
3. Reinstall the PWA
4. Check that the icon displays correctly without stretching
