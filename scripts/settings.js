import { MODULE_ID } from "./constants.js";
import { PF1eSfrpgStarshipImporter } from "./importer.js";
import { PF1eSfrpgStarshipGMTools } from "./gm-tools.js";
import { overlayManager } from "./canvas-overlay.js";

function refreshOverlayOnChange() {
  if (game.ready) overlayManager.refreshAll();
}

export function registerSettings() {
  game.settings.registerMenu(MODULE_ID, "gmTools", {
    name: "PF1ESFRPGStarships.SettingsGMToolsName",
    label: "PF1ESFRPGStarships.SettingsGMToolsLabel",
    hint: "PF1ESFRPGStarships.SettingsGMToolsHint",
    icon: "fas fa-rocket",
    type: PF1eSfrpgStarshipGMTools,
    restricted: true
  });

  game.settings.registerMenu(MODULE_ID, "importer", {
    name: "PF1ESFRPGStarships.SettingsImporterName",
    label: "PF1ESFRPGStarships.SettingsImporterLabel",
    hint: "PF1ESFRPGStarships.SettingsImporterHint",
    icon: "fas fa-file-import",
    type: PF1eSfrpgStarshipImporter,
    restricted: true
  });

  const settings = [
    ["enabled", Boolean, true, "PF1ESFRPGStarships.SettingEnabledName", "PF1ESFRPGStarships.SettingEnabledHint", null],
    ["overlayEnabled", Boolean, true, "PF1ESFRPGStarships.SettingOverlayEnabledName", "PF1ESFRPGStarships.SettingOverlayEnabledHint", refreshOverlayOnChange],
    ["shieldTextSize", Number, 18, "PF1ESFRPGStarships.SettingShieldTextSizeName", "PF1ESFRPGStarships.SettingShieldTextSizeHint", refreshOverlayOnChange],
    ["hullTextSize", Number, 22, "PF1ESFRPGStarships.SettingHullTextSizeName", "PF1ESFRPGStarships.SettingHullTextSizeHint", refreshOverlayOnChange],
    ["textColor", String, "#d8f3ff", "PF1ESFRPGStarships.SettingTextColorName", "PF1ESFRPGStarships.SettingTextColorHint", refreshOverlayOnChange],
    ["outlineColor", String, "#001927", "PF1ESFRPGStarships.SettingOutlineColorName", "PF1ESFRPGStarships.SettingOutlineColorHint", refreshOverlayOnChange],
    ["textOpacity", Number, 1, "PF1ESFRPGStarships.SettingTextOpacityName", "PF1ESFRPGStarships.SettingTextOpacityHint", refreshOverlayOnChange],
    ["overlayDistance", Number, 0.58, "PF1ESFRPGStarships.SettingOverlayDistanceName", "PF1ESFRPGStarships.SettingOverlayDistanceHint", refreshOverlayOnChange],
    ["showLabels", Boolean, false, "PF1ESFRPGStarships.SettingShowLabelsName", "PF1ESFRPGStarships.SettingShowLabelsHint", refreshOverlayOnChange],
    ["valuesOnly", Boolean, true, "PF1ESFRPGStarships.SettingValuesOnlyName", "PF1ESFRPGStarships.SettingValuesOnlyHint", refreshOverlayOnChange],
    ["allowOwnerEditHull", Boolean, true, "PF1ESFRPGStarships.SettingOwnerEditHullName", "PF1ESFRPGStarships.SettingOwnerEditHullHint", null],
    ["allowOwnerEditShields", Boolean, true, "PF1ESFRPGStarships.SettingOwnerEditShieldsName", "PF1ESFRPGStarships.SettingOwnerEditShieldsHint", null],
    ["allowOwnerUseActions", Boolean, true, "PF1ESFRPGStarships.SettingOwnerUseActionsName", "PF1ESFRPGStarships.SettingOwnerUseActionsHint", null],
    ["allowOwnerEditCrew", Boolean, true, "PF1ESFRPGStarships.SettingOwnerEditCrewName", "PF1ESFRPGStarships.SettingOwnerEditCrewHint", null],
    ["allowOwnerEditComponents", Boolean, false, "PF1ESFRPGStarships.SettingOwnerEditComponentsName", "PF1ESFRPGStarships.SettingOwnerEditComponentsHint", null],
    ["directSfrpgImport", Boolean, true, "PF1ESFRPGStarships.SettingDirectImportName", "PF1ESFRPGStarships.SettingDirectImportHint", null],
    ["jsonImport", Boolean, true, "PF1ESFRPGStarships.SettingJsonImportName", "PF1ESFRPGStarships.SettingJsonImportHint", null],
    ["clampShields", Boolean, false, "PF1ESFRPGStarships.SettingClampShieldsName", "PF1ESFRPGStarships.SettingClampShieldsHint", refreshOverlayOnChange],
    ["debug", Boolean, false, "PF1ESFRPGStarships.SettingDebugName", "PF1ESFRPGStarships.SettingDebugHint", null]
  ];

  game.settings.register(MODULE_ID, "systemMigrationVersion", {
    name: "PF1ESFRPGStarships.MigrationVersion",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  for (const [key, type, def, name, hint, onChange] of settings) {
    game.settings.register(MODULE_ID, key, {
      name,
      hint,
      scope: "world",
      config: true,
      type,
      default: def,
      onChange: onChange ?? undefined
    });
  }
}
