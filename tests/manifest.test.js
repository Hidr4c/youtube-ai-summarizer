const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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
    assert.ok(manifest.name && manifest.name.length > 0, 'name must be defined');
    assert.ok(manifest.version && /^\d+\.\d+\.\d+$/.test(manifest.version), 'version must follow semver format (X.Y.Z)');
    assert.ok(manifest.description && manifest.description.length <= 132, 'description must be <= 132 chars');
  });

  await t.test('defines required permissions', () => {
    assert.ok(Array.isArray(manifest.permissions), 'permissions must be an array');
    assert.ok(manifest.permissions.includes('activeTab'), 'permissions must include activeTab');
    assert.ok(manifest.permissions.includes('scripting'), 'permissions must include scripting');
    assert.ok(manifest.permissions.includes('storage'), 'permissions must include storage');
  });

  await t.test('defines required host_permissions', () => {
    assert.ok(Array.isArray(manifest.host_permissions), 'host_permissions must be an array');
    assert.ok(manifest.host_permissions.includes('https://www.youtube.com/*'), 'host_permissions must include YouTube');
  });

  await t.test('all referenced files exist on disk', () => {
    // Service worker
    if (manifest.background && manifest.background.service_worker) {
      const swPath = path.join(rootDir, manifest.background.service_worker);
      assert.ok(fs.existsSync(swPath), `Service worker ${manifest.background.service_worker} must exist`);
    }

    // Popup
    if (manifest.action && manifest.action.default_popup) {
      const popupPath = path.join(rootDir, manifest.action.default_popup);
      assert.ok(fs.existsSync(popupPath), `Popup file ${manifest.action.default_popup} must exist`);
    }

    // Icons
    const icons = manifest.icons || {};
    for (const [size, iconRel] of Object.entries(icons)) {
      const iconPath = path.join(rootDir, iconRel);
      assert.ok(fs.existsSync(iconPath), `Icon ${size} at ${iconRel} must exist`);
      const stat = fs.statSync(iconPath);
      assert.ok(stat.size > 0, `Icon ${iconRel} must not be empty`);
    }

    // Content scripts
    if (Array.isArray(manifest.content_scripts)) {
      for (const cs of manifest.content_scripts) {
        if (Array.isArray(cs.js)) {
          for (const jsFile of cs.js) {
            const jsPath = path.join(rootDir, jsFile);
            assert.ok(fs.existsSync(jsPath), `Content script ${jsFile} must exist`);
          }
        }
        if (Array.isArray(cs.css)) {
          for (const cssFile of cs.css) {
            const cssPath = path.join(rootDir, cssFile);
            assert.ok(fs.existsSync(cssPath), `Content stylesheet ${cssFile} must exist`);
          }
        }
      }
    }
  });
});
