// Mounts the assistant inside the peer page. Load it with:
//   <script type="module" src="site.js"></script>

/**
 * Boots the browser runtime in the page's assistant section.
 * The peer site has no irreversible actions, so DIALOGS stays empty and the
 * runtime's own confirmation dialog handles anything else.
 */
export class AssistantMount {
  static GREETING = "Halo! Saya Pemeriksa Fakta. Berikan sebuah klaim, saya periksa terhadap Wikipedia bahasa Indonesia: didukung, tidak ditemukan buktinya, atau bertentangan dengan sumber.";

  static DIALOGS = {};

  static async start() {
    const status = document.querySelector("#assistant-status");
    const siteBase = new URL("./", import.meta.url).href;
    try {
      const { boot } = await import("./runtime/index.js");
      const booted = await boot("#agent-app", {
        originUrl: siteBase,
        sandboxWorkerUrl: new URL("runtime/sandbox-worker.js", siteBase).href,
      });
      AssistantMount.engine = booted.engine;
      const needsKey = !booted.engine.mockLLM
        && (!booted.engine.byokKey || booted.engine.byokKey === "demo");
      status.textContent = needsKey
        ? "Asisten butuh kunci API penyedia AI Anda. Tambahkan di pengaturan model AI di bawah."
        : "Asisten terhubung ke halaman ini.";
      if (!needsKey) {
        AssistantMount.greet();
      }
      return booted.engine;
    } catch (error) {
      status.textContent = "Asisten gagal dimuat. Anda tetap bisa memakai halaman ini.";
      console.error("Assistant startup failed", error);
      return null;
    }
  }

  static greet() {
    const first = document.querySelector("#ns-msgs .ns-msg.bot");
    if (first) {
      first.textContent = AssistantMount.GREETING;
    }
  }
}

// Boot only in a browser. Node tests import this file to check the dialog's words.
if (typeof window !== "undefined") {
  await AssistantMount.start();
}
