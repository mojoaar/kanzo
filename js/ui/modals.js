window.Kanzo = window.Kanzo || {};

Kanzo.Modals = (function () {
  "use strict";

  var DOM = {};

  function init(dom) {
    DOM = dom;
    bindSettingsEvents();
    bindTaskModalEvents();
    bindCategoryModalEvents();
    bindPersonModalEvents();
    bindColumnConfigEvents();
    bindConfirmEvents();
    bindHelpEvents();
    bindKeyboardShortcuts();
  }

  function show(el) {
    el.classList.remove("hidden");
    document.body.classList.add("modal-open");
    window.refreshIcons(el);
  }

  function hide(el) {
    el.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }

  // ===== Settings =====

  function bindSettingsEvents() {
    DOM.settingsToggle.addEventListener("click", function () {
      showSettings();
    });

    DOM.settingsClose.addEventListener("click", function () {
      hide(DOM.settingsModal);
    });

    DOM.settingsModal.addEventListener("click", function (e) {
      if (e.target === DOM.settingsModal) hide(DOM.settingsModal);
    });

    DOM.settingsSave.addEventListener("click", function () {
      saveSettings();
    });

    DOM.settingsExportBtn.addEventListener("click", function () {
      exportData();
    });

    DOM.settingsImportBtn.addEventListener("click", function () {
      DOM.settingsImportFile.click();
    });

    DOM.settingsImportFile.addEventListener("change", function () {
      importData();
    });

    DOM.settingsWipeBtn.addEventListener("click", function () {
      DOM.settingsWipeConfirm.classList.toggle("hidden");
    });

    DOM.settingsWipeInput.addEventListener("input", function () {
      DOM.settingsWipeConfirmBtn.disabled =
        DOM.settingsWipeInput.value !== "DELETE";
    });

    DOM.settingsWipeConfirmBtn.addEventListener("click", function () {
      wipeAllData();
    });

    var storageRadios = DOM.settingsStorageType.querySelectorAll(
      'input[name="storageType"]',
    );
    storageRadios.forEach(function (r) {
      r.addEventListener("change", function () {
        var isGithub = r.value === "github";
        DOM.settingsGithub.classList.toggle("hidden", !isGithub);
        if (DOM.settingsNameSection) {
          DOM.settingsNameSection.classList.toggle("hidden", isGithub);
        }
        if (DOM.settingsAvatarSection) {
          DOM.settingsAvatarSection.classList.toggle("hidden", isGithub);
        }
      });
    });

    DOM.settingsValidateGithub.addEventListener("click", function () {
      validateGithub();
    });

    DOM.settingsPushBtn.addEventListener("click", function () {
      Kanzo.Sync.push();
    });

    DOM.settingsPullBtn.addEventListener("click", function () {
      Kanzo.Sync.pull();
    });
  }

  function showSettings() {
    var config = Kanzo.Config.get();
    if (!config) return;

    DOM.settingsName.value = config.name || "";
    DOM.settingsTheme.value = config.theme || "catppuccin-macchiato";

    var storageRadio =
      config.storage === "github"
        ? DOM.settingsStorageType.querySelector('input[value="github"]')
        : DOM.settingsStorageType.querySelector('input[value="local"]');
    if (storageRadio) storageRadio.checked = true;

    var cardColorRadio = DOM.settingsCardColorMode.querySelector(
      'input[value="' + (config.cardColorMode || "priority") + '"]',
    );
    if (cardColorRadio) cardColorRadio.checked = true;

    DOM.settingsGithub.classList.toggle("hidden", config.storage !== "github");
    if (DOM.settingsNameSection) {
      DOM.settingsNameSection.classList.toggle(
        "hidden",
        config.storage === "github",
      );
    }
    if (DOM.settingsAvatarSection) {
      DOM.settingsAvatarSection.classList.toggle(
        "hidden",
        config.storage === "github",
      );
    }
    DOM.settingsGithubToken.value = config.githubToken || "";
    DOM.settingsGithubRepo.value = config.githubRepo || "";
    DOM.settingsGithubBranch.value = config.githubBranch || "main";
    DOM.settingsAuthor.textContent = config.author || "Morten Johansen";
    DOM.settingsVersion.textContent = "v" + Kanzo.VERSION;

    renderAvatarColors(config);
    show(DOM.settingsModal);
  }

  function renderAvatarColors(config) {
    if (!DOM.avatarColors) return;
    DOM.avatarColors.innerHTML = "";
    var avatar = config.avatar || {};
    var selectedColor = avatar.color || Kanzo.AVATAR_COLORS[0];
    Kanzo.AVATAR_COLORS.forEach(function (color) {
      var btn = document.createElement("button");
      btn.className = "avatar-color-btn";
      if (color === selectedColor) btn.classList.add("active");
      btn.style.background = color;
      btn.title = color;
      btn.addEventListener("click", function () {
        DOM.avatarColors
          .querySelectorAll(".avatar-color-btn")
          .forEach(function (b) {
            b.classList.remove("active");
          });
        btn.classList.add("active");
      });
      DOM.avatarColors.appendChild(btn);
    });
  }

  function saveSettings() {
    var config = Kanzo.Config.get();
    if (!config) return;

    config.name = DOM.settingsName.value.trim() || config.name;
    config.theme = DOM.settingsTheme.value;
    config.author = config.name;
    config.storage = DOM.settingsStorageType.querySelector(
      'input[name="storageType"]:checked',
    ).value;
    config.githubToken = DOM.settingsGithubToken.value.trim();
    config.githubRepo = DOM.settingsGithubRepo.value.trim();
    config.githubBranch = DOM.settingsGithubBranch.value.trim() || "main";
    config.cardColorMode = DOM.settingsCardColorMode.querySelector(
      'input[name="cardColorMode"]:checked',
    ).value;

    var activeColor = DOM.avatarColors.querySelector(
      ".avatar-color-btn.active",
    );
    if (activeColor) {
      config.avatar = config.avatar || {};
      config.avatar.color = activeColor.style.background;
    }

    if (config.storage === "github") {
      config.githubUser = config.githubRepo.split("/")[0] || "";
    }

    Kanzo.Config.save(config);
    Kanzo.Themes.apply(config.theme, config.mode);
    Kanzo.Board.render();
    Kanzo.Board.renderHeader();
    Kanzo.Sidebar.update();
    hide(DOM.settingsModal);
    Kanzo.Toast.show("Settings saved", "success");

    // Fetch GitHub avatar if switching to/using GitHub storage
    if (Kanzo.App.tryFetchGitHubAvatar) {
      Kanzo.App.tryFetchGitHubAvatar(config);
    }
  }

  function exportData() {
    var backend = new Kanzo.LocalBackend();
    backend
      .exportData()
      .then(function (json) {
        var blob = new Blob([json], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download =
          "kanzo-export-" + new Date().toISOString().split("T")[0] + ".json";
        a.click();
        URL.revokeObjectURL(url);
        Kanzo.Toast.show("Data exported", "success");
      })
      .catch(function () {
        Kanzo.Toast.show("Export failed", "error");
      });
  }

  function importData() {
    var file = DOM.settingsImportFile.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var backend = new Kanzo.LocalBackend();
      backend
        .importData(e.target.result)
        .then(function () {
          Kanzo.Board.render();
          Kanzo.Sidebar.update();
          Kanzo.Toast.show("Data imported", "success");
        })
        .catch(function () {
          Kanzo.Toast.show("Import failed — invalid format", "error");
        });
    };
    reader.readAsText(file);
    DOM.settingsImportFile.value = "";
  }

  function wipeAllData() {
    if (DOM.settingsWipeInput.value !== "DELETE") return;
    var backend = new Kanzo.LocalBackend();
    backend.deleteAll().then(function () {
      Kanzo.Config.remove();
      localStorage.clear();
      Kanzo.Toast.show("All data wiped", "success");
      setTimeout(function () {
        location.reload();
      }, 500);
    });
  }

  function validateGithub() {
    var token = DOM.settingsGithubToken.value.trim();
    var repo = DOM.settingsGithubRepo.value.trim();
    if (!token || !repo) {
      DOM.githubStatus.textContent = "Enter token and repo first";
      DOM.githubStatus.className = "form-hint error";
      return;
    }
    DOM.githubStatus.textContent = "Validating...";
    DOM.githubStatus.className = "form-hint";
    var client = new Kanzo.GitHubClient(token, repo);
    client
      .getUser()
      .then(function (user) {
        DOM.githubStatus.textContent = "Connected as @" + user.login;
        DOM.githubStatus.className = "form-hint success";
        Kanzo.Toast.show("GitHub connected ✓", "success");
      })
      .catch(function () {
        DOM.githubStatus.textContent =
          "Connection failed — check token and repo";
        DOM.githubStatus.className = "form-hint error";
      });
  }

  // ===== Task Modal =====

  var _taskTags = [];

  function bindTaskModalEvents() {
    DOM.taskModalClose.addEventListener("click", function () {
      hide(DOM.taskModal);
    });
    DOM.taskModal.addEventListener("click", function (e) {
      if (e.target === DOM.taskModal) hide(DOM.taskModal);
    });
    DOM.taskModalCancel.addEventListener("click", function () {
      hide(DOM.taskModal);
    });

    DOM.taskModalSave.addEventListener("click", function () {
      saveTask();
    });
    DOM.taskDeleteBtn.addEventListener("click", function () {
      deleteTask();
    });

    DOM.taskPriority.addEventListener("change", function () {
      updatePriorityDot();
    });

    DOM.taskType.addEventListener("change", function () {
      updateTypeIcon();
    });

    DOM.taskAssignedTo.addEventListener("change", function () {
      updateAssignedDot();
    });

    DOM.taskCategory.addEventListener("change", function () {
      updateCategoryDot();
    });

    DOM.taskColumn.addEventListener("change", function () {
      updateColumnDot();
    });

    DOM.taskTagsInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        var value = DOM.taskTagsInput.value.trim();
        if (value && _taskTags.indexOf(value) === -1) {
          _taskTags.push(value);
          renderTaskTags();
        }
        DOM.taskTagsInput.value = "";
      }
      if (
        e.key === "Backspace" &&
        DOM.taskTagsInput.value === "" &&
        _taskTags.length
      ) {
        _taskTags.pop();
        renderTaskTags();
      }
    });
  }

  function renderTaskTags() {
    DOM.taskTagsChips.innerHTML = "";
    _taskTags.forEach(function (tag) {
      var chip = document.createElement("span");
      chip.className = "tag-chip";
      chip.innerHTML = tag + '<button data-tag="' + tag + '">&times;</button>';
      DOM.taskTagsChips.appendChild(chip);
    });
    DOM.taskTagsChips.querySelectorAll("button").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        _taskTags = _taskTags.filter(function (t) {
          return t !== btn.dataset.tag;
        });
        renderTaskTags();
      });
    });
  }

  function showTaskModal(task, columnId) {
    _taskTags = task ? (task.tags || []).slice() : [];
    DOM.taskEditId.value = task ? task.id : "";
    DOM.taskModalTitle.textContent = task ? "Edit Task" : "New Task";
    DOM.taskTitle.value = task ? task.title : "";
    DOM.taskDescription.value = task ? task.description || "" : "";
    DOM.taskType.value = task ? task.type || "task" : "task";
    populateTaskPrioritySelect(task ? task.priority : "none");
    renderTaskTags();
    DOM.taskTagsInput.value = "";

    var colId = task ? task.column : columnId || "backlog";
    populateTaskAssignedToSelect(task);
    populateTaskCategorySelect(task);
    populateTaskColumnSelect(colId);

    updateTypeIcon();
    updateAssignedDot();
    updateCategoryDot();
    updateColumnDot();

    DOM.taskDeleteBtn.classList.toggle("hidden", !task);
    show(DOM.taskModal);
  }

  function populateTaskAssignedToSelect(task) {
    DOM.taskAssignedTo.innerHTML = '<option value="">Unassigned</option>';
    var people = Kanzo.BoardStore.getPeople();
    var assignedId = task ? task.assignedTo || "" : "";
    people.forEach(function (p) {
      var selected = p.id === assignedId ? " selected" : "";
      DOM.taskAssignedTo.innerHTML +=
        '<option value="' + p.id + '"' + selected + ">" + p.name + "</option>";
    });
  }

  function populateTaskPrioritySelect(selected) {
    DOM.taskPriority.innerHTML = "";
    Kanzo.PRIORITIES.forEach(function (priority) {
      var sel = priority.value === selected ? " selected" : "";
      DOM.taskPriority.innerHTML +=
        '<option value="' +
        priority.value +
        '"' +
        sel +
        ' data-color="' +
        priority.color +
        '">' +
        priority.label +
        "</option>";
    });
    updatePriorityDot();
  }

  function updatePriorityDot() {
    if (!DOM.taskPriorityDot) return;
    var selected = DOM.taskPriority.selectedOptions[0];
    if (selected) {
      DOM.taskPriorityDot.style.background =
        selected.getAttribute("data-color") || "#6c7086";
    }
  }

  function updateTypeIcon() {
    if (!DOM.taskTypeIcon) return;
    var typeDef = Kanzo.TASK_TYPES.find(function (t) {
      return t.value === DOM.taskType.value;
    });
    DOM.taskTypeIcon.innerHTML = typeDef
      ? '<i data-lucide="' + typeDef.icon + '" width="16" height="16"></i>'
      : "";
    window.refreshIcons(DOM.taskTypeIcon);
  }

  function updateAssignedDot() {
    if (!DOM.taskAssignedDot) return;
    var personId = DOM.taskAssignedTo.value;
    if (!personId) {
      DOM.taskAssignedDot.style.background = "#6c7086";
      DOM.taskAssignedDot.innerHTML = "";
      window.refreshIcons(DOM.taskAssignedDot);
      return;
    }
    var person = Kanzo.BoardStore.getPeople().find(function (p) {
      return p.id === personId;
    });
    if (person) {
      DOM.taskAssignedDot.style.background = person.color;
      DOM.taskAssignedDot.innerHTML =
        '<i data-lucide="' + person.icon + '" width="12" height="12"></i>';
    } else {
      DOM.taskAssignedDot.style.background = "#6c7086";
      DOM.taskAssignedDot.innerHTML = "";
    }
    window.refreshIcons(DOM.taskAssignedDot);
  }

  function updateCategoryDot() {
    if (!DOM.taskCategoryDot) return;
    var slug = DOM.taskCategory.value;
    if (!slug) {
      DOM.taskCategoryDot.style.background = "#6c7086";
      DOM.taskCategoryDot.innerHTML = "";
      window.refreshIcons(DOM.taskCategoryDot);
      return;
    }
    var cat = Kanzo.BoardStore.getCategoryBySlug(slug);
    if (cat) {
      DOM.taskCategoryDot.style.background = cat.color;
      DOM.taskCategoryDot.innerHTML =
        '<i data-lucide="' + cat.icon + '" width="12" height="12"></i>';
    } else {
      DOM.taskCategoryDot.style.background = "#6c7086";
      DOM.taskCategoryDot.innerHTML = "";
    }
    window.refreshIcons(DOM.taskCategoryDot);
  }

  function updateColumnDot() {
    if (!DOM.taskColumnDot) return;
    var colId = DOM.taskColumn.value;
    var boardConfig = Kanzo.Config.getBoardConfig();
    var col = boardConfig.columns.find(function (c) {
      return c.id === colId;
    });
    DOM.taskColumnDot.style.background = col ? col.color : "#6c7086";
  }

  function populateTaskCategorySelect(task) {
    DOM.taskCategory.innerHTML = '<option value="">None</option>';
    Kanzo.BoardStore.getCategories().forEach(function (cat) {
      var selected = task && task.category === cat.slug ? " selected" : "";
      DOM.taskCategory.innerHTML +=
        '<option value="' +
        cat.slug +
        '"' +
        selected +
        ">" +
        cat.name +
        "</option>";
    });
  }

  function populateTaskColumnSelect(selectedCol) {
    DOM.taskColumn.innerHTML = "";
    var boardConfig = Kanzo.Config.getBoardConfig();
    boardConfig.columns.forEach(function (col) {
      var selected = col.id === selectedCol ? " selected" : "";
      DOM.taskColumn.innerHTML +=
        '<option value="' +
        col.id +
        '"' +
        selected +
        ">" +
        col.name +
        "</option>";
    });
  }

  function saveTask() {
    var id = DOM.taskEditId.value;
    var data = {
      title: DOM.taskTitle.value.trim(),
      description: DOM.taskDescription.value.trim(),
      type: DOM.taskType.value,
      assignedTo: DOM.taskAssignedTo.value.trim(),
      tags: _taskTags,
      priority: DOM.taskPriority.value,
      category: DOM.taskCategory.value,
      column: DOM.taskColumn.value,
    };

    if (!data.title) {
      Kanzo.Toast.show("Title is required", "warning");
      return;
    }

    var promise;
    if (id) {
      promise = Kanzo.BoardStore.updateTask(id, data);
    } else {
      promise = Kanzo.BoardStore.createTask(data);
    }

    promise
      .then(function () {
        Kanzo.Board.render();
        Kanzo.Sidebar.update();
        hide(DOM.taskModal);
        Kanzo.Toast.show(id ? "Task updated" : "Task created", "success");
      })
      .catch(function () {
        Kanzo.Toast.show("Failed to save task", "error");
      });
  }

  function deleteTask() {
    var id = DOM.taskEditId.value;
    if (!id) return;
    showConfirm(
      "Delete Task",
      "Are you sure you want to delete this task?",
      function () {
        Kanzo.BoardStore.deleteTask(id).then(function () {
          Kanzo.Board.render();
          Kanzo.Sidebar.update();
          hide(DOM.taskModal);
          Kanzo.Toast.show("Task deleted", "success");
        });
      },
    );
  }

  window.showTaskModal = function (task, columnId) {
    showTaskModal(task, columnId);
  };

  // ===== Category Modal =====

  function bindCategoryModalEvents() {
    DOM.categoryModalClose.addEventListener("click", function () {
      hide(DOM.categoryModal);
    });
    DOM.categoryModal.addEventListener("click", function (e) {
      if (e.target === DOM.categoryModal) hide(DOM.categoryModal);
    });
    DOM.categoryModalCancel.addEventListener("click", function () {
      hide(DOM.categoryModal);
    });
    DOM.categoryModalSave.addEventListener("click", function () {
      saveCategory();
    });
    DOM.categoryDeleteBtn.addEventListener("click", function () {
      deleteCategory();
    });
  }

  function showCategoryModal(cat) {
    DOM.categoryEditId.value = cat ? cat.id : "";
    DOM.categoryModalTitle.textContent = cat ? "Edit Category" : "New Category";
    DOM.categoryName.value = cat ? cat.name : "";
    DOM.categoryModal._editing = cat || null;
    renderCategoryColorGrid(cat ? cat.color : Kanzo.CATEGORY_COLORS[0]);
    renderCategoryIconGrid(cat ? cat.icon : "folder");
    DOM.categoryDeleteBtn.classList.toggle("hidden", !cat);
    show(DOM.categoryModal);
  }

  function renderCategoryColorGrid(selected) {
    DOM.categoryColorGrid.innerHTML = "";
    var selectedLower = selected
      ? selected.replace(/\s/g, "").toLowerCase()
      : "";
    Kanzo.CATEGORY_COLORS.forEach(function (color) {
      var btn = document.createElement("button");
      btn.className = "avatar-color-btn";
      btn.setAttribute("data-color", color);
      if (color.replace(/\s/g, "").toLowerCase() === selectedLower)
        btn.classList.add("active");
      btn.style.background = color;
      btn.addEventListener("click", function () {
        DOM.categoryColorGrid
          .querySelectorAll(".avatar-color-btn")
          .forEach(function (b) {
            b.classList.remove("active");
          });
        btn.classList.add("active");
      });
      DOM.categoryColorGrid.appendChild(btn);
    });
  }

  function renderCategoryIconGrid(selected) {
    DOM.categoryIconGrid.innerHTML = "";
    Kanzo.CATEGORY_ICONS.forEach(function (icon) {
      var btn = document.createElement("button");
      btn.className = "icon-grid-btn";
      if (icon === selected) btn.classList.add("active");
      btn.innerHTML = '<i data-lucide="' + icon + '"></i>';
      btn.title = icon;
      btn.addEventListener("click", function () {
        DOM.categoryIconGrid
          .querySelectorAll(".icon-grid-btn")
          .forEach(function (b) {
            b.classList.remove("active");
          });
        btn.classList.add("active");
      });
      DOM.categoryIconGrid.appendChild(btn);
    });
    window.refreshIcons(DOM.categoryIconGrid);
  }

  function getSelectedCategoryColor() {
    var btn = DOM.categoryColorGrid.querySelector(".avatar-color-btn.active");
    if (btn) return btn.getAttribute("data-color");
    var editing = DOM.categoryModal._editing;
    return editing ? editing.color : Kanzo.CATEGORY_COLORS[0];
  }

  function getSelectedCategoryIcon() {
    var btn = DOM.categoryIconGrid.querySelector(".icon-grid-btn.active");
    if (btn) return btn.title;
    var editing = DOM.categoryModal._editing;
    return editing ? editing.icon : "folder";
  }

  function saveCategory() {
    var id = DOM.categoryEditId.value;
    var name = DOM.categoryName.value.trim();
    if (!name) {
      Kanzo.Toast.show("Name is required", "warning");
      return;
    }
    var data = {
      name: name,
      slug: Kanzo.Utils.slugify(name),
      color: getSelectedCategoryColor(),
      icon: getSelectedCategoryIcon(),
    };

    var promise = id
      ? Kanzo.BoardStore.updateCategory(id, data)
      : Kanzo.BoardStore.createCategory(data);

    promise.then(function () {
      Kanzo.Sidebar.update();
      hide(DOM.categoryModal);
      Kanzo.Toast.show(id ? "Category updated" : "Category created", "success");
    });
  }

  function deleteCategory() {
    var id = DOM.categoryEditId.value;
    if (!id) return;
    showConfirm(
      "Delete Category",
      "This will also remove the category from all tasks. Are you sure?",
      function () {
        Kanzo.BoardStore.deleteCategory(id).then(function () {
          Kanzo.Board.render();
          Kanzo.Sidebar.update();
          hide(DOM.categoryModal);
          Kanzo.Toast.show("Category deleted", "success");
        });
      },
    );
  }

  window.showCategoryModal = function (cat) {
    showCategoryModal(cat);
  };

  // ===== Person Modal =====

  function bindPersonModalEvents() {
    DOM.personModalClose.addEventListener("click", function () {
      hide(DOM.personModal);
    });
    DOM.personModal.addEventListener("click", function (e) {
      if (e.target === DOM.personModal) hide(DOM.personModal);
    });
    DOM.personModalCancel.addEventListener("click", function () {
      hide(DOM.personModal);
    });
    DOM.personModalSave.addEventListener("click", function () {
      savePerson();
    });
    DOM.personDeleteBtn.addEventListener("click", function () {
      deletePerson();
    });
  }

  function showPersonModal(person) {
    DOM.personEditId.value = person ? person.id : "";
    DOM.personModalTitle.textContent = person ? "Edit Person" : "New Person";
    DOM.personName.value = person ? person.name : "";
    DOM.personModal._editing = person || null;
    renderPersonColorGrid(person ? person.color : Kanzo.AVATAR_COLORS[0]);
    renderPersonIconGrid(person ? person.icon : "users");
    DOM.personDeleteBtn.classList.toggle("hidden", !person);
    show(DOM.personModal);
  }

  function renderPersonColorGrid(selected) {
    DOM.personColorGrid.innerHTML = "";
    var selectedLower = selected
      ? selected.replace(/\s/g, "").toLowerCase()
      : "";
    Kanzo.AVATAR_COLORS.forEach(function (color) {
      var btn = document.createElement("button");
      btn.className = "avatar-color-btn";
      btn.setAttribute("data-color", color);
      if (color.replace(/\s/g, "").toLowerCase() === selectedLower)
        btn.classList.add("active");
      btn.style.background = color;
      btn.addEventListener("click", function () {
        DOM.personColorGrid
          .querySelectorAll(".avatar-color-btn")
          .forEach(function (b) {
            b.classList.remove("active");
          });
        btn.classList.add("active");
      });
      DOM.personColorGrid.appendChild(btn);
    });
  }

  function renderPersonIconGrid(selected) {
    DOM.personIconGrid.innerHTML = "";
    Kanzo.PERSON_ICONS.forEach(function (icon) {
      var btn = document.createElement("button");
      btn.className = "icon-grid-btn";
      if (icon === selected) btn.classList.add("active");
      btn.innerHTML = '<i data-lucide="' + icon + '"></i>';
      btn.title = icon;
      btn.addEventListener("click", function () {
        DOM.personIconGrid
          .querySelectorAll(".icon-grid-btn")
          .forEach(function (b) {
            b.classList.remove("active");
          });
        btn.classList.add("active");
      });
      DOM.personIconGrid.appendChild(btn);
    });
    window.refreshIcons(DOM.personIconGrid);
  }

  function getSelectedPersonColor() {
    var btn = DOM.personColorGrid.querySelector(".avatar-color-btn.active");
    if (btn) return btn.getAttribute("data-color");
    var editing = DOM.personModal._editing;
    return editing ? editing.color : Kanzo.AVATAR_COLORS[0];
  }

  function getSelectedPersonIcon() {
    var btn = DOM.personIconGrid.querySelector(".icon-grid-btn.active");
    if (btn) return btn.title;
    var editing = DOM.personModal._editing;
    return editing ? editing.icon : "users";
  }

  function savePerson() {
    var id = DOM.personEditId.value;
    var name = DOM.personName.value.trim();
    if (!name) {
      Kanzo.Toast.show("Name is required", "warning");
      return;
    }
    var data = {
      name: name,
      color: getSelectedPersonColor(),
      icon: getSelectedPersonIcon(),
    };

    var promise = id
      ? Kanzo.BoardStore.updatePerson(id, data)
      : Kanzo.BoardStore.createPerson(data);

    promise.then(function () {
      Kanzo.Board.render();
      Kanzo.Sidebar.update();
      hide(DOM.personModal);
      Kanzo.Toast.show(id ? "Person updated" : "Person created", "success");
    });
  }

  function deletePerson() {
    var id = DOM.personEditId.value;
    if (!id) return;
    showConfirm(
      "Delete Person",
      "Tasks assigned to this person will become unassigned. Are you sure?",
      function () {
        Kanzo.BoardStore.deletePerson(id).then(function () {
          Kanzo.Board.render();
          Kanzo.Sidebar.update();
          hide(DOM.personModal);
          Kanzo.Toast.show("Person deleted", "success");
        });
      },
    );
  }

  window.showPersonModal = function (person) {
    showPersonModal(person);
  };

  // ===== Column Config =====

  function bindColumnConfigEvents() {
    DOM.columnConfigClose.addEventListener("click", function () {
      hide(DOM.columnConfigModal);
    });
    DOM.columnConfigModal.addEventListener("click", function (e) {
      if (e.target === DOM.columnConfigModal) hide(DOM.columnConfigModal);
    });
    DOM.columnConfigCancel.addEventListener("click", function () {
      hide(DOM.columnConfigModal);
    });
    DOM.columnConfigSave.addEventListener("click", function () {
      saveColumnConfig();
    });
    DOM.addColumnBtn.addEventListener("click", function () {
      addColumnRow();
    });
  }

  var dragSrcIdx = -1;

  function createColumnRow(name, color) {
    var row = document.createElement("div");
    row.className = "column-config-item";
    row.draggable = true;
    row.innerHTML =
      '<i data-lucide="grip" class="column-drag-handle"></i>' +
      '<span class="column-dot" style="background:' +
      color +
      '"></span>' +
      '<input type="text" value="' +
      Kanzo.Utils.sanitize(name) +
      '" data-key="name">' +
      '<input type="color" value="' +
      color +
      '" data-key="color">' +
      '<button class="btn-icon-sm column-remove-btn" aria-label="Remove column"><i data-lucide="x"></i></button>';

    row
      .querySelector('input[data-key="color"]')
      .addEventListener("input", function () {
        row.querySelector(".column-dot").style.background = this.value;
      });

    row
      .querySelector(".column-remove-btn")
      .addEventListener("click", function () {
        if (
          DOM.columnsConfigList.querySelectorAll(".column-config-item")
            .length <= 1
        ) {
          Kanzo.Toast.show("Must have at least one column", "warning");
          return;
        }
        row.remove();
      });

    // Drag-and-drop handlers
    row.addEventListener("dragstart", function (e) {
      dragSrcIdx = Array.from(DOM.columnsConfigList.children).indexOf(row);
      row.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });

    row.addEventListener("dragend", function () {
      row.classList.remove("dragging");
      DOM.columnsConfigList
        .querySelectorAll(".column-config-item")
        .forEach(function (r) {
          r.classList.remove("drag-over");
        });
      dragSrcIdx = -1;
    });

    row.addEventListener("dragover", function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });

    row.addEventListener("dragenter", function (e) {
      e.preventDefault();
      var targetIdx = Array.from(DOM.columnsConfigList.children).indexOf(row);
      if (targetIdx !== dragSrcIdx) {
        row.classList.add("drag-over");
      }
    });

    row.addEventListener("dragleave", function () {
      row.classList.remove("drag-over");
    });

    row.addEventListener("drop", function (e) {
      e.preventDefault();
      row.classList.remove("drag-over");
      var targetIdx = Array.from(DOM.columnsConfigList.children).indexOf(row);
      if (dragSrcIdx !== -1 && targetIdx !== dragSrcIdx) {
        var items = DOM.columnsConfigList.querySelectorAll(
          ".column-config-item",
        );
        if (targetIdx < dragSrcIdx) {
          DOM.columnsConfigList.insertBefore(
            items[dragSrcIdx],
            items[targetIdx],
          );
        } else {
          DOM.columnsConfigList.insertBefore(
            items[dragSrcIdx],
            items[targetIdx].nextSibling,
          );
        }
      }
    });

    return row;
  }

  function renderColumnConfig() {
    var boardConfig = Kanzo.Config.getBoardConfig();
    DOM.columnsConfigList.innerHTML = "";
    boardConfig.columns.forEach(function (col) {
      DOM.columnsConfigList.appendChild(createColumnRow(col.name, col.color));
    });
    window.refreshIcons(DOM.columnsConfigList);
  }

  function addColumnRow() {
    var color =
      Kanzo.AVATAR_COLORS[
        Math.floor(Math.random() * Kanzo.AVATAR_COLORS.length)
      ];
    var row = createColumnRow("New Column", color);
    DOM.columnsConfigList.appendChild(row);
    window.refreshIcons(row);
  }

  function saveColumnConfig() {
    var rows = DOM.columnsConfigList.querySelectorAll(".column-config-item");
    var columns = [];
    var seen = {};
    rows.forEach(function (row, idx) {
      var name =
        row.querySelector('input[data-key="name"]').value.trim() ||
        "Column " + (idx + 1);
      var color = row.querySelector('input[data-key="color"]').value;
      var id = Kanzo.Utils.slugify(name);
      if (seen[id]) id = id + "-" + idx;
      seen[id] = true;
      columns.push({ id: id, name: name, color: color });
    });

    if (!columns.length) {
      Kanzo.Toast.show("Must have at least one column", "warning");
      return;
    }

    Kanzo.Config.saveBoardConfig({ columns: columns });
    Kanzo.Board.render();
    Kanzo.Sidebar.update();
    hide(DOM.columnConfigModal);
    Kanzo.Toast.show("Columns updated", "success");
  }

  window.renderColumnConfig = function () {
    renderColumnConfig();
    show(DOM.columnConfigModal);
  };

  // ===== Confirm =====

  var _confirmCallback = null;

  function bindConfirmEvents() {
    DOM.confirmCancel.addEventListener("click", function () {
      _confirmCallback = null;
      hide(DOM.confirmModal);
    });
    DOM.confirmModal.addEventListener("click", function (e) {
      if (e.target === DOM.confirmModal) {
        hide(DOM.confirmModal);
      }
    });
    DOM.confirmYes.addEventListener("click", function () {
      if (_confirmCallback) _confirmCallback();
      _confirmCallback = null;
      hide(DOM.confirmModal);
    });
  }

  function showConfirm(title, message, callback) {
    DOM.confirmTitle.textContent = title;
    DOM.confirmMessage.textContent = message;
    _confirmCallback = callback;
    show(DOM.confirmModal);
  }

  // ===== Help =====

  function bindHelpEvents() {
    DOM.helpToggle.addEventListener("click", function () {
      show(DOM.helpModal);
    });

    DOM.helpClose.addEventListener("click", function () {
      hide(DOM.helpModal);
    });

    DOM.helpCloseFooter.addEventListener("click", function () {
      hide(DOM.helpModal);
    });

    DOM.helpModal.addEventListener("click", function (e) {
      if (e.target === DOM.helpModal) hide(DOM.helpModal);
    });
  }

  // ===== Keyboard Shortcuts =====

  function bindKeyboardShortcuts() {
    document.addEventListener("keydown", function (e) {
      // Ignore when typing in inputs
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.tagName === "SELECT" ||
        e.target.isContentEditable
      ) {
        return;
      }

      var key = e.key.toLowerCase();

      if (key === "n") {
        e.preventDefault();
        var boardConfig = Kanzo.Config.getBoardConfig();
        var firstCol = boardConfig.columns[0];
        window.showTaskModal(null, firstCol ? firstCol.id : "backlog");
      } else if (key === "b") {
        e.preventDefault();
        Kanzo.Sidebar.toggleDesktop
          ? Kanzo.Sidebar.toggleDesktop()
          : document.getElementById("sidebarToggle").click();
      } else if (key === "d") {
        e.preventDefault();
        document.getElementById("themeQuickToggle").click();
      } else if (key === "/") {
        e.preventDefault();
        var searchInput = document.getElementById("searchInput");
        if (searchInput) searchInput.focus();
      } else if (key === "?") {
        e.preventDefault();
        show(DOM.helpModal);
      } else if (key === "escape") {
        // Close any open modal
        var modals = document.querySelectorAll(".modal-overlay:not(.hidden)");
        if (modals.length > 0) {
          hide(modals[modals.length - 1]);
        }
      }
    });
  }

  // ===== Public =====

  return {
    init: init,
    show: show,
    hide: hide,
    showSettings: showSettings,
    showConfirm: showConfirm,
  };
})();
