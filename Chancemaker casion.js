/* Chancemaker Casino (Roulette) - Cookie Clicker mod
   Paste into the browser console (F12) while Cookie Clicker is open.
   Press "." to open/close the roulette table (Esc also closes). */

Game.registerMod('chancemakerCasino', {
	init: function () {
		var M = {};
		Game.ChanceCasino = M;
		M.pct = 5;
		M.msg = 'Pick a bet.';
		M.ball = null;
		M.stats = { played: 0, net: 0 };
		M.reds = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

		var fmt = function (n) { return Beautify(Math.floor(n)); };
		M.bet = function () { return Math.max(1, Math.floor(Game.cookies * M.pct / 100)); };
		M.setPct = function (p) { M.pct = p; M.render(); };

		M.roll = function (type) {
			var bet = M.bet();
			if (Game.cookies < bet) { M.msg = 'Not enough cookies!'; M.render(); return; }
			var num = 0;
			if (type == 'number') {
				var el = l('ccNum');
				num = parseInt(el.value, 10);
				M.lastNum = el.value;
				if (isNaN(num) || num < 0 || num > 36) { M.msg = 'Pick a number from 0 to 36.'; M.render(); return; }
			}
			Game.cookies -= bet;
			var r = Math.floor(Math.random() * 37);
			var col = r == 0 ? 'green' : (M.reds.indexOf(r) >= 0 ? 'red' : 'black');
			var win = false, mult = 2;
			if (type == 'red') win = col == 'red';
			else if (type == 'black') win = col == 'black';
			else if (type == 'even') win = r > 0 && r % 2 == 0;
			else if (type == 'odd') win = r % 2 == 1;
			else if (type == 'number') { win = r == num; mult = 36; }
			var payout = win ? bet * mult : 0;
			Game.cookies += payout;
			M.stats.played++;
			M.stats.net += payout - bet;
			M.ball = { n: r, c: col };
			M.msg = (win ? 'You win ' + fmt(payout - bet) : 'You lose ' + fmt(bet)) + ' cookies.';
			M.render();
		};

		/* ---- UI ---- */
		M.panel = document.createElement('div');
		M.panel.id = 'ccPanel';
		M.panel.style.display = 'none';
		document.body.appendChild(M.panel);

		var css = document.createElement('style');
		css.textContent =
			'#ccPanel{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:340px;max-width:96vw;z-index:100000;padding:14px;text-align:center;' +
			'background:#0b2815;border:2px solid #c9a227;border-radius:8px;box-shadow:0 0 40px #000;color:#fff;font-size:14px;}' +
			'#ccPanel .b{display:inline-block;margin:3px;padding:6px 12px;border-radius:4px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.35);cursor:pointer;user-select:none;}' +
			'#ccPanel .b:hover{background:rgba(255,255,255,.3);} #ccPanel .b.on{background:#c9a227;color:#000;}' +
			'#ccPanel .ball{display:inline-block;width:54px;height:54px;line-height:54px;border-radius:50%;font-size:24px;font-weight:bold;margin:8px;}' +
			'#ccPanel input{width:50px;} #ccPanel .s{opacity:.7;font-size:11px;margin-top:8px;}';
		document.head.appendChild(css);

		M.render = function () {
			var h = '<div><b>🎰 Roulette</b> &nbsp; <span id="ccBank">' + fmt(Game.cookies) + '</span> cookies</div>';
			h += '<div style="margin-top:8px">Bet: ';
			[1, 5, 10, 25, 50].forEach(function (p) {
				h += '<span class="b' + (M.pct == p ? ' on' : '') + '" onclick="Game.ChanceCasino.setPct(' + p + ')">' + p + '%</span>';
			});
			h += '<div>= ' + fmt(M.bet()) + ' cookies</div></div>';
			if (M.ball) h += '<div class="ball" style="background:' + (M.ball.c == 'green' ? '#0a7a2a' : M.ball.c) + '">' + M.ball.n + '</div>';
			h += '<div>' + M.msg + '</div><div style="margin-top:8px">';
			[['red', 'Red'], ['black', 'Black'], ['even', 'Even'], ['odd', 'Odd']].forEach(function (t) {
				h += '<span class="b" onclick="Game.ChanceCasino.roll(\'' + t[0] + '\')">' + t[1] + ' x2</span>';
			});
			h += '</div><div style="margin-top:6px">Number: <input id="ccNum" type="number" min="0" max="36" value="' + (M.lastNum || 17) + '"> ' +
				'<span class="b" onclick="Game.ChanceCasino.roll(\'number\')">Bet x36</span></div>';
			h += '<div class="s">Rounds ' + M.stats.played + ' | Net ' + (M.stats.net < 0 ? '-' : '+') + fmt(Math.abs(M.stats.net)) + ' | "." or Esc to close</div>';
			M.panel.innerHTML = h;
		};

		M.toggle = function (on) {
			M.open = (on === undefined) ? !M.open : on;
			M.panel.style.display = M.open ? 'block' : 'none';
			if (M.open) M.render();
		};

		document.addEventListener('keydown', function (e) {
			var t = e.target, tag = t && t.tagName;
			if (tag == 'INPUT' || tag == 'TEXTAREA' || (t && t.isContentEditable)) {
				if (e.key == 'Escape' && M.open) M.toggle(false);
				return;
			}
			if (e.key == '.' && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); M.toggle(); }
			else if (e.key == 'Escape' && M.open) M.toggle(false);
		});

		Game.registerHook('draw', function () {
			if (M.open && Game.T % 5 == 0) { var e = l('ccBank'); if (e) e.textContent = fmt(Game.cookies); }
		});

		Game.Notify('Casino loaded', 'Press . to open the roulette table.', [8, 6], 5);
	},

	save: function () { var s = Game.ChanceCasino.stats; return s.played + ',' + s.net; },
	load: function (str) {
		var p = (str || '').split(',');
		if (p.length >= 2) Game.ChanceCasino.stats = { played: +p[0] || 0, net: +p[1] || 0 };
	}
});
