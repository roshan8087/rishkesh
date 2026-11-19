const CONFIG = Object.freeze({
  sheetName: "Itinerary Data",
  activitySheetName: "Activity History",
  deletedSheetName: "Recently Deleted",
  editorSheetName: "Editor History",
  maxPayloadLength: 400000,
  maxCellLength: 30000,
  maxSections: 200,
  lockTimeoutMs: 10000
});

function myFunction() {
  setup();
}

function doGet(e) {
  const callback = e && e.parameter ? String(e.parameter.callback || "") : "";

  try {
    const action = e && e.parameter ? String(e.parameter.action || "") : "";
    if (action !== "load" && action !== "history" && action !== "actionStatus") {
      return output_({ ok: false, error: "Unknown action." }, callback);
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(CONFIG.lockTimeoutMs);
    try {
      if (action === "load") return output_(readState_(), callback);
      if (action === "history") {
        const editorId = String(e.parameter.editorId || "");
        if (editorId) validateEditorId_(editorId);
        const editorState = editorId ? readEditorState_(editorId) : emptyEditorState_();
        const actions = readActions_();
        const state = readState_();
        return output_({
          ok: true,
          actions: actions,
          deletedItems: readDeletedItems_(actions),
          undoCount: editorState.undo.length,
          redoCount: editorState.redo.length,
          undoConflict: hasTransitionConflict_(editorState.undo, actions, state, "undo"),
          redoConflict: hasTransitionConflict_(editorState.redo, actions, state, "redo")
        }, callback);
      }

      const requestId = validateRequestId_(String(e.parameter.requestId || ""));
      const actionRecord = readActions_().find((entry) => entry.requestId === requestId);
      return output_({ ok: true, found: Boolean(actionRecord), action: actionRecord || null }, callback);
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return output_({ ok: false, error: error.message || "Could not read the shared itinerary." }, callback);
  }
}

function doPost(e) {
  let locked = false;
  let lock = null;
  try {
    if (!e || !e.postData || typeof e.postData.contents !== "string" || !e.postData.contents) {
      throw new Error("A request body is required.");
    }
    if (e.postData.contents.length > CONFIG.maxPayloadLength * 2 + 10000) {
      throw new Error("The request is too large.");
    }

    const request = JSON.parse(e.postData.contents);
    if (!request || typeof request !== "object" || Array.isArray(request)) {
      throw new Error("The request format is invalid.");
    }

    lock = LockService.getScriptLock();
    lock.waitLock(CONFIG.lockTimeoutMs);
    locked = true;

    let result;
    if (request.action === "mutate") result = mutate_(request);
    else if (request.action === "undo") result = transition_(request, "undo");
    else if (request.action === "redo") result = transition_(request, "redo");
    else if (request.action === "restore") result = restore_(request);
    else if (request.action === "purge") result = purge_(request);
    else throw new Error("Unknown action.");

    return output_(result);
  } catch (error) {
    return output_({ ok: false, conflict: error.conflict === true, error: error.message || "The request could not be completed." });
  } finally {
    if (locked) lock.releaseLock();
  }
}

function setup() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!spreadsheetId) {
    throw new Error("Add SPREADSHEET_ID in Project Settings > Script Properties before running setup.");
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  backupExistingSheets_(spreadsheet);
  const itinerary = ensureSheet_(spreadsheet, CONFIG.sheetName, ["revision", "updatedAt", "part", "json"]);
  const activity = ensureSheet_(spreadsheet, CONFIG.activitySheetName, [
    "revision", "actionId", "part", "parts", "timestamp", "editorName", "editorId",
    "type", "itemName", "previousValue", "newValue", "relatedActionId", "requestId", "changesJson"
  ]);
  ensureSheet_(spreadsheet, CONFIG.deletedSheetName, [
    "revision", "deletionId", "actionId", "part", "parts", "itemPath", "itemName",
    "deletedBy", "editorId", "deletedAt", "status", "valueJson"
  ]);
  ensureSheet_(spreadsheet, CONFIG.editorSheetName, [
    "editorId", "editorName", "stackType", "position", "actionId", "expectedRevisionsJson", "updatedAt"
  ]);

  const controlHeader = itinerary.getRange(1, 5).getValue();
  if (controlHeader !== "currentRevision") {
    const controlValues = itinerary.getRange(1, 5, 3, 1).getValues().map((row) => row[0]);
    if (controlValues.some((value) => value !== "" && value !== null)) {
      throw new Error(`The "${CONFIG.sheetName}" tab has unexpected data in column E. A backup was created, but the tab was not changed.`);
    }
    const revision = itinerary.getLastRow() > 1 ? Number(itinerary.getRange(2, 1).getValue()) : 0;
    itinerary.getRange(1, 5, 3, 1).setValues([["currentRevision"], [Number.isInteger(revision) ? revision : 0], [""]]);
  } else {
    const pointer = Number(itinerary.getRange(2, 5).getValue());
    if (!Number.isInteger(pointer) || pointer < 0) {
      throw new Error(`The current revision marker in "${CONFIG.sheetName}" is invalid. The backup was retained.`);
    }
  }

  return `Ready: ${CONFIG.sheetName}, ${activity.getName()}, ${CONFIG.deletedSheetName}, ${CONFIG.editorSheetName}`;
}

function backupExistingSheets_(spreadsheet) {
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
  spreadsheet.getSheets().slice().forEach((sheet) => {
    if (sheet.getName().indexOf("Backup - ") === 0) return;
    const baseName = `Backup - ${stamp} - ${sheet.getName()}`.slice(0, 95);
    let name = baseName;
    let suffix = 1;
    while (spreadsheet.getSheetByName(name)) {
      name = `${baseName.slice(0, 90)}-${suffix++}`;
    }
    sheet.copyTo(spreadsheet).setName(name);
  });
}

function ensureSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (headers.some((value, index) => existing[index] !== value)) {
      throw new Error(`The "${name}" tab already exists with an unexpected layout. No existing data was changed.`);
    }
  }
  return sheet;
}

