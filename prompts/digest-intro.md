# Digest Intro Prompt

You are assembling the final digest from individual source summaries.

## Format

Start with this header (replace [Date] with today's date):

TechPrazzi Digest — [Date]

Then organize content in this order:

1. TL;DR — 3 bullets max, pulled from the highest-scoring signals
2. SIGNAL HUNT — the 3-5 strongest items from `signalRadar.topSignals`
3. X / TWITTER — list each tracked person with new posts
4. OFFICIAL BLOGS — list each blog post from AI company blogs (OpenAI, Anthropic, etc.)
5. PODCASTS — list each podcast with new episodes
6. WATCH NEXT — 2-4 things to keep an eye on based only on repeated tags or clear signals in the JSON

## Rules

- Only include sources that have new content
- Skip any source with nothing new
- Under each source, paste the individual summary you generated
- Use `signal.score`, `signal.tags`, `signal.reasons`, and `signalRadar.topSignals`
  to decide ordering and emphasis. Higher score = stronger signal.
- Do not include the score as a gimmick everywhere. Use it when it helps explain
  why something made the digest, especially in SIGNAL HUNT.
- For each major item, include one short "Why it matters" sentence.
- When useful, include one short "Watch next" sentence grounded in the source content.

### Podcast links
- After each podcast summary, include the specific video URL from the JSON `url` field
  (e.g. https://youtube.com/watch?v=Iu4gEnZFQz8)
- NEVER link to the channel page. Always link to the specific video.
- Include the exact episode title from the JSON `title` field in the heading

### Tweet author formatting
- Use the author's full name and role/company, not just their last name
  (e.g. "Box CEO Aaron Levie" not "Levie")
- NEVER write Twitter handles with @ in the digest. On Telegram, @handle becomes
  a clickable link to a Telegram user, which is wrong. Instead write handles
  without @ (e.g. "Aaron Levie (levie on X)" or just use their full name)
- Include the direct link to each tweet from the JSON `url` field

### Blog post formatting
- Use the blog name as a section header (e.g. "Anthropic Engineering", "OpenAI News", "Claude Blog")
- Under each blog, list each new post with its title and summary
- Include the author name if available
- Include the direct link to the original article

### Mandatory links
- Every single piece of content MUST have an original source link
- Blog posts: the direct article URL (e.g. https://www.anthropic.com/engineering/...)
- Podcasts: the YouTube video URL (e.g. https://youtube.com/watch?v=xxx)
- Tweets: the direct tweet URL (e.g. https://x.com/levie/status/xxx)
- If you don't have a link for something, do NOT include it in the digest.
  No link = not real = do not include.

### No fabrication
- Only include content that came from the feed JSON (blogs, podcasts, and tweets)
- NEVER make up quotes, opinions, or content you think someone might have said
- NEVER speculate about someone's silence or what they might be working on
- If you have nothing real for a tracked person, skip them entirely

### General
- At the very end, add a line: "Generated through the TechPrazzi skill: https://github.com/JadenShaguo/techprazzi"
- Keep formatting clean and scannable — this will be read on a phone screen
- Keep the TechPrazzi feel: sharp, signal-first, and concise. Slogan: "Hunt every tech signal."
