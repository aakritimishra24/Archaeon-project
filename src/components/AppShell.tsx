import React, { useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  Box,
  Compass,
  FileText,
  FolderArchive,
  ImagePlus,
  Layers,
  MapPin,
  Menu,
  Microscope,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import type {
  ArtifactRecord,
  AudienceMode,
  KnowledgeGraphEntity,
  NotificationItem,
  PageId,
} from '../types/archaeon';
import { RESEARCHER_PROFILE } from '../data/archaeonCorpus';
import { ArtifactImage } from './ArtifactImage';

interface AppShellProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  audienceMode: AudienceMode;
  onChangeAudienceMode: (mode: AudienceMode) => void;
  artifacts: ArtifactRecord[];
  activeArtifact: ArtifactRecord;
  onSelectArtifact: (artifactId: string) => void;
  graphEntities: KnowledgeGraphEntity[];
  onSelectGraphEntity: (entityId: string) => void;
  notifications: NotificationItem[];
  onMarkNotificationsRead: () => void;
  geminiConfigured: boolean | null;
  children: React.ReactNode;
}

const NAV_ITEMS: {
  id: PageId;
  technicalLabel: string;
  publicLabel: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'dashboard', technicalLabel: 'Landing Dashboard', publicLabel: 'Discover', icon: Compass },
  {
    id: 'investigation',
    technicalLabel: 'Investigation Lab',
    publicLabel: 'Artifact Viewer',
    icon: Microscope,
  },
  {
    id: 'studio-3d',
    technicalLabel: '3D Spatial Studio',
    publicLabel: '3D Artifact View',
    icon: Box,
  },
  {
    id: 'restoration',
    technicalLabel: 'AI Restoration Studio',
    publicLabel: 'Translation Studio',
    icon: Sparkles,
  },
  {
    id: 'image-studio',
    technicalLabel: 'Visual Image Studio',
    publicLabel: 'Visual Reconstruction',
    icon: ImagePlus,
  },
  {
    id: 'knowledge-graph',
    technicalLabel: 'Knowledge Graph',
    publicLabel: 'History Connections',
    icon: Network,
  },
  {
    id: 'map-atlas',
    technicalLabel: 'Provenance Atlas',
    publicLabel: 'Explore Ancient Sites',
    icon: MapPin,
  },
  {
    id: 'fragment-lab',
    technicalLabel: 'Fragment Matching',
    publicLabel: 'Fragment Puzzle',
    icon: Layers,
  },
  {
    id: 'evidence',
    technicalLabel: 'Evidence Explorer',
    publicLabel: 'Fact & Source Check',
    icon: BookOpen,
  },
  {
    id: 'archive',
    technicalLabel: 'Artifact Archive',
    publicLabel: 'Museum Gallery',
    icon: FolderArchive,
  },
  {
    id: 'reports',
    technicalLabel: 'Research Reports',
    publicLabel: 'Visitor Handout',
    icon: FileText,
  },
];

