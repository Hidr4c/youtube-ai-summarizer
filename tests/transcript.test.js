import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InnerTubeParser } from '../src/parsers/InnerTubeParser.js';
import { TimedtextParser } from '../src/parsers/TimedtextParser.js';
import { TextCleaner } from '../src/parsers/TextCleaner.js';
import { InPageTranscriptController } from '../src/content/services/InPageTranscriptController.js';

describe('Transcript Processing & InnerTube Parser', () => {
  it('formatMs formats milliseconds into m:ss', () => {
    assert.equal(InnerTubeParser.formatMs(0), '0:00');
    assert.equal(InnerTubeParser.formatMs(15000), '0:15');
    assert.equal(InnerTubeParser.formatMs(65000), '1:05');
    assert.equal(InnerTubeParser.formatMs(3665000), '61:05');
  });

  it('cleanTranscriptText cleans entities and excessive whitespace', () => {
    const raw = '&quot;Hello&quot; &amp; welcome&#39;s to &lt;YouTube&gt;! \n\n  Multiple   spaces. ';
    const cleaned = TextCleaner.cleanTranscriptText(raw);
    assert.equal(cleaned, '"Hello" & welcome\'s to <YouTube>! Multiple spaces.');
  });

  it('parseTimedtextEvents correctly parses JSON3 YouTube timedtext events', () => {
    const sampleEvents = [
      { tStartMs: 16000, segs: [{ utf8: 'Hello ' }, { utf8: 'world!' }] },
      { tStartMs: 29000, segs: [{ utf8: 'This is a test transcript segment.' }] },
      { tStartMs: 45000, segs: [{ utf8: 'Another line of dialogue.' }] },
      { tStartMs: 60000, segs: [{ utf8: 'Fourth line to exceed minimum threshold.' }] }
    ];

    const segments = TimedtextParser.parseTimedtextEvents(sampleEvents);
    assert.equal(segments.length, 4);
    assert.equal(segments[0].text, 'Hello world!');
    assert.equal(segments[0].startMs, 16000);
    assert.equal(segments[1].text, 'This is a test transcript segment.');
  });

  it('extractSegmentsFromInnerTubeJson parses traditional transcriptSegmentRenderer', () => {
    const mockInnerTube = {
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
                              startMs: '1000',
                              endMs: '5000',
                              snippet: { runs: [{ text: 'Segment one of classical transcript' }] },
                              startTimeText: { simpleText: '0:01' }
                            }
                          },
                          {
                            transcriptSegmentRenderer: {
                              startMs: '5000',
                              endMs: '10000',
                              snippet: { runs: [{ text: 'Segment two with more information' }] },
                              startTimeText: { simpleText: '0:05' }
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

    const segments = InnerTubeParser.extractSegmentsFromInnerTubeJson(mockInnerTube);
    assert.ok(Array.isArray(segments), 'Must return an array of segments');
    assert.equal(segments.length, 2);
    assert.equal(segments[0].timestamp, '0:01');
    assert.equal(segments[0].text, 'Segment one of classical transcript');
  });

  it('extractSegmentsFromInnerTubeJson parses modern transcriptSegmentViewModel', () => {
    const mockModernInnerTube = {
      frameworkUpdates: {
        entityBatchUpdate: {
          mutations: [
            {
              payload: {
                transcriptSegmentViewModel: {
                  startTimeText: { content: '01:42' },
                  snippet: { content: 'Deep architecture insights and subagents' }
                }
              }
            },
            {
              payload: {
                transcriptSegmentViewModel: {
                  startTimeText: '08:15',
                  snippet: 'Reactive loop mechanisms in modern software'
                }
              }
            }
          ]
        }
      }
    };

    const segments = InnerTubeParser.extractSegmentsFromInnerTubeJson(mockModernInnerTube);
    assert.ok(Array.isArray(segments), 'Must return an array of modern segments');
    assert.equal(segments.length, 2);
    assert.equal(segments[0].timestamp, '01:42');
    assert.equal(segments[0].text, 'Deep architecture insights and subagents');
    assert.equal(segments[1].timestamp, '08:15');
    assert.equal(segments[1].text, 'Reactive loop mechanisms in modern software');
  });
  it('formatTimestampedText aggregates segments into readable text with periodic timestamps', () => {
    const segments = [
      { timestamp: '0:00', text: 'Welcome to this complete guide.' },
      { timestamp: '0:12', text: 'Today we explore agentic design.' },
      { timestamp: '0:35', text: 'Let us dive into the core architecture.' },
      { timestamp: '0:48', text: 'Notice how cleanly components isolate.' },
      { timestamp: '1:10', text: 'Now we discuss persistence and caching.' }
    ];

    const result = InPageTranscriptController.formatTimestampedText(segments, 30);
    assert.ok(result.includes('[0:00] Welcome to this complete guide. Today we explore agentic design.'));
    assert.ok(result.includes('[0:35] Let us dive into the core architecture. Notice how cleanly components isolate.'));
    assert.ok(result.includes('[1:10] Now we discuss persistence and caching.'));
  });

  it('formatTimestampedText handles empty or invalid segment lists', () => {
    assert.equal(InPageTranscriptController.formatTimestampedText([]), '');
    assert.equal(InPageTranscriptController.formatTimestampedText(null), '');
  });
});