import { STR } from "./strings.js";
import {
  ITEMS,
  PICKUPS,
  STAGES,
  applyItemLevel,
  createItemLevels,
  getBossTime,
  getItemStats,
  getRandomPickupId,
  getStage,
  getUpgradeChoices,
} from "./campaign.js";
import { calculateJoystickVector } from "./joystick.js";
import {
  findMissileTarget,
  HOMING_MISSILE_SPEED,
  steerMissile,
} from "./missiles.js";
import { drawLowerFieldShade, drawUpperFieldTint } from "./rendering.js";
import { createViewportLayout, getTouchLeadWorld } from "./viewport.js";

const WORLD_W = 720;
const WORLD_H = 1280;
const STEP_MS = 1000 / 60;
const DT = 1 / 60;
const DPR_CAP = 1.5;
const MOBILE_DPR_CAP = 1.25;
const TOUCH_FOLLOW_DISTANCE = 54;
const POINTER_FOLLOW_DISTANCE = 70;
const TOUCH_SPEED = 510;
const DEFAULT_SPEED = 430;
const QUERY = new URLSearchParams(location.search);
const QUICK = QUERY.has("quick");
const DEV = QUERY.has("dev");
const TEST_MODE = QUERY.has("test");
const INITIAL_TEST_STAGE = Math.max(0, Math.min(STAGES.length - 1, Number(QUERY.get("stage") || 1) - 1));
const MAX_ENEMIES = 48;
const MAX_SHOTS = 220;
const MAX_MISSILES = 12;
const MAX_PICKUPS = 24;
const MAX_EFFECTS = 24;
const MAX_INVENTORY = 2;
const LOCK_DASH = [8, 9];
const EMPTY_DASH = [];
const BRIEFING_SEEN_KEY = "bw-briefing-seen";
const TEST_BUILDS = [
  {},
  { twinWing: 1 },
  { twinWing: 1, homing: 1, armor: 1 },
  { spread: 1, railgun: 1, shield: 1, overdrive: 1 },
  { twinWing: 2, railgun: 1, wingman: 2, emp: 1, shield: 1, overdrive: 1 },
];

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
const overlay = document.querySelector("#overlay");
const overlayMessage = document.querySelector("#overlayMessage");
const scoreSummary = document.querySelector("#scoreSummary");
const gameTitle = document.querySelector("#gameTitle");
const tagline = document.querySelector("#tagline");
const resultStats = document.querySelector("#resultStats");
const resultScore = document.querySelector("#resultScore");
const resultBest = document.querySelector("#resultBest");
const resultStage = document.querySelector("#resultStage");
const resultKills = document.querySelector("#resultKills");
const startBtn = document.querySelector("#startBtn");
const restartBtn = document.querySelector("#restartBtn");
const settingsBtn = document.querySelector("#settingsBtn");
const itemGuideBtn = document.querySelector("#itemGuideBtn");
const settingsPanel = document.querySelector("#settingsPanel");
const shakeToggle = document.querySelector("#shakeToggle");
const flashToggle = document.querySelector("#flashToggle");
const muteToggle = document.querySelector("#muteToggle");
const hudButtons = document.querySelector("#hudButtons");
const moveStick = document.querySelector("#moveStick");
const missileBtn = document.querySelector("#missileBtn");
const boostBtn = document.querySelector("#boostBtn");
const pauseBtn = document.querySelector("#pauseBtn");
const devPanel = document.querySelector("#dev");
const statusLive = document.querySelector("#status");
const upgradePanel = document.querySelector("#upgradePanel");
const upgradeEyebrow = document.querySelector("#upgradeEyebrow");
const upgradeTitle = document.querySelector("#upgradeTitle");
const upgradeHint = document.querySelector("#upgradeHint");
const upgradeChoices = document.querySelector("#upgradeChoices");
const testToggleBtn = document.querySelector("#testToggle");
const testPanel = document.querySelector("#testPanel");
const testStageButtonsRoot = document.querySelector("#testStageButtons");
const testBossBtn = document.querySelector("#testBossBtn");
const testDefeatBossBtn = document.querySelector("#testDefeatBossBtn");
const testMaxCoresBtn = document.querySelector("#testMaxCoresBtn");
const testInvincibleToggle = document.querySelector("#testInvincibleToggle");
const testNotice = document.querySelector("#testNotice");
const audioCreditsLabel = document.querySelector("#audioCreditsLabel");
const briefingPanel = document.querySelector("#briefingPanel");
const briefingShell = document.querySelector(".briefing-shell");
const briefingEyebrow = document.querySelector("#briefingEyebrow");
const briefingTitle = document.querySelector("#briefingTitle");
const briefingLead = document.querySelector("#briefingLead");
const briefingControlsTitle = document.querySelector("#briefingControlsTitle");
const briefingMissileTitle = document.querySelector("#briefingMissileTitle");
const briefingMissileDescription = document.querySelector("#briefingMissileDescription");
const briefingMissileKey = document.querySelector("#briefingMissileKey");
const briefingOverdriveTitle = document.querySelector("#briefingOverdriveTitle");
const briefingOverdriveDescription = document.querySelector("#briefingOverdriveDescription");
const briefingOverdriveKey = document.querySelector("#briefingOverdriveKey");
const briefingPickupTitle = document.querySelector("#briefingPickupTitle");
const briefingPickupDescription = document.querySelector("#briefingPickupDescription");
const briefingPickupKey = document.querySelector("#briefingPickupKey");
const briefingPickupsTitle = document.querySelector("#briefingPickupsTitle");
const briefingPickups = document.querySelector("#briefingPickups");
const briefingLaunchBtn = document.querySelector("#briefingLaunchBtn");
const itemGuidePanel = document.querySelector("#itemGuidePanel");
const itemGuideEyebrow = document.querySelector("#itemGuideEyebrow");
const itemGuideTitle = document.querySelector("#itemGuideTitle");
const itemGuideLead = document.querySelector("#itemGuideLead");
const itemGuidePickupTitle = document.querySelector("#itemGuidePickupTitle");
const itemGuidePickups = document.querySelector("#itemGuidePickups");
const itemGuideCloseBtn = document.querySelector("#itemGuideCloseBtn");
const testStageButtons = [];
let testInvincible = TEST_MODE;
let lastTestControlsKey = "";

document.documentElement.lang = (navigator.language || "en").toLowerCase().startsWith("ko") ? "ko" : "en";
document.title = STR.title;
canvas.setAttribute("aria-label", `${STR.title}. ${STR.objective}`);
document.querySelector("#eyebrow").textContent = STR.sortie;
gameTitle.textContent = STR.title;
tagline.textContent = STR.tagline;
document.querySelector("#shakeLabel").textContent = STR.reduceShake;
document.querySelector("#flashLabel").textContent = STR.reduceFlash;
document.querySelector("#muteLabel").textContent = STR.mute;
missileBtn.textContent = STR.missileButton;
missileBtn.setAttribute("aria-label", STR.missileButton);
boostBtn.textContent = STR.boostButton;
boostBtn.setAttribute("aria-label", STR.boostButton);
pauseBtn.setAttribute("aria-label", STR.pauseButton);
document.querySelector("#controlsHelp").textContent =
  `${STR.controlsKeyboard} · ${STR.controlsTouch} · ${STR.controlsPad}`;
audioCreditsLabel.textContent = STR.audioCreditsLabel;
briefingEyebrow.textContent = STR.briefingEyebrow;
briefingTitle.textContent = STR.briefingTitle;
briefingLead.textContent = STR.briefingLead;
briefingControlsTitle.textContent = STR.briefingControlsTitle;
briefingMissileTitle.textContent = STR.briefingMissileTitle;
briefingMissileDescription.textContent = STR.briefingMissileDescription;
briefingMissileKey.textContent = STR.briefingMissileKey;
briefingOverdriveTitle.textContent = STR.briefingOverdriveTitle;
briefingOverdriveDescription.textContent = STR.briefingOverdriveDescription;
briefingOverdriveKey.textContent = STR.briefingOverdriveKey;
briefingPickupTitle.textContent = STR.briefingPickupTitle;
briefingPickupDescription.textContent = STR.briefingPickupDescription;
briefingPickupKey.textContent = STR.briefingPickupKey;
briefingPickupsTitle.textContent = STR.briefingPickupsTitle;
briefingLaunchBtn.textContent = STR.briefingLaunch;
briefingLaunchBtn.setAttribute("aria-label", STR.briefingLaunch);
itemGuideEyebrow.textContent = STR.itemGuideEyebrow;
itemGuideTitle.textContent = STR.itemGuideTitle;
itemGuideLead.textContent = STR.itemGuideLead;
itemGuidePickupTitle.textContent = STR.itemGuidePickupTitle;
itemGuideCloseBtn.textContent = STR.itemGuideClose;
itemGuideCloseBtn.setAttribute("aria-label", STR.itemGuideClose);
document.querySelector("#resultStats").setAttribute("aria-label", STR.resultScore);
document.querySelector("#resultScoreLabel").textContent = STR.resultScore;
document.querySelector("#resultBestLabel").textContent = STR.resultBest;
document.querySelector("#resultStageLabel").textContent = STR.resultStage;
document.querySelector("#resultKillsLabel").textContent = STR.resultKills;
moveStick.setAttribute("aria-label", STR.moveStick);
settingsBtn.textContent = STR.settings;
settingsBtn.setAttribute("aria-label", STR.accessibilityOpen);
itemGuideBtn.textContent = STR.itemGuideButton;
itemGuideBtn.setAttribute("aria-label", STR.itemGuideButton);
restartBtn.textContent = STR.restart;
upgradeEyebrow.textContent = STR.stageClear;
upgradeTitle.textContent = STR.chooseUpgrade;
upgradeHint.textContent = STR.chooseUpgradeHint;
document.querySelector("#testTitle").textContent = STR.testMode;
document.querySelector("#testDescription").textContent = STR.testDescription;
document.querySelector("#testInvincibleLabel").textContent = STR.testInvincible;
testBossBtn.textContent = STR.testBoss;
testDefeatBossBtn.textContent = STR.testDefeatBoss;
testMaxCoresBtn.textContent = STR.testMaxCores;
testNotice.textContent = STR.testOnly;
testToggleBtn.setAttribute("aria-label", STR.testClose);
testInvincibleToggle.checked = testInvincible;

function createItemCards(catalog, copyCatalog) {
  const fragment = document.createDocumentFragment();
  for (const [itemId, item] of Object.entries(catalog)) {
    const copy = copyCatalog[itemId];
    if (!copy) continue;
    const card = document.createElement("article");
    card.className = "briefing-item";
    card.setAttribute("aria-label", `${copy.name}. ${copy.description}`);

    const heading = document.createElement("div");
    heading.className = "briefing-item-heading";
    const icon = document.createElement("span");
    icon.className = "briefing-item-icon";
    icon.textContent = item.icon;
    icon.setAttribute("aria-hidden", "true");
    const name = document.createElement("strong");
    name.className = "briefing-item-name";
    name.textContent = copy.name;
    heading.append(icon, name);

    const description = document.createElement("span");
    description.className = "briefing-item-description";
    description.textContent = copy.description;
    card.append(heading, description);
    fragment.append(card);
  }
  return fragment;
}

function renderBriefingItems() {
  briefingPickups.replaceChildren(createItemCards(PICKUPS, STR.pickups));
  itemGuidePickups.replaceChildren(createItemCards(PICKUPS, STR.pickups));
}

function showBriefing() {
  briefingPanel.hidden = false;
  briefingShell.scrollTop = 0;
  briefingLaunchBtn.focus({ preventScroll: true });
  requestAnimationFrame(() => {
    briefingShell.scrollTop = 0;
  });
}

function hideBriefing() {
  briefingPanel.hidden = true;
}

function showItemGuide() {
  itemGuidePanel.hidden = false;
  itemGuideCloseBtn.focus({ preventScroll: true });
}

function hideItemGuide() {
  itemGuidePanel.hidden = true;
  itemGuideBtn.focus({ preventScroll: true });
}

function hasSeenBriefing() {
  return localStorage.getItem(BRIEFING_SEEN_KEY) === "1";
}

function rememberBriefing() {
  localStorage.setItem(BRIEFING_SEEN_KEY, "1");
}

renderBriefingItems();

if (TEST_MODE) {
  testToggleBtn.hidden = false;
  testPanel.hidden = false;
  for (let index = 0; index < STAGES.length; index += 1) {
    const stage = STAGES[index];
    const button = document.createElement("button");
    button.className = "test-stage-button";
    button.type = "button";
    button.textContent = String(index + 1);
    button.title = STR[stage.nameKey];
    button.setAttribute("aria-label", `${STR.stage} ${index + 1}: ${STR[stage.nameKey]}`);
    button.setAttribute("aria-pressed", "false");
    button.disabled = true;
    button.addEventListener("click", () => jumpToTestStage(index));
    testStageButtonsRoot.append(button);
    testStageButtons.push(button);
  }
} else {
  testInvincibleToggle.checked = false;
}

testToggleBtn.addEventListener("click", () => {
  const open = testPanel.hidden;
  testPanel.hidden = !open;
  testToggleBtn.setAttribute("aria-expanded", String(open));
  testToggleBtn.setAttribute("aria-label", open ? STR.testClose : STR.testOpen);
});
testBossBtn.addEventListener("click", showTestBoss);
testDefeatBossBtn.addEventListener("click", defeatTestBoss);
testMaxCoresBtn.addEventListener("click", maxTestCores);
testInvincibleToggle.addEventListener("change", () => {
  testInvincible = testInvincibleToggle.checked;
  syncTestControls(true);
});

const settings = {
  reduceShake: localStorage.getItem("bw-reduce-shake") === "1" || matchMedia("(prefers-reduced-motion: reduce)").matches,
  reduceFlash: localStorage.getItem("bw-reduce-flash") === "1",
  muted: localStorage.getItem("bw-muted") === "1",
};
shakeToggle.checked = settings.reduceShake;
flashToggle.checked = settings.reduceFlash;
muteToggle.checked = settings.muted;

