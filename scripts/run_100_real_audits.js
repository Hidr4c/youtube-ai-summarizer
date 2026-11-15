import http from 'http';
import fs from 'fs';
import { AuditPromptBuilder } from '../src/services/implementations/AuditPromptBuilder.js';

const SERVER_URL = process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234';
const MODEL = 'qwen/qwen3.5-9b';
const CONCURRENCY = 4; // Matching LM Studio's RTX 5090 parallel setting

const dataset = JSON.parse(fs.readFileSync('scripts/dataset_100_videos.json', 'utf8'));
console.log(`Loaded ${dataset.length} video dossiers for real audit execution on LM Studio...`);

async function queryLMStudio(systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 2200,
      reasoning_effort: 'none'
    });

    const parsedUrl = new URL(SERVER_URL);
    const req = http.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 1234,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          const choice = parsed.choices?.[0];
          const content = choice?.message?.content || '';
          resolve(content);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function parseScore(content) {
  const match = content.match(/\[SCORE:\s*(\d{1,3})\/100\]/i)
    || content.match(/score\s*(?:de solidit[eé]|global)?\s*:\s*(\d{1,3})\/100/i)
    || content.match(/(\d{1,3})\/100/);
  return match ? parseInt(match[1], 10) : null;
}

async function runWorker(queue, results, progressTracker) {
  while (queue.length > 0) {
    const item = queue.shift();
    const systemPrompt = AuditPromptBuilder.buildSystemPrompt('fr') +
      '\nConsigne de concision : Reste direct, percutant et synthétique. Chaque section doit comporter 1 à 2 phrases clés accompagnées des citations requises. Longueur cible totale : environ 350-500 mots.';
    const userPrompt = AuditPromptBuilder.buildAuditUserPrompt({
      transcriptText: item.transcript,
      videoMeta: {
        title: item.title,
        author: item.author,
        description: item.desc
      },
      commentsBlock: item.comments,
      lang: 'fr',
      isDialogue: true
    });

    const start = Date.now();
    try {
      const response = await queryLMStudio(systemPrompt, userPrompt);
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      const score = parseScore(response);

      const auditResult = {
        id: item.id,
        title: item.title,
        author: item.author,
        domain: item.domain,
        expectedCategory: item.expectedCategory,
        expectedIntegrity: item.expectedIntegrity,
        duration: `${duration}s`,
        score,
        responseSnippet: response.slice(0, 300).replace(/\n/g, ' '),
        fullResponse: response
      };

      results.push(auditResult);
      progressTracker.completed++;

      console.log(`[${progressTracker.completed}/${progressTracker.total}] [${duration}s] Score: ${score !== null ? score : 'N/A'}/100 | ${item.domain} | "${item.title.slice(0, 40)}..."`);
      
      // Save incremental checkpoint after every item
      fs.writeFileSync('scripts/real_100_audits_checkpoint.json', JSON.stringify(results, null, 2), 'utf8');
    } catch (err) {
      console.error(`Error auditing ${item.id}:`, err.message);
    }
  }
}

(async () => {
  console.log(`========================================================================`);
  console.log(` BANC D'ESSAI INDUSTRIEL : AUDIT DE 100 VIDÉOS RÉELLES EN DIRECT (LM STUDIO)`);
  console.log(` Modèle : ${MODEL} | Parallélisme : ${CONCURRENCY} | Serveur : ${SERVER_URL}`);
  console.log(`========================================================================\n`);

  const queue = [...dataset];
  const results = [];
  const progressTracker = { completed: 0, total: dataset.length };

  const startAll = Date.now();
  const workers = Array.from({ length: CONCURRENCY }, () => runWorker(queue, results, progressTracker));
  await Promise.all(workers);

  const totalTimeSec = ((Date.now() - startAll) / 1000).toFixed(1);
  console.log(`\n=== 100 AUDITS TERMINÉS EN ${totalTimeSec}s (Moyenne : ${(totalTimeSec / 100).toFixed(1)}s par vidéo) ===`);

  // Compute domain statistics
  const domainStats = {};
  for (const r of results) {
    if (!domainStats[r.domain]) domainStats[r.domain] = { highScores: [], lowScores: [] };
    if (r.expectedIntegrity === 'high' && r.score !== null) {
      domainStats[r.domain].highScores.push(r.score);
    } else if (r.expectedIntegrity === 'low' && r.score !== null) {
      domainStats[r.domain].lowScores.push(r.score);
    }
  }

  const summary = {
    totalAudits: results.length,
    totalDuration: `${totalTimeSec}s`,
    model: MODEL,
    serverUrl: SERVER_URL,
    domainBreakdown: Object.entries(domainStats).map(([dom, stats]) => ({
      domain: dom,
      wholesomeAvgScore: stats.highScores.length ? Math.round(stats.highScores.reduce((a, b) => a + b, 0) / stats.highScores.length) : null,
      predatoryAvgScore: stats.lowScores.length ? Math.round(stats.lowScores.reduce((a, b) => a + b, 0) / stats.lowScores.length) : null
    })),
    audits: results
  };

  fs.writeFileSync('scripts/real_100_audits_final.json', JSON.stringify(summary, null, 2), 'utf8');
  console.log('Saved final results and statistics in scripts/real_100_audits_final.json');
})();
