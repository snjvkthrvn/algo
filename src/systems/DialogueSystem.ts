/**
 * DialogueSystem - Manages dialogue flow with typewriter effect,
 * branching via choices, and conditional nodes.
 */

import Phaser from 'phaser';
import { DialogueBox } from '../ui/DialogueBox';
import { eventBus, GameEvents } from '../core/EventBus';
import { gameState } from '../core/GameStateManager';
import type { DialogueTree, DialogueNode, DialogueAction, DialogueChoice } from '../data/types';

export class DialogueSystem {
  private scene: Phaser.Scene;
  private dialogueBox: DialogueBox;
  private currentTree: DialogueTree | null = null;
  private currentNode: DialogueNode | null = null;
  private currentTextIndex: number = 0;
  private isActive: boolean = false;
  private onDialogueEnd: (() => void) | null = null;
  private choiceContainer: Phaser.GameObjects.Container | null = null;
  private choiceItems: Array<{ bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text }> = [];
  private validChoices: DialogueChoice[] = [];
  private selectedChoiceIndex: number = 0;
  private endCooldown: boolean = false;
  private destroyed: boolean = false;

  private readonly onAdvanceKey = () => this.handleAdvance();
  private readonly onChoiceUp = () => this.moveChoice(-1);
  private readonly onChoiceDown = () => this.moveChoice(1);
  private readonly onPointerDown = () => {
    if (this.isActive && !this.choiceContainer?.visible) {
      this.handleAdvance();
    }
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.dialogueBox = new DialogueBox(scene);

    // Input handling
    scene.input.keyboard?.on('keydown-SPACE', this.onAdvanceKey);
    scene.input.keyboard?.on('keydown-ENTER', this.onAdvanceKey);
    scene.input.keyboard?.on('keydown-UP', this.onChoiceUp);
    scene.input.keyboard?.on('keydown-W', this.onChoiceUp);
    scene.input.keyboard?.on('keydown-DOWN', this.onChoiceDown);
    scene.input.keyboard?.on('keydown-S', this.onChoiceDown);
    scene.input.on('pointerdown', this.onPointerDown);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
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
    this.destroyChoices();

    const { width, height } = this.scene.cameras.main;
    this.choiceContainer = this.scene.add.container(width / 2, height - 200).setDepth(5001).setScrollFactor(0);

    this.validChoices = this.currentNode.choices.filter((choice) => {
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

    if (this.validChoices.length === 0) {
      this.endDialogue();
      return;
    }

    this.selectedChoiceIndex = 0;

    this.validChoices.forEach((choice, index) => {
      const y = index * 44;
      const bg = this.scene.add.rectangle(0, y, 640, 36, 0x1a1a2e, 0.94)
        .setDepth(5002)
        .setScrollFactor(0);
      bg.setStrokeStyle(1, 0x4a4a6a);
      bg.setInteractive({ useHandCursor: true });

      const choiceText = this.scene.add.text(0, y, `> ${choice.text}`, {
        fontSize: '12px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#06b6d4',
        wordWrap: { width: 600 },
        align: 'center',
      }).setOrigin(0.5).setDepth(5003).setScrollFactor(0);

      bg.on('pointerover', () => {
        this.selectedChoiceIndex = index;
        this.renderChoiceSelection();
      });

      bg.on('pointerout', () => {
        this.renderChoiceSelection();
      });

      bg.on('pointerdown', () => {
        this.selectChoice(index);
      });

      this.choiceItems.push({ bg, text: choiceText });
      this.choiceContainer!.add([bg, choiceText]);
    });

    this.renderChoiceSelection();
  }

  private moveChoice(delta: number): void {
    if (!this.choiceContainer?.visible || this.validChoices.length === 0) return;
    const count = this.validChoices.length;
    this.selectedChoiceIndex = (this.selectedChoiceIndex + delta + count) % count;
    this.renderChoiceSelection();
  }

  private renderChoiceSelection(): void {
    this.choiceItems.forEach((item, index) => {
      const selected = index === this.selectedChoiceIndex;
      item.bg.setFillStyle(selected ? 0x243b55 : 0x1a1a2e, 0.94);
      item.bg.setStrokeStyle(selected ? 2 : 1, selected ? 0x06b6d4 : 0x4a4a6a);
      item.text.setColor(selected ? '#ffffff' : '#06b6d4');
      item.text.setText(`${selected ? '>' : ' '} ${this.validChoices[index].text}`);
    });
  }

  private selectChoice(index: number): void {
    const choice = this.validChoices[index];
    if (!choice) return;
    this.destroyChoices();
    this.showNode(choice.nextNodeId);
  }

  private destroyChoices(): void {
    this.choiceContainer?.destroy();
    this.choiceContainer = null;
    this.choiceItems = [];
    this.validChoices = [];
    this.selectedChoiceIndex = 0;
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
    if (this.choiceContainer?.visible) {
      this.selectChoice(this.selectedChoiceIndex);
      return;
    }
    this.dialogueBox.advance();
  }

  private endDialogue(): void {
    this.dialogueBox.hide();
    this.destroyChoices();
    this.isActive = false;
    this.currentTree = null;
    this.currentNode = null;

    // Prevent the same SPACE press from re-triggering dialogue via InteractionSystem
    this.endCooldown = true;
    this.scene.time.delayedCall(200, () => {
      this.endCooldown = false;
    });

    eventBus.emit(GameEvents.DIALOGUE_END, {});

    const onEnd = this.onDialogueEnd;
    this.onDialogueEnd = null;
    onEnd?.();
  }

  isDialogueActive(): boolean {
    return this.isActive || this.endCooldown;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.input.keyboard?.off('keydown-SPACE', this.onAdvanceKey);
    this.scene.input.keyboard?.off('keydown-ENTER', this.onAdvanceKey);
    this.scene.input.keyboard?.off('keydown-UP', this.onChoiceUp);
    this.scene.input.keyboard?.off('keydown-W', this.onChoiceUp);
    this.scene.input.keyboard?.off('keydown-DOWN', this.onChoiceDown);
    this.scene.input.keyboard?.off('keydown-S', this.onChoiceDown);
    this.scene.input.off('pointerdown', this.onPointerDown);
    this.dialogueBox.destroy();
    this.destroyChoices();
  }
}
