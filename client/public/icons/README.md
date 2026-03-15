# PWA Icons

This folder contains the app icons for the Refranario PWA.

## Required Sizes

The following icon sizes are needed for full PWA support:

- 72x72 (Android)
- 96x96 (Android)
- 128x128 (Android)
- 144x144 (Android)
- 152x152 (iOS)
- 192x192 (Android, Chrome)
- 384x384 (Android)
- 512x512 (Android, Chrome, Splash screens)

## Generating Icons

You can use the provided `icon.svg` as a base and convert it to PNG using:

### Online Tools
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

### Command Line (ImageMagick)
```bash
# Install ImageMagick first
# Then run:
for size in 72 96 128 144 152 192 384 512; do
  convert icon.svg -resize ${size}x${size} icon-${size}x${size}.png
done
```

### Node.js (sharp)
```javascript
const sharp = require('sharp');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  sharp('icon.svg')
    .resize(size, size)
    .toFile(`icon-${size}x${size}.png`);
});
```

## Placeholder Icons

For development, you can use placeholder images from:
- https://via.placeholder.com/512x512/2d8659/ffffff?text=R
- Or create simple colored squares with the app initial

## Design Guidelines

- Use the brand color (#2d8659) as background
- Include a recognizable symbol (book, scroll, or "R" letter)
- Ensure the icon is clear at small sizes (72x72)
- Use maskable icon format for Android adaptive icons
- Test on both light and dark backgrounds
