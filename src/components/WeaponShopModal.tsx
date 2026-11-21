import React from 'react';
import { Check, Crosshair, Heart, PackagePlus, Shield, ShoppingBag, Sword, X } from 'lucide-react';
import { getNumberLocale, getTranslations } from '../game/i18n';
import { type EquippableWeaponId, type HudSnapshot, SHOP_WEAPON_IDS, WEAPON_SPECS } from '../game/types';
import type { FirearmId } from '../game/models';

interface WeaponShopModalProps {
  hud: HudSnapshot;
  onBuyWeapon: (id: EquippableWeaponId) => void;
  onBuyAmmo: (id: FirearmId) => void;
  onBuyGear: (kind: 'armor' | 'health') => void;
  onClose: () => void;
}

export const WeaponShopModal: React.FC<WeaponShopModalProps> = ({
  hud,
  onBuyWeapon,
  onBuyAmmo,
  onBuyGear,
  onClose,
}) => {
  if (hud.phase !== 'shop') return null;

  const t = getTranslations(hud.language);
  const locale = getNumberLocale(hud.language);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6 bg-[#0d0917]/88 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-[#161224] border border-[#ff4d6d]/40 p-5 sm:p-7 shadow-2xl my-auto">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff4d6d]/20 border border-[#ff4d6d]/50 flex items-center justify-center text-[#ff4d6d]">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl sm:text-2xl tracking-wider uppercase text-white">
                SOLARIS ARMS
              </h2>
              <p className="text-[11px] font-mono-num uppercase tracking-widest text-white/55">
                {t.shop.subtitle}
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
              aria-label={t.shop.exitAria}
              className="p-2 rounded-lg bg-white/10 border border-white/15 text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Weapons Catalog */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {SHOP_WEAPON_IDS.map((id) => {
            const spec = WEAPON_SPECS[id];
            const weaponLabel = t.weapons[id].name;
            const isMelee = spec.magSize === 0;
            const owned = hud.ownedWeapons[id];
            const equipped = hud.weapon === id;
            const totalRounds = hud.magAmmo[id] + hud.ammo[id];
            const canAffordWeapon = hud.cash >= spec.price;
            const canAffordAmmo = !isMelee && hud.cash >= spec.ammoPrice;

            return (
              <div
                key={id}
                className={`rounded-xl p-3.5 border flex flex-col justify-between gap-3 ${
                  equipped
                    ? 'bg-[#ff9f1c]/12 border-[#ff9f1c]/65'
                    : owned
                      ? 'bg-white/[0.04] border-white/15'
                      : 'bg-white/[0.02] border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isMelee ? (
                        <Sword className="w-4 h-4 text-[#e2e8f0]" />
                      ) : (
                        <Crosshair className="w-4 h-4 text-[#ffbe0b]" />
                      )}
                      <span className="font-display font-bold text-sm uppercase tracking-wide text-white">
                        {weaponLabel}
                      </span>
                    </div>
                    {owned && (
                      <span className="text-[10px] font-mono-num px-2 py-0.5 rounded bg-[#2ec4b6]/20 border border-[#2ec4b6]/40 text-[#6ef3d6]">
                        {equipped ? t.shop.equipped : t.shop.owned}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px] font-mono-num text-white/65">
                    <div className="bg-black/25 rounded px-2 py-1">{t.shop.statDamage}: {spec.damage}</div>
                    <div className="bg-black/25 rounded px-2 py-1">
                      {isMelee ? t.shop.statMelee : `${t.shop.statMag}: ${spec.magSize}`}
                    </div>
                    <div className="bg-black/25 rounded px-2 py-1">{t.shop.statRange}: {spec.range}m</div>
                  </div>

                  {owned && (
                    <div className="mt-2 text-[11px] font-mono-num text-[#ffbe0b]">
                      {isMelee
                        ? t.shop.meleeNote
                        : t.shop.ammoNote(hud.magAmmo[id], hud.ammo[id], totalRounds)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onBuyWeapon(id)}
                    disabled={!owned && !canAffordWeapon}
                    className={`flex-1 py-2 px-3 rounded-lg font-display font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      equipped
                        ? 'bg-[#ff9f1c] text-[#141022]'
                        : owned
                          ? 'bg-white/12 border border-white/20 text-white hover:bg-white/20'
                          : canAffordWeapon
                            ? 'bg-gradient-to-r from-[#ff7b54] to-[#ff3d7f] text-white hover:brightness-110'
                            : 'bg-white/5 border border-white/10 text-white/35 cursor-not-allowed'
                    }`}
                  >
                    {owned ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{equipped ? t.shop.selected : t.shop.equip}</span>
                      </>
                    ) : (
                      <span>{t.shop.buy(spec.price)}</span>
                    )}
                  </button>

                  {owned && !isMelee && (
                    <button
                      type="button"
                      onClick={() => onBuyAmmo(id as FirearmId)}
                      disabled={!canAffordAmmo}
                      className={`py-2 px-2.5 rounded-lg font-mono-num font-bold text-[11px] border transition-all cursor-pointer flex items-center gap-1 ${
                        canAffordAmmo
                          ? 'bg-[#0f2b28] border-[#00f5d4]/55 text-[#6ef3d6] hover:bg-[#163b37]'
                          : 'bg-white/5 border-white/10 text-white/35 cursor-not-allowed'
                      }`}
                    >
                      <PackagePlus className="w-3.5 h-3.5" />
                      <span>+{spec.ammoPack} (${spec.ammoPrice})</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Armor & Medkit Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <button
            type="button"
            onClick={() => onBuyGear('armor')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-[#101c33] border border-[#3a86ff]/45 hover:border-[#3a86ff] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-[#3a86ff]" />
              <div>
                <div className="font-display font-bold text-xs uppercase text-white">{t.shop.armorTitle}</div>
                <div className="text-[11px] font-mono-num text-white/60">{t.shop.current(hud.armor, 100)}</div>
              </div>
            </div>
            <span className="font-mono-num font-bold text-sm text-[#60a5fa]">$200</span>
          </button>

          <button
            type="button"
            onClick={() => onBuyGear('health')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-[#2a121f] border border-[#ff4d6d]/45 hover:border-[#ff4d6d] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <Heart className="w-5 h-5 text-[#ff4d6d]" />
              <div>
                <div className="font-display font-bold text-xs uppercase text-white">{t.shop.healthTitle}</div>
                <div className="text-[11px] font-mono-num text-white/60">{t.shop.current(hud.health, hud.maxHealth)}</div>
              </div>
            </div>
            <span className="font-mono-num font-bold text-sm text-[#ff8fa3]">$150</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-white/10 border border-white/15 text-white font-display font-bold tracking-wider uppercase hover:bg-white/15 transition-colors cursor-pointer"
        >
          {t.shop.exitBtn}
        </button>
      </div>
    </div>
  );
};