function saveSettings() {
  localStorage.setItem("bw-reduce-shake", settings.reduceShake ? "1" : "0");
  localStorage.setItem("bw-reduce-flash", settings.reduceFlash ? "1" : "0");
  localStorage.setItem("bw-muted", settings.muted ? "1" : "0");
  audio.setMuted(settings.muted);
}

shakeToggle.addEventListener("change", () => {
  settings.reduceShake = shakeToggle.checked;
  saveSettings();
});
flashToggle.addEventListener("change", () => {
  settings.reduceFlash = flashToggle.checked;
  saveSettings();
});
muteToggle.addEventListener("change", () => {
  settings.muted = muteToggle.checked;
  saveSettings();
});

settingsBtn.addEventListener("click", () => {
  const open = settingsPanel.hidden;
  settingsPanel.hidden = !open;
  settingsBtn.setAttribute("aria-expanded", String(open));
  settingsBtn.setAttribute("aria-label", open ? STR.accessibilityClose : STR.accessibilityOpen);
});
itemGuideBtn.addEventListener("click", showItemGuide);
itemGuideCloseBtn.addEventListener("click", hideItemGuide);

let cssW = innerWidth;
let cssH = innerHeight;
let viewScale = 1;
let viewX = 0;
let viewY = 0;
let dpr = 1;
let viewportMode = "contain";
let visibleWorld = Object.freeze({ left: 0, top: 0, right: WORLD_W, bottom: WORLD_H, width: WORLD_W, height: WORLD_H });

function isCoarsePointer() {
  return matchMedia("(pointer: coarse)").matches;
}

function resize() {
  cssW = innerWidth;
  cssH = innerHeight;
  const coarsePointer = isCoarsePointer();
  dpr = Math.min(devicePixelRatio || 1, coarsePointer ? MOBILE_DPR_CAP : DPR_CAP);
  canvas.width = Math.max(1, Math.round(cssW * dpr));
  canvas.height = Math.max(1, Math.round(cssH * dpr));
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  const layout = createViewportLayout({
    screenWidth: cssW,
    screenHeight: cssH,
    worldWidth: WORLD_W,
    worldHeight: WORLD_H,
    coarsePointer,
  });
  viewScale = layout.scale;
  viewX = layout.x;
  viewY = layout.y;
  viewportMode = layout.mode;
  visibleWorld = layout.visibleWorld;
  document.documentElement.dataset.viewportMode = viewportMode;
}
addEventListener("resize", resize);
addEventListener("orientationchange", resize);
resize();

const manifestAssets = {
  hero_jet: "./assets/hero_jet.png",
  enemy_scout: "./assets/enemy_scout.png",
  enemy_interceptor: "./assets/enemy_interceptor.png",
  enemy_bomber: "./assets/enemy_bomber.png",
  boss_carrier: "./assets/boss_carrier.png",
  boss_moloch: "./assets/boss_moloch.png",
  boss_phantom: "./assets/boss_phantom.png",
  boss_boreas: "./assets/boss_boreas.png",
  boss_erebus: "./assets/boss_erebus.png",
  explosion_burst: "./assets/explosion_burst.png",
  ocean_backdrop: "./assets/ocean_backdrop.png",
  canyon_backdrop: "./assets/canyon_backdrop.png",
  neon_backdrop: "./assets/neon_backdrop.png",
  boreal_backdrop: "./assets/boreal_backdrop.png",
  erebus_backdrop: "./assets/erebus_backdrop.png",
  cover_art: "./assets/cover_art.png",
  favicon_emblem: "./assets/favicon_emblem.png",
};
const audioAssets = {
  combat_music: "./assets/audio/fight_looped.wav",
  sfx_missile: "./assets/audio/rocket-launcher-307512.mp3",
  sfx_explosion: "synth",
  sfx_boost: "./assets/audio/boost.mp3",
  sfx_warning: "synth",
  boss_stinger: "synth",
};
const imageSources = {
  hero: manifestAssets.hero_jet,
  scout: manifestAssets.enemy_scout,
  interceptor: manifestAssets.enemy_interceptor,
  bomber: manifestAssets.enemy_bomber,
  bossCarrier: manifestAssets.boss_carrier,
  bossMoloch: manifestAssets.boss_moloch,
  bossPhantom: manifestAssets.boss_phantom,
  bossBoreas: manifestAssets.boss_boreas,
  bossErebus: manifestAssets.boss_erebus,
  explosion: manifestAssets.explosion_burst,
  backgroundTempest: manifestAssets.ocean_backdrop,
  backgroundCanyon: manifestAssets.canyon_backdrop,
  backgroundNeon: manifestAssets.neon_backdrop,
  backgroundBoreal: manifestAssets.boreal_backdrop,
  backgroundErebus: manifestAssets.erebus_backdrop,
  emblem: manifestAssets.favicon_emblem,
};
const images = {};
let assetsReady = false;
let assetFailure = false;

function loadImage(id, src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => { images[id] = img; resolve(img); };
    img.onerror = reject;
    img.src = src;
  });
}

async function loadAssets() {
  assetsReady = false;
  assetFailure = false;
  startBtn.disabled = true;
  startBtn.textContent = STR.loading;
  overlayMessage.textContent = STR.loading;
  try {
    await Promise.all(Object.entries(imageSources).map(([id, src]) => loadImage(id, src)));
  } catch {
    assetFailure = true;
  }
  assetsReady = true;
  startBtn.disabled = false;
  startBtn.textContent = assetFailure ? STR.retry : STR.start;
  overlayMessage.textContent = assetFailure ? STR.loadError : STR.objective;
  syncTestControls(true);
}

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.music = null;
    this.musicFilter = null;
    this.sfx = null;
    this.musicElement = null;
    this.musicElementSource = null;
    this.missileBuffer = null;
    this.boostBuffer = null;
    this.noiseBuffer = null;
    this.musicNodes = null;
    this.lastBeat = -1;
    this.lastCannonAt = -10;
  }

  async init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      this.startMusic();
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    this.ctx = new AudioContextClass();
    this.ctx.resume().catch(() => {});
    this.master = this.ctx.createGain();
    this.music = this.ctx.createGain();
    this.musicFilter = this.ctx.createBiquadFilter();
    this.sfx = this.ctx.createGain();
    this.master.gain.value = settings.muted ? 0 : 0.72;
    this.music.gain.value = 0.2;
    this.musicFilter.type = "lowpass";
    this.musicFilter.frequency.value = 2200;
    this.musicFilter.Q.value = 0.45;
    this.sfx.gain.value = 0.34;
    this.music.connect(this.musicFilter).connect(this.master);
    this.sfx.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.musicElement = new Audio(audioAssets.combat_music);
    this.musicElement.loop = true;
    this.musicElement.preload = "auto";
    this.musicElement.volume = 1;
    this.musicElementSource = this.ctx.createMediaElementSource(this.musicElement);
    this.musicElementSource.connect(this.music);
    this.startMusic();
    this.noiseBuffer = this.makeNoise();
    const missile = this.fetchBuffer(audioAssets.sfx_missile);
    const boost = this.fetchBuffer(audioAssets.sfx_boost);
    [this.missileBuffer, this.boostBuffer] = await Promise.all([missile, boost]);
    this.startMusic();
  }

  startMusic() {
    if (!this.musicElement) return;
    const playPromise = this.musicElement.play();
    if (playPromise?.catch) playPromise.catch(() => {});
  }

  async fetchBuffer(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      return await this.ctx.decodeAudioData(await response.arrayBuffer());
    } catch {
      return null;
    }
  }

  makeNoise() {
    const length = Math.round(this.ctx.sampleRate * 2);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    let seed = 0x51f15e;
    for (let i = 0; i < length; i += 1) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      channel[i] = ((seed >>> 0) / 4294967295) * 2 - 1;
    }
    return buffer;
  }

  tick() {}

  setMusicMode(mode = "running") {
    if (!this.ctx || !this.music || !this.musicFilter) return;
    const now = this.ctx.currentTime;
    const values = {
      running: { gain: 0.2, filter: 2200 },
      paused: { gain: 0.045, filter: 920 },
      defeat: { gain: 0.028, filter: 560 },
      victory: { gain: 0.07, filter: 1500 },
    };
    const target = values[mode] || values.running;
    this.music.gain.setTargetAtTime(target.gain, now, 0.2);
    this.musicFilter.frequency.setTargetAtTime(target.filter, now, 0.24);
  }

  setMuted(muted) {
    if (!this.master || !this.ctx) return;
    this.master.gain.setTargetAtTime(muted ? 0 : 0.72, this.ctx.currentTime, 0.02);
  }

  playBuffer(buffer, gainValue = 0.3, rate = 1) {
    if (!this.ctx || !buffer || settings.muted) return;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    gain.gain.value = gainValue;
    source.connect(gain).connect(this.sfx);
    source.start();
  }

  cannon(gameTime) {
    if (gameTime - this.lastCannonAt < 0.14) return;
    this.lastCannonAt = gameTime;
    if (!this.ctx || !this.noiseBuffer || settings.muted) return;
    const source = this.ctx.createBufferSource();
    const highpass = this.ctx.createBiquadFilter();
    const lowpass = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    source.buffer = this.noiseBuffer;
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(480, now);
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(2600, now);
    lowpass.frequency.exponentialRampToValueAtTime(820, now + 0.065);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    source.connect(highpass).connect(lowpass).connect(gain).connect(this.sfx);
    source.start(now);
    source.stop(now + 0.09);
  }

  missile() {
    this.playBuffer(this.missileBuffer, 0.62, 0.94 + Math.random() * 0.12);
  }

  boost() {
    if (this.boostBuffer) this.playBuffer(this.boostBuffer, 0.34, 1);
    else this.sweep(90, 520, 0.55, "sawtooth", 0.22);
  }

  warning() {
    this.tone(760, 0.13, "square", 0.18);
    setTimeout(() => this.tone(540, 0.18, "square", 0.18), 150);
  }

  bossStinger() {
    this.tone(54, 1.3, "sawtooth", 0.25, 32);
    this.sweep(120, 42, 1.8, "sawtooth", 0.18);
  }

  explosion(strength = 1) {
    if (!this.ctx || settings.muted) return;
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1300, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.24 * strength, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.58);
    source.connect(filter).connect(gain).connect(this.sfx);
    source.start();
    source.stop(this.ctx.currentTime + 0.62);
  }

  pickup() {
    this.sweep(480, 980, 0.15, "sine", 0.12);
  }

  hit() {
    this.tone(82, 0.24, "sawtooth", 0.22, 42);
  }

  tone(freq, duration, type, volume, endFreq = freq) {
    if (!this.ctx || settings.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), this.ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain).connect(this.sfx);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  sweep(from, to, duration, type, volume) {
    this.tone(from, duration, type, volume, to);
  }
}

const audio = new AudioEngine();

const input = {
  up: false,
  down: false,
  left: false,
  right: false,
  missileEdge: false,
  boostEdge: false,
  itemEdge: false,
  itemSlot: -1,
  pauseEdge: false,
  pointer: false,
  pointerTouch: false,
  stickActive: false,
  stickX: 0,
  stickY: 0,
  targetX: WORLD_W * 0.5,
  targetY: WORLD_H * 0.82,
  injectedMissile: false,
  injectedBoost: false,
  injectedItem: false,
  injectedItemSlot: 0,
};

let activePointerId = null;
let activeTouchLead = 0;
let activeStickPointerId = null;

function resetMoveStick() {
  input.stickActive = false;
  input.stickX = 0;
  input.stickY = 0;
  activeStickPointerId = null;
  moveStick.dataset.active = "false";
  moveStick.style.setProperty("--stick-x", "0px");
  moveStick.style.setProperty("--stick-y", "0px");
}

function releaseTransientInput() {
  input.up = false;
  input.down = false;
  input.left = false;
  input.right = false;
  input.missileEdge = false;
  input.boostEdge = false;
  input.itemEdge = false;
  input.pauseEdge = false;
  input.pointer = false;
  input.pointerTouch = false;
  input.injectedMissile = false;
  input.injectedBoost = false;
  input.injectedItem = false;
  input.itemSlot = -1;
  input.injectedItemSlot = 0;
  activePointerId = null;
  activeTouchLead = 0;
  resetMoveStick();
  padX = 0;
  padY = 0;
}

const keyMap = {
  KeyW: "up",
  ArrowUp: "up",
  KeyS: "down",
  ArrowDown: "down",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
};

addEventListener("keydown", (event) => {
  const move = keyMap[event.code];
  if (move) {
    input[move] = true;
    input.pointer = false;
    event.preventDefault();
  }
  if (!event.repeat && event.code === "Space") {
    input.missileEdge = true;
    event.preventDefault();
  }
  if (!event.repeat && (event.code === "ShiftLeft" || event.code === "ShiftRight" || event.code === "KeyX")) {
    input.boostEdge = true;
    event.preventDefault();
  }
  if (!event.repeat && (event.code === "Digit1" || event.code === "Numpad1" || event.code === "Digit2" || event.code === "Numpad2")) {
    input.itemEdge = true;
    input.itemSlot = event.code.endsWith("1") ? 0 : 1;
    event.preventDefault();
  }
  if (!event.repeat && event.code === "Escape") {
    input.pauseEdge = true;
    event.preventDefault();
  }
});
addEventListener("keyup", (event) => {
  const move = keyMap[event.code];
  if (move) input[move] = false;
});

function pointerIsTouch(event) {
  return event.pointerType === "touch" || (event.pointerType === "" && isCoarsePointer());
}

function useMoveStickForTouch() {
  return viewportMode === "portrait-cover" && isCoarsePointer();
}

function clientToWorld(event) {
  return {
    x: (event.clientX - viewX) / viewScale,
    y: (event.clientY - viewY) / viewScale,
  };
}

