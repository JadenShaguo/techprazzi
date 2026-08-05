**English** | [中文](README.zh-CN.md)

# TechPrazzi

TechPrazzi is an intelligence tracker for the tech world: tech paparazzi catching
frontier signals across the web. It watches high-signal people, product launches,
official blogs, technical writing, and podcasts, then turns scattered updates into
a digest you can actually read.

**Slogan:** Hunt every tech signal.

**Philosophy:** Be tech paparazzi for useful information: skip the recycled noise,
chase primary sources, original links, product details, and high-signal opinions.

## What You Get

A daily or weekly digest delivered to your preferred messaging app (Telegram, Discord,
WhatsApp, etc.) with:

- Summaries of new podcast episodes from top AI podcasts
- Key posts and insights from 26 curated AI people on X/Twitter
- Full articles from official AI company blogs (Anthropic Engineering, Claude Blog)
- TechPrazzi signal scoring across launches, technical depth, agents, research, and market signals
- Layered output: `TL;DR`, `SIGNAL HUNT`, `Why it matters`, and `WATCH NEXT`
- Links to all original content
- Available in English, Chinese, or bilingual

## Quick Start

1. Install the skill in your agent (OpenClaw or Claude Code)
2. Say "set up TechPrazzi" or invoke `/techprazzi`
3. The agent walks you through setup conversationally — no config files to edit

The agent will ask you:
- How often you want your digest (daily or weekly) and what time
- What language you prefer
- How you want it delivered (Telegram, email, or in-chat)

No API keys needed — all content is fetched centrally.
Your first digest arrives immediately after setup.

## Changing Settings

Your delivery preferences are configurable through conversation. Just tell your agent:

- "Switch to weekly digests on Monday mornings"
- "Change language to Chinese"
- "Make the summaries shorter"
- "Focus on agents and developer tools"
- "Switch summary depth to deep"
- "Show me my current settings"

The source list (people, podcasts, and official blogs) is curated centrally and updates
automatically — you always get the latest sources without doing anything.

## Customizing the Summaries

The skill uses plain-English prompt files to control how content is summarized.
You can customize them two ways:

**Through conversation (recommended):**
Tell your agent what you want — "Make summaries more concise," "Focus on actionable
insights," "Use a more casual tone." The agent updates the prompts for you.

**Direct editing (power users):**
Edit the files in the `prompts/` folder:
- `summarize-podcast.md` — how podcast episodes are summarized
- `summarize-tweets.md` — how X/Twitter posts are summarized
- `summarize-blogs.md` — how blog posts are summarized
- `digest-intro.md` — the overall digest format and tone
- `translate.md` — how English content is translated to Chinese

These are plain English instructions, not code. Changes take effect on the next digest.

## Personal Signal Profile

TechPrazzi ranks signals against your interest profile. Configuration lives in
`~/.techprazzi/config.json`:

```json
{
  "interests": ["agents", "developer-tools", "infrastructure"],
  "summaryDepth": "standard",
  "maxItemsPerSection": 12
}
```

Common interests include `ai`, `agents`, `developer-tools`, `infrastructure`,
`research`, `product`, and `startups`. You can also add your own keywords.

## Default Sources

### Podcasts (6)
- [Latent Space](https://www.youtube.com/@LatentSpacePod)
- [Training Data](https://www.youtube.com/playlist?list=PLOhHNjZItNnMm5tdW61JpnyxeYH5NDDx8)
- [No Priors](https://www.youtube.com/@NoPriorsPodcast)
- [Unsupervised Learning](https://www.youtube.com/@RedpointAI)
- [The MAD Podcast with Matt Turck](https://www.youtube.com/@DataDrivenNYC)
- [AI & I by Every](https://www.youtube.com/playlist?list=PLuMcoKK9mKgHtW_o9h5sGO2vXrffKHwJL)

### AI People on X (25)
[Andrej Karpathy](https://x.com/karpathy), [Swyx](https://x.com/swyx), [Josh Woodward](https://x.com/joshwoodward), [Boris Cherny](https://x.com/bcherny), [Thibault Sottiaux](https://x.com/thsottiaux), [Peter Yang](https://x.com/petergyang), [Nan Yu](https://x.com/thenanyu), [Madhu Guru](https://x.com/realmadhuguru), [Amanda Askell](https://x.com/AmandaAskell), [Cat Wu](https://x.com/_catwu), [Thariq](https://x.com/trq212), [Google Labs](https://x.com/GoogleLabs), [Amjad Masad](https://x.com/amasad), [Guillermo Rauch](https://x.com/rauchg), [Alex Albert](https://x.com/alexalbert__), [Aaron Levie](https://x.com/levie), [Ryo Lu](https://x.com/ryolu_), [Garry Tan](https://x.com/garrytan), [Matt Turck](https://x.com/mattturck), [Nikunj Kothari](https://x.com/nikunj), [Peter Steinberger](https://x.com/steipete), [Dan Shipper](https://x.com/danshipper), [Aditya Agarwal](https://x.com/adityaag), [Sam Altman](https://x.com/sama), [Claude](https://x.com/claudeai)

### Official Blogs (2)
- [Anthropic Engineering](https://www.anthropic.com/engineering) — technical deep-dives from the Anthropic team
- [Claude Blog](https://claude.com/blog) — product announcements and updates from Claude

## Installation

### OpenClaw
```bash
# From ClawhHub (coming soon)
clawhub install techprazzi

# Or manually
git clone https://github.com/JadenShaguo/techprazzi.git ~/skills/techprazzi
cd ~/skills/techprazzi/scripts && npm install
```

### Claude Code
```bash
git clone https://github.com/JadenShaguo/techprazzi.git ~/.claude/skills/techprazzi
cd ~/.claude/skills/techprazzi/scripts && npm install
```

## Requirements

- An AI agent (OpenClaw, Claude Code, or similar)
- Internet connection (to fetch the central feed)

That's it. No API keys needed. All content (blog articles + YouTube transcripts + X/Twitter posts)
is fetched centrally and updated daily.

## How It Works

1. A central feed is updated daily with the latest content from all sources
   (blog articles via web scraping, YouTube transcripts via Supadata, X/Twitter via official API)
2. Your agent fetches the feed — one HTTP request, no API keys, with local feed fallback
3. `prepare-digest.js` adds `signalScore`, `signalTags`, `signalReasons`, and `signalRadar`
4. Your agent remixes the raw content into a digestible summary using your preferences
5. The digest is delivered to your messaging app (or shown in-chat)

See [examples/sample-digest.md](examples/sample-digest.md) for what the output looks like.

## Privacy

- No API keys are sent anywhere — all content is fetched centrally
- If you use Telegram/email delivery, those keys are stored locally in `~/.techprazzi/.env`
- The skill only reads public content (public blog posts, public YouTube videos, public X posts)
- Your configuration, preferences, and reading history stay on your machine

## License

MIT
