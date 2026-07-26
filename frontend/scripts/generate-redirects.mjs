import { writeFileSync } from 'fs';

const backend = (process.env.BACKEND_URL || '').replace(/\/$/, '');
const lines = [];

if (backend) {
  lines.push(`/api/*  ${backend}/api/:splat  200`);
}

lines.push('/*  /index.html  200');

writeFileSync('public/_redirects', `${lines.join('\n')}\n`);

if (backend) {
  console.log(`✓ _redirects: /api/* → ${backend}/api/*`);
} else {
  console.log('✓ _redirects: SPA only (set BACKEND_URL on Netlify to proxy API)');
}