function pointerToWorld(event) {
  const point = clientToWorld(event);
  input.targetX = Math.max(0, Math.min(WORLD_W, point.x));
  input.targetY = Math.max(0, Math.min(WORLD_H, point.y - activeTouchLead));
}
canvas.addEventListener("pointerdown", (event) => {
  if (pointerIsTouch(event) && useMoveStickForTouch()) {
    event.preventDefault();
    return;
  }
  if (activePointerId !== null) return;
  activePointerId = event.pointerId;
  input.pointer = true;
  input.pointerTouch = pointerIsTouch(event);
  activeTouchLead = input.pointerTouch ? getTouchLeadWorld(viewportMode) : 0;
  pointerToWorld(event);
  canvas.setPointerCapture(event.pointerId);
  event.preventDefault();
});
canvas.addEventListener("pointermove", (event) => {
  if (!input.pointer || event.pointerId !== activePointerId) return;
  pointerToWorld(event);
  event.preventDefault();
});
canvas.addEventListener("pointerup", (event) => {
  if (event.pointerId !== activePointerId) return;
  input.pointer = false;
  input.pointerTouch = false;
  activePointerId = null;
  activeTouchLead = 0;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  event.preventDefault();
});
canvas.addEventListener("pointercancel", releaseTransientInput);
function updateMoveStick(event) {
  const rect = moveStick.getBoundingClientRect();
  const vector = calculateJoystickVector({
    clientX: event.clientX,
    clientY: event.clientY,
    centerX: rect.left + rect.width * 0.5,
    centerY: rect.top + rect.height * 0.5,
    radius: rect.width * 0.34,
  });
  input.stickX = vector.inputX;
  input.stickY = vector.inputY;
  moveStick.style.setProperty("--stick-x", `${vector.knobX.toFixed(1)}px`);
  moveStick.style.setProperty("--stick-y", `${vector.knobY.toFixed(1)}px`);
}

moveStick.addEventListener("pointerdown", (event) => {
  if (activeStickPointerId !== null) return;
  activeStickPointerId = event.pointerId;
  input.pointer = false;
  input.pointerTouch = false;
  activePointerId = null;
  activeTouchLead = 0;
  input.stickActive = true;
  moveStick.dataset.active = "true";
  updateMoveStick(event);
  moveStick.setPointerCapture(event.pointerId);
  event.stopPropagation();
  event.preventDefault();
});
moveStick.addEventListener("pointermove", (event) => {
  if (event.pointerId !== activeStickPointerId) return;
  updateMoveStick(event);
  event.stopPropagation();
  event.preventDefault();
});
function releaseMoveStick(event) {
  if (event.pointerId !== activeStickPointerId) return;
  if (moveStick.hasPointerCapture(event.pointerId)) moveStick.releasePointerCapture(event.pointerId);
  resetMoveStick();
  event.stopPropagation();
  event.preventDefault();
}
moveStick.addEventListener("pointerup", releaseMoveStick);
moveStick.addEventListener("pointercancel", releaseMoveStick);
missileBtn.addEventListener("pointerdown", (event) => {
  input.missileEdge = true;
  event.stopPropagation();
  event.preventDefault();
});
boostBtn.addEventListener("pointerdown", (event) => {
  input.boostEdge = true;
  event.stopPropagation();
  event.preventDefault();
});
pauseBtn.addEventListener("click", () => { input.pauseEdge = true; });

let padMissileWasDown = false;
let padBoostWasDown = false;
let padItemWasDown = false;
let padPauseWasDown = false;
let padX = 0;
let padY = 0;

function pollGamepad() {
  padX = 0;
  padY = 0;
  const pads = navigator.getGamepads?.() || [];
  let foundPad = false;
  for (let p = 0; p < pads.length; p += 1) {
    const gp = pads[p];
    if (!gp) continue;
    foundPad = true;
    const dead = 0.18;
    const ax = Math.abs(gp.axes[0] || 0) > dead ? gp.axes[0] : 0;
    const ay = Math.abs(gp.axes[1] || 0) > dead ? gp.axes[1] : 0;
    padX = ax + (gp.buttons[15]?.pressed ? 1 : 0) - (gp.buttons[14]?.pressed ? 1 : 0);
    padY = ay + (gp.buttons[13]?.pressed ? 1 : 0) - (gp.buttons[12]?.pressed ? 1 : 0);
    const missileDown = Boolean(gp.buttons[0]?.pressed);
    const boostDown = Boolean(gp.buttons[1]?.pressed || gp.buttons[7]?.pressed);
    const itemDown = Boolean(gp.buttons[2]?.pressed);
    const pauseDown = Boolean(gp.buttons[9]?.pressed);
    if (missileDown && !padMissileWasDown) input.missileEdge = true;
    if (boostDown && !padBoostWasDown) input.boostEdge = true;
    if (itemDown && !padItemWasDown) {
      input.itemEdge = true;
      input.itemSlot = 0;
    }
    if (pauseDown && !padPauseWasDown) input.pauseEdge = true;
    padMissileWasDown = missileDown;
    padBoostWasDown = boostDown;
    padItemWasDown = itemDown;
    padPauseWasDown = pauseDown;
    break;
  }
  if (!foundPad) {
    padMissileWasDown = false;
    padBoostWasDown = false;
    padItemWasDown = false;
    padPauseWasDown = false;
  }
}

function makeEnemy() {
  return {
    active: false, type: 0, x: 0, y: 0, vx: 0, vy: 0, hp: 0, maxHp: 0,
    age: 0, phase: 0, shoot: 0, altShoot: 0, summon: 0, radius: 28, score: 0, hitFlash: 0,
  };
}
function makeShot() {
  return {
    active: false, team: 0, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0,
    radius: 4, damage: 0, life: 0, grazed: false, pierce: 0, lastHit: null,
  };
}
function makeMissile() {
  return { active: false, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, life: 0, target: null, angle: 0 };
}
function makePickup() {
  return { active: false, itemId: "", x: 0, y: 0, vx: 0, vy: 0, life: 0, phase: 0 };
}
function makeEffect() {
  return { active: false, x: 0, y: 0, age: 0, duration: 0.5, scale: 1, angle: 0 };
}

const enemies = Array.from({ length: MAX_ENEMIES }, makeEnemy);
const shots = Array.from({ length: MAX_SHOTS }, makeShot);
const missiles = Array.from({ length: MAX_MISSILES }, makeMissile);
const pickups = Array.from({ length: MAX_PICKUPS }, makePickup);
const effects = Array.from({ length: MAX_EFFECTS }, makeEffect);
const lockTargets = Array.from({ length: 7 }, () => null);
const player = {
  x: WORLD_W * 0.5,
  y: WORLD_H * 0.84,
  vx: 0,
  vy: 0,
  radius: 20,
  hp: 100,
  fire: 0,
  invulnerable: 0,
  overdrive: 0,
  overdriveTime: 0,
  missileCharges: 3,
  missileRecharge: 0,
  bank: 0,
  shield: 0,
};
const state = {
  mode: "start",
  seed: 0x13a7c0de,
  time: 0,
  stageTime: 0,
  stageIndex: 0,
  intro: 0,
  score: 0,
  best: Number(localStorage.getItem("bw-best") || 0),
  combo: 1,
  comboTimer: 0,
  nextWave: 0,
  wave: 0,
  bossSpawned: false,
  boss: null,
  banner: "",
  bannerTime: 0,
  actionFeedback: "",
  actionFeedbackDetail: "",
  actionFeedbackKind: "",
  actionFeedbackTime: 0,
  itemInventory: [],
  lockBoostTime: 0,
  timeWarpTime: 0,
  shake: 0,
  flash: 0,
  lockRefresh: 0,
  kills: 0,
  victory: false,
  bossStingerDelay: 0,
  pendingVictory: false,
  victoryDelay: 0,
  itemLevels: createItemLevels(),
  itemStats: getItemStats(createItemLevels()),
};

let lastMissileButtonKey = "";
let lastBoostButtonKey = "";

function syncActionButtons(force = false) {
  const missileKey = `${state.mode}:${player.missileCharges}`;
  if (force || missileKey !== lastMissileButtonKey) {
    lastMissileButtonKey = missileKey;
    const available = state.mode === "running" && player.missileCharges > 0;
    const label = player.missileCharges > 0
      ? `${STR.missileButton} (${player.missileCharges})`
      : STR.missileUnavailable;
    missileBtn.disabled = !available;
    missileBtn.title = label;
    missileBtn.setAttribute("aria-label", label);
  }

  const boostState = player.overdriveTime > 0 ? "active" : player.overdrive >= 100 ? "ready" : "charging";
  const boostKey = `${state.mode}:${boostState}`;
  if (force || boostKey !== lastBoostButtonKey) {
    lastBoostButtonKey = boostKey;
    const available = state.mode === "running" && boostState === "ready";
    const label = boostState === "active"
      ? STR.boostActive
      : boostState === "ready"
        ? STR.boostButton
        : STR.boostUnavailable;
    boostBtn.disabled = !available;
    boostBtn.dataset.ready = String(available);
    boostBtn.title = label;
    boostBtn.setAttribute("aria-label", label);
  }

}

function rand() {
  let x = state.seed | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.seed = x | 0;
  return (x >>> 0) / 4294967296;
}

function clearPool(pool) {
  for (let i = 0; i < pool.length; i += 1) {
    pool[i].active = false;
    if ("itemId" in pool[i]) pool[i].itemId = "";
  }
}

function spawnEnemy(type, x, y, phase = 0) {
  const stage = getStage(state.stageIndex);
  const hpScale = stage.difficulty;
  for (let i = 0; i < enemies.length; i += 1) {
    const enemy = enemies[i];
    if (enemy.active) continue;
    enemy.active = true;
    enemy.type = type;
    enemy.x = x;
    enemy.y = y;
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.age = 0;
    enemy.phase = phase;
    enemy.shoot = 0.6 + rand() * 0.8;
    enemy.altShoot = 2.5;
    enemy.summon = 6.5;
    enemy.hitFlash = 0;
    if (type === 0) {
      enemy.hp = enemy.maxHp = Math.round(12 * hpScale);
      enemy.radius = 24;
      enemy.score = Math.round(150 * hpScale);
    } else if (type === 1) {
      enemy.hp = enemy.maxHp = Math.round(26 * hpScale);
      enemy.radius = 29;
      enemy.score = Math.round(320 * hpScale);
    } else if (type === 2) {
      enemy.hp = enemy.maxHp = Math.round(68 * hpScale);
      enemy.radius = 42;
      enemy.score = Math.round(720 * hpScale);
    } else {
      enemy.hp = enemy.maxHp = QUICK ? Math.round(stage.bossHp * 0.34) : stage.bossHp;
      enemy.radius = 112;
      enemy.score = Math.round(12000 * stage.difficulty);
      state.boss = enemy;
    }
    return enemy;
  }
  return null;
}

function spawnShot(team, x, y, vx, vy, radius, damage, life = 5, pierce = 0) {
  for (let i = 0; i < shots.length; i += 1) {
    const shot = shots[i];
    if (shot.active) continue;
    shot.active = true;
    shot.team = team;
    shot.x = shot.px = x;
    shot.y = shot.py = y;
    shot.vx = vx;
    shot.vy = vy;
    shot.radius = radius;
    shot.damage = damage;
    shot.life = life;
    shot.grazed = false;
    shot.pierce = pierce;
    shot.lastHit = null;
    return shot;
  }
  return null;
}

function spawnEffect(x, y, scale = 1, duration = 0.52) {
  for (let i = 0; i < effects.length; i += 1) {
    const effect = effects[i];
    if (effect.active) continue;
    effect.active = true;
    effect.x = x;
    effect.y = y;
    effect.age = 0;
    effect.duration = duration;
    effect.scale = scale;
    effect.angle = rand() * Math.PI * 2;
    return effect;
  }
  return null;
}

function spawnPickup(x, y) {
  for (let i = 0; i < pickups.length; i += 1) {
    const pickup = pickups[i];
    if (pickup.active) continue;
    pickup.active = true;
    pickup.itemId = getRandomPickupId(state.stageIndex, rand);
    pickup.x = x;
    pickup.y = y;
    pickup.vx = (rand() - 0.5) * 55;
    pickup.vy = 80 + rand() * 45;
    pickup.life = 8;
    pickup.phase = rand() * Math.PI * 2;
    return pickup;
  }
  return null;
}

function aimedVelocity(fromX, fromY, toX, toY, speed) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.hypot(dx, dy) || 1;
  return [dx / length * speed, dy / length * speed];
}

function shootAimed(enemy, speed = 215, spread = 0, damage = 10) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const base = Math.atan2(dy, dx);
  const count = spread > 0 ? 3 : 1;
  for (let i = 0; i < count; i += 1) {
    const angle = base + (i - (count - 1) * 0.5) * spread;
    spawnShot(2, enemy.x, enemy.y + enemy.radius * 0.5, Math.cos(angle) * speed, Math.sin(angle) * speed, 6, damage);
  }
}

function shootFan(enemy, count, speed, spread, damage) {
  const base = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  for (let index = 0; index < count; index += 1) {
    const angle = base + (index - (count - 1) * 0.5) * spread;
    spawnShot(2, enemy.x, enemy.y + enemy.radius * 0.42, Math.cos(angle) * speed, Math.sin(angle) * speed, 6, damage);
  }
}

function shootRadial(enemy, count, speed, offset = 0, damage = 10) {
  for (let i = 0; i < count; i += 1) {
    const angle = offset + Math.PI * 2 * i / count;
    spawnShot(2, enemy.x, enemy.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 6, damage, 7);
  }
}

function setBanner(text) {
  state.banner = text;
  state.bannerTime = 2.2;
  statusLive.textContent = text;
}

function showActionFeedback(label, detail, kind) {
  state.actionFeedback = label;
  state.actionFeedbackDetail = detail;
  state.actionFeedbackKind = kind;
  state.actionFeedbackTime = 1.1;
  statusLive.textContent = `${label} · ${detail}`;
}

