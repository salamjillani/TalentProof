const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

// Groq's hosted model lineup changes over time (e.g. llama-3.3-70b-versatile
// and llama-3.1-8b-instant were both deprecated in June 2026). Rather than
// hardcode a single model name, try an ordered list and move to the next
// on failure — the same resilience pattern used for multi-model retries
// against Gemini in the earlier version of this project, just applied to
// a single OpenAI-compatible endpoint instead of per-model URLs.
const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.6-27b'
];

function cleanJsonString(rawString) {
  let cleaned = rawString.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

async function callGroq(prompt) {
  let lastError = null;

  for (const model of GROQ_MODELS) {
    console.log(`Attempting Groq API call with model: ${model}...`);
    try {
      const response = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.15
        })
      });

      if (response.status === 400 || response.status === 404) {
        console.warn(`Model ${model} not available on Groq. Trying next fallback...`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API returned error status ${response.status}: ${errText}`);
      }

      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        console.log(`Groq API call succeeded using model: ${model}`);
        return data.choices[0].message.content;
      }

      throw new Error('Invalid response structure received from Groq API');
    } catch (err) {
      console.warn(`Groq call failed for model ${model}: ${err.message}`);
      lastError = err;
    }
  }

  throw new Error(`All Groq model fallbacks failed. Last error: ${lastError ? lastError.message : 'Unknown'}`);
}

/**
 * Sends a prompt to Groq. There is deliberately no local/regex fallback here:
 * if this fails, the caller must surface a clear "AI unavailable" error to
 * the user rather than synthesize a fake result.
 */
export async function generateText(prompt) {
  if (!GROQ_API_KEY) {
    throw new Error('AI is not configured. Please set GROQ_API_KEY in environment variables.');
  }
  return await callGroq(prompt);
}

export async function analyzeResumeMatch(resumeText, targetRole) {
  const cappedText = resumeText.slice(0, 15000);
  const prompt = `You are an expert HR recruiter. Read and analyze the following candidate resume text against the target job role: "${targetRole}".

CRITICAL INSTRUCTION: Be highly critical, realistic, and objective in matching. Do NOT assign the same generic percentages (like 95%) to all candidates unless they are an absolute perfect fit. Distinguish their compatibility clearly based on their actual matching skills, years of experience, and background (e.g., assign 58%, 73%, 82%, 91% etc. dynamically based on merit).

Resume Content:
"""
${cappedText}
"""

Your output must be a single, valid JSON object matching the schema below. Do not output any notes, markdown codeblock tick fences, or introductory text. Just the raw JSON.

Schema:
{
  "candidateName": "Extract candidate full name. If not found in text, return 'Unknown Candidate'.",
  "matchPercentage": 75,
  "matchedSkills": ["Skill 1 found in resume", "Skill 2"],
  "missingSkills": ["Critical skill/technology specified in target role that is missing in candidate resume", "Skill 2"],
  "justification": "A brief 2-sentence summary explaining why this rating was given and the candidate's main strengths.",
  "interviewQuestions": ["Question 1 testing candidate on missing tech skill or resume background", "Question 2", "Question 3"]
}`;

  console.log(`Analyzing resume match for target role: ${targetRole}...`);
  const responseText = await generateText(prompt);
  const cleanedText = cleanJsonString(responseText);
  return JSON.parse(cleanedText);
}

export async function generateInterviewQuestions(designation, experience, skills = '') {
  const prompt = `You are an expert HR Interviewer. Generate a comprehensive list of interview preparation questions for a candidate with the following profile:
Designation: "${designation}"
Experience Level: "${experience}"
Core Technologies / Skills: "${skills}"

Your output must be a single, valid JSON object matching the schema below. Do not output any notes, markdown codeblock tick fences, or introductory text. Just the raw JSON.

Schema:
{
  "questions": [
    {
      "type": "Technical / Behavioral",
      "question": "A technical or behavioral interview question relevant to the target designation and technology stack.",
      "difficulty": "Easy / Medium / Hard",
      "talkingPoints": ["Key talking point 1 the candidate should mention in their answer", "Key talking point 2"]
    }
  ]
}

Note: Return exactly 5 Technical questions and 3 Behavioral questions.`;

  console.log(`Generating interview prep questions for designation: ${designation}...`);
  const responseText = await generateText(prompt);
  const cleanedText = cleanJsonString(responseText);
  return JSON.parse(cleanedText);
}

/**
 * The generation half of the RAG loop. `retrievedCandidates` must already
 * be the top-K result of a real similarity search (see vectorSearch.js) —
 * this function only ever sees those candidates, never the full candidate
 * pool, which is what makes this genuine retrieval-augmented generation
 * rather than "ask the model and hope it remembers everything."
 */
export async function synthesizeCandidateSearchAnswer(query, retrievedCandidates) {
  const candidateSummaries = retrievedCandidates.map((c, i) => `
Candidate ${i + 1}: ${c.candidateName} (file: ${c.fileName})
Screened for role: "${c.targetRole}" | Match score: ${c.matchPercentage}% | Similarity to query: ${Math.round(c.similarity * 100)}%
Matched skills: ${(c.matchedSkills || []).join(', ') || 'none recorded'}
Missing skills: ${(c.missingSkills || []).join(', ') || 'none recorded'}
Recruiter notes: ${c.justification || 'none recorded'}`).join('\n---');

  const prompt = `You are a recruiting assistant. A recruiter asked the following question about their screened candidates:

"${query}"

Below are the ONLY candidates retrieved as potentially relevant. You must answer using ONLY this information — do not invent candidates or details not listed here. If none of these candidates genuinely answer the question, say so plainly instead of stretching the truth.

${candidateSummaries}

Write a direct, concise answer (2-4 sentences) naming the specific candidate(s) by name and file, and briefly why. Do not output JSON, markdown fences, or any text besides the answer itself.`;

  return await generateText(prompt);
}

/**
 * Best-effort explanation of why two candidates are similar. This is
 * flavor text on top of a similarity score that's already pure vector
 * math — its failure is shown to the user as "explanation unavailable",
 * never silently replaced with a fabricated one.
 */
export async function explainSimilarity(sourceCandidate, matchCandidate) {
  const prompt = `Candidate A: ${sourceCandidate.candidateName}
Matched skills: ${(sourceCandidate.matchedSkills || []).join(', ') || 'none recorded'}
Recruiter notes: ${sourceCandidate.justification || 'none recorded'}

Candidate B: ${matchCandidate.candidateName}
Matched skills: ${(matchCandidate.matchedSkills || []).join(', ') || 'none recorded'}
Recruiter notes: ${matchCandidate.justification || 'none recorded'}

In 1-2 sentences, explain why Candidate B is a similar profile to Candidate A. Plain text only, no markdown.`;

  return await generateText(prompt);
}
