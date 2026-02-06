const snoowrap = require('snoowrap');
const reddit = new snoowrap({
  userAgent: 'RepostDetector/1.0 by u/ObjectiveChoice3899',
  clientId: process.env.REDDIT_CLIENT_ID || 'dummy',
  clientSecret: process.env.REDDIT_CLIENT_SECRET || 'dummy',
  username: process.env.REDDIT_USERNAME || 'dummy',
  password: process.env.REDDIT_PASSWORD || 'dummy'
});
let postHistory = [];
function titleSimilarity(a, b) {
  const aWords = new Set(a.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const bWords = new Set(b.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  if (aWords.size === 0 || bWords.size === 0) return 0;
  const intersection = [...aWords].filter(w => bWords.has(w));
  const union = new Set([...aWords, ...bWords]);
  return intersection.length / union.size;
}
async function monitorSubreddit(subredditName, threshold = 0.8) {
  const subreddit = reddit.getSubreddit(subredditName);
  setInterval(async () => {
    try {
      const newPosts = await subreddit.getNew({ limit: 25 });
      for (const post of newPosts) {
        const title = post.title.toLowerCase().replace(/[^\w\s]/g, '');
        const url = post.url || '';
        for (const old of postHistory) {
          const sim = titleSimilarity(title, old.title);
          const urlMatch = url && old.url && url === old.url; 
          if (urlMatch || sim >= threshold) {
            console.log(`🔁 Repost found: ${post.title} matches ${old.title}`);
            await post.addModNote(`Repost detected: ${sim >= threshold ? 'title' : 'URL'} match`);
            break;
          }
        }
        postHistory.push({ title, url, id: post.id, timestamp: Date.now() });
        if (postHistory.length > 300) postHistory.shift();
      }
    } catch (err) {
      console.error('Error monitoring subreddit:', err);
    }
  }, 5 * 60 * 1000); 
}
monitorSubreddit('YourTestSubreddit');