export type DualSenseButton =
  | 'cross'
  | 'circle'
  | 'square'
  | 'triangle'
  | 'l1'
  | 'r1'
  | 'l2'
  | 'r2'
  | 'create'
  | 'options'
  | 'l3'
  | 'r3'
  | 'dpadUp'
  | 'dpadDown'
  | 'dpadLeft'
  | 'dpadRight'
  | 'ps'
  | 'touchpad';

export interface DualSenseState {
  connected: boolean;
  isDualSense: boolean;
  name: string;
  lx: number;
  ly: number;
  rx: number;
  ry: number;
  l2: number;
  r2: number;
  held: Set<DualSenseButton>;
  justPressed: Set<DualSenseButton>;
}

const STANDARD_BUTTON_MAP: readonly DualSenseButton[] = [
  'cross',
  'circle',
  'square',
  'triangle',
  'l1',
  'r1',
  'l2',
  'r2',
  'create',
  'options',
  'l3',
  'r3',
  'dpadUp',
  'dpadDown',
  'dpadLeft',
  'dpadRight',
  'ps',
  'touchpad',
];

const RAW_HID_BUTTON_MAP: Record<number, DualSenseButton> = {
  0: 'square',
  1: 'cross',
  2: 'circle',
  3: 'triangle',
  4: 'l1',
  5: 'r1',
  6: 'l2',
  7: 'r2',
  8: 'create',
  9: 'options',
  10: 'l3',
  11: 'r3',
  12: 'ps',
  13: 'touchpad',
};

function applyRadialDeadzone(x: number, y: number, deadzone = 0.14): [number, number] {
  const mag = Math.hypot(x, y);
  if (mag <= deadzone) return [0, 0];
  const scaled = Math.min(1, (mag - deadzone) / (1 - deadzone));
  // Subtle quadratic-linear blend for fine aiming + responsive full-lock turns
  const curved = scaled * (0.65 + 0.35 * scaled);
  return [(x / mag) * curved, (y / mag) * curved];
}

function isDualSenseId(id: string): boolean {
  return /dualsense|054c|0ce6|0df2|playstation|wireless controller/i.test(id);
}

export class DualSenseController {
  private prevHeld = new Set<DualSenseButton>();
  private lastHapticAt = 0;
  private activeIndex: number | null = null;

  public state: DualSenseState = {
    connected: false,
    isDualSense: false,
    name: 'DualSense',
    lx: 0,
    ly: 0,
    rx: 0,
    ry: 0,
    l2: 0,
    r2: 0,
    held: new Set<DualSenseButton>(),
    justPressed: new Set<DualSenseButton>(),
  };

  private pickGamepad(): Gamepad | null {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
      return null;
    }
    const list = navigator.getGamepads();
    if (!list) return null;

    if (this.activeIndex !== null) {
      const candidate = list[this.activeIndex];
      if (candidate && candidate.connected) {
        return candidate;
      }
      this.activeIndex = null;
    }

    let fallback: Gamepad | null = null;
    for (let i = 0; i < list.length; i++) {
      const gp = list[i];
      if (!gp || !gp.connected) continue;
      if (isDualSenseId(gp.id)) {
        this.activeIndex = gp.index;
        return gp;
      }
      if (!fallback) {
        fallback = gp;
      }
    }

