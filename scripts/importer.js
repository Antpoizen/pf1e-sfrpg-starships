import { MODULE_ID, TEMPLATES, HOOKS } from "./constants.js";
import { createStarshipActor, updateStarshipData, sanitizeComponent, sanitizeAction, getStarshipData, uid, num } from "./data.js";
import { openStarshipSheet } from "./starship-sheet.js";

function get(obj, path, fallback = undefined) {
  return foundry.utils.getProperty(obj, path) ?? fallback;
}

function firstNumber(obj, paths, fallback = 0) {
  for (const path of paths) {
    const value = get(obj, path);
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function firstString(obj, paths, fallback = "") {
  for (const path of paths) {
    const value = get(obj, path);
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return fallback;
}

export class PF1eSfrpgStarshipImporter extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "pf1e-sfrpg-starship-importer",
      classes: ["pf1", "pf1e-sfrpg-starships", "starship-importer"],
      title: game.i18n.localize("PF1ESFRPGStarships.ImporterTitle"),
      template: TEMPLATES.IMPORTER,
      width: 760,
      height: "auto",
      resizable: true,
      closeOnSubmit: false,
      submitOnChange: false
    });
  }

  async getData() {
    const sfrpgInstalled = Boolean(game.systems?.get?.("sfrpg"));
    const packs = this.getCandidatePacks();
    return {
      sfrpgInstalled,
      packs,
      directImportEnabled: game.settings.get(MODULE_ID, "directSfrpgImport"),
      jsonImportEnabled: game.settings.get(MODULE_ID, "jsonImport")
    };
  }

  getCandidatePacks() {
    const packs = [];
    for (const pack of game.packs ?? []) {
      const meta = pack.metadata ?? {};
      const id = pack.collection ?? meta.id ?? "";
      const label = meta.label ?? pack.title ?? id;
      const pkg = meta.packageName ?? meta.package ?? meta.system ?? "";
      const haystack = `${id} ${label} ${pkg} ${meta.name ?? ""}`.toLowerCase();
      if (pkg === "sfrpg" || haystack.includes("sfrpg") || haystack.includes("starship")) {
        if (haystack.includes("starship") || haystack.includes("ship") || haystack.includes("component") || haystack.includes("action")) {
          packs.push({ id, label, documentName: pack.documentName, packageName: pkg || "unknown" });
        }
      }
    }
    return packs.sort((a, b) => a.label.localeCompare(b.label));
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action='import-pack-entry']").on("click", this._onImportPackEntry.bind(this));
    html.find("[data-action='import-json']").on("click", this._onImportJson.bind(this));
    html.find("[data-action='paste-example']").on("click", this._onPasteExample.bind(this));
  }

  async _updateObject(_event, _formData) {}

  async _onImportPackEntry(event) {
    event.preventDefault();
    if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("PF1ESFRPGStarships.GMOnly"));
    const form = $(event.currentTarget).closest("form");
    const packId = String(form.find("[name='packId']").val() ?? "").trim();
    const documentId = String(form.find("[name='documentId']").val() ?? "").trim();
    if (!packId || !documentId) return ui.notifications.warn(game.i18n.localize("PF1ESFRPGStarships.PackAndIdRequired"));
    const actor = await importFromSfrpgPack(packId, { documentId });
    if (actor) openStarshipSheet(actor);
  }

  async _onImportJson(event) {
    event.preventDefault();
    if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("PF1ESFRPGStarships.GMOnly"));
    const form = $(event.currentTarget).closest("form");
    const text = String(form.find("[name='jsonImport']").val() ?? "").trim();
    if (!text) return ui.notifications.warn(game.i18n.localize("PF1ESFRPGStarships.JsonRequired"));
    const actor = await importFromJson(text);
    if (actor) openStarshipSheet(actor);
  }

  _onPasteExample(event) {
    event.preventDefault();
    const form = $(event.currentTarget).closest("form");
    form.find("[name='jsonImport']").val(JSON.stringify({
      name: "Example Starship",
      hull: { value: 55, max: 55 },
      shields: {
        forward: { value: 15, max: 10 },
        port: { value: 3, max: 10 },
        starboard: { value: 1, max: 10 },
        aft: { value: 2, max: 10 }
      },
      stats: { tier: 1, size: "Medium", speed: 8, maneuverability: "Average" },
      components: [{ name: "Basic Shields", type: "shields", pcu: 10 }],
      actions: [{ name: "Divert", phase: "engineering", crewRole: "Engineer" }]
    }, null, 2));
  }
}

