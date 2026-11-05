import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { VideoCommentsManager } from '../src/content/services/VideoCommentsManager.js';
import { VideoCommentsFetcher } from '../src/background/VideoCommentsFetcher.js';

describe('VideoCommentsManager - Intent Detection & Caching', () => {
  let manager;

  beforeEach(() => {
    manager = new VideoCommentsManager();
  });

  it('detects French comments intent in user prompts', () => {
    assert.equal(manager.detectCommentsIntent('Que disent les commentaires ?'), true);
    assert.equal(manager.detectCommentsIntent("Quel est l'avis du public sous cette vidéo ?"), true);
    assert.equal(manager.detectCommentsIntent('Qu’en pensent les gens ?'), true);
    assert.equal(manager.detectCommentsIntent('Qu’en dit la communauté ?'), true);
    assert.equal(manager.detectCommentsIntent('Y a-t-il des critiques dans les commentaires ?'), true);
  });

  it('detects English comments intent in user prompts', () => {
    assert.equal(manager.detectCommentsIntent('What do people think about this remake?'), true);
    assert.equal(manager.detectCommentsIntent('Show me video comments feedback'), true);
    assert.equal(manager.detectCommentsIntent('What is the community feedback?'), true);
  });

  it('ignores standard video inquiries without comments intent', () => {
    assert.equal(manager.detectCommentsIntent('Peux-tu me résumer la vidéo en 3 points ?'), false);
    assert.equal(manager.detectCommentsIntent('Quel est le score de ce benchmark ?'), false);
    assert.equal(manager.detectCommentsIntent(''), false);
  });

  it('caches comments and returns cached copy on subsequent requests', async () => {
    let callCount = 0;
    global.chrome = {
      runtime: {
        sendMessage: (msg, callback) => {
          callCount++;
          callback({
            success: true,
            comments: [{ author: 'User1', text: 'Superbe vidéo !', likes: '12', time: '1j' }],
            markdownDossier: '### [Avis du Public]'
          });
        }
      }
    };

    const res1 = await manager.getOrFetchComments('TEST_VID_001');
    assert.equal(res1.success, true);
    assert.equal(callCount, 1);

    const res2 = await manager.getOrFetchComments('TEST_VID_001');
    assert.equal(res2.success, true);
    assert.equal(callCount, 1, 'Subsequent call must return cached data without re-fetching');
  });
});

describe('VideoCommentsFetcher - Parser & Formatter', () => {
  it('extracts comments continuation token from ytInitialData', () => {
    const mockYtData = {
      contents: {
        twoColumnWatchNextResults: {
          results: {
            results: {
              contents: [
                {
                  itemSectionRenderer: {
                    sectionIdentifier: 'comment-item-section',
                    contents: [
                      {
                        continuationItemRenderer: {
                          continuationEndpoint: {
                            continuationCommand: {
                              token: 'MOCK_CONTINUATION_TOKEN_XYZ'
                            }
                          }
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

    const token = VideoCommentsFetcher.extractCommentsContinuationToken(mockYtData);
    assert.equal(token, 'MOCK_CONTINUATION_TOKEN_XYZ');
  });

  it('returns null if continuation token is missing or disabled', () => {
    const mockYtData = { contents: {} };
    const token = VideoCommentsFetcher.extractCommentsContinuationToken(mockYtData);
    assert.equal(token, null);
  });

  it('formats extracted comments into structured Markdown dossier', () => {
    const mockComments = [
      { author: '@GamerPro', text: 'Graphismes incroyables mais un peu trop cher.', likes: '142', time: 'il y a 2 jours' },
      { author: '@NostalgicFan', text: 'Fidèle au chef-d’œuvre d’époque !', likes: '89', time: 'il y a 1 jour' }
    ];

    const markdown = VideoCommentsFetcher.formatCommentsMarkdown(mockComments, 'TEST_VID');
    assert.ok(markdown.includes('[Avis du Public]'));
    assert.ok(markdown.includes('@GamerPro'));
    assert.ok(markdown.includes('142 likes'));
    assert.ok(markdown.includes('@NostalgicFan'));
  });

  it('formats empty comments gracefully', () => {
    const emptyMarkdown = VideoCommentsFetcher.formatCommentsMarkdown([], 'TEST_VID');
    assert.ok(emptyMarkdown.includes('Aucun commentaire'));
  });
});
