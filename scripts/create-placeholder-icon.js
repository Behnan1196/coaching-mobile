const fs = require('fs');
const path = require('path');

console.log('🎨 Creating placeholder app icon...');

// Create a simple SVG placeholder icon
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="#249096"/>
  <text x="512" y="400" font-family="Arial, sans-serif" font-size="120" font-weight="bold" text-anchor="middle" fill="white">ÖK</text>
  <text x="512" y="600" font-family="Arial, sans-serif" font-size="80" text-anchor="middle" fill="white">Koçluk</text>
</svg>`;

const iconPath = path.join(__dirname, '..', 'assets', 'icon.svg');
const pngPath = path.join(__dirname, '..', 'assets', 'icon.png');

// Write SVG file
fs.writeFileSync(iconPath, svgContent);
console.log(`✅ Created placeholder SVG icon: ${iconPath}`);

console.log('');
console.log('⚠️  IMPORTANT: This is a temporary placeholder icon!');
console.log('');
console.log('📱 For App Store submission, you need to:');
console.log('   1. Create a proper 1024x1024 PNG icon');
console.log('   2. Replace assets/icon.png with your design');
console.log('   3. The icon should be based on your ozgunlogo.png');
console.log('');
console.log('🎨 Icon requirements:');
console.log('   - Size: 1024x1024 pixels');
console.log('   - Format: PNG');
console.log('   - Background: Solid color (not transparent)');
console.log('   - No rounded corners or borders');
console.log('   - High quality and crisp');
console.log('');
console.log('💡 Quick icon creation:');
console.log('   - Use Canva, Figma, or Adobe Express');
console.log('   - Start with your ozgunlogo.png');
console.log('   - Resize to 1024x1024');
console.log('   - Add a solid background color');
console.log('   - Save as PNG');
console.log('');
console.log('🚀 Once you have the proper icon, rebuild with:');
console.log('   eas build --platform ios --profile production');
