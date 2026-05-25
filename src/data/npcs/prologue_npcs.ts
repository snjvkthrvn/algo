/**
 * NPC configurations for the Prologue region.
 *
 * Roster:
 *   Professor Node  — mentor; intro + post-Sentinel debrief
 *   Rune Keeper     — guide for P0_1 (sequential iteration)
 *   Console Keeper  — guide for P0_2 (hash-map mapping)
 *   Watcher         — cosmic observer; appears post-Sentinel on the cliff,
 *                     foreshadows The Core, does not invite conversation.
 *                     Bookend NPC, intentionally rare.
 */

import { NPCType } from '../types';
import type { NPCConfig } from '../types';
import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { PROLOGUE_ANCHORS } from '../regions/prologueAnchors';

import {
  professorNodeDialogue,
  professorNodePostPuzzle,
  runeKeeperDialogue,
  runeKeeperPostPuzzle,
  consoleKeeperDialogue,
  consoleKeeperPostPuzzle,
} from '../dialogue/prologue_dialogue';
import {
  watcherFirstSightDialogue,
  watcherSecondSightDialogue,
} from '../dialogue/watcher_dialogue';

export const PROLOGUE_NPCS: NPCConfig[] = [
  {
    id: PROLOGUE_ANCHORS.professorNode.id,
    name: 'Professor Node',
    type: NPCType.MENTOR,
    spriteKey: VISUAL_REVAMP_KEYS.PROFESSOR_NODE,
    defaultPosition: PROLOGUE_ANCHORS.professorNode.position,
    dialogue: professorNodeDialogue,
    postPuzzleDialogue: professorNodePostPuzzle,
    questRelated: true,
  },
  {
    id: PROLOGUE_ANCHORS.runeKeeper.id,
    name: 'Rune Keeper',
    type: NPCType.GUIDE,
    spriteKey: VISUAL_REVAMP_KEYS.RUNE_KEEPER,
    defaultPosition: PROLOGUE_ANCHORS.runeKeeper.position,
    dialogue: runeKeeperDialogue,
    postPuzzleDialogue: runeKeeperPostPuzzle,
    questRelated: true,
  },
  {
    id: PROLOGUE_ANCHORS.consoleKeeper.id,
    name: 'Console Keeper',
    type: NPCType.GUIDE,
    spriteKey: VISUAL_REVAMP_KEYS.CONSOLE_KEEPER,
    defaultPosition: PROLOGUE_ANCHORS.consoleKeeper.position,
    dialogue: consoleKeeperDialogue,
    postPuzzleDialogue: consoleKeeperPostPuzzle,
    questRelated: true,
  },
  {
    // Watcher only becomes interactable after the Sentinel is down — the
    // dialogue itself is gated by the watcher_first_seen / watcher_second_seen
    // flags so the second encounter automatically replaces the first.
    id: PROLOGUE_ANCHORS.watcherCliff.id,
    name: 'Watcher',
    type: NPCType.GUIDE,
    spriteKey: VISUAL_REVAMP_KEYS.WATCHER,
    defaultPosition: PROLOGUE_ANCHORS.watcherCliff.position,
    dialogue: watcherFirstSightDialogue,
    postPuzzleDialogue: watcherSecondSightDialogue,
    questRelated: false,
  },
];
