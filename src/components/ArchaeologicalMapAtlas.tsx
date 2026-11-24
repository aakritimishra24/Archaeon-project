import React, { useCallback, useEffect, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Compass,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Search,
} from 'lucide-react';
import type { ArtifactRecord, AudienceMode } from '../types/archaeon';

interface ArchaeologicalMapAtlasProps {
  artifacts: ArtifactRecord[];
  activeArtifact: ArtifactRecord;
  audienceMode: AudienceMode;
  onSelectArtifact: (id: string) => void;
}

interface LatLngLiteral {
  lat: number;
  lng: number;
}

interface PlaceInstanceLike {
  id: string;
  displayName?: string | null;
  location?: { lat: () => number; lng: () => number } | null;
  formattedAddress?: string | null;
  rating?: number | null;
  userRatingCount?: number | null;
  types?: string[];
  editorialSummary?: string | null;
  googleMapsURI?: string | null;
  fetchFields: (opts: { fields: string[] }) => Promise<unknown>;
}

interface PolylineLike {
  setMap: (map: unknown | null) => void;
}

interface DiscoveredPlaceItem {
  id: string;
  name: string;
  address: string;
  location: LatLngLiteral;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  placeInstance: PlaceInstanceLike;
  editorialSummary?: string;
  googleMapsURI?: string;
}

interface RouteSummaryState {
  originName: string;
  destinationName: string;
  distanceMeters?: number;
  durationLabel?: string;
}

// Scholarly search seeds paired to corpus artifacts; all coordinates/addresses/details come strictly from Google Maps Platform Places API (New).
const ARTIFACT_SITE_QUERIES: Record<string, string> = {
  'ARC-PTO-196B': 'Memphis Mit Rahina Open Air Museum Egypt',
  'ARC-AKK-1750B': 'Sippar Tell Abu Habbah archaeological site Iraq',
  'ARC-MYC-1300B': 'Palace of Nestor Pylos Greece',
  'ARC-PHO-0850B': 'Temple of Eshmun Sidon Lebanon',
  'ARC-ATT-0420B': 'Ancient Agora of Athens Greece',
};

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('over_query_limit') ||
    lower.includes('quota')
  );
}

