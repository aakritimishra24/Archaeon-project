import { useEffect, useMemo, useState } from 'react';
import { MotionConfig } from 'motion/react';
import type {
  ArtifactRecord,
  AudienceMode,
  HypothesisDecision,
  NotificationItem,
  PageId,
  RestorationHypothesis,
} from './types/archaeon';
import {
  EVIDENCE_CLAIMS,
  FRAGMENT_MATCH_SUGGESTIONS,
  INITIAL_NOTIFICATIONS,
  KNOWLEDGE_GRAPH_ENTITIES,
  KNOWLEDGE_GRAPH_RELATIONS,
  RESEARCHER_PROFILE,
  SAMPLE_ARTIFACTS,
} from './data/archaeonCorpus';
import { AppShell } from './components/AppShell';
import { LandingDashboard } from './components/LandingDashboard';
import { ArtifactInvestigationLab } from './components/ArtifactInvestigationLab';
import { Artifact3DStudio } from './components/Artifact3DStudio';
import { AiRestorationStudio } from './components/AiRestorationStudio';
import { ImageCreationStudio } from './components/ImageCreationStudio';
import { HistoricalKnowledgeGraph } from './components/HistoricalKnowledgeGraph';
import { ArchaeologicalMapAtlas } from './components/ArchaeologicalMapAtlas';
import { FragmentMatchingLaboratory } from './components/FragmentMatchingLaboratory';
import { EvidenceExplorer } from './components/EvidenceExplorer';
import { ArtifactArchive } from './components/ArtifactArchive';
import { ResearchReports } from './components/ResearchReports';

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [audienceMode, setAudienceMode] = useState<AudienceMode>('public');
  const [artifacts, setArtifacts] = useState<ArtifactRecord[]>(SAMPLE_ARTIFACTS);
  const [activeArtifactId, setActiveArtifactId] = useState<string>(SAMPLE_ARTIFACTS[0].id);
  const [selectedGraphEntityId, setSelectedGraphEntityId] = useState<string | null>(
    SAMPLE_ARTIFACTS[0].id
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setGeminiConfigured(Boolean(data.geminiConfigured)))
      .catch(() => setGeminiConfigured(false));
  }, []);

  useEffect(() => {
    const handleQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  const activeArtifact = useMemo(
    () => artifacts.find((a) => a.id === activeArtifactId) || artifacts[0],
    [artifacts, activeArtifactId]
  );

  const handleAddAnalyzedArtifact = (newArtifact: ArtifactRecord) => {
    setArtifacts((prev) => [newArtifact, ...prev]);
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: `${newArtifact.id} Staged`,
        detail: `${newArtifact.title} processed (${newArtifact.analysisSource === 'live-ai' ? 'Live Gemini AI' : 'Demonstration Mode'}).`,
        timestamp: 'Just now',
        targetPage: 'investigation',
        artifactId: newArtifact.id,
        unread: true,
      },
      ...prev,
    ]);
  };

  const handleUpdateHypothesisDecision = (
    artifactId: string,
    hypothesisId: string,
    decision: HypothesisDecision
  ) => {
    setArtifacts((prev) =>
      prev.map((art) => {
        if (art.id !== artifactId) return art;
        const updatedHyps = art.hypotheses.map((h) =>
          h.id === hypothesisId ? { ...h, decision } : h
        );
        const anyAccepted = updatedHyps.some((h) => h.decision === 'accepted');
        return {
          ...art,
          restorationStatus: anyAccepted ? 'Verified Baseline' : 'Under Review',
          hypotheses: updatedHyps,
        };
      })
    );
  };

  const handleSaveManualEdit = (
    artifactId: string,
    hypothesisId: string,
    editedText: string,
    rationale: string
  ) => {
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
    setArtifacts((prev) =>
      prev.map((art) => {
        if (art.id !== artifactId) return art;
        const targetHyp = art.hypotheses.find((h) => h.id === hypothesisId);
        return {
          ...art,
          restorationStatus: 'Under Review',
          hypotheses: art.hypotheses.map((h) =>
            h.id === hypothesisId ? { ...h, manualEditText: editedText } : h
          ),
          researcherCorrections: [
            {
              id: `corr-${Date.now()}`,
              artifactId,
              hypothesisId,
              originalPrediction: targetHyp?.reconstructedText || '',
              correctedReading: editedText,
              rationale,
              author: RESEARCHER_PROFILE.name,
              timestamp,
            },
            ...art.researcherCorrections,
          ],
        };
      })
    );
  };

  const handleReplaceHypotheses = (
    artifactId: string,
    newHypotheses: RestorationHypothesis[]
  ) => {
    setArtifacts((prev) =>
      prev.map((art) =>
        art.id === artifactId
          ? {
              ...art,
              hypotheses: newHypotheses,
              restorationStatus: 'Hypotheses Pending',
            }
          : art
      )
    );
  };

  const handleMarkNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <MotionConfig reducedMotion="user">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}
      <AppShell
        activePage={activePage}
        onNavigate={setActivePage}
        audienceMode={audienceMode}
        onChangeAudienceMode={setAudienceMode}
        artifacts={artifacts}
        activeArtifact={activeArtifact}
        onSelectArtifact={(id) => {
          setActiveArtifactId(id);
          setSelectedGraphEntityId(id);
        }}
        graphEntities={KNOWLEDGE_GRAPH_ENTITIES}
        onSelectGraphEntity={setSelectedGraphEntityId}
        notifications={notifications}
        onMarkNotificationsRead={handleMarkNotificationsRead}
        geminiConfigured={geminiConfigured}
      >
        {activePage === 'dashboard' && (
          <LandingDashboard
            artifacts={artifacts}
            audienceMode={audienceMode}
            onChangeAudienceMode={setAudienceMode}
            onSelectArtifact={setActiveArtifactId}
            onNavigate={setActivePage}
            onAddAnalyzedArtifact={handleAddAnalyzedArtifact}
            geminiConfigured={geminiConfigured}
          />
        )}

        {activePage === 'investigation' && (
          <ArtifactInvestigationLab
            artifacts={artifacts}
            activeArtifact={activeArtifact}
            audienceMode={audienceMode}
            onSelectArtifact={setActiveArtifactId}
            onNavigate={setActivePage}
          />
        )}

        {activePage === 'studio-3d' && (
          <Artifact3DStudio
            artifacts={artifacts}
            activeArtifact={activeArtifact}
            audienceMode={audienceMode}
            onSelectArtifact={setActiveArtifactId}
          />
        )}

        {activePage === 'restoration' && (
          <AiRestorationStudio
            artifacts={artifacts}
            activeArtifact={activeArtifact}
            audienceMode={audienceMode}
            onSelectArtifact={setActiveArtifactId}
            onUpdateHypothesisDecision={handleUpdateHypothesisDecision}
            onSaveManualEdit={handleSaveManualEdit}
            onReplaceHypotheses={handleReplaceHypotheses}
            onNavigate={setActivePage}
          />
        )}

        {activePage === 'image-studio' && (
          <ImageCreationStudio
            artifacts={artifacts}
            activeArtifact={activeArtifact}
            audienceMode={audienceMode}
            onSelectArtifact={setActiveArtifactId}
            onNavigate={setActivePage}
          />
        )}

        {activePage === 'knowledge-graph' && (
          <HistoricalKnowledgeGraph
            entities={KNOWLEDGE_GRAPH_ENTITIES}
            relations={KNOWLEDGE_GRAPH_RELATIONS}
            audienceMode={audienceMode}
            selectedEntityId={selectedGraphEntityId}
            onSelectEntityId={setSelectedGraphEntityId}
            onSelectArtifact={setActiveArtifactId}
            onNavigate={setActivePage}
          />
        )}

        {activePage === 'map-atlas' && (
          <ArchaeologicalMapAtlas
            artifacts={artifacts}
            activeArtifact={activeArtifact}
            audienceMode={audienceMode}
            onSelectArtifact={setActiveArtifactId}
          />
        )}

        {activePage === 'fragment-lab' && (
          <FragmentMatchingLaboratory
            suggestions={FRAGMENT_MATCH_SUGGESTIONS}
            audienceMode={audienceMode}
          />
        )}

        {activePage === 'evidence' && (
          <EvidenceExplorer
            claims={EVIDENCE_CLAIMS}
            audienceMode={audienceMode}
            onSelectArtifact={setActiveArtifactId}
            onSelectGraphEntity={setSelectedGraphEntityId}
            onNavigate={setActivePage}
          />
        )}

        {activePage === 'archive' && (
          <ArtifactArchive
            artifacts={artifacts}
            audienceMode={audienceMode}
            onSelectArtifact={setActiveArtifactId}
            onNavigate={setActivePage}
          />
        )}

        {activePage === 'reports' && (
          <ResearchReports
            artifacts={artifacts}
            activeArtifact={activeArtifact}
            audienceMode={audienceMode}
            onSelectArtifact={setActiveArtifactId}
            evidenceClaims={EVIDENCE_CLAIMS}
            graphEntities={KNOWLEDGE_GRAPH_ENTITIES}
            graphRelations={KNOWLEDGE_GRAPH_RELATIONS}
          />
        )}
      </AppShell>
    </MotionConfig>
  );
}
