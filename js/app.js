// RisetKita page: the research-brief library the visitor sees, and the state
// the assistant reads and changes. The assistant calls these same functions
// through site-actions.js, so the page buttons and the agent share one set of
// rules. Briefs live in this browser's localStorage only; nothing is sent to a
// server. This module must not read the DOM at import time: site-actions.js
// imports it from the action bridge frame, which has no page.

import { searchWikipedia, readWikipediaArticle } from "./wiki.js";

const STORE_KEY = "risetku.briefs.v1";
const MAX_TITLE = 120;
const MAX_SUMMARY = 4000;
const MAX_SOURCES = 8;

export const FACTS = {
  about: "RisetKita adalah agen riset mini: tanyakan sebuah topik, agen mencari dan membaca artikel Wikipedia bahasa Indonesia, lalu menyusun brief riset singkat beserta sumbernya.",
  sources: "Semua fakta berasal dari Wikipedia bahasa Indonesia (id.wikipedia.org). Agen tidak memakai sumber lain dan tidak mengarang fakta.",
  limits: "Agen tidak bisa memesan, membayar, login ke akun apa pun, membuka situs berbayar, membuat gambar, atau menjawab di luar yang dibaca dari Wikipedia.",
  privacy: "Brief tersimpan hanya di browser ini (localStorage). Pesan dan data halaman yang dibaca agen diteruskan ke penyedia LLM yang dipilih pengunjung di pengaturan model AI.",
  peer: "Pemeriksa Fakta adalah jaringan agen kedua di situs ini yang memeriksa sebuah klaim terhadap Wikipedia. Asisten bisa memintanya memeriksa klaim setelah pengunjung setuju.",
};

/** Load saved briefs. In Node (tests) there is no localStorage. */
function loadBriefs() {
  try {
    if (typeof localStorage === "undefined") {
      return [];
    }
    return JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
  } catch {
    return [];
  }
}

function storeBriefs(briefs) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORE_KEY, JSON.stringify(briefs));
    }
  } catch {
    // Storage full or blocked: the page still works for this visit.
  }
}

function todayStrings() {
  const now = new Date();
  const iso = now.toISOString().slice(0, 10);
  const weekday = now.toLocaleDateString("id-ID", { weekday: "long" });
  const long = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return { iso, weekday, long };
}

function newId() {
  return `brief-${Date.now().toString(36)}-${Math.floor(Math.random() * 1296).toString(36)}`;
}

export class Page {
  constructor() {
    this.briefs = loadBriefs();
    this.version = 0;
    this.openBriefId = null;
    if (typeof document !== "undefined") {
      this.renderLibrary();
      this.renderFacts();
      this.wireExampleButtons();
    }
  }

  /** Plain-JSON state for the agent: date, saved briefs, version, page facts. */
  getState() {
    const today = todayStrings();
    return {
      today: today.iso,
      todayLong: today.long,
      weekday: today.weekday,
      version: this.version,
      briefCount: this.briefs.length,
      briefs: this.briefs.map((b) => ({
        id: b.id,
        title: b.title,
        created: b.created,
        sourceCount: b.sources.length,
      })),
      facts: FACTS,
      peerPage: this.peerLink(),
    };
  }

  peerLink() {
    if (typeof document === "undefined") {
      return "./peer/";
    }
    const link = document.querySelector("#peer-link");
    return link ? link.getAttribute("href") : "./peer/";
  }

  /** Save a research brief. Refuses bad input before changing anything. */
  saveBrief(args) {
    const title = String(args?.title || "").trim();
    const summary = String(args?.summary || "").trim();
    const sources = Array.isArray(args?.sources) ? args.sources : [];
    if (title.length < 3) {
      return { ok: false, reason: "Judul brief terlalu pendek (minimal 3 karakter).", field: "title" };
    }
    if (title.length > MAX_TITLE) {
      return { ok: false, reason: `Judul brief maksimal ${MAX_TITLE} karakter.`, field: "title" };
    }
    if (summary.length < 20) {
      return { ok: false, reason: "Ringkasan brief terlalu pendek (minimal 20 karakter).", field: "summary" };
    }
    if (summary.length > MAX_SUMMARY) {
      return { ok: false, reason: `Ringkasan brief maksimal ${MAX_SUMMARY} karakter.`, field: "summary" };
    }
    if (sources.length > MAX_SOURCES) {
      return { ok: false, reason: `Maksimal ${MAX_SOURCES} sumber per brief.`, field: "sources" };
    }
    for (const source of sources) {
      if (typeof source !== "string" || !/^https?:\/\//.test(source)) {
        return { ok: false, reason: "Setiap sumber harus berupa URL http(s).", field: "sources" };
      }
    }
    const brief = {
      id: newId(),
      title,
      summary,
      sources: [...sources],
      created: todayStrings().iso,
    };
    this.briefs.unshift(brief);
    this.version += 1;
    storeBriefs(this.briefs);
    this.renderLibrary();
    this.openBrief(brief.id);
    return { ok: true, brief: { id: brief.id, title: brief.title, created: brief.created }, version: this.version, briefCount: this.briefs.length };
  }

