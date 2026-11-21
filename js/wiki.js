// Wikipedia access for RisetKita. Pure functions, no DOM: shared by the page
// actions (site-actions.js) and the bridge actions (bridge/bridge-actions.js).
// Direct calls to id.wikipedia.org work from any normal browser (it sends
// Access-Control-Allow-Origin: *). When a direct call fails (for example in an
// offline test browser), the same request is retried through the same-origin
// /wiki-proxy path, which only the local dev server provides. On the public
// site that path does not exist, so the direct call is the real one.

const WIKI_API = "https://id.wikipedia.org/w/api.php";
const WIKI_REST = "https://id.wikipedia.org/api/rest_v1";

/**
 * Fetch JSON from Wikipedia, with the same-origin dev-proxy fallback.
 *
 * :param path: The path to fetch, starting with "/w/api.php?..." or
 *   "/api/rest_v1/...".
 * :return: The parsed JSON body.
 * :raises Error: When both the direct call and the proxy call fail.
 */
export async function wikiFetch(path) {
  const directUrl = path.startsWith("/w/")
    ? WIKI_API + path.slice("/w/api.php".length)
    : WIKI_REST + path.slice("/api/rest_v1".length);
  try {
    const response = await fetch(directUrl, { headers: { accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`Wikipedia HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    // Dev-only fallback: the local dev server forwards /wiki-proxy to Wikipedia.
    const proxyResponse = await fetch(`/wiki-proxy${path}`, { headers: { accept: "application/json" } });
    if (!proxyResponse.ok) {
      throw new Error(`Wikipedia tidak bisa dihubungi (${error.message}; proxy HTTP ${proxyResponse.status})`);
    }
    return await proxyResponse.json();
  }
}

function stripTags(html) {
  return String(html || "").replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim();
}

/**
 * Search Indonesian Wikipedia.
 *
 * :param query: The search text.
 * :return: Up to 5 matches with title and a plain-text snippet.
 */
export async function searchWikipedia(query) {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: "5",
    format: "json",
    origin: "*",
  });
  const data = await wikiFetch(`/w/api.php?${params.toString()}`);
  const results = (data?.query?.search || []).map((item) => ({
    title: item.title,
    snippet: stripTags(item.snippet),
  }));
  return { query, count: results.length, results };
}

/**
 * Read the summary of one Indonesian Wikipedia article.
 *
 * :param title: The exact article title, from search_wikipedia.
 * :return: Title, plain-text extract and the article URL.
 */
export async function readWikipediaArticle(title) {
  const data = await wikiFetch(`/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
  if (data?.type === "disambiguation") {
    return {
      title: data.title,
      disambiguation: true,
      extract: "Judul ini punya beberapa artikel. Pilih salah satu dari daftar pencarian.",
      url: data.content_urls?.desktop?.page || `https://id.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    };
  }
  if (!data?.extract) {
    throw new Error(`Artikel "${title}" tidak ditemukan di Wikipedia bahasa Indonesia.`);
  }
  return {
    title: data.title,
    extract: data.extract,
    url: data.content_urls?.desktop?.page || `https://id.wikipedia.org/wiki/${encodeURIComponent(title)}`,
  };
}