export async function importFromSfrpgPack(packId, options = {}) {
  const pack = game.packs?.get(packId);
  if (!pack) throw new Error(game.i18n.format("PF1ESFRPGStarships.ErrorPackNotFound", { pack: packId }));
  const doc = await pack.getDocument(options.documentId);
  if (!doc) throw new Error(game.i18n.localize("PF1ESFRPGStarships.ErrorDocumentNotFound"));
  const raw = doc.toObject ? doc.toObject() : foundry.utils.deepClone(doc);
  const actor = await createStarshipActor(normalizeImportedStarship(raw, { sourcePack: packId, sourceId: doc.id, sourceUuid: doc.uuid }));
  Hooks.callAll(HOOKS.IMPORT_COMPLETED, actor, packId, doc);
  return actor;
}

export async function importFromJson(json) {
  const raw = typeof json === "string" ? JSON.parse(json) : json;
  if (Array.isArray(raw)) {
    let last = null;
    for (const entry of raw) last = await createStarshipActor(normalizeImportedStarship(entry, { sourceSystem: "json" }));
    return last;
  }
  const actor = await createStarshipActor(normalizeImportedStarship(raw, { sourceSystem: "json" }));
  Hooks.callAll(HOOKS.IMPORT_COMPLETED, actor, "json", raw);
  return actor;
}

export async function importIntoExistingActor(actor, raw) {
  const normalized = normalizeImportedStarship(raw, { sourceSystem: "json" });
  await updateStarshipData(actor, normalized.starship);
  return getStarshipData(actor);
}

export function normalizeImportedStarship(raw, source = {}) {
  const obj = raw.toObject ? raw.toObject() : foundry.utils.deepClone(raw ?? {});
  const system = obj.system ?? obj.data?.data ?? obj.data ?? obj;

  const hullValue = firstNumber(obj, [
    "flags.pf1e-sfrpg-starships.hull.value",
    "hull.value",
    "system.attributes.hp.value",
    "system.attributes.hull.value",
    "system.attributes.hullPoints.value",
    "system.hull.value",
    "system.hp.value"
  ], 55);

  const hullMax = firstNumber(obj, [
    "flags.pf1e-sfrpg-starships.hull.max",
    "hull.max",
    "system.attributes.hp.max",
    "system.attributes.hull.max",
    "system.attributes.hullPoints.max",
    "system.hull.max",
    "system.hp.max"
  ], hullValue);

  const starship = {
    isStarship: true,
    overlayEnabled: true,
    hull: { value: hullValue, max: hullMax },
    shields: {
      forward: shieldFrom(obj, system, "forward", 10),
      port: shieldFrom(obj, system, "port", 10),
      starboard: shieldFrom(obj, system, "starboard", 10),
      aft: shieldFrom(obj, system, "aft", 10)
    },
    stats: {
      tier: firstNumber(obj, ["system.details.tier", "system.tier", "stats.tier", "tier"], 1),
      size: firstString(obj, ["system.traits.size", "system.details.size", "system.size", "stats.size", "size"], "Medium"),
      frame: firstString(obj, ["system.frame.name", "system.frame", "stats.frame", "frame"], ""),
      speed: firstNumber(obj, ["system.attributes.speed.value", "system.speed.value", "system.speed", "stats.speed", "speed"], 8),
      maneuverability: firstString(obj, ["system.attributes.maneuverability", "system.maneuverability", "stats.maneuverability", "maneuverability"], "Average"),
      armorClass: firstNumber(obj, ["system.attributes.ac.value", "system.attributes.ac", "system.ac", "stats.armorClass"], 0),
      targetLock: firstNumber(obj, ["system.attributes.tl.value", "system.attributes.targetLock", "system.targetLock", "stats.targetLock"], 0),
      damageThreshold: firstNumber(obj, ["system.attributes.dt.value", "system.damageThreshold", "stats.damageThreshold"], 0),
      criticalThreshold: firstNumber(obj, ["system.attributes.ct.value", "system.criticalThreshold", "stats.criticalThreshold"], 0)
    },
    systems: {},
    weapons: { forward: [], port: [], starboard: [], aft: [], turret: [] },
    components: [],
    actions: [],
    crew: [],
    import: {
      sourceSystem: source.sourceSystem ?? "sfrpg",
      sourcePack: source.sourcePack ?? "",
      sourceId: source.sourceId ?? obj._id ?? obj.id ?? "",
      sourceUuid: source.sourceUuid ?? obj.uuid ?? "",
      importedAt: new Date().toISOString()
    }
  };

  const items = Array.isArray(obj.items) ? obj.items : Array.isArray(system.items) ? system.items : [];
  for (const item of items) {
    const type = String(item.type ?? item.system?.type ?? item.system?.componentType ?? "").toLowerCase();
    if (type.includes("action") || String(item.name ?? "").toLowerCase().includes("action")) {
      const action = normalizeActionItem(item);
      if (action) starship.actions.push(action);
    } else {
      const component = normalizeComponentItem(item);
      if (component) {
        starship.components.push(component);
        placeSystemOrWeapon(starship, component);
      }
    }
  }

  const looseComponents = obj.components ?? system.components;
  if (Array.isArray(looseComponents)) {
    for (const c of looseComponents) {
      const component = sanitizeComponent({ ...c, id: c.id ?? c._id ?? uid() });
      if (component) {
        starship.components.push(component);
        placeSystemOrWeapon(starship, component);
      }
    }
  }

  const looseActions = obj.actions ?? system.actions;
  if (Array.isArray(looseActions)) {
    for (const a of looseActions) {
      const action = sanitizeAction({ ...a, id: a.id ?? a._id ?? uid() });
      if (action) starship.actions.push(action);
    }
  }

  return {
    name: obj.name ?? "Imported Starship",
    img: obj.img ?? "icons/svg/wing.svg",
    starship
  };
}

