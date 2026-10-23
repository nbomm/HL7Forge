/* HL7Forge — installable-app support: registers the service worker and drives the header "Install app" button. */
(function () {
  'use strict';
  const installBtn = document.getElementById('install-btn');
  let deferredPrompt = null;

  // Service workers need http(s) (or localhost); on file:// the app still works, it just isn't installable.
  // The page's CSP requires Trusted Types for scripts, so register() needs a TrustedScriptURL. This is the only
  // policy the CSP allows, and it can mint exactly one URL; it cannot produce HTML, so the innerHTML guard stands.
  if ('serviceWorker' in navigator && window.trustedTypes && /^https?:$/.test(location.protocol)) {
    const policy = window.trustedTypes.createPolicy('hl7forge-sw', {
      createScriptURL: function (url) {
        if (url !== 'sw.js') throw new TypeError('Only sw.js may be registered');
        return url;
      }
    });
    navigator.serviceWorker.register(policy.createScriptURL('sw.js')).catch(function () { /* not installable here; the app works without it */ });
  }

  // Chromium fires this when the app is installable; other browsers never do, so the button stays hidden there.
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
  });

  installBtn.addEventListener('click', function () {
    if (!deferredPrompt) return;
    const prompt = deferredPrompt;
    deferredPrompt = null; // a prompt can only be used once
    installBtn.hidden = true;
    prompt.prompt();
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    installBtn.hidden = true;
  });
})();
