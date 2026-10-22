/* HL7Forge — applies the saved theme before first paint (loaded in <head> to avoid a flash). */
'use strict';
try {
  const theme = localStorage.getItem('hl7forge-theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme);
} catch (e) { /* storage unavailable: follow the system theme */ }
