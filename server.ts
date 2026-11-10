import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { parseSpokenTask } from './src/services/dateParser';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// Shared GenAI client with required User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint: Analyze Spoken Task & Divide Into Milestones
app.post('/api/gemini/analyze-task', async (req, res) => {
  try {
    const { spokenText, userFreeHoursSummary, currentDate } = req.body;

    if (!spokenText || typeof spokenText !== 'string') {
      return res.status(400).json({ error: 'spokenText is required' });
    }

    const prompt = `You are an expert executive task organizer and productivity scheduler.
Today's date and time is: ${currentDate || new Date().toISOString()}.
The user's defined free-time work window configuration is: ${userFreeHoursSummary || 'Evening hours 20:00 to 23:00'}.

Analyze the following spoken task input from the user:
"${spokenText}"

Perform the following:
1. Extract a clear, actionable task title.
2. Determine any deadline or target date/time mentioned or implied (e.g., exact calendar date like December 29th). If none mentioned, set a reasonable default relative to today (e.g. today or tomorrow during free hours). Format deadline as a valid ISO string.
3. Assess if this is a major or complex task (e.g., multi-step like "submit thesis paper", "build website", "prepare tax report", "write essay", "create marketing campaign").
4. If it is a major or multi-step task, divide it into 2 to 5 actionable subtasks / milestones. Do NOT specify estimated minutes—the user works with complete freedom of time.
5. Provide a concise rationale explaining how the task was broken down and structured.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Clear, concise actionable title of the task',
            },
            description: {
              type: Type.STRING,
              description: 'Summary of what needs to be done and key details',
            },
            deadline: {
              type: Type.STRING,
              description: 'Target completion ISO datetime string, e.g. 2026-11-12T21:00:00Z',
            },
            isMajorTask: {
              type: Type.BOOLEAN,
              description: 'Whether this task is major or multi-step',
            },
            suggestedUrgency: {
              type: Type.STRING,
              enum: ['high', 'medium', 'low'],
              description: 'Priority level based on user tone and deadline',
            },
            milestones: {
              type: Type.ARRAY,
              description: 'List of divided subtasks and milestones (no time limits)',
              items: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description: 'Specific milestone title',
                  },
                },
                required: ['title'],
              },
            },
            rationale: {
              type: Type.STRING,
              description: 'Brief reason for the schedule and milestone division',
            },
          },
          required: [
            'title',
            'deadline',
            'isMajorTask',
            'suggestedUrgency',
            'milestones',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text ?? '{}');
    return res.json({ success: true, data: parsed });
  } catch (_error: any) {
    const raw = req.body?.spokenText || '';
    const parsed = parseSpokenTask(raw, req.body?.userFreeHoursSummary);
    return res.json({
      success: true,
      data: parsed,
    });
  }
});

// Endpoint: Multimodal Audio Task Analysis directly from MediaRecorder audio chunks
app.post('/api/gemini/analyze-voice-audio', async (req, res) => {
  try {
    const { audioBase64, mimeType, userFreeHoursSummary, currentDate } = req.body;

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'audioBase64 data is required' });
    }

    const cleanMimeType = (mimeType || 'audio/webm').split(';')[0];

    const audioPart = {
      inlineData: {
        mimeType: cleanMimeType,
        data: audioBase64,
      },
    };

    const instructionPrompt = `You are an executive task organizer and productivity scheduler.
Today's date is: ${currentDate || new Date().toISOString()}.
The user's defined free-time hours: ${userFreeHoursSummary || 'Evening hours 20:00 to 23:00'}.

Listen to the attached audio recording from the user.
1. Transcribe the spoken text accurately into 'transcribedText'.
2. Extract a clear actionable task title and summary.
3. Determine any deadline or target date/time mentioned or implied. If none mentioned, set a reasonable default relative to today (e.g. today or tomorrow during free hours). Format deadline as a valid ISO string.
4. Estimate total required focus time in minutes.
5. If it's a major or multi-step task, divide it into 2 to 5 actionable subtasks / milestones (each roughly 20-45 minutes). If small, 1 milestone is sufficient.
6. Provide a concise rationale.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [audioPart, { text: instructionPrompt }],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcribedText: {
              type: Type.STRING,
              description: 'Exact transcribed words spoken by the user',
            },
            title: {
              type: Type.STRING,
              description: 'Clear, concise actionable title of the task',
            },
            description: {
              type: Type.STRING,
              description: 'Summary of what needs to be done',
            },
            deadline: {
              type: Type.STRING,
              description: 'Target completion ISO datetime string, e.g. 2026-11-12T21:00:00Z',
            },
            estimatedMinutes: {
              type: Type.INTEGER,
              description: 'Total estimated minutes for the task',
            },
            isMajorTask: {
              type: Type.BOOLEAN,
              description: 'Whether this task is major or multi-step',
            },
            suggestedUrgency: {
              type: Type.STRING,
              enum: ['high', 'medium', 'low'],
              description: 'Priority level based on user tone and deadline',
            },
            milestones: {
              type: Type.ARRAY,
              description: 'List of divided subtasks and milestones',
              items: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description: 'Specific milestone title',
                  },
                  estimatedMinutes: {
                    type: Type.INTEGER,
                    description: 'Estimated minutes for this milestone',
                  },
                },
                required: ['title', 'estimatedMinutes'],
              },
            },
            rationale: {
              type: Type.STRING,
              description: 'Brief reason for schedule and milestones',
            },
          },
          required: [
            'transcribedText',
            'title',
            'deadline',
            'estimatedMinutes',
            'isMajorTask',
            'suggestedUrgency',
            'milestones',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text ?? '{}');
    return res.json({ success: true, data: parsed });
  } catch (_error: any) {
    const clientText = (req.body?.spokenText || 'Voice task').trim();
    const parsed = parseSpokenTask(clientText, req.body?.userFreeHoursSummary);
    return res.json({
      success: true,
      data: parsed,
    });
  }
});

