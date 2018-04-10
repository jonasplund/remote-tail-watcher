(function() {
  window.remoteTailWatcher = new App({
    root: document.querySelector('#app'), 
    template: document.querySelector('#server-template'),
    useMash: true
  });
})();