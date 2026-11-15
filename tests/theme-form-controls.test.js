import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Theme Form Controls & Native Popup Contrast Specification', () => {
  const contentCss = fs.readFileSync(path.join(rootDir, 'src/content/content.css'), 'utf-8');
  const popupCss = fs.readFileSync(path.join(rootDir, 'src/popup/popup.css'), 'utf-8');

  it('declares color-scheme: light and color-scheme: dark in content.css', () => {
    assert.match(contentCss, /color-scheme:\s*light;/);
    assert.match(contentCss, /color-scheme:\s*dark;/);
  });

  it('declares --yt-ai-bg-option for both light and dark theme palettes', () => {
    assert.match(contentCss, /--yt-ai-bg-option:\s*#ffffff;/);
    assert.match(contentCss, /--yt-ai-bg-option:\s*#212121;/);
  });

  it('enforces color-scheme: inherit and background-color on all select options in content.css', () => {
    assert.match(contentCss, /\.yt-ai-header-mode-select option/);
    assert.match(contentCss, /\.yt-ai-header-lang-select option/);
    assert.match(contentCss, /\.yt-ai-select option/);
    assert.match(contentCss, /background-color:\s*var\(--yt-ai-bg-option\);/);
  });

  it('enforces caret-color and placeholder styling on inputs and chat textarea', () => {
    assert.match(contentCss, /\.yt-ai-input::placeholder/);
    assert.match(contentCss, /\.yt-ai-chat-input::placeholder/);
    assert.match(contentCss, /caret-color:\s*var\(--yt-ai-text\);/);
  });

  it('enforces explicit dark and light color-scheme rules on all form controls', () => {
    assert.match(contentCss, /\.yt-ai-dark-theme\s+select/);
    assert.match(contentCss, /\.yt-ai-light-theme\s+select/);
    assert.match(contentCss, /\.yt-ai-dark-theme\s+option/);
    assert.match(contentCss, /background-color:\s*#212121;/);
    assert.match(contentCss, /background-color:\s*#ffffff;/);
  });

  it('enforces color-scheme: dark and option background in popup.css', () => {
    assert.match(popupCss, /color-scheme:\s*dark;/);
    assert.match(popupCss, /\.lang-select option/);
    assert.match(popupCss, /\.cache-select option/);
  });
});
