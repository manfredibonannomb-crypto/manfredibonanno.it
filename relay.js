// Staffetta su corsie rettilinee (variante "motion").
// Quattro corsie sfalsate a scalinata: la luce della corsia 1 passa il testimone alla 2
// dove le corsie si affiancano, la 2 alla 3 più avanti, la 3 alla 4, fino al traguardo.
// Chi riceve parte in anticipo; al cambio un'onda; chi ha consegnato rallenta e si spegne.
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.querySelector('.trk');
  if (!svg) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Corsie: ognuna parte STEP più avanti della precedente e lunga LEN, quindi due
  // corsie vicine si affiancano per LEN - STEP; il cambio avviene in quel tratto
  var X0 = 18, STEP = 82, LEN = 128, Y0 = 26, GAPY = 24, N = 4;
  var FINISH = X0 + STEP * (N - 1) + LEN;
  var SPEED = 52;                 // unità al secondo del testimone
  var HOLD = 1.6;                 // pausa al traguardo prima di ripartire
  var RUN = 30;                   // tratto in cui chi riceve accelera prima del cambio
  var TRAIL = 54;

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
  function clamp(k) { return Math.max(0, Math.min(1, k)); }

  var lanes = [];
  for (var i = 0; i < N; i++) {
    var xs = X0 + STEP * i, xe = xs + LEN, y = Y0 + GAPY * i;
    el('line', { 'class': 'trk-lane', x1: xs, y1: y, x2: xe, y2: y }, svg);
    // punto di cambio: a metà del tratto in cui questa corsia affianca la successiva
    var hand = i < N - 1 ? xs + STEP + (LEN - STEP) / 2 : FINISH;
    lanes.push({ xs: xs, xe: xe, y: y, hand: hand });
  }
  el('line', { 'class': 'trk-finish', x1: FINISH, y1: lanes[N - 1].y - 7, x2: FINISH, y2: lanes[N - 1].y + 7 }, svg);

  lanes.forEach(function (L, i) {
    L.from = i ? lanes[i - 1].hand : X0;           // dove riceve il testimone
    L.trail = el('line', { 'class': 'trk-trail', y1: L.y, y2: L.y }, svg);
    L.head = el('line', { 'class': 'trk-head', y1: L.y, y2: L.y }, svg);
  });
  var baton = el('circle', { 'class': 'trk-baton', r: 3.2 }, svg);

  function ring(x, y) {
    var c = el('circle', { 'class': 'trk-ring', cx: x, cy: y, r: 5 }, svg);
    setTimeout(function () { if (c.parentNode) c.parentNode.removeChild(c); }, 1300);
  }

  function setRunner(L, x, op) {
    var x0 = Math.max(L.xs, x - TRAIL);
    L.trail.setAttribute('x1', x0); L.trail.setAttribute('x2', x);
    L.head.setAttribute('x1', Math.max(L.xs, x - 10)); L.head.setAttribute('x2', x);
    L.trail.style.opacity = op * 0.4; L.head.style.opacity = op;
  }

  var lastLeg = -1, finished = false;
  function draw(t) {
    var total = (FINISH - X0) / SPEED + HOLD;
    var tc = t % total, bx = Math.min(FINISH, X0 + tc * SPEED);
    var fade = tc > total - 0.5 ? (total - tc) / 0.5 : 1;   // le luci si spengono prima di ripartire
    var leg = 0;
    while (leg < N - 1 && bx >= lanes[leg].hand) leg++;

    lanes.forEach(function (L, i) {
      var x, op;
      if (i === leg) { x = bx; op = 1; }
      else if (i === leg + 1 && bx > L.from - RUN) {        // accelera e aspetta il testimone
        var k = clamp((bx - (L.from - RUN)) / RUN);
        x = L.xs + (L.from - L.xs) * ease(k); op = 0.35 + 0.65 * k;
      } else if (i === leg - 1) {                            // ha consegnato: rallenta e si spegne
        var k2 = clamp((bx - L.hand) / RUN);
        x = L.hand + 12 * easeOut(k2); op = 1 - k2;
      } else { x = L.xs; op = 0; }
      setRunner(L, x, op * fade);
    });

    // Il testimone salta di corsia sul punto di cambio
    var cur = lanes[leg], y = cur.y;
    if (leg > 0) {
      var kj = clamp((bx - cur.from) / 8);
      y = lanes[leg - 1].y + (cur.y - lanes[leg - 1].y) * easeOut(kj);
    }
    baton.setAttribute('cx', bx); baton.setAttribute('cy', y);
    baton.style.opacity = fade;

    if (leg !== lastLeg && lastLeg >= 0 && leg > lastLeg && !reduced) ring(cur.from, cur.y);
    lastLeg = leg;
    if (bx >= FINISH && !finished) { finished = true; if (!reduced) ring(FINISH, cur.y); }
    if (bx < FINISH) finished = false;
  }

  if (reduced) { draw((lanes[1].hand - X0 + 4) / SPEED); return; }

  var running = false, t0 = performance.now();
  function frame(now) {
    if (!running) return;
    draw((now - t0) / 1000);
    requestAnimationFrame(frame);
  }
  draw(0);
  new IntersectionObserver(function (e) {
    var vis = e[0].isIntersecting;
    if (vis && !running) { running = true; requestAnimationFrame(frame); }
    if (!vis) running = false;
  }, { threshold: 0.1 }).observe(svg);
})();