function mutate_(request) {
  const editor = validateEditor_(request.editor);
  const requestId = validateRequestId_(request.requestId);
  if (!Number.isInteger(request.expectedRevision) || request.expectedRevision < 0) {
    throw new Error("The expected revision is invalid.");
  }
  if (request.data !== null) validateState_(request.data);
  if (request.baseData !== null) validateState_(request.baseData);

  const actions = readActions_();
  const existing = actions.find((entry) => entry.requestId === requestId);
  if (existing) return { ok: true, revision: existing.revision, actionId: existing.actionId, duplicate: true };

  const current = readState_();
  if (request.expectedRevision > current.revision) throw new Error("The expected revision is newer than the shared itinerary.");
  if (current.exists && request.baseData === null) {
    throw conflictError_("The shared itinerary was initialized by another editor.");
  }
  if (!current.exists && request.baseData !== null) {
    throw conflictError_("The shared itinerary was cleared or replaced. Reload before saving.");
  }

  const changes = current.exists
    ? diffValues_(request.baseData, request.data, [])
    : [{ path: [], beforeExists: false, beforeValue: null, afterExists: true, afterValue: clone_(request.data) }];
  if (!changes.length) return { ok: true, revision: current.revision, noop: true };

  changes.forEach((change) => {
    if (latestItemRevision_(actions, change.path) > request.expectedRevision) {
      throw conflictError_("Another editor changed the same item. Reload the shared itinerary before trying again.");
    }
    const actual = getAtPath_(current.data, change.path);
    if (actual.exists !== change.beforeExists ||
        (actual.exists && !sameValue_(actual.value, change.beforeValue))) {
      throw conflictError_("Another editor changed the same item. Reload the shared itinerary before trying again.");
    }
  });

  const updated = applyChanges_(current.data, changes, true);
  validateState_(updated);
  const type = classifyChanges_(changes);
  const editorState = readEditorState_(editor.id);
  editorState.editorName = editor.name;
  editorState.redo = [];

  const result = recordAction_(current, updated, changes, editor, type, requestId, "", editorState, true);
  return result;
}

function transition_(request, direction) {
  const editor = validateEditor_(request.editor);
  const requestId = validateRequestId_(request.requestId);
  const actions = readActions_();
  const duplicate = actions.find((entry) => entry.requestId === requestId);
  if (duplicate) return { ok: true, revision: duplicate.revision, actionId: duplicate.actionId, duplicate: true };

  const current = readState_();
  const editorState = readEditorState_(editor.id);
  editorState.editorName = editor.name;
  const stack = direction === "undo" ? editorState.undo : editorState.redo;
  if (!stack.length) throw new Error(`There is nothing to ${direction}.`);

  const entry = stack[stack.length - 1];
  const original = actions.find((action) => action.actionId === entry.actionId);
  if (!original) throw new Error("The action is no longer available in this editor's history.");
  const changes = direction === "undo" ? reverseChanges_(original.changes) : clone_(original.changes);
  const expectedSide = direction === "undo" ? "after" : "before";
  changes.forEach((change, index) => {
    const originalChange = original.changes[index];
    const expectedRevision = entry.expectedRevisions[itemKey_(originalChange.path)];
    if (latestItemRevision_(actions, originalChange.path) !== expectedRevision) {
      throw conflictError_("Undo/redo conflict: another editor changed the same item.");
    }
    const actual = getAtPath_(current.data, originalChange.path);
    const expectedExists = direction === "undo" ? originalChange.afterExists : originalChange.beforeExists;
    const expectedValue = direction === "undo" ? originalChange.afterValue : originalChange.beforeValue;
    if (actual.exists !== expectedExists || (actual.exists && !sameValue_(actual.value, expectedValue))) {
      throw conflictError_(`Undo/redo conflict: the item no longer matches the ${expectedSide} value.`);
    }
  });

  const updated = applyChanges_(current.data, changes, true);
  if (updated !== null) validateState_(updated);
  stack.pop();
  const type = direction === "undo" ? "UNDO" : "REDO";
  const transition = recordAction_(current, updated, changes, editor, type, requestId, original.actionId, editorState, false);
  const revisionMap = revisionsForChanges_(changes, transition.revision);

  if (direction === "undo") {
    editorState.redo.push({ actionId: original.actionId, expectedRevisions: revisionMap });
    updateStackRevisions_(editorState.undo, revisionMap);
  } else {
    editorState.undo.push({ actionId: transition.actionId, expectedRevisions: revisionMap });
  }
  saveEditorState_(editorState);
  return transition;
}

