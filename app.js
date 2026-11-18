import { itinerarySections } from "./itinerary.js";

const storageKeys = {
  collections: "rishikesh-link-collections",
  contributor: "rishikesh-contributor-name",
  itinerary: "rishikesh-itinerary-edits",
};

const elements = {
  addTitleButton: document.querySelector("#add-title-button"),
  contributorName: document.querySelector("#contributor-name"),
  itinerary: document.querySelector("#itinerary-cards"),
  status: document.querySelector("#status"),
  titleFormHost: document.querySelector("#title-form-host"),
  titles: document.querySelector("#titles"),
};

let itinerary = loadItinerary();
let collections = loadCollections();
elements.contributorName.value = localStorage.getItem(storageKeys.contributor) || "";

function clone(value) {
  return structuredClone(value);
}

function loadItinerary() {
  const saved = localStorage.getItem(storageKeys.itinerary);
  if (!saved) return clone(itinerarySections);

  const parsed = JSON.parse(saved);
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== "object") return clone(itinerarySections);

  return itinerarySections.map((section, index) => {
    const edit = parsed[index];
    return edit && typeof edit === "object"
      ? { ...clone(section), ...clone(edit) }
      : clone(section);
  });
}

function loadCollections() {
  const saved = localStorage.getItem(storageKeys.collections);
  if (!saved) return [];
  const parsed = JSON.parse(saved);
  return Array.isArray(parsed)
    ? parsed.map((title) => ({ ...title, links: Array.isArray(title.links) ? title.links : [] }))
    : [];
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("error", isError);
}

function saveToBrowser(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    setStatus("Saved on this device.");
    return true;
  } catch (error) {
    setStatus(`Could not save your change: ${error.message}`, true);
    return false;
  }
}

function saveItinerary() {
  return saveToBrowser(storageKeys.itinerary, itinerary);
}

function saveCollections() {
  return saveToBrowser(storageKeys.collections, collections);
}

function makeId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function appendText(parent, tag, text, className) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

function appendLink(parent, url, label = url) {
  const link = document.createElement("a");
  link.href = url;
  link.textContent = label;
  link.target = "_blank";
  link.rel = "noreferrer";
  parent.append(link);
}

function createButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function addField(form, { name, label, value = "", multiline = false, required = false, hint = "" }) {
  const wrapper = document.createElement("label");
  wrapper.className = "form-field";
  appendText(wrapper, "span", label);
  const input = multiline ? document.createElement("textarea") : document.createElement("input");
  if (!multiline) input.type = "text";
  input.name = name;
  input.value = value || "";
  input.required = required;
  wrapper.append(input);
  if (hint) appendText(wrapper, "small", hint, "field-hint");
  form.append(wrapper);
  return input;
}

function addFormActions(form, onCancel, submitText = "SAVE CHANGES") {
  const actions = document.createElement("div");
  actions.className = "form-actions";
  const submit = document.createElement("button");
  submit.className = "button button-dark";
  submit.type = "submit";
  submit.textContent = submitText;
  actions.append(submit, createButton("CANCEL", "button button-outline", onCancel));
  form.append(actions);
}

function createForm(className = "edit-form") {
  const form = document.createElement("form");
  form.className = className;
  return form;
}

