window.Kanzo = window.Kanzo || {};

Kanzo.Sidebar = (function () {
  "use strict";

  var DOM = {};
  var isOpen = false;

  function _isMobile() {
    return window.innerWidth < 768;
  }

  function init(dom) {
    DOM = dom;
    bindEvents();
  }

  function bindEvents() {
    DOM.sidebarToggle.addEventListener("click", function () {
      if (_isMobile()) {
        if (isOpen) close();
        else open();
      } else {
        toggleDesktop();
      }
    });

    DOM.sidebarBackdrop.addEventListener("click", close);

    DOM.sidebarSyncBtn.addEventListener("click", function () {
      var config = Kanzo.Config.get();
      if (
        config &&
        config.storage === "github" &&
        config.githubToken &&
        config.githubRepo
      ) {
        Kanzo.Sync.push();
      } else {
        Kanzo.Modals.showSettings();
      }
      if (_isMobile()) close();
    });

    DOM.themeQuickToggle.addEventListener("click", function () {
      var result = Kanzo.Themes.toggle();
      var config = Kanzo.Config.get();
      if (config) {
        config.mode = result.mode;
        config.theme = result.theme;
        Kanzo.Config.save(config);
      }
    });

    DOM.searchInput.addEventListener(
      "input",
      Kanzo.Utils.debounce(function () {
        Kanzo.BoardStore.setSearchQuery(DOM.searchInput.value);
        Kanzo.Board.render();
        update();
      }, 250),
    );

    DOM.sidebarAllLink.addEventListener("click", function () {
      Kanzo.BoardStore.setActiveCategory(null);
      Kanzo.BoardStore.setActivePerson(null);
      Kanzo.Board.render();
      update();
    });

    DOM.sidebarBoardConfigLink.addEventListener("click", function () {
      window.renderColumnConfig();
      if (_isMobile()) close();
    });

    DOM.addCategorySidebar.addEventListener("click", function () {
      window.showCategoryModal(null);
    });

    DOM.addPersonSidebar.addEventListener("click", function () {
      window.showPersonModal(null);
    });
  }

  function open() {
    DOM.sidebar.classList.add("open");
    DOM.sidebarBackdrop.classList.remove("hidden");
    DOM.sidebarBackdrop.classList.add("visible");
    isOpen = true;
  }

  function close() {
    DOM.sidebar.classList.remove("open");
    DOM.sidebarBackdrop.classList.add("hidden");
    DOM.sidebarBackdrop.classList.remove("visible");
    isOpen = false;
  }

  function toggleDesktop() {
    DOM.sidebar.classList.toggle("collapsed");
    if (DOM.sidebar.classList.contains("collapsed")) {
      DOM.sidebarToggle
        .querySelector("i")
        .setAttribute("data-lucide", "panel-left-open");
    } else {
      DOM.sidebarToggle
        .querySelector("i")
        .setAttribute("data-lucide", "panel-left");
    }
    window.refreshIcons(DOM.sidebarToggle);
  }

  function update() {
    renderCategories();
    renderPeople();
    renderSyncLabel();
  }

  function renderCategories() {
    if (!DOM.sidebarCategories) return;
    var categories = Kanzo.BoardStore.getCategories();
    var activeSlug = Kanzo.BoardStore.getActiveCategory();

    DOM.sidebarCategories.innerHTML = "";

    categories.forEach(function (cat) {
      var item = document.createElement("div");
      item.className = "category-item";
      if (cat.slug === activeSlug) item.classList.add("active");
      item.innerHTML =
        '<span class="category-item-dot" style="background:' +
        cat.color +
        '"><i data-lucide="' +
        cat.icon +
        '"></i></span>' +
        '<span class="category-item-name">' +
        Kanzo.Utils.sanitize(cat.name) +
        "</span>" +
        '<button class="category-item-edit btn-icon" title="Edit category"><i data-lucide="edit-3"></i></button>' +
        '<span class="category-item-count">' +
        getCategoryTaskCount(cat.slug) +
        "</span>";

      var editBtn = item.querySelector(".category-item-edit");
      editBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        window.showCategoryModal(cat);
      });

      item.addEventListener("click", function () {
        if (cat.slug === activeSlug) {
          Kanzo.BoardStore.setActiveCategory(null);
        } else {
          Kanzo.BoardStore.setActiveCategory(cat.slug);
        }
        Kanzo.Board.render();
        update();
      });

      item.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        window.showCategoryModal(cat);
      });

      DOM.sidebarCategories.appendChild(item);
    });

    window.refreshIcons(DOM.sidebarCategories);
  }

  function getCategoryTaskCount(slug) {
    var tasks = Kanzo.BoardStore.getTasks();
    return tasks.filter(function (t) {
      return t.category === slug;
    }).length;
  }

  function renderSyncLabel() {
    if (!DOM.syncLabel) return;
    var config = Kanzo.Config.get();
    if (config && config.storage === "github" && config.githubToken) {
      DOM.syncLabel.textContent = "Sync with GitHub";
    } else {
      DOM.syncLabel.textContent = "Set up GitHub Sync";
    }
  }

  function renderPeople() {
    if (!DOM.sidebarPeople) return;
    var people = Kanzo.BoardStore.getPeople();
    var activePerson = Kanzo.BoardStore.getActivePerson();

    DOM.sidebarPeople.innerHTML = "";

    people.forEach(function (person) {
      var item = document.createElement("div");
      item.className = "category-item";
      if (person.id === activePerson) item.classList.add("active");
      item.innerHTML =
        '<span class="category-item-dot" style="background:' +
        person.color +
        '"><i data-lucide="' +
        person.icon +
        '"></i></span>' +
        '<span class="category-item-name">' +
        Kanzo.Utils.sanitize(person.name) +
        "</span>" +
        '<button class="category-item-edit btn-icon" title="Edit person"><i data-lucide="edit-3"></i></button>' +
        '<span class="category-item-count">' +
        getPersonTaskCount(person.id) +
        "</span>";

      var editBtn = item.querySelector(".category-item-edit");
      editBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        window.showPersonModal(person);
      });

      item.addEventListener("click", function () {
        if (person.id === activePerson) {
          Kanzo.BoardStore.setActivePerson(null);
        } else {
          Kanzo.BoardStore.setActivePerson(person.id);
        }
        Kanzo.Board.render();
        update();
      });

      item.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        window.showPersonModal(person);
      });

      DOM.sidebarPeople.appendChild(item);
    });

    window.refreshIcons(DOM.sidebarPeople);
  }

  function getPersonTaskCount(personId) {
    var tasks = Kanzo.BoardStore.getTasks();
    return tasks.filter(function (t) {
      return t.assignedTo === personId;
    }).length;
  }

  return {
    init: init,
    open: open,
    close: close,
    update: update,
  };
})();
