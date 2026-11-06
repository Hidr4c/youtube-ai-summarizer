import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ChannelIntelligenceManager } from '../src/content/services/ChannelIntelligenceManager.js';
import { ChannelIntelligenceFetcher } from '../src/background/ChannelIntelligenceFetcher.js';
import { AgentToolRegistry } from '../src/content/services/AgentToolRegistry.js';

describe('ChannelIntelligenceManager - Intent Detection & Caching', () => {
  it('detects explicit creator handle in prompt', () => {
    const manager = new ChannelIntelligenceManager();
    const result = manager.detectChannelIntent('Que raconte @JulienChieze sur sa chaîne ?');
    assert.equal(result.isChannelIntent, true);
    assert.equal(result.query, '@JulienChieze');
    assert.equal(result.targetCreator, '@JulienChieze');
  });

  it('detects French channel analysis request with named creator', () => {
    const manager = new ChannelIntelligenceManager();
    const result = manager.detectChannelIntent(
      'Peux-tu analyser la chaîne de Julien Chièze ? Est-il objectif ?',
      'Julien Chièze'
    );
    assert.equal(result.isChannelIntent, true);
    assert.ok(result.query.toLowerCase().includes('julien chièze'));
  });

  it('detects English channel analysis request', () => {
    const manager = new ChannelIntelligenceManager();
    const result = manager.detectChannelIntent(
      'Please analyze the channel of Marques Brownlee and summarize recent videos'
    );
    assert.equal(result.isChannelIntent, true);
    assert.ok(result.query.toLowerCase().includes('marques brownlee'));
  });

  it('detects creator inquiry on active video without mentioning channel word explicitly', () => {
    const manager = new ChannelIntelligenceManager();
    const result = manager.detectChannelIntent(
      'Est-ce que Julien Chièze est sponsorisé et quel est son parcours ?',
      'Julien Chièze',
      '/@julienchieze'
    );
    assert.equal(result.isChannelIntent, true);
    assert.equal(result.query, '/@julienchieze');
  });

  it('ignores standard video questions that do not ask about the channel or creator', () => {
    const manager = new ChannelIntelligenceManager();
    const result = manager.detectChannelIntent(
      'Quels sont les trois points clés mentionnés à 05:20 ?',
      'Julien Chièze'
    );
    assert.equal(result.isChannelIntent, false);
    assert.equal(result.query, '');
  });

  it('caches retrieved dossiers and returns cached instance on repeat calls', async () => {
    const manager = new ChannelIntelligenceManager();
    manager.cachedDossiers.set('@julienchieze', {
      title: 'Julien Chièze',
      handle: '@julienchieze',
      subscribers: '974 k abonnés',
      markdownDossier: '### DOSSIER OFFICIEL'
    });

    const res = await manager.getOrFetchChannelDossier('@julienchieze');
    assert.equal(res.success, true);
    assert.equal(res.channel.title, 'Julien Chièze');
    assert.equal(res.channel.subscribers, '974 k abonnés');
  });
});

describe('ChannelIntelligenceFetcher - Data Parsing & Formatting', () => {
  it('parses ytInitialData into structured channel dossier with recent videos', () => {
    const mockData = {
      header: {
        pageHeaderRenderer: {
          pageTitle: 'Julien Chièze',
          content: {
            pageHeaderViewModel: {
              metadata: {
                contentMetadataViewModel: {
                  metadataRows: [
                    { metadataParts: [{ text: { content: '@julienchieze' } }] },
                    { metadataParts: [{ text: { content: '974 k abonnés' } }, { text: { content: '7,6 k vidéos' } }] }
                  ]
                }
              },
              description: {
                descriptionPreviewViewModel: {
                  description: { content: 'Bienvenue sur la chaîne gaming et tech.' }
                }
              }
            }
          }
        }
      },
      contents: {
        twoColumnBrowseResultsRenderer: {
          tabs: [
            {},
            {
              tabRenderer: {
                content: {
                  richGridRenderer: {
                    contents: [
                      {
                        richItemRenderer: {
                          content: {
                            lockupViewModel: {
                              contentId: 'abc12345678',
                              metadata: {
                                lockupMetadataViewModel: {
                                  title: { content: 'Zelda Ocarina of Time Test' },
                                  metadata: {
                                    contentMetadataViewModel: {
                                      metadataRows: [
                                        { metadataParts: [{ text: { content: 'il y a 1 jour' } }, { text: { content: '120 k vues' } }] }
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
                  }
                }
              }
            }
          ]
        }
      }
    };

    const dossier = ChannelIntelligenceFetcher.parseChannelData(mockData, '/@julienchieze', 10);
    assert.equal(dossier.title, 'Julien Chièze');
    assert.equal(dossier.handle, '@julienchieze');
    assert.equal(dossier.subscribers, '974 k abonnés');
    assert.equal(dossier.videoCount, '7,6 k vidéos');
    assert.equal(dossier.recentVideos.length, 1);
    assert.equal(dossier.recentVideos[0].id, 'abc12345678');
    assert.equal(dossier.recentVideos[0].title, 'Zelda Ocarina of Time Test');
    assert.ok(dossier.markdownDossier.includes('DOSSIER OFFICIEL'));
    assert.ok(dossier.markdownDossier.includes('Zelda Ocarina of Time Test'));
  });
});

describe('AgentToolRegistry - Function Calling Definitions', () => {
  it('provides fetch_channel_dossier and fetch_video_transcript schemas', () => {
    const tools = AgentToolRegistry.getTools('fr');
    assert.ok(tools.length >= 2);
    const names = tools.map(t => t.function.name);
    assert.ok(names.includes('fetch_channel_dossier'));
    assert.ok(names.includes('fetch_video_transcript'));
    assert.ok(names.includes('fetch_video_comments'));
  });

  it('provides bilingual agent system directives', () => {
    const dirFr = AgentToolRegistry.getAgentSystemDirective('fr');
    const dirEn = AgentToolRegistry.getAgentSystemDirective('en');
    assert.ok(dirFr.includes('DOSSIERS DE CHAÎNE'));
    assert.ok(dirEn.includes('CHANNEL INTELLIGENCE'));
  });
});
