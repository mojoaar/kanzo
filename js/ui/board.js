window.Kanzo = window.Kanzo || {};

Kanzo.Board = (function () {
  "use strict";

  var DOM = {};
  var dragTaskId = null;
  var dragSrcColumn = null;

  // Touch drag-and-drop state
  var touchDrag = {
    active: false,
    taskId: null,
    sourceCol: null,
    ghost: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    longPressTimer: null,
    longPressTriggered: false,
  };

  function init(dom) {
    DOM = dom;

    // FAB for mobile
    if (DOM.fabAddTask) {
      DOM.fabAddTask.addEventListener("click", function () {
        var boardConfig = Kanzo.Config.getBoardConfig();
        var firstCol = boardConfig.columns[0];
        window.showTaskModal(null, firstCol ? firstCol.id : "backlog");
      });
      window.refreshIcons(DOM.fabAddTask);
    }
  }

  function render() {
    var boardConfig = Kanzo.Config.getBoardConfig();
    var columns = boardConfig.columns;
    var hasTasks = Kanzo.BoardStore.getTasks().length > 0;

    DOM.boardScroll.innerHTML = "";

    columns.forEach(function (col) {
      var colEl = createColumnElement(col);
      DOM.boardScroll.appendChild(colEl);
    });

    DOM.boardEmpty.classList.toggle("hidden", hasTasks);
    window.refreshIcons(DOM.boardScroll);
  }

  function renderHeader() {
    var config = Kanzo.Config.get();
    var avatar = config ? config.avatar : null;
    var name = config ? config.name : "";

    if (DOM.headerAvatar) {
      if (config && config.storage === "github" && avatar && avatar.url) {
        DOM.headerAvatar.style.backgroundImage = "url(" + avatar.url + ")";
        DOM.headerAvatar.style.backgroundColor = "transparent";
        DOM.headerAvatar.textContent = "";
      } else if (avatar && avatar.color) {
        DOM.headerAvatar.style.backgroundImage = "none";
        DOM.headerAvatar.style.backgroundColor = avatar.color;
        DOM.headerAvatar.textContent = Kanzo.Utils.getInitials(name);
      } else {
        DOM.headerAvatar.style.backgroundImage = "none";
        DOM.headerAvatar.style.backgroundColor = Kanzo.Utils.hashColor(
          name || "kanzo",
        );
        DOM.headerAvatar.textContent = Kanzo.Utils.getInitials(name);
      }
    }
    if (DOM.headerName) {
      var displayName = name || "Kanzo";
      if (config && config.storage === "github" && config.githubUser) {
        displayName = config.githubUser;
      }
      DOM.headerName.textContent = displayName;
    }
  }

  function createColumnElement(col) {
    var colEl = document.createElement("div");
    colEl.className = "board-column";
    colEl.dataset.columnId = col.id;

    var header = document.createElement("div");
    header.className = "column-header";
    header.innerHTML =
      '<span class="column-dot" style="background:' +
      col.color +
      '"></span>' +
      '<span class="column-name">' +
      Kanzo.Utils.sanitize(col.name) +
      "</span>" +
      '<span class="column-count">' +
      Kanzo.BoardStore.getTaskCountByColumn(col.id) +
      "</span>" +
      '<button class="column-add-btn" aria-label="Add task"><i data-lucide="plus"></i></button>';

    header
      .querySelector(".column-add-btn")
      .addEventListener("click", function () {
        window.showTaskModal(null, col.id);
      });

    var body = document.createElement("div");
    body.className = "column-body";

    var tasks = Kanzo.BoardStore.getTasksByColumn(col.id);
    tasks.forEach(function (task) {
      var card = createTaskCard(task, col);
      body.appendChild(card);
    });

    // Mouse drag & drop handlers on the column body (for empty-column drops)
    body.addEventListener("dragover", function (e) {
      e.preventDefault();
      // Only highlight body if no card is being hovered
      body.classList.add("drag-over");
    });
    body.addEventListener("dragleave", function (e) {
      // Don't remove if the leave target is still within the body
      if (!body.contains(e.relatedTarget)) {
        body.classList.remove("drag-over");
      }
    });
    body.addEventListener("drop", function (e) {
      e.preventDefault();
      body.classList.remove("drag-over");
      // Only handle drop on body (not on a card — cards handle their own drops)
      if (!e.target.closest(".task-card")) {
        if (dragTaskId) {
          if (dragSrcColumn === col.id) {
            // Same column — move to end
            var colTasks = Kanzo.BoardStore.getTasksByColumn(col.id);
            if (colTasks.length > 0) {
              var lastOrder = colTasks[colTasks.length - 1].order;
              Kanzo.BoardStore.reorderTask(dragTaskId, lastOrder + 1);
              Kanzo.BoardStore.moveTask(dragTaskId, col.id).then(function () {
                render();
              });
            }
          } else {
            Kanzo.BoardStore.moveTask(dragTaskId, col.id).then(function () {
              render();
            });
          }
          dragTaskId = null;
          dragSrcColumn = null;
        }
      }
    });

    colEl.appendChild(header);
    colEl.appendChild(body);
    return colEl;
  }

  function createTaskCard(task, col) {
    var config = Kanzo.Config.get();
    var cardColorMode = config
      ? config.cardColorMode || "priority"
      : "priority";

    var card = document.createElement("div");
    if (cardColorMode === "priority") {
      card.className = "task-card priority-" + task.priority;
    } else {
      card.className = "task-card category-border";
      var cat = Kanzo.BoardStore.getCategoryBySlug(task.category);
      if (cat) {
        card.style.borderColor = cat.color;
        card.style.borderLeftWidth = "3px";
      }
    }
    card.draggable = true;
    card.dataset.taskId = task.id;

    var typeDef =
      Kanzo.TASK_TYPES.find(function (t) {
        return t.value === task.type;
      }) || Kanzo.TASK_TYPES[0];
    var priorityDef =
      Kanzo.PRIORITIES.find(function (p) {
        return p.value === task.priority;
      }) || Kanzo.PRIORITIES[4];

    card.innerHTML =
      '<div class="task-card-header">' +
      '<span class="task-type-icon"><i data-lucide="' +
      typeDef.icon +
      '"></i></span>' +
      '<span class="task-title">' +
      Kanzo.Utils.sanitize(task.title) +
      "</span>" +
      '<span class="task-priority" style="background:' +
      priorityDef.color +
      '" title="' +
      priorityDef.label +
      '"></span>' +
      "</div>";

    var hasTags = task.tags && task.tags.length;
    var hasMeta = hasTags || true;
    if (hasMeta) {
      var metaHtml = '<div class="task-meta">';
      if (hasTags) {
        task.tags.forEach(function (tag) {
          metaHtml +=
            '<span class="task-tag">' + Kanzo.Utils.sanitize(tag) + "</span>";
        });
      }
      var avatarHtml;
      if (task.assignedTo) {
        var person = Kanzo.BoardStore.getPeople().find(function (p) {
          return p.id === task.assignedTo;
        });
        avatarHtml = person
          ? '<span class="task-assigned-avatar" style="background:' +
            person.color +
            '"><i data-lucide="' +
            person.icon +
            '" width="12"></i></span>' +
            "<span>" +
            Kanzo.Utils.sanitize(person.name) +
            "</span>"
          : '<span class="task-assigned-avatar" style="background:' +
            Kanzo.Utils.hashColor(task.assignedTo) +
            '">' +
            Kanzo.Utils.getInitials(task.assignedTo) +
            "</span>" +
            Kanzo.Utils.sanitize(task.assignedTo);
      } else {
        avatarHtml =
          '<span class="task-assigned-avatar" style="background:#ed8796"><i data-lucide="skull" width="12"></i></span>' +
          "<span>Unassigned</span>";
      }
      metaHtml += '<span class="task-assigned">' + avatarHtml + "</span>";
      metaHtml += "</div>";
      card.innerHTML += metaHtml;
    }

    // Click to edit
    card.addEventListener("click", function () {
      window.showTaskModal(task, col.id);
    });

    // Mouse drag events
    card.addEventListener("dragstart", function (e) {
      dragTaskId = task.id;
      dragSrcColumn = col.id;
      e.dataTransfer.setData("text/plain", col.id);
      e.dataTransfer.effectAllowed = "move";
      card.classList.add("dragging");
    });

    card.addEventListener("dragend", function () {
      card.classList.remove("dragging");
      // Remove all card drag-over highlights
      document.querySelectorAll(".task-card.drag-over").forEach(function (el) {
        el.classList.remove("drag-over");
      });
      dragTaskId = null;
      dragSrcColumn = null;
    });

    // Per-card drag/drop for within-column reordering
    card.addEventListener("dragover", function (e) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
    });

    card.addEventListener("dragenter", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (dragTaskId && dragTaskId !== task.id && dragSrcColumn === col.id) {
        card.classList.add("drag-over");
      }
    });

    card.addEventListener("dragleave", function (e) {
      if (!card.contains(e.relatedTarget)) {
        card.classList.remove("drag-over");
      }
    });

    card.addEventListener("drop", function (e) {
      e.preventDefault();
      e.stopPropagation();
      card.classList.remove("drag-over");

      if (!dragTaskId || dragTaskId === task.id) return;

      if (dragSrcColumn === col.id) {
        // Same column — reorder by swapping order values
        var colTasks = Kanzo.BoardStore.getTasksByColumn(col.id);
        var srcIdx = colTasks.findIndex(function (t) {
          return t.id === dragTaskId;
        });
        var targetIdx = colTasks.findIndex(function (t) {
          return t.id === task.id;
        });

        if (srcIdx === -1 || targetIdx === -1) return;

        // Shift other tasks' orders around
        var draggedOrder = colTasks[srcIdx].order;
        if (srcIdx < targetIdx) {
          // Moving down: shift tasks between src+1 and target up by one
          for (var i = srcIdx + 1; i <= targetIdx; i++) {
            var nextOrder = colTasks[i].order;
            colTasks[i].order = draggedOrder;
            draggedOrder = nextOrder;
          }
          colTasks[srcIdx].order = draggedOrder;
        } else {
          // Moving up: shift tasks between target and src-1 down by one
          for (var j = srcIdx - 1; j >= targetIdx; j--) {
            var prevOrder = colTasks[j].order;
            colTasks[j].order = draggedOrder;
            draggedOrder = prevOrder;
          }
          colTasks[srcIdx].order = draggedOrder;
        }

        // Persist all affected tasks via BoardStore
        var saves = [];
        for (
          var k = Math.min(srcIdx, targetIdx);
          k <= Math.max(srcIdx, targetIdx);
          k++
        ) {
          saves.push(
            Kanzo.BoardStore.reorderTask(colTasks[k].id, colTasks[k].order),
          );
        }
        Promise.all(saves).then(function () {
          render();
        });
      } else {
        // Cross-column move
        Kanzo.BoardStore.moveTask(dragTaskId, col.id).then(function () {
          render();
        });
      }

      dragTaskId = null;
      dragSrcColumn = null;
    });

    // Touch drag-and-drop events
    card.addEventListener(
      "touchstart",
      function (e) {
        handleTouchStart(e, card, task, col);
      },
      { passive: false },
    );

    card.addEventListener(
      "touchmove",
      function (e) {
        handleTouchMove(e, card);
      },
      { passive: false },
    );

    card.addEventListener("touchend", function (e) {
      handleTouchEnd(e, card);
    });

    card.addEventListener("touchcancel", function () {
      cancelTouchDrag(card);
    });

    return card;
  }

  // ---- Touch drag-and-drop handlers ----

  function handleTouchStart(e, card, task, col) {
    // Only handle single-finger touch
    if (e.touches.length !== 1) return;

    var touch = e.touches[0];
    touchDrag.startX = touch.clientX;
    touchDrag.startY = touch.clientY;
    touchDrag.taskId = task.id;
    touchDrag.sourceCol = col.id;
    touchDrag.longPressTriggered = false;

    // Long-press (500ms) to activate drag
    clearTimeout(touchDrag.longPressTimer);
    touchDrag.longPressTimer = setTimeout(function () {
      activateTouchDrag(card, touch);
      e.preventDefault();
    }, 500);
  }

  function handleTouchMove(e, card) {
    if (!touchDrag.active) {
      // If the user moves enough before the long-press triggers, cancel it
      if (touchDrag.longPressTimer) {
        var touch = e.touches[0];
        var dx = Math.abs(touch.clientX - touchDrag.startX);
        var dy = Math.abs(touch.clientY - touchDrag.startY);
        if (dx > 10 || dy > 10) {
          clearTimeout(touchDrag.longPressTimer);
          touchDrag.longPressTimer = null;
        }
      }
      return;
    }

    e.preventDefault();

    var touch = e.touches[0];
    var ghost = touchDrag.ghost;

    // Move the ghost element
    ghost.style.left = touch.clientX - touchDrag.offsetX + "px";
    ghost.style.top = touch.clientY - touchDrag.offsetY + "px";

    // Highlight the column under the finger
    highlightColumnUnder(touch.clientX, touch.clientY);
  }

  function handleTouchEnd(e, card) {
    clearTimeout(touchDrag.longPressTimer);
    touchDrag.longPressTimer = null;

    if (!touchDrag.active) return;

    // Find the drop target column
    var touch =
      e.changedTouches && e.changedTouches.length
        ? e.changedTouches[0]
        : { clientX: touchDrag.startX, clientY: touchDrag.startY };

    var targetCol = getColumnAtPoint(touch.clientX, touch.clientY);

    // Remove ghost
    if (touchDrag.ghost && touchDrag.ghost.parentNode) {
      touchDrag.ghost.parentNode.removeChild(touchDrag.ghost);
    }
    touchDrag.ghost = null;

    // Remove all drag-over highlights
    document
      .querySelectorAll(".column-body.drag-over, .column-body.touch-drag-over")
      .forEach(function (el) {
        el.classList.remove("drag-over");
        el.classList.remove("touch-drag-over");
      });

    // Move task if dropped on a different column
    if (targetCol && touchDrag.taskId) {
      Kanzo.BoardStore.moveTask(touchDrag.taskId, targetCol).then(function () {
        render();
      });
    }

    // Reset state
    resetTouchDrag(card);
  }

  function activateTouchDrag(card, touch) {
    touchDrag.active = true;
    touchDrag.longPressTriggered = true;

    var rect = card.getBoundingClientRect();
    touchDrag.offsetX = touch.clientX - rect.left;
    touchDrag.offsetY = touch.clientY - rect.top;

    // Create a visual ghost clone of the card
    var ghost = card.cloneNode(true);
    ghost.className = "task-card touch-drag-ghost";
    ghost.style.position = "fixed";
    ghost.style.zIndex = "9999";
    ghost.style.width = rect.width + "px";
    ghost.style.pointerEvents = "none";
    ghost.style.opacity = "0.85";
    ghost.style.left = touch.clientX - touchDrag.offsetX + "px";
    ghost.style.top = touch.clientY - touchDrag.offsetY + "px";
    ghost.style.transform = "rotate(2deg) scale(1.03)";
    ghost.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";

    document.body.appendChild(ghost);
    touchDrag.ghost = ghost;

    // Dim the original card
    card.classList.add("dragging");
  }

  function cancelTouchDrag(card) {
    clearTimeout(touchDrag.longPressTimer);
    touchDrag.longPressTimer = null;

    if (touchDrag.ghost && touchDrag.ghost.parentNode) {
      touchDrag.ghost.parentNode.removeChild(touchDrag.ghost);
    }
    touchDrag.ghost = null;

    document
      .querySelectorAll(".column-body.drag-over, .column-body.touch-drag-over")
      .forEach(function (el) {
        el.classList.remove("drag-over");
        el.classList.remove("touch-drag-over");
      });

    resetTouchDrag(card);
  }

  function resetTouchDrag(card) {
    if (card) card.classList.remove("dragging");
    touchDrag.active = false;
    touchDrag.taskId = null;
    touchDrag.sourceCol = null;
    touchDrag.ghost = null;
    touchDrag.startX = 0;
    touchDrag.startY = 0;
    touchDrag.offsetX = 0;
    touchDrag.offsetY = 0;
    touchDrag.longPressTriggered = false;
  }

  function highlightColumnUnder(clientX, clientY) {
    // Remove highlights from all column bodies
    document
      .querySelectorAll(".column-body.touch-drag-over")
      .forEach(function (el) {
        el.classList.remove("touch-drag-over");
      });

    var targetCol = getColumnElementAt(clientX, clientY);
    if (targetCol) {
      targetCol.classList.add("touch-drag-over");
    }
  }

  function getColumnAtPoint(clientX, clientY) {
    var el = getColumnElementAt(clientX, clientY);
    return el ? el.closest(".board-column").dataset.columnId : null;
  }

  function getColumnElementAt(clientX, clientY) {
    // Temporarily hide the ghost so it doesn't intercept the hit test
    var ghost = touchDrag.ghost;
    if (ghost) ghost.style.display = "none";

    var el = document.elementFromPoint(clientX, clientY);

    if (ghost) ghost.style.display = "";

    // Walk up to find a column-body or board-column
    while (
      el &&
      !el.classList.contains("column-body") &&
      !el.classList.contains("board-column")
    ) {
      el = el.parentElement;
    }

    // If we landed on a column-body, return it directly
    if (el && el.classList.contains("column-body")) return el;

    // If we landed on a board-column, find its column-body
    if (el && el.classList.contains("board-column")) {
      return el.querySelector(".column-body");
    }

    return null;
  }

  return {
    init: init,
    render: render,
    renderHeader: renderHeader,
  };
})();