function spawnWave() {
  state.wave += 1;
  const t = state.stageTime;
  const bossAt = getBossTime(state.stageIndex, QUICK);
  const section = Math.min(3, Math.floor(t / bossAt * 4));
  const extra = Math.floor(state.stageIndex / 2);
  if (section === 0) {
    setBanner(STR.waveScout);
    const count = 4 + extra + Math.min(2, Math.floor(state.wave / 2));
    for (let i = 0; i < count; i += 1) {
      spawnEnemy(0, 105 + i * (510 / Math.max(1, count - 1)), -70 - Math.abs(i - count * 0.5) * 34, i * 0.7);
    }
  } else if (section === 1) {
    setBanner(STR.waveInterceptor);
    spawnEnemy(1, 130, -80, 0);
    spawnEnemy(1, 590, -120, Math.PI);
    for (let i = 0; i < 3 + extra; i += 1) spawnEnemy(0, 250 + i * (220 / Math.max(1, 2 + extra)), -190 - i * 44, i);
  } else if (section === 2) {
    setBanner(STR.waveBomber);
    spawnEnemy(2, 215 + rand() * 290, -120, rand() * 5);
    if (state.stageIndex >= 3) spawnEnemy(2, 160 + rand() * 400, -260, rand() * 5);
    for (let i = 0; i < 4 + extra; i += 1) spawnEnemy(i % 2, 80 + i * (560 / (3 + extra)), -240 - i * 38, i);
  } else {
    setBanner(STR.waveMixed);
    spawnEnemy(2, 360, -130, rand() * 5);
    spawnEnemy(1, 120, -210, 0);
    spawnEnemy(1, 600, -250, Math.PI);
    for (let i = 0; i < 4 + extra; i += 1) spawnEnemy(0, 120 + i * (480 / (3 + extra)), -340 - i * 30, i);
  }
  state.nextWave = t + (QUICK ? 2.2 : 5.7 + section * 0.55 - state.stageIndex * 0.18);
}

function spawnBoss() {
  if (state.bossSpawned) return;
  state.bossSpawned = true;
  const stage = getStage(state.stageIndex);
  const boss = spawnEnemy(3, WORLD_W * 0.5, -180, 0);
  state.boss = boss;
  setBanner(`${STR.bossIncoming} · ${STR[stage.bossKey]}`);
  audio.warning();
  state.bossStingerDelay = 0.33;
  state.flash = settings.reduceFlash ? 0.08 : 0.34;
}

function beginStage(index, newRun = false) {
  clearPool(enemies);
  clearPool(shots);
  clearPool(missiles);
  clearPool(pickups);
  clearPool(effects);
  state.stageIndex = index;
  state.stageTime = 0;
  state.nextWave = 1.1;
  state.wave = 0;
  state.bossSpawned = false;
  state.boss = null;
  state.bossStingerDelay = 0;
  state.pendingVictory = false;
  state.victoryDelay = 0;
  state.mode = "running";
  state.intro = 1.75;
  player.x = WORLD_W * 0.5;
  player.y = WORLD_H * 0.84;
  player.vx = 0;
  player.vy = 0;
  player.fire = 0;
  player.invulnerable = 1.5;
  player.overdriveTime = 0;
  player.missileRecharge = 0;
  player.bank = 0;
  if (newRun) {
    player.hp = state.itemStats.maxHp;
    player.overdrive = 0;
    player.missileCharges = 3;
  } else {
    player.hp = Math.min(state.itemStats.maxHp, player.hp + Math.ceil(state.itemStats.maxHp * 0.24));
    player.overdrive = Math.max(28, player.overdrive * 0.55);
    player.missileCharges = Math.max(2, player.missileCharges);
  }
  player.shield = state.itemStats.maxShield;
  const stage = getStage(index);
  setBanner(`${STR.stage} ${index + 1} / ${STAGES.length} · ${STR[stage.nameKey]}`);
  statusLive.textContent = `${STR.stage} ${index + 1}. ${STR[stage.nameKey]}`;
  upgradePanel.hidden = true;
  overlay.hidden = true;
  hudButtons.hidden = false;
  syncActionButtons(true);
  syncTestControls(true);
  canvas.focus();
}

function applyTestBuild(index) {
  const levels = createItemLevels();
  for (const [itemId, level] of Object.entries(TEST_BUILDS[index] || {})) {
    levels[itemId] = level;
  }
  state.itemLevels = levels;
  state.itemStats = getItemStats(levels);
}

function syncTestControls(force = false) {
  if (!TEST_MODE) return;
  const bossActive = Boolean(state.boss?.active);
  const controlsKey = `${assetsReady}:${assetFailure}:${state.mode}:${state.stageIndex}:${bossActive}:${testInvincible}`;
  if (!force && controlsKey === lastTestControlsKey) return;
  lastTestControlsKey = controlsKey;
  const usable = assetsReady && !assetFailure;
  for (let index = 0; index < testStageButtons.length; index += 1) {
    const button = testStageButtons[index];
    button.disabled = !usable;
    button.setAttribute("aria-pressed", String(index === state.stageIndex));
  }
  testBossBtn.disabled = !usable;
  testDefeatBossBtn.disabled = !usable || !bossActive;
  testMaxCoresBtn.disabled = !usable;
  testInvincibleToggle.checked = testInvincible;
}

function jumpToTestStage(index, initializeAudio = true) {
  if (!TEST_MODE || !assetsReady || assetFailure) return;
  const safeIndex = Math.max(0, Math.min(STAGES.length - 1, index));
  resetGame();
  if (initializeAudio) audio.init();
  applyTestBuild(safeIndex);
  beginStage(safeIndex, true);
  player.overdrive = 100;
  player.missileCharges = 3;
  state.intro = 0.7;
  const stage = getStage(safeIndex);
  testNotice.textContent = `${STR.testStageReady}: ${STR.stage} ${safeIndex + 1} · ${STR[stage.nameKey]}`;
  syncActionButtons(true);
  syncTestControls(true);
}

function showTestBoss() {
  if (!TEST_MODE || !assetsReady || assetFailure) return;
  if (state.mode !== "running") jumpToTestStage(state.stageIndex);
  clearPool(enemies);
  clearPool(shots);
  clearPool(missiles);
  clearPool(pickups);
  clearPool(effects);
  state.bossSpawned = false;
  state.boss = null;
  state.pendingVictory = false;
  state.victoryDelay = 0;
  state.mode = "running";
  upgradePanel.hidden = true;
  overlay.hidden = true;
  hudButtons.hidden = false;
  state.stageTime = getBossTime(state.stageIndex, QUICK);
  spawnBoss();
  if (state.boss) state.boss.y = 180;
  state.intro = 0;
  player.invulnerable = Math.max(player.invulnerable, 1.5);
  testNotice.textContent = `${STR.testBossReady}: ${STR[getStage(state.stageIndex).bossKey]}`;
  syncActionButtons(true);
  syncTestControls(true);
  canvas.focus();
}

function defeatTestBoss() {
  if (!TEST_MODE || !assetsReady || assetFailure) return;
  if (!state.boss?.active) showTestBoss();
  if (state.boss?.active) {
    state.boss.hp = 0;
    defeatEnemy(state.boss);
    testNotice.textContent = STR.testDefeatBoss;
  }
  syncTestControls(true);
}

function maxTestCores() {
  if (!TEST_MODE || !assetsReady || assetFailure) return;
  if (state.mode !== "running") jumpToTestStage(state.stageIndex);
  const levels = createItemLevels();
  for (const itemId of Object.keys(levels)) levels[itemId] = 3;
  state.itemLevels = levels;
  state.itemStats = getItemStats(levels);
  player.hp = state.itemStats.maxHp;
  player.shield = state.itemStats.maxShield;
  player.overdrive = 100;
  player.missileCharges = 3;
  testNotice.textContent = STR.testMaxCores;
  syncActionButtons(true);
  syncTestControls(true);
  canvas.focus();
}

function equipUpgrade(itemId) {
  const previousStats = state.itemStats;
  state.itemLevels = applyItemLevel(state.itemLevels, itemId);
  state.itemStats = getItemStats(state.itemLevels);
  player.hp = Math.min(state.itemStats.maxHp, player.hp + Math.max(0, state.itemStats.maxHp - previousStats.maxHp));
  player.shield = state.itemStats.maxShield;
  beginStage(state.stageIndex + 1);
}

function showUpgradePanel() {
  state.mode = "upgrade";
  clearPool(shots);
  clearPool(missiles);
  clearPool(pickups);
  hudButtons.hidden = true;
  upgradeChoices.replaceChildren();
  const choices = getUpgradeChoices(state.stageIndex, state.itemLevels, rand);
  for (const itemId of choices) {
    const item = ITEMS[itemId];
    const copy = STR.items[itemId];
    const nextLevel = (state.itemLevels[itemId] || 0) + 1;
    const button = document.createElement("button");
    button.className = "upgrade-card";
    button.type = "button";
    const icon = document.createElement("span");
    icon.className = "upgrade-icon";
    icon.textContent = item.icon;
    const name = document.createElement("span");
    name.className = "upgrade-name";
    name.textContent = copy.name;
    const level = document.createElement("span");
    level.className = "upgrade-level";
    level.textContent = `${STR.itemLevel} ${nextLevel} / 3`;
    const description = document.createElement("span");
    description.className = "upgrade-description";
    description.textContent = copy.description;
    button.append(icon, name, level, description);
    button.addEventListener("click", () => equipUpgrade(itemId), { once: true });
    upgradeChoices.append(button);
  }
  upgradePanel.hidden = false;
  statusLive.textContent = STR.chooseUpgrade;
  syncTestControls(true);
  upgradeChoices.querySelector("button")?.focus();
}

function resetGame() {
  releaseTransientInput();
  overlay.classList.remove("result-screen", "result-defeat", "result-victory", "is-visible");
  resultStats.hidden = true;
  gameTitle.textContent = STR.title;
  tagline.textContent = STR.tagline;
  state.itemLevels = createItemLevels();
  state.itemStats = getItemStats(state.itemLevels);
  state.seed = 0x13a7c0de;
  state.time = 0;
  state.score = 0;
  state.combo = 1;
  state.comboTimer = 0;
  state.banner = "";
  state.bannerTime = 0;
  state.actionFeedback = "";
  state.actionFeedbackDetail = "";
  state.actionFeedbackKind = "";
  state.actionFeedbackTime = 0;
  state.itemInventory = [];
  state.lockBoostTime = 0;
  state.timeWarpTime = 0;
  state.shake = 0;
  state.flash = 0;
  state.lockRefresh = 0;
  state.kills = 0;
  state.victory = false;
  state.bossStingerDelay = 0;
  state.pendingVictory = false;
  state.victoryDelay = 0;
  beginStage(0, true);
  restartBtn.hidden = true;
  settingsPanel.hidden = true;
  settingsBtn.setAttribute("aria-expanded", "false");
  settingsBtn.setAttribute("aria-label", STR.accessibilityOpen);
  scoreSummary.textContent = "";
  audio.setMusicMode("running");
}

function endGame(victory) {
  if (state.mode !== "running") return;
  state.pendingVictory = false;
  state.victoryDelay = 0;
  state.bossStingerDelay = 0;
  state.mode = victory ? "victory" : "defeat";
  state.victory = victory;
  const oldBest = state.best;
  if (!TEST_MODE && state.score > state.best) {
    state.best = state.score;
    localStorage.setItem("bw-best", String(state.best));
  }
  overlay.hidden = false;
  upgradePanel.hidden = true;
  hudButtons.hidden = true;
  restartBtn.hidden = true;
  document.querySelector("#eyebrow").textContent = victory ? STR.victory : STR.defeat;
  gameTitle.textContent = victory ? STR.victoryTitle : STR.gameOverTitle;
  tagline.textContent = victory ? STR.victoryTagline : STR.gameOverTagline;
  overlayMessage.textContent = victory ? STR.victorySummary : STR.defeatSummary;
  statusLive.textContent = victory ? STR.victorySummary : STR.defeatSummary;
  const record = !TEST_MODE && state.best > oldBest ? ` · ${STR.newBest}` : "";
  const testSuffix = TEST_MODE ? ` · ${STR.testOnly}` : "";
  scoreSummary.textContent = `${STR.finalScore}: ${Math.round(state.score).toLocaleString()} · ${STR.bestScore}: ${Math.round(state.best).toLocaleString()}${record}${testSuffix}`;
  resultScore.textContent = Math.round(state.score).toLocaleString();
  resultBest.textContent = Math.round(state.best).toLocaleString();
  resultStage.textContent = `${state.stageIndex + 1} / ${STAGES.length}`;
  resultKills.textContent = Math.round(state.kills).toLocaleString();
  resultStats.hidden = false;
  overlay.classList.remove("is-visible", "result-defeat", "result-victory");
  overlay.classList.add("result-screen", victory ? "result-victory" : "result-defeat");
  requestAnimationFrame(() => overlay.classList.add("is-visible"));
  startBtn.textContent = STR.restart;
  audio.setMusicMode(victory ? "victory" : "defeat");
  syncActionButtons(true);
  syncTestControls(true);
  startBtn.focus();
}

function togglePause() {
  if (state.mode === "running") {
    state.mode = "paused";
    overlay.hidden = false;
    hudButtons.hidden = true;
    restartBtn.hidden = false;
    document.querySelector("#eyebrow").textContent = STR.pause;
    overlayMessage.textContent = STR.objective;
    scoreSummary.textContent = "";
    startBtn.textContent = STR.resume;
    audio.setMusicMode("paused");
    syncActionButtons(true);
    startBtn.focus();
  } else if (state.mode === "paused") {
    state.mode = "running";
    overlay.hidden = true;
    hudButtons.hidden = false;
    restartBtn.hidden = true;
    audio.setMusicMode("running");
    syncActionButtons(true);
    canvas.focus();
  }
}

async function launchGame() {
  if (!assetsReady) return;
  if (assetFailure) {
    await loadAssets();
    if (assetFailure) return;
  }
  await audio.init();
  if (state.mode === "paused") togglePause();
  else resetGame();
}

startBtn.addEventListener("click", async () => {
  if (state.mode === "start" && !hasSeenBriefing() && !assetFailure) {
    showBriefing();
    return;
  }
  await launchGame();
});

