// Registers RisetKita's operations with the agent runtime.
// agent-manifest.json loads this module through "actions.module". Only the names
// in "actions.agentTools" become model tools, called website_<name>.
//
// Each action wraps a function the page already uses, so the assistant and the
// manual UI share one set of rules. Operations return {ok: false, reason, field}
// when they refuse input, before changing anything, and throw only on unexpected
// failures. A throw is reported as "unknown".
// js/app.js is imported by the same URL that index.html uses, so there is one
// page state.
import { App } from "./js/app.js";

/**
 * Describes the site's operations as actions the agents can call.
 *
 * Each action wraps a function the page already uses, so the assistant and the
 * manual UI share one set of rules. The runtime validates arguments against
 * inputSchema before execute runs, and asks the visitor to confirm
 * "irreversible" actions first.
 */
class SiteActions {
  /**
   * Register every site action with the runtime.
   *
   * :param actions: The runtime registry facade with a register(definition) method.
   */
  static registerActions(actions) {
    actions.register(SiteActions.readStateAction());
    actions.register(SiteActions.searchWikipediaAction());
    actions.register(SiteActions.readWikipediaArticleAction());
    actions.register(SiteActions.saveBriefAction());
    actions.register(SiteActions.deleteBriefAction());
  }

  static readStateAction() {
    return {
      name: "get_site_state",
      description: "Baca keadaan halaman ini: tanggal hari ini, daftar brief tersimpan (id, judul, tanggal, jumlah sumber), versi perpustakaan, fakta halaman (tentang situs, sumber, batasan), dan tautan ke situs Pemeriksa Fakta. Panggil sebelum menjawab tentang brief tersimpan atau tentang apa yang bisa dilakukan situs ini, dan panggil lagi di setiap giliran yang membutuhkannya: pengunjung juga bisa memakai halaman ini.",
      effect: "read",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      execute: SiteActions.readState,
    };
  }

  static readState() {
    return App.page.getState();
  }

  static searchWikipediaAction() {
    return {
      name: "search_wikipedia",
      description: "Cari artikel di Wikipedia bahasa Indonesia. Panggil saat pengunjung bertanya tentang sebuah topik dan kamu butuh judul artikel yang tepat sebelum membacanya. Kembalikan sampai 5 judul beserta cuplikannya. Kalau tidak ada hasil, beri tahu pengunjung dan tanyakan kata kunci lain.",
      effect: "read",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["query"],
        properties: {
          query: {
            type: "string",
            minLength: 2,
            maxLength: 100,
            description: "Kata kunci pencarian, misalnya nama topik atau tokoh.",
          },
        },
      },
      execute: SiteActions.searchWikipedia,
    };
  }

  static async searchWikipedia(args) {
    return App.searchWikipedia(args.query);
  }

  static readWikipediaArticleAction() {
    return {
      name: "read_wikipedia_article",
      description: "Baca ringkasan satu artikel Wikipedia bahasa Indonesia. Panggil dengan judul persis dari website_search_wikipedia, setelah pencarian berhasil. Kembalikan ringkasan dan URL artikel sebagai sumber. Jangan pakai untuk judul yang tidak ada di hasil pencarian.",
      effect: "read",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["title"],
        properties: {
          title: {
            type: "string",
            minLength: 2,
            maxLength: 200,
            description: "Judul artikel persis seperti di hasil website_search_wikipedia.",
          },
        },
      },
      execute: SiteActions.readWikipediaArticle,
    };
  }

  static async readWikipediaArticle(args) {
    return App.readWikipediaArticle(args.title);
  }

  static saveBriefAction() {
    return {
      name: "save_brief",
      description: "Simpan brief riset ke perpustakaan pengunjung di halaman ini. Panggil hanya saat pengunjung meminta brief disimpan, atau setelah kamu selesai menyusun brief yang mereka minta dan mereka menyetujuinya. Ringkasan harus berasal dari hasil website_read_wikipedia_article, dan sumber harus URL artikel yang dibaca. Pengunjung bisa menghapus brief yang tersimpan dari halaman ini.",
      effect: "write",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["title", "summary", "sources"],
        properties: {
          title: {
            type: "string",
            minLength: 3,
            maxLength: 120,
            description: "Judul brief, misalnya topik risetnya.",
          },
          summary: {
            type: "string",
            minLength: 20,
            maxLength: 4000,
            description: "Ringkasan brief dari artikel Wikipedia yang dibaca.",
          },
          sources: {
            type: "array",
            minItems: 1,
            maxItems: 8,
            items: { type: "string" },
            description: "URL artikel Wikipedia yang dibaca, dari website_read_wikipedia_article.",
          },
        },
      },
      execute: SiteActions.saveBrief,
    };
  }

  static saveBrief(args) {
    return App.page.saveBrief(args);
  }

  static deleteBriefAction() {
    return {
      name: "delete_brief",
      description: "Hapus satu brief tersimpan dari perpustakaan pengunjung. Panggil hanya saat pengunjung meminta brief tertentu dihapus. Di giliran yang sama saat kamu memanggilnya, panggil dulu website_get_site_state dan tunggu hasilnya: ini butuh id brief yang masih berlaku, dan hasil dari giliran sebelumnya tidak disimpan. Browser meminta pengunjung mengonfirmasi dulu. Situs menolak id yang tidak dikenal.",
      effect: "irreversible",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["id"],
        properties: {
          id: {
            type: "string",
            minLength: 1,
            maxLength: 80,
            description: "Id brief dari website_get_site_state di giliran ini.",
          },
        },
      },
      execute: SiteActions.deleteBrief,
    };
  }

  static deleteBrief(args) {
    return App.page.deleteBrief(args);
  }
}

// The runtime calls the module's registerActions export.
export const registerActions = SiteActions.registerActions;
