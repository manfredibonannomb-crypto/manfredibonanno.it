// Invio del modulo di richiesta al servizio Google Apps Script.
// Il servizio manda al mittente un'email con il link di conferma;
// solo dopo la conferma la richiesta viene inoltrata.
(function () {
  // Indirizzo della web app Apps Script (da incollare dopo il deploy)
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbz7QW_3yVgMSteCfjNUmyiQ5hp4SGHpU_G4LuqkuWXYhD-ZBIHgdFApLpRLwO0DOF4/exec';

  var form = document.getElementById('request-form');
  var errorBox = document.getElementById('form-error');
  var done = document.getElementById('form-done');
  var submit = form.querySelector('.form__submit');
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var MESSAGES = {
    nome: 'Inserisci nome e cognome.',
    email: 'Inserisci un indirizzo email valido.',
    messaggio: 'Scrivi un breve messaggio.',
    privacy: "Per inviare la richiesta serve il consenso all'informativa privacy.",
    dati: 'Alcuni campi non sono validi. Controllali e riprova.',
    attendi:'Una richiesta da questo indirizzo è appena stata inviata. Riprova tra qualche minuto.',
    rete: 'Invio non riuscito. Controlla la connessione e riprova.',
    server: 'Il servizio non ha accettato la richiesta. Riprova più tardi.',
    inattivo: 'Il modulo non è ancora attivo.'
  };

  function showError(key, field) {
    errorBox.textContent = MESSAGES[key] || MESSAGES.server;
    errorBox.hidden = false;
    if (field) field.focus();
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    errorBox.hidden = true;

    var data = {
      nome: form.nome.value.trim(),
      azienda: form.azienda.value.trim(),
      email: form.email.value.trim(),
      messaggio: form.messaggio.value.trim(),
      privacy: form.privacy.checked,
      sito: form.sito.value
    };
    if (!data.nome) return showError('nome', form.nome);
    if (!EMAIL_RE.test(data.email)) return showError('email', form.email);
    if (!data.messaggio) return showError('messaggio', form.messaggio);
    if (!data.privacy) return showError('privacy', form.privacy);
    if (ENDPOINT.indexOf('https://') !== 0) return showError('inattivo');

    submit.disabled = true;
    submit.textContent = 'Invio in corso…';

    // Corpo come testo semplice: evita la richiesta preliminare CORS verso Apps Script
    fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(data) })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.error || 'server');
        document.getElementById('done-email').textContent = data.email;
        form.hidden = true;
        done.hidden = false;
        done.focus();
      })
      .catch(function (err) {
        showError(err instanceof TypeError ? 'rete' : err.message);
        submit.disabled = false;
        submit.textContent = 'Invia la richiesta';
      });
  });
})();