function restore_(request) {
  const editor = validateEditor_(request.editor);
  const requestId = validateRequestId_(request.requestId);
  validateDeletionId_(request.deletionId);
  const existing = readActions_().find((entry) => entry.requestId === requestId);
  if (existing) return { ok: true, revision: existing.revision, actionId: existing.actionId, duplicate: true };

  const current = readState_();
  const deleted = readDeletedItems_().find((entry) => entry.deletionId === request.deletionId);
  if (!deleted) throw new Error("That item is not in Recently Deleted.");
  const path = JSON.parse(deleted.itemPath);
  const actual = getAtPath_(current.data, path);
  if (actual.exists) throw conflictError_("The item already exists in the shared itinerary. Reload before restoring.");

  const changes = [{
    path: path,
    beforeExists: false,
    beforeValue: null,
    afterExists: true,
    afterValue: clone_(deleted.value)
  }];
  const updated = applyChanges_(current.data, changes, true);
  validateState_(updated);
  const editorState = readEditorState_(editor.id);
  editorState.editorName = editor.name;
  editorState.redo = [];
  const result = recordAction_(current, updated, changes, editor, "RESTORE", requestId, deleted.actionId, editorState, true);
  markDeletedStatus_(deleted.deletionId, "RESTORED");
  return result;
}

function purge_(request) {
  const editor = validateEditor_(request.editor);
  const requestId = validateRequestId_(request.requestId);
  validateDeletionId_(request.deletionId);
  const existing = readActions_().find((entry) => entry.requestId === requestId);
  if (existing) return { ok: true, revision: existing.revision, actionId: existing.actionId, duplicate: true };

  const current = readState_();
  const deleted = readDeletedItems_().find((entry) => entry.deletionId === request.deletionId);
  if (!deleted) throw new Error("That item is not in Recently Deleted.");

  const path = JSON.parse(deleted.itemPath);
  const change = {
    path: path,
    beforeExists: true,
    beforeValue: clone_(deleted.value),
    afterExists: false,
    afterValue: null
  };
  const editorState = readEditorState_(editor.id);
  editorState.editorName = editor.name;
  editorState.redo = [];
  const result = recordAction_(current, current.data, [change], editor, "DELETE", requestId, deleted.actionId, editorState, false);
  markDeletedStatus_(deleted.deletionId, "PERMANENTLY_DELETED");
  markDeletedStatus_(`${result.actionId}:0`, "PERMANENTLY_DELETED");
  saveEditorState_(editorState);
  return result;
}

function recordAction_(current, updated, changes, editor, type, requestId, relatedActionId, editorState, addToUndo) {
  const revision = current.revision + 1;
  const actionId = Utilities.getUuid();
  const timestamp = new Date().toISOString();
  const itemName = describeChanges_(changes, current.data, updated);
  const action = {
    revision: revision,
    actionId: actionId,
    timestamp: timestamp,
    editorName: editor.name,
    editorId: editor.id,
    type: type,
    itemName: itemName,
    relatedActionId: relatedActionId || "",
    requestId: requestId,
    changes: clone_(changes)
  };

  appendAction_(action);
  if (type !== "DELETE" || changes.some((change) => !change.afterExists)) {
    appendDeletedRecords_(action);
  }
  writeState_(updated === null ? "null" : JSON.stringify(updated), revision);
  if (changes.some((change) => change.afterExists)) markRestoredPaths_(changes);

  if (addToUndo) {
    editorState.undo.push({
      actionId: actionId,
      expectedRevisions: revisionsForChanges_(changes, revision)
    });
  }
  if (editorState && addToUndo) saveEditorState_(editorState);
  return { ok: true, revision: revision, actionId: actionId };
}

