import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { VideoDossierFetcher } from '../src/background/VideoDossierFetcher.js';
import { VideoCommentsFetcher } from '../src/background/VideoCommentsFetcher.js';

describe('VideoDossierFetcher - Rich Video Dossier Aggregation', () => {
  it('extracts complete dossier with metadata, description, chapters and captions from HTML', async () => {
    const mockHtml = `
      <html>
        <head><title>Test Video Title - YouTube</title></head>
        <body>
          <script>
            var dummy = 1;
            "shortDescription":"Intro line\\n0:00 - Introduction\\n01:30 Sponso NordVPN\\n05:45 Conclusion\\nCheck out https://nordvpn.com",
            "captionTracks":[{"baseUrl":"https://yt.com/timedtext?v=123"}]
          </script>
        </body>
      </html>
    `;

    const originalFetch = globalThis.fetch;
    const originalFetchComments = VideoCommentsFetcher.fetchVideoComments;

    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      text: async () => mockHtml
    }));

    VideoCommentsFetcher.fetchVideoComments = mock.fn(async () => ({
      success: true,
      comments: [
        { author: '@userA', text: 'Great explanation on security', likes: '124' },
        { author: '@userB', text: 'Thanks for the sponsor disclosure', likes: '45' }
      ]
    }));

    try {
      const dossier = await VideoDossierFetcher.fetchDossier('testVid123', 'fr');

      assert.ok(dossier, 'Dossier should be returned');
      assert.equal(dossier.videoId, 'testVid123');
      assert.equal(dossier.title, 'Test Video Title');
      assert.ok(dossier.description.includes('Check out https://nordvpn.com'));
      assert.equal(dossier.hasCaptions, true);
      assert.equal(dossier.chapters.length, 3);
      assert.equal(dossier.chapters[0], '[0:00] Introduction');
      assert.equal(dossier.chapters[1], '[01:30] Sponso NordVPN');

      // Comments integration
      assert.equal(dossier.comments.length, 2);
      assert.equal(dossier.comments[0].author, '@userA');
      assert.equal(dossier.comments[0].likes, '124');
    } finally {
      globalThis.fetch = originalFetch;
      VideoCommentsFetcher.fetchVideoComments = originalFetchComments;
    }
  });

  it('handles network error or invalid video gracefully', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => ({
      ok: false,
      status: 404
    }));

    try {
      const result = await VideoDossierFetcher.fetchDossier('invalidId');
      assert.equal(result, null);

      const nullResult = await VideoDossierFetcher.fetchDossier(null);
      assert.equal(nullResult, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('fetches multiple video dossiers in parallel with concurrency pooling', async () => {
    const originalFetchDossier = VideoDossierFetcher.fetchDossier;
    VideoDossierFetcher.fetchDossier = mock.fn(async (id) => ({
      videoId: id,
      title: `Title ${id}`,
      chapters: ['[0:00] Intro'],
      hasCaptions: true,
      comments: [{ author: 'User', text: 'Nice' }]
    }));

    try {
      const ids = ['v1', 'v2', 'v3', 'v4', 'v5'];
      const batchMap = await VideoDossierFetcher.fetchDossiersBatch(ids, 'fr', 2);

      assert.equal(batchMap.size, 5);
      assert.equal(batchMap.get('v1').title, 'Title v1');
      assert.equal(batchMap.get('v5').title, 'Title v5');

      // Empty batch
      const emptyMap = await VideoDossierFetcher.fetchDossiersBatch([]);
      assert.equal(emptyMap.size, 0);
    } finally {
      VideoDossierFetcher.fetchDossier = originalFetchDossier;
    }
  });
});
