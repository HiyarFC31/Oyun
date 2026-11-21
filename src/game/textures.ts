import * as THREE from 'three';

export interface FacadeTextureSet {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
}

export interface CityTextures {
  asphalt: THREE.CanvasTexture;
  asphaltRoughness: THREE.CanvasTexture;
  asphaltNormal: THREE.CanvasTexture;
  intersection: THREE.CanvasTexture;
  sidewalk: THREE.CanvasTexture;
  sidewalkNormal: THREE.CanvasTexture;
  sand: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  lampGlow: THREE.CanvasTexture;
  headlightGlow: THREE.CanvasTexture;
  waterNormal: THREE.CanvasTexture;
  facadeNormal: THREE.CanvasTexture;
  facadeRoughness: THREE.CanvasTexture;
  terrainMap: THREE.CanvasTexture;
  terrainNormal: THREE.CanvasTexture;
  weaponShopSign: THREE.CanvasTexture;
  clothingShopSign: THREE.CanvasTexture;
  barberShopSign: THREE.CanvasTexture;
  facades: FacadeTextureSet[];
  charFaces: THREE.CanvasTexture[];
  denim: THREE.CanvasTexture;
  leather: THREE.CanvasTexture;
  fabric: THREE.CanvasTexture;
  tireTread: THREE.CanvasTexture;
  licensePlate: THREE.CanvasTexture;
  bulletHoleMetal: THREE.CanvasTexture;
  bulletHoleGlass: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  maxAniso: number,
  isColor: boolean,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

export function createCityTextures(maxAnisotropy: number): CityTextures {
  const created: THREE.Texture[] = [];

  // 1. Asphalt Road Tile (512x512 dark aggregate, realistic tire tracks, crisp markings & drainage)
  const [roadCanvas, rCtx] = makeCanvas(512, 512);
  rCtx.fillStyle = '#1e2029';
  rCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 16000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 22 + Math.floor(Math.random() * 28);
    rCtx.fillStyle = `rgb(${v},${v + 2},${v + 7})`;
    rCtx.fillRect(x, y, 1.6, 1.6);
  }
  // Smooth polished wheel ruts + faint oil center strip
  const rutL = rCtx.createLinearGradient(82, 0, 174, 0);
  rutL.addColorStop(0, 'rgba(8,9,13,0)');
  rutL.addColorStop(0.5, 'rgba(8,9,13,0.34)');
  rutL.addColorStop(1, 'rgba(8,9,13,0)');
  rCtx.fillStyle = rutL;
  rCtx.fillRect(82, 0, 92, 512);

  const rutR = rCtx.createLinearGradient(338, 0, 430, 0);
  rutR.addColorStop(0, 'rgba(8,9,13,0)');
  rutR.addColorStop(0.5, 'rgba(8,9,13,0.34)');
  rutR.addColorStop(1, 'rgba(8,9,13,0)');
  rCtx.fillStyle = rutR;
  rCtx.fillRect(338, 0, 92, 512);

  // Tar-sealed asphalt cracks & manhole cover
  rCtx.strokeStyle = 'rgba(10, 11, 16, 0.65)';
  rCtx.lineWidth = 1.6;
  rCtx.beginPath();
  rCtx.moveTo(136, 72);
  rCtx.lineTo(164, 184);
  rCtx.lineTo(150, 296);
  rCtx.lineTo(172, 360);
  rCtx.stroke();
  rCtx.beginPath();
  rCtx.moveTo(356, 130);
  rCtx.lineTo(342, 224);
  rCtx.stroke();

  rCtx.fillStyle = '#171920';
  rCtx.beginPath();
  rCtx.arc(384, 340, 14, 0, Math.PI * 2);
  rCtx.fill();
  rCtx.strokeStyle = '#3b4150';
  rCtx.lineWidth = 2.2;
  rCtx.stroke();

  // Crisp edge lines & slotted storm grates
  rCtx.fillStyle = '#e5e9f2';
  rCtx.fillRect(14, 0, 7, 512);
  rCtx.fillRect(491, 0, 7, 512);
  rCtx.fillStyle = '#111319';
  for (let gy = 48; gy < 512; gy += 192) {
    rCtx.fillRect(26, gy, 14, 28);
    rCtx.fillRect(472, gy, 14, 28);
    rCtx.fillStyle = '#2d323e';
    for (let s = 4; s < 26; s += 5) {
      rCtx.fillRect(28, gy + s, 10, 2);
      rCtx.fillRect(474, gy + s, 10, 2);
    }
    rCtx.fillStyle = '#111319';
  }

  // Double dashed amber center line
  rCtx.fillStyle = '#f6bd41';
  for (let y = 18; y < 512; y += 64) {
    rCtx.fillRect(247, y, 6, 36);
    rCtx.fillRect(259, y, 6, 36);
  }
  const asphalt = finalizeTexture(roadCanvas, maxAnisotropy, true);
  created.push(asphalt);

  // 1b. Asphalt Roughness Map (512x512 linear: tire groove sheen & subtle damp reflection pools)
  const [roughCanvas, roughCtx] = makeCanvas(512, 512);
  roughCtx.fillStyle = 'rgb(200,200,200)';
  roughCtx.fillRect(0, 0, 512, 512);
  roughCtx.fillStyle = 'rgba(120,120,120,0.48)';
  roughCtx.fillRect(92, 0, 72, 512);
  roughCtx.fillRect(348, 0, 72, 512);
  for (let i = 0; i < 42; i++) {
    const px = Math.random() * 512;
    const py = Math.random() * 512;
    const rad = 24 + Math.random() * 54;
    const rg = roughCtx.createRadialGradient(px, py, 4, px, py, rad);
    rg.addColorStop(0, 'rgba(42,42,42,0.82)');
    rg.addColorStop(0.6, 'rgba(110,110,110,0.42)');
    rg.addColorStop(1, 'rgba(200,200,200,0)');
    roughCtx.fillStyle = rg;
    roughCtx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
  }
  const asphaltRoughness = finalizeTexture(roughCanvas, maxAnisotropy, false);
  created.push(asphaltRoughness);

  // 1c. Asphalt Normal Map (512x512 crisp asphalt aggregate micro-relief)
  const [normCanvas, normCtx] = makeCanvas(512, 512);
  const imgData = normCtx.createImageData(512, 512);
  for (let i = 0; i < 512 * 512; i++) {
    const nx = 128 + (Math.random() - 0.5) * 44;
    const ny = 128 + (Math.random() - 0.5) * 44;
    imgData.data[i * 4] = nx;
    imgData.data[i * 4 + 1] = ny;
    imgData.data[i * 4 + 2] = 244;
    imgData.data[i * 4 + 3] = 255;
  }
  normCtx.putImageData(imgData, 0, 0);
  const asphaltNormal = finalizeTexture(normCanvas, maxAnisotropy, false, 3, 3);
  created.push(asphaltNormal);

