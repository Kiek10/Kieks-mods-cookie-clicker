/* Auto Farmer - a Cookie Clicker mod that runs the Garden for you.
 *
 * - Harvests plants the moment they're mature
 * - Removes weeds
 * - Replants empty (unlocked) tiles with your chosen seed
 *
 * Settings: click the toggle in the bottom-left corner, or in the console:
 *   AutoFarmer.cfg.seed = 'thumbcorn';   // any plant key, e.g. bakerWheat, thumbcorn, cronerice,
 *                                        // gildmillet, clover, goldenClover, shimmerlily,
 *                                        // elderwort, bakeberry, chocoroot, queenbeet, duketater...
 *   AutoFarmer.cfg.harvest = false;      // stop harvesting
 *   AutoFarmer.cfg.plant = false;        // stop replanting
 *   AutoFarmer.cfg.weeds = false;        // leave weeds alone
 *   AutoFarmer.cfg.keep = ['elderwort']; // plants that should never be auto-harvested
 */
Game.registerMod('autoFarmer', {
  init: function () {
    const MOD = this;
    window.AutoFarmer = MOD;

    MOD.cfg = MOD.cfg || {
      enabled: true,
      seed: 'bakerWheat',
      harvest: true,
      plant: true,
      weeds: true,
      keep: [],
      interval: 30 // game ticks between checks (30 ticks = ~1 second)
    };

    let tick = 0;

    MOD.getGarden = function () {
      const farm = Game.Objects['Farm'];
      if (!farm || !farm.minigameLoaded || !farm.minigame) return null;
      return farm.minigame;
    };

    MOD.run = function () {
      const M = MOD.getGarden();
      if (!M || !MOD.cfg.enabled) return;

      const seed = M.plants[MOD.cfg.seed];
      const rows = M.plot.length;
      const cols = M.plot[0].length;

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (M.isTileUnlocked && !M.isTileUnlocked(x, y)) continue;

          const tile = M.plot[y][x];
          const id = tile[0] - 1; // 0 means empty

          if (id < 0) {
            // Empty tile: plant the chosen seed
            if (MOD.cfg.plant && seed && seed.unlocked) {
              if (M.canPlant && !M.canPlant(seed)) continue; // not enough cookies
              M.useTool(seed.id, x, y);
            }
            continue;
          }

          const plant = M.plantsById[id];
          if (!plant) continue;
          if (MOD.cfg.keep.indexOf(plant.key) !== -1) continue;

          const mature = tile[1] >= plant.mature;
          const isWeed = !!plant.weed && plant.key !== MOD.cfg.seed;

          if (isWeed && MOD.cfg.weeds) {
            M.harvest(x, y, true);
          } else if (mature && MOD.cfg.harvest) {
            M.harvest(x, y, true);
          }
        }
      }
    };

    // Run on the game's logic loop
    Game.registerHook('logic', function () {
      tick++;
      if (tick % MOD.cfg.interval === 0) {
        try { MOD.run(); } catch (e) { console.warn('[AutoFarmer]', e); }
      }
    });

    // Toggle button
    const btn = document.createElement('div');
    btn.style.cssText =
      'position:fixed;left:8px;bottom:8px;z-index:100000;padding:4px 10px;' +
      'background:#222;color:#fff;border:1px solid #888;border-radius:4px;' +
      'font:12px Tahoma,Arial,sans-serif;cursor:pointer;opacity:.85;user-select:none;';
    const refresh = function () {
      btn.textContent = 'Auto Farmer: ' + (MOD.cfg.enabled ? 'ON' : 'OFF');
      btn.style.borderColor = MOD.cfg.enabled ? '#6c6' : '#c66';
    };
    btn.onclick = function () {
      MOD.cfg.enabled = !MOD.cfg.enabled;
      refresh();
    };
    document.body.appendChild(btn);
    refresh();

    Game.Notify('Auto Farmer loaded', 'Your garden is now on autopilot.', [2, 0], 4);
  },

  save: function () {
    return JSON.stringify(this.cfg);
  },

  load: function (str) {
    try {
      this.cfg = Object.assign({
        enabled: true, seed: 'bakerWheat', harvest: true,
        plant: true, weeds: true, keep: [], interval: 30
      }, JSON.parse(str));
    } catch (e) { /* keep defaults */ }
  }
});
