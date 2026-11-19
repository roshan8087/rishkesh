const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

class MockRange {
  constructor(sheet, row, column, rowCount = 1, columnCount = 1) {
    Object.assign(this, { sheet, row, column, rowCount, columnCount });
  }

  getValues() {
    return Array.from({ length: this.rowCount }, (_, rowOffset) =>
      Array.from({ length: this.columnCount }, (_, columnOffset) =>
        this.sheet.valueAt(this.row + rowOffset, this.column + columnOffset)));
  }

  setValues(values) {
    values.forEach((row, rowOffset) => row.forEach((value, columnOffset) => {
      this.sheet.setValueAt(this.row + rowOffset, this.column + columnOffset, value);
    }));
    return this;
  }

  getValue() {
    return this.sheet.valueAt(this.row, this.column);
  }

  setValue(value) {
    this.sheet.setValueAt(this.row, this.column, value);
    return this;
  }

  clearContent() {
    for (let row = 0; row < this.rowCount; row += 1) {
      for (let column = 0; column < this.columnCount; column += 1) {
        this.sheet.setValueAt(this.row + row, this.column + column, "");
      }
    }
    return this;
  }
}

class MockSheet {
  constructor(name, rows = []) {
    this.name = name;
    this.rows = rows.map((row) => row.slice());
  }

  getName() { return this.name; }
  setName(name) { this.name = name; return this; }

  getLastRow() {
    for (let index = this.rows.length - 1; index >= 0; index -= 1) {
      if (this.rows[index].some((value) => value !== "" && value !== null && value !== undefined)) return index + 1;
    }
    return 0;
  }

  getRange(row, column, rowCount = 1, columnCount = 1) {
    return new MockRange(this, row, column, rowCount, columnCount);
  }

  valueAt(row, column) {
    return this.rows[row - 1]?.[column - 1] ?? "";
  }

  setValueAt(row, column, value) {
    while (this.rows.length < row) this.rows.push([]);
    while (this.rows[row - 1].length < column) this.rows[row - 1].push("");
    this.rows[row - 1][column - 1] = value;
  }

  copyTo(spreadsheet) {
    return spreadsheet.addSheet(new MockSheet(`Copy of ${this.name}`, this.rows));
  }
}

class MockSpreadsheet {
  constructor(sheets) { this.sheets = sheets; }
  getSheets() { return this.sheets.slice(); }
  getSheetByName(name) { return this.sheets.find((sheet) => sheet.name === name) || null; }
  insertSheet(name) { return this.addSheet(new MockSheet(name)); }
  addSheet(sheet) { this.sheets.push(sheet); return sheet; }
}

function setupHarness() {
  const initial = {
    hero: { title: "Trip" },
    sections: [{
      id: "places",
      title: "Places",
      items: [{ id: "lake", name: "Blue Lake" }, { id: "falls", name: "Waterfall" }],
      days: [{ date: "Travel day", events: [{ text: "Breakfast" }, { text: "Train" }] }]
    }]
  };
  const spreadsheet = new MockSpreadsheet([
    new MockSheet("Itinerary Data", [
      ["revision", "updatedAt", "part", "json"],
      [0, "2026-01-01T00:00:00.000Z", 0, JSON.stringify(initial)]
    ])
  ]);
  const context = createContext(spreadsheet);
  context.setup();
  return { context, spreadsheet, initial };
}

function createContext(spreadsheet) {
  let uuid = 0;
  const context = {
    console,
    JSON,
    Math,
    Date,
    Object,
    Array,
    Number,
    String,
    RegExp,
    Error,
    Utilities: {
      getUuid: () => `generated-action-${++uuid}`,
      formatDate: (date, timezone, format) => `${format}-${date.getTime()}`
    },
    Session: { getScriptTimeZone: () => "UTC" },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: () => "test-sheet" })
    },
    SpreadsheetApp: { openById: () => spreadsheet },
    LockService: {
      getScriptLock: () => ({ waitLock() {}, releaseLock() {} })
    },
    ContentService: {
      MimeType: { JSON: "application/json", JAVASCRIPT: "text/javascript" },
      createTextOutput: (content) => ({
        content,
        setMimeType() { return this; },
        getContent() { return this.content; }
      })
    }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "Code.gs"), "utf8"), context);
  return context;
}

function post(context, request) {
  return JSON.parse(context.doPost({ postData: { contents: JSON.stringify(request) } }).getContent());
}

function load(context) {
  return JSON.parse(context.doGet({ parameter: { action: "load" } }).getContent());
}

function makeEditor(name, id) { return { name, id }; }
function makeRequestId(id) { return `request-${id}-0000000000`; }

