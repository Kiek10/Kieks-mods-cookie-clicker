/* Chancemaker Roulette v1.0 - Cookie Clicker mod
   Paste into the browser console (F12) while Cookie Clicker is open.
   Press "." to open/close. Esc also closes. */

Game.registerMod('chancemakerCasino', {
	init: function () {
		var M = Game.ChanceCasino = { stats: { played: 0, net: 0 }, angle: 0, spinning: false, open: false };
		var TAU = Math.PI * 2, S = TAU / 37;
		var ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
		var REDS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
		var FILL = { green: '#1a7f37', red: '#b3242b', black: '#151515' };
		var fmt = function (n) { return Beautify(Math.floor(n)); };
		var colorOf = function (n) { return n == 0 ? 'green' : REDS.indexOf(n) >= 0 ? 'red' : 'black'; };

		/* ---------- UI ---------- */
		var css = document.createElement('style');
		css.textContent =
			'#ccPanel{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:460px;max-width:96vw;max-height:96vh;overflow:auto;z-index:100000;' +
			'box-sizing:border-box;padding:18px 20px;background:#1c1c1c;border:1px solid #c8962e;border-radius:10px;box-shadow:0 0 40px #000;color:#fff;font:14px Arial,sans-serif;}' +
			'#ccPanel .t{font-size:20px;font-weight:bold;} #ccPanel .sub{color:#999;font-size:12px;margin:2px 0 12px;}' +
			'#ccPanel .row{display:flex;justify-content:space-between;align-items:center;margin:9px 0;color:#ddd;}' +
			'#ccPanel button{padding:7px 14px;background:#333;color:#fff;border:1px solid #666;border-radius:5px;cursor:pointer;font-size:14px;}' +
			'#ccPanel button:hover{background:#444;border-color:#c8962e;} #ccPanel.busy button{opacity:.4;pointer-events:none;}' +
			'#ccPanel button.red{background:#7a1f25;} #ccPanel button.red:hover{background:#9a2830;}' +
			'#ccPanel input[type=number]{width:58px;padding:5px;background:#2a2a2a;color:#fff;border:1px solid #666;border-radius:5px;text-align:center;}' +
			'#ccPanel input[type=range]{width:150px;margin-right:8px;vertical-align:middle;accent-color:#e0a030;}' +
			'#ccPanel canvas{display:block;margin:10px auto;} #ccMsg{text-align:center;min-height:22px;font-size:16px;font-weight:bold;}' +
			'#ccPanel .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0;}' +
			'#ccPanel .foot{border-top:1px solid #444;margin-top:12px;padding-top:8px;color:#999;font-size:12px;}';
		document.head.appendChild(css);

		var p = M.panel = document.createElement('div');
		p.id = 'ccPanel';
		p.style.display = 'none';
		p.innerHTML =
			'<div class="t">Roulette v1.0</div><div class="sub">Press . to open or close this menu. Esc also closes.</div>' +
			'<div class="row"><span>Bank</span><b id="ccBank"></b></div>' +
			'<div class="row"><span>Bet percent</span><span><input id="ccRange" type="range" min="1" max="100" value="5"><input id="ccPct" type="number" min="1" max="100" value="5"> %</span></div>' +
			'<div class="row"><span>Bet amount</span><b id="ccAmt"></b></div>' +
			'<canvas id="ccWheel" width="320" height="320"></canvas><div id="ccMsg">Pick a bet.</div>' +
			'<div class="grid"><button class="red" data-b="red">Red x2</button><button data-b="black">Black x2</button><button data-b="even">Even x2</button><button data-b="odd">Odd x2</button></div>' +
			'<div class="row"><span>Exact number (0-36)</span><span><input id="ccNum" type="number" min="0" max="36" value="17"> <button data-b="number">Bet x36</button></span></div>' +
			'<div class="row"><span></span><button id="ccClose">Close</button></div><div class="foot" id="ccStats"></div>';
		document.body.appendChild(p);

		var pct = function () { return Math.min(100, Math.max(1, parseInt(l('ccPct').value, 10) || 1)); };
		var bet = function () { return Math.max(1, Math.floor(Game.cookies * pct() / 100)); };
		var refresh = function () {
			l('ccBank').textContent = fmt(Game.cookies) + ' cookies';
			l('ccAmt').textContent = fmt(bet()) + ' cookies';
			l('ccStats').textContent = 'Rounds: ' + M.stats.played + '   |   Net: ' + (M.stats.net < 0 ? '-' : '+') + fmt(Math.abs(M.stats.net));
		};
		var say = function (txt, col) { var m = l('ccMsg'); m.textContent = txt; m.style.color = col || '#fff'; };

		l('ccRange').oninput = function () { l('ccPct').value = this.value; refresh(); };
		l('ccPct').oninput = function () { l('ccRange').value = pct(); refresh(); };
		l('ccPct').onblur = function () { this.value = pct(); };
		l('ccClose').onclick = function () { M.toggle(false); };
		p.addEventListener('click', function (e) { var b = e.target.getAttribute && e.target.getAttribute('data-b'); if (b) M.roll(b); });

		/* ---------- wheel ---------- */
		var draw = function () {
			var c = l('ccWheel'), x = c.getContext('2d'), cx = c.width / 2, cy = c.height / 2 + 6, R = c.width / 2 - 14;
			x.clearRect(0, 0, c.width, c.height);
			x.save(); x.translate(cx, cy); x.rotate(M.angle);
			x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = 'bold 12px Arial'; x.strokeStyle = '#c8962e'; x.lineWidth = 1;
			for (var i = 0; i < 37; i++) {
				var n = ORDER[i], a = -Math.PI / 2 + i * S;
				x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, R, a, a + S); x.closePath();
				x.fillStyle = FILL[colorOf(n)]; x.fill(); x.stroke();
				x.save(); x.rotate(a + S / 2); x.translate(R * 0.82, 0); x.rotate(Math.PI / 2);
				x.fillStyle = '#fff'; x.fillText(n, 0, 0); x.restore();
			}
			x.beginPath(); x.arc(0, 0, R * 0.55, 0, TAU); x.fillStyle = '#1c1c1c'; x.fill(); x.stroke();
			x.restore();
			x.beginPath(); x.moveTo(cx - 11, 0); x.lineTo(cx + 11, 0); x.lineTo(cx, 26); x.closePath();
			x.fillStyle = '#e0a030'; x.fill();
		};

		/* ---------- game ---------- */
		M.roll = function (type) {
			if (M.spinning) return;
			var b = bet(), num = 0;
			if (Game.cookies < b) return say('Not enough cookies!', '#e05050');
			if (type == 'number') {
				num = parseInt(l('ccNum').value, 10);
				if (isNaN(num) || num < 0 || num > 36) return say('Pick a number from 0 to 36.', '#e05050');
			}
			Game.cookies -= b;
			M.spinning = true; p.classList.add('busy'); say('Spinning...');

			var r = Math.floor(Math.random() * 37), i = ORDER.indexOf(r);
			var base = ((-(i + 0.5 + (Math.random() - 0.5) * 0.6) * S) % TAU + TAU) % TAU;
			var from = M.angle, to = from - (from % TAU) + TAU * 6 + base;
			if (to < from + TAU * 5) to += TAU;
			var t0 = performance.now(), D = 4500;

			(function step(t) {
				var k = Math.min(1, (t - t0) / D);
				M.angle = from + (to - from) * (1 - Math.pow(1 - k, 3));
				draw();
				if (k < 1) return requestAnimationFrame(step);

				var col = colorOf(r), win = false, mult = 2;
				if (type == 'red') win = col == 'red';
				else if (type == 'black') win = col == 'black';
				else if (type == 'even') win = r > 0 && r % 2 == 0;
				else if (type == 'odd') win = r % 2 == 1;
				else { win = r == num; mult = 36; }
				var pay = win ? b * mult : 0;
				Game.cookies += pay;
				M.stats.played++; M.stats.net += pay - b;
				M.spinning = false; p.classList.remove('busy');
				say(r + ' ' + col + ': ' + (win ? 'You win ' + fmt(pay - b) : 'You lose ' + fmt(b)) + ' cookies', win ? '#4fd36f' : '#e05050');
				refresh();
			})(t0);
		};

		M.toggle = function (on) {
			M.open = on === undefined ? !M.open : on;
			p.style.display = M.open ? 'block' : 'none';
			if (M.open) { draw(); refresh(); }
		};

		document.addEventListener('keydown', function (e) {
			var t = e.target, typing = t && (t.tagName == 'INPUT' || t.tagName == 'TEXTAREA' || t.isContentEditable);
			if (e.key == 'Escape' && M.open) M.toggle(false);
			else if (e.key == '.' && !typing && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); M.toggle(); }
		});
		Game.registerHook('draw', function () { if (M.open && Game.T % 5 == 0) refresh(); });
		Game.Notify('Roulette loaded', 'Press . to open the table.', [8, 6], 5);
	},

	save: function () { var s = Game.ChanceCasino.stats; return s.played + ',' + s.net; },
	load: function (str) {
		var a = (str || '').split(',');
		if (a.length >= 2) Game.ChanceCasino.stats = { played: +a[0] || 0, net: +a[1] || 0 };
	}
});
