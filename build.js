const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const { execSync } = require('child_process');
const cssPlugin = require('./esbuild-css-plugin');

async function build() {
  console.log('🚀 Starting build process...');
  
  // Create dist directory if it doesn't exist
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  // Note: We're building the React popup directly with esbuild
  // No need for Next.js build for the extension popup

  // Bundle background script with dependencies
  try {
    await esbuild.build({
      entryPoints: ['background.js'],
      bundle: true,
      outfile: 'dist/background.js',
      format: 'esm',
      platform: 'browser',
      target: 'es2020',
      minify: false, // Set to true for production
      sourcemap: false
    });
    console.log('✅ Background script bundled successfully!');
  } catch (error) {
    console.error('❌ Error bundling background script:', error);
    process.exit(1);
  }

  // Bundle React popup component
  try {
    await esbuild.build({
      entryPoints: ['src/popup-entry.tsx'],
      bundle: true,
      outfile: 'dist/popup.js',
      format: 'iife',
      platform: 'browser',
      target: 'es2020',
      minify: false,
      sourcemap: false,
      jsx: 'automatic',
      plugins: [cssPlugin],
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      external: [],
      loader: {
        '.tsx': 'tsx',
        '.ts': 'ts',
        '.jsx': 'jsx',
        '.js': 'js'
      }
    });
    console.log('✅ React popup bundled successfully!');
  } catch (error) {
    console.error('❌ Error bundling React popup:', error);
    // Fallback to vanilla popup if React build fails
    console.log('⚠️ Falling back to vanilla popup...');
    if (fs.existsSync('popup.js')) {
      fs.copyFileSync('popup.js', path.join('dist', 'popup.js'));
    }
    if (fs.existsSync('popup.html')) {
      fs.copyFileSync('popup.html', path.join('dist', 'popup.html'));
      console.log('✅ Fallback popup files copied!');
      return;
    }
  }

  // Create popup HTML file
  const popupHtml = `<!DOCTYPE html>
<html>
<head>
  <title>YouTube Video Filter</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 400px;
      height: 600px;
      overflow-y: auto;
    }
    #root {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="popup.js"></script>
</body>
</html>`;

  fs.writeFileSync(path.join('dist', 'popup.html'), popupHtml);
  console.log('✅ Popup HTML created successfully!');

  // Copy other files to dist (no bundling needed)
  const filesToCopy = [
    'manifest.json',
    'content.js'
  ];

  filesToCopy.forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join('dist', file));
      console.log(`✅ Copied ${file}`);
    }
  });

  // Create icons directory in dist
  if (!fs.existsSync(path.join('dist', 'icons'))) {
    fs.mkdirSync(path.join('dist', 'icons'));
  }

  // Copy icons if they exist
  if (fs.existsSync('icons')) {
    const iconFiles = fs.readdirSync('icons');
    iconFiles.forEach(file => {
      fs.copyFileSync(
        path.join('icons', file), 
        path.join('dist', 'icons', file)
      );
    });
    console.log('✅ Icons copied successfully!');
  }

  console.log('🎉 Build completed successfully!');
  console.log('📁 Extension files are ready in the dist/ directory');
  console.log('🔧 Load the dist/ directory as an unpacked extension in Chrome');
}

build().catch(console.error); 