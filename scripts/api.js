import { overlayManager } from "./canvas-overlay.js";
import {
  isStarship,
  setStarshipEnabled,
  createStarshipActor,
  getStarshipData,
  updateStarshipData,
  getHull,
  setHull,
  adjustHull,
  getShields,
  getShield,
  setShield,
  adjustShield,
  resetShields,
  getComponents,
  addComponent,
  updateComponent,
  removeComponent,
  getActions,
  addAction,
  updateAction,
  removeAction,
  exportStarship
} from "./data.js";
import { openStarshipSheet } from "./starship-sheet.js";
import { PF1eSfrpgStarshipImporter, importFromSfrpgPack, importFromJson } from "./importer.js";
import { postActionToChat } from "./chat.js";

export const StarshipAPI = {
  isStarship,
  setStarshipEnabled,
  createStarshipActor,
  getStarshipData,
  updateStarshipData,

  getHull,
  setHull,
  adjustHull,

  getShields,
  getShield,
  setShield,
  adjustShield,
  resetShields,

  getComponents,
  addComponent,
  updateComponent,
  removeComponent,

  getActions,
  addAction,
  updateAction,
  removeAction,
  postActionToChat,

  openStarshipSheet,
  openImporter: () => new PF1eSfrpgStarshipImporter().render(true),

  refreshTokenOverlay: token => overlayManager.refreshToken(token),
  refreshAllOverlays: () => overlayManager.refreshAll(),
  clearTokenOverlay: token => overlayManager.clearToken(token),
  clearAllOverlays: () => overlayManager.clearAll(),

  importFromSfrpgPack,
  importFromJson,
  exportStarship
};
