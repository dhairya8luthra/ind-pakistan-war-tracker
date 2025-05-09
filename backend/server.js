require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const snoowrap  = require('snoowrap');
const RSSParser = require('rss-parser');

const r = new snoowrap({
  userAgent   : process.env.USER_AGENT,
  clientId    : process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  username    : process.env.REDDIT_USERNAME,
  password    : process.env.REDDIT_PASSWORD,
});
r.config({ requestDelay: 1000 });   // 60 calls/min max

/* ──  FEED SOURCES  ────────────────────────────────────────── */
const RSS_SOURCES = {
  world: [
    { url: 'http://newsrss.bbc.co.uk/rss/newsonline_uk_edition/world/rss.xml',     src: 'BBC' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml',                            src: 'Al Jazeera' },
    { url:'https://rss.app/feeds/tWlPrSaPZQcVfsDu.xml',                                             src: 'RSS FEED' },    

  ],
  india: [
    { url: 'http://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms',          src: 'Times of India' },
    { url: 'https://feeds.feedburner.com/ndtvnews-india-news',                src: 'NDTV' }, // picked from NDTV RSS hub
  ],
  pakistan: [
    
    { url: 'https://rss.app/feeds/f7iT6ESw05wtyLo0.xml',                                             src: 'Geo News' },
    
  ]
};
const parser = new RSSParser({ headers: { 'User-Agent': process.env.USER_AGENT } });

/* ──  REDDIT CONSTANTS  ────────────────────────────────────── */
const WORLDNEWS_THREAD_ID = '1kigotl';
const INDIA_THREAD_ID     = '1khw236';
const LIVE_THREAD_ID      = '1ez73mze729wj';
const FLAIR_NAME          = 'India/Pakistan';

/* ──  EXPRESS  ─────────────────────────────────────────────── */
const app  = express();
app.use(cors('https://ind-pakistan-war-tracker.vercel.app/'));
const PORT = 8080;

/* helper to flatten one comment level */
const flattenComments = listing => listing.map(c => ({
  id       : c.id,
  author   : c.author ? c.author.name : '[deleted]',
  created  : c.created_utc * 1000,
  score    : c.score,
  body_html: c.body_html,
  body     : c.body,
}));

/* helper to fetch & trim one RSS URL */
async function grabFeed({ url, src }) {
  try {
    const feed  = await parser.parseURL(url);
    return feed.items.slice(0, 15).map(it => ({
      source : src,
      title  : it.title,
      link   : it.link,
      pubDate: new Date(it.pubDate || it.isoDate || Date.now()).getTime()
    }));
  } catch (e) {
    console.error('RSS error', src, url, e.message);
    return [];
  }
}

/* ──  SINGLE ENDPOINT  ─────────────────────────────────────── */
app.get('/reddit', async (_, res) => {
  try {
    /* 1️⃣  Reddit fetches */
    const [worldSub, indiaSub, liveThread, newPosts] = await Promise.all([
      r.getSubmission(WORLDNEWS_THREAD_ID).expandReplies({ limit: Infinity, depth: 1 }),
      r.getSubmission(INDIA_THREAD_ID).expandReplies({ limit: Infinity, depth: 1 }),
      r.getLivethread(LIVE_THREAD_ID),
      r.getSubreddit('worldnews').getNew({ limit: 300 }),
    ]);

    /* 2️⃣  RSS fetches (done in parallel per bucket) */
    const [worldRSS, indiaRSS, pakRSS] = await Promise.all(
      Object.values(RSS_SOURCES).map(group => Promise.all(group.map(grabFeed))
                                                  .then(arr => arr.flat())
    ));

    /* 3️⃣  Assemble JSON */
    const payload = {
      fetched_at: Date.now(),

      /* reddit blocks */
      worldnewsComments : flattenComments(worldSub.comments),
      indiaComments     : flattenComments(indiaSub.comments),
      liveUpdates       : (await liveThread.getRecentUpdates({ limit: 50 })).map(u => ({
                            id: u.id, created: u.created_utc * 1000,
                            author: u.author ? u.author.name : '[deleted]',
                            body_html: u.body_html, body: u.body,
                          })),
      flairWorldnewsPosts: newPosts
        .filter(p => (p.link_flair_text || '').toLowerCase() === FLAIR_NAME.toLowerCase())
        .slice(0, 50)
        .map(p => ({
          id: p.id, title: p.title,
          created: p.created_utc * 1000,
          url: `https://www.reddit.com${p.permalink}`,
          score: p.score, num_comments: p.num_comments,
        })),

      /* new RSS block */
      rss: {
        world   : worldRSS,
        india   : indiaRSS,
        pakistan: pakRSS,
      },
    };

    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`🟢  API ready →  http://localhost:${PORT}/reddit`)
);
