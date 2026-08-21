# PF1e SFRPG Starships

## Version 1.0.1

This patch removes the optional SFRPG package recommendation from `module.json` because Foundry VTT v12 can fail remote installation when a module manifest recommends a non-active system package. SFRPG is still detected at runtime by the importer when it is installed locally.


**PF1e SFRPG Starships** adds Starfinder-style starship data, hull points, shield facings, starship actions, starship components, and token overlays to a Pathfinder 1e world.

This module targets exactly:

- Foundry VTT v12 build 331
- Pathfinder 1e system v11.11
- Locally installed SFRPG system package, especially the Foundry v12-compatible `sfrpg` line

## Important design note: actor type

PF1e actor document types are defined by the PF1e system. A module should not modify PF1e core files to add a true new document type. This module therefore implements a safe module-managed starship actor subtype:

- Starships are normal PF1e actors, created as `npc` actors.
- They are marked with `flags.pf1e-sfrpg-starships.isStarship = true`.
- They use a dedicated Starship Sheet application.
- They can be placed onto scenes as normal tokens.
- Their tokens display hull and shield overlays when visible to the user.

This preserves PF1e compatibility while behaving like a new Starship actor workflow.

## What it does

- Adds a GM Tools menu.
- Adds a Create Starship Actor workflow.
- Adds a Mark Selected Actor as Starship workflow.
- Adds a dedicated Starship Sheet.
- Stores starship data safely in PF1e actor flags.
- Shows token overlays with four shield facings and hull in the center.
- Rotates shield positions with token rotation while keeping text upright.
- Allows owners to edit hull and shields by default.
- Provides SFRPG pack import when accessible.
- Provides JSON import fallback.
- Provides manual starship editing.
- Provides chat cards for starship actions.
- Exposes a public API.

## What it does not automate

Version 1.0.1 does not fully automate Starfinder starship combat phases, crew role action economy, gunnery resolution, shield quadrant targeting, or component critical damage rules. Actions are available as manual chat cards and data entries.

## Starship data storage

Starship data is stored under:

```js
flags.pf1e-sfrpg-starships
```

The main structure is:

```js
{
  isStarship: true,
  overlayEnabled: true,
  hull: { value: 55, max: 55 },
  shields: {
    forward: { value: 10, max: 10 },
    port: { value: 10, max: 10 },
    starboard: { value: 10, max: 10 },
    aft: { value: 10, max: 10 }
  },
  stats: {},
  systems: {},
  weapons: {},
  components: [],
  actions: [],
  crew: [],
  import: {}
}
```

## Shield overlay

Starship tokens show:

```text
          Forward Shields
Port Shields     Hull     Starboard Shields
          Aft Shields
```

Each value is displayed as current / maximum. Shield current values may exceed maximum, such as `15 / 10`, unless you enable shield clamping in the module settings.

Shield positions rotate with the ship token. The text itself remains upright for readability.

## Permissions

- GMs can see and edit all starship data.
- Owners can edit hull and shields by default.
- Owners can use starship actions by default.
- Observers can see the overlay and sheet data but cannot edit unless permissions allow it.
- Users without Observer permission cannot see overlay values.
- Import tools are GM-only.

## SFRPG import

The module checks whether the `sfrpg` system package is installed. Direct compendium access depends on how Foundry exposes inactive system packs while your active world is PF1e.

If direct SFRPG packs are visible through `game.packs`, the importer lists likely starship packs. If they are not visible, use the JSON importer.

## JSON import

Open Settings → Configure Settings → PF1e SFRPG Starships → Starship Importer.

Paste a JSON object or array that contains starship data. The importer uses flexible heuristics and preserves source data where possible.

## Manual workflow

1. Open Settings → Configure Settings → PF1e SFRPG Starships → Starship GM Tools.
2. Click Create Starship Actor.
3. Edit hull, shields, stats, components, actions, and crew.
4. Drag the actor onto the canvas.
5. Rotate the token to confirm shield facings follow the ship.

## GitHub release setup

Create a GitHub release tagged:

```text
1.0.1
```

Upload these assets:

```text
module.json
PF1e-SFRPG-Starships-v1.0.1.zip
```

Use this manifest URL in Foundry:

```text
https://github.com/Antpoizen/pf1e-sfrpg-starships/releases/latest/download/module.json
```

## Public API

```js
const api = game.modules.get("pf1e-sfrpg-starships").api;
```

Examples:

```js
const actor = canvas.tokens.controlled[0]?.actor;
await api.setStarshipEnabled(actor, true);
api.openStarshipSheet(actor);
```

```js
const actor = canvas.tokens.controlled[0]?.actor;
await api.setHull(actor, 40, 55);
await api.setShield(actor, "forward", 15, 10);
await api.setShield(actor, "port", 3, 10);
await api.setShield(actor, "starboard", 1, 10);
await api.setShield(actor, "aft", 2, 10);
api.refreshAllOverlays();
```

```js
const actor = canvas.tokens.controlled[0]?.actor;
await api.addAction(actor, {
  name: "Divert",
  phase: "engineering",
  crewRole: "Engineer",
  skill: "Engineering",
  dc: "Varies",
  description: "Manual Starfinder-style starship action."
});
```

## Known limitations

- This module does not add a true PF1e actor document type because doing so safely would require system-level schema support.
- Direct SFRPG pack access may not work inside a PF1e world if Foundry does not expose inactive system packs through `game.packs`.
- Imported SFRPG data is normalized with flexible heuristics because SFRPG document structures may vary by version and content source.
- Full Starfinder starship combat automation is intentionally out of scope for v1.0.1.
- The overlay is rendered on the canvas token layer and may need style adjustments if another module heavily modifies token rendering.

## Testing checklist

- Enable the module in a PF1e 11.11 world on Foundry v12.331.
- Confirm settings and GM Tools appear.
- Create a Starship Actor.
- Place it on a scene.
- Confirm hull appears in the center.
- Confirm Forward, Port, Starboard, and Aft shields appear around the token.
- Rotate the token and verify shield positions rotate while text stays upright.
- Log in as a non-owner and confirm the overlay is hidden without Observer permission.
- Give Observer permission and confirm the overlay appears.
- Edit hull and shields as owner.
- Confirm values update on the overlay.
- Import JSON and confirm a new starship actor is created.
- Test direct SFRPG import if SFRPG packs are visible in `game.packs`.