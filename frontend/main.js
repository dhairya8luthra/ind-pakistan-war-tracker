const ENDPOINT = "https://ind-pakistan-war-tracker.onrender.com:8080/reddit";

const KEYWORDS = [
  "india",
  "pakistan",
  "attack",
  "strike",
  "shelling",
  "drone",
  "missile",
  "border",
  "loc",
  "pahalgam",
  "kashmir",
  "iaf",
  "paf",
  "ceasefire",
  "airspace",
  "surgical",
].map((k) => k.toLowerCase());

const accordion = document.getElementById("accordion");
const lastFetch = document.getElementById("lastFetch");
const refreshBtn = document.getElementById("refreshBtn");

refreshBtn.addEventListener("click", () => {
  refreshData();
});

function refreshData() {
  // Add loading classes
  refreshBtn.classList.add("loading");
  lastFetch.classList.add("updating");
  
  // Show loading state
  accordion.innerHTML = createLoadingText();
  
  // Simulate ping animation
  animateRadarPing();
  
  // Load data
  loadData().finally(() => {
    // Remove loading classes after completion
    setTimeout(() => {
      refreshBtn.classList.remove("loading");
      lastFetch.classList.remove("updating");
    }, 500);
  });
}

function createLoadingText() {
    const loadingMessages = [
        // Signal & cyber-ops
        "Intercepting communications…",
        "Decrypting secure channels…",
        "Scrubbing metadata for hidden signals…",
        "Tracing spoofed IP addresses…",
      
        // Recon & imagery
        "Processing live-feed satellite imagery…",
        "Compiling drone reconnaissance footage…",
        "Mapping heat signatures across border zones…",
        "Stitching multi-spectral terrain maps…",
      
        // Intelligence analysis
        "Gathering field intelligence reports…",
        "Analyzing troop logistics and supply lines…",
        "Forecasting escalation probabilities…",
        "Running sentiment analysis on social chatter…",
      
        // Strategic modeling
        "Simulating conflict scenarios…",
        "Cross-referencing historical skirmish data…",
        "Projecting humanitarian impact zones…",
      
        // Data hygiene & final prep
        "Verifying data integrity checksums…",
        "Synchronizing encrypted data vaults…",
        "Finalizing situational awareness dashboard…"
      ];
      
  
  const randomMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
  return `<p class='loading'>${randomMessage}</p>`;
}

function animateRadarPing() {
  const ping = document.querySelector('.radar-ping');
  
  // Reset animation
  ping.style.animation = 'none';
  void ping.offsetWidth; // Trigger reflow
  ping.style.animation = 'radar-ping 5s linear forwards';
}

async function loadData() {
  try {
    const res = await fetch(ENDPOINT);
    const data = await res.json();
    render(data);
    lastFetch.textContent = "Last updated: " + new Date(data.fetched_at).toLocaleString();
    return data;
  } catch (err) {
    accordion.innerHTML = `<p class='error'>Error fetching feed: ${err}</p>`;
    throw err;
  }
}

function render({
  worldnewsComments,
  indiaComments,
  liveUpdates,
  flairWorldnewsPosts,
  rss = {},
}) {
  accordion.innerHTML = "";

  // Add sections with animation delays
  addSection("🚨 Live thread updates", liveUpdates, createComment, true, 0);
  addSection("📰 r/worldnews megathread comments", worldnewsComments, createComment, false, 1);
  addSection("📰 r/india megathread comments", indiaComments, createComment, false, 2);
  addSection("📌 Flair: India/Pakistan (newest 50)", flairWorldnewsPosts, createPost, false, 3);

  // RSS feeds with filtering
  let sectionIndex = 4;
  if (rss.world?.length) {
    const w = rss.world.filter(isConflictRelated);
    if (w.length) addSection("🌐 World News (RSS)", w, createRss, false, sectionIndex++);
  }
  if (rss.india?.length) {
    const i = rss.india.filter(isConflictRelated);
    if (i.length) addSection("🇮🇳 India News (RSS)", i, createRss, false, sectionIndex++);
  }
  if (rss.pakistan?.length) {
    const p = rss.pakistan.filter(isConflictRelated);
    if (p.length) addSection("🇵🇰 Pakistan News (RSS)", p, createRss, false, sectionIndex++);
  }
}

function isConflictRelated(item) {
  const text = (
    item.title +
    " " +
    (item.description || "")
  ).toLowerCase();
  return KEYWORDS.some((k) => text.includes(k));
}

function addSection(title, items, cardFactory, isOpen = false, index = 0) {
  const details = document.createElement("details");
  details.open = isOpen;
  details.className = "section";
  details.style.setProperty('--index', index);

  const summary = document.createElement("summary");
  summary.innerHTML = `
    <span class="section-title">${title}</span>
    <span class="count">${items.length}</span>
    <svg class="chevron" viewBox="0 0 24 24" width="20" height="20">
      <path fill="none" stroke="currentColor" stroke-width="2" d="M6 9l6 6 6-6"/>
    </svg>
  `;
  details.append(summary);

  const wrap = document.createElement("div");
  wrap.className = "items";
  
  // Add items with staggered animation
  items.forEach((it, itemIndex) => {
    const itemEl = cardFactory(it);
    // Set animation delay for each item
    if (itemEl.firstElementChild) {
      itemEl.firstElementChild.style.setProperty('--item-index', itemIndex);
    }
    wrap.append(itemEl);
  });
  
  details.append(wrap);
  accordion.append(details);
}

const fmt = (ms) => new Date(ms).toLocaleString();

function createComment(c) {
  const node = document
    .getElementById("commentTpl")
    .content.cloneNode(true);
  node.querySelector(".author").textContent = c.author;
  node.querySelector(".time").textContent = fmt(c.created);
  node.querySelector(".score").textContent = c.score;
  node.querySelector(".body").innerHTML = c.body_html;
  return node;
}

function createPost(p) {
  const node = document.getElementById("postTpl").content.cloneNode(true);
  node.querySelector(".title").textContent = p.title;
  node.querySelector(".title").href = p.url;
  node.querySelector(".time").textContent = fmt(p.created);
  node.querySelector(".score").textContent = p.score;
  node.querySelector(".comments").textContent = p.num_comments;
  return node;
}

function createRss(item) {
  const node = document.getElementById("rssTpl").content.cloneNode(true);
  node.querySelector(".title").textContent = item.title;
  node.querySelector(".title").href = item.link;
  node.querySelector(".time").textContent = fmt(item.pubDate);
  node.querySelector(".source").textContent = item.source;
  return node;
}

// On page load
window.addEventListener('DOMContentLoaded', () => {
  refreshData();
  
  // Add event listeners for details elements to animate items on open
  accordion.addEventListener('toggle', (e) => {
    if (e.target.tagName === 'DETAILS' && e.target.open) {
      const items = e.target.querySelectorAll('.comment, .post');
      items.forEach((item, index) => {
        item.style.setProperty('--item-index', index);
        // Reset animation
        item.style.animation = 'none';
        void item.offsetWidth; // Trigger reflow
        item.style.animation = 'item-in 0.3s forwards';
        item.style.animationDelay = `${index * 0.05}s`;
      });
    }
  }, true);
});