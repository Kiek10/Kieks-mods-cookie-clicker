Game.registerMod('cookieGraph', {
  init: function () {
    var M = this;
    M.samples = M.samples || [];          // [timestamp, cookiesEarned]
    M.HOURS = 12;
    M.SAMPLE_MS = 60 * 1000;

    M.sample = function () {
      var now = Date.now();
      M.samples.push([now, Game.cookiesEarned]);
      var cutoff = now - (M.HOURS + 1) * 3600 * 1000;
      while (M.samples.length && M.samples[0][0] < cutoff) M.samples.shift();
    };

    // value at time t (last sample at or before t), null if no data yet
    M.valueAt = function (t) {
      var v = null;
      for (var i = 0; i < M.samples.length; i++) {
        if (M.samples[i][0] <= t) v = M.samples[i][1]; else break;
      }
      return v;
    };

    M.hourly = function () {
      var now = Date.now(), out = [];
      var first = M.samples.length ? M.samples[0] : null;
      for (var h = M.HOURS; h >= 1; h--) {
        var s = now - h * 3600 * 1000, e = s + 3600 * 1000;
        var endV = M.valueAt(e), startV = M.valueAt(s);
        if (startV === null && first && first[0] < e) startV = first[1]; // partial hour
        if (endV === null || startV === null) out.push(null);
        else out.push(Math.max(0, endV - startV)); // ascension resets clamp to 0
      }
      return out;
    };

    // overlay
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.7);align-items:center;justify-content:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#1b1b1b;border:2px solid #c9a24d;border-radius:8px;padding:12px;';
    var canvas = document.createElement('canvas');
    canvas.width = 720; canvas.height = 380;
    box.appendChild(canvas);
    wrap.appendChild(box);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) M.toggle(false); });
    document.body.appendChild(wrap);
    M.wrap = wrap; M.canvas = canvas;

    M.draw = function () {
      var c = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
      c.clearRect(0, 0, W, H);
      c.fillStyle = '#fff'; c.font = 'bold 18px sans-serif'; c.textAlign = 'center';
      c.fillText('Cookies baked per hour (last ' + M.HOURS + 'h)', W / 2, 26);
      var data = M.hourly(), max = 0;
      data.forEach(function (v) { if (v && v > max) max = v; });
      var L = 70, R = 20, T = 45, B = 50, pw = W - L - R, ph = H - T - B;
      // gridlines
      c.font = '12px sans-serif'; c.textAlign = 'right'; c.strokeStyle = '#444'; c.fillStyle = '#aaa';
      for (var g = 0; g <= 4; g++) {
        var y = T + ph - ph * g / 4;
        c.beginPath(); c.moveTo(L, y); c.lineTo(W - R, y); c.stroke();
        c.fillText(Beautify(max * g / 4), L - 6, y + 4);
      }
      var bw = pw / data.length;
      data.forEach(function (v, i) {
        var x = L + i * bw;
        if (v === null) {
          c.fillStyle = '#666'; c.textAlign = 'center';
          c.fillText('n/a', x + bw / 2, T + ph - 6);
        } else {
          var bh = max ? ph * v / max : 0;
          c.fillStyle = '#e0a030';
          c.fillRect(x + 4, T + ph - bh, bw - 8, bh);
        }
        c.fillStyle = '#aaa'; c.textAlign = 'center';
        c.fillText(i === data.length - 1 ? 'now' : '-' + (data.length - 1 - i) + 'h', x + bw / 2, H - 28);
      });
      c.fillStyle = '#888'; c.textAlign = 'center';
      c.fillText('Press M or click outside to close. Data only exists from when the mod was first loaded.', W / 2, H - 8);
    };

    M.toggle = function (force) {
      var show = force !== undefined ? force : wrap.style.display === 'none';
      wrap.style.display = show ? 'flex' : 'none';
      if (show) M.draw();
    };

    document.addEventListener('keydown', function (e) {
      var t = e.target && e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'm' || e.key === 'M') M.toggle();
    });

    M.sample();
    setInterval(function () {
      M.sample();
      if (wrap.style.display !== 'none') M.draw();
    }, M.SAMPLE_MS);
  },

  save: function () { return JSON.stringify(this.samples || []); },
  load: function (str) {
    try { this.samples = JSON.parse(str) || []; } catch (e) { this.samples = []; }
  }
});
