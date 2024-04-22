const fs = require('fs');
const path = require('path');

const directories = [
    './public/assets',
    './public/assets/images',
    './public/assets/sounds',
    './public/assets/animations'
];

directories.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dirPath}`);
    } else {
        console.log(`Directory already exists: ${dirPath}`);
    }
});