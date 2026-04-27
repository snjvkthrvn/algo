/**
 * DialogueSystem - Manages dialogue flow with typewriter effect,
 * branching via choices, and conditional nodes.
 */

import Phaser from 'phaser';
import { DialogueBox } from '../ui/DialogueBox';
import { eventBus, GameEvents } from '../core/EventBus';
import { gameState } from '../core/GameStateManager';
import type { DialogueTree, DialogueNode, DialogueAction } from '../data/types';

export class DialogueSystem {
  private scene: Phaser.Scene;
  private dialogueBox: DialogueBox;
  private currentTree: DialogueTree | null = null;
  private currentNode: DialogueNode | null = null;
  private currentTextIndex: number = 0;
  private isActive: boolean = false;
  private onDialogueEnd: (() => void) | null = null;
  private choiceContainer: Phaser.GameObjects.Container | null = null;
  private endCooldown: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.dialogueBox = new DialogueBox(scene);

    // Input handling
    scene.input.keyboard?.on('keydown-SPACE', () => this.handleAdvance());
    scene.input.keyboard?.on('keydown-ENTER', () => this.handleAdvance());
    scene.input.on('pointerdown', () => {
      if (this.isActive && !this.choiceContainer?.visible) {
        this.handleAdvance();
      }
    });
  }

  startDialogue(tree: DialogueTree, npcId: string, onEnd?: () => void): void {
    this.currentTree = tree;
    this.onDialogueEnd = onEnd || null;
    this.isActive = true;

    eventBus.emit(GameEvents.DIALOGUE_START, { treeId: tree.startNodeId, npcId });
    this.showNode(tree.startNodeId);
  }

  private showNode(nodeId: string): void {
    if (!this.currentTree) return;

    const node = this.currentTree.nodes.find((n) => n.id === nodeId);
    if (!node) {
      this.endDialogue();
      return;
    }

    // Check conditions
    if (node.conditions && node.conditions.length > 0) {
      const conditionsMet = node.conditions.every((cond) => {
        switch (cond.type) {
          case 'puzzle_completed':
            return gameState.isPuzzleCompleted(cond.value);
          case 'flag_set':
            return gameState.getFlag(cond.value);
          case 'codex_unlocked':
            return gameState.isCodexUnlocked(cond.value);
          default:
            return true;
        }
      });

      if (!conditionsMet && node.nextNodeId) {
        this.showNode(node.nextNodeId);
        return;
      }
    }

    this.currentNode = node;
    this.currentTextIndex = 0;

    const texts = Array.isArray(node.text) ? node.text : [node.text];
    this.showText(node.speaker, texts);
  }

  private showText(speaker: string, texts: string[]): void {
    if (this.currentTextIndex >= texts.length) {
      this.onTextComplete();
      return;
    }

    this.dialogueBox.show(speaker, texts[this.currentTextIndex], () => {
      this.currentTextIndex++;
      this.showText(speaker, texts);
    });
  }

  private onTextComplete(): void {
    if (!this.currentNode) return;

    // Execute actions
    if (this.currentNode.actions) {
      for (const action of this.currentNode.actions) {
        this.executeAction(action);
      }
    }

    // Show choices or advance
    if (this.currentNode.choices && this.currentNode.choices.length > 0) {
      this.showChoices();
    } else if (this.currentNode.nextNodeId) {
      this.showNode(this.currentNode.nextNodeId);
    } else {
      this.endDialogue();
    }
  }

  private showChoices(): void {
    if (!this.currentNode?.choices) return;
    this.dialogueBox.hide();

    const { width, height } = this.scene.cameras.main;
    this.choiceContainer = this.scene.add.container(width / 2, height - 200).setDepth(5001).setScrollFactor(0);

    const validChoices = this.currentNode.choices.filter((choice) => {
      if (!choice.condition) return true;
      switch (choice.condition.type) {
        case 'puzzle_completed':
          return gameState.isPuzzleCompleted(choice.condition.value);
        case 'flag_set':
          return gameState.getFlag(choice.condition.value);
        default:
          return true;
      }
    });

    validChoices.forEach((choice, index) => {
      const y = index * 40;
      const bg = this.scene.add.rectangle(0, y, 500, 34, 0x1a1a2e, 0.9);
      bg.setStrokeStyle(1, 0x4a4a6a);
      bg.setInteractive({ useHandCursor: true });

      const choiceText = this.scene.add.text(0, y, `> ${choice.text}`, {
        fontSize: '12px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#06b6d4',
      }).setOrigin(0.5);

      bg.on('pointerover', () => {
        bg.setStrokeStyle(2, 0x06b6d4);
        choiceText.setColor('#ffffff');
      });

      bg.on('pointerout', () => {
        bg.setStrokeStyle(1, 0x4a4a6a);
        choiceText.setColor('#06b6d4');
      });

      bg.on('pointerdown', () => {
        this.choiceContainer?.destroy();
        this.choiceContainer = null;
        this.showNode(choice.nextNodeId);
      });

      this.choiceContainer!.add([bg, choiceText]);
    });
  }

  private executeAction(action: DialogueAction): void {
    switch (action.type) {
      case 'set_flag':
        gameState.setFlag(action.value, true);
        break;
      case 'unlock_puzzle':
        gameState.setFlag(`puzzle_${action.value}_unlocked`, true);
        break;
      case 'start_puzzle':
        // Will be handled by the scene
        eventBus.emit('dialogue:action', { type: 'start_puzzle', value: action.value });
        break;
    }
  }

  private handleAdvance(): void {
    if (!this.isActive) return;
    if (this.choiceContainer?.visible) return;
    this.dialogueBox.advance();
  }

  private endDialogue(): void {
    this.dialogueBox.hide();
    this.choiceContainer?.destroy();
    this.choiceContainer = null;
    this.isActive = false;
    this.currentTree = null;
    this.currentNode = null;

    // Prevent the same SPACE press from re-triggering dialogue via InteractionSystem
    this.endCooldown = true;
    this.scene.time.delayedCall(200, () => {
      this.endCooldown = false;
    });

    eventBus.emit(GameEvents.DIALOGUE_END, {});

    if (this.onDialogueEnd) {
      this.onDialogueEnd();
    }
  }

  isDialogueActive(): boolean {
    return this.isActive || this.endCooldown;
  }

  destroy(): void {
    this.dialogueBox.destroy();
    this.choiceContainer?.destroy();
  }
}
