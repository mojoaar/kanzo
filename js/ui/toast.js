window.Kanzo = window.Kanzo || {};

Kanzo.Toast = (function () {

  var container;

  function init(el) {
    container = el;
  }

  function show(message, type) {
    type = type || 'info';
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    var icons = { success: 'check-circle', error: 'alert-circle', info: 'info', warning: 'alert-triangle' };
    var icon = icons[type] || 'info';

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML = '<i data-lucide="' + icon + '"></i><span>' + Kanzo.Utils.sanitize(message) + '</span>';
    container.appendChild(toast);

    window.refreshIcons(toast);

    setTimeout(function () {
      toast.classList.add('toast-exit');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 3000);
  }

  return {
    init: init,
    show: show
  };

})();
