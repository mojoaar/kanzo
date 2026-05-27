window.Kanzo = window.Kanzo || {};

Kanzo.Config = (function () {

  function migrate() {
    var newKey = Kanzo.STORE.CONFIG;
    if (localStorage.getItem(newKey)) return;

    var oldKey = 'kanzo_profiles';
    var oldProfiles = localStorage.getItem(oldKey);
    if (!oldProfiles) return;

    try {
      var profiles = JSON.parse(oldProfiles);
      var activeId = localStorage.getItem('kanzo_active_profile');
      var profile = activeId
        ? profiles.find(function (p) { return p.id === activeId; })
        : profiles[0];

      if (!profile) return;

      var config = Object.assign({}, Kanzo.DEFAULTS, {
        name: profile.name || '',
        storage: profile.storage || 'local',
        githubToken: profile.githubToken || '',
        githubUser: profile.githubUser || '',
        githubRepo: profile.githubRepo || '',
        githubBranch: profile.githubBranch || 'main',
        avatar: {
          type: 'initials',
          color: profile.avatarColor || Kanzo.AVATAR_COLORS[0],
          url: '',
          dataUrl: ''
        }
      });

      if (profile.settings) {
        config.theme = profile.settings.theme || config.theme;
        config.mode = profile.settings.mode || config.mode;
      }

      localStorage.setItem(newKey, JSON.stringify(config));
    } catch (e) {
      console.warn('Kanzo: failed to migrate old data', e);
    }
  }

  function get() {
    migrate();
    try {
      var raw = localStorage.getItem(Kanzo.STORE.CONFIG);
      if (raw) {
        var parsed = JSON.parse(raw);
        return Object.assign({}, Kanzo.DEFAULTS, parsed);
      }
    } catch (e) {}
    return null;
  }

  function save(config) {
    try {
      localStorage.setItem(Kanzo.STORE.CONFIG, JSON.stringify(config));
    } catch (e) {
      console.warn('Kanzo: failed to save config:', e);
    }
  }

  function exists() {
    return !!localStorage.getItem(Kanzo.STORE.CONFIG);
  }

  function remove() {
    localStorage.removeItem(Kanzo.STORE.CONFIG);
    localStorage.removeItem(Kanzo.STORE.BOARD_CONFIG);
  }

  function getBoardConfig() {
    try {
      var raw = localStorage.getItem(Kanzo.STORE.BOARD_CONFIG);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    var config = get();
    if (config && config.columns) {
      return { columns: config.columns };
    }
    return { columns: Kanzo.DEFAULTS.columns.slice() };
  }

  function saveBoardConfig(boardConfig) {
    try {
      localStorage.setItem(Kanzo.STORE.BOARD_CONFIG, JSON.stringify(boardConfig));
    } catch (e) {
      console.warn('Kanzo: failed to save board config:', e);
    }
  }

  function loadServerConfig(callback) {
    fetch('config.json?t=' + Date.now())
      .then(function (res) {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then(function (serverCfg) {
        callback(serverCfg || null);
      })
      .catch(function () {
        callback(null);
      });
  }

  return {
    get: get,
    save: save,
    exists: exists,
    remove: remove,
    getBoardConfig: getBoardConfig,
    saveBoardConfig: saveBoardConfig,
    loadServerConfig: loadServerConfig
  };

})();
