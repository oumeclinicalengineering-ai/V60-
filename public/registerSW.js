/* Compatibility entry for the old app: update its existing worker only. */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistration(new URL('./', location.href).href)
    .then(registration => registration ? registration.update() : undefined)
    .catch(() => {});
}
