(function() {
  // Remove any earlier copy of this mod
  if (window.__autoBuyer) {
    const old = window.__autoBuyer;
    old.dead = true;
    document.removeEventListener("keydown", old.keyHandler, true);
    if (old.timer) clearInterval(old.timer);
    if (old.panel && old.panel.parentNode) old.panel.parentNode.removeChild(old.panel);
  }

  const VERSION = "4.0";

  const MODES = {
    all:    "Best CPS overall (saves up)",
    afford: "Best CPS I can afford now",
    smart:  "Fastest payback (price + waiting time)"
  };
  const MODE_KEYS = Object.keys(MODES);

  const BULKS = ["game", 1, 10, 100];

  const SPEEDS = {
    normal: { ticks: 15, label: "Normal (2 checks/sec)" },
    fast:   { ticks: 7,  label: "Fast (about 4 checks/sec)" },
    turbo:  { ticks: 3,  label: "Turbo (10 checks/sec)" }
  };
  const SPEED_KEYS = Object.keys(SPEEDS);

  const RESERVES = [0, 60, 300, 900]; // seconds of CPS kept unspent
  const MAX_BUYS_PER_CHECK = 3;

  const mod = {
    on: false, target: null, dead: false, panel: null, timer: null,
    cfg: { mode: "all", bulk: "game", speed: "fast", buildings: true, upgrades: true, reserve: 0 }
  };
  window.__autoBuyer = mod;

  function next(list, cur) { return list[(list.indexOf(cur) + 1) % list.length]; }

  function notify(title, text) {
    try { Game.Notify(title, text, [16, 5], 3); }
    catch (e) { console.log("[Auto Buyer]", title, text); }
  }

  // How many buildings to buy at once
  function getBulk() {
    const b = mod.cfg.bulk;
    if (b === "game") return (Game.buyBulk === 10 || Game.buyBulk === 100) ? Game.buyBulk : 1;
    return b;
  }

  // ---- Actions ----
  mod.toggleOn = function() {
    mod.on = !mod.on;
    notify("Auto Buyer", mod.on ? "ON" : "OFF");
    render();
  };
  mod.cycleMode = function() {
    mod.cfg.mode = next(MODE_KEYS, mod.cfg.mode);
    notify("Auto Buyer mode", MODES[mod.cfg.mode]);
    render();
  };

  // ---- Settings menu (press , to open) ----
  function bulkLabel() {
    return mod.cfg.bulk === "game"
      ? "Follow the game (now x" + getBulk() + ")"
      : "Always x" + mod.cfg.bulk;
  }
  function reserveLabel() {
    const r = mod.cfg.reserve;
    return r === 0 ? "None" : (r / 60) + " min of CPS";
  }

  function row(label, act, value, extraClass, id) {
    return '<div class="ab-row"><span>' + label + '</span>' +
      '<button class="ab-btn ' + (extraClass || "") + '" data-act="' + act + '"' +
      (id ? ' id="' + id + '"' : "") + '>' + value + '</button></div>';
  }

  function render() {
    if (!mod.panel) return;
    const c = mod.cfg;
    mod.panel.innerHTML =
      '<style>' +
      '#autoBuyerPanel{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:380px;max-width:92vw;' +
        'z-index:2147483000;background:#1a1a1a;color:#eee;border:2px solid #a8844a;border-radius:8px;' +
        'padding:14px 16px;font:14px Tahoma,Arial,sans-serif;box-shadow:0 0 30px #000;display:none}' +
      '#autoBuyerPanel.open{display:block}' +
      '#autoBuyerPanel .ab-title{font-size:18px;font-weight:bold;margin-bottom:4px}' +
      '#autoBuyerPanel .ab-sub{color:#aaa;font-size:12px;margin-bottom:8px}' +
      '#autoBuyerPanel .ab-row{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:8px 0}' +
      '#autoBuyerPanel .ab-btn{background:#333;color:#fff;border:1px solid #777;border-radius:4px;' +
        'padding:5px 9px;cursor:pointer;text-align:right;max-width:62%;font:inherit}' +
      '#autoBuyerPanel .ab-btn:hover{background:#444}' +
      '#autoBuyerPanel .ab-on{background:#1f5f2a;border-color:#3c9a4c}' +
      '#autoBuyerPanel .ab-off{background:#6a2020;border-color:#a04040}' +
      '#autoBuyerPanel .ab-target{margin-top:10px;padding-top:8px;border-top:1px solid #444;color:#ccc;font-size:13px}' +
      '</style>' +
      '<div class="ab-title">Auto Buyer v' + VERSION + '</div>' +
      '<div class="ab-sub">Press , to open or close this menu. B = on/off, N = change mode.</div>' +
      row("Auto Buyer", "toggleOn", mod.on ? "ON" : "OFF", mod.on ? "ab-on" : "ab-off") +
      row("Mode", "mode", MODES[c.mode]) +
      row("Buy amount", "bulk", bulkLabel(), "", "autoBuyerBulk") +
      row("Speed", "speed", SPEEDS[c.speed].label) +
      row("Buy buildings", "buildings", c.buildings ? "Yes" : "No", c.buildings ? "ab-on" : "ab-off") +
      row("Buy upgrades", "upgrades", c.upgrades ? "Yes" : "No", c.upgrades ? "ab-on" : "ab-off") +
      row("Keep cookies in reserve", "reserve", reserveLabel()) +
      row("", "close", "Close") +
      '<div class="ab-target" id="autoBuyerTarget">Next target: ' + (mod.target || "none") + '</div>';
  }

  function isOpen() { return mod.panel && mod.panel.classList.contains("open"); }
  function toggleMenu(force) {
    if (!mod.panel) return;
    const open = typeof force === "boolean" ? force : !isOpen();
    if (open) render();
    mod.panel.classList.toggle("open", open);
  }

  function buildPanel() {
    const old = document.getElementById("autoBuyerPanel");
    if (old) old.remove();
    const p = document.createElement("div");
    p.id = "autoBuyerPanel";
    p.addEventListener("click", function(e) {
      const el = e.target.closest("[data-act]");
      if (!el) return;
      const c = mod.cfg;
      switch (el.getAttribute("data-act")) {
        case "toggleOn":  mod.toggleOn(); return;
        case "mode":      c.mode = next(MODE_KEYS, c.mode); break;
        case "bulk":      c.bulk = next(BULKS, c.bulk); break;
        case "speed":     c.speed = next(SPEED_KEYS, c.speed); break;
        case "buildings": c.buildings = !c.buildings; break;
        case "upgrades":  c.upgrades = !c.upgrades; break;
        case "reserve":   c.reserve = next(RESERVES, c.reserve); break;
        case "close":     toggleMenu(false); return;
      }
      render();
    });
    document.body.appendChild(p);
    mod.panel = p;
  }

  // ---- Keybinds: B = on/off, N = change mode, comma = menu ----
  mod.keyHandler = function(e) {
    if (mod.dead) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    if (e.code === "KeyB") mod.toggleOn();
    else if (e.code === "KeyN") mod.cycleMode();
    else if (e.code === "Comma") toggleMenu();
    else if (e.code === "Escape" && isOpen()) toggleMenu(false);
  };
  document.addEventListener("keydown", mod.keyHandler, true);

  // ---- Measure each purchase by simulating it, then undoing it ----
  function evaluate(bulk) {
    const items = [];
    const savedHighest = Game.cookiesPsRawHighest;
    try {
      Game.CalculateGains();
      const base = Game.cookiesPs;

      if (mod.cfg.buildings) {
        for (const b of Game.ObjectsById) {
          if (b.locked) continue;
          const price = b.getSumPrice ? b.getSumPrice(bulk) : b.getPrice() * bulk;
          b.amount += bulk;
          Game.CalculateGains();
          const gain = Game.cookiesPs - base;
          b.amount -= bulk;
          if (gain > 0) items.push({
            obj: b, isBuilding: true, count: bulk, price, gain,
            name: bulk > 1 ? b.name + " x" + bulk : b.name
          });
        }
      }

      if (mod.cfg.upgrades) {
        for (const u of Game.UpgradesInStore) {
          if (u.pool === "toggle" || u.pool === "debug") continue;
          const price = u.getPrice();
          u.bought = 1;
          Game.CalculateGains();
          const gain = Game.cookiesPs - base;
          u.bought = 0;
          if (gain > 0) items.push({ obj: u, isBuilding: false, count: 1, price, gain, name: u.name });
        }
      }
      return { items, base };
    } finally {
      Game.cookiesPsRawHighest = savedHighest;
      Game.CalculateGains();
    }
  }

  function pick(items, base) {
    const spendable = Game.cookies - mod.cfg.reserve * base;
    const cps = Math.max(base, 0.1);
    let best = null, bestScore = -Infinity;
    for (const it of items) {
      if (mod.cfg.mode === "afford" && it.price > spendable) continue;
      const score = mod.cfg.mode === "smart"
        ? -(Math.max(0, it.price - spendable) / cps + it.price / it.gain)
        : it.gain / it.price;
      if (score > bestScore) { bestScore = score; best = it; }
    }
    return best ? { best, spendable } : null;
  }

  Game.registerMod("auto_buyer", {
    init: function() {
      buildPanel();

      // Keep the target and buy-amount text fresh while the menu is open
      mod.timer = setInterval(function() {
        if (mod.dead || !isOpen()) return;
        const t = document.getElementById("autoBuyerTarget");
        if (t) t.textContent = "Next target: " + (mod.target || "none");
        const b = document.getElementById("autoBuyerBulk");
        if (b) b.textContent = bulkLabel();
      }, 500);

      Game.registerHook("logic", function() {
        if (mod.dead || !mod.on) return;
        if (Game.T % SPEEDS[mod.cfg.speed].ticks !== 0) return;
        if (Game.OnAscend || Game.AscendTimer > 0 || Game.buyMode === -1) return;
        try {
          const bulk = getBulk();
          for (let i = 0; i < MAX_BUYS_PER_CHECK; i++) {
            const { items, base } = evaluate(bulk);
            const choice = pick(items, base);
            if (!choice) { mod.target = null; return; }
            const { best, spendable } = choice;
            mod.target = best.name + " (" + Beautify(best.price) + " cookies)";
            if (spendable < best.price) return; // saving up
            if (best.isBuilding) best.obj.buy(best.count); else best.obj.buy();
          }
        } catch (err) {
          console.error("[Auto Buyer]", err);
          mod.on = false;
          notify("Auto Buyer error", "Turned off. Check the console (F12).");
        }
      });

      notify("Auto Buyer v" + VERSION + " loaded", "B = on/off, N = mode, comma = menu");
    },

    save: function() { return JSON.stringify(mod.cfg); },
    load: function(str) {
      try {
        const d = JSON.parse(str);
        if (!d) return;
        if (MODES[d.mode]) mod.cfg.mode = d.mode;
        if (BULKS.includes(d.bulk)) mod.cfg.bulk = d.bulk;
        if (SPEEDS[d.speed]) mod.cfg.speed = d.speed;
        if (typeof d.buildings === "boolean") mod.cfg.buildings = d.buildings;
        if (typeof d.upgrades === "boolean") mod.cfg.upgrades = d.upgrades;
        if (RESERVES.includes(d.reserve)) mod.cfg.reserve = d.reserve;
      } catch (e) { if (MODES[str]) mod.cfg.mode = str; } // very old save format
    }
  });
})();