briefingLaunchBtn.addEventListener("click", async () => {
  rememberBriefing();
  hideBriefing();
  await launchGame();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!itemGuidePanel.hidden) {
    hideItemGuide();
    return;
  }
  if (!briefingPanel.hidden) {
    hideBriefing();
    startBtn.focus();
  }
});

restartBtn.addEventListener("click", resetGame);

function refreshLocks() {
  for (let i = 0; i < lockTargets.length; i += 1) lockTargets[i] = null;
  let filled = 0;
  const lockLimit = Math.min(7, state.itemStats.missileLocks + (state.lockBoostTime > 0 ? 3 : 0));
  for (let pass = 0; pass < lockLimit; pass += 1) {
    let best = null;
    let bestDistance = 421 * 421;
    for (let i = 0; i < enemies.length; i += 1) {
      const enemy = enemies[i];
      if (!enemy.active || enemy.y < -100) continue;
      let used = false;
      for (let j = 0; j < filled; j += 1) if (lockTargets[j] === enemy) used = true;
      if (used) continue;
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = enemy;
      }
    }
    if (!best) break;
    lockTargets[filled] = best;
    filled += 1;
  }
}

function clearHostileShots() {
  for (const shot of shots) {
    if (shot.active && shot.team === 2) shot.active = false;
  }
}

function useStoredItem(slotIndex = 0) {
  if (state.mode !== "running") return false;
  const safeSlot = Number.isInteger(slotIndex) ? slotIndex : 0;
  const itemId = state.itemInventory[safeSlot];
  if (!itemId || !PICKUPS[itemId]) {
    statusLive.textContent = STR.itemUnavailable;
    syncActionButtons(true);
    return false;
  }
  state.itemInventory.splice(safeSlot, 1);

  if (itemId === "shieldCell") {
    player.shield = Math.min(3, player.shield + 1);
    spawnEffect(player.x, player.y, 1.15, 0.62);
  } else if (itemId === "repair") {
    player.hp = Math.min(state.itemStats.maxHp, player.hp + Math.ceil(state.itemStats.maxHp * 0.3));
    spawnEffect(player.x, player.y, 1.05, 0.58);
  } else if (itemId === "empBurst") {
    clearHostileShots();
    for (const enemy of enemies) {
      if (!enemy.active) continue;
      enemy.hp -= 32;
      enemy.hitFlash = 1;
      if (enemy.hp <= 0) defeatEnemy(enemy);
    }
    spawnEffect(player.x, player.y, 2.3, 0.72);
    state.shake = Math.max(state.shake, 7);
  } else if (itemId === "missileCache") {
    player.missileCharges = Math.min(3, player.missileCharges + 2);
    player.missileRecharge = 0;
  } else if (itemId === "lockBoost") {
    state.lockBoostTime = Math.max(state.lockBoostTime, 8);
    refreshLocks();
  } else if (itemId === "overdriveCell") {
    player.overdrive = Math.min(100, player.overdrive + 55);
  } else if (itemId === "timeWarp") {
    state.timeWarpTime = Math.max(state.timeWarpTime, 5);
    spawnEffect(player.x, player.y, 1.65, 0.68);
  } else if (itemId === "omegaBomb") {
    clearHostileShots();
    for (const enemy of enemies) {
      if (!enemy.active) continue;
      if (enemy.type === 3) {
        enemy.hp = Math.max(1, enemy.hp - enemy.maxHp * 0.28);
        enemy.hitFlash = 1;
      } else {
        enemy.hp = 0;
        defeatEnemy(enemy);
      }
    }
    spawnEffect(player.x, player.y, 3.2, 0.95);
    state.flash = settings.reduceFlash ? 0.08 : 0.3;
    state.shake = Math.max(state.shake, 12);
  }

  const copy = STR.pickups[itemId];
  showActionFeedback(copy.name, copy.description, `pickup:${itemId}`);
  audio.pickup();
  syncActionButtons(true);
  return true;
}

function launchMissiles() {
  if (player.missileCharges <= 0) {
    statusLive.textContent = STR.missileUnavailable;
    return false;
  }
  player.missileCharges -= 1;
  player.missileRecharge = 0;
  refreshLocks();
  let launched = 0;
  for (let i = 0; i < lockTargets.length; i += 1) {
    const target = lockTargets[i];
    if (!target) continue;
    for (let m = 0; m < missiles.length; m += 1) {
      const missile = missiles[m];
      if (missile.active) continue;
      missile.active = true;
      missile.x = missile.px = player.x + (launched % 2 ? 28 : -28);
      missile.y = missile.py = player.y - 22;
      missile.vx = (launched % 2 ? 1 : -1) * 150;
      missile.vy = -390;
      missile.life = 4;
      missile.target = target;
      missile.angle = -Math.PI * 0.5;
      launched += 1;
      break;
    }
  }
  if (launched === 0) {
    for (let m = 0; m < missiles.length; m += 1) {
      const missile = missiles[m];
      if (missile.active) continue;
      missile.active = true;
      missile.x = missile.px = player.x;
      missile.y = missile.py = player.y - 22;
      missile.vx = 0;
      missile.vy = -HOMING_MISSILE_SPEED;
      missile.life = 3;
      missile.target = null;
      missile.angle = -Math.PI * 0.5;
      break;
    }
  }
  audio.missile();
  state.shake = Math.max(state.shake, 3);
  showActionFeedback(STR.feedbackMissile, STR.feedbackMissileDetail, "missile");
  syncActionButtons();
  return true;
}

function activateOverdrive() {
  if (player.overdriveTime > 0) {
    statusLive.textContent = STR.boostActive;
    return false;
  }
  if (player.overdrive < 100) {
    statusLive.textContent = STR.boostUnavailable;
    return false;
  }
  player.overdrive = 0;
  player.overdriveTime = state.itemStats.overdriveDuration;
  player.invulnerable = Math.max(player.invulnerable, state.itemStats.overdriveDuration);
  if (state.itemStats.empLevel > 0) {
    for (const shot of shots) {
      if (shot.active && shot.team === 2) shot.active = false;
    }
    for (const enemy of enemies) {
      if (!enemy.active) continue;
      enemy.hp -= 18 * state.itemStats.empLevel;
      enemy.hitFlash = 1;
      if (enemy.hp <= 0) defeatEnemy(enemy);
    }
    spawnEffect(player.x, player.y, 2.3 + state.itemStats.empLevel * 0.3, 0.72);
  }
  audio.boost();
  state.shake = Math.max(state.shake, 7);
  state.flash = settings.reduceFlash ? 0.05 : 0.24;
  showActionFeedback(STR.feedbackOverdrive, STR.feedbackOverdriveDetail, "overdrive");
  syncActionButtons();
  return true;
}

function damagePlayer(amount) {
  if (TEST_MODE && testInvincible) return;
  if (player.invulnerable > 0 || player.overdriveTime > 0 || state.mode !== "running") return;
  if (player.shield > 0) {
    player.shield -= 1;
    player.invulnerable = 0.55;
    state.shake = settings.reduceShake ? 1 : 5;
    state.flash = settings.reduceFlash ? 0.035 : 0.12;
    spawnEffect(player.x, player.y, 0.9, 0.38);
    audio.hit();
    return;
  }
  player.hp -= amount;
  player.invulnerable = 0.7;
  state.combo = 1;
  state.comboTimer = 0;
  state.shake = settings.reduceShake ? 2 : 10;
  state.flash = settings.reduceFlash ? 0.06 : 0.28;
  spawnEffect(player.x, player.y, 0.72, 0.44);
  audio.hit();
  if (player.hp <= 0) {
    player.hp = 0;
    spawnEffect(player.x, player.y, 2.2, 0.95);
    audio.explosion(1.25);
    endGame(false);
  }
}

function defeatEnemy(enemy) {
  if (!enemy.active) return;
  enemy.active = false;
  const wasBoss = enemy.type === 3;
  state.kills += 1;
  state.combo = Math.min(9.9, state.combo + (wasBoss ? 1 : 0.18));
  state.comboTimer = 2.5;
  state.score += enemy.score * state.combo;
  player.overdrive = Math.min(100, player.overdrive + (wasBoss ? 100 : 7));
  spawnEffect(enemy.x, enemy.y, wasBoss ? 2.8 : enemy.type === 2 ? 1.25 : 0.72, wasBoss ? 1.1 : 0.5);
  if (!wasBoss && rand() < 0.28) spawnPickup(enemy.x, enemy.y);
  audio.explosion(wasBoss ? 1.2 : 0.45 + enemy.type * 0.18);
  state.shake = Math.max(state.shake, wasBoss ? 10 : 2 + enemy.type * 2);
  if (wasBoss) {
    player.invulnerable = 3;
    state.score += Math.round(player.hp * 100 + player.overdrive * 20);
    state.flash = settings.reduceFlash ? 0.09 : 0.45;
    state.pendingVictory = true;
    state.victoryDelay = 0.9;
    syncTestControls(true);
  }
}

function updatePlayer() {
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0) + padX + input.stickX;
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0) + padY + input.stickY;
  if (input.pointer) {
    const dx = input.targetX - player.x;
    const dy = input.targetY - player.y;
    const followDistance = input.pointerTouch ? TOUCH_FOLLOW_DISTANCE : POINTER_FOLLOW_DISTANCE;
    mx = Math.max(-1, Math.min(1, dx / followDistance));
    my = Math.max(-1, Math.min(1, dy / followDistance));
  }
  const length = Math.hypot(mx, my);
  if (length > 1) {
    mx /= length;
    my /= length;
  }
  const touchMoveActive = input.pointerTouch || input.stickActive;
  const speed = player.overdriveTime > 0 ? 620 : touchMoveActive ? TOUCH_SPEED : DEFAULT_SPEED;
  const targetVx = mx * speed;
  const targetVy = my * speed;
  const response = touchMoveActive ? 0.32 : 0.24;
  player.vx += (targetVx - player.vx) * response;
  player.vy += (targetVy - player.vy) * response;
  player.x = Math.max(54, Math.min(WORLD_W - 54, player.x + player.vx * DT));
  player.y = Math.max(235, Math.min(WORLD_H - 92, player.y + player.vy * DT));

  player.invulnerable = Math.max(0, player.invulnerable - DT);
  player.overdriveTime = Math.max(0, player.overdriveTime - DT);
  player.fire -= DT;
  if (state.intro <= 0 && player.fire <= 0) {
    const rate = player.overdriveTime > 0 ? 0.065 : 0.115;
    player.fire += rate;
    const boostMultiplier = player.overdriveTime > 0 ? state.itemStats.overdriveMultiplier : 1;
    const damage = (player.overdriveTime > 0 ? 7 : 4) * state.itemStats.cannonDamage * boostMultiplier;
    const pierce = state.itemStats.pierce;
    spawnShot(1, player.x - 13, player.y - 38, -22, -840, 4, damage, 2, pierce);
    spawnShot(1, player.x + 13, player.y - 38, 22, -840, 4, damage, 2, pierce);
    for (let level = 0; level < state.itemStats.extraWingShots; level += 1) {
      const offset = 31 + level * 11;
      const drift = 52 + level * 24;
      spawnShot(1, player.x - offset, player.y - 27, -drift, -810, 4, damage * 0.72, 2, pierce);
      spawnShot(1, player.x + offset, player.y - 27, drift, -810, 4, damage * 0.72, 2, pierce);
    }
    if (state.itemStats.spreadLevel > 0) {
      const spread = 75 + state.itemStats.spreadLevel * 38;
      spawnShot(1, player.x, player.y - 44, 0, -860, 4, damage * 0.82, 2, pierce);
      spawnShot(1, player.x - 8, player.y - 38, -spread, -825, 4, damage * 0.66, 2, pierce);
      spawnShot(1, player.x + 8, player.y - 38, spread, -825, 4, damage * 0.66, 2, pierce);
    }
    for (let drone = 0; drone < state.itemStats.wingmen; drone += 1) {
      const side = drone === 0 ? -1 : 1;
      spawnShot(1, player.x + side * 58, player.y - 6, side * 18, -780, 4, damage * state.itemStats.wingmanDamage, 2, pierce);
    }
    if (player.overdriveTime > 0) spawnShot(1, player.x, player.y - 48, 0, -920, 5, damage, 2, pierce);
    audio.cannon(state.time);
  }

  player.missileRecharge += DT;
  if (player.missileCharges < 3 && player.missileRecharge >= 7) {
    player.missileRecharge -= 7;
    player.missileCharges += 1;
  }
  if (input.missileEdge || input.injectedMissile) launchMissiles();
  if (input.boostEdge || input.injectedBoost) activateOverdrive();
  if (input.itemEdge) useStoredItem(input.itemSlot);
  else if (input.injectedItem) useStoredItem(input.injectedItemSlot);
  input.injectedMissile = false;
  input.injectedBoost = false;
  input.injectedItem = false;
  input.injectedItemSlot = 0;
}

