import React, { useState, useEffect } from 'react';
import { StoryboardShot, Character, LocationAsset, PropAsset, ChecklistItems } from '../types';
import { WaveformMeter } from './WaveformMeter';
import { StatusChip } from './StatusChip';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  User,
  MapPin,
  Box,
  Layers,
  Camera,
  RefreshCw,
  MessageSquare,
  FileText,
  Sliders,
  Trash2,
} from 'lucide-react';

interface ShotDetailPanelProps {
  shot: StoryboardShot | null;
  characters: Character[];
  locations: LocationAsset[];
  propsList: PropAsset[];
  onClose: () => void;
  onUpdateShotChecklist: (shotId: string, newChecklist: ChecklistItems) => void;
  onCycleStatus?: () => void;
  onAddNote: (shotId: string, noteText: string) => void;
  onDeleteShot?: (shotId: string) => void;
}

export const ShotDetailPanel: React.FC<ShotDetailPanelProps> = ({
  shot,
  characters,
  locations,
  propsList,
  onClose,
  onUpdateShotChecklist,
  onCycleStatus,
  onAddNote,
  onDeleteShot,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'consistency' | 'assets' | 'notes' | 'metadata'>('overview');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reGenStatus, setReGenStatus] = useState<string | null>(null);

  // Lock body scroll when panel is open
  useEffect(() => {
    if (shot) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [shot]);

  if (!shot) return null;

  // Find linked character, location, and prop objects
  const shotCharacters = shot.characters
    .map((id) => characters.find((c) => c.id === id))
    .filter((c): c is Character => c !== undefined);

  const shotLocation = locations.find((l) => l.id === shot.locationId);

  const shotProps = shot.propIds
    .map((id) => propsList.find((p) => p.id === id))
    .filter((p): p is PropAsset => p !== undefined);

  // Copy prompt helper
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(shot.prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Toggle individual checklist item
  const handleToggleChecklist = (key: keyof ChecklistItems) => {
    const updated = {
      ...shot.checklist,
      [key]: !shot.checklist[key],
    };
    onUpdateShotChecklist(shot.id, updated);
  };

  // Submit new team note
  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    onAddNote(shot.id, newNoteText.trim());
    setNewNoteText('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Dimmed Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#1C1C1E]/80 transition-opacity duration-200"
        aria-hidden="true"
      />

      {/* Slide-over Panel */}
      <div className="relative w-full max-w-2xl bg-[#232325] border-l border-[#2E2E30] flex flex-col h-full z-10 overflow-hidden">
        {/* Top Fixed Header */}
        <div className="shrink-0 p-4 border-b border-[#2E2E30] flex items-center justify-between gap-3 bg-[#1C1C1E] z-20">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded bg-[#2A2A2C] text-[#B8945F] border border-[#B8945F]/40 font-mono text-xs font-bold">
              {shot.shotNumber}
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-semibold text-[#EDEAE3] flex items-center gap-2">
                  {shot.title}
                  <span className="text-xs text-[#8A8A8E] font-mono font-normal">({shot.sceneNumber})</span>
                </h2>
              </div>
              <p className="text-[11px] text-[#8A8A8E]">AI Model: {shot.aiModel}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusChip status={shot.status} score={shot.consistencyScore} size="sm" onClick={onCycleStatus} />
            {onDeleteShot && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 rounded text-[#8A8A8E] hover:text-[#C9756B] hover:bg-[#2A2A2C] transition-colors cursor-pointer"
                title="Delete Shot"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded text-[#8A8A8E] hover:text-[#EDEAE3] hover:bg-[#2A2A2C] transition-colors cursor-pointer"
              title="Close Panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal for Shot */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1C1E]/80 animate-fade-in">
            <div className="bg-[#232325] border border-[#2E2E30] w-full max-w-sm p-5 rounded-lg space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-[#2E2E30]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded bg-[#C9756B]/20 text-[#C9756B] border border-[#C9756B]/40 flex items-center justify-center shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#EDEAE3]">Delete Shot {shot.shotNumber}?</h3>
                    <p className="text-[11px] text-[#8A8A8E]">Permanent removal from sequence</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="p-1 rounded text-[#8A8A8E] hover:text-[#EDEAE3] hover:bg-[#2A2A2C]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[#EDEAE3] bg-[#1C1C1E] p-3 rounded border border-[#2E2E30] leading-relaxed">
                Are you sure you want to remove shot <span className="font-semibold text-[#B8945F]">"{shot.title}"</span> ({shot.shotNumber}) from the storyboard sequence?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2E2E30]">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3.5 py-1.5 rounded text-xs font-medium text-[#8A8A8E] hover:text-[#EDEAE3] bg-[#1C1C1E] border border-[#2E2E30] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteShot) {
                      onDeleteShot(shot.id);
                    }
                    setShowDeleteConfirm(false);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded text-xs font-semibold bg-[#C9756B] hover:bg-[#D8857B] text-[#EDEAE3] transition-colors cursor-pointer"
                >
                  Delete Shot
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Independent Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Main Image Viewport */}
          <div className="relative aspect-video w-full bg-[#1C1C1E] rounded overflow-hidden border border-[#2E2E30] group shrink-0">
            {shot.imageUrl ? (
  <img
    src={shot.imageUrl}
    alt={shot.title}
    className="w-full h-full object-cover"
    referrerPolicy="no-referrer"
  />
) : (
  <div className="w-full h-full flex items-center justify-center text-[#8A8A8E] text-xs font-mono">
    No generated image
  </div>
)}

            {/* Floating Identity Chips Overlay */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 z-10">
              {shotCharacters.map((char) => (
                <div
                  key={char.id}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1C1C1E]/90 border border-[#2E2E30] text-xs font-mono"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: char.color || '#B57878' }}
                  />
                  <span className="text-[#EDEAE3] font-medium">{char.name}</span>
                </div>
              ))}
            </div>

            <div className="absolute bottom-3 right-3 z-10">
              <StatusChip status={shot.status} score={shot.consistencyScore} showLabel size="md" onClick={onCycleStatus} />
            </div>
          </div>

          {/* Tab Controls Bar */}
          <div className="sticky top-0 z-10 flex items-center justify-between border border-[#2E2E30] rounded p-1 bg-[#1C1C1E] text-xs font-medium">
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 w-full">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'bg-[#2A2A2C] text-[#B8945F] border border-[#B8945F]/40 font-semibold'
                    : 'text-[#8A8A8E] hover:text-[#EDEAE3]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Overview
              </button>

              <button
                onClick={() => setActiveTab('consistency')}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'consistency'
                    ? 'bg-[#2A2A2C] text-[#B8945F] border border-[#B8945F]/40 font-semibold'
                    : 'text-[#8A8A8E] hover:text-[#EDEAE3]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" /> Consistency ({shot.consistencyScore}%)
              </button>

              <button
                onClick={() => setActiveTab('assets')}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'assets'
                    ? 'bg-[#2A2A2C] text-[#B8945F] border border-[#B8945F]/40 font-semibold'
                    : 'text-[#8A8A8E] hover:text-[#EDEAE3]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Assets
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'notes'
                    ? 'bg-[#2A2A2C] text-[#B8945F] border border-[#B8945F]/40 font-semibold'
                    : 'text-[#8A8A8E] hover:text-[#EDEAE3]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" /> Notes ({shot.notes.length})
              </button>

              <button
                onClick={() => setActiveTab('metadata')}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'metadata'
                    ? 'bg-[#2A2A2C] text-[#B8945F] border border-[#B8945F]/40 font-semibold'
                    : 'text-[#8A8A8E] hover:text-[#EDEAE3]'
                }`}
              >
                <Camera className="w-3.5 h-3.5" /> Metadata
              </button>
            </div>
          </div>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              <div className="bg-[#1C1C1E] p-3 rounded border border-[#2E2E30] space-y-1">
                <h4 className="text-xs font-mono uppercase text-[#8A8A8E] font-semibold">Story Action</h4>
                <p className="text-xs text-[#EDEAE3] leading-relaxed">{shot.description}</p>
              </div>

              <div className="bg-[#1C1C1E] p-3 rounded border border-[#2E2E30] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-[#B8945F] font-semibold">
                    Generation Prompt
                  </span>
                  <button
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-1 text-[11px] font-mono text-[#8A8A8E] hover:text-[#EDEAE3] transition-colors cursor-pointer"
                  >
                    {copiedPrompt ? <Check className="w-3.5 h-3.5 text-[#7A9E8C]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPrompt ? 'Copied' : 'Copy Prompt'}</span>
                  </button>
                </div>
                <p className="text-xs text-[#EDEAE3] font-mono bg-[#232325] p-2.5 rounded border border-[#2E2E30] leading-relaxed">
                  {shot.prompt}
                </p>
              </div>

              <div className="bg-[#1C1C1E] p-3 rounded border border-[#2E2E30] space-y-1">
                <h4 className="text-xs font-mono uppercase text-[#8A8A8E] font-semibold">Negative Prompt</h4>
                <p className="text-xs text-[#8A8A8E] font-mono bg-[#232325] p-2 rounded border border-[#2E2E30]">
                  {shot.negativePrompt}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1C1C1E] p-3 rounded border border-[#2E2E30]">
                  <span className="text-[10px] font-mono text-[#8A8A8E] uppercase">Location</span>
                  <p className="text-xs font-semibold text-[#EDEAE3]">{shotLocation?.name || 'Unassigned'}</p>
                </div>

                <div className="bg-[#1C1C1E] p-3 rounded border border-[#2E2E30]">
                  <span className="text-[10px] font-mono text-[#8A8A8E] uppercase">Lighting Style</span>
                  <p className="text-xs font-semibold text-[#EDEAE3]">{shot.lightingStyle}</p>
                </div>
              </div>
            </div>
          )}

          {/* CONSISTENCY TAB */}
          {activeTab === 'consistency' && (
            <div className="space-y-3">
              <WaveformMeter score={shot.consistencyScore} />

              <div className="bg-[#1C1C1E] p-3.5 rounded border border-[#2E2E30] space-y-3">
                <h4 className="text-xs font-mono uppercase text-[#EDEAE3] font-semibold flex items-center justify-between">
                  <span>Continuity Audit Checklist</span>
                  <span className="text-[10px] text-[#8A8A8E] font-normal">Click items to audit</span>
                </h4>

                <div className="space-y-2">
                  <div
                    onClick={() => handleToggleChecklist('facialFeatures')}
                    className={`flex items-start justify-between p-2.5 rounded border cursor-pointer transition-colors ${
                      shot.checklist.facialFeatures
                        ? 'bg-[#7A9E8C]/10 border-[#7A9E8C] text-[#7A9E8C]'
                        : 'bg-[#C9756B]/10 border-[#C9756B] text-[#C9756B]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {shot.checklist.facialFeatures ? (
                        <CheckCircle2 className="w-4 h-4 text-[#7A9E8C] shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-[#C9756B] shrink-0" />
                      )}
                      <div>
                        <span className="text-xs font-semibold">Facial Features & Geometry</span>
                        {shot.checklistFlags.facialFeatures && (
                          <p className="text-[11px] text-[#C9756B] mt-0.5">{shot.checklistFlags.facialFeatures}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold">{shot.checklist.facialFeatures ? '+20%' : '0%'}</span>
                  </div>

                  <div
                    onClick={() => handleToggleChecklist('hairStyle')}
                    className={`flex items-start justify-between p-2.5 rounded border cursor-pointer transition-colors ${
                      shot.checklist.hairStyle
                        ? 'bg-[#7A9E8C]/10 border-[#7A9E8C] text-[#7A9E8C]'
                        : 'bg-[#C9756B]/10 border-[#C9756B] text-[#C9756B]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {shot.checklist.hairStyle ? (
                        <CheckCircle2 className="w-4 h-4 text-[#7A9E8C] shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-[#C9756B] shrink-0" />
                      )}
                      <div>
                        <span className="text-xs font-semibold">Hair Cut & Styling</span>
                        {shot.checklistFlags.hairStyle && (
                          <p className="text-[11px] text-[#C9756B] mt-0.5">{shot.checklistFlags.hairStyle}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold">{shot.checklist.hairStyle ? '+20%' : '0%'}</span>
                  </div>

                  <div
                    onClick={() => handleToggleChecklist('costume')}
                    className={`flex items-start justify-between p-2.5 rounded border cursor-pointer transition-colors ${
                      shot.checklist.costume
                        ? 'bg-[#7A9E8C]/10 border-[#7A9E8C] text-[#7A9E8C]'
                        : 'bg-[#C9756B]/10 border-[#C9756B] text-[#C9756B]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {shot.checklist.costume ? (
                        <CheckCircle2 className="w-4 h-4 text-[#7A9E8C] shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-[#C9756B] shrink-0" />
                      )}
                      <div>
                        <span className="text-xs font-semibold">Costume & Wardrobe</span>
                        {shot.checklistFlags.costume && (
                          <p className="text-[11px] text-[#C9756B] mt-0.5">{shot.checklistFlags.costume}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold">{shot.checklist.costume ? '+20%' : '0%'}</span>
                  </div>

                  <div
                    onClick={() => handleToggleChecklist('colorPaletteAndLighting')}
                    className={`flex items-start justify-between p-2.5 rounded border cursor-pointer transition-colors ${
                      shot.checklist.colorPaletteAndLighting
                        ? 'bg-[#7A9E8C]/10 border-[#7A9E8C] text-[#7A9E8C]'
                        : 'bg-[#C9756B]/10 border-[#C9756B] text-[#C9756B]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {shot.checklist.colorPaletteAndLighting ? (
                        <CheckCircle2 className="w-4 h-4 text-[#7A9E8C] shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-[#C9756B] shrink-0" />
                      )}
                      <div>
                        <span className="text-xs font-semibold">Color Grade & Lighting Continuity</span>
                        {shot.checklistFlags.colorPaletteAndLighting && (
                          <p className="text-[11px] text-[#C9756B] mt-0.5">
                            {shot.checklistFlags.colorPaletteAndLighting}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold">
                      {shot.checklist.colorPaletteAndLighting ? '+20%' : '0%'}
                    </span>
                  </div>

                  <div
                    onClick={() => handleToggleChecklist('propsAndAccessories')}
                    className={`flex items-start justify-between p-2.5 rounded border cursor-pointer transition-colors ${
                      shot.checklist.propsAndAccessories
                        ? 'bg-[#7A9E8C]/10 border-[#7A9E8C] text-[#7A9E8C]'
                        : 'bg-[#C9756B]/10 border-[#C9756B] text-[#C9756B]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {shot.checklist.propsAndAccessories ? (
                        <CheckCircle2 className="w-4 h-4 text-[#7A9E8C] shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-[#C9756B] shrink-0" />
                      )}
                      <div>
                        <span className="text-xs font-semibold">Props & Accessories Integrity</span>
                        {shot.checklistFlags.propsAndAccessories && (
                          <p className="text-[11px] text-[#C9756B] mt-0.5">
                            {shot.checklistFlags.propsAndAccessories}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold">
                      {shot.checklist.propsAndAccessories ? '+20%' : '0%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ASSETS TAB */}
          {activeTab === 'assets' && (
            <div className="space-y-3">
              <div className="bg-[#1C1C1E] p-3.5 rounded border border-[#2E2E30] space-y-2">
                <h4 className="text-xs font-mono uppercase text-[#B8945F] font-semibold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Tagged Characters ({shotCharacters.length})
                </h4>
                <div className="space-y-2">
                  {shotCharacters.length === 0 ? (
                    <p className="text-xs text-[#8A8A8E] italic p-2">No characters linked to this shot.</p>
                  ) : (
                    shotCharacters.map((char) => (
                      <div
                        key={char.id}
                        className="flex items-center gap-3 p-2 rounded bg-[#232325] border border-[#2E2E30]"
                      >
                        <div className="w-10 h-10 rounded overflow-hidden border border-[#2E2E30] shrink-0">
                          <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#EDEAE3]">{char.name}</span>
                            <span
                              className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium text-[#EDEAE3]"
                              style={{ backgroundColor: `${char.color}30` }}
                            >
                              {char.colorName || 'Muted Tag'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8A8A8E] truncate">{char.description}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {shotLocation && (
                <div className="bg-[#1C1C1E] p-3.5 rounded border border-[#2E2E30] space-y-2">
                  <h4 className="text-xs font-mono uppercase text-[#7A9E8C] font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Environment / Location
                  </h4>
                  <div className="flex gap-3 p-2 rounded bg-[#232325] border border-[#2E2E30]">
                    <img
                      src={shotLocation.imageUrl}
                      alt={shotLocation.name}
                      className="w-16 h-12 rounded object-cover border border-[#2E2E30]"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h5 className="text-xs font-semibold text-[#EDEAE3]">{shotLocation.name}</h5>
                      <p className="text-[11px] text-[#8A8A8E]">{shotLocation.description}</p>
                    </div>
                  </div>
                </div>
              )}

              {shotProps.length > 0 && (
                <div className="bg-[#1C1C1E] p-3.5 rounded border border-[#2E2E30] space-y-2">
                  <h4 className="text-xs font-mono uppercase text-[#C9A24B] font-semibold flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5" /> Key Props ({shotProps.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {shotProps.map((prop) => (
                      <div key={prop.id} className="flex items-center gap-2 p-2 rounded bg-[#232325] border border-[#2E2E30]">
                        <img src={prop.imageUrl} alt={prop.name} className="w-8 h-8 rounded object-cover" referrerPolicy="no-referrer" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#EDEAE3] truncate">{prop.name}</p>
                          <p className="text-[10px] text-[#8A8A8E] truncate">{prop.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              <div className="space-y-2">
                {shot.notes.length > 0 ? (
                  shot.notes.map((note) => (
                    <div key={note.id} className="bg-[#1C1C1E] p-3 rounded border border-[#2E2E30] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src={note.avatar}
                            alt={note.author}
                            className="w-5 h-5 rounded-full object-cover border border-[#2E2E30]"
                            referrerPolicy="no-referrer"
                          />
                          <span className="text-xs font-semibold text-[#EDEAE3]">{note.author}</span>
                          <span className="text-[10px] font-mono text-[#8A8A8E] bg-[#2A2A2C] px-1.5 py-0.2 rounded">
                            {note.role}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#8A8A8E] font-mono">{note.timestamp}</span>
                      </div>
                      <p className="text-xs text-[#EDEAE3] pl-7 leading-relaxed">{note.text}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-[#8A8A8E] italic">No director or feedback notes yet.</div>
                )}
              </div>

              <form onSubmit={handleNoteSubmit} className="flex gap-2 pt-2 border-t border-[#2E2E30]">
                <input
                  type="text"
                  placeholder="Add director feedback or note..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="flex-1 bg-[#1C1C1E] border border-[#2E2E30] text-[#EDEAE3] px-3 py-2 rounded text-xs focus:outline-none focus:border-[#B8945F]"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded bg-[#B8945F] text-[#1C1C1E] font-semibold text-xs flex items-center gap-1 hover:bg-[#C9A24B] transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post</span>
                </button>
              </form>
            </div>
          )}

          {/* METADATA TAB */}
          {activeTab === 'metadata' && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1C1C1E] p-3 rounded border border-[#2E2E30] space-y-0.5">
                  <span className="text-[10px] font-mono text-[#8A8A8E]">Seed Number</span>
                  <p className="font-mono font-bold text-[#B8945F]">{shot.seed}</p>
                </div>

                <div className="bg-[#1C1C1E] p-3 rounded border border-[#2E2E30] space-y-0.5">
                  <span className="text-[10px] font-mono text-[#8A8A8E]">AI Model</span>
                  <p className="font-mono font-bold text-[#EDEAE3]">{shot.aiModel}</p>
                </div>

                <div className="bg-[#1C1C1E] p-3 rounded border border-[#2E2E30] space-y-0.5">
                  <span className="text-[10px] font-mono text-[#8A8A8E]">Focal Length</span>
                  <p className="font-mono font-bold text-[#EDEAE3]">{shot.cameraSettings.focalLength}</p>
                </div>

                <div className="bg-[#1C1C1E] p-3 rounded border border-[#2E2E30] space-y-0.5">
                  <span className="text-[10px] font-mono text-[#8A8A8E]">Camera Angle</span>
                  <p className="font-mono font-bold text-[#EDEAE3]">{shot.cameraSettings.angle}</p>
                </div>
              </div>

              <div className="bg-[#1C1C1E] p-3.5 rounded border border-[#2E2E30] space-y-1">
                <span className="text-[10px] font-mono text-[#8A8A8E] uppercase">Camera Movement</span>
                <p className="text-xs font-mono text-[#EDEAE3]">{shot.cameraSettings.movement}</p>
              </div>

              {reGenStatus && (
                <div className="p-3 rounded bg-[#7A9E8C]/20 border border-[#7A9E8C]/40 text-[#7A9E8C] text-xs font-mono">
                  ✓ {reGenStatus}
                </div>
              )}

              <button
                onClick={() => setReGenStatus(`Submitted re-generation job for ${shot.shotNumber} with seed lock ${shot.seed}`)}
                className="w-full py-2.5 rounded bg-[#2A2A2C] hover:bg-[#323235] text-[#EDEAE3] border border-[#2E2E30] font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-[#8A8A8E]" />
                <span>Queue Inpainting / Re-Generation with Seed Lock</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
