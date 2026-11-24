import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  FileImage,
  Loader2,
  Microscope,
  UploadCloud,
  Users,
  Wrench,
} from 'lucide-react';
import type { ArtifactRecord, AudienceMode, PageId } from '../types/archaeon';
import { ARTIFACT_TYPES, SCRIPT_FAMILIES } from '../data/archaeonCorpus';
import { ArtifactImage } from './ArtifactImage';

interface LandingDashboardProps {
  artifacts: ArtifactRecord[];
  audienceMode: AudienceMode;
  onChangeAudienceMode: (mode: AudienceMode) => void;
  onSelectArtifact: (artifactId: string) => void;
  onNavigate: (page: PageId) => void;
  onAddAnalyzedArtifact: (artifact: ArtifactRecord) => void;
  geminiConfigured: boolean | null;
}

export const LandingDashboard: React.FC<LandingDashboardProps> = ({
  artifacts,
  audienceMode,
  onChangeAudienceMode,
  onSelectArtifact,
  onNavigate,
  onAddAnalyzedArtifact,
  geminiConfigured,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);
  const [isTiffUpload, setIsTiffUpload] = useState(false);
  const [specimenTitle, setSpecimenTitle] = useState('');
  const [scriptFamily, setScriptFamily] = useState(SCRIPT_FAMILIES[0]);
  const [artifactType, setArtifactType] = useState(ARTIFACT_TYPES[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<{
    code: string;
    message: string;
  } | null>(null);

  const totalRestorations = artifacts.reduce((acc, a) => acc + a.hypotheses.length, 0);
  const uniqueCivilizations = Array.from(new Set(artifacts.map((a) => a.civilization)));
  const isPublic = audienceMode === 'public';

  const handleFileSelected = (file: File) => {
    setAnalysisError(null);
    const lowerName = file.name.toLowerCase();
    const isValid =
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.tif') ||
      lowerName.endsWith('.tiff') ||
      lowerName.endsWith('.webp');

    if (!isValid) {
      setAnalysisError({
        code: 'UNSUPPORTED_FORMAT',
        message: 'Please select a JPG, PNG, WebP, or TIFF archaeological photograph.',
      });
      return;
    }

    const tiffFlag = lowerName.endsWith('.tif') || lowerName.endsWith('.tiff');
    setIsTiffUpload(tiffFlag);
    setUploadedFileName(file.name);
    if (!specimenTitle) {
      setSpecimenTitle(file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelected(file);
  };

  const runDemoInvestigation = () => {
    if (uploadedPreviewUrl) {
      const newId = `ARC-DEMO-${String(artifacts.length + 1).padStart(3, '0')}`;
      const baseline = artifacts[0];
      const demoRecord: ArtifactRecord = {
        ...baseline,
        id: newId,
        title: specimenTitle.trim() || uploadedFileName || 'Uploaded Field Specimen',
        scriptFamily,
        artifactType,
        imageUrl: isTiffUpload ? baseline.imageUrl : uploadedPreviewUrl,
        restorationStatus: 'Newly Uploaded',
        analysisSource: 'demonstration',
        analyzedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
        summary:
          'Demonstration Mode workspace created from uploaded specimen metadata. Epigraphic overlays and hypotheses below illustrate structural layout using comparative baseline parameters.',
        plainEnglishStory:
          'Preview workspace created from your uploaded photograph using our museum demonstration guide.',
        researcherCorrections: [],
      };
      onAddAnalyzedArtifact(demoRecord);
      onSelectArtifact(demoRecord.id);
      onNavigate('investigation');
      return;
    }
    onSelectArtifact(artifacts[0].id);
    onNavigate('investigation');
  };

  const handleBeginInvestigation = async () => {
    setAnalysisError(null);

    if (!uploadedPreviewUrl) {
      onSelectArtifact(artifacts[0].id);
      onNavigate('investigation');
      return;
    }

    if (isTiffUpload) {
      setAnalysisError({
        code: 'TIFF_CONVERSION_NOTE',
        message:
          'Raw archival TIFF files require server-side raster decoding when live AI is enabled, or you may inspect the layout immediately in Demonstration Mode.',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze-artifact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: uploadedPreviewUrl,
          title: specimenTitle || uploadedFileName,
          scriptFamily,
          artifactType,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setAnalysisError({
          code: payload.error || 'ANALYSIS_ERROR',
          message:
            payload.message ||
            'Unable to complete live multimodal analysis. Check server configuration or open Demonstration Mode.',
        });
        setIsAnalyzing(false);
        return;
      }

      const aiData = payload.analysis;
      const newId = `ARC-LIVE-${String(artifacts.length + 1).padStart(3, '0')}`;
      const newArtifact: ArtifactRecord = {
        id: newId,
        title: aiData.title || specimenTitle || 'Analyzed Field Specimen',
        scriptFamily: aiData.scriptFamily || scriptFamily,
        artifactType,
        civilization: aiData.civilization || 'Pending Attribution',
        language: aiData.language || 'Under Analysis',
        historicalPeriod: aiData.historicalPeriod || 'Undetermined',
        dateRange: aiData.dateRange || 'Pending Dating',
        location: aiData.location || 'Field Upload',
        material: aiData.material || 'Unverified Substrate',
        dimensions: 'Scaled from photograph',
        museumCollection: 'Researcher Upload Session',
        accessionReference: 'Session Upload · Requires Physical Archival Collation',
        imageUrl: uploadedPreviewUrl,
        restorationStatus: 'Hypotheses Pending',
        analysisSource: 'live-ai',
        summary: aiData.summary || 'Multimodal epigraphic scan completed.',
        plainEnglishStory: aiData.summary || 'AI-guided reading prepared from your photograph.',
        overallConfidenceEstimate: Number(aiData.overallConfidenceEstimate) || 72,
        analyzedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
        detectedSymbols: (aiData.detectedSymbols || []).map((s: any, idx: number) => ({
          id: `sym-live-${idx + 1}`,
          glyph: s.glyph || '?',
          transliteration: s.transliteration || '',
          phoneticValue: s.phoneticValue || '',
          lineNumber: Number(s.lineNumber) || 1,
          confidence: Number(s.confidence) || 70,
          bbox: {
            x: Math.max(2, Math.min(85, Number(s.x) || 20)),
            y: Math.max(2, Math.min(85, Number(s.y) || 20)),
            w: Math.max(6, Math.min(50, Number(s.w) || 20)),
            h: Math.max(4, Math.min(25, Number(s.h) || 8)),
          },
          notes: s.notes || '',
        })),
        damagedRegions: (aiData.damagedRegions || []).map((d: any, idx: number) => ({
          id: `dmg-live-${idx + 1}`,
          label: d.label || `Damaged Zone ${idx + 1}`,
          damageType: d.damageType || 'Abrasion',
          severity: d.severity || 'Moderate',
          areaPercent: Number(d.areaPercent) || 10,
          bbox: {
            x: Math.max(2, Math.min(85, Number(d.x) || 30)),
            y: Math.max(2, Math.min(85, Number(d.y) || 30)),
            w: Math.max(8, Math.min(60, Number(d.w) || 22)),
            h: Math.max(6, Math.min(40, Number(d.h) || 15)),
          },
          description: d.description || '',
        })),
        transcriptionLines: (aiData.transcriptionLines || []).map((l: any, idx: number) => ({
          lineNumber: Number(l.lineNumber) || idx + 1,
          originalText: l.originalText || '',
          lacunaCount: Number(l.lacunaCount) || 0,
          paleographicNote: l.paleographicNote || '',
        })),
        hypotheses: (aiData.hypotheses || []).slice(0, 3).map((h: any, idx: number) => ({
          id: `hyp-live-${idx + 1}`,
          rank: ((idx + 1) as 1 | 2 | 3),
          title: h.title || `Hypothesis ${idx + 1}`,
          reconstructedText: h.reconstructedText || '',
          plainEnglishTranslation: h.explanation || h.reconstructedText || '',
          predictedCharacters: h.predictedCharacters || '',
          confidenceEstimate: Number(h.confidenceEstimate) || 65,
          epistemicNote:
            h.epistemicNote ||
            'Uncalibrated computational model estimate; requires independent epigraphic verification.',
          supportingEvidence: h.supportingEvidence || [],
          similarReferences: h.similarReferences || [],
          explanation: h.explanation || '',
          decision: 'pending',
        })),
        researcherCorrections: [],
      };

      onAddAnalyzedArtifact(newArtifact);
      onSelectArtifact(newArtifact.id);
      onNavigate('investigation');
    } catch (err) {
      setAnalysisError({
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Network error reaching analysis server.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-8 lg:py-10 space-y-12">
      {/* Audience Mode Selector Banner */}
      <section className="bg-[#1C2420] border border-[#39443D] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="text-xs font-medium text-[#F0E8D8]">
            {isPublic
              ? 'Public Explorer View — Designed for curious visitors, students, and story-led discovery'
              : 'Technical Lab View — Designed for epigraphers, archaeologists, and paleographic researchers'}
          </div>
          <p className="text-xs text-[#A9ADA3]">
            {isPublic
              ? 'Plain-English translations, cultural context, and simplified visual tools. Switch to Technical Lab anytime for coordinates, brackets, and CV overlays.'
              : 'Full optical calibration, bounding-box telemetry, uncalibrated confidence scores, ontology graphs, and Sobel fracture analysis.'}
          </p>
        </div>

        <div
          className="inline-flex items-center gap-1 p-1 rounded-md bg-[#151A18] border border-[#39443D] shrink-0"
          role="group"
          aria-label="Choose experience view"
        >
          <button
            type="button"
            onClick={() => onChangeAudienceMode('public')}
            className={`px-3.5 py-2 rounded text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              isPublic
                ? 'bg-[#C9A66B] text-[#151A18]'
                : 'text-[#A9ADA3] hover:text-[#F0E8D8]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Common / Public View
          </button>
          <button
            type="button"
            onClick={() => onChangeAudienceMode('technical')}
            className={`px-3.5 py-2 rounded text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              !isPublic
                ? 'bg-[#C9A66B] text-[#151A18]'
                : 'text-[#A9ADA3] hover:text-[#F0E8D8]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Technical View
          </button>
        </div>
      </section>

      {/* Hero + Artifact Ingestion Workbench */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Editorial Left Column */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="text-xs font-mono uppercase tracking-widest text-[#C9A66B]">
              {isPublic ? 'Interactive Museum & Story Guide' : 'Epigraphic Research Laboratory'}
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#F0E8D8] leading-[1.08] text-balance">
              Discover What History Left Behind.
            </h1>
            <p className="text-base text-[#A9ADA3] leading-relaxed max-w-prose">
              {isPublic
                ? 'Explore ancient carved stones and clay tablets in plain English—see what survived, how scholars fill in missing words, and why each artifact shaped our world.'
                : 'Reconstruct damaged inscriptions, uncover historical connections and explore the lost knowledge of ancient civilizations.'}
            </p>
          </div>

          {/* Curated Featured Specimen Quick Launch */}
          <div className="bg-[#1C2420] border border-[#39443D] rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#A9ADA3] uppercase tracking-wider">
                {isPublic ? 'Featured Museum Story' : 'Featured Demonstration Specimen'}
              </span>
              <span className="text-xs font-mono text-[#C9A66B] tabular-nums">
                {isPublic ? artifacts[0].dateRange : artifacts[0].id}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <ArtifactImage
                src={artifacts[0].imageUrl}
                alt={artifacts[0].title}
                className="w-20 h-16 rounded object-cover border border-[#39443D] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-[#F0E8D8] truncate">
                  {artifacts[0].title}
                </div>
                <div className="text-xs text-[#A9ADA3] mt-0.5 truncate">
                  {isPublic
                    ? `${artifacts[0].civilization} · ${artifacts[0].location}`
                    : `${artifacts[0].scriptFamily} · ${artifacts[0].dateRange}`}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSelectArtifact(artifacts[0].id);
                    onNavigate('investigation');
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#C9A66B] hover:text-[#F0E8D8] transition-colors whitespace-nowrap"
                >
                  {isPublic ? 'Explore This Story' : 'Open in Investigation Lab'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Artifact Upload Section */}
        <div className="lg:col-span-7 bg-[#232C27] border border-[#39443D] rounded-lg p-6 sm:p-7 flex flex-col justify-between space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#39443D]">
            <div>
              <h2 className="font-serif text-2xl font-medium text-[#F0E8D8]">
                {isPublic ? 'Upload a Photo of an Ancient Carving' : 'Artifact Photograph Ingestion'}
              </h2>
              <p className="text-xs text-[#A9ADA3] mt-0.5">
                {isPublic
                  ? 'Drop any museum photo or stone tablet image (JPG, PNG, or TIFF) to see what it might say'
                  : 'Supports JPG, PNG, and archival TIFF plates · '}
                {!isPublic && (
                  <span className="text-[#C9A66B]">
                    {geminiConfigured
                      ? 'Multimodal AI Engine Ready'
                      : 'Demonstration Corpus Active'}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Drag-and-Drop Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`relative rounded-lg border border-dashed transition-colors p-6 flex flex-col sm:flex-row items-center gap-5 ${
              dragActive
                ? 'border-[#C9A66B] bg-[#29332E]'
                : 'border-[#39443D] bg-[#1C2420]/70 hover:border-[#AD8952]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.tif,.tiff,.webp,image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
              }}
            />

            {uploadedPreviewUrl ? (
              <div className="flex flex-col sm:flex-row items-center gap-5 w-full">
                {isTiffUpload ? (
                  <div className="w-28 h-24 rounded bg-[#151A18] border border-[#39443D] flex flex-col items-center justify-center text-center p-2 shrink-0">
                    <FileImage className="w-6 h-6 text-[#C9A66B] mb-1" />
                    <span className="text-[10px] font-mono text-[#A9ADA3]">TIFF PLATE</span>
                  </div>
                ) : (
                  <ArtifactImage
                    src={uploadedPreviewUrl}
                    alt={uploadedFileName || 'Uploaded artifact preview'}
                    className="w-32 h-24 rounded object-cover border border-[#39443D] shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <div className="text-sm font-medium text-[#F0E8D8] truncate">
                    {uploadedFileName}
                  </div>
                  <div className="text-xs text-[#456B58] mt-1">
                    {isPublic ? 'Photo ready to explore' : 'Plate staged for paleographic segmentation'}
                  </div>
                  <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-[#C9A66B] hover:underline whitespace-nowrap"
                    >
                      Replace photo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFileName(null);
                        setUploadedPreviewUrl(null);
                        setIsTiffUpload(false);
                        setAnalysisError(null);
                      }}
                      className="text-xs text-[#A9ADA3] hover:text-[#F0E8D8] whitespace-nowrap"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-center text-center py-4">
                <UploadCloud className="w-8 h-8 text-[#C9A66B] mb-3" strokeWidth={1.5} />
                <div className="text-sm font-medium text-[#F0E8D8]">
                  {isPublic
                    ? 'Drag and drop an artifact photograph here'
                    : 'Drag and drop high-resolution artifact plate here'}
                </div>
                <div className="text-xs text-[#A9ADA3] mt-1">
                  Accepted formats: JPG, PNG, TIFF
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 px-4 py-2 rounded-md bg-[#29332E] hover:bg-[#39443D] border border-[#39443D] text-xs font-medium text-[#F0E8D8] transition-colors whitespace-nowrap shrink-0"
                >
                  Browse Files
                </button>
              </div>
            )}
          </div>

          {/* Selectors Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="specimen-title-input"
                className="block text-xs text-[#A9ADA3] mb-1.5"
              >
                {isPublic ? 'Object Name (Optional)' : 'Specimen Label'}
              </label>
              <input
                id="specimen-title-input"
                type="text"
                value={specimenTitle}
                onChange={(e) => setSpecimenTitle(e.target.value)}
                placeholder={isPublic ? 'e.g. Carved Stone at Museum' : 'e.g. Agora Marble Frag. IV'}
                className="w-full h-10 px-3 rounded-md bg-[#1C2420] border border-[#39443D] text-xs text-[#F0E8D8] placeholder:text-[#A9ADA3]/60 focus:outline-none focus:border-[#C9A66B]"
              />
            </div>

            <div>
              <label
                htmlFor="script-family-select"
                className="block text-xs text-[#A9ADA3] mb-1.5"
              >
                {isPublic ? 'Writing Style' : 'Script Family'}
              </label>
              <select
                id="script-family-select"
                value={scriptFamily}
                onChange={(e) => setScriptFamily(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-[#1C2420] border border-[#39443D] text-xs text-[#F0E8D8] focus:outline-none focus:border-[#C9A66B]"
              >
                {SCRIPT_FAMILIES.map((family) => (
                  <option key={family} value={family}>
                    {family}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="artifact-type-select"
                className="block text-xs text-[#A9ADA3] mb-1.5"
              >
                {isPublic ? 'Object Type' : 'Artifact Type'}
              </label>
              <select
                id="artifact-type-select"
                value={artifactType}
                onChange={(e) => setArtifactType(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-[#1C2420] border border-[#39443D] text-xs text-[#F0E8D8] focus:outline-none focus:border-[#C9A66B]"
              >
                {ARTIFACT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {analysisError && (
            <div className="p-4 rounded-md bg-[#1C2420] border border-[#A85D48]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[#A85D48] shrink-0 mt-0.5" />
                <div className="text-xs text-[#F0E8D8] leading-relaxed">
                  {analysisError.message}
                </div>
              </div>
              <button
                type="button"
                onClick={runDemoInvestigation}
                className="px-3.5 py-2 rounded bg-[#29332E] hover:bg-[#39443D] border border-[#39443D] text-xs font-medium text-[#C9A66B] whitespace-nowrap shrink-0"
              >
                Open in Demonstration Mode
              </button>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <span className="text-xs text-[#A9ADA3]">
              {uploadedPreviewUrl
                ? isPublic
                  ? 'Ready to read your photo and translate visible writing.'
                  : 'Ready to run multimodal symbol & damage analysis.'
                : isPublic
                  ? 'No photo chosen yet—click below to tour a real museum piece.'
                  : 'No plate uploaded — clicking Begin Investigation opens the active demonstration specimen.'}
            </span>
            <button
              type="button"
              onClick={handleBeginInvestigation}
              disabled={isAnalyzing}
              className="h-11 px-6 rounded-md bg-[#C9A66B] hover:bg-[#AD8952] disabled:opacity-60 text-[#151A18] text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isPublic ? 'Reading Artifact...' : 'Analyzing Inscription...'}
                </>
              ) : (
                <>
                  <Microscope className="w-4 h-4" />
                  {isPublic ? 'Explore Artifact' : 'Begin Investigation'}
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Corpus Metrics Strip */}
      <section aria-label="Research Corpus Metrics" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1C2420] border border-[#39443D] rounded-lg p-5">
          <div className="text-xs text-[#A9ADA3]">
            {isPublic ? 'Artifacts in Gallery' : 'Total Artifacts Analyzed'}
          </div>
          <div className="font-serif text-3xl font-semibold text-[#F0E8D8] tabular-nums mt-1.5">
            {artifacts.length}
          </div>
          <div className="text-[11px] font-mono text-[#456B58] mt-1">
            {isPublic ? 'Ready to explore' : 'Active research corpus'}
          </div>
        </div>

        <div className="bg-[#1C2420] border border-[#39443D] rounded-lg p-5">
          <div className="text-xs text-[#A9ADA3]">
            {isPublic ? 'Possible Translations' : 'Restorations Generated'}
          </div>
          <div className="font-serif text-3xl font-semibold text-[#F0E8D8] tabular-nums mt-1.5">
            {totalRestorations}
          </div>
          <div className="text-[11px] font-mono text-[#C9A66B] mt-1">
            {isPublic ? '3 scholarly guesses each' : '3 ranked hypotheses per plate'}
          </div>
        </div>

        <div className="bg-[#1C2420] border border-[#39443D] rounded-lg p-5">
          <div className="text-xs text-[#A9ADA3]">
            {isPublic ? 'Links Across History' : 'Historical Connections Discovered'}
          </div>
          <div className="font-serif text-3xl font-semibold text-[#F0E8D8] tabular-nums mt-1.5">
            19
          </div>
          <div className="text-[11px] font-mono text-[#A9ADA3] mt-1">
            {isPublic ? 'People, places & scripts' : 'Verified & candidate links'}
          </div>
        </div>

        <div className="bg-[#1C2420] border border-[#39443D] rounded-lg p-5">
          <div className="text-xs text-[#A9ADA3]">
            {isPublic ? 'Ancient Worlds' : 'Civilizations Indexed'}
          </div>
          <div className="font-serif text-3xl font-semibold text-[#F0E8D8] tabular-nums mt-1.5">
            {uniqueCivilizations.length}
          </div>
          <div className="text-[11px] font-mono text-[#A9ADA3] mt-1">
            Bronze Age to Hellenistic
          </div>
        </div>
      </section>

      {/* Recent Investigations / Museum Stories */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4 border-b border-[#39443D] pb-3">
          <div>
            <h2 className="font-serif text-2xl font-medium text-[#F0E8D8]">
              {isPublic ? 'Stories Waiting to Be Read' : 'Recent Investigations'}
            </h2>
            <p className="text-xs text-[#A9ADA3] mt-0.5">
              {isPublic
                ? 'Choose any ancient object below to read its story, inspect worn carvings, and see translated fragments.'
                : 'Select a cataloged specimen to inspect symbol overlays, damage maps, and restoration hypotheses.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('archive')}
            className="text-xs font-medium text-[#C9A66B] hover:text-[#F0E8D8] inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            {isPublic ? 'Browse Museum Gallery' : 'View Full Archive'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {artifacts.slice(0, 3).map((artifact) => (
            <button
              key={artifact.id}
              type="button"
              onClick={() => {
                onSelectArtifact(artifact.id);
                onNavigate('investigation');
              }}
              className="group text-left bg-[#232C27] border border-[#39443D] hover:border-[#C9A66B]/60 rounded-lg overflow-hidden transition-colors flex flex-col"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#151A18]">
                <ArtifactImage
                  src={artifact.imageUrl}
                  alt={artifact.title}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#151A18]/85 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] font-mono text-[#F0E8D8]">
                  <span>{isPublic ? artifact.civilization : artifact.id}</span>
                  <span className="tabular-nums text-[#C9A66B]">{artifact.dateRange}</span>
                </div>
              </div>
              <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif text-xl font-medium text-[#F0E8D8] group-hover:text-[#C9A66B] transition-colors">
                    {artifact.title}
                  </h3>
                  <p className="text-xs text-[#A9ADA3] mt-1.5 leading-relaxed line-clamp-3">
                    {isPublic
                      ? artifact.plainEnglishStory || artifact.summary
                      : `${artifact.scriptFamily} · ${artifact.location}`}
                  </p>
                </div>
                <div className="pt-3 border-t border-[#39443D] flex items-center justify-between text-xs">
                  <span
                    className={
                      artifact.restorationStatus === 'Verified Baseline'
                        ? 'text-[#456B58] font-medium'
                        : 'text-[#C9A66B]'
                    }
                  >
                    {isPublic ? 'Read Full Story →' : artifact.restorationStatus}
                  </span>
                  {!isPublic && (
                    <span className="font-mono tabular-nums text-[#A9ADA3]">
                      {artifact.detectedSymbols.length} glyphs · {artifact.damagedRegions.length}{' '}
                      zones
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Recently Explored Civilizations */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4 border-b border-[#39443D] pb-3">
          <div>
            <h2 className="font-serif text-2xl font-medium text-[#F0E8D8]">
              {isPublic ? 'Ancient Civilizations to Explore' : 'Recently Explored Civilizations'}
            </h2>
            <p className="text-xs text-[#A9ADA3] mt-0.5">
              {isPublic
                ? 'See how kings, merchants, and scribes from these five eras connect across history.'
                : 'Jump directly to cross-cultural scripts and provenance chains in the Historical Knowledge Graph.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('knowledge-graph')}
            className="text-xs font-medium text-[#C9A66B] hover:text-[#F0E8D8] inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            {isPublic ? 'Open History Connections' : 'Open Knowledge Graph'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {artifacts.slice(0, 5).map((art) => (
            <button
              key={art.id}
              type="button"
              onClick={() => {
                onSelectArtifact(art.id);
                onNavigate('knowledge-graph');
              }}
              className="text-left bg-[#1C2420] hover:bg-[#232C27] border border-[#39443D] hover:border-[#C9A66B]/50 rounded-lg p-4 transition-colors space-y-2"
            >
              <div className="text-sm font-serif font-semibold text-[#F0E8D8]">
                {art.civilization}
              </div>
              <div className="text-xs text-[#A9ADA3]">{art.historicalPeriod}</div>
              <div className="text-[11px] font-mono text-[#C9A66B] pt-1 border-t border-[#39443D]/70">
                {art.language}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
