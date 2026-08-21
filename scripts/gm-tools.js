import { MODULE_ID, TEMPLATES } from "./constants.js";
import { createStarshipActor, setStarshipEnabled, getStarshipData, updateStarshipData, exportStarship, isStarship } from "./data.js";
import { openStarshipSheet } from "./starship-sheet.js";
import { PF1eSfrpgStarshipImporter } from "./importer.js";
import { overlayManager } from "./canvas-overlay.js";

export class PF1eSfrpgStarshipGMTools extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "pf1e-sfrpg-starship-gm-tools",
      classes: ["pf1", "pf1e-sfrpg-starships", "gm-tools"],
      title: game.i18n.localize("PF1ESFRPGStarships.GMToolsTitle"),
      template: TEMPLATES.GM_TOOLS,
      width: 620,
      height: "auto",
      closeOnSubmit: false
    });
  }

  async getData() {
    const selected = this.selectedActor();
    return {
      selected,
      selectedIsStarship: selected ? isStarship(selected) : false,
      starships: game.actors?.contents?.filter(isStarship).map(a => ({ id: a.id, name: a.name })) ?? []
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action]").on("click", this._onAction.bind(this));
  }

  async _updateObject(_event, _formData) {}

  selectedActor() {
    return canvas?.tokens?.controlled?.[0]?.actor ?? null;
  }

  async _onAction(event) {
    event.preventDefault();
    const action = event.currentTarget.dataset.action;
    try {
      if (action === "create") return this.createStarship();
      if (action === "mark") return this.markSelected();
      if (action === "unmark") return this.unmarkSelected();
      if (action === "open") return this.openSelected();
      if (action === "importer") return new PF1eSfrpgStarshipImporter().render(true);
      if (action === "export") return this.exportSelected();
      if (action === "refresh-overlays") return overlayManager.refreshAll();
      if (action === "clear-overlays") return overlayManager.clearAll();
      if (action === "validate") return this.validateStarships();
      if (action === "repair") return this.repairSelected();
      if (action === "reset-shields") return this.resetSelectedShields();
      if (action === "reset-hull") return this.resetSelectedHull();
    } catch (err) {
      console.error(err);
      ui.notifications.error(err.message ?? String(err));
    }
  }

  async createStarship() {
    const actor = await createStarshipActor();
    ui.notifications.info(game.i18n.format("PF1ESFRPGStarships.CreatedStarship", { name: actor.name }));
    openStarshipSheet(actor);
    this.render(false);
  }

  async markSelected() {
    const actor = this.selectedActor();
    if (!actor) return ui.notifications.warn(game.i18n.localize("PF1ESFRPGStarships.NoTokenSelected"));
    await setStarshipEnabled(actor, true);
    openStarshipSheet(actor);
    overlayManager.refreshActorTokens(actor);
    this.render(false);
  }

  async unmarkSelected() {
    const actor = this.selectedActor();
    if (!actor) return ui.notifications.warn(game.i18n.localize("PF1ESFRPGStarships.NoTokenSelected"));
    await actor.update({ [`flags.${MODULE_ID}`]: null });
    overlayManager.refreshActorTokens(actor);
    this.render(false);
  }

  openSelected() {
    const actor = this.selectedActor();
    if (!actor) return ui.notifications.warn(game.i18n.localize("PF1ESFRPGStarships.NoTokenSelected"));
    openStarshipSheet(actor);
  }

  async exportSelected() {
    const actor = this.selectedActor();
    if (!actor) return ui.notifications.warn(game.i18n.localize("PF1ESFRPGStarships.NoTokenSelected"));
    const text = JSON.stringify(exportStarship(actor), null, 2);
    new Dialog({
      title: game.i18n.localize("PF1ESFRPGStarships.ExportStarship"),
      content: `<textarea style="width:100%;height:420px;">${foundry.utils.escapeHTML(text)}</textarea>`,
      buttons: { close: { label: game.i18n.localize("PF1ESFRPGStarships.Close") } }
    }).render(true);
  }

  validateStarships() {
    const starships = game.actors?.contents?.filter(isStarship) ?? [];
    const invalid = [];
    for (const actor of starships) {
      const data = getStarshipData(actor);
      if (!data.hull || !data.shields) invalid.push(actor.name);
    }
    const msg = invalid.length
      ? game.i18n.format("PF1ESFRPGStarships.InvalidStarships", { names: invalid.join(", ") })
      : game.i18n.localize("PF1ESFRPGStarships.NoInvalidStarships");
    ui.notifications.info(msg);
  }

  async repairSelected() {
    const actor = this.selectedActor();
    if (!actor) return ui.notifications.warn(game.i18n.localize("PF1ESFRPGStarships.NoTokenSelected"));
    const data = getStarshipData(actor);
    await updateStarshipData(actor, data);
    overlayManager.refreshActorTokens(actor);
  }

  async resetSelectedShields() {
    const actor = this.selectedActor();
    if (!actor) return ui.notifications.warn(game.i18n.localize("PF1ESFRPGStarships.NoTokenSelected"));
    const data = getStarshipData(actor);
    for (const f of ["forward", "port", "starboard", "aft"]) data.shields[f].value = data.shields[f].max;
    await updateStarshipData(actor, { shields: data.shields });
    overlayManager.refreshActorTokens(actor);
  }

  async resetSelectedHull() {
    const actor = this.selectedActor();
    if (!actor) return ui.notifications.warn(game.i18n.localize("PF1ESFRPGStarships.NoTokenSelected"));
    const data = getStarshipData(actor);
    data.hull.value = data.hull.max;
    await updateStarshipData(actor, { hull: data.hull });
    overlayManager.refreshActorTokens(actor);
  }
}
