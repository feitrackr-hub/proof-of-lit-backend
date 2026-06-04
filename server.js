const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAAOrU9wEAAAAAKowv%2Bn9%2FfxJsflry9WVxddL%2Bsls%3DrRMXjrXTZgwVBWudwU2rlYFx1RxDODaBcVYNDRPpt0laMt25Fa';

const headers = {
  Authorization: `Bearer ${BEARER_TOKEN}`
};

// Fetch all $LIT tweets with pagination
async function fetchLITTweets() {
  let tweets = [];
  let nextToken = null;

  do {
    const params = {
      query: '$LIT -is:retweet',
      max_results: 100,
      'tweet.fields': 'public_metrics,author_id,created_at,text',
      'expansions': 'author_id',
      'user.fields': 'username,name,profile_image_url',
    };
    if (nextToken) params.next_token = nextToken;

    const res = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
      headers,
      params
    });

    const data = res.data;
    if (data.data) tweets.push({ tweets: data.data, users: data.includes?.users || [] });
    nextToken = data.meta?.next_token || null;

  } while (nextToken);

  return tweets;
}

// Build leaderboard from raw tweet batches
function buildLeaderboard(batches) {
  const userMap = {};

  for (const batch of batches) {
    const usersById = {};
    for (const u of batch.users) usersById[u.id] = u;

    for (const tweet of batch.tweets) {
      const user = usersById[tweet.author_id];
      if (!user) continue;

      const username = user.username;
      if (!userMap[username]) {
        userMap[username] = {
          username,
          name: user.name,
          profile_image: user.profile_image_url,
          total_impressions: 0,
          tweets: []
        };
      }

      const m = tweet.public_metrics;
      userMap[username].total_impressions += m.impression_count || 0;
      userMap[username].tweets.push({
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        impressions: m.impression_count || 0,
        retweets: m.retweet_count || 0,
        likes: m.like_count || 0,
        replies: m.reply_count || 0,
        url: `https://twitter.com/${username}/status/${tweet.id}`
      });
    }
  }

  const ranked = Object.values(userMap)
    .sort((a, b) => b.total_impressions - a.total_impressions)
    .map((u, i) => ({ ...u, rank: i + 1 }));

  return ranked;
}

// Cache so we don't hammer the API
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getLeaderboard() {
  if (cache && Date.now() - cacheTime < CACHE_TTL) return cache;
  const batches = await fetchLITTweets();
  cache = buildLeaderboard(batches);
  cacheTime = Date.now();
  return cache;
}

// GET /leaderboard
app.get('/leaderboard', async (req, res) => {
  try {
    const board = await getLeaderboard();
    // Return rank, username, name, profile_image, total_impressions (no tweets array)
    const slim = board.map(({ tweets, ...rest }) => rest);
    res.json(slim);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /search?username=elonmusk
app.get('/search', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username required' });

  try {
    const board = await getLeaderboard();
    const user = board.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return res.status(404).json({ error: 'User not found or has no $LIT tweets' });

    // Sort their tweets by impressions desc
    const sortedTweets = [...user.tweets].sort((a, b) => b.impressions - a.impressions);
    res.json({ ...user, tweets: sortedTweets });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

app.listen(3001, () => console.log('$LIT server running on port 3001'));
