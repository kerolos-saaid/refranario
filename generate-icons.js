// Generate PWA icons from new_logo_no_text.png
// Run with: bun generate-icons.js  (or node generate-icons.js)

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const logoPath = path.join(__dirname, 'new_logo_no_text.png');
const iconsDir = path.join(__dirname, 'icons');

async function generateIcons() {
    // Check logo exists
    if (!fs.existsSync(logoPath)) {
        console.error('❌ new_logo_no_text.png not found in project root.');
        process.exit(1);
    }

    // Ensure icons directory exists
    if (!fs.existsSync(iconsDir)) {
        fs.mkdirSync(iconsDir, { recursive: true });
    }

    let sharp;
    try {
        sharp = require('sharp');
    } catch {
        console.log('Installing sharp...');
        const { execSync } = require('child_process');
        execSync('bun add sharp', { cwd: __dirname, stdio: 'inherit' });
        sharp = require('sharp');
    }

    console.log('🎨 Generating PWA icons from new_logo_no_text.png...\n');

    for (const size of sizes) {
        const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);

        // Create a canvas with off-white background, then composite the logo
        const background = sharp({
            create: {
                width: size,
                height: size,
                channels: 4,
                background: { r: 255, g: 250, b: 248, alpha: 1 } // #FFFAF8
            }
        }).png();

        const padding = Math.round(size * 0.08);
        const innerSize = size - padding * 2;

        // Resize logo to fit with padding
        const resizedLogo = await sharp(logoPath)
            .resize(innerSize, innerSize, { fit: 'contain', background: { r: 255, g: 250, b: 248, alpha: 0 } })
            .png()
            .toBuffer();

        // Composite logo onto background
        await background
            .composite([{
                input: resizedLogo,
                gravity: 'centre'
            }])
            .toFile(outputPath);

        console.log(`  ✅ icon-${size}x${size}.png`);
    }

    console.log(`\n🎉 Done! ${sizes.length} icons saved to ./icons/`);
}

generateIcons().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
