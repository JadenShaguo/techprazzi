#!/usr/bin/env node

// ============================================================================
// TechPrazzi — Prepare Digest
// ============================================================================
// Gathers everything the LLM needs to produce a digest:
// - Fetches the central feeds (tweets + podcasts)
// - Fetches the latest prompts from GitHub
// - Reads the user's config (language, delivery method)
// - Outputs a single JSON blob to stdout
//
// The LLM's ONLY job is to read this JSON, remix the content, and output
// the digest text. Everything else is handled here deterministically.
//
// Usage: node prepare-digest.js
// Output: JSON to stdout
// ============================================================================

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { pathToFileURL } from 'url';

// -- Constants ---------------------------------------------------------------

const USER_DIR = join(homedir(), '.techprazzi');
const CONFIG_PATH = join(USER_DIR, 'config.json');

const FEED_X_URL = 'https://raw.githubusercontent.com/JadenShaguo/techprazzi/main/feed-x.json';
const FEED_PODCASTS_URL = 'https://raw.githubusercontent.com/JadenShaguo/techprazzi/main/feed-podcasts.json';
const FEED_BLOGS_URL = 'https://raw.githubusercontent.com/JadenShaguo/techprazzi/main/feed-blogs.json';

const PROMPTS_BASE = 'https://raw.githubusercontent.com/JadenShaguo/techprazzi/main/prompts';
const PROMPT_FILES = [
  'summarize-podcast.md',
  'summarize-tweets.md',
  'summarize-blogs.md',
  'digest-intro.md',
  'translate.md'
];
const FETCH_TIMEOUT_MS = 10000;
const DEFAULT_INTERESTS = [
  'ai',
  'agents',
  'developer-tools',
  'infrastructure',
  'research',
  'product',
  'startups'
];

const INTEREST_KEYWORDS = {
  ai: ['ai', 'llm', 'model', 'models', 'claude', 'openai', 'anthropic', 'gemini', 'gpt'],
  agents: ['agent', 'agents', 'tool use', 'workflow', 'automation', 'autonomous'],
  'developer-tools': ['developer', 'coding', 'code', 'sdk', 'api', 'ide', 'github', 'devtools'],
  infrastructure: ['infra', 'infrastructure', 'gpu', 'latency', 'scaling', 'database', 'compute', 'serving'],
  research: ['research', 'paper', 'benchmark', 'eval', 'evaluation', 'experiment', 'study'],
  product: ['launch', 'released', 'shipping', 'feature', 'product', 'beta', 'available'],
  startups: ['startup', 'founder', 'funding', 'seed', 'series', 'business', 'customer']
};

const SIGNAL_RULES = [
  {
    tag: 'launch',
    weight: 18,
    reason: 'product launch or feature release',
    keywords: ['launch', 'launched', 'release', 'released', 'shipping', 'shipped', 'available', 'beta', 'preview']
  },
  {
    tag: 'technical-depth',
    weight: 16,
    reason: 'technical implementation detail',
    keywords: ['architecture', 'benchmark', 'latency', 'scaling', 'eval', 'evaluation', 'fine-tuning', 'inference', 'api', 'sdk']
  },
  {
    tag: 'agent-signal',
    weight: 14,
    reason: 'agent or workflow signal',
    keywords: ['agent', 'agents', 'tool use', 'workflow', 'automation', 'mcp']
  },
  {
    tag: 'research',
    weight: 14,
    reason: 'research or benchmark signal',
    keywords: ['paper', 'research', 'benchmark', 'study', 'experiment', 'model card', 'dataset']
  },
  {
    tag: 'market-signal',
    weight: 10,
    reason: 'market, company, or adoption signal',
    keywords: ['customer', 'enterprise', 'revenue', 'pricing', 'funding', 'acquired', 'partnership', 'adoption']
  },
  {
    tag: 'contrarian',
    weight: 8,
    reason: 'opinionated or contrarian take',
    keywords: ['contrarian', 'wrong', 'myth', 'prediction', 'predict', 'future', 'trend', 'hot take']
  }
];

// -- Fetch helpers -----------------------------------------------------------

