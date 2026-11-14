// Visita guidata: all'arrivo sulla pagina, se il visitatore non fa nulla, la pagina
// avanza da sola di sezione in sezione, così si vede subito com'è organizzato il sito.
// Si ferma al primo gesto del visitatore (rotella, tocco, tastiera, clic) o con "Interrompi".
// Non parte con "movimento ridotto", se la pagina è aperta su un'ancora (#...) o se il
// visitatore ha già scorso; parte una volta sola per sessione.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (location.hash || window.scrollY > 40) return;
  // ?tour nell'indirizzo la fa ripartire sempre (utile per le prove)
  var force = /[?&]tour(=|&|$)/.test(location.search);
  try { if (!force && sessionStorage.getItem('tour-fatto')) return; sessionStorage.setItem('tour-fatto', '1'); } catch (e) {}

  // Sezione e permanenza in secondi: più tempo dove c'è un'animazione grande
  var STEPS = [
    { id: null,        name: 'Apertura',          dwell: 7 },
    { id: 'approccio', name: 'Approccio',         dwell: 7 },
    { id: 'processi',  name: 'Processi',          dwell: 6 },
    { id: 'metodo',    name: 'Metodo',            dwell: 6 },
    { id: 'rischi',    name: 'Rischi e opportunità', dwell: 9 },
    { id: 'haccp',     name: 'Filiera alimentare', dwell: 9 },
    { id: 'schemi',    name: 'Schemi di settore', dwell: 7 },
    { id: 'ruolo',     name: 'Affiancamento',     dwell: 6 },
    { id: 'contatti',  name: 'Contatti',          dwell: 0 }
  ];

  // Indicatore in basso: dice cosa sta succedendo e permette di fermarlo
  var bar = document.createElement('div');
  bar.className = 'tour';
  bar.setAttribute('role', 'status');
  bar.innerHTML =
    '<span class="tour__label">Visita guidata <span class="tour__step"></span></span>' +
    '<button type="button" class="tour__stop">Interrompi</button>' +
    '<span class="tour__progress" aria-hidden="true"><span></span></span>';
  document.body.appendChild(bar);
  var stepEl = bar.querySelector('.tour__step');
  var fill = bar.querySelector('.tour__progress span');

  var i = 0, elapsed = 0, last = 0, stopped = false;
  // Scorrimento della visita in corso (moving) verso goal; restY è dove la pagina è ferma.
  // Se la pagina si sposta senza la visita, è stato il visitatore: ci si ferma.
  var moving = false, goal = 0, restY = window.scrollY, moveTimer = 0;
  function onScroll() {
    var y = window.scrollY;
    if (moving) {
      if (Math.abs(y - goal) < 2) { moving = false; restY = y; }
    } else if (Math.abs(y - restY) > 8) stop();
  }

  function show() {
    stepEl.textContent = '· ' + (i + 1) + '/' + STEPS.length + ' ' + STEPS[i].name;
  }

  function stop() {
    if (stopped) return;
    stopped = true;
    bar.classList.remove('is-on');
    setTimeout(function () { if (bar.parentNode) bar.parentNode.removeChild(bar); }, 500);
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) {
      window.removeEventListener(ev, stop, true);
    });
    window.removeEventListener('scroll', onScroll);
  }

  function go(n) {
    i = n; elapsed = 0; show();
    var target = STEPS[i].id ? document.getElementById(STEPS[i].id) : null;
    if (target) {
      // Inizio sezione sotto la barra in alto; se c'è un'animazione grande e lo schermo
      // è basso, si scende quanto basta per vederla intera (meglio lei che il titolo)
      var head = 72, y = target.getBoundingClientRect().top + window.scrollY - head;
      var art = target.querySelector('.riskop, .haccp, .relay__art');
      if (art) {
        var r = art.getBoundingClientRect();
        var artTop = r.top + window.scrollY, artBottom = r.bottom + window.scrollY;
        y = Math.max(y, Math.min(artBottom - window.innerHeight + 24, artTop - head - 16));
      }
      var max = document.documentElement.scrollHeight - window.innerHeight;
      goal = Math.round(Math.max(0, Math.min(max, y)));
      moving = true;
      clearTimeout(moveTimer);
      moveTimer = setTimeout(function () { moving = false; restY = window.scrollY; }, 3000);
      window.scrollTo({ top: goal, behavior: 'smooth' });
    }
    if (!STEPS[i].dwell) setTimeout(stop, 2500); // arrivati ai contatti: fine
  }

  // Orologio a tempo reale (ogni 100 ms); con la scheda in secondo piano non conta
  var timer = setInterval(function () {
    var now = performance.now();
    var dt = last ? (now - last) / 1000 : 0;
    last = now;
    if (stopped) { clearInterval(timer); return; }
    if (document.hidden || dt > 1) return;
    var d = STEPS[i].dwell;
    if (d) {
      elapsed += dt;
      fill.style.transform = 'scaleX(' + Math.min(1, elapsed / d) + ')';
      if (elapsed >= d && i < STEPS.length - 1) go(i + 1);
    } else fill.style.transform = 'scaleX(1)';
  }, 100);

  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) {
    window.addEventListener(ev, stop, { capture: true, passive: true });
  });
  window.addEventListener('scroll', onScroll, { passive: true });

  show();
  setTimeout(function () { bar.classList.add('is-on'); }, 50);
})();