function appendAction_(action) {
  const sheet = getRequiredSheet_(CONFIG.activitySheetName);
  const changesText = JSON.stringify(action.changes);
  const chunks = splitText_(changesText);
  const first = action.changes[0] || {};
  const previous = safeSummary_(action.changes.map((change) => change.beforeExists ? change.beforeValue : null));
  const next = safeSummary_(action.changes.map((change) => change.afterExists ? change.afterValue : null));
  const rows = chunks.map((chunk, index) => [
    action.revision, action.actionId, index, chunks.length, action.timestamp, action.editorName,
    action.editorId, action.type, action.itemName, index === 0 ? previous : "",
    index === 0 ? next : "", action.relatedActionId, action.requestId, chunk
  ]);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function appendDeletedRecords_(action) {
  const sheet = getRequiredSheet_(CONFIG.deletedSheetName);
  const rows = [];
  action.changes.forEach((change, index) => {
    if (!change.beforeExists || change.afterExists) return;
    const deletionId = `${action.actionId}:${index}`;
    const valueText = JSON.stringify(change.beforeValue);
    const chunks = splitText_(valueText);
    chunks.forEach((chunk, part) => rows.push([
      action.revision, deletionId, action.actionId, part, chunks.length, JSON.stringify(change.path),
      action.itemName, action.editorName, action.editorId, action.timestamp, "DELETED", chunk
    ]));
  });
  if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function readActions_() {
  const sheet = getRequiredSheet_(CONFIG.activitySheetName);
  if (sheet.getLastRow() < 2) return [];
  const committedRevision = readState_().revision;
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 14).getValues()
    .filter((row) => Number(row[0]) <= committedRevision);
  const grouped = {};
  rows.forEach((row) => {
    if (!row[1]) return;
    const id = String(row[1]);
    if (!grouped[id]) {
      grouped[id] = {
        revision: Number(row[0]), actionId: id, timestamp: String(row[4]),
        editorName: String(row[5]), editorId: String(row[6]), type: String(row[7]),
        itemName: String(row[8]), previousValue: String(row[9] || ""),
        newValue: String(row[10] || ""), relatedActionId: String(row[11] || ""),
        requestId: String(row[12] || ""), parts: []
      };
    }
    grouped[id].parts[Number(row[2])] = String(row[13] || "");
  });
  return Object.keys(grouped).map((id) => {
    const action = grouped[id];
    action.changes = JSON.parse(action.parts.join(""));
    delete action.parts;
    return action;
  }).sort((left, right) => left.revision - right.revision);
}

function readDeletedItems_(committedActions) {
  const sheet = getRequiredSheet_(CONFIG.deletedSheetName);
  if (sheet.getLastRow() < 2) return [];
  const actions = committedActions || readActions_();
  const committedIds = {};
  actions.forEach((action) => { committedIds[action.actionId] = true; });
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).getValues()
    .filter((row) => committedIds[String(row[2])]);
  const grouped = {};
  rows.forEach((row) => {
    if (!row[1]) return;
    const id = String(row[1]);
    if (!grouped[id]) {
      grouped[id] = {
        revision: Number(row[0]), deletionId: id, actionId: String(row[2]), itemPath: String(row[5]),
        itemName: String(row[6]), deletedBy: String(row[7]), editorId: String(row[8]),
        deletedAt: String(row[9]), status: String(row[10]), parts: []
      };
    }
    grouped[id].parts[Number(row[3])] = String(row[11] || "");
  });
  return Object.keys(grouped).map((id) => {
    const item = grouped[id];
    item.value = JSON.parse(item.parts.join(""));
    delete item.parts;
    return item;
  }).filter((item) => {
    if (item.status !== "DELETED") return false;
    const key = pathKey_(JSON.parse(item.itemPath));
    const restoredOrPurged = actions.some((action) => action.revision > item.revision && (
      (action.type === "DELETE" && action.relatedActionId === item.actionId) ||
      action.changes.some((change) => change.afterExists && pathKey_(change.path) === key)
    ));
    return !restoredOrPurged;
  }).sort((left, right) => right.deletedAt.localeCompare(left.deletedAt));
}

function markDeletedStatus_(deletionId, status) {
  const sheet = getRequiredSheet_(CONFIG.deletedSheetName);
  if (sheet.getLastRow() < 2) return;
  const ids = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
  ids.forEach((row, index) => {
    if (String(row[0]) === deletionId) sheet.getRange(index + 2, 11).setValue(status);
  });
}