test("two editors undo and redo only their own different-item actions across reloads", () => {
  const { context, spreadsheet, initial } = setupHarness();
  const originalRows = spreadsheet.getSheets().find((sheet) => sheet.name.startsWith("Backup - ") && sheet.name.endsWith(" - Itinerary Data"));
  assert.ok(originalRows, "setup must preserve a copy of the pre-existing itinerary tab");
  assert.equal(originalRows.getRange(2, 4).getValue(), JSON.stringify(initial));

  const editorA = makeEditor("A", "editor-A-000000001");
  const editorB = makeEditor("B", "editor-B-000000002");
  const aData = structuredClone(initial);
  aData.sections[0].items[0].name = "A edit";
  assert.equal(post(context, {
    action: "mutate", editor: editorA, requestId: makeRequestId("A-edit"),
    expectedRevision: 0, baseData: initial, data: aData
  }).ok, true);

  const bData = structuredClone(initial);
  bData.sections[0].items[1].name = "B edit";
  assert.equal(post(context, {
    action: "mutate", editor: editorB, requestId: makeRequestId("B-edit"),
    expectedRevision: 0, baseData: initial, data: bData
  }).ok, true);
  assert.deepEqual(load(context).data.sections[0].items.map((item) => item.name), ["A edit", "B edit"]);

  const undoA = post(context, {
    action: "undo", editor: editorA, requestId: makeRequestId("A-undo")
  });
  assert.equal(undoA.ok, true, JSON.stringify(undoA));
  assert.deepEqual(load(context).data.sections[0].items.map((item) => item.name), ["Blue Lake", "B edit"]);

  assert.equal(post(context, {
    action: "undo", editor: editorB, requestId: makeRequestId("B-undo")
  }).ok, true);
  assert.deepEqual(load(context).data.sections[0].items.map((item) => item.name), ["Blue Lake", "Waterfall"]);

  assert.equal(post(context, {
    action: "redo", editor: editorA, requestId: makeRequestId("A-redo")
  }).ok, true);
  assert.equal(post(context, {
    action: "redo", editor: editorB, requestId: makeRequestId("B-redo")
  }).ok, true);
  assert.deepEqual(load(context).data.sections[0].items.map((item) => item.name), ["A edit", "B edit"]);
  const refreshedContext = createContext(spreadsheet);
  assert.deepEqual(load(refreshedContext).data.sections[0].items.map((item) => item.name), ["A edit", "B edit"]);
  const refreshedHistory = JSON.parse(refreshedContext.doGet({
    parameter: { action: "history", editorId: editorA.id }
  }).getContent());
  assert.ok(refreshedHistory.actions.length >= 6);
  assert.equal(refreshedHistory.undoCount, 1);
  assert.equal(refreshedHistory.redoCount, 0);
});

test("delete, restore, conflict detection, and persisted history survive reloads", () => {
  const { context, initial } = setupHarness();
  const editorA = makeEditor("A", "editor-A-000000001");
  const editorB = makeEditor("B", "editor-B-000000002");
  const deletedData = structuredClone(initial);
  deletedData.sections[0].items = deletedData.sections[0].items.filter((item) => item.id !== "falls");
  const deletion = post(context, {
    action: "mutate", editor: editorA, requestId: makeRequestId("delete"),
    expectedRevision: 0, baseData: initial, data: deletedData
  });
  assert.equal(deletion.ok, true);

  let history = JSON.parse(context.doGet({
    parameter: { action: "history", editorId: editorB.id }
  }).getContent());
  assert.equal(history.deletedItems.length, 1);
  assert.equal(history.deletedItems[0].deletedBy, "A");
  assert.equal(history.deletedItems[0].value.name, "Waterfall");

  const restore = post(context, {
    action: "restore", editor: editorB, deletionId: history.deletedItems[0].deletionId,
    requestId: makeRequestId("restore")
  });
  assert.equal(restore.ok, true);
  assert.deepEqual(load(context).data.sections[0].items.map((item) => item.id), ["lake", "falls"]);

  const secondDeleteBase = load(context);
  const secondDeleteData = structuredClone(secondDeleteBase.data);
  secondDeleteData.sections[0].items = secondDeleteData.sections[0].items.filter((item) => item.id !== "falls");
  post(context, {
    action: "mutate", editor: editorA, requestId: makeRequestId("delete-again"),
    expectedRevision: secondDeleteBase.revision, baseData: secondDeleteBase.data, data: secondDeleteData
  });
  history = JSON.parse(context.doGet({
    parameter: { action: "history", editorId: editorB.id }
  }).getContent());
  const purge = post(context, {
    action: "purge", editor: editorB, deletionId: history.deletedItems[0].deletionId,
    requestId: makeRequestId("purge")
  });
  assert.equal(purge.ok, true);
  history = JSON.parse(context.doGet({
    parameter: { action: "history", editorId: editorB.id }
  }).getContent());
  assert.equal(history.deletedItems.length, 0);

  const current = load(context);
  const latestBase = current.data;
  const aEdit = structuredClone(latestBase);
  aEdit.sections[0].items[0].name = "A latest";
  assert.equal(post(context, {
    action: "mutate", editor: editorA, requestId: makeRequestId("simultaneous-A"),
    expectedRevision: current.revision, baseData: latestBase, data: aEdit
  }).ok, true);

  const bEdit = structuredClone(latestBase);
  bEdit.sections[0].items[0].name = "B stale";
  const conflict = post(context, {
    action: "mutate", editor: editorB, requestId: makeRequestId("simultaneous-B"),
    expectedRevision: current.revision, baseData: latestBase, data: bEdit
  });
  assert.equal(conflict.ok, false);
  assert.equal(conflict.conflict, true);
  assert.match(conflict.error, /same item/i);

  const refreshed = load(context);
  assert.equal(refreshed.data.sections[0].items[0].name, "A latest");
  history = JSON.parse(context.doGet({
    parameter: { action: "history", editorId: editorA.id }
  }).getContent());
  assert.ok(history.actions.some((action) => action.type === "DELETE"));
  assert.ok(history.actions.some((action) => action.type === "RESTORE"));
  assert.ok(history.actions.some((action) => action.type === "EDIT"));
});

