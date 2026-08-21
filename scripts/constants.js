export const MODULE_ID = "pf1e-sfrpg-starships";
export const MODULE_TITLE = "PF1e SFRPG Starships";
export const FLAG_IS_STARSHIP = "isStarship";
export const FLAG_DATA_VERSION = "dataVersion";
export const MODULE_VERSION = "1.0.0";

export const TEMPLATES = {
  STARSHIP_SHEET: `modules/${MODULE_ID}/templates/starship-sheet.hbs`,
  IMPORTER: `modules/${MODULE_ID}/templates/importer.hbs`,
  GM_TOOLS: `modules/${MODULE_ID}/templates/gm-tools.hbs`,
  CHAT_CARD: `modules/${MODULE_ID}/templates/chat-card.hbs`
};

export const FACINGS = ["forward", "port", "starboard", "aft"];

export const FACING_LABELS = {
  forward: "PF1ESFRPGStarships.FacingForward",
  port: "PF1ESFRPGStarships.FacingPort",
  starboard: "PF1ESFRPGStarships.FacingStarboard",
  aft: "PF1ESFRPGStarships.FacingAft"
};

export const CREW_ROLES = [
  "captain",
  "pilot",
  "engineer",
  "scienceOfficer",
  "gunner",
  "magicOfficer"
];

export const DEFAULT_STARSHIP_DATA = {
  isStarship: true,
  overlayEnabled: true,
  hull: {
    value: 55,
    max: 55
  },
  shields: {
    forward: { value: 10, max: 10 },
    port: { value: 10, max: 10 },
    starboard: { value: 10, max: 10 },
    aft: { value: 10, max: 10 }
  },
  stats: {
    tier: 1,
    size: "Medium",
    frame: "",
    speed: 8,
    maneuverability: "Average",
    armorClass: 0,
    targetLock: 0,
    damageThreshold: 0,
    criticalThreshold: 0
  },
  systems: {
    powerCore: null,
    thrusters: null,
    armor: null,
    defensiveCountermeasures: null,
    computer: null,
    shields: null
  },
  weapons: {
    forward: [],
    port: [],
    starboard: [],
    aft: [],
    turret: []
  },
  components: [],
  actions: [],
  crew: [],
  import: {
    sourceSystem: "",
    sourcePack: "",
    sourceId: "",
    sourceUuid: "",
    importedAt: ""
  }
};

export const COMPONENT_TYPES = [
  "powerCore",
  "thrusters",
  "armor",
  "defensiveCountermeasures",
  "computer",
  "shields",
  "weapon",
  "expansionBay",
  "other"
];

export const ACTION_PHASES = ["engineering", "helm", "gunnery", "captain", "science", "open"];

export const HOOKS = {
  STARSHIP_CREATED: "pf1eSfrpgStarships.starshipCreated",
  STARSHIP_ENABLED: "pf1eSfrpgStarships.starshipEnabled",
  HULL_CHANGED: "pf1eSfrpgStarships.hullChanged",
  SHIELD_CHANGED: "pf1eSfrpgStarships.shieldChanged",
  COMPONENT_ADDED: "pf1eSfrpgStarships.componentAdded",
  COMPONENT_UPDATED: "pf1eSfrpgStarships.componentUpdated",
  COMPONENT_REMOVED: "pf1eSfrpgStarships.componentRemoved",
  ACTION_ADDED: "pf1eSfrpgStarships.actionAdded",
  ACTION_UPDATED: "pf1eSfrpgStarships.actionUpdated",
  ACTION_REMOVED: "pf1eSfrpgStarships.actionRemoved",
  ACTION_USED: "pf1eSfrpgStarships.actionUsed",
  IMPORT_COMPLETED: "pf1eSfrpgStarships.importCompleted",
  OVERLAY_REFRESHED: "pf1eSfrpgStarships.overlayRefreshed"
};
