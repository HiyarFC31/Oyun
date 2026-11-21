import React from 'react';
import { Play, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { getNumberLocale, getTranslations } from '../game/i18n';
import type { HudSnapshot } from '../game/types';

interface GameModalsProps {
  hud: HudSnapshot;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
}

export const GameModals: React.FC<GameModalsProps> = ({
  hud,
  onResume,
  onRestart,
  onOpenSettings,
}) => {
  if (hud.phase !== 'paused' && hud.phase !== 'wasted' && hud.phase !== 'busted') {
    return null;
  }

  const t = getTranslations(hud.language);
  const locale = getNumberLocale(hud.language);
  const isPaused = hud.phase === 'paused';
  const isWasted = hud.phase === 'wasted';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-6 bg-[#0d0917]/82">
      <div className="w-full max-w-md rounded-2xl bg-[#161224] border border-white/15 p-7 shadow-2xl">
        <div className="text-center mb-6">
          <div
            className={`font-display font-bold italic text-4xl tracking-wider uppercase ${
              isPaused ? 'text-[#ffbe0b]' : isWasted ? 'text-[#ff4d6d]' : 'text-[#3a86ff]'
            }`}
          >
            {isPaused ? t.modals.paused : isWasted ? t.modals.wasted : t.modals.busted}
          </div>
          <p className="text-xs font-mono-num uppercase tracking-[0.2em] text-white/55 mt-1">
            {isPaused
              ? `${hud.playerName.toUpperCase()} // SOLARIS BAY`
              : isWasted
                ? t.modals.wastedSub
                : t.modals.bustedSub}
          </p>
        </div>

        {/* Session Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="text-[11px] text-white/55">{t.modals.cash}</div>
            <div className="font-mono-num font-bold text-lg text-[#2ec4b6]">
              ${hud.cash.toLocaleString(locale)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="text-[11px] text-white/55">{t.modals.completedContracts}</div>
            <div className="font-mono-num font-bold text-lg text-[#ffbe0b]">
              {hud.scoreStats.missionsCompleted}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="text-[11px] text-white/55">{t.modals.vehiclesHijacked}</div>
            <div className="font-mono-num font-bold text-lg text-white">
              {hud.scoreStats.vehiclesHijacked}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="text-[11px] text-white/55">{t.modals.rampBonus}</div>
            <div className="font-mono-num font-bold text-lg text-[#ff9f1c]">
              ${hud.scoreStats.stuntCash}
            </div>
          </div>
        </div>

        {isPaused && (
          <div className="mb-6 p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white/75 space-y-1.5 font-mono-num">
            <div className="flex justify-between gap-2">
              <span className="text-white/50">{t.modals.ctrlMove}</span>
              <span>{t.modals.ctrlMoveVal}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-white/50">{t.modals.ctrlAim}</span>
              <span>{t.modals.ctrlAimVal}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-white/50">{t.modals.ctrlFire}</span>
              <span>{t.modals.ctrlFireVal}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-white/50">{t.modals.ctrlGear}</span>
              <span>{t.modals.ctrlGearVal}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-white/50">{t.modals.ctrlVehicle}</span>
              <span>{t.modals.ctrlVehicleVal}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-white/50">{t.modals.ctrlMisc}</span>
              <span>{t.modals.ctrlMiscVal}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {isPaused && (
            <>
              <button
                type="button"
                onClick={onResume}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-[#ff7b54] to-[#ff3d7f] text-white font-display font-bold tracking-wider uppercase hover:brightness-110 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{t.modals.resume}</span>
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0e2629] border border-[#00f5d4]/45 text-[#6ef3d6] font-display font-bold tracking-wider uppercase hover:border-[#00f5d4] hover:text-white transition-all cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>{t.modals.settingsOnline}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onRestart}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-display font-bold tracking-wider uppercase transition-all cursor-pointer ${
              isPaused
                ? 'bg-white/10 border border-white/15 text-white hover:bg-white/15'
                : 'bg-gradient-to-r from-[#ff7b54] to-[#ff3d7f] text-white hover:brightness-110'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isPaused ? t.modals.restart : t.modals.playAgain}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
