import { MODULE_ID, TEMPLATES, HOOKS, FACING_LABELS } from "./constants.js";
import { getStarshipData, getActions } from "./data.js";

function actorWhisperUsers(actor) {
  const users = game.users?.contents ?? [];
  const permitted = users.filter(u => u.active && (u.isGM || actor?.testUserPermission?.(u, "OBSERVER")));
  return permitted.map(u => u.id);
}

export async function postChatCard(actor, titleKey, payload = {}, whisper = null) {
  const content = await renderTemplate(TEMPLATES.CHAT_CARD, {
    actor,
    title: game.i18n.localize(titleKey),
    payload,
    moduleId: MODULE_ID
  });
  const messageData = {
    speaker: ChatMessage.getSpeaker({ actor }),
    content
  };
  if (Array.isArray(whisper)) messageData.whisper = whisper;
  return ChatMessage.create(messageData);
}

export async function postActionToChat(actor, actionId) {
  const action = getActions(actor).find(a => a.id === actionId);
  if (!action) throw new Error(game.i18n.localize("PF1ESFRPGStarships.ErrorActionNotFound"));
  const ship = getStarshipData(actor);
  const payload = {
    rows: [
      { label: game.i18n.localize("PF1ESFRPGStarships.Actor"), value: actor.name },
      { label: game.i18n.localize("PF1ESFRPGStarships.ActionPhase"), value: action.phase || "—" },
      { label: game.i18n.localize("PF1ESFRPGStarships.CrewRole"), value: action.crewRole || "—" },
      { label: game.i18n.localize("PF1ESFRPGStarships.Skill"), value: action.skill || "—" },
      { label: game.i18n.localize("PF1ESFRPGStarships.DC"), value: action.dc || "—" },
      { label: game.i18n.localize("PF1ESFRPGStarships.Hull"), value: `${ship.hull.value} / ${ship.hull.max}` }
    ],
    description: action.description || action.notes || ""
  };
  const msg = await postChatCard(actor, "PF1ESFRPGStarships.ChatStarshipAction", payload, actorWhisperUsers(actor));
  Hooks.callAll(HOOKS.ACTION_USED, actor, action, msg);
  return msg;
}

export async function postHullChange(actor, oldHull, newHull) {
  const payload = {
    rows: [
      { label: game.i18n.localize("PF1ESFRPGStarships.Actor"), value: actor.name },
      { label: game.i18n.localize("PF1ESFRPGStarships.OldHull"), value: `${oldHull?.value ?? 0} / ${oldHull?.max ?? 0}` },
      { label: game.i18n.localize("PF1ESFRPGStarships.NewHull"), value: `${newHull?.value ?? 0} / ${newHull?.max ?? 0}` }
    ]
  };
  return postChatCard(actor, "PF1ESFRPGStarships.ChatHullChanged", payload, actorWhisperUsers(actor));
}

export async function postShieldChange(actor, facing, oldShield, newShield) {
  const payload = {
    rows: [
      { label: game.i18n.localize("PF1ESFRPGStarships.Actor"), value: actor.name },
      { label: game.i18n.localize("PF1ESFRPGStarships.Facing"), value: game.i18n.localize(FACING_LABELS[facing] ?? "PF1ESFRPGStarships.FacingForward") },
      { label: game.i18n.localize("PF1ESFRPGStarships.OldShield"), value: `${oldShield?.value ?? 0} / ${oldShield?.max ?? 0}` },
      { label: game.i18n.localize("PF1ESFRPGStarships.NewShield"), value: `${newShield?.value ?? 0} / ${newShield?.max ?? 0}` }
    ]
  };
  return postChatCard(actor, "PF1ESFRPGStarships.ChatShieldChanged", payload, actorWhisperUsers(actor));
}