function markRestoredPaths_(changes) {
  const sheet = getRequiredSheet_(CONFIG.deletedSheetName);
  if (sheet.getLastRow() < 2) return;
  const rows = sheet.getRange(2, 2, sheet.getLastRow() - 1, 10).getValues();
  const paths = changes.filter((change) => change.afterExists).map((change) => pathKey_(change.path));
  rows.forEach((row, index) => {
    if (row[9] === "DELETED" && paths.indexOf(pathKey_(JSON.parse(row[4]))) >= 0) {
      sheet.getRange(index + 2, 11).setValue("RESTORED");
    }
  });
}

function readEditorState_(editorId) {
  const state = emptyEditorState_();
  state.editorId = editorId;
  if (!editorId) return state;

  readActions_().forEach((action) => {
    if (action.editorId !== editorId) return;
    state.editorName = action.editorName;
    const revisionMap = revisionsForChanges_(action.changes, action.revision);
    if ((action.type === "ADD" || action.type === "EDIT" || action.type === "RESTORE" ||
         (action.type === "DELETE" && !action.relatedActionId))) {
      state.undo.push({ actionId: action.actionId, expectedRevisions: revisionMap });
      state.redo = [];
    } else if (action.type === "DELETE" && action.relatedActionId) {
      state.redo = [];
    } else if (action.type === "UNDO") {
      if (state.undo.length) state.undo.pop();
      state.redo.push({ actionId: action.relatedActionId, expectedRevisions: revisionMap });
      updateStackRevisions_(state.undo, revisionMap);
    } else if (action.type === "REDO") {
      if (state.redo.length) state.redo.pop();
      state.undo.push({ actionId: action.actionId, expectedRevisions: revisionMap });
    }
  });
  return state;
}

function emptyEditorState_() {
  return { editorId: "", editorName: "", undo: [], redo: [] };
}

function saveEditorState_(state) {
  const sheet = getRequiredSheet_(CONFIG.editorSheetName);
  const lastRow = sheet.getLastRow();
  const remaining = lastRow < 2 ? [] : sheet.getRange(2, 1, lastRow - 1, 7).getValues()
    .filter((row) => String(row[0]) !== state.editorId);
  const timestamp = new Date().toISOString();
  const rows = remaining.concat(
    state.undo.map((entry, index) => [
      state.editorId, state.editorName, "undo", index, entry.actionId,
      JSON.stringify(entry.expectedRevisions), timestamp
    ]),
    state.redo.map((entry, index) => [
      state.editorId, state.editorName, "redo", index, entry.actionId,
      JSON.stringify(entry.expectedRevisions), timestamp
    ])
  );
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 7).clearContent();
  if (rows.length) sheet.getRange(2, 1, rows.length, 7).setValues(rows);
}

function latestItemRevision_(actions, path) {
  const key = itemKey_(path);
  let latest = 0;
  actions.forEach((action) => {
    if (action.changes.some((change) => itemKey_(change.path) === key)) {
      latest = Math.max(latest, action.revision);
    }
  });
  return latest;
}

function revisionsForChanges_(changes, revision) {
  const map = {};
  changes.forEach((change) => { map[itemKey_(change.path)] = revision; });
  return map;
}

function updateStackRevisions_(stack, updatedRevisions) {
  stack.forEach((entry) => {
    Object.keys(updatedRevisions).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(entry.expectedRevisions, key)) {
        entry.expectedRevisions[key] = updatedRevisions[key];
      }
    });
  });
}

function reverseChanges_(changes) {
  return changes.map((change) => ({
    path: clone_(change.path),
    beforeExists: change.afterExists,
    beforeValue: clone_(change.afterValue),
    afterExists: change.beforeExists,
    afterValue: clone_(change.beforeValue)
  }));
}

function diffValues_(before, after, path) {
  if (sameValue_(before, after)) return [];
  if (Array.isArray(before) && Array.isArray(after)) {
    if (isIdArray_(before) && isIdArray_(after)) {
      const changes = [];
      const oldMap = {};
      const newMap = {};
      before.forEach((item) => { oldMap[item.id] = item; });
      after.forEach((item) => { newMap[item.id] = item; });
      before.forEach((item) => {
        if (!Object.prototype.hasOwnProperty.call(newMap, item.id)) {
          changes.push(makeChange_(path.concat([{ id: String(item.id), index: before.indexOf(item) }]), true, item, false, null));
        } else {
          changes.push.apply(changes, diffValues_(item, newMap[item.id], path.concat([{ id: String(item.id), index: before.indexOf(item) }])));
        }
      });
      after.forEach((item) => {
        if (!Object.prototype.hasOwnProperty.call(oldMap, item.id)) {
          changes.push(makeChange_(path.concat([{ id: String(item.id), index: after.indexOf(item) }]), false, null, true, item));
        }
      });
      return changes;
    }
    if (before.length === after.length) {
      let changes = [];
      before.forEach((item, index) => {
        changes = changes.concat(diffValues_(item, after[index], path.concat([{ index: index }])));
      });
      return changes;
    }
    return [makeChange_(path, true, before, true, after)];
  }
  if (isPlainObject_(before) && isPlainObject_(after)) {
    let changes = [];
    const keys = {};
    Object.keys(before).concat(Object.keys(after)).forEach((key) => { keys[key] = true; });
    Object.keys(keys).forEach((key) => {
      const beforeExists = Object.prototype.hasOwnProperty.call(before, key);
      const afterExists = Object.prototype.hasOwnProperty.call(after, key);
      if (beforeExists && afterExists) {
        changes = changes.concat(diffValues_(before[key], after[key], path.concat([key])));
      } else {
        changes.push(makeChange_(path.concat([key]), beforeExists, before[key], afterExists, after[key]));
      }
    });
    return changes;
  }
  return [makeChange_(path, true, before, true, after)];
}

