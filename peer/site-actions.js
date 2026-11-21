// Registers Pemeriksa Fakta's operations with the agent runtime.
// agent-manifest.json loads this module through "actions.module". Only the names
// in "actions.agentTools" become model tools, called website_<name>.
// All three actions are reads: the peer site has no writes.
import { App } from "./js/peer-app.js";

class SiteActions {
  static registerActions(actions) {
    actions.register(SiteActions.readStateAction());
    actions.register(SiteActions.searchWikipediaAction());
    actions.register(SiteActions.readWikipediaArticleAction());
  }

  static readStateAction() {
    return {
      name: "get_site_state",
      description: "Baca keadaan halaman ini: tanggal hari ini dan fakta halaman (tentang Pemeriksa Fakta, sumber, batasan). Panggil sebelum menjawab tentang apa yang bisa dilakukan situs ini.",
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
      description: "Cari artikel di Wikipedia bahasa Indonesia. Panggil saat memeriksa sebuah klaim dan kamu butuh judul artikel yang tepat sebelum membacanya. Kembalikan sampai 5 judul beserta cuplikannya.",
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
            description: "Kata kunci pencarian dari klaim yang diperiksa.",
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
      description: "Baca ringkasan satu artikel Wikipedia bahasa Indonesia. Panggil dengan judul persis dari website_search_wikipedia, setelah pencarian berhasil. Kembalikan ringkasan dan URL artikel sebagai sumber.",
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
}

// The runtime calls the module's registerActions export.
export const registerActions = SiteActions.registerActions;
