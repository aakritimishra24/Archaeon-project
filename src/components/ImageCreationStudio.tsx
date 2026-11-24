import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Download,
  Globe,
  ImagePlus,
  Loader2,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';
import type { ArtifactRecord, AudienceMode, PageId } from '../types/archaeon';
import { ArtifactImage } from './ArtifactImage';

interface ImageCreationStudioProps {
  artifacts: ArtifactRecord[];
  activeArtifact: ArtifactRecord;
  audienceMode: AudienceMode;
  onSelectArtifact: (id: string) => void;
  onNavigate: (page: PageId) => void;
}

type StudioMode = 'edit' | 'generate';

async function urlToDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to encode artifact photograph.'));
    reader.readAsDataURL(blob);
  });
}

export const ImageCreationStudio: React.FC<ImageCreationStudioProps> = ({
  artifacts,
  activeArtifact,
  audienceMode,
  onSelectArtifact,
  onNavigate,
}) => {
  const isPublic = audienceMode === 'public';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [studioMode, setStudioMode] = useState<StudioMode>('edit');
  const [customSourceUrl, setCustomSourceUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>(
    `Visually reconstruct the eroded and fractured lower-right surface of this ${activeArtifact.material.toLowerCase()} artifact in matching ${activeArtifact.scriptFamily} carving style, keeping authentic museum lighting and stone texture.`
  );
  const [aspectRatio, setAspectRatio] = useState<string>('4:3');
  const [imageSize, setImageSize] = useState<string>('1K');
  const [useGoogleSearch, setUseGoogleSearch] = useState<boolean>(false);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [modelNotes, setModelNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveSourceUrl = customSourceUrl || activeArtifact.imageUrl;

  const handleUploadSource = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCustomSourceUrl(String(reader.result));
      setStudioMode('edit');
    };
    reader.readAsDataURL(file);
  };

  const applyArtifactPreset = (art: ArtifactRecord) => {
    onSelectArtifact(art.id);
    setCustomSourceUrl(null);
    if (studioMode === 'edit') {
      setPrompt(
        `Visually reconstruct the eroded and fractured sections of this ${art.material.toLowerCase()} ${art.artifactType.toLowerCase()} in matching ${art.scriptFamily} lettering while preserving authentic weathered museum patina.`
      );
    } else {
      setPrompt(
        `Museum-grade studio photograph of an intact ${art.historicalPeriod} ${art.artifactType.toLowerCase()} from ${art.location}, carved in ${art.material} with crisp ${art.scriptFamily} inscriptions on dark obsidian museum background.`
      );
    }
  };

  const handleRunStudio = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setErrorMsg(null);
    setModelNotes('');

    try {
      let sourceImageDataUrl: string | undefined;
      if (studioMode === 'edit') {
        sourceImageDataUrl = await urlToDataUrl(effectiveSourceUrl);
      }

      const response = await fetch('/api/image-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: studioMode,
          prompt: prompt.trim(),
          sourceImageDataUrl,
          aspectRatio,
          imageSize,
          useGoogleSearch,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setErrorMsg(
          payload.message ||
            'Unable to generate image. Ensure a billing-enabled Gemini API key is configured in Settings > Secrets.'
        );
        return;
      }

      setGeneratedUrl(payload.imageDataUrl);
      if (payload.notes) {
        setModelNotes(payload.notes);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unexpected network error calling Image Studio.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedUrl) return;
    const link = document.createElement('a');
    link.href = generatedUrl;
    link.download = `${activeArtifact.id}-visual-reconstruction.png`;
    link.click();
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#39443D]">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#F0E8D8]">
            {isPublic ? 'Visual Reconstruction Studio' : 'AI Image Creation & Editing Studio'}
          </h1>
          <p className="text-xs text-[#A9ADA3] mt-1">
            {isPublic
              ? 'Imagine how damaged stones and clay tablets originally looked, or illustrate ancient scenes from descriptions'
              : 'High-resolution (1K–4K) speculative inpainting and artifact visualization powered by gemini-nano-banana-2.1'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={activeArtifact.id}
            onChange={(e) => {
              const found = artifacts.find((a) => a.id === e.target.value);
              if (found) applyArtifactPreset(found);
            }}
            aria-label="Select specimen"
            className="h-10 px-3 rounded-md bg-[#1C2420] border border-[#39443D] text-xs text-[#F0E8D8] focus:outline-none focus:border-[#C9A66B]"
          >
            {artifacts.map((art) => (
              <option key={art.id} value={art.id}>
                {isPublic ? art.title : `${art.id} — ${art.title}`}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onNavigate('restoration')}
            className="h-10 px-3.5 rounded-md bg-[#1C2420] border border-[#39443D] hover:border-[#C9A66B] text-xs text-[#C9A66B]"
          >
            {isPublic ? '← Text Translation' : '← Text Hypotheses'}
          </button>
        </div>
      </div>

      {/* Epistemic Visual Disclaimer */}
      <div className="bg-[#1C2420] border border-[#A85D48]/50 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-[#A85D48] shrink-0 mt-0.5" />
        <p className="text-xs text-[#F0E8D8] leading-relaxed">
          <span className="font-semibold text-[#C9A66B]">
            {isPublic ? 'Artist’s Reconstruction Notice:' : 'Speculative Visual Plate Notice:'}
          </span>{' '}
          {isPublic
            ? 'Images created here are AI visual reconstructions meant to help picture what weathered monuments might have looked like when new—they are not real photographs of intact artifacts.'
            : 'Outputs generated via gemini-nano-banana-2.1 represent speculative visual hypotheses for illustration and layout fitting; never treat synthesized imagery as primary photographic archival evidence.'}
        </p>
      </div>

      {/* Main Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column */}
        <section className="lg:col-span-5 bg-[#232C27] border border-[#39443D] rounded-lg p-5 space-y-5">
          {/* Mode Toggle: Edit vs Create */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-md bg-[#151A18] border border-[#39443D]">
            <button
              type="button"
              onClick={() => setStudioMode('edit')}
              className={`py-2 px-3 rounded text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
                studioMode === 'edit'
                  ? 'bg-[#C9A66B] text-[#151A18]'
                  : 'text-[#A9ADA3] hover:text-[#F0E8D8]'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              {isPublic ? 'Restore Existing Photo' : 'Edit / Inpaint Specimen'}
            </button>
            <button
              type="button"
              onClick={() => setStudioMode('generate')}
              className={`py-2 px-3 rounded text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
                studioMode === 'generate'
                  ? 'bg-[#C9A66B] text-[#151A18]'
                  : 'text-[#A9ADA3] hover:text-[#F0E8D8]'
              }`}
            >
              <ImagePlus className="w-3.5 h-3.5" />
              {isPublic ? 'Create From Description' : 'Generate New Plate'}
            </button>
          </div>

          {studioMode === 'edit' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A9ADA3]">Reference Artifact Photograph</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[#C9A66B] hover:underline inline-flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  Upload Custom Photo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleUploadSource(e.target.files?.[0] || null)}
                />
              </div>
              <div className="aspect-[16/9] rounded border border-[#39443D] overflow-hidden bg-[#151A18]">
                <ArtifactImage
                  src={effectiveSourceUrl}
                  alt={activeArtifact.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Prompt Editor & Quick Presets */}
          <div className="space-y-2">
            <label
              htmlFor="image-studio-prompt"
              className="block text-xs font-medium text-[#F0E8D8]"
            >
              {isPublic ? 'Describe what you want to see' : 'Visual Reconstruction Prompt'}
            </label>
            <textarea
              id="image-studio-prompt"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the restoration, lighting, script style, or original context..."
              className="w-full p-3 rounded-md bg-[#151A18] border border-[#39443D] text-xs text-[#F0E8D8] leading-relaxed focus:outline-none focus:border-[#C9A66B]"
            />

            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                {
                  label: isPublic ? 'Fill missing corner' : 'Inpaint damaged corner',
                  text: `Carefully restore the fractured corner of this ${activeArtifact.material.toLowerCase()} piece with weathered ${activeArtifact.scriptFamily} characters matching surrounding erosion.`,
                },
                {
                  label: isPublic ? 'Original painted colors' : 'Polychrome pigment pass',
                  text: `Show how this ${activeArtifact.historicalPeriod} ${activeArtifact.artifactType.toLowerCase()} would appear newly carved with subtle mineral pigments in warm museum light.`,
                },
                {
                  label: isPublic ? 'Raking flashlight relief' : 'High-relief raking scan',
                  text: `Illuminate the inscribed grooves of this ${activeArtifact.artifactType.toLowerCase()} using strong low-angle grazing raking light against deep obsidian background.`,
                },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setPrompt(preset.text)}
                  className="px-2.5 py-1 rounded bg-[#1C2420] border border-[#39443D] hover:border-[#C9A66B] text-[11px] text-[#A9ADA3] hover:text-[#F0E8D8]"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio, Resolution & Search Grounding */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-[#A9ADA3] mb-1">
                Aspect Ratio
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full h-9 px-2.5 rounded bg-[#151A18] border border-[#39443D] text-xs text-[#F0E8D8]"
              >
                <option value="4:3">4:3 (Museum Plate)</option>
                <option value="1:1">1:1 (Square Frame)</option>
                <option value="16:9">16:9 (Widescreen)</option>
                <option value="3:4">3:4 (Stele Portrait)</option>
                <option value="4:1">4:1 (Frieze Banner)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#A9ADA3] mb-1">
                Output Resolution
              </label>
              <select
                value={imageSize}
                onChange={(e) => setImageSize(e.target.value)}
                className="w-full h-9 px-2.5 rounded bg-[#151A18] border border-[#39443D] text-xs text-[#F0E8D8]"
              >
                <option value="1K">1K (Standard)</option>
                <option value="2K">2K (Archival High-Res)</option>
                <option value="4K">4K (Exhibition Print)</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-[#A9ADA3] cursor-pointer">
            <input
              type="checkbox"
              checked={useGoogleSearch}
              onChange={(e) => setUseGoogleSearch(e.target.checked)}
              className="accent-[#C9A66B]"
            />
            <Globe className="w-3.5 h-3.5 text-[#C9A66B]" />
            <span>
              {isPublic
                ? 'Reference real museum imagery via Google Search'
                : 'Ground generation with Google Web & Image Search'}
            </span>
          </label>

          <button
            type="button"
            onClick={handleRunStudio}
            disabled={isGenerating || !prompt.trim()}
            className="w-full h-10 rounded-md bg-[#C9A66B] hover:bg-[#AD8952] text-[#151A18] font-semibold text-xs inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {studioMode === 'edit' ? 'Synthesizing Reconstruction...' : 'Generating Visual...'}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {studioMode === 'edit'
                  ? isPublic
                    ? 'Generate Restored View'
                    : 'Run Visual Edit (nano-banana-2.1)'
                  : isPublic
                    ? 'Create Reconstruction Image'
                    : 'Generate Plate (nano-banana-2.1)'}
              </>
            )}
          </button>

          {errorMsg && (
            <div className="p-3 rounded bg-[#A85D48]/15 border border-[#A85D48]/60 text-xs text-[#F0E8D8] leading-relaxed">
              {errorMsg}
            </div>
          )}
        </section>

        {/* Preview Output Column */}
        <section className="lg:col-span-7 bg-[#232C27] border border-[#39443D] rounded-lg overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-[#39443D] flex items-center justify-between gap-3">
            <h2 className="font-serif text-lg font-medium text-[#F0E8D8]">
              {isPublic ? 'Generated Visual Preview' : 'Synthesized Restoration Output'}
            </h2>
            {generatedUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="px-3 py-1.5 rounded bg-[#151A18] border border-[#39443D] hover:border-[#C9A66B] text-xs text-[#C9A66B] inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download PNG
              </button>
            )}
          </div>

          <div className="flex-1 p-5 flex flex-col justify-center items-center bg-[#151A18]/60 min-h-[420px]">
            {generatedUrl ? (
              <div className="w-full space-y-4">
                <div className="rounded-md overflow-hidden border border-[#C9A66B]/40 bg-[#151A18]">
                  <img
                    src={generatedUrl}
                    alt="AI speculative visual reconstruction"
                    className="w-full max-h-[520px] object-contain mx-auto"
                  />
                </div>
                {modelNotes && (
                  <div className="p-3 rounded bg-[#1C2420] border border-[#39443D] text-xs text-[#A9ADA3]">
                    {modelNotes}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center max-w-md space-y-2.5">
                <Sparkles className="w-8 h-8 text-[#C9A66B]/70 mx-auto" />
                <div className="font-serif text-xl text-[#F0E8D8]">
                  {isPublic
                    ? 'Ready to Visualize Your Artifact'
                    : 'Awaiting Visual Synthesis Prompt'}
                </div>
                <p className="text-xs text-[#A9ADA3] leading-relaxed">
                  {isPublic
                    ? 'Choose whether to repair an existing photograph or paint a fresh historical reconstruction from text, then click Generate.'
                    : 'Select Edit/Inpaint or Generate New Plate on the left, configure aspect ratio and resolution (1K–4K), and invoke gemini-nano-banana-2.1.'}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
