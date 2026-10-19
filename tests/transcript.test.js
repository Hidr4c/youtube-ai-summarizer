const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const mainWorldPath = path.resolve(__dirname, '..', 'main_world.js');

function loadMainWorldFunctions() {
  const code = fs.readFileSync(mainWorldPath, 'utf8');
  // Inject export hooks to test internal functions
  const wrapped = code.replace(
    /\(function\s*\(\)\s*\{/,
    '(function () { global.__mw = { formatMs, cleanTranscriptText, parseTimedtextEvents, extractSegmentsFromInnerTubeJson };'
  );

  const sandbox = {
    global: {},
    window: { addEventListener: () => {} },
    document: { getElementById: () => null, querySelector: () => null },
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(wrapped, sandbox);
  return sandbox.global.__mw;
}

test('Transcript Processing & InnerTube Parser', async (t) => {
  const mw = loadMainWorldFunctions();

  await t.test('formatMs formats milliseconds into m:ss', () => {
    assert.equal(mw.formatMs(0), '0:00');
    assert.equal(mw.formatMs(15000), '0:15');
    assert.equal(mw.formatMs(65000), '1:05');
    assert.equal(mw.formatMs(3665000), '61:05');
  });

  await t.test('cleanTranscriptText cleans entities and excessive whitespace', () => {
    const raw = '&quot;Hello&quot; &amp; welcome&#39;s to &lt;YouTube&gt;! \n\n  Multiple   spaces. ';
    const cleaned = mw.cleanTranscriptText(raw);
    assert.equal(cleaned, '"Hello" & welcome\'s to <YouTube>! Multiple spaces.');
  });

  await t.test('parseTimedtextEvents correctly parses JSON3 YouTube timedtext events', () => {
    const sampleEvents = [
      { tStartMs: 16000, segs: [{ utf8: 'Hello ' }, { utf8: 'world!' }] },
      { tStartMs: 29000, segs: [{ utf8: 'This is a test transcript segment.' }] },
      { tStartMs: 45000, segs: [{ utf8: 'Another line of dialogue.' }] },
      { tStartMs: 60000, segs: [{ utf8: 'Fourth line to exceed minimum threshold.' }] }
    ];

    const parsed = mw.parseTimedtextEvents(sampleEvents);
    assert.ok(Array.isArray(parsed), 'Parsed result must be an array');
    assert.equal(parsed.length, 4);
    assert.equal(parsed[0].timestamp, '0:16');
    assert.equal(parsed[0].text, 'Hello world!');
    assert.equal(parsed[1].timestamp, '0:29');
    assert.equal(parsed[1].text, 'This is a test transcript segment.');
  });

  await t.test('extractSegmentsFromInnerTubeJson parses traditional transcriptSegmentRenderer', () => {
    const mockInnerTubeResponse = {
      actions: [
        {
          updateEngagementPanelAction: {
            content: {
              transcriptRenderer: {
                content: {
                  transcriptSearchPanelRenderer: {
                    body: {
                      transcriptSegmentListRenderer: {
                        initialSegments: [
                          {
                            transcriptSegmentRenderer: {
                              startTimeText: { simpleText: '0:10' },
                              snippet: { runs: [{ text: 'Welcome to this video.' }] }
                            }
                          },
                          {
                            transcriptSegmentRenderer: {
                              startTimeText: { simpleText: '0:25' },
                              snippet: { runs: [{ text: 'Today we discuss artificial intelligence.' }] }
                            }
                          },
                          {
                            transcriptSegmentRenderer: {
                              startTimeText: { simpleText: '0:40' },
                              snippet: { runs: [{ text: 'Let us see how it works.' }] }
                            }
                          },
                          {
                            transcriptSegmentRenderer: {
                              startTimeText: { simpleText: '0:55' },
                              snippet: { runs: [{ text: 'Here are the key takeaways.' }] }
                            }
                          }
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        }
      ]
    };

    const segments = mw.extractSegmentsFromInnerTubeJson(mockInnerTubeResponse);
    assert.ok(Array.isArray(segments), 'Segments must be extracted');
    assert.equal(segments.length, 4);
    assert.equal(segments[0].timestamp, '0:10');
    assert.equal(segments[0].text, 'Welcome to this video.');
    assert.equal(segments[3].timestamp, '0:55');
  });

  await t.test('extractSegmentsFromInnerTubeJson parses modern transcriptSegmentViewModel', () => {
    const mockModernResponse = {
      actions: [
        {
          updateEngagementPanelAction: {
            content: {
              macroMarkersPanelRenderer: {
                contents: [
                  {
                    transcriptSegmentViewModel: {
                      startTimeText: '0:16',
                      snippet: 'Arrivé face à ce gouffre sans fond...'
                    }
                  },
                  {
                    transcriptSegmentViewModel: {
                      startTimeText: { content: '0:29' },
                      snippet: { runs: [{ text: 'tout droit sortis des enfers qui s\'élève...' }] }
                    }
                  },
                  {
                    transcriptSegmentViewModel: {
                      startTimeText: '0:38',
                      snippet: 'sommeille là-dessous et veut sûrement vous casser la gueule.'
                    }
                  },
                  {
                    transcriptSegmentViewModel: {
                      startTimeText: '0:50',
                      snippet: 'Mais ça fait des jours, des semaines, peut-être même des mois.'
                    }
                  }
                ]
              }
            }
          }
        }
      ]
    };

    const segments = mw.extractSegmentsFromInnerTubeJson(mockModernResponse);
    assert.ok(Array.isArray(segments), 'Segments must be extracted from modern view model');
    assert.equal(segments.length, 4);
    assert.equal(segments[0].timestamp, '0:16');
    assert.equal(segments[0].text, 'Arrivé face à ce gouffre sans fond...');
    assert.equal(segments[1].timestamp, '0:29');
    assert.ok(segments[1].text.includes('tout droit sortis'));
  });
});
