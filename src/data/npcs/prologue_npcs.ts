/**
 * NPC configurations for the Prologue region.
 */

import { NPCType } from '../types';
import type { NPCConfig } from '../types';
import { VISUAL_REVAMP_KEYS } from '../../config/assets';

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
    id: 'professor_node',
    name: 'Professor Node',
    type: NPCType.MENTOR,
    spriteKey: VISUAL_REVAMP_KEYS.PROFESSOR_NODE,
    defaultPosition: { x: 900, y: 395 },
    dialogue: professorNodeDialogue,
    postPuzzleDialogue: professorNodePostPuzzle,
    questRelated: true,
  },
  {
    id: 'rune_keeper',
    name: 'Rune Keeper',
    type: NPCType.GUIDE,
    spriteKey: VISUAL_REVAMP_KEYS.RUNE_KEEPER,
    defaultPosition: { x: 900, y: 165 },
    dialogue: runeKeeperDialogue,
    postPuzzleDialogue: runeKeeperPostPuzzle,
    questRelated: true,
  },
  {
    id: 'console_keeper',
    name: 'Console Keeper',
    type: NPCType.GUIDE,
    spriteKey: VISUAL_REVAMP_KEYS.CONSOLE_KEEPER,
    defaultPosition: { x: 900, y: 625 },
    dialogue: consoleKeeperDialogue,
    postPuzzleDialogue: consoleKeeperPostPuzzle,
    questRelated: true,
  },
];
