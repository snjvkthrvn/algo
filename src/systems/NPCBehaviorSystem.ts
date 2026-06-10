/**
 * NPCBehaviorSystem - Manages NPC state machines.
 */

import type { NPC } from '../entities/NPC';
import { gameState } from '../core/GameStateManager';

export type NPCBehaviorState = 'idle' | 'talking' | 'post_puzzle' | 'celebrating';

export class NPCBehaviorSystem {
  private npcs: Map<string, NPC> = new Map();

  registerNPC(npc: NPC): void {
    this.npcs.set(npc.config.id, npc);
  }

  getNPC(id: string): NPC | undefined {
    return this.npcs.get(id);
  }

  getDialogueTree(npc: NPC): NPC['config']['dialogue'] {
    const npcState = gameState.getNPCState(npc.config.id);

    // If NPC has post-puzzle dialogue and their puzzle is complete, use it
    if (npcState === 'post_puzzle' && npc.config.postPuzzleDialogue) {
      return npc.config.postPuzzleDialogue;
    }

    return npc.config.dialogue;
  }

  /** Drive ambient wander for every registered NPC (docs/VISION.md §2). */
  update(time: number): void {
    for (const npc of this.npcs.values()) {
      npc.update(time);
    }
  }

  destroy(): void {
    this.npcs.clear();
  }
}
