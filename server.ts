import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim().length < 10) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    data: match[2],
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  // Health & AI capability check
  app.get('/api/health', (_req, res) => {
    const ai = getGeminiClient();
    res.json({
      status: 'ok',
      geminiConfigured: Boolean(ai),
      model: 'gemini-4-hydrogen',
    });
  });

  // Multimodal Artifact Analysis Endpoint
  app.post('/api/analyze-artifact', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_NOT_CONFIGURED',
        message:
          'Server GEMINI_API_KEY is not configured. Configure GEMINI_API_KEY in Secrets or run Demonstration Mode to inspect the curated corpus.',
      });
    }

    try {
      const { imageDataUrl, title, scriptFamily, artifactType, notes } = req.body as {
        imageDataUrl?: string;
        title?: string;
        scriptFamily?: string;
        artifactType?: string;
        notes?: string;
      };

      if (!imageDataUrl) {
        return res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'An artifact photograph (imageDataUrl) is required for multimodal analysis.',
        });
      }

      const parsed = parseDataUrl(imageDataUrl);
      if (!parsed) {
        return res.status(400).json({
          error: 'INVALID_IMAGE_FORMAT',
          message: 'Uploaded image must be a valid base64 data URL (JPG, PNG, or WebP).',
        });
      }

      const prompt = `You are a senior archaeological epigrapher and paleographic computer-vision researcher.
Analyze this photograph of an archaeological inscription artifact.
Researcher-provided context:
- Title: ${title || 'Untitled Excavation Specimen'}
- Expected Script Family: ${scriptFamily || 'Unknown / Detect from image'}
- Artifact Type: ${artifactType || 'Unknown'}
- Additional Notes: ${notes || 'None'}

Provide a rigorous, scholarly epigraphic analysis.
CRITICAL EPISTEMIC RULES:
1. Never present uncertain restorations or damaged glyph readings as confirmed historical facts.
2. Confidence values (0-100) are uncalibrated model estimates—explicitly state this in epistemicNote.
3. Bounding boxes (x, y, w, h) must be normalized percentages (0 to 100) estimating where symbols and damaged zones lie in the photograph.
4. Generate exactly 3 distinct restoration hypotheses ranked 1 to 3 with differing confidence estimates and historical/linguistic rationales.
5. Never invent fake museum accession numbers; cite real epigraphic corpora only when genuinely relevant, or state "Requires physical archival collation".`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: parsed.mimeType,
                data: parsed.data,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              scriptFamily: { type: Type.STRING },
              civilization: { type: Type.STRING },
              language: { type: Type.STRING },
              historicalPeriod: { type: Type.STRING },
              dateRange: { type: Type.STRING },
              location: { type: Type.STRING },
              material: { type: Type.STRING },
              summary: { type: Type.STRING },
              overallConfidenceEstimate: { type: Type.NUMBER },
              detectedSymbols: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    glyph: { type: Type.STRING },
                    transliteration: { type: Type.STRING },
                    phoneticValue: { type: Type.STRING },
                    lineNumber: { type: Type.INTEGER },
                    confidence: { type: Type.NUMBER },
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                    w: { type: Type.NUMBER },
                    h: { type: Type.NUMBER },
                    notes: { type: Type.STRING },
                  },
                },
              },
              damagedRegions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    damageType: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    areaPercent: { type: Type.NUMBER },
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                    w: { type: Type.NUMBER },
                    h: { type: Type.NUMBER },
                    description: { type: Type.STRING },
                  },
                },
              },
              transcriptionLines: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    lineNumber: { type: Type.INTEGER },
                    originalText: { type: Type.STRING },
                    lacunaCount: { type: Type.INTEGER },
                    paleographicNote: { type: Type.STRING },
                  },
                },
              },
              hypotheses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    rank: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    reconstructedText: { type: Type.STRING },
                    predictedCharacters: { type: Type.STRING },
                    confidenceEstimate: { type: Type.NUMBER },
                    epistemicNote: { type: Type.STRING },
                    supportingEvidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                    similarReferences: { type: Type.ARRAY, items: { type: Type.STRING } },
                    explanation: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsedJson = JSON.parse(rawText);
      return res.json({ source: 'live-ai', analysis: parsedJson });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected server error during Gemini analysis.';
      console.error('[ARCHAEON API] /api/analyze-artifact error:', message);
      return res.status(502).json({
        error: 'GEMINI_ANALYSIS_FAILED',
        message,
      });
    }
  });

  // Alternative Restoration Hypothesis Generation
  app.post('/api/restore-inscription', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_NOT_CONFIGURED',
        message: 'Server GEMINI_API_KEY is not configured. Please inspect curated hypotheses or configure GEMINI_API_KEY.',
      });
    }

    try {
      const { title, scriptFamily, language, historicalPeriod, transcriptionText, contextualFocus } = req.body as {
        title: string;
        scriptFamily: string;
        language: string;
        historicalPeriod: string;
        transcriptionText: string;
        contextualFocus?: string;
      };

      const prompt = `You are a specialist in historical epigraphy and textual restoration.
Given the damaged transcription below, propose 3 scholarly restoration hypotheses.
- Artifact: ${title}
- Script Family: ${scriptFamily}
- Language: ${language}
- Period: ${historicalPeriod}
- Damaged Transcription: ${transcriptionText}
- Researcher Focus / Constraint: ${contextualFocus || 'General paleographic & formulaic reconstruction'}

Remember: Confidence scores are uncalibrated computational model estimates, not confirmed probabilities. Do not present hypotheses as established facts.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hypotheses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    rank: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    reconstructedText: { type: Type.STRING },
                    predictedCharacters: { type: Type.STRING },
                    confidenceEstimate: { type: Type.NUMBER },
                    epistemicNote: { type: Type.STRING },
                    supportingEvidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                    similarReferences: { type: Type.ARRAY, items: { type: Type.STRING } },
                    explanation: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const parsedJson = JSON.parse((response.text ?? '{"hypotheses":[]}').trim());
      return res.json({ source: 'live-ai', hypotheses: parsedJson.hypotheses || [] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate restoration hypotheses.';
      return res.status(502).json({ error: 'GEMINI_RESTORATION_FAILED', message });
    }
  });

  // Fragment Comparison Endpoint
  app.post('/api/match-fragments', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_NOT_CONFIGURED',
        message: 'Server GEMINI_API_KEY is not configured. Client-side Sobel edge detection and geometric alignment remain available.',
      });
    }

    try {
      const { imageA, imageB, notes } = req.body as {
        imageA: string;
        imageB: string;
        notes?: string;
      };
      const parsedA = parseDataUrl(imageA);
      const parsedB = parseDataUrl(imageB);
      if (!parsedA || !parsedB) {
        return res.status(400).json({
          error: 'INVALID_IMAGE_FORMAT',
          message: 'Both fragments must be provided as valid base64 image data URLs.',
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            { inlineData: { mimeType: parsedA.mimeType, data: parsedA.data } },
            { inlineData: { mimeType: parsedB.mimeType, data: parsedB.data } },
            {
              text: `Compare these two archaeological artifact fragments for potential physical join compatibility.
Evaluate fracture edge geometry, surface material texture, and epigraphic stroke continuity.
Notes: ${notes || 'None'}.
Clearly state that any score is a computational suggestion and NOT proof of a physical join.`,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallSimilarityScore: { type: Type.NUMBER },
              edgeContourScore: { type: Type.NUMBER },
              surfaceTextureScore: { type: Type.NUMBER },
              strokeContinuityScore: { type: Type.NUMBER },
              suggestedRotationDeg: { type: Type.NUMBER },
              computationalRationale: { type: Type.STRING },
            },
          },
        },
      });

      const parsedJson = JSON.parse((response.text ?? '{}').trim());
      return res.json({ source: 'live-ai', comparison: parsedJson });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fragment comparison failed.';
      return res.status(502).json({ error: 'GEMINI_MATCH_FAILED', message });
    }
  });

  // High-Resolution Image Creation & Editing Studio (gemini-nano-banana-2.1)
  app.post('/api/image-studio', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_NOT_CONFIGURED',
        message:
          'Server GEMINI_API_KEY is not configured. Please set a billing-enabled API key in Settings > Secrets to generate or edit restoration imagery.',
      });
    }

    try {
      const {
        mode = 'generate',
        prompt,
        sourceImageDataUrl,
        aspectRatio = '4:3',
        imageSize = '1K',
        useGoogleSearch = false,
      } = req.body as {
        mode?: 'generate' | 'edit';
        prompt?: string;
        sourceImageDataUrl?: string;
        aspectRatio?: string;
        imageSize?: string;
        useGoogleSearch?: boolean;
      };

      if (!prompt || !prompt.trim()) {
        return res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'A descriptive prompt is required to create or edit an image.',
        });
      }

      const validAspectRatios = ['1:1', '3:4', '4:3', '9:16', '16:9', '1:4', '1:8', '4:1', '8:1'];
      const validSizes = ['1K', '2K', '4K'];
      const safeAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : '4:3';
      const safeImageSize = validSizes.includes(imageSize) ? imageSize : '1K';

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      if (mode === 'edit') {
        if (!sourceImageDataUrl) {
          return res.status(400).json({
            error: 'SOURCE_IMAGE_REQUIRED',
            message: 'Edit mode requires a source artifact photograph.',
          });
        }
        const parsed = parseDataUrl(sourceImageDataUrl);
        if (!parsed) {
          return res.status(400).json({
            error: 'INVALID_IMAGE_FORMAT',
            message: 'Source image must be a valid base64 data URL (JPG, PNG, or WebP).',
          });
        }
        parts.push({
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.data,
          },
        });
      }

      parts.push({
        text: prompt.trim(),
      });

      const response = await ai.models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: safeAspectRatio,
            imageSize: safeImageSize,
          },
          ...(useGoogleSearch
            ? {
                tools: [
                  {
                    googleSearch: {
                      searchTypes: {
                        webSearch: {},
                        imageSearch: {},
                      },
                    },
                  },
                ],
              }
            : {}),
        },
      });

      const images: string[] = [];
      const textNotes: string[] = [];

      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          images.push(`data:${mime};base64,${part.inlineData.data}`);
        } else if (part.text) {
          textNotes.push(part.text);
        }
      }

      if (images.length === 0) {
        return res.status(502).json({
          error: 'NO_IMAGE_RETURNED',
          message:
            textNotes.join(' ').trim() ||
            'The image model responded without an image asset. Try refining your visual prompt.',
        });
      }

      return res.json({
        source: 'live-ai',
        model: 'gemini-nano-banana-2.1',
        imageDataUrl: images[0],
        images,
        notes: textNotes.join('\n').trim(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Image generation failed.';
      console.error('[ARCHAEON API] /api/image-studio error:', message);
      const lower = message.toLowerCase();
      if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota')) {
        return res.status(429).json({
          error: 'RESOURCE_EXHAUSTED',
          message:
            'Quota exceeded or billing-enabled API key required for gemini-nano-banana-2.1. You can select a billing-enabled API key in Settings > Secrets.',
        });
      }
      if (lower.includes('403') || lower.includes('permission_denied') || lower.includes('api_key')) {
        return res.status(403).json({
          error: 'PERMISSION_DENIED',
          message:
            'API key permission error for gemini-nano-banana-2.1. Please select a valid billing-enabled Gemini API key in Settings > Secrets.',
        });
      }
      return res.status(502).json({
        error: 'IMAGE_STUDIO_FAILED',
        message,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ARCHAEON AI server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
