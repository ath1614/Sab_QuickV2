const fs = require('fs');
const path = require('path');

const loaderPath = path.join(
  __dirname,
  '../node_modules/next/dist/compiled/@next/font/dist/google/loader.js'
);

if (fs.existsSync(loaderPath)) {
  let content = fs.readFileSync(loaderPath, 'utf8');
  const target = `const ext = /\\.(woff|woff2|eot|ttf|otf)$/.exec(googleFontFileUrl)[1];`;
  const replacement = `const extMatch = /\\.(woff|woff2|eot|ttf|otf)($|\\?)/.exec(googleFontFileUrl); const ext = extMatch ? extMatch[1] : 'woff2';`;

  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(loaderPath, content, 'utf8');
    console.log('[patch-next-font] Successfully patched @next/font Google loader for resilient font parsing.');
  } else {
    console.log('[patch-next-font] @next/font Google loader is already patched or up to date.');
  }
} else {
  console.log('[patch-next-font] @next/font Google loader not found at expected path, skipping.');
}
