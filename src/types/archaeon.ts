export type AudienceMode = 'public' | 'technical';

export type PageId =
  | 'dashboard'
  | 'investigation'
  | 'studio-3d'
  | 'restoration'
  | 'image-studio'
  | 'knowledge-graph'
  | 'map-atlas'
  | 'fragment-lab'
  | 'evidence'
  | 'archive'
  | 'reports';

export type AnalysisSourceMode = 'demonstration' | 'live-ai';

export type EpistemicStatus = 'verified' | 'ai-hypothesis' | 'unverified';

export interface BoundingBox {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  w: number; // percentage 0-100
  h: number; // percentage 0-100
}

export interface DetectedSymbol {
  id: string;
  glyph: string;
  transliteration: string;
  phoneticValue: string;
  plainEnglishMeaning?: string;
  lineNumber: number;
  confidence: number; // 0-100 model estimate
  bbox: BoundingBox;
  notes: string;
}

export interface DamagedRegion {
  id: string;
  label: string;
  damageType: 'Abrasion' | 'Fracture' | 'Spalling' | 'Ink Fading' | 'Pitting';
  severity: 'High' | 'Moderate' | 'Low';
  areaPercent: number;
  bbox: BoundingBox;
  description: string;
  plainEnglishImpact?: string;
}

export interface TranscriptionLine {
  lineNumber: number;
  originalText: string;
  lacunaCount: number;
  paleographicNote: string;
}

export type HypothesisDecision = 'pending' | 'accepted' | 'rejected';

export interface RestorationHypothesis {
  id: string;
  rank: 1 | 2 | 3;
  title: string;
  reconstructedText: string;
  plainEnglishTranslation?: string;
  predictedCharacters: string;
  confidenceEstimate: number; // Uncalibrated model estimate 0-100
  epistemicNote: string;
  supportingEvidence: string[];
  similarReferences: string[];
  explanation: string;
  decision: HypothesisDecision;
  manualEditText?: string;
}

export interface ArtifactRecord {
  id: string;
  title: string;
  scriptFamily: string;
  artifactType: string;
  civilization: string;
  language: string;
  historicalPeriod: string;
  dateRange: string;
  location: string;
  material: string;
  dimensions: string;
  museumCollection: string;
  accessionReference: string;
  imageUrl: string;
  restorationStatus: 'Verified Baseline' | 'Hypotheses Pending' | 'Under Review' | 'Newly Uploaded';
  analysisSource: AnalysisSourceMode;
  summary: string;
  plainEnglishStory?: string;
  whyItMatters?: string;
  overallConfidenceEstimate: number;
  detectedSymbols: DetectedSymbol[];
  damagedRegions: DamagedRegion[];
  transcriptionLines: TranscriptionLine[];
  hypotheses: RestorationHypothesis[];
  researcherCorrections: ResearcherCorrection[];
  analyzedAt: string;
}

export interface ResearcherCorrection {
  id: string;
  artifactId: string;
  hypothesisId: string;
  originalPrediction: string;
  correctedReading: string;
  rationale: string;
  author: string;
  timestamp: string;
}

export type KnowledgeNodeType =
  | 'Artifact'
  | 'Civilization'
  | 'Historical Figure'
  | 'Language'
  | 'Historical Period'
  | 'Location'
  | 'Inscription';

export type RelationshipPredicate =
  | 'BELONGS_TO'
  | 'WRITTEN_IN'
  | 'FOUND_AT'
  | 'DATED_TO'
  | 'MENTIONS'
  | 'SIMILAR_TO';

export interface KnowledgeGraphEntity {
  id: string;
  label: string;
  nodeType: KnowledgeNodeType;
  civilization?: string;
  period?: string;
  language?: string;
  description: string;
  sourceDatabase: string;
  evidenceReferences: string[];
  verificationStatus: EpistemicStatus;
  confidenceEstimate?: number;
  isExpandedOnly?: boolean;
  position: { x: number; y: number };
}

export interface KnowledgeGraphRelation {
  id: string;
  source: string;
  target: string;
  predicate: RelationshipPredicate;
  verificationStatus: 'verified' | 'uncertain';
  evidenceCitation: string;
  confidenceEstimate?: number;
  isExpandedOnly?: boolean;
}

export interface EvidenceClaim {
  id: string;
  category:
    | 'Related Inscriptions'
    | 'Similar Symbol Patterns'
    | 'Historical References'
    | 'Relevant People'
    | 'Ancient Locations'
    | 'Related Historical Events';
  title: string;
  claimText: string;
  artifactIds: string[];
  epistemicStatus: EpistemicStatus;
  sourceCitation: string;
  repository: string;
  dateContext: string;
  confidenceEstimate?: number;
}

export interface FragmentItem {
  id: string;
  label: string;
  artifactId: string;
  imageUrl: string;
  material: string;
  scriptFamily: string;
  thicknessMm: number;
  fractureAngleDeg: number;
}

export interface FragmentMatchSuggestion {
  id: string;
  title: string;
  fragmentA: FragmentItem;
  fragmentB: FragmentItem;
  overallSimilarityScore: number;
  edgeContourScore: number;
  surfaceTextureScore: number;
  strokeContinuityScore: number;
  suggestedOffset: { x: number; y: number; rotationDeg: number };
  computationalRationale: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  targetPage: PageId;
  artifactId?: string;
  unread: boolean;
}