async function fetchJSON(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchText(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

async function readLocalJSON(path) {
  try {
    return JSON.parse(await readFile(path, 'utf-8'));
  } catch {
    return null;
  }
}

// -- Signal scoring ----------------------------------------------------------

function normalizeConfig(config = {}) {
  const interests = Array.isArray(config.interests) && config.interests.length > 0
    ? config.interests
    : DEFAULT_INTERESTS;

  const summaryDepth = ['brief', 'standard', 'deep'].includes(config.summaryDepth)
    ? config.summaryDepth
    : 'standard';

  const maxItemsPerSection = Number.isInteger(config.maxItemsPerSection)
    ? Math.min(Math.max(config.maxItemsPerSection, 1), 50)
    : 12;

  return {
    language: config.language || 'en',
    frequency: config.frequency || 'daily',
    delivery: config.delivery || { method: 'stdout' },
    interests: [...new Set(interests.map((item) => String(item).toLowerCase().trim()).filter(Boolean))],
    summaryDepth,
    maxItemsPerSection
  };
}

function buildSignalProfile(config = {}) {
  const normalized = normalizeConfig(config);
  const interests = normalized.interests.length > 0 ? normalized.interests : DEFAULT_INTERESTS;
  const interestKeywords = {};

  for (const interest of interests) {
    interestKeywords[interest] = INTEREST_KEYWORDS[interest] || [interest];
  }

  return { interests, interestKeywords };
}

function countKeywordMatches(text, keywords) {
  const normalized = ` ${text.toLowerCase()} `;
  return keywords.filter((keyword) => normalized.includes(keyword.toLowerCase())).length;
}

function metricBoost(metrics = {}) {
  const likes = Number(metrics.likes ?? metrics.like_count ?? 0);
  const retweets = Number(metrics.retweets ?? metrics.retweet_count ?? 0);
  const replies = Number(metrics.replies ?? metrics.reply_count ?? 0);
  return Math.min(18, Math.round(Math.log10(likes + 1) * 5 + Math.log10(retweets + replies + 1) * 4));
}

function recencyBoost(dateString) {
  if (!dateString) return 0;
  const timestamp = new Date(dateString).getTime();
  if (Number.isNaN(timestamp)) return 0;
  const ageHours = (Date.now() - timestamp) / (1000 * 60 * 60);
  if (ageHours <= 24) return 8;
  if (ageHours <= 72) return 5;
  if (ageHours <= 168) return 2;
  return 0;
}

function scoreSignal({ text = '', title = '', source = 'x', metrics = {}, publishedAt = null }, signalProfile = buildSignalProfile()) {
  const combinedText = `${title}\n${text}`.trim();
  const tags = [];
  const reasons = [];
  const matchedInterests = [];
  let score = source === 'blog' ? 34 : source === 'podcast' ? 30 : 24;

  for (const rule of SIGNAL_RULES) {
    const matches = countKeywordMatches(combinedText, rule.keywords);
    if (matches > 0) {
      tags.push(rule.tag);
      reasons.push(rule.reason);
      score += rule.weight + Math.min(matches - 1, 3) * 2;
    }
  }

  for (const [interest, keywords] of Object.entries(signalProfile.interestKeywords || {})) {
    if (countKeywordMatches(combinedText, keywords) > 0) {
      matchedInterests.push(interest);
    }
  }
  score += Math.min(12, matchedInterests.length * 4);

  if (combinedText.length > 500) score += 4;
  if (combinedText.length > 1500) score += 4;
  score += metricBoost(metrics);
  score += recencyBoost(publishedAt);

  const uniqueTags = [...new Set(tags)];
  return {
    score: Math.min(100, Math.max(0, Math.round(score))),
    tags: uniqueTags.length > 0 ? uniqueTags : ['general-signal'],
    reasons: [...new Set(reasons)].slice(0, 4),
    matchedInterests: [...new Set(matchedInterests)]
  };
}

function mergeTags(items) {
  return [...new Set(items.flatMap((item) => item.signal?.tags || item.signalTags || []))];
}

function enrichDigestContent({ x = [], blogs = [], podcasts = [] }, config = {}) {
  const normalizedConfig = normalizeConfig(config);
  const signalProfile = buildSignalProfile(normalizedConfig);
  const limit = normalizedConfig.maxItemsPerSection;

  const enrichedX = x
    .map((account) => {
      const tweets = (account.tweets || [])
        .map((tweet) => ({
          ...tweet,
          signal: scoreSignal({
            text: tweet.text || '',
            source: 'x',
            metrics: tweet,
            publishedAt: tweet.createdAt
          }, signalProfile)
        }))
        .sort((a, b) => b.signal.score - a.signal.score);

      const topScore = tweets.reduce((max, tweet) => Math.max(max, tweet.signal.score), 0);
      return {
        ...account,
        tweets,
        signalScore: topScore,
        signalTags: mergeTags(tweets).slice(0, 6)
      };
    })
    .filter((account) => account.tweets.length > 0)
    .sort((a, b) => b.signalScore - a.signalScore)
    .slice(0, limit);

  const enrichedBlogs = blogs
    .map((blog) => ({
      ...blog,
      signal: scoreSignal({
        title: blog.title || '',
        text: `${blog.description || ''}\n${(blog.content || '').slice(0, 5000)}`,
        source: 'blog',
        publishedAt: blog.publishedAt
      }, signalProfile)
    }))
    .sort((a, b) => b.signal.score - a.signal.score)
    .slice(0, limit);

  const enrichedPodcasts = podcasts
    .map((podcast) => ({
      ...podcast,
      signal: scoreSignal({
        title: podcast.title || '',
        text: (podcast.transcript || '').slice(0, 5000),
        source: 'podcast',
        publishedAt: podcast.publishedAt
      }, signalProfile)
    }))
    .sort((a, b) => b.signal.score - a.signal.score)
    .slice(0, limit);

  return {
    x: enrichedX,
    blogs: enrichedBlogs,
    podcasts: enrichedPodcasts,
    signalRadar: buildSignalRadar({ x: enrichedX, blogs: enrichedBlogs, podcasts: enrichedPodcasts }, signalProfile)
  };
}

function buildSignalRadar({ x = [], blogs = [], podcasts = [] }, signalProfile = buildSignalProfile()) {
  const signals = [];

  for (const account of x) {
    for (const tweet of account.tweets || []) {
      signals.push({
        source: 'x',
        title: `${account.name}: ${(tweet.text || '').slice(0, 120)}`,
        author: account.name,
        url: tweet.url,
        score: tweet.signal.score,
        tags: tweet.signal.tags,
        matchedInterests: tweet.signal.matchedInterests,
        why: tweet.signal.reasons[0] || 'high-signal public post'
      });
    }
  }

  for (const blog of blogs) {
    signals.push({
      source: 'blog',
      title: `${blog.name}: ${blog.title}`,
      author: blog.author || blog.name,
      url: blog.url,
      score: blog.signal.score,
      tags: blog.signal.tags,
      matchedInterests: blog.signal.matchedInterests,
      why: blog.signal.reasons[0] || 'company blog signal'
    });
  }

  for (const podcast of podcasts) {
    signals.push({
      source: 'podcast',
      title: `${podcast.name}: ${podcast.title}`,
      author: podcast.name,
      url: podcast.url,
      score: podcast.signal.score,
      tags: podcast.signal.tags,
      matchedInterests: podcast.signal.matchedInterests,
      why: podcast.signal.reasons[0] || 'long-form discussion signal'
    });
  }

  const topSignals = signals
    .filter((signal) => signal.url)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const tagCounts = {};
  for (const signal of topSignals) {
    for (const tag of signal.tags || []) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  return {
    slogan: 'Hunt every tech signal.',
    interests: signalProfile.interests,
    topSignals,
    tagCounts
  };
}

// -- Main --------------------------------------------------------------------

async function main() {
  const errors = [];
  const scriptDir = decodeURIComponent(new URL('.', import.meta.url).pathname);

  // 1. Read user config
  let rawConfig = {
    language: 'en',
    frequency: 'daily',
    delivery: { method: 'stdout' }
  };
  if (existsSync(CONFIG_PATH)) {
    try {
      rawConfig = JSON.parse(await readFile(CONFIG_PATH, 'utf-8'));
    } catch (err) {
      errors.push(`Could not read config: ${err.message}`);
    }
  }
  const config = normalizeConfig(rawConfig);

  // 2. Fetch all three feeds
  const [remoteFeedX, remoteFeedPodcasts, remoteFeedBlogs] = await Promise.all([
    fetchJSON(FEED_X_URL),
    fetchJSON(FEED_PODCASTS_URL),
    fetchJSON(FEED_BLOGS_URL)
  ]);

  const [localFeedX, localFeedPodcasts, localFeedBlogs] = await Promise.all([
    readLocalJSON(join(scriptDir, '..', 'feed-x.json')),
    readLocalJSON(join(scriptDir, '..', 'feed-podcasts.json')),
    readLocalJSON(join(scriptDir, '..', 'feed-blogs.json'))
  ]);

  const feedX = remoteFeedX || localFeedX;
  const feedPodcasts = remoteFeedPodcasts || localFeedPodcasts;
  const feedBlogs = remoteFeedBlogs || localFeedBlogs;

  if (!feedX) errors.push('Could not fetch tweet feed');
  if (!feedPodcasts) errors.push('Could not fetch podcast feed');
  if (!feedBlogs) errors.push('Could not fetch blog feed');
  if (feedX?.errors?.length) {
    errors.push(
      ...feedX.errors.map((error) => `Tweet feed problem: ${error}`)
    );
  }
  if (feedPodcasts?.errors?.length) {
    errors.push(
      ...feedPodcasts.errors.map((error) => `Podcast feed problem: ${error}`)
    );
  }
  if (feedBlogs?.errors?.length) {
    errors.push(
      ...feedBlogs.errors.map((error) => `Blog feed problem: ${error}`)
    );
  }

  // 3. Load prompts with priority: user custom > remote (GitHub) > local default
  //
  // If the user has a custom prompt at ~/.techprazzi/prompts/<file>,
  // use that (they personalized it — don't overwrite with remote updates).
  // Otherwise, fetch the latest from GitHub so they get central improvements.
  // If GitHub is unreachable, fall back to the local copy shipped with the skill.
  const prompts = {};
  const localPromptsDir = join(scriptDir, '..', 'prompts');
  const userPromptsDir = join(USER_DIR, 'prompts');

  for (const filename of PROMPT_FILES) {
    const key = filename.replace('.md', '').replace(/-/g, '_');
    const userPath = join(userPromptsDir, filename);
    const localPath = join(localPromptsDir, filename);

    // Priority 1: user's custom prompt (they personalized it)
    if (existsSync(userPath)) {
      prompts[key] = await readFile(userPath, 'utf-8');
      continue;
    }

    // Priority 2: latest from GitHub (central updates)
    const remote = await fetchText(`${PROMPTS_BASE}/${filename}`);
    if (remote) {
      prompts[key] = remote;
      continue;
    }

    // Priority 3: local copy shipped with the skill
    if (existsSync(localPath)) {
      prompts[key] = await readFile(localPath, 'utf-8');
    } else {
      errors.push(`Could not load prompt: ${filename}`);
    }
  }

  // 4. Score and sort signals before handing them to the LLM.
  const enriched = enrichDigestContent({
    podcasts: feedPodcasts?.podcasts || [],
    x: feedX?.x || [],
    blogs: feedBlogs?.blogs || []
  }, config);

  // 5. Build the output — everything the LLM needs in one blob
  const output = {
    status: 'ok',
    generatedAt: new Date().toISOString(),

    // User preferences
    config,

    // Content to remix, already scored and sorted by TechPrazzi signal strength
    podcasts: enriched.podcasts,
    x: enriched.x,
    blogs: enriched.blogs,
    signalRadar: enriched.signalRadar,

    // Stats for the LLM to reference
    stats: {
      podcastEpisodes: enriched.podcasts.length,
      xBuilders: enriched.x.length,
      totalTweets: enriched.x.reduce((sum, a) => sum + a.tweets.length, 0),
      blogPosts: enriched.blogs.length,
      topSignalScore: enriched.signalRadar.topSignals[0]?.score || 0,
      topSignalCount: enriched.signalRadar.topSignals.length,
      feedGeneratedAt: feedX?.generatedAt || feedPodcasts?.generatedAt || feedBlogs?.generatedAt || null
    },

    // Prompts — the LLM reads these and follows the instructions
    prompts,

    // Non-fatal errors
    errors: errors.length > 0 ? errors : undefined
  };

  console.log(JSON.stringify(output, null, 2));
}

export {
  DEFAULT_INTERESTS,
  buildSignalProfile,
  enrichDigestContent,
  normalizeConfig,
  scoreSignal
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(JSON.stringify({
      status: 'error',
      message: err.message
    }));
    process.exit(1);
  });
}
