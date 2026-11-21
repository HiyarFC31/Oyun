import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, type WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type WeatherKind = 'sunny' | 'rainy' | 'foggy';

interface ServerPlayer {
  id: string;
  room: string;
  name: string;
  color: number;
  x: number;
  y: number;
  z: number;
  rotY: number;
  speed: number;
  weapon: string;
  aiming: boolean;
  inVehicle: boolean;
  vehicleType: string;
  vehicleColor: number;
  vehicleSpeed: number;
  health: number;
  wantedStars: number;
  appearance?: {
    outfit: string;
    sunglasses: boolean;
    hairStyle: string;
    hairColor: string;
    beardStyle: string;
  };
}

interface ClientSocketState {
  playerId: string | null;
  room: string;
  isAlive: boolean;
}

const PLAYER_COLORS = [
  0x00f5d4,
  0xff4d6d,
  0xffbe0b,
  0x3a86ff,
  0x9b5de5,
  0x2ec4b6,
  0xff9f1c,
  0xf15bb5,
];

const WEAPON_IDS = new Set(['unarmed', 'knife', 'pistol', 'smg', 'shotgun', 'rifle']);
const VEHICLE_TYPES = new Set(['sports', 'muscle', 'taxi', 'police', 'suv']);

function clampNum(v: unknown, min: number, max: number, fallback = 0): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  return Math.max(min, Math.min(max, n));
}

function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return 'Frank';
  const cleaned = raw.replace(/[^\p{L}\p{N}_\- ]/gu, '').trim().slice(0, 16);
  return cleaned.length > 0 ? cleaned : 'Frank';
}

const OUTFIT_SET = new Set(['biker', 'miami', 'tuxedo', 'street', 'tactical', 'gold']);
const HAIR_STYLE_SET = new Set(['pompadour', 'buzz', 'fade', 'slick', 'afro', 'bald']);
const HAIR_COLOR_SET = new Set(['black', 'brown', 'blonde', 'red', 'silver', 'neon']);
const BEARD_STYLE_SET = new Set(['stubble', 'clean', 'goatee', 'full']);

function sanitizeAppearance(raw: unknown): ServerPlayer['appearance'] | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const outfit = typeof obj.outfit === 'string' && OUTFIT_SET.has(obj.outfit) ? obj.outfit : 'biker';
  const hairStyle = typeof obj.hairStyle === 'string' && HAIR_STYLE_SET.has(obj.hairStyle) ? obj.hairStyle : 'pompadour';
  const hairColor = typeof obj.hairColor === 'string' && HAIR_COLOR_SET.has(obj.hairColor) ? obj.hairColor : 'black';
  const beardStyle = typeof obj.beardStyle === 'string' && BEARD_STYLE_SET.has(obj.beardStyle) ? obj.beardStyle : 'stubble';
  return {
    outfit,
    sunglasses: Boolean(obj.sunglasses),
    hairStyle,
    hairColor,
    beardStyle,
  };
}

function sanitizeRoom(raw: unknown): string {
  if (typeof raw !== 'string') return 'solaris-1';
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20);
  return cleaned.length > 0 ? cleaned : 'solaris-1';
}

