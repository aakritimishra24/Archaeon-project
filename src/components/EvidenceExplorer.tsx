import React, { useMemo, useState } from 'react';
import { BookOpen, ExternalLink, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react';
import type { AudienceMode, EpistemicStatus, EvidenceClaim, PageId } from '../types/archaeon';

interface EvidenceExplorerProps {
  claims: EvidenceClaim[];
  audienceMode: AudienceMode;
  onSelectArtifact: (id: string) => void;
  onSelectGraphEntity: (id: string) => void;
  onNavigate: (page: PageId) => void;
}

const CATEGORIES: ('All' | EvidenceClaim['category'])[] = [
  'All',
  'Related Inscriptions',
  'Similar Symbol Patterns',
  'Historical References',
  'Relevant People',
  'Ancient Locations',
  'Related Historical Events',
];

const EPISTEMIC_FILTERS: { id: 'all' | EpistemicStatus; technicalLabel: string; publicLabel: string }[] = [
  { id: 'all', technicalLabel: 'All Claims', publicLabel: 'All Facts & Clues' },
  {
    id: 'verified',
    technicalLabel: 'Verified Historical Information',
    publicLabel: 'Confirmed History',
  },
  {
    id: 'ai-hypothesis',
    technicalLabel: 'AI-Generated Hypothesis',
    publicLabel: 'AI Guess',
  },
  {
    id: 'unverified',
    technicalLabel: 'Unverified Relationship',
    publicLabel: 'Needs More Proof',
  },
];

export const EvidenceExplorer: React.FC<EvidenceExplorerProps> = ({
  claims,
  audienceMode,
  onSelectArtifact,
  onSelectGraphEntity,
  onNavigate,
}) => {
  const isPublic = audienceMode === 'public';
  const [categoryFilter, setCategoryFilter] = useState<'All' | EvidenceClaim['category']>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | EpistemicStatus>('all');
  const [query, setQuery] = useState('');

  const filteredClaims = useMemo(() => {
    const q = query.trim().toLowerCase();
    return claims.filter((claim) => {
      if (categoryFilter !== 'All' && claim.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && claim.epistemicStatus !== statusFilter) return false;
      if (
        q &&
        !claim.title.toLowerCase().includes(q) &&
        !claim.claimText.toLowerCase().includes(q) &&
        !claim.sourceCitation.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [claims, categoryFilter, statusFilter, query]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-[#39443D]">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#F0E8D8]">
            {isPublic ? 'Fact & Source Check' : 'Evidence Explorer'}
          </h1>
          <p className="text-xs text-[#A9ADA3] mt-1">
            {isPublic
              ? 'See which parts of each story are confirmed historical facts and which are AI guesses'
              : 'Traceable historical citations, epigraphic parallels, and explicitly separated AI hypotheses'}
          </p>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by citation, inscription, or keyword..."
          aria-label="Filter evidence claims"
          className="h-10 w-full sm:w-72 px-3 rounded-md bg-[#1C2420] border border-[#39443D] text-xs text-[#F0E8D8] focus:outline-none focus:border-[#C9A66B]"
        />
      </div>

      {/* Epistemic Verification Segmented Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#1C2420] border border-[#39443D] rounded-md">
          {EPISTEMIC_FILTERS.map((ef) => {
            const active = statusFilter === ef.id;
            return (
              <button
                key={ef.id}
                type="button"
                onClick={() => setStatusFilter(ef.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#C9A66B] text-[#151A18]'
                    : 'text-[#A9ADA3] hover:text-[#F0E8D8] hover:bg-[#232C27]'
                }`}
              >
                {isPublic ? ef.publicLabel : ef.technicalLabel}
              </button>
            );
          })}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as 'All' | EvidenceClaim['category'])}
          aria-label="Filter by evidence category"
          className="h-9 px-3 rounded-md bg-[#1C2420] border border-[#39443D] text-xs text-[#F0E8D8] focus:outline-none focus:border-[#C9A66B]"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'All' ? 'All Evidence Domains' : cat}
            </option>
          ))}
        </select>
      </div>

      {/* Claims Ledger */}
      {filteredClaims.length === 0 ? (
        <div className="bg-[#1C2420] border border-[#39443D] rounded-lg p-10 text-center space-y-3">
          <BookOpen className="w-8 h-8 text-[#A9ADA3] mx-auto" />
          <div className="text-sm text-[#F0E8D8]">No evidence records match your filter.</div>
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('All');
              setStatusFilter('all');
              setQuery('');
            }}
            className="px-4 py-2 rounded bg-[#232C27] border border-[#39443D] text-xs text-[#C9A66B]"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredClaims.map((claim) => {
            const isVerified = claim.epistemicStatus === 'verified';
            const isAi = claim.epistemicStatus === 'ai-hypothesis';

            return (
              <article
                key={claim.id}
                className="bg-[#232C27] border border-[#39443D] rounded-lg p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                    <span className="text-[#A9ADA3]">{claim.category}</span>
                    <span
                      className={`inline-flex items-center gap-1.5 font-medium ${
                        isVerified
                          ? 'text-[#456B58]'
                          : isAi
                            ? 'text-[#C9A66B]'
                            : 'text-[#A85D48]'
                      }`}
                    >
                      {isVerified ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Verified Historical Information
                        </>
                      ) : isAi ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          AI-Generated Hypothesis
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Unverified Relationship
                        </>
                      )}
                    </span>
                  </div>

                  <h2 className="font-serif text-xl font-medium text-[#F0E8D8]">{claim.title}</h2>
                  <p className="text-xs text-[#A9ADA3] leading-relaxed">{claim.claimText}</p>
                </div>

                <div className="pt-3 border-t border-[#39443D] space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[#A9ADA3] shrink-0">Traceable Source</span>
                    <span className="font-mono text-[#F0E8D8] text-right">
                      {claim.sourceCitation}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#A9ADA3]">Repository · Date</span>
                    <span className="text-[#C9A66B] text-right">
                      {claim.repository} · {claim.dateContext}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <div className="flex flex-wrap gap-2">
                      {claim.artifactIds.map((artId) => (
                        <button
                          key={artId}
                          type="button"
                          onClick={() => {
                            onSelectArtifact(artId);
                            onNavigate('investigation');
                          }}
                          className="text-[11px] font-mono text-[#C9A66B] hover:underline inline-flex items-center gap-1"
                        >
                          Inspect {artId}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (claim.artifactIds[0]) onSelectGraphEntity(claim.artifactIds[0]);
                        onNavigate('knowledge-graph');
                      }}
                      className="text-[11px] text-[#A9ADA3] hover:text-[#F0E8D8]"
                    >
                      View in Knowledge Graph →
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
