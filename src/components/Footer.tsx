/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useMatchContext } from '../context/MatchContext';
import { Sliders, RefreshCw, Globe, Wifi, Database, Calendar, Search, Check, Layers, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Footer() {
  const { 
    apiMatches,
    allSelectableMatches,
    searchQuery,
    setSearchQuery,
    apiSource,
    isLoadingApi,
    apiError,
    apiDiagnostic,
    loadApiMatches,
    selectApiMatch,
    selectedApiMatchId,
    setSelectedApiMatchId,
    selectedDate,
    setSelectedDate,
    isAutoSyncActive,
    setIsAutoSyncActive,
    isAutoRefreshListActive,
    setIsAutoRefreshListActive,
    
    // Pinned & Static Mode Customizations from active context
    pinnedMatchIds,
    setPinnedMatchIds,
    pinnedLimit,
    setPinnedLimit,
    isTokenSavingMode,
    setIsTokenSavingMode,
  } = useMatchContext();

  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [programSearchQuery, setProgramSearchQuery] = useState('');

  const filteredApiMatchesForProgram = apiMatches.filter((m) => {
    if (!programSearchQuery) return true;
    const q = programSearchQuery.toLowerCase();
    return (
      m.homeTeam?.name?.toLowerCase().includes(q) ||
      m.awayTeam?.name?.toLowerCase().includes(q) ||
      m.competition?.toLowerCase().includes(q)
    );
  });

  const handleSelectMatch = (matchId: string) => {
    selectApiMatch(matchId);
  };

const [isPinLocked, setIsPinLocked] = React.useState(false);

  const togglePinMatch = (id: string | number) => {
    if (isPinLocked) return;          // ← bloquer les double-clics
    setIsPinLocked(true);
    setTimeout(() => setIsPinLocked(false), 1500);  // ← débloquer après 1.5s

    const sId = String(id);
    if (pinnedMatchIds.includes(sId)) {
      setPinnedMatchIds(pinnedMatchIds.filter(mId => mId !== sId));
    } else {
      if (pinnedMatchIds.length >= 2) {
        const nextPins = [...pinnedMatchIds];
        nextPins.shift();
        setPinnedMatchIds([...nextPins, sId]);
      } else {
        setPinnedMatchIds([...pinnedMatchIds, sId]);
      }
    }
  };

  const selectAllMatches = () => {
    // Select the first 2 available matches from the filtered program list
    const visibleIds = filteredApiMatchesForProgram.slice(0, 2).map(m => String(m.id));
    setPinnedMatchIds(visibleIds);
  };

  const deselectAllMatches = () => {
    setPinnedMatchIds([]);
  };

  return (
    <div className="w-full relative z-35 bg-[#111111] border-t border-white/10" id="control-dashboard-panel">
      {/* Toggle Bar */}
      <div className="max-w-[1920px] mx-auto px-6 py-2 flex items-center justify-between border-b border-white/10 bg-black/30">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-brand-blue animate-pulse" />
          <span className="text-xs font-mono font-bold text-slate-300 tracking-wider uppercase">
            RÉGIE DE SYNCHRONISATION DIRECTE API (SANS SIMULATION)
          </span>
        </div>
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-brand-blue/20 hover:bg-brand-blue/40 border border-brand-blue/30 text-sky-400 font-mono text-[10px] uppercase font-bold py-1 px-3.5 rounded-lg active:scale-95 duration-100 cursor-pointer"
        >
          {isOpen ? "Masquer la Régie [-]" : "Ouvrir la Régie [+]"}
        </button>
      </div>

      {/* Main Panel Content with collapsibility */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="max-w-[1920px] mx-auto p-5 grid grid-cols-1 md:grid-cols-12 gap-5 bg-gradient-to-b from-neutral-900/60 to-[#050505]/95">
              
              {/* BLOCK 1: SYNCHRONISATION API LIVE (Columns 1-4) */}
              <div className="md:col-span-4 bg-[#1C1C1C] p-4 rounded-xl border border-white/10 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <Globe className="w-3.5 h-3.5 text-brand-blue animate-pulse shrink-0" />
                      <span className="text-xs font-mono font-black text-white uppercase truncate">SYNCHRO API LIVE</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => loadApiMatches(selectedDate)}
                      disabled={isLoadingApi}
                      className="text-slate-400 hover:text-brand-blue duration-100 disabled:opacity-50 cursor-pointer p-1"
                      title="Forcer le rafraîchissement"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingApi ? 'animate-spin text-brand-blue' : ''}`} />
                    </button>
                  </div>

                  {/* DATE SELECTION ACCENT BAR */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase text-slate-400 flex items-center justify-between">
                      <span>Filtrer par date</span>
                      <span className="text-[9px] font-semibold text-emerald-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Choisir la date
                      </span>
                    </label>
                    
                    {/* Quick Date Buttons + Calendar input */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const yes = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                          setSelectedDate(yes);
                        }}
                        className={`text-[9.5px] font-mono px-2 py-1 rounded cursor-pointer duration-100 ${
                          selectedDate === new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                            ? 'bg-brand-blue/30 border border-brand-blue/60 text-white font-bold'
                            : 'bg-black/40 border border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        Hier
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const tod = new Date().toISOString().split('T')[0];
                          setSelectedDate(tod);
                        }}
                        className={`text-[9.5px] font-mono px-2 py-1 rounded cursor-pointer duration-100 ${
                          selectedDate === new Date().toISOString().split('T')[0]
                            ? 'bg-brand-blue/30 border border-brand-blue/60 text-white font-bold'
                            : 'bg-black/40 border border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        Auj.
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const tom = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                          setSelectedDate(tom);
                        }}
                        className={`text-[9.5px] font-mono px-2 py-1 rounded cursor-pointer duration-100 ${
                          selectedDate === new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                            ? 'bg-brand-blue/30 border border-brand-blue/60 text-white font-bold'
                            : 'bg-black/40 border border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        Dem.
                      </button>
                      
                      <input 
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                          if (e.target.value) {
                            setSelectedDate(e.target.value);
                          }
                        }}
                        className="flex-1 bg-black/60 text-white border border-white/10 rounded px-1.5 py-1 text-[9.5px] font-mono font-medium focus:outline-none focus:ring-1 focus:ring-brand-blue cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                        <Search className="w-3 h-3 text-brand-blue" />
                        <span>Matchs du {selectedDate.split('-').reverse().slice(0, 2).join('/')} ({allSelectableMatches.length})</span>
                      </label>
                      {selectedDate === new Date().toISOString().split('T')[0] && (
                        <span className="text-[9px] font-semibold text-emerald-400 flex items-center gap-1">
                          <Wifi className="w-3 h-3 animate-pulse text-emerald-500" />
                          Direct
                        </span>
                      )}
                    </div>

                    {/* Search filter for finding matches */}
                    <div className="relative">
                      <input
                        id="matchSearchInput"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher (ex: PSG, France...)"
                        className="w-full bg-black/65 text-slate-200 border border-white/10 rounded-lg pl-8 pr-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-blue placeholder-slate-500 font-sans"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {apiError ? (
                      <div className="text-[10px] bg-red-950/20 rounded-lg border border-red-900/35 overflow-hidden">
                        <div className="p-3 text-red-500 font-sans leading-relaxed">
                          <div className="font-semibold flex items-center gap-1.5 text-red-400">
                            <Wifi className="w-3.5 h-3.5 text-red-400 shrink-0 animate-pulse" />
                            <span>Connexion API Football Interrompue</span>
                          </div>
                          <div className="mt-1 font-mono text-[9px] text-slate-300">
                            {apiError}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Diagnostic technical database toggle button */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowDiagnostics(!showDiagnostics)}
                        className={`w-full py-1 px-2 rounded-lg font-mono text-[9px] tracking-wider uppercase font-bold flex items-center justify-center gap-2 duration-100 cursor-pointer ${
                          showDiagnostics
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-[#1a1a1a] hover:bg-[#252525] text-slate-300 border border-white/5'
                        }`}
                      >
                        <Database className="w-3 h-3 text-brand-blue" />
                        <span>{showDiagnostics ? "Fermer Techn." : "Afficher Diagnostic"}</span>
                      </button>
                    </div>

                    {showDiagnostics && (
                      <div className="bg-[#111111] p-2.5 rounded-xl border border-white/10 font-mono text-[9px] leading-normal space-y-1 mt-1 text-slate-300 shadow-md">
                        <div className="text-brand-blue font-black border-b border-white/5 pb-1 flex items-center justify-between">
                          <span>🔍 DIAGNOSTIC TECHNIQUE</span>
                        </div>
                        <div className="space-y-0.5 text-[8.5px]">
                          <div><span className="text-slate-400">Fournisseur :</span> <span className="text-white font-bold">{apiDiagnostic?.fournisseurActif || "Football-Data.org"}</span></div>
                          <div><span className="text-slate-400">Clé API :</span> <span className={apiDiagnostic?.cleDetectee ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{apiDiagnostic?.cleDetectee ? "DÉTECTÉE ✔" : "ABSENTE ❌"}</span></div>
                          <div><span className="text-slate-400">HTTP Code :</span> <span className="text-yellow-400 font-bold">{apiDiagnostic?.statusHTTP ?? "---"}</span></div>
                          <div><span className="text-slate-400">Matchs récupérés :</span> <span className="text-cyan-400 font-bold">{apiDiagnostic?.nombreMatchsRecuperes ?? 0}</span></div>
                        </div>
                      </div>
                    )}

                    {isLoadingApi ? (
                      <div className="py-2 text-center text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-blue" /> Connexion au signal...
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-mono uppercase text-slate-400">
                          Match principal actif sur l'Écran (TV)
                        </label>
                        <select
                          id="apiMatchSelector"
                          value={selectedApiMatchId}
                          onChange={(e) => handleSelectMatch(e.target.value)}
                          className="w-full bg-[#111111] border border-white/10 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-blue cursor-pointer font-sans"
                        >
                          <option value="">-- Sélectionner un Match actif --</option>
                          {allSelectableMatches.map((m) => {
                            return (
                              <option key={m.id} value={m.id}>
                                [{m.competition}] {m.homeTeam.name} - {m.awayTeam.name}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* ACTIVE AUTO CONTROLS TOGGLES */}
                <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 shrink-0">
                  <button
                    id="toggleAutoRefreshBtn"
                    type="button"
                    onClick={() => setIsAutoRefreshListActive(!isAutoRefreshListActive)}
                    className={`flex items-center gap-1 justify-center py-1.5 px-2 rounded-lg text-[9px] font-mono duration-100 border cursor-pointer ${
                      isAutoRefreshListActive 
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' 
                        : 'bg-black/30 border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className={`w-1 h-1 rounded-full ${isAutoRefreshListActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                    <span>Auto-Refresh</span>
                  </button>

                  <button
                    id="toggleAutoSyncBtn"
                    type="button"
                    onClick={() => setIsAutoSyncActive(!isAutoSyncActive)}
                    className={`flex items-center gap-1 justify-center py-1.5 px-2 rounded-lg text-[9px] font-mono duration-100 border cursor-pointer ${
                      isAutoSyncActive 
                        ? 'bg-brand-blue/10 border-brand-blue/30 text-brand-blue' 
                        : 'bg-black/30 border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className={`w-1 h-1 rounded-full ${isAutoSyncActive ? 'bg-brand-blue animate-pulse' : 'bg-slate-500'}`} />
                    <span>Auto-Sync TV</span>
                  </button>
                </div>
              </div>

              {/* BLOCK 2: SÉLECTION DES MATCHS "AU PROGRAMME" (Columns 5-8) */}
              <div className="md:col-span-4 bg-[#1C1C1C] p-4 rounded-xl border border-white/10 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 border-b border-white/10 pb-2 mb-2">
                    <Layers className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                    <span className="text-xs font-mono font-black text-white uppercase truncate">RÉGIE : AU PROGRAMME</span>
                  </div>

                  {/* Config settings panel */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="block text-[8px] font-mono text-slate-400 uppercase tracking-widest mb-1 select-none">
                        LIMITE D'AFFICHAGE
                      </label>
                      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-md py-1.5 px-2 text-[10px] font-mono font-black uppercase text-center">
                        🔒 MAX : 2 MATCHS
                      </div>
                    </div>

                    <div>
                      <label className="block text-[8px] font-mono text-slate-400 uppercase tracking-widest mb-1 select-none">
                        MODE ARRIÈRE-PLAN
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsTokenSavingMode(!isTokenSavingMode)}
                        className={`w-full py-1.5 px-2 rounded-md border text-[10px] font-mono font-black transition flex items-center justify-center cursor-pointer ${
                          isTokenSavingMode 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        }`}
                      >
                        <span>{isTokenSavingMode ? 'ÉCO (STATIQUE)' : 'LIVE (SYNC)'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Search bar specifically for Au Programme selection */}
                  <div className="space-y-1 mb-2">
                    <label className="block text-[8px] font-mono text-slate-400 uppercase tracking-widest select-none">
                      Rechercher pour le programme
                    </label>
                    <div className="relative">
                      <input
                        id="programMatchSearch"
                        type="text"
                        value={programSearchQuery}
                        onChange={(e) => setProgramSearchQuery(e.target.value)}
                        placeholder="Rechercher par équipe, pays ou ligue..."
                        className="w-full bg-black/60 text-slate-200 border border-white/10 rounded-md pl-7 pr-2.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-pink-500 placeholder-slate-600 font-sans"
                      />
                      <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Interactive picker group */}
                  <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between text-[9px] font-mono mb-1 select-none">
                      <span className="text-slate-400 font-extrabold uppercase">
                        SÉLECTIONNER DES MATCHS ({pinnedMatchIds.length}/2 COCHÉS)
                      </span>
                      {pinnedMatchIds.length >= 2 && (
                        <span className="text-brand-blue text-[8px] font-bold">ROULEMENT ACTIF (FIFO)</span>
                      )}
                    </div>

                    {/* Current selected pins summary */}
                    {pinnedMatchIds.length > 0 && (
                      <div className="p-1.5 bg-brand-blue/5 border border-brand-blue/15 rounded-lg space-y-1">
                        <div className="text-[7.5px] font-mono font-black text-brand-blue uppercase tracking-wider">
                          SÉLECTIONNÉS (CLIQUEZ POUR RETIRER) :
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {pinnedMatchIds.map((pId) => {
                            // Find the match in the list of all matches
                            const m = apiMatches.find(match => String(match.id) === String(pId)) || 
                                      allSelectableMatches.find(match => String(match.id) === String(pId));
                            return (
                              <span 
                                key={pId} 
                                onClick={() => togglePinMatch(pId)}
                                className="text-[8.5px] font-mono font-bold bg-brand-blue/10 hover:bg-brand-blue/20 text-sky-400 border border-brand-blue/30 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                {m ? `${m.homeTeam.name} - ${m.awayTeam.name}` : `ID: ${pId}`}
                                <span className="text-red-450 font-extrabold text-[10px]">×</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {filteredApiMatchesForProgram.length === 0 ? (
                      <div className="text-center py-4 bg-black/20 rounded-lg border border-white/5">
                        <p className="text-[10px] font-mono text-slate-500">Aucun match correspondant</p>
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-[120px] overflow-y-auto pr-0.5 scrollbar-none" id="footer-pin-picker">
                        {filteredApiMatchesForProgram.map((m) => {
                          const isChecked = pinnedMatchIds.includes(String(m.id));
                          return (
                            <div 
                              key={m.id}
                              onClick={() => togglePinMatch(m.id)}
                              className={`flex items-center justify-between py-1 px-2 rounded duration-105 border text-left transition-all ${
                                  isPinLocked ? 'cursor-wait opacity-80' : 'cursor-pointer'
                              } ${
                                isChecked 
                                  ? 'bg-brand-blue/15 border-brand-blue/35 text-white' 
                                  : 'bg-black/20 border-white/5 hover:border-white/12 text-slate-400 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate pr-1 pointer-events-none">
                                <span className={`w-3 h-3 rounded flex items-center justify-center transition-all ${
                                  isChecked ? 'bg-brand-blue border-brand-blue' : 'border-slate-705 bg-black/20'
                                }`}>
                                  {isChecked && <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />}
                                </span>
                                <span className={`text-[10px] truncate font-mono font-bold ${isChecked ? 'text-white' : 'text-slate-350'}`}>
                                  {m.homeTeam.name} - {m.awayTeam.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 pointer-events-none">
                                {m.status === 'UPCOMING' ? (
                                  <span className="text-[7.5px] font-mono font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1 py-0.5 rounded">
                                    {m.date ? new Date(m.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'À venir'}
                                  </span>
                                ) : m.status === 'IN_PLAY' || m.status === 'HALF_TIME' ? (
                                  <span className="text-[7.5px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded animate-pulse">
                                    LIVE
                                  </span>
                                ) : (
                                  <span className="text-[7.5px] font-mono font-bold bg-red-550/10 border border-red-500/20 text-red-400 px-1 py-0.5 rounded">
                                    FINI
                                  </span>
                                )}
                                <span className="text-[7.5px] font-mono font-bold bg-white/10 px-1 py-0.5 rounded text-slate-500 max-w-[70px] truncate">
                                  {m.competition}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick select buttons */}
                <div className="grid grid-cols-2 gap-2 mt-1.5 pt-1.5 border-t border-white/5 shrink-0">
                  <button 
                    type="button"
                    onClick={selectAllMatches}
                    className="py-1 px-2 rounded bg-brand-blue/10 border border-brand-blue/30 text-brand-blue hover:bg-brand-blue/20 text-[9px] font-mono font-black uppercase text-center duration-100 cursor-pointer"
                    title="Coche automatiquement les 2 premiers de la liste"
                  >
                    Sélectionner 2
                  </button>
                  <button 
                    type="button"
                    onClick={deselectAllMatches}
                    className="py-1 px-2 rounded bg-black/40 border border-white/10 text-slate-450 hover:text-white text-[9px] font-mono font-black uppercase text-center duration-100 cursor-pointer"
                  >
                    Vider Tout
                  </button>
                </div>
              </div>

              {/* BLOCK 3: MONITEUR DE FLUX & DIRECT SIGNAL (Columns 9-12) */}
              <div className="md:col-span-4 bg-[#1C1C1C] p-4 rounded-xl border border-white/10 flex flex-col justify-between">
                <div className="space-y-3.5">
                  <div className="flex items-center gap-1.5 border-b border-white/10 pb-2">
                    <Database className="w-3.5 h-3.5 text-brand-green" />
                    <span className="text-xs font-mono font-black text-white uppercase truncate">MONITEUR SIGNAL PROD</span>
                  </div>
                  
                  <div className="bg-black/20 p-2.5 rounded-lg border border-white/5 space-y-1.5">
                    <div className="text-[9.5px] font-mono leading-relaxed space-y-1 text-slate-400">
                      <div className="flex justify-between">
                        <span>Source :</span>
                        {['api-sports.io', 'api-football-rapidapi'].includes(apiSource) ? (
                          <span className="text-emerald-400 font-bold uppercase">api-football.com ✔</span>
                        ) : apiSource === 'api-football-data' ? (
                          <span className="text-emerald-400 font-bold uppercase">Football-Data ✔</span>
                        ) : (
                          <span className="text-amber-500 font-bold uppercase">Aucune ⚠</span>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span>Canal :</span>
                        {selectedApiMatchId ? (
                          <span className="text-brand-blue font-bold truncate max-w-[130px]">{selectedApiMatchId}</span>
                        ) : (
                          <span className="text-slate-500 italic">Aucune acquisition</span>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span>Rafraîchissement :</span>
                        <span className="text-slate-300">Toutes les 25s</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] leading-relaxed text-slate-400 space-y-1.5">
                    <p className="font-sans">
                      <strong className="text-white">Note régie :</strong> Allouez et cochez les matchs souhaités dans l'onglet central pour alimenter instantanément le bloc « AU PROGRAMME ».
                    </p>
                    <p className="font-mono text-[8.5px] bg-[#111111] p-1.5 rounded border border-white/5 text-amber-500 leading-normal">
                      Variable active : <strong className="text-white">FOOTBALL_API_KEY</strong>
                    </p>
                  </div>
                </div>

                <div className="bg-black/40 p-1 rounded border border-white/5 text-[8.5px] font-mono text-slate-550 text-center uppercase tracking-wider mt-2.5">
                  Flux : {selectedApiMatchId ? 'LIVE INCOMING' : 'WAITING FOR SOURCE'}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini technical footer note */}
      <div className="bg-[#050505] py-2 px-6 text-center text-[10px] font-mono text-slate-500 select-none uppercase tracking-[0.2em] border-t border-white/10">
        Prêt pour l'intégration OBS / Streamlabs • AI Studio Match Sourcing Engine v2.0.0
      </div>
    </div>
  );
}
