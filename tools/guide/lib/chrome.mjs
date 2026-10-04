// One headless system Chrome at a time, with its own profile directory and a fixed debugging port, killed when the job ends.
// Never connects to or opens the user's own browser: the profile is under tmp/<agent>/ and the flags are explicit.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { REPO } from '../../copy/lib/lint.mjs';

export const CHROME = process.env.COPY_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export const AGENT_DIR = path.join(REPO, 'tmp', 'copy-trust-guide');
export const PORT_BASE = Number(process.env.COPY_PORT_BASE || 9100);

/**
 * @param {(ctx: {context, page, cdp, port:number}) => Promise<T>} job
 * @param {{profile?:string, port?:number, viewport?:{width:number,height:number}, colorScheme?:string}} [opts]
 */
export async function withChrome(job, { profile = 'chrome-profile', port = PORT_BASE, viewport = { width: 1280, height: 900 }, colorScheme = 'light' } = {}) {
  if (!fs.existsSync(CHROME)) throw new Error(`Chrome not found at ${CHROME} (set COPY_CHROME)`);
  const userDataDir = path.join(AGENT_DIR, profile);
  fs.rmSync(userDataDir, { recursive: true, force: true });
  fs.mkdirSync(userDataDir, { recursive: true });
  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath: CHROME, headless: true, viewport, colorScheme,
    args: [`--remote-debugging-port=${port}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync', '--disable-background-networking', '--disable-component-update', '--metrics-recording-only', '--mute-audio'],
  });
  try {
    const page = context.pages()[0] || await context.newPage();
    const cdp = await context.newCDPSession(page);
    return await job({ context, page, cdp, port });
  } finally {
    await context.close().catch(() => {});
  }
}
