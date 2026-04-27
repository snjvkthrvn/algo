/**
 * InteractionSystem - Proximity detection + interaction prompts.
 */

import { InteractionPrompt } from '../ui/InteractionPrompt';
import { INTERACTION_RANGE } from '../config/constants';
import { distance } from '../utils/math';
import type { Player } from '../entities/Player';
import type { NPC } from '../entities/NPC';
import type { InteractableObject } from '../entities/InteractableObject';

interface InteractableEntry {
  target: NPC | InteractableObject;
  type: 'npc' | 'object';
}

export class InteractionSystem {
  private player: Player;
  private interactables: InteractableEntry[] = [];
  private prompt: InteractionPrompt;
  private currentTarget: InteractableEntry | null = null;
  private interactionCallback: ((target: InteractableEntry) => void) | null = null;

  constructor(scene: Phaser.Scene, player: Player) {
    this.player = player;
    this.prompt = new InteractionPrompt(scene);

    // Listen for interaction key
    scene.input.keyboard?.on('keydown-SPACE', () => this.tryInteract());
    scene.input.keyboard?.on('keydown-ENTER', () => this.tryInteract());
  }

  addNPC(npc: NPC): void {
    this.interactables.push({ target: npc, type: 'npc' });
  }

  addObject(obj: InteractableObject): void {
    this.interactables.push({ target: obj, type: 'object' });
  }

  onInteract(callback: (target: InteractableEntry) => void): void {
    this.interactionCallback = callback;
  }

  update(showPrompts: boolean = true): void {
    if (!showPrompts) {
      this.prompt.hide();
      return;
    }

    const playerPos = this.player.getPosition();
    let closest: InteractableEntry | null = null;
    let closestDist = Infinity;

    for (const entry of this.interactables) {
      const pos = entry.target.getPosition();
      const dist = distance(playerPos.x, playerPos.y, pos.x, pos.y);

      if (dist < INTERACTION_RANGE && dist < closestDist) {
        closest = entry;
        closestDist = dist;
      }
    }

    // Update highlights and prompt
    if (closest !== this.currentTarget) {
      // Unhighlight previous
      if (this.currentTarget) {
        if (this.currentTarget.type === 'npc') {
          (this.currentTarget.target as NPC).setHighlighted(false);
        } else {
          (this.currentTarget.target as InteractableObject).setHighlighted(false);
        }
      }

      // Highlight new
      if (closest) {
        if (closest.type === 'npc') {
          const npc = closest.target as NPC;
          npc.setHighlighted(true);
          const pos = npc.getPosition();
          this.prompt.show(pos.x, pos.y + npc.getPromptOffsetY(), '[SPACE] Talk');
        } else {
          const obj = closest.target as InteractableObject;
          obj.setHighlighted(true);
          const pos = obj.getPosition();
          const promptText = obj.config.prompt || '[SPACE] Interact';
          this.prompt.show(pos.x, pos.y + obj.getPromptOffsetY(), promptText);
        }
      } else {
        this.prompt.hide();
      }

      this.currentTarget = closest;
    }
  }

  private tryInteract(): void {
    if (!this.currentTarget) return;
    if (this.interactionCallback) {
      this.interactionCallback(this.currentTarget);
    }
  }

  getCurrentTarget(): InteractableEntry | null {
    return this.currentTarget;
  }

  destroy(): void {
    this.prompt.destroy();
  }
}

export type { InteractableEntry };