function makeChange_(path, beforeExists, beforeValue, afterExists, afterValue) {
  return {
    path: clone_(path),
    beforeExists: beforeExists,
    beforeValue: beforeExists ? clone_(beforeValue) : null,
    afterExists: afterExists,
    afterValue: afterExists ? clone_(afterValue) : null
  };
}

function isIdArray_(value) {
  return value.every((item) => item && typeof item === "object" && !Array.isArray(item) &&
    (typeof item.id === "string" || typeof item.id === "number")) &&
    value.map((item) => String(item.id)).filter((id, index, all) => all.indexOf(id) === index).length === value.length;
}

function getAtPath_(root, path) {
  if (!path.length) return { exists: root !== null && root !== undefined, value: root };
  let value = root;
  for (let index = 0; index < path.length; index += 1) {
    const segment = path[index];
    if (value === null || value === undefined) return { exists: false, value: null };
    if (segment && typeof segment === "object" && Object.prototype.hasOwnProperty.call(segment, "id")) {
      if (!Array.isArray(value)) return { exists: false, value: null };
      const position = value.findIndex((item) => String(item.id) === String(segment.id));
      if (position < 0) return { exists: false, value: null };
      value = value[position];
    } else if (segment && typeof segment === "object" && Object.prototype.hasOwnProperty.call(segment, "index")) {
      if (!Array.isArray(value) || segment.index < 0 || segment.index >= value.length) return { exists: false, value: null };
      value = value[segment.index];
    } else {
      if (!Object.prototype.hasOwnProperty.call(value, segment)) return { exists: false, value: null };
      value = value[segment];
    }
  }
  return { exists: true, value: value };
}

function applyChanges_(root, changes, forward) {
  let value = clone_(root);
  changes.forEach((change) => {
    const exists = forward ? change.afterExists : change.beforeExists;
    const next = forward ? change.afterValue : change.beforeValue;
    value = setAtPath_(value, change.path, exists, next);
  });
  return value;
}

function setAtPath_(root, path, exists, next) {
  if (!path.length) return exists ? clone_(next) : null;
  let parent = root;
  for (let index = 0; index < path.length - 1; index += 1) {
    parent = descend_(parent, path[index]);
    if (parent === null || parent === undefined) throw conflictError_("The item path no longer exists.");
  }
  const final = path[path.length - 1];
  if (final && typeof final === "object" && Object.prototype.hasOwnProperty.call(final, "id")) {
    if (!Array.isArray(parent)) throw conflictError_("The item list changed. Reload before editing.");
    const position = parent.findIndex((item) => String(item.id) === String(final.id));
    if (exists && position < 0) parent.splice(Math.min(final.index ?? parent.length, parent.length), 0, clone_(next));
    else if (!exists && position >= 0) parent.splice(position, 1);
    else if (exists) parent[position] = clone_(next);
  } else if (final && typeof final === "object" && Object.prototype.hasOwnProperty.call(final, "index")) {
    if (!Array.isArray(parent)) throw conflictError_("The item list changed. Reload before editing.");
    if (exists) parent[final.index] = clone_(next);
    else parent.splice(final.index, 1);
  } else if (exists) parent[final] = clone_(next);
  else delete parent[final];
  return root;
}

function descend_(parent, segment) {
  if (segment && typeof segment === "object" && Object.prototype.hasOwnProperty.call(segment, "id")) {
    if (!Array.isArray(parent)) return null;
    const item = parent.find((entry) => String(entry.id) === String(segment.id));
    return item === undefined ? null : item;
  }
  if (segment && typeof segment === "object" && Object.prototype.hasOwnProperty.call(segment, "index")) {
    return Array.isArray(parent) ? parent[segment.index] : null;
  }
  return parent && Object.prototype.hasOwnProperty.call(parent, segment) ? parent[segment] : null;
}