  /** Read-only check for delete_brief: the confirmation dialog calls this first. */
  checkDeleteBrief(args) {
    const brief = this.getBrief(String(args?.id || ""));
    if (!brief) {
      return { ok: false, reason: "Brief dengan id itu tidak ditemukan.", field: "id" };
    }
    return { ok: true, brief: { id: brief.id, title: brief.title, created: brief.created } };
  }

  /** Delete a saved brief. Refuses an unknown id. */
  deleteBrief(args) {
    const check = this.checkDeleteBrief(args);
    if (!check.ok) {
      return check;
    }
    const id = check.brief.id;
    const index = this.briefs.findIndex((b) => b.id === id);
    const removed = this.briefs.splice(index, 1)[0];
    this.version += 1;
    storeBriefs(this.briefs);
    if (this.openBriefId === id) {
      this.openBriefId = null;
    }
    this.renderLibrary();
    this.renderDetail();
    return { ok: true, removed: { id: removed.id, title: removed.title }, version: this.version, briefCount: this.briefs.length };
  }

  /** Read-only lookup of one saved brief, for the page's own buttons. */
  getBrief(id) {
    return this.briefs.find((b) => b.id === id) || null;
  }

  openBrief(id) {
    this.openBriefId = id;
    this.renderDetail();
    this.renderLibrary();
  }

  // ---- page rendering (no-ops without a DOM) ----

  renderFacts() {
    const about = document.querySelector("#facts-about");
    if (about) {
      about.textContent = FACTS.about;
    }
    const sources = document.querySelector("#facts-sources");
    if (sources) {
      sources.textContent = FACTS.sources;
    }
    const limits = document.querySelector("#facts-limits");
    if (limits) {
      limits.textContent = FACTS.limits;
    }
  }

  renderLibrary() {
    const list = document.querySelector("#brief-list");
    if (!list) {
      return;
    }
    list.innerHTML = "";
    if (this.briefs.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "Belum ada brief tersimpan. Minta asisten membuat brief riset, lalu simpan di sini.";
      list.append(empty);
      return;
    }
    for (const brief of this.briefs) {
      const item = document.createElement("article");
      item.className = "brief-item";
      const title = document.createElement("h3");
      title.textContent = brief.title;
      const meta = document.createElement("p");
      meta.className = "muted";
      meta.textContent = `${brief.created} · ${brief.sources.length} sumber`;
      const open = document.createElement("button");
      open.type = "button";
      open.textContent = "Buka";
      open.addEventListener("click", () => this.openBrief(brief.id));
      const del = document.createElement("button");
      del.type = "button";
      del.className = "danger";
      del.textContent = "Hapus";
      del.addEventListener("click", () => this.deleteBrief({ id: brief.id }));
      item.append(title, meta, open, del);
      list.append(item);
    }
  }

  renderDetail() {
    const detail = document.querySelector("#brief-detail");
    if (!detail) {
      return;
    }
    detail.innerHTML = "";
    const brief = this.openBriefId ? this.getBrief(this.openBriefId) : null;
    if (!brief) {
      const hint = document.createElement("p");
      hint.className = "muted";
      hint.textContent = "Pilih sebuah brief dari perpustakaan untuk membacanya di sini.";
      detail.append(hint);
      return;
    }
    const title = document.createElement("h3");
    title.textContent = brief.title;
    const meta = document.createElement("p");
    meta.className = "muted";
    meta.textContent = `Disimpan ${brief.created}`;
    const summary = document.createElement("p");
    summary.textContent = brief.summary;
    const sourcesTitle = document.createElement("h4");
    sourcesTitle.textContent = "Sumber";
    const sources = document.createElement("ul");
    for (const source of brief.sources) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = source;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = source;
      li.append(a);
      sources.append(li);
    }
    detail.append(title, meta, summary, sourcesTitle, sources);
  }

  wireExampleButtons() {
    for (const button of document.querySelectorAll("[data-topic]")) {
      button.addEventListener("click", () => {
        const input = document.querySelector("#ns-input");
        if (input) {
          input.value = button.getAttribute("data-topic");
          input.focus();
          document.querySelector("#assistant")?.scrollIntoView({ behavior: "smooth" });
        }
      });
    }
  }
}

export class App {
  static page = new Page();
  static searchWikipedia = searchWikipedia;
  static readWikipediaArticle = readWikipediaArticle;
}
