import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Layers,
  Loader2,
  RotateCw,
  ScanLine,
  Upload,
} from 'lucide-react';
import type { AudienceMode, FragmentMatchSuggestion } from '../types/archaeon';
import { ArtifactImage } from './ArtifactImage';

interface FragmentMatchingLaboratoryProps {
  suggestions: FragmentMatchSuggestion[];
  audienceMode: AudienceMode;
}

function renderSobelEdgeCanvas(imageSrc: string, canvas: HTMLCanvasElement | null) {
  if (!canvas || !imageSrc) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const w = 320;
    const h = 240;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);

    try {
      const srcData = ctx.getImageData(0, 0, w, h);
      const outData = ctx.createImageData(w, h);
      const d = srcData.data;
      const out = outData.data;

      const gray = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) {
        gray[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
      }

      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          const gx =
            -gray[(y - 1) * w + (x - 1)] +
            gray[(y - 1) * w + (x + 1)] -
            2 * gray[y * w + (x - 1)] +
            2 * gray[y * w + (x + 1)] -
            gray[(y + 1) * w + (x - 1)] +
            gray[(y + 1) * w + (x + 1)];

          const gy =
            -gray[(y - 1) * w + (x - 1)] -
            2 * gray[(y - 1) * w + x] -
            gray[(y - 1) * w + (x + 1)] +
            gray[(y + 1) * w + (x - 1)] +
            2 * gray[(y + 1) * w + x] +
            gray[(y + 1) * w + (x + 1)];

          const mag = Math.min(255, Math.sqrt(gx * gx + gy * gy));
          const p = idx * 4;
          if (mag > 42) {
            out[p] = 201;
            out[p + 1] = 166;
            out[p + 2] = 107;
            out[p + 3] = Math.min(255, Math.round(mag * 1.15));
          } else {
            out[p] = 21;
            out[p + 1] = 26;
            out[p + 2] = 24;
            out[p + 3] = 255;
          }
        }
      }
      ctx.putImageData(outData, 0, 0);
    } catch {
      ctx.fillStyle = '#151A18';
      ctx.fillRect(0, 0, w, h);
    }
  };
  img.src = imageSrc;
}

