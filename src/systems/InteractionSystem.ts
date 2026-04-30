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
  private scene: Phaser.Scene;
  private player: Player;
  private interactables: InteractableEntry[] = [];
  private prompt: InteractionPrompt;
  private currentTarget: InteractableEntry | null = null;
  private interactionCallback: ((target: InteractableEntry) => void) | null = null;
  private interactionsEnabled = true;

  private readonly onInteractKey = () => this.tryInteract();
  private keyboardAttached = false;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    this.prompt = new InteractionPrompt(scene);

    const kbd = scene.input.keyboard;
    if (kbd) {
      kbd.on('keydown-SPACE', this.onInteractKey);
      kbd.on('keydown-ENTER', this.onInteractKey);
      this.keyboardAttached = true;
    }

    scene.events?.once(Phaser.Scenes.Events.SHUTDOWN, () => this.detachKeyboard());
  }

  private detachKeyboard(): void {
    if (!this.keyboardAttached) return;
    const kbd = this.scene.input.keyboard;
    kbd?.off('keydown-SPACE', this.onInteractKey);
    kbd?.off('keydown-ENTER', this.onInteractKey);
    this.keyboardAttached = false;
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
    this.interactionsEnabled = showPrompts;
    if (!showPrompts) {
      this.clearCurrentTarget();
      this.prompt.hide();
      return;
    }

    const playerPos = this.player.getPosition();
    let closest: InteractableEntry | null = null;
    let closestDist = Infinity;

    for (const entry of this.interactables) {
      const pos = entry.target.getPosition();
      const dist = distance(playerPos.x, playerPos.y, pos.x, pos.y);

      if (dist <= INTERACTION_RANGE && dist < closestDist) {
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
    if (!this.interactionsEnabled) return;
    if (!this.currentTarget) return;
    if (this.interactionCallback) {
      this.interactionCallback(this.currentTarget);
    }
  }

  private clearCurrentTarget(): void {
    if (!this.currentTarget) return;

    if (this.currentTarget.type === 'npc') {
      (this.currentTarget.target as NPC).setHighlighted(false);
    } else {
      (this.currentTarget.target as InteractableObject).setHighlighted(false);
    }

    this.currentTarget = null;
  }

  getCurrentTarget(): InteractableEntry | null {
    return this.currentTarget;
  }

  destroy(): void {
    this.detachKeyboard();
    this.clearCurrentTarget();
    this.prompt.destroy();
  }
}

export type { InteractableEntry };
