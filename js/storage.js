window.Kanzo = window.Kanzo || {};

Kanzo.LocalBackend = function () {
  this.db = null;
  this._memoryDb = null;
  this._useMemory = false;
  this._ready = null;
};

Kanzo.LocalBackend.prototype._openDb = function () {
  var self = this;
  if (self.db) return Promise.resolve(self.db);
  if (self._useMemory) return Promise.resolve(self._getMemoryDb());
  if (self._ready) return self._ready;

  self._ready = new Promise(function (resolve) {
    try {
      var req = indexedDB.open(Kanzo.DB.NAME, Kanzo.DB.VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains("categories")) {
          var cs = db.createObjectStore("categories", { keyPath: "id" });
          cs.createIndex("slug", "slug", { unique: false });
        }
        if (!db.objectStoreNames.contains("tasks")) {
          var ts = db.createObjectStore("tasks", { keyPath: "id" });
          ts.createIndex("column", "column", { unique: false });
          ts.createIndex("category", "category", { unique: false });
          ts.createIndex("updatedAt", "updatedAt", { unique: false });
        }
        if (!db.objectStoreNames.contains("people")) {
          db.createObjectStore("people", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("sync_queue")) {
          db.createObjectStore("sync_queue", { keyPath: "id" });
        }
      };
      req.onsuccess = function (e) {
        self.db = e.target.result;
        self._ready = null;
        resolve(self.db);
      };
      req.onerror = function () {
        console.warn("Kanzo: IndexedDB unavailable, using in-memory storage");
        self._useMemory = true;
        self._ready = null;
        resolve(self._getMemoryDb());
      };
    } catch (e) {
      console.warn("Kanzo: IndexedDB not supported, using in-memory storage");
      self._useMemory = true;
      self._ready = null;
      resolve(self._getMemoryDb());
    }
  });
  return self._ready;
};

Kanzo.LocalBackend.prototype._getMemoryDb = function () {
  if (!this._memoryDb) {
    this._memoryDb = { categories: [], tasks: [], people: [] };
  }
  return this._memoryDb;
};

Kanzo.LocalBackend.prototype._tx = function (storeName, mode) {
  var self = this;
  return self._openDb().then(function (db) {
    if (self._useMemory) {
      return { _memoryStore: storeName, _memoryDb: db, _backend: self };
    }
    var tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  });
};

Kanzo.LocalBackend.prototype._isMem = function (store) {
  return store && store._memoryStore;
};

Kanzo.LocalBackend.prototype.getCategories = function () {
  var self = this;
  return self._tx("categories", "readonly").then(function (store) {
    if (self._isMem(store)) {
      var items = store._memoryDb.categories.slice();
      items.sort(function (a, b) {
        return (a.order || 0) - (b.order || 0);
      });
      return items;
    }
    return new Promise(function (resolve) {
      var req = store.getAll();
      req.onsuccess = function () {
        var items = req.result || [];
        items.sort(function (a, b) {
          return (a.order || 0) - (b.order || 0);
        });
        resolve(items);
      };
      req.onerror = function () {
        resolve([]);
      };
    });
  });
};

Kanzo.LocalBackend.prototype.getPeople = function () {
  var self = this;
  return self._tx("people", "readonly").then(function (store) {
    if (self._isMem(store)) {
      var items = store._memoryDb.people.slice();
      items.sort(function (a, b) {
        return (a.order || 0) - (b.order || 0);
      });
      return items;
    }
    return new Promise(function (resolve) {
      var req = store.getAll();
      req.onsuccess = function () {
        var items = req.result || [];
        items.sort(function (a, b) {
          return (a.order || 0) - (b.order || 0);
        });
        resolve(items);
      };
      req.onerror = function () {
        resolve([]);
      };
    });
  });
};

Kanzo.LocalBackend.prototype.savePeople = function (people) {
  var self = this;
  return self._tx("people", "readwrite").then(function (store) {
    if (self._isMem(store)) {
      store._memoryDb.people = people.slice();
      return;
    }
    return new Promise(function (resolve) {
      var req = store.clear();
      req.onsuccess = function () {
        var promises = (people || []).map(function (p) {
          return new Promise(function (res) {
            store.put(p).onsuccess = res;
          });
        });
        Promise.all(promises).then(resolve);
      };
    });
  });
};

