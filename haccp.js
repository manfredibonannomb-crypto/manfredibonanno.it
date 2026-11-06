// Sicurezza alimentare a tre strati: prerequisiti e punti critici di controllo.
// In alto la flotta dei pericoli (biologici, chimici, fisici; per l'imballaggio anche
// prestazionali) marcia a scatti da un lato all'altro e spara; nel mezzo il muro dei
// programmi di prerequisiti (GHP) ondeggia e ne intercetta la maggior parte; in basso la
// linea di processo: chi passa scorre fino al punto critico di controllo (CCP) successivo,
// che lo ferma. Ogni tanto un monitoraggio supera il limite critico: il CCP diventa ambra,
// il prodotto va in segregazione e parte l'azione correttiva.
// Il selettore cambia processo: alimento o imballaggio.
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var figure = document.querySelector('.haccp');
  var svg = figure && figure.querySelector('.haccp__svg');
  if (!svg) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Le etichette su due righe (array) vanno a capo solo sul telefono
  var GHP = ['Pulizia', 'Manutenzione', ['Igiene', 'personale'], ['Controllo', 'infestanti'], 'Fornitori', 'Aria | Acqua', 'Rifiuti', 'Formazione'];
  var MODES = {
    food: {
      steps: ['Ricevimento', 'Stoccaggio', 'Preparazione', 'Cottura', 'Raffreddamento', 'Confezionamento', 'Rilevazione metalli', 'Spedizione'],
      ccp: { 3: 'temperatura al cuore', 4: 'tempo e temperatura', 6: 'corpi estranei' },
      kinds: ['bio', 'chem', 'phys'],
      end: 'Consumatore'
    },
    pack: {
      steps: ['Ricevimento', 'Stoccaggio', 'Stampa', 'Fabbricazione', 'Ispezione', 'Spedizione'],
      ccp: { 2: 'solventi residui', 3: 'integrità e tenuta', 4: 'corpi estranei' },
      kinds: ['bio', 'chem', 'phys', 'perf'],
      end: 'Utilizzatore'
    }
  };
  var KIND_LABEL = { bio: 'biologico', chem: 'chimico', phys: 'fisico', perf: 'prestazionale' };
  var TICK = 0.22;   // passo della flotta: a scatti, come in sala giochi

  var mode = 'food', wide = true, L = null, liveT = 0;
  var tiles = [], walls = [], gates = [], parts = [], fleet = null, beam = null, flow = null, endNode = null, bin = null, intro = null;

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function clamp(k) { return Math.max(0, Math.min(1, k)); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function anyKind() { var k = MODES[mode].kinds; return k[Math.floor(Math.random() * k.length)]; }

  // Disposizione: schermi larghi tutti i passi; telefono solo inizio, CCP e fine
  function layout() {
    var M = MODES[mode], idx = M.steps.map(function (s, i) { return i; });
    if (!wide) idx = idx.filter(function (i) { return i === 0 || M.ccp[i] || i === M.steps.length - 1; });
    var W = wide ? 1200 : 420, H = wide ? 450 : 540;
    var x0 = wide ? 120 : 34, x1 = wide ? 1010 : 330, endX = wide ? 1130 : 386;
    var steps = idx.map(function (i, j) {
      return { x: x0 + (x1 - x0) * j / (idx.length - 1), label: M.steps[i], ccp: M.ccp[i] || null };
    });
    var ccpN = 0;
    steps.forEach(function (s) { if (s.ccp) s.n = ++ccpN; });
    var lastCcp = steps.filter(function (s) { return s.ccp; }).pop();
    // Muro dei prerequisiti: una fila (largo) o due (telefono), centrato nel riquadro
    var per = wide ? 8 : 4, rows = [], m = wide ? 96 : 22;
    for (var r = 0; r * per < GHP.length; r++) {
      rows.push({ labels: GHP.slice(r * per, r * per + per), y: (wide ? 136 : 124) + r * 46, xa: m, xb: W - m, ph: r * Math.PI });
    }
    return {
      W: W, H: H, steps: steps, rows: rows, flowY: wide ? 290 : 318, x0: x0 - 40, endX: endX,
      tileH: wide ? 30 : 36, sway: wide ? 36 : 14, swayT: wide ? 10 : 8,
      // flotta: i pericoli con la loro etichetta, una fila (largo) o due (telefono)
      fleet: { perRow: wide ? 4 : 2, y0: wide ? 50 : 40, dy: 28, gap: wide ? 56 : 22, m: wide ? 60 : 18, step: wide ? 10 : 6, scale: wide ? 2 : 1.5, font: wide ? 14 : 11 },
      // si spara solo sopra il tratto di processo che ha ancora un CCP a valle
      fire: [Math.max(x0 - 34, 12), lastCcp.x - 22],
      bin: { x: wide ? 1080 : 330, y: wide ? 414 : 506, w: wide ? 100 : 96, h: 26 }
    };
  }

  function shape(kind, g) {
    if (kind === 'bio') return el('circle', { r: 3.6 }, g);
    if (kind === 'chem') return el('path', { d: 'M0,-4.6 L4.6,0 L0,4.6 L-4.6,0 Z' }, g);
    if (kind === 'phys') return el('rect', { x: -3.4, y: -3.4, width: 6.8, height: 6.8 }, g);
    return el('path', { d: 'M0,-4.6 L4.4,3.4 L-4.4,3.4 Z' }, g);
  }

  function build(instant) {
    wide = svg.clientWidth >= 680 || svg.clientWidth === 0;
    L = layout();
    var kinds = MODES[mode].kinds;
    svg.innerHTML = '';
    tiles = []; walls = []; gates = []; parts = []; liveT = 0;
    svg.setAttribute('viewBox', '0 0 ' + L.W + ' ' + L.H);

    var defs = el('defs', {}, svg);
    var f = el('filter', { id: 'hz-glow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    el('feGaussianBlur', { stdDeviation: '3', result: 'b' }, f);
    var m = el('feMerge', {}, f); el('feMergeNode', { in: 'b' }, m); el('feMergeNode', { in: 'SourceGraphic' }, m);
    var pat = el('pattern', { id: 'hz-dots', width: 18, height: 18, patternUnits: 'userSpaceOnUse' }, defs);
    el('circle', { 'class': 'hz-dot', cx: 1, cy: 1, r: 0.9 }, pat);
    el('rect', { 'class': 'hz-grid hz-on-late', x: 0, y: 0, width: L.W, height: L.H, fill: 'url(#hz-dots)' }, svg);

    // Flotta: ogni pericolo con la sua etichetta; spara dal proprio simbolo
    var F = L.fleet, rowsU = [];
    fleet = { g: el('g', { 'class': 'hz-fleet' }, svg), dir: 1, t: 0, units: [] };
    kinds.forEach(function (k, i) {
      var u = { k: k, g: el('g', { 'class': 'hz-unit hz-part--' + k }, fleet.g), r: Math.floor(i / F.perRow) };
      var ic = el('g', { 'class': 'hz-unit__icon', transform: 'scale(' + F.scale + ')' }, u.g);
      u.inv = el('g', { 'class': 'hz-inv' }, ic);
      shape(k, u.inv);
      var tx = el('text', { 'class': 'hz-unit__label', x: 6 * F.scale + 6, y: F.font * 0.36, 'font-size': F.font }, u.g);
      tx.textContent = KIND_LABEL[k];
      u.w = 6 * F.scale + 6 + tx.getComputedTextLength();
      (rowsU[u.r] = rowsU[u.r] || []).push(u);
      fleet.units.push(u);
    });
    // file centrate tra loro (sul telefono l'ultima può essere più corta)
    var rowW = rowsU.map(function (row) { return row.reduce(function (a, u) { return a + u.w; }, 0) + F.gap * (row.length - 1); });
    var fw = Math.max.apply(null, rowW);
    rowsU.forEach(function (row, r) {
      var x = (fw - rowW[r]) / 2;
      row.forEach(function (u) {
        u.lx = x; u.y = F.y0 + r * F.dy; x += u.w + F.gap;
        u.g.setAttribute('transform', 'translate(' + u.lx.toFixed(1) + ',' + u.y + ')');
      });
    });
    fleet.min = F.m; fleet.max = L.W - F.m - fw;
    fleet.bottom = F.y0 + (rowsU.length - 1) * F.dy + 8;   // i colpi escono sotto la formazione, senza attraversare le etichette
    fleet.x = Math.round((fleet.min + fleet.max) / 2);
    fleet.g.setAttribute('transform', 'translate(' + fleet.x + ',0)');

    // Muro dei prerequisiti: tasselli larghi quanto l'etichetta, con varchi uguali tra loro
    L.rows.forEach(function (row) {
      var wall = { g: el('g', { 'class': 'hz-wall' }, svg), off: 0, ph: row.ph };
      var made = row.labels.map(function (lab) {
        var lines = typeof lab === 'string' ? [lab] : wide ? [lab.join(' ')] : lab;
        var g = el('g', { 'class': 'hz-tile hz-mo' }, wall.g);
        var r = el('rect', { rx: 3, y: row.y, height: L.tileH }, g);
        var tx = el('text', { 'class': 'hz-tile__label', 'text-anchor': 'middle' }, g), w = 0;
        var ts = lines.map(function (s, i) {
          var t = el('tspan', { y: row.y + L.tileH / 2 + 3.5 + (i - (lines.length - 1) / 2) * 11 }, tx);
          t.textContent = s;
          w = Math.max(w, t.getComputedTextLength());
          return t;
        });
        return { g: g, rect: r, ts: ts, w: w + (wide ? 26 : 16), y: row.y, wall: wall };
      });
      var sum = made.reduce(function (a, t) { return a + t.w; }, 0);
      var gap = Math.max(10, (row.xb - row.xa - sum) / (made.length - 1));
      var x = (row.xa + row.xb - sum - gap * (made.length - 1)) / 2;
      made.forEach(function (t) {
        t.x = x; x += t.w + gap;
        t.rect.setAttribute('x', t.x); t.rect.setAttribute('width', t.w);
        t.ts.forEach(function (s) { s.setAttribute('x', t.x + t.w / 2); });
        tiles.push(t);
      });
      walls.push(wall);
    });

    // Linea di processo con il flusso del prodotto, nodi, etichette
    var d = 'M' + L.x0 + ',' + L.flowY + ' H' + L.endX;
    var line = el('path', { 'class': 'hz-line', d: d }, svg);
    flow = el('path', { 'class': 'hz-flow hz-on-late', d: d }, svg);
    var len = line.getTotalLength();
    line.style.strokeDasharray = len; line.style.strokeDashoffset = instant ? 0 : len;
    L.line = line; L.len = len;

    L.steps.forEach(function (s, i) {
      var n = el('circle', { 'class': 'hz-node hz-mo' + (s.ccp ? ' hz-node--ccp' : ''), cx: s.x, cy: L.flowY, r: s.ccp ? 7 : 5 }, svg);
      // su telefono le etichette si alternano su due altezze per non sovrapporsi
      var tl = el('text', { 'class': 'hz-step hz-mo', x: s.x, y: L.flowY - (wide || i % 2 === 0 ? 24 : 38), 'text-anchor': 'middle' }, svg);
      tl.textContent = s.label;
      if (!wide && s.label.length > 12) tl.setAttribute('class', 'hz-step hz-step--sm hz-mo');
      s.node = n; s.labelEl = tl;
      if (s.ccp) gates.push(buildGate(s));
    });

    endNode = el('g', { 'class': 'hz-end hz-mo' }, svg);
    el('circle', { 'class': 'hz-end__dot', cx: L.endX, cy: L.flowY, r: 10 }, endNode);
    el('text', { 'class': 'hz-step', x: L.endX, y: L.flowY + 30, 'text-anchor': 'middle' }, endNode).textContent = MODES[mode].end;

    // Segregazione: dove finisce il prodotto quando un CCP devia
    bin = el('g', { 'class': 'hz-bin hz-on-late' }, svg);
    var b = L.bin;
    bin.rect = el('rect', { x: b.x - b.w / 2, y: b.y - b.h / 2, width: b.w, height: b.h, rx: 3 }, bin);
    el('text', { 'class': 'hz-bin__label', x: b.x, y: b.y + 3.5, 'text-anchor': 'middle' }, bin).textContent = 'segregazione';

    beam = el('g', { 'class': 'hz-beam', opacity: 0 }, svg);
    el('circle', { 'class': 'hz-beam__halo', r: 14 }, beam);
    el('circle', { 'class': 'hz-beam__core', r: 4 }, beam);

    svg.classList.remove('is-live');
    if (instant || reduced) finishIntro();
    else intro = { t: 0, done: false };
    if (reduced) staticScene();
  }

  // Cancello del CCP con la sua carta di monitoraggio (valori, limite critico, stato)
  function buildGate(s) {
    var g = el('g', { 'class': 'hz-gate hz-mo' }, svg);
    var y = L.flowY;
    el('path', { 'class': 'hz-gate__bracket', d: 'M' + (s.x - 9) + ',' + (y - 15) + ' h-4 v30 h4 M' + (s.x + 9) + ',' + (y - 15) + ' h4 v30 h-4' }, g);
    // su telefono le carte dei CCP si alternano su due file
    var drop = !wide && s.n % 2 === 0 ? 64 : 0;
    var cw = wide ? 116 : 100, ch = 54, cx = s.x - cw / 2, cy = y + 34 + drop;
    var card = el('g', { 'class': 'hz-card', transform: 'translate(' + cx + ',' + cy + ')' }, g);
    el('line', { 'class': 'hz-card__lead', x1: cw / 2, y1: -24 - drop, x2: cw / 2, y2: 0 }, card);
    el('rect', { 'class': 'hz-card__box', width: cw, height: ch, rx: 3 }, card);
    el('text', { 'class': 'hz-card__title', x: 8, y: 13 }, card).textContent = 'CCP ' + s.n;
    var dot = el('circle', { 'class': 'hz-card__live', cx: cw - 9, cy: 9.5, r: 2 }, card);
    el('line', { 'class': 'hz-card__limit', x1: 8, x2: cw - 8, y1: 24, y2: 24 }, card);
    var pl = el('polyline', { 'class': 'hz-card__line' }, card);
    el('text', { 'class': 'hz-card__sub', x: 8, y: ch - 6 }, card).textContent = s.ccp;
    var gate = { s: s, g: g, card: card, pl: pl, dot: dot, cw: cw, vals: [], dev: 0, t: 0 };
    for (var i = 0; i < 12; i++) gate.vals.push(rnd(0.2, 0.75));
    plot(gate);
    return gate;
  }

  // Valori del monitoraggio: 0 = ottimo, 1 = limite critico (linea tratteggiata)
  function plot(gate) {
    var n = gate.vals.length, w = gate.cw - 16, pts = gate.vals.map(function (v, i) {
      return (8 + w * i / (n - 1)).toFixed(1) + ',' + (40 - v * 16).toFixed(1);
    });
    gate.pl.setAttribute('points', pts.join(' '));
  }

  function ring(x, y, r, kind) {
    var c = el('circle', { 'class': 'hz-ring hz-ring--' + kind, cx: x, cy: y, r: r }, svg);
    setTimeout(function () { if (c.parentNode) c.parentNode.removeChild(c); }, 1500);
  }

  // Un pericolo in volo: scende con una scia; 'ride' lo mette subito sulla linea
  function spawn(k, x, y, state) {
    var g = el('g', { 'class': 'hz-part hz-part--' + k }, svg);
    var p = { g: g, x: x, y: y, x0: x, ph: rnd(0, 6.28), state: state || 'fall', t: 0, op: 0.3 };
    if (p.state === 'fall') p.trail = el('line', { 'class': 'hz-trail', x1: 0, y1: -14, x2: 0, y2: -5 }, g);
    shape(k, g);
    if (p.state === 'ride') { p.y = L.flowY; p.op = 1; }
    parts.push(p);
    return p;
  }
  function land(p) { if (p.trail) { p.g.removeChild(p.trail); p.trail = null; } }
  function kill(p) { p.dead = true; if (p.g.parentNode) p.g.parentNode.removeChild(p.g); }

  function nextGate(x) {
    for (var i = 0; i < gates.length; i++) if (gates[i].s.x > x - 2) return gates[i];
    return null;
  }

  function stepParts(dt) {
    parts.forEach(function (p) {
      p.t += dt;
      if (p.state === 'fall') {
        p.op = Math.min(1, p.op + dt * 2);
        p.y += dt * 58;
        p.x = p.x0 + Math.sin(p.ph + p.t * 1.8) * 3;
        // Incontra il muro: intercettato se c'è un tassello (che intanto si sposta)
        tiles.forEach(function (t) {
          var tx = t.x + t.wall.off;
          if (p.state === 'fall' && p.y >= t.y - 2 && p.y <= t.y + L.tileH && p.x > tx - 2 && p.x < tx + t.w + 2) {
            p.state = 'absorb'; p.t = 0; land(p);
            t.g.classList.remove('is-hit'); void t.g.getBBox(); t.g.classList.add('is-hit');
            clearTimeout(t.timer); t.timer = setTimeout(function () { t.g.classList.remove('is-hit'); }, 700);
          }
        });
        if (p.state === 'fall' && p.y >= L.flowY) { p.y = L.flowY; p.state = 'ride'; p.t = 0; land(p); ring(p.x, p.y, 4, 'steel'); }
      } else if (p.state === 'absorb') {
        p.op = 1 - p.t / 0.5;
        if (p.op <= 0) kill(p);
      } else if (p.state === 'ride') {
        p.x += dt * 38;
        var g = nextGate(p.x);
        if (!g) { p.op -= dt * 2; if (p.op <= 0) kill(p); }
        else if (p.x >= g.s.x - 8) {
          if (g.dev > 0) { p.state = 'divert'; p.t = 0; p.from = { x: p.x, y: p.y }; p.g.classList.add('is-out'); }
          else { ring(g.s.x, L.flowY, 8, 'teal'); p.state = 'absorb'; p.t = 0; }
        }
      } else if (p.state === 'divert') {
        var k = ease(clamp(p.t / 1.6)), b = L.bin;
        p.x = p.from.x + (b.x - p.from.x) * k;
        p.y = p.from.y + (b.y - p.from.y) * k - Math.sin(k * Math.PI) * 30;
        if (k >= 1) {
          bin.classList.remove('is-hit'); void bin.getBBox(); bin.classList.add('is-hit');
          setTimeout(function () { bin.classList.remove('is-hit'); }, 900);
          p.state = 'absorb'; p.t = 0;
        }
      }
      if (!p.dead) {
        p.g.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ')');
        p.g.style.opacity = Math.max(0, p.op);
      }
    });
    parts = parts.filter(function (p) { return !p.dead; });
  }

  // La flotta avanza a scatti; al bordo resta ferma un passo e torna indietro
  function stepFleet(dt) {
    fleet.t += dt;
    if (fleet.t < TICK) return;
    fleet.t -= TICK;
    var nx = fleet.x + fleet.dir * L.fleet.step;
    if (nx < fleet.min || nx > fleet.max) fleet.dir = -fleet.dir;
    else fleet.x = nx;
    fleet.g.setAttribute('transform', 'translate(' + fleet.x + ',0)');
    fleet.g.classList.toggle('is-alt');
  }

  // Il muro scivola dolcemente; sul telefono le due file vanno in direzioni opposte
  function stepWalls(dt) {
    liveT += dt;
    var a = L.sway * clamp(liveT / 3);
    walls.forEach(function (w) {
      w.off = a * Math.sin(2 * Math.PI * liveT / L.swayT + w.ph);
      w.g.setAttribute('transform', 'translate(' + w.off.toFixed(1) + ',0)');
    });
  }

  function fire() {
    var ok = fleet.units.filter(function (u) { var x = fleet.x + u.lx; return u.on && x >= L.fire[0] && x <= L.fire[1]; });
    if (!ok.length) return;
    var u = ok[Math.floor(Math.random() * ok.length)];
    u.inv.classList.remove('is-fire'); void u.inv.getBBox(); u.inv.classList.add('is-fire');
    spawn(u.k, fleet.x + u.lx, fleet.bottom);
  }

  // Monitoraggio dei CCP e deviazioni occasionali
  var spawnT = 0, devT = 6;
  function stepGates(dt) {
    gates.forEach(function (g) {
      g.t += dt;
      if (g.t > 0.7) {
        g.t = 0;
        g.vals.shift();
        g.vals.push(g.dev > 0 ? rnd(1.15, 1.35) : rnd(0.2, 0.75));
        plot(g);
      }
      if (g.dev > 0) {
        g.dev -= dt;
        if (g.dev <= 0) {
          g.g.classList.remove('is-dev');
          ring(g.s.x, L.flowY, 9, 'amber');               // azione correttiva: CCP di nuovo sotto controllo
        }
      }
    });
    devT -= dt;
    if (devT <= 0 && gates.length) {
      devT = rnd(13, 18);
      var g = gates[Math.floor(Math.random() * gates.length)];
      g.dev = 4.2; g.g.classList.add('is-dev');
      g.vals[g.vals.length - 1] = 1.3; plot(g);
      spawn(anyKind(), Math.max(L.x0 + 10, g.s.x - 110), L.flowY, 'ride');   // un pericolo arriva proprio mentre il CCP devia
    }
    spawnT -= dt;
    if (spawnT <= 0) {
      spawnT = rnd(0.35, 0.7);
      if (parts.length < 46) fire();
    }
  }

  // Apertura: il fascio traccia la linea di processo e accende nodi, tasselli e CCP;
  // intanto i pericoli compaiono uno alla volta
  function stepIntro(dt) {
    intro.t += dt;
    var T = 4.2, D0 = 0.4, k = clamp((intro.t - D0) / T), s = ease(k) * L.len;
    L.line.style.strokeDashoffset = L.len - s;
    var pt = L.line.getPointAtLength(Math.max(0.01, s));
    beam.setAttribute('transform', 'translate(' + pt.x + ',' + pt.y + ')');
    beam.setAttribute('opacity', k > 0 && k < 1 ? 1 : 0);
    var x = L.x0 + s;
    L.steps.forEach(function (st) {
      if (x >= st.x && !st.on) { st.on = true; st.node.classList.add('is-on'); st.labelEl.classList.add('is-on'); }
    });
    gates.forEach(function (g) { if (x >= g.s.x && !g.on) { g.on = true; g.g.classList.add('is-on'); } });
    tiles.forEach(function (t, i) {
      if (!t.on && intro.t > D0 + 0.6 + i * 0.35) { t.on = true; t.g.classList.add('is-on'); }
    });
    fleet.units.forEach(function (u, i) {
      if (!u.on && intro.t > D0 + 0.4 + i * 0.3) { u.on = true; u.g.classList.add('is-on'); }
    });
    if (k >= 1 && !intro.end) {
      intro.end = true; endNode.classList.add('is-on'); ring(L.endX, L.flowY, 12, 'teal');
      svg.classList.add('is-live');
    }
    if (intro.end && intro.t > D0 + T + 0.8) intro.done = true;
  }

  function finishIntro() {
    L.line.style.strokeDashoffset = 0;
    svg.querySelectorAll('.hz-mo').forEach(function (e) { e.classList.add('is-on'); });
    L.steps.forEach(function (s) { s.on = true; });
    gates.forEach(function (g) { g.on = true; });
    tiles.forEach(function (t) { t.on = true; });
    fleet.units.forEach(function (u) { u.on = true; u.g.classList.add('is-on'); });
    svg.classList.add('is-live');
    intro = { done: true };
  }

  // Movimento ridotto: un istante rappresentativo, senza animazione
  function staticScene() {
    var kinds = MODES[mode].kinds;
    [0.12, 0.3, 0.45, 0.62, 0.78].forEach(function (f, i) {
      var p = spawn(kinds[i % kinds.length], L.fire[0] + (L.fire[1] - L.fire[0]) * f, L.rows[0].y - 40 + (i % 3) * 12);
      p.g.setAttribute('transform', 'translate(' + p.x + ',' + p.y + ')');
    });
  }

  var running = false, last = 0;
  function frame(now) {
    if (!running) return;
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    if (intro && !intro.done) stepIntro(dt);
    if (svg.classList.contains('is-live')) { stepFleet(dt); stepWalls(dt); stepGates(dt); stepParts(dt); }
    requestAnimationFrame(frame);
  }

  function setMode(m) {
    if (m === mode || !MODES[m]) return;
    mode = m;
    figure.querySelectorAll('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.mode === mode); });
    svg.classList.add('is-switching');
    setTimeout(function () { build(true); svg.classList.remove('is-switching'); }, 260);
  }

  function init() {
    build(false);
    figure.querySelectorAll('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () { setMode(b.dataset.mode); });
    });
    if (reduced) return;
    new IntersectionObserver(function (e) {
      if (e[0].isIntersecting && !running) { running = true; last = 0; requestAnimationFrame(frame); }
      if (!e[0].isIntersecting) running = false;
    }, { threshold: 0.2 }).observe(svg);
    var lastWide = wide;
    window.addEventListener('resize', function () {
      var w = svg.clientWidth >= 680;
      if (w !== lastWide) { lastWide = w; build(true); }
    });
  }

  if (document.fonts && document.fonts.load) document.fonts.load('12px "JetBrains Mono"').then(init, init);
  else init();
})();
