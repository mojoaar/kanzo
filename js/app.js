window.Kanzo = window.Kanzo || {};

(function () {
  "use strict";

  Kanzo.App = {
    init: function () {
      try {
        mapDomRefs();
      } catch (e) {
        return;
      }
      try {
        Kanzo.Board.init(Kanzo.DOM);
      } catch (e) {}
      try {
        Kanzo.Modals.init(Kanzo.DOM);
      } catch (e) {}
      try {
        Kanzo.Sidebar.init(Kanzo.DOM);
      } catch (e) {}
      try {
        Kanzo.Themes.init();
      } catch (e) {}
      try {
        Kanzo.Toast.init(document.getElementById("toastContainer"));
      } catch (e) {}
      try {
        registerServiceWorker();
      } catch (e) {}

      var applyServerConfig = function (serverCfg) {
        if (!serverCfg) return;
        var cfg = Kanzo.Config.get() || Object.assign({}, Kanzo.DEFAULTS);
        cfg._serverManaged = true;
        if (serverCfg.githubToken) cfg.githubToken = serverCfg.githubToken;
        if (serverCfg.repo) cfg.githubRepo = serverCfg.repo;
        if (serverCfg.branch) cfg.githubBranch = serverCfg.branch;
        if (serverCfg.title) cfg._title = serverCfg.title;
        if (serverCfg.description) cfg._description = serverCfg.description;
        if (serverCfg.author) cfg.author = serverCfg.author;
        cfg.storage =
          cfg.githubToken && cfg.githubRepo ? "github" : cfg.storage;
        Kanzo.Config.save(cfg);
      };

      var boot = function () {
        var config = Kanzo.Config.get();
        if (config) {
          if (config._title) document.title = config._title;
          if (config._description) {
            var meta = document.querySelector('meta[name="description"]');
            if (meta) meta.setAttribute("content", config._description);
          }
          if (config.author) {
            var authorMeta = document.querySelector('meta[name="author"]');
            if (authorMeta) authorMeta.setAttribute("content", config.author);
          }
        }
        if (!config) {
          showOnboarding();
        } else {
          initWithConfig(config);
        }
      };

      Kanzo.Config.loadServerConfig(function (serverCfg) {
        applyServerConfig(serverCfg);
        boot();
      });
    },
  };

  function mapDomRefs() {
    var qs = function (sel) {
      return document.querySelector(sel);
    };
    Kanzo.DOM = {
      appLayout: qs("#appLayout"),
      appBody: qs("#appBody"),
      header: qs("#header"),
      headerLeft: qs("#headerLeft"),
      headerAvatar: qs("#headerAvatar"),
      headerName: qs("#headerName"),
      themeQuickToggle: qs("#themeQuickToggle"),
      settingsToggle: qs("#settingsToggle"),
      sidebar: qs("#sidebar"),
      sidebarBackdrop: qs("#sidebarBackdrop"),
      sidebarToggle: qs("#sidebarToggle"),
      sidebarAllLink: qs("#sidebarAllLink"),
      sidebarBoardConfigLink: qs("#sidebarBoardConfigLink"),
      sidebarCategories: qs("#sidebarCategories"),
      sidebarSyncBtn: qs("#sidebarSyncBtn"),
      addCategorySidebar: qs("#addCategorySidebar"),
      addPersonSidebar: qs("#addPersonSidebar"),
      sidebarPeople: qs("#sidebarPeople"),
      syncLabel: qs("#syncLabel"),
      searchInput: qs("#searchInput"),
      boardArea: qs("#boardArea"),
      boardScroll: qs("#boardScroll"),
      boardEmpty: qs("#boardEmpty"),
      onboarding: qs("#onboarding"),
      onboardingForm: qs("#onboardingForm"),
      onboardingName: qs("#onboardingName"),
      onboardingGithub: qs("#onboardingGithub"),
      onboardingToken: qs("#onboardingToken"),
      onboardingRepo: qs("#onboardingRepo"),
      onboardingCreate: qs("#onboardingCreate"),
      settingsModal: qs("#settingsModal"),
      settingsClose: qs("#settingsClose"),
      settingsBody: qs("#settingsBody"),
      settingsName: qs("#settingsName"),
      settingsNameSection: qs("#settingsNameSection"),
      settingsAvatarSection: qs("#settingsAvatarSection"),
      settingsTheme: qs("#settingsTheme"),
      settingsStorageType: qs("#settingsStorageType"),
      settingsCardColorMode: qs("#settingsCardColorMode"),
      settingsGithub: qs("#settingsGithub"),
      settingsGithubToken: qs("#settingsGithubToken"),
      settingsGithubRepo: qs("#settingsGithubRepo"),
      settingsGithubBranch: qs("#settingsGithubBranch"),
      settingsValidateGithub: qs("#settingsValidateGithub"),
      settingsExportBtn: qs("#settingsExportBtn"),
      settingsImportBtn: qs("#settingsImportBtn"),
      settingsImportFile: qs("#settingsImportFile"),
      settingsPushBtn: qs("#settingsPushBtn"),
      settingsPullBtn: qs("#settingsPullBtn"),
      settingsSyncActions: qs("#settingsSyncActions"),
      settingsWipeBtn: qs("#settingsWipeBtn"),
      settingsWipeConfirm: qs("#settingsWipeConfirm"),
      settingsWipeInput: qs("#settingsWipeInput"),
      settingsWipeConfirmBtn: qs("#settingsWipeConfirmBtn"),
      settingsVersion: qs("#settingsVersion"),
      settingsAuthor: qs("#settingsAuthor"),
      githubStatus: qs("#githubStatus"),
      settingsSave: qs("#settingsSave"),
      avatarColors: qs("#avatarColors"),
      taskModal: qs("#taskModal"),
      taskModalTitle: qs("#taskModalTitle"),
      taskModalClose: qs("#taskModalClose"),
      taskModalCancel: qs("#taskModalCancel"),
      taskModalSave: qs("#taskModalSave"),
      taskEditId: qs("#taskEditId"),
      taskTitle: qs("#taskTitle"),
      taskDescription: qs("#taskDescription"),
      taskType: qs("#taskType"),
      taskPriority: qs("#taskPriority"),
      taskPriorityDot: qs("#taskPriorityDot"),
      taskTypeIcon: qs("#taskTypeIcon"),
      taskAssignedTo: qs("#taskAssignedTo"),
      taskAssignedDot: qs("#taskAssignedDot"),
      taskTagsWrapper: qs("#taskTagsWrapper"),
      taskTagsChips: qs("#taskTagsChips"),
      taskTagsInput: qs("#taskTagsInput"),
      taskCategory: qs("#taskCategory"),
      taskCategoryDot: qs("#taskCategoryDot"),
      taskColumn: qs("#taskColumn"),
      taskColumnDot: qs("#taskColumnDot"),
      taskDeleteBtn: qs("#taskDeleteBtn"),
      categoryModal: qs("#categoryModal"),
      categoryModalTitle: qs("#categoryModalTitle"),
      categoryModalClose: qs("#categoryModalClose"),
      categoryModalCancel: qs("#categoryModalCancel"),
      categoryModalSave: qs("#categoryModalSave"),
      categoryEditId: qs("#categoryEditId"),
      categoryName: qs("#categoryName"),
      categoryColorGrid: qs("#categoryColorGrid"),
      categoryIconGrid: qs("#categoryIconGrid"),
      categoryDeleteBtn: qs("#categoryDeleteBtn"),
      personModal: qs("#personModal"),
      personModalTitle: qs("#personModalTitle"),
      personModalClose: qs("#personModalClose"),
      personModalCancel: qs("#personModalCancel"),
      personModalSave: qs("#personModalSave"),
      personEditId: qs("#personEditId"),
      personName: qs("#personName"),
      personColorGrid: qs("#personColorGrid"),
      personIconGrid: qs("#personIconGrid"),
      personDeleteBtn: qs("#personDeleteBtn"),
      columnConfigModal: qs("#columnConfigModal"),
      columnConfigClose: qs("#columnConfigClose"),
      columnConfigCancel: qs("#columnConfigCancel"),
      columnConfigSave: qs("#columnConfigSave"),
      columnsConfigList: qs("#columnsConfigList"),
      addColumnBtn: qs("#addColumnBtn"),
      confirmModal: qs("#confirmModal"),
      confirmTitle: qs("#confirmTitle"),
      confirmMessage: qs("#confirmMessage"),
      confirmCancel: qs("#confirmCancel"),
      confirmYes: qs("#confirmYes"),
      toastContainer: qs("#toastContainer"),
      fabAddTask: qs("#fabAddTask"),
      helpModal: qs("#helpModal"),
      helpToggle: qs("#helpToggle"),
      helpClose: qs("#helpClose"),
      helpCloseFooter: qs("#helpCloseFooter"),
    };
  }

  function initWithConfig(config) {
    Kanzo.Themes.apply(config.theme, config.mode);
    var backend = new Kanzo.LocalBackend();
    Kanzo.BoardStore.init(backend);

    Kanzo.BoardStore.loadAll()
      .then(function () {
        DOM("onboarding").classList.add("hidden");
        DOM("appLayout").style.display = "";
        DOM("sidebar").style.display = "";

        Kanzo.Board.render();
        Kanzo.Board.renderHeader();
        Kanzo.Sidebar.update();

        document.title = "Kanzo \u2014 Where tasks find their groove";

        // Fetch GitHub avatar if using GitHub storage
        tryFetchGitHubAvatar(config);

        // If just onboarded with GitHub, do a silent pull
        if (config.storage === "github" && config.githubToken) {
          Kanzo.Sync.silentPull(config);
        }
      })
      .catch(function () {
        DOM("onboarding").classList.add("hidden");
        DOM("appLayout").style.display = "";
        DOM("sidebar").style.display = "";
        try {
          Kanzo.Board.render();
        } catch (e) {}
        try {
          Kanzo.Sidebar.update();
        } catch (e) {}
      });
  }

  function showOnboarding() {
    var d = Kanzo.DOM;
    d.appLayout.style.display = "none";
    if (d.sidebar) d.sidebar.style.display = "none";
    d.onboarding.classList.remove("hidden");
    d.onboardingGithub.classList.add("hidden");
    d.onboardingName.value = "";
    var storageRadios = d.onboarding.querySelectorAll(
      'input[name="onboardingStorage"]',
    );
    storageRadios.forEach(function (r) {
      r.checked = r.value === "local";
    });
    document.title = "Kanzo \u2014 Welcome";
    window.refreshIcons(d.onboarding);

    d.onboardingCreate.onclick = function () {
      var name = d.onboardingName.value.trim() || "You";
      var storage = d.onboarding.querySelector(
        'input[name="onboardingStorage"]:checked',
      ).value;
      var color =
        Kanzo.AVATAR_COLORS[
          Math.floor(Math.random() * Kanzo.AVATAR_COLORS.length)
        ];
      var config = Object.assign({}, Kanzo.DEFAULTS, {
        name: name,
        author: name,
        storage: storage,
        avatar: { type: "initials", color: color, url: "", dataUrl: "" },
      });
      if (storage === "github") {
        config.githubToken = d.onboardingToken.value.trim();
        config.githubRepo = d.onboardingRepo.value.trim();
        config.githubBranch = "main";
        if (!config.githubToken || !config.githubRepo) {
          Kanzo.Toast.show("Enter GitHub token and repo", "warning");
          return;
        }
        config.githubUser = config.githubRepo.split("/")[0] || "";
      }
      Kanzo.Config.save(config);
      initSyncBoardConfig(config);
      initWithConfig(config);
    };

    d.onboarding
      .querySelectorAll('input[name="onboardingStorage"]')
      .forEach(function (r) {
        r.addEventListener("change", function () {
          d.onboardingGithub.classList.toggle("hidden", r.value !== "github");
        });
      });
  }

  function initSyncBoardConfig(config) {
    if (
      !Kanzo.Config.getBoardConfig() ||
      !Kanzo.Config.getBoardConfig().columns
    ) {
      Kanzo.Config.saveBoardConfig({ columns: config.columns.slice() });
    }
  }

  function DOM(id) {
    return Kanzo.DOM[id];
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("sw.js")
      .then(function (reg) {
        console.log("Kanzo: Service Worker registered:", reg.scope);
      })
      .catch(function (err) {
        console.warn("Kanzo: Service Worker registration failed:", err);
      });
  }

  /**
   * Fetch the GitHub user's avatar and update the config and header.
   * Only runs when storage is set to 'github' and a token/repo are configured.
   */
  function tryFetchGitHubAvatar(config) {
    if (
      !config ||
      config.storage !== "github" ||
      !config.githubToken ||
      !config.githubRepo
    ) {
      console.log(
        "Kanzo: avatar fetch skipped — storage=" +
          (config ? config.storage : "none"),
      );
      return;
    }

    console.log("Kanzo: fetching GitHub avatar...");
    var owner = config.githubRepo.split("/")[0] || "";
    var client = new Kanzo.GitHubClient(
      config.githubToken,
      config.githubRepo,
      config.githubBranch,
    );

    // Try the /user endpoint first (needs user scope on PAT)
    client
      .getUser()
      .then(function (user) {
        if (user && user.avatar_url) {
          setAvatarUrl(config, user.avatar_url, user.login);
          console.log("Kanzo: avatar fetched via /user API");
        } else {
          throw new Error("No avatar_url in /user response");
        }
      })
      .catch(function (err) {
        console.warn(
          "Kanzo: /user API failed — " +
            err.message +
            ", trying /users/" +
            owner,
        );
        // Fallback: use the public /users/{owner} endpoint (no auth scope needed)
        fetch(Kanzo.GITHUB_API + "/users/" + owner, {
          headers: client._headers(),
        })
          .then(function (res) {
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.json();
          })
          .then(function (profile) {
            if (profile && profile.avatar_url) {
              setAvatarUrl(config, profile.avatar_url, profile.login || owner);
              console.log("Kanzo: avatar fetched via /users/" + owner + " API");
            }
          })
          .catch(function (err2) {
            console.warn("Kanzo: /users API also failed — " + err2.message);
          });
      });
  }

  function setAvatarUrl(config, url, login) {
    config.avatar = config.avatar || {};
    config.avatar.url = url;
    if (login) config.githubUser = login;
    Kanzo.Config.save(config);
    Kanzo.Board.renderHeader();
  }

  // Expose for use by modals.js after settings save
  Kanzo.App.tryFetchGitHubAvatar = tryFetchGitHubAvatar;

  document.addEventListener("DOMContentLoaded", Kanzo.App.init);
})();
