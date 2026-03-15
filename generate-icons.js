// Generate PWA icons from new_logo_no_text.png
// Run with: bun generate-icons.js  (or node generate-icons.js)

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const logoPath = path.join(__dirname, 'new_logo_no_text.png');
const iconsDir = path.join(__dirname, 'icons');
const BG = { r: 255, g: 250, b: 248, alpha: 1 }; // #FFFAF8

async function generateIcon(sharp, size, paddingRatio, suffix) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}${suffix}.png`);

    const background = sharp({
        create: { width: size, height: size, channels: 4, background: BG }
    }).png();

    const padding = Math.round(size * paddingRatio);
    const innerSize = size - padding * 2;

    const resizedLogo = await sharp(logoPath)
        .resize(innerSize, innerSize, { fit: 'contain', background: { ...BG, alpha: 0 } })
        .png()
        .toBuffer();

    await background
        .composite([{ input: resizedLogo, gravity: 'centre' }])
        .toFile(outputPath);

    return `icon-${size}x${size}${suffix}.png`;
}

async function generateIcons() {
    if (!fs.existsSync(logoPath)) {
        console.error('❌ new_logo_no_text.png not found in project root.');
        process.exit(1);
    }

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
        // Regular icons: 10% padding
        const name1 = await generateIcon(sharp, size, 0.10, '');
        console.log(`  ✅ ${name1}`);

        // Maskable icons: 20% padding (safe zone = inner 80%)
        const name2 = await generateIcon(sharp, size, 0.20, '-maskable');
        console.log(`  ✅ ${name2}`);
    }

    console.log(`\n🎉 Done! ${sizes.length * 2} icons saved to ./icons/`);
}

generateIcons().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
