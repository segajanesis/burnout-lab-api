require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { OpenAI } = require('openai');

const app = express();

// allow requests only from approved frontend domains
const allowedOrigins = [
  'https://kaiserjane.com',
  'https://segajanesis.github.io',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('blocked by cors:', origin);
      callback(new Error('not allowed by cors'));
    }
  }
}));

// parse json request bodies, with a max size limit
app.use(express.json({ limit: '100kb' }));

// rate limit for /lab-report to prevent abuse
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'unusually large amount of requests. what are you doing over there? try again in a minute.',
});
app.use('/lab-report', limiter);

// openai client setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// main lab report endpoint
app.post('/lab-report', async (req, res) => {
  const resume = req.body.resume;

  console.log("received /lab-report POST request");
  if (!resume || resume.length < 100 || resume.length > 8000) {
    console.warn("invalid resume length:", resume ? resume.length : "undefined");
    return res.status(400).send({ error: 'invalid or missing resume input.' });
  }

 const prompt = `Act as Burnout Lab, a career diagnostics tool for Gen Z and millennials switching jobs. Analyze the resume and return the following sections using HTML tags like <h2>, <ul>, <li>, and <p>. Do not use names or personal data. Always complete all sections, even if the resume is short or vague.

<h2>resume lab</h2>
Include a score (0–100) based on: formatting & clarity, action verbs, quantifiable results, keyword density, ATS compatibility. Also list 5 strengths and 3 weaknesses with suggested fixes.

<h2>cert lab</h2>
Suggest 2 to 5 relevant certificates with name, relevance, and estimated time to complete.

<h2>role lab</h2>
Suggest 10 career pivots. For each: role name, fit percentage, average salary (San Francisco), why it fits, and how to start (with a course link if possible).

<h2>quick switch companies</h2>
List 2 to 3 companies similar to those mentioned in the resume where their experience would transfer well.

<h2>interview questions</h2>
List 5 to 10 possible interview questions with strong sample answers based on this resume.

<h2>questions for interviewers</h2>
Suggest 2 thoughtful questions this candidate could ask their interviewer.

<h2>lab disclosure</h2>
We don’t store resumes or personal data. This report is temporary and disappears when the page closes.

Resume:
${resume}`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-3.5-turbo'
    });

    const html = completion.choices[0].message.content;
    res.send({ html });
  } catch (error) {
    console.error('openai error:', error);
    res.status(500).send({ error: 'failed to generate report.' });
  }
});

// root route to confirm server is running
app.get('/', (req, res) => {
  res.send("burnout lab api is live.");
});

// start the express server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`burnout lab api running on http://localhost:${PORT}`);
});
