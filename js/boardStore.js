window.Kanzo = window.Kanzo || {};

Kanzo.BoardStore = (function () {
  "use strict";

  var backend = null;
  var _categories = [];
  var _tasks = [];
  var _activeCategory = null;
  var _activePerson = null;
  var _searchQuery = "";
  var _people = [];

  function init(b) {
    backend = b;
  }

  function loadCategories() {
    return backend.getCategories().then(function (cats) {
      _categories = cats;
      return cats;
    });
  }

  function loadTasks() {
    return backend.getTasks().then(function (tasks) {
      _tasks = tasks;
      return tasks;
    });
  }

  function loadAll() {
    return Promise.all([loadCategories(), loadTasks(), loadPeople()]);
  }

  function getCategories() {
    return _categories;
  }

  function getTasks() {
    return _tasks;
  }

  function getFilteredTasks() {
    var column = arguments[0];
    var tasks = _tasks.slice();
    if (_activeCategory) {
      tasks = tasks.filter(function (t) {
        return t.category === _activeCategory;
      });
    }
    if (_activePerson) {
      tasks = tasks.filter(function (t) {
        return t.assignedTo === _activePerson;
      });
    }
    if (_searchQuery) {
      var q = _searchQuery.toLowerCase();
      tasks = tasks.filter(function (t) {
        return (
          (t.title && t.title.toLowerCase().indexOf(q) !== -1) ||
          (t.description && t.description.toLowerCase().indexOf(q) !== -1)
        );
      });
    }
    if (column) {
      tasks = tasks.filter(function (t) {
        return t.column === column;
      });
    }
    tasks.sort(function (a, b) {
      return (a.order || 0) - (b.order || 0);
    });
    return tasks;
  }

  function getTasksByColumn(columnId) {
    return getFilteredTasks(columnId);
  }

  function getTaskCountByColumn(columnId) {
    var tasks = _tasks.slice();
    if (_activeCategory) {
      tasks = tasks.filter(function (t) {
        return t.category === _activeCategory;
      });
    }
    if (_activePerson) {
      tasks = tasks.filter(function (t) {
        return t.assignedTo === _activePerson;
      });
    }
    if (_searchQuery) {
      var q = _searchQuery.toLowerCase();
      tasks = tasks.filter(function (t) {
        return (
          (t.title && t.title.toLowerCase().indexOf(q) !== -1) ||
          (t.description && t.description.toLowerCase().indexOf(q) !== -1)
        );
      });
    }
    return tasks.filter(function (t) {
      return t.column === columnId;
    }).length;
  }

  function createTask(data) {
    var now = new Date().toISOString();
    var task = {
      id: Kanzo.Utils.uuid(),
      title: data.title || "",
      description: data.description || "",
      type: data.type || "task",
      assignedTo: data.assignedTo || "",
      tags: data.tags || [],
      priority: data.priority || "none",
      category: data.category || "",
      column: data.column || "backlog",
      order: Date.now(),
      createdAt: now,
      updatedAt: now,
    };
    _tasks.push(task);
    return backend.saveTask(task).then(function () {
      return task;
    });
  }

  function updateTask(id, data) {
    var idx = _tasks.findIndex(function (t) {
      return t.id === id;
    });
    if (idx === -1) return Promise.reject(new Error("Task not found"));
    data.updatedAt = new Date().toISOString();
    Object.keys(data).forEach(function (key) {
      _tasks[idx][key] = data[key];
    });
    return backend.saveTask(_tasks[idx]).then(function () {
      return _tasks[idx];
    });
  }

  function moveTask(id, columnId) {
    var idx = _tasks.findIndex(function (t) {
      return t.id === id;
    });
    if (idx === -1) return Promise.reject(new Error("Task not found"));
    _tasks[idx].column = columnId;
    _tasks[idx].updatedAt = new Date().toISOString();
    return backend.saveTask(_tasks[idx]);
  }

  function reorderTask(id, newOrder) {
    var idx = _tasks.findIndex(function (t) {
      return t.id === id;
    });
    if (idx === -1) return;
    _tasks[idx].order = newOrder;
    _tasks[idx].updatedAt = new Date().toISOString();
    return backend.saveTask(_tasks[idx]);
  }

  function moveTaskUp(taskId) {
    var task = _tasks.find(function (t) {
      return t.id === taskId;
    });
    if (!task) return Promise.resolve();
    var colTasks = getFilteredTasks(task.column);
    var idx = colTasks.findIndex(function (t) {
      return t.id === taskId;
    });
    if (idx <= 0) return Promise.resolve();
    var above = colTasks[idx - 1];
    var tmp = task.order;
    task.order = above.order;
    task.updatedAt = new Date().toISOString();
    above.order = tmp;
    above.updatedAt = new Date().toISOString();
    return Promise.all([backend.saveTask(task), backend.saveTask(above)]);
  }

  function moveTaskDown(taskId) {
    var task = _tasks.find(function (t) {
      return t.id === taskId;
    });
    if (!task) return Promise.resolve();
    var colTasks = getFilteredTasks(task.column);
    var idx = colTasks.findIndex(function (t) {
      return t.id === taskId;
    });
    if (idx < 0 || idx >= colTasks.length - 1) return Promise.resolve();
    var below = colTasks[idx + 1];
    var tmp = task.order;
    task.order = below.order;
    task.updatedAt = new Date().toISOString();
    below.order = tmp;
    below.updatedAt = new Date().toISOString();
    return Promise.all([backend.saveTask(task), backend.saveTask(below)]);
  }

  function deleteTask(id) {
    _tasks = _tasks.filter(function (t) {
      return t.id !== id;
    });
    return backend.deleteTask(id);
  }

  function createCategory(data) {
    var now = new Date().toISOString();
    var cat = {
      id: Kanzo.Utils.uuid(),
      name: data.name || "",
      slug: Kanzo.Utils.slugify(data.name || ""),
      color: data.color || Kanzo.AVATAR_COLORS[0],
      icon: data.icon || "folder",
      order: data.order || _categories.length,
      createdAt: now,
      updatedAt: now,
    };
    _categories.push(cat);
    return backend.saveCategory(cat).then(function () {
      return cat;
    });
  }

  function updateCategory(id, data) {
    var idx = _categories.findIndex(function (c) {
      return c.id === id;
    });
    if (idx === -1) return Promise.reject(new Error("Category not found"));
    data.updatedAt = new Date().toISOString();
    Object.keys(data).forEach(function (key) {
      _categories[idx][key] = data[key];
    });
    return backend.saveCategory(_categories[idx]).then(function () {
      return _categories[idx];
    });
  }

  function deleteCategory(id) {
    var cat = _categories.find(function (c) {
      return c.id === id;
    });
    if (!cat) return Promise.resolve();
    return backend.deleteTasksByCategory(cat.slug).then(function () {
      _tasks = _tasks.filter(function (t) {
        return t.category !== cat.slug;
      });
      _categories = _categories.filter(function (c) {
        return c.id !== id;
      });
      return backend.deleteCategory(id);
    });
  }

  function setActiveCategory(slug) {
    _activePerson = null;
    _activeCategory = slug || null;
  }

  function getActiveCategory() {
    return _activeCategory;
  }

  function setActivePerson(id) {
    _activeCategory = null;
    _activePerson = id || null;
  }

  function getActivePerson() {
    return _activePerson;
  }

  function setSearchQuery(query) {
    _searchQuery = query || "";
  }

  function getSearchQuery() {
    return _searchQuery;
  }

  function getTask(id) {
    return (
      _tasks.find(function (t) {
        return t.id === id;
      }) || null
    );
  }

  function getCategoryBySlug(slug) {
    return (
      _categories.find(function (c) {
        return c.slug === slug;
      }) || null
    );
  }

  function getCategoryById(id) {
    return (
      _categories.find(function (c) {
        return c.id === id;
      }) || null
    );
  }

  function getAllTags() {
    var tagSet = {};
    _tasks.forEach(function (t) {
      if (t.tags) {
        t.tags.forEach(function (tag) {
          tagSet[tag] = (tagSet[tag] || 0) + 1;
        });
      }
    });
    return Object.keys(tagSet).sort(function (a, b) {
      return tagSet[b] - tagSet[a];
    });
  }

  function setBackend(b) {
    backend = b;
  }

  function loadPeople() {
    return backend.getPeople().then(function (people) {
      _people = people;
      return people;
    });
  }

  function getPeople() {
    return _people;
  }

  function createPerson(data) {
    var now = new Date().toISOString();
    var person = {
      id: Kanzo.Utils.uuid(),
      name: data.name || "",
      color: data.color || Kanzo.AVATAR_COLORS[0],
      icon: data.icon || "user",
      order: _people.length,
      createdAt: now,
      updatedAt: now,
    };
    _people.push(person);
    return backend.savePeople(_people).then(function () {
      return person;
    });
  }

  function updatePerson(id, data) {
    var idx = _people.findIndex(function (p) {
      return p.id === id;
    });
    if (idx === -1) return Promise.reject(new Error("Person not found"));
    data.updatedAt = new Date().toISOString();
    Object.keys(data).forEach(function (key) {
      _people[idx][key] = data[key];
    });
    return backend.savePeople(_people).then(function () {
      return _people[idx];
    });
  }

  function deletePerson(id) {
    _people = _people.filter(function (p) {
      return p.id !== id;
    });
    _tasks.forEach(function (t) {
      if (t.assignedTo === id) {
        t.assignedTo = "";
      }
    });
    return backend.savePeople(_people);
  }

  function savePeople() {
    return backend.savePeople(_people);
  }

  return {
    init: init,
    loadCategories: loadCategories,
    loadTasks: loadTasks,
    loadAll: loadAll,
    getCategories: getCategories,
    getTasks: getTasks,
    getFilteredTasks: getFilteredTasks,
    getTasksByColumn: getTasksByColumn,
    getTaskCountByColumn: getTaskCountByColumn,
    createTask: createTask,
    updateTask: updateTask,
    moveTask: moveTask,
    reorderTask: reorderTask,
    moveTaskUp: moveTaskUp,
    moveTaskDown: moveTaskDown,
    deleteTask: deleteTask,
    createCategory: createCategory,
    updateCategory: updateCategory,
    deleteCategory: deleteCategory,
    setActiveCategory: setActiveCategory,
    getActiveCategory: getActiveCategory,
    setActivePerson: setActivePerson,
    getActivePerson: getActivePerson,
    setSearchQuery: setSearchQuery,
    getSearchQuery: getSearchQuery,
    getTask: getTask,
    getCategoryBySlug: getCategoryBySlug,
    getCategoryById: getCategoryById,
    getAllTags: getAllTags,
    setBackend: setBackend,
    loadPeople: loadPeople,
    getPeople: getPeople,
    createPerson: createPerson,
    updatePerson: updatePerson,
    deletePerson: deletePerson,
    savePeople: savePeople,
  };
})();
