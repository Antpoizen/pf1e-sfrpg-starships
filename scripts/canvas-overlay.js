import { MODULE_ID, FACINGS, FACING_LABELS, HOOKS } from "./constants.js";
import { isStarship, getStarshipData, canObserve, logDebug } from "./data.js";

function toNumberSetting(key, fallback) {
  const value = Number(game.settings.get(MODULE_ID, key));
  return Number.isFinite(value) ? value : fallback;
}

export class StarshipOverlayManager {
  constructor() {
    this.layer = null;
    this.overlays = new Map();
  }

  registerHooks() {
    Hooks.on("canvasReady", () => this.refreshAll());
    Hooks.on("canvasTearDown", () => this.clearAll());
    Hooks.on("drawToken", token => this.refreshToken(token));
    Hooks.on("refreshToken", token => this.refreshToken(token));
    Hooks.on("destroyToken", token => this.clearToken(token));
    Hooks.on("createToken", doc => this.refreshDocumentToken(doc));
    Hooks.on("updateToken", doc => this.refreshDocumentToken(doc));
    Hooks.on("deleteToken", doc => this.clearDocumentToken(doc));
    Hooks.on("updateActor", actor => this.refreshActorTokens(actor));
    Hooks.on("controlToken", token => this.refreshToken(token));
  }

  getLayer() {
    if (!canvas?.ready || !canvas.tokens) return null;
    if (this.layer && !this.layer.destroyed && this.layer.parent) return this.layer;
    this.layer = new PIXI.Container();
    this.layer.name = `${MODULE_ID}-overlay-layer`;
    this.layer.sortableChildren = true;
    canvas.tokens.addChild(this.layer);
    return this.layer;
  }

  shouldDisplay(token) {
    if (!game.settings.get(MODULE_ID, "enabled")) return false;
    if (!game.settings.get(MODULE_ID, "overlayEnabled")) return false;
    const actor = token?.actor;
    if (!actor || !isStarship(actor)) return false;
    if (token.document?.hidden && !game.user.isGM) return false;
    if (!canObserve(actor, game.user)) return false;
    const data = getStarshipData(actor);
    return data.overlayEnabled !== false;
  }

  refreshDocumentToken(document) {
    const token = document?.object ?? canvas?.tokens?.get(document?.id);
    if (token) this.refreshToken(token);
  }

  clearDocumentToken(document) {
    const token = document?.object ?? canvas?.tokens?.get(document?.id);
    if (token) this.clearToken(token);
  }

  refreshActorTokens(actor) {
    if (!canvas?.ready || !actor) return;
    for (const token of canvas.tokens?.placeables ?? []) {
      if (token.actor?.id === actor.id) this.refreshToken(token);
    }
  }

  refreshAll() {
    if (!canvas?.ready) return;
    this.ensureLayerClean();
    for (const token of canvas.tokens?.placeables ?? []) this.refreshToken(token);
  }

  ensureLayerClean() {
    const layer = this.getLayer();
    if (!layer) return;
    for (const [id, container] of this.overlays.entries()) {
      if (!container || container.destroyed) this.overlays.delete(id);
    }
  }

  clearAll() {
    for (const container of this.overlays.values()) {
      if (container && !container.destroyed) container.destroy({ children: true });
    }
    this.overlays.clear();
    if (this.layer && !this.layer.destroyed) {
      this.layer.removeChildren();
      if (this.layer.parent) this.layer.parent.removeChild(this.layer);
      this.layer.destroy({ children: true });
    }
    this.layer = null;
  }

  clearToken(token) {
    const id = token?.id ?? token?.document?.id;
    if (!id) return;
    const old = this.overlays.get(id);
    if (old && !old.destroyed) old.destroy({ children: true });
    this.overlays.delete(id);
  }

  refreshToken(token) {
    if (!token?.document) return;
    const layer = this.getLayer();
    if (!layer) return;
    this.clearToken(token);
    if (!this.shouldDisplay(token)) return;

    const data = getStarshipData(token.actor);
    const container = this.createOverlay(token, data);
    if (!container) return;
    layer.addChild(container);
    this.overlays.set(token.id, container);
    Hooks.callAll(HOOKS.OVERLAY_REFRESHED, token, data);
  }

  createOverlay(token, data) {
    const center = this.tokenCenter(token);
    const maxDim = Math.max(token.w ?? token.width ?? 100, token.h ?? token.height ?? 100);
    const distance = maxDim * toNumberSetting("overlayDistance", 0.58);
    const rotation = Number(token.document?.rotation ?? 0);
    const baseAngle = (rotation - 90) * Math.PI / 180;
    const showLabels = game.settings.get(MODULE_ID, "showLabels");
    const valuesOnly = game.settings.get(MODULE_ID, "valuesOnly");

    const container = new PIXI.Container();
    container.name = `${MODULE_ID}-${token.id}`;
    container.zIndex = 10_000;

    const hullText = this.makeText(this.formatHull(data), true);
    hullText.anchor.set(0.5);
    hullText.position.set(center.x, center.y);
    container.addChild(hullText);

    const angles = {
      forward: baseAngle,
      starboard: baseAngle + Math.PI / 2,
      aft: baseAngle + Math.PI,
      port: baseAngle - Math.PI / 2
    };

    for (const facing of FACINGS) {
      const label = valuesOnly ? "" : showLabels ? `${game.i18n.localize(FACING_LABELS[facing])}: ` : "";
      const shield = data.shields[facing] ?? { value: 0, max: 0 };
      const text = this.makeText(`${label}${shield.value} / ${shield.max}`, false);
      text.anchor.set(0.5);
      const angle = angles[facing];
      text.position.set(center.x + Math.cos(angle) * distance, center.y + Math.sin(angle) * distance);
      text.rotation = 0;
      container.addChild(text);
    }

    return container;
  }

  makeText(text, isHull = false) {
    const style = new PIXI.TextStyle({
      fontFamily: "Signika, Arial, sans-serif",
      fontSize: isHull ? toNumberSetting("hullTextSize", 22) : toNumberSetting("shieldTextSize", 18),
      fill: game.settings.get(MODULE_ID, "textColor") || "#d8f3ff",
      stroke: game.settings.get(MODULE_ID, "outlineColor") || "#001927",
      strokeThickness: 4,
      align: "center",
      fontWeight: isHull ? "700" : "600",
      dropShadow: true,
      dropShadowColor: "#000000",
      dropShadowBlur: 3,
      dropShadowDistance: 1,
      dropShadowAlpha: 0.65
    });
    const pixiText = new PIXI.Text(String(text), style);
    pixiText.alpha = Math.max(0, Math.min(1, toNumberSetting("textOpacity", 1)));
    pixiText.resolution = 2;
    return pixiText;
  }

  tokenCenter(token) {
    const c = token.center;
    if (c) return c;
    return {
      x: Number(token.x ?? token.document?.x ?? 0) + Number(token.w ?? 100) / 2,
      y: Number(token.y ?? token.document?.y ?? 0) + Number(token.h ?? 100) / 2
    };
  }

  formatHull(data) {
    return `${data.hull.value} / ${data.hull.max}`;
  }
}

export const overlayManager = new StarshipOverlayManager();
