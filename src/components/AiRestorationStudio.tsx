import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Columns2,
  Edit3,
  Loader2,
  RefreshCw,
  Save,
  X,
} from 'lucide-react';
import type {
  ArtifactRecord,
  AudienceMode,
  HypothesisDecision,
  PageId,
  RestorationHypothesis,
} from '../types/archaeon';
import { ArtifactImage } from './ArtifactImage';

interface AiRestorationStudioProps {
  artifacts: ArtifactRecord[];
  activeArtifact: ArtifactRecord;
  audienceMode: AudienceMode;
  onSelectArtifact: (id: string) => void;
  onUpdateHypothesisDecision: (
    artifactId: string,
    hypothesisId: string,
    decision: HypothesisDecision
  ) => void;
  onSaveManualEdit: (
    artifactId: string,
    hypothesisId: string,
    editedText: string,
    rationale: string
  ) => void;
  onReplaceHypotheses: (artifactId: string, newHypotheses: RestorationHypothesis[]) => void;
  onNavigate: (page: PageId) => void;
}

function getLikelihoodLabel(score: number): string {
  if (score >= 80) return 'Strong Historical Match';
  if (score >= 65) return 'Possible Alternative';
  return 'Speculative Reading';
}

export const AiRestorationStudio: React.FC<AiRestorationStudioProps> = ({
  artifacts,
  activeArtifact,
  audienceMode,
  onSelectArtifact,
  onUpdateHypothesisDecision,
  onSaveManualEdit,
  onReplaceHypotheses,
  onNavigate,
}) => {
  const isPublic = audienceMode === 'public';
  const [selectedHypothesisId, setSelectedHypothesisId] = useState<string>(
    activeArtifact.hypotheses[0]?.id ?? ''
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [editRationale, setEditRationale] = useState('');
  const [compareOpen, setCompareOpen] = useState(false);
  const [contextualFocus, setContextualFocus] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenMessage, setRegenMessage] = useState<string | null>(null);

  const activeHypothesis =
    activeArtifact.hypotheses.find((h) => h.id === selectedHypothesisId) ||
    activeArtifact.hypotheses[0];

  const handleStartEdit = (hyp: RestorationHypothesis) => {
    setEditingId(hyp.id);
    setEditDraft(hyp.manualEditText || hyp.reconstructedText);
    setEditRationale('');
  };

  const handleCommitEdit = (hypId: string) => {
    if (!editDraft.trim()) return;
    onSaveManualEdit(
      activeArtifact.id,
      hypId,
      editDraft.trim(),
      editRationale.trim() || 'Epigrapher paleographic emendation'
    );
    setEditingId(null);
  };

  const handleRegenerateHypotheses = async () => {
    setIsRegenerating(true);
    setRegenMessage(null);
    try {
      const transcriptionText = activeArtifact.transcriptionLines
        .map((l) => `Line ${l.lineNumber}: ${l.originalText}`)
        .join('\n');

      const response = await fetch('/api/restore-inscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeArtifact.title,
          scriptFamily: activeArtifact.scriptFamily,
          language: activeArtifact.language,
          historicalPeriod: activeArtifact.historicalPeriod,
          transcriptionText,
          contextualFocus,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setRegenMessage(
          payload.message ||
            'Server AI endpoint unavailable. Existing comparative hypotheses remain active.'
        );
        setIsRegenerating(false);
        return;
      }

      const mapped: RestorationHypothesis[] = (payload.hypotheses || [])
        .slice(0, 3)
        .map((h: any, idx: number) => ({
          id: `hyp-regen-${Date.now()}-${idx + 1}`,
          rank: ((idx + 1) as 1 | 2 | 3),
          title: h.title || `AI Hypothesis ${idx + 1}`,
          reconstructedText: h.reconstructedText || '',
          plainEnglishTranslation: h.explanation || h.reconstructedText || '',
          predictedCharacters: h.predictedCharacters || '',
          confidenceEstimate: Number(h.confidenceEstimate) || 68,
          epistemicNote:
            h.epistemicNote ||
            'Uncalibrated model estimate generated from researcher contextual constraints.',
          supportingEvidence: h.supportingEvidence || [],
          similarReferences: h.similarReferences || [],
          explanation: h.explanation || '',
          decision: 'pending',
        }));

      if (mapped.length > 0) {
        onReplaceHypotheses(activeArtifact.id, mapped);
        setSelectedHypothesisId(mapped[0].id);
        setRegenMessage('Generated 3 updated restoration hypotheses via Gemini multimodal model.');
      }
    } catch (err) {
      setRegenMessage(
        err instanceof Error ? err.message : 'Unable to reach restoration service.'
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6 space-y-6">
      {/* Header & Specimen Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#39443D]">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#F0E8D8]">
            {isPublic ? 'Story & Translation Studio' : 'AI Restoration Studio'}
          </h1>
          <p className="text-xs text-[#A9ADA3] mt-1">
            {isPublic
              ? 'Compare what survived on the stone or clay with three scholarly ideas for what the missing words said'
              : 'Comparative lacuna reconstruction, parallel corpus validation, and epigrapher adjudication'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={activeArtifact.id}
            onChange={(e) => {
              onSelectArtifact(e.target.value);
              setEditingId(null);
            }}
            aria-label="Select artifact for restoration"
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
            onClick={() => setCompareOpen((prev) => !prev)}
            className={`h-10 px-4 rounded-md border text-xs font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
              compareOpen
                ? 'bg-[#C9A66B] border-[#C9A66B] text-[#151A18]'
                : 'bg-[#1C2420] border-[#39443D] text-[#F0E8D8] hover:border-[#C9A66B]'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            {compareOpen
              ? isPublic
                ? 'Hide Side-by-Side Options'
                : 'Close Comparison Matrix'
              : isPublic
                ? 'Compare All 3 Possibilities'
                : 'Compare Alternatives'}
          </button>
        </div>
      </div>

      {/* Mandatory Epistemic Honesty Notice */}
      <div className="bg-[#1C2420] border border-[#A85D48]/50 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-[#A85D48] shrink-0 mt-0.5" />
        <div className="text-xs text-[#F0E8D8] leading-relaxed">
          {isPublic ? (
            <>
              <span className="font-semibold text-[#C9A66B]">Reading Ancient Gaps Honestly:</span>{' '}
              Because parts of this artifact broke or wore away over time, the restored words below
              are educated guesses based on similar ancient writings—not proven historical facts.
            </>
          ) : (
            <>
              <span className="font-semibold text-[#C9A66B]">
                Epistemic Methodological Notice:
              </span>{' '}
              Confidence scores displayed below are uncalibrated computational model estimates based
              on epigraphic character-span fitting and corpus similarity—they are{' '}
              <span className="underline decoration-[#A85D48]">not</span> scientifically verified
              probabilities. Treat all AI-generated reconstructions as tentative research hypotheses
              until verified against physical squeezes and primary corpora.
            </>
          )}
        </div>
      </div>

      {/* Side-by-Side Original vs Reconstructed */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#232C27] border border-[#39443D] rounded-lg overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-[#39443D] flex items-center justify-between">
            <h2 className="font-serif text-lg font-medium text-[#F0E8D8]">
              {isPublic ? 'What Survived on the Artifact' : 'Original Preserved Inscription'}
            </h2>
            <span className="text-[11px] font-mono text-[#A85D48]">
              {activeArtifact.damagedRegions.length} {isPublic ? 'worn areas' : 'damaged zones'}
            </span>
          </div>
          <div className="p-5 space-y-4 flex-1">
            <div className="aspect-[16/9] rounded overflow-hidden border border-[#39443D] bg-[#151A18]">
              <ArtifactImage
                src={activeArtifact.imageUrl}
                alt={activeArtifact.title}
                className="w-full h-full object-cover"
              />
            </div>

            {isPublic ? (
              <div className="space-y-2.5">
                <p className="text-xs text-[#A9ADA3] leading-relaxed">
                  {activeArtifact.plainEnglishStory || activeArtifact.summary}
                </p>
                <div className="p-3 rounded bg-[#151A18] border border-[#39443D]/70 space-y-1">
                  <div className="text-[11px] font-mono text-[#C9A66B]">
                    Sample Surviving Words
                  </div>
                  <div className="text-xs text-[#F0E8D8] space-y-1">
                    {activeArtifact.detectedSymbols.slice(0, 3).map((s) => (
                      <div key={s.id}>• {s.phoneticValue}</div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {activeArtifact.transcriptionLines.map((line) => (
                  <div
                    key={line.lineNumber}
                    className="p-2.5 rounded bg-[#151A18] border border-[#39443D]/70 flex items-baseline justify-between gap-3"
                  >
                    <div className="flex items-baseline gap-3 min-w-0">
                      <span className="text-[11px] font-mono tabular-nums text-[#A9ADA3] shrink-0">
                        L{String(line.lineNumber).padStart(2, '0')}
                      </span>
                      <span className="font-mono text-xs text-[#F0E8D8] break-words">
                        {line.originalText}
                      </span>
                    </div>
                    {line.lacunaCount > 0 && (
                      <span className="text-[10px] font-mono text-[#A85D48] shrink-0">
                        ~{line.lacunaCount} cells lost
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Active Reconstructed Reading */}
        <div className="bg-[#232C27] border border-[#39443D] rounded-lg overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-[#39443D] flex items-center justify-between">
            <h2 className="font-serif text-lg font-medium text-[#F0E8D8]">
              {isPublic
                ? `Possible Meaning (Option #${activeHypothesis?.rank ?? 1})`
                : `Proposed Reconstruction (${activeHypothesis ? `Hypothesis #${activeHypothesis.rank}` : 'None'})`}
            </h2>
            {activeHypothesis && (
              <span className="text-[11px] font-mono tabular-nums text-[#C9A66B]">
                {isPublic
                  ? getLikelihoodLabel(activeHypothesis.confidenceEstimate)
                  : `Est. ${activeHypothesis.confidenceEstimate}% (Uncalibrated)`}
              </span>
            )}
          </div>
          {activeHypothesis ? (
            <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="p-4 rounded-md bg-[#151A18] border border-[#C9A66B]/40">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#C9A66B] mb-2">
                    {isPublic
                      ? 'Plain-English Restored Reading (Guess)'
                      : activeHypothesis.manualEditText
                        ? 'Researcher-Edited Reading'
                        : 'AI-Predicted Full Text (Hypothetical)'}
                  </div>
                  <p className="font-serif text-xl text-[#F0E8D8] leading-relaxed">
                    {isPublic
                      ? activeHypothesis.plainEnglishTranslation ||
                        activeHypothesis.manualEditText ||
                        activeHypothesis.reconstructedText
                      : activeHypothesis.manualEditText || activeHypothesis.reconstructedText}
                  </p>
                </div>

                {!isPublic && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded bg-[#1C2420] border border-[#39443D]">
                      <div className="text-[11px] font-mono text-[#A9ADA3]">
                        Predicted Missing Characters
                      </div>
                      <div className="text-sm font-mono text-[#C9A66B] mt-1">
                        {activeHypothesis.predictedCharacters}
                      </div>
                    </div>
                    <div className="p-3 rounded bg-[#1C2420] border border-[#39443D]">
                      <div className="text-[11px] font-mono text-[#A9ADA3]">
                        Adjudication Status
                      </div>
                      <div
                        className={`text-sm font-medium mt-1 ${
                          activeHypothesis.decision === 'accepted'
                            ? 'text-[#456B58]'
                            : activeHypothesis.decision === 'rejected'
                              ? 'text-[#A85D48]'
                              : 'text-[#F0E8D8]'
                        }`}
                      >
                        {activeHypothesis.decision === 'accepted'
                          ? 'Accepted by Researcher'
                          : activeHypothesis.decision === 'rejected'
                            ? 'Rejected by Researcher'
                            : 'Awaiting Epigrapher Review'}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-[#F0E8D8]">
                    {isPublic ? 'Why Historians Think This Fits' : 'Epigraphic & Linguistic Rationale'}
                  </div>
                  <p className="text-xs text-[#A9ADA3] leading-relaxed">
                    {activeHypothesis.explanation}
                  </p>
                </div>
              </div>

              {!isPublic && (
                <div className="pt-4 border-t border-[#39443D] space-y-2">
                  <label
                    htmlFor="contextual-focus-input"
                    className="block text-[11px] font-mono text-[#A9ADA3]"
                  >
                    Optional Contextual Constraint for Fresh AI Hypotheses
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      id="contextual-focus-input"
                      type="text"
                      value={contextualFocus}
                      onChange={(e) => setContextualFocus(e.target.value)}
                      placeholder="e.g. Assume funerary formula rather than royal decree..."
                      className="flex-1 h-9 px-3 rounded bg-[#151A18] border border-[#39443D] text-xs text-[#F0E8D8] placeholder:text-[#A9ADA3]/60 focus:outline-none focus:border-[#C9A66B]"
                    />
                    <button
                      type="button"
                      onClick={handleRegenerateHypotheses}
                      disabled={isRegenerating}
                      className="h-9 px-3.5 rounded bg-[#29332E] hover:bg-[#39443D] border border-[#39443D] text-xs font-medium text-[#C9A66B] inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      {isRegenerating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      Regenerate Hypotheses
                    </button>
                  </div>
                  {regenMessage && (
                    <div className="text-[11px] text-[#C9A66B] mt-1">{regenMessage}</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-xs text-[#A9ADA3]">No restoration hypotheses loaded.</div>
          )}
        </div>
      </section>

      {/* Compare Alternatives Matrix */}
      {compareOpen && (
        <section className="bg-[#1C2420] border border-[#C9A66B]/40 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#39443D] pb-3">
            <h3 className="font-serif text-xl font-medium text-[#F0E8D8]">
              {isPublic
                ? 'Three Possible Ways to Read the Missing Text'
                : 'Side-by-Side Hypothesis Comparison Matrix'}
            </h3>
            <button
              type="button"
              onClick={() => setCompareOpen(false)}
              className="text-xs text-[#A9ADA3] hover:text-[#F0E8D8]"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeArtifact.hypotheses.map((hyp) => (
              <div
                key={hyp.id}
                className="bg-[#232C27] border border-[#39443D] rounded-md p-4 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#C9A66B]">
                      {isPublic ? `Option #${hyp.rank}` : `Hypothesis #${hyp.rank}`}
                    </span>
                    <span className="tabular-nums text-[#F0E8D8]">
                      {isPublic
                        ? getLikelihoodLabel(hyp.confidenceEstimate)
                        : `${hyp.confidenceEstimate}% est.`}
                    </span>
                  </div>
                  <div className="text-sm font-serif font-semibold text-[#F0E8D8]">
                    {hyp.title}
                  </div>
                  <div className="p-2.5 rounded bg-[#151A18] text-xs font-mono text-[#F0E8D8]">
                    {isPublic
                      ? hyp.plainEnglishTranslation || hyp.predictedCharacters
                      : hyp.predictedCharacters}
                  </div>
                  <p className="text-xs text-[#A9ADA3] leading-relaxed">{hyp.explanation}</p>
                </div>
                <div className="pt-2 border-t border-[#39443D] text-[11px] text-[#A9ADA3]">
                  {isPublic ? 'Related Finds: ' : 'Parallels: '}
                  {hyp.similarReferences.join(', ') || 'None listed'}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Three Ranked Restoration Hypotheses */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-medium text-[#F0E8D8]">
            {isPublic
              ? 'Three Possible Restorations'
              : 'Generated Restoration Hypotheses (3)'}
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="text-xs font-medium text-[#C9A66B] hover:underline whitespace-nowrap"
          >
            {isPublic ? 'Download Visitor Handout →' : 'Compile into Research Report →'}
          </button>
        </div>

        <div className="space-y-4">
          {activeArtifact.hypotheses.map((hyp) => {
            const isSelected = activeHypothesis?.id === hyp.id;
            const isEditing = editingId === hyp.id;
            return (
              <div
                key={hyp.id}
                onClick={() => setSelectedHypothesisId(hyp.id)}
                className={`rounded-lg border p-5 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#232C27] border-[#C9A66B]'
                    : 'bg-[#1C2420] border-[#39443D] hover:border-[#AD8952]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4 pb-3 border-b border-[#39443D]">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                      <span className="text-[#C9A66B]">
                        {isPublic ? `Option ${hyp.rank}` : `Hypothesis ${hyp.rank}`}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums text-[#F0E8D8]">
                        {isPublic
                          ? getLikelihoodLabel(hyp.confidenceEstimate)
                          : `Model Estimate: ${hyp.confidenceEstimate}% (Uncalibrated)`}
                      </span>
                      {!isPublic && hyp.decision !== 'pending' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              hyp.decision === 'accepted' ? 'text-[#456B58]' : 'text-[#A85D48]'
                            }
                          >
                            {hyp.decision === 'accepted' ? 'Accepted' : 'Rejected'}
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="font-serif text-xl font-medium text-[#F0E8D8]">{hyp.title}</h3>
                  </div>

                  {/* Technical Researcher Adjudication Actions */}
                  {!isPublic && (
                    <div
                      className="flex flex-wrap items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateHypothesisDecision(activeArtifact.id, hyp.id, 'accepted')
                        }
                        className={`px-3 py-1.5 rounded text-xs font-medium inline-flex items-center gap-1.5 border transition-colors whitespace-nowrap ${
                          hyp.decision === 'accepted'
                            ? 'bg-[#456B58] border-[#456B58] text-[#F0E8D8]'
                            : 'bg-[#151A18] border-[#39443D] text-[#F0E8D8] hover:border-[#456B58]'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accept Hypothesis
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateHypothesisDecision(activeArtifact.id, hyp.id, 'rejected')
                        }
                        className={`px-3 py-1.5 rounded text-xs font-medium inline-flex items-center gap-1.5 border transition-colors whitespace-nowrap ${
                          hyp.decision === 'rejected'
                            ? 'bg-[#A85D48] border-[#A85D48] text-[#F0E8D8]'
                            : 'bg-[#151A18] border-[#39443D] text-[#A9ADA3] hover:text-[#F0E8D8] hover:border-[#A85D48]'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(hyp)}
                        className="px-3 py-1.5 rounded bg-[#151A18] border border-[#39443D] hover:border-[#C9A66B] text-xs font-medium text-[#C9A66B] inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Manually
                      </button>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="pt-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-7 space-y-3">
                    {isEditing ? (
                      <div
                        className="space-y-3 bg-[#151A18] p-4 rounded border border-[#C9A66B]/60"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <label className="block text-xs font-mono text-[#C9A66B]">
                          Manual Paleographic Emendation
                        </label>
                        <textarea
                          rows={3}
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          className="w-full p-2.5 rounded bg-[#1C2420] border border-[#39443D] text-xs font-mono text-[#F0E8D8] focus:outline-none focus:border-[#C9A66B]"
                        />
                        <input
                          type="text"
                          value={editRationale}
                          onChange={(e) => setEditRationale(e.target.value)}
                          placeholder="Correction rationale (logged to Research Report)..."
                          className="w-full h-9 px-3 rounded bg-[#1C2420] border border-[#39443D] text-xs text-[#F0E8D8] focus:outline-none focus:border-[#C9A66B]"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 rounded border border-[#39443D] text-xs text-[#A9ADA3]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCommitEdit(hyp.id)}
                            className="px-3 py-1.5 rounded bg-[#C9A66B] text-[#151A18] text-xs font-semibold inline-flex items-center gap-1.5"
                          >
                            <Save className="w-3.5 h-3.5" />
                            Save Correction
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="p-3 rounded bg-[#151A18] border border-[#39443D]/70">
                          {!isPublic && (
                            <div className="text-[11px] font-mono text-[#A9ADA3] mb-1">
                              Predicted Insertion:{' '}
                              <span className="text-[#C9A66B]">{hyp.predictedCharacters}</span>
                            </div>
                          )}
                          <div className="font-serif text-base text-[#F0E8D8]">
                            {isPublic
                              ? hyp.plainEnglishTranslation ||
                                hyp.manualEditText ||
                                hyp.reconstructedText
                              : hyp.manualEditText || hyp.reconstructedText}
                          </div>
                        </div>
                        <p className="text-xs text-[#A9ADA3] leading-relaxed">{hyp.explanation}</p>
                        {!isPublic && (
                          <p className="text-[11px] font-mono text-[#A85D48]">{hyp.epistemicNote}</p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="lg:col-span-5 space-y-3 lg:border-l lg:border-[#39443D] lg:pl-5">
                    <div>
                      <div className="text-[11px] font-mono uppercase tracking-wider text-[#A9ADA3] mb-1.5">
                        {isPublic ? 'Historical Clues' : 'Supporting Historical Evidence'}
                      </div>
                      <ul className="space-y-1 text-xs text-[#F0E8D8]">
                        {hyp.supportingEvidence.map((item, idx) => (
                          <li key={idx} className="leading-snug">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-[11px] font-mono uppercase tracking-wider text-[#A9ADA3] mb-1">
                        {isPublic ? 'Similar Museum Finds' : 'Similar Inscription References'}
                      </div>
                      <div className="text-xs font-mono text-[#C9A66B]">
                        {hyp.similarReferences.join(' · ') || 'Awaiting parallel search'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
