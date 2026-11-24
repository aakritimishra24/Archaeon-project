import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Search } from 'lucide-react';
import type { ArtifactRecord, AudienceMode, PageId } from '../types/archaeon';
import { ArtifactImage } from './ArtifactImage';

interface ArtifactArchiveProps {
  artifacts: ArtifactRecord[];
  audienceMode: AudienceMode;
  onSelectArtifact: (id: string) => void;
  onNavigate: (page: PageId) => void;
}

export const ArtifactArchive: React.FC<ArtifactArchiveProps> = ({
  artifacts,
  audienceMode,
  onSelectArtifact,
  onNavigate,
}) => {
  const isPublic = audienceMode === 'public';
  const [searchQuery, setSearchQuery] = useState('');
  const [scriptFilter, setScriptFilter] = useState('All');
  const [periodFilter, setPeriodFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'id' | 'confidence' | 'date'>('id');

  const scriptOptions = useMemo(
    () => ['All', ...Array.from(new Set(artifacts.map((a) => a.scriptFamily)))],
    [artifacts]
  );
  const periodOptions = useMemo(
    () => ['All', ...Array.from(new Set(artifacts.map((a) => a.historicalPeriod)))],
    [artifacts]
  );
  const statusOptions = useMemo(
    () => ['All', ...Array.from(new Set(artifacts.map((a) => a.restorationStatus)))],
    [artifacts]
  );

  const filteredArtifacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = artifacts.filter((a) => {
      if (scriptFilter !== 'All' && a.scriptFamily !== scriptFilter) return false;
      if (periodFilter !== 'All' && a.historicalPeriod !== periodFilter) return false;
      if (statusFilter !== 'All' && a.restorationStatus !== statusFilter) return false;
      if (
        q &&
        !a.id.toLowerCase().includes(q) &&
        !a.title.toLowerCase().includes(q) &&
        !a.location.toLowerCase().includes(q) &&
        !a.civilization.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'confidence') {
        return b.overallConfidenceEstimate - a.overallConfidenceEstimate;
      }
      if (sortBy === 'date') {
        return b.analyzedAt.localeCompare(a.analyzedAt);
      }
      return a.id.localeCompare(b.id);
    });
  }, [artifacts, searchQuery, scriptFilter, periodFilter, statusFilter, sortBy]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-[#39443D]">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#F0E8D8]">
            {isPublic ? 'Museum Artifact Gallery' : 'Artifact Archive'}
          </h1>
          <p className="text-xs text-[#A9ADA3] mt-1">
            {isPublic
              ? `Browse ${filteredArtifacts.length} ancient stones, tablets, and pottery shards`
              : `Searchable digital epigraphic repository · ${filteredArtifacts.length} of ${artifacts.length} specimens shown`}
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-[#A9ADA3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ID, title, site, civilization..."
            aria-label="Search artifact archive"
            className="w-full h-10 pl-9 pr-3 rounded-md bg-[#1C2420] border border-[#39443D] text-xs text-[#F0E8D8] focus:outline-none focus:border-[#C9A66B]"
          />
        </div>
      </div>

      {/* Filters & Sorting Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#1C2420] border border-[#39443D] rounded-lg p-4">
        <select
          value={scriptFilter}
          onChange={(e) => setScriptFilter(e.target.value)}
          aria-label="Filter archive by script family"
          className="h-9 px-3 rounded bg-[#151A18] border border-[#39443D] text-xs text-[#F0E8D8] focus:outline-none focus:border-[#C9A66B]"
        >
          {scriptOptions.map((s) => (
            <option key={s} value={s}>
              {s === 'All' ? 'All Writing Systems' : s}
            </option>
          ))}
        </select>

        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          aria-label="Filter archive by historical period"
          className="h-9 px-3 rounded bg-[#151A18] border border-[#39443D] text-xs text-[#F0E8D8] focus:outline-none focus:border-[#C9A66B]"
        >
          {periodOptions.map((p) => (
            <option key={p} value={p}>
              {p === 'All' ? 'All Historical Periods' : p}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter archive by restoration status"
          className="h-9 px-3 rounded bg-[#151A18] border border-[#39443D] text-xs text-[#F0E8D8] focus:outline-none focus:border-[#C9A66B]"
        >
          {statusOptions.map((st) => (
            <option key={st} value={st}>
              {st === 'All' ? 'All Restoration Statuses' : st}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-[#A9ADA3] shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'id' | 'confidence' | 'date')}
            aria-label="Sort artifact archive"
            className="w-full h-9 px-3 rounded bg-[#151A18] border border-[#39443D] text-xs text-[#F0E8D8] focus:outline-none focus:border-[#C9A66B]"
          >
            <option value="id">Sort by Artifact ID</option>
            <option value="confidence">Sort by Model Confidence Est.</option>
            <option value="date">Sort by Recently Analyzed</option>
          </select>
        </div>
      </div>

      {/* Archive Grid */}
      {filteredArtifacts.length === 0 ? (
        <div className="bg-[#1C2420] border border-[#39443D] rounded-lg p-12 text-center space-y-3">
          <p className="text-sm text-[#A9ADA3]">No specimens match the selected filters.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setScriptFilter('All');
              setPeriodFilter('All');
              setStatusFilter('All');
            }}
            className="px-4 py-2 rounded bg-[#232C27] border border-[#39443D] text-xs text-[#C9A66B]"
          >
            Reset Archive Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArtifacts.map((artifact) => (
            <div
              key={artifact.id}
              className="bg-[#232C27] border border-[#39443D] rounded-lg overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="aspect-[4/3] bg-[#151A18] relative overflow-hidden">
                  <ArtifactImage
                    src={artifact.imageUrl}
                    alt={artifact.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#151A18]/85 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#C9A66B]">
                      {isPublic ? artifact.civilization : artifact.id}
                    </span>
                    <span className="text-[#F0E8D8] tabular-nums">{artifact.dateRange}</span>
                  </div>
                </div>

                <div className="p-5 space-y-2.5">
                  <h2 className="font-serif text-xl font-medium text-[#F0E8D8]">
                    {artifact.title}
                  </h2>
                  {isPublic ? (
                    <p className="text-xs text-[#A9ADA3] leading-relaxed">
                      {artifact.plainEnglishStory || artifact.summary}
                    </p>
                  ) : (
                    <dl className="space-y-1.5 text-xs pt-1">
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#A9ADA3]">Script Family</dt>
                        <dd className="text-[#F0E8D8] text-right">{artifact.scriptFamily}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#A9ADA3]">Historical Period</dt>
                        <dd className="text-[#F0E8D8] text-right">{artifact.historicalPeriod}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#A9ADA3]">Location</dt>
                        <dd className="text-[#F0E8D8] text-right">{artifact.location}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#A9ADA3]">Restoration Status</dt>
                        <dd
                          className={`text-right font-medium ${
                            artifact.restorationStatus === 'Verified Baseline'
                              ? 'text-[#456B58]'
                              : 'text-[#C9A66B]'
                          }`}
                        >
                          {artifact.restorationStatus}
                        </dd>
                      </div>
                    </dl>
                  )}
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-[#39443D] bg-[#1C2420]/60 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectArtifact(artifact.id);
                    onNavigate('investigation');
                  }}
                  className="text-xs font-medium text-[#C9A66B] hover:underline whitespace-nowrap"
                >
                  {isPublic ? 'View Artifact' : 'Investigation Lab'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectArtifact(artifact.id);
                    onNavigate('restoration');
                  }}
                  className="text-xs text-[#F0E8D8] hover:text-[#C9A66B] whitespace-nowrap"
                >
                  {isPublic ? 'Read Translation →' : 'Restoration Studio →'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
