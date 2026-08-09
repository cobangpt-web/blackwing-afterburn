export const MAX_ITEM_LEVEL = 3;

export const PICKUPS = Object.freeze({
  shieldCell: { icon: "⬡", accent: "#8ef5ff" },
  repair: { icon: "✚", accent: "#7dff97" },
  empBurst: { icon: "◉", accent: "#d66cff" },
  missileCache: { icon: "◆", accent: "#ff9a45" },
  lockBoost: { icon: "◎", accent: "#ffe15b" },
  overdriveCell: { icon: "✦", accent: "#31eaff" },
  timeWarp: { icon: "◌", accent: "#a8b6ff" },
  omegaBomb: { icon: "✹", accent: "#ff5f43" },
});

export const STAGES = Object.freeze([
  {
    id: "tempest",
    nameKey: "stageTempest",
    bossKey: "bossCarrier",
    background: "backgroundTempest",
    bossImage: "bossCarrier",
    bossAt: 44,
    bossHp: 920,
    bossHeight: 455,
    difficulty: 1,
    accent: "#31eaff",
    itemPool: ["twinWing", "homing", "shield", "armor"],
    pickupPool: ["shieldCell", "repair", "missileCache"],
  },
  {
    id: "canyon",
    nameKey: "stageCanyon",
    bossKey: "bossMoloch",
    background: "backgroundCanyon",
    bossImage: "bossMoloch",
    bossAt: 46,
    bossHp: 1220,
    bossHeight: 430,
    difficulty: 1.14,
    accent: "#ff9a45",
    itemPool: ["spread", "railgun", "armor", "homing"],
    pickupPool: ["empBurst", "missileCache", "repair"],
  },
  {
    id: "neon",
    nameKey: "stageNeon",
    bossKey: "bossPhantom",
    background: "backgroundNeon",
    bossImage: "bossPhantom",
    bossAt: 48,
    bossHp: 1480,
    bossHeight: 380,
    difficulty: 1.28,
    accent: "#d66cff",
    itemPool: ["wingman", "emp", "homing", "spread"],
    pickupPool: ["lockBoost", "overdriveCell", "empBurst"],
  },
  {
    id: "boreal",
    nameKey: "stageBoreal",
    bossKey: "bossBoreas",
    background: "backgroundBoreal",
    bossImage: "bossBoreas",
    bossAt: 50,
    bossHp: 1840,
    bossHeight: 405,
    difficulty: 1.42,
    accent: "#a8ddff",
    itemPool: ["railgun", "shield", "overdrive", "wingman"],
    pickupPool: ["timeWarp", "shieldCell", "lockBoost"],
  },
  {
    id: "erebus",
    nameKey: "stageErebus",
    bossKey: "bossErebus",
    background: "backgroundErebus",
    bossImage: "bossErebus",
    bossAt: 54,
    bossHp: 2480,
    bossHeight: 490,
    difficulty: 1.62,
    accent: "#ff4f43",
    itemPool: ["emp", "overdrive", "railgun", "spread"],
    pickupPool: ["omegaBomb", "overdriveCell", "missileCache"],
  },
]);

export const ITEMS = Object.freeze({
  twinWing: { icon: "◇◇", category: "weapon" },
  spread: { icon: "⋰⋮⋱", category: "weapon" },
  railgun: { icon: "⇈", category: "weapon" },
  homing: { icon: "◎", category: "subweapon" },
  wingman: { icon: "◁▷", category: "subweapon" },
  emp: { icon: "◉", category: "subweapon" },
  shield: { icon: "⬡", category: "defense" },
  armor: { icon: "▣", category: "defense" },
  overdrive: { icon: "✦", category: "engine" },
});

export function getStage(index) {
  return STAGES[Math.max(0, Math.min(STAGES.length - 1, index))];
}

export function getRandomPickupId(index, random = Math.random) {
  const pool = getStage(index).pickupPool;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

export function getBossTime(index, quick = false) {
  return quick ? 8 : getStage(index).bossAt;
}

export function createItemLevels() {
  return Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0]));
}

export function applyItemLevel(levels, itemId) {
  if (!ITEMS[itemId]) return { ...levels };
  return {
    ...levels,
    [itemId]: Math.min(MAX_ITEM_LEVEL, (levels[itemId] || 0) + 1),
  };
}

export function getUpgradeChoices(stageIndex, levels, random = Math.random, count = 3) {
  const stage = getStage(stageIndex);
  const available = Object.keys(ITEMS).filter((id) => (levels[id] || 0) < MAX_ITEM_LEVEL);
  if (available.length <= count) return available;

  const preferred = stage.itemPool.filter((id) => available.includes(id));
  const weighted = [...preferred, ...preferred, ...available];
  const choices = [];

  while (choices.length < count && weighted.length > 0) {
    const index = Math.floor(random() * weighted.length);
    const [candidate] = weighted.splice(index, 1);
    if (!choices.includes(candidate)) choices.push(candidate);
  }

  for (const candidate of available) {
    if (choices.length >= count) break;
    if (!choices.includes(candidate)) choices.push(candidate);
  }
  return choices;
}

export function getItemStats(levels) {
  return {
    cannonDamage: 1 + (levels.twinWing || 0) * 0.08 + (levels.railgun || 0) * 0.12,
    extraWingShots: levels.twinWing || 0,
    spreadLevel: levels.spread || 0,
    pierce: levels.railgun || 0,
    missileDamage: 34 + (levels.homing || 0) * 14,
    missileLocks: Math.min(7, 4 + (levels.homing || 0)),
    wingmen: Math.min(2, levels.wingman || 0),
    wingmanDamage: 0.55 + (levels.wingman || 0) * 0.18,
    empLevel: levels.emp || 0,
    maxShield: levels.shield || 0,
    maxHp: 100 + (levels.armor || 0) * 18,
    pickupRange: 180 + (levels.armor || 0) * 20,
    overdriveDuration: 2.8 + (levels.overdrive || 0) * 0.75,
    overdriveMultiplier: 1 + (levels.overdrive || 0) * 0.18,
  };
}
