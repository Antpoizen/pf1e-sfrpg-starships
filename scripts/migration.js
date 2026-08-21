import { MODULE_ID, MODULE_VERSION } from "./constants.js";
import { isStarship, getStarshipData, updateStarshipData } from "./data.js";

export async function migrateWorld() {
  if (!game.user?.isGM) return;
  const current = game.settings.get(MODULE_ID, "systemMigrationVersion");
  if (current === MODULE_VERSION) return;
  for (const actor of game.actors?.contents ?? []) {
    if (!isStarship(actor)) continue;
    const data = getStarshipData(actor);
    data.dataVersion = MODULE_VERSION;
    await updateStarshipData(actor, data, { render: false });
  }
  await game.settings.set(MODULE_ID, "systemMigrationVersion", MODULE_VERSION);
}
