import { MODULE_ID, DEFAULT_STARSHIP_DATA, FACINGS, COMPONENT_TYPES, ACTION_PHASES, HOOKS, MODULE_VERSION } from "./constants.js";

const deepClone = (value) => foundry.utils.deepClone(value);
const mergeObject = (original, other, options = {}) => foundry.utils.mergeObject(original, other ?? {}, { inplace: false, recursive: true, ...options });

export function localize(key) {
  return game.i18n.localize(key);
}

export function logDebug(...args) {
  if (game.settings?.get?.(MODULE_ID, "debug")) console.log(`${MODULE_ID} |`, ...args);
}

export function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function uid() {
  return foundry.utils.randomID(16);
}

export function getScopeFlags(actor) {
  return deepClone(actor?.flags?.[MODULE_ID] ?? {});
}

export function getStarshipData(actor) {
  const flags = getScopeFlags(actor);
  const merged = mergeObject(deepClone(DEFAULT_STARSHIP_DATA), flags);
  return sanitizeStarshipData(merged);
}

export function isStarship(actor) {
  return Boolean(actor?.getFlag?.(MODULE_ID, "isStarship") || actor?.flags?.[MODULE_ID]?.isStarship);
}

export function canObserve(actor, user = game.user) {
  if (!actor || !user) return false;
  if (user.isGM) return true;
  try {
    return actor.testUserPermission(user, "OBSERVER");
  } catch (_err) {
    return false;
  }
}

export function canOwnerEdit(actor, settingKey, user = game.user) {
  if (!actor || !user) return false;
  if (user.isGM) return true;
  if (!game.settings.get(MODULE_ID, settingKey)) return false;
  try {
    return actor.testUserPermission(user, "OWNER");
  } catch (_err) {
    return false;
  }
}

export function canEditAnyStarshipData(actor, user = game.user) {
  if (user?.isGM) return true;
  return canOwnerEdit(actor, "allowOwnerEditHull", user)
    || canOwnerEdit(actor, "allowOwnerEditShields", user)
    || canOwnerEdit(actor, "allowOwnerEditCrew", user)
    || canOwnerEdit(actor, "allowOwnerEditComponents", user);
}

export function sanitizeFacing(facing) {
  const key = String(facing ?? "").trim().toLowerCase();
  if (key === "fore" || key === "front") return "forward";
  if (key === "rear" || key === "back") return "aft";
  if (key === "left") return "port";
  if (key === "right") return "starboard";
  return FACINGS.includes(key) ? key : "forward";
}

export function sanitizeStarshipData(data) {
  const base = mergeObject(deepClone(DEFAULT_STARSHIP_DATA), data ?? {});
  base.isStarship = Boolean(base.isStarship);
  base.overlayEnabled = base.overlayEnabled !== false;

  base.hull = {
    value: Math.max(0, num(base.hull?.value, 0)),
    max: Math.max(0, num(base.hull?.max, 0))
  };

  const clampShields = game.settings?.settings?.has(`${MODULE_ID}.clampShields`) ? game.settings.get(MODULE_ID, "clampShields") : false;
  const shields = {};
  for (const facing of FACINGS) {
    const src = base.shields?.[facing] ?? {};
    const max = Math.max(0, num(src.max, 0));
    let value = Math.max(0, num(src.value, 0));
    if (clampShields) value = Math.min(value, max);
    shields[facing] = { value, max };
  }
  base.shields = shields;

  base.stats = {
    tier: num(base.stats?.tier, 1),
    size: String(base.stats?.size ?? "Medium"),
    frame: String(base.stats?.frame ?? ""),
    speed: num(base.stats?.speed, 0),
    maneuverability: String(base.stats?.maneuverability ?? "Average"),
    armorClass: num(base.stats?.armorClass, 0),
    targetLock: num(base.stats?.targetLock, 0),
    damageThreshold: num(base.stats?.damageThreshold, 0),
    criticalThreshold: num(base.stats?.criticalThreshold, 0)
  };

  base.systems = mergeObject(deepClone(DEFAULT_STARSHIP_DATA.systems), base.systems ?? {});
  base.weapons = mergeObject(deepClone(DEFAULT_STARSHIP_DATA.weapons), base.weapons ?? {});
  for (const arc of ["forward", "port", "starboard", "aft", "turret"]) {
    if (!Array.isArray(base.weapons[arc])) base.weapons[arc] = [];
  }

  base.components = Array.isArray(base.components) ? base.components.map(sanitizeComponent).filter(Boolean) : [];
  base.actions = Array.isArray(base.actions) ? base.actions.map(sanitizeAction).filter(Boolean) : [];
  base.crew = Array.isArray(base.crew) ? base.crew.map(sanitizeCrew).filter(Boolean) : [];
  base.import = mergeObject(deepClone(DEFAULT_STARSHIP_DATA.import), base.import ?? {});
  base.dataVersion = base.dataVersion ?? MODULE_VERSION;

  return base;
}

