import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSignalProfile,
  enrichDigestContent,
  normalizeConfig,
  scoreSignal
} from '../prepare-digest.js';

test('normalizeConfig keeps safe defaults and clamps item limits', () => {
  const config = normalizeConfig({
    interests: ['Agents', 'agents', ' Infrastructure '],
    summaryDepth: 'deep',
    maxItemsPerSection: 500
  });

  assert.deepEqual(config.interests, ['agents', 'infrastructure']);
  assert.equal(config.summaryDepth, 'deep');
  assert.equal(config.maxItemsPerSection, 50);
  assert.deepEqual(config.delivery, { method: 'stdout' });
});

test('scoreSignal rewards product launches and matched interests', () => {
  const profile = buildSignalProfile({ interests: ['agents', 'developer-tools'] });
  const launch = scoreSignal({
    title: 'New agent SDK launch',
    text: 'We shipped a developer API for agent workflows with benchmark results.',
    source: 'x',
    metrics: { likes: 500, retweets: 80, replies: 25 },
    publishedAt: new Date().toISOString()
  }, profile);
  const casual = scoreSignal({
    text: 'Great event today, thanks everyone!',
    source: 'x',
    metrics: { likes: 5 }
  }, profile);

  assert.ok(launch.score > casual.score);
  assert.ok(launch.tags.includes('launch'));
  assert.ok(launch.tags.includes('agent-signal'));
  assert.ok(launch.matchedInterests.includes('agents'));
});

test('enrichDigestContent sorts content by signal strength and builds radar', () => {
  const enriched = enrichDigestContent({
    x: [
      {
        name: 'Builder A',
        handle: 'a',
        tweets: [
          {
            text: 'Lunch was good.',
            url: 'https://x.com/a/status/1',
            likes: 1
          }
        ]
      },
      {
        name: 'Builder B',
        handle: 'b',
        tweets: [
          {
            text: 'We launched a new agent API with eval benchmarks for developer workflows.',
            url: 'https://x.com/b/status/2',
            likes: 300,
            retweets: 40
          }
        ]
      }
    ],
    blogs: [
      {
        name: 'Company Blog',
        title: 'New inference scaling benchmark',
        url: 'https://example.com/blog',
        content: 'This post explains latency, serving architecture, API changes, and benchmark results.'
      }
    ],
    podcasts: []
  }, {
    interests: ['agents', 'infrastructure'],
    maxItemsPerSection: 10
  });

  assert.equal(enriched.x[0].name, 'Builder B');
  assert.ok(enriched.blogs[0].signal.tags.includes('technical-depth'));
  assert.ok(enriched.signalRadar.topSignals.length >= 2);
  assert.equal(enriched.signalRadar.slogan, 'Hunt every tech signal.');
});
