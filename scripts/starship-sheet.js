import { MODULE_ID, TEMPLATES, FACINGS, FACING_LABELS, COMPONENT_TYPES, ACTION_PHASES } from "./constants.js";
import {
  getStarshipData,
  updateStarshipData,
  canOwnerEdit,
  sanitizeComponent,
  sanitizeAction,
  uid,
  num
} from "./data.js";
import { postActionToChat } from "./chat.js";
import { overlayManager } from "./canvas-overlay.js";

export class PF1eSfrpgStarshipSheet extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "pf1e-sfrpg-starship-sheet",
      classes: ["pf1", "pf1e-sfrpg-starships", "starship-sheet"],
      title: game.i18n.localize("PF1ESFRPGStarships.StarshipSheetTitle"),
      template: TEMPLATES.STARSHIP_SHEET,
      width: 820,
      height: "auto",
      resizable: true,
      closeOnSubmit: false,
      submitOnChange: false,
      submitOnClose: true,
      tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "overview" }]
    });
  }

  get actor() {
    return this.object;
  }

  get title() {
    return `${game.i18n.localize("PF1ESFRPGStarships.StarshipSheetTitle")} — ${this.actor?.name ?? ""}`;
  }

  async getData(options = {}) {
    const data = getStarshipData(this.actor);
    const canEditHull = canOwnerEdit(this.actor, "allowOwnerEditHull");
    const canEditShields = canOwnerEdit(this.actor, "allowOwnerEditShields");
    const canEditComponents = game.user.isGM || canOwnerEdit(this.actor, "allowOwnerEditComponents");
    const canEditCrew = game.user.isGM || canOwnerEdit(this.actor, "allowOwnerEditCrew");
    const canUseActions = game.user.isGM || canOwnerEdit(this.actor, "allowOwnerUseActions");

    return {
      ...super.getData(options),
      actor: this.actor,
      starship: data,
      moduleId: MODULE_ID,
      facings: FACINGS.map(f => ({ key: f, label: game.i18n.localize(FACING_LABELS[f]), shield: data.shields[f] })),
      componentTypes: COMPONENT_TYPES,
      actionPhases: ACTION_PHASES,
      canEditHull,
      canEditShields,
      canEditComponents,
      canEditCrew,
      canUseActions,
      isGM: game.user.isGM
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action='reset-shields']").on("click", this._onResetShields.bind(this));
    html.find("[data-action='add-component']").on("click", this._onAddComponent.bind(this));
    html.find("[data-action='delete-component']").on("click", this._onDeleteComponent.bind(this));
    html.find("[data-action='add-action']").on("click", this._onAddAction.bind(this));
    html.find("[data-action='delete-action']").on("click", this._onDeleteAction.bind(this));
    html.find("[data-action='post-action']").on("click", this._onPostAction.bind(this));
    html.find("[data-action='add-crew']").on("click", this._onAddCrew.bind(this));
    html.find("[data-action='delete-crew']").on("click", this._onDeleteCrew.bind(this));
    html.find("[data-action='refresh-overlay']").on("click", () => overlayManager.refreshAll());
  }

  async _updateObject(_event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    const current = getStarshipData(this.actor);

    if (!game.user.isGM) {
      if (!canOwnerEdit(this.actor, "allowOwnerEditHull")) delete expanded.hull;
      if (!canOwnerEdit(this.actor, "allowOwnerEditShields")) delete expanded.shields;
      if (!canOwnerEdit(this.actor, "allowOwnerEditComponents")) delete expanded.components;
      if (!canOwnerEdit(this.actor, "allowOwnerEditCrew")) delete expanded.crew;
      delete expanded.actions;
      delete expanded.stats;
      delete expanded.systems;
      delete expanded.weapons;
    }

    const update = foundry.utils.mergeObject(current, expanded, { inplace: false, recursive: true });
    update.hull.value = Math.max(0, num(update.hull?.value, current.hull.value));
    update.hull.max = Math.max(0, num(update.hull?.max, current.hull.max));
    for (const f of FACINGS) {
      update.shields[f].value = Math.max(0, num(update.shields?.[f]?.value, current.shields[f].value));
      update.shields[f].max = Math.max(0, num(update.shields?.[f]?.max, current.shields[f].max));
    }
    update.components = (update.components ?? current.components).map(sanitizeComponent).filter(Boolean);
    update.actions = (update.actions ?? current.actions).map(sanitizeAction).filter(Boolean);
    await updateStarshipData(this.actor, update);
    overlayManager.refreshActorTokens(this.actor);
  }

  async _onResetShields(event) {
    event.preventDefault();
    await this.submit({ preventClose: true });
    const data = getStarshipData(this.actor);
    for (const f of FACINGS) data.shields[f].value = data.shields[f].max;
    await updateStarshipData(this.actor, { shields: data.shields });
    overlayManager.refreshActorTokens(this.actor);
    this.render(false);
  }

  async _onAddComponent(event) {
    event.preventDefault();
    await this.submit({ preventClose: true });
    const data = getStarshipData(this.actor);
    data.components.push(sanitizeComponent({ name: game.i18n.localize("PF1ESFRPGStarships.NewComponent"), type: "other", id: uid() }));
    await updateStarshipData(this.actor, { components: data.components });
    this.render(false);
  }

  async _onDeleteComponent(event) {
    event.preventDefault();
    await this.submit({ preventClose: true });
    const id = event.currentTarget.dataset.id;
    const data = getStarshipData(this.actor);
    data.components = data.components.filter(c => c.id !== id);
    await updateStarshipData(this.actor, { components: data.components });
    this.render(false);
  }

  async _onAddAction(event) {
    event.preventDefault();
    await this.submit({ preventClose: true });
    const data = getStarshipData(this.actor);
    data.actions.push(sanitizeAction({ name: game.i18n.localize("PF1ESFRPGStarships.NewAction"), phase: "open", id: uid() }));
    await updateStarshipData(this.actor, { actions: data.actions });
    this.render(false);
  }

  async _onDeleteAction(event) {
    event.preventDefault();
    await this.submit({ preventClose: true });
    const id = event.currentTarget.dataset.id;
    const data = getStarshipData(this.actor);
    data.actions = data.actions.filter(a => a.id !== id);
    await updateStarshipData(this.actor, { actions: data.actions });
    this.render(false);
  }

  async _onPostAction(event) {
    event.preventDefault();
    await this.submit({ preventClose: true });
    const id = event.currentTarget.dataset.id;
    await postActionToChat(this.actor, id);
  }

  async _onAddCrew(event) {
    event.preventDefault();
    await this.submit({ preventClose: true });
    const data = getStarshipData(this.actor);
    data.crew.push({ id: uid(), role: game.i18n.localize("PF1ESFRPGStarships.CrewRole"), name: "", actorUuid: "", notes: "" });
    await updateStarshipData(this.actor, { crew: data.crew });
    this.render(false);
  }

  async _onDeleteCrew(event) {
    event.preventDefault();
    await this.submit({ preventClose: true });
    const id = event.currentTarget.dataset.id;
    const data = getStarshipData(this.actor);
    data.crew = data.crew.filter(c => c.id !== id);
    await updateStarshipData(this.actor, { crew: data.crew });
    this.render(false);
  }
}

export function openStarshipSheet(actor) {
  if (!actor) return ui.notifications.warn(game.i18n.localize("PF1ESFRPGStarships.NoActorSelected"));
  return new PF1eSfrpgStarshipSheet(actor).render(true);
}
