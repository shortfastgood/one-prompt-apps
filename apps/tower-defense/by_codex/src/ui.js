import { formatMoney, formatRate, round } from "./utils.js";

export class GameUI {
  constructor(elements, towerTypes) {
    this.elements = elements;
    this.towerTypes = towerTypes;
    this.callbacks = null;
    this.buildButtons = new Map();
    this.createBuildButtons();
  }

  bindCallbacks(callbacks) {
    this.callbacks = callbacks;
    const e = this.elements;

    e.startWaveBtn.addEventListener("click", () => callbacks.onStartWave());
    e.pauseBtn.addEventListener("click", () => callbacks.onTogglePause());
    e.restartBtn.addEventListener("click", () => callbacks.onRestart());
    e.clearBuildBtn.addEventListener("click", () => callbacks.onClearBuildSelection());
    e.upgradeTowerBtn.addEventListener("click", () => callbacks.onUpgradeSelectedTower());
    e.sellTowerBtn.addEventListener("click", () => callbacks.onSellSelectedTower());
  }

  createBuildButtons() {
    const container = this.elements.buildButtons;
    const doc = container.ownerDocument;
    container.innerHTML = "";

    Object.values(this.towerTypes).forEach((tower) => {
      const button = doc.createElement("button");
      button.type = "button";
      button.className = "tower-btn";
      button.dataset.towerKey = tower.key;

      const dps = tower.levels[0].damage / tower.levels[0].cooldown;
      button.innerHTML = `
        <span class="tower-swatch" style="background:${tower.color}"></span>
        <span class="meta">
          <strong>${tower.name}</strong>
          <span>${tower.description} DPS ${round(dps, 1)}</span>
        </span>
        <span class="cost">${formatMoney(tower.levels[0].cost)}</span>
      `;

      button.addEventListener("click", () => {
        if (this.callbacks) {
          this.callbacks.onSelectBuildType(tower.key);
        }
      });

      container.appendChild(button);
      this.buildButtons.set(tower.key, button);
    });
  }

  render(state) {
    const e = this.elements;

    e.waveStat.textContent = String(state.wave);
    e.livesStat.textContent = String(state.lives);
    e.moneyStat.textContent = formatMoney(state.money);
    e.enemiesStat.textContent = String(state.enemies);
    e.statusStat.textContent = state.status;

    e.startWaveBtn.disabled = !state.canStartWave;
    e.pauseBtn.disabled = state.gameOver;
    e.pauseBtn.textContent = state.paused ? "Resume" : "Pause";

    this.buildButtons.forEach((button, key) => {
      button.classList.toggle("active", state.buildSelection === key);
      button.disabled = state.gameOver;
    });
    e.clearBuildBtn.disabled = !state.buildSelection;

    this.renderSelectedTower(state.selectedTower, state.gameOver);
    e.statusMessage.textContent = state.message;
  }

  renderSelectedTower(selectedTower, gameOver = false) {
    const e = this.elements;

    if (!selectedTower) {
      e.selectedPanel.classList.add("empty");
      e.towerHint.textContent = "Click a tower to inspect it, or choose a tower type and click an open tile to place.";
      e.selectedTowerName.textContent = "-";
      e.selectedTowerLevel.textContent = "-";
      e.selectedTowerRange.textContent = "-";
      e.selectedTowerDamage.textContent = "-";
      e.selectedTowerRate.textContent = "-";
      e.upgradeTowerBtn.disabled = true;
      e.upgradeTowerBtn.textContent = "Upgrade";
      e.sellTowerBtn.disabled = true;
      e.sellTowerBtn.textContent = "Sell";
      return;
    }

    e.selectedPanel.classList.remove("empty");
    e.towerHint.textContent = selectedTower.description;
    e.selectedTowerName.textContent = selectedTower.name;
    e.selectedTowerLevel.textContent = `${selectedTower.level}/${selectedTower.maxLevel}`;
    e.selectedTowerRange.textContent = `${Math.round(selectedTower.range)}`;
    e.selectedTowerDamage.textContent = `${selectedTower.damage}`;
    e.selectedTowerRate.textContent = formatRate(selectedTower.cooldown);

    if (selectedTower.canUpgrade) {
      e.upgradeTowerBtn.textContent = `Upgrade (${formatMoney(selectedTower.upgradeCost)})`;
      e.upgradeTowerBtn.disabled = gameOver || !selectedTower.affordUpgrade;
    } else {
      e.upgradeTowerBtn.textContent = "Max Level";
      e.upgradeTowerBtn.disabled = true;
    }

    e.sellTowerBtn.textContent = `Sell (+${formatMoney(selectedTower.sellValue)})`;
    e.sellTowerBtn.disabled = gameOver;
  }
}
