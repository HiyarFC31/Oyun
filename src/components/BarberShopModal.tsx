import React from 'react';
import { Check, Scissors, Sparkles, User, X } from 'lucide-react';
import { getNumberLocale, getTranslations } from '../game/i18n';
import {
  BEARD_STYLE_IDS,
  BEARD_STYLE_SPECS,
  type BeardStyleId,
  HAIR_COLOR_IDS,
  HAIR_COLOR_SPECS,
  HAIR_STYLE_IDS,
  HAIR_STYLE_SPECS,
  type HairColorId,
  type HairStyleId,
  type HudSnapshot,
} from '../game/types';

interface BarberShopModalProps {
  hud: HudSnapshot;
  onSelectHairStyle: (id: HairStyleId) => void;
  onSelectHairColor: (id: HairColorId) => void;
  onSelectBeardStyle: (id: BeardStyleId) => void;
  onClose: () => void;
}

export const BarberShopModal: React.FC<BarberShopModalProps> = ({
  hud,
  onSelectHairStyle,
  onSelectHairColor,
  onSelectBeardStyle,
  onClose,
}) => {
  if (hud.phase !== 'barber') return null;

  const t = getTranslations(hud.language);
  const locale = getNumberLocale(hud.language);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6 bg-[#0d0917]/88 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-[#161224] border border-[#38bdf8]/45 p-5 sm:p-7 shadow-2xl my-auto">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#38bdf8]/20 border border-[#38bdf8]/55 flex items-center justify-center text-[#38bdf8]">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl sm:text-2xl tracking-wider uppercase text-white">
                {t.barber.title}
              </h2>
              <p className="text-[11px] font-mono-num uppercase tracking-widest text-white/55">
                {t.barber.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-lg bg-[#0e2624] border border-[#2ec4b6]/50 font-mono-num font-bold text-base text-[#2ec4b6]">
              ${hud.cash.toLocaleString(locale)}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.barber.exitAria}
              className="p-2 rounded-lg bg-white/10 border border-white/15 text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hairstyles Section */}
        <div className="mb-5">
          <div className="flex items-center gap-1.5 text-[11px] font-mono-num uppercase tracking-widest text-[#38bdf8] mb-2.5">
            <Scissors className="w-3.5 h-3.5" />
            <span>{t.barber.hairStyleTitle}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {HAIR_STYLE_IDS.map((id) => {
              const spec = HAIR_STYLE_SPECS[id];
              const owned = hud.ownedHairStyles[id];
              const active = hud.appearance.hairStyle === id;
              const canAfford = hud.cash >= spec.price;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectHairStyle(id)}
                  disabled={!owned && !canAfford}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all text-left cursor-pointer ${
                    active
                      ? 'bg-[#38bdf8]/16 border-[#38bdf8] text-white'
                      : owned
                        ? 'bg-white/[0.04] border-white/15 text-white hover:bg-white/[0.08]'
                        : canAfford
                          ? 'bg-white/[0.02] border-white/12 text-white hover:border-[#38bdf8]/60'
                          : 'bg-white/[0.02] border-white/8 text-white/35 cursor-not-allowed'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-display font-bold text-sm uppercase tracking-wide truncate">
                      {t.barber.hairStyles[id]}
                    </div>
                    <div className="text-[10px] font-mono-num text-white/55">
                      {active ? t.barber.selected : owned ? t.barber.owned : `$${spec.price}`}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg font-display font-bold text-[11px] uppercase shrink-0 flex items-center gap-1 ${
                      active
                        ? 'bg-[#38bdf8] text-[#0c1b29]'
                        : owned
                          ? 'bg-white/12 text-white'
                          : canAfford
                            ? 'bg-[#38bdf8]/20 border border-[#38bdf8]/50 text-[#bae6fd]'
                            : 'bg-white/5 text-white/35'
                    }`}
                  >
                    {active && <Check className="w-3 h-3" />}
                    <span>{active ? t.barber.equipped : owned ? t.barber.equip : `$${spec.price}`}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hair & Beard Color Section */}
        <div className="mb-5">
          <div className="flex items-center gap-1.5 text-[11px] font-mono-num uppercase tracking-widest text-[#38bdf8] mb-2.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.barber.hairColorTitle}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {HAIR_COLOR_IDS.map((id) => {
              const spec = HAIR_COLOR_SPECS[id];
              const owned = hud.ownedHairColors[id];
              const active = hud.appearance.hairColor === id;
              const canAfford = hud.cash >= spec.price;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectHairColor(id)}
                  disabled={!owned && !canAfford}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    active
                      ? 'bg-[#38bdf8]/16 border-[#38bdf8] text-white'
                      : owned
                        ? 'bg-white/[0.04] border-white/15 text-white hover:bg-white/[0.08]'
                        : canAfford
                          ? 'bg-white/[0.02] border-white/12 text-white hover:border-[#38bdf8]/60'
                          : 'bg-white/[0.02] border-white/8 text-white/35 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-5 h-5 rounded-full border border-white/50 shrink-0"
                      style={{ backgroundColor: spec.css }}
                    />
                    <span className="font-display font-bold text-xs truncate">{t.barber.hairColors[id]}</span>
                  </div>
                  <span className="text-[10px] font-mono-num font-bold text-[#7dd3fc] shrink-0">
                    {active ? '✓' : owned ? t.barber.equip : `$${spec.price}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Beard & Shave Section */}
        <div className="mb-5">
          <div className="flex items-center gap-1.5 text-[11px] font-mono-num uppercase tracking-widest text-[#38bdf8] mb-2.5">
            <User className="w-3.5 h-3.5" />
            <span>{t.barber.beardStyleTitle}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {BEARD_STYLE_IDS.map((id) => {
              const spec = BEARD_STYLE_SPECS[id];
              const owned = hud.ownedBeardStyles[id];
              const active = hud.appearance.beardStyle === id;
              const canAfford = hud.cash >= spec.price;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectBeardStyle(id)}
                  disabled={!owned && !canAfford}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all text-left cursor-pointer ${
                    active
                      ? 'bg-[#38bdf8]/16 border-[#38bdf8] text-white'
                      : owned
                        ? 'bg-white/[0.04] border-white/15 text-white hover:bg-white/[0.08]'
                        : canAfford
                          ? 'bg-white/[0.02] border-white/12 text-white hover:border-[#38bdf8]/60'
                          : 'bg-white/[0.02] border-white/8 text-white/35 cursor-not-allowed'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-display font-bold text-sm uppercase tracking-wide truncate">
                      {t.barber.beardStyles[id]}
                    </div>
                    <div className="text-[10px] font-mono-num text-white/55">
                      {active ? t.barber.selected : owned ? t.barber.owned : `$${spec.price}`}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg font-display font-bold text-[11px] uppercase shrink-0 flex items-center gap-1 ${
                      active
                        ? 'bg-[#38bdf8] text-[#0c1b29]'
                        : owned
                          ? 'bg-white/12 text-white'
                          : canAfford
                            ? 'bg-[#38bdf8]/20 border border-[#38bdf8]/50 text-[#bae6fd]'
                            : 'bg-white/5 text-white/35'
                    }`}
                  >
                    {active && <Check className="w-3 h-3" />}
                    <span>{active ? t.barber.equipped : owned ? t.barber.equip : `$${spec.price}`}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-white/10 border border-white/15 text-white font-display font-bold tracking-wider uppercase hover:bg-white/15 transition-colors cursor-pointer"
        >
          {t.barber.exitBtn}
        </button>
      </div>
    </div>
  );
};
