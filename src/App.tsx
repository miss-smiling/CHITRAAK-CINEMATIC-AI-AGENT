/**
 * Continuum - Visual Consistency Engine for AI Storyboards
 */
import React, { useEffect, useState } from 'react';
import {
  ViewMode,
  StoryboardShot,
  Character,
  LocationAsset,
  PropAsset,
  ChecklistItems,
  ConsistencyStatus,
} from './types';
import {
  INITIAL_CHARACTERS,
  INITIAL_LOCATIONS,
  INITIAL_PROPS,
  INITIAL_SHOTS,
} from './data/mockData';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ShotGrid } from './components/ShotGrid';
import { ShotDetailPanel } from './components/ShotDetailPanel';
import { ConsistencyDashboard } from './components/ConsistencyDashboard';
import { AssetsView } from './components/AssetsView';
import { SettingsView } from './components/SettingsView';
import { NewShotModal } from './components/NewShotModal';
import { AddAssetModal } from './components/AddAssetModal';

type ApiShot = {
  id: string;
  scene_id: string;
  shot_number: number;
  description: string;
  generated_image_url: string;
  status: string;
  shot_type?: string;
  mood?: string;
  action_beat?: string;
  prompt?: string;
  negative_prompt?: string;
  seed?: number;
  ai_model?: string;
  aspect_ratio?: string;
  focal_length?: string;
  camera_angle?: string;
  camera_movement?: string;
  lighting_style?: string;
  created_at?: string;
};

type ApiEntity = {
  shot_id: string;
  entity_id: string;
  role: 'character' | 'location' | 'prop';
  entity_type: 'character' | 'location' | 'prop';
  name: string;
  canonical_description: string;
  reference_image_url: string;
  current_state: string;
  updated_at: string;
};

type ApiDrift = {
  shot_id: string;
  entity_id: string;
  expected_state: string;
  detected_state: string;
  drift_score: number;
  reason: string;
  created_at: string;
};