function updateBoss(enemy) {
  const stage = getStage(state.stageIndex);
  const healthRatio = enemy.hp / enemy.maxHp;
  const phase = healthRatio > 0.66 ? 0 : healthRatio > 0.33 ? 1 : 2;
  if (enemy.y < 175) {
    enemy.y += 95 * DT;
    return;
  }

  const damage = Math.round((10 + phase) * stage.difficulty);
  if (state.stageIndex === 0) {
    enemy.x = WORLD_W * 0.5 + Math.sin(enemy.age * 0.72) * 125;
    if (enemy.shoot <= 0) {
      shootAimed(enemy, 235 + phase * 30, 0.1 + phase * 0.035, damage);
      enemy.shoot = 0.9 - phase * 0.14;
    }
    if (enemy.altShoot <= 0) {
      shootRadial(enemy, 12 + phase * 4, 145 + phase * 22, enemy.age * (0.22 + phase * 0.08), damage);
      enemy.altShoot = 2.8 - phase * 0.35;
    }
  } else if (state.stageIndex === 1) {
    enemy.x = WORLD_W * 0.5 + Math.sin(enemy.age * 0.46) * 82;
    if (enemy.shoot <= 0) {
      shootFan(enemy, 5 + phase * 2, 230 + phase * 24, 0.115, damage);
      enemy.shoot = 1.18 - phase * 0.12;
    }
    if (enemy.altShoot <= 0) {
      shootRadial(enemy, 8 + phase * 4, 178 + phase * 15, phase % 2 ? enemy.age * -0.38 : enemy.age * 0.38, damage);
      enemy.altShoot = 2.45 - phase * 0.28;
    }
  } else if (state.stageIndex === 2) {
    enemy.x = WORLD_W * 0.5 + Math.sin(enemy.age * (1.1 + phase * 0.12)) * (205 + phase * 12);
    enemy.y = 178 + Math.cos(enemy.age * 1.7) * 28;
    if (enemy.shoot <= 0) {
      shootFan(enemy, 5 + phase * 2, 290 + phase * 34, 0.09 + phase * 0.015, damage);
      enemy.shoot = 0.82 - phase * 0.11;
    }
    if (enemy.altShoot <= 0) {
      shootRadial(enemy, 10 + phase * 5, 205, enemy.age * -0.62, damage);
      enemy.altShoot = 2.25 - phase * 0.24;
    }
  } else if (state.stageIndex === 3) {
    enemy.x = WORLD_W * 0.5 + Math.sin(enemy.age * 0.62) * 102;
    enemy.y = 182 + Math.cos(enemy.age * 0.88) * 34;
    if (enemy.shoot <= 0) {
      shootAimed(enemy, 255 + phase * 28, 0.14 + phase * 0.025, damage);
      enemy.shoot = 0.82 - phase * 0.1;
    }
    if (enemy.altShoot <= 0) {
      shootRadial(enemy, 18 + phase * 6, 158 + phase * 22, enemy.age * (0.7 + phase * 0.16), damage);
      enemy.altShoot = 2.05 - phase * 0.23;
    }
  } else {
    enemy.x = WORLD_W * 0.5 + Math.sin(enemy.age * 0.4) * 72;
    enemy.y = 184 + Math.cos(enemy.age * 0.55) * 20;
    if (enemy.shoot <= 0) {
      shootFan(enemy, 7 + phase * 2, 280 + phase * 35, 0.085 + phase * 0.012, damage + 2);
      enemy.shoot = 0.75 - phase * 0.1;
    }
    if (enemy.altShoot <= 0) {
      shootRadial(enemy, 20 + phase * 6, 175 + phase * 24, enemy.age * (0.58 + phase * 0.18), damage);
      enemy.altShoot = 1.85 - phase * 0.2;
    }
  }

  if (phase >= 1 && enemy.summon <= 0) {
    const escortType = phase === 2 || state.stageIndex >= 3 ? 1 : 0;
    spawnEnemy(escortType, 90 + rand() * 540, -90, rand() * 5);
    spawnEnemy(0, 90 + rand() * 540, -150, rand() * 5);
    if (state.stageIndex === 4 && phase === 2) spawnEnemy(2, 160 + rand() * 400, -240, rand() * 5);
    enemy.summon = Math.max(3.8, 6.5 - state.stageIndex * 0.35 - phase * 0.85);
  }
}

function updateEnemies() {
  const stage = getStage(state.stageIndex);
  for (let i = 0; i < enemies.length; i += 1) {
    const enemy = enemies[i];
    if (!enemy.active) continue;
    enemy.age += DT;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - DT * 6);
    enemy.shoot -= DT;
    enemy.altShoot -= DT;
    enemy.summon -= DT;

    if (enemy.type === 0) {
      enemy.y += (150 + state.wave * 2 + state.stageIndex * 8) * DT;
      enemy.x += Math.sin(enemy.age * 3.2 + enemy.phase) * 78 * DT;
      if (enemy.shoot <= 0 && enemy.y > 40) {
        shootAimed(enemy, 210 + state.stageIndex * 8, 0, Math.round(8 * stage.difficulty));
        enemy.shoot = 1.55 + rand() * 0.7;
      }
    } else if (enemy.type === 1) {
      enemy.y += 115 * DT;
      enemy.x += Math.sin(enemy.age * 2.25 + enemy.phase) * 155 * DT;
      enemy.x = Math.max(45, Math.min(WORLD_W - 45, enemy.x));
      if (enemy.shoot <= 0 && enemy.y > 50) {
        shootAimed(enemy, 255 + state.stageIndex * 9, 0.13, Math.round(10 * stage.difficulty));
        enemy.shoot = 1.25 + rand() * 0.4;
      }
    } else if (enemy.type === 2) {
      enemy.y += 65 * DT;
      enemy.x += Math.sin(enemy.age * 1.25 + enemy.phase) * 48 * DT;
      if (enemy.shoot <= 0 && enemy.y > 60) {
        shootRadial(enemy, 10 + Math.floor(state.stageIndex / 2) * 2, 160 + state.stageIndex * 5, enemy.age * 0.45, Math.round(9 * stage.difficulty));
        enemy.shoot = 2.35;
      }
      if (enemy.altShoot <= 0) {
        shootAimed(enemy, 205 + state.stageIndex * 8, 0.11, Math.round(10 * stage.difficulty));
        enemy.altShoot = 3.1;
      }
    } else {
      updateBoss(enemy);
    }

    if (enemy.y > WORLD_H + 150) enemy.active = false;
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    if (dx * dx + dy * dy < (enemy.radius + player.radius) ** 2) {
      damagePlayer(enemy.type === 3 ? 40 : 28);
      if (enemy.type !== 3) {
        enemy.hp = 0;
        defeatEnemy(enemy);
      }
    }
  }
}

function updateShots() {
  for (let i = 0; i < shots.length; i += 1) {
    const shot = shots[i];
    if (!shot.active) continue;
    const speedScale = shot.team === 2 && state.timeWarpTime > 0 ? 0.42 : 1;
    shot.px = shot.x;
    shot.py = shot.y;
    shot.x += shot.vx * DT * speedScale;
    shot.y += shot.vy * DT * speedScale;
    shot.life -= DT * speedScale;
    if (shot.life <= 0 || shot.x < -80 || shot.x > WORLD_W + 80 || shot.y < -100 || shot.y > WORLD_H + 100) {
      shot.active = false;
      continue;
    }
    if (shot.team === 1) {
      for (let e = 0; e < enemies.length; e += 1) {
        const enemy = enemies[e];
        if (!enemy.active || shot.lastHit === enemy) continue;
        const dx = shot.x - enemy.x;
        const dy = shot.y - enemy.y;
        if (dx * dx + dy * dy > (shot.radius + enemy.radius * 0.72) ** 2) continue;
        if (shot.pierce > 0) {
          shot.pierce -= 1;
          shot.lastHit = enemy;
        } else {
          shot.active = false;
        }
        const coreOpen = enemy.type !== 3 || Math.sin(enemy.age * 2.4) > -0.25;
        enemy.hp -= shot.damage * (coreOpen ? 1 : 0.35);
        enemy.hitFlash = 1;
        state.score += shot.damage * state.combo;
        if (enemy.hp <= 0) defeatEnemy(enemy);
        break;
      }
    } else {
      const dx = shot.x - player.x;
      const dy = shot.y - player.y;
      const distanceSq = dx * dx + dy * dy;
      const hitRadius = shot.radius + player.radius;
      if (distanceSq < hitRadius * hitRadius) {
        shot.active = false;
        damagePlayer(shot.damage);
      } else if (!shot.grazed && distanceSq < 54 * 54) {
        shot.grazed = true;
        player.overdrive = Math.min(100, player.overdrive + 3.2);
        state.score += 35 * state.combo;
      }
    }
  }
}

function updateMissiles() {
  for (let i = 0; i < missiles.length; i += 1) {
    const missile = missiles[i];
    if (!missile.active) continue;
    missile.px = missile.x;
    missile.py = missile.y;
    missile.life -= DT;
    if (!missile.target?.active) missile.target = findMissileTarget(enemies, missile.x, missile.y);
    steerMissile(missile, missile.target, DT);
    missile.x += missile.vx * DT;
    missile.y += missile.vy * DT;
    if (missile.life <= 0 || missile.y < -100 || missile.x < -100 || missile.x > WORLD_W + 100) {
      missile.active = false;
      continue;
    }
    for (let e = 0; e < enemies.length; e += 1) {
      const enemy = enemies[e];
      if (!enemy.active) continue;
      const dx = missile.x - enemy.x;
      const dy = missile.y - enemy.y;
      if (dx * dx + dy * dy > (enemy.radius * 0.78 + 10) ** 2) continue;
      missile.active = false;
      enemy.hp -= state.itemStats.missileDamage;
      enemy.hitFlash = 1;
      spawnEffect(missile.x, missile.y, 0.48, 0.32);
      audio.explosion(0.35);
      state.shake = Math.max(state.shake, 3);
      if (enemy.hp <= 0) defeatEnemy(enemy);
      break;
    }
  }
}

function updatePickups() {
  for (let i = 0; i < pickups.length; i += 1) {
    const pickup = pickups[i];
    if (!pickup.active) continue;
    pickup.life -= DT;
    pickup.phase += DT * 4;
    const dx = player.x - pickup.x;
    const dy = player.y - pickup.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance < state.itemStats.pickupRange) {
      pickup.vx += dx / distance * 620 * DT;
      pickup.vy += dy / distance * 620 * DT;
    }
    pickup.x += pickup.vx * DT;
    pickup.y += pickup.vy * DT;
    if (distance < 35 && state.itemInventory.length < MAX_INVENTORY) {
      pickup.active = false;
      state.itemInventory.push(pickup.itemId);
      state.score += 250 * state.combo;
      const copy = STR.pickups[pickup.itemId];
      showActionFeedback(copy.name, copy.description, `pickup:${pickup.itemId}`);
      audio.pickup();
      syncActionButtons(true);
    } else if (distance < 35 && state.itemInventory.length >= MAX_INVENTORY) {
      statusLive.textContent = STR.itemInventoryFull;
    } else if (pickup.life <= 0 || pickup.y > WORLD_H + 40) {
      pickup.active = false;
    }
  }
}

function updateEffects() {
  for (let i = 0; i < effects.length; i += 1) {
    const effect = effects[i];
    if (!effect.active) continue;
    effect.age += DT;
    if (effect.age >= effect.duration) effect.active = false;
  }
}

function update() {
  pollGamepad();
  if (input.pauseEdge) {
    input.pauseEdge = false;
    togglePause();
  }
  if (state.mode !== "running") {
    input.missileEdge = false;
    input.boostEdge = false;
    input.itemEdge = false;
    return;
  }

  state.time += DT;
  state.stageTime += DT;
  if (state.bossStingerDelay > 0) {
    state.bossStingerDelay -= DT;
    if (state.bossStingerDelay <= 0) audio.bossStinger();
  }
  if (state.pendingVictory) {
    state.victoryDelay -= DT;
    if (state.victoryDelay <= 0) {
      state.pendingVictory = false;
      if (state.stageIndex >= STAGES.length - 1) endGame(true);
      else showUpgradePanel();
      input.missileEdge = false;
      input.boostEdge = false;
      input.itemEdge = false;
      return;
    }
  }
  state.intro = Math.max(0, state.intro - DT);
  state.comboTimer = Math.max(0, state.comboTimer - DT);
  if (state.comboTimer <= 0) state.combo += (1 - state.combo) * 0.02;
  state.bannerTime = Math.max(0, state.bannerTime - DT);
  state.actionFeedbackTime = Math.max(0, state.actionFeedbackTime - DT);
  state.lockBoostTime = Math.max(0, state.lockBoostTime - DT);
  state.timeWarpTime = Math.max(0, state.timeWarpTime - DT);
  state.shake = Math.max(0, state.shake - DT * 18);
  state.flash = Math.max(0, state.flash - DT * 1.8);
  state.lockRefresh -= DT;
  if (state.lockRefresh <= 0) {
    refreshLocks();
    state.lockRefresh = 0.12;
  }

  const bossAt = getBossTime(state.stageIndex, QUICK);
  if (!state.bossSpawned && state.stageTime >= state.nextWave && state.stageTime < bossAt) spawnWave();
  if (!state.bossSpawned && state.stageTime >= bossAt) spawnBoss();

  updatePlayer();
  updateEnemies();
  updateShots();
  updateMissiles();
  updatePickups();
  updateEffects();
  audio.tick(state.time, Boolean(state.boss?.active));
  syncActionButtons();
  input.missileEdge = false;
  input.boostEdge = false;
  input.itemEdge = false;
}

function drawImageCentered(image, x, y, targetHeight, rotation = 0, alpha = 1) {
  if (!image) return;
  const ratio = image.width / image.height;
  const width = targetHeight * ratio;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, -width * 0.5, -targetHeight * 0.5, width, targetHeight);
  ctx.restore();
}

function drawBackground() {
  const stage = getStage(state.stageIndex);
  const bg = images[stage.background];
  if (!bg) {
    ctx.fillStyle = "#03101f";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    return;
  }
  const imageRatio = bg.width / bg.height;
  const fieldRatio = WORLD_W / WORLD_H;
  let sx = 0;
  let sy = 0;
  let sw = bg.width;
  let sh = bg.height;
  if (imageRatio > fieldRatio) {
    sw = bg.height * fieldRatio;
    sx = (bg.width - sw) * 0.5;
  } else {
    sh = bg.width / fieldRatio;
    sy = (bg.height - sh) * 0.5;
  }
  const drift = Math.sin(state.time * 0.055) * Math.min(24, sx);
  ctx.drawImage(bg, sx + drift, sy, sw, sh, 0, 0, WORLD_W, WORLD_H);
  const pulse = 0.055 + Math.max(0, Math.sin(state.time * 0.72)) * 0.025;
  drawUpperFieldTint(ctx, WORLD_W, WORLD_H, stage.accent, pulse);
  drawLowerFieldShade(ctx, WORLD_W, WORLD_H);
  drawStageAtmosphere();
}

