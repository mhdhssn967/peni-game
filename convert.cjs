const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const dir1 = path.join(__dirname, 'public');
const dir2 = path.join(__dirname, 'public', 'environment');
const dir3 = path.join(__dirname, 'public', 'ice-candies'); // if exists

async function convertDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file.toLowerCase().endsWith('.png')) {
            const inputPath = path.join(dir, file);
            const outputPath = path.join(dir, file.replace(/\.png$/i, '.webp'));
            try {
                await sharp(inputPath).webp({ quality: 80 }).toFile(outputPath);
                console.log(`Converted ${inputPath} to ${outputPath}`);
                // Delete original png
                fs.unlinkSync(inputPath);
            } catch (err) {
                console.error(`Error converting ${inputPath}:`, err);
            }
        }
    }
}

async function main() {
    await convertDir(dir1);
    await convertDir(dir2);
    await convertDir(dir3);
}

main();
