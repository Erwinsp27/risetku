// Pemeriksa Fakta page: a minimal page object for the peer site. The peer has no
// library and no writes: it only reads public facts and Wikipedia. Its bridge
// shares those same reads with sites that call its network.
import { searchWikipedia, readWikipediaArticle } from "../../js/wiki.js";

export const FACTS = {
  about: "Pemeriksa Fakta adalah jaringan agen pemeriksa klaim: diberi sebuah klaim, agen mencari dan membaca artikel Wikipedia bahasa Indonesia, lalu menjawab apakah klaim itu didukung, tidak ditemukan buktinya, atau bertentangan dengan sumber.",
  sources: "Semua pemeriksaan memakai Wikipedia bahasa Indonesia (id.wikipedia.org) sebagai sumber.",
  limits: "Pemeriksa Fakta hanya memeriksa klaim faktual yang bisa dicek di Wikipedia. Ia tidak menilai opini, tidak memesan atau membayar apa pun, dan tidak login ke akun mana pun.",
};

function todayStrings() {
  const now = new Date();
  return {
    iso: now.toISOString().slice(0, 10),
    long: now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  };
}

export class Page {
  /** Plain-JSON state for the agent: date and public facts. No visitor data. */
  getState() {
    const today = todayStrings();
    return {
      today: today.iso,
      todayLong: today.long,
      facts: FACTS,
      mainSite: "../",
    };
  }
}

export class App {
  static page = new Page();
  static searchWikipedia = searchWikipedia;
  static readWikipediaArticle = readWikipediaArticle;
}
