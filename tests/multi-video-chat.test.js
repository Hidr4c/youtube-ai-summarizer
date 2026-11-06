import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ChatTranscriptManager } from '../src/content/services/ChatTranscriptManager.js';
import { extractAllVideoIdsFromText } from '../src/content/ui/NavigationObserver.js';

describe('Multi-Video Chat & Context Continuity Specification', () => {
  it('extractAllVideoIdsFromText parses single and multiple YouTube URLs cleanly', () => {
    const textSingle = 'Check this video: https://www.youtube.com/watch?v=VIDEO_ONE_1';
    assert.deepEqual(extractAllVideoIdsFromText(textSingle), ['VIDEO_ONE_1']);

    const textMulti = 'Compare https://www.youtube.com/watch?v=VID_AAA_111 and https://youtu.be/VID_BBB_222 with https://www.youtube.com/shorts/VID_CCC_333';
    const ids = extractAllVideoIdsFromText(textMulti);
    assert.equal(ids.length, 3);
    assert.ok(ids.includes('VID_AAA_111'));
    assert.ok(ids.includes('VID_BBB_222'));
    assert.ok(ids.includes('VID_CCC_333'));
  });

  it('ChatTranscriptManager registers external video IDs and loads missing transcripts', async () => {
    const manager = new ChatTranscriptManager();
    manager.registerExternalIds(['EXT_VID_1', 'EXT_VID_2']);

    assert.deepEqual(manager.getActiveExternalIds(), ['EXT_VID_1', 'EXT_VID_2']);

    const fetchHistory = [];
    const mockController = {
      fetchTranscriptFromBackground: async (id) => {
        fetchHistory.push(id);
        return {
          title: `Title of ${id}`,
          segments: [{ timestamp: '0:00', text: `Dialogue of ${id}` }]
        };
      }
    };

    const result = await manager.ensureTranscriptsLoaded(['EXT_VID_1', 'EXT_VID_2'], mockController, 'fr');
    assert.deepEqual(result.loaded, ['EXT_VID_1', 'EXT_VID_2']);
    assert.deepEqual(fetchHistory, ['EXT_VID_1', 'EXT_VID_2']);

    // Second call with same IDs should use cache and not refetch
    fetchHistory.length = 0;
    const cachedResult = await manager.ensureTranscriptsLoaded(['EXT_VID_1'], mockController, 'fr');
    assert.deepEqual(cachedResult.loaded, ['EXT_VID_1']);
    assert.equal(fetchHistory.length, 0, 'Must reuse cached transcript without network request');
  });

  it('ChatTranscriptManager allocates proportional budget across current and multiple external videos', () => {
    const manager = new ChatTranscriptManager();
    manager.cachedExternalTranscripts.set('EXT_1', {
      title: 'External Video 1',
      segments: [{ timestamp: '0:00', text: 'Content of external video 1.' }]
    });
    manager.cachedExternalTranscripts.set('EXT_2', {
      title: 'External Video 2',
      segments: [{ timestamp: '0:00', text: 'Content of external video 2.' }]
    });

    manager.registerExternalIds(['EXT_1', 'EXT_2']);

    const condenseFn = (txt, max) => txt.slice(0, max);
    const { safeTranscript, meta, isMultiVideo } = manager.buildMultiVideoContext(
      'CURRENT_VID',
      { title: 'Current Main Video', author: 'Main Author' },
      'Detailed content of the main video currently watched.',
      10000,
      condenseFn
    );

    assert.equal(isMultiVideo, true);
    assert.ok(safeTranscript.includes('[VIDÉO ACTUELLE : "Current Main Video"'), 'Must include current video');
    assert.ok(safeTranscript.includes('[VIDÉO EXTERNE RÉFÉRENCÉE 1 : "External Video 1"'), 'Must include external video 1');
    assert.ok(safeTranscript.includes('[VIDÉO EXTERNE RÉFÉRENCÉE 2 : "External Video 2"'), 'Must include external video 2');
    assert.ok(meta.title.includes('vs:'), 'Composite metadata must reflect multi-video comparison');
  });

  it('ChatTranscriptManager preserves active external videos on follow-up questions until reset', () => {
    const manager = new ChatTranscriptManager();
    manager.registerExternalIds(['EXT_PERSIST']);
    manager.cachedExternalTranscripts.set('EXT_PERSIST', {
      title: 'Persisted Video',
      segments: [{ timestamp: '0:00', text: 'Persistent transcript' }]
    });

    // Turn 1
    const turn1 = manager.buildMultiVideoContext('CURR', { title: 'Curr' }, 'Main text', 5000, (t) => t);
    assert.equal(turn1.isMultiVideo, true);

    // Turn 2: User asks follow-up with no new URL (registerExternalIds not called or called with empty)
    manager.registerExternalIds([]);
    const turn2 = manager.buildMultiVideoContext('CURR', { title: 'Curr' }, 'Main text', 5000, (t) => t);
    assert.equal(turn2.isMultiVideo, true, 'Active external videos must persist across follow-up turns');
    assert.ok(turn2.safeTranscript.includes('Persisted Video'));

    // Reset on clear chat
    manager.reset();
    const turn3 = manager.buildMultiVideoContext('CURR', { title: 'Curr' }, 'Main text', 5000, (t) => t);
    assert.equal(turn3.isMultiVideo, false, 'Must return to single-video mode after reset');
  });
});
