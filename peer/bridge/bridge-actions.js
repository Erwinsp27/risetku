// The actions this site shares with other agent sites, through its action bridge.
// The build names this file in bridge/agent-manifest.json. When another site's assistant
// calls this site, the bridge loads it in a hidden frame on this site's origin, which has
// no page. Only the names in the manifest's "actions.agentTools" reach a partner's agents.
//
// All three reads return public facts or public Wikipedia data, so they are shared
// with every site ("*").
import { FACTS } from "../js/peer-app.js";
import { searchWikipedia, readWikipediaArticle } from "../../js/wiki.js";

class BridgeActions {
  static CALLERS = ["*"];

  static PAGE = new URL("../index.html", import.meta.url).href;

  static registerActions(actions) {
    actions.register(BridgeActions.readStateAction());
    actions.register(BridgeActions.searchWikipediaAction());
    actions.register(BridgeActions.readWikipediaArticleAction());
  }

  static readStateAction() {
    return {
      name: "get_site_state",
      description: "Read Pemeriksa Fakta's public facts: what the site does, its sources (Wikipedia bahasa Indonesia), and its limits. Changes nothing. Call it before answering about what Pemeriksa Fakta offers.",
      effect: "read",
      availability: "bridge",
      callerOrigins: BridgeActions.CALLERS,
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      execute: BridgeActions.readState,
    };
  }

  static readState() {
    return { facts: FACTS, mainSite: "../" };
  }

  static searchWikipediaAction() {
    return {
      name: "search_wikipedia",
      description: "Search Wikipedia bahasa Indonesia for article titles. Returns up to 5 titles with snippets.",
      effect: "read",
      availability: "bridge",
      callerOrigins: BridgeActions.CALLERS,
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["query"],
        properties: {
          query: {
            type: "string",
            minLength: 2,
            maxLength: 100,
            description: "Search keywords.",
          },
        },
      },
      execute: BridgeActions.searchWikipedia,
    };
  }

  static async searchWikipedia(args) {
    return searchWikipedia(args.query);
  }

  static readWikipediaArticleAction() {
    return {
      name: "read_wikipedia_article",
      description: "Read the summary of one Wikipedia bahasa Indonesia article, by exact title from search_wikipedia. Returns the summary and the article URL.",
      effect: "read",
      availability: "bridge",
      callerOrigins: BridgeActions.CALLERS,
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["title"],
        properties: {
          title: {
            type: "string",
            minLength: 2,
            maxLength: 200,
            description: "Exact article title from search_wikipedia.",
          },
        },
      },
      execute: BridgeActions.readWikipediaArticle,
    };
  }

  static async readWikipediaArticle(args) {
    return readWikipediaArticle(args.title);
  }
}

export const registerActions = BridgeActions.registerActions;
