/**
 * NPC configurations for the Prologue region.
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
];
