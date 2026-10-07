// dev: compare horse-head path candidates at a large size
import { launch, ROOT } from './chrome.mjs';
import path from 'node:path';
const C = {
  A: 'M6.2 23.2C4.7 16.6 4.9 9.2 8.4 3.4L9.2 0.9L11.3 3.1C15.6 3.3 19.4 6.4 21.4 11.4C22.5 13.4 22.5 15.9 20.6 16.7C18.9 17.4 17.1 16.3 16.1 14.9C14.6 15.6 13.6 17.9 13.7 23.2Z',
  B: 'M5.4 23.6C4.5 19.2 4.7 13.6 6.5 9.4C7.3 7.4 8.1 5.4 8.7 3.1L9.1 0.5L11.2 3C14.7 3.3 17.9 5.5 20.3 9.5C21.5 11.5 23 13.1 23.4 14.9C23.7 16.6 22.3 18 20.7 17.8C19.2 17.6 17.8 16.7 16.9 15.5C15.7 16.7 14.8 18.8 14.6 23.6Z',
  C: 'M5 23.6C4.2 20 4.6 15.5 5.6 12.4L4.9 12.1C5.5 10.2 6.3 8.2 7.1 6.4L6.6 6.2C7.4 5 8.1 3.7 8.7 2.4L9.2 0.4L11.3 2.9C14.8 3.2 18 5.4 20.4 9.4C21.6 11.4 23 13 23.4 14.8C23.7 16.5 22.3 17.9 20.7 17.7C19.2 17.5 17.8 16.6 16.9 15.4C15.7 16.6 14.8 18.8 14.6 23.6Z',
  D: 'M5.2 23.6C4.4 19 4.8 13.8 6.7 9.6C7.6 7.6 8.4 5.6 8.9 3.2L9.4 0.4L11.5 3.1C15 3.4 18.2 5.7 20.4 9.8C21.5 11.7 22.9 13.3 23.2 15C23.4 16.7 22 18 20.4 17.7C18.9 17.4 17.5 16.5 16.6 15.3C15.5 16.5 14.7 18.5 14.5 23.6Z',
};
let html = '<body style="margin:0;background:#4e613e;padding:20px;display:flex;gap:40px">';
for (const [k, d] of Object.entries(C)) html += `<div><svg width="240" height="240" viewBox="0 0 24 24"><rect x="-4" y="-4" width="32" height="32" rx="3" fill="#1B4B91"/><path d="${d}" fill="#fff"/><circle cx="14.1" cy="8.1" r="1.15" fill="#1B4B91"/></svg><div style="color:#fff;font:14px Segoe UI">${k}</div><svg width="26" height="26" viewBox="0 0 24 24" style="background:#1B4B91"><path d="${d}" fill="#fff"/><circle cx="14.1" cy="8.1" r="1.15" fill="#1B4B91"/></svg></div>`;
const { page, close } = await launch({ w: 1200, h: 400 }); await page.setContent(html); await page.waitForTimeout(100);
await page.screenshot({ path: path.join(ROOT, '..', '..', '..', '..', 'tmp', 'look-dev', 'symbology', 'horse.png') }); await close();