// Endpoint: Multi-Turn Productivity Assistant Chat with Search Grounding
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { messages, context } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const systemInstruction = `You are PulseAI, an expert productivity strategist, executive assistant, and scheduling coach inside the PulseTask app.
Your goals:
- Help users organize their workload strictly within their manual free-time windows.
- Provide practical advice on time-blocking, overcoming procrastination, and breaking large tasks into bite-sized milestones.
- Help review current tasks, Google Calendar conflicts, and productivity scores.
- When answering questions about time zones, industry deadlines, or external facts, use Google Search grounding for up-to-date information.
- Always be encouraging, concise, direct, and actionable.

Current user context:
${JSON.stringify(context || {}, null, 2)}`;

    // Convert messages to Gemini format
    const contents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contents,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "I'm ready to help you optimize your schedule and crush your tasks!";
    const groundingChunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return res.json({
      success: true,
      text,
      groundingChunks,
    });
  } catch (_error: any) {
    const lastMsg = req.body?.messages?.[req.body.messages.length - 1]?.content || '';
    let responseText = "Here is my advice to optimize your focus: Work inside your designated free hours at your own comfortable pace. Tap 'Start Session' to turn on your stopwatch, and as you check off each subtask milestone, its exact completion time will be recorded.";
    
    if (/procrastinat/i.test(lastMsg)) {
      responseText = "To beat procrastination: Commit to working on just ONE milestone for 5 minutes. Often the hardest part is beginning. Once your stopwatch starts with zero time pressure, momentum carries you forward.";
    } else if (/score|productivity/i.test(lastMsg)) {
      responseText = "Your Productivity Progression Score is based on: 1) Completing tasks on or before your deadline (45%), 2) Working consistently within your scheduled free hours (30%), and 3) Total deep focus hours across tasks and subtasks (25%). Checking off subtasks stamps exact lap times and lifts your score!";
    }

    return res.json({
      success: true,
      text: responseText,
      groundingChunks: [],
    });
  }
});

// Endpoint: AI Schedule Optimization & Rebalancing
app.post('/api/gemini/optimize-schedule', async (req, res) => {
  try {
    const { tasks, freeTimeConfig, date } = req.body;

    const prompt = `Review this user's current scheduled tasks and free-time capacity for ${date || 'today'}:
Tasks: ${JSON.stringify(tasks || [], null, 2)}
Free Time Config: ${JSON.stringify(freeTimeConfig || {}, null, 2)}

Provide 3 quick, smart optimization suggestions to ensure no burnout, smooth milestone progression, and deadline adherence.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are a master productivity coach. Return a helpful, structured JSON list of advice tips.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tips: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  recommendation: { type: Type.STRING },
                  impact: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                },
                required: ['title', 'recommendation', 'impact'],
              },
            },
            overallWorkloadSummary: { type: Type.STRING },
          },
          required: ['tips', 'overallWorkloadSummary'],
        },
      },
    });

    const parsed = JSON.parse(response.text ?? '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Optimization error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to optimize schedule',
    });
  }
});

// Dev or Production Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`PulseTask server listening on port ${port}`);
  });
}

startServer();