function classifyChanges_(changes) {
  const allAdds = changes.every((change) => !change.beforeExists && change.afterExists);
  const allDeletes = changes.every((change) => change.beforeExists && !change.afterExists);
  return allAdds ? "ADD" : (allDeletes ? "DELETE" : "EDIT");
}

function describeChanges_(changes, before, after) {
  if (!changes.length) return "Recently deleted item";
  const ids = [];
  changes.forEach((change) => change.path.forEach((segment) => {
    if (segment && typeof segment === "object" && Object.prototype.hasOwnProperty.call(segment, "id")) ids.push(String(segment.id));
    else if (typeof segment === "string" && segment !== "hero" && segment !== "sections") ids.push(segment);
  }));
  const section = findSectionByPath_(before, after, ids);
  if (section) return String(section.title || section.id);
  return changes.length === 1 ? changes[0].path.map(pathLabel_).join(" / ") || "Itinerary" : `${changes.length} itinerary fields`;
}

function findSectionByPath_(before, after, ids) {
  const candidates = [];
  [before, after].forEach((state) => {
    if (state && Array.isArray(state.sections)) candidates.push.apply(candidates, state.sections);
  });
  const section = candidates.find((entry) => ids.indexOf(String(entry.id)) >= 0);
  if (!section) return null;
  const nested = ids.find((id) => id !== String(section.id));
  if (nested) {
    const found = findObjectById_(section, nested);
    if (found && (found.name || found.title)) return { title: `${section.title} / ${found.name || found.title}` };
  }
  return section;
}

function findObjectById_(value, id) {
  if (!value || typeof value !== "object") return null;
  if (!Array.isArray(value) && String(value.id) === id) return value;
  const children = Array.isArray(value) ? value : Object.keys(value).map((key) => value[key]);
  for (let index = 0; index < children.length; index += 1) {
    const found = findObjectById_(children[index], id);
    if (found) return found;
  }
  return null;
}

function pathLabel_(segment) {
  if (segment && typeof segment === "object" && segment.id !== undefined) return String(segment.id);
  if (segment && typeof segment === "object" && segment.index !== undefined) return String(Number(segment.index) + 1);
  return String(segment);
}

function validateEditor_(editor) {
  if (!editor || typeof editor !== "object") throw new Error("Enter your name before editing.");
  const name = String(editor.name || "").trim();
  const id = String(editor.id || "");
  if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new Error("Editor name must be 1–80 printable characters.");
  }
  validateEditorId_(id);
  return { name: name, id: id };
}

function validateEditorId_(id) {
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(String(id))) throw new Error("The editor ID is invalid.");
  return String(id);
}

function validateDeletionId_(id) {
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{16,80}:\d+$/.test(id)) {
    throw new Error("The deleted item ID is invalid.");
  }
}

function validateRequestId_(id) {
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(id)) throw new Error("The action ID is invalid.");
  return id;
}

function conflictError_(message) {
  const error = new Error(message);
  error.conflict = true;
  return error;
}

function pathKey_(path) {
  return JSON.stringify(path.map((segment) => {
    if (segment && typeof segment === "object" && Object.prototype.hasOwnProperty.call(segment, "id")) {
      return { id: String(segment.id) };
    }
    return segment;
  }));
}

function itemKey_(path) {
  let deepestItem = -1;
  path.forEach((segment, index) => {
    if (segment && typeof segment === "object" &&
        (Object.prototype.hasOwnProperty.call(segment, "id") ||
         Object.prototype.hasOwnProperty.call(segment, "index"))) deepestItem = index;
  });
  if (deepestItem >= 0) return pathKey_(path.slice(0, deepestItem + 1));
  return pathKey_(path.length ? path.slice(0, 1) : []);
}

function hasTransitionConflict_(stack, actions, current, direction) {
  if (!stack.length) return false;
  const entry = stack[stack.length - 1];
  const original = actions.find((action) => action.actionId === entry.actionId);
  if (!original) return true;
  return original.changes.some((change) => {
    if (latestItemRevision_(actions, change.path) !== entry.expectedRevisions[itemKey_(change.path)]) return true;
    const actual = getAtPath_(current.data, change.path);
    const shouldExist = direction === "undo" ? change.afterExists : change.beforeExists;
    const shouldValue = direction === "undo" ? change.afterValue : change.beforeValue;
    return actual.exists !== shouldExist || (actual.exists && !sameValue_(actual.value, shouldValue));
  });
}

function sameValue_(left, right) {
  return canonical_(left) === canonical_(right);
}