function shieldFrom(obj, system, facing, fallback) {
  const aliases = {
    forward: ["forward", "fore", "front"],
    port: ["port", "left"],
    starboard: ["starboard", "right"],
    aft: ["aft", "rear", "back"]
  }[facing];
  for (const alias of aliases) {
    const value = firstNumber(obj, [
      `flags.pf1e-sfrpg-starships.shields.${facing}.value`,
      `shields.${facing}.value`,
      `system.attributes.shields.${alias}.value`,
      `system.shields.${alias}.value`,
      `system.quadrants.${alias}.shields.value`
    ], NaN);
    const max = firstNumber(obj, [
      `flags.pf1e-sfrpg-starships.shields.${facing}.max`,
      `shields.${facing}.max`,
      `system.attributes.shields.${alias}.max`,
      `system.shields.${alias}.max`,
      `system.quadrants.${alias}.shields.max`
    ], NaN);
    if (Number.isFinite(value) || Number.isFinite(max)) return { value: Number.isFinite(value) ? value : max, max: Number.isFinite(max) ? max : value };
  }
  return { value: fallback, max: fallback };
}

function normalizeComponentItem(item) {
  const system = item.system ?? item.data?.data ?? {};
  const name = item.name ?? "";
  if (!name) return null;
  return sanitizeComponent({
    id: item._id ?? item.id ?? uid(),
    name,
    type: system.componentType ?? system.type ?? item.type ?? "other",
    bp: system.bp ?? system.bpCost ?? system.cost ?? 0,
    pcu: system.pcu ?? system.PCU ?? 0,
    description: system.description?.value ?? system.description ?? item.description ?? "",
    sourceUuid: item.uuid ?? "",
    sourceId: item._id ?? item.id ?? "",
    arc: system.arc ?? system.mount?.arc ?? "",
    data: system
  });
}

function normalizeActionItem(item) {
  const system = item.system ?? item.data?.data ?? {};
  return sanitizeAction({
    id: item._id ?? item.id ?? uid(),
    name: item.name ?? "",
    phase: system.phase ?? "open",
    crewRole: system.crewRole ?? system.role ?? "",
    skill: system.skill ?? "",
    dc: system.dc ?? system.dcFormula ?? "",
    description: system.description?.value ?? system.description ?? item.description ?? "",
    sourceUuid: item.uuid ?? "",
    sourceId: item._id ?? item.id ?? "",
    data: system
  });
}

function placeSystemOrWeapon(starship, component) {
  if (!component) return;
  if (component.type === "weapon") {
    const arc = component.arc || "turret";
    if (!starship.weapons[arc]) starship.weapons[arc] = [];
    starship.weapons[arc].push(component.id);
    return;
  }
  const key = component.type;
  if (Object.prototype.hasOwnProperty.call(starship.systems, key)) starship.systems[key] = component.id;
}