function isValidUrl(value) {
  try {
    const url = new URL(value, window.location.href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function formatListItem(item) {
  if (typeof item === "string") return item;
  return `${item.text || ""}\t${item.url || ""}`.trimEnd();
}

function parseListItem(line) {
  const separator = line.indexOf("\t");
  if (separator < 0) return line.trim();
  const text = line.slice(0, separator).trim();
  const url = line.slice(separator + 1).trim();
  return url ? { text, url } : text;
}

function renderListItem(list, item) {
  const row = document.createElement("li");
  if (typeof item === "string" || !item.url) {
    appendText(row, "span", typeof item === "string" ? item : item.text || "");
  } else {
    const text = item.text || item.url;
    const name = text.includes(item.url)
      ? text.replace(item.url, "").replace(/[\s—:]+$/, "").trim()
      : text;
    if (name && name !== item.url) appendText(row, "span", `${name} `);
    appendLink(row, item.url, "Open link ↗");
  }
  list.append(row);
}

function renderItinerary() {
  elements.itinerary.replaceChildren();
  itinerary.forEach((section, index) => {
    const card = document.createElement("article");
    card.className = "itinerary-card";
    card.id = `itinerary-card-${index + 1}`;

    const heading = document.createElement("div");
    heading.className = "itinerary-card-heading";
    appendText(heading, "span", String(index + 1).padStart(2, "0"), "card-number");
    appendText(heading, "h3", section.title);
    heading.append(createButton("EDIT", "text-button", () => renderSectionEditor(card, section, index)));
    card.append(heading);

    const body = document.createElement("div");
    body.className = "itinerary-card-body";
    section.blocks.forEach((block) => {
      if (block.type === "text") {
        appendText(body, "p", block.text);
      } else if (block.type === "link") {
        const row = document.createElement("p");
        appendLink(row, block.url, block.label || block.text || block.url);
        body.append(row);
      } else if (block.type === "list") {
        const list = document.createElement("ul");
        block.items.forEach((item) => renderListItem(list, item));
        body.append(list);
      } else if (block.type === "image") {
        const figure = document.createElement("figure");
        const image = document.createElement("img");
        image.src = block.src;
        image.alt = block.alt || "";
        image.loading = "lazy";
        figure.append(image);
        if (block.caption) appendText(figure, "figcaption", block.caption);
        body.append(figure);
      }
    });
    card.append(body);
    elements.itinerary.append(card);
  });
}

function renderSectionEditor(card, section, sectionIndex) {
  const form = createForm("edit-form section-editor");
  addField(form, { name: "title", label: "Section title", value: section.title, required: true });

  const fieldMap = section.blocks.map((block, index) => {
    if (block.type === "text") {
      const field = `text-${index}`;
      addField(form, { name: field, label: "Text", value: block.text, multiline: true });
      return { type: block.type, field };
    }
    if (block.type === "link") {
      const label = `link-label-${index}`;
      const url = `link-url-${index}`;
      addField(form, { name: label, label: "Link label", value: block.label || block.text || "" });
      addField(form, { name: url, label: "Link URL", value: block.url, required: true });
      return { type: block.type, label, url };
    }
    if (block.type === "list") {
      const field = `list-${index}`;
      addField(form, {
        name: field,
        label: "List items",
        value: block.items.map(formatListItem).join("\n"),
        multiline: true,
        hint: "One item per line. For a linked item, write its name, press Tab, then paste the URL.",
      });
      return { type: block.type, field };
    }
    if (block.type === "image") {
      const alt = `image-alt-${index}`;
      const src = `image-src-${index}`;
      const caption = `image-caption-${index}`;
      addField(form, { name: alt, label: "Image description", value: block.alt || "" });
      addField(form, { name: src, label: "Image path or URL", value: block.src, required: true });
      addField(form, { name: caption, label: "Caption", value: block.caption || "" });
      return { type: block.type, alt, src, caption };
    }
    return { type: block.type };
  });

  addFormActions(form, renderItinerary);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = new FormData(form);
    const updatedBlocks = section.blocks.map((block, index) => {
      const fields = fieldMap[index];
      if (fields.type === "text") return { ...block, text: values.get(fields.field).trim() };
      if (fields.type === "link") return {
        ...block,
        label: values.get(fields.label).trim(),
        url: values.get(fields.url).trim(),
      };
      if (fields.type === "list") return {
        ...block,
        items: values.get(fields.field).split(/\r?\n/).map(parseListItem).filter(Boolean),
      };
      if (fields.type === "image") return {
        ...block,
        alt: values.get(fields.alt).trim(),
        src: values.get(fields.src).trim(),
        caption: values.get(fields.caption).trim(),
      };
      return block;
    }).filter((block) => block.type !== "list" || block.items.length);

    const invalidLink = updatedBlocks.some((block) => {
      if (block.type === "link") return !isValidUrl(block.url);
      return block.type === "list" && block.items.some(
        (item) => typeof item !== "string" && item.url && !isValidUrl(item.url),
      );
    });
    if (invalidLink) {
      setStatus("Use a valid web link beginning with http:// or https://.", true);
      return;
    }
    if (updatedBlocks.some((block) => block.type === "image" && !isValidUrl(block.src))) {
      setStatus("Enter a valid image path or web address.", true);
      return;
    }

    itinerary[sectionIndex] = {
      ...section,
      title: values.get("title").trim(),
      blocks: updatedBlocks,
    };
    if (saveItinerary()) renderItinerary();
  });
  card.replaceChildren(form);
}

function actorName(value) {
  if (typeof value === "string") return value;
  return value?.name || value?.displayName || "";
}

function renderCollections() {
  elements.titles.replaceChildren();
  if (!collections.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    appendText(empty, "strong", "Start your own little list.");
    appendText(empty, "p", "Make a title for cafes, stays, activities or anything you want to remember.");
    elements.titles.append(empty);
    return;
  }

  collections.forEach((collection) => {
    const card = document.createElement("article");
    card.className = "collection-card";

    const heading = document.createElement("div");
    heading.className = "collection-card-heading";
    const titleInfo = document.createElement("div");
    appendText(titleInfo, "h3", collection.name);
    appendText(titleInfo, "span", `${collection.links.length} ${collection.links.length === 1 ? "link" : "links"}`, "link-count");
    heading.append(titleInfo);
    const actions = document.createElement("div");
    actions.className = "title-actions";
    actions.append(createButton("EDIT TITLE", "text-button", () => showTitleForm(collection)));
    actions.append(createButton("DELETE", "text-button danger", () => deleteTitle(collection.id)));
    heading.append(actions);
    card.append(heading);

    const links = document.createElement("ul");
    links.className = "collection-links";
    collection.links.forEach((link) => {
      const item = document.createElement("li");
      const info = document.createElement("div");
      info.className = "link-info";
      appendLink(info, link.url, link.label || link.url);
      const by = actorName(link.createdBy || link.addedBy);
      if (by) appendText(info, "small", `Added by ${by}`, "link-byline");
      item.append(info);
      const linkActions = document.createElement("div");
      linkActions.className = "link-actions";
      linkActions.append(createButton("EDIT", "text-button", () => showLinkForm(collection.id, link)));
      linkActions.append(createButton("DELETE", "text-button danger", () => deleteLink(collection.id, link.id)));
      item.append(linkActions);
      links.append(item);
    });
    card.append(links);
    card.append(createButton("+ ADD LINK", "button button-outline add-link-button", () => showLinkForm(collection.id)));
    elements.titles.append(card);
  });
}

function showTitleForm(title = null) {
  const form = createForm("edit-form compact-form");
  addField(form, { name: "name", label: "Title", value: title?.name || "", required: true });
  addFormActions(form, () => elements.titleFormHost.replaceChildren(), title ? "SAVE TITLE" : "CREATE TITLE");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = new FormData(form).get("name").trim();
    if (!name) return;
    if (title) {
      const current = collections.find((entry) => entry.id === title.id);
      if (!current) return;
      current.name = name;
    } else {
      collections.push({ id: makeId(), name, links: [], createdBy: elements.contributorName.value.trim() });
    }
    if (saveCollections()) {
      elements.titleFormHost.replaceChildren();
      renderCollections();
    }
  });
  elements.titleFormHost.replaceChildren(form);
  form.querySelector("input").focus();
}