Kanzo.LocalBackend.prototype.deletePerson = function (id) {
  var self = this;
  return self._tx("people", "readwrite").then(function (store) {
    if (self._isMem(store)) {
      store._memoryDb.people = store._memoryDb.people.filter(function (p) {
        return p.id !== id;
      });
      return;
    }
    return new Promise(function (resolve) {
      store.delete(id);
      resolve();
    });
  });
};

Kanzo.LocalBackend.prototype.saveCategory = function (category) {
  var self = this;
  return self._tx("categories", "readwrite").then(function (store) {
    if (self._isMem(store)) {
      var idx = store._memoryDb.categories.findIndex(function (c) {
        return c.id === category.id;
      });
      if (idx >= 0) store._memoryDb.categories[idx] = category;
      else store._memoryDb.categories.push(category);
      return;
    }
    return new Promise(function (resolve, reject) {
      var req = store.put(category);
      req.onsuccess = function () {
        resolve();
      };
      req.onerror = function () {
        reject(new Error("Failed to save category"));
      };
    });
  });
};

Kanzo.LocalBackend.prototype.deleteCategory = function (id) {
  var self = this;
  return self._tx("categories", "readwrite").then(function (store) {
    if (self._isMem(store)) {
      store._memoryDb.categories = store._memoryDb.categories.filter(
        function (c) {
          return c.id !== id;
        },
      );
      return;
    }
    return new Promise(function (resolve) {
      store.delete(id);
      resolve();
    });
  });
};

Kanzo.LocalBackend.prototype.getTasks = function (filters) {
  var self = this;
  return self._tx("tasks", "readonly").then(function (store) {
    if (self._isMem(store)) {
      var tasks = store._memoryDb.tasks.slice();
      return self._applyFilters(tasks, filters);
    }
    return new Promise(function (resolve) {
      var req = store.getAll();
      req.onsuccess = function () {
        var tasks = req.result || [];
        resolve(self._applyFilters(tasks, filters));
      };
      req.onerror = function () {
        resolve([]);
      };
    });
  });
};

Kanzo.LocalBackend.prototype._applyFilters = function (tasks, filters) {
  filters = filters || {};
  if (filters.column) {
    tasks = tasks.filter(function (t) {
      return t.column === filters.column;
    });
  }
  if (filters.category) {
    tasks = tasks.filter(function (t) {
      return t.category === filters.category;
    });
  }
  if (filters.search) {
    var q = filters.search.toLowerCase();
    tasks = tasks.filter(function (t) {
      return (
        (t.title && t.title.toLowerCase().indexOf(q) !== -1) ||
        (t.description && t.description.toLowerCase().indexOf(q) !== -1)
      );
    });
  }
  if (filters.tags && filters.tags.length) {
    tasks = tasks.filter(function (t) {
      return (
        t.tags &&
        filters.tags.some(function (tag) {
          return t.tags.indexOf(tag) !== -1;
        })
      );
    });
  }
  if (filters.type) {
    tasks = tasks.filter(function (t) {
      return t.type === filters.type;
    });
  }
  if (filters.priority) {
    tasks = tasks.filter(function (t) {
      return t.priority === filters.priority;
    });
  }
  tasks.sort(function (a, b) {
    return (a.order || 0) - (b.order || 0);
  });
  return tasks;
};

Kanzo.LocalBackend.prototype.saveTask = function (task) {
  var self = this;
  return self._tx("tasks", "readwrite").then(function (store) {
    if (self._isMem(store)) {
      var idx = store._memoryDb.tasks.findIndex(function (t) {
        return t.id === task.id;
      });
      if (idx >= 0) store._memoryDb.tasks[idx] = task;
      else store._memoryDb.tasks.push(task);
      return;
    }
    return new Promise(function (resolve, reject) {
      var req = store.put(task);
      req.onsuccess = function () {
        resolve();
      };
      req.onerror = function () {
        reject(new Error("Failed to save task"));
      };
    });
  });
};

Kanzo.LocalBackend.prototype.saveTasks = function (tasks) {
  var self = this;
  return self._tx("tasks", "readwrite").then(function (store) {
    if (self._isMem(store)) {
      tasks.forEach(function (task) {
        var idx = store._memoryDb.tasks.findIndex(function (t) {
          return t.id === task.id;
        });
        if (idx >= 0) store._memoryDb.tasks[idx] = task;
        else store._memoryDb.tasks.push(task);
      });
      return;
    }
    return Promise.all(
      tasks.map(function (task) {
        return new Promise(function (resolve, reject) {
          var req = store.put(task);
          req.onsuccess = function () {
            resolve();
          };
          req.onerror = function () {
            reject(new Error("Failed to save task"));
          };
        });
      }),
    );
  });
};

