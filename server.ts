import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://0.0.0.0:8000';

function readRawBody(req: express.Request): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

app.use((req, res, next) => {
  const contentType = req.headers['content-type'] ?? '';
  if (contentType.includes('multipart/form-data')) {
    next();
    return;
  }
  express.json()(req, res, next);
});

// Proxy FastAPI backend through same origin (avoids CORS / localhost vs 127.0.0.1 issues)
app.use('/api/v1', async (req, res) => {
  try {
    const targetUrl = `${BACKEND_URL}${req.originalUrl}`;
    const headers: Record<string, string> = {};
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization as string;
    }
    const contentType = req.headers['content-type'];
    if (contentType) {
      headers['Content-Type'] = contentType as string;
    }

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const isMultipart =
      typeof contentType === 'string' && contentType.includes('multipart/form-data');

    let requestBody: BodyInit | undefined;
    if (hasBody) {
      if (isMultipart) {
        const rawBody = await readRawBody(req);
        if (!rawBody.length) {
          res.status(400).json({
            success: false,
            message: 'Upload request arrived without a file body. Retry the upload.',
          });
          return;
        }
        requestBody = rawBody.buffer.slice(
          rawBody.byteOffset,
          rawBody.byteOffset + rawBody.byteLength
        ) as ArrayBuffer;
      } else {
        requestBody = JSON.stringify(req.body ?? {});
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: requestBody,
    });

    const responseBody = await response.text();
    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    });
    res.send(responseBody);
  } catch (error) {
    console.error('API proxy error:', error);
    res.status(502).json({
      success: false,
      message: 'Backend unavailable. Check BACKEND_URL or your Render API deployment.',
    });
  }
});

app.use('/uploads', async (req, res) => {
  try {
    const targetUrl = `${BACKEND_URL}${req.originalUrl}`;
    const response = await fetch(targetUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    });
    res.send(buffer);
  } catch (error) {
    console.error('Uploads proxy error:', error);
    res.status(502).send('Uploads unavailable');
  }
});

app.get('/health', async (_req, res) => {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    const body = await response.text();
    res.status(response.status).type('application/json').send(body);
  } catch {
    res.status(502).json({
      success: false,
      message: 'Backend unavailable',
      data: { status: 'offline' },
    });
  }
});

// Lazy-loaded GoogleGenAI client helper
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      throw new Error('GEMINI_API_KEY environment variable is not configured in Secrets. Please configure it in Settings > Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// API: Validate Hackathon Idea Pitch
app.post('/api/validate-idea', async (req, res) => {
  try {
    const { projectTitle, hackathonName, techStack, conceptPitch } = req.body;
    if (!projectTitle || !conceptPitch) {
      return res.status(400).json({ error: 'Project Title and Concept Pitch are required.' });
    }

    const ai = getGenAI();

    const systemInstruction = `You are the Neural Forge Chief Strategist, an esteemed global hackathon judge, and elite chief systems architect of the Weimar-Tech Laboratory.
You analyze hackathon submissions and mock drafts with absolute directness, profound clarity, and modernist engineering brilliance ("Form Follows Function", "No fluff, no decorations, just pure raw utility").

Analyze the project detail strictly and provide a structured JSON response evaluating:
1. Technical Feasibility (how realistic is it to execute this in a 36-hour window? Give an integer score out of 10)
2. Originality Score (is this another standard generic wrapper, or a genuine utility? Give an integer score out of 10)
3. Brutalist Directness (does the user solve the problem directly or decorate empty features? Give an integer score out of 10)
4. Key Strengths (3 bullet points of what makes this idea strong, asymmetric, or competitive)
5. Required Upgrades (3 custom, advanced, specific engineering upgrades or features they MUST implement to win the grand prize)
6. Suggested Teammates (3 technical specialist roles they should recruit right away to build this successfully)
7. Verdict Summary (1-2 sentences of bold, high-impact overview of their project concept)
8. Critique (A detailed, beautifully written modernist Art-and-Technology review in Markdown format discussing spatial logic, server Authoritativeness, and direct value to users)
9. Visual Theme Proposal (A brilliant visual motif style suggestion suitable for their front-end, e.g. "Space Grotesk typography printed over high-contrast yellow cards with thick pitch-black blocks").`;

    const modelName = 'gemini-3.5-flash';
    const contents = `Evaluate the following Hackathon project pitch request:
- Project Title: "${projectTitle}"
- Target Hackathon: "${hackathonName || 'Any global hackathon'}"
- Technologies chosen: "${techStack || 'Not specified'}"
- Concept Pitch: "${conceptPitch}"`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            feasibilityScore: { type: Type.INTEGER, description: "Score out of 10 for executable feasibility" },
            originalityScore: { type: Type.INTEGER, description: "Score out of 10 for true uniqueness" },
            brutalistDirectness: { type: Type.INTEGER, description: "Score out of 10 representing form-following-function speed and directness" },
            verdictSummary: { type: Type.STRING, description: "A bold, punchy 1-sentence tagline of the feedback" },
            critique: { type: Type.STRING, description: "Detailed critical masterwork evaluation formatted beautifully in standard Markdown" },
            keyStrengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Must contain exactly 3 strong points of the project"
            },
            requiredUpgrades: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Must contain exactly 3 advanced technical upgrade features to win"
            },
            suggestedTeammates: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Exactly 3 team members role titles with witty descriptions"
            },
            visualThemeProposal: { type: Type.STRING, description: "A high-concept visual style design prompt for their front-end interface" },
          },
          required: [
            'feasibilityScore',
            'originalityScore',
            'brutalistDirectness',
            'verdictSummary',
            'critique',
            'keyStrengths',
            'requiredUpgrades',
            'suggestedTeammates',
            'visualThemeProposal',
          ],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response received from Gemini API');
    }

    const data = JSON.parse(text);
    res.json(data);
  } catch (error: any) {
    console.error('Error validating hackathon idea:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze your hackathon idea' });
  }
});

// Vite middleware & Client serving setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path === '/health' || req.path.startsWith('/uploads')) {
        next();
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HackathonFeed Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
