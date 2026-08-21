import { MODULE_ID } from "./constants.js";
import { isStarship, setStarshipEnabled, getStarshipData, canObserve } from "./data.js";
import { openStarshipSheet } from "./starship-sheet.js";

export function registerActorIntegration() {
  Hooks.on("getActorSheetHeaderButtons", (app, buttons) => {
    const actor = app?.actor ?? app?.object;
    if (!actor) return;
    if (isStarship(actor)) {
      buttons.unshift({
        label: game.i18n.localize("PF1ESFRPGStarships.HeaderOpenStarship"),
        class: "pf1e-sfrpg-starship-open",
        icon: "fas fa-rocket",
        onclick: () => openStarshipSheet(actor)
      });
    }
    if (game.user.isGM && !isStarship(actor)) {
      buttons.unshift({
        label: game.i18n.localize("PF1ESFRPGStarships.HeaderMarkStarship"),
        class: "pf1e-sfrpg-starship-mark",
        icon: "fas fa-satellite",
        onclick: async () => {
          await setStarshipEnabled(actor, true);
          openStarshipSheet(actor);
        }
      });
    }
  });

  Hooks.on("renderActorSheet", async (app, html) => {
    const actor = app?.actor ?? app?.object;
    if (!actor || !isStarship(actor) || !canObserve(actor)) return;
    if (html.find(`.${MODULE_ID}-summary`).length) return;
    const data = getStarshipData(actor);
    const summary = $(`
      <div class="${MODULE_ID}-summary">
        <div class="summary-title"><i class="fas fa-rocket"></i> ${game.i18n.localize("PF1ESFRPGStarships.Starship")}</div>
        <div class="summary-values">
          <span>${game.i18n.localize("PF1ESFRPGStarships.Hull")}: <strong>${data.hull.value} / ${data.hull.max}</strong></span>
          <span>${game.i18n.localize("PF1ESFRPGStarships.Shields")}: <strong>${data.shields.forward.value}/${data.shields.forward.max} • ${data.shields.port.value}/${data.shields.port.max} • ${data.shields.starboard.value}/${data.shields.starboard.max} • ${data.shields.aft.value}/${data.shields.aft.max}</strong></span>
        </div>
        <button type="button" class="open-starship-sheet"><i class="fas fa-rocket"></i> ${game.i18n.localize("PF1ESFRPGStarships.OpenStarshipSheet")}</button>
      </div>
    `);
    summary.find("button.open-starship-sheet").on("click", () => openStarshipSheet(actor));
    const target = html.find(".sheet-body").first();
    if (target.length) target.prepend(summary);
    else html.find("form").prepend(summary);
  });
}
