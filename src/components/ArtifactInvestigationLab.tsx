import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { ArtifactRecord, AudienceMode, PageId } from '../types/archaeon';
import { ArtifactImage } from './ArtifactImage';

interface ArtifactInvestigationLabProps {
  artifacts: ArtifactRecord[];
  activeArtifact: ArtifactRecord;
  audienceMode: AudienceMode;
  onSelectArtifact: (id: string) => void;
  onNavigate: (page: PageId) => void;
}

type ViewMode = 'original' | 'enhanced' | 'damage' | 'symbols' | 'reconstructed';

const TECHNICAL_VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: 'original', label: 'Original' },
  { id: 'enhanced', label: 'Enhanced' },
  { id: 'damage', label: 'Damage Heatmap' },
  { id: 'symbols', label: 'Symbol Detection' },
  { id: 'reconstructed', label: 'Reconstructed Image' },
];

const PUBLIC_VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: 'original', label: 'Original Photo' },
  { id: 'damage', label: 'Damaged Areas' },
  { id: 'symbols', label: 'Key Carvings' },
  { id: 'reconstructed', label: 'Translated Overlay' },
];

export const ArtifactInvestigationLab: React.FC<ArtifactInvestigationLabProps> = ({
  artifacts,
  activeArtifact,
  audienceMode,
  onSelectArtifact,
  onNavigate,
}) => {
  const isPublic = audienceMode === 'public';
  const [viewMode, setViewMode] = useState<ViewMode>(isPublic ? 'reconstructed' : 'symbols');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [contrast, setContrast] = useState(105);
  const [brightness, setBrightness] = useState(100);
  const [rakingEnhance, setRakingEnhance] = useState(false);
  const [selectedSymbolId, setSelectedSymbolId] = useState<string | null>(
    activeArtifact.detectedSymbols[0]?.id ?? null
  );
  const [selectedDamageId, setSelectedDamageId] = useState<string | null>(null);
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number } | null>(null);

  const draggingRef = useRef<{ active: boolean; startX: number; startY: number }>({
    active: false,
    startX: 0,
    startY: 0,
  });

  const stageRef = useRef<HTMLDivElement>(null);

  const handleResetOptics = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setContrast(105);
    setBrightness(100);
    setRakingEnhance(false);
  };

  const effectiveContrast =
    viewMode === 'enhanced' || rakingEnhance ? Math.min(200, contrast + 38) : contrast;
  const effectiveBrightness =
    viewMode === 'enhanced' || rakingEnhance ? Math.min(160, brightness + 8) : brightness;
  const effectiveSepia = viewMode === 'enhanced' ? 18 : 0;

  const topHypothesis =
    activeArtifact.hypotheses.find((h) => h.decision === 'accepted') ||
    activeArtifact.hypotheses[0];

  const handleMouseDown = (e: React.MouseEvent) => {
    draggingRef.current = {
      active: true,
      startX: e.clientX - pan.x,
      startY: e.clientY - pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (stageRef.current) {
      const rect = stageRef.current.getBoundingClientRect();
      const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      setCursorCoords({ x: xPct, y: yPct });
    }
    if (!draggingRef.current.active) return;
    setPan({
      x: e.clientX - draggingRef.current.startX,
      y: e.clientY - draggingRef.current.startY,
    });
  };

  const handleMouseUp = () => {
    draggingRef.current.active = false;
  };

  const modes = isPublic ? PUBLIC_VIEW_MODES : TECHNICAL_VIEW_MODES;

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* Top Specimen & Mode Header */}
      <div className="bg-[#1C2420] border border-[#39443D] rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <label htmlFor="lab-artifact-select" className="text-xs text-[#A9ADA3] shrink-0">
            {isPublic ? 'Artifact:' : 'Specimen:'}
          </label>
          <select
            id="lab-artifact-select"
            value={activeArtifact.id}
            onChange={(e) => {
              onSelectArtifact(e.target.value);
              setSelectedSymbolId(null);
              setSelectedDamageId(null);
              handleResetOptics();
            }}
            className="h-9 px-3 rounded bg-[#151A18] border border-[#39443D] text-xs font-medium text-[#F0E8D8] focus:outline-none focus:border-[#C9A66B] max-w-xs"
          >
            {artifacts.map((art) => (
              <option key={art.id} value={art.id}>
                {isPublic ? art.title : `${art.id} — ${art.title}`}
              </option>
            ))}
          </select>
          {!isPublic && (
            <span className="text-xs font-mono text-[#A9ADA3]">
              {activeArtifact.analysisSource === 'live-ai'
                ? 'Live Gemini Multimodal Analysis'
                : 'Demonstration Corpus · Curated Sample'}
            </span>
          )}
        </div>

        {/* Visualization Layer Toggles */}
        <div
          className="flex flex-wrap items-center gap-1 p-1 bg-[#151A18] border border-[#39443D] rounded-md"
          role="tablist"
          aria-label="Visualization overlay modes"
        >
          {modes.map((mode) => {
            const active = viewMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setViewMode(mode.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#C9A66B] text-[#151A18]'
                    : 'text-[#A9ADA3] hover:text-[#F0E8D8] hover:bg-[#232C27]'
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3-Column Scientific / Museum Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANEL: Viewer Controls */}
        <section
          aria-label="Viewer Controls"
          className="lg:col-span-3 bg-[#1C2420] border border-[#39443D] rounded-lg p-5 space-y-5"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#39443D]">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#C9A66B]" />
              <h2 className="font-serif text-lg font-medium text-[#F0E8D8]">
                {isPublic ? 'Viewer Tools' : 'Optical Controls'}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleResetOptics}
              className="text-xs text-[#C9A66B] hover:underline whitespace-nowrap"
            >
              Reset View
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#A9ADA3]">
              {isPublic ? 'Artifact Preview' : 'Reference Plate'}
            </div>
            <div className="relative aspect-[4/3] rounded overflow-hidden border border-[#39443D] bg-[#151A18]">
              <ArtifactImage
                src={activeArtifact.imageUrl}
                alt={activeArtifact.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Zoom & Pan */}
          <div className="space-y-3 pt-2 border-t border-[#39443D]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#A9ADA3]">{isPublic ? 'Zoom In / Out' : 'Magnification'}</span>
              <span className="font-mono tabular-nums text-[#F0E8D8]">{zoom.toFixed(2)}×</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(2)))}
                className="p-2 rounded bg-[#232C27] border border-[#39443D] text-[#F0E8D8] hover:border-[#C9A66B]"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min={0.6}
                max={2.8}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                aria-label="Zoom level"
                className="flex-1 accent-[#C9A66B]"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.8, +(z + 0.2).toFixed(2)))}
                className="p-2 rounded bg-[#232C27] border border-[#39443D] text-[#F0E8D8] hover:border-[#C9A66B]"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-[#A9ADA3]">
              {isPublic
                ? 'Click and drag on the photo to look closely at carved letters.'
                : 'Drag directly on the center plate to pan across epigraphic registers.'}
            </p>
          </div>

          {/* Rotation */}
          <div className="space-y-2.5 pt-2 border-t border-[#39443D]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#A9ADA3]">{isPublic ? 'Rotate Photo' : 'Plate Rotation'}</span>
              <span className="font-mono tabular-nums text-[#F0E8D8]">{rotation}°</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRotation((r) => r - 5)}
                className="p-2 rounded bg-[#232C27] border border-[#39443D] text-[#F0E8D8] hover:border-[#C9A66B]"
                aria-label="Rotate counter-clockwise 5 degrees"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                aria-label="Plate rotation degrees"
                className="flex-1 accent-[#C9A66B]"
              />
              <button
                type="button"
                onClick={() => setRotation((r) => r + 5)}
                className="p-2 rounded bg-[#232C27] border border-[#39443D] text-[#F0E8D8] hover:border-[#C9A66B]"
                aria-label="Rotate clockwise 5 degrees"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Technical Sliders vs Public Brighten Toggle */}
          {isPublic ? (
            <div className="space-y-3 pt-2 border-t border-[#39443D]">
              <button
                type="button"
                onClick={() => setRakingEnhance((prev) => !prev)}
                className={`w-full py-2.5 px-3 rounded-md border text-xs font-medium transition-colors flex items-center justify-between ${
                  rakingEnhance
                    ? 'bg-[#29332E] border-[#C9A66B] text-[#C9A66B]'
                    : 'bg-[#232C27] border-[#39443D] text-[#F0E8D8] hover:border-[#AD8952]'
                }`}
              >
                <span>Make Faint Carvings Clearer</span>
                <span className="font-mono">{rakingEnhance ? 'ON' : 'OFF'}</span>
              </button>
              {activeArtifact.whyItMatters && (
                <div className="p-3.5 rounded bg-[#151A18] border border-[#39443D] space-y-1.5">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#C9A66B]">
                    Why This Matters
                  </div>
                  <p className="text-xs text-[#A9ADA3] leading-relaxed">
                    {activeArtifact.whyItMatters}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 pt-2 border-t border-[#39443D]">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#A9ADA3]">Contrast</span>
                  <span className="font-mono tabular-nums text-[#F0E8D8]">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={200}
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  aria-label="Image contrast"
                  className="w-full accent-[#C9A66B]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#A9ADA3]">Brightness</span>
                  <span className="font-mono tabular-nums text-[#F0E8D8]">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={180}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  aria-label="Image brightness"
                  className="w-full accent-[#C9A66B]"
                />
              </div>

              <button
                type="button"
                onClick={() => setRakingEnhance((prev) => !prev)}
                className={`w-full py-2.5 px-3 rounded-md border text-xs font-medium transition-colors flex items-center justify-between ${
                  rakingEnhance
                    ? 'bg-[#29332E] border-[#C9A66B] text-[#C9A66B]'
                    : 'bg-[#232C27] border-[#39443D] text-[#F0E8D8] hover:border-[#AD8952]'
                }`}
              >
                <span>Raking-Light Groove Enhancement</span>
                <span className="font-mono">{rakingEnhance ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          )}
        </section>

        {/* CENTER PANEL: Main Artifact Visualization Stage */}
        <section
          aria-label="Artifact Visualization Viewport"
          className="lg:col-span-6 bg-[#1C2420] border border-[#39443D] rounded-lg overflow-hidden flex flex-col"
        >
          <div className="px-4 py-3 border-b border-[#39443D] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-[#C9A66B]" />
              <span className="text-[#F0E8D8] font-medium">
                {modes.find((m) => m.id === viewMode)?.label || 'Artifact'} View
              </span>
            </div>
            {!isPublic && (
              <div className="font-mono tabular-nums text-[#A9ADA3]">
                {cursorCoords
                  ? `X ${cursorCoords.x.toFixed(1)}% · Y ${cursorCoords.y.toFixed(1)}%`
                  : 'Hover plate for coordinates'}
              </div>
            )}
          </div>

          <div
            ref={stageRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              handleMouseUp();
              setCursorCoords(null);
            }}
            className="relative aspect-[4/3] w-full bg-[#151A18] overflow-hidden cursor-crosshair select-none flex items-center justify-center"
          >
            <div
              className="relative w-full h-full transition-transform duration-75"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              }}
            >
              <ArtifactImage
                src={activeArtifact.imageUrl}
                alt={activeArtifact.title}
                className="w-full h-full object-contain pointer-events-none"
                style={{
                  filter: `contrast(${effectiveContrast}%) brightness(${effectiveBrightness}%) sepia(${effectiveSepia}%)`,
                }}
              />

              {/* Damage Overlay */}
              {(viewMode === 'damage' || viewMode === 'reconstructed') && (
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  <defs>
                    <pattern
                      id="terracotta-hatch"
                      width="2.5"
                      height="2.5"
                      patternTransform="rotate(45 0 0)"
                      patternUnits="userSpaceOnUse"
                    >
                      <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="2.5"
                        stroke="#A85D48"
                        strokeWidth="0.7"
                        strokeOpacity="0.65"
                      />
                    </pattern>
                  </defs>
                  {activeArtifact.damagedRegions.map((dmg) => {
                    const isSelected = selectedDamageId === dmg.id;
                    return (
                      <rect
                        key={dmg.id}
                        x={dmg.bbox.x}
                        y={dmg.bbox.y}
                        width={dmg.bbox.w}
                        height={dmg.bbox.h}
                        fill={
                          viewMode === 'damage'
                            ? 'url(#terracotta-hatch)'
                            : 'rgba(168, 93, 72, 0.18)'
                        }
                        stroke="#A85D48"
                        strokeWidth={isSelected ? 0.8 : 0.45}
                        strokeDasharray="1.5 1"
                      />
                    );
                  })}
                </svg>
              )}

              {/* Symbol Segmentation Overlay */}
              {viewMode === 'symbols' && (
                <div className="absolute inset-0">
                  {activeArtifact.detectedSymbols.map((sym) => {
                    const isSelected = selectedSymbolId === sym.id;
                    return (
                      <button
                        key={sym.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSymbolId(sym.id);
                        }}
                        style={{
                          left: `${sym.bbox.x}%`,
                          top: `${sym.bbox.y}%`,
                          width: `${sym.bbox.w}%`,
                          height: `${sym.bbox.h}%`,
                        }}
                        title={`${sym.glyph}`}
                        className={`absolute border transition-colors ${
                          isSelected
                            ? 'border-[#C9A66B] bg-[#C9A66B]/20 ring-1 ring-[#C9A66B]'
                            : 'border-[#456B58] bg-[#456B58]/15 hover:border-[#C9A66B]'
                        }`}
                      >
                        <span className="absolute -top-4 left-0 px-1 bg-[#151A18]/90 text-[9px] font-mono text-[#F0E8D8] whitespace-nowrap">
                          {isPublic ? sym.phoneticValue.split('(')[0] : `L${sym.lineNumber} · ${sym.confidence}%`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Reconstructed / Translated Overlay */}
              {viewMode === 'reconstructed' && topHypothesis && (
                <div className="absolute inset-x-4 bottom-4 bg-[#151A18]/92 border border-[#C9A66B]/70 rounded-md p-3.5 backdrop-blur-xs">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#C9A66B]">
                      {isPublic
                        ? 'Suggested English Meaning (Educated Guess)'
                        : `Projected Reconstruction Overlay · ${topHypothesis.confidenceEstimate}% Est.`}
                    </span>
                    {!isPublic && (
                      <span className="text-[10px] font-mono text-[#A9ADA3]">
                        Hypothesis #{topHypothesis.rank}
                      </span>
                    )}
                  </div>
                  <div className="font-serif text-sm sm:text-base text-[#F0E8D8] leading-snug">
                    {isPublic
                      ? topHypothesis.plainEnglishTranslation || topHypothesis.explanation
                      : topHypothesis.manualEditText || topHypothesis.reconstructedText}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-[#39443D] bg-[#232C27]/50 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#A9ADA3] max-w-lg leading-relaxed">
              {isPublic
                ? activeArtifact.plainEnglishStory || activeArtifact.summary
                : activeArtifact.summary}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('restoration')}
              className="px-4 py-2 rounded-md bg-[#C9A66B] hover:bg-[#AD8952] text-[#151A18] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              {isPublic ? 'Read Missing Words & Theories' : 'Open Restoration Studio'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* RIGHT PANEL: Metadata & Plain-English vs Technical Breakdown */}
        <section
          aria-label="Artifact Information"
          className="lg:col-span-3 bg-[#1C2420] border border-[#39443D] rounded-lg p-5 space-y-5"
        >
          <div className="pb-3 border-b border-[#39443D]">
            <div className="text-[11px] font-mono text-[#C9A66B] uppercase tracking-wider">
              {isPublic ? activeArtifact.civilization : activeArtifact.id}
            </div>
            <h2 className="font-serif text-xl font-medium text-[#F0E8D8] mt-0.5">
              {activeArtifact.title}
            </h2>
          </div>

          <dl className="space-y-2 text-xs">
            <div className="flex justify-between gap-2 py-1 border-b border-[#39443D]/60">
              <dt className="text-[#A9ADA3]">{isPublic ? 'Writing System' : 'Script Family'}</dt>
              <dd className="text-[#F0E8D8] text-right font-medium">
                {activeArtifact.scriptFamily}
              </dd>
            </div>
            <div className="flex justify-between gap-2 py-1 border-b border-[#39443D]/60">
              <dt className="text-[#A9ADA3]">{isPublic ? 'Age / Era' : 'Historical Period'}</dt>
              <dd className="text-[#F0E8D8] text-right">
                {activeArtifact.historicalPeriod} ({activeArtifact.dateRange})
              </dd>
            </div>
            <div className="flex justify-between gap-2 py-1 border-b border-[#39443D]/60">
              <dt className="text-[#A9ADA3]">{isPublic ? 'Made Of' : 'Material'}</dt>
              <dd className="text-[#F0E8D8] text-right">{activeArtifact.material}</dd>
            </div>
            <div className="flex justify-between gap-2 py-1 border-b border-[#39443D]/60">
              <dt className="text-[#A9ADA3]">{isPublic ? 'Where Found' : 'Provenance'}</dt>
              <dd className="text-[#F0E8D8] text-right">{activeArtifact.location}</dd>
            </div>
          </dl>

          {!isPublic && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A9ADA3]">Segmentation Coverage</span>
                <span className="font-mono tabular-nums text-[#456B58]">100% Complete</span>
              </div>
              <div className="h-1.5 w-full bg-[#151A18] rounded-full overflow-hidden">
                <div className="h-full bg-[#456B58] w-full" />
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[#A9ADA3]">Mean Recognition Estimate</span>
                <span className="font-mono tabular-nums text-[#C9A66B]">
                  {activeArtifact.overallConfidenceEstimate}% (Model Est.)
                </span>
              </div>
            </div>
          )}

          {/* Symbols / Key Carved Phrases */}
          <div className="space-y-2.5 pt-2 border-t border-[#39443D]">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#A9ADA3]">
              {isPublic
                ? `What Scholars Can Read (${activeArtifact.detectedSymbols.length})`
                : `Detected Symbols (${activeArtifact.detectedSymbols.length})`}
            </h3>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {activeArtifact.detectedSymbols.map((sym) => {
                const selected = selectedSymbolId === sym.id;
                return (
                  <button
                    key={sym.id}
                    type="button"
                    onClick={() => {
                      setSelectedSymbolId(sym.id);
                      setViewMode('symbols');
                    }}
                    className={`w-full text-left p-2.5 rounded border transition-colors ${
                      selected
                        ? 'bg-[#29332E] border-[#C9A66B]'
                        : 'bg-[#232C27] border-[#39443D] hover:border-[#AD8952]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-serif text-sm font-semibold text-[#F0E8D8] truncate">
                        {sym.glyph}
                      </span>
                      {!isPublic && (
                        <span className="text-[11px] font-mono tabular-nums text-[#456B58] inline-flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          {sym.confidence}%
                        </span>
                      )}
                    </div>
                    {!isPublic && (
                      <div className="text-[11px] font-mono text-[#C9A66B] mt-0.5 truncate">
                        {sym.transliteration}
                      </div>
                    )}
                    <div className="text-[11px] text-[#A9ADA3] mt-1 leading-snug">
                      {sym.phoneticValue}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Damaged Regions */}
          <div className="space-y-2.5 pt-2 border-t border-[#39443D]">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#A9ADA3]">
              {isPublic
                ? `Where the Surface Is Worn (${activeArtifact.damagedRegions.length})`
                : `Damaged Regions (${activeArtifact.damagedRegions.length})`}
            </h3>
            <div className="space-y-2">
              {activeArtifact.damagedRegions.map((dmg) => {
                const selected = selectedDamageId === dmg.id;
                return (
                  <button
                    key={dmg.id}
                    type="button"
                    onClick={() => {
                      setSelectedDamageId(dmg.id);
                      setViewMode('damage');
                    }}
                    className={`w-full text-left p-2.5 rounded border transition-colors ${
                      selected
                        ? 'bg-[#29332E] border-[#A85D48]'
                        : 'bg-[#232C27] border-[#39443D] hover:border-[#A85D48]/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[#F0E8D8] inline-flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-[#A85D48] shrink-0" />
                        {dmg.label}
                      </span>
                      {!isPublic && (
                        <span className="text-[11px] font-mono tabular-nums text-[#A85D48] shrink-0">
                          {dmg.areaPercent}% area
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#A9ADA3] mt-1 leading-snug">
                      {isPublic ? dmg.description : `${dmg.damageType} · ${dmg.severity} Severity — ${dmg.description}`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