    if (fallback) {
      this.activeIndex = fallback.index;
    }
    return fallback;
  }

  public setActiveIndex(index: number | null): void {
    this.activeIndex = index;
  }

  public poll(): DualSenseState {
    const gp = this.pickGamepad();
    const nextHeld = new Set<DualSenseButton>();
    const nextJustPressed = new Set<DualSenseButton>();

    if (!gp) {
      this.prevHeld.clear();
      this.state = {
        connected: false,
        isDualSense: false,
        name: 'DualSense',
        lx: 0,
        ly: 0,
        rx: 0,
        ry: 0,
        l2: 0,
        r2: 0,
        held: nextHeld,
        justPressed: nextJustPressed,
      };
      return this.state;
    }

    const dualSense = isDualSenseId(gp.id);
    const isStandard = gp.mapping === 'standard';

    let rawLx = gp.axes[0] ?? 0;
    let rawLy = gp.axes[1] ?? 0;
    let rawRx = gp.axes[2] ?? 0;
    let rawRy = isStandard ? (gp.axes[3] ?? 0) : (gp.axes[5] ?? gp.axes[3] ?? 0);
    let l2Val = 0;
    let r2Val = 0;

    if (isStandard) {
      for (let i = 0; i < STANDARD_BUTTON_MAP.length && i < gp.buttons.length; i++) {
        const btn = gp.buttons[i];
        const mapped = STANDARD_BUTTON_MAP[i];
        if (mapped === 'l2') {
          l2Val = btn?.value ?? (btn?.pressed ? 1 : 0);
        }
        if (mapped === 'r2') {
          r2Val = btn?.value ?? (btn?.pressed ? 1 : 0);
        }
        if (btn && (btn.pressed || btn.value > 0.35)) {
          nextHeld.add(mapped);
        }
      }
    } else {
      // Raw HID fallback for browsers/OSes exposing DualSense without standard mapping
      for (let i = 0; i < gp.buttons.length; i++) {
        const mapped = RAW_HID_BUTTON_MAP[i];
        if (!mapped) continue;
        const btn = gp.buttons[i];
        if (btn && (btn.pressed || btn.value > 0.35)) {
          nextHeld.add(mapped);
        }
      }

      if (gp.axes.length >= 5) {
        l2Val = Math.max(0, Math.min(1, ((gp.axes[3] ?? -1) + 1) * 0.5));
        r2Val = Math.max(0, Math.min(1, ((gp.axes[4] ?? -1) + 1) * 0.5));
      }
      if (l2Val > 0.25) nextHeld.add('l2');
      if (r2Val > 0.25) nextHeld.add('r2');

      // DualSense raw HID D-pad hat on axes[9]
      if (gp.axes.length > 9 && Math.abs(gp.axes[9]) <= 1.05) {
        const hat = gp.axes[9];
        if (hat < -0.85) nextHeld.add('dpadUp');
        else if (hat < -0.55) {
          nextHeld.add('dpadUp');
          nextHeld.add('dpadRight');
        } else if (hat < -0.25) nextHeld.add('dpadRight');
        else if (hat < 0.05) {
          nextHeld.add('dpadRight');
          nextHeld.add('dpadDown');
        } else if (hat < 0.35) nextHeld.add('dpadDown');
        else if (hat < 0.65) {
          nextHeld.add('dpadDown');
          nextHeld.add('dpadLeft');
        } else if (hat < 0.85) nextHeld.add('dpadLeft');
        else if (hat <= 1.02) {
          nextHeld.add('dpadLeft');
          nextHeld.add('dpadUp');
        }
      }
    }

    const [lx, ly] = applyRadialDeadzone(rawLx, rawLy, 0.14);
    const [rx, ry] = applyRadialDeadzone(rawRx, rawRy, 0.15);

    for (const btn of nextHeld) {
      if (!this.prevHeld.has(btn)) {
        nextJustPressed.add(btn);
      }
    }
    this.prevHeld = nextHeld;

    this.state = {
      connected: true,
      isDualSense: dualSense,
      name: dualSense ? 'DualSense' : 'Gamepad',
      lx,
      ly,
      rx,
      ry,
      l2: l2Val,
      r2: r2Val,
      held: nextHeld,
      justPressed: nextJustPressed,
    };
    return this.state;
  }

  public triggerHaptic(weakMagnitude: number, strongMagnitude: number, durationMs: number): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.lastHapticAt < 45) return;
    const gp = this.pickGamepad();
    if (!gp) return;

    const weak = Math.max(0, Math.min(1, weakMagnitude));
    const strong = Math.max(0, Math.min(1, strongMagnitude));
    const duration = Math.max(25, Math.min(800, Math.round(durationMs)));

    const actuator = gp.vibrationActuator as
      | (GamepadHapticActuator & {
          playEffect?: (
            type: string,
            params: {
              startDelay?: number;
              duration: number;
              weakMagnitude: number;
              strongMagnitude: number;
            },
          ) => Promise<string>;
        })
      | undefined;

    if (actuator && typeof actuator.playEffect === 'function') {
      this.lastHapticAt = now;
      actuator
        .playEffect('dual-rumble', {
          startDelay: 0,
          duration,
          weakMagnitude: weak,
          strongMagnitude: strong,
        })
        .catch(() => {
          // Ignore browsers/devices rejecting rumble before user gesture
        });
      return;
    }

    const pulseActuator = gp.hapticActuators?.[0] as
      | (GamepadHapticActuator & { pulse?: (value: number, duration: number) => Promise<boolean> })
      | undefined;
    if (pulseActuator && typeof pulseActuator.pulse === 'function') {
      this.lastHapticAt = now;
      pulseActuator.pulse(Math.max(weak, strong), duration).catch(() => {});
    }
  }
}
