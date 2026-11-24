import React, { useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { Download, FileText, Loader2 } from 'lucide-react';
import type {
  ArtifactRecord,
  AudienceMode,
  EvidenceClaim,
  KnowledgeGraphEntity,
  KnowledgeGraphRelation,
} from '../types/archaeon';
import { RESEARCHER_PROFILE } from '../data/archaeonCorpus';
import { ArtifactImage } from './ArtifactImage';

interface ResearchReportsProps {
  artifacts: ArtifactRecord[];
  activeArtifact: ArtifactRecord;
  audienceMode: AudienceMode;
  onSelectArtifact: (id: string) => void;
  evidenceClaims: EvidenceClaim[];
  graphEntities: KnowledgeGraphEntity[];
  graphRelations: KnowledgeGraphRelation[];
}

export const ResearchReports: React.FC<ResearchReportsProps> = ({
  artifacts,
  activeArtifact,
  audienceMode,
  onSelectArtifact,
  evidenceClaims,
  graphEntities,
  graphRelations,
}) => {
  const isPublic = audienceMode === 'public';
  const [isExporting, setIsExporting] = useState(false);

  const relatedClaims = useMemo(
    () => evidenceClaims.filter((c) => c.artifactIds.includes(activeArtifact.id)),
    [evidenceClaims, activeArtifact.id]
  );

  const relatedGraphEdges = useMemo(
    () =>
      graphRelations
        .filter((r) => r.source === activeArtifact.id || r.target === activeArtifact.id)
        .map((r) => {
          const otherId = r.source === activeArtifact.id ? r.target : r.source;
          const other = graphEntities.find((e) => e.id === otherId);
          return { relation: r, otherLabel: other?.label || otherId };
        }),
    [graphRelations, graphEntities, activeArtifact.id]
  );

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 48;

      const ensureSpace = (needed: number) => {
        if (y + needed > 780) {
          doc.addPage();
          y = 48;
        }
      };

      const addSectionHeading = (title: string) => {
        ensureSpace(36);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(120, 88, 40);
        doc.text(title.toUpperCase(), 44, y);
        y += 6;
        doc.setDrawColor(190, 175, 145);
        doc.line(44, y, pageWidth - 44, y);
        y += 16;
      };

      const addWrappedText = (text: string, fontSize = 10, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(fontSize);
        doc.setTextColor(30, 35, 32);
        const lines = doc.splitTextToSize(text, pageWidth - 88);
        ensureSpace(lines.length * (fontSize + 4) + 6);
        doc.text(lines, 44, y);
        y += lines.length * (fontSize + 4) + 4;
      };

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(21, 26, 24);
      doc.text(
        isPublic
          ? 'ARCHAEON AI — Visitor Story & Translation Guide'
          : 'ARCHAEON AI — Epigraphic Research Dossier',
        44,
        y
      );
      y += 22;

      addWrappedText(`${activeArtifact.id}: ${activeArtifact.title}`, 13, true);
      addWrappedText(
        `Prepared by ${RESEARCHER_PROFILE.name} (${RESEARCHER_PROFILE.institution}) · Generated ${new Date().toISOString().slice(0, 10)}`,
        9
      );
      y += 6;

      addWrappedText(
        'METHODOLOGICAL NOTICE: Model confidence scores in this dossier are uncalibrated computational estimates and not scientifically verified probabilities. AI restoration hypotheses require independent epigraphic verification.',
        9,
        true
      );
      y += 8;

      addSectionHeading('1. Artifact Details');
      addWrappedText(`Script Family: ${activeArtifact.scriptFamily}`);
      addWrappedText(
        `Civilization & Period: ${activeArtifact.civilization} · ${activeArtifact.historicalPeriod} (${activeArtifact.dateRange})`
      );
      addWrappedText(`Provenance & Material: ${activeArtifact.location} · ${activeArtifact.material}`);
      addWrappedText(`Dimensions & Reference: ${activeArtifact.dimensions} · ${activeArtifact.accessionReference}`);
      addWrappedText(
        `Story & Summary: ${isPublic ? activeArtifact.plainEnglishStory || activeArtifact.summary : activeArtifact.summary}`
      );
      y += 6;

      addSectionHeading('2. Detected Damage Zones');
      activeArtifact.damagedRegions.forEach((dmg, idx) => {
        addWrappedText(
          `${idx + 1}. ${dmg.label} (${dmg.damageType}, ${dmg.severity} Severity, ${dmg.areaPercent}% area): ${dmg.description}`
        );
      });
      y += 6;

      addSectionHeading('3. Recognized Symbols');
      activeArtifact.detectedSymbols.forEach((sym, idx) => {
        addWrappedText(
          `${idx + 1}. Line ${sym.lineNumber} | ${sym.transliteration} — ${sym.phoneticValue} (Est. ${sym.confidence}%)`
        );
      });
      y += 6;

      addSectionHeading('4. Restoration Hypotheses');
      activeArtifact.hypotheses.forEach((hyp) => {
        addWrappedText(
          `Hypothesis #${hyp.rank}: ${hyp.title} [Est. ${hyp.confidenceEstimate}% | Status: ${hyp.decision}]`,
          10,
          true
        );
        addWrappedText(
          `Reading: ${isPublic && hyp.plainEnglishTranslation ? hyp.plainEnglishTranslation : hyp.manualEditText || hyp.reconstructedText}`,
          9
        );
        addWrappedText(`Rationale: ${hyp.explanation}`, 9);
        y += 4;
      });

      addSectionHeading('5. Researcher Manual Corrections');
      if (activeArtifact.researcherCorrections.length === 0) {
        addWrappedText('No manual epigrapher overrides logged in this session.');
      } else {
        activeArtifact.researcherCorrections.forEach((corr, idx) => {
          addWrappedText(
            `${idx + 1}. [${corr.timestamp}] ${corr.author}: "${corr.correctedReading}" — Rationale: ${corr.rationale}`
          );
        });
      }
      y += 6;

      addSectionHeading('6. Traceable Evidence & Knowledge Graph Links');
      relatedClaims.forEach((cl) => {
        addWrappedText(
          `[${cl.epistemicStatus.toUpperCase()}] ${cl.title}: ${cl.claimText} (Source: ${cl.sourceCitation})`,
          9
        );
      });
      relatedGraphEdges.forEach(({ relation, otherLabel }) => {
        addWrappedText(
          `Graph Relation: ${activeArtifact.id} --[${relation.predicate}]--> ${otherLabel} (${relation.verificationStatus}; ${relation.evidenceCitation})`,
          9
        );
      });

      doc.save(`${activeArtifact.id}_ARCHAEON_${isPublic ? 'Visitor_Guide' : 'Dossier'}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-6 space-y-6">
      {/* Header + Export Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#39443D]">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#F0E8D8]">
            {isPublic ? 'Visitor Summary Handout' : 'Research Reports'}
          </h1>
          <p className="text-xs text-[#A9ADA3] mt-1">
            {isPublic
              ? 'Download a clean, plain-English PDF guide for students, museum visitors, or study groups'
              : 'Compile epigraphic findings, damage diagnostics, restoration hypotheses, and corrections into a downloadable PDF dossier'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={activeArtifact.id}
            onChange={(e) => onSelectArtifact(e.target.value)}
            aria-label="Select artifact for research report"
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
            onClick={handleExportPdf}
            disabled={isExporting}
            className="h-10 px-5 rounded-md bg-[#C9A66B] hover:bg-[#AD8952] text-[#151A18] text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isPublic ? 'Download Visitor Guide (PDF)' : 'Export PDF Report'}
          </button>
        </div>
      </div>

      {/* Printable Dossier Document Surface */}
      <div className="bg-[#1C2420] border border-[#39443D] rounded-lg p-6 sm:p-8 space-y-8">
        {/* Document Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-[#39443D]">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-[#C9A66B]">
              <FileText className="w-3.5 h-3.5" />
              EPIGRAPHIC DOSSIER · {activeArtifact.id}
            </div>
            <h2 className="font-serif text-3xl font-semibold text-[#F0E8D8]">
              {activeArtifact.title}
            </h2>
            <div className="text-xs text-[#A9ADA3]">
              Investigator: {RESEARCHER_PROFILE.name} · Analysis Mode:{' '}
              {activeArtifact.analysisSource === 'live-ai'
                ? 'Live Gemini Multimodal AI'
                : 'Demonstration Corpus'}
            </div>
          </div>

          <div className="w-full md:w-56 aspect-[4/3] rounded overflow-hidden border border-[#39443D] bg-[#151A18] shrink-0">
            <ArtifactImage
              src={activeArtifact.imageUrl}
              alt={activeArtifact.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* 1. Artifact Details */}
        <section className="space-y-3">
          <h3 className="font-serif text-xl font-medium text-[#C9A66B]">01. Artifact Details</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs bg-[#151A18] border border-[#39443D] rounded p-4">
            <div>
              <dt className="text-[#A9ADA3]">Script Family</dt>
              <dd className="text-[#F0E8D8] font-medium mt-0.5">{activeArtifact.scriptFamily}</dd>
            </div>
            <div>
              <dt className="text-[#A9ADA3]">Civilization &amp; Period</dt>
              <dd className="text-[#F0E8D8] font-medium mt-0.5">
                {activeArtifact.civilization} · {activeArtifact.dateRange}
              </dd>
            </div>
            <div>
              <dt className="text-[#A9ADA3]">Provenance</dt>
              <dd className="text-[#F0E8D8] font-medium mt-0.5">{activeArtifact.location}</dd>
            </div>
            <div>
              <dt className="text-[#A9ADA3]">Material</dt>
              <dd className="text-[#F0E8D8] font-medium mt-0.5">{activeArtifact.material}</dd>
            </div>
            <div>
              <dt className="text-[#A9ADA3]">Dimensions</dt>
              <dd className="font-mono text-[#F0E8D8] mt-0.5">{activeArtifact.dimensions}</dd>
            </div>
            <div>
              <dt className="text-[#A9ADA3]">Archival Reference</dt>
              <dd className="font-mono text-[#C9A66B] mt-0.5">
                {activeArtifact.accessionReference}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-[#A9ADA3] leading-relaxed">{activeArtifact.summary}</p>
        </section>

        {/* 2. Detected Damage & Recognized Symbols */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-serif text-xl font-medium text-[#C9A66B]">02. Detected Damage</h3>
            <div className="divide-y divide-[#39443D] border border-[#39443D] rounded bg-[#151A18]">
              {activeArtifact.damagedRegions.map((dmg) => (
                <div key={dmg.id} className="p-3.5 text-xs space-y-1">
                  <div className="flex justify-between font-medium text-[#F0E8D8]">
                    <span>{dmg.label}</span>
                    <span className="font-mono tabular-nums text-[#A85D48]">
                      {dmg.damageType} · {dmg.areaPercent}%
                    </span>
                  </div>
                  <p className="text-[#A9ADA3]">{dmg.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-serif text-xl font-medium text-[#C9A66B]">
              03. Recognized Symbols
            </h3>
            <div className="divide-y divide-[#39443D] border border-[#39443D] rounded bg-[#151A18]">
              {activeArtifact.detectedSymbols.map((sym) => (
                <div key={sym.id} className="p-3.5 text-xs space-y-1">
                  <div className="flex justify-between font-medium text-[#F0E8D8]">
                    <span>
                      Line {sym.lineNumber}: {sym.transliteration}
                    </span>
                    <span className="font-mono tabular-nums text-[#456B58]">
                      Est. {sym.confidence}%
                    </span>
                  </div>
                  <div className="text-[#A9ADA3]">{sym.phoneticValue}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Restoration Hypotheses & Epigrapher Corrections */}
        <section className="space-y-3">
          <h3 className="font-serif text-xl font-medium text-[#C9A66B]">
            04. Restoration Hypotheses &amp; Researcher Corrections
          </h3>
          <div className="space-y-3">
            {activeArtifact.hypotheses.map((hyp) => (
              <div
                key={hyp.id}
                className="p-4 rounded border border-[#39443D] bg-[#151A18] space-y-1.5 text-xs"
              >
                <div className="flex flex-wrap justify-between gap-2 font-mono">
                  <span className="text-[#C9A66B]">
                    Hypothesis #{hyp.rank} — {hyp.title}
                  </span>
                  <span className="text-[#F0E8D8] tabular-nums">
                    Est. {hyp.confidenceEstimate}% (Uncalibrated) · Status: {hyp.decision}
                  </span>
                </div>
                <div className="font-serif text-base text-[#F0E8D8]">
                  {hyp.manualEditText || hyp.reconstructedText}
                </div>
                <p className="text-[#A9ADA3]">{hyp.explanation}</p>
              </div>
            ))}
          </div>

          <div className="p-4 rounded border border-[#39443D] bg-[#232C27]/60 text-xs space-y-2">
            <div className="font-mono uppercase tracking-wider text-[#A9ADA3]">
              Logged Researcher Emendations ({activeArtifact.researcherCorrections.length})
            </div>
            {activeArtifact.researcherCorrections.length === 0 ? (
              <p className="text-[#A9ADA3]">
                No manual text edits recorded yet. Use &ldquo;Edit Manually&rdquo; in AI Restoration
                Studio to log paleographic corrections.
              </p>
            ) : (
              <ul className="space-y-1.5 text-[#F0E8D8]">
                {activeArtifact.researcherCorrections.map((c) => (
                  <li key={c.id}>
                    <span className="font-mono text-[#C9A66B]">[{c.timestamp}]</span>{' '}
                    <span className="font-medium">{c.correctedReading}</span> — {c.rationale}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 5. Historical Evidence & Knowledge Graph Relationships */}
        <section className="space-y-3">
          <h3 className="font-serif text-xl font-medium text-[#C9A66B]">
            05. Historical Evidence &amp; Knowledge Graph Relationships
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded border border-[#39443D] bg-[#151A18] space-y-2">
              <div className="font-mono text-[#A9ADA3] uppercase">Traceable Evidence Claims</div>
              {relatedClaims.length === 0 ? (
                <p className="text-[#A9ADA3]">No corpus citations linked to this session ID.</p>
              ) : (
                relatedClaims.map((cl) => (
                  <div key={cl.id} className="pt-2 border-t border-[#39443D]/60 space-y-0.5">
                    <div className="font-medium text-[#F0E8D8]">{cl.title}</div>
                    <div className="text-[#A9ADA3]">{cl.sourceCitation}</div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 rounded border border-[#39443D] bg-[#151A18] space-y-2">
              <div className="font-mono text-[#A9ADA3] uppercase">Knowledge Graph Edges</div>
              {relatedGraphEdges.length === 0 ? (
                <p className="text-[#A9ADA3]">No graph edges mapped yet.</p>
              ) : (
                relatedGraphEdges.map(({ relation, otherLabel }) => (
                  <div
                    key={relation.id}
                    className="pt-2 border-t border-[#39443D]/60 flex items-center justify-between gap-2"
                  >
                    <span className="text-[#F0E8D8]">
                      <span className="font-mono text-[#C9A66B]">{relation.predicate}</span> →{' '}
                      {otherLabel}
                    </span>
                    <span
                      className={`font-mono text-[11px] ${
                        relation.verificationStatus === 'verified'
                          ? 'text-[#456B58]'
                          : 'text-[#A85D48]'
                      }`}
                    >
                      {relation.verificationStatus}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
