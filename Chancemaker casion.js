/* Chancemaker Casino - a Cookie Clicker mod
   Adds a "Casino" minigame to the Chancemaker (like Farm/Bank/Temple minigames).
   Games: Slots, Blackjack, Roulette. Bets are placed in cookies.
   Load: paste this whole file into the browser console (F12) while Cookie Clicker is open,
   or load it as a local/Steam mod. A "Casino" bar appears under the Chancemaker row once it's unlocked. */

Game.registerMod('chancemakerCasino', {
	init: function () {
		var B = Game.Objects['Chancemaker'];
		var M = {};
		Game.ChanceCasino = M;
		M.parent = B;

		/* Own toggle bar + panel directly under the Chancemaker row.
		   This doesn't depend on the game's minigame loader, so it works no matter
		   what level your Chancemaker already is when the mod loads. */
		var row = l('row' + B.id);
		M.bar = document.createElement('div');
		M.bar.id = 'ccBar';
		M.bar.textContent = '🎰 Casino (click to open)';
		M.bar.onclick = function () {
			M.open = !M.open;
			M.panel.style.display = M.open ? 'block' : 'none';
			M.bar.textContent = M.open ? '🎰 Casino (click to close)' : '🎰 Casino (click to open)';
			if (M.open) M.render();
		};
		M.panel = document.createElement('div');
		M.panel.id = 'ccPanel';
		M.panel.style.display = 'none';
		M.open = false;
		row.parentNode.insertBefore(M.panel, row.nextSibling);
		row.parentNode.insertBefore(M.bar, M.panel);

		M.tab = 'slots';
		M.pct = 5;
		M.msg = 'Welcome to the Chancemaker Casino. Place your bets!';
		M.stats = { played: 0, net: 0, best: 0 };
		M.reels = ['🍒', '🍋', '🔔'];
		M.spinning = false;
		M.bj = null;

		/* ---------- helpers ---------- */
		var fmt = function (n) { return Beautify(Math.floor(n)); };
		M.bet = function () { return Math.max(1, Math.floor(Game.cookies * M.pct / 100)); };
		M.canBet = function (bet) {
			if (Game.cookies < bet || Game.cookies < 1) { M.msg = 'Not enough cookies!'; M.render(); return false; }
			return true;
		};
		M.settle = function (bet, payout, msg) {
			Game.cookies += payout;
			var profit = payout - bet;
			M.stats.played++;
			M.stats.net += profit;
			if (profit > M.stats.best) M.stats.best = profit;
			M.msg = msg + (profit > 0 ? ' You win ' + fmt(profit) + ' cookies!' : profit < 0 ? ' You lose ' + fmt(-profit) + ' cookies.' : ' Bet returned.');
			if (profit >= bet * 9 && profit > 0) Game.Notify('Casino jackpot!', 'You won ' + fmt(profit) + ' cookies!', [8, 6], 6);
			M.render();
		};
		M.setPct = function (p) { M.pct = p; M.render(); };
		M.setTab = function (t) { M.tab = t; M.render(); };
		M.slotBonus = function () { return 1 + Math.min(B.level, 12) * 0.0025; }; // Chancemaker level helps slots (max +3%)

		/* ---------- slots ---------- */
		M.syms = [
			{ s: '🍒', w: 30, m: 4 }, { s: '🍋', w: 25, m: 7 }, { s: '🔔', w: 20, m: 14 },
			{ s: '🍪', w: 15, m: 28 }, { s: '💎', w: 8, m: 70 }, { s: '7️⃣', w: 2, m: 250 }
		];
		M.pick = function () {
			var r = Math.random() * 100, t = 0;
			for (var i = 0; i < M.syms.length; i++) { t += M.syms[i].w; if (r < t) return M.syms[i]; }
			return M.syms[0];
		};
		M.spin = function () {
			if (M.spinning) return;
			var bet = M.bet(); if (!M.canBet(bet)) return;
			Game.cookies -= bet;
			M.spinning = true;
			var res = [M.pick(), M.pick(), M.pick()], n = 0;
			var t = setInterval(function () {
				n++;
				for (var i = 0; i < 3; i++) {
					M.reels[i] = (n < 8 + i * 6) ? M.syms[Math.floor(Math.random() * M.syms.length)].s : res[i].s;
					var el = l('ccReel' + i); if (el) el.textContent = M.reels[i];
				}
				if (n >= 20) {
					clearInterval(t); M.spinning = false;
					var mult = 0, msg = 'No match.';
					if (res[0] == res[1] && res[1] == res[2]) { mult = res[0].m; msg = 'Three of a kind (x' + mult + ')!'; }
					else if (res[0] == res[1] || res[1] == res[2] || res[0] == res[2]) { mult = 1; msg = 'A pair.'; }
					M.settle(bet, Math.floor(bet * mult * M.slotBonus()), msg);
				}
			}, 80);
		};

		/* ---------- blackjack ---------- */
		M.deck = function () {
			var d = [], s = ['♠', '♥', '♦', '♣'], r = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
			s.forEach(function (x) { r.forEach(function (y) { d.push({ r: y, s: x }); }); });
			for (var i = d.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = d[i]; d[i] = d[j]; d[j] = tmp; }
			return d;
		};
		M.val = function (h) {
			var t = 0, a = 0;
			h.forEach(function (c) {
				if (c.r == 'A') { a++; t += 11; }
				else if ('JQK'.indexOf(c.r) >= 0 || c.r == '10') t += 10;
				else t += +c.r;
			});
			while (t > 21 && a > 0) { t -= 10; a--; }
			return t;
		};
		M.deal = function () {
			if (M.bj && M.bj.live) return;
			var bet = M.bet(); if (!M.canBet(bet)) return;
			Game.cookies -= bet;
			var d = M.deck();
			M.bj = { deck: d, p: [d.pop(), d.pop()], d: [d.pop(), d.pop()], bet: bet, live: true, first: true };
			M.msg = 'Your move.';
			if (M.val(M.bj.p) == 21) M.stand(); else M.render();
		};
		M.hit = function () {
			var b = M.bj; if (!b || !b.live) return;
			b.p.push(b.deck.pop()); b.first = false;
			if (M.val(b.p) > 21) M.finish(); else M.render();
		};
		M.double = function () {
			var b = M.bj; if (!b || !b.live || !b.first) return;
			if (Game.cookies < b.bet) { M.msg = 'Not enough cookies to double!'; M.render(); return; }
			Game.cookies -= b.bet; b.bet *= 2;
			b.p.push(b.deck.pop());
			M.finish();
		};
		M.stand = function () { if (M.bj && M.bj.live) M.finish(); };
		M.finish = function () {
			var b = M.bj; b.live = false;
			var pv = M.val(b.p);
			if (pv <= 21) while (M.val(b.d) < 17) b.d.push(b.deck.pop());
			var dv = M.val(b.d);
			var pbj = (pv == 21 && b.p.length == 2), dbj = (dv == 21 && b.d.length == 2);
			if (pv > 21) M.settle(b.bet, 0, 'Bust!');
			else if (pbj && !dbj) M.settle(b.bet, Math.floor(b.bet * 2.5), 'Blackjack!');
			else if (dv > 21) M.settle(b.bet, b.bet * 2, 'Dealer busts.');
			else if (pv > dv) M.settle(b.bet, b.bet * 2, 'You beat the dealer (' + pv + ' vs ' + dv + ').');
			else if (pv == dv) M.settle(b.bet, b.bet, 'Push (' + pv + ').');
			else M.settle(b.bet, 0, 'Dealer wins (' + dv + ' vs ' + pv + ').');
		};
		M.card = function (c, hide) {
			if (hide) return '<span class="ccCard">?</span>';
			return '<span class="ccCard' + ((c.s == '♥' || c.s == '♦') ? ' red' : '') + '">' + c.r + c.s + '</span>';
		};

		/* ---------- roulette ---------- */
		M.reds = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
		M.roll = function (type) {
			var bet = M.bet(); if (!M.canBet(bet)) return;
			var num = 0;
			if (type == 'number') {
				num = parseInt((l('ccNum') || {}).value, 10);
				if (isNaN(num) || num < 0 || num > 36) { M.msg = 'Pick a number from 0 to 36.'; M.render(); return; }
				M.lastNum = l('ccNum').value;
			}
			Game.cookies -= bet;
			var r = Math.floor(Math.random() * 37);
			var red = M.reds.indexOf(r) >= 0;
			var col = r == 0 ? 'green' : red ? 'red' : 'black';
			var win = false, mult = 2;
			if (type == 'red') win = col == 'red';
			else if (type == 'black') win = col == 'black';
			else if (type == 'even') win = r > 0 && r % 2 == 0;
			else if (type == 'odd') win = r % 2 == 1;
			else if (type == 'zero') { win = r == 0; mult = 36; }
			else if (type == 'number') { win = r == num; mult = 36; }
			M.ball = { n: r, c: col };
			M.settle(bet, win ? bet * mult : 0, 'The ball lands on ' + r + ' (' + col + ').');
		};

		/* ---------- UI ---------- */
		var css = document.createElement('style');
		css.textContent =
			'#ccWrap{padding:10px 14px;color:#fff;font-size:13px;text-shadow:0 1px 2px #000;}' +
			'.ccBtn{display:inline-block;margin:2px;padding:4px 10px;border-radius:4px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);cursor:pointer;user-select:none;}' +
			'.ccBtn:hover{background:rgba(255,255,255,.25);} .ccBtn.on{background:#c9a227;color:#000;text-shadow:none;border-color:#fff;}' +
			'.ccRow{margin:6px 0;} .ccMsg{margin:8px 0;padding:6px 10px;background:rgba(0,0,0,.35);border-radius:4px;min-height:18px;}' +
			'.ccReels{font-size:46px;letter-spacing:10px;text-align:center;margin:8px 0;text-shadow:none;}' +
			'.ccCard{display:inline-block;min-width:34px;margin:2px;padding:6px 4px;text-align:center;border-radius:4px;background:#f4f0e6;color:#111;font-weight:bold;font-size:16px;text-shadow:none;}' +
			'.ccCard.red{color:#c0202a;} .ccBall{display:inline-block;width:46px;height:46px;line-height:46px;border-radius:50%;text-align:center;font-size:20px;font-weight:bold;}' +
			'#ccNum{width:48px;} .ccSmall{opacity:.75;font-size:11px;}';
		document.head.appendChild(css);

		M.render = function () {
			var div = M.panel; if (!div) return;
			var h = '<div id="ccWrap">';
			h += '<div class="ccRow"><b>🎰 Chancemaker Casino</b> &nbsp; Bank: <b id="ccBank">' + fmt(Game.cookies) + '</b> cookies</div>';
			h += '<div class="ccRow">Bet: ';
			[1, 5, 10, 25, 50].forEach(function (p) { h += '<a class="ccBtn' + (M.pct == p ? ' on' : '') + '" onclick="Game.ChanceCasino.setPct(' + p + ')">' + p + '%</a>'; });
			h += ' = <b>' + fmt(M.bet()) + '</b> cookies</div>';
			h += '<div class="ccRow">';
			[['slots', 'Slots'], ['bj', 'Blackjack'], ['roul', 'Roulette']].forEach(function (t) {
				h += '<a class="ccBtn' + (M.tab == t[0] ? ' on' : '') + '" onclick="Game.ChanceCasino.setTab(\'' + t[0] + '\')">' + t[1] + '</a>';
			});
			h += '</div>';

			if (M.tab == 'slots') {
				h += '<div class="ccReels"><span id="ccReel0">' + M.reels[0] + '</span><span id="ccReel1">' + M.reels[1] + '</span><span id="ccReel2">' + M.reels[2] + '</span></div>';
				h += '<div class="ccRow" style="text-align:center"><a class="ccBtn" onclick="Game.ChanceCasino.spin()">Spin!</a></div>';
				h += '<div class="ccSmall">Pair = bet back. Three of a kind: ' + M.syms.map(function (s) { return s.s + 'x' + s.m; }).join(' ') +
					'. Chancemaker level bonus: +' + ((M.slotBonus() - 1) * 100).toFixed(2) + '% payout (max +3%).</div>';
			} else if (M.tab == 'bj') {
				var b = M.bj;
				if (b) {
					h += '<div class="ccRow">Dealer' + (b.live ? '' : ' (' + M.val(b.d) + ')') + ': ' + b.d.map(function (c, i) { return M.card(c, b.live && i == 1); }).join('') + '</div>';
					h += '<div class="ccRow">You (' + M.val(b.p) + '): ' + b.p.map(function (c) { return M.card(c); }).join('') + ' &nbsp; Bet: ' + fmt(b.bet) + '</div>';
				}
				h += '<div class="ccRow">';
				if (b && b.live) {
					h += '<a class="ccBtn" onclick="Game.ChanceCasino.hit()">Hit</a><a class="ccBtn" onclick="Game.ChanceCasino.stand()">Stand</a>';
					if (b.first) h += '<a class="ccBtn" onclick="Game.ChanceCasino.double()">Double</a>';
				} else h += '<a class="ccBtn" onclick="Game.ChanceCasino.deal()">Deal</a>';
				h += '</div><div class="ccSmall">Dealer stands on 17. Blackjack pays 3:2.</div>';
			} else {
				if (M.ball) h += '<div class="ccRow"><span class="ccBall" style="background:' + (M.ball.c == 'green' ? '#0a7a2a' : M.ball.c) + '">' + M.ball.n + '</span></div>';
				h += '<div class="ccRow">';
				[['red', 'Red x2'], ['black', 'Black x2'], ['even', 'Even x2'], ['odd', 'Odd x2'], ['zero', 'Zero x36']].forEach(function (t) {
					h += '<a class="ccBtn" onclick="Game.ChanceCasino.roll(\'' + t[0] + '\')">' + t[1] + '</a>';
				});
				h += '</div><div class="ccRow">Exact number (x36): <input id="ccNum" type="number" min="0" max="36" value="' + (M.lastNum || 17) + '"> <a class="ccBtn" onclick="Game.ChanceCasino.roll(\'number\')">Bet</a></div>';
				h += '<div class="ccSmall">Single-zero wheel (0-36).</div>';
			}

			h += '<div class="ccMsg">' + M.msg + '</div>';
			h += '<div class="ccSmall">Rounds: ' + M.stats.played + ' &nbsp; Net: ' + (M.stats.net >= 0 ? '+' : '-') + fmt(Math.abs(M.stats.net)) + ' &nbsp; Best win: ' + fmt(M.stats.best) + '</div>';
			h += '</div>';
			div.innerHTML = h;
		};

		var css2 = document.createElement('style');
		css2.textContent =
			'#ccBar{margin:0 0 2px 0;padding:6px 12px;background:linear-gradient(#5a1d1d,#3a0f0f);color:#ffd96b;font-weight:bold;cursor:pointer;border-top:1px solid #c9a227;border-bottom:1px solid #c9a227;text-shadow:0 1px 2px #000;position:relative;z-index:50;}' +
			'#ccBar:hover{filter:brightness(1.3);}' +
			'#ccPanel{background:linear-gradient(#123d22,#0b2815);border-bottom:2px solid #c9a227;position:relative;z-index:50;}';
		document.head.appendChild(css2);

		Game.registerHook('draw', function () {
			// only show once the Chancemaker has been unlocked
			M.bar.style.display = B.locked ? 'none' : 'block';
			if (B.locked) M.panel.style.display = 'none';
			else if (M.open) {
				M.panel.style.display = 'block';
				var e = l('ccBank'); if (e && Game.T % 5 == 0) e.textContent = fmt(Game.cookies);
			}
		});
		Game.registerHook('reset', function (hard) {
			if (hard) { M.stats = { played: 0, net: 0, best: 0 }; M.bj = null; M.msg = 'Place your bets!'; }
			M.render();
		});

		M.render();
		Game.Notify('Chancemaker Casino loaded', 'Look for the 🎰 Casino bar under your Chancemaker.', [8, 6], 6);
	},

	save: function () {
		var s = Game.ChanceCasino.stats;
		return [s.played, s.net, s.best].join(',');
	},
	load: function (str) {
		var M = Game.ChanceCasino, p = (str || '').split(',');
		if (p.length == 3) M.stats = { played: +p[0] || 0, net: +p[1] || 0, best: +p[2] || 0 };
		M.render();
	}
});