function canonical_(value) {
  if (Array.isArray(value)) return `[${value.map(canonical_).join(",")}]`;
  if (isPlainObject_(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical_(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function isPlainObject_(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clone_(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function splitText_(value) {
  const text = String(value || "");
  const chunks = text.match(new RegExp(`[\\s\\S]{1,${CONFIG.maxCellLength}}`, "g"));
  return chunks || [""];
}

function safeSummary_(value) {
  const summary = JSON.stringify(value);
  return summary.length <= CONFIG.maxCellLength ? summary : "[Full value is stored in the action history chunks]";
}

function readState_() {
  const sheet = getRequiredSheet_(CONFIG.sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: true, exists: false, revision: 0, updatedAt: "", data: null };

  const pointer = sheet.getRange(2, 5).getValue();
  const rows = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  const legacyRevision = Number(rows[0][0]);
  const revision = pointer !== "" && pointer !== null
    ? Number(pointer)
    : legacyRevision;
  if (!Number.isInteger(revision) || revision < 0) throw new Error("The saved revision in the sheet is invalid.");

  const chunks = rows.filter((row) => Number(row[0]) === revision && row[3] !== "")
    .map((row) => ({ part: Number(row[2]), text: String(row[3]) }))
    .sort((left, right) => left.part - right.part);
  if (!chunks.length) {
    const updatedAt = sheet.getRange(3, 5).getValue();
    return { ok: true, exists: false, revision: revision, updatedAt: String(updatedAt || ""), data: null };
  }
  if (chunks.some((chunk, index) => chunk.part !== index)) throw new Error("The saved itinerary chunks are incomplete.");

  const data = JSON.parse(chunks.map((chunk) => chunk.text).join(""));
  if (data !== null) validateState_(data);
  return {
    ok: true,
    exists: data !== null,
    revision: revision,
    updatedAt: String(sheet.getRange(3, 5).getValue() || rows[0][1] || ""),
    data: data
  };
}

function writeState_(serialized, revision) {
  const sheet = getRequiredSheet_(CONFIG.sheetName);
  const previousLastRow = sheet.getLastRow();
  const chunks = serialized === "null" ? [] : splitText_(serialized);
  const rows = chunks.map((chunk, index) => [revision, new Date().toISOString(), index, chunk]);
  if (rows.length) sheet.getRange(previousLastRow + 1, 1, rows.length, 4).setValues(rows);

  sheet.getRange(2, 5, 2, 1).setValues([[revision], [new Date().toISOString()]]);
  if (previousLastRow > 1) sheet.getRange(2, 1, previousLastRow - 1, 4).clearContent();
}

function getRequiredSheet_(name) {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!spreadsheetId) throw new Error("Set SPREADSHEET_ID in Project Settings > Script Properties.");
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(name);
  if (!sheet) throw new Error(`Run setup() once to create the "${name}" tab.`);
  return sheet;
}

function validateState_(data) {
  if (!data || typeof data !== "object" || Array.isArray(data) ||
      !data.hero || typeof data.hero !== "object" || !Array.isArray(data.sections)) {
    throw new Error("The itinerary data format is invalid.");
  }
  if (data.sections.length > CONFIG.maxSections) throw new Error(`The itinerary cannot contain more than ${CONFIG.maxSections} sections.`);
  const serialized = JSON.stringify(data);
  if (serialized.length > CONFIG.maxPayloadLength) throw new Error("The itinerary is too large to save.");
  validateValues_(data, 0);
  return serialized;
}

function validateValues_(value, depth) {
  if (depth > 30) throw new Error("The itinerary data is nested too deeply.");
  if (typeof value === "string") {
    if (value.length > 10000) throw new Error("A text field is too long.");
    return;
  }
  if (value === null || typeof value === "boolean" || typeof value === "number") return;
  if (Array.isArray(value)) {
    if (value.length > 2000) throw new Error("The itinerary contains too many items.");
    value.forEach((entry) => validateValues_(entry, depth + 1));
    return;
  }
  if (!value || typeof value !== "object") throw new Error("The itinerary contains unsupported data.");
  Object.keys(value).forEach((key) => {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      throw new Error("The itinerary contains an unsupported field name.");
    }
    const entry = value[key];
    if (key.toLowerCase() === "url" && typeof entry === "string" && entry) {
      const isWebUrl = /^https?:\/\/\S+$/i.test(entry);
      const isPdfPath = entry === "./public/itinerary/rishikesh-itinerary-original.pdf" ||
        entry === "public/itinerary/rishikesh-itinerary-original.pdf";
      if (!isWebUrl && !isPdfPath) throw new Error("Links must use http:// or https://.");
    }
    validateValues_(entry, depth + 1);
  });
}

function output_(payload, callback) {
  const json = JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService.createTextOutput(`${callback}(${json});`).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
