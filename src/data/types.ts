/**
 * Algorithmia: The Path of Logic - Game Data Types
 * Preserved and enhanced from original codebase
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export enum Difficulty {
  VERY_EASY = 'very_easy',
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  VERY_HARD = 'very_hard',
}

export enum AlgorithmType {
  PATTERN_MATCHING = 'pattern_matching',
  SEQUENTIAL_REASONING = 'sequential_reasoning',
  SPATIAL_MAPPING = 'spatial_mapping',
  SORTING = 'sorting',
  ARRAY_INDEXING = 'array_indexing',
  HASHING = 'hashing',
  TWO_SUM = 'two_sum',
  TWO_POINTERS = 'two_pointers',
  POINTER_CONVERGENCE = 'pointer_convergence',
  SLIDING_WINDOW = 'sliding_window',
  ADVANCED_POINTERS = 'advanced_pointers',
  HYBRID = 'hybrid',
}

export enum PuzzleType {
  INTERACTIVE = 'interactive',
  BOSS = 'boss',
  MINI_FORGE = 'mini_forge',
}

export enum NPCType {
  MENTOR = 'mentor',
  GUIDE = 'guide',
  VILLAGER = 'villager',
  BOSS = 'boss',
}

export enum PlayerState {
  IDLE = 'idle',
  WALKING = 'walking',
  INTERACTING = 'interacting',
  FROZEN = 'frozen',
}

export enum BitStage {
  SPARK = 'spark',       // Single particle — just met you
  BYTE = 'byte',         // 8 particles in a line — arrays unlocked
  FRAME = 'frame',       // Rectangle outline — patterns recognized
  BRANCH = 'branch',     // Branching form — conditionals learned
  GRAPH = 'graph',       // Connected nodes — graphs understood
  CORE = 'core',         // Full radiant form — all concepts mastered
}

export enum BitMood {
  NEUTRAL = 'neutral',
  EXCITED = 'excited',   // Puzzle solved, new region
  SCARED = 'scared',     // Void nearby, Glitch encounter
  HINT_WARM = 'hint_warm', // Player is on the right track
  HINT_COLD = 'hint_cold', // Player is moving away from solution
}

// ============================================================================
// REGION TYPES
// ============================================================================

export interface RegionConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  theme: RegionTheme;
  unlockRequirements: UnlockRequirements;
  tilemapKey?: string;
  backgroundMusic: string;
  ambientSound?: string;
  spawnPoint: Position;
  exitPoints: ExitPoint[];
  npcs: NPCReference[];
  puzzles: PuzzleReference[];
  interactables: Interactable[];
}

export interface RegionTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  atmosphere: string;
  visualStyle: string;
}

export interface UnlockRequirements {
  puzzlesCompleted?: number;
  regionsCompleted?: string[];
  codexEntries?: number;
  specificPuzzles?: string[];
}

export interface Position {
  x: number;
  y: number;
}

export interface ExitPoint {
  id: string;
  position: Position;
  leadsTo: string;
  requiresUnlock?: boolean;
  unlockCondition?: string;
}

// ============================================================================
// PUZZLE TYPES
// ============================================================================

export interface PuzzleReference {
  id: string;
  position: Position;
  enabled: boolean;
}

export interface PuzzleConfig {
  id: string;
  name: string;
  displayName: string;
  type: PuzzleType;
  difficulty: Difficulty;
  algorithmConcept: AlgorithmType;
  description: string;
  location: string;
  npcId?: string;
  mechanics: PuzzleMechanics;
  solution: PuzzleSolution;
  hints: string[];
  timeLimit?: number;
  rewards: PuzzleRewards;
  conceptBridge: ConceptBridge;
  codexEntry: CodexEntry;
}

export interface PuzzleMechanics {
  type: string;
  elements: PuzzleElement[];
  rules: string[];
  controls: ControlScheme;
  victoryCriteria: VictoryCriteria;
}

export interface PuzzleElement {
  id: string;
  type: string;
  initialState: unknown;
  properties: Record<string, unknown>;
}

export interface ControlScheme {
  input: string[];
  actions: string[];
  instructions: string;
}

export interface VictoryCriteria {
  type: string;
  conditions: string[];
  checkFunction?: string;
}

export interface PuzzleSolution {
  steps: string[];
  acceptableVariations?: string[];
  optimalMoves?: number;
}

export interface PuzzleRewards {
  codexUnlock: boolean;
  conceptBridgeTriggered: boolean;
  progressionPoints: number;
  unlocks?: string[];
}

export interface PuzzleResult {
  stars: number;
  time: number;
  attempts: number;
  hintsUsed: number;
}

// ============================================================================
// CONCEPT BRIDGE TYPES
// ============================================================================

export interface ConceptBridge {
  id: string;
  puzzleId: string;
  sections: ConceptBridgeSection[];
  miniForge?: MiniForgeChallenge;
}

export interface ConceptBridgeSection {
  type: 'story_recap' | 'pattern_reveal' | 'pseudocode' | 'practice' | 'unlock';
  title: string;
  content: string | string[];
  code?: CodeBlock;
  interactive?: boolean;
}

export interface CodeBlock {
  language: string;
  code: string;
  explanation: string;
}

export interface MiniForgeChallenge {
  title: string;
  description: string;
  challenge: string;
  correctAnswer: unknown;
  feedback: {
    correct: string;
    incorrect: string;
  };
}

// ============================================================================
// CODEX TYPES
// ============================================================================

export interface CodexEntry {
  id: string;
  algorithmName: string;
  category: AlgorithmType;
  unlockedBy: string;
  sections: CodexSection[];
  relatedConcepts: string[];
  difficulty: Difficulty;
}

export interface CodexSection {
  type: 'what_you_felt' | 'plain_explanation' | 'pattern_steps' | 'real_world' | 'unlocked_ability';
  title: string;
  content: string | string[];
}

// ============================================================================
// NPC & DIALOGUE TYPES
// ============================================================================

export interface NPCReference {
  id: string;
  position: Position;
  enabled: boolean;
}

export interface NPCConfig {
  id: string;
  name: string;
  type: NPCType;
  spriteKey: string;
  idleFrames?: number[];
  talkFrames?: number[];
  defaultPosition: Position;
  dialogue: DialogueTree;
  postPuzzleDialogue?: DialogueTree;
  questRelated?: boolean;
}

export interface DialogueTree {
  nodes: DialogueNode[];
  startNodeId: string;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string | string[];
  emotion?: string;
  choices?: DialogueChoice[];
  nextNodeId?: string;
  conditions?: DialogueCondition[];
  actions?: DialogueAction[];
}

export interface DialogueChoice {
  text: string;
  nextNodeId: string;
  condition?: DialogueCondition;
}

export interface DialogueCondition {
  type: 'puzzle_completed' | 'item_has' | 'flag_set' | 'codex_unlocked';
  value: string;
}

export interface DialogueAction {
  type: 'set_flag' | 'give_item' | 'unlock_puzzle' | 'trigger_cutscene' | 'start_puzzle';
  value: string;
}

// ============================================================================
// INTERACTABLE TYPES
// ============================================================================

export interface Interactable {
  id: string;
  type: 'door' | 'chest' | 'sign' | 'lever' | 'button' | 'portal';
  position: Position;
  spriteKey: string;
  interaction: InteractionConfig;
}

export interface InteractionConfig {
  prompt: string;
  action: string;
  requirement?: string;
  outcome: InteractionOutcome;
}

export interface InteractionOutcome {
  type: 'dialogue' | 'item' | 'unlock' | 'teleport' | 'trigger_event';
  value: string;
}

// ============================================================================
// BOSS TYPES
// ============================================================================

export interface BossConfig extends PuzzleConfig {
  phases: BossPhase[];
  healthBarVisible: boolean;
  defeatDialogue: string[];
  victoryRewards: VictoryRewards;
}

export interface BossPhase {
  phaseNumber: number;
  name: string;
  mechanics: PuzzleMechanics;
  healthThreshold?: number;
  timeLimit?: number;
  difficulty: Difficulty;
}

export interface VictoryRewards {
  codexEntries: string[];
  unlockedRegions: string[];
  progressionPoints: number;
  specialItems?: string[];
}

// ============================================================================
// GAME STATE TYPES
// ============================================================================

export interface CompanionState {
  stage: BitStage;
  mood: BitMood;
}

export interface RivalState {
  encountered: boolean;
  encounterStage: number; // 0=never met, 1=prologue taunt, 2=array plains, 3+=later
}

export interface GameState {
  player: {
    x: number;
    y: number;
    region: string;
  };
  companion: CompanionState;
  rival: RivalState;
  shardsCollected: string[];
  puzzleResults: Record<string, PuzzleResult>;
  codexEntries: string[];
  npcStates: Record<string, string>;
  flags: Record<string, boolean>;
  settings: GameSettings;
  saveVersion: number;
  playTime: number;
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  textSpeed: number;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface PuzzleCompleteEvent {
  puzzleId: string;
  stars: number;
  time: number;
  attempts: number;
  hintsUsed: number;
}

export interface ConceptBridgeData {
  puzzleName: string;
  puzzleId: string;
  concept: string;
  attempts: number;
  timeSpent: number;
  hintsUsed: number;
  stars: number;
}
