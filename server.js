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

  const prompt = `You will act as burnout lab which is a service geared toward Gen Z and Millenials who are in need of a job switch. 
  Analyze their resume and generate the following sections using html tags like <h2>, <ul>, <li>, and <p>. do not use names or personal information. 
  Important: All sections MUST BE COMPLETE before you return your information, which includes: 
  
  1. Resume Lab: Must include resume score, 5 strengths, and 3 weaknesses with their suggested fixes. 
  2. Cert Lab: Must include relevant ertificate Recommendations (you must return at least 2), 
  3. Role Lab: career switch recommendations with 10 possible careers they would be a good fit for (you must include how well their resume matches the role as a percentage as well as estimate salary information for this position in San Francisco.)
  4. Quick Switch Companies: any companies (no more than 3, but you must provide 2) that are competitiors to businesses on their resume where the person's experience would count for more,   
  5. Interview Questions:  they may be asked (you must return at least 5), 
  6. Questions for Interviewers: Interview questions they could ask their interviewer (you must return at least 2)

<h2>resume lab</h2>
- score (0–100) with breakdown:
  • formatting & clarity
  • action verbs
  • quantifiable results
  • keyword density
  • ats compatibility
- 5 strengths
- 3 weaknesses + specific fixes

<h2>cert lab</h2>
- Between 2 and 5 certs: name, reason it's relevant to the resume, estimated time to complete

<h2>role lab</h2>
- 10 roles: name, fit %, average us salary, why this is a fit for the resume, how to start (include a cert or course recommendation), and a coursera or similar link

<h2>quick switch companies</h2>
- anywhere from 2 - 3 companies that are similar to places of business the resume mentions the person working at 

<h2>interview questions</h2>
- 10 insightful questions and strong sample answers tailored to this resume

<h2>questions for interviewers</h2>
- 2 insightful questions this person could ask their interviewer at the end of the interview 

<h2>lab disclosure</h2>
- we don’t store names, emails, resumes, advice, or personal data. the information in this report is yours. once you leave this page, this info will disappear. 

resume:
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
