const fs = require('fs');
const path = require('path');

const cssPlugin = {
  name: 'css',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      let css = await fs.promises.readFile(args.path, 'utf8');
      
      // Process CSS with PostCSS if it contains Tailwind directives
      if (css.includes('@import "tailwindcss"') || css.includes('@tailwind')) {
        try {
          // Dynamically import postcss and the tailwind postcss plugin
          const postcss = (await import('postcss')).default;
          const tailwindPlugin = (await import('@tailwindcss/postcss')).default;
          
          const result = await postcss([tailwindPlugin])
            .process(css, { 
              from: args.path,
              to: undefined 
            });
          
          css = result.css;
        } catch (error) {
          console.warn('⚠️ PostCSS processing failed, using raw CSS:', error.message);
          // Fall back to raw CSS if PostCSS fails
        }
      }
      
      // Create JavaScript code that injects the CSS
      const contents = `
        const css = ${JSON.stringify(css)};
        if (typeof document !== 'undefined') {
          const style = document.createElement('style');
          style.textContent = css;
          document.head.appendChild(style);
        }
      `;
      
      return {
        contents,
        loader: 'js',
      };
    });
  },
};

module.exports = cssPlugin; 