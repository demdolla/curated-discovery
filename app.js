const STORAGE_KEYS = {
  handles: "curatedDiscovery.handles",
  posts: "curatedDiscovery.posts",
  saved: "curatedDiscovery.saved",
  hidden: "curatedDiscovery.hidden",
  read: "curatedDiscovery.read",
  useful: "curatedDiscovery.useful"
};

const topicTerms = {
  health: ["health", "sleep", "workout", "fitness", "protein", "walk", "gym", "mental", "body"],
  money: ["money", "budget", "debt", "income", "sales", "invest", "saving", "finance"],
  relationships: ["relationship", "partner", "girlfriend", "communication", "love", "family", "friend"],
  cooking: ["cook", "recipe", "meal", "kitchen", "food", "sushi", "protein", "dinner"],
  sales: ["sales", "client", "customer", "follow up", "objection", "lead", "close", "consultant"],
  mindset: ["mindset", "discipline", "confidence", "habit", "focus", "attitude", "growth"],
  learning: ["learn", "lesson", "book", "idea", "skill", "practice", "study", "framework"]
};

const fallbackPosts = [
  {
    id: "local-seed-1",
    handle: "setup",
    permalink: "",
    timestamp: new Date().toISOString(),
    caption: "Add Instagram accounts, then sync once your Meta API credentials are set in Vercel.",
    summary: "This app is ready for official API ingestion. Until credentials are added, it will stay in setup mode.",
    topic: "learning"
  },
  {
    id: "local-seed-2",
    handle: "design",
    permalink: "",
    timestamp: new Date().toISOString(),
    caption: "The feed is intentionally bounded. When the batch ends, the session ends.",
    summary: "No infinite scroll. You get useful novelty, then a clean stopping point.",
    topic: "mindset"
  }
];

const state = {
  handles: loadList(STORAGE_KEYS.handles),
  posts: loadList(STORAGE_KEYS.posts),
  saved: loadList(STORAGE_KEYS.saved),
  hidden: loadList(STORAGE_KEYS.hidden),
  read: loadList(STORAGE_KEYS.read),
  useful: loadList(STORAGE_KEYS.useful)
};

const els = {
  form: document.querySelector("#handleForm"),
  input: document.querySelector("#handleInput"),
  accountList: document.querySelector("#accountList"),
  accountCount: document.querySelector("#accountCount"),
  syncBtn: document.querySelector("#syncBtn"),
  status: document.querySelector("#statusPanel"),
  feed: document.querySelector("#feed"),
  savedList: document.querySelector("#savedList"),
  topicFilter: document.querySelector("#topicFilter"),
  batchSize: document.querySelector("#batchSize"),
  clearReadBtn: document.querySelector("#clearReadBtn"),
  template: document.querySelector("#cardTemplate")
};

els.form.addEventListener("submit", addHandle);
els.syncBtn.addEventListener("click", syncPosts);
els.topicFilter.addEventListener("change", renderFeed);
els.batchSize.addEventListener("change", renderFeed);
els.clearReadBtn.addEventListener("click", resetRead);

render();

function addHandle(event) {
  event.preventDefault();
  const handle = normalizeHandle(els.input.value);

  if (!handle) {
    setStatus("Use the account handle only. No @ symbol, spaces, or URL.", "warn");
    return;
  }

  if (!state.handles.includes(handle)) {
    state.handles.push(handle);
    saveList(STORAGE_KEYS.handles, state.handles);
  }

  els.input.value = "";
  setStatus(`Added ${handle}. Sync when you are ready.`, "good");
  render();
}

async function syncPosts() {
  if (!state.handles.length) {
    setStatus("Add at least one account first.", "warn");
    return;
  }

  setStatus("Syncing recent posts through the official API route.");
  els.syncBtn.disabled = true;

  try {
    const params = new URLSearchParams({
      handles: state.handles.join(","),
      limit: "6"
    });
    const response = await fetch(`/api/instagram?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Sync failed.");
    }

    if (data.setupRequired) {
      state.posts = fallbackPosts;
      saveList(STORAGE_KEYS.posts, state.posts);
      setStatus(data.message, "warn");
      render();
      return;
    }

    state.posts = data.posts.map(enrichPost);
    saveList(STORAGE_KEYS.posts, state.posts);
    setStatus(`Synced ${state.posts.length} cards from ${data.accountsChecked} account(s).`, "good");
    render();
  } catch (error) {
    setStatus(error.message || "Sync failed. Check the API credentials and try again.", "warn");
  } finally {
    els.syncBtn.disabled = false;
  }
}

function render() {
  renderAccounts();
  renderFeed();
  renderSaved();
}

function renderAccounts() {
  els.accountList.innerHTML = "";
  els.accountCount.textContent = state.handles.length
    ? `${state.handles.length} account${state.handles.length === 1 ? "" : "s"} tracked.`
    : "No accounts yet.";

  state.handles.forEach((handle) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = handle;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "x";
    remove.title = `Remove ${handle}`;
    remove.addEventListener("click", () => {
      state.handles = state.handles.filter((item) => item !== handle);
      saveList(STORAGE_KEYS.handles, state.handles);
      render();
    });

    chip.appendChild(remove);
    els.accountList.appendChild(chip);
  });
}

function renderFeed() {
  els.feed.innerHTML = "";

  const sourcePosts = state.posts.length ? state.posts : fallbackPosts;
  const topic = els.topicFilter.value;
  const batchSize = Number(els.batchSize.value);

  const cards = sourcePosts
    .map(enrichPost)
    .filter((post) => !state.hidden.includes(post.handle))
    .filter((post) => topic === "all" || post.topic === topic)
    .filter((post) => !state.read.includes(post.id))
    .slice(0, batchSize);

  if (!cards.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No cards in this batch. Sync, change the topic, or reset read history.";
    els.feed.appendChild(empty);
    return;
  }

  cards.forEach((post) => {
    const node = els.template.content.firstElementChild.cloneNode(true);
    node.querySelector(".source").textContent = `@${post.handle}`;
    node.querySelector(".topic").textContent = post.topic;
    node.querySelector("h3").textContent = makeTitle(post);
    node.querySelector(".summary").textContent = post.summary;
    node.querySelector(".caption").textContent = post.caption || "No caption available.";

    const link = node.querySelector("a");
    if (post.permalink) {
      link.href = post.permalink;
    } else {
      link.removeAttribute("href");
      link.setAttribute("aria-disabled", "true");
    }

    node.querySelectorAll("button[data-action]").forEach((button) => {
      button.addEventListener("click", () => handleCardAction(button.dataset.action, post));
    });

    els.feed.appendChild(node);
  });
}

function renderSaved() {
  els.savedList.innerHTML = "";

  if (!state.saved.length) {
    els.savedList.textContent = "Nothing saved yet.";
    return;
  }

  state.saved.slice(0, 12).forEach((post) => {
    const item = document.createElement("div");
    item.className = "saved-item";
    item.innerHTML = `<strong>@${escapeHtml(post.handle)}</strong><span>${escapeHtml(post.summary)}</span>`;
    els.savedList.appendChild(item);
  });
}

function handleCardAction(action, post) {
  if (action === "save" && !state.saved.some((item) => item.id === post.id)) {
    state.saved.unshift(post);
    saveList(STORAGE_KEYS.saved, state.saved);
    setStatus("Saved.", "good");
  }

  if (action === "useful" && !state.useful.includes(post.id)) {
    state.useful.push(post.id);
    saveList(STORAGE_KEYS.useful, state.useful);
    setStatus("Marked useful.", "good");
  }

  if (action === "hide" && !state.hidden.includes(post.handle)) {
    state.hidden.push(post.handle);
    saveList(STORAGE_KEYS.hidden, state.hidden);
    setStatus(`Hidden @${post.handle}.`, "good");
  }

  if (!state.read.includes(post.id)) {
    state.read.push(post.id);
    saveList(STORAGE_KEYS.read, state.read);
  }

  render();
}

function resetRead() {
  state.read = [];
  saveList(STORAGE_KEYS.read, state.read);
  setStatus("Read history reset.", "good");
  renderFeed();
}

function enrichPost(post) {
  const caption = post.caption || "";
  return {
    ...post,
    topic: post.topic || detectTopic(caption),
    summary: post.summary || summarize(caption)
  };
}

function detectTopic(text) {
  const lower = text.toLowerCase();
  const match = Object.entries(topicTerms).find(([, terms]) => terms.some((term) => lower.includes(term)));
  return match ? match[0] : "learning";
}

function summarize(text) {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "No caption available. Open the source if this account is worth checking directly.";
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] || cleaned;
  return firstSentence.length > 190 ? `${firstSentence.slice(0, 187).trim()}...` : firstSentence;
}

function makeTitle(post) {
  const date = post.timestamp ? new Date(post.timestamp) : null;
  const when = date && !Number.isNaN(date.valueOf())
    ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "Recent";
  return `${when} from @${post.handle}`;
}

function normalizeHandle(value) {
  return (value || "")
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
    .split(/[/?#]/)[0]
    .toLowerCase()
    .match(/^[a-z0-9._]{1,30}$/)?.[0] || "";
}

function setStatus(message, tone = "") {
  els.status.textContent = message;
  els.status.className = `status-panel ${tone}`.trim();
}

function loadList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveList(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}
