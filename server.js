const fetch = require(‘node-fetch);
const express = require('express');
const fetch = require('node-fetch');
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
