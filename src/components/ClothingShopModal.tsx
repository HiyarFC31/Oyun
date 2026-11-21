import React from 'react';
import { Check, Glasses, Shirt, X } from 'lucide-react';
import { getNumberLocale, getTranslations } from '../game/i18n';
import { type HudSnapshot, OUTFIT_IDS, OUTFIT_SPECS, type OutfitId } from '../game/types';

interface ClothingShopModalProps {
  hud: HudSnapshot;
  onSelectOutfit: (id: OutfitId) => void;
  onToggleSunglasses: () => void;
  onClose: () => void;
}

const toHexCss = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

export const ClothingShopModal: React.FC<ClothingShopModalProps> = ({
  hud,
  onSelectOutfit,
  onToggleSunglasses,
  onClose,
}) => {
  if (hud.phase !== 'clothing') return null;

  const t = getTranslations(hud.language);
  const locale = getNumberLocale(hud.language);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6 bg-[#0d0917]/88 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-[#161224] border border-[#ff70a6]/45 p-5 sm:p-7 shadow-2xl my-auto">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff70a6]/20 border border-[#ff70a6]/55 flex items-center justify-center text-[#ff70a6]">
              <Shirt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl sm:text-2xl tracking-wider uppercase text-white">
                {t.clothing.title}
              </h2>
              <p className="text-[11px] font-mono-num uppercase tracking-widest text-white/55">
                {t.clothing.subtitle}
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
              aria-label={t.clothing.exitAria}
              className="p-2 rounded-lg bg-white/10 border border-white/15 text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sunglasses Accessory Toggle */}
        <div className="mb-4">
          <button
            type="button"
            onClick={onToggleSunglasses}
            className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-colors cursor-pointer ${
              hud.appearance.sunglasses
                ? 'bg-[#2a1224] border-[#ff70a6]/70 text-white'
                : 'bg-white/[0.04] border-white/15 text-white/85 hover:border-white/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <Glasses className="w-5 h-5 text-[#ff70a6]" />
              <div className="text-left">
                <div className="font-display font-bold text-sm uppercase tracking-wide text-white">
                  {t.clothing.sunglassesTitle}
                </div>
                <div className="text-xs font-mono-num text-white/65">
                  {hud.appearance.sunglasses ? t.clothing.sunglassesOn : t.clothing.sunglassesOff}
                </div>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-lg font-mono-num font-bold text-xs ${
                hud.appearance.sunglasses
                  ? 'bg-[#ff70a6] text-[#141022]'
                  : 'bg-white/10 text-white/75'
              }`}
            >
              {hud.appearance.sunglasses ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        <div className="text-[11px] font-mono-num uppercase tracking-widest text-white/55 mb-2.5">
          {t.clothing.outfitsTitle}
        </div>

        {/* Outfit Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {OUTFIT_IDS.map((id) => {
            const spec = OUTFIT_SPECS[id];
            const copy = t.clothing.outfits[id];
            const owned = hud.ownedOutfits[id];
            const equipped = hud.appearance.outfit === id;
            const canAfford = hud.cash >= spec.price;

            return (
              <div
                key={id}
                className={`rounded-xl p-3.5 border flex flex-col justify-between gap-3 ${
                  equipped
                    ? 'bg-[#ff70a6]/14 border-[#ff70a6]/75'
                    : owned
                      ? 'bg-white/[0.04] border-white/15'
                      : 'bg-white/[0.02] border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center -space-x-1 shrink-0">
                        <span
                          className="w-4 h-4 rounded-full border border-white/40"
                          style={{ backgroundColor: toHexCss(spec.jacketColor) }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-white/40"
                          style={{ backgroundColor: toHexCss(spec.teeColor) }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-white/40"
                          style={{ backgroundColor: toHexCss(spec.pantsColor) }}
                        />
                      </div>
                      <span className="font-display font-bold text-sm uppercase tracking-wide text-white truncate">
                        {copy.name}
                      </span>
                    </div>

                    {owned && (
                      <span className="text-[10px] font-mono-num px-2 py-0.5 rounded bg-[#2ec4b6]/20 border border-[#2ec4b6]/40 text-[#6ef3d6] shrink-0">
                        {equipped ? t.clothing.equipped : t.clothing.owned}
                      </span>
                    )}
                  </div>

                  <p className="mt-1.5 text-xs text-white/65 leading-snug">{copy.desc}</p>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectOutfit(id)}
                  disabled={!owned && !canAfford}
                  className={`w-full py-2 px-3 rounded-lg font-display font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    equipped
                      ? 'bg-[#ff70a6] text-[#141022]'
                      : owned
                        ? 'bg-white/12 border border-white/20 text-white hover:bg-white/20'
                        : canAfford
                          ? 'bg-gradient-to-r from-[#ff70a6] to-[#ffbe0b] text-[#141022] hover:brightness-110'
                          : 'bg-white/5 border border-white/10 text-white/35 cursor-not-allowed'
                  }`}
                >
                  {owned ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{equipped ? t.clothing.selected : t.clothing.equip}</span>
                    </>
                  ) : (
                    <span>{t.clothing.buy(spec.price)}</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-white/10 border border-white/15 text-white font-display font-bold tracking-wider uppercase hover:bg-white/15 transition-colors cursor-pointer"
        >
          {t.clothing.exitBtn}
        </button>
      </div>
    </div>
  );
};
