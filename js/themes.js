window.Kanzo = window.Kanzo || {};

Kanzo.Themes = (function () {

  var SYSTEM_MEDIA = window.matchMedia('(prefers-color-scheme: dark)');

  function apply(theme, mode) {
    var html = document.documentElement;
    html.setAttribute('data-theme', theme || 'catppuccin-macchiato');

    var resolvedMode = mode || 'dark';
    if (resolvedMode === 'system') {
      resolvedMode = SYSTEM_MEDIA.matches ? 'dark' : 'light';
    }
    html.setAttribute('data-mode', resolvedMode);

    var isDark = resolvedMode === 'dark';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      var style = getComputedStyle(html);
      meta.setAttribute('content', style.getPropertyValue('--bg').trim());
    }
    updateThemeIcon(isDark);
  }

  function updateThemeIcon(isDark) {
    var wrapper = document.querySelector('.theme-toggle-icon');
    if (!wrapper) return;
    wrapper.innerHTML = '<i data-lucide="' + (isDark ? 'moon' : 'sun') + '"></i>';
    if (window.refreshIcons) window.refreshIcons(wrapper);
  }

  function toggle() {
    var html = document.documentElement;
    var current = html.getAttribute('data-mode');
    var newMode = current === 'dark' ? 'light' : 'dark';
    apply(html.getAttribute('data-theme'), newMode);
    return { theme: html.getAttribute('data-theme'), mode: newMode };
  }

  function getCurrent() {
    var html = document.documentElement;
    return {
      theme: html.getAttribute('data-theme') || 'catppuccin-macchiato',
      mode: html.getAttribute('data-mode') || 'dark'
    };
  }

  function init() {
    SYSTEM_MEDIA.addEventListener('change', function () {
      var config = Kanzo.Config.get();
      if (config && config.mode === 'system') {
        apply(config.theme, 'system');
      }
    });
  }

  return {
    apply: apply,
    toggle: toggle,
    getCurrent: getCurrent,
    init: init,
    updateThemeIcon: updateThemeIcon
  };

})();