async function startServer(): Promise<void> {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const pathname = (req.url || '').split('?')[0];
    if (pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
      return;
    }
    const protoHeader = String(req.headers['sec-websocket-protocol'] || '');
    const isViteWs = protoHeader
      .split(',')
      .some((p) => p.trim() === 'vite-hmr' || p.trim() === 'vite-ping');
    if (process.env.NODE_ENV !== 'production' && isViteWs) {
      return;
    }
    socket.destroy();
  });

  const rooms = new Map<string, Map<string, ServerPlayer>>();
  const socketsById = new Map<string, WebSocket>();
  const socketState = new WeakMap<WebSocket, ClientSocketState>();
  const roomWeather = new Map<string, WeatherKind>();
  let nextPlayerNum = 1;

  function getRoomMap(room: string): Map<string, ServerPlayer> {
    let map = rooms.get(room);
    if (!map) {
      map = new Map<string, ServerPlayer>();
      rooms.set(room, map);
    }
    return map;
  }

  function sendJson(ws: WebSocket, payload: unknown): void {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  function broadcastRoom(room: string, payload: unknown, excludeId?: string): void {
    const map = rooms.get(room);
    if (!map) return;
    const raw = JSON.stringify(payload);
    for (const pid of map.keys()) {
      if (excludeId && pid === excludeId) continue;
      const peer = socketsById.get(pid);
      if (peer && peer.readyState === peer.OPEN) {
        peer.send(raw);
      }
    }
  }

  function removePlayerFromRoom(ws: WebSocket): void {
    const st = socketState.get(ws);
    if (!st || !st.playerId) return;
    const pid = st.playerId;
    const room = st.room;
    const map = rooms.get(room);
    if (map) {
      map.delete(pid);
      if (map.size === 0) {
        rooms.delete(room);
      } else {
        broadcastRoom(room, { type: 'player:left', playerId: pid });
      }
    }
    socketsById.delete(pid);
    st.playerId = null;
  }

  wss.on('connection', (ws) => {
    socketState.set(ws, { playerId: null, room: 'solaris-1', isAlive: true });

    ws.on('pong', () => {
      const st = socketState.get(ws);
      if (st) st.isAlive = true;
    });

    ws.on('message', (rawBuf) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(rawBuf.toString()) as Record<string, unknown>;
      } catch {
        return;
      }

      const st = socketState.get(ws);
      if (!st) return;

      if (msg.type === 'join') {
        if (st.playerId) {
          removePlayerFromRoom(ws);
        }
        const room = sanitizeRoom(msg.room);
        const name = sanitizeName(msg.name);
        const playerId = `p_${nextPlayerNum++}`;
        const color = PLAYER_COLORS[(nextPlayerNum - 2) % PLAYER_COLORS.length];

        const player: ServerPlayer = {
          id: playerId,
          room,
          name,
          color,
          x: clampNum(msg.x, -240, 240, -4),
          y: clampNum(msg.y, -5, 120, 0.08),
          z: clampNum(msg.z, -260, 220, -4),
          rotY: clampNum(msg.rotY, -100, 100, 0),
          speed: 0,
          weapon: typeof msg.weapon === 'string' && WEAPON_IDS.has(msg.weapon) ? msg.weapon : 'pistol',
          aiming: Boolean(msg.aiming),
          inVehicle: Boolean(msg.inVehicle),
          vehicleType:
            typeof msg.vehicleType === 'string' && VEHICLE_TYPES.has(msg.vehicleType)
              ? msg.vehicleType
              : 'sports',
          vehicleColor: typeof msg.vehicleColor === 'number' ? msg.vehicleColor : 0xff3366,
          vehicleSpeed: 0,
          health: clampNum(msg.health, 0, 100, 100),
          wantedStars: Math.round(clampNum(msg.wantedStars, 0, 5, 0)),
          appearance: sanitizeAppearance(msg.appearance),
        };

        st.playerId = playerId;
        st.room = room;
        socketsById.set(playerId, ws);

        const roomMap = getRoomMap(room);
        const existingPlayers = Array.from(roomMap.values());
        roomMap.set(playerId, player);
        if (!roomWeather.has(room)) {
          roomWeather.set(room, 'sunny');
        }

        sendJson(ws, {
          type: 'welcome',
          playerId,
          room,
          color,
          weather: roomWeather.get(room) ?? 'sunny',
          players: existingPlayers,
        });

        broadcastRoom(room, { type: 'player:joined', player }, playerId);
        return;
      }

      if (!st.playerId) return;
      const roomMap = rooms.get(st.room);
      const current = roomMap?.get(st.playerId);
      if (!current) return;

      if (msg.type === 'state') {
        current.x = clampNum(msg.x, -240, 240, current.x);
        current.y = clampNum(msg.y, -5, 120, current.y);
        current.z = clampNum(msg.z, -260, 220, current.z);
        current.rotY = clampNum(msg.rotY, -100, 100, current.rotY);
        current.speed = clampNum(msg.speed, -20, 60, 0);
        if (typeof msg.weapon === 'string' && WEAPON_IDS.has(msg.weapon)) {
          current.weapon = msg.weapon;
        }
        current.aiming = Boolean(msg.aiming);
        current.inVehicle = Boolean(msg.inVehicle);
        if (typeof msg.vehicleType === 'string' && VEHICLE_TYPES.has(msg.vehicleType)) {
          current.vehicleType = msg.vehicleType;
        }
        if (typeof msg.vehicleColor === 'number' && Number.isFinite(msg.vehicleColor)) {
          current.vehicleColor = msg.vehicleColor;
        }
        current.vehicleSpeed = clampNum(msg.vehicleSpeed, -20, 60, 0);
        current.health = clampNum(msg.health, 0, 100, current.health);
        current.wantedStars = Math.round(clampNum(msg.wantedStars, 0, 5, current.wantedStars));
        if (typeof msg.name === 'string') {
          current.name = sanitizeName(msg.name);
        }
        const nextApp = sanitizeAppearance(msg.appearance);
        if (nextApp) {
          current.appearance = nextApp;
        }

        broadcastRoom(st.room, { type: 'player:state', player: current }, st.playerId);
      } else if (msg.type === 'shot') {
        broadcastRoom(
          st.room,
          {
            type: 'player:shot',
            playerId: st.playerId,
            ox: clampNum(msg.ox, -250, 250, current.x),
            oy: clampNum(msg.oy, -5, 130, current.y + 1.4),
            oz: clampNum(msg.oz, -270, 230, current.z),
            hx: clampNum(msg.hx, -260, 260, current.x),
            hy: clampNum(msg.hy, -5, 130, current.y + 1.4),
            hz: clampNum(msg.hz, -270, 230, current.z),
            color: typeof msg.color === 'number' ? msg.color : 0xffd166,
            weapon: typeof msg.weapon === 'string' ? msg.weapon : 'pistol',
          },
          st.playerId,
        );
      } else if (msg.type === 'hit') {
        const targetId = typeof msg.targetId === 'string' ? msg.targetId : '';
        if (!targetId || targetId === st.playerId) return;
        const targetSocket = socketsById.get(targetId);
        const targetPlayer = roomMap?.get(targetId);
        if (targetSocket && targetPlayer) {
          const dmg = clampNum(msg.damage, 1, 60, 18);
          sendJson(targetSocket, {
            type: 'player:damaged',
            fromId: st.playerId,
            fromName: current.name,
            damage: dmg,
          });
        }
      } else if (msg.type === 'chat') {
        if (typeof msg.text !== 'string') return;
        const text = msg.text.trim().slice(0, 120);
        if (!text) return;
        broadcastRoom(st.room, {
          type: 'chat:msg',
          id: `${st.playerId}_${Date.now()}`,
          playerId: st.playerId,
          name: current.name,
          color: current.color,
          text,
          ts: Date.now(),
        });
      } else if (msg.type === 'leave') {
        removePlayerFromRoom(ws);
      }
    });

    ws.on('close', () => {
      removePlayerFromRoom(ws);
    });

    ws.on('error', () => {
      removePlayerFromRoom(ws);
    });
  });

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      const st = socketState.get(ws);
      if (!st) continue;
      if (!st.isAlive) {
        removePlayerFromRoom(ws);
        ws.terminate();
        continue;
      }
      st.isAlive = false;
      ws.ping();
    }
  }, 15000);

  wss.on('close', () => clearInterval(heartbeat));

  app.get('/api/health', (_req, res) => {
    let totalPlayers = 0;
    for (const map of rooms.values()) {
      totalPlayers += map.size;
    }
    res.json({ ok: true, rooms: rooms.size, players: totalPlayers });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : true,
        ws: { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, '0.0.0.0', () => {
    console.log(`Solaris Bay 3D server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