function adaptApiShot(s: ApiShot): StoryboardShot {
  const sceneNumber = s.scene_id.replace(/\D/g, '') || '1';
  const shotNumber = String(s.shot_number).padStart(2, '0');

  const status: ConsistencyStatus =
    s.status === 'inconsistent' || s.status === 'needs_review'
      ? s.status
      : 'consistent';

  return {
    id: s.id,
    shotNumber: `S${sceneNumber.padStart(2, '0')}-${shotNumber}`,
    sceneNumber: `Scene ${sceneNumber}`,
    title: `Shot ${shotNumber}`,
    description: s.description ?? '',
    imageUrl: s.generated_image_url ?? '',
    characters: [],
    locationId: '',
    propIds: [],
    consistencyScore: status === 'consistent' ? 100 : status === 'needs_review' ? 80 : 60,
    status,
    checklist: {
      facialFeatures: true,
      hairStyle: true,
      costume: true,
      colorPaletteAndLighting: true,
      propsAndAccessories: true,
    },
    checklistFlags: {},
    prompt: s.prompt ?? '',
    negativePrompt: s.negative_prompt ?? '',
    seed: Number(s.seed ?? 0),
    aiModel: s.ai_model ?? '',
    aspectRatio: s.aspect_ratio ?? '16:9',
    cameraSettings: {
      focalLength: s.focal_length ?? '',
      angle: s.camera_angle ?? '',
      movement: s.camera_movement ?? '',
    },
    lightingStyle: s.lighting_style ?? '',
    notes: [],
  };
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('shots');
  const [shots, setShots] = useState<StoryboardShot[]>(INITIAL_SHOTS);
  const [characters, setCharacters] = useState<Character[]>(INITIAL_CHARACTERS);
  const [locations, setLocations] = useState<LocationAsset[]>(INITIAL_LOCATIONS);
  const [propsList, setPropsList] = useState<PropAsset[]>(INITIAL_PROPS);

useEffect(() => {
  let cancelled = false;

  async function loadShotsAndEntities() {
    try {
      // 1. Load shots from ClickHouse through Express
      const shotsResponse = await fetch('/api/shots');

      if (!shotsResponse.ok) {
        throw new Error(
          `Shots API HTTP ${shotsResponse.status}`
        );
      }

      const shotData: ApiShot[] =
        await shotsResponse.json();

      if (cancelled) return;

      // 2. Load entities for every shot
      const entityResults = await Promise.all(
        shotData.map(async (shot) => {
          const response = await fetch(
            `/api/shots/${shot.id}/entities`
          );

          if (!response.ok) {
            throw new Error(
              `Entities API HTTP ${response.status} for ${shot.id}`
            );
          }

          return (await response.json()) as ApiEntity[];
        })
      );

      if (cancelled) return;

      // 3. Load drift information for every shot
      const driftResults = await Promise.all(
        shotData.map(async (shot) => {
          const response = await fetch(
            `/api/shots/${shot.id}/drift`
          );

          if (!response.ok) {
            throw new Error(
              `Drift API HTTP ${response.status} for ${shot.id}`
            );
          }

          return (await response.json()) as ApiDrift[];
        })
      );

      if (cancelled) return;

      console.log('Loaded drift data:', driftResults);

      const allEntities =
        entityResults.flat();

      // 4. Remove duplicate entities
      //    Example: Arjun may appear in multiple shots.
      const uniqueEntities = Array.from(
        new Map(
          allEntities.map((entity) => [
            entity.entity_id,
            entity,
          ])
        ).values()
      );

      // 5. Convert ClickHouse characters → frontend Character
      const apiCharacters: Character[] =
        uniqueEntities
          .filter(
            (entity) =>
              entity.entity_type ===
              'character'
          )
          .map((entity) => ({
            id: entity.entity_id,
            name: entity.name,
            role: 'Character',
            color: '#f59e0b',
            colorName: 'Amber',
            avatarUrl:
              entity.reference_image_url,
            refImages:
              entity.reference_image_url
                ? [
                    entity.reference_image_url,
                  ]
                : [],
            description:
              entity.canonical_description,
            keyPromptTokens: [],
            consistencyRate: 100,
          }));

      // 6. Convert ClickHouse locations → frontend LocationAsset
      const apiLocations: LocationAsset[] =
        uniqueEntities
          .filter(
            (entity) =>
              entity.entity_type ===
              'location'
          )
          .map((entity) => ({
            id: entity.entity_id,
            name: entity.name,
            type: 'Location',
            imageUrl:
              entity.reference_image_url,
            description:
              entity.canonical_description,
            lightingNotes:
              entity.current_state,
            keyPromptTokens: [],
          }));

      // 7. Convert ClickHouse props → frontend PropAsset
      const apiProps: PropAsset[] =
        uniqueEntities
          .filter(
            (entity) =>
              entity.entity_type ===
              'prop'
          )
          .map((entity) => ({
            id: entity.entity_id,
            name: entity.name,
            category: 'Prop',
            imageUrl:
              entity.reference_image_url,
            description:
              entity.canonical_description,
            associatedCharacterId:
              undefined,
          }));

      // 8. Put real ClickHouse entities into React state
      if (apiCharacters.length > 0) {
        setCharacters(apiCharacters);
      }

      if (apiLocations.length > 0) {
        setLocations(apiLocations);
      }

      if (apiProps.length > 0) {
        setPropsList(apiProps);
      }

      // 9. Adapt shots
      const adaptedShots =
        shotData.map(adaptApiShot);

      // 10. Connect entities to each shot
      entityResults.forEach(
        (entities, index) => {
          const shot =
            adaptedShots[index];

          if (!shot) return;

          shot.characters =
            entities
              .filter(
                (entity) =>
                  entity.entity_type ===
                  'character'
              )
              .map(
                (entity) =>
                  entity.entity_id
              );

          const location =
            entities.find(
              (entity) =>
                entity.entity_type ===
                'location'
            );

          shot.locationId =
            location?.entity_id ?? '';

          shot.propIds =
            entities
              .filter(
                (entity) =>
                  entity.entity_type ===
                  'prop'
              )
              .map(
                (entity) =>
                  entity.entity_id
              );
        }
      );

      // 11. Apply drift information to each shot
driftResults.forEach((drifts, index) => {
  const shot = adaptedShots[index];

  if (!shot) return;

  if (drifts.length === 0) {
    return;
  }

  const maxDrift = Math.max(
    ...drifts.map(
      (drift) => Number(drift.drift_score) || 0
    )
  );

  const consistencyScore = Math.round(
    (1 - maxDrift) * 100
  );

  shot.consistencyScore = consistencyScore;

  if (maxDrift >= 0.7) {
    shot.status = 'inconsistent';
  } else if (maxDrift >= 0.3) {
    shot.status = 'needs_review';
  } else {
    shot.status = 'consistent';
  }

  const reasons = drifts
    .map((drift) => drift.reason)
    .filter(Boolean);

  if (reasons.length > 0) {
    shot.checklistFlags = {
      ...shot.checklistFlags,
      costume: reasons.join('; '),
    };
  }
});

      // 12. Put final shots into React state
      setShots(adaptedShots);
    } catch (error) {
      console.warn(
        'Using mock shots/assets because the backend is unavailable:',
        error
      );
    }
  }

  loadShotsAndEntities();

  return () => {
    cancelled = true;
  };
}, []);



  // Filter & Highlight States
  const [hoveredCharacterId, setHoveredCharacterId] = useState<string | null>(null);
  const [selectedCharacterFilter, setSelectedCharacterFilter] = useState<string | null>(null);
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<ConsistencyStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'sequence' | 'score_asc' | 'score_desc' | 'flagged_first'>('sequence');

  // Active Detail Panel Shot & UI Overlays
  const [selectedShot, setSelectedShot] = useState<StoryboardShot | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isNewShotModalOpen, setIsNewShotModalOpen] = useState(false);

  // Asset creation modal states
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
  const [addAssetModalType, setAddAssetModalType] = useState<'character' | 'location' | 'prop'>('character');

  // Compute Overall Consistency Metrics
  const totalShotsCount = shots.length;
  const avgConsistencyScore = Math.round(
    shots.reduce((acc, s) => acc + s.consistencyScore, 0) / (totalShotsCount || 1)
  );
  const flaggedShotsCount = shots.filter(
    (s) => s.status === 'inconsistent' || s.status === 'needs_review'
  ).length;

  // Asset creation handlers
  const handleOpenAddModal = (type: 'character' | 'location' | 'prop') => {
    setAddAssetModalType(type);
    setIsAddAssetModalOpen(true);
  };

  const handleAddCharacter = (newChar: Character) => {
    setCharacters((prev) => [...prev, newChar]);
  };

  const handleAddLocation = (newLoc: LocationAsset) => {
    setLocations((prev) => [...prev, newLoc]);
  };

  const handleAddProp = (newProp: PropAsset) => {
    setPropsList((prev) => [...prev, newProp]);
  };

  // Asset deletion handlers
  const handleDeleteCharacter = (charId: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== charId));
    if (selectedCharacterFilter === charId) {
      setSelectedCharacterFilter(null);
    }
  };

  const handleDeleteLocation = (locId: string) => {
    setLocations((prev) => prev.filter((l) => l.id !== locId));
    if (selectedLocationFilter === locId) {
      setSelectedLocationFilter(null);
    }
  };

  const handleDeleteProp = (propId: string) => {
    setPropsList((prev) => prev.filter((p) => p.id !== propId));
  };

  const handleDeleteShot = (shotId: string) => {
    setShots((prev) => prev.filter((s) => s.id !== shotId));
    if (selectedShot?.id === shotId) {
      setSelectedShot(null);
    }
  };

  // Toggle checklist item and update shot score live
  const handleUpdateShotChecklist = (shotId: string, newChecklist: ChecklistItems) => {
    const countTrue = Object.values(newChecklist).filter(Boolean).length;
   const checklistScore = countTrue * 20;  

    setShots((prevShots) =>
      prevShots.map((s) => {
        if (s.id !== shotId) return s;
        return {
  ...s,
  checklist: newChecklist,
};
      })
    );

    if (selectedShot && selectedShot.id === shotId) {
      setSelectedShot((prev) =>
        prev
          ?  {
    ...prev,
    checklist: newChecklist,
  }
          : null
      );
    }
  };

  // Cycle shot status manually (for quick status override & testing transitions)
  const handleCycleShotStatus = (shotId: string) => {
    setShots((prevShots) =>
      prevShots.map((s) => {
        if (s.id !== shotId) return s;
        const nextStatus: ConsistencyStatus =
          s.status === 'consistent'
            ? 'needs_review'
            : s.status === 'needs_review'
            ? 'inconsistent'
            : 'consistent';
        const nextScore =
          nextStatus === 'consistent' ? 100 : nextStatus === 'needs_review' ? 80 : 60;

        const newChecklist = {
          facialFeatures: true,
          hairStyle: true,
          costume: true,
          colorPaletteAndLighting: nextStatus !== 'inconsistent',
          propsAndAccessories: nextStatus === 'consistent',
        };

        return {
          ...s,
          status: nextStatus,
          consistencyScore: nextScore,
          checklist: newChecklist,
        };
      })
    );

    if (selectedShot && selectedShot.id === shotId) {
      setSelectedShot((prev) => {
        if (!prev) return null;
        const nextStatus: ConsistencyStatus =
          prev.status === 'consistent'
            ? 'needs_review'
            : prev.status === 'needs_review'
            ? 'inconsistent'
            : 'consistent';
        const nextScore =
          nextStatus === 'consistent' ? 100 : nextStatus === 'needs_review' ? 80 : 60;
        const newChecklist = {
          facialFeatures: true,
          hairStyle: true,
          costume: true,
          colorPaletteAndLighting: nextStatus !== 'inconsistent',
          propsAndAccessories: nextStatus === 'consistent',
        };
        return {
          ...prev,
          status: nextStatus,
          consistencyScore: nextScore,
          checklist: newChecklist,
        };
      });
    }
  };

  // Add team note to a shot
  const handleAddNote = (shotId: string, text: string) => {
    const newNote = {
      id: `note-${Date.now()}`,
      author: 'Sarah Chen (Director)',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
      role: 'Director',
      text,
      timestamp: 'Just now',
    };

    setShots((prevShots) =>
      prevShots.map((s) => {
        if (s.id !== shotId) return s;
        return { ...s, notes: [...s.notes, newNote] };
      })
    );

    if (selectedShot && selectedShot.id === shotId) {
      setSelectedShot((prev) => (prev ? { ...prev, notes: [...prev.notes, newNote] } : null));
    }
  };

  // Add key prompt token to character
  const handleAddCharacterToken = (charId: string, token: string) => {
    setCharacters((prev) =>
      prev.map((c) => {
        if (c.id !== charId) return c;
        return { ...c, keyPromptTokens: [...c.keyPromptTokens, token] };
      })
    );
  };

  // Add new shot to list
  const handleAddShot = (newShot: StoryboardShot) => {
    setShots((prev) => [newShot, ...prev]);
  };

  // Export Consistency Report JSON
  const handleExportReport = () => {
    const reportData = {
      projectName: 'Continuum Production Sequence',
      exportTimestamp: new Date().toISOString(),
      overallMetrics: {
        totalShots: totalShotsCount,
        averageConsistencyScore: avgConsistencyScore,
        flaggedShotsCount,
      },
      characterHealth: characters.map((char) => {
        const charShots = shots.filter((s) => s.characters.includes(char.id));
        const avg = charShots.length
          ? Math.round(charShots.reduce((acc, s) => acc + s.consistencyScore, 0) / charShots.length)
          : char.consistencyRate;
        return {
          characterName: char.name,
          color: char.color,
          shotsCount: charShots.length,
          consistencyHealthScore: avg,
        };
      }),
      shots: shots.map((s) => ({
        shotNumber: s.shotNumber,
        sceneNumber: s.sceneNumber,
        title: s.title,
        status: s.status,
        score: s.consistencyScore,
        prompt: s.prompt,
        flags: s.checklistFlags,
      })),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `continuum-consistency-report-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-screen bg-[#0b0d12] bg-grid-pattern text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onViewChange={(view) => setCurrentView(view)}
        avgScore={avgConsistencyScore}
        totalShots={totalShotsCount}
        flaggedCount={flaggedShotsCount}
        onNewShotClick={() => setIsNewShotModalOpen(true)}
        onExportReport={handleExportReport}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Persistent Sidebar */}
        <Sidebar
          characters={characters}
          locations={locations}
          propsList={propsList}
          hoveredCharacterId={hoveredCharacterId}
          onHoverCharacter={(id) => setHoveredCharacterId(id)}
          selectedCharacterFilter={selectedCharacterFilter}
          onSelectCharacterFilter={(id) => {
            setSelectedCharacterFilter(id);
            if (id && currentView !== 'shots') setCurrentView('shots');
          }}
          selectedLocationFilter={selectedLocationFilter}
          onSelectLocationFilter={(id) => {
            setSelectedLocationFilter(id);
            if (id && currentView !== 'shots') setCurrentView('shots');
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenAddModal={handleOpenAddModal}
        />

        {/* View Switcher Container */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {currentView === 'shots' && (
            <ShotGrid
              shots={shots}
              characters={characters}
              locations={locations}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCharacterFilter={selectedCharacterFilter}
              onSelectCharacterFilter={setSelectedCharacterFilter}
              selectedLocationFilter={selectedLocationFilter}
              onSelectLocationFilter={setSelectedLocationFilter}
              selectedStatusFilter={selectedStatusFilter}
              onSelectStatusFilter={setSelectedStatusFilter}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              hoveredCharacterId={hoveredCharacterId}
              selectedShotId={selectedShot?.id || null}
              onSelectShot={(shot) => setSelectedShot(shot)}
              onNewShotClick={() => setIsNewShotModalOpen(true)}
            />
          )}

          {currentView === 'reports' && (
            <ConsistencyDashboard
              shots={shots}
              characters={characters}
              onSelectShot={(shot) => {
                setSelectedShot(shot);
                setCurrentView('shots');
              }}
            />
          )}

          {currentView === 'assets' && (
            <AssetsView
              characters={characters}
              locations={locations}
              propsList={propsList}
              shots={shots}
              onAddCharacterToken={handleAddCharacterToken}
              onOpenAddModal={handleOpenAddModal}
              onDeleteCharacter={handleDeleteCharacter}
              onDeleteLocation={handleDeleteLocation}
              onDeleteProp={handleDeleteProp}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView onExportReport={handleExportReport} />
          )}
        </main>

        {/* Right Slide-over Shot Detail Panel */}
        {selectedShot && (
          <ShotDetailPanel
            shot={selectedShot}
            characters={characters}
            locations={locations}
            propsList={propsList}
            onClose={() => setSelectedShot(null)}
            onUpdateShotChecklist={handleUpdateShotChecklist}
            onCycleStatus={() => handleCycleShotStatus(selectedShot.id)}
            onAddNote={handleAddNote}
            onDeleteShot={handleDeleteShot}
          />
        )}
      </div>

      {/* New Shot Modal */}
      {isNewShotModalOpen && (
        <NewShotModal
          characters={characters}
          locations={locations}
          propsList={propsList}
          nextShotNumber={`S0${Math.ceil((shots.length + 1) / 4)}-0${((shots.length) % 4) + 1}`}
          nextSceneNumber={`Scene ${Math.ceil((shots.length + 1) / 4)}`}
          onClose={() => setIsNewShotModalOpen(false)}
          onAddShot={handleAddShot}
        />
      )}

      {/* Add Asset Modal */}
      {isAddAssetModalOpen && (
        <AddAssetModal
          isOpen={isAddAssetModalOpen}
          initialType={addAssetModalType}
          onClose={() => setIsAddAssetModalOpen(false)}
          onAddCharacter={handleAddCharacter}
          onAddLocation={handleAddLocation}
          onAddProp={handleAddProp}
        />
      )}
    </div>
  );
}

