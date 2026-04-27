/**
 * NPC configurations for the Prologue region.
 */

import { NPCType } from '../types';
import type { NPCConfig } from '../types';
import { PROLOGUE_SHEET_KEYS } from '../../config/assets';

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
    spriteKey: PROLOGUE_SHEET_KEYS.NPCS,
    idleFrames: [0, 1, 2, 3],
    defaultPosition: { x: 900, y: 395 },
    dialogue: professorNodeDialogue,
    postPuzzleDialogue: professorNodePostPuzzle,
    questRelated: true,
  },
  {
    id: 'rune_keeper',
    name: 'Rune Keeper',
    type: NPCType.GUIDE,
    spriteKey: PROLOGUE_SHEET_KEYS.NPCS,
    idleFrames: [4, 5, 6, 7],
    defaultPosition: { x: 900, y: 165 },
    dialogue: runeKeeperDialogue,
    postPuzzleDialogue: runeKeeperPostPuzzle,
    questRelated: true,
  },
  {
    id: 'console_keeper',
    name: 'Console Keeper',
    type: NPCType.GUIDE,
    spriteKey: PROLOGUE_SHEET_KEYS.NPCS,
    idleFrames: [8, 9, 10, 11],
    defaultPosition: { x: 900, y: 625 },
    dialogue: consoleKeeperDialogue,
    postPuzzleDialogue: consoleKeeperPostPuzzle,
    questRelated: true,
  },
];
