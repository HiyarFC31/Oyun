import React from 'react';
import { Compass, MapPin, Scissors, Shield, Shirt, ShoppingBag, Target, X } from 'lucide-react';
import { getTranslations } from '../game/i18n';
import type { HudSnapshot } from '../game/types';

interface CityMapModalProps {
  hud: HudSnapshot;
  fullMapRef: React.RefObject<HTMLCanvasElement | null>;
  onClose: () => void;
}

export const CityMapModal: React.FC<CityMapModalProps> = ({ hud, fullMapRef, onClose }) => {
  if (hud.phase !== 'map') return null;

  const t = getTranslations(hud.language);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-[#0b0814]/88">
      <div className="w-full max-w-4xl rounded-2xl bg-[#151124] border border-white/15 p-4 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[94vh] overflow-y-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#ffbe0b]/15 border border-[#ffbe0b]/50 flex items-center justify-center">
              <Compass className="w-5 h-5 text-[#ffbe0b]" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl tracking-wide uppercase text-white">
                {t.map.title}
              </h2>
              <p className="text-[11px] font-mono-num text-white/60">
                {t.map.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-mono-num text-white hover:bg-white/15 flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4 text-[#ff4d6d]" />
            <span>{t.map.close}</span>
          </button>
        </div>

        {/* Map Canvas + Tactical Landmarks */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">
          <div className="flex items-center justify-center bg-[#0f0c1a] rounded-xl p-2 sm:p-3 border border-white/10">
            <canvas
              ref={fullMapRef}
              width={560}
              height={560}
              className="w-full max-w-[500px] aspect-square rounded-lg block"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
              <div className="text-[10px] font-mono-num uppercase tracking-wider text-white/55 mb-2">
                {t.map.landmarksTitle}
              </div>

              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#2a1020]/70 border border-[#ff4d6d]/40">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-[#ff4d6d] text-white font-mono-num font-bold text-[11px] flex items-center justify-center shrink-0">
                      S
                    </span>
                    <div>
                      <div className="font-display font-bold text-white flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3 text-[#ff8fa3]" />
                        <span>{t.map.shopTitle}</span>
                      </div>
                      <div className="text-[10px] text-white/60">{t.map.shopDesc}</div>
                    </div>
                  </div>
                  <span className="font-mono-num font-bold text-[#ff8fa3] shrink-0">
                    {hud.shopDistanceMeters}m
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#261124]/70 border border-[#ff70a6]/40">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-[#ff70a6] text-white font-mono-num font-bold text-[11px] flex items-center justify-center shrink-0">
                      K
                    </span>
                    <div>
                      <div className="font-display font-bold text-white flex items-center gap-1">
                        <Shirt className="w-3 h-3 text-[#ff85b3]" />
                        <span>{t.map.clothingTitle}</span>
                      </div>
                      <div className="text-[10px] text-white/60">{t.map.clothingDesc}</div>
                    </div>
                  </div>
                  <span className="font-mono-num font-bold text-[#ff85b3] shrink-0">
                    {hud.clothingDistanceMeters}m
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#0d1f2e]/75 border border-[#38bdf8]/40">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-[#38bdf8] text-[#0c1b29] font-mono-num font-bold text-[11px] flex items-center justify-center shrink-0">
                      T
                    </span>
                    <div>
                      <div className="font-display font-bold text-white flex items-center gap-1">
                        <Scissors className="w-3 h-3 text-[#38bdf8]" />
                        <span>{t.map.barberTitle}</span>
                      </div>
                      <div className="text-[10px] text-white/60">{t.map.barberDesc}</div>
                    </div>
                  </div>
                  <span className="font-mono-num font-bold text-[#7dd3fc] shrink-0">
                    {hud.barberDistanceMeters}m
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#241c0d]/70 border border-[#ffbe0b]/40">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#ffbe0b] text-[#141022] font-mono-num font-bold text-[11px] flex items-center justify-center shrink-0">
                      G
                    </span>
                    <div>
                      <div className="font-display font-bold text-white flex items-center gap-1">
                        <Target className="w-3 h-3 text-[#ffbe0b]" />
                        <span>{t.map.hubTitle}</span>
                      </div>
                      <div className="text-[10px] text-white/60">{t.map.hubDesc}</div>
                    </div>
                  </div>
                  <span className="font-mono-num font-bold text-[#ffbe0b] shrink-0">
                    {hud.missionHubDistanceMeters}m
                  </span>
                </div>

                {hud.mission.active && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#0d2624]/80 border border-[#00f5d4]/50">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#00f5d4] text-[#0c1b19] font-mono-num font-bold text-[11px] flex items-center justify-center shrink-0">
                        ★
                      </span>
                      <div>
                        <div className="font-display font-bold text-[#6ef3d6] truncate max-w-[140px]">
                          {hud.mission.title}
                        </div>
                        <div className="text-[10px] text-white/70">{t.map.activeTargetDesc}</div>
                      </div>
                    </div>
                    <span className="font-mono-num font-bold text-[#00f5d4] shrink-0">
                      {hud.mission.distanceMeters ?? 0}m
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/10">
                  <span className="w-5 h-5 rounded-full bg-[#2ec4b6] text-[#0c1b19] font-mono-num font-bold text-[11px] flex items-center justify-center shrink-0">
                    B
                  </span>
                  <div>
                    <div className="font-display font-bold text-white flex items-center gap-1">
                      <Shield className="w-3 h-3 text-[#2ec4b6]" />
                      <span>{t.map.sprayTitle}</span>
                    </div>
                    <div className="text-[10px] text-white/60">{t.map.sprayDesc}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/10">
                  <span className="w-5 h-5 rounded-full bg-[#3a86ff] text-white font-mono-num font-bold text-[11px] flex items-center justify-center shrink-0">
                    P
                  </span>
                  <div>
                    <div className="font-display font-bold text-white flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#3a86ff]" />
                      <span>{t.map.pierTitle}</span>
                    </div>
                    <div className="text-[10px] text-white/60">{t.map.pierDesc}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] text-white/70 space-y-1.5 font-mono-num">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white border border-[#ff9f1c] inline-block" />
                <span>{t.map.legendPlayer}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3a86ff] inline-block" />
                <span>{t.map.legendPolice}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff4d6d] inline-block" />
                <span>{t.map.legendGang}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
