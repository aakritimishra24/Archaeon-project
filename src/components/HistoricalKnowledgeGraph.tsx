import React, { useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Edge,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  NodeProps,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import {
  Expand,
  Filter,
  GitBranch,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import type {
  AudienceMode,
  KnowledgeGraphEntity,
  KnowledgeGraphRelation,
  PageId,
  RelationshipPredicate,
} from '../types/archaeon';

interface HistoricalKnowledgeGraphProps {
  entities: KnowledgeGraphEntity[];
  relations: KnowledgeGraphRelation[];
  audienceMode: AudienceMode;
  selectedEntityId: string | null;
  onSelectEntityId: (id: string | null) => void;
  onSelectArtifact: (artifactId: string) => void;
  onNavigate: (page: PageId) => void;
}

interface CustomNodeData extends Record<string, unknown> {
  entity: KnowledgeGraphEntity;
  isSelected: boolean;
  isDimmed: boolean;
  isPublic: boolean;
}

const NODE_TYPE_TECH: Record<KnowledgeGraphEntity['nodeType'], string> = {
  Artifact: 'ARTIFACT',
  Civilization: 'CIVILIZATION',
  'Historical Figure': 'FIGURE',
  Language: 'LANGUAGE',
  'Historical Period': 'PERIOD',
  Location: 'LOCATION',
  Inscription: 'INSCRIPTION',
};

const NODE_TYPE_PUBLIC: Record<KnowledgeGraphEntity['nodeType'], string> = {
  Artifact: 'Ancient Object',
  Civilization: 'Civilization',
  'Historical Figure': 'Historical Person',
  Language: 'Language',
  'Historical Period': 'Time Period',
  Location: 'Place',
  Inscription: 'Related Writing',
};

const PREDICATE_PUBLIC: Record<RelationshipPredicate, string> = {
  BELONGS_TO: 'Came from',
  WRITTEN_IN: 'Written in',
  FOUND_AT: 'Found in',
  DATED_TO: 'From era',
  MENTIONS: 'Mentions',
  SIMILAR_TO: 'Connected to',
};

const ArchaeologicalNode: React.FC<NodeProps<Node<CustomNodeData>>> = ({ data }) => {
  const { entity, isSelected, isDimmed, isPublic } = data;
  const isUncertain = entity.verificationStatus !== 'verified';

  return (
    <div
      className={`min-w-[185px] max-w-[230px] rounded-md px-3.5 py-2.5 border transition-all ${
        isSelected
          ? 'bg-[#29332E] border-[#C9A66B] shadow-[0_0_0_2px_rgba(201,166,107,0.35)]'
          : isUncertain
            ? 'bg-[#232C27] border-[#A85D48]/80 hover:border-[#C9A66B]'
            : 'bg-[#1C2420] border-[#39443D] hover:border-[#C9A66B]/70'
      } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-[#C9A66B] !border-[#151A18]"
      />
      <div className="flex items-center justify-between gap-2 mb-1">
        <span
          className={`text-[10px] font-mono tracking-wider ${
            isSelected ? 'text-[#C9A66B]' : 'text-[#A9ADA3]'
          }`}
        >
          {isPublic ? NODE_TYPE_PUBLIC[entity.nodeType] : NODE_TYPE_TECH[entity.nodeType]}
        </span>
        <span
          className={`text-[10px] font-mono ${
            entity.verificationStatus === 'verified' ? 'text-[#456B58]' : 'text-[#A85D48]'
          }`}
        >
          {entity.verificationStatus === 'verified'
            ? isPublic
              ? 'Confirmed'
              : 'VERIFIED'
            : isPublic
              ? 'Possible'
              : 'HYPOTHESIS'}
        </span>
      </div>
      <div className="font-serif text-sm font-semibold text-[#F0E8D8] leading-snug">
        {entity.label}
      </div>
      {entity.period && (
        <div className="text-[10px] text-[#A9ADA3] mt-1 truncate">{entity.period}</div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-[#C9A66B] !border-[#151A18]"
      />
    </div>
  );
};

const nodeTypes = {
  archaeological: ArchaeologicalNode,
};

export const HistoricalKnowledgeGraph: React.FC<HistoricalKnowledgeGraphProps> = ({
  entities,
  relations,
  audienceMode,
  selectedEntityId,
  onSelectEntityId,
  onSelectArtifact,
  onNavigate,
}) => {
  const isPublic = audienceMode === 'public';
  const [searchQuery, setSearchQuery] = useState('');
  const [civFilter, setCivFilter] = useState('All');
  const [periodFilter, setPeriodFilter] = useState('All');
  const [langFilter, setLangFilter] = useState('All');
  const [expanded, setExpanded] = useState(false);
  const [highlightConnected, setHighlightConnected] = useState(true);

  const civilizations = useMemo(
    () =>
      [
        'All',
        ...Array.from(new Set(entities.map((e) => e.civilization).filter(Boolean))),
      ] as string[],
    [entities]
  );
  const periods = useMemo(
    () =>
      ['All', ...Array.from(new Set(entities.map((e) => e.period).filter(Boolean)))] as string[],
    [entities]
  );
  const languages = useMemo(
    () =>
      ['All', ...Array.from(new Set(entities.map((e) => e.language).filter(Boolean)))] as string[],
    [entities]
  );

  const filteredEntities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entities.filter((e) => {
      if (!expanded && e.isExpandedOnly) return false;
      if (civFilter !== 'All' && e.civilization !== civFilter) return false;
      if (periodFilter !== 'All' && e.period !== periodFilter) return false;
      if (langFilter !== 'All' && e.language !== langFilter) return false;
      if (
        q &&
        !e.label.toLowerCase().includes(q) &&
        !e.nodeType.toLowerCase().includes(q) &&
        !e.description.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [entities, expanded, civFilter, periodFilter, langFilter, searchQuery]);

  const visibleIds = useMemo(() => new Set(filteredEntities.map((e) => e.id)), [filteredEntities]);

  const visibleRelations = useMemo(
    () =>
      relations.filter(
        (r) =>
          (expanded || !r.isExpandedOnly) && visibleIds.has(r.source) && visibleIds.has(r.target)
      ),
    [relations, expanded, visibleIds]
  );

  const connectedToSelected = useMemo(() => {
    const set = new Set<string>();
    if (!selectedEntityId) return set;
    set.add(selectedEntityId);
    visibleRelations.forEach((rel) => {
      if (rel.source === selectedEntityId) set.add(rel.target);
      if (rel.target === selectedEntityId) set.add(rel.source);
    });
    return set;
  }, [selectedEntityId, visibleRelations]);

  const computedNodes: Node<CustomNodeData>[] = useMemo(
    () =>
      filteredEntities.map((entity) => ({
        id: entity.id,
        type: 'archaeological',
        position: entity.position,
        data: {
          entity,
          isSelected: entity.id === selectedEntityId,
          isDimmed:
            highlightConnected &&
            Boolean(selectedEntityId) &&
            !connectedToSelected.has(entity.id),
          isPublic,
        },
      })),
    [filteredEntities, selectedEntityId, highlightConnected, connectedToSelected, isPublic]
  );

  const computedEdges: Edge[] = useMemo(
    () =>
      visibleRelations.map((rel) => {
        const isVerified = rel.verificationStatus === 'verified';
        const isRelatedToSelected =
          !selectedEntityId || rel.source === selectedEntityId || rel.target === selectedEntityId;
        const strokeColor = isVerified ? '#456B58' : '#A85D48';

        return {
          id: rel.id,
          source: rel.source,
          target: rel.target,
          label: isPublic ? PREDICATE_PUBLIC[rel.predicate] : rel.predicate,
          animated: !isVerified,
          style: {
            stroke: strokeColor,
            strokeWidth: isRelatedToSelected ? 2 : 1.2,
            strokeDasharray: isVerified ? undefined : '6 4',
            opacity: highlightConnected && selectedEntityId && !isRelatedToSelected ? 0.25 : 0.92,
          },
          labelStyle: {
            fill: isVerified ? '#A9ADA3' : '#A85D48',
            fontSize: 10,
            fontFamily: 'IBM Plex Mono, monospace',
          },
          labelBgStyle: {
            fill: '#151A18',
            fillOpacity: 0.9,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
          },
        };
      }),
    [visibleRelations, selectedEntityId, highlightConnected, isPublic]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(computedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(computedEdges);

  useEffect(() => {
    setNodes(computedNodes);
  }, [computedNodes, setNodes]);

  useEffect(() => {
    setEdges(computedEdges);
  }, [computedEdges, setEdges]);

  const selectedEntity = useMemo(
    () => entities.find((e) => e.id === selectedEntityId) || null,
    [entities, selectedEntityId]
  );

  const selectedEntityRelations = useMemo(() => {
    if (!selectedEntity) return [];
    return relations
      .filter((r) => r.source === selectedEntity.id || r.target === selectedEntity.id)
      .map((r) => {
        const otherId = r.source === selectedEntity.id ? r.target : r.source;
        const otherEntity = entities.find((e) => e.id === otherId);
        return { relation: r, otherEntity };
      })
      .filter((item) => Boolean(item.otherEntity));
  }, [selectedEntity, relations, entities]);

  const handleReset = () => {
    setSearchQuery('');
    setCivFilter('All');
    setPeriodFilter('All');
    setLangFilter('All');
    setExpanded(false);
    onSelectEntityId(null);
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* Control Toolbar */}
      <div className="bg-[#1C2420] border border-[#39443D] rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-[#F0E8D8]">
              {isPublic ? 'History Connections Map' : 'Historical Knowledge Graph'}
            </h1>
            <p className="text-xs text-[#A9ADA3]">
              {isPublic
                ? 'Click any card in the map to see how ancient objects, rulers, places, and languages connect'
                : 'Semantic provenance network linking artifacts, civilizations, historical figures, languages, and corpora'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setHighlightConnected((prev) => !prev)}
              className={`h-9 px-3 rounded border text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap ${
                highlightConnected
                  ? 'bg-[#29332E] border-[#C9A66B] text-[#C9A66B]'
                  : 'bg-[#151A18] border-[#39443D] text-[#A9ADA3]'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              Highlight Connected
            </button>

            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className={`h-9 px-3 rounded border text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap ${
                expanded
                  ? 'bg-[#C9A66B] border-[#C9A66B] text-[#151A18]'
                  : 'bg-[#151A18] border-[#39443D] text-[#F0E8D8] hover:border-[#C9A66B]'
              }`}
            >
              <Expand className="w-3.5 h-3.5" />
              {expanded
                ? isPublic
                  ? 'Show Core Map'
                  : 'Collapse Secondary Corpus'
                : isPublic
                  ? 'Show More Stories'
                  : 'Expand Relationships'}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="h-9 px-3 rounded bg-[#151A18] border border-[#39443D] hover:border-[#C9A66B] text-xs font-medium text-[#A9ADA3] hover:text-[#F0E8D8] inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#39443D]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#A9ADA3] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isPublic ? 'Find a place, king, or object...' : 'Search nodes...'}
              aria-label="Search graph nodes"
              className="w-full h-9 pl-8 pr-3 rounded bg-[#151A18] border border-[#39443D] text-xs text-[#F0E8D8] focus:outline-none focus:border-[#C9A66B]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#A9ADA3] shrink-0" />
            <select
              value={civFilter}
              onChange={(e) => setCivFilter(e.target.value)}
              aria-label="Filter by civilization"
              className="w-full h-9 px-2.5 rounded bg-[#151A18] border border-[#39443D] text-xs text-[#F0E8D8] focus:outline-none focus:border-[#C9A66B]"
            >
              {civilizations.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Civilizations' : c}
                </option>
              ))}
            </select>
          </div>

          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            aria-label="Filter by historical period"
            className="w-full h-9 px-2.5 rounded bg-[#151A18] border border-[#39443D] text-xs text-[#F0E8D8] focus:outline-none focus:border-[#C9A66B]"
          >
            {periods.map((p) => (
              <option key={p} value={p}>
                {p === 'All' ? 'All Time Periods' : p}
              </option>
            ))}
          </select>

          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            aria-label="Filter by language"
            className="w-full h-9 px-2.5 rounded bg-[#151A18] border border-[#39443D] text-xs text-[#F0E8D8] focus:outline-none focus:border-[#C9A66B]"
          >
            {languages.map((l) => (
              <option key={l} value={l}>
                {l === 'All' ? 'All Languages' : l}
              </option>
            ))}
          </select>
        </div>

        {/* Semantic Color Key */}
        <div className="flex flex-wrap items-center gap-6 text-[11px] font-mono text-[#A9ADA3] pt-1">
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-0.5 bg-[#C9A66B]" /> Selected Item
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-0.5 bg-[#456B58]" />{' '}
            {isPublic ? 'Confirmed History' : 'Verified Relationship'}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-4 border-t-2 border-dashed border-[#A85D48]" />{' '}
            {isPublic ? 'Possible Connection (AI Guess)' : 'Uncertain / AI-Suggested Link'}
          </span>
        </div>
      </div>

      {/* Main Graph Canvas + Side Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div
          className={`${
            selectedEntity ? 'lg:col-span-8' : 'lg:col-span-12'
          } h-[620px] bg-[#151A18] border border-[#39443D] rounded-lg overflow-hidden relative`}
        >
          {filteredEntities.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <p className="text-sm text-[#A9ADA3]">
                No items match the current filter combination.
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="mt-3 px-4 py-2 rounded bg-[#232C27] border border-[#39443D] text-xs text-[#C9A66B]"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={(_event, node) => onSelectEntityId(node.id)}
              fitView
              minZoom={0.35}
              maxZoom={1.8}
            >
              <Background color="#29332E" gap={24} size={1} />
              <Controls />
              <MiniMap
                nodeColor={(n) => {
                  const data = n.data as CustomNodeData;
                  if (data?.isSelected) return '#C9A66B';
                  return data?.entity?.verificationStatus === 'verified' ? '#456B58' : '#A85D48';
                }}
                maskColor="rgba(21, 26, 24, 0.78)"
              />
            </ReactFlow>
          )}
        </div>

        {/* Node Detail Inspector */}
        {selectedEntity && (
          <aside className="lg:col-span-4 bg-[#1C2420] border border-[#39443D] rounded-lg p-5 space-y-4 h-[620px] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#39443D]">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#C9A66B]">
                  {isPublic
                    ? NODE_TYPE_PUBLIC[selectedEntity.nodeType]
                    : selectedEntity.nodeType}
                </div>
                <h2 className="font-serif text-2xl font-medium text-[#F0E8D8] mt-0.5">
                  {selectedEntity.label}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onSelectEntityId(null)}
                className="p-1.5 rounded text-[#A9ADA3] hover:text-[#F0E8D8] hover:bg-[#232C27]"
                aria-label="Close entity inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs p-3 rounded bg-[#151A18] border border-[#39443D]">
              <span className="inline-flex items-center gap-1.5 font-medium">
                {selectedEntity.verificationStatus === 'verified' ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#456B58]" />
                    <span className="text-[#456B58]">
                      {isPublic ? 'Confirmed Historical Fact' : 'Verified Historical Record'}
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-[#A85D48]" />
                    <span className="text-[#A85D48]">
                      {isPublic ? 'Possible Connection (Not Proven)' : 'Uncertain / AI Hypothesis'}
                    </span>
                  </>
                )}
              </span>
              {!isPublic && selectedEntity.confidenceEstimate && (
                <span className="font-mono tabular-nums text-[#C9A66B]">
                  {selectedEntity.confidenceEstimate}% Est.
                </span>
              )}
            </div>

            <p className="text-xs text-[#F0E8D8] leading-relaxed">{selectedEntity.description}</p>

            <dl className="space-y-2 text-xs pt-2 border-t border-[#39443D]">
              {selectedEntity.period && (
                <div className="flex justify-between gap-2">
                  <dt className="text-[#A9ADA3]">Historical Period</dt>
                  <dd className="text-[#F0E8D8] text-right">{selectedEntity.period}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-[#A9ADA3]">
                  {isPublic ? 'Reference Archive' : 'Source Database'}
                </dt>
                <dd className="text-[#C9A66B] text-right font-mono">
                  {selectedEntity.sourceDatabase}
                </dd>
              </div>
            </dl>

            <div className="space-y-2 pt-2 border-t border-[#39443D]">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#A9ADA3]">
                {isPublic ? 'Historical Sources' : 'Evidence References'}
              </div>
              <ul className="space-y-1 text-xs text-[#F0E8D8]">
                {selectedEntity.evidenceReferences.map((ref, idx) => (
                  <li key={idx}>• {ref}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#39443D]">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#A9ADA3]">
                Connected To ({selectedEntityRelations.length})
              </div>
              <div className="space-y-2">
                {selectedEntityRelations.map(({ relation, otherEntity }) => (
                  <button
                    key={relation.id}
                    type="button"
                    onClick={() => otherEntity && onSelectEntityId(otherEntity.id)}
                    className="w-full text-left p-2.5 rounded bg-[#232C27] hover:bg-[#29332E] border border-[#39443D] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                      <span
                        className={
                          relation.verificationStatus === 'verified'
                            ? 'text-[#456B58]'
                            : 'text-[#A85D48]'
                        }
                      >
                        {isPublic ? PREDICATE_PUBLIC[relation.predicate] : relation.predicate}
                      </span>
                      <span className="text-[#A9ADA3]">
                        {otherEntity
                          ? isPublic
                            ? NODE_TYPE_PUBLIC[otherEntity.nodeType]
                            : otherEntity.nodeType
                          : ''}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-[#F0E8D8] mt-0.5">
                      {otherEntity?.label}
                    </div>
                    <div className="text-[11px] text-[#A9ADA3] mt-0.5">
                      {relation.evidenceCitation}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedEntity.nodeType === 'Artifact' && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectArtifact(selectedEntity.id);
                    onNavigate('investigation');
                  }}
                  className="w-full py-2.5 px-4 rounded bg-[#C9A66B] hover:bg-[#AD8952] text-[#151A18] text-xs font-semibold transition-colors"
                >
                  {isPublic ? 'Inspect This Artifact' : 'Open Artifact in Investigation Lab'}
                </button>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};
