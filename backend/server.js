// server.js
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const snoowrap  = require('snoowrap');
const RSSParser = require('rss-parser');





/* ─────────── Reddit auth (script app) ─────────── */
const r = new snoowrap({
  userAgent   : process.env.USER_AGENT,
  clientId    : process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  username    : process.env.REDDIT_USERNAME,
  password    : process.env.REDDIT_PASSWORD,
});
r.config({ requestDelay: 1000 });           // 1 req/s safety

/* ─────────── RSS sources ─────────── */
const RSS_SOURCES = {
  world: [
    { url: 'http://newsrss.bbc.co.uk/rss/newsonline_uk_edition/world/rss.xml', src: 'BBC' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml',                        src: 'Al Jazeera' },
    { url: 'https://rss.app/feeds/tWlPrSaPZQcVfsDu.xml',                       src: 'RSS Feed' },
  ],
  india: [
    { url: 'http://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms',      src: 'Times of India' },
    { url: 'https://feeds.feedburner.com/ndtvnews-india-news',                 src: 'NDTV' },
  ],
  pakistan: [
    { url: 'https://rss.app/feeds/f7iT6ESw05wtyLo0.xml',                       src: 'Geo News' },
    { url: 'https://rss.app/feeds/CKZPQ13ewxX6qQnk.xml',                       src: 'Dawn' },
    {url: 'https://rss.app/feeds/M9SI3tNI05Y1RLTJ.xml',                        src: 'The Express Tribune' },
  ],
  Twitter:[
    { url: 'https://rss.app/feeds/2vX0qk1x5Y3g4J6E.xml',                       src: 'Twitter' },    
  ]
};
const parser = new RSSParser({ headers: { 'User-Agent': process.env.USER_AGENT } });

/* ─────────── Reddit constants ─────────── */
const WORLDNEWS_THREAD_ID = '1kigotl';
const INDIA_THREAD_ID     = '1khw236';
const LIVE_THREAD_ID      = '1ez73mze729wj';
const FLAIR_NAME          = 'India/Pakistan';

/* ─────────── Express app ─────────── */
const app = express();
app.use(
  cors({
    origin: ['https://ind-pakistan-war-tracker.vercel.app', 'http://localhost:3000'],
  })
);
const PORT = process.env.PORT || 8080;

/* ─────────── Simple 5-minute cache ─────────── */
let cachePayload = null;
let cacheTimestamp = 0;
const TTL = 5 * 60 * 1000; // 5 min in ms

/* ─────────── Helpers ─────────── */
const flattenComments = listing =>
  listing.map(c => ({
    id       : c.id,
    author   : c.author ? c.author.name : '[deleted]',
    created  : c.created_utc * 1000,
    score    : c.score,
    body_html: c.body_html,
    body     : c.body,
  }));

async function grabFeed({ url, src }) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items.slice(0, 15).map(item => ({
      source : src,
      title  : item.title,
      link   : item.link,
      pubDate: new Date(item.pubDate || item.isoDate || Date.now()).getTime(),
    }));
  } catch (err) {
    console.error('RSS error', src, url, err.message);
    return [];
  }
}

/* ─────────── Single endpoint ─────────── */
app.get('/reddit', async (_, res) => {
  try {
    /* 1️⃣  Serve from cache if still fresh */
    if (cachePayload && Date.now() - cacheTimestamp < TTL) {
      return res.json(cachePayload);
    }

    /* 2️⃣  Otherwise fetch fresh data */
    const [worldSub, indiaSub, liveThread, newPosts] = await Promise.all([
      r.getSubmission(WORLDNEWS_THREAD_ID).expandReplies({ limit: Infinity, depth: 1 }),
      r.getSubmission(INDIA_THREAD_ID).expandReplies({ limit: Infinity, depth: 1 }),
      r.getLivethread(LIVE_THREAD_ID),
      r.getSubreddit('worldnews').getNew({ limit: 300 }),
    ]);

    const [worldRSS, indiaRSS, pakRSS,twitterRSS] = await Promise.all(
      Object.values(RSS_SOURCES).map(group =>
        Promise.all(group.map(grabFeed)).then(arr => arr.flat())
      )
    );

    const payload = {
      fetched_at: Date.now(),

      /* Reddit blocks */
      worldnewsComments: flattenComments(worldSub.comments),
      indiaComments    : flattenComments(indiaSub.comments),
      liveUpdates      : (await liveThread.getRecentUpdates({ limit: 50 })).map(u => ({
        id: u.id,
        created: u.created_utc * 1000,
        author: u.author ? u.author.name : '[deleted]',
        body_html: u.body_html,
        body: u.body,
      })),
      flairWorldnewsPosts: newPosts
        .filter(p => (p.link_flair_text || '').toLowerCase() === FLAIR_NAME.toLowerCase())
        .slice(0, 50)
        .map(p => ({
          id: p.id,
          title: p.title,
          created: p.created_utc * 1000,
          url: `https://www.reddit.com${p.permalink}`,
          score: p.score,
          num_comments: p.num_comments,
        })),

      /* RSS block */
      rss: {
        world   : worldRSS,
        india   : indiaRSS,
        pakistan: pakRSS,
        twitter: twitterRSS,
      },
    };
    /* 3️⃣  Store in cache & respond */
    cachePayload = payload;
    cacheTimestamp = Date.now();
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* ─────────── Start server ─────────── */
app.listen(PORT, () =>
  console.log(`🟢  API ready →  http://localhost:${PORT}/reddit`)
);
