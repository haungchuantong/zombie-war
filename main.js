(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const SPRITE_FRAME_SIZE = 96;
  const SPRITE_COLS = 6;
  const SPRITE_ROWS = {
    idle: 0,
    move: 1,
    attack: 2,
    hit: 3,
    special: 4
  };
  const CHARACTER_SPRITES = {
    survivor: "assets/images/characters/survivor-sheet.png",
    normal: "assets/images/characters/zombie-normal-sheet.png",
    fast: "assets/images/characters/zombie-fast-sheet.png",
    tank: "assets/images/characters/zombie-tank-sheet.png",
    redEye: "assets/images/characters/zombie-redeye-sheet.png",
    armored: "assets/images/characters/zombie-armored-sheet.png",
    exploder: "assets/images/characters/zombie-exploder-sheet.png",
    poison: "assets/images/characters/zombie-poison-sheet.png"
  };

  class SpriteAssets {
    constructor(sources) {
      this.images = {};
      Object.entries(sources).forEach(([key, src]) => {
        const image = new Image();
        image.decoding = "async";
        image.src = src;
        this.images[key] = image;
      });
    }

    get(key) {
      const image = this.images[key];
      if (!image || !image.complete || !image.naturalWidth) return null;
      return image;
    }
  }

  const spriteAssets = new SpriteAssets(CHARACTER_SPRITES);

  const STORAGE_KEYS = {
    coins: "pzs_totalCoins",
    bestKills: "pzs_bestKills",
    bestTime: "pzs_bestTime",
    upgrades: "pzs_upgrades"
  };

  const UPGRADE_DEFS = {
    damage: { name: "武器伤害", icon: "伤", baseCost: 100, max: 10, effect: "每级 +5 伤害" },
    fireRate: { name: "射击速度", icon: "速", baseCost: 120, max: 10, effect: "每级缩短射击间隔" },
    maxHp: { name: "最大生命值", icon: "命", baseCost: 90, max: 10, effect: "每级 +20 生命" },
    speed: { name: "移动速度", icon: "移", baseCost: 100, max: 10, effect: "每级 +0.15 速度" },
    magazine: {
      name: "弹夹容量",
      icon: "弹",
      max: 10,
      baseValue: 12,
      perLevel: 3,
      costs: [120, 180, 260, 360, 500, 680, 900, 1150, 1450],
      effect: "增加每个弹夹的最大子弹数量"
    }
  };

  const RARITY_DEFS = {
    common: { name: "普通", color: "#f0f0e7", damage: 1, fireRate: 1, magazine: 1, reload: 1, special: 1, weight: 54 },
    rare: { name: "稀有", color: "#4da3ff", damage: 1.16, fireRate: 1.06, magazine: 1.12, reload: 0.94, special: 1.12, weight: 25 },
    epic: { name: "精英", color: "#b668ff", damage: 1.34, fireRate: 1.1, magazine: 1.22, reload: 0.88, special: 1.25, weight: 13 },
    legendary: { name: "传说", color: "#ffd34a", damage: 1.55, fireRate: 1.14, magazine: 1.34, reload: 0.82, special: 1.45, weight: 6 },
    mutated: { name: "异化", color: "#ff3b35", damage: 1.75, fireRate: 1.18, magazine: 1.42, reload: 0.78, special: 1.7, weight: 2 }
  };

  const AMMO_CAPS = {
    lightAmmo: 260,
    rifleAmmo: 160,
    shellAmmo: 72,
    fuelAmmo: 220,
    energyAmmo: 180,
    explosiveAmmo: 34
  };

  const AMMO_LABELS = {
    lightAmmo: "轻型弹",
    rifleAmmo: "步枪弹",
    shellAmmo: "霰弹",
    fuelAmmo: "燃料",
    energyAmmo: "能量",
    explosiveAmmo: "榴弹"
  };

  const SPECIAL_LABELS = {
    steady: "稳定",
    spray: "扫射",
    balanced: "均衡",
    closeBurst: "近战爆发",
    pierce: "穿透",
    burn: "燃烧",
    chain: "连锁",
    explosion: "爆炸"
  };

  const WEAPON_DEFS = {
    pistol: {
      id: "pistol",
      name: "手枪",
      type: "sidearm",
      rarity: "common",
      damage: 26,
      fireRate: 4.1,
      magazineSize: 12,
      reloadTime: 1.15,
      bulletSpeed: 10,
      spread: 0.035,
      pierce: 0,
      knockback: 1.4,
      critChance: 0.08,
      ammoType: "lightAmmo",
      projectileType: "bullet",
      specialEffect: "steady",
      muzzleFlashStyle: "small",
      recoil: 1.4,
      screenShake: 1.5,
      soundType: "pistol"
    },
    smg: {
      id: "smg",
      name: "冲锋枪",
      type: "automatic",
      rarity: "rare",
      damage: 13,
      fireRate: 12.5,
      magazineSize: 32,
      reloadTime: 1.55,
      bulletSpeed: 9.6,
      spread: 0.14,
      pierce: 0,
      knockback: 0.7,
      critChance: 0.04,
      ammoType: "lightAmmo",
      projectileType: "bullet",
      specialEffect: "spray",
      muzzleFlashStyle: "rapid",
      recoil: 0.8,
      screenShake: 0.8,
      soundType: "smg"
    },
    assault: {
      id: "assault",
      name: "突击步枪",
      type: "rifle",
      rarity: "rare",
      damage: 22,
      fireRate: 7.2,
      magazineSize: 28,
      reloadTime: 1.75,
      bulletSpeed: 11.2,
      spread: 0.07,
      pierce: 0,
      knockback: 1.1,
      critChance: 0.07,
      ammoType: "rifleAmmo",
      projectileType: "bullet",
      specialEffect: "balanced",
      muzzleFlashStyle: "rifle",
      recoil: 1.15,
      screenShake: 1.25,
      soundType: "rifle"
    },
    shotgun: {
      id: "shotgun",
      name: "霰弹枪",
      type: "scatter",
      rarity: "rare",
      damage: 16,
      fireRate: 1.25,
      magazineSize: 6,
      reloadTime: 2.15,
      bulletSpeed: 8.8,
      spread: 0.31,
      pierce: 0,
      knockback: 5.2,
      critChance: 0.06,
      ammoType: "shellAmmo",
      projectileType: "pellet",
      pelletCount: 7,
      specialEffect: "closeBurst",
      muzzleFlashStyle: "wide",
      recoil: 4.8,
      screenShake: 6.5,
      soundType: "shotgun"
    },
    sniper: {
      id: "sniper",
      name: "狙击枪",
      type: "marksman",
      rarity: "epic",
      damage: 88,
      fireRate: 0.82,
      magazineSize: 5,
      reloadTime: 2.6,
      bulletSpeed: 16,
      spread: 0.008,
      pierce: 4,
      knockback: 3,
      critChance: 0.18,
      ammoType: "rifleAmmo",
      projectileType: "rail",
      specialEffect: "pierce",
      muzzleFlashStyle: "long",
      recoil: 5.4,
      screenShake: 5.5,
      soundType: "sniper"
    },
    flamethrower: {
      id: "flamethrower",
      name: "火焰喷射器",
      type: "sprayer",
      rarity: "epic",
      damage: 9,
      fireRate: 16,
      magazineSize: 90,
      reloadTime: 2.4,
      bulletSpeed: 5.8,
      spread: 0.22,
      pierce: 3,
      knockback: 0.35,
      critChance: 0,
      ammoType: "fuelAmmo",
      projectileType: "flame",
      specialEffect: "burn",
      muzzleFlashStyle: "flame",
      recoil: 0.45,
      screenShake: 0.7,
      soundType: "flame"
    },
    tesla: {
      id: "tesla",
      name: "电击枪",
      type: "energy",
      rarity: "epic",
      damage: 32,
      fireRate: 2.5,
      magazineSize: 18,
      reloadTime: 2.05,
      bulletSpeed: 13,
      spread: 0.025,
      pierce: 0,
      knockback: 0.9,
      critChance: 0.1,
      ammoType: "energyAmmo",
      projectileType: "tesla",
      specialEffect: "chain",
      muzzleFlashStyle: "electric",
      recoil: 1.9,
      screenShake: 2,
      soundType: "tesla"
    },
    grenade: {
      id: "grenade",
      name: "榴弹发射器",
      type: "explosive",
      rarity: "epic",
      damage: 78,
      fireRate: 0.72,
      magazineSize: 4,
      reloadTime: 2.8,
      bulletSpeed: 6.4,
      spread: 0.035,
      pierce: 0,
      knockback: 6.5,
      critChance: 0,
      ammoType: "explosiveAmmo",
      projectileType: "grenade",
      specialEffect: "explosion",
      muzzleFlashStyle: "thump",
      recoil: 5,
      screenShake: 5.8,
      soundType: "grenade"
    }
  };

  const GENERATED_ASSET_SOURCES = {
    weapon_pistol: "assets/images/generated/weapon-pistol.png",
    weapon_smg: "assets/images/generated/weapon-smg.png",
    weapon_assault: "assets/images/generated/weapon-assault-rifle.png",
    weapon_shotgun: "assets/images/generated/weapon-shotgun.png",
    weapon_sniper: "assets/images/generated/weapon-sniper-rifle.png",
    weapon_flamethrower: "assets/images/generated/weapon-flamethrower.png",
    weapon_tesla: "assets/images/generated/weapon-tesla-gun.png",
    weapon_grenade: "assets/images/generated/weapon-grenade-launcher.png",
    chest_weapon: "assets/images/generated/weapon-chest.png",
    chest_reward: "assets/images/generated/reward-chest.png",
    burrow_crack: "assets/images/generated/burrow-warning-crack.png",
    hunter: "assets/images/generated/hunter-zombie.png"
  };

  const generatedAssets = new SpriteAssets(GENERATED_ASSET_SOURCES);

  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const dist = (a, b, c, d) => Math.hypot(a - c, b - d);
  const angleTo = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);
  const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const normalizeAngle = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
  const weightedChoice = (table) => {
    const entries = Object.entries(table).filter(([, weight]) => weight > 0);
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = rand(0, total);
    for (const [key, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return key;
    }
    return entries[0]?.[0];
  };
  const isSpecialZombie = (type) => ["tank", "redEye", "armored", "exploder", "poison", "hunter"].includes(type);
  const getRarity = (rarity) => RARITY_DEFS[rarity] || RARITY_DEFS.common;
  const createWeapon = (id = "pistol", rarity = null) => {
    const base = WEAPON_DEFS[id] || WEAPON_DEFS.pistol;
    const finalRarity = rarity || base.rarity || "common";
    const rarityDef = getRarity(finalRarity);
    return {
      ...base,
      rarity: finalRarity,
      rarityName: rarityDef.name,
      rarityColor: rarityDef.color,
      damage: Math.round(base.damage * rarityDef.damage),
      fireRate: base.fireRate * rarityDef.fireRate,
      magazineSize: Math.max(1, Math.round(base.magazineSize * rarityDef.magazine)),
      reloadTime: Math.max(0.35, base.reloadTime * rarityDef.reload),
      specialPower: rarityDef.special
    };
  };
  const rollRarity = (bonus = 0) => {
    const table = {};
    for (const [key, def] of Object.entries(RARITY_DEFS)) {
      const high = key === "epic" || key === "legendary" || key === "mutated";
      table[key] = def.weight + (high ? bonus : 0);
    }
    return weightedChoice(table) || "common";
  };
  const rollWeaponId = () => weightedChoice({
    pistol: 10,
    smg: 18,
    assault: 20,
    shotgun: 15,
    sniper: 10,
    flamethrower: 9,
    tesla: 8,
    grenade: 7
  }) || "pistol";
  const formatTime = (seconds) => {
    const total = Math.max(0, Math.floor(seconds));
    const m = String(Math.floor(total / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  function pixelRect(context, x, y, w, h, color) {
    context.fillStyle = color;
    context.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function withTransform(context, x, y, rotation, draw) {
    context.save();
    context.translate(Math.round(x), Math.round(y));
    context.rotate(rotation);
    draw();
    context.restore();
  }

  function drawPixelShadow(context, x, y, w, h, alpha = 0.34) {
    context.save();
    context.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    context.beginPath();
    context.ellipse(Math.round(x), Math.round(y), Math.round(w / 2), Math.round(h / 2), 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawPixelOutlineRect(context, x, y, w, h, fill, outline = "#070808", highlight = null, shade = null) {
    pixelRect(context, x - 2, y - 2, w + 4, h + 4, outline);
    pixelRect(context, x, y, w, h, fill);
    if (highlight) {
      pixelRect(context, x, y, w, 2, highlight);
      pixelRect(context, x, y, 2, h, highlight);
    }
    if (shade) {
      pixelRect(context, x, y + h - 3, w, 3, shade);
      pixelRect(context, x + w - 3, y, 3, h, shade);
    }
  }

  function drawIsoBox(context, x, y, w, h, d, top, left, right, outline = "#070808") {
    const hw = w / 2;
    context.save();
    context.translate(Math.round(x), Math.round(y));
    context.fillStyle = outline;
    context.beginPath();
    context.moveTo(0, -d - 3);
    context.lineTo(hw + 3, -3);
    context.lineTo(hw + 3, h + 3);
    context.lineTo(0, h + d + 3);
    context.lineTo(-hw - 3, h + 3);
    context.lineTo(-hw - 3, -3);
    context.closePath();
    context.fill();

    context.fillStyle = left;
    context.beginPath();
    context.moveTo(-hw, 0);
    context.lineTo(0, d);
    context.lineTo(0, h + d);
    context.lineTo(-hw, h);
    context.closePath();
    context.fill();

    context.fillStyle = right;
    context.beginPath();
    context.moveTo(hw, 0);
    context.lineTo(0, d);
    context.lineTo(0, h + d);
    context.lineTo(hw, h);
    context.closePath();
    context.fill();

    context.fillStyle = top;
    context.beginPath();
    context.moveTo(0, -d);
    context.lineTo(hw, 0);
    context.lineTo(0, d);
    context.lineTo(-hw, 0);
    context.closePath();
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.12)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, -d);
    context.lineTo(-hw, 0);
    context.stroke();
    context.restore();
  }

  function drawPixelSpark(context, x, y, angle, length, color) {
    context.save();
    context.translate(Math.round(x), Math.round(y));
    context.rotate(angle);
    pixelRect(context, 0, -1, length, 2, color);
    pixelRect(context, Math.floor(length * 0.45), -2, Math.floor(length * 0.28), 4, "#fff1a4");
    context.restore();
  }

  function drawMuzzleFlash(context, x, y, angle, scale = 1) {
    context.save();
    context.translate(Math.round(x), Math.round(y));
    context.rotate(angle);
    pixelRect(context, 0, -3 * scale, 10 * scale, 6 * scale, "#fff2a0");
    pixelRect(context, 8 * scale, -5 * scale, 12 * scale, 10 * scale, "#ff9b22");
    pixelRect(context, 17 * scale, -2 * scale, 8 * scale, 4 * scale, "#ffd45a");
    pixelRect(context, 4 * scale, -7 * scale, 6 * scale, 3 * scale, "#ff6b1f");
    pixelRect(context, 4 * scale, 4 * scale, 6 * scale, 3 * scale, "#ff6b1f");
    context.restore();
  }

  function drawMiniGunIcon(context, x, y) {
    drawPixelOutlineRect(context, x, y + 6, 26, 9, "#242a2b", "#060707", "#606b6b", "#0f1212");
    pixelRect(context, x + 22, y + 8, 13, 4, "#51595a");
    pixelRect(context, x + 9, y + 14, 6, 9, "#111414");
    pixelRect(context, x + 4, y + 4, 12, 4, "#8b6a3c");
  }

  function drawCoinIcon(context, x, y) {
    drawPixelOutlineRect(context, x, y, 16, 16, "#b36b08", "#070707", "#ffe178", "#6b3504");
    pixelRect(context, x + 3, y + 2, 10, 10, "#ffd34a");
    pixelRect(context, x + 6, y + 4, 4, 8, "#fff1a2");
  }

  function drawSkullIcon(context, x, y) {
    drawPixelOutlineRect(context, x + 2, y, 14, 12, "#d8d6c4", "#080808", "#ffffff", "#8c8b80");
    pixelRect(context, x + 5, y + 4, 3, 3, "#101010");
    pixelRect(context, x + 11, y + 4, 3, 3, "#101010");
    pixelRect(context, x + 7, y + 10, 2, 5, "#d8d6c4");
    pixelRect(context, x + 11, y + 10, 2, 5, "#d8d6c4");
  }

  function drawMagazineIcon(context, x, y) {
    drawPixelOutlineRect(context, x + 2, y + 2, 18, 24, "#2c3434", "#050606", "#6f7a72", "#101515");
    pixelRect(context, x + 6, y + 6, 4, 16, "#d99522");
    pixelRect(context, x + 12, y + 6, 4, 16, "#f0c35c");
    pixelRect(context, x + 5, y + 22, 13, 3, "#111515");
    pixelRect(context, x + 21, y + 8, 5, 12, "#151a1b");
  }

  function drawWeaponIcon(context, id, x, y, scale = 1, accent = "#f0f0e7") {
    context.save();
    context.translate(Math.round(x), Math.round(y));
    context.scale(scale, scale);
    const metal = "#2b3333";
    const dark = "#070909";
    const wood = "#8b5a2c";
    if (id === "shotgun") {
      drawPixelOutlineRect(context, 0, 7, 36, 9, metal, dark, "#8c9694", "#101515");
      pixelRect(context, 31, 9, 20, 4, "#606b6b");
      pixelRect(context, 8, 15, 13, 9, wood);
      pixelRect(context, -8, 10, 12, 8, wood);
    } else if (id === "sniper") {
      drawPixelOutlineRect(context, 0, 8, 42, 7, metal, dark, "#9ba6a3", "#101515");
      pixelRect(context, 37, 10, 24, 3, "#748082");
      pixelRect(context, 12, 3, 16, 5, accent);
      pixelRect(context, 14, 15, 7, 10, "#151a1b");
    } else if (id === "smg") {
      drawPixelOutlineRect(context, 0, 6, 30, 10, metal, dark, "#8c9694", "#101515");
      pixelRect(context, 25, 8, 12, 3, "#606b6b");
      pixelRect(context, 8, 15, 7, 14, "#111414");
      pixelRect(context, -4, 10, 8, 7, "#202525");
    } else if (id === "assault") {
      drawPixelOutlineRect(context, 0, 6, 38, 10, metal, dark, "#8c9694", "#101515");
      pixelRect(context, 34, 8, 16, 4, "#606b6b");
      pixelRect(context, 9, 15, 8, 14, "#111414");
      pixelRect(context, -7, 9, 12, 8, wood);
    } else if (id === "flamethrower") {
      drawPixelOutlineRect(context, 0, 7, 34, 11, "#47342c", dark, "#ba8150", "#170f0c");
      pixelRect(context, 30, 10, 18, 5, "#8d8d7b");
      pixelRect(context, 9, -2, 17, 8, accent);
      pixelRect(context, 9, 17, 7, 12, "#151a1b");
    } else if (id === "tesla") {
      drawPixelOutlineRect(context, 0, 7, 34, 10, "#26313b", dark, "#8defff", "#10171d");
      pixelRect(context, 29, 8, 14, 4, "#c7fbff");
      pixelRect(context, 9, 2, 18, 5, accent);
      pixelRect(context, 14, 17, 7, 11, "#151a1b");
      pixelRect(context, 39, 5, 4, 10, "#8defff");
    } else if (id === "grenade") {
      drawPixelOutlineRect(context, 0, 8, 32, 11, "#303835", dark, "#9ba6a3", "#101515");
      pixelRect(context, 27, 11, 14, 5, "#606b6b");
      pixelRect(context, -7, 5, 10, 14, wood);
      pixelRect(context, 13, 18, 7, 11, "#151a1b");
    } else {
      drawPixelOutlineRect(context, 0, 7, 26, 9, metal, dark, "#8c9694", "#101515");
      pixelRect(context, 22, 9, 13, 4, "#606b6b");
      pixelRect(context, 9, 15, 6, 9, "#111414");
      pixelRect(context, 4, 5, 12, 4, wood);
    }
    context.restore();
  }

  function drawPixelPolygon(context, points, color) {
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(Math.round(points[0][0]), Math.round(points[0][1]));
    for (let i = 1; i < points.length; i++) {
      context.lineTo(Math.round(points[i][0]), Math.round(points[i][1]));
    }
    context.closePath();
    context.fill();
  }

  function drawIsoSpriteBlock(context, x, y, w, h, colors, slant = 5) {
    const outline = colors.outline || "#050606";
    const mid = colors.mid;
    const light = colors.light || mid;
    const dark = colors.dark || mid;
    const pts = [
      [x + slant, y],
      [x + w - 2, y + 2],
      [x + w, y + h - slant],
      [x + w - slant, y + h],
      [x + 2, y + h - 2],
      [x, y + slant]
    ];
    drawPixelPolygon(context, pts.map(([px, py]) => [px - 2, py - 2]), outline);
    drawPixelPolygon(context, pts, mid);
    drawPixelPolygon(context, [
      [x + slant, y],
      [x + w - 4, y + 2],
      [x + w - 8, y + 6],
      [x + slant + 2, y + 5]
    ], light);
    drawPixelPolygon(context, [
      [x + w - 5, y + 5],
      [x + w, y + h - slant],
      [x + w - slant, y + h],
      [x + w - slant - 4, y + h - 5]
    ], dark);
    pixelRect(context, x + 2, y + h - 4, Math.max(4, w - 8), 3, dark);
  }

  function drawIsoHead(context, x, y, scale, palette, options = {}) {
    const w = 16 * scale;
    const h = 17 * scale;
    drawIsoSpriteBlock(context, x, y, w, h, {
      outline: palette.outline,
      mid: palette.skinMid,
      light: palette.skinLight,
      dark: palette.skinDark
    }, 4 * scale);
    pixelRect(context, x + 2 * scale, y + 2 * scale, 11 * scale, 4 * scale, palette.hairMid || palette.skinDark);
    pixelRect(context, x, y + 4 * scale, 8 * scale, 5 * scale, palette.hairDark || palette.skinDark);
    pixelRect(context, x + 4 * scale, y, 8 * scale, 3 * scale, palette.hairLight || palette.skinLight);
    pixelRect(context, x + 5 * scale, y + 8 * scale, 3 * scale, 3 * scale, options.eye || "#11110f");
    pixelRect(context, x + 11 * scale, y + 8 * scale, 3 * scale, 3 * scale, options.eye || "#11110f");
    if (options.eyeGlow) {
      pixelRect(context, x + 4 * scale, y + 7 * scale, 5 * scale, 5 * scale, options.eyeGlow);
      pixelRect(context, x + 10 * scale, y + 7 * scale, 5 * scale, 5 * scale, options.eyeGlow);
    }
    pixelRect(context, x + 7 * scale, y + 13 * scale, 6 * scale, 2 * scale, palette.mouth || "#57241d");
    pixelRect(context, x + w - 4 * scale, y + 6 * scale, 3 * scale, 7 * scale, palette.skinDark);
  }

  function drawIsoTorso(context, x, y, w, h, palette, options = {}) {
    drawIsoSpriteBlock(context, x, y, w, h, {
      outline: palette.outline,
      mid: palette.clothMid,
      light: palette.clothLight,
      dark: palette.clothDark
    }, options.slant || 6);
    pixelRect(context, x + 4, y + 4, Math.max(5, w * 0.28), 5, palette.clothLight);
    pixelRect(context, x + Math.floor(w * 0.48), y + 3, 4, h - 5, palette.clothDark);
    pixelRect(context, x + w - 8, y + h - 11, 5, 8, palette.clothDark);
    if (options.belly) {
      drawIsoSpriteBlock(context, x - 3, y + 8, w + 6, h - 4, {
        outline: palette.outline,
        mid: options.belly.mid,
        light: options.belly.light,
        dark: options.belly.dark
      }, 7);
    }
  }

  function drawIsoLimb(context, x, y, w, h, palette, angle = 0) {
    context.save();
    context.translate(Math.round(x), Math.round(y));
    context.rotate(angle);
    drawIsoSpriteBlock(context, 0, 0, w, h, {
      outline: palette.outline,
      mid: palette.mid,
      light: palette.light,
      dark: palette.dark
    }, Math.max(3, Math.floor(w * 0.45)));
    context.restore();
  }

  function drawSpriteFeetShadow(context, x, y, w, h, alpha = 0.42) {
    drawPixelShadow(context, x, y, w, h, alpha);
    pixelRect(context, x - w * 0.24, y - 1, w * 0.48, 2, "rgba(0,0,0,0.18)");
  }

  function drawCharacterSprite(context, image, options) {
    const row = clamp(options.row ?? 0, 0, 4);
    const frame = Math.floor(options.frame ?? 0) % SPRITE_COLS;
    const scale = options.scale ?? 1;
    const alpha = options.alpha ?? 1;
    const angle = options.angle ?? 0;
    const bob = options.bob ?? 0;
    const sx = frame * SPRITE_FRAME_SIZE;
    const sy = row * SPRITE_FRAME_SIZE;
    context.save();
    context.globalAlpha *= alpha;
    context.translate(Math.round(options.x), Math.round(options.y + bob));
    context.rotate(angle);
    context.imageSmoothingEnabled = false;
    context.drawImage(
      image,
      sx,
      sy,
      SPRITE_FRAME_SIZE,
      SPRITE_FRAME_SIZE,
      -SPRITE_FRAME_SIZE * 0.5 * scale,
      -SPRITE_FRAME_SIZE * 0.56 * scale,
      SPRITE_FRAME_SIZE * scale,
      SPRITE_FRAME_SIZE * scale
    );
    context.restore();
  }

  function drawSpriteHealthBar(context, x, y, w, value, fill) {
    drawPixelOutlineRect(context, x - w / 2 - 1, y - 1, w + 2, 6, "#111", "#050505");
    pixelRect(context, x - w / 2, y + 1, w * clamp(value, 0, 1), 2, fill);
  }

  class AudioBus {
    constructor() {
      this.ctx = null;
    }

    ensure() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.ctx = new AudioContext();
      }
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    }

    beep(freq, duration, type = "square", gain = 0.05) {
      const audio = this.ensure();
      if (!audio) return;
      const osc = audio.createOscillator();
      const volume = audio.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      volume.gain.value = gain;
      volume.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      osc.connect(volume);
      volume.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + duration);
    }
  }

  const audioBus = new AudioBus();
  window.playShootSound = () => audioBus.beep(420, 0.045, "square", 0.035);
  window.playWeaponSound = (type = "pistol") => {
    const tones = {
      pistol: [460, 0.045, "square", 0.036],
      smg: [620, 0.028, "square", 0.026],
      rifle: [390, 0.04, "sawtooth", 0.032],
      shotgun: [170, 0.09, "sawtooth", 0.058],
      sniper: [120, 0.12, "triangle", 0.064],
      flame: [80, 0.055, "sawtooth", 0.025],
      tesla: [820, 0.07, "triangle", 0.04],
      grenade: [150, 0.085, "square", 0.052]
    };
    const tone = tones[type] || tones.pistol;
    audioBus.beep(tone[0], tone[1], tone[2], tone[3]);
    if (type === "shotgun" || type === "grenade") setTimeout(() => audioBus.beep(75, 0.08, "sawtooth", 0.032), 35);
    if (type === "tesla") setTimeout(() => audioBus.beep(1120, 0.045, "triangle", 0.026), 42);
  };
  window.playHitSound = () => audioBus.beep(170, 0.055, "sawtooth", 0.03);
  window.playZombieDeathSound = () => audioBus.beep(80, 0.11, "sawtooth", 0.045);
  window.playPlayerHurtSound = () => audioBus.beep(95, 0.14, "triangle", 0.06);
  window.playCoinSound = () => audioBus.beep(850, 0.06, "square", 0.035);
  window.playUpgradeSound = () => audioBus.beep(620, 0.12, "triangle", 0.045);
  window.playHordeSound = () => {
    audioBus.beep(120, 0.18, "sawtooth", 0.055);
    setTimeout(() => audioBus.beep(90, 0.22, "square", 0.045), 120);
  };

  class Particle {
    constructor(x, y, options = {}) {
      this.x = x;
      this.y = y;
      this.vx = options.vx ?? rand(-1, 1);
      this.vy = options.vy ?? rand(-1, 1);
      this.size = options.size ?? rand(2, 5);
      this.life = options.life ?? rand(0.25, 0.75);
      this.maxLife = this.life;
      this.color = options.color ?? "#ffd45a";
      this.gravity = options.gravity ?? 0;
      this.fade = options.fade ?? true;
      this.kind = options.kind ?? "square";
      this.angle = options.angle ?? 0;
    }

    update(dt) {
      this.x += this.vx * 60 * dt;
      this.y += this.vy * 60 * dt;
      this.vy += this.gravity * 60 * dt;
      this.life -= dt;
      return this.life > 0;
    }

    draw(context) {
      const alpha = this.fade ? clamp(this.life / this.maxLife, 0, 1) : 1;
      context.save();
      context.globalAlpha = alpha;
      if (this.kind === "muzzle") {
        drawMuzzleFlash(context, this.x, this.y, this.angle, this.size / 5);
      } else if (this.kind === "spark") {
        drawPixelSpark(context, this.x, this.y, Math.atan2(this.vy, this.vx), Math.max(6, this.size * 4), this.color);
      } else if (this.kind === "smoke") {
        pixelRect(context, this.x - this.size, this.y - this.size / 2, this.size * 2, this.size, "rgba(34,38,36,0.8)");
        pixelRect(context, this.x - this.size / 2, this.y - this.size, this.size, this.size * 2, "rgba(18,20,19,0.55)");
      } else {
        pixelRect(context, this.x - 1, this.y - 1, this.size + 2, this.size + 2, "#070808");
        pixelRect(context, this.x, this.y, this.size, this.size, this.color);
        if (this.kind === "blood" || this.color.includes("38") || this.color.includes("6d")) {
          pixelRect(context, this.x + this.size - 1, this.y + this.size - 1, 2, 2, "rgba(0,0,0,0.35)");
        }
      }
      context.restore();
    }
  }

  class Bullet {
    constructor(x, y, angle, damage, options = {}) {
      this.x = x;
      this.y = y;
      this.prevX = x;
      this.prevY = y;
      this.startX = x;
      this.startY = y;
      this.angle = angle;
      this.damage = damage;
      this.speed = options.speed ?? 9;
      this.radius = options.radius ?? 4;
      this.alive = true;
      this.color = options.color || "#ffb12c";
      this.glow = options.glow || "#ffcc48";
      this.pierceLeft = options.pierce ?? 0;
      this.knockback = options.knockback ?? 0;
      this.range = options.range ?? 920;
      this.falloffStart = options.falloffStart ?? Infinity;
      this.falloffEnd = options.falloffEnd ?? Infinity;
      this.burn = options.burn ?? 0;
      this.stun = options.stun ?? 0;
      this.weaponId = options.weaponId || "pistol";
      this.crit = options.crit || false;
      this.homing = options.homing || 0;
      this.hitSet = new Set();
    }

    update(dt, game) {
      this.prevX = this.x;
      this.prevY = this.y;
      if (this.homing > 0) {
        const target = game.getAimAssistTarget();
        if (target) {
          const desired = angleTo(this.x, this.y, target.x, target.y);
          this.angle = normalizeAngle(this.angle + clamp(angleDelta(desired, this.angle), -this.homing * dt, this.homing * dt));
        }
      }
      this.x += Math.cos(this.angle) * this.speed * 60 * dt;
      this.y += Math.sin(this.angle) * this.speed * 60 * dt;

      const traveled = dist(this.startX, this.startY, this.x, this.y);
      if (this.x < -60 || this.x > game.width + 60 || this.y < -60 || this.y > game.height + 60 || traveled > this.range) {
        this.alive = false;
        return;
      }

      for (const zombie of game.zombies) {
        if (!zombie.alive || this.hitSet.has(zombie)) continue;
        if (dist(this.x, this.y, zombie.x, zombie.y) < this.radius + zombie.radius) {
          let finalDamage = this.damage;
          if (traveled > this.falloffStart) {
            const fade = clamp(1 - (traveled - this.falloffStart) / Math.max(1, this.falloffEnd - this.falloffStart), 0.38, 1);
            finalDamage *= fade;
          }
          zombie.takeDamage(finalDamage, game, {
            knockback: this.knockback,
            angle: this.angle,
            burn: this.burn,
            stun: this.stun,
            weaponId: this.weaponId,
            crit: this.crit
          });
          this.hitSet.add(zombie);
          this.spawnHitParticles(game, zombie);
          playHitSound();
          if (this.pierceLeft <= 0) {
            this.alive = false;
            break;
          }
          this.pierceLeft -= 1;
        }
      }
    }

    spawnHitParticles(game, zombie) {
      const sparks = this.crit ? 14 : 8;
      for (let i = 0; i < sparks; i++) {
        game.particles.push(new Particle(this.x, this.y, {
          vx: rand(-2.3, 2.3),
          vy: rand(-2.3, 2.3),
          size: randInt(2, this.crit ? 6 : 4),
          life: rand(0.18, 0.42),
          color: this.crit ? "#fff1a2" : Math.random() > 0.55 ? "#ffd24b" : Math.random() > 0.5 ? "#ff8a22" : "#6fbd38",
          kind: Math.random() > 0.55 ? "spark" : "blood"
        }));
      }
      if (zombie.type === "armored") game.shake = Math.max(game.shake, 1.6);
    }

    draw(context) {
      context.save();
      context.globalAlpha = 0.24;
      context.strokeStyle = this.glow;
      context.lineWidth = this.weaponId === "sniper" ? 13 : 9;
      context.beginPath();
      context.moveTo(Math.round(this.prevX), Math.round(this.prevY));
      context.lineTo(Math.round(this.x), Math.round(this.y));
      context.stroke();
      context.globalAlpha = 0.9;
      context.strokeStyle = this.color;
      context.lineWidth = this.weaponId === "sniper" ? 5 : 4;
      context.beginPath();
      context.moveTo(Math.round(this.prevX), Math.round(this.prevY));
      context.lineTo(Math.round(this.x), Math.round(this.y));
      context.stroke();
      context.globalAlpha = 1;
      withTransform(context, this.x, this.y, this.angle, () => {
        drawPixelOutlineRect(context, -4, -3, 11, 6, this.color, "#4c2105", "#fff4a4", "#7a2509");
        pixelRect(context, 5, -1, 5, 2, "#fff6b8");
      });
      context.restore();
    }
  }

  class GrenadeProjectile {
    constructor(x, y, angle, weapon) {
      this.x = x;
      this.y = y;
      this.prevX = x;
      this.prevY = y;
      this.angle = angle;
      this.weapon = weapon;
      this.speed = weapon.bulletSpeed;
      this.life = 0.85;
      this.maxLife = this.life;
      this.radius = 8;
      this.alive = true;
    }

    update(dt, game) {
      this.prevX = this.x;
      this.prevY = this.y;
      this.life -= dt;
      this.x += Math.cos(this.angle) * this.speed * 60 * dt;
      this.y += Math.sin(this.angle) * this.speed * 60 * dt;
      for (const zombie of game.zombies) {
        if (zombie.alive && dist(this.x, this.y, zombie.x, zombie.y) < this.radius + zombie.radius) {
          this.explode(game);
          return;
        }
      }
      if (this.life <= 0 || this.x < -50 || this.x > game.width + 50 || this.y < -50 || this.y > game.height + 50) this.explode(game);
    }

    explode(game) {
      if (!this.alive) return;
      this.alive = false;
      game.createExplosion(this.x, this.y, 96 + this.weapon.specialPower * 10, this.weapon.damage, {
        knockback: this.weapon.knockback,
        fireZone: this.weapon.rarity === "legendary" || this.weapon.rarity === "mutated"
      });
    }

    draw(context) {
      const progress = 1 - this.life / this.maxLife;
      const arc = Math.sin(progress * Math.PI) * 34;
      drawPixelShadow(context, this.x, this.y + 10, 18, 8, 0.3);
      withTransform(context, this.x, this.y - arc, this.angle + progress * 8, () => {
        drawPixelOutlineRect(context, -6, -5, 13, 10, "#2e3532", "#060707", "#8b9285", "#101313");
        pixelRect(context, 1, -3, 6, 6, "#d69a2b");
      });
    }
  }

  class ChainArc {
    constructor(points, color = "#99f2ff") {
      this.points = points;
      this.life = 0.16;
      this.maxLife = this.life;
      this.color = color;
    }

    update(dt) {
      this.life -= dt;
      return this.life > 0;
    }

    draw(context) {
      if (this.points.length < 2) return;
      const alpha = clamp(this.life / this.maxLife, 0, 1);
      context.save();
      context.globalAlpha = alpha;
      context.strokeStyle = this.color;
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 1; i < this.points.length; i++) {
        const from = this.points[i - 1];
        const to = this.points[i];
        const midX = (from.x + to.x) / 2 + rand(-10, 10);
        const midY = (from.y + to.y) / 2 + rand(-10, 10);
        context.lineTo(midX, midY);
        context.lineTo(to.x, to.y);
      }
      context.stroke();
      context.strokeStyle = "#f3fdff";
      context.lineWidth = 1;
      context.stroke();
      context.restore();
    }
  }

  class FireZone {
    constructor(x, y, radius = 72, damage = 8) {
      this.x = x;
      this.y = y;
      this.radius = radius;
      this.damage = damage;
      this.duration = 3.2;
      this.maxDuration = this.duration;
      this.tickTimer = 0;
      this.alive = true;
    }

    update(dt, game) {
      this.duration -= dt;
      this.tickTimer -= dt;
      if (this.duration <= 0) {
        this.alive = false;
        return;
      }
      if (this.tickTimer <= 0) {
        this.tickTimer = 0.35;
        for (const zombie of game.zombies) {
          if (zombie.alive && dist(this.x, this.y, zombie.x, zombie.y) < this.radius + zombie.radius) {
            zombie.takeDamage(this.damage, game, { burn: 1.7, weaponId: "grenade" });
          }
        }
      }
      if (Math.random() < dt * 16) {
        const a = rand(0, Math.PI * 2);
        const r = rand(8, this.radius);
        game.particles.push(new Particle(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r * 0.55, {
          vx: rand(-0.25, 0.25),
          vy: rand(-0.9, -0.15),
          size: randInt(3, 7),
          life: rand(0.2, 0.55),
          color: Math.random() > 0.5 ? "#ff6b1f" : "#ffd45a",
          kind: "spark"
        }));
      }
    }

    draw(context) {
      const alpha = clamp(this.duration / this.maxDuration, 0, 1);
      context.save();
      context.globalAlpha = alpha * 0.7;
      context.fillStyle = "rgba(190, 50, 12, 0.25)";
      context.beginPath();
      context.ellipse(this.x, this.y, this.radius, this.radius * 0.55, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "rgba(255, 154, 38, 0.6)";
      context.lineWidth = 3;
      context.stroke();
      context.restore();
    }
  }

  class Coin {
    constructor(x, y, value) {
      this.x = x;
      this.y = y;
      this.value = value;
      this.vx = rand(-1.2, 1.2);
      this.vy = rand(-1.2, 1.2);
      this.radius = 8;
      this.life = 0;
      this.collected = false;
    }

    update(dt, game) {
      this.life += dt;
      const player = game.player;
      const d = dist(this.x, this.y, player.x, player.y);
      if (d < 155) {
        const a = angleTo(this.x, this.y, player.x, player.y);
        const pull = d < 42 ? 7.2 : 3.4;
        this.vx += Math.cos(a) * pull * dt;
        this.vy += Math.sin(a) * pull * dt;
      } else {
        this.vx *= 0.96;
        this.vy *= 0.96;
      }
      this.x += this.vx * 60 * dt;
      this.y += this.vy * 60 * dt;

      if (d < player.radius + this.radius) {
        game.runCoins += this.value;
        this.collected = true;
        playCoinSound();
        for (let i = 0; i < 6; i++) {
          game.particles.push(new Particle(this.x, this.y, {
            vx: rand(-1.6, 1.6),
            vy: rand(-2.2, -0.2),
            size: randInt(2, 4),
            life: rand(0.2, 0.45),
            color: "#ffd34d"
          }));
        }
      }
    }

    draw(context) {
      const bob = Math.sin(this.life * 8) * 2;
      drawPixelShadow(context, this.x + 1, this.y + 8, 16, 7, 0.28);
      drawPixelOutlineRect(context, this.x - 7, this.y - 8 + bob, 14, 14, "#b97800", "#090603", "#ffe47a", "#6c3a05");
      pixelRect(context, this.x - 4, this.y - 6 + bob, 9, 9, "#ffd34d");
      pixelRect(context, this.x - 1, this.y - 4 + bob, 3, 6, "#fff2a8");
      pixelRect(context, this.x + 4, this.y + 3 + bob, 3, 3, "#8a4b06");
    }
  }

  class PoisonPool {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.radius = 70;
      this.duration = 5;
      this.maxDuration = 5;
      this.damage = 4;
      this.tickInterval = 0.5;
      this.tickTimer = 0;
      this.bubbles = Array.from({ length: 18 }, () => ({
        x: rand(-58, 58),
        y: rand(-34, 34),
        size: randInt(2, 7),
        phase: rand(0, Math.PI * 2)
      }));
      this.alive = true;
    }

    update(dt, game) {
      this.duration -= dt;
      this.tickTimer -= dt;
      if (this.duration <= 0) {
        this.alive = false;
        return;
      }
      const d = dist(this.x, this.y, game.player.x, game.player.y);
      if (d < this.radius + game.player.radius && this.tickTimer <= 0) {
        game.player.takeDamage(this.damage, game);
        this.tickTimer = this.tickInterval;
      }
      if (Math.random() < dt * 4) {
        const a = rand(0, Math.PI * 2);
        const r = rand(8, this.radius * 0.85);
        game.particles.push(new Particle(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r * 0.55, {
          vx: rand(-0.25, 0.25),
          vy: rand(-0.55, -0.1),
          size: randInt(2, 5),
          life: rand(0.35, 0.8),
          color: "#74d943",
          kind: "blood"
        }));
      }
    }

    draw(context) {
      const alpha = clamp(this.duration / this.maxDuration, 0, 1);
      context.save();
      context.globalAlpha = alpha * 0.72;
      drawPixelShadow(context, this.x, this.y + 4, this.radius * 1.8, this.radius * 0.9, 0.28);
      context.fillStyle = "rgba(59, 154, 46, 0.34)";
      context.beginPath();
      context.ellipse(this.x, this.y, this.radius, this.radius * 0.55, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "rgba(126, 232, 74, 0.46)";
      context.lineWidth = 3;
      context.beginPath();
      context.ellipse(this.x, this.y, this.radius, this.radius * 0.55, 0, 0, Math.PI * 2);
      context.stroke();
      for (const bubble of this.bubbles) {
        const pulse = Math.sin(performance.now() * 0.004 + bubble.phase) > 0 ? 1 : 0;
        pixelRect(context, this.x + bubble.x, this.y + bubble.y, bubble.size + pulse, Math.max(2, bubble.size - 1), bubble.phase > 3 ? "#193d20" : "#78df45");
      }
      context.restore();
    }
  }

  class Chest {
    constructor(x, y, tier = "normal") {
      this.x = x;
      this.y = y;
      this.tier = tier;
      this.radius = 18;
      this.opened = false;
      this.life = 0;
      this.prompt = "";
    }

    update(dt, game) {
      this.life += dt;
      if (this.opened) return;
      const close = dist(this.x, this.y, game.player.x, game.player.y) < this.radius + game.player.radius + 10;
      this.prompt = "";
      if (close) this.open(game);
    }

    open(game) {
      if (this.opened) return;
      this.opened = true;
      const rewardBias = clamp(game.killStreak / 35, 0, 4);
      const dangerBias = clamp(game.threatLevel / 25, 0, 4) + (game.noKillTimer > 15 ? 1.5 : 0);
      const table = {
        heal: 18 + rewardBias * 3,
        ammo: 24 + rewardBias * 4,
        weapon: 18 + rewardBias * 5 + (this.tier === "elite" ? 16 : 0),
        coins: 18 + rewardBias * 3,
        zombie: 6 + dangerBias * 7,
        trap: Math.max(0, dangerBias * 3 - 2)
      };
      const result = weightedChoice(table);
      if (result === "heal") {
        game.player.hp = Math.min(game.player.maxHp, game.player.hp + 34);
        game.showFloatingText(this.x, this.y - 22, "+生命", "#54e247");
      } else if (result === "ammo") {
        game.spawnAmmoPickup(this.x, this.y, null, randInt(24, 48));
      } else if (result === "weapon") {
        game.spawnWeaponPickup(this.x, this.y, rollWeaponId(), rollRarity(rewardBias * 5 + dangerBias * 2));
      } else if (result === "coins") {
        for (let i = 0; i < 6 + rewardBias; i++) game.coins.push(new Coin(this.x + rand(-16, 16), this.y + rand(-12, 12), randInt(6, 16)));
      } else if (result === "trap") {
        game.createExplosion(this.x, this.y, 75, 32, { knockback: 4, playerDamage: true });
        game.showFloatingText(this.x, this.y - 24, "陷阱！", "#ff3b35");
      } else {
        const count = game.threatLevel > 70 ? 3 : 2;
        for (let i = 0; i < count; i++) {
          const type = game.threatLevel > 65 ? weightedChoice({ redEye: 3, exploder: 2, armored: 1, fast: 2 }) : weightedChoice({ normal: 4, fast: 2, redEye: 1 });
          game.zombies.push(new Zombie(type, this.x + rand(-28, 28), this.y + rand(-22, 22), game.difficultyLevel));
        }
        game.showFloatingText(this.x, this.y - 24, "埋伏！", "#ff8a20");
      }
      for (let i = 0; i < 18; i++) {
        game.particles.push(new Particle(this.x, this.y, {
          vx: rand(-2.2, 2.2),
          vy: rand(-2.4, 0.2),
          size: randInt(2, 5),
          life: rand(0.22, 0.58),
          color: this.tier === "elite" ? "#ffd34a" : "#b87935"
        }));
      }
    }

    draw(context) {
      if (this.opened) return;
      const bob = Math.sin(this.life * 5) * 3;
      const glow = 0.35 + Math.sin(this.life * 8) * 0.15;
      const image = generatedAssets.get(this.tier === "elite" ? "chest_reward" : "chest_weapon");
      context.save();
      context.globalAlpha = 0.72;
      context.strokeStyle = this.tier === "elite" ? `rgba(255, 211, 74, ${glow})` : `rgba(243, 198, 91, ${glow})`;
      context.lineWidth = 4;
      context.beginPath();
      context.ellipse(this.x, this.y + 7, 34 + Math.sin(this.life * 6) * 3, 17, 0, 0, Math.PI * 2);
      context.stroke();
      context.restore();
      if (image) {
        context.drawImage(image, this.x - 24, this.y - 30 + bob, 48, 48);
      } else {
        drawPixelShadow(context, this.x, this.y + 13, 48, 16, 0.42);
        drawIsoBox(context, this.x, this.y - 13 + bob, 46, 29, 12, this.tier === "elite" ? "#ffd34a" : "#c78232", "#8a4f1f", "#563018", "#050505");
        drawPixelOutlineRect(context, this.x - 22, this.y - 15 + bob, 44, 9, this.tier === "elite" ? "#ffe178" : "#d19a52", "#070707", "#fff0a0", "#7c4315");
        pixelRect(context, this.x - 4, this.y - 14 + bob, 9, 13, "#151b1d");
        pixelRect(context, this.x - 2, this.y - 11 + bob, 5, 7, "#ffd34a");
        if (Math.sin(this.life * 9) > 0.25) {
          pixelRect(context, this.x - 31, this.y - 26 + bob, 4, 4, "#fff2a8");
          pixelRect(context, this.x + 28, this.y - 12 + bob, 3, 3, "#fff2a8");
        }
      }
    }

    drawPrompt(context, label) {
      const w = 72;
      drawPixelOutlineRect(context, this.x - w / 2, this.y - 48, w, 22, "rgba(9,12,12,0.9)", "#050606", "#444b48", "#050606");
      context.font = "700 12px \"Courier New\", monospace";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#f3c65b";
      context.fillText(label, this.x, this.y - 37);
    }
  }

  class WeaponPickup {
    constructor(x, y, weapon) {
      this.x = x;
      this.y = y;
      this.weapon = weapon;
      this.radius = 17;
      this.life = 0;
      this.collected = false;
    }

    update(dt, game) {
      this.life += dt;
      if (dist(this.x, this.y, game.player.x, game.player.y) < this.radius + game.player.radius + 16) {
        game.nearbyWeapon = this;
        if (game.input.consume("e")) {
          game.player.equipWeapon(this.weapon, game);
          this.collected = true;
        }
      }
    }

    draw(context) {
      const bob = Math.sin(this.life * 6) * 2;
      const rarity = getRarity(this.weapon.rarity);
      drawPixelShadow(context, this.x, this.y + 10, 34, 10, 0.3);
      context.save();
      context.strokeStyle = rarity.color;
      context.lineWidth = 3;
      context.globalAlpha = 0.65 + Math.sin(this.life * 7) * 0.2;
      context.beginPath();
      context.ellipse(this.x, this.y + 2, 24, 13, 0, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
      const image = generatedAssets.get(`weapon_${this.weapon.id}`);
      if (image) {
        context.drawImage(image, this.x - 22, this.y - 23 + bob, 44, 44);
      } else {
        withTransform(context, this.x - 18, this.y - 7 + bob, -0.12, () => drawWeaponIcon(context, this.weapon.id, 0, 0, 1.15, rarity.color));
      }
      context.restore();
    }
  }

  class AmmoPickup {
    constructor(x, y, ammoType, amount) {
      this.x = x;
      this.y = y;
      this.ammoType = ammoType;
      this.amount = amount;
      this.radius = 13;
      this.life = 0;
      this.collected = false;
    }

    update(dt, game) {
      this.life += dt;
      const d = dist(this.x, this.y, game.player.x, game.player.y);
      if (d < 130) {
        const a = angleTo(this.x, this.y, game.player.x, game.player.y);
        this.x += Math.cos(a) * 160 * dt;
        this.y += Math.sin(a) * 160 * dt;
      }
      if (d < this.radius + game.player.radius) {
        game.player.addAmmo(this.ammoType, this.amount);
        game.showFloatingText(this.x, this.y - 18, `+${this.amount} ${AMMO_LABELS[this.ammoType]}`, "#9ad7ff");
        this.collected = true;
        playCoinSound();
      }
    }

    draw(context) {
      const bob = Math.sin(this.life * 8) * 2;
      drawPixelShadow(context, this.x, this.y + 9, 22, 8, 0.26);
      drawPixelOutlineRect(context, this.x - 9, this.y - 8 + bob, 18, 15, "#2c3434", "#050606", "#9fb7c2", "#101515");
      pixelRect(context, this.x - 5, this.y - 5 + bob, 10, 4, "#d99522");
      pixelRect(context, this.x - 5, this.y + 1 + bob, 10, 3, "#f0c35c");
    }
  }

  class FloatingText {
    constructor(x, y, text, color = "#ffffff") {
      this.x = x;
      this.y = y;
      this.text = text;
      this.color = color;
      this.life = 1.1;
      this.maxLife = this.life;
    }

    update(dt) {
      this.y -= 32 * dt;
      this.life -= dt;
      return this.life > 0;
    }

    draw(context) {
      const alpha = clamp(this.life / this.maxLife, 0, 1);
      context.save();
      context.globalAlpha = alpha;
      context.font = "700 15px \"Courier New\", monospace";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#050505";
      context.fillText(this.text, this.x + 2, this.y + 2);
      context.fillStyle = this.color;
      context.fillText(this.text, this.x, this.y);
      context.restore();
    }
  }

  class BurrowWarning {
    constructor(x, y, type = "normal", delay = rand(0.8, 1.2), options = {}) {
      this.x = x;
      this.y = y;
      this.type = type;
      this.delay = delay;
      this.maxDelay = delay;
      this.radius = options.radius || 34;
      this.pressure = !!options.pressure;
      this.alive = true;
    }

    update(dt, game) {
      this.delay -= dt;
      if (Math.random() < dt * 18) {
        game.particles.push(new Particle(this.x + rand(-this.radius, this.radius), this.y + rand(-10, 10), {
          vx: rand(-0.3, 0.3),
          vy: rand(-0.7, -0.1),
          size: randInt(2, 5),
          life: rand(0.16, 0.34),
          color: Math.random() > 0.5 ? "#5a231c" : "#2a1814",
          kind: "smoke"
        }));
      }
      if (this.delay <= 0) {
        this.alive = false;
        const zombie = new Zombie(this.type, this.x, this.y, game.difficultyLevel, {
          pressure: this.pressure && game.getPressureZombieCount() < game.getPressureZombieCap()
        });
        game.zombies.push(zombie);
        game.shake = Math.max(game.shake, this.pressure ? 4 : 2);
      }
    }

    draw(context) {
      const progress = 1 - this.delay / this.maxDelay;
      const pulse = 0.35 + Math.sin(performance.now() * 0.02) * 0.18;
      context.save();
      context.globalAlpha = 0.75;
      context.strokeStyle = `rgba(255, 48, 35, ${pulse + progress * 0.35})`;
      context.lineWidth = 3;
      context.beginPath();
      context.ellipse(this.x, this.y, this.radius + progress * 8, (this.radius + progress * 8) * 0.55, 0, 0, Math.PI * 2);
      context.stroke();
      const image = generatedAssets.get("burrow_crack");
      if (image) {
        context.drawImage(image, this.x - 28, this.y - 22, 56, 44);
      } else {
        context.strokeStyle = "#070707";
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(this.x - 24, this.y);
        context.lineTo(this.x - 8, this.y + 3);
        context.lineTo(this.x + 2, this.y - 8);
        context.lineTo(this.x + 13, this.y + 4);
        context.lineTo(this.x + 28, this.y + 2);
        context.moveTo(this.x + 2, this.y - 8);
        context.lineTo(this.x - 3, this.y - 20);
        context.moveTo(this.x + 10, this.y + 4);
        context.lineTo(this.x + 7, this.y + 17);
        context.stroke();
        pixelRect(context, this.x - 6, this.y - 4 - progress * 8, 5, 14, "#6f8f5a");
        pixelRect(context, this.x + 3, this.y - 1 - progress * 6, 5, 12, "#5b744b");
      }
      context.restore();
    }
  }

  class Zombie {
    constructor(type, x, y, difficultyLevel = 1, options = {}) {
      const defs = {
        normal: { hp: 50, speed: 1.0, maxSpeed: 2.0, radius: 15, reward: 5, skin: "#9ead70", shirt: "#34463b", pants: "#263238", damage: 10 },
        fast: { hp: 35, speed: 1.6, maxSpeed: 2.6, radius: 12, reward: 8, skin: "#b4d47c", shirt: "#40503a", pants: "#1f2d2e", damage: 8 },
        tank: { hp: 160, speed: 0.65, maxSpeed: 1.45, radius: 24, reward: 15, skin: "#8fa36c", shirt: "#59644e", pants: "#263238", damage: 18 },
        redEye: { hp: 60, speed: 2.0, maxSpeed: 3.2, radius: 13, reward: 12, skin: "#6f8f5a", shirt: "#1f3028", pants: "#182526", damage: 12 },
        hunter: { hp: 95, speed: 2.25, maxSpeed: 3.65, radius: 13, reward: 28, skin: "#8b3030", shirt: "#271619", pants: "#18161a", damage: 15 },
        armored: { hp: 260, speed: 0.55, maxSpeed: 1.25, radius: 22, reward: 25, skin: "#88907d", shirt: "#626a67", pants: "#293032", damage: 20 },
        exploder: { hp: 70, speed: 1.1, maxSpeed: 1.85, radius: 16, reward: 18, skin: "#9a8d54", shirt: "#673026", pants: "#2a2721", damage: 35 },
        poison: { hp: 80, speed: 0.9, maxSpeed: 1.75, radius: 16, reward: 16, skin: "#7bdc4a", shirt: "#25422d", pants: "#202729", damage: 10 }
      };
      const normalizedType = type === "fat" ? "tank" : type;
      Object.assign(this, defs[normalizedType] || defs.normal);
      this.type = normalizedType;
      this.x = x;
      this.y = y;
      const hpGrowth = this.type === "armored" ? 0.11 : 0.08;
      this.hp = Math.round(this.hp * (1 + difficultyLevel * hpGrowth));
      this.speed = Math.min(this.speed * (1 + difficultyLevel * 0.035), this.maxSpeed);
      this.maxHp = this.hp;
      this.alive = true;
      this.hitFlash = 0;
      this.attackTimer = rand(0, 0.25);
      this.walk = rand(0, Math.PI * 2);
      this.angle = 0;
      this.exploding = false;
      this.explodeTimer = 0;
      this.explodeDelay = 1.2;
      this.explodeRadius = 90;
      this.exploded = false;
      this.trailTimer = 0;
      this.isPressure = !!options.pressure;
      this.burnTimer = 0;
      this.burnDps = 0;
      this.burnTick = 0;
      this.stunTimer = 0;
    }

    update(dt, game) {
      if (!this.alive) return;
      if (this.burnTimer > 0) {
        this.burnTimer -= dt;
        this.burnTick -= dt;
        if (this.burnTick <= 0) {
          this.burnTick = 0.35;
          this.takeDamage(this.burnDps * 0.35, game, { dot: true, weaponId: "flamethrower" });
          game.particles.push(new Particle(this.x + rand(-10, 10), this.y + rand(-16, 8), {
            vx: rand(-0.25, 0.25),
            vy: rand(-0.7, -0.1),
            size: randInt(3, 7),
            life: rand(0.16, 0.34),
            color: Math.random() > 0.5 ? "#ff6b1f" : "#ffd45a",
            kind: "spark"
          }));
        }
      }
      this.stunTimer = Math.max(0, this.stunTimer - dt);
      if (this.type === "exploder") this.updateExploder(dt, game);
      const player = game.player;
      const lead = this.type === "hunter" ? 22 : 0;
      const targetX = player.x + Math.cos(player.moveAngle || player.aimAngle) * lead * Math.min(1, game.playerSpeedRatio || 0);
      const targetY = player.y + Math.sin(player.moveAngle || player.aimAngle) * lead * Math.min(1, game.playerSpeedRatio || 0);
      this.angle = angleTo(this.x, this.y, targetX, targetY);
      const slowed = (this.exploding ? 0.22 : 1) * (this.stunTimer > 0 ? 0.35 : 1);
      const huntBoost = game.huntMode ? (this.type === "hunter" ? 1.08 : 1.14 + game.threatLevel * 0.0008) : 1;
      const wobbleSpeed = this.type === "hunter" || this.type === "redEye" ? 18 : this.type === "fast" ? 12 : 7;
      const wobble = Math.sin(game.elapsed * wobbleSpeed + this.walk) * 0.28;
      this.x += Math.cos(this.angle + wobble) * this.speed * huntBoost * slowed * 60 * dt;
      this.y += Math.sin(this.angle + wobble) * this.speed * huntBoost * slowed * 60 * dt;
      this.hitFlash = Math.max(0, this.hitFlash - dt);
      this.attackTimer -= dt;

      if (this.type === "redEye" || this.type === "hunter") {
        this.trailTimer -= dt;
        if (this.trailTimer <= 0) {
          this.trailTimer = 0.08;
          game.particles.push(new Particle(this.x - Math.cos(this.angle) * 12, this.y - Math.sin(this.angle) * 12, {
            vx: rand(-0.2, 0.2),
            vy: rand(-0.2, 0.2),
            size: randInt(3, 6),
            life: 0.25,
            color: this.type === "hunter" ? "#7b161f" : "#5b1114",
            kind: "smoke"
          }));
        }
      }

      if (dist(this.x, this.y, player.x, player.y) < this.radius + player.radius - 2 && this.attackTimer <= 0 && !this.exploding) {
        player.takeDamage(this.damage, game);
        this.attackTimer = 0.6;
      }
    }

    startExplode(game) {
      if (this.exploding || this.exploded) return;
      this.exploding = true;
      this.explodeTimer = this.explodeDelay;
      game.shake = Math.max(game.shake, 3);
    }

    updateExploder(dt, game) {
      const playerDistance = dist(this.x, this.y, game.player.x, game.player.y);
      if (playerDistance < 90) this.startExplode(game);
      if (!this.exploding) return;
      this.explodeTimer -= dt;
      if (Math.random() < dt * 18) {
        game.particles.push(new Particle(this.x + rand(-10, 10), this.y + rand(-10, 10), {
          vx: rand(-0.45, 0.45),
          vy: rand(-0.45, 0.45),
          size: randInt(3, 7),
          life: 0.22,
          color: Math.random() > 0.5 ? "#ff4b22" : "#ffb22a",
          kind: "spark"
        }));
      }
      if (this.explodeTimer <= 0) this.explode(game);
    }

    explode(game) {
      if (this.exploded) return;
      this.exploded = true;
      this.alive = false;
      game.deathSprites.push(new DeathSprite(this.x, this.y, this.type, this.angle, SPRITE_ROWS.special));
      game.shake = Math.max(game.shake, 14);
      if (dist(this.x, this.y, game.player.x, game.player.y) < this.explodeRadius + game.player.radius) {
        game.player.takeDamage(35, game);
      }
      for (const zombie of game.zombies) {
        if (zombie !== this && zombie.alive && dist(this.x, this.y, zombie.x, zombie.y) < this.explodeRadius + zombie.radius) {
          zombie.takeDamage(45, game);
        }
      }
      for (let i = 0; i < 42; i++) {
        const a = rand(0, Math.PI * 2);
        const s = rand(1.2, 5.2);
        game.particles.push(new Particle(this.x, this.y, {
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          size: randInt(3, 8),
          life: rand(0.24, 0.75),
          color: Math.random() > 0.5 ? "#ff5a22" : "#ffb02a",
          kind: Math.random() > 0.38 ? "spark" : "chunk"
        }));
      }
      playZombieDeathSound();
    }

    takeDamage(amount, game, meta = {}) {
      let finalDamage = amount;
      if (this.type === "armored") {
        finalDamage *= meta.weaponId === "flamethrower" ? 0.62 : 0.8;
        for (let i = 0; i < 6; i++) {
          game.particles.push(new Particle(this.x + rand(-10, 10), this.y + rand(-10, 10), {
            vx: rand(-2.2, 2.2),
            vy: rand(-2.2, 2.2),
            size: randInt(2, 4),
            life: rand(0.15, 0.35),
            color: Math.random() > 0.5 ? "#f8f0c6" : "#ffd45a",
            kind: "spark"
          }));
        }
      }
      if (meta.crit) finalDamage *= 1.7;
      if (meta.knockback) {
        const a = meta.angle ?? angleTo(game.player.x, game.player.y, this.x, this.y);
        this.x += Math.cos(a) * meta.knockback * 5;
        this.y += Math.sin(a) * meta.knockback * 5;
      }
      if (meta.burn) {
        this.burnTimer = Math.max(this.burnTimer, meta.burn);
        this.burnDps = Math.max(this.burnDps, meta.weaponId === "grenade" ? 8 : 12);
      }
      if (meta.stun && Math.random() < meta.stun) this.stunTimer = Math.max(this.stunTimer, 0.55);
      this.hp -= finalDamage;
      this.hitFlash = 0.08;
      if (this.hp <= 0) this.die(game);
    }

    die(game) {
      if (!this.alive) return;
      if (this.type === "exploder" && !this.exploded) {
        game.kills += 1;
        game.handleZombieKilled(this);
        game.coins.push(new Coin(this.x + rand(-8, 8), this.y + rand(-8, 8), game.getCoinValue(this.reward)));
        this.explode(game);
        return;
      }
      this.alive = false;
      game.kills += 1;
      game.handleZombieKilled(this);
      game.deathSprites.push(new DeathSprite(this.x, this.y, this.type, this.angle, this.type === "poison" ? SPRITE_ROWS.special : SPRITE_ROWS.hit));
      game.coins.push(new Coin(this.x + rand(-8, 8), this.y + rand(-8, 8), game.getCoinValue(this.reward)));
      if (this.type === "poison") game.poisonPools.push(new PoisonPool(this.x, this.y));
      const count = this.type === "tank" || this.type === "armored" ? 34 : 20;
      for (let i = 0; i < count; i++) {
        const a = rand(0, Math.PI * 2);
        const s = rand(0.6, this.type === "tank" || this.type === "armored" ? 3.9 : 2.9);
        const poison = this.type === "poison";
        game.particles.push(new Particle(this.x, this.y, {
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          size: randInt(2, this.type === "tank" || this.type === "armored" ? 7 : 5),
          life: rand(0.28, 0.9),
          color: poison ? "#6fe33f" : Math.random() > 0.5 ? "#5ea638" : "#6d1610",
          kind: Math.random() > 0.25 ? "blood" : "chunk"
        }));
      }
      playZombieDeathSound();
    }

    draw(context, elapsed, renderAlpha = 1) {
      const sprite = spriteAssets.get(this.type) || (this.type === "hunter" ? spriteAssets.get("redEye") : null);
      if (sprite) {
        context.save();
        context.globalAlpha *= renderAlpha;
        if (this.type === "exploder" && this.exploding) {
          context.globalAlpha *= 0.82 + Math.sin(elapsed * 28) * 0.18;
          context.strokeStyle = "rgba(255, 70, 22, 0.65)";
          context.lineWidth = 3;
          context.beginPath();
          context.ellipse(this.x, this.y, this.explodeRadius, this.explodeRadius * 0.58, 0, 0, Math.PI * 2);
          context.stroke();
        }
        const bulky = this.type === "tank" || this.type === "armored";
        const slim = this.type === "fast" || this.type === "redEye" || this.type === "hunter";
        const row = this.hitFlash > 0
          ? SPRITE_ROWS.hit
          : this.exploding || this.type === "poison" && Math.sin(elapsed * 7 + this.walk) > 0.78
            ? SPRITE_ROWS.special
            : this.attackTimer > 0.42
              ? SPRITE_ROWS.attack
              : SPRITE_ROWS.move;
        const frameRate = this.type === "redEye" || this.type === "hunter" || this.type === "fast" ? 11 : bulky ? 6 : 8;
        const frame = Math.floor((elapsed * frameRate + this.walk) % SPRITE_COLS);
        const scale = bulky ? 0.96 : slim ? 0.64 : this.type === "exploder" ? 0.8 : 0.72;
        if (this.type === "redEye" || this.type === "hunter") {
          drawCharacterSprite(context, sprite, {
            row: SPRITE_ROWS.move,
            frame,
            x: this.x - Math.cos(this.angle) * 14,
            y: this.y - Math.sin(this.angle) * 14,
            angle: this.angle,
            scale,
            alpha: 0.22
          });
        }
        drawCharacterSprite(context, sprite, {
          row,
          frame,
          x: this.x,
          y: this.y,
          angle: this.angle,
          scale,
          bob: Math.sin(elapsed * (slim ? 18 : 9) + this.walk) * (slim ? 1.2 : 0.8)
        });
        const w = this.radius * 2;
        const y = this.y - this.radius - 14;
        drawSpriteHealthBar(context, this.x, y, w, this.hp / this.maxHp, this.type === "armored" ? "#c8c8b8" : "#df3028");
        context.restore();
        return;
      }
      const scale = this.type === "tank" || this.type === "armored" ? 1.32 : this.type === "fast" || this.type === "redEye" || this.type === "hunter" ? 0.86 : 1;
      const step = Math.sin(elapsed * (this.type === "redEye" || this.type === "hunter" ? 18 : this.type === "fast" ? 16 : 9) + this.walk);
      const skinPalettes = {
        normal: ["#4f6041", "#8ea66a", "#c2d68b"],
        fast: ["#557044", "#a6c872", "#d6ef91"],
        tank: ["#566144", "#8fa36c", "#c1cf8c"],
        redEye: ["#2b3d30", "#6f8f5a", "#a6c36d"],
        hunter: ["#321014", "#8b3030", "#ff6d6d"],
        armored: ["#535b56", "#88907d", "#c8c8b8"],
        exploder: ["#554126", "#9a8d54", "#d6bd6b"],
        poison: ["#23512a", "#62c83d", "#a6f56d"]
      };
      const skinPalette = skinPalettes[this.type] || skinPalettes.normal;
      const colorSkin = this.hitFlash > 0 ? "#f2f2c8" : skinPalette[1];
      const skinDark = skinPalette[0];
      const skinLight = this.hitFlash > 0 ? "#fff5b2" : skinPalette[2];
      context.save();
      context.globalAlpha *= renderAlpha;
      if (this.type === "exploder" && this.exploding) {
        context.globalAlpha *= 0.8 + Math.sin(elapsed * 28) * 0.2;
        context.strokeStyle = "rgba(255, 70, 22, 0.65)";
        context.lineWidth = 3;
        context.beginPath();
        context.ellipse(this.x, this.y, this.explodeRadius, this.explodeRadius * 0.58, 0, 0, Math.PI * 2);
        context.stroke();
      }
      drawPixelShadow(context, this.x + 2, this.y + this.radius * 0.72, this.radius * 2.35, this.radius * 0.8, 0.34);
      withTransform(context, this.x, this.y, this.angle, () => {
        const shirt = this.hitFlash > 0 ? "#fff0a8" : this.shirt;
        const bulky = this.type === "tank" || this.type === "armored";
        const slim = this.type === "fast" || this.type === "redEye" || this.type === "hunter";
        const bodyW = bulky ? 34 : slim ? 17 : 23;
        const bodyH = bulky ? 30 : slim ? 25 : 27;
        const headScale = bulky ? 1.12 : slim ? 0.86 : 1;
        const lean = this.type === "fast" || this.type === "redEye" || this.type === "hunter" ? -4 : 0;
        const clothPalette = { outline: "#050606", clothMid: shirt, clothLight: "#778766", clothDark: "#202922" };
        const skinLimb = { outline: "#050606", mid: colorSkin, light: skinLight, dark: skinDark };
        const pantsLimb = { outline: "#050606", mid: "#1b2628", light: "#3b4741", dark: "#080d0e" };

        drawIsoLimb(context, -9 * scale + lean, 10 * scale + step, 8 * scale, 14 * scale, pantsLimb, slim ? -0.42 : -0.12);
        drawIsoLimb(context, 4 * scale + lean, 10 * scale - step, 8 * scale, 14 * scale, pantsLimb, slim ? 0.36 : 0.12);
        pixelRect(context, -11 * scale + lean, 21 * scale + step, 12 * scale, 4 * scale, "#090b0b");
        pixelRect(context, 4 * scale + lean, 21 * scale - step, 12 * scale, 4 * scale, "#090b0b");
        drawIsoLimb(context, -bodyW / 2 + lean - 9, -7 * scale + step, 7, 19 * scale, skinLimb, slim ? -0.35 : -0.18);
        drawIsoLimb(context, bodyW / 2 + lean + 1, -8 * scale - step, 7, 19 * scale, skinLimb, slim ? 0.32 : 0.16);
        drawIsoTorso(context, -bodyW / 2 + lean, -12 * scale, bodyW, bodyH, clothPalette, { slant: bulky ? 8 : 6 });
        pixelRect(context, -bodyW / 2 + lean + 2, -10 * scale, 7, 5, "#7f9161");
        pixelRect(context, bodyW / 2 + lean - 8, 7 * scale, 6, 8, "#17211b");
        if (this.type === "tank") {
          drawIsoTorso(context, -18, -4, 36, 24, {
            outline: "#050606",
            clothMid: "#7f8f64",
            clothLight: "#b9c987",
            clothDark: "#424b36"
          }, { slant: 9 });
          pixelRect(context, -12, 0, 18, 5, "#aebf82");
          pixelRect(context, 8, 7, 8, 9, "#3b4431");
          pixelRect(context, -15, 11, 8, 5, "#5e2218");
        }
        if (this.type === "armored") {
          pixelRect(context, -14, -11, 28, 11, "#9aa19d");
          pixelRect(context, -12, -9, 10, 4, "#d3d5c8");
          pixelRect(context, -11, 2, 23, 12, "#5e6764");
          pixelRect(context, 5, -8, 8, 20, "#303738");
          pixelRect(context, -13, 7, 7, 5, "#a4aaa4");
        }
        if (this.type === "exploder") {
          pixelRect(context, -8, -8, 16, 5, "#e25121");
          pixelRect(context, -3, -4, 6, 15, "#ff9c22");
          pixelRect(context, 5, -9, 5, 5, "#ffdc63");
        }
        if (this.type === "poison") {
          pixelRect(context, -10, -7, 6, 18, "#57c936");
          pixelRect(context, 5, 3, 6, 8, "#9af05a");
          pixelRect(context, -1, -9, 5, 5, "#b7ff77");
        }
        pixelRect(context, -bodyW / 2 + lean + 3, -8 * scale, 5, bodyH - 4, "#1b2b2d");
        pixelRect(context, bodyW / 2 + lean - 7, -4 * scale, 5, bodyH - 7, "#202a26");
        drawIsoHead(context, 3 * scale + lean, -22 * scale, headScale, {
          outline: "#050606",
          skinMid: colorSkin,
          skinLight,
          skinDark,
          hairDark: "#2a2418",
          hairMid: "#47331f",
          hairLight: "#6d512e",
          mouth: "#301413"
        }, {
          eye: this.type === "redEye" || this.type === "hunter" ? "#ff1e22" : "#e8e6b5",
          eyeGlow: this.type === "redEye" || this.type === "hunter" ? "rgba(255,0,0,0.35)" : null
        });
        const eye = this.type === "redEye" || this.type === "hunter" ? "#ff1e22" : "#e8e6b5";
        pixelRect(context, 8 * scale + lean, -14 * scale, 3 * scale, 3 * scale, eye);
        pixelRect(context, 15 * scale + lean, -13 * scale, 3 * scale, 3 * scale, eye);
        if (this.type === "redEye" || this.type === "hunter") {
          pixelRect(context, 7 * scale + lean, -15 * scale, 5 * scale, 5 * scale, "rgba(255,0,0,0.35)");
          pixelRect(context, 14 * scale + lean, -14 * scale, 5 * scale, 5 * scale, "rgba(255,0,0,0.35)");
        }
        pixelRect(context, -bodyW / 2 + lean + 3, -9 * scale, 4, 4, "#6d1712");
        pixelRect(context, bodyW / 2 + lean - 8, 9 * scale, 5, 3, "#6d1712");
        if (slim) {
          pixelRect(context, -10, -18, 5, 6, this.type === "redEye" || this.type === "hunter" ? "#641414" : "#89c15d");
          pixelRect(context, -2, 13, 4, 7, this.type === "redEye" || this.type === "hunter" ? "#7d1919" : "#8fd163");
        }
      });

      const w = this.radius * 2;
      const y = this.y - this.radius - 14;
      drawPixelOutlineRect(context, this.x - w / 2 - 1, y - 1, w + 2, 6, "#111", "#050505");
      pixelRect(context, this.x - w / 2, y + 1, w * clamp(this.hp / this.maxHp, 0, 1), 2, this.type === "armored" ? "#c8c8b8" : "#df3028");
      context.restore();
    }
  }

  class DeathSprite {
    constructor(x, y, type, angle, row) {
      this.x = x;
      this.y = y;
      this.type = type;
      this.angle = angle;
      this.row = row;
      this.life = 0.55;
      this.maxLife = this.life;
      this.frameOffset = randInt(2, 5);
    }

    update(dt) {
      this.life -= dt;
      return this.life > 0;
    }

    draw(context) {
      const image = spriteAssets.get(this.type) || (this.type === "hunter" ? spriteAssets.get("redEye") : null);
      if (!image) return;
      const progress = 1 - this.life / this.maxLife;
      const bulky = this.type === "tank" || this.type === "armored";
      const slim = this.type === "fast" || this.type === "redEye";
      const scale = bulky ? 0.96 : slim ? 0.64 : this.type === "exploder" ? 0.8 : 0.72;
      drawCharacterSprite(context, image, {
        row: this.row,
        frame: Math.min(5, this.frameOffset + Math.floor(progress * 3)),
        x: this.x,
        y: this.y + progress * 5,
        angle: this.angle + progress * 0.2,
        scale,
        alpha: clamp(this.life / this.maxLife, 0, 1)
      });
    }
  }

  class Player {
    constructor(game) {
      this.x = game.width / 2;
      this.y = game.height / 2;
      this.radius = 14;
      this.aimAngle = 0;
      this.moveAngle = 0;
      this.walk = 0;
      this.hurtFlash = 0;
      this.dashCooldown = 0;
      this.maxDashCooldown = 3;
      this.reloading = false;
      this.reloadTimer = 0;
      this.fireTimer = 0;
      this.dashVisualTimer = 0;
      this.applyUpgrades(game.save.upgrades);
      this.weapon = createWeapon("pistol", "common");
      this.ammoInventory = {
        lightAmmo: 96,
        rifleAmmo: 48,
        shellAmmo: 20,
        fuelAmmo: 90,
        energyAmmo: 50,
        explosiveAmmo: 8
      };
      this.legendaryShotCounter = 0;
      this.sniperKillBoost = 0;
      this.hp = this.maxHp;
      this.syncWeaponStats();
      this.ammo = this.magSize;
    }

    applyUpgrades(upgrades) {
      this.damageBonus = 1 + (upgrades.damage - 1) * 0.12;
      this.fireRateBonus = 1 + (upgrades.fireRate - 1) * 0.075;
      this.maxHp = 100 + (upgrades.maxHp - 1) * 20;
      this.speed = 3.2 + (upgrades.speed - 1) * 0.15;
      this.magazineBonus = (upgrades.magazine || 1) - 1;
    }

    syncWeaponStats() {
      this.damage = Math.round(this.weapon.damage * this.damageBonus);
      this.fireInterval = Math.max(0.035, 1 / Math.max(0.1, this.weapon.fireRate * this.fireRateBonus));
      this.magSize = Math.max(1, this.weapon.magazineSize + this.magazineBonus * (this.weapon.projectileType === "pellet" ? 1 : 2));
      this.reloadDuration = this.weapon.reloadTime;
      this.bulletSpeed = this.weapon.bulletSpeed;
    }

    equipWeapon(weapon, game) {
      const previous = this.weapon;
      this.weapon = createWeapon(weapon.id, weapon.rarity);
      this.syncWeaponStats();
      this.ammo = this.magSize;
      this.reloading = false;
      this.reloadTimer = 0;
      if (previous && previous.id !== this.weapon.id) {
        this.addAmmo(previous.ammoType, Math.ceil(previous.magazineSize * 0.55));
      }
      game.showFloatingText(this.x, this.y - 34, `${this.weapon.rarityName} ${this.weapon.name}`, this.weapon.rarityColor);
    }

    addAmmo(type, amount) {
      const ammoType = type || this.weapon.ammoType;
      this.ammoInventory[ammoType] = clamp((this.ammoInventory[ammoType] || 0) + amount, 0, AMMO_CAPS[ammoType] || 200);
    }

    getReserveAmmo() {
      return this.ammoInventory[this.weapon.ammoType] || 0;
    }

    update(dt, game) {
      const input = game.input;
      this.aimAngle = angleTo(this.x, this.y, game.mouse.x, game.mouse.y);
      this.fireTimer = Math.max(0, this.fireTimer - dt);
      this.dashCooldown = Math.max(0, this.dashCooldown - dt);
      this.dashVisualTimer = Math.max(0, this.dashVisualTimer - dt);
      this.hurtFlash = Math.max(0, this.hurtFlash - dt);

      let mx = 0;
      let my = 0;
      if (input.keys.has("w")) my -= 1;
      if (input.keys.has("s")) my += 1;
      if (input.keys.has("a")) mx -= 1;
      if (input.keys.has("d")) mx += 1;
      if (input.keys.has("arrowup")) my -= 1;
      if (input.keys.has("arrowdown")) my += 1;
      if (input.keys.has("arrowleft")) mx -= 1;
      if (input.keys.has("arrowright")) mx += 1;
      if (game.touch.moveActive) {
        mx = game.touch.moveVector.x;
        my = game.touch.moveVector.y;
      }
      const moving = mx !== 0 || my !== 0;
      game.playerSpeedRatio = moving ? 1 : 0;
      if (moving) {
        const len = Math.hypot(mx, my);
        mx /= len;
        my /= len;
        this.moveAngle = Math.atan2(my, mx);
        if (game.touch.moveActive && !game.touch.fireDown) this.aimAngle = this.moveAngle;
        this.x += mx * this.speed * 60 * dt;
        this.y += my * this.speed * 60 * dt;
        this.walk += dt * 12;
      }

      if (game.touch.fireDown) {
        const target = game.getAimAssistTarget();
        if (target) this.aimAngle = angleTo(this.x, this.y, target.x, target.y);
        else if (moving) this.aimAngle = this.moveAngle;
      }

      this.x = clamp(this.x, this.radius, game.width - this.radius);
      this.y = clamp(this.y, this.radius, game.height - this.radius);

      const dashRequested = input.consume(" ") || game.touch.dashQueued;
      game.touch.dashQueued = false;
      if (dashRequested && this.dashCooldown <= 0) this.dash(game, mx, my);
      const reloadRequested = input.consume("r") || game.touch.reloadQueued;
      game.touch.reloadQueued = false;
      if (reloadRequested) this.reload();
      if (this.reloading) {
        this.reloadTimer -= dt;
        if (this.reloadTimer <= 0) {
          this.reloading = false;
          const need = this.magSize - this.ammo;
          const reserve = this.getReserveAmmo();
          const loaded = Math.min(need, reserve);
          this.ammo += loaded;
          this.ammoInventory[this.weapon.ammoType] = reserve - loaded;
        }
      }

      if (game.mouse.down || game.touch.fireDown) this.shoot(game);
    }

    dash(game, mx, my) {
      let dx = mx;
      let dy = my;
      if (dx === 0 && dy === 0) {
        dx = Math.cos(this.aimAngle);
        dy = Math.sin(this.aimAngle);
      }
      for (let i = 0; i < 12; i++) {
        game.particles.push(new Particle(this.x + rand(-9, 9), this.y + rand(-9, 9), {
          vx: -dx * rand(0.4, 1.5) + rand(-0.4, 0.4),
          vy: -dy * rand(0.4, 1.5) + rand(-0.4, 0.4),
          size: randInt(2, 4),
          life: rand(0.18, 0.4),
          color: "#aeb8ab"
        }));
      }
      this.x = clamp(this.x + dx * 112, this.radius, game.width - this.radius);
      this.y = clamp(this.y + dy * 112, this.radius, game.height - this.radius);
      this.dashCooldown = this.maxDashCooldown;
      this.dashVisualTimer = 0.2;
      game.recordPlayerDash();
      game.shake = Math.max(game.shake, 5);
    }

    shoot(game) {
      if (this.reloading || this.fireTimer > 0 || this.ammo <= 0) return;
      this.fireTimer = this.fireInterval;
      this.ammo -= 1;
      game.recordPlayerShot();
      const muzzleX = this.x + Math.cos(this.aimAngle) * 24;
      const muzzleY = this.y + Math.sin(this.aimAngle) * 24;
      this.fireWeaponProjectiles(game, muzzleX, muzzleY);
      game.spawnMuzzleFlash(muzzleX, muzzleY, this.aimAngle, this.weapon);
      game.shake = Math.max(game.shake, this.weapon.screenShake);
      playWeaponSound(this.weapon.soundType);
    }

    fireWeaponProjectiles(game, muzzleX, muzzleY) {
      const weapon = this.weapon;
      const legendary = weapon.rarity === "legendary" || weapon.rarity === "mutated";
      let damage = this.damage + (this.sniperKillBoost || 0);
      let crit = Math.random() < weapon.critChance;
      this.legendaryShotCounter += 1;
      if (legendary && weapon.id === "pistol" && this.legendaryShotCounter % 6 === 0) crit = true;
      if (crit) damage *= 1.45;
      const baseOptions = {
        speed: weapon.bulletSpeed,
        pierce: weapon.pierce + (legendary && weapon.id === "sniper" ? 1 : 0),
        knockback: weapon.knockback,
        weaponId: weapon.id,
        crit,
        color: weapon.projectileType === "tesla" ? "#99f2ff" : weapon.id === "sniper" ? "#f5f7ff" : "#ffb12c",
        glow: weapon.projectileType === "tesla" ? "#59cfff" : weapon.id === "sniper" ? "#ffffff" : "#ffcc48"
      };
      if (weapon.id === "smg" && legendary) baseOptions.homing = 2.1;
      if (weapon.projectileType === "pellet") {
        const pellets = weapon.pelletCount || 7;
        for (let i = 0; i < pellets; i++) {
          const a = this.aimAngle + rand(-weapon.spread, weapon.spread);
          game.bullets.push(new Bullet(muzzleX, muzzleY, a, damage, {
            ...baseOptions,
            speed: weapon.bulletSpeed * rand(0.88, 1.08),
            radius: 4,
            range: 430,
            falloffStart: 115,
            falloffEnd: 430
          }));
        }
      } else if (weapon.projectileType === "flame") {
        for (let i = 0; i < 2; i++) {
          game.bullets.push(new Bullet(muzzleX, muzzleY, this.aimAngle + rand(-weapon.spread, weapon.spread), damage, {
            ...baseOptions,
            radius: 15,
            range: 205 + weapon.specialPower * 18,
            burn: legendary ? 3.4 : 2.3,
            pierce: 4,
            color: "#ff6b1f",
            glow: "#ffd45a"
          }));
        }
      } else if (weapon.projectileType === "tesla") {
        game.fireTesla(muzzleX, muzzleY, this.aimAngle, damage, weapon, crit);
      } else if (weapon.projectileType === "grenade") {
        game.bullets.push(new GrenadeProjectile(muzzleX, muzzleY, this.aimAngle + rand(-weapon.spread, weapon.spread), weapon));
      } else {
        game.bullets.push(new Bullet(muzzleX, muzzleY, this.aimAngle + rand(-weapon.spread, weapon.spread), damage, {
          ...baseOptions,
          radius: weapon.id === "sniper" ? 5 : 4,
          range: weapon.id === "sniper" ? 1300 : 900
        }));
      }
      this.sniperKillBoost = 0;
    }

    spawnLegacyMuzzle(game, muzzleX, muzzleY) {
      game.particles.push(new Particle(muzzleX, muzzleY, {
        vx: 0,
        vy: 0,
        size: 6,
        life: 0.055,
        color: "#ffed77",
        kind: "muzzle",
        angle: this.aimAngle
      }));
      for (let i = 0; i < 9; i++) {
        game.particles.push(new Particle(muzzleX, muzzleY, {
          vx: Math.cos(this.aimAngle) * rand(1, 3) + rand(-0.7, 0.7),
          vy: Math.sin(this.aimAngle) * rand(1, 3) + rand(-0.7, 0.7),
          size: randInt(2, 6),
          life: rand(0.05, 0.18),
          color: Math.random() > 0.45 ? "#ffed77" : "#ff7f1d",
          kind: "spark"
        }));
      }
    }

    reload() {
      if (this.reloading || this.ammo === this.magSize) return;
      if (this.getReserveAmmo() <= 0) return;
      this.reloading = true;
      this.reloadTimer = this.reloadDuration;
    }

    takeDamage(amount, game) {
      this.hp = Math.max(0, this.hp - amount);
      this.hurtFlash = 0.22;
      game.damageFlash = 0.34;
      game.shake = Math.max(game.shake, 8);
      playPlayerHurtSound();
      if (this.hp <= 0) game.endGame();
    }

    draw(context) {
      const sprite = spriteAssets.get("survivor");
      if (sprite) {
        const moving = this.walk > 0 && Math.abs(Math.sin(this.walk)) > 0.08;
        const recentlyShot = this.fireTimer > Math.max(0.03, this.fireInterval * 0.45);
        const row = this.hurtFlash > 0
          ? SPRITE_ROWS.hit
          : this.dashVisualTimer > 0 || this.reloading
            ? SPRITE_ROWS.special
            : recentlyShot
              ? SPRITE_ROWS.attack
              : moving
                ? SPRITE_ROWS.move
                : SPRITE_ROWS.idle;
        const frameSpeed = row === SPRITE_ROWS.move ? 0.42 : row === SPRITE_ROWS.attack ? 0.7 : 0.34;
        const frame = Math.floor(this.walk * frameSpeed + performance.now() * 0.006) % SPRITE_COLS;
        const bodyAngle = this.aimAngle * 0.82 + this.moveAngle * 0.18;
        if (this.dashVisualTimer > 0) {
          for (let i = 1; i <= 3; i++) {
            drawCharacterSprite(context, sprite, {
              row,
              frame: Math.max(0, frame - i),
              x: this.x - Math.cos(this.aimAngle) * i * 13,
              y: this.y - Math.sin(this.aimAngle) * i * 13,
              angle: bodyAngle,
              scale: 0.78,
              alpha: 0.18 / i
            });
          }
        }
        drawCharacterSprite(context, sprite, {
          row,
          frame,
          x: this.x,
          y: this.y,
          angle: bodyAngle,
          scale: 0.78,
          bob: row === SPRITE_ROWS.idle ? Math.sin(performance.now() * 0.004) * 1.2 : 0
        });
        drawSpriteHealthBar(context, this.x, this.y + 25, 36, this.hp / this.maxHp, "#54e247");
        return;
      }
      const step = Math.sin(this.walk) * 2;
      const bodyAngle = this.aimAngle * 0.7 + this.moveAngle * 0.3;
      drawSpriteFeetShadow(context, this.x + 2, this.y + 24, 44, 15, 0.44);
      withTransform(context, this.x, this.y, bodyAngle, () => {
        const palette = {
          outline: "#050606",
          skinDark: "#7c4a2e",
          skinMid: "#c8874d",
          skinLight: "#e8b978",
          hairDark: "#1a0f08",
          hairMid: "#3e2412",
          hairLight: "#7a4a22",
          mouth: "#64291f",
          clothDark: this.hurtFlash > 0 ? "#44100d" : "#0f1b1f",
          clothMid: this.hurtFlash > 0 ? "#8f3028" : "#29434b",
          clothLight: this.hurtFlash > 0 ? "#d4634d" : "#668790"
        };
        const clothPalette = {
          outline: palette.outline,
          clothDark: palette.clothDark,
          clothMid: palette.clothMid,
          clothLight: palette.clothLight
        };
        const bootPalette = { outline: palette.outline, mid: "#172429", light: "#40555a", dark: "#070d0f" };
        const skinPalette = { outline: palette.outline, mid: palette.skinMid, light: palette.skinLight, dark: palette.skinDark };

        drawIsoLimb(context, -12, 8 + step, 8, 15, bootPalette, -0.08);
        drawIsoLimb(context, 4, 9 - step, 8, 15, bootPalette, 0.08);
        pixelRect(context, -13, 22 + step, 12, 5, "#080b0c");
        pixelRect(context, 4, 22 - step, 12, 5, "#080b0c");
        drawIsoLimb(context, -17, -8, 7, 21, { outline: palette.outline, mid: "#4d3929", light: "#806247", dark: "#1d1510" }, -0.12);
        drawIsoLimb(context, 9, -7, 8, 20, skinPalette, 0.08);
        drawIsoTorso(context, -13, -12, 27, 29, clothPalette, { slant: 7 });
        pixelRect(context, -8, -9, 7, 22, palette.clothDark);
        pixelRect(context, 4, -5, 6, 17, "#182b31");
        pixelRect(context, -10, -11, 9, 5, "#7a98a0");
        pixelRect(context, -6, -1, 4, 4, "#8c642e");
        pixelRect(context, 4, 4, 4, 4, "#8c642e");
        drawIsoHead(context, -8, -28, 1, palette);
        pixelRect(context, -10, -22, 4, 5, palette.hairDark);
        pixelRect(context, 6, -23, 3, 9, "#9d6239");
        pixelRect(context, -7, -24, 3, 5, "#f0bf80");
      });

      withTransform(context, this.x, this.y, this.aimAngle, () => {
        drawIsoLimb(context, 1, -6, 15, 9, { outline: "#050505", mid: "#c8874d", light: "#e8b978", dark: "#7c4a2e" }, 0);
        drawIsoSpriteBlock(context, 12, -8, 28, 10, { outline: "#050606", mid: "#151b1d", light: "#7f898b", dark: "#070909" }, 4);
        pixelRect(context, 17, -6, 17, 3, "#344043");
        pixelRect(context, 23, -10, 8, 3, "#9aa4a4");
        pixelRect(context, 36, -6, 12, 4, "#748082");
        pixelRect(context, 42, -4, 6, 2, "#c5cdca");
        pixelRect(context, 18, 2, 7, 9, "#080909");
      });

      drawPixelOutlineRect(context, this.x - 18, this.y + 25, 36, 6, "#151515", "#050505");
      pixelRect(context, this.x - 16, this.y + 27, 32 * clamp(this.hp / this.maxHp, 0, 1), 2, "#54e247");
    }
  }

  class MapDecoration {
    constructor(type, x, y, scale = 1, rotation = 0) {
      this.type = type;
      this.x = x;
      this.y = y;
      this.scale = scale;
      this.rotation = rotation;
      this.seed = Math.random();
      this.bits = Array.from({ length: 10 }, () => ({
        x: rand(-14, 14),
        y: rand(-12, 12),
        w: randInt(2, 7),
        h: randInt(2, 12),
        alt: Math.random() > 0.5
      }));
    }

    draw(context) {
      withTransform(context, this.x, this.y, this.rotation, () => {
        context.scale(this.scale, this.scale);
        const t = this.type;
        if (t === "car" || t === "police") this.drawCar(context, t === "police");
        if (t === "crate") this.drawCrate(context);
        if (t === "barrel") this.drawBarrel(context);
        if (t === "trash") this.drawTrash(context);
        if (t === "barricade") this.drawBarricade(context);
        if (t === "lamp") this.drawLamp(context);
        if (t === "grass") this.drawGrass(context);
        if (t === "rocks") this.drawRocks(context);
        if (t === "tire") this.drawTire(context);
        if (t === "cone") this.drawCone(context);
        if (t === "blood") this.drawBlood(context);
        if (t === "crack") this.drawCrack(context);
      });
    }

    drawCar(context, police) {
      const base = police ? "#222d35" : this.seed > 0.5 ? "#234252" : "#5a2b22";
      drawPixelShadow(context, 3, 18, 68, 22, 0.42);
      drawPixelOutlineRect(context, -29, -12, 58, 29, "#101313", "#050505");
      drawPixelOutlineRect(context, -25, -17, 50, 26, base, "#050606", "#426373", "#1b2528");
      drawPixelOutlineRect(context, -13, -22, 28, 14, "#1a2326", "#050606", "#506167", "#0d1112");
      pixelRect(context, -20, 7, 12, 8, "#050606");
      pixelRect(context, 12, 7, 12, 8, "#050606");
      pixelRect(context, -18, 9, 8, 4, "#242928");
      pixelRect(context, 14, 9, 8, 4, "#242928");
      pixelRect(context, -23, -10, 10, 5, "#344d58");
      pixelRect(context, 12, -10, 10, 5, "#344d58");
      pixelRect(context, -26, 0, 8, 7, "#61211a");
      pixelRect(context, 18, -16, 6, 4, "#0c0d0d");
      pixelRect(context, -7, 9, 12, 4, "#371712");
      if (police) {
        pixelRect(context, -2, -20, 5, 4, "#cc2421");
        pixelRect(context, 4, -20, 5, 4, "#246bd1");
        pixelRect(context, -18, -16, 36, 5, "#f1eee1");
      }
    }

    drawCrate(context) {
      drawPixelShadow(context, 2, 18, 37, 13, 0.38);
      drawIsoBox(context, 0, -8, 34, 24, 10, "#b87935", "#7a471f", "#4d2d18");
      pixelRect(context, -14, -4, 28, 4, "#5c3518");
      pixelRect(context, -2, -13, 4, 28, "#5c3518");
      pixelRect(context, -12, -16, 8, 3, "#d19a52");
      pixelRect(context, 5, 8, 7, 3, "#2a180d");
    }

    drawBarrel(context) {
      const c = this.seed > 0.5 ? "#994325" : "#53602e";
      drawPixelShadow(context, 2, 15, 24, 9, 0.36);
      drawPixelOutlineRect(context, -10, -14, 20, 29, c, "#050505", "#c56a34", "#321b16");
      pixelRect(context, -8, -16, 16, 5, "#151515");
      pixelRect(context, -6, -17, 12, 3, this.seed > 0.5 ? "#d07131" : "#6f7f3a");
      pixelRect(context, -8, -7, 16, 4, "#c77729");
      pixelRect(context, -8, 5, 16, 4, "#39241c");
      pixelRect(context, 4, -10, 3, 18, "rgba(255,255,255,0.16)");
      pixelRect(context, -7, 9, 5, 3, "#652317");
    }

    drawTrash(context) {
      drawPixelShadow(context, 1, 17, 31, 11, 0.35);
      drawPixelOutlineRect(context, -13, -13, 26, 28, "#4b5755", "#060707", "#7d8a87", "#202829");
      drawPixelOutlineRect(context, -16, -18, 32, 7, "#66736f", "#060707", "#9ba6a3", "#2f3735");
      pixelRect(context, -8, -8, 4, 17, "#252d2d");
      pixelRect(context, 5, -8, 4, 17, "#252d2d");
      pixelRect(context, -11, 7, 6, 4, "#202726");
    }

    drawBarricade(context) {
      drawPixelShadow(context, 2, 12, 58, 11, 0.34);
      drawPixelOutlineRect(context, -27, -9, 54, 17, "#2c2118", "#050505", "#5c4630", "#100c09");
      pixelRect(context, -24, -6, 48, 5, "#b57532");
      pixelRect(context, -24, 3, 48, 5, "#b57532");
      pixelRect(context, -18, -7, 12, 14, "#e7e0c9");
      pixelRect(context, 8, -7, 12, 14, "#e7e0c9");
      pixelRect(context, -8, -6, 9, 5, "#d66a22");
      pixelRect(context, 17, 3, 7, 5, "#d66a22");
    }

    drawLamp(context) {
      drawPixelShadow(context, 14, 12, 54, 8, 0.32);
      drawPixelOutlineRect(context, -4, -48, 7, 62, "#242929", "#050606", "#596262", "#101313");
      drawPixelOutlineRect(context, -6, 10, 12, 7, "#111313", "#050505", "#343939", "#050606");
      drawPixelOutlineRect(context, -2, -49, 27, 5, "#242929", "#050606", "#596262", "#101313");
      drawPixelOutlineRect(context, 19, -54, 10, 10, "#4b5050", "#050606", "#838b88", "#252b2b");
      pixelRect(context, 21, -51, 5, 5, "#cab36a");
    }

    drawGrass(context) {
      for (const bit of this.bits.slice(0, 8)) {
        pixelRect(context, bit.x, bit.y, Math.min(bit.w, 4), bit.h, bit.alt ? "#394f25" : "#526b30");
      }
    }

    drawRocks(context) {
      for (const bit of this.bits.slice(0, 8)) {
        pixelRect(context, bit.x, bit.y, Math.max(3, bit.w), Math.min(6, bit.h), bit.alt ? "#565954" : "#303432");
      }
    }

    drawTire(context) {
      drawPixelShadow(context, 1, 9, 27, 9, 0.3);
      pixelRect(context, -13, -13, 26, 26, "#070707");
      pixelRect(context, -10, -10, 20, 20, "#1a1d1c");
      pixelRect(context, -6, -6, 12, 12, "#303432");
      pixelRect(context, -3, -3, 6, 6, "#070707");
      pixelRect(context, -9, -10, 12, 3, "#3b403e");
    }

    drawCone(context) {
      drawPixelShadow(context, 1, 12, 19, 7, 0.28);
      drawPixelOutlineRect(context, -8, 8, 16, 5, "#221510", "#050505", "#5a3c20", "#080504");
      drawPixelOutlineRect(context, -6, -10, 12, 20, "#d66a22", "#050505", "#ff9c46", "#7b3210");
      pixelRect(context, -4, -2, 8, 3, "#f2ead7");
    }

    drawBlood(context) {
      pixelRect(context, -13, -5, 22, 10, "#681914");
      pixelRect(context, 5, -12, 10, 8, "#42100e");
      pixelRect(context, -19, 7, 8, 5, "#42100e");
      pixelRect(context, -3, 6, 5, 4, "#8f2018");
    }

    drawCrack(context) {
      context.strokeStyle = "#080a0a";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(-20, -5);
      context.lineTo(-8, -2);
      context.lineTo(0, -12);
      context.lineTo(8, 1);
      context.lineTo(22, 4);
      context.stroke();
      context.beginPath();
      context.moveTo(0, -12);
      context.lineTo(-3, -25);
      context.moveTo(5, 0);
      context.lineTo(4, 16);
      context.stroke();
    }
  }

  class InputState {
    constructor() {
      this.keys = new Set();
      this.pressed = new Set();
    }

    down(key) {
      const k = key.toLowerCase();
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
    }

    up(key) {
      this.keys.delete(key.toLowerCase());
    }

    consume(key) {
      const k = key.toLowerCase();
      if (!this.pressed.has(k)) return false;
      this.pressed.delete(k);
      return true;
    }

    clearFrame() {
      this.pressed.clear();
    }
  }

  class Game {
    constructor() {
      this.canvas = canvas;
      this.ctx = ctx;
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.state = "menu";
      this.previousState = "menu";
      this.input = new InputState();
      this.mouse = { x: this.width / 2, y: this.height / 2, down: false };
      this.touch = {
        movePointerId: null,
        moveVector: { x: 0, y: 0 },
        moveActive: false,
        fireDown: false,
        dashQueued: false,
        reloadQueued: false
      };
      this.save = this.loadSave();
      this.decorations = [];
      this.mapDetails = [];
      this.bullets = [];
      this.zombies = [];
      this.deathSprites = [];
      this.particles = [];
      this.coins = [];
      this.chests = [];
      this.weaponPickups = [];
      this.ammoPickups = [];
      this.burrowWarnings = [];
      this.fireZones = [];
      this.chainArcs = [];
      this.floatingTexts = [];
      this.poisonPools = [];
      this.fogParticles = [];
      this.elapsed = 0;
      this.difficultyLevel = 1;
      this.lastDifficultyLevel = 1;
      this.difficultyNoticeTimer = 0;
      this.difficultyNoticeText = "";
      this.hordeTimer = 0;
      this.hordeDuration = 10;
      this.lastHordeTriggerTime = 0;
      this.noKillTimer = 0;
      this.threatLevel = 0;
      this.killStreak = 0;
      this.huntMode = false;
      this.huntKills = 0;
      this.huntPressureTimer = 0;
      this.burrowTimer = 8;
      this.hunterTimer = 24;
      this.chestTimer = 7;
      this.ammoSupplyTimer = 6;
      this.warning10Shown = false;
      this.warning20Shown = false;
      this.warning30Shown = false;
      this.playerSpeedRatio = 0;
      this.nearbyWeapon = null;
      this.kills = 0;
      this.runCoins = 0;
      this.spawnTimer = 0;
      this.shake = 0;
      this.damageFlash = 0;
      this.lastTime = performance.now();
      this.bindEvents();
      this.bindUI();
      this.bindTouchControls();
      this.resize();
      this.generateDecorations();
      this.initFogParticles();
      this.updateMenuStats();
      requestAnimationFrame((time) => this.loop(time));
    }

    loadSave() {
      const upgrades = JSON.parse(localStorage.getItem(STORAGE_KEYS.upgrades) || "null") || {};
      return {
        totalCoins: Number(localStorage.getItem(STORAGE_KEYS.coins) || 0),
        bestKills: Number(localStorage.getItem(STORAGE_KEYS.bestKills) || 0),
        bestTime: Number(localStorage.getItem(STORAGE_KEYS.bestTime) || 0),
        upgrades: {
          damage: upgrades.damage || 1,
          fireRate: upgrades.fireRate || 1,
          maxHp: upgrades.maxHp || 1,
          speed: upgrades.speed || 1,
          magazine: upgrades.magazine || upgrades.magazineLevel || 1
        }
      };
    }

    saveData() {
      localStorage.setItem(STORAGE_KEYS.coins, String(this.save.totalCoins));
      localStorage.setItem(STORAGE_KEYS.bestKills, String(this.save.bestKills));
      localStorage.setItem(STORAGE_KEYS.bestTime, String(this.save.bestTime));
      localStorage.setItem(STORAGE_KEYS.upgrades, JSON.stringify(this.save.upgrades));
    }

    bindEvents() {
      window.addEventListener("resize", () => this.resize());
      window.addEventListener("keydown", (event) => {
        if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
        if (event.key === "Escape") {
          if (this.state === "playing") this.pause();
          else if (this.state === "paused") this.resume();
          return;
        }
        this.input.down(event.key === " " ? " " : event.key);
      });
      window.addEventListener("keyup", (event) => this.input.up(event.key === " " ? " " : event.key));
      window.addEventListener("mousemove", (event) => {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = (event.clientX - rect.left) * (this.width / rect.width);
        this.mouse.y = (event.clientY - rect.top) * (this.height / rect.height);
      });
      window.addEventListener("mousedown", (event) => {
        if (event.button === 2) {
          event.preventDefault();
          if (this.state === "playing" && this.player) this.player.reload();
          return;
        }
        if (event.button === 0) {
          audioBus.ensure();
          this.mouse.down = true;
        }
      });
      window.addEventListener("mouseup", (event) => {
        if (event.button === 0) this.mouse.down = false;
      });
      window.addEventListener("contextmenu", (event) => event.preventDefault());
      window.addEventListener("blur", () => {
        this.mouse.down = false;
        this.resetTouchControls();
        this.input.keys.clear();
      });
    }

    bindTouchControls() {
      const stick = document.getElementById("moveStick");
      const knob = document.getElementById("moveKnob");
      const fireButton = document.getElementById("fireTouchBtn");
      const reloadButton = document.getElementById("reloadTouchBtn");
      const dashButton = document.getElementById("dashTouchBtn");
      if (!stick || !knob || !fireButton || !reloadButton || !dashButton) return;

      const updateStick = (event) => {
        const rect = stick.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const maxDistance = Math.min(rect.width, rect.height) * 0.32;
        const dx = event.clientX - centerX;
        const dy = event.clientY - centerY;
        const distance = Math.hypot(dx, dy);
        const limited = distance > maxDistance ? maxDistance / distance : 1;
        const x = dx * limited;
        const y = dy * limited;
        knob.style.transform = `translate(${x}px, ${y}px)`;
        this.touch.moveVector.x = clamp(dx / maxDistance, -1, 1);
        this.touch.moveVector.y = clamp(dy / maxDistance, -1, 1);
        if (Math.hypot(this.touch.moveVector.x, this.touch.moveVector.y) < 0.12) {
          this.touch.moveVector.x = 0;
          this.touch.moveVector.y = 0;
        }
      };

      const clearStick = () => {
        this.touch.movePointerId = null;
        this.touch.moveActive = false;
        this.touch.moveVector.x = 0;
        this.touch.moveVector.y = 0;
        knob.style.transform = "translate(0, 0)";
      };

      stick.addEventListener("pointerdown", (event) => {
        if (this.state !== "playing" && this.state !== "paused") return;
        event.preventDefault();
        try {
          stick.setPointerCapture(event.pointerId);
        } catch {
          // Synthetic touch checks may not create an active pointer capture target.
        }
        this.touch.movePointerId = event.pointerId;
        this.touch.moveActive = true;
        updateStick(event);
      });
      stick.addEventListener("pointermove", (event) => {
        if (event.pointerId !== this.touch.movePointerId) return;
        event.preventDefault();
        updateStick(event);
      });
      const endStick = (event) => {
        if (event.pointerId === this.touch.movePointerId) clearStick();
      };
      stick.addEventListener("pointerup", endStick);
      stick.addEventListener("pointercancel", endStick);

      const holdButton = (button, onDown, onUp = null) => {
        button.addEventListener("pointerdown", (event) => {
          if (this.state !== "playing" && this.state !== "paused") return;
          event.preventDefault();
          try {
            button.setPointerCapture(event.pointerId);
          } catch {
            // Synthetic touch checks may not create an active pointer capture target.
          }
          button.classList.add("is-held");
          audioBus.ensure();
          onDown();
        });
        const release = () => {
          button.classList.remove("is-held");
          if (onUp) onUp();
        };
        button.addEventListener("pointerup", release);
        button.addEventListener("pointercancel", release);
        button.addEventListener("lostpointercapture", release);
      };

      holdButton(fireButton, () => {
        this.touch.fireDown = true;
      }, () => {
        this.touch.fireDown = false;
      });
      holdButton(reloadButton, () => {
        this.touch.reloadQueued = true;
      });
      holdButton(dashButton, () => {
        this.touch.dashQueued = true;
      });
    }

    resetTouchControls() {
      this.touch.movePointerId = null;
      this.touch.moveActive = false;
      this.touch.fireDown = false;
      this.touch.dashQueued = false;
      this.touch.reloadQueued = false;
      this.touch.moveVector.x = 0;
      this.touch.moveVector.y = 0;
      const knob = document.getElementById("moveKnob");
      if (knob) knob.style.transform = "translate(0, 0)";
      document.querySelectorAll(".touch-action.is-held").forEach((button) => button.classList.remove("is-held"));
    }

    bindUI() {
      this.screens = {
        menu: document.getElementById("menuScreen"),
        upgrade: document.getElementById("upgradeScreen"),
        gameover: document.getElementById("gameOverScreen")
      };
      document.getElementById("startBtn").addEventListener("click", () => this.startGame());
      document.getElementById("upgradeBtn").addEventListener("click", () => this.showUpgrade());
      document.getElementById("recordsBtn").addEventListener("click", () => this.updateMenuStats(true));
      document.getElementById("backFromUpgradeBtn").addEventListener("click", () => this.showMenu());
      document.getElementById("restartBtn").addEventListener("click", () => this.startGame());
      document.getElementById("gameOverUpgradeBtn").addEventListener("click", () => this.showUpgrade());
      document.getElementById("homeBtn").addEventListener("click", () => this.showMenu());
    }

    resize() {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = Math.floor(this.width * dpr);
      this.canvas.height = Math.floor(this.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.imageSmoothingEnabled = false;
      if (this.player) {
        this.player.x = clamp(this.player.x, this.player.radius, this.width - this.player.radius);
        this.player.y = clamp(this.player.y, this.player.radius, this.height - this.player.radius);
      }
      if (!this.decorations.length || this.state !== "playing") this.generateDecorations();
      this.initFogParticles();
    }

    setScreen(name) {
      Object.values(this.screens).forEach((screen) => screen.classList.remove("active"));
      if (this.screens[name]) this.screens[name].classList.add("active");
    }

    showMenu() {
      this.state = "menu";
      this.mouse.down = false;
      this.resetTouchControls();
      this.updateTouchVisibility();
      this.generateDecorations();
      this.updateMenuStats();
      this.setScreen("menu");
    }

    showUpgrade() {
      this.state = "upgrade";
      this.mouse.down = false;
      this.resetTouchControls();
      this.updateTouchVisibility();
      this.renderUpgrade();
      this.setScreen("upgrade");
    }

    startGame() {
      audioBus.ensure();
      this.state = "playing";
      this.resetTouchControls();
      this.updateTouchVisibility();
      this.setScreen(null);
      this.elapsed = 0;
      this.kills = 0;
      this.runCoins = 0;
      this.spawnTimer = 0.3;
      this.shake = 0;
      this.damageFlash = 0;
      this.difficultyLevel = 1;
      this.lastDifficultyLevel = 1;
      this.difficultyNoticeTimer = 0;
      this.hordeTimer = 0;
      this.lastHordeTriggerTime = 0;
      this.noKillTimer = 0;
      this.threatLevel = 0;
      this.killStreak = 0;
      this.huntMode = false;
      this.huntKills = 0;
      this.huntPressureTimer = 0;
      this.burrowTimer = 7;
      this.hunterTimer = 22;
      this.chestTimer = 4;
      this.ammoSupplyTimer = 5;
      this.warning10Shown = false;
      this.warning20Shown = false;
      this.warning30Shown = false;
      this.playerSpeedRatio = 0;
      this.nearbyWeapon = null;
      this.bullets = [];
      this.zombies = [];
      this.deathSprites = [];
      this.particles = [];
      this.coins = [];
      this.chests = [];
      this.weaponPickups = [];
      this.ammoPickups = [];
      this.burrowWarnings = [];
      this.fireZones = [];
      this.chainArcs = [];
      this.floatingTexts = [];
      this.poisonPools = [];
      this.player = new Player(this);
      this.generateDecorations();
      this.initFogParticles();
      this.lastTime = performance.now();
    }

    pause() {
      this.previousState = "playing";
      this.state = "paused";
      this.mouse.down = false;
      this.updateTouchVisibility();
    }

    resume() {
      this.state = "playing";
      this.updateTouchVisibility();
      this.lastTime = performance.now();
    }

    endGame() {
      if (this.state === "gameover") return;
      this.state = "gameover";
      this.mouse.down = false;
      this.resetTouchControls();
      this.updateTouchVisibility();
      this.save.totalCoins += this.runCoins;
      this.save.bestKills = Math.max(this.save.bestKills, this.kills);
      this.save.bestTime = Math.max(this.save.bestTime, Math.floor(this.elapsed));
      this.saveData();
      this.updateGameOver();
      this.setScreen("gameover");
    }

    updateTouchVisibility() {
      document.body.classList.toggle("game-active", this.state === "playing" || this.state === "paused");
    }

    updateMenuStats() {
      document.getElementById("menuBestKills").textContent = this.save.bestKills;
      document.getElementById("menuBestTime").textContent = formatTime(this.save.bestTime);
      document.getElementById("menuTotalCoins").textContent = this.save.totalCoins;
    }

    updateGameOver() {
      document.getElementById("finalTime").textContent = formatTime(this.elapsed);
      document.getElementById("finalKills").textContent = this.kills;
      document.getElementById("finalCoins").textContent = this.runCoins;
      document.getElementById("finalBestKills").textContent = this.save.bestKills;
      document.getElementById("finalBestTime").textContent = formatTime(this.save.bestTime);
    }

    renderUpgrade() {
      document.getElementById("upgradeCoins").textContent = this.save.totalCoins;
      const list = document.getElementById("upgradeList");
      list.innerHTML = "";
      Object.entries(UPGRADE_DEFS).forEach(([key, def]) => {
        const level = this.save.upgrades[key];
        const maxed = level >= def.max;
        const cost = this.getUpgradeCost(key, level);
        const canAfford = this.save.totalCoins >= cost;
        const card = document.createElement("article");
        card.className = "upgrade-card";
        const valueText = this.getUpgradeValueText(key, level);
        const nextText = maxed ? "已满级" : this.getUpgradeValueText(key, level + 1);
        card.innerHTML = `
          <div class="upgrade-icon">${this.getUpgradeIconHTML(key, def)}</div>
          <div class="upgrade-info">
            <h3>${def.name}</h3>
            <p>等级 ${level}/${def.max}</p>
            <p>${def.effect}</p>
            <p>${valueText} ${maxed ? "" : "→ " + nextText}</p>
            <p>${maxed ? "已满级" : "价格：" + cost + " 金币"}</p>
          </div>
        `;
        const button = document.createElement("button");
        button.className = "pixel-btn primary upgrade-buy";
        if (maxed) button.textContent = "已满级";
        else if (!canAfford) {
          button.textContent = "金币不足";
          button.classList.add("insufficient");
        } else {
          button.textContent = `价格：${cost} 金币`;
        }
        button.disabled = maxed || !canAfford;
        button.addEventListener("click", () => this.buyUpgrade(key));
        card.appendChild(button);
        list.appendChild(card);
      });
    }

    getUpgradeCost(key, level) {
      const def = UPGRADE_DEFS[key];
      if (def.costs) return def.costs[level - 1] || 0;
      return def.baseCost * level;
    }

    getUpgradeIconHTML(key, def) {
      if (key !== "magazine") return def.icon;
      return `<span class="mag-icon"><i></i><i></i><i></i></span>`;
    }

    getUpgradeValueText(key, level) {
      if (key === "damage") return String(25 + (level - 1) * 5);
      if (key === "fireRate") return `${Math.max(0.1, 0.25 - (level - 1) * 0.017).toFixed(2)}s`;
      if (key === "maxHp") return String(100 + (level - 1) * 20);
      if (key === "magazine") return `${UPGRADE_DEFS.magazine.baseValue + (level - 1) * UPGRADE_DEFS.magazine.perLevel} 发`;
      return (3.2 + (level - 1) * 0.15).toFixed(2);
    }

    buyUpgrade(key) {
      const def = UPGRADE_DEFS[key];
      const level = this.save.upgrades[key];
      const cost = this.getUpgradeCost(key, level);
      if (level >= def.max || this.save.totalCoins < cost) return;
      this.save.totalCoins -= cost;
      this.save.upgrades[key] += 1;
      this.saveData();
      playUpgradeSound();
      this.renderUpgrade();
      this.updateMenuStats();
    }

    generateDecorations() {
      this.decorations = [];
      this.generateMapDetails();
      const count = Math.floor(clamp((this.width * this.height) / 17000, 36, 95));
      const types = ["crack", "blood", "rocks", "grass", "crate", "barrel", "trash", "barricade", "tire", "cone"];
      for (let i = 0; i < count; i++) {
        const type = types[randInt(0, types.length - 1)];
        this.decorations.push(new MapDecoration(type, rand(20, this.width - 20), rand(20, this.height - 20), rand(0.75, 1.25), rand(0, Math.PI * 2)));
      }
      const large = Math.floor(clamp(this.width / 260, 3, 7));
      for (let i = 0; i < large; i++) {
        this.decorations.push(new MapDecoration(Math.random() > 0.28 ? "car" : "police", rand(40, this.width - 40), rand(50, this.height - 50), rand(0.8, 1.2), rand(0, Math.PI * 2)));
      }
      const lamps = Math.floor(clamp(this.width / 420, 2, 5));
      for (let i = 0; i < lamps; i++) {
        this.decorations.push(new MapDecoration("lamp", rand(35, this.width - 35), rand(65, this.height - 35), rand(0.85, 1.05), rand(-0.1, 0.1)));
      }
    }

    generateMapDetails() {
      this.mapDetails = [];
      const area = this.width * this.height;
      const noiseCount = Math.floor(clamp(area / 5200, 110, 420));
      for (let i = 0; i < noiseCount; i++) {
        this.mapDetails.push({
          kind: "noise",
          x: rand(0, this.width),
          y: rand(0, this.height),
          w: randInt(1, 4),
          h: randInt(1, 3),
          c: Math.random() > 0.5 ? "#1a1d1c" : "#303432"
        });
      }
      const patches = Math.floor(clamp(area / 55000, 14, 42));
      for (let i = 0; i < patches; i++) {
        this.mapDetails.push({
          kind: Math.random() > 0.55 ? "patch" : "oil",
          x: rand(0, this.width),
          y: rand(0, this.height),
          w: rand(22, 80),
          h: rand(10, 34),
          r: rand(0, Math.PI)
        });
      }
      const cracks = Math.floor(clamp(area / 65000, 12, 36));
      for (let i = 0; i < cracks; i++) {
        this.mapDetails.push({
          kind: "crack",
          x: rand(20, this.width - 20),
          y: rand(20, this.height - 20),
          r: rand(0, Math.PI),
          s: rand(0.7, 1.8)
        });
      }
      const marks = Math.floor(clamp(area / 120000, 6, 20));
      for (let i = 0; i < marks; i++) {
        this.mapDetails.push({
          kind: "tireMark",
          x: rand(0, this.width),
          y: rand(0, this.height),
          len: rand(40, 130),
          r: rand(0, Math.PI)
        });
      }
    }

    initFogParticles() {
      const count = Math.floor(clamp((this.width * this.height) / 42000, 18, 46));
      this.fogParticles = Array.from({ length: count }, () => ({
        x: rand(0, this.width),
        y: rand(0, this.height),
        size: rand(70, 180),
        speed: rand(4, 16),
        alpha: rand(0.03, 0.08),
        drift: rand(-0.25, 0.25)
      }));
    }

    updateDifficulty(dt) {
      this.difficultyLevel = Math.min(12, 1 + Math.floor(this.elapsed / 30));
      if (this.difficultyLevel > this.lastDifficultyLevel) {
        this.lastDifficultyLevel = this.difficultyLevel;
        if (!this.huntMode && this.noKillTimer < 8) {
          this.difficultyNoticeTimer = 2.2;
          this.difficultyNoticeText = "危险升级\n尸群变得更强了";
        }
        this.shake = Math.max(this.shake, 4);
      }
      this.difficultyNoticeTimer = Math.max(0, this.difficultyNoticeTimer - dt);
    }

    getSpawnInterval() {
      let ms = Math.max(450, 1800 - (this.difficultyLevel - 1) * 120);
      if (this.isHordeActive()) ms *= 0.55;
      if (this.huntMode) ms *= 0.78;
      return ms / 1000;
    }

    getSpawnCount() {
      let count = 1;
      if (this.difficultyLevel >= 3) count = randInt(1, 2);
      if (this.difficultyLevel >= 6) count = randInt(2, 3);
      if (this.difficultyLevel >= 9) count = randInt(3, 5);
      if (this.isHordeActive()) count += 2;
      if (this.huntMode && this.threatLevel > 55) count += 1;
      return count;
    }

    getMaxZombies() {
      let max = Math.min(120, 35 + this.difficultyLevel * 8);
      if (this.isHordeActive()) max = Math.min(140, max + 20);
      return max;
    }

    getPressureZombieCount() {
      return this.zombies.filter((zombie) => zombie.alive && zombie.isPressure).length;
    }

    getPressureZombieCap() {
      return this.difficultyLevel < 4 ? 6 : 10;
    }

    getPendingPressureCount() {
      return this.burrowWarnings.filter((warning) => warning.alive && warning.pressure).length;
    }

    canAddPressureWarning() {
      return this.getPressureZombieCount() + this.getPendingPressureCount() < this.getPressureZombieCap();
    }

    enforcePressureZombieCap() {
      let seen = 0;
      const cap = this.getPressureZombieCap();
      for (const zombie of this.zombies) {
        if (!zombie.alive || !zombie.isPressure) continue;
        seen += 1;
        if (seen > cap) zombie.alive = false;
      }
    }

    chooseZombieTypeByDifficulty() {
      let table;
      if (this.difficultyLevel <= 2) {
        table = { normal: 80, fast: 15, tank: 5 };
      } else if (this.difficultyLevel <= 5) {
        table = { normal: 55, fast: 20, tank: 10, redEye: 8, armored: 4, exploder: 3 };
      } else if (this.difficultyLevel <= 8) {
        table = { normal: 35, fast: 20, tank: 12, redEye: 12, armored: 8, exploder: 7, poison: 6 };
      } else {
        table = { normal: 25, fast: 15, tank: 12, redEye: 15, armored: 12, exploder: 10, poison: 11 };
      }
      if (this.isHordeActive() && this.difficultyLevel >= 3) {
        table = { ...table };
        table.normal = Math.max(12, table.normal - 10);
        table.redEye = (table.redEye || 0) + 4;
        table.exploder = (table.exploder || 0) + 3;
        table.armored = (table.armored || 0) + 2;
        if (this.difficultyLevel >= 6) table.poison = (table.poison || 0) + 2;
      }
      if (this.huntMode || this.threatLevel > 45) {
        table = { ...table };
        table.redEye = (table.redEye || 0) + 4 + Math.floor(this.threatLevel / 18);
        table.fast = (table.fast || 0) + 2;
        if (this.threatLevel > 65) table.exploder = (table.exploder || 0) + 3;
        if (this.threatLevel > 78) table.armored = (table.armored || 0) + 2;
      }
      return weightedChoice(table) || "normal";
    }

    spawnZombie() {
      const edge = randInt(0, 3);
      let x = 0;
      let y = 0;
      const margin = 36;
      if (edge === 0) { x = rand(0, this.width); y = -margin; }
      if (edge === 1) { x = this.width + margin; y = rand(0, this.height); }
      if (edge === 2) { x = rand(0, this.width); y = this.height + margin; }
      if (edge === 3) { x = -margin; y = rand(0, this.height); }
      this.zombies.push(new Zombie(this.chooseZombieTypeByDifficulty(), x, y, this.difficultyLevel));
    }

    startHordeEvent() {
      this.hordeTimer = this.hordeDuration;
      this.difficultyNoticeTimer = 2.8;
      this.difficultyNoticeText = "尸潮来袭！";
      this.shake = Math.max(this.shake, 10);
      playHordeSound();
    }

    updateHordeEvent(dt) {
      const currentSecond = Math.floor(this.elapsed);
      if (currentSecond > 0 && currentSecond % 60 === 0 && this.lastHordeTriggerTime !== currentSecond) {
        this.lastHordeTriggerTime = currentSecond;
        this.startHordeEvent();
      }
      this.hordeTimer = Math.max(0, this.hordeTimer - dt);
    }

    isHordeActive() {
      return this.hordeTimer > 0;
    }

    showFloatingText(x, y, text, color) {
      this.floatingTexts.push(new FloatingText(x, y, text, color));
    }

    getCoinValue(base) {
      const streakBonus = this.killStreak >= 10 ? 1.5 : 1;
      return Math.max(1, Math.round(base * streakBonus));
    }

    recordPlayerDash() {
      if (this.noKillTimer > 8) this.threatLevel = clamp(this.threatLevel + 1.8, 0, 100);
    }

    recordPlayerShot() {
      if (this.noKillTimer > 10) this.threatLevel = clamp(this.threatLevel - 0.1, 0, 100);
    }

    handleZombieKilled(zombie) {
      this.noKillTimer = 0;
      this.warning10Shown = false;
      this.warning20Shown = false;
      this.warning30Shown = false;
      this.killStreak += 1;
      if (this.huntMode) {
        this.huntKills += isSpecialZombie(zombie.type) ? 5 : 1;
        if (this.huntKills >= 5 || isSpecialZombie(zombie.type)) this.endHuntMode();
      }
      const relief = zombie.type === "hunter" ? 22 : isSpecialZombie(zombie.type) ? 12 : 4;
      this.threatLevel = clamp(this.threatLevel - relief, 0, 100);
      if (zombie.type === "hunter") this.showFloatingText(zombie.x, zombie.y - 26, "威胁下降", "#9ad7ff");
      if (this.killStreak === 10) this.showFloatingText(zombie.x, zombie.y - 28, "10 连杀：金币提升", "#ffd34a");
      if (this.killStreak === 25) this.showFloatingText(zombie.x, zombie.y - 28, "25 连杀：掉落提升", "#9ad7ff");
      if (this.killStreak === 50) {
        this.player.fireRateBonus += 0.35;
        this.player.syncWeaponStats();
        this.showFloatingText(zombie.x, zombie.y - 28, "50 连杀：攻速提升", "#ff8a20");
      }
      if (this.killStreak > 0 && this.killStreak % 100 === 0) this.spawnChestNearPlayer("elite");
      if (Math.random() < 0.035 + Math.min(0.09, this.killStreak * 0.0015)) this.spawnAmmoPickup(zombie.x, zombie.y, null, randInt(12, 28));
      if (isSpecialZombie(zombie.type) && Math.random() < 0.12) this.spawnWeaponPickup(zombie.x, zombie.y, rollWeaponId(), rollRarity(this.threatLevel / 8));
    }

    startHuntMode() {
      if (this.huntMode) return;
      this.huntMode = true;
      this.huntKills = 0;
      this.huntPressureTimer = 1.5;
      this.difficultyNoticeTimer = 2.4;
      this.difficultyNoticeText = "追猎模式";
      this.shake = Math.max(this.shake, 9);
      playHordeSound();
    }

    endHuntMode() {
      this.huntMode = false;
      this.huntKills = 0;
      this.huntPressureTimer = 5;
      this.showFloatingText(this.player.x, this.player.y - 40, "追猎解除", "#9ad7ff");
    }

    updateThreatSystem(dt) {
      this.noKillTimer += dt;
      const nearest = this.getNearestZombie();
      if (this.noKillTimer > 5) this.threatLevel = clamp(this.threatLevel + dt * (0.65 + this.noKillTimer * 0.035), 0, 100);
      if (nearest && this.playerSpeedRatio > 0.5) {
        const fromZombie = angleTo(nearest.x, nearest.y, this.player.x, this.player.y);
        const fleeing = Math.cos(angleDelta(this.player.moveAngle, fromZombie)) > 0.45;
        if (fleeing && this.noKillTimer > 8) this.threatLevel = clamp(this.threatLevel + dt * 1.4, 0, 100);
      }
      if (this.noKillTimer > 12) this.killStreak = 0;
      if (this.noKillTimer >= 10 && !this.warning10Shown) {
        this.warning10Shown = true;
        this.difficultyNoticeTimer = 2.2;
        this.difficultyNoticeText = "尸群闻到你了";
      }
      if (this.noKillTimer >= 20 && !this.warning20Shown) {
        this.warning20Shown = true;
        this.startHuntMode();
      }
      if (this.noKillTimer >= 30 && !this.warning30Shown) {
        this.warning30Shown = true;
        this.triggerBurrowAmbush("surround");
      }
      this.burrowTimer -= dt;
      const burrowInterval = this.huntMode ? clamp(5.4 - this.threatLevel * 0.025, 2.4, 5.4) : clamp(10 - this.threatLevel * 0.045, 4.5, 10);
      if (this.burrowTimer <= 0 && this.elapsed > 18) {
        this.scheduleBurrowPressure();
        this.burrowTimer = burrowInterval;
      }
      this.huntPressureTimer -= dt;
      if (this.huntMode && this.huntPressureTimer <= 0) {
        this.spawnPressureZombies();
        this.huntPressureTimer = clamp(4.4 - this.threatLevel * 0.022, 2.2, 4.4);
      }
      this.hunterTimer -= dt;
      if ((this.threatLevel > 62 || this.noKillTimer > 24) && this.hunterTimer <= 0) {
        this.spawnHunters();
        this.hunterTimer = clamp(28 - this.threatLevel * 0.12, 12, 28);
      }
      this.chestTimer -= dt;
      if (this.chestTimer <= 0) {
        this.spawnChestNearPlayer(this.killStreak >= 25 ? "elite" : "normal");
        this.chestTimer = rand(22, 36);
      }
    }

    updateAmmoSupply(dt) {
      this.ammoSupplyTimer -= dt;
      if (this.ammoSupplyTimer > 0 || !this.player) return;
      const activeType = this.player.weapon?.ammoType || null;
      const amount = activeType === "explosiveAmmo" ? randInt(3, 6)
        : activeType === "shellAmmo" ? randInt(6, 12)
          : activeType === "fuelAmmo" || activeType === "energyAmmo" ? randInt(16, 30)
            : randInt(18, 36);
      const a = rand(0, Math.PI * 2);
      const r = rand(170, 330);
      const x = clamp(this.player.x + Math.cos(a) * r, 24, this.width - 24);
      const y = clamp(this.player.y + Math.sin(a) * r, 28, this.height - 24);
      this.spawnAmmoPickup(x, y, activeType, amount);
      this.ammoSupplyTimer = rand(7.5, 12.5);
    }

    getNearestZombie() {
      let best = null;
      let bestDistance = Infinity;
      for (const zombie of this.zombies) {
        if (!zombie.alive) continue;
        const d = dist(this.player.x, this.player.y, zombie.x, zombie.y);
        if (d < bestDistance) {
          best = zombie;
          bestDistance = d;
        }
      }
      return best;
    }

    getBurrowPosition(mode = "far") {
      const p = this.player;
      let angle = rand(0, Math.PI * 2);
      let radius = rand(260, 420);
      if (mode === "near") {
        radius = rand(150, 260);
      } else if (mode === "front") {
        angle = p.moveAngle + rand(-0.72, 0.72);
        radius = rand(185, 315);
      } else if (mode === "side") {
        angle = p.moveAngle + (Math.random() > 0.5 ? 1 : -1) * rand(0.85, 1.55);
        radius = rand(170, 295);
      }
      let x = clamp(p.x + Math.cos(angle) * radius, 42, this.width - 42);
      let y = clamp(p.y + Math.sin(angle) * radius, 42, this.height - 42);
      if (dist(x, y, p.x, p.y) < 115) {
        x = clamp(p.x + Math.cos(angle) * 135, 42, this.width - 42);
        y = clamp(p.y + Math.sin(angle) * 135, 42, this.height - 42);
      }
      return { x, y };
    }

    scheduleBurrowPressure() {
      const mode = this.noKillTimer >= 20 ? "front" : this.noKillTimer >= 10 ? "near" : "far";
      const pressure = this.huntMode || this.threatLevel > 58;
      const count = pressure ? randInt(1, 2) : 1;
      for (let i = 0; i < count; i++) {
        const pos = this.getBurrowPosition(i % 2 ? "side" : mode);
        const type = this.threatLevel > 75 ? weightedChoice({ redEye: 4, fast: 3, exploder: 2, armored: 1 }) : this.chooseZombieTypeByDifficulty();
        this.burrowWarnings.push(new BurrowWarning(pos.x, pos.y, type, rand(0.85, 1.2), { pressure: pressure && this.canAddPressureWarning() }));
      }
    }

    triggerBurrowAmbush(mode = "surround") {
      const p = this.player;
      const base = p.moveAngle || p.aimAngle;
      const angles = mode === "surround"
        ? [base - 1.9, base - 1.1, base - 0.35, base + 0.45, base + 1.25]
        : [base - 0.7, base, base + 0.7];
      for (const a of angles) {
        const r = rand(150, 245);
        const x = clamp(p.x + Math.cos(a) * r, 44, this.width - 44);
        const y = clamp(p.y + Math.sin(a) * r, 44, this.height - 44);
        this.burrowWarnings.push(new BurrowWarning(x, y, weightedChoice({ normal: 3, fast: 2, redEye: 2, exploder: 1 }), rand(0.8, 1.15), { pressure: this.canAddPressureWarning() }));
      }
      this.shake = Math.max(this.shake, 7);
    }

    spawnPressureZombies() {
      const cap = this.difficultyLevel < 4 ? 6 : 8;
      let canSpawn = cap - this.getPressureZombieCount();
      if (canSpawn <= 0) return;
      const count = Math.min(canSpawn, this.threatLevel > 75 ? 3 : 2);
      for (let i = 0; i < count; i++) {
        const pos = this.getBurrowPosition(i % 2 ? "side" : "front");
        const type = weightedChoice({ fast: 3, redEye: 3, normal: 2, exploder: this.threatLevel > 70 ? 1 : 0 });
        this.burrowWarnings.push(new BurrowWarning(pos.x, pos.y, type, rand(0.8, 1.15), { pressure: this.canAddPressureWarning() }));
      }
    }

    spawnHunters() {
      const count = this.threatLevel > 82 ? 3 : this.threatLevel > 68 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const pos = this.getBurrowPosition(i % 2 ? "side" : "front");
        this.burrowWarnings.push(new BurrowWarning(pos.x, pos.y, "hunter", rand(0.85, 1.1), { pressure: false, radius: 38 }));
      }
      this.difficultyNoticeTimer = 2.4;
      this.difficultyNoticeText = "猎杀者发现了你";
      this.shake = Math.max(this.shake, 8);
    }

    spawnChestNearPlayer(tier = "normal") {
      const p = this.player;
      const a = rand(0, Math.PI * 2);
      const r = rand(165, 310);
      const x = clamp(p.x + Math.cos(a) * r, 35, this.width - 35);
      const y = clamp(p.y + Math.sin(a) * r, 45, this.height - 35);
      this.chests.push(new Chest(x, y, tier));
      this.showFloatingText(x, y - 28, tier === "elite" ? "高级宝箱出现！" : "宝箱出现！", tier === "elite" ? "#ffd34a" : "#f3c65b");
    }

    spawnWeaponPickup(x, y, id = rollWeaponId(), rarity = rollRarity()) {
      this.weaponPickups.push(new WeaponPickup(x, y, createWeapon(id, rarity)));
    }

    spawnAmmoPickup(x, y, ammoType = null, amount = 24) {
      const type = ammoType || weightedChoice({ lightAmmo: 28, rifleAmmo: 22, shellAmmo: 15, fuelAmmo: 12, energyAmmo: 12, explosiveAmmo: 7 });
      this.ammoPickups.push(new AmmoPickup(x, y, type, amount));
    }

    spawnMuzzleFlash(x, y, angle, weapon) {
      const scale = weapon.muzzleFlashStyle === "wide" ? 1.65 : weapon.muzzleFlashStyle === "long" ? 1.35 : weapon.muzzleFlashStyle === "flame" ? 1.2 : 0.9;
      this.particles.push(new Particle(x, y, {
        vx: 0,
        vy: 0,
        size: 6 * scale,
        life: weapon.projectileType === "flame" ? 0.08 : 0.055,
        color: weapon.projectileType === "tesla" ? "#99f2ff" : "#ffed77",
        kind: "muzzle",
        angle
      }));
      const sparkCount = weapon.projectileType === "flame" ? 7 : weapon.muzzleFlashStyle === "wide" ? 16 : 9;
      for (let i = 0; i < sparkCount; i++) {
        this.particles.push(new Particle(x, y, {
          vx: Math.cos(angle) * rand(0.8, 3.2) + rand(-0.9, 0.9),
          vy: Math.sin(angle) * rand(0.8, 3.2) + rand(-0.9, 0.9),
          size: randInt(2, weapon.muzzleFlashStyle === "wide" ? 7 : 5),
          life: rand(0.05, weapon.projectileType === "flame" ? 0.24 : 0.16),
          color: weapon.projectileType === "tesla" ? (Math.random() > 0.5 ? "#99f2ff" : "#ffffff") : Math.random() > 0.45 ? "#ffed77" : "#ff7f1d",
          kind: "spark"
        }));
      }
    }

    fireTesla(x, y, angle, damage, weapon, crit = false) {
      const points = [{ x, y }];
      let current = { x, y };
      const hit = new Set();
      const chainLimit = Math.round((weapon.rarity === "legendary" || weapon.rarity === "mutated" ? 5 : 3) * weapon.specialPower);
      for (let i = 0; i < chainLimit; i++) {
        let best = null;
        let bestScore = Infinity;
        for (const zombie of this.zombies) {
          if (!zombie.alive || hit.has(zombie)) continue;
          const d = dist(current.x, current.y, zombie.x, zombie.y);
          const aimPenalty = i === 0 ? Math.abs(angleDelta(angleTo(x, y, zombie.x, zombie.y), angle)) * 80 : 0;
          if (d < 260 && d + aimPenalty < bestScore) {
            best = zombie;
            bestScore = d + aimPenalty;
          }
        }
        if (!best) break;
        hit.add(best);
        points.push({ x: best.x, y: best.y });
        best.takeDamage(damage * Math.pow(0.82, i), this, {
          knockback: weapon.knockback,
          angle: angleTo(current.x, current.y, best.x, best.y),
          stun: 0.26 * weapon.specialPower,
          weaponId: "tesla",
          crit
        });
        current = best;
      }
      if (points.length > 1) this.chainArcs.push(new ChainArc(points));
    }

    createExplosion(x, y, radius, damage, options = {}) {
      this.shake = Math.max(this.shake, 10);
      for (const zombie of this.zombies) {
        if (!zombie.alive) continue;
        const d = dist(x, y, zombie.x, zombie.y);
        if (d < radius + zombie.radius) {
          const fade = clamp(1 - d / radius, 0.35, 1);
          zombie.takeDamage(damage * fade, this, {
            knockback: (options.knockback || 4) * fade,
            angle: angleTo(x, y, zombie.x, zombie.y),
            burn: options.fireZone ? 1.6 : 0,
            weaponId: "grenade"
          });
        }
      }
      if (options.playerDamage && dist(x, y, this.player.x, this.player.y) < radius + this.player.radius) {
        this.player.takeDamage(18, this);
      }
      for (let i = 0; i < 46; i++) {
        const a = rand(0, Math.PI * 2);
        const s = rand(1.2, 5.8);
        this.particles.push(new Particle(x, y, {
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          size: randInt(3, 9),
          life: rand(0.22, 0.72),
          color: Math.random() > 0.5 ? "#ff5a22" : "#ffb02a",
          kind: Math.random() > 0.3 ? "spark" : "chunk"
        }));
      }
      if (options.fireZone) this.fireZones.push(new FireZone(x, y, radius * 0.72, 7));
    }

    trimEffectCollections() {
      const trim = (items, max) => {
        if (items.length > max) items.splice(0, items.length - max);
      };
      trim(this.particles, 720);
      trim(this.bullets, 180);
      trim(this.chainArcs, 28);
      trim(this.fireZones, 10);
      trim(this.burrowWarnings, 18);
      trim(this.floatingTexts, 36);
      trim(this.weaponPickups, 10);
      trim(this.chests, 6);
    }

    getAimAssistTarget() {
      if (!this.player || !this.zombies.length) return null;
      let best = null;
      let bestDistance = Infinity;
      for (const zombie of this.zombies) {
        if (!zombie.alive) continue;
        const d = dist(this.player.x, this.player.y, zombie.x, zombie.y);
        if (d < bestDistance && d < 560) {
          best = zombie;
          bestDistance = d;
        }
      }
      return best;
    }

    updatePoisonPools(dt) {
      this.poisonPools.forEach((pool) => pool.update(dt, this));
      this.poisonPools = this.poisonPools.filter((pool) => pool.alive);
    }

    updateFog(dt) {
      for (const fog of this.fogParticles) {
        fog.x += fog.speed * dt;
        fog.y += fog.drift * fog.speed * dt;
        if (fog.x - fog.size > this.width) {
          fog.x = -fog.size;
          fog.y = rand(0, this.height);
        }
      }
    }

    update(dt) {
      if (this.state !== "playing") return;
      this.elapsed += dt;
      this.updateDifficulty(dt);
      this.updateHordeEvent(dt);
      this.player.update(dt, this);
      this.updateThreatSystem(dt);
      this.updateAmmoSupply(dt);
      const maxZombies = this.getMaxZombies();
      this.spawnTimer -= dt;
      const regularZombieCount = this.zombies.filter((zombie) => zombie.alive && !zombie.isPressure).length;
      if (this.spawnTimer <= 0 && regularZombieCount < maxZombies) {
        const spawnCount = this.getSpawnCount();
        for (let i = 0; i < spawnCount && this.zombies.filter((zombie) => zombie.alive && !zombie.isPressure).length < maxZombies; i++) this.spawnZombie();
        this.spawnTimer = this.getSpawnInterval() * rand(0.75, 1.15);
      }

      this.nearbyWeapon = null;
      this.zombies.forEach((zombie) => zombie.update(dt, this));
      this.deathSprites.forEach((sprite) => sprite.update(dt));
      this.bullets.forEach((bullet) => bullet.update(dt, this));
      this.burrowWarnings.forEach((warning) => warning.update(dt, this));
      this.chests.forEach((chest) => chest.update(dt, this));
      this.weaponPickups.forEach((pickup) => pickup.update(dt, this));
      this.ammoPickups.forEach((pickup) => pickup.update(dt, this));
      this.coins.forEach((coin) => coin.update(dt, this));
      this.updatePoisonPools(dt);
      this.fireZones.forEach((zone) => zone.update(dt, this));
      this.updateFog(dt);
      this.particles = this.particles.filter((particle) => particle.update(dt));
      this.chainArcs = this.chainArcs.filter((arc) => arc.update(dt));
      this.floatingTexts = this.floatingTexts.filter((text) => text.update(dt));
      this.bullets = this.bullets.filter((bullet) => bullet.alive);
      this.zombies = this.zombies.filter((zombie) => zombie.alive);
      this.enforcePressureZombieCap();
      this.zombies = this.zombies.filter((zombie) => zombie.alive);
      this.deathSprites = this.deathSprites.filter((sprite) => sprite.life > 0);
      this.burrowWarnings = this.burrowWarnings.filter((warning) => warning.alive);
      this.chests = this.chests.filter((chest) => !chest.opened);
      this.weaponPickups = this.weaponPickups.filter((pickup) => !pickup.collected);
      this.ammoPickups = this.ammoPickups.filter((pickup) => !pickup.collected);
      this.fireZones = this.fireZones.filter((zone) => zone.alive);
      this.coins = this.coins.filter((coin) => !coin.collected);
      this.trimEffectCollections();
      this.shake = Math.max(0, this.shake - dt * 18);
      this.damageFlash = Math.max(0, this.damageFlash - dt);
      this.input.clearFrame();
    }

    loop(time) {
      const dt = Math.min(0.033, (time - this.lastTime) / 1000 || 0);
      this.lastTime = time;
      this.update(dt);
      this.draw();
      requestAnimationFrame((next) => this.loop(next));
    }

    draw() {
      const shakeX = this.state === "playing" ? rand(-this.shake, this.shake) : 0;
      const shakeY = this.state === "playing" ? rand(-this.shake, this.shake) : 0;
      ctx.save();
      ctx.clearRect(0, 0, this.width, this.height);
      ctx.translate(Math.round(shakeX), Math.round(shakeY));
      this.drawMap(ctx);
      this.decorations.forEach((decoration) => decoration.draw(ctx));

      if (this.state === "playing" || this.state === "paused" || this.state === "gameover") {
        this.fireZones.forEach((zone) => zone.draw(ctx));
        this.drawPoisonPools(ctx);
        this.burrowWarnings.forEach((warning) => warning.draw(ctx));
        this.chests.forEach((chest) => chest.draw(ctx));
        this.weaponPickups.forEach((pickup) => pickup.draw(ctx));
        this.ammoPickups.forEach((pickup) => pickup.draw(ctx));
        this.coins.forEach((coin) => coin.draw(ctx));
        this.bullets.forEach((bullet) => bullet.draw(ctx));
        this.zombies.forEach((zombie) => zombie.draw(ctx, this.elapsed, this.getZombieRenderAlpha(zombie)));
        this.deathSprites.forEach((sprite) => sprite.draw(ctx));
        if (this.player) this.player.draw(ctx);
        this.chainArcs.forEach((arc) => arc.draw(ctx));
        this.particles.forEach((particle) => particle.draw(ctx));
        this.floatingTexts.forEach((text) => text.draw(ctx));
      } else {
        this.drawMenuAtmosphere(ctx);
      }
      ctx.restore();

      if (this.state === "playing" || this.state === "paused") {
        this.drawFogOverlay(ctx);
        this.drawDarknessOverlay(ctx);
        if (this.isHordeActive() || this.huntMode) this.drawRedAlertOverlay(ctx);
        this.drawDifficultyNotice(ctx);
      }
      if (this.state === "playing" || this.state === "paused") this.drawHUD(ctx);
      if (this.state === "paused") this.drawPause(ctx);
      this.drawVignette(ctx);
      if (this.damageFlash > 0) this.drawDamageFlash(ctx);
      this.drawCrosshair(ctx);
    }

    drawMap(context) {
      context.fillStyle = "#202423";
      context.fillRect(0, 0, this.width, this.height);
      for (let y = 0; y < this.height; y += 220) {
        pixelRect(context, 0, y + 16, this.width, 2, "rgba(110,112,103,0.08)");
        for (let x = 24; x < this.width; x += 132) {
          const chip = (x + y) % 4 === 0 ? 10 : 0;
          pixelRect(context, x, y + 13, 38 - chip, 6, "rgba(120,120,108,0.33)");
          pixelRect(context, x + 10, y + 13, 7, 6, "rgba(32,36,34,0.58)");
        }
      }
      for (let x = 0; x < this.width; x += 360) {
        pixelRect(context, x + 70, 0, 2, this.height, "rgba(100,98,86,0.07)");
        for (let y = 36; y < this.height; y += 145) {
          pixelRect(context, x + 65, y, 7, 34, "rgba(113,106,78,0.28)");
          pixelRect(context, x + 65, y + 9, 7, 8, "rgba(31,34,32,0.52)");
        }
      }

      for (const item of this.mapDetails) {
        if (item.kind === "noise") {
          pixelRect(context, item.x, item.y, item.w, item.h, item.c);
        } else if (item.kind === "patch" || item.kind === "oil") {
          context.save();
          context.translate(item.x, item.y);
          context.rotate(item.r);
          context.fillStyle = item.kind === "oil" ? "rgba(9,10,9,0.36)" : "rgba(57,50,43,0.25)";
          context.fillRect(-item.w / 2, -item.h / 2, item.w, item.h);
          pixelRect(context, -item.w / 2 + 5, -item.h / 2 + 3, item.w * 0.25, 3, item.kind === "oil" ? "rgba(70,75,67,0.22)" : "rgba(91,75,58,0.25)");
          context.restore();
        } else if (item.kind === "crack") {
          context.save();
          context.translate(item.x, item.y);
          context.rotate(item.r);
          context.scale(item.s, item.s);
          context.strokeStyle = "#080a0a";
          context.lineWidth = 2;
          context.beginPath();
          context.moveTo(-20, -2);
          context.lineTo(-7, 0);
          context.lineTo(0, -9);
          context.lineTo(9, 2);
          context.lineTo(24, 5);
          context.moveTo(0, -9);
          context.lineTo(-4, -22);
          context.moveTo(8, 2);
          context.lineTo(6, 15);
          context.stroke();
          context.restore();
        } else if (item.kind === "tireMark") {
          context.save();
          context.translate(item.x, item.y);
          context.rotate(item.r);
          pixelRect(context, -item.len / 2, -6, item.len, 3, "rgba(5,6,6,0.28)");
          pixelRect(context, -item.len / 2 + 10, 5, item.len - 20, 3, "rgba(5,6,6,0.23)");
          context.restore();
        }
      }
    }

    drawMenuAtmosphere(context) {
      context.save();
      context.globalAlpha = 0.45;
      for (let i = 0; i < 16; i++) {
        const x = (i * 147 + Math.sin(performance.now() * 0.0002 + i) * 20) % this.width;
        const y = (i * 89) % this.height;
        const type = i % 5 === 0 ? "fat" : i % 3 === 0 ? "fast" : "normal";
        new Zombie(type, x, y).draw(context, performance.now() * 0.001);
      }
      context.restore();
    }

    getVisionRadius() {
      return Math.max(220, 420 - this.difficultyLevel * 18);
    }

    getZombieRenderAlpha(zombie) {
      if (!this.player) return 1;
      const d = dist(zombie.x, zombie.y, this.player.x, this.player.y);
      const near = 250;
      const far = Math.max(500, this.getVisionRadius() + 160);
      if (d <= near) return 1;
      if (d >= far) return 0.35;
      return clamp(1 - (d - near) / (far - near) * 0.65, 0.35, 1);
    }

    drawPoisonPools(context) {
      this.poisonPools.forEach((pool) => pool.draw(context));
    }

    drawFogOverlay(context) {
      if (!this.player) return;
      const fogAlpha = Math.min(0.35, 0.05 + this.difficultyLevel * 0.025);
      const redTint = this.isHordeActive();
      context.save();
      for (const fog of this.fogParticles) {
        context.globalAlpha = fog.alpha + fogAlpha * 0.18;
        context.fillStyle = redTint ? "rgba(116, 35, 32, 0.55)" : "rgba(95, 111, 100, 0.42)";
        context.fillRect(Math.round(fog.x), Math.round(fog.y), Math.round(fog.size), Math.round(fog.size * 0.34));
        context.fillRect(Math.round(fog.x + fog.size * 0.25), Math.round(fog.y - fog.size * 0.12), Math.round(fog.size * 0.58), Math.round(fog.size * 0.22));
      }
      context.restore();
    }

    drawVisionMask(context) {
      if (!this.player) return;
      const radius = this.getVisionRadius();
      const darknessAlpha = Math.min(0.55, 0.12 + this.difficultyLevel * 0.035);
      const gradient = context.createRadialGradient(this.player.x, this.player.y, radius * 0.35, this.player.x, this.player.y, radius);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(0.58, `rgba(0,0,0,${darknessAlpha * 0.22})`);
      gradient.addColorStop(1, `rgba(0,0,0,${darknessAlpha})`);
      context.fillStyle = gradient;
      context.fillRect(0, 0, this.width, this.height);
    }

    drawDarknessOverlay(context) {
      context.save();
      this.drawVisionMask(context);
      context.restore();
    }

    drawDifficultyNotice(context) {
      if (this.difficultyNoticeTimer <= 0) return;
      if (this.difficultyNoticeText === "尸潮来袭！") {
        this.drawHordeWarning(context);
        return;
      }
      {
        const alpha = clamp(this.difficultyNoticeTimer / 2.4, 0, 1);
        const jitter = this.difficultyNoticeTimer > 1.5 ? rand(-2, 2) : 0;
        const lines = String(this.difficultyNoticeText || "危险").split("\n");
        context.save();
        context.globalAlpha = alpha;
        this.text(context, lines[0], this.width / 2 + jitter, this.height / 2 - 34 + jitter, lines[0].length > 12 ? 28 : 36, "#ff3a2e", "center");
        if (lines[1]) this.text(context, lines[1], this.width / 2 - jitter, this.height / 2 + 8, 20, "#f3c65b", "center");
        context.restore();
        return;
      }
      if (/^[A-Z0-9 :!\n]+$/.test(String(this.difficultyNoticeText || ""))) {
        const alpha = clamp(this.difficultyNoticeTimer / 2.4, 0, 1);
        const jitter = this.difficultyNoticeTimer > 1.5 ? rand(-2, 2) : 0;
        const lines = String(this.difficultyNoticeText).split("\n");
        context.save();
        context.globalAlpha = alpha;
        this.text(context, lines[0], this.width / 2 + jitter, this.height / 2 - 34 + jitter, lines[0].length > 24 ? 24 : 36, "#ff3a2e", "center");
        if (lines[1]) this.text(context, lines[1], this.width / 2 - jitter, this.height / 2 + 8, 20, "#f3c65b", "center");
        context.restore();
        return;
      }
      if (this.difficultyNoticeText === "尸潮来袭！") {
        this.drawHordeWarning(context);
        return;
      }
      const alpha = clamp(this.difficultyNoticeTimer / 2.2, 0, 1);
      const jitter = this.difficultyNoticeTimer > 1.5 ? rand(-2, 2) : 0;
      context.save();
      context.globalAlpha = alpha;
      this.text(context, "难度提升", this.width / 2 + jitter, this.height / 2 - 42 + jitter, 36, "#ff3a2e", "center");
      this.text(context, "尸群变得更强了", this.width / 2 - jitter, this.height / 2 + 2, 20, "#f3c65b", "center");
      context.restore();
    }

    drawHordeWarning(context) {
      const cnAlpha = clamp(this.difficultyNoticeTimer / 2.8, 0, 1);
      const cnJitter = rand(-3, 3);
      context.save();
      context.globalAlpha = cnAlpha;
      this.text(context, "尸潮来袭！", this.width / 2 + cnJitter, this.height / 2 - 30 + cnJitter, 50, "#ff2e24", "center");
      this.text(context, "战斗或逃亡", this.width / 2 - cnJitter, this.height / 2 + 22, 18, "#f3c65b", "center");
      context.restore();
      return;
      const alpha = clamp(this.difficultyNoticeTimer / 2.8, 0, 1);
      const jitter = rand(-3, 3);
      context.save();
      context.globalAlpha = alpha;
      this.text(context, "尸潮来袭！", this.width / 2 + jitter, this.height / 2 - 30 + jitter, 50, "#ff2e24", "center");
      this.text(context, "战斗或逃亡", this.width / 2 - jitter, this.height / 2 + 22, 18, "#f3c65b", "center");
      context.restore();
    }

    drawRedAlertOverlay(context) {
      const pulse = 0.35 + Math.sin(this.elapsed * 10) * 0.16;
      context.save();
      context.strokeStyle = `rgba(210, 24, 18, ${pulse})`;
      context.lineWidth = 30;
      context.strokeRect(10, 10, this.width - 20, this.height - 20);
      context.fillStyle = `rgba(120, 0, 0, ${0.08 + pulse * 0.08})`;
      context.fillRect(0, 0, this.width, this.height);
      context.restore();
    }

    drawHUD(context) {
      if (!this.player) return;
      this.drawPanel(context, 18, 18, 252, 62);
      drawPixelOutlineRect(context, 33, 40, 166, 18, "#130909", "#050505", "#513131", "#050202");
      pixelRect(context, 35, 42, 162 * clamp(this.player.hp / this.player.maxHp, 0, 1), 14, "#a91f19");
      pixelRect(context, 35, 42, 162 * clamp(this.player.hp / this.player.maxHp, 0, 1), 4, "#ff4a35");
      pixelRect(context, 26, 29, 9, 9, "#d8392d");
      pixelRect(context, 22, 33, 17, 12, "#b6261f");
      pixelRect(context, 26, 43, 9, 7, "#7c1412");
      this.text(context, "生命", 48, 31, 18, "#f2f0df", "left");
      this.text(context, `${Math.ceil(this.player.hp)} / ${this.player.maxHp}`, 222, 50, 16, "#fff5df", "center");

      this.drawPanel(context, this.width / 2 - 88, 18, 176, 44);
      this.text(context, "生存时间", this.width / 2, 34, 16, "#f3f1df", "center");
      this.text(context, formatTime(this.elapsed), this.width / 2, 55, 18, "#ffffff", "center");
      this.drawDifficultyUI(context);

      this.drawPanel(context, this.width - 188, 18, 170, 70);
      drawCoinIcon(context, this.width - 170, 31);
      drawSkullIcon(context, this.width - 168, 58);
      this.text(context, `${this.runCoins}`, this.width - 105, 42, 20, "#ffd35a", "center");
      this.text(context, `${this.kills}`, this.width - 105, 70, 20, "#f5f2e2", "center");

      this.drawPanel(context, this.width - 176, this.height - 96, 158, 76);
      drawMiniGunIcon(context, this.width - 157, this.height - 78);
      this.text(context, "手枪", this.width - 77, this.height - 71, 14, "#c8cdc7", "center");
      this.text(context, `${this.player.ammo} / ${this.player.magSize}`, this.width - 78, this.height - 43, 20, "#ffffff", "center");
      if (this.player.reloading) this.text(context, "换弹中...", this.width - 78, this.height - 24, 14, "#f3c65b", "center");

      this.drawWeaponHUD(context);
      this.drawThreatHUD(context);

      this.drawPanel(context, 18, this.height - 92, 92, 72);
      const ready = this.player.dashCooldown <= 0;
      drawPixelOutlineRect(context, 37, this.height - 70, 40, 32, ready ? "#4c692c" : "#303432", "#050505", ready ? "#87a94d" : "#565d5a", "#151817");
      pixelRect(context, 48, this.height - 64, 17, 5, "#d1c08b");
      pixelRect(context, 44, this.height - 57, 25, 5, "#877044");
      pixelRect(context, 50, this.height - 50, 11, 5, "#d1c08b");
      this.text(context, "冲刺", 57, this.height - 45, 11, "#f1edce", "center");
      drawPixelOutlineRect(context, 36, this.height - 34, 56, 18, "rgba(9,12,12,0.96)", "#050606");
      this.text(context, ready ? "空格" : `${this.player.dashCooldown.toFixed(1)}s`, 64, this.height - 24, 13, ready ? "#f3c65b" : "#b7bbb3", "center");
      this.text(context, ready ? "空格" : `${this.player.dashCooldown.toFixed(1)}s`, 64, this.height - 24, 13, ready ? "#f3c65b" : "#b7bbb3", "center");
    }

    drawWeaponHUD(context) {
      const weapon = this.player.weapon;
      const rarity = getRarity(weapon.rarity);
      this.drawPanel(context, this.width - 248, this.height - 112, 230, 92);
      const iconImage = generatedAssets.get(`weapon_${weapon.id}`);
      if (iconImage) context.drawImage(iconImage, this.width - 232, this.height - 96, 44, 44);
      else drawWeaponIcon(context, weapon.id, this.width - 232, this.height - 88, 0.9, rarity.color);
      this.text(context, weapon.name, this.width - 126, this.height - 90, weapon.name.length > 14 ? 12 : 14, rarity.color, "center");
      this.text(context, `${rarity.name} ${SPECIAL_LABELS[weapon.specialEffect] || "特效"}`, this.width - 126, this.height - 70, 11, "#c8cdc7", "center");
      this.text(context, `弹药 ${this.player.ammo}/${this.player.magSize} | ${this.player.getReserveAmmo()} ${AMMO_LABELS[weapon.ammoType]}`, this.width - 126, this.height - 47, 15, "#ffffff", "center");
      if (this.player.reloading) {
        const progress = 1 - clamp(this.player.reloadTimer / this.player.reloadDuration, 0, 1);
        drawPixelOutlineRect(context, this.width - 222, this.height - 34, 188, 10, "#151515", "#050505");
        pixelRect(context, this.width - 220, this.height - 32, 184 * progress, 6, "#f3c65b");
      }
      if (this.nearbyWeapon) {
        const pickup = this.nearbyWeapon;
        this.drawPanel(context, this.width / 2 - 144, this.height - 82, 288, 34);
        this.text(context, `按 E 拾取 / 替换：${pickup.weapon.rarityName}${pickup.weapon.name}`, this.width / 2, this.height - 64, 14, pickup.weapon.rarityColor, "center");
      }
    }

    drawThreatHUD(context) {
      this.drawPanel(context, 18, 88, 252, 58);
      this.text(context, "威胁", 42, 105, 14, "#ffb3a9", "left");
      drawPixelOutlineRect(context, 108, 98, 132, 15, "#160909", "#050505", "#513131", "#050202");
      pixelRect(context, 110, 100, 128 * clamp(this.threatLevel / 100, 0, 1), 11, this.huntMode ? "#ff2e24" : "#d66a22");
      this.text(context, `${Math.round(this.threatLevel)}`, 252, 105, 14, "#f5f2e2", "right");
      this.text(context, `连杀 ${this.killStreak}`, 42, 130, 14, this.killStreak >= 25 ? "#ffd34a" : "#f3f1df", "left");
      if (this.huntMode) this.text(context, `追猎 ${this.huntKills}/5`, 206, 130, 14, "#ff3a2e", "center");
    }

    drawDifficultyUI(context) {
      const x = this.width / 2 - 72;
      const y = 68;
      this.drawPanel(context, x, y, 144, this.isHordeActive() ? 54 : 34);
      this.text(context, `难度：${this.difficultyLevel}`, this.width / 2, y + 18, 16, "#ffb3a9", "center");
      if (this.isHordeActive()) this.text(context, `尸潮 ${this.hordeTimer.toFixed(1)}秒`, this.width / 2, y + 40, 14, "#ff3a2e", "center");
      return;
      this.text(context, `难度：Lv.${this.difficultyLevel}`, this.width / 2, y + 18, 16, "#ffb3a9", "center");
      if (this.isHordeActive()) this.text(context, `尸潮 ${this.hordeTimer.toFixed(1)}s`, this.width / 2, y + 40, 14, "#ff3a2e", "center");
    }

    drawPanel(context, x, y, w, h) {
      pixelRect(context, x + 5, y + 6, w, h, "rgba(0,0,0,0.42)");
      pixelRect(context, x - 3, y - 3, w + 6, h + 6, "#050606");
      pixelRect(context, x, y, w, h, "rgba(9,12,12,0.82)");
      pixelRect(context, x + 2, y + 2, w - 4, 3, "rgba(255,255,255,0.16)");
      pixelRect(context, x + 2, y + h - 6, w - 4, 4, "rgba(0,0,0,0.55)");
      context.strokeStyle = "#464f4b";
      context.lineWidth = 2;
      context.strokeRect(Math.round(x) + 2, Math.round(y) + 2, Math.round(w) - 4, Math.round(h) - 4);
      context.strokeStyle = "#161b1a";
      context.strokeRect(Math.round(x) + 5, Math.round(y) + 5, Math.round(w) - 10, Math.round(h) - 10);
    }

    text(context, text, x, y, size = 16, color = "#fff", align = "left") {
      context.save();
      context.font = `700 ${size}px "Courier New", monospace`;
      context.textAlign = align;
      context.textBaseline = "middle";
      context.fillStyle = "#050505";
      context.fillText(text, Math.round(x + 2), Math.round(y + 2));
      context.fillStyle = color;
      context.fillText(text, Math.round(x), Math.round(y));
      context.restore();
    }

    drawPause(context) {
      context.save();
      context.fillStyle = "rgba(0,0,0,0.58)";
      context.fillRect(0, 0, this.width, this.height);
      this.text(context, "暂停", this.width / 2, this.height / 2 - 24, 58, "#f3c65b", "center");
      this.text(context, "按 ESC 继续游戏", this.width / 2, this.height / 2 + 32, 20, "#f2f0df", "center");
      context.restore();
      return;
      this.text(context, "暂停", this.width / 2, this.height / 2 - 24, 58, "#f3c65b", "center");
      this.text(context, "按 ESC 继续", this.width / 2, this.height / 2 + 32, 20, "#f2f0df", "center");
      context.restore();
    }

    drawDamageFlash(context) {
      const a = clamp(this.damageFlash / 0.34, 0, 1);
      context.save();
      context.strokeStyle = `rgba(210, 24, 18, ${a})`;
      context.lineWidth = 22;
      context.strokeRect(10, 10, this.width - 20, this.height - 20);
      context.fillStyle = `rgba(120, 0, 0, ${a * 0.12})`;
      context.fillRect(0, 0, this.width, this.height);
      context.restore();
    }

    drawVignette(context) {
      context.save();
      const gradient = context.createRadialGradient(this.width / 2, this.height / 2, Math.min(this.width, this.height) * 0.22, this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.68);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(0.72, "rgba(0,0,0,0.18)");
      gradient.addColorStop(1, "rgba(0,0,0,0.58)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, this.width, this.height);
      pixelRect(context, 0, 0, this.width, 18, "rgba(0,0,0,0.22)");
      pixelRect(context, 0, this.height - 22, this.width, 22, "rgba(0,0,0,0.28)");
      context.restore();
    }

    drawCrosshair(context) {
      const x = Math.round(this.mouse.x);
      const y = Math.round(this.mouse.y);
      context.save();
      context.strokeStyle = "#f3f1df";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x - 16, y);
      context.lineTo(x - 6, y);
      context.moveTo(x + 6, y);
      context.lineTo(x + 16, y);
      context.moveTo(x, y - 16);
      context.lineTo(x, y - 6);
      context.moveTo(x, y + 6);
      context.lineTo(x, y + 16);
      context.stroke();
      pixelRect(context, x - 2, y - 2, 4, 4, "#d73528");
      context.restore();
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    window.pixelZombieSurvival = new Game();
  });
})();
