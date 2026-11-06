// Pagina di arrivo del link nell'email di conferma (conferma.html?t=TOKEN).
// Chiede al servizio Apps Script di confermare la richiesta e mostra l'esito.
// Il link nell'email punta al sito e non a script.google.com: aiuta a non finire in spam.
(function () {
  // Stesso indirizzo della web app usato in richiesta.js
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbz7QW_3yVgMSteCfjNUmyiQ5hp4SGHpU_G4LuqkuWXYhD-ZBIHgdFApLpRLwO0DOF4/exec';

  var ESITI = {
    confermata: ['Richiesta confermata', 'Grazie. La richiesta è stata inoltrata: riceverai una risposta entro pochi giorni lavorativi.', 'Torna al sito', 'index.html'],
    gia: ['Richiesta già confermata', 'La richiesta era già stata confermata. Riceverai una risposta a breve.', 'Torna al sito', 'index.html'],
    scaduto: ['Link scaduto', 'Il link è valido 48 ore. Invia di nuovo la richiesta dal sito.', 'Nuova richiesta', 'richiesta.html'],
    invalido: ['Link non valido', 'Questo link di conferma non è valido. Controlla di averlo copiato per intero, oppure invia di nuovo la richiesta.', 'Nuova richiesta', 'richiesta.html'],
    rete: ['Conferma non riuscita', 'Il servizio non risponde. Controlla la connessione e ricarica la pagina tra qualche istante.', 'Riprova', '']
  };
  ESITI.incompleto = ESITI.invalido;

  var box = document.getElementById('esito');
  var azione = document.getElementById('esito-azione');

  function mostra(codice) {
    var e = ESITI[codice] || ESITI.rete;
    document.getElementById('esito-titolo').textContent = e[0];
    document.getElementById('esito-testo').textContent = e[1];
    azione.textContent = e[2];
    azione.href = e[3] || location.href;
    azione.hidden = false;
    box.focus();
  }

  var token = new URLSearchParams(location.search).get('t');
  if (!token) return mostra('invalido');

  fetch(ENDPOINT + '?formato=json&t=' + encodeURIComponent(token))
    .then(function (r) { return r.json(); })
    .then(function (res) { mostra(res.esito); })
    .catch(function () { mostra('rete'); });
})();
