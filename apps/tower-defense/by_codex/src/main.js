import { TOWER_TYPES } from "./config.js";
import { TowerDefenseGame } from "./game.js";
import { GameUI } from "./ui.js";

const elements = {
  canvas: document.getElementById("gameCanvas"),
  waveStat: document.getElementById("waveStat"),
  livesStat: document.getElementById("livesStat"),
  moneyStat: document.getElementById("moneyStat"),
  enemiesStat: document.getElementById("enemiesStat"),
  statusStat: document.getElementById("statusStat"),
  startWaveBtn: document.getElementById("startWaveBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  restartBtn: document.getElementById("restartBtn"),
  buildButtons: document.getElementById("buildButtons"),
  clearBuildBtn: document.getElementById("clearBuildBtn"),
  selectedPanel: document.getElementById("selectedPanel"),
  towerHint: document.getElementById("towerHint"),
  selectedTowerName: document.getElementById("selectedTowerName"),
  selectedTowerLevel: document.getElementById("selectedTowerLevel"),
  selectedTowerRange: document.getElementById("selectedTowerRange"),
  selectedTowerDamage: document.getElementById("selectedTowerDamage"),
  selectedTowerRate: document.getElementById("selectedTowerRate"),
  upgradeTowerBtn: document.getElementById("upgradeTowerBtn"),
  sellTowerBtn: document.getElementById("sellTowerBtn"),
  statusMessage: document.getElementById("statusMessage"),
};

if (!elements.canvas) {
  throw new Error("Missing required game canvas element.");
}

const ui = new GameUI(elements, TOWER_TYPES);
const game = new TowerDefenseGame(elements.canvas, ui);

ui.bindCallbacks({
  onStartWave: () => game.startNextWave(),
  onTogglePause: () => game.togglePause(),
  onRestart: () => game.restart(),
  onSelectBuildType: (towerKey) => game.selectBuildType(towerKey),
  onClearBuildSelection: () => game.clearBuildSelection(),
  onUpgradeSelectedTower: () => game.upgradeSelectedTower(),
  onSellSelectedTower: () => game.sellSelectedTower(),
});

game.start();