  // 2. Intersection Tile with Crisp Crosswalks & Stop Bars
  const [intCanvas, iCtx] = makeCanvas(512, 512);
  iCtx.fillStyle = '#1c1e26';
  iCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 11000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 22 + Math.floor(Math.random() * 24);
    iCtx.fillStyle = `rgb(${v},${v + 2},${v + 7})`;
    iCtx.fillRect(x, y, 1.8, 1.8);
  }
  iCtx.fillStyle = '#edf0f5';
  for (let k = 48; k < 464; k += 44) {
    iCtx.fillRect(k, 16, 24, 52);
    iCtx.fillRect(k, 444, 24, 52);
    iCtx.fillRect(16, k, 52, 24);
    iCtx.fillRect(444, k, 52, 24);
  }
  const intersection = finalizeTexture(intCanvas, maxAnisotropy, true);
  created.push(intersection);

  // 3. Architectural Stone Sidewalk Paving Tile (512x512 subtle per-slab variation & bevels)
  const [swCanvas, sCtx] = makeCanvas(512, 512);
  sCtx.fillStyle = '#999087';
  sCtx.fillRect(0, 0, 512, 512);
  const tileStep = 128;
  for (let ty = 0; ty < 512; ty += tileStep) {
    for (let tx = 0; tx < 512; tx += tileStep) {
      const tint = Math.floor((Math.random() - 0.5) * 16);
      sCtx.fillStyle = `rgb(${152 + tint},${144 + tint},${135 + tint})`;
      sCtx.fillRect(tx + 2, ty + 2, tileStep - 4, tileStep - 4);
      sCtx.fillStyle = 'rgba(255,248,238,0.12)';
      sCtx.fillRect(tx + 3, ty + 3, tileStep - 6, 3);
      sCtx.fillRect(tx + 3, ty + 3, 3, tileStep - 6);
    }
  }
  for (let i = 0; i < 9500; i++) {
    const v = 128 + Math.floor(Math.random() * 44);
    sCtx.fillStyle = `rgba(${v},${v - 5},${v - 10},0.35)`;
    sCtx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  sCtx.strokeStyle = 'rgba(42, 38, 36, 0.48)';
  sCtx.lineWidth = 4;
  for (let p = 0; p <= 512; p += tileStep) {
    sCtx.beginPath();
    sCtx.moveTo(p, 0);
    sCtx.lineTo(p, 512);
    sCtx.stroke();
    sCtx.beginPath();
    sCtx.moveTo(0, p);
    sCtx.lineTo(512, p);
    sCtx.stroke();
  }
  const sidewalk = finalizeTexture(swCanvas, maxAnisotropy, true, 6, 6);
  created.push(sidewalk);

  // 3b. Sidewalk Paver Normal Map (512x512 chamfered joint bevels + stone grain)
  const [swnCanvas, swnCtx] = makeCanvas(512, 512);
  swnCtx.fillStyle = 'rgb(128,128,255)';
  swnCtx.fillRect(0, 0, 512, 512);
  for (let p = 0; p < 512; p += 128) {
    swnCtx.fillStyle = 'rgb(88,128,236)';
    swnCtx.fillRect(p, 0, 4, 512);
    swnCtx.fillStyle = 'rgb(168,128,236)';
    swnCtx.fillRect(p + 4, 0, 4, 512);
    swnCtx.fillStyle = 'rgb(128,88,236)';
    swnCtx.fillRect(0, p, 512, 4);
    swnCtx.fillStyle = 'rgb(128,168,236)';
    swnCtx.fillRect(0, p + 4, 512, 4);
  }
  const sidewalkNormal = finalizeTexture(swnCanvas, maxAnisotropy, false, 6, 6);
  created.push(sidewalkNormal);

  // 4. Beach Sand Texture (512x512 ripple wind-sculpted coastal sand)
  const [sandCanvas, sandCtx] = makeCanvas(512, 512);
  sandCtx.fillStyle = '#d9be92';
  sandCtx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 6) {
    const wave = Math.sin((y / 512) * Math.PI * 16) * 0.5 + 0.5;
    sandCtx.fillStyle = `rgba(176, 144, 98, ${0.06 + wave * 0.08})`;
    sandCtx.fillRect(0, y, 512, 3);
  }
  for (let i = 0; i < 14000; i++) {
    const r = 194 + Math.floor(Math.random() * 42);
    const g = 166 + Math.floor(Math.random() * 38);
    const b = 122 + Math.floor(Math.random() * 32);
    sandCtx.fillStyle = `rgb(${r},${g},${b})`;
    sandCtx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  const sand = finalizeTexture(sandCanvas, maxAnisotropy, true, 8, 16);
  created.push(sand);

  // 5. Multi-Octave Water Ripple Normal Map (512x512 linear)
  const [wNormCanvas, wnCtx] = makeCanvas(512, 512);
  const wData = wnCtx.createImageData(512, 512);
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const u = (x / 512) * Math.PI * 2;
      const v = (y / 512) * Math.PI * 2;
      const gx =
        Math.cos(u * 4 + Math.sin(v * 3)) * 0.42 +
        Math.cos(u * 7 - v * 5) * 0.28 +
        Math.cos(u * 13 + v * 9) * 0.16 +
        Math.cos(u * 23 - v * 17) * 0.09;
      const gy =
        Math.sin(v * 5 + Math.cos(u * 3)) * 0.42 +
        Math.sin(v * 8 + u * 4) * 0.28 +
        Math.sin(v * 14 - u * 10) * 0.16 +
        Math.sin(v * 25 + u * 19) * 0.09;
      const idx = (y * 512 + x) * 4;
      wData.data[idx] = Math.round(128 + gx * 56);
      wData.data[idx + 1] = Math.round(128 + gy * 56);
      wData.data[idx + 2] = 242;
      wData.data[idx + 3] = 255;
    }
  }
  wnCtx.putImageData(wData, 0, 0);
  const waterNormal = finalizeTexture(wNormCanvas, maxAnisotropy, false, 16, 28);
  created.push(waterNormal);

  // 6. Contact Shadow Radial Texture
  const [shCanvas, shCtx] = makeCanvas(128, 128);
  const grad = shCtx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(6, 5, 12, 0.82)');
  grad.addColorStop(0.55, 'rgba(6, 5, 12, 0.38)');
  grad.addColorStop(1, 'rgba(6, 5, 12, 0)');
  shCtx.fillStyle = grad;
  shCtx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(shCanvas);
  contactShadow.colorSpace = THREE.SRGBColorSpace;
  contactShadow.needsUpdate = true;
  created.push(contactShadow);

  // 7. Streetlamp Warm Ground Glow Texture
  const [lgCanvas, lgCtx] = makeCanvas(128, 128);
  const lgGrad = lgCtx.createRadialGradient(64, 64, 2, 64, 64, 62);
  lgGrad.addColorStop(0, 'rgba(255, 224, 150, 0.65)');
  lgGrad.addColorStop(0.35, 'rgba(255, 185, 95, 0.28)');
  lgGrad.addColorStop(0.75, 'rgba(255, 150, 65, 0.08)');
  lgGrad.addColorStop(1, 'rgba(255, 140, 60, 0)');
  lgCtx.fillStyle = lgGrad;
  lgCtx.fillRect(0, 0, 128, 128);
  const lampGlow = new THREE.CanvasTexture(lgCanvas);
  lampGlow.colorSpace = THREE.SRGBColorSpace;
  lampGlow.needsUpdate = true;
  created.push(lampGlow);

  // 8. Vehicle Headlight Cone Ground Glow Texture
  const [hlCanvas, hlCtx] = makeCanvas(128, 256);
  const hlGrad = hlCtx.createLinearGradient(0, 256, 0, 0);
  hlGrad.addColorStop(0, 'rgba(255, 244, 208, 0.65)');
  hlGrad.addColorStop(0.55, 'rgba(255, 230, 175, 0.24)');
  hlGrad.addColorStop(1, 'rgba(255, 220, 150, 0)');
  hlCtx.fillStyle = hlGrad;
  hlCtx.beginPath();
  hlCtx.moveTo(46, 256);
  hlCtx.lineTo(82, 256);
  hlCtx.lineTo(124, 0);
  hlCtx.lineTo(4, 0);
  hlCtx.closePath();
  hlCtx.fill();
  const headlightGlow = new THREE.CanvasTexture(hlCanvas);
  headlightGlow.colorSpace = THREE.SRGBColorSpace;
  headlightGlow.needsUpdate = true;
  created.push(headlightGlow);

  // 9. Building Facades (Albedo + Paired Emissive Map for Glowing Architectural Interiors & Storefronts)
  const facadeConfigs = [
    { wall: '#e8d7c3', trim: '#f4845f', winLit: '#ffd89c', winDark: '#2a3144', neon: '#ff4d8d' },
    { wall: '#2e3950', trim: '#70d6ff', winLit: '#ffe5a3', winDark: '#171e2d', neon: '#00f5d4' },
    { wall: '#d8b4a0', trim: '#e07a5f', winLit: '#fff0b3', winDark: '#302a3f', neon: '#ff9f1c' },
    { wall: '#424763', trim: '#c9ada7', winLit: '#9bf6ff', winDark: '#1e1f36', neon: '#ff5978' },
  ];

  const facades: FacadeTextureSet[] = facadeConfigs.map((cfg) => {
    const [fc, ctx] = makeCanvas(512, 512);
    const [ec, eCtx] = makeCanvas(512, 512);

    ctx.fillStyle = cfg.wall;
    ctx.fillRect(0, 0, 512, 512);
    eCtx.fillStyle = '#000000';
    eCtx.fillRect(0, 0, 512, 512);

    // Fine architectural stone/concrete micro-texture
    for (let i = 0; i < 5500; i++) {
      const gx = Math.random() * 512;
      const gy = Math.random() * 448;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.055)';
      ctx.fillRect(gx, gy, 2, 2);
    }

    // Architectural pilasters, cornice ledges & brushed metal spandrel bands
    for (let x = 0; x < 512; x += 128) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(x, 0, 8, 448);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x + 8, 0, 2, 448);
    }
    for (let y = 0; y < 512; y += 64) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, y, 512, 5);
      ctx.fillStyle = cfg.trim;
      ctx.fillRect(0, y + 5, 512, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(0, y + 9, 512, 1.5);
    }

    // Window grid (8 cols x 7 upper floors) with depth-shaded room interiors & specular reflections
    const cols = 8;
    const rows = 7;
    const padX = 18;
    const padY = 12;
    const cellW = 512 / cols;
    const cellH = 448 / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = c * cellW + padX * 0.6;
        const wy = r * cellH + padY;
        const ww = cellW - padX * 1.2;
        const wh = cellH - padY * 1.8;

        ctx.fillStyle = 'rgba(12, 14, 24, 0.8)';
        ctx.fillRect(wx - 2.5, wy - 2.5, ww + 5, wh + 5);

        const isLit = Math.random() > 0.38;
        if (isLit) {
          const wGrad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
          wGrad.addColorStop(0, cfg.winLit);
          wGrad.addColorStop(0.55, '#eb9f58');
          wGrad.addColorStop(1, '#78442f');
          ctx.fillStyle = wGrad;
        } else {
          const dGrad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
          dGrad.addColorStop(0, '#4d648d');
          dGrad.addColorStop(0.45, '#2b3954');
          dGrad.addColorStop(1, cfg.winDark);
          ctx.fillStyle = dGrad;
        }
        ctx.fillRect(wx, wy, ww, wh);

        // Window mullion, interior sill & horizontal blinds
        ctx.fillStyle = 'rgba(18, 20, 30, 0.5)';
        ctx.fillRect(wx, wy + wh * 0.48, ww, 2);
        ctx.fillRect(wx + ww * 0.49, wy, 1.5, wh);
        if (isLit && Math.random() > 0.45) {
          ctx.fillStyle = 'rgba(20, 16, 26, 0.34)';
          ctx.fillRect(wx, wy, ww, wh * 0.32);
        }

        // Diagonal sunset sky glare streak across glass
        ctx.fillStyle = 'rgba(255, 224, 195, 0.24)';
        ctx.beginPath();
        ctx.moveTo(wx + 2, wy + 2);
        ctx.lineTo(wx + ww * 0.48, wy + 2);
        ctx.lineTo(wx + ww * 0.22, wy + wh - 2);
        ctx.lineTo(wx + 2, wy + wh - 2);
        ctx.closePath();
        ctx.fill();

        if (isLit) {
          const eGrad = eCtx.createLinearGradient(wx, wy, wx, wy + wh);
          eGrad.addColorStop(0, cfg.winLit);
          eGrad.addColorStop(1, '#8c4c22');
          eCtx.fillStyle = eGrad;
          eCtx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
        }
      }
    }

    // Ground floor storefront & glowing neon fascia
    ctx.fillStyle = '#141722';
    ctx.fillRect(0, 448, 512, 64);
    ctx.fillStyle = cfg.neon;
    ctx.fillRect(14, 446, 484, 7);
    const shopGrad = ctx.createLinearGradient(0, 464, 0, 500);
    shopGrad.addColorStop(0, '#ffe3a3');
    shopGrad.addColorStop(1, '#cf7d3e');
    ctx.fillStyle = shopGrad;
    ctx.fillRect(36, 464, 180, 36);
    ctx.fillRect(296, 464, 180, 36);

    eCtx.fillStyle = cfg.neon;
    eCtx.fillRect(14, 446, 484, 7);
    eCtx.fillStyle = '#ffcf70';
    eCtx.fillRect(36, 464, 180, 36);
    eCtx.fillRect(296, 464, 180, 36);

    const map = finalizeTexture(fc, maxAnisotropy, true);
    const emissiveMap = finalizeTexture(ec, maxAnisotropy, true);
    created.push(map, emissiveMap);
    return { map, emissiveMap };
  });

  // 10. Architectural Facade Relief Normal Map (recessed window frames & spandrel ledges)
  const [fnCanvas, fnCtx] = makeCanvas(512, 512);
  fnCtx.fillStyle = 'rgb(128,128,255)';
  fnCtx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) {
    fnCtx.fillStyle = 'rgb(128,185,238)';
    fnCtx.fillRect(0, y, 512, 5);
    fnCtx.fillStyle = 'rgb(128,76,238)';
    fnCtx.fillRect(0, y + 6, 512, 4);
  }
  const fCellW = 512 / 8;
  const fCellH = 448 / 7;
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 8; c++) {
      const wx = c * fCellW + 11;
      const wy = r * fCellH + 12;
      const ww = fCellW - 22;
      const wh = fCellH - 22;
      fnCtx.strokeStyle = 'rgb(88,88,242)';
      fnCtx.lineWidth = 3.5;
      fnCtx.strokeRect(wx, wy, ww, wh);
    }
  }
  const facadeNormal = finalizeTexture(fnCanvas, maxAnisotropy, false);
  created.push(facadeNormal);

  // 10b. Architectural Facade Roughness Map (matte walls vs mirror-like architectural glazing)
  const [frCanvas, frCtx] = makeCanvas(512, 512);
  frCtx.fillStyle = 'rgb(232,232,232)';
  frCtx.fillRect(0, 0, 512, 512);
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 8; c++) {
      const wx = c * fCellW + 11;
      const wy = r * fCellH + 12;
      const ww = fCellW - 22;
      const wh = fCellH - 22;
      frCtx.fillStyle = 'rgb(26,26,26)';
      frCtx.fillRect(wx, wy, ww, wh);
    }
  }
  frCtx.fillStyle = 'rgb(32,32,32)';
  frCtx.fillRect(36, 464, 180, 36);
  frCtx.fillRect(296, 464, 180, 36);
  const facadeRoughness = finalizeTexture(frCanvas, maxAnisotropy, false);
  created.push(facadeRoughness);

  // 10c. Mountain Rock & Soil Detail Albedo + Normal Maps (512x512 crisp mineral & rock strata)
  const [tmCanvas, tmCtx] = makeCanvas(512, 512);
  tmCtx.fillStyle = '#dcdad5';
  tmCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 18000; i++) {
    const shade = 172 + Math.floor(Math.random() * 76);
    tmCtx.fillStyle = `rgb(${shade},${shade - 2},${shade - 5})`;
    tmCtx.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 2, 2);
  }
  tmCtx.strokeStyle = 'rgba(85, 78, 72, 0.28)';
  tmCtx.lineWidth = 1.8;
  for (let s = 0; s < 42; s++) {
    const y0 = Math.random() * 512;
    tmCtx.beginPath();
    tmCtx.moveTo(0, y0);
    tmCtx.lineTo(512, y0 + (Math.random() - 0.5) * 48);
    tmCtx.stroke();
  }
  const terrainMap = finalizeTexture(tmCanvas, maxAnisotropy, true, 24, 24);
  created.push(terrainMap);

  const [tnCanvas, tnCtx] = makeCanvas(256, 256);
  const tnImg = tnCtx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const u = (x / 256) * Math.PI * 2;
      const v = (y / 256) * Math.PI * 2;
      const gx = Math.cos(u * 5 + Math.sin(v * 4)) * 0.55 + (Math.random() - 0.5) * 0.45;
      const gy = Math.sin(v * 6 + Math.cos(u * 3)) * 0.55 + (Math.random() - 0.5) * 0.45;
      const idx = (y * 256 + x) * 4;
      tnImg.data[idx] = Math.round(128 + gx * 42);
      tnImg.data[idx + 1] = Math.round(128 + gy * 42);
      tnImg.data[idx + 2] = 240;
      tnImg.data[idx + 3] = 255;
    }
  }
  tnCtx.putImageData(tnImg, 0, 0);
  const terrainNormal = finalizeTexture(tnCanvas, maxAnisotropy, false, 24, 24);
  created.push(terrainNormal);

  // 11. Weapon Shop Storefront Neon Sign ("SOLARIS ARMS // SİLAHÇI")
  const [wsCanvas, wsCtx] = makeCanvas(512, 128);
  wsCtx.fillStyle = '#140c16';
  wsCtx.fillRect(0, 0, 512, 128);
  wsCtx.strokeStyle = '#ff4d6d';
  wsCtx.lineWidth = 6;
  wsCtx.strokeRect(6, 6, 500, 116);
  wsCtx.fillStyle = '#ffbe0b';
  wsCtx.font = 'bold 42px sans-serif';
  wsCtx.textAlign = 'center';
  wsCtx.fillText('SOLARIS ARMS', 256, 62);
  wsCtx.fillStyle = '#ff6b6b';
  wsCtx.font = 'bold 26px sans-serif';
  wsCtx.fillText('SİLAH & CEPHANE MAĞAZASI', 256, 102);
  const weaponShopSign = finalizeTexture(wsCanvas, maxAnisotropy, true);
  created.push(weaponShopSign);

  // 11b. Clothing Store Storefront Neon Sign ("SOLARIS STYLE // KIYAFET & MODA")
  const [csCanvas, csCtx] = makeCanvas(512, 128);
  csCtx.fillStyle = '#190b1e';
  csCtx.fillRect(0, 0, 512, 128);
  csCtx.strokeStyle = '#ff70a6';
  csCtx.lineWidth = 6;
  csCtx.strokeRect(6, 6, 500, 116);
  csCtx.fillStyle = '#ffd166';
  csCtx.font = 'bold 40px sans-serif';
  csCtx.textAlign = 'center';
  csCtx.fillText('SOLARIS STYLE', 256, 62);
  csCtx.fillStyle = '#ff85b3';
  csCtx.font = 'bold 25px sans-serif';
  csCtx.fillText('KIYAFET & MODA BUTİĞİ', 256, 102);
  const clothingShopSign = finalizeTexture(csCanvas, maxAnisotropy, true);
  created.push(clothingShopSign);

  // 11c. Barber Shop Storefront Neon Sign ("SOLARIS CUTS // BERBER & TIRAŞ")
  const [bsCanvas, bsCtx] = makeCanvas(512, 128);
  bsCtx.fillStyle = '#0c1626';
  bsCtx.fillRect(0, 0, 512, 128);
  bsCtx.strokeStyle = '#38bdf8';
  bsCtx.lineWidth = 6;
  bsCtx.strokeRect(6, 6, 500, 116);
  bsCtx.fillStyle = '#f8fafc';
  bsCtx.font = 'bold 40px sans-serif';
  bsCtx.textAlign = 'center';
  bsCtx.fillText('SOLARIS CUTS', 256, 62);
  bsCtx.fillStyle = '#38bdf8';
  bsCtx.font = 'bold 25px sans-serif';
  bsCtx.fillText('BERBER & TIRAŞ SALONU', 256, 102);
  const barberShopSign = finalizeTexture(bsCanvas, maxAnisotropy, true);
  created.push(barberShopSign);

  // 12. High-Resolution Procedural Character Face Textures (512x512, 4 skin tones, anatomical shading & micro-detail)
  const facePalettes = [
    { skin: '#dfa782', highlight: '#f2c8aa', shade: '#b06e4a', warm: '#c96f5b', eye: '#3b648f', hair: '#1a1412', lip: '#9e5950', stubble: true },
    { skin: '#cf926a', highlight: '#e5b08b', shade: '#995c3a', warm: '#ba6350', eye: '#4a3525', hair: '#2a1d17', lip: '#8f5048', stubble: true },
    { skin: '#9a6544', highlight: '#b8805d', shade: '#6b3e24', warm: '#8a4a38', eye: '#2b1d14', hair: '#151316', lip: '#72413a', stubble: false },
    { skin: '#e8baa0', highlight: '#f8d8c4', shade: '#bd8568', warm: '#d17b68', eye: '#4c7557', hair: '#4a3122', lip: '#ab655e', stubble: false },
  ];
  const charFaces = facePalettes.map((fp) => {
    const [fc, fCtx] = makeCanvas(512, 512);
    fCtx.fillStyle = fp.skin;
    fCtx.fillRect(0, 0, 512, 512);

    // Soft natural skin pore & melanin micro-variation across facial zone
    for (let i = 0; i < 2400; i++) {
      const px = 88 + Math.random() * 336;
      const py = 76 + Math.random() * 370;
      fCtx.fillStyle = i % 2 === 0 ? 'rgba(255, 236, 220, 0.045)' : 'rgba(65, 32, 20, 0.045)';
      fCtx.fillRect(px, py, 1.5, 1.5);
    }

    // Soft hairline fade around top cranium & nape so 3D hair blends organically
    const hairlineGrad = fCtx.createLinearGradient(0, 0, 0, 128);
    hairlineGrad.addColorStop(0, fp.hair);
    hairlineGrad.addColorStop(0.55, fp.hair);
    hairlineGrad.addColorStop(1, 'rgba(0,0,0,0)');
    fCtx.globalAlpha = 0.24;
    fCtx.fillStyle = hairlineGrad;
    fCtx.fillRect(0, 0, 512, 128);
    fCtx.globalAlpha = 1;

    // Forehead highlight & brow-bone warmth (u=0.5 / x=256 is +Z front)
    const foreGrad = fCtx.createLinearGradient(0, 74, 0, 212);
    foreGrad.addColorStop(0, 'rgba(60, 32, 22, 0.16)');
    foreGrad.addColorStop(0.52, 'rgba(255, 236, 218, 0.16)');
    foreGrad.addColorStop(1, 'rgba(255, 236, 218, 0)');
    fCtx.fillStyle = foreGrad;
    fCtx.fillRect(96, 74, 320, 138);

    // Subtle glabella & forehead expression shading
    fCtx.strokeStyle = fp.shade;
    fCtx.globalAlpha = 0.14;
    fCtx.lineWidth = 1.4;
    [142, 156].forEach((fy) => {
      fCtx.beginPath();
      fCtx.moveTo(206, fy);
      fCtx.quadraticCurveTo(256, fy - 4, 306, fy);
      fCtx.stroke();
    });
    fCtx.globalAlpha = 1;

    // Cheekbone highlights & warm subsurface scatter blush
    [168, 344].forEach((cx) => {
      const cheek = fCtx.createRadialGradient(cx, 286, 6, cx, 286, 72);
      cheek.addColorStop(0, fp.warm);
      cheek.addColorStop(0.55, 'rgba(190, 92, 74, 0.09)');
      cheek.addColorStop(1, 'rgba(190, 92, 74, 0)');
      fCtx.globalAlpha = 0.24;
      fCtx.fillStyle = cheek;
      fCtx.fillRect(cx - 74, 212, 148, 148);
      fCtx.globalAlpha = 1;

      const malar = fCtx.createRadialGradient(cx, 256, 4, cx, 256, 44);
      malar.addColorStop(0, fp.highlight);
      malar.addColorStop(1, 'rgba(255,255,255,0)');
      fCtx.globalAlpha = 0.3;
      fCtx.fillStyle = malar;
      fCtx.fillRect(cx - 46, 212, 92, 92);
      fCtx.globalAlpha = 1;
    });

    // Subtle nasolabial folds for realistic mid-face structure
    fCtx.strokeStyle = fp.shade;
    fCtx.globalAlpha = 0.2;
    fCtx.lineWidth = 2.2;
    [-1, 1].forEach((s) => {
      fCtx.beginPath();
      fCtx.moveTo(256 + s * 22, 302);
      fCtx.quadraticCurveTo(256 + s * 38, 326, 256 + s * 42, 356);
      fCtx.stroke();
    });
    fCtx.globalAlpha = 1;

    // Temple & side-jaw ambient occlusion
    const sideL = fCtx.createLinearGradient(70, 0, 178, 0);
    sideL.addColorStop(0, 'rgba(55, 28, 18, 0.24)');
    sideL.addColorStop(1, 'rgba(55, 28, 18, 0)');
    fCtx.fillStyle = sideL;
    fCtx.fillRect(70, 120, 108, 315);

    const sideR = fCtx.createLinearGradient(442, 0, 334, 0);
    sideR.addColorStop(0, 'rgba(55, 28, 18, 0.24)');
    sideR.addColorStop(1, 'rgba(55, 28, 18, 0)');
    fCtx.fillStyle = sideR;
    fCtx.fillRect(334, 120, 108, 315);

    // Stippled 5-o'clock jaw stubble + jawline contour
    if (fp.stubble) {
      const jawGrad = fCtx.createLinearGradient(0, 312, 0, 470);
      jawGrad.addColorStop(0, 'rgba(28, 22, 20, 0)');
      jawGrad.addColorStop(0.55, 'rgba(28, 22, 20, 0.14)');
      jawGrad.addColorStop(1, 'rgba(24, 18, 16, 0.26)');
      fCtx.fillStyle = jawGrad;
      fCtx.fillRect(118, 312, 276, 158);

      fCtx.fillStyle = 'rgba(22, 16, 14, 0.25)';
      for (let i = 0; i < 1600; i++) {
        const sx = 126 + Math.random() * 260;
        const sy = 324 + Math.random() * 138;
        const dxCenter = Math.abs(sx - 256);
        if (sy > 332 && sy < 372 && dxCenter < 46) continue;
        if (dxCenter > 118 && sy < 362) continue;
        fCtx.fillRect(sx, sy, 1.3, 1.5);
      }
    }

    // Detailed Eyes (sockets, caruncle, sclera, multi-ring iris + radial fibers, pupil, dual catchlights, eyelids & hair-stroked brows)
    [196, 316].forEach((ex, eyeIdx) => {
      const dirSign = eyeIdx === 0 ? -1 : 1;
      const innerX = ex - dirSign * 22;

      // Eye socket depth shadow
      const sock = fCtx.createRadialGradient(ex, 228, 8, ex, 228, 44);
      sock.addColorStop(0, fp.shade);
      sock.addColorStop(1, 'rgba(0,0,0,0)');
      fCtx.globalAlpha = 0.36;
      fCtx.fillStyle = sock;
      fCtx.fillRect(ex - 46, 184, 92, 86);
      fCtx.globalAlpha = 1;

      // Sclera with natural off-white warmth
      fCtx.fillStyle = '#f2efe9';
      fCtx.beginPath();
      fCtx.ellipse(ex, 232, 25.5, 13.0, 0, 0, Math.PI * 2);
      fCtx.fill();

      fCtx.save();
      fCtx.beginPath();
      fCtx.ellipse(ex, 232, 25.5, 13.0, 0, 0, Math.PI * 2);
      fCtx.clip();

      // Inner tear-duct caruncle tint
      fCtx.fillStyle = 'rgba(196, 114, 108, 0.55)';
      fCtx.beginPath();
      fCtx.arc(innerX, 233, 5.2, 0, Math.PI * 2);
      fCtx.fill();

      // Iris base + outer limbal ring + radial fibers + inner amber collar
      fCtx.fillStyle = fp.eye;
      fCtx.beginPath();
      fCtx.arc(ex, 232, 11.4, 0, Math.PI * 2);
      fCtx.fill();

      fCtx.strokeStyle = 'rgba(255,255,255,0.24)';
      fCtx.lineWidth = 1;
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        fCtx.beginPath();
        fCtx.moveTo(ex + Math.cos(ang) * 4.4, 232 + Math.sin(ang) * 4.4);
        fCtx.lineTo(ex + Math.cos(ang) * 10.4, 232 + Math.sin(ang) * 10.4);
        fCtx.stroke();
      }

      fCtx.strokeStyle = 'rgba(8, 10, 16, 0.78)';
      fCtx.lineWidth = 2.1;
      fCtx.beginPath();
      fCtx.arc(ex, 232, 10.8, 0, Math.PI * 2);
      fCtx.stroke();

      // Pupil
      fCtx.fillStyle = '#090a0f';
      fCtx.beginPath();
      fCtx.arc(ex, 232, 5.0, 0, Math.PI * 2);
      fCtx.fill();

      // Upper sclera ambient shadow cast by upper eyelid
      const lidShadow = fCtx.createLinearGradient(0, 218, 0, 233);
      lidShadow.addColorStop(0, 'rgba(32, 18, 14, 0.42)');
      lidShadow.addColorStop(1, 'rgba(32, 18, 14, 0)');
      fCtx.fillStyle = lidShadow;
      fCtx.fillRect(ex - 28, 218, 56, 16);

      // Dual specular catchlights
      fCtx.fillStyle = '#ffffff';
      fCtx.beginPath();
      fCtx.arc(ex - 3.6, 228.2, 2.8, 0, Math.PI * 2);
      fCtx.fill();
      fCtx.globalAlpha = 0.78;
      fCtx.beginPath();
      fCtx.arc(ex + 3.2, 235.2, 1.3, 0, Math.PI * 2);
      fCtx.fill();
      fCtx.globalAlpha = 1;
      fCtx.restore();

      // Upper & lower eyelid crease + lash line
      fCtx.strokeStyle = '#1b120f';
      fCtx.lineWidth = 4.2;
      fCtx.beginPath();
      fCtx.ellipse(ex, 232, 25.5, 13.0, 0, Math.PI * 1.05, Math.PI * 1.95);
      fCtx.stroke();

      fCtx.strokeStyle = fp.shade;
      fCtx.lineWidth = 1.8;
      fCtx.globalAlpha = 0.7;
      fCtx.beginPath();
      fCtx.ellipse(ex, 223, 27, 12, 0, Math.PI * 1.1, Math.PI * 1.9);
      fCtx.stroke();
      fCtx.beginPath();
      fCtx.ellipse(ex, 233, 24, 12, 0, Math.PI * 0.14, Math.PI * 0.86);
      fCtx.stroke();
      fCtx.globalAlpha = 1;

      // Tapered Eyebrow built from angled fine hair strokes
      fCtx.strokeStyle = fp.hair;
      fCtx.lineCap = 'round';
      fCtx.globalAlpha = 0.88;
      fCtx.lineWidth = 5.4;
      fCtx.beginPath();
      fCtx.moveTo(ex - dirSign * 26, 198);
      fCtx.quadraticCurveTo(ex + dirSign * 4, 187, ex + dirSign * 29, 197);
      fCtx.stroke();

      fCtx.lineWidth = 1.6;
      for (let h = 0; h < 22; h++) {
        const t = h / 21;
        const bx = ex - dirSign * 26 + t * dirSign * 55;
        const by = 198 - Math.sin(t * Math.PI) * 7.5;
        fCtx.beginPath();
        fCtx.moveTo(bx, by + 3.2);
        fCtx.lineTo(bx + dirSign * 3.8, by - 4.2);
        fCtx.stroke();
      }
      fCtx.globalAlpha = 1;
    });

    // Nose bridge highlight, side shadows, nostrils & philtrum
    const noseBridge = fCtx.createLinearGradient(244, 230, 268, 230);
    noseBridge.addColorStop(0, 'rgba(0,0,0,0.18)');
    noseBridge.addColorStop(0.5, 'rgba(255,242,230,0.26)');
    noseBridge.addColorStop(1, 'rgba(0,0,0,0.18)');
    fCtx.fillStyle = noseBridge;
    fCtx.fillRect(243, 228, 26, 72);

    const noseTipGlow = fCtx.createRadialGradient(256, 294, 2, 256, 294, 13);
    noseTipGlow.addColorStop(0, fp.highlight);
    noseTipGlow.addColorStop(1, 'rgba(255,255,255,0)');
    fCtx.globalAlpha = 0.35;
    fCtx.fillStyle = noseTipGlow;
    fCtx.fillRect(242, 280, 28, 28);
    fCtx.globalAlpha = 1;

    fCtx.fillStyle = '#2d1812';
    fCtx.globalAlpha = 0.48;
    fCtx.beginPath();
    fCtx.ellipse(243, 304, 5.2, 3.4, -0.25, 0, Math.PI * 2);
    fCtx.ellipse(269, 304, 5.2, 3.4, 0.25, 0, Math.PI * 2);
    fCtx.fill();

    // Philtrum subtle groove
    fCtx.fillStyle = fp.shade;
    fCtx.globalAlpha = 0.24;
    fCtx.fillRect(251, 312, 10, 26);
    fCtx.globalAlpha = 1;

    // Contoured Cupid's Bow Two-Tone Lips + Lower Lip Specular & Shadow
    fCtx.fillStyle = fp.lip;
    fCtx.beginPath();
    fCtx.moveTo(222, 348);
    fCtx.quadraticCurveTo(242, 338, 256, 343);
    fCtx.quadraticCurveTo(270, 338, 290, 348);
    fCtx.quadraticCurveTo(256, 366, 222, 348);
    fCtx.fill();

    fCtx.fillStyle = 'rgba(255, 228, 220, 0.22)';
    fCtx.beginPath();
    fCtx.ellipse(256, 355, 15, 4.0, 0, 0, Math.PI * 2);
    fCtx.fill();

    fCtx.strokeStyle = 'rgba(54, 18, 15, 0.76)';
    fCtx.lineWidth = 2.4;
    fCtx.beginPath();
    fCtx.moveTo(222, 348);
    fCtx.quadraticCurveTo(256, 351, 290, 348);
    fCtx.stroke();

    fCtx.fillStyle = fp.shade;
    fCtx.globalAlpha = 0.36;
    fCtx.beginPath();
    fCtx.ellipse(256, 367, 17, 3.8, 0, 0, Math.PI * 2);
    fCtx.fill();
    fCtx.globalAlpha = 1;

    const tex = finalizeTexture(fc, maxAnisotropy, true);
    created.push(tex);
    return tex;
  });

  // 13. High-Detail Denim Twill, Pebble Leather & Cotton Weave Textures (256x256 neutral greyscale)
  const [denimC, denimCtx] = makeCanvas(256, 256);
  denimCtx.fillStyle = '#d9dae0';
  denimCtx.fillRect(0, 0, 256, 256);
  denimCtx.strokeStyle = 'rgba(0,0,0,0.08)';
  denimCtx.lineWidth = 1;
  for (let i = -256; i < 512; i += 4) {
    denimCtx.beginPath();
    denimCtx.moveTo(i, 0);
    denimCtx.lineTo(i + 256, 256);
    denimCtx.stroke();
  }
  for (let y = 0; y < 256; y += 3) {
    denimCtx.fillStyle = y % 6 === 0 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
    denimCtx.fillRect(0, y, 256, 1);
  }
  for (let i = 0; i < 3200; i++) {
    const shade = 188 + Math.floor(Math.random() * 58);
    denimCtx.fillStyle = `rgb(${shade},${shade},${shade})`;
    denimCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 1);
  }
  const denim = finalizeTexture(denimC, maxAnisotropy, true, 2, 2);
  created.push(denim);

  const [leatherC, leatherCtx] = makeCanvas(256, 256);
  leatherCtx.fillStyle = '#d0d0d6';
  leatherCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const v = 182 + Math.floor(Math.random() * 56);
    leatherCtx.fillStyle = `rgb(${v},${v},${v})`;
    leatherCtx.beginPath();
    leatherCtx.arc(Math.random() * 256, Math.random() * 256, 1.1 + Math.random() * 1.5, 0, Math.PI * 2);
    leatherCtx.fill();
  }
  leatherCtx.strokeStyle = 'rgba(0,0,0,0.07)';
  leatherCtx.lineWidth = 1.2;
  for (let c = 0; c < 18; c++) {
    const y0 = Math.random() * 256;
    leatherCtx.beginPath();
    leatherCtx.moveTo(0, y0);
    leatherCtx.bezierCurveTo(85, y0 + (Math.random() - 0.5) * 28, 170, y0 + (Math.random() - 0.5) * 28, 256, y0 + (Math.random() - 0.5) * 16);
    leatherCtx.stroke();
  }
  const leather = finalizeTexture(leatherC, maxAnisotropy, true, 2, 2);
  created.push(leather);

  const [fabricC, fabricCtx] = makeCanvas(256, 256);
  fabricCtx.fillStyle = '#e4e4ea';
  fabricCtx.fillRect(0, 0, 256, 256);
  fabricCtx.fillStyle = 'rgba(0,0,0,0.05)';
  for (let i = 0; i < 256; i += 3) {
    fabricCtx.fillRect(i, 0, 1, 256);
    fabricCtx.fillRect(0, i, 256, 1);
  }
  for (let i = 0; i < 1800; i++) {
    const v = 205 + Math.floor(Math.random() * 44);
    fabricCtx.fillStyle = `rgb(${v},${v},${v})`;
    fabricCtx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
  }
  const fabric = finalizeTexture(fabricC, maxAnisotropy, true, 3, 3);
  created.push(fabric);

  // 14. Vehicle Tire Tread & Solaris Bay License Plate Textures
  const [treadC, treadCtx] = makeCanvas(128, 128);
  treadCtx.fillStyle = '#181a1f';
  treadCtx.fillRect(0, 0, 128, 128);
  treadCtx.fillStyle = '#252830';
  for (let y = 0; y < 128; y += 16) {
    treadCtx.fillRect(8, y + 2, 34, 10);
    treadCtx.fillRect(86, y + 2, 34, 10);
    treadCtx.fillRect(46, y + 8, 36, 10);
  }
  const tireTread = finalizeTexture(treadC, maxAnisotropy, true, 4, 1);
  created.push(tireTread);

  const [plateC, plateCtx] = makeCanvas(256, 96);
  plateCtx.fillStyle = '#f3f5f8';
  plateCtx.fillRect(0, 0, 256, 96);
  plateCtx.fillStyle = '#1b5fd9';
  plateCtx.fillRect(0, 0, 256, 22);
  plateCtx.strokeStyle = '#1a202c';
  plateCtx.lineWidth = 5;
  plateCtx.strokeRect(3, 3, 250, 90);
  plateCtx.fillStyle = '#ffd166';
  plateCtx.font = 'bold 13px sans-serif';
  plateCtx.textAlign = 'center';
  plateCtx.fillText('SOLARIS BAY', 128, 16);
  plateCtx.fillStyle = '#141923';
  plateCtx.font = 'bold 42px monospace';
  plateCtx.fillText('SB-305', 128, 72);
  const licensePlate = finalizeTexture(plateC, maxAnisotropy, true);
  created.push(licensePlate);

  // 15. Vehicle Bullet Impact Decals (Metal Crater + Soot Ring, and Frosted Shattered Glass Spiderweb)
  const [bhmC, bhmCtx] = makeCanvas(128, 128);
  bhmCtx.clearRect(0, 0, 128, 128);
  const sootGrad = bhmCtx.createRadialGradient(64, 64, 10, 64, 64, 58);
  sootGrad.addColorStop(0, 'rgba(12, 12, 16, 0.86)');
  sootGrad.addColorStop(0.45, 'rgba(24, 24, 28, 0.56)');
  sootGrad.addColorStop(0.8, 'rgba(35, 32, 34, 0.16)');
  sootGrad.addColorStop(1, 'rgba(20, 20, 24, 0)');
  bhmCtx.fillStyle = sootGrad;
  bhmCtx.beginPath();
  bhmCtx.arc(64, 64, 58, 0, Math.PI * 2);
  bhmCtx.fill();

  // Torn metallic rim petals + subtle specular highlight around dent
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + (i % 2) * 0.15;
    const r1 = 15;
    const r2 = 24 + (i % 3) * 5;
    bhmCtx.strokeStyle = i % 2 === 0 ? 'rgba(175, 186, 204, 0.72)' : 'rgba(92, 98, 112, 0.65)';
    bhmCtx.lineWidth = 2.4;
    bhmCtx.beginPath();
    bhmCtx.moveTo(64 + Math.cos(a) * r1, 64 + Math.sin(a) * r1);
    bhmCtx.lineTo(64 + Math.cos(a + 0.08) * r2, 64 + Math.sin(a + 0.08) * r2);
    bhmCtx.stroke();
  }
  bhmCtx.strokeStyle = 'rgba(195, 205, 220, 0.55)';
  bhmCtx.lineWidth = 2.2;
  bhmCtx.beginPath();
  bhmCtx.arc(64, 64, 18, -0.4, Math.PI * 0.9);
  bhmCtx.stroke();

  bhmCtx.fillStyle = '#050608';
  bhmCtx.beginPath();
  bhmCtx.arc(64, 64, 14.5, 0, Math.PI * 2);
  bhmCtx.fill();

  const bulletHoleMetal = new THREE.CanvasTexture(bhmC);
  bulletHoleMetal.colorSpace = THREE.SRGBColorSpace;
  bulletHoleMetal.anisotropy = maxAnisotropy;
  bulletHoleMetal.needsUpdate = true;
  created.push(bulletHoleMetal);

  const [bhgC, bhgCtx] = makeCanvas(128, 128);
  bhgCtx.clearRect(0, 0, 128, 128);
  const frostGrad = bhgCtx.createRadialGradient(64, 64, 8, 64, 64, 52);
  frostGrad.addColorStop(0, 'rgba(220, 238, 255, 0.62)');
  frostGrad.addColorStop(0.55, 'rgba(205, 228, 248, 0.25)');
  frostGrad.addColorStop(1, 'rgba(205, 228, 248, 0)');
  bhgCtx.fillStyle = frostGrad;
  bhgCtx.beginPath();
  bhgCtx.arc(64, 64, 52, 0, Math.PI * 2);
  bhgCtx.fill();

  // Concentric shattered glass rings
  [18, 30, 42].forEach((rad, idx) => {
    bhgCtx.strokeStyle = idx === 0 ? 'rgba(245, 250, 255, 0.9)' : 'rgba(220, 238, 255, 0.65)';
    bhgCtx.lineWidth = idx === 0 ? 1.8 : 1.2;
    bhgCtx.beginPath();
    bhgCtx.arc(64, 64, rad, 0, Math.PI * 2);
    bhgCtx.stroke();
  });

  // Radial spiderweb fracture rays
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + (i % 3) * 0.11;
    const len = 34 + (i % 4) * 7;
    const midX = 64 + Math.cos(a + 0.08) * (len * 0.55);
    const midY = 64 + Math.sin(a + 0.08) * (len * 0.55);
    bhgCtx.strokeStyle = 'rgba(242, 250, 255, 0.88)';
    bhgCtx.lineWidth = i % 2 === 0 ? 1.7 : 1.1;
    bhgCtx.beginPath();
    bhgCtx.moveTo(64 + Math.cos(a) * 10, 64 + Math.sin(a) * 10);
    bhgCtx.lineTo(midX, midY);
    bhgCtx.lineTo(64 + Math.cos(a) * len, 64 + Math.sin(a) * len);
    bhgCtx.stroke();
  }

  bhgCtx.fillStyle = 'rgba(8, 12, 20, 0.92)';
  bhgCtx.beginPath();
  bhgCtx.arc(64, 64, 11.5, 0, Math.PI * 2);
  bhgCtx.fill();

  const bulletHoleGlass = new THREE.CanvasTexture(bhgC);
  bulletHoleGlass.colorSpace = THREE.SRGBColorSpace;
  bulletHoleGlass.anisotropy = maxAnisotropy;
  bulletHoleGlass.needsUpdate = true;
  created.push(bulletHoleGlass);

  return {
    asphalt,
    asphaltRoughness,
    asphaltNormal,
    intersection,
    sidewalk,
    sidewalkNormal,
    sand,
    contactShadow,
    lampGlow,
    headlightGlow,
    waterNormal,
    facadeNormal,
    facadeRoughness,
    terrainMap,
    terrainNormal,
    weaponShopSign,
    clothingShopSign,
    barberShopSign,
    facades,
    charFaces,
    denim,
    leather,
    fabric,
    tireTread,
    licensePlate,
    bulletHoleMetal,
    bulletHoleGlass,
    dispose: () => {
      created.forEach((t) => t.dispose());
    },
  };
}
