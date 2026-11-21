# RisetKita — an open agentic research website

**Entry for the [Open Agentic Web Challenge](https://cognizant-agenticweb.devpost.com/)** (Cognizant, Devpost; submissions close **11 January 2027, 16:00 UTC**).

RisetKita is a small Indonesian-language research agent that runs entirely in the
visitor's browser. Ask it a topic and its agent network searches and reads
Wikipedia bahasa Indonesia, writes a short sourced research brief, and can save the
brief in the visitor's browser library. A second agent network, **Pemeriksa Fakta**,
checks a factual claim against Wikipedia. It follows the [Minimum Viable
Specification for a Worldwide Agentic Web (MVP 0.3)](https://github.com/cognizant-ai-labs/agentic-web/blob/main/docs/worldwide_agentic_web_mvp_spec.md)
and is built with the [agentify-website skill](https://github.com/cognizant-ai-labs/agentic-web/tree/main/skills/agentify-website)
on the nsdeploy browser runtime (Neuro SAN network format).

## Live site

- **Site:** https://erwinsp27.github.io/risetku/
- **Network URL:** https://erwinsp27.github.io/risetku/risetku
- **Peer network URL:** https://erwinsp27.github.io/risetku/peer/pemeriksa_fakta
- **Public agent files:** `agent-manifest.json`, `risetku.network.json`, `links.json`,
  `agent-mcp.json`, `.well-known/nsdeploy.json`, `.well-known/nsdeploy-agent.json`
- **CORS mirror** (GitHub Pages sends no `Access-Control-Allow-Origin` header, so
  other sites can read the public files through jsDelivr, which does):
  `https://cdn.jsdelivr.net/gh/Erwinsp27/risetku@main/agent-manifest.json`
  (same pattern for the other files above)

## How it works

| Agent | Job |
| --- | --- |
| `risetku_coordinator` (front) | Owns the conversation; delegates research, writes the brief, saves/deletes briefs, asks the peer to fact-check. |
| `peneliti` (specialist) | Searches and reads Wikipedia bahasa Indonesia, returns facts with article URLs. |
| `pemeriksa_fakta` (peer network, `/peer/`) | Checks one factual claim against Wikipedia and returns a verdict: DIDUKUNG / TIDAK DITEMUKAN BUKTINYA / BERTENTANGAN, with the source. |

Site actions the agents can call (`website_*` tools):

| Action | Effect | What it does |
| --- | --- | --- |
| `get_site_state` | read | Today's date, saved briefs, version, page facts, peer link. |
| `search_wikipedia` | read | Searches id.wikipedia.org (live, CORS-enabled). |
| `read_wikipedia_article` | read | Reads one article summary + URL. |
| `save_brief` | write | Saves a brief to the browser's localStorage library. |
| `delete_brief` | irreversible | Deletes a saved brief, after the visitor confirms in a dialog. |

The peer network shares only public reads through its action bridge
(`search_wikipedia`, `read_wikipedia_article`, `get_site_state` with public facts
only). A visitor's saved briefs are never shared with another site.

## Try it

No account is needed. Open the site, expand **⚙ AI model settings**, and add a key:

- **Free, no sign-up beyond the provider:** [100milionseek](https://100milionseek.top)
  gives a free OpenAI-compatible key (100M tokens/day). Set Provider URL to
  `https://100milionseek.top/v1` and Model to `deepseek-v4.1-flash-free`. This is the
  site's default router and model.
- **Or** click **Connect with OpenRouter** in the same panel to sign in to OpenRouter
  and use its free model, with nothing to copy.
- Or pick any other OpenAI-compatible provider under **Advanced settings**.

Your key stays in your browser for this site only. After trying it, select
**Delete setup** under **Advanced settings (optional)** and close the tab.

Sample questions (also in `agent-manifest.json`):

- "Buatkan brief riset singkat tentang sejarah Jakarta."
- "Apa itu fotosintesis? Jelaskan dengan sumber."
- "Buat dan simpan brief riset tentang Candi Borobudur."
- "Periksa apakah benar Candi Borobudur dibangun pada abad ke-9."
- "Tampilkan brief yang sudah saya simpan."
- "Bisakah kamu memesan tiket pesawat untuk saya?" (the agent must decline this)

The assistant sends your messages, and the page data it reads, to the LLM provider
you pick. Briefs are stored only in your browser (localStorage); nothing is sent to
a server by this site.

## Linked site

**Pemeriksa Fakta** (`/peer/`, network `pemeriksa_fakta`) is a second agent site in
this repository. RisetKita's network calls it when the visitor asks to check a claim.

- Its network URL is `https://erwinsp27.github.io/risetku/peer/pemeriksa_fakta`.
- On the live site both networks share one origin, so no consent card appears for
  the peer call (same-origin peers need none under the runtime's rules). When the
  peer is served on another origin, the visitor gets a consent card showing the
  partner's label, host and the first 140 characters of the request before anything
  is sent; **Always allow** skips the card for that host until the page is reloaded.
- A request contains only the claim in one short sentence — never names, emails,
  phone numbers or booking codes.
- The partner's network runs in the visitor's browser on the visitor's key, with
  only the reads its bridge shares with this site, and a call costs more than the
  card's token estimate.

## Run locally

```shell
# From this folder, serve the site (any static server works; this one sends the
# CORS headers the spec wants on the public agent files):
node ../agentic-web/skills/agentify-website/scripts/serve_site.mjs . --port 8080
# Open http://127.0.0.1:8080/ and add your key in ⚙ AI model settings.
```

To try the linked peer on another origin locally, serve the same folder a second
time on another port and host name:

```shell
node ../agentic-web/skills/agentify-website/scripts/serve_site.mjs . --port 8081 --open-as localhost
```

then point the `tools` entry and `link_labels` in `risetku.hocon` at
`http://localhost:8081/peer/pemeriksa_fakta`, rebuild (below), and run
`check_partner.mjs` on that URL.

## Files

```text
index.html, styles.css, assistant.css   the page (loads js/app.js + site.js)
js/app.js                               the page object: brief library, state, facts
js/wiki.js                              Wikipedia search + summary (direct, CORS)
site.js                                 boots the runtime; confirmation dialog
site-actions.js                         registers the 5 website_* actions
risetku.hocon                           source of truth for the agent network
risetku.network.json                    generated by build_network.mjs; do not edit
agent-manifest.json                     networks, router, peer policy, actions
links.json                              peer-network link map
agent-mcp.json, .well-known/            generated discovery files
bridge/                                 action bridge + shared reads
runtime/                                nsdeploy browser runtime (agentify-website
                                        copy, unchanged)
peer/                                   the Pemeriksa Fakta peer site (same layout)
tests/                                  node tests (18) + DOM stand-ins
_dev/ is NOT in this repo: local dev server + Playwright checks used to verify
the site in an offline test browser.
video/                                  demo recording + narration script
```

## Build and test

```shell
SKILL=../agentic-web/skills/agentify-website
node $SKILL/scripts/build_network.mjs risetku.hocon --manifest agent-manifest.json
node $SKILL/scripts/build_network.mjs peer/pemeriksa_fakta.hocon --manifest peer/agent-manifest.json
node --test "tests/*.test.mjs"            # 18 tests, no LLM key needed
```

The Playwright end-to-end check (`_dev/e2e-test.mjs`, kept out of this repo because
it needs a local LLM/Wikipedia proxy for the offline test browser) verifies the full
flow in a real browser: page loads, BYOK through the settings UI, a research turn
with live Wikipedia data, saving a brief to the library, a peer fact-check behind
the consent card, an honest decline of an unsupported request, and the standalone
peer page. 14/14 checks pass.

## Known limits

- The agent only knows what it reads from Wikipedia bahasa Indonesia. It cannot
  book, pay, log in, open paid/login-only sites, make images, or use another source.
- The default router (100milionseek) is free and OpenAI-compatible; it sends
  `Access-Control-Allow-Origin: *`, so browsers can call it directly. If a visitor's
  provider blocks browser calls, the settings panel offers OpenRouter instead.
- GitHub Pages does not send CORS headers on the public agent files; other agent
  sites should read them through the jsDelivr mirror above (same files, CORS on).
- The runtime's own note: `read` and `write` tools run with no dialog; only
  `irreversible` actions ask first. Deleting a brief is irreversible and asks first.

## License

Apache 2.0 (runtime: nsdeploy, see `runtime/LICENSE.txt`). The site code and the
agent networks in this repository are Apache 2.0 too.

## Catatan untuk Erwin (ringkas)

- Repo ini: `Erwinsp27/risetku`, tampil di `https://erwinsp27.github.io/risetku/`.
- Yang masih harus Erwin lakukan dari HP (lihat `video/naskah-narasi.md`):
  1. Buat akun Devpost gratis, daftar ke hackathon, isi form submit (link situs,
     link repo, link video YouTube, deskripsi, screenshot).
  2. Buat channel YouTube, upload `video/demo-risetku.mp4` (publik), salin linknya.
  3. Rekam suara sendiri menjelaskan proyek (naskah di `video/naskah-narasi.md`) —
     video wajib ada penjelasan dari peserta, bukan suara AI.
- Kunci API 100milionseek TIDAK ada di repo ini. Pengunjung memasukkan kunci
  mereka sendiri di pengaturan situs.
