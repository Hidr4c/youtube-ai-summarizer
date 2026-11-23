import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ChannelPageParser } from '../src/parsers/ChannelPageParser.js';
import { ChannelIntelligenceFetcher } from '../src/background/ChannelIntelligenceFetcher.js';
import { BrowseContinuationFetcher } from '../src/injected/BrowseContinuationFetcher.js';
import { YouTubeDOMContext } from '../src/content/services/YouTubeDOMContext.js';

describe('YouTube Channel Version Compatibility & Creator Studio Fix', () => {
  const origFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = origFetch;
    delete global.window;
    delete global.document;
  });

  it('sanitizes YouTube Studio, subpath, mobile and handle URLs to canonical channel paths', () => {
    assert.equal(
      ChannelPageParser.sanitizeChannelPath('https://studio.youtube.com/channel/UCMAXOMP9uSvKiNXcBO6a9NA/content'),
      '/channel/UCMAXOMP9uSvKiNXcBO6a9NA'
    );
    assert.equal(ChannelPageParser.sanitizeChannelPath('https://www.youtube.com/@Hidr4c/shorts'), '/@Hidr4c');
    assert.equal(ChannelPageParser.sanitizeChannelPath('https://m.youtube.com/channel/UC123/streams'), '/channel/UC123');
    assert.equal(ChannelPageParser.sanitizeChannelPath('/c/CreatorName/about'), '/c/CreatorName');
    assert.equal(ChannelPageParser.sanitizeChannelPath('@CreatorHandle'), '/@CreatorHandle');
    assert.equal(ChannelPageParser.sanitizeChannelPath('https://www.youtube.com/watch?v=iocBpUjy1c8'), '');
    assert.equal(ChannelPageParser.sanitizeChannelPath('https://example.com/channel/UC123'), '');
  });

  it('ignores Creator Studio links in watch DOM and prefers public owner selectors or Main World channelUrl fallback', () => {
    const studioLink = {
      getAttribute: (k) => (k === 'href' ? 'https://studio.youtube.com/channel/UCMAXOMP9uSvKiNXcBO6a9NA/content' : null),
      textContent: 'Manage videos'
    };
    const publicOwnerLink = {
      getAttribute: (k) => (k === 'href' ? '/@MyPublicChannel' : null),
      textContent: 'My Public Channel'
    };
    const watchFlexy = {
      querySelector: () => null,
      querySelectorAll: (sel) => {
        if (sel.includes('yt-video-owner-view-model')) return [publicOwnerLink];
        if (sel.includes('ytd-watch-metadata')) return [studioLink];
        return [];
      }
    };

    global.window = { location: { href: 'https://www.youtube.com/watch?v=iocBpUjy1c8', origin: 'https://www.youtube.com', pathname: '/watch', search: '?v=iocBpUjy1c8' } };
    global.document = {
      title: 'Test Video - YouTube',
      querySelector: (sel) => (sel.includes('ytd-watch-flexy') ? watchFlexy : null),
      querySelectorAll: () => []
    };

    const metaWithModernDom = YouTubeDOMContext.getVideoMetadata();
    assert.equal(metaWithModernDom.channelUrl, '/@MyPublicChannel');
    assert.equal(metaWithModernDom.author, 'My Public Channel');

    // Empty/experimental DOM where selectors find nothing: must fall back cleanly to Main World channelId/channelUrl
    watchFlexy.querySelectorAll = (sel) => (sel.includes('ytd-watch-metadata') ? [studioLink] : []);
    const metaWithMainWorldFallback = YouTubeDOMContext.getVideoMetadata({
      videoId: 'iocBpUjy1c8',
      author: 'Own Channel',
      channelId: 'UCMAXOMP9uSvKiNXcBO6a9NA',
      channelUrl: 'https://www.youtube.com/channel/UCMAXOMP9uSvKiNXcBO6a9NA'
    });
    assert.equal(metaWithMainWorldFallback.channelUrl, '/channel/UCMAXOMP9uSvKiNXcBO6a9NA');
    assert.equal(metaWithMainWorldFallback.author, 'Own Channel');

    // Main World verified channelUrl must take priority over stale SSR [itemprop="author"] after SPA navigation
    const staleSsrLink = { getAttribute: (k) => (k === 'href' ? 'https://www.youtube.com/@StaleInitialChannel' : null) };
    global.document.querySelector = (sel) => {
      if (sel.includes('ytd-watch-flexy')) return watchFlexy;
      if (sel.includes('itemprop="author"')) return staleSsrLink;
      return null;
    };
    const metaBeatsStaleSsr = YouTubeDOMContext.getVideoMetadata({
      videoId: 'iocBpUjy1c8',
      author: 'Fresh MainWorld Creator',
      channelId: 'UC_FRESH_999',
      channelUrl: 'https://www.youtube.com/@FreshMainWorld'
    });
    assert.equal(metaBeatsStaleSsr.channelUrl, '/@FreshMainWorld');
  });

  it('extracts multiline ytInitialData, parses Shorts/legacy renderers, and falls back from empty /videos to /shorts', async () => {
    const htmlWithMultilineAndLegacyShorts = `
      <html><head></head><body><script>var ytInitialData = {
        "header": {
          "c4TabbedHeaderRenderer": {
            "title": "Shorts Creator",
            "subscriberCountText": { "simpleText": "12 k abonnés" },
            "videosCountText": { "simpleText": "42 vidéos" }
          }
        },
        "contents": {
          "twoColumnBrowseResultsRenderer": {
            "tabs": [
              {
                "tabRenderer": {
                  "content": {
                    "richGridRenderer": {
                      "contents": [
                        {
                          "richItemRenderer": {
                            "content": {
                              "shortsLockupViewModel": {
                                "entityId": "shorts-lockup-NzA0ZHG8h-E",
                                "overlayMetadata": {
                                  "primaryText": { "content": "Demo Short Clip" },
                                  "secondaryText": { "content": "4,5 k vues" }
                                },
                                "onTap": { "innertubeCommand": { "reelWatchEndpoint": { "videoId": "NzA0ZHG8h-E" } } }
                              }
                            }
                          }
                        }
                      ]
                    }
                  }
                }
              }
            ]
          }
        }
      };</script></body></html>
    `;
    const emptyVideosHtml = `<html><script>var ytInitialData = {"metadata":{"channelMetadataRenderer":{"title":"Shorts Creator","description":"Bio"}},"contents":{"twoColumnBrowseResultsRenderer":{"tabs":[{"tabRenderer":{"content":{"richGridRenderer":{"contents":[]}}}}]}}};</script></html>`;

    const fetchedUrls = [];
    globalThis.fetch = async (url) => {
      fetchedUrls.push(String(url));
      if (String(url).includes('/videos')) {
        return { ok: true, status: 200, text: async () => emptyVideosHtml };
      }
      return { ok: true, status: 200, text: async () => htmlWithMultilineAndLegacyShorts };
    };

    const res = await ChannelIntelligenceFetcher.fetchChannelDossier('https://studio.youtube.com/channel/UCMAXOMP9uSvKiNXcBO6a9NA/content', 10);
    assert.equal(res.success, true);
    assert.equal(fetchedUrls[0], 'https://www.youtube.com/channel/UCMAXOMP9uSvKiNXcBO6a9NA/videos');
    assert.equal(fetchedUrls[1], 'https://www.youtube.com/channel/UCMAXOMP9uSvKiNXcBO6a9NA/shorts');
    assert.equal(res.channel.recentVideos.length, 1);
    assert.equal(res.channel.recentVideos[0].id, 'NzA0ZHG8h-E');
    assert.equal(res.channel.recentVideos[0].title, 'Demo Short Clip');
  });

  it('supports sectionListRenderer grid items and reelItemRenderer formats', () => {
    const sectionListData = {
      metadata: { channelMetadataRenderer: { title: 'Section Channel', vanityChannelUrl: 'https://www.youtube.com/@SectionChannel' } },
      contents: {
        singleColumnBrowseResultsRenderer: {
          tabs: [{
            tabRenderer: {
              content: {
                sectionListRenderer: {
                  contents: [{
                    itemSectionRenderer: {
                      contents: [{
                        gridRenderer: {
                          items: [{
                            gridVideoRenderer: { videoId: 'GRID_VID_1', title: { simpleText: 'Legacy Grid Video' }, viewCountText: { simpleText: '900 vues' } }
                          }]
                        }
                      }, {
                        reelShelfRenderer: {
                          items: [{
                            reelItemRenderer: { videoId: 'REEL_VID_2', headline: { simpleText: 'Reel Short Video' }, viewCountText: { simpleText: '2 k vues' } }
                          }]
                        }
                      }]
                    }
                  }]
                }
              }
            }
          }]
        }
      }
    };

    const dossier = ChannelIntelligenceFetcher.parseChannelData(sectionListData, '/channel/UC_SEC', 10);
    assert.equal(dossier.title, 'Section Channel');
    assert.equal(dossier.handle, '@SectionChannel');
    assert.equal(dossier.recentVideos.length, 2);
    assert.equal(dossier.recentVideos[0].id, 'GRID_VID_1');
    assert.equal(dossier.recentVideos[1].id, 'REEL_VID_2');
  });

  it('uses credentials:omit in SW fetch, resolves bare UC ids, and falls back to tab pageFetcher on consent.youtube.com redirects', async () => {
    const fetchCalls = [];
    const tabHtml = `<html><script>var ytInitialData = {"header":{"pageHeaderRenderer":{"pageTitle":"Giovanni Helias"}},"metadata":{"channelMetadataRenderer":{"title":"Giovanni Helias","vanityChannelUrl":"https://www.youtube.com/@cosmostyle44"}},"contents":{"twoColumnBrowseResultsRenderer":{"tabs":[{"tabRenderer":{"content":{"richGridRenderer":{"contents":[{"richItemRenderer":{"content":{"videoRenderer":{"videoId":"iocBpUjy1c8","title":{"runs":[{"text":"Paris 11m2"}]},"publishedTimeText":{"simpleText":"il y a 2 semaines"},"viewCountText":{"simpleText":"15 k vues"}}}}}]}}}}]}}};</script></html>`;

    globalThis.fetch = async (url, init) => {
      fetchCalls.push({ url: String(url), credentials: init?.credentials });
      return {
        ok: true,
        status: 200,
        url: 'https://consent.youtube.com/m?continue=https%3A%2F%2Fwww.youtube.com%2F%40cosmostyle44%2Fvideos',
        text: async () => '<html><body>ConsentUi</body></html>'
      };
    };

    const proxyCalls = [];
    const res = await ChannelIntelligenceFetcher.fetchChannelDossier('UCBNuAFaZzNtK7GLCUSnvVWw', 10, {
      pageFetcher: async (url) => {
        proxyCalls.push(String(url));
        return { ok: true, status: 200, url: String(url), html: tabHtml };
      }
    });

    assert.equal(fetchCalls[0].url, 'https://www.youtube.com/channel/UCBNuAFaZzNtK7GLCUSnvVWw/videos');
    assert.equal(fetchCalls[0].credentials, 'omit');
    assert.equal(proxyCalls[0], 'https://www.youtube.com/channel/UCBNuAFaZzNtK7GLCUSnvVWw/videos');
    assert.equal(res.success, true);
    assert.equal(res.channel.title, 'Giovanni Helias');
    assert.equal(res.channel.recentVideos.length, 1);
    assert.equal(res.channel.recentVideos[0].id, 'iocBpUjy1c8');
  });

  it('BrowseContinuationFetcher.fetchPage supports same-origin channel HTML fetches and blocks off-origin URLs', async () => {
    global.window = { location: { origin: 'https://www.youtube.com' } };
    const calls = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), credentials: init?.credentials });
      return {
        ok: true,
        status: 200,
        url: 'https://www.youtube.com/@Micode/videos',
        text: async () => '<html>var ytInitialData = {};</html>'
      };
    };

    const blocked = await BrowseContinuationFetcher.fetchPage({ mode: 'html', url: 'https://evil.example.com/@Micode' });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.status, 400);
    assert.equal(calls.length, 0);

    const okRes = await BrowseContinuationFetcher.fetchPage({ mode: 'html', url: 'https://www.youtube.com/@Micode/videos' });
    assert.equal(okRes.ok, true);
    assert.equal(calls[0].url, 'https://www.youtube.com/@Micode/videos');
    assert.equal(calls[0].credentials, 'include');
    assert.ok(okRes.html.includes('ytInitialData'));
  });

  it('resolveChannelPath scans all search sections and falls back to unfiltered search when sp filter yields no channelRenderer', async () => {
    const urls = [];
    const emptyFiltered = `<html><script>var ytInitialData = {"contents":{"twoColumnSearchResultsRenderer":{"primaryContents":{"sectionListRenderer":{"contents":[{"itemSectionRenderer":{"contents":[]}}]}}}}};</script></html>`;
    const multiSectionUnfiltered = `<html><script>var ytInitialData = {"contents":{"twoColumnSearchResultsRenderer":{"primaryContents":{"sectionListRenderer":{"contents":[{"itemSectionRenderer":{"contents":[{"showingResultsForRenderer":{}}]}},{"itemSectionRenderer":{"contents":[{"channelRenderer":{"channelId":"UC_SECOND_SEC","navigationEndpoint":{"browseEndpoint":{"canonicalBaseUrl":"/@SecondSectionCreator"}}}}]}}]}}}}};</script></html>`;

    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return {
        ok: true,
        status: 200,
        url: String(url),
        text: async () => (String(url).includes('&sp=') ? emptyFiltered : multiSectionUnfiltered)
      };
    };

    const resolved = await ChannelIntelligenceFetcher.resolveChannelPath('Second Section Creator');
    assert.equal(urls.length, 2);
    assert.equal(resolved, '/@SecondSectionCreator');
  });
});
