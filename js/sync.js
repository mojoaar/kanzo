window.Kanzo = window.Kanzo || {};

Kanzo.Sync = (function () {
  "use strict";

  function push() {
    var config = Kanzo.Config.get();
    if (
      !config ||
      config.storage !== "github" ||
      !config.githubToken ||
      !config.githubRepo
    ) {
      Kanzo.Toast.show("GitHub not configured", "warning");
      return;
    }

    var client = new Kanzo.GitHubClient(
      config.githubToken,
      config.githubRepo,
      config.githubBranch,
    );
    var userId = config.githubUser || config.name || "user";
    var backend = new Kanzo.GitHubBackend(client, userId);

    var people = Kanzo.BoardStore.getPeople();
    var categories = Kanzo.BoardStore.getCategories();
    var tasks = Kanzo.BoardStore.getTasks();

    // Save a sanitized config (exclude secrets — PAT is stored separately)
    var syncConfig = {
      theme: config.theme,
      mode: config.mode,
      cardColorMode: config.cardColorMode || "priority",
      columns:
        (Kanzo.Config.getBoardConfig() || {}).columns || Kanzo.DEFAULTS.columns,
      categories: categories,
      author: config.author || "",
    };

    Kanzo.Toast.show("Pushing to GitHub...", "info");

    // Pre-fetch to populate SHAs (GitHub requires sha for updates)
    return backend
      .getPeople()
      .then(function () {
        return backend.getCategories();
      })
      .then(function () {
        return backend.getTasks();
      })
      .then(function () {
        return backend.getConfig();
      })
      .then(function () {
        return backend.savePeople(people);
      })
      .then(function () {
        return backend.saveCategories(categories);
      })
      .then(function () {
        return backend.saveTasks(tasks);
      })
      .then(function () {
        return backend.saveConfig(syncConfig);
      })
      .then(function () {
        Kanzo.Toast.show("Pushed to GitHub ✓", "success");
      })
      .catch(function (err) {
        Kanzo.Toast.show("Push failed: " + err.message, "error");
      });
  }

  function pull() {
    var config = Kanzo.Config.get();
    if (
      !config ||
      config.storage !== "github" ||
      !config.githubToken ||
      !config.githubRepo
    ) {
      Kanzo.Toast.show("GitHub not configured", "warning");
      return;
    }

    var client = new Kanzo.GitHubClient(
      config.githubToken,
      config.githubRepo,
      config.githubBranch,
    );
    var userId = config.githubUser || config.name || "user";
    var sourceBackend = new Kanzo.GitHubBackend(client, userId);

    Kanzo.Toast.show("Pulling from GitHub...", "info");

    return sourceBackend
      .getPeople()
      .then(function (remotePeople) {
        return sourceBackend.getCategories().then(function (remoteCategories) {
          return sourceBackend.getTasks().then(function (remoteTasks) {
            return sourceBackend.getConfig().then(function (remoteConfig) {
              var localBackend = new Kanzo.LocalBackend();

              return localBackend._openDb().then(function (db) {
                if (localBackend._useMemory) {
                  localBackend._getMemoryDb().people = remotePeople || [];
                  localBackend._getMemoryDb().categories =
                    remoteCategories || [];
                  localBackend._getMemoryDb().tasks = remoteTasks || [];
                  applyRemoteConfig(remoteConfig);
                  Kanzo.BoardStore.loadAll().then(function () {
                    Kanzo.Board.render();
                    Kanzo.Sidebar.update();
                    Kanzo.Toast.show("Pulled from GitHub ✓", "success");
                  });
                  return;
                }

                return new Promise(function (resolve) {
                  var tx = db.transaction(
                    ["categories", "tasks", "people"],
                    "readwrite",
                  );
                  var cStore = tx.objectStore("categories");
                  var tStore = tx.objectStore("tasks");
                  var pStore = tx.objectStore("people");
                  cStore.clear();
                  tStore.clear();
                  pStore.clear();
                  (remotePeople || []).forEach(function (p) {
                    pStore.put(p);
                  });
                  (remoteCategories || []).forEach(function (c) {
                    cStore.put(c);
                  });
                  (remoteTasks || []).forEach(function (t) {
                    tStore.put(t);
                  });
                  tx.oncomplete = function () {
                    applyRemoteConfig(remoteConfig);
                    Kanzo.BoardStore.loadAll().then(function () {
                      Kanzo.Board.render();
                      Kanzo.Sidebar.update();
                      Kanzo.Toast.show("Pulled from GitHub ✓", "success");
                      resolve();
                    });
                  };
                  tx.onerror = function () {
                    Kanzo.Toast.show("Pull failed", "error");
                    resolve();
                  };
                });
              });
            });
          });
        });
      })
      .catch(function () {
        Kanzo.Toast.show("Pull failed — check your config", "error");
      });
  }

  function applyRemoteConfig(remoteConfig) {
    if (!remoteConfig) return;
    var localConfig = Kanzo.Config.get();
    if (!localConfig) return;
    // Only apply safe, non-secret fields
    if (remoteConfig.theme) localConfig.theme = remoteConfig.theme;
    if (remoteConfig.mode) localConfig.mode = remoteConfig.mode;
    if (remoteConfig.cardColorMode)
      localConfig.cardColorMode = remoteConfig.cardColorMode;
    if (remoteConfig.author) localConfig.author = remoteConfig.author;
    if (remoteConfig.columns) {
      Kanzo.Config.saveBoardConfig({ columns: remoteConfig.columns });
    }
    Kanzo.Config.save(localConfig);
  }

  function silentPull(config) {
    if (!config || !config.githubToken || !config.githubRepo) return;

    var client = new Kanzo.GitHubClient(
      config.githubToken,
      config.githubRepo,
      config.githubBranch,
    );
    var userId = config.githubUser || config.name || "user";
    var sourceBackend = new Kanzo.GitHubBackend(client, userId);
    var _remoteConfig = null;

    return sourceBackend
      .getPeople()
      .then(function (remotePeople) {
        return sourceBackend.getCategories().then(function (remoteCategories) {
          return sourceBackend.getTasks().then(function (remoteTasks) {
            return sourceBackend.getConfig().then(function (remoteConfig) {
              _remoteConfig = remoteConfig;
              // Only apply if there's actually remote data
              var hasRemoteData =
                (remotePeople && remotePeople.length) ||
                (remoteCategories && remoteCategories.length) ||
                (remoteTasks && remoteTasks.length);
              if (!hasRemoteData && !remoteConfig) return;

              var localBackend = new Kanzo.LocalBackend();
              return localBackend._openDb().then(function (db) {
                if (localBackend._useMemory) {
                  if (remotePeople && remotePeople.length)
                    localBackend._getMemoryDb().people = remotePeople;
                  if (remoteCategories && remoteCategories.length)
                    localBackend._getMemoryDb().categories = remoteCategories;
                  if (remoteTasks && remoteTasks.length)
                    localBackend._getMemoryDb().tasks = remoteTasks;
                } else {
                  return new Promise(function (resolve) {
                    var tx = db.transaction(
                      ["categories", "tasks", "people"],
                      "readwrite",
                    );
                    var cStore = tx.objectStore("categories");
                    var tStore = tx.objectStore("tasks");
                    var pStore = tx.objectStore("people");
                    if (remoteTasks && remoteTasks.length) {
                      cStore.clear();
                      tStore.clear();
                      pStore.clear();
                      (remotePeople || []).forEach(function (p) {
                        pStore.put(p);
                      });
                      (remoteCategories || []).forEach(function (c) {
                        cStore.put(c);
                      });
                      (remoteTasks || []).forEach(function (t) {
                        tStore.put(t);
                      });
                    }
                    tx.oncomplete = resolve;
                    tx.onerror = resolve;
                  });
                }
              });
            });
          });
        });
      })
      .then(function () {
        applyRemoteConfig(_remoteConfig);
        return Kanzo.BoardStore.loadAll().then(function () {
          Kanzo.Board.render();
          Kanzo.Sidebar.update();
        });
      })
      .catch(function () {
        // Silent — don't bother the user on fresh setup
      });
  }

  return {
    push: push,
    pull: pull,
    silentPull: silentPull,
  };
})();