export const FragmentMatchingLaboratory: React.FC<FragmentMatchingLaboratoryProps> = ({
  suggestions,
  audienceMode,
}) => {
  const isPublic = audienceMode === 'public';
  const [selectedPairId, setSelectedPairId] = useState(suggestions[0].id);
  const selectedPair =
    suggestions.find((s) => s.id === selectedPairId) || suggestions[0];

  const [customImageA, setCustomImageA] = useState<string | null>(null);
  const [customImageB, setCustomImageB] = useState<string | null>(null);
  const [edgeDetectEnabled, setEdgeDetectEnabled] = useState(!isPublic);
  const [offsetX, setOffsetX] = useState(selectedPair.suggestedOffset.x);
  const [offsetY, setOffsetY] = useState(selectedPair.suggestedOffset.y);
  const [rotationDeg, setRotationDeg] = useState(selectedPair.suggestedOffset.rotationDeg);
  const [overlayOpacity, setOverlayOpacity] = useState(65);
  const [isComparing, setIsComparing] = useState(false);
  const [liveComparison, setLiveComparison] = useState<{
    overallSimilarityScore: number;
    edgeContourScore: number;
    surfaceTextureScore: number;
    strokeContinuityScore: number;
    computationalRationale: string;
  } | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);

  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);

  const imgASrc = customImageA || selectedPair.fragmentA.imageUrl;
  const imgBSrc = customImageB || selectedPair.fragmentB.imageUrl;

  useEffect(() => {
    if (edgeDetectEnabled) {
      renderSobelEdgeCanvas(imgASrc, canvasARef.current);
      renderSobelEdgeCanvas(imgBSrc, canvasBRef.current);
    }
  }, [imgASrc, imgBSrc, edgeDetectEnabled]);

  const handleUploadFragment = (
    slot: 'A' | 'B',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        if (slot === 'A') setCustomImageA(reader.result);
        else setCustomImageB(reader.result);
        setLiveComparison(null);
        setCompareError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPair = (pair: FragmentMatchSuggestion) => {
    setSelectedPairId(pair.id);
    setCustomImageA(null);
    setCustomImageB(null);
    setLiveComparison(null);
    setCompareError(null);
    setOffsetX(pair.suggestedOffset.x);
    setOffsetY(pair.suggestedOffset.y);
    setRotationDeg(pair.suggestedOffset.rotationDeg);
  };

  const handleRunLiveComparison = async () => {
    setCompareError(null);
    if (!customImageA || !customImageB) {
      setCompareError(
        'Upload custom Fragment A and Fragment B images to run live comparison scoring, or inspect the pre-computed candidate pairs below.'
      );
      return;
    }

    setIsComparing(true);
    try {
      const response = await fetch('/api/match-fragments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageA: customImageA,
          imageB: customImageB,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setCompareError(payload.message || 'Live fragment comparison unavailable.');
      } else {
        setLiveComparison(payload.comparison);
      }
    } catch (err) {
      setCompareError(
        err instanceof Error ? err.message : 'Unable to reach fragment matching service.'
      );
    } finally {
      setIsComparing(false);
    }
  };

  const metrics = liveComparison || {
    overallSimilarityScore: selectedPair.overallSimilarityScore,
    edgeContourScore: selectedPair.edgeContourScore,
    surfaceTextureScore: selectedPair.surfaceTextureScore,
    strokeContinuityScore: selectedPair.strokeContinuityScore,
    computationalRationale: selectedPair.computationalRationale,
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#39443D]">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#F0E8D8]">
            {isPublic ? 'Artifact Fragment Puzzle' : 'Fragment Matching Laboratory'}
          </h1>
          <p className="text-xs text-[#A9ADA3] mt-1">
            {isPublic
              ? 'Slide and rotate broken pieces to see whether carved lines and stone edges might line up'
              : 'Fracture contour extraction, mineral texture comparison, and geometric alignment testing'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEdgeDetectEnabled((prev) => !prev)}
            className={`h-9 px-3.5 rounded border text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap ${
              edgeDetectEnabled
                ? 'bg-[#29332E] border-[#C9A66B] text-[#C9A66B]'
                : 'bg-[#1C2420] border-[#39443D] text-[#F0E8D8]'
            }`}
          >
            <ScanLine className="w-3.5 h-3.5" />
            {isPublic
              ? `Outline Mode: ${edgeDetectEnabled ? 'On' : 'Off'}`
              : `Sobel Edge Detection: ${edgeDetectEnabled ? 'Active' : 'Off'}`}
          </button>

          <button
            type="button"
            onClick={handleRunLiveComparison}
            disabled={isComparing}
            className="h-9 px-4 rounded bg-[#C9A66B] hover:bg-[#AD8952] text-[#151A18] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            {isComparing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Layers className="w-3.5 h-3.5" />
            )}
            {isPublic ? 'Check Visual Fit' : 'Score Fragment Compatibility'}
          </button>
        </div>
      </div>

      {/* Mandatory Epistemic Disclaimer */}
      <div className="bg-[#1C2420] border border-[#A85D48]/50 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-[#A85D48] shrink-0 mt-0.5" />
        <p className="text-xs text-[#F0E8D8] leading-relaxed">
          {isPublic ? (
            <>
              <span className="font-semibold text-[#C9A66B]">Important Note:</span> Even when two
              broken pieces look like a match on screen, visual similarity is only a clue—only a
              conservator holding the real stones can confirm they physically fit together.
            </>
          ) : (
            <>
              <span className="font-semibold text-[#C9A66B]">Methodological Caveat:</span> Edge
              contour, surface grain, and stroke continuity scores are computational suggestions
              only—not proof that two fragments physically belong together. Physical join
              confirmation requires tactile conservation inspection of internal fracture topography.
            </>
          )}
        </p>
      </div>

      {compareError && (
        <div className="bg-[#232C27] border border-[#A85D48] rounded-lg p-3.5 text-xs text-[#F0E8D8]">
          {compareError}
        </div>
      )}

      {/* Candidate Pair Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suggestions.map((pair) => {
          const active = pair.id === selectedPairId && !customImageA && !customImageB;
          return (
            <button
              key={pair.id}
              type="button"
              onClick={() => handleSelectPair(pair)}
              className={`text-left p-4 rounded-lg border transition-colors flex items-center justify-between gap-4 ${
                active
                  ? 'bg-[#232C27] border-[#C9A66B]'
                  : 'bg-[#1C2420] border-[#39443D] hover:border-[#AD8952]'
              }`}
            >
              <div className="min-w-0">
                <div className="text-sm font-serif font-semibold text-[#F0E8D8] truncate">
                  {pair.title}
                </div>
                <div className="text-xs text-[#A9ADA3] mt-0.5 truncate">
                  {pair.fragmentA.label} ↔ {pair.fragmentB.label}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div
                  className={`font-mono text-lg font-semibold tabular-nums ${
                    pair.overallSimilarityScore >= 70 ? 'text-[#456B58]' : 'text-[#A85D48]'
                  }`}
                >
                  {pair.overallSimilarityScore}%
                </div>
                <div className="text-[10px] font-mono text-[#A9ADA3]">Similarity Est.</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Dual Fragment Comparison + Sobel Edge Contours */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fragment A */}
        <div className="bg-[#1C2420] border border-[#39443D] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-mono text-[#C9A66B]">FRAGMENT A</div>
              <h2 className="font-serif text-lg font-medium text-[#F0E8D8]">
                {customImageA ? 'Uploaded Fragment A' : selectedPair.fragmentA.label}
              </h2>
            </div>
            <label className="px-3 py-1.5 rounded bg-[#232C27] hover:bg-[#29332E] border border-[#39443D] text-xs text-[#F0E8D8] cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap">
              <Upload className="w-3.5 h-3.5 text-[#C9A66B]" />
              Upload A
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadFragment('A', e)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono text-[#A9ADA3]">Optical Plate</div>
              <div className="aspect-[4/3] rounded overflow-hidden border border-[#39443D] bg-[#151A18]">
                <ArtifactImage
                  src={imgASrc}
                  alt="Fragment A"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono text-[#A9ADA3]">Sobel Fracture Contour</div>
              <div className="aspect-[4/3] rounded overflow-hidden border border-[#39443D] bg-[#151A18] flex items-center justify-center">
                {edgeDetectEnabled ? (
                  <canvas ref={canvasARef} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-[#A9ADA3]">Edge filter disabled</span>
                )}
              </div>
            </div>
          </div>

          <div className="text-xs text-[#A9ADA3] flex flex-wrap gap-4 pt-1 border-t border-[#39443D]">
            <span>Material: {selectedPair.fragmentA.material}</span>
            <span className="font-mono tabular-nums">
              Thickness: {selectedPair.fragmentA.thicknessMm} mm
            </span>
            <span className="font-mono tabular-nums">
              Fracture Angle: {selectedPair.fragmentA.fractureAngleDeg}°
            </span>
          </div>
        </div>

        {/* Fragment B */}
        <div className="bg-[#1C2420] border border-[#39443D] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-mono text-[#C9A66B]">FRAGMENT B</div>
              <h2 className="font-serif text-lg font-medium text-[#F0E8D8]">
                {customImageB ? 'Uploaded Fragment B' : selectedPair.fragmentB.label}
              </h2>
            </div>
            <label className="px-3 py-1.5 rounded bg-[#232C27] hover:bg-[#29332E] border border-[#39443D] text-xs text-[#F0E8D8] cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap">
              <Upload className="w-3.5 h-3.5 text-[#C9A66B]" />
              Upload B
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadFragment('B', e)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono text-[#A9ADA3]">Optical Plate</div>
              <div className="aspect-[4/3] rounded overflow-hidden border border-[#39443D] bg-[#151A18]">
                <ArtifactImage
                  src={imgBSrc}
                  alt="Fragment B"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono text-[#A9ADA3]">Sobel Fracture Contour</div>
              <div className="aspect-[4/3] rounded overflow-hidden border border-[#39443D] bg-[#151A18] flex items-center justify-center">
                {edgeDetectEnabled ? (
                  <canvas ref={canvasBRef} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-[#A9ADA3]">Edge filter disabled</span>
                )}
              </div>
            </div>
          </div>

          <div className="text-xs text-[#A9ADA3] flex flex-wrap gap-4 pt-1 border-t border-[#39443D]">
            <span>Material: {selectedPair.fragmentB.material}</span>
            <span className="font-mono tabular-nums">
              Thickness: {selectedPair.fragmentB.thicknessMm} mm
            </span>
            <span className="font-mono tabular-nums">
              Fracture Angle: {selectedPair.fragmentB.fractureAngleDeg}°
            </span>
          </div>
        </div>
      </section>

      {/* Interactive Alignment Workbench + Similarity Telemetry */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-[#1C2420] border border-[#39443D] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#39443D] pb-3">
            <h2 className="font-serif text-xl font-medium text-[#F0E8D8]">
              Interactive Geometric Alignment Overlay
            </h2>
            <button
              type="button"
              onClick={() => {
                setOffsetX(selectedPair.suggestedOffset.x);
                setOffsetY(selectedPair.suggestedOffset.y);
                setRotationDeg(selectedPair.suggestedOffset.rotationDeg);
                setOverlayOpacity(65);
              }}
              className="text-xs text-[#C9A66B] hover:underline whitespace-nowrap"
            >
              Snap to Suggested Offset
            </button>
          </div>

          <div className="relative aspect-[16/9] rounded bg-[#151A18] border border-[#39443D] overflow-hidden flex items-center justify-center">
            <ArtifactImage
              src={imgASrc}
              alt="Base Fragment A"
              className="w-3/4 h-3/4 object-contain"
            />
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotationDeg}deg)`,
                opacity: overlayOpacity / 100,
              }}
            >
              <ArtifactImage
                src={imgBSrc}
                alt="Overlay Fragment B"
                className="w-3/4 h-3/4 object-contain border border-[#C9A66B]/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-[#A9ADA3]">
                <span>X Offset</span>
                <span className="font-mono tabular-nums text-[#F0E8D8]">{offsetX}px</span>
              </div>
              <input
                type="range"
                min={-120}
                max={120}
                value={offsetX}
                onChange={(e) => setOffsetX(Number(e.target.value))}
                className="w-full accent-[#C9A66B]"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-[#A9ADA3]">
                <span>Y Offset</span>
                <span className="font-mono tabular-nums text-[#F0E8D8]">{offsetY}px</span>
              </div>
              <input
                type="range"
                min={-120}
                max={120}
                value={offsetY}
                onChange={(e) => setOffsetY(Number(e.target.value))}
                className="w-full accent-[#C9A66B]"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-[#A9ADA3]">
                <span className="inline-flex items-center gap-1">
                  <RotateCw className="w-3 h-3" /> Angle
                </span>
                <span className="font-mono tabular-nums text-[#F0E8D8]">{rotationDeg}°</span>
              </div>
              <input
                type="range"
                min={-45}
                max={45}
                step={0.5}
                value={rotationDeg}
                onChange={(e) => setRotationDeg(Number(e.target.value))}
                className="w-full accent-[#C9A66B]"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-[#A9ADA3]">
                <span>Blend Opacity</span>
                <span className="font-mono tabular-nums text-[#F0E8D8]">{overlayOpacity}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                className="w-full accent-[#C9A66B]"
              />
            </div>
          </div>
        </div>

        {/* Computational Similarity Breakdown */}
        <div className="lg:col-span-5 bg-[#232C27] border border-[#39443D] rounded-lg p-5 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#39443D]">
              <h2 className="font-serif text-xl font-medium text-[#F0E8D8]">
                Computational Match Indices
              </h2>
              <span className="font-mono text-xl font-semibold tabular-nums text-[#C9A66B]">
                {metrics.overallSimilarityScore}%
              </span>
            </div>

            {[
              { label: 'Fracture Edge Profile Match', score: metrics.edgeContourScore },
              { label: 'Surface Grain & Texture Similarity', score: metrics.surfaceTextureScore },
              { label: 'Epigraphic Stroke Continuity', score: metrics.strokeContinuityScore },
            ].map((bar) => (
              <div key={bar.label} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#F0E8D8]">{bar.label}</span>
                  <span className="font-mono tabular-nums text-[#C9A66B]">{bar.score}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#151A18] overflow-hidden">
                  <div
                    className={`h-full ${
                      bar.score >= 70 ? 'bg-[#456B58]' : 'bg-[#A85D48]'
                    }`}
                    style={{ width: `${bar.score}%` }}
                  />
                </div>
              </div>
            ))}

            <div className="p-4 rounded bg-[#1C2420] border border-[#39443D] space-y-1.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#A9ADA3]">
                Suggested Fragment Connection Rationale
              </div>
              <p className="text-xs text-[#F0E8D8] leading-relaxed">
                {metrics.computationalRationale}
              </p>
            </div>
          </div>

          <div className="text-[11px] font-mono text-[#A85D48] pt-3 border-t border-[#39443D]">
            Reminder: Similarity indices are non-binding computational hypotheses.
          </div>
        </div>
      </section>
    </div>
  );
};