const PlaceMarkerWithInfo: React.FC<{
  item: DiscoveredPlaceItem;
  isSelected: boolean;
  onSelect: (item: DiscoveredPlaceItem) => void;
}> = ({ item, isSelected, onSelect }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={item.location}
        title={item.name}
        onClick={() => onSelect(item)}
      >
        <Pin
          background={isSelected ? '#C9A66B' : '#232C27'}
          borderColor={isSelected ? '#F0E8D8' : '#C9A66B'}
          glyphColor={isSelected ? '#151A18' : '#C9A66B'}
          scale={isSelected ? 1.2 : 1.0}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} maxWidth={270} onCloseClick={() => onSelect(item)}>
          <div className="p-1 text-[#151A18] space-y-1.5">
            <div className="font-semibold text-sm leading-tight">{item.name}</div>
            {item.address && <div className="text-xs text-neutral-700">{item.address}</div>}
            {item.rating !== undefined && (
              <div className="text-xs font-medium text-amber-800">
                ★ {item.rating.toFixed(1)} ({item.userRatingCount ?? 0} reviews)
              </div>
            )}
            {item.editorialSummary && (
              <p className="text-xs text-neutral-600 leading-snug">{item.editorialSummary}</p>
            )}
            {item.googleMapsURI && (
              <a
                href={item.googleMapsURI}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 underline"
              >
                Open in Google Maps
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
};

const AtlasMapWorkspace: React.FC<{
  artifacts: ArtifactRecord[];
  activeArtifact: ArtifactRecord;
  isPublic: boolean;
  onSelectArtifact: (id: string) => void;
}> = ({ artifacts, activeArtifact, isPublic, onSelectArtifact }) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');
  const coreLib = useMapsLibrary('core');

  const [searchInput, setSearchInput] = useState<string>(
    ARTIFACT_SITE_QUERIES[activeArtifact.id] || `${activeArtifact.location} museum`
  );
  const [places, setPlaces] = useState<DiscoveredPlaceItem[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [routeOriginId, setRouteOriginId] = useState<string>('');
  const [routeDestId, setRouteDestId] = useState<string>('');
  const [isRouting, setIsRouting] = useState(false);
  const [routeSummary, setRouteSummary] = useState<RouteSummaryState | null>(null);
  const [routePolyline, setRoutePolyline] = useState<PolylineLike | null>(null);

  const runPlaceTextSearch = useCallback(
    async (queryText: string) => {
      if (!placesLib || !queryText.trim()) return;
      setIsSearching(true);
      setErrorMsg(null);

      try {
        const PlaceClass = placesLib.Place as unknown as {
          searchByText: (req: Record<string, unknown>) => Promise<{ places?: PlaceInstanceLike[] }>;
        };
        const { places: found } = await PlaceClass.searchByText({
          textQuery: queryText.trim(),
          fields: [
            'id',
            'displayName',
            'location',
            'formattedAddress',
            'rating',
            'userRatingCount',
            'types',
          ],
          maxResultCount: 6,
          language: 'en-US',
          internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
        });

        const mapped: DiscoveredPlaceItem[] = (found || [])
          .filter((p) => p.location != null)
          .map((p) => ({
            id: p.id,
            name: p.displayName || 'Archaeological Location',
            address: p.formattedAddress || '',
            location: {
              lat: p.location!.lat(),
              lng: p.location!.lng(),
            },
            rating: p.rating ?? undefined,
            userRatingCount: p.userRatingCount ?? undefined,
            types: p.types,
            placeInstance: p,
          }));

        setPlaces(mapped);
        if (mapped.length > 0) {
          setSelectedPlaceId(mapped[0].id);
          setRouteOriginId(mapped[0].id);
          setRouteDestId(mapped[1]?.id || mapped[0].id);

          if (map && coreLib) {
            if (mapped.length === 1) {
              map.panTo(mapped[0].location);
              map.setZoom(13);
            } else {
              const bounds = new coreLib.LatLngBounds();
              mapped.forEach((m) => bounds.extend(m.location));
              map.fitBounds(bounds, 64);
            }
          }
        } else {
          setSelectedPlaceId(null);
          setErrorMsg('No matching archaeological sites or museums returned for this query.');
        }
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setErrorMsg(
          err instanceof Error ? err.message : 'Unable to query Google Maps Places service.'
        );
      } finally {
        setIsSearching(false);
      }
    },
    [placesLib, map, coreLib]
  );

  // Sync query automatically when active artifact changes
  useEffect(() => {
    const q = ARTIFACT_SITE_QUERIES[activeArtifact.id] || `${activeArtifact.location} archaeological museum`;
    setSearchInput(q);
    if (placesLib) {
      void runPlaceTextSearch(q);
    }
  }, [activeArtifact.id, activeArtifact.location, placesLib, runPlaceTextSearch]);

  const handleSelectPlace = async (item: DiscoveredPlaceItem) => {
    setSelectedPlaceId(item.id);
    if (map) {
      map.panTo(item.location);
    }
    if (!item.editorialSummary && !item.googleMapsURI) {
      try {
        await item.placeInstance.fetchFields({
          fields: ['editorialSummary', 'googleMapsURI'],
        });
        setPlaces((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? {
                  ...p,
                  editorialSummary: item.placeInstance.editorialSummary ?? undefined,
                  googleMapsURI: item.placeInstance.googleMapsURI ?? undefined,
                }
              : p
          )
        );
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
      }
    }
  };

  const handleComputeRoute = async () => {
    if (!routesLib || !mapsLib || !map || !coreLib) return;
    const origin = places.find((p) => p.id === routeOriginId);
    const dest = places.find((p) => p.id === routeDestId);
    if (!origin || !dest || origin.id === dest.id) {
      setErrorMsg('Select two distinct sites from the results list to plan a field route.');
      return;
    }

    if (routePolyline) {
      routePolyline.setMap(null);
      setRoutePolyline(null);
    }

    setIsRouting(true);
    setErrorMsg(null);
    try {
      const routeService = new routesLib.Route();
      const response = await routeService.computeRoutes({
        origin: origin.location,
        destination: dest.location,
        travelMode: routesLib.TravelMode.DRIVING,
      });

      const route = response.routes?.[0];
      if (!route) {
        setErrorMsg('No drivable route found between these two sites.');
        return;
      }

      if (route.polyline?.encodedPolyline) {
        const decoded = routesLib.Route.decode(route.polyline.encodedPolyline);
        const PolylineCtor = (mapsLib as unknown as {
          Polyline: new (opts: Record<string, unknown>) => PolylineLike;
        }).Polyline;
        const poly = new PolylineCtor({
          path: decoded,
          geodesic: true,
          strokeColor: '#C9A66B',
          strokeOpacity: 0.95,
          strokeWeight: 4,
          map,
        });
        setRoutePolyline(poly);
      }

      if (route.viewport) {
        const bounds = new coreLib.LatLngBounds(
          route.viewport.southwest,
          route.viewport.northeast
        );
        map.fitBounds(bounds, 60);
      }

      setRouteSummary({
        originName: origin.name,
        destinationName: dest.name,
        distanceMeters: route.distanceMeters ?? undefined,
        durationLabel: route.localizedValues?.duration || undefined,
      });
    } catch (err) {
      if (isQuotaError(err)) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to compute route via Google Maps Routes API.'
      );
    } finally {
      setIsRouting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (routePolyline) routePolyline.setMap(null);
    };
  }, [routePolyline]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Rail: Provenance Controls, Live Places Results & Route Planner */}
      <aside className="lg:col-span-4 space-y-4">
        {/* Artifact Provenance Quick-Select */}
        <div className="bg-[#232C27] border border-[#39443D] rounded-lg p-4 space-y-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#A9ADA3]">
            {isPublic ? 'Jump to an Artifact’s Homeland' : 'Corpus Specimen Findspots'}
          </div>
          <div className="space-y-1.5">
            {artifacts.map((art) => {
              const isActive = art.id === activeArtifact.id;
              return (
                <button
                  key={art.id}
                  type="button"
                  onClick={() => onSelectArtifact(art.id)}
                  className={`w-full text-left px-3 py-2 rounded border text-xs transition-colors flex items-center justify-between gap-2 ${
                    isActive
                      ? 'bg-[#29332E] border-[#C9A66B] text-[#F0E8D8]'
                      : 'bg-[#151A18] border-[#39443D] text-[#A9ADA3] hover:text-[#F0E8D8]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{art.title}</div>
                    <div className="text-[11px] opacity-80 truncate">{art.location}</div>
                  </div>
                  <span className="font-mono text-[10px] text-[#C9A66B] shrink-0">
                    {art.dateRange}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Places API (New) Live Search */}
        <div className="bg-[#232C27] border border-[#39443D] rounded-lg p-4 space-y-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#A9ADA3]">
            {isPublic
              ? 'Search Museums & Ancient Landmarks'
              : 'Places API (New) Heritage Lookup'}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runPlaceTextSearch(searchInput);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[#A9ADA3] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search site or museum..."
                className="w-full h-9 pl-8 pr-2.5 rounded bg-[#151A18] border border-[#39443D] text-xs text-[#F0E8D8] focus:outline-none focus:border-[#C9A66B]"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !placesLib}
              className="h-9 px-3 rounded bg-[#C9A66B] hover:bg-[#AD8952] text-[#151A18] text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 disabled:opacity-60"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Locate'}
            </button>
          </form>

          {errorMsg && (
            <div className="p-2.5 rounded bg-[#A85D48]/15 border border-[#A85D48]/50 text-[11px] text-[#F0E8D8]">
              {errorMsg}
            </div>
          )}

          {/* Returned Places */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {places.map((p) => {
              const selected = p.id === selectedPlaceId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void handleSelectPlace(p)}
                  className={`w-full text-left p-2.5 rounded border text-xs transition-colors ${
                    selected
                      ? 'bg-[#29332E] border-[#C9A66B]'
                      : 'bg-[#151A18] border-[#39443D] hover:border-[#AD8952]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-[#F0E8D8]">{p.name}</span>
                    {p.rating !== undefined && (
                      <span className="text-[10px] font-mono text-[#C9A66B] shrink-0">
                        ★ {p.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {p.address && (
                    <div className="text-[11px] text-[#A9ADA3] mt-0.5 truncate">{p.address}</div>
                  )}
                  <div className="text-[10px] font-mono text-[#A9ADA3]/80 mt-1 tabular-nums">
                    {p.location.lat.toFixed(4)}, {p.location.lng.toFixed(4)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fieldwork / Heritage Route Planner (Routes API) */}
        {places.length >= 2 && (
          <div className="bg-[#232C27] border border-[#39443D] rounded-lg p-4 space-y-3">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#A9ADA3] flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-[#C9A66B]" />
              {isPublic ? 'Plan Visit Between Sites' : 'Field Transit Vector (Routes API)'}
            </div>
            <div className="space-y-2 text-xs">
              <select
                value={routeOriginId}
                onChange={(e) => setRouteOriginId(e.target.value)}
                aria-label="Origin site"
                className="w-full h-8 px-2.5 rounded bg-[#151A18] border border-[#39443D] text-[#F0E8D8]"
              >
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    From: {p.name}
                  </option>
                ))}
              </select>
              <select
                value={routeDestId}
                onChange={(e) => setRouteDestId(e.target.value)}
                aria-label="Destination site"
                className="w-full h-8 px-2.5 rounded bg-[#151A18] border border-[#39443D] text-[#F0E8D8]"
              >
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    To: {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleComputeRoute}
                disabled={isRouting}
                className="w-full h-8 rounded bg-[#29332E] hover:bg-[#39443D] border border-[#C9A66B]/50 text-[#C9A66B] font-medium inline-flex items-center justify-center gap-1.5"
              >
                {isRouting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Compute Route'}
              </button>
            </div>
            {routeSummary && (
              <div className="p-2.5 rounded bg-[#151A18] border border-[#456B58] text-[11px] space-y-1">
                <div className="text-[#F0E8D8] font-medium">
                  {routeSummary.originName} → {routeSummary.destinationName}
                </div>
                <div className="font-mono text-[#C9A66B] tabular-nums">
                  {routeSummary.distanceMeters !== undefined
                    ? `${(routeSummary.distanceMeters / 1000).toFixed(1)} km`
                    : 'Distance ready'}
                  {routeSummary.durationLabel ? ` · ${routeSummary.durationLabel}` : ''}
                </div>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Main Map Canvas (CF2: explicit height container!) */}
      <div className="lg:col-span-8 bg-[#232C27] border border-[#39443D] rounded-lg overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-[#39443D] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-[#F0E8D8] font-medium">
            <MapPin className="w-4 h-4 text-[#C9A66B]" />
            <span>{activeArtifact.location}</span>
          </div>
          <span className="font-mono text-[11px] text-[#A9ADA3]">
            {places.length} live site marker{places.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Mandatory explicit CSS height to prevent CF2 0x0 collapse */}
        <div className="w-full h-[540px] lg:h-[620px] relative">
          <GoogleMap
            mapId="DEMO_MAP_ID"
            defaultCenter={{ lat: 33.5, lng: 25.0 }}
            defaultZoom={5}
            colorScheme="DARK"
            gestureHandling="greedy"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            {places.map((item) => (
              <PlaceMarkerWithInfo
                key={item.id}
                item={item}
                isSelected={item.id === selectedPlaceId}
                onSelect={(pl) => void handleSelectPlace(pl)}
              />
            ))}
          </GoogleMap>
        </div>
      </div>
    </div>
  );
};

export const ArchaeologicalMapAtlas: React.FC<ArchaeologicalMapAtlasProps> = ({
  artifacts,
  activeArtifact,
  audienceMode,
  onSelectArtifact,
}) => {
  const isPublic = audienceMode === 'public';
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#39443D]">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#F0E8D8]">
            {isPublic ? 'Explore Ancient Sites & Museums' : 'Excavation & Provenance Map Atlas'}
          </h1>
          <p className="text-xs text-[#A9ADA3] mt-1">
            {isPublic
              ? 'Discover where each ancient artifact was uncovered and locate nearby museums around the Mediterranean and Near East'
              : 'Live Google Maps Platform geolocation, Places API (New) museum lookup, and Routes API fieldwork transit vectors'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-[#C9A66B]">
          <Compass className="w-4 h-4" />
          <span>{activeArtifact.civilization}</span>
        </div>
      </div>

      {!apiKey ? (
        <div className="bg-[#232C27] border border-[#A85D48]/60 rounded-lg p-8 text-center space-y-3">
          <p className="font-serif text-xl text-[#F0E8D8]">
            Google Maps API Key Not Available in Client Environment
          </p>
          <p className="text-xs text-[#A9ADA3] max-w-xl mx-auto">
            Ensure `VITE_GOOGLE_MAPS_API_KEY` is provisioned via Google Maps setup in AI Studio so
            live interactive maps, heritage site lookup, and route planning can initialize.
          </p>
        </div>
      ) : (
        <APIProvider apiKey={apiKey} language="en" region="US">
          <AtlasMapWorkspace
            artifacts={artifacts}
            activeArtifact={activeArtifact}
            isPublic={isPublic}
            onSelectArtifact={onSelectArtifact}
          />
        </APIProvider>
      )}
    </div>
  );
};
