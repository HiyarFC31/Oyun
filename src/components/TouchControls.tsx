import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUp,
  Car,
  Crosshair,
  Eye,
  Flame,
  Hand,
  LogOut,
  Map as MapIcon,
  Megaphone,
  RefreshCw,
  RotateCw,
  Scissors,
  Shirt,
  ShoppingBag,
  Target,
  Zap,
} from 'lucide-react';
import { getTranslations } from '../game/i18n';
import type { LanguageCode, WeaponId } from '../game/types';

function safeSetPointerCapture(el: Element, pointerId: number): void {
  try {
    if (typeof el.setPointerCapture === 'function') {
      el.setPointerCapture(pointerId);
    }
  } catch {
    // Ignore InvalidStateError when pointer is no longer active or synthetic
  }
}

function safeReleasePointerCapture(el: Element, pointerId: number): void {
  try {
    if (typeof el.hasPointerCapture === 'function' && el.hasPointerCapture(pointerId)) {
      el.releasePointerCapture(pointerId);
    }
  } catch {
    // Ignore release errors
  }
}

interface TouchControlsProps {
  language: LanguageCode;
  inVehicle: boolean;
  canEnterVehicle: boolean;
  nearWeaponShop: boolean;
  nearClothingShop: boolean;
  nearBarberShop: boolean;
  missionActive: boolean;
  weapon: WeaponId;
  isAiming: boolean;
  magRounds: number;
  reserveRounds: number;
  nitro: number;
  onMove: (x: number, y: number) => void;
  onFire: (active: boolean) => void;
  onAim: (active: boolean) => void;
  onSprint: (active: boolean) => void;
  onBrake: (active: boolean) => void;
  onGas: (active: boolean) => void;
  onReverse: (active: boolean) => void;
  onJump: () => void;
  onEnterExitVehicle: () => void;
  onHorn: () => void;
  onCycleWeapon: () => void;
  onReload: () => void;
  onToggleHolster: () => void;
  onDropWeapon: () => void;
  onOpenShop: () => void;
  onOpenClothingShop: () => void;
  onOpenBarberShop: () => void;
  onStartMission: () => void;
  onOpenMap: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  language,
  inVehicle,
  canEnterVehicle,
  nearWeaponShop,
  nearClothingShop,
  nearBarberShop,
  missionActive,
  weapon,
  isAiming,
  magRounds,
  reserveRounds,
  nitro,
  onMove,
  onFire,
  onAim,
  onSprint,
  onBrake,
  onGas,
  onReverse,
  onJump,
  onEnterExitVehicle,
  onHorn,
  onCycleWeapon,
  onReload,
  onToggleHolster,
  onDropWeapon,
  onOpenShop,
  onOpenClothingShop,
  onOpenBarberShop,
  onStartMission,
  onOpenMap,
}) => {
  const t = getTranslations(language);
  const stickRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeButtons, setActiveButtons] = useState<Record<string, boolean>>({});
  const [aimLocked, setAimLocked] = useState(false);

  const setBtnActive = (key: string, val: boolean) => {
    setActiveButtons((prev) => (prev[key] === val ? prev : { ...prev, [key]: val }));
  };

  const maxRadius = 42;

  const updateStickFromPointer = (clientX: number, clientY: number) => {
    const el = stickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setKnobOffset({ x: dx, y: dy });

    const nx = dx / maxRadius;
    const ny = -dy / maxRadius;
    const mag = Math.hypot(nx, ny);
    if (mag < 0.14) {
      onMove(0, 0);
    } else {
      onMove(nx, ny);
    }
  };

  const resetStick = () => {
    pointerIdRef.current = null;
    setKnobOffset({ x: 0, y: 0 });
    onMove(0, 0);
  };

  useEffect(() => {
    const onWinMove = (e: PointerEvent) => {
      if (pointerIdRef.current === e.pointerId) {
        updateStickFromPointer(e.clientX, e.clientY);
      }
    };
    const onWinUp = (e: PointerEvent) => {
      if (pointerIdRef.current === e.pointerId) {
        resetStick();
      }
    };
    window.addEventListener('pointermove', onWinMove);
    window.addEventListener('pointerup', onWinUp);
    window.addEventListener('pointercancel', onWinUp);
    return () => {
      window.removeEventListener('pointermove', onWinMove);
      window.removeEventListener('pointerup', onWinUp);
      window.removeEventListener('pointercancel', onWinUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStickDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (pointerIdRef.current !== null) return;
    pointerIdRef.current = e.pointerId;
    safeSetPointerCapture(e.currentTarget, e.pointerId);
    updateStickFromPointer(e.clientX, e.clientY);
  };

  const handleStickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    updateStickFromPointer(e.clientX, e.clientY);
  };

  const handleStickUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    safeReleasePointerCapture(e.currentTarget, e.pointerId);
    resetStick();
  };

  const bindHoldButton = (
    id: string,
    onChange: (active: boolean) => void,
  ) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      safeSetPointerCapture(e.currentTarget, e.pointerId);
      setBtnActive(id, true);
      onChange(true);
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      safeReleasePointerCapture(e.currentTarget, e.pointerId);
      setBtnActive(id, false);
      onChange(false);
    },
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      safeReleasePointerCapture(e.currentTarget, e.pointerId);
      setBtnActive(id, false);
      onChange(false);
    },
    onLostPointerCapture: () => {
      setBtnActive(id, false);
      onChange(false);
    },
  });

  const stopTouchPropagation = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  const weaponShort = t.weapons[weapon].shortName;

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none flex items-end justify-between p-4 sm:p-6 md:p-8"
      onTouchStart={stopTouchPropagation}
    >
      {/* Left Thumb: Virtual Analog Joystick */}
      <div className="flex flex-col items-center gap-1.5 pointer-events-auto touch-none select-none">
        <div
          ref={stickRef}
          onPointerDown={handleStickDown}
          onPointerMove={handleStickMove}
          onPointerUp={handleStickUp}
          onPointerCancel={handleStickUp}
          onLostPointerCapture={handleStickUp}
          onTouchStart={stopTouchPropagation}
          className="relative w-32 h-32 md:w-36 md:h-36 rounded-full bg-[#141022]/75 border-2 border-white/20 shadow-xl flex items-center justify-center touch-none"
          aria-label={t.touch.moveHint}
        >
          {/* Crosshair / Steering guide lines */}
          <div className="absolute inset-4 rounded-full border border-white/10 pointer-events-none" />
          {inVehicle && (
            <div className="absolute inset-x-2.5 flex items-center justify-between text-[10px] font-mono-num font-bold text-white/55 pointer-events-none">
              <span>◀</span>
              <span>▶</span>
            </div>
          )}
          <div
            className="w-14 h-14 rounded-full bg-gradient-to-br from-[#ff9f1c] to-[#ff3d7f] border-2 border-white/75 shadow-lg pointer-events-none transition-transform duration-75"
            style={{
              transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
            }}
          />
        </div>
        <span className="text-[10px] font-mono-num uppercase tracking-wider text-white/65">
          {inVehicle ? t.touch.steerHint : t.touch.moveHint}
        </span>
      </div>

      {/* Right Thumb: Context-Sensitive Action Buttons */}
      <div
        className="flex flex-col items-end gap-2.5 pointer-events-auto touch-none select-none"
        onTouchStart={stopTouchPropagation}
      >
        {/* Secondary Utility Row */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {nearWeaponShop && !inVehicle && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onOpenShop();
              }}
              className="h-11 px-3.5 rounded-xl bg-[#2a1020]/95 border border-[#ff4d6d] text-[#ff8fa3] flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wide active:scale-95 shadow-lg"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{t.touch.shop}</span>
            </button>
          )}

          {nearClothingShop && !inVehicle && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onOpenClothingShop();
              }}
              className="h-11 px-3.5 rounded-xl bg-[#281024]/95 border border-[#ff70a6] text-[#ff9ec3] flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wide active:scale-95 shadow-lg"
            >
              <Shirt className="w-4 h-4" />
              <span>{t.touch.clothing}</span>
            </button>
          )}

          {nearBarberShop && !inVehicle && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onOpenBarberShop();
              }}
              className="h-11 px-3.5 rounded-xl bg-[#0d1f2e]/95 border border-[#38bdf8] text-[#7dd3fc] flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wide active:scale-95 shadow-lg"
            >
              <Scissors className="w-4 h-4" />
              <span>{t.touch.barber}</span>
            </button>
          )}

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onOpenMap();
            }}
            className="h-11 px-3 rounded-xl bg-[#141022]/90 border border-[#00f5d4]/50 text-[#6ef3d6] flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wide active:scale-95"
          >
            <MapIcon className="w-4 h-4" />
            <span>{t.touch.map}</span>
          </button>

          {!missionActive && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onStartMission();
              }}
              className="h-11 px-3 rounded-xl bg-[#141022]/90 border border-[#ffbe0b]/70 text-[#ffd166] flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wide active:scale-95"
            >
              <Target className="w-4 h-4" />
              <span>{t.touch.contract}</span>
            </button>
          )}

          {!inVehicle && (
            <>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onToggleHolster();
                }}
                title={t.touch.holster}
                className={`h-11 px-2.5 rounded-xl border flex items-center gap-1 text-[11px] font-mono-num active:scale-95 ${
                  weapon === 'unarmed'
                    ? 'bg-[#ffbe0b]/20 border-[#ffbe0b] text-[#ffd166]'
                    : 'bg-[#141022]/90 border-white/20 text-white/85'
                }`}
              >
                <Hand className="w-3.5 h-3.5" />
                <span>{t.touch.holster}</span>
              </button>

              {weapon !== 'unarmed' && (
                <>
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      onDropWeapon();
                    }}
                    title={t.touch.drop}
                    className="h-11 px-2.5 rounded-xl bg-[#141022]/90 border border-[#ff4d6d]/55 text-[#ff8fa3] flex items-center gap-1 text-[11px] font-mono-num active:scale-95"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    <span>{t.touch.drop}</span>
                  </button>

                  {weapon !== 'knife' && (
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        onReload();
                      }}
                      title="Şarjör Değiştir"
                      className="h-11 px-2.5 rounded-xl bg-[#141022]/90 border border-[#00f5d4]/50 text-[#6ef3d6] flex items-center gap-1 text-[11px] font-mono-num active:scale-95"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>{magRounds}/{reserveRounds}</span>
                    </button>
                  )}
                </>
              )}

              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onCycleWeapon();
                }}
                className="h-11 px-3 rounded-xl bg-[#141022]/90 border border-white/25 text-white/90 flex items-center gap-1.5 text-xs font-mono-num active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#ffbe0b]" />
                <span>{weaponShort}</span>
              </button>
            </>
          )}

          {inVehicle && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onHorn();
              }}
              aria-label="Korna"
              className="w-11 h-11 rounded-xl bg-[#141022]/90 border border-white/25 text-white/85 flex items-center justify-center active:scale-95"
            >
              <Megaphone className="w-4 h-4 text-[#ffbe0b]" />
            </button>
          )}

          {(inVehicle || canEnterVehicle) && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onEnterExitVehicle();
              }}
              className={`h-11 px-3.5 rounded-xl border flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wide active:scale-95 ${
                inVehicle
                  ? 'bg-[#2b1322]/92 border-[#ff4d6d]/70 text-[#ff8fa3]'
                  : 'bg-[#0f2b28]/95 border-[#00f5d4] text-[#6ef3d6] shadow-[0_0_18px_rgba(0,245,212,0.35)]'
              }`}
            >
              {inVehicle ? <LogOut className="w-4 h-4" /> : <Car className="w-4 h-4" />}
              <span>{inVehicle ? t.touch.exitCar : t.touch.enterCar}</span>
            </button>
          )}
        </div>

        {/* Main Right-Thumb Action Pad */}
        {inVehicle ? (
          <div className="flex items-end gap-2.5">
            <button
              type="button"
              {...bindHoldButton('brake', onBrake)}
              className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center gap-0.5 text-[10px] font-display font-bold uppercase ${
                activeButtons.brake
                  ? 'bg-[#ffbe0b] border-white text-[#141022]'
                  : 'bg-[#141022]/88 border-white/25 text-white/85'
              }`}
            >
              <span>{t.touch.drift}</span>
            </button>

            <button
              type="button"
              {...bindHoldButton('nitro', onSprint)}
              className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center gap-0.5 text-[10px] font-display font-bold uppercase ${
                activeButtons.nitro && nitro > 5
                  ? 'bg-[#00f5d4] border-white text-[#0d1b1e]'
                  : 'bg-[#141022]/88 border-[#00f5d4]/50 text-[#6ef3d6]'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>{t.touch.nitro}</span>
            </button>

            <button
              type="button"
              {...bindHoldButton('reverse', onReverse)}
              className={`w-16 h-16 rounded-2xl border flex flex-col items-center justify-center text-xs font-display font-bold uppercase ${
                activeButtons.reverse
                  ? 'bg-[#ff4d6d] border-white text-white'
                  : 'bg-[#24121d]/90 border-[#ff4d6d]/55 text-[#ff8fa3]'
              }`}
            >
              <span>{t.touch.brake}</span>
              <span className="text-[9px] opacity-75">{t.touch.reverse}</span>
            </button>

            <button
              type="button"
              {...bindHoldButton('gas', onGas)}
              className={`w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center text-sm font-display font-bold uppercase shadow-xl ${
                activeButtons.gas
                  ? 'bg-[#2ec4b6] border-white text-[#0c1d1b] scale-95'
                  : 'bg-[#112d2a]/92 border-[#2ec4b6] text-[#6ef3d6]'
              }`}
            >
              <span>{t.touch.gas}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            {weapon !== 'unarmed' && weapon !== 'knife' && (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const next = !aimLocked;
                  setAimLocked(next);
                  onAim(next);
                }}
                className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center gap-0.5 text-[10px] font-display font-bold uppercase active:scale-95 ${
                  aimLocked || isAiming
                    ? 'bg-[#00f5d4] border-white text-[#0d1b1e]'
                    : 'bg-[#141022]/88 border-[#00f5d4]/50 text-[#6ef3d6]'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>{t.touch.aim}</span>
              </button>
            )}

            <button
              type="button"
              {...bindHoldButton('sprint', onSprint)}
              className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center gap-0.5 text-[10px] font-display font-bold uppercase ${
                activeButtons.sprint
                  ? 'bg-[#00f5d4] border-white text-[#0d1b1e]'
                  : 'bg-[#141022]/88 border-white/25 text-white/85'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>{t.touch.sprint}</span>
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onJump();
              }}
              className="w-14 h-14 rounded-2xl bg-[#141022]/88 border border-white/25 text-white/90 flex flex-col items-center justify-center gap-0.5 text-[10px] font-display font-bold uppercase active:scale-95 active:bg-white/20"
            >
              <ArrowUp className="w-4 h-4" />
              <span>{t.touch.jump}</span>
            </button>

            <button
              type="button"
              {...bindHoldButton('fire', onFire)}
              className={`w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center gap-0.5 text-xs font-display font-bold uppercase shadow-xl ${
                activeButtons.fire
                  ? 'bg-[#ff3d7f] border-white text-white scale-95'
                  : 'bg-gradient-to-br from-[#ff7b54]/90 to-[#ff3d7f]/90 border-white/60 text-white'
              }`}
            >
              <Crosshair className="w-6 h-6" />
              <span>{weapon === 'unarmed' ? t.touch.hit : weapon === 'knife' ? t.touch.slash : t.touch.fire}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