export const AppShell: React.FC<AppShellProps> = ({
  activePage,
  onNavigate,
  audienceMode,
  onChangeAudienceMode,
  artifacts,
  activeArtifact,
  onSelectArtifact,
  graphEntities,
  onSelectGraphEntity,
  notifications,
  onMarkNotificationsRead,
  geminiConfigured,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { artifacts: [], entities: [] };
    return {
      artifacts: artifacts
        .filter(
          (a) =>
            a.id.toLowerCase().includes(q) ||
            a.title.toLowerCase().includes(q) ||
            a.scriptFamily.toLowerCase().includes(q) ||
            a.civilization.toLowerCase().includes(q)
        )
        .slice(0, 4),
      entities: graphEntities
        .filter(
          (e) =>
            e.label.toLowerCase().includes(q) ||
            e.nodeType.toLowerCase().includes(q) ||
            (e.civilization && e.civilization.toLowerCase().includes(q))
        )
        .slice(0, 4),
    };
  }, [searchQuery, artifacts, graphEntities]);

  const handleNavClick = (page: PageId) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const activeNav = NAV_ITEMS.find((i) => i.id === activePage);

  return (
    <div className="min-h-screen bg-[#151A18] text-[#F0E8D8] flex">
      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Persistent Left Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-[#1C2420] border-r border-[#39443D] flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'w-[74px]' : 'w-[258px]'} shrink-0`}
        aria-label="Primary Sidebar Navigation"
      >
        {/* Brand Header inside Sidebar */}
        <div className="h-16 px-4 border-b border-[#39443D] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-3 text-left min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A66B] rounded-md"
          >
            <div className="w-9 h-9 rounded-md bg-[#232C27] border border-[#C9A66B]/40 flex items-center justify-center shrink-0">
              <span className="font-serif text-lg font-semibold text-[#C9A66B]">Α</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="font-serif text-lg font-semibold tracking-wide text-[#F0E8D8] whitespace-nowrap">
                  ARCHAEON AI
                </div>
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="hidden lg:inline-flex p-1.5 rounded-md text-[#A9ADA3] hover:text-[#F0E8D8] hover:bg-[#29332E] transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-md text-[#A9ADA3] hover:text-[#F0E8D8]"
            aria-label="Close navigation menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Audience View Switcher (Public Explorer vs Technical Lab) */}
        <div className="px-2.5 pt-3 pb-2 border-b border-[#39443D]">
          {collapsed ? (
            <button
              type="button"
              onClick={() =>
                onChangeAudienceMode(audienceMode === 'public' ? 'technical' : 'public')
              }
              title={
                audienceMode === 'public'
                  ? 'Switch to Technical Lab View'
                  : 'Switch to Public Explorer View'
              }
              className="w-full py-2 rounded-md bg-[#232C27] border border-[#C9A66B]/40 flex items-center justify-center text-[#C9A66B] hover:bg-[#29332E]"
            >
              {audienceMode === 'public' ? (
                <Users className="w-4 h-4" />
              ) : (
                <Wrench className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="space-y-1.5">
              <div className="px-1 text-[10px] font-mono uppercase tracking-wider text-[#A9ADA3]">
                Interface Mode
              </div>
              <div
                className="grid grid-cols-2 gap-1 p-1 rounded-md bg-[#151A18] border border-[#39443D]"
                role="group"
                aria-label="Select audience view mode"
              >
                <button
                  type="button"
                  onClick={() => onChangeAudienceMode('public')}
                  className={`py-1.5 px-2 rounded text-[11px] font-medium transition-colors whitespace-nowrap flex items-center justify-center gap-1 ${
                    audienceMode === 'public'
                      ? 'bg-[#C9A66B] text-[#151A18]'
                      : 'text-[#A9ADA3] hover:text-[#F0E8D8]'
                  }`}
                >
                  <Users className="w-3 h-3 shrink-0" />
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => onChangeAudienceMode('technical')}
                  className={`py-1.5 px-2 rounded text-[11px] font-medium transition-colors whitespace-nowrap flex items-center justify-center gap-1 ${
                    audienceMode === 'technical'
                      ? 'bg-[#C9A66B] text-[#151A18]'
                      : 'text-[#A9ADA3] hover:text-[#F0E8D8]'
                  }`}
                >
                  <Wrench className="w-3 h-3 shrink-0" />
                  Technical
                </button>
              </div>
              <div className="px-1 text-[11px] text-[#A9ADA3] truncate">
                {audienceMode === 'public'
                  ? 'Plain-language storytelling'
                  : 'Full epigraphic & CV lab'}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            const label = audienceMode === 'public' ? item.publicLabel : item.technicalLabel;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                title={collapsed ? label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A66B] ${
                  isActive
                    ? 'bg-[#29332E] text-[#C9A66B] border border-[#C9A66B]/35 font-medium'
                    : 'text-[#A9ADA3] hover:text-[#F0E8D8] hover:bg-[#232C27] border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#C9A66B]' : 'text-[#A9ADA3]'}`} />
                {!collapsed && <span className="truncate">{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Active Specimen Reference Footer */}
        {!collapsed && (
          <div className="p-3.5 border-t border-[#39443D] bg-[#151A18]/50">
            <div className="text-[11px] font-mono text-[#A9ADA3] uppercase tracking-wider mb-1">
              {audienceMode === 'public' ? 'Now Viewing' : 'Active Specimen'}
            </div>
            <div className="text-xs font-medium text-[#F0E8D8] truncate">{activeArtifact.title}</div>
            <div className="text-[11px] font-mono tabular-nums text-[#C9A66B] mt-0.5 truncate">
              {audienceMode === 'public'
                ? `${activeArtifact.civilization} · ${activeArtifact.dateRange}`
                : `${activeArtifact.id} · ${activeArtifact.dateRange}`}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 h-16 bg-[#151A18]/95 backdrop-blur-md border-b border-[#39443D] px-4 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-md text-[#A9ADA3] hover:text-[#F0E8D8] hover:bg-[#232C27]"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-[#A9ADA3] whitespace-nowrap shrink-0">
              <span className="font-serif text-base font-semibold text-[#F0E8D8] lg:hidden">
                ARCHAEON AI
              </span>
              <span className="hidden lg:inline text-[#F0E8D8] font-medium">
                {audienceMode === 'public' ? activeNav?.publicLabel : activeNav?.technicalLabel}
              </span>
              <span aria-hidden="true">/</span>
              <span className="font-mono text-[#C9A66B] tabular-nums">
                {audienceMode === 'public' ? activeArtifact.civilization : activeArtifact.id}
              </span>
            </div>
          </div>

          {/* Global Search */}
          <div className="relative flex-1 max-w-md">
            <div className="relative">
              <Search className="w-4 h-4 text-[#A9ADA3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                placeholder={
                  audienceMode === 'public'
                    ? 'Search ancient objects, civilizations, places...'
                    : 'Search artifacts, scripts, civilizations, entities...'
                }
                aria-label="Global archaeological search"
                className="w-full h-10 pl-9 pr-8 bg-[#1C2420] border border-[#39443D] rounded-md text-xs text-[#F0E8D8] placeholder:text-[#A9ADA3]/70 focus:outline-none focus:border-[#C9A66B] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A9ADA3] hover:text-[#F0E8D8]"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {searchFocused && searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 bg-[#1C2420] border border-[#39443D] rounded-lg shadow-2xl overflow-hidden z-50">
                {searchResults.artifacts.length === 0 && searchResults.entities.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-[#A9ADA3]">
                    No matching artifacts or historical records found.
                  </div>
                ) : (
                  <div className="divide-y divide-[#39443D]">
                    {searchResults.artifacts.length > 0 && (
                      <div className="p-2">
                        <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#A9ADA3]">
                          Artifacts
                        </div>
                        {searchResults.artifacts.map((art) => (
                          <button
                            key={art.id}
                            type="button"
                            onMouseDown={() => {
                              onSelectArtifact(art.id);
                              onNavigate('investigation');
                              setSearchQuery('');
                            }}
                            className="w-full text-left px-2 py-2 rounded hover:bg-[#29332E] flex items-center justify-between gap-2 transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-[#F0E8D8] truncate">
                                {art.title}
                              </div>
                              <div className="text-[11px] text-[#A9ADA3] truncate">
                                {art.scriptFamily} · {art.civilization}
                              </div>
                            </div>
                            <span className="text-[11px] font-mono text-[#C9A66B] shrink-0">
                              {art.dateRange}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.entities.length > 0 && (
                      <div className="p-2">
                        <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#A9ADA3]">
                          Historical Connections
                        </div>
                        {searchResults.entities.map((ent) => (
                          <button
                            key={ent.id}
                            type="button"
                            onMouseDown={() => {
                              onSelectGraphEntity(ent.id);
                              onNavigate('knowledge-graph');
                              setSearchQuery('');
                            }}
                            className="w-full text-left px-2 py-2 rounded hover:bg-[#29332E] flex items-center justify-between gap-2 transition-colors"
                          >
                            <span className="text-xs text-[#F0E8D8] truncate">{ent.label}</span>
                            <span className="text-[11px] font-mono text-[#A9ADA3] shrink-0">
                              {ent.nodeType}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Utility Controls: Notifications + Profile */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((prev) => !prev);
                  setProfileOpen(false);
                }}
                className="relative h-10 w-10 rounded-md bg-[#1C2420] border border-[#39443D] flex items-center justify-center text-[#A9ADA3] hover:text-[#F0E8D8] hover:border-[#C9A66B]/60 transition-colors"
                aria-label="Research notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C9A66B] text-[#151A18] text-[10px] font-mono font-semibold flex items-center justify-center tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#1C2420] border border-[#39443D] rounded-lg shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#39443D] flex items-center justify-between">
                    <span className="text-xs font-medium text-[#F0E8D8]">Updates</span>
                    <button
                      type="button"
                      onClick={onMarkNotificationsRead}
                      className="text-[11px] text-[#C9A66B] hover:underline whitespace-nowrap"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="divide-y divide-[#39443D] max-h-80 overflow-y-auto">
                    {notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (item.artifactId) onSelectArtifact(item.artifactId);
                          onNavigate(item.targetPage);
                          setNotifOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-[#232C27] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-[#F0E8D8]">{item.title}</span>
                          {item.unread && (
                            <span className="text-[10px] font-mono text-[#C9A66B]">New</span>
                          )}
                        </div>
                        <p className="text-xs text-[#A9ADA3] mt-1 leading-relaxed">{item.detail}</p>
                        <div className="text-[10px] font-mono text-[#A9ADA3]/70 mt-1.5">
                          {item.timestamp}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((prev) => !prev);
                  setNotifOpen(false);
                }}
                className="h-10 pl-1.5 pr-3 rounded-md bg-[#1C2420] border border-[#39443D] flex items-center gap-2.5 hover:border-[#C9A66B]/60 transition-colors whitespace-nowrap shrink-0"
                aria-label="Researcher profile"
              >
                <ArtifactImage
                  src={RESEARCHER_PROFILE.avatarUrl}
                  alt={RESEARCHER_PROFILE.name}
                  className="w-7 h-7 rounded object-cover"
                />
                <span className="hidden md:inline text-xs font-medium text-[#F0E8D8]">
                  {audienceMode === 'public' ? 'Visitor & Scholar' : RESEARCHER_PROFILE.name}
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-[#1C2420] border border-[#39443D] rounded-lg shadow-2xl z-50 p-4 space-y-3">
                  <div className="flex items-center gap-3 pb-3 border-b border-[#39443D]">
                    <ArtifactImage
                      src={RESEARCHER_PROFILE.avatarUrl}
                      alt={RESEARCHER_PROFILE.name}
                      className="w-11 h-11 rounded object-cover"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#F0E8D8] truncate">
                        {RESEARCHER_PROFILE.name}
                      </div>
                      <div className="text-xs text-[#A9ADA3] truncate">
                        {RESEARCHER_PROFILE.role}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[#A9ADA3]">
                      <span>Active View</span>
                      <span className="text-[#C9A66B] font-medium">
                        {audienceMode === 'public' ? 'Public Explorer' : 'Technical Lab'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[#A9ADA3]">
                      <span>Multimodal Backend</span>
                      <span
                        className={`font-mono ${
                          geminiConfigured ? 'text-[#456B58]' : 'text-[#C9A66B]'
                        }`}
                      >
                        {geminiConfigured ? 'Live AI Ready' : 'Demonstration Mode'}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#39443D] flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onChangeAudienceMode(audienceMode === 'public' ? 'technical' : 'public');
                        setProfileOpen(false);
                      }}
                      className="flex-1 py-2 px-3 rounded bg-[#232C27] hover:bg-[#29332E] text-xs text-[#F0E8D8] border border-[#39443D] transition-colors whitespace-nowrap"
                    >
                      Switch to {audienceMode === 'public' ? 'Technical' : 'Public'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('reports');
                        setProfileOpen(false);
                      }}
                      className="flex-1 py-2 px-3 rounded bg-[#C9A66B] hover:bg-[#AD8952] text-xs font-medium text-[#151A18] transition-colors whitespace-nowrap"
                    >
                      {audienceMode === 'public' ? 'Handout PDF' : 'Export Dossier'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
};