export function sanitizeComponent(component) {
  if (!component) return null;
  const name = String(component.name ?? "").trim();
  if (!name) return null;
  let type = String(component.type ?? component.componentType ?? "other").trim();
  if (!COMPONENT_TYPES.includes(type)) type = normalizeComponentType(type);
  return {
    id: component.id ?? component._id ?? uid(),
    name,
    type,
    bp: num(component.bp ?? component.bpCost ?? component.cost, 0),
    pcu: num(component.pcu ?? component.PCU, 0),
    description: String(component.description ?? component.desc ?? ""),
    sourceUuid: String(component.sourceUuid ?? component.uuid ?? ""),
    sourcePack: String(component.sourcePack ?? ""),
    sourceId: String(component.sourceId ?? ""),
    installed: component.installed !== false,
    enabled: component.enabled !== false,
    quantity: Math.max(1, num(component.quantity, 1)),
    notes: String(component.notes ?? ""),
    arc: component.arc ? sanitizeFacing(component.arc) : "",
    status: String(component.status ?? "operational"),
    data: component.data ?? {}
  };
}

function normalizeComponentType(type) {
  const value = String(type ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (value.includes("power")) return "powerCore";
  if (value.includes("thruster") || value.includes("engine")) return "thrusters";
  if (value.includes("counter")) return "defensiveCountermeasures";
  if (value.includes("computer")) return "computer";
  if (value.includes("shield")) return "shields";
  if (value.includes("weapon")) return "weapon";
  if (value.includes("expansion") || value.includes("bay")) return "expansionBay";
  if (value.includes("armor")) return "armor";
  return "other";
}

export function sanitizeAction(action) {
  if (!action) return null;
  const name = String(action.name ?? "").trim();
  if (!name) return null;
  let phase = String(action.phase ?? "open").trim();
  if (!ACTION_PHASES.includes(phase)) phase = phase.toLowerCase().replace(/[^a-z]/g, "") || "open";
  if (!ACTION_PHASES.includes(phase)) phase = "open";
  return {
    id: action.id ?? action._id ?? uid(),
    name,
    phase,
    crewRole: String(action.crewRole ?? action.role ?? ""),
    skill: String(action.skill ?? ""),
    dc: String(action.dc ?? action.dcFormula ?? ""),
    description: String(action.description ?? action.desc ?? ""),
    sourceUuid: String(action.sourceUuid ?? action.uuid ?? ""),
    sourcePack: String(action.sourcePack ?? ""),
    sourceId: String(action.sourceId ?? ""),
    macro: String(action.macro ?? ""),
    notes: String(action.notes ?? ""),
    data: action.data ?? {}
  };
}

export function sanitizeCrew(crew) {
  if (!crew) return null;
  const role = String(crew.role ?? "").trim();
  const name = String(crew.name ?? crew.actorName ?? "").trim();
  if (!role && !name) return null;
  return {
    id: crew.id ?? crew._id ?? uid(),
    role,
    name,
    actorUuid: String(crew.actorUuid ?? crew.uuid ?? ""),
    notes: String(crew.notes ?? "")
  };
}

export async function updateStarshipData(actor, update = {}, options = {}) {
  if (!actor) throw new Error("No actor provided.");
  const current = getStarshipData(actor);
  const merged = sanitizeStarshipData(mergeObject(current, update));
  const payload = { [`flags.${MODULE_ID}`]: merged };
  await actor.update(payload, options);
  return merged;
}

export async function setStarshipEnabled(actor, enabled = true) {
  const data = await updateStarshipData(actor, { isStarship: Boolean(enabled), overlayEnabled: Boolean(enabled) });
  Hooks.callAll(HOOKS.STARSHIP_ENABLED, actor, data, Boolean(enabled));
  return data;
}

export async function createStarshipActor(data = {}) {
  const starshipData = sanitizeStarshipData(mergeObject(deepClone(DEFAULT_STARSHIP_DATA), data.starship ?? data.flags?.[MODULE_ID] ?? {}));
  const actorData = {
    name: data.name || game.i18n.localize("PF1ESFRPGStarships.NewStarship"),
    type: data.type || "npc",
    img: data.img || "icons/svg/wing.svg",
    flags: {
      [MODULE_ID]: starshipData
    }
  };
  const actor = await Actor.create(actorData);
  Hooks.callAll(HOOKS.STARSHIP_CREATED, actor, starshipData);
  return actor;
}

export function getHull(actor) {
  return getStarshipData(actor).hull;
}

export async function setHull(actor, value, max = undefined) {
  const data = getStarshipData(actor);
  const old = deepClone(data.hull);
  data.hull.value = Math.max(0, num(value, 0));
  if (max !== undefined) data.hull.max = Math.max(0, num(max, 0));
  const updated = await updateStarshipData(actor, { hull: data.hull });
  Hooks.callAll(HOOKS.HULL_CHANGED, actor, old, updated.hull);
  return updated.hull;
}

export async function adjustHull(actor, delta) {
  const hull = getHull(actor);
  return setHull(actor, hull.value + num(delta, 0), hull.max);
}

export function getShields(actor) {
  return getStarshipData(actor).shields;
}

export function getShield(actor, facing) {
  return getShields(actor)[sanitizeFacing(facing)];
}

export async function setShield(actor, facing, value, max = undefined) {
  const key = sanitizeFacing(facing);
  const data = getStarshipData(actor);
  const old = deepClone(data.shields[key]);
  data.shields[key].value = Math.max(0, num(value, 0));
  if (max !== undefined) data.shields[key].max = Math.max(0, num(max, 0));
  const updated = await updateStarshipData(actor, { shields: data.shields });
  Hooks.callAll(HOOKS.SHIELD_CHANGED, actor, key, old, updated.shields[key]);
  return updated.shields[key];
}

export async function adjustShield(actor, facing, delta) {
  const shield = getShield(actor, facing);
  return setShield(actor, facing, shield.value + num(delta, 0), shield.max);
}

export async function resetShields(actor) {
  const data = getStarshipData(actor);
  for (const facing of FACINGS) data.shields[facing].value = data.shields[facing].max;
  const updated = await updateStarshipData(actor, { shields: data.shields });
  Hooks.callAll(HOOKS.SHIELD_CHANGED, actor, "all", null, updated.shields);
  return updated.shields;
}

export function getComponents(actor) {
  return getStarshipData(actor).components;
}

export async function addComponent(actor, componentData) {
  const data = getStarshipData(actor);
  const component = sanitizeComponent(componentData);
  if (!component) throw new Error("Invalid component data.");
  data.components.push(component);
  await updateStarshipData(actor, { components: data.components });
  Hooks.callAll(HOOKS.COMPONENT_ADDED, actor, component);
  return component;
}

export async function updateComponent(actor, componentId, updateData) {
  const data = getStarshipData(actor);
  const index = data.components.findIndex(c => c.id === componentId);
  if (index < 0) throw new Error("Component not found.");
  const component = sanitizeComponent(mergeObject(data.components[index], updateData));
  data.components[index] = component;
  await updateStarshipData(actor, { components: data.components });
  Hooks.callAll(HOOKS.COMPONENT_UPDATED, actor, component);
  return component;
}

export async function removeComponent(actor, componentId) {
  const data = getStarshipData(actor);
  const component = data.components.find(c => c.id === componentId);
  data.components = data.components.filter(c => c.id !== componentId);
  await updateStarshipData(actor, { components: data.components });
  Hooks.callAll(HOOKS.COMPONENT_REMOVED, actor, componentId, component);
  return component;
}

export function getActions(actor) {
  return getStarshipData(actor).actions;
}

export async function addAction(actor, actionData) {
  const data = getStarshipData(actor);
  const action = sanitizeAction(actionData);
  if (!action) throw new Error("Invalid action data.");
  data.actions.push(action);
  await updateStarshipData(actor, { actions: data.actions });
  Hooks.callAll(HOOKS.ACTION_ADDED, actor, action);
  return action;
}

export async function updateAction(actor, actionId, updateData) {
  const data = getStarshipData(actor);
  const index = data.actions.findIndex(a => a.id === actionId);
  if (index < 0) throw new Error("Action not found.");
  const action = sanitizeAction(mergeObject(data.actions[index], updateData));
  data.actions[index] = action;
  await updateStarshipData(actor, { actions: data.actions });
  Hooks.callAll(HOOKS.ACTION_UPDATED, actor, action);
  return action;
}

export async function removeAction(actor, actionId) {
  const data = getStarshipData(actor);
  const action = data.actions.find(a => a.id === actionId);
  data.actions = data.actions.filter(a => a.id !== actionId);
  await updateStarshipData(actor, { actions: data.actions });
  Hooks.callAll(HOOKS.ACTION_REMOVED, actor, actionId, action);
  return action;
}

export function exportStarship(actor) {
  return {
    name: actor?.name ?? "Starship",
    img: actor?.img ?? "",
    flags: {
      [MODULE_ID]: getStarshipData(actor)
    }
  };
}
