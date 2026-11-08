import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { WatchPageTranscriptFetcher } from '../src/background/WatchPageTranscriptFetcher.js';

describe('WatchPageTranscriptFetcher - Deep Extraction & Format Parsing', () => {
  it('extracts balanced JSON and balanced arrays from arbitrary strings', () => {
    const raw = 'prefix ytInitialPlayerResponse = {"videoDetails":{"title":"AI Future","nested":{"a":1}},"flag":true}; suffix';
    const jsonStr = WatchPageTranscriptFetcher.extractBalancedJson(raw, raw.indexOf('{'));
    assert.ok(jsonStr);
    const parsed = JSON.parse(jsonStr);
    assert.equal(parsed.videoDetails.title, 'AI Future');
    assert.equal(parsed.videoDetails.nested.a, 1);

    const arrayRaw = 'prefix "captionTracks": [{"baseUrl":"http://a"},{"baseUrl":"http://b"}]; suffix';
    const arrStr = WatchPageTranscriptFetcher.extractBalancedArray(arrayRaw, arrayRaw.indexOf('['));
    assert.ok(arrStr);
    const parsedArr = JSON.parse(arrStr);
    assert.equal(parsedArr.length, 2);
    assert.equal(parsedArr[1].baseUrl, 'http://b');

    // Unbalanced returns null
    assert.equal(WatchPageTranscriptFetcher.extractBalancedJson('{"unclosed": 1'), null);
    assert.equal(WatchPageTranscriptFetcher.extractBalancedArray('[1, 2, 3'), null);
    assert.equal(WatchPageTranscriptFetcher.extractBalancedJson('no brace'), null);
  });

  it('parses timedtext JSON3 payload with timestamp calculation', () => {
    const json3Payload = JSON.stringify({
      events: [
        { tStartMs: 0, dDurationMs: 2000, segs: [{ utf8: 'Hello ' }, { utf8: 'world!' }] },
        { tStartMs: 65000, dDurationMs: 3000, segs: [{ utf8: 'Second segment at 1 min' }] },
        { tStartMs: 125000, segs: [{ utf8: '\n' }] }, // Should be filtered
        { tStartMs: 130000, dDurationMs: 4000 } // No segs
      ]
    });

    const segments = WatchPageTranscriptFetcher.parseTimedtextPayload(json3Payload);
    assert.equal(segments.length, 2);
    assert.equal(segments[0].timestamp, '0:00');
    assert.equal(segments[0].text, 'Hello world!');
    assert.equal(segments[1].timestamp, '1:05');
    assert.equal(segments[1].text, 'Second segment at 1 min');
  });

  it('parses XML standard <text> format with HTML entity decoding', () => {
    const xmlPayload = `
      <transcript>
        <text start="0.0" dur="2.5">Bienvenue sur la cha&#39;ne &amp; d&eacute;couvrez</text>
        <text start="72.4" dur="4.1">R&eacute;sultat &quot;extraordinaire&quot; &lt;valid&eacute;&gt;</text>
      </transcript>
    `;

    const segments = WatchPageTranscriptFetcher.parseTimedtextPayload(xmlPayload);
    assert.equal(segments.length, 2);
    assert.equal(segments[0].timestamp, '0:00');
    assert.ok(segments[0].text.includes('&'));
    assert.equal(segments[1].timestamp, '1:12');
    assert.ok(segments[1].text.includes('"extraordinaire"'));
  });

  it('parses TTML XML format (<p t="..." d="..."> and <p begin="...">)', () => {
    const ttmlPayload = `
      <tt>
        <body>
          <div>
            <p t="1500" d="2000">Premier sous-titre en format TTML</p>
            <p t="85000" d="3500">Sous-titre après une minute</p>
            <p begin="120.5s">Sous-titre avec attribut begin en secondes</p>
          </div>
        </body>
      </tt>
    `;

    const segments = WatchPageTranscriptFetcher.parseTimedtextPayload(ttmlPayload);
    assert.equal(segments.length, 3);
    assert.equal(segments[0].timestamp, '0:01');
    assert.equal(segments[0].text, 'Premier sous-titre en format TTML');
    assert.equal(segments[1].timestamp, '1:25');
    assert.equal(segments[2].timestamp, '2:00');
    assert.equal(segments[2].text, 'Sous-titre avec attribut begin en secondes');
  });

  it('handles empty or corrupted payload gracefully without throwing', () => {
    assert.deepEqual(WatchPageTranscriptFetcher.parseTimedtextPayload(''), []);
    assert.deepEqual(WatchPageTranscriptFetcher.parseTimedtextPayload(null), []);
    assert.deepEqual(WatchPageTranscriptFetcher.parseTimedtextPayload('{ invalid json }'), []);
  });

  it('cascades through language auto-translation and raw fallbacks in fetchTranscript', async () => {
    const mockWatchHtml = `
      <html>
        <head><title>Quantum Computing - YouTube</title></head>
        <body>
          <script>
            ytInitialPlayerResponse = {
              "videoDetails": { "title": "Quantum Computing", "author": "Physicist" },
              "captions": {
                "playerCaptionsTracklistRenderer": {
                  "captionTracks": [
                    { "languageCode": "en", "baseUrl": "https://yt.com/tt?v=qc1" }
                  ]
                }
              }
            };
          </script>
        </body>
      </html>
    `;

    const originalFetch = globalThis.fetch;
    let attemptedUrls = [];

    globalThis.fetch = mock.fn(async (url) => {
      attemptedUrls.push(url);
      if (url.includes('youtube.com/watch')) {
        return { ok: true, text: async () => mockWatchHtml };
      }
      if (url.includes('tlang=fr')) {
        // Mock auto-translated JSON3 response
        return {
          ok: true,
          text: async () => JSON.stringify({
            events: [{ tStartMs: 1000, segs: [{ utf8: 'Informatique Quantique' }] }]
          })
        };
      }
      return { ok: false, status: 404 };
    });

    try {
      const res = await WatchPageTranscriptFetcher.fetchTranscript('qc1', 'fr');
      assert.equal(res.success, true);
      assert.equal(res.title, 'Quantum Computing');
      assert.equal(res.segments.length, 1);
      assert.equal(res.segments[0].text, 'Informatique Quantique');

      // Verify that tlang=fr was attempted
      assert.ok(attemptedUrls.some(u => u.includes('tlang=fr')));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('parses timedtext with minute and hour-scale timestamps into formatted segments', () => {
    const payload = JSON.stringify({
      events: [
        { tStartMs: 3665000, segs: [{ utf8: 'One hour in' }] },
        { tStartMs: 7200000, segs: [{ utf8: 'Two hours in' }] }
      ]
    });
    const segments = WatchPageTranscriptFetcher.parseTimedtextPayload(payload);
    assert.equal(segments.length, 2);
    assert.equal(segments[0].timestamp, '61:05');
    assert.equal(segments[0].text, 'One hour in');
    assert.equal(segments[1].timestamp, '120:00');
  });

  it('strips nested HTML styling tags and decodes XML entities during XML parsing', () => {
    const xml = `
      <transcript>
        <text start="10.0" dur="2.0">&lt;font color=&quot;#ff0000&quot;&gt;Hello &amp; &lt;b&gt;World&lt;/b&gt;&lt;/font&gt; &#39;test&#39;</text>
      </transcript>
    `;
    const segments = WatchPageTranscriptFetcher.parseTimedtextPayload(xml);
    assert.equal(segments.length, 1);
    assert.equal(segments[0].text, "Hello & World 'test'");
  });

  it('handles watch page without captions block gracefully without throwing', async () => {
    const mockHtmlNoCaptions = `
      <html>
        <head><title>Music Instrumental - YouTube</title></head>
        <body>
          <script>
            ytInitialPlayerResponse = {
              "videoDetails": { "title": "Instrumental Beats" }
            };
          </script>
        </body>
      </html>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      text: async () => mockHtmlNoCaptions
    }));

    try {
      const res = await WatchPageTranscriptFetcher.fetchTranscript('noCaps123');
      assert.equal(res.success, false);
      assert.equal(res.error, 'No caption tracks found');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('handles HTTP error on watch page fetch gracefully', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => ({
      ok: false,
      status: 404
    }));

    try {
      const res = await WatchPageTranscriptFetcher.fetchTranscript('errVid');
      assert.equal(res.success, false);
      assert.equal(res.error, 'HTTP 404');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('rejects invalid or null videoId immediately', async () => {
    const nullRes = await WatchPageTranscriptFetcher.fetchTranscript(null);
    assert.equal(nullRes.success, false);
    assert.equal(nullRes.error, 'No videoId provided');

    const emptyRes = await WatchPageTranscriptFetcher.fetchTranscript('');
    assert.equal(emptyRes.success, false);
    assert.equal(emptyRes.error, 'No videoId provided');
  });
});