Kanzo.LocalBackend.prototype.deleteTask = function (id) {
  var self = this;
  return self._tx("tasks", "readwrite").then(function (store) {
    if (self._isMem(store)) {
      store._memoryDb.tasks = store._memoryDb.tasks.filter(function (t) {
        return t.id !== id;
      });
      return;
    }
    return new Promise(function (resolve) {
      store.delete(id);
      resolve();
    });
  });
};

Kanzo.LocalBackend.prototype.deleteTasksByCategory = function (categoryId) {
  var self = this;
  return self._tx("tasks", "readwrite").then(function (store) {
    var slug = categoryId;
    if (self._isMem(store)) {
      store._memoryDb.tasks = store._memoryDb.tasks.filter(function (t) {
        return t.category !== slug;
      });
      return;
    }
    return new Promise(function (resolve) {
      var req = store.index("category").openCursor(IDBKeyRange.only(slug));
      req.onsuccess = function (e) {
        var cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = function () {
        resolve();
      };
    });
  });
};

Kanzo.LocalBackend.prototype.deleteAll = function () {
  var self = this;
  return self._tx("categories", "readwrite").then(function (cStore) {
    return self._tx("tasks", "readwrite").then(function (tStore) {
      return self._tx("people", "readwrite").then(function (pStore) {
        if (self._isMem(cStore)) {
          cStore._memoryDb.categories = [];
          tStore._memoryDb.tasks = [];
          pStore._memoryDb.people = [];
          return;
        }
        return Promise.all([
          new Promise(function (resolve) {
            cStore.clear().onsuccess = resolve;
          }),
          new Promise(function (resolve) {
            tStore.clear().onsuccess = resolve;
          }),
          new Promise(function (resolve) {
            pStore.clear().onsuccess = resolve;
          }),
        ]);
      });
    });
  });
};

Kanzo.LocalBackend.prototype.exportData = function () {
  var self = this;
  return Promise.all([
    self.getCategories(),
    self.getTasks(),
    self.getPeople(),
  ]).then(function (results) {
    return JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        categories: results[0],
        tasks: results[1],
        people: results[2],
      },
      null,
      2,
    );
  });
};

Kanzo.LocalBackend.prototype.importData = function (jsonStr) {
  var self = this;
  var data;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    return Promise.reject(new Error("Invalid JSON"));
  }
  if (!data.tasks) return Promise.reject(new Error("Invalid data format"));
  return self._openDb().then(function (db) {
    if (self._useMemory) {
      self._getMemoryDb().categories = data.categories || [];
      self._getMemoryDb().tasks = data.tasks || [];
      self._getMemoryDb().people = data.people || [];
      return;
    }
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(["categories", "tasks", "people"], "readwrite");
      var cStore = tx.objectStore("categories");
      var tStore = tx.objectStore("tasks");
      var pStore = tx.objectStore("people");
      cStore.clear();
      tStore.clear();
      pStore.clear();
      (data.categories || []).forEach(function (c) {
        cStore.put(c);
      });
      (data.tasks || []).forEach(function (t) {
        tStore.put(t);
      });
      (data.people || []).forEach(function (p) {
        pStore.put(p);
      });
      tx.oncomplete = function () {
        resolve();
      };
      tx.onerror = function () {
        reject(new Error("Failed to import data"));
      };
    });
  });
};

Kanzo.GitHubBackend = function (client, userId) {
  this.client = client;
  this.userId = userId;
  this._basePath = "profiles/" + userId;
  this._shas = {};
};

Kanzo.GitHubBackend.prototype.getCategories = function () {
  var self = this;
  return self.client
    .getFile(self._basePath + "/categories.json")
    .then(function (data) {
      if (!data || !data.content) return [];
      self._shas["categories"] = data.sha;
      return data.content;
    })
    .catch(function () {
      return [];
    });
};

Kanzo.GitHubBackend.prototype.getTasks = function () {
  var self = this;
  return self.client
    .getFile(self._basePath + "/tasks.json")
    .then(function (data) {
      if (!data || !data.content) return [];
      self._shas["tasks"] = data.sha;
      return data.content;
    })
    .catch(function () {
      return [];
    });
};

