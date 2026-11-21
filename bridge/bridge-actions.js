// The actions this site shares with other agent sites, through its action bridge.
// The build names this file in bridge/agent-manifest.json. When another site's assistant
// calls this site, the bridge loads it in a hidden frame on this site's origin, which has
// no page. Only the names in the manifest's "actions.agentTools" reach a partner's agents.
//
// The shared reads expose only public facts: the page's own facts and live Wikipedia
// look-ups. A visitor's saved briefs are never shared: the bridge state reader leaves
// them out.
import { FACTS } from "../js/app.js";
import { searchWikipedia, readWikipediaArticle } from "../js/wiki.js";

/**
 * Shares this site's reads with the partner sites that call its network.
 *
 * A partner's agent calls them from the partner's page. Each read runs here, in a hidden
 * frame on this site's origin, with this site's own code. Nothing here can see the page
 * or what one visitor did on it, such as their saved briefs.
 */
class BridgeActions {
  /**
   * The sites allowed to call these reads. "*" shares a read with every site on the web:
   * these reads return only public facts the page already shows, or public Wikipedia
   * data, so that is safe here.
   */
  static CALLERS = ["*"];

  /**
   * The site's page, for facts that only its HTML holds.
   */
  static PAGE = new URL("../index.html", import.meta.url).href;

  /**
   * Register the shared reads.
   *
   * :param actions: The runtime registry facade with a register(definition) method.
   */
  static registerActions(actions) {
    actions.register(BridgeActions.readStateAction());
    actions.register(BridgeActions.searchWikipediaAction());
    actions.register(BridgeActions.readWikipediaArticleAction());
  }

  static readStateAction() {
    return {
      // The page's own action has the same name and input, so the network's instructions
      // fit both. The bridge version returns public facts only, never a visitor's briefs.
      name: "get_site_state",
      description: "Read RisetKita's public facts: what the site does, its sources (Wikipedia bahasa Indonesia), its limits, and the link to the Pemeriksa Fakta site. Changes nothing. Call it before answering about what RisetKita offers.",
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

  /** Public facts only: never a visitor's saved briefs. */
  static readState() {
    return { facts: FACTS, peerPage: "./peer/" };
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
