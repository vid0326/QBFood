const fs = require('fs');
const path = require('path');

const srcDir = 'd:\\downloads\\QuickBite-main\\QuickBite-main\\Frontend\\src\\assets';
const destDir = 'd:\\downloads\\QuickBite-main\\QuickBite-main\\Backend\\uploads';

const files = fs.readdirSync(srcDir);
const menuImages = files.filter(f => f.startsWith('menu_'));

menuImages.forEach(file => {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
});

console.log("Menu images copied successfully.");