Kanzo.GitHubBackend.prototype.getPeople = function () {
  var self = this;
  return self.client
    .getFile(self._basePath + "/people.json")
    .then(function (data) {
      if (!data || !data.content) return [];
      self._shas["people"] = data.sha;
      return data.content;
    })
    .catch(function () {
      return [];
    });
};

Kanzo.GitHubBackend.prototype.saveCategories = function (categories) {
  var self = this;
  // Refetch to get the latest SHA before saving
  return self.client
    .getFile(self._basePath + "/categories.json")
    .then(function (data) {
      var sha = data && data.sha ? data.sha : undefined;
      return self.client.putFile(
        self._basePath + "/categories.json",
        categories,
        sha,
      );
    })
    .catch(function () {
      // File doesn't exist yet — create without SHA
      return self.client.putFile(
        self._basePath + "/categories.json",
        categories,
      );
    })
    .then(function (resp) {
      if (resp && resp.content) self._shas["categories"] = resp.content.sha;
    });
};

Kanzo.GitHubBackend.prototype.saveTasks = function (tasks) {
  var self = this;
  // Refetch to get the latest SHA before saving
  return self.client
    .getFile(self._basePath + "/tasks.json")
    .then(function (data) {
      var sha = data && data.sha ? data.sha : undefined;
      return self.client.putFile(self._basePath + "/tasks.json", tasks, sha);
    })
    .catch(function () {
      // File doesn't exist yet — create without SHA
      return self.client.putFile(self._basePath + "/tasks.json", tasks);
    })
    .then(function (resp) {
      if (resp && resp.content) self._shas["tasks"] = resp.content.sha;
    });
};

Kanzo.GitHubBackend.prototype.savePeople = function (people) {
  var self = this;
  // Refetch to get the latest SHA before saving
  return self.client
    .getFile(self._basePath + "/people.json")
    .then(function (data) {
      var sha = data && data.sha ? data.sha : undefined;
      return self.client.putFile(self._basePath + "/people.json", people, sha);
    })
    .catch(function () {
      // File doesn't exist yet — create without SHA
      return self.client.putFile(self._basePath + "/people.json", people);
    })
    .then(function (resp) {
      if (resp && resp.content) self._shas["people"] = resp.content.sha;
    });
};

Kanzo.GitHubBackend.prototype.getConfig = function () {
  var self = this;
  return self.client
    .getFile(self._basePath + "/config.json")
    .then(function (data) {
      if (!data || !data.content) return null;
      self._shas["config"] = data.sha;
      return data.content;
    })
    .catch(function () {
      return null;
    });
};

Kanzo.GitHubBackend.prototype.saveConfig = function (config) {
  var self = this;
  // Refetch to get the latest SHA before saving
  return self.client
    .getFile(self._basePath + "/config.json")
    .then(function (data) {
      var sha = data && data.sha ? data.sha : undefined;
      return self.client.putFile(self._basePath + "/config.json", config, sha);
    })
    .catch(function () {
      // File doesn't exist yet — create without SHA
      return self.client.putFile(self._basePath + "/config.json", config);
    })
    .then(function (resp) {
      if (resp && resp.content) self._shas["config"] = resp.content.sha;
    });
};

Kanzo.GitHubBackend.prototype.saveCategory = function () {
  return Promise.reject(new Error("Use saveCategories() for batch operations"));
};

Kanzo.GitHubBackend.prototype.saveTask = function () {
  return Promise.reject(new Error("Use saveTasks() for batch operations"));
};

Kanzo.GitHubBackend.prototype.deleteCategory = function () {
  return Promise.reject(new Error("Use saveCategories() for batch operations"));
};

Kanzo.GitHubBackend.prototype.deleteTask = function () {
  return Promise.reject(new Error("Use saveTasks() for batch operations"));
};

Kanzo.GitHubBackend.prototype.deleteTasksByCategory = function () {
  return Promise.resolve();
};

Kanzo.GitHubBackend.prototype.deleteAll = function () {
  return Promise.resolve();
};

Kanzo.GitHubBackend.prototype.exportData = function () {
  return Promise.resolve("{}");
};

Kanzo.GitHubBackend.prototype.importData = function () {
  return Promise.resolve();
};
