import { MODULE_ID, MODULE_TITLE, TEMPLATES } from "./constants.js";
import { registerSettings } from "./settings.js";
import { registerActorIntegration } from "./actor-integration.js";
import { overlayManager } from "./canvas-overlay.js";
import { StarshipAPI } from "./api.js";
import { migrateWorld } from "./migration.js";

Hooks.once("init", async () => {
  registerSettings();
  await loadTemplates(Object.values(TEMPLATES));
  const module = game.modules.get(MODULE_ID);
  if (module) module.api = StarshipAPI;
  registerActorIntegration();
  overlayManager.registerHooks();
  console.log(`${MODULE_ID} | Initialized ${MODULE_TITLE} for Foundry VTT v12 build 331 and PF1e 11.11.`);
});

Hooks.once("ready", async () => {
  if (game.system?.id !== "pf1") {
    ui.notifications.warn(game.i18n.localize("PF1ESFRPGStarships.WarnPF1Only"));
    return;
  }
  if (!game.systems?.get?.("sfrpg")) {
    ui.notifications.warn(game.i18n.localize("PF1ESFRPGStarships.WarnSfrpgNotInstalled"));
  }
  await migrateWorld();
  overlayManager.refreshAll();
});

Hooks.on("updateSetting", setting => {
  if (setting?.key?.startsWith(`${MODULE_ID}.`)) overlayManager.refreshAll();
});
