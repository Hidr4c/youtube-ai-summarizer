import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ProtobufHelper } from '../src/injected/ProtobufHelper.js';
import { InnerTubeParser } from '../src/parsers/InnerTubeParser.js';
import { InnerTubeBridge } from '../src/injected/InnerTubeBridge.js';
import { DOMTranscriptExtractor } from '../src/content/services/DOMTranscriptExtractor.js';

describe('Modern Transcript Panel & Protobuf Engine', () => {
  it('synthesizes exact deterministic protobuf params for MbjRrKvYihY matching YouTube live capture', () => {
    const params = ProtobufHelper.generateModernTranscriptPanelParams('MbjRrKvYihY');
    assert.equal(params, 'qgkPCgtNYmpSckt2WWloWRgB');
  });

  it('generates valid base64 protobuf for other arbitrary video IDs', () => {
    const params = ProtobufHelper.generateModernTranscriptPanelParams('sQm2ygdqoEo');
    assert.ok(typeof params === 'string' && params.length > 10);
    const decoded = Buffer.from(params, 'base64');
    assert.equal(decoded[0], 170); // Tag 1194 varint byte 1
    assert.equal(decoded[1], 9);   // Tag 1194 varint byte 2
    assert.ok(decoded.toString('utf-8').includes('sQm2ygdqoEo'));
  });

  it('returns null when videoId is missing or empty', () => {
    assert.equal(ProtobufHelper.generateModernTranscriptPanelParams(''), null);
    assert.equal(ProtobufHelper.generateModernTranscriptPanelParams(null), null);
    assert.equal(ProtobufHelper.generateModernTranscriptPanelParams(undefined), null);
  });

  it('InnerTubeBridge delegates generateModernTranscriptPanelParams correctly', () => {
    const params = InnerTubeBridge.generateModernTranscriptPanelParams('MbjRrKvYihY');
    assert.equal(params, 'qgkPCgtNYmpSckt2WWloWRgB');
  });

  it('InnerTubeParser extracts modern transcriptSegmentViewModel with simpleText and timestamp', () => {
    const mockJson = {
      content: {
        engagementPanelSectionListRenderer: {
          content: {
            sectionListRenderer: {
              contents: [
                {
                  itemSectionRenderer: {
                    contents: [
                      {
                        transcriptSegmentViewModel: {
                          simpleText: 'Novembre 2026, un gigantesque vaisseau extraterrestre apparaît dans le ciel.',
                          timestamp: '0:00'
                        }
                      },
                      {
                        transcriptSegmentViewModel: {
                          simpleText: 'Le premier contact officiel avec une civilisation alienne est instauré.',
                          timestamp: '0:09'
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        }
      }
    };

    const segments = InnerTubeParser.extractSegmentsFromInnerTubeJson(mockJson, { allowChapters: false });
    assert.ok(Array.isArray(segments));
    assert.equal(segments.length, 2);
    assert.equal(segments[0].timestamp, '0:00');
    assert.ok(segments[0].text.includes('vaisseau extraterrestre'));
    assert.equal(segments[1].timestamp, '0:09');
    assert.ok(segments[1].text.includes('civilisation alienne'));
  });

  it('InnerTubeBridge.fetchModernTranscriptPanel calls get_panel endpoint with valid credentials', async () => {
    const origFetch = globalThis.fetch;
    const origWindow = globalThis.window;

    globalThis.window = {
      ytcfg: {
        get: (key) => {
          if (key === 'INNERTUBE_CONTEXT') return { client: { hl: 'fr' } };
          if (key === 'INNERTUBE_CLIENT_NAME') return '1';
          if (key === 'INNERTUBE_CLIENT_VERSION') return '2.20261111.01.00';
          return null;
        }
      }
    };

    let calledUrl = '';
    let calledBody = null;

    globalThis.fetch = async (url, opts) => {
      calledUrl = url;
      calledBody = JSON.parse(opts.body);
      return {
        ok: true,
        json: async () => ({
          content: {
            items: [
              {
                transcriptSegmentViewModel: {
                  simpleText: 'Discours complet de la vidéo.',
                  timestamp: '1:23'
                }
              }
            ]
          }
        })
      };
    };

    try {
      const segs = await InnerTubeBridge.fetchModernTranscriptPanel('MbjRrKvYihY');
      assert.ok(calledUrl.includes('get_panel'));
      assert.equal(calledBody.panelId, 'PAmodern_transcript_view');
      assert.equal(calledBody.params, 'qgkPCgtNYmpSckt2WWloWRgB');
      assert.ok(Array.isArray(segs));
      assert.equal(segs.length, 1);
      assert.equal(segs[0].timestamp, '1:23');
      assert.equal(segs[0].text, 'Discours complet de la vidéo.');
    } finally {
      globalThis.fetch = origFetch;
      globalThis.window = origWindow;
    }
  });
});
