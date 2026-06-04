const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const BEARER_TOKEN = process.env.BEARER_TOKEN;

// Search tweets by keyword or hashtag
app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Missing query param q' });

  try {
    console.log('BEARER_TOKEN:', BEARER_TOKEN ? 'set' : 'MISSING');
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=10&tweet.fields=public_metrics,created_at,author_id&expansions=author_id&user.fields=username,name,profile_image_url`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${BEARER_TOKEN}` }
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user by username
app.get('/user/:username', async (req, res) => {
  try {
    const url = `https://api.twitter.com/2/users/by/username/${req.params.username}?user.fields=public_metrics,profile_image_url,description`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${BEARER_TOKEN}` }
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/score/:username', async (req, res) => {
  try {
    // get user id first
    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${req.params.username}?user.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${BEARER_TOKEN}` } }
    );
    const userData = await userRes.json();
    if (!userData.data) return res.status(404).json({ error: 'User not found' });
    const userId = userData.data.id;

// fetch recent tweets
    const tweetsRes = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?max_results=100&tweet.fields=public_metrics,created_at&query=$LIT OR @lighter_xyz`,
      { headers: { Authorization: `Bearer ${BEARER_TOKEN}` } }
    );
    const tweetsData = await tweetsRes.json();
    const tweets = tweetsData.data || [];

// filter and score
    const litTweets = tweets.filter(t =>
      t.text.toLowerCase().includes('$lit') || t.text.toLowerCase().includes('@lighter_xyz')
    );

let score = 0;
    let impressions = 0;
    litTweets.forEach(t => {
      const m = t.public_metrics;
      impressions += m.impression_count || 0;
      score += (m.impression_count || 0)  0.01 + (m.like_count || 0)  2 + (m.retweet_count || 0)  5 + (m.reply_count || 0)  3;
    });

const tier = score >= 10000 ? 'OG Lighter' : score >= 5000 ? 'Degen' : score >= 1000 ? 'Believer' : 'Lurker';

res.json({ username: req.params.username, score: Math.round(score), posts: litTweets.length, impressions, tier });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Get recent tweets by user ID
app.get('/tweets/:userId', async (req, res) => {
  try {
    const url = `https://api.twitter.com/2/users/${req.params.userId}/tweets?max_results=10&tweet.fields=public_metrics,created_at`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${BEARER_TOKEN}` }
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