function drawStageAtmosphere() {
  const motion = settings.reduceShake ? state.time * 0.35 : state.time;
  ctx.save();
  if (state.stageIndex === 0) {
    ctx.strokeStyle = "rgba(174, 235, 255, .2)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let index = 0; index < 22; index += 1) {
      const x = (index * 97 + motion * 126) % (WORLD_W + 100) - 50;
      const y = (index * 173 + motion * 310) % WORLD_H;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 19, y + 46);
    }
    ctx.stroke();
  } else if (state.stageIndex === 1) {
    const dust = 0.035 + Math.sin(motion * 0.8) * 0.018;
    ctx.globalAlpha = dust;
    ctx.fillStyle = "#ff9a45";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  } else if (state.stageIndex === 2) {
    const scanX = WORLD_W * 0.5 + Math.sin(motion * 0.55) * 310;
    const beam = ctx.createLinearGradient(scanX - 100, 0, scanX + 100, 0);
    beam.addColorStop(0, "rgba(214, 108, 255, 0)");
    beam.addColorStop(0.5, "rgba(214, 108, 255, .13)");
    beam.addColorStop(1, "rgba(214, 108, 255, 0)");
    ctx.fillStyle = beam;
    ctx.fillRect(scanX - 100, 0, 200, WORLD_H);
  } else if (state.stageIndex === 3) {
    ctx.fillStyle = "rgba(225, 248, 255, .55)";
    for (let index = 0; index < 38; index += 1) {
      const x = (index * 113 + Math.sin(index * 8.7) * 80 + motion * 55) % WORLD_W;
      const y = (index * 179 + motion * (105 + index % 5 * 15)) % WORLD_H;
      const size = 1.5 + index % 3;
      ctx.fillRect(x, y, size, size * 2.2);
    }
  } else {
    ctx.strokeStyle = "rgba(255, 105, 69, .32)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let index = 0; index < 18; index += 1) {
      const x = (index * 149 + motion * 42) % WORLD_W;
      const y = (index * 227 + motion * 150) % WORLD_H;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 6, y + 21 + index % 4 * 5);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawEnemies() {
  const stage = getStage(state.stageIndex);
  for (let i = 0; i < enemies.length; i += 1) {
    const enemy = enemies[i];
    if (!enemy.active) continue;
    let image = images.scout;
    let height = 84;
    if (enemy.type === 1) { image = images.interceptor; height = 100; }
    else if (enemy.type === 2) { image = images.bomber; height = 142; }
    else if (enemy.type === 3) { image = images[stage.bossImage]; height = stage.bossHeight; }
    ctx.save();
    ctx.shadowBlur = enemy.type === 3 ? 28 : 12;
    ctx.shadowColor = enemy.type === 0 ? "rgba(255,74,42,.9)" : "rgba(255,112,38,.72)";
    if (enemy.hitFlash > 0.5) ctx.globalAlpha = 0.62 + Math.sin(enemy.hitFlash * 30) * 0.22;
    drawImageCentered(image, enemy.x, enemy.y, height, Math.PI);
    ctx.restore();
    if (enemy.type === 3 && enemy.y > 0) {
      const open = Math.sin(enemy.age * 2.4) > -0.25;
      ctx.strokeStyle = open ? stage.accent : "rgba(75,225,255,.55)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y + 10, 31 + Math.sin(enemy.age * 5) * 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawShots() {
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < shots.length; i += 1) {
    const shot = shots[i];
    if (!shot.active || shot.team !== 1) continue;
    ctx.moveTo(shot.px, shot.py);
    ctx.lineTo(shot.x, shot.y - 16);
  }
  ctx.strokeStyle = "rgba(111, 246, 255, .96)";
  ctx.lineWidth = 5;
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#00eaff";
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  for (let i = 0; i < shots.length; i += 1) {
    const shot = shots[i];
    if (!shot.active || shot.team !== 2) continue;
    ctx.moveTo(shot.px, shot.py);
    ctx.lineTo(shot.x, shot.y);
  }
  ctx.strokeStyle = "rgba(255, 124, 52, .98)";
  ctx.lineWidth = 7;
  ctx.shadowBlur = 12;
  ctx.shadowColor = "#ff5a26";
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawMissiles() {
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < missiles.length; i += 1) {
    const missile = missiles[i];
    if (!missile.active) continue;
    ctx.moveTo(missile.px, missile.py);
    ctx.lineTo(missile.x, missile.y);
  }
  ctx.strokeStyle = "rgba(255, 112, 36, .48)";
  ctx.lineWidth = 12;
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#ff5424";
  ctx.stroke();
  ctx.shadowBlur = 0;

  for (let i = 0; i < missiles.length; i += 1) {
    const missile = missiles[i];
    if (!missile.active) continue;
    ctx.save();
    ctx.translate(missile.x, missile.y);
    ctx.rotate(missile.angle);
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#ff6a24";

    ctx.fillStyle = "#ff5b22";
    ctx.beginPath();
    ctx.moveTo(-8, -4);
    ctx.lineTo(-20, 0);
    ctx.lineTo(-8, 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fff3bd";
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-7, -7);
    ctx.lineTo(-11, 0);
    ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#ffae3b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -6);
    ctx.lineTo(-1, -13);
    ctx.lineTo(5, -4);
    ctx.moveTo(-4, 6);
    ctx.lineTo(-1, 13);
    ctx.lineTo(5, 4);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPickups() {
  for (let i = 0; i < pickups.length; i += 1) {
    const pickup = pickups[i];
    if (!pickup.active) continue;
    const item = PICKUPS[pickup.itemId] || PICKUPS.missileCache;
    const radius = 10 + Math.sin(pickup.phase) * 2;
    ctx.save();
    ctx.translate(pickup.x, pickup.y);
    ctx.rotate(pickup.phase * 0.5);
    ctx.fillStyle = item.accent;
    ctx.shadowBlur = 18;
    ctx.shadowColor = item.accent;
    ctx.beginPath();
    for (let p = 0; p < 8; p += 1) {
      const a = p * Math.PI / 4;
      const r = p % 2 ? radius * 0.52 : radius;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (p === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.rotate(-pickup.phase * 0.5);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#020916";
    ctx.font = "900 10px Bahnschrift, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.icon, 0, 1);
    ctx.restore();
  }
}

function drawEffects() {
  for (let i = 0; i < effects.length; i += 1) {
    const effect = effects[i];
    if (!effect.active) continue;
    const progress = effect.age / effect.duration;
    const alpha = Math.max(0, 1 - progress);
    const scale = effect.scale * (0.48 + progress * 0.92);
    drawImageCentered(images.explosion, effect.x, effect.y, 150 * scale, effect.angle + progress * 0.7, alpha);
  }
}

function drawLocks() {
  ctx.font = "700 15px Bahnschrift, sans-serif";
  ctx.textAlign = "center";
  for (let i = 0; i < lockTargets.length; i += 1) {
    const enemy = lockTargets[i];
    if (!enemy || !enemy.active) continue;
    const radius = enemy.radius + 18 + Math.sin(state.time * 7 + i) * 3;
    ctx.strokeStyle = "rgba(255, 210, 91, .86)";
    ctx.lineWidth = 3;
    ctx.setLineDash(LOCK_DASH);
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, radius, state.time + i, state.time + i + Math.PI * 1.45);
    ctx.stroke();
    ctx.setLineDash(EMPTY_DASH);
    ctx.fillStyle = "#ffe7a1";
    ctx.fillText(STR.lock, enemy.x, enemy.y - radius - 8);
  }
}

function drawPlayer() {
  const visible = player.invulnerable <= 0 || Math.floor(state.time * 16) % 2 === 0;
  if (!visible && player.overdriveTime <= 0) return;
  ctx.save();
  for (let drone = 0; drone < state.itemStats.wingmen; drone += 1) {
    const side = drone === 0 ? -1 : 1;
    const bob = Math.sin(state.time * 4.5 + drone * Math.PI) * 7;
    drawImageCentered(images.hero, player.x + side * 58, player.y + 20 + bob, 53, side * 0.035, 0.88);
  }
  if (player.overdriveTime > 0) {
    ctx.shadowBlur = 30;
    ctx.shadowColor = "#27efff";
    const trail = 85 + Math.sin(state.time * 30) * 15;
    ctx.fillStyle = "rgba(49, 234, 255, .52)";
    ctx.beginPath();
    ctx.moveTo(player.x - 19, player.y + 24);
    ctx.lineTo(player.x + 19, player.y + 24);
    ctx.lineTo(player.x, player.y + trail);
    ctx.closePath();
    ctx.fill();
  }
  drawImageCentered(images.hero, player.x, player.y, 112, player.vx * 0.00028);
  if (player.shield > 0) {
    ctx.strokeStyle = "rgba(142, 245, 255, .78)";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#31eaff";
    ctx.beginPath();
    ctx.arc(player.x, player.y, 51 + Math.sin(state.time * 5) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBar(x, y, width, height, value, color, label) {
  ctx.fillStyle = "rgba(3, 14, 27, .72)";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 2, Math.max(0, width - 4) * Math.max(0, Math.min(1, value)), height - 4);
  ctx.strokeStyle = "rgba(183, 238, 247, .42)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = "rgba(235, 249, 255, .85)";
  ctx.font = "700 15px Bahnschrift, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(label, x, y - 7);
}

function drawMiniBar(x, y, width, height, value, color, label) {
  ctx.fillStyle = "rgba(3, 14, 27, .76)";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 2, Math.max(0, width - 4) * Math.max(0, Math.min(1, value)), height - 4);
  ctx.strokeStyle = "rgba(183, 238, 247, .38)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = "rgba(235, 249, 255, .9)";
  ctx.font = "800 12px Bahnschrift, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(label, x + 7, y + height - 7);
}

function drawCompactHud(stage, left, right, shieldText) {
  const barGap = 12;
  const barWidth = Math.max(120, (right - left - barGap) * 0.5);
  ctx.fillStyle = "#f4fbff";
  ctx.textAlign = "left";
  ctx.font = "800 17px Bahnschrift, sans-serif";
  ctx.fillText(`${STR.score} ${Math.round(state.score).toString().padStart(7, "0")}`, left, 35);
  ctx.fillStyle = "#8ef5ff";
  ctx.font = "700 14px Bahnschrift, sans-serif";
  ctx.fillText(`${STR.combo} x${state.combo.toFixed(1)}`, left, 61);
  ctx.textAlign = "right";
  ctx.fillStyle = stage.accent;
  ctx.font = "800 14px Bahnschrift, sans-serif";
  ctx.fillText(`${STR.stage} ${state.stageIndex + 1}/${STAGES.length}`, right, 35);
  ctx.fillStyle = "rgba(244, 251, 255, .76)";
  ctx.font = "700 12px Bahnschrift, sans-serif";
  ctx.fillText(STR[stage.nameKey], right, 61);
  ctx.fillStyle = "#ffd45b";
  ctx.font = "700 12px Bahnschrift, sans-serif";
  ctx.fillText(`${STR.missiles} ${"◆".repeat(player.missileCharges)}${"◇".repeat(3 - player.missileCharges)}`, right, 84);
  drawMiniBar(left, 87, barWidth, 22, player.hp / state.itemStats.maxHp, "#ff7042", `${STR.hull}${shieldText}`);
  drawMiniBar(left + barWidth + barGap, 87, barWidth, 22, player.overdrive / 100, "#31eaff", STR.overdrive);
}

function drawFullHud(stage, shieldText) {
  ctx.fillStyle = "#f4fbff";
  ctx.textAlign = "left";
  ctx.font = "700 19px Bahnschrift, sans-serif";
  ctx.fillText(`${STR.score} ${Math.round(state.score).toString().padStart(7, "0")}`, 28, 36);
  ctx.fillStyle = "#8ef5ff";
  ctx.font = "700 16px Bahnschrift, sans-serif";
  ctx.fillText(`${STR.combo} x${state.combo.toFixed(1)}`, 28, 66);
  drawBar(225, 29, 165, 14, player.hp / state.itemStats.maxHp, "#ff7042", `${STR.hull}${shieldText}`);
  drawBar(225, 74, 165, 14, player.overdrive / 100, "#31eaff", STR.overdrive);
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffd45b";
  ctx.font = "700 17px Bahnschrift, sans-serif";
  ctx.fillText(`${STR.missiles} ${"◆".repeat(player.missileCharges)}${"◇".repeat(3 - player.missileCharges)}`, 690, 46);
  ctx.fillStyle = stage.accent;
  ctx.font = "800 15px Bahnschrift, sans-serif";
  ctx.fillText(`${STR.stage} ${state.stageIndex + 1}/${STAGES.length}`, 690, 76);
  ctx.fillStyle = "rgba(244, 251, 255, .72)";
  ctx.font = "700 13px Bahnschrift, sans-serif";
  ctx.fillText(STR[stage.nameKey], 690, 98);
}

function drawInventoryHud(compact) {
  const panelWidth = compact ? 260 : 320;
  const panelHeight = compact ? 92 : 104;
  const panelX = visibleWorld.left + Math.max(12, (visibleWorld.width - panelWidth) * 0.5);
  const panelY = WORLD_H - panelHeight - (compact ? 24 : 30);
  const slotGap = 8;
  const slotWidth = (panelWidth - 24 - slotGap) * 0.5;
  const slotY = panelY + 31;
  const slotHeight = panelHeight - 42;

  ctx.save();
  ctx.fillStyle = "rgba(2, 9, 22, .82)";
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
  ctx.strokeStyle = "rgba(49, 234, 255, .58)";
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
  ctx.textAlign = "left";
  ctx.fillStyle = "#8ef5ff";
  ctx.font = compact ? "900 13px Bahnschrift, sans-serif" : "900 15px Bahnschrift, sans-serif";
  ctx.fillText(`${STR.itemInventory} ${state.itemInventory.length}/${MAX_INVENTORY}`, panelX + 12, panelY + 20);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(244, 251, 255, .68)";
  ctx.font = compact ? "800 9px Bahnschrift, sans-serif" : "800 10px Bahnschrift, sans-serif";
  ctx.fillText(STR.itemUseHint, panelX + panelWidth - 12, panelY + 20);

  for (let index = 0; index < MAX_INVENTORY; index += 1) {
    const itemId = state.itemInventory[index];
    const item = itemId ? PICKUPS[itemId] : null;
    const copy = itemId ? STR.pickups[itemId] : null;
    const slotX = panelX + 12 + index * (slotWidth + slotGap);
    ctx.fillStyle = item ? "rgba(13, 43, 64, .9)" : "rgba(142, 245, 255, .08)";
    ctx.fillRect(slotX, slotY, slotWidth, slotHeight);
    ctx.strokeStyle = item ? item.accent : "rgba(142, 245, 255, .24)";
    ctx.lineWidth = 1;
    ctx.strokeRect(slotX, slotY, slotWidth, slotHeight);
    ctx.textAlign = "center";
    ctx.fillStyle = item ? item.accent : "rgba(142, 245, 255, .42)";
    ctx.font = compact ? "900 10px Bahnschrift, sans-serif" : "900 11px Bahnschrift, sans-serif";
    ctx.fillText(String(index + 1), slotX + 16, slotY + 18);
    ctx.font = compact ? "900 17px Bahnschrift, sans-serif" : "900 20px Bahnschrift, sans-serif";
    ctx.fillText(item?.icon || "·", slotX + 39, slotY + 19);
    ctx.fillStyle = item ? "#f4fbff" : "rgba(244, 251, 255, .42)";
    ctx.font = compact ? "800 9px Bahnschrift, sans-serif" : "800 10px Bahnschrift, sans-serif";
    ctx.fillText(copy?.name || STR.itemEmpty, slotX + slotWidth * 0.5, slotY + slotHeight - 8);
  }
  ctx.restore();
}

function drawBossHud(stage, compact, left, right) {
  if (state.boss?.active) {
    const boss = state.boss;
    const x = compact ? left : 120;
    const y = compact ? 157 : 135;
    const width = compact ? right - left : 480;
    drawBar(x, y, width, 18, boss.hp / boss.maxHp, "#ff5f34", STR[stage.bossKey]);
  }
}

function drawHudBanner(compact, left, right) {
  if (state.bannerTime > 0) {
    const alpha = Math.min(1, state.bannerTime * 1.8, (2.2 - state.bannerTime) * 2.5);
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.fillStyle = "#f4fbff";
    ctx.font = compact ? "800 25px Bahnschrift, sans-serif" : "800 32px Bahnschrift, sans-serif";
    const bannerX = compact ? (left + right) * 0.5 : WORLD_W * 0.5;
    const bannerY = state.boss?.active ? compact ? 226 : 205 : compact ? 184 : 165;
    ctx.fillText(state.banner, bannerX, bannerY);
    ctx.strokeStyle = "#31eaff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(compact ? left + 52 : 190, bannerY + 17);
    ctx.lineTo(compact ? right - 52 : 530, bannerY + 17);
    ctx.stroke();
  }
}

function drawHudIntro() {
  if (state.intro > 0) {
    const alpha = Math.min(1, state.intro * 2);
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.fillStyle = "#8ef5ff";
    ctx.font = "800 40px Bahnschrift, sans-serif";
    ctx.fillText(STR.ready, WORLD_W * 0.5, WORLD_H * 0.48);
  }
}

function drawActionFeedback(compact) {
  if (state.actionFeedbackTime <= 0) return;
  const duration = 1.1;
  const elapsed = duration - state.actionFeedbackTime;
  const fadeIn = Math.min(1, elapsed / 0.12);
  const fadeOut = Math.min(1, state.actionFeedbackTime / 0.3);
  const alpha = fadeIn * fadeOut;
  const overdrive = state.actionFeedbackKind === "overdrive";
  const pickupId = state.actionFeedbackKind.startsWith("pickup:") ? state.actionFeedbackKind.slice(7) : "";
  const color = overdrive
    ? "#31eaff"
    : pickupId && PICKUPS[pickupId]
      ? PICKUPS[pickupId].accent
      : "#ff9a45";
  const centerX = WORLD_W * 0.5;
  const centerY = WORLD_H * 0.47;
  const baseRadius = overdrive ? 86 : 66;
  const radius = baseRadius + Math.min(1, elapsed / 0.34) * (overdrive ? 22 : 16);
  const pulse = 1 + Math.sin(elapsed * 24) * 0.045;
  const arm = (compact ? 74 : 112) + Math.min(1, elapsed / 0.3) * 26;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.shadowBlur = 24;
  ctx.shadowColor = color;
  ctx.lineWidth = compact ? 2 : 3;
  ctx.beginPath();
  ctx.arc(0, 0, radius * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.globalAlpha = alpha * 0.78;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-arm, -11);
  ctx.lineTo(-arm + 36, -11);
  ctx.moveTo(arm, -11);
  ctx.lineTo(arm - 36, -11);
  ctx.moveTo(-arm, 11);
  ctx.lineTo(-arm + 36, 11);
  ctx.moveTo(arm, 11);
  ctx.lineTo(arm - 36, 11);
  ctx.stroke();

  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  ctx.fillStyle = "#f4fbff";
  ctx.font = compact ? "900 23px Bahnschrift, sans-serif" : "900 34px Bahnschrift, sans-serif";
  ctx.fillText(state.actionFeedback, 0, 8);
  ctx.fillStyle = color;
  ctx.font = compact ? "800 10px Bahnschrift, sans-serif" : "800 14px Bahnschrift, sans-serif";
  ctx.fillText(state.actionFeedbackDetail, 0, 34);
  ctx.restore();
}

function drawHud() {
  const stage = getStage(state.stageIndex);
  const compact = visibleWorld.width < 690;
  const margin = compact ? 18 : 28;
  const left = visibleWorld.left + margin;
  const right = visibleWorld.right - margin;
  const panelHeight = compact ? 132 : 128;
  ctx.save();
  ctx.fillStyle = "rgba(2, 9, 22, .62)";
  ctx.fillRect(visibleWorld.left, 0, visibleWorld.width, panelHeight);
  const shieldText = player.shield > 0 ? ` · ${"⬡".repeat(player.shield)}` : "";
  if (compact) drawCompactHud(stage, left, right, shieldText);
  else drawFullHud(stage, shieldText);
  drawBossHud(stage, compact, left, right);
  drawHudBanner(compact, left, right);
  drawHudIntro();
  drawActionFeedback(compact);
  drawInventoryHud(compact);
  ctx.restore();
}

function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#020916";
  ctx.fillRect(0, 0, cssW, cssH);
  let shakeX = 0;
  let shakeY = 0;
  if (state.shake > 0 && !settings.reduceShake) {
    shakeX = Math.sin(state.time * 997.3) * state.shake;
    shakeY = Math.cos(state.time * 733.7) * state.shake;
  }
  ctx.save();
  ctx.translate(viewX + shakeX * viewScale, viewY + shakeY * viewScale);
  ctx.scale(viewScale, viewScale);
  ctx.beginPath();
  ctx.rect(0, 0, WORLD_W, WORLD_H);
  ctx.clip();
  drawBackground();
  drawPickups();
  drawShots();
  drawMissiles();
  drawEnemies();
  drawLocks();
  drawPlayer();
  drawEffects();
  drawHud();
  if (state.flash > 0) {
    ctx.globalAlpha = Math.min(settings.reduceFlash ? 0.14 : 0.6, state.flash);
    ctx.fillStyle = state.victory ? "#8ef5ff" : "#ffffff";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }
  ctx.restore();
}

let acc = 0;
let last = performance.now();
let pausedByVisibility = false;
let frameCount = 0;
let fpsAt = last;
let fps = 0;
let frameMs = 0;

addEventListener("blur", () => {
  if (state.mode === "running") pausedByVisibility = true;
  releaseTransientInput();
});
addEventListener("focus", () => {
  if (pausedByVisibility) {
    pausedByVisibility = false;
    last = performance.now();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.mode === "running") {
    pausedByVisibility = true;
    releaseTransientInput();
  } else if (!document.hidden) {
    pausedByVisibility = false;
    last = performance.now();
  }
});

function frame(now) {
  requestAnimationFrame(frame);
  const delta = Math.min(80, now - last);
  last = now;
  frameMs = delta;
  if (!pausedByVisibility) {
    acc += delta;
    let steps = 0;
    while (acc >= STEP_MS && steps < 5) {
      update();
      acc -= STEP_MS;
      steps += 1;
    }
    if (steps === 5) acc = 0;
  }
  render();
  if (DEV) {
    frameCount += 1;
    if (now - fpsAt >= 500) {
      fps = Math.round(frameCount * 1000 / (now - fpsAt));
      frameCount = 0;
      fpsAt = now;
      let activeEnemies = 0;
      let activeShots = 0;
      for (let i = 0; i < enemies.length; i += 1) if (enemies[i].active) activeEnemies += 1;
      for (let i = 0; i < shots.length; i += 1) if (shots[i].active) activeShots += 1;
      devPanel.textContent = `${fps} fps\n${frameMs.toFixed(1)} ms\n${activeEnemies} enemies\n${activeShots} shots`;
    }
  }
}

if (DEV) devPanel.style.display = "block";

function debugSnapshot() {
  let activeEnemies = 0;
  let activeShots = 0;
  let activePickups = 0;
  for (let i = 0; i < enemies.length; i += 1) if (enemies[i].active) activeEnemies += 1;
  for (let i = 0; i < shots.length; i += 1) if (shots[i].active) activeShots += 1;
  for (let i = 0; i < pickups.length; i += 1) if (pickups[i].active) activePickups += 1;
  return {
    mode: state.mode,
    time: Number(state.time.toFixed(2)),
    stageTime: Number(state.stageTime.toFixed(2)),
    stage: state.stageIndex + 1,
    score: Math.round(state.score),
    hull: Math.round(player.hp),
    overdrive: Math.round(player.overdrive),
    missiles: player.missileCharges,
    inventory: [...state.itemInventory],
    activePickups,
    lockBoost: Number(state.lockBoostTime.toFixed(2)),
    timeWarp: Number(state.timeWarpTime.toFixed(2)),
    playerX: Math.round(player.x),
    playerY: Math.round(player.y),
    bossActive: Boolean(state.boss?.active),
    bossHp: state.boss?.active ? Math.round(state.boss.hp) : 0,
    pendingVictory: state.pendingVictory,
    testMode: TEST_MODE,
    testInvincible: TEST_MODE && testInvincible,
    items: { ...state.itemLevels },
    kills: state.kills,
    activeEnemies,
    activeShots,
    stick: {
      active: input.stickActive,
      x: Number(input.stickX.toFixed(3)),
      y: Number(input.stickY.toFixed(3)),
    },
    viewport: {
      mode: viewportMode,
      scale: Number(viewScale.toFixed(3)),
      visibleWidth: Math.round(visibleWorld.width),
      visibleHeight: Math.round(visibleWorld.height),
      dpr,
    },
  };
}

window.__BLACKWING__ = {
  snapshot: debugSnapshot,
  start: resetGame,
  injectCommand(command) {
    if (command === "missile") input.injectedMissile = true;
    if (command === "item" || command === "item1" || command === "item2") {
      input.injectedItem = true;
      input.injectedItemSlot = command === "item2" ? 1 : 0;
    }
    if (command === "boost") {
      player.overdrive = 100;
      input.injectedBoost = true;
    }
    if (command === "pause") input.pauseEdge = true;
  },
  spawnBoss() {
    state.stageTime = getBossTime(state.stageIndex, QUICK);
    spawnBoss();
  },
  revealBoss() {
    if (state.boss?.active) state.boss.y = 180;
    return debugSnapshot();
  },
  damageBoss(amount = 9999) {
    if (state.boss?.active) {
      state.boss.hp -= amount;
      if (state.boss.hp <= 0) defeatEnemy(state.boss);
    }
  },
  damagePlayer(amount = 9999) {
    damagePlayer(amount);
  },
  setOverdrive(amount = 100) {
    player.overdrive = Math.max(0, Math.min(100, amount));
    syncActionButtons(true);
  },
  setInvulnerable(seconds = 30) {
    player.invulnerable = Math.max(player.invulnerable, seconds);
  },
  spawnPickup(itemId = "") {
    const pickup = spawnPickup(player.x, player.y);
    if (pickup && PICKUPS[itemId]) pickup.itemId = itemId;
    return debugSnapshot();
  },
  chooseUpgrade(itemId) {
    if (state.mode === "upgrade" && ITEMS[itemId]) equipUpgrade(itemId);
    return debugSnapshot();
  },
  jumpStage(stage = 1) {
    jumpToTestStage(Math.max(0, Math.min(STAGES.length - 1, Number(stage) - 1)));
    return debugSnapshot();
  },
  showTestBoss() {
    showTestBoss();
    return debugSnapshot();
  },
  defeatTestBoss() {
    defeatTestBoss();
    return debugSnapshot();
  },
  maxCores() {
    maxTestCores();
    return debugSnapshot();
  },
  setTestInvincible(value = true) {
    if (TEST_MODE) {
      testInvincible = Boolean(value);
      syncTestControls(true);
    }
    return debugSnapshot();
  },
  simulate(ticks = 60) {
    const wasVisibilityPaused = pausedByVisibility;
    pausedByVisibility = true;
    const safeTicks = Math.max(0, Math.min(18000, Math.floor(ticks)));
    for (let i = 0; i < safeTicks; i += 1) update();
    pausedByVisibility = wasVisibilityPaused;
    last = performance.now();
    acc = 0;
    return debugSnapshot();
  },
};

overlayMessage.textContent = STR.loading;
startBtn.textContent = STR.loading;
syncActionButtons(true);
loadAssets().then(() => {
  if (TEST_MODE && !assetFailure && QUERY.has("stage")) {
    jumpToTestStage(INITIAL_TEST_STAGE, false);
    if (QUERY.has("boss")) showTestBoss();
  }
});
requestAnimationFrame(frame);