function showLinkForm(titleId, link = null) {
  const contributor = elements.contributorName.value.trim();
  if (!link && !contributor) {
    setStatus("Add your name above first, so the link shows who shared it.", true);
    elements.contributorName.focus();
    return;
  }

  const form = createForm("edit-form compact-form");
  addField(form, { name: "label", label: "Link title", value: link?.label || "", required: true });
  addField(form, { name: "url", label: "Web address", value: link?.url || "", required: true });
  addFormActions(form, () => elements.titleFormHost.replaceChildren(), link ? "SAVE LINK" : "ADD LINK");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const label = values.label.trim();
    const url = values.url.trim();
    if (!label || !isValidUrl(url)) {
      setStatus("Add a link title and a valid http:// or https:// web address.", true);
      return;
    }

    const collection = collections.find((entry) => entry.id === titleId);
    if (!collection) return;
    if (link) {
      const current = collection.links.find((entry) => entry.id === link.id);
      if (!current) return;
      current.label = label;
      current.url = url;
      current.updatedBy = contributor || actorName(current.createdBy || current.addedBy);
      current.updatedAt = new Date().toISOString();
    } else {
      collection.links.push({
        id: makeId(),
        label,
        url,
        createdBy: contributor,
        createdAt: new Date().toISOString(),
      });
    }
    if (saveCollections()) {
      elements.titleFormHost.replaceChildren();
      renderCollections();
    }
  });
  elements.titleFormHost.replaceChildren(form);
  form.querySelector("input").focus();
}

function deleteTitle(titleId) {
  const title = collections.find((entry) => entry.id === titleId);
  if (!title || !window.confirm(`Delete "${title.name}" and its links?`)) return;
  collections = collections.filter((entry) => entry.id !== titleId);
  if (saveCollections()) renderCollections();
}

function deleteLink(titleId, linkId) {
  const title = collections.find((entry) => entry.id === titleId);
  const link = title?.links.find((entry) => entry.id === linkId);
  if (!title || !link || !window.confirm(`Delete "${link.label}"?`)) return;
  title.links = title.links.filter((entry) => entry.id !== linkId);
  if (saveCollections()) renderCollections();
}

elements.addTitleButton.addEventListener("click", () => showTitleForm());
elements.contributorName.addEventListener("input", () => {
  try {
    localStorage.setItem(storageKeys.contributor, elements.contributorName.value);
  } catch (error) {
    setStatus(`Could not save your name: ${error.message}`, true);
  }
});

renderItinerary();
renderCollections();
