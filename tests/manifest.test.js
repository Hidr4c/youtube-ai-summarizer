import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const manifestPath = path.join(rootDir, 'manifest.json');

test('Manifest V3 Structure & Integrity', async (t) => {
  await t.test('manifest.json exists and is valid JSON', () => {
    assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');
    const content = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(content);
    assert.ok(manifest, 'manifest must be a valid JSON object');
  });

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  await t.test('conforms to Manifest V3 requirements', () => {
    assert.equal(manifest.manifest_version, 3, 'manifest_version must be 3');
    assert.ok(manifest.name, 'manifest must define a name');
    assert.ok(manifest.version, 'manifest must define a version');
    assert.ok(manifest.description, 'manifest must define a description');
    assert.ok(manifest.action, 'manifest must define action popup');
  });

  await t.test('defines required permissions', () => {
    const requiredPermissions = ['storage', 'activeTab', 'scripting'];
    assert.ok(Array.isArray(manifest.permissions), 'permissions must be an array');
    for (const perm of requiredPermissions) {
      assert.ok(
        manifest.permissions.includes(perm),
        `Permission "${perm}" must be declared in manifest.json`
      );
    }
  });

  await t.test('defines required host_permissions', () => {
    assert.ok(Array.isArray(manifest.host_permissions), 'host_permissions must be an array');
    const hasYouTubeHost = manifest.host_permissions.some(h => h.includes('youtube.com'));
    assert.ok(hasYouTubeHost, 'Must declare host_permission for youtube.com');
  });

  await t.test('all referenced files exist on disk', () => {
    // Check service worker
    if (manifest.background && manifest.background.service_worker) {
      const swPath = path.join(rootDir, manifest.background.service_worker);
      assert.ok(fs.existsSync(swPath), `Background script "${manifest.background.service_worker}" must exist`);
    }

    // Check content scripts
    if (Array.isArray(manifest.content_scripts)) {
      for (const cs of manifest.content_scripts) {
        if (Array.isArray(cs.js)) {
          for (const js of cs.js) {
            assert.ok(fs.existsSync(path.join(rootDir, js)), `Content script "${js}" must exist`);
          }
        }
        if (Array.isArray(cs.css)) {
          for (const css of cs.css) {
            assert.ok(fs.existsSync(path.join(rootDir, css)), `Content stylesheet "${css}" must exist`);
          }
        }
      }
    }

    // Check popup
    if (manifest.action && manifest.action.default_popup) {
      assert.ok(
        fs.existsSync(path.join(rootDir, manifest.action.default_popup)),
        `Popup HTML "${manifest.action.default_popup}" must exist`
      );
    }

    // Check icons
    if (manifest.icons) {
      for (const [size, iconPath] of Object.entries(manifest.icons)) {
        assert.ok(
          fs.existsSync(path.join(rootDir, iconPath)),
          `Icon for size ${size} at "${iconPath}" must exist`
        );
      }
    }
  });
});
