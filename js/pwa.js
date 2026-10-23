/* HL7Forge — installable-app support: registers the service worker and drives the header "Install app" button. */
(function () {
  'use strict';
  const installBtn = document.getElementById('install-btn');
  const toastEl = document.getElementById('toast');
  let deferredPrompt = null;
  let installed = false;
  let toastTimer = 0;

  // The button is always visible; when the browser can't install right now, clicking it says why.
  function say(text) {
    toastEl.textContent = text;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-visible'); }, 6000);
  }

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  }

  // Service workers need http(s) (or localhost); on file:// the app still works, it just isn't installable.
  // The page's CSP requires Trusted Types for scripts, so register() needs a TrustedScriptURL. The one policy the
  // CSP allows can mint exactly one URL; it cannot produce HTML, so the innerHTML guard stands.
  if ('serviceWorker' in navigator && window.trustedTypes && /^https?:$/.test(location.protocol)) {
    const policy = window.trustedTypes.createPolicy('hl7forge-sw', {
      createScriptURL: function (url) {
        if (url !== 'sw.js') throw new TypeError('Only sw.js may be registered');
        return url;
      }
    });
    navigator.serviceWorker.register(policy.createScriptURL('sw.js')).catch(function () { /* not installable here; the app works without it */ });
  }

  // Chromium fires this when the app is installable; other browsers never do.
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    installed = true;
    say('HL7Forge is installed. Open it from your Start menu or app list.');
  });

  installBtn.addEventListener('click', function () {
    if (deferredPrompt) {
      const prompt = deferredPrompt;
      deferredPrompt = null; // a prompt can only be used once
      prompt.prompt();
    } else if (isStandalone()) {
      say('HL7Forge is already running as an installed app.');
    } else if (installed) {
      say('HL7Forge is installed. Open it from your Start menu or app list.');
    } else if (!/^https?:$/.test(location.protocol)) {
      say('Installing needs the hosted copy: open HL7Forge over HTTPS in Chrome or Edge. A copy opened from disk can’t be installed.');
    } else {
      say('Your browser isn’t offering an install right now. In Chrome or Edge use the menu → Install HL7Forge; it may already be installed.');
    }
  });
})();
