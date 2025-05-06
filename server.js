require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// Rate limit for /lab-report
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many requests from this IP, please try again in a minute.',
});
app.use('/lab-report', limiter);

// OpenAI setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Lab report endpoint
app.post('/lab-report', async (req, res) => {
  const resume = req.body.resume;

  console.log("Received /lab-report POST request");
  if (!resume || resume.length < 100 || resume.length > 8000) {
    console.warn("Invalid resume length:", resume ? resume.length : "undefined");
    return res.status(400).send({ error: 'Invalid or missing resume input.' });
  }

  const prompt = \`Act as Burnout Lab. Analyze this resume and generate the following sections, using raw HTML tags like <h2>, <ul>, <li>, and <p>. Do not use names or personal information.

<h2>resume lab</h2>
- score (0–100) with breakdown:
  • formatting & clarity
  • action verbs
  • quantifiable results
  • keyword density
  • ATS compatibility
- 5 strengths
- 3 weaknesses + fixes

<h2>cert lab</h2>
- subtitle: certificates to stack the odds
- 5 certs: name, reason, time, effort level, link to the cert

<h2>role lab</h2>
- subtitle: easiest pivots, pay, and paths
- 10 roles: name, fit %, salary, fit reason, how to start, Coursera link

<h2>interview lab</h2>
- subtitle: prepare to get hired
- 10 questions + sample answers

<h2>lab disclosure</h2>
- we don’t store names, emails, or personal data. this report is yours.

Resume:
\${resume}\`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-4'
    });

    const html = completion.choices[0].message.content;
    res.send({ html });
  } catch (error) {
    console.error('OpenAI error:', error);
    res.status(500).send({ error: 'Failed to generate report.' });
  }
});

// Root test route
app.get('/', (req, res) => {
  res.send("Burnout Lab API is live.");
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Burnout Lab API running on http://localhost:${PORT}`);
});
