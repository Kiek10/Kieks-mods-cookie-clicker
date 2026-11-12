Game.registerMod('cookieGraph', {
  init: function () {
    var M = this;
    M.samples = M.samples || [];            // [timestamp, cookiesEarned], one per minute
    M.range = M.range || 720;               // minutes shown in the graph
    M.SAMPLE_MS = 60 * 1000;
    M.MAX_MIN = 1440;                       // keep 24h of history
    M.fine = [];                            // 5-second samples, last 10 min, not saved (used for the 1m view)
    var RANGES = [['1m', 1], ['15m', 15], ['30m', 30], ['1h', 60], ['3h', 180], ['6h', 360], ['12h', 720], ['24h', 1440]];

    M.sample = function () {
      var now = Date.now();
      M.samples.push([now, Game.cookiesEarned]);
      var cutoff = now - (M.MAX_MIN + 5) * 60000;
      while (M.samples.length && M.samples[0][0] < cutoff) M.samples.shift();
    };

    // linearly interpolated cookiesEarned at time t (null if before our first sample)
    function at(pts, t) {
      if (!pts.length || t < pts[0][0]) return null;
      for (var i = pts.length - 1; i >= 0; i--) {
        if (pts[i][0] <= t) {
          var a = pts[i], b = pts[i + 1];
          if (!b || b[0] === a[0]) return a[1];
          return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]);
        }
      }
      return null;
    }

    M.bucketSec = function () { return M.range <= 1 ? 5 : 60; };   // 1m view uses 5-second bars

    M.perMinute = function () {
      var now = Date.now(), bs = M.bucketSec() * 1000;
      var src = bs < 60000 ? M.fine : M.samples;
      var pts = src.concat([[now, Game.cookiesEarned]]);
      var nb = Math.round(M.range * 60000 / bs), out = [];
      for (var i = 0; i < nb; i++) {
        var s = now - (nb - i) * bs, e = s + bs;
        var vs = at(pts, s), ve = at(pts, e);
        out.push(vs === null || ve === null ? null : Math.max(0, ve - vs)); // ascension resets clamp to 0
      }
      return out;
    };

    // overlay
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.7);align-items:center;justify-content:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#1b1b1b;border:2px solid #c9a24d;border-radius:8px;padding:12px;';
    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:6px;justify-content:center;margin-bottom:8px;align-items:center;font:13px sans-serif;color:#aaa;';
    bar.appendChild(document.createTextNode('Time range:'));
    var btns = [];
    RANGES.forEach(function (r) {
      var b = document.createElement('button');
      b.textContent = r[0];
      b.style.cssText = 'cursor:pointer;border:1px solid #c9a24d;border-radius:4px;padding:3px 9px;font:13px sans-serif;';
      b.addEventListener('click', function () { M.range = r[1]; M.updateButtons(); M.draw(); });
      bar.appendChild(b); btns.push([b, r[1]]);
    });
    M.updateButtons = function () {
      btns.forEach(function (p) {
        var on = p[1] === M.range;
        p[0].style.background = on ? '#e0a030' : '#2a2a2a';
        p[0].style.color = on ? '#000' : '#ddd';
      });
    };
    M.updateButtons();
    var canvas = document.createElement('canvas');
    canvas.width = 720; canvas.height = 380;
    box.appendChild(bar); box.appendChild(canvas);
    wrap.appendChild(box);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) M.toggle(false); });
    document.body.appendChild(wrap);

    function fmt(m) {
      if (m <= 0) return 'now';
      if (m < 1.5) return '-' + Math.round(m * 60) + 's';
      if (m >= 60) return '-' + (m % 60 === 0 ? m / 60 : (m / 60).toFixed(1)) + 'h';
      return '-' + Math.round(m) + 'm';
    }

    M.draw = function () {
      var c = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
      c.clearRect(0, 0, W, H);
      var data = M.perMinute(), n = data.length, max = 0, total = 0, count = 0;
      data.forEach(function (v) { if (v !== null) { total += v; count++; if (v > max) max = v; } });
      c.fillStyle = '#fff'; c.font = 'bold 18px sans-serif'; c.textAlign = 'center';
      var bsec = M.bucketSec();
      c.fillText(bsec < 60 ? 'Cookies baked per ' + bsec + ' seconds' : 'Cookies baked per minute', W / 2, 24);
      c.font = '13px sans-serif'; c.fillStyle = '#ccc';
      c.fillText(count ? 'Total: ' + Beautify(total) + '   |   Avg: ' + Beautify(total / count * (60 / bsec)) + '/min' : 'No data yet - keep the game open', W / 2, 44);

      var L = 70, R = 20, T = 58, B = 50, pw = W - L - R, ph = H - T - B;
      c.font = '12px sans-serif'; c.textAlign = 'right'; c.strokeStyle = '#444'; c.fillStyle = '#aaa';
      for (var g = 0; g <= 4; g++) {
        var y = T + ph - ph * g / 4;
        c.beginPath(); c.moveTo(L, y); c.lineTo(W - R, y); c.stroke();
        c.fillText(Beautify(max * g / 4), L - 6, y + 4);
      }
      var bw = pw / n, w = bw > 4 ? bw - 1 : Math.max(1, bw);
      c.fillStyle = '#e0a030';
      data.forEach(function (v, i) {
        if (v === null || !max) return;
        var bh = ph * v / max;
        c.fillRect(L + i * bw, T + ph - bh, w, bh);
      });
      c.fillStyle = '#aaa'; c.textAlign = 'center';
      for (var t = 0; t <= 6; t++) c.fillText(fmt(M.range * (1 - t / 6)), L + pw * t / 6, H - 28);
      c.fillStyle = '#888';
      c.fillText('Press M or click outside to close. Data only exists from when the mod was first loaded.', W / 2, H - 8);
    };

    M.toggle = function (force) {
      var show = force !== undefined ? force : wrap.style.display === 'none';
      wrap.style.display = show ? 'flex' : 'none';
      if (show) { M.updateButtons(); M.draw(); }
    };

    document.addEventListener('keydown', function (e) {
      var t = e.target && e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'm' || e.key === 'M') M.toggle();
    });

    M.sample();
    setInterval(function () {
      var t = Date.now();
      M.fine.push([t, Game.cookiesEarned]);
      while (M.fine.length && M.fine[0][0] < t - 11 * 60000) M.fine.shift();
      if (M.range <= 1 && wrap.style.display !== 'none') M.draw();
    }, 5000);
    setInterval(function () {
      M.sample();
      if (wrap.style.display !== 'none') M.draw();
    }, M.SAMPLE_MS);
  },

  save: function () { return JSON.stringify({ samples: this.samples || [], range: this.range }); },
  load: function (str) {
    try {
      var d = JSON.parse(str);
      if (Array.isArray(d)) { this.samples = d; }        // data from the older version
      else if (d) { this.samples = d.samples || []; if (d.range) this.range = d.range; }
    } catch (e) { this.samples = []; }
    if (this.updateButtons) this.updateButtons();
  }
});
