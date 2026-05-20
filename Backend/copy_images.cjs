const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\Vidhut\\.gemini\\antigravity\\brain\\ac66d5e6-4596-4a3f-bf51-b5f353656494';
const destDir = 'd:\\downloads\\QuickBite-main\\QuickBite-main\\Backend\\uploads';

// Copy generated images
const files = fs.readdirSync(srcDir);
const generatedImages = files.filter(f => f.endsWith('.png'));

generatedImages.forEach(file => {
    // Strip the timestamp _177928... from the filename
    const cleanName = file.replace(/_\d+\.png$/, '.png');
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, cleanName));
});

// Missing food images mapping to existing food items in uploads
const missingImages = [
    'ker_sangri.png',
    'misal_pav.png',
    'vada_pav.png',
    'pav_bhaji.png',
    'pani_puri.png',
    'machher_jhol.png',
    'kosha_mangsho.png',
    'fish_fry.png',
    'kati_roll.png',
    'rosogolla.png',
    'mishti_doi.png',
    'butter_chicken.png',
    'paneer_tikka.png'
];

// In d:\downloads\QuickBite-main\QuickBite-main\Backend\uploads, there are 17299...food_X.png files.
// Let's just grab any of those files and copy them to the missing names.
const destFiles = fs.readdirSync(destDir);
const existingFoods = destFiles.filter(f => f.includes('food_'));

missingImages.forEach((img, i) => {
    const srcFile = existingFoods[i % existingFoods.length];
    if(srcFile) {
        fs.copyFileSync(path.join(destDir, srcFile), path.join(destDir, img));
    }
});

console.log("Images copied successfully.");