test("supports multiple personal undo and redo steps and clears redo after a new edit", () => {
  const { context, initial } = setupHarness();
  const editor = makeEditor("A", "editor-A-000000001");
  const first = structuredClone(initial);
  first.sections[0].items[0].name = "First";
  const firstSave = post(context, {
    action: "mutate", editor, requestId: makeRequestId("multi-first"),
    expectedRevision: 0, baseData: initial, data: first
  });
  const second = structuredClone(first);
  second.sections[0].items[1].name = "Second";
  const secondSave = post(context, {
    action: "mutate", editor, requestId: makeRequestId("multi-second"),
    expectedRevision: firstSave.revision, baseData: first, data: second
  });
  assert.equal(secondSave.ok, true);

  assert.equal(post(context, { action: "undo", editor, requestId: makeRequestId("multi-undo-1") }).ok, true);
  assert.equal(post(context, { action: "undo", editor, requestId: makeRequestId("multi-undo-2") }).ok, true);
  assert.deepEqual(load(context).data.sections[0].items.map((item) => item.name), ["Blue Lake", "Waterfall"]);
  assert.equal(post(context, { action: "redo", editor, requestId: makeRequestId("multi-redo-1") }).ok, true);
  const secondRedo = post(context, { action: "redo", editor, requestId: makeRequestId("multi-redo-2") });
  assert.equal(secondRedo.ok, true, JSON.stringify(secondRedo));
  assert.deepEqual(load(context).data.sections[0].items.map((item) => item.name), ["First", "Second"]);

  assert.equal(post(context, { action: "undo", editor, requestId: makeRequestId("clear-redo-undo") }).ok, true);
  const base = load(context);
  const edited = structuredClone(base.data);
  edited.sections[0].items[0].name = "New branch";
  assert.equal(post(context, {
    action: "mutate", editor, requestId: makeRequestId("clear-redo-edit"),
    expectedRevision: base.revision, baseData: base.data, data: edited
  }).ok, true);
  const history = JSON.parse(context.doGet({
    parameter: { action: "history", editorId: editor.id }
  }).getContent());
  assert.equal(history.redoCount, 0);
});

test("refuses to undo an item changed by another editor, including a different field", () => {
  const { context, initial } = setupHarness();
  const editorA = makeEditor("A", "editor-A-000000001");
  const editorB = makeEditor("B", "editor-B-000000002");
  const aData = structuredClone(initial);
  aData.sections[0].items[0].name = "A value";
  post(context, {
    action: "mutate", editor: editorA, requestId: makeRequestId("undo-conflict-A"),
    expectedRevision: 0, baseData: initial, data: aData
  });
  const bBase = load(context);
  const bData = structuredClone(bBase.data);
  bData.sections[0].items[0].url = "https://example.com/";
  assert.equal(post(context, {
    action: "mutate", editor: editorB, requestId: makeRequestId("undo-conflict-B"),
    expectedRevision: bBase.revision, baseData: bBase.data, data: bData
  }).ok, true);

  const undo = post(context, {
    action: "undo", editor: editorA, requestId: makeRequestId("undo-conflict-attempt")
  });
  assert.equal(undo.ok, false);
  assert.equal(undo.conflict, true);
  assert.equal(load(context).data.sections[0].items[0].name, "A value");
  assert.equal(load(context).data.sections[0].items[0].url, "https://example.com/");
  const history = JSON.parse(context.doGet({
    parameter: { action: "history", editorId: editorA.id }
  }).getContent());
  assert.equal(history.undoConflict, true);
});

test("merges edits to separate index-addressed itinerary items in the same section", () => {
  const { context, initial } = setupHarness();
  const editorA = makeEditor("A", "editor-A-000000001");
  const editorB = makeEditor("B", "editor-B-000000002");
  const aData = structuredClone(initial);
  aData.sections[0].days[0].events[0].text = "A breakfast";
  assert.equal(post(context, {
    action: "mutate", editor: editorA, requestId: makeRequestId("indexed-A"),
    expectedRevision: 0, baseData: initial, data: aData
  }).ok, true);

  const bData = structuredClone(initial);
  bData.sections[0].days[0].events[1].text = "B train";
  assert.equal(post(context, {
    action: "mutate", editor: editorB, requestId: makeRequestId("indexed-B"),
    expectedRevision: 0, baseData: initial, data: bData
  }).ok, true);
  assert.deepEqual(load(context).data.sections[0].days[0].events.map((event) => event.text), ["A breakfast", "B train"]);
});
