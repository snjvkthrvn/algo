export interface HashHighlandsChoiceRound {
  title: string;
  prompt: string;
  options: readonly string[];
  correctIndex: number;
  success: string;
}

export const NAMEPLATE_GATE_ROUNDS: HashHighlandsChoiceRound[] = [
  {
    title: 'Visitor: Silvergate',
    prompt: 'A visitor speaks a name. What opens the matching door fastest?',
    options: ['use the name tag', 'check every door', 'ask the river'],
    correctIndex: 0,
    success: 'The name becomes the address.',
  },
  {
    title: 'Visitor: Owl-Hood',
    prompt: 'The same visitor returns later. The tag is already placed.',
    options: ['start over', 'reuse the tag', 'shuffle all tags'],
    correctIndex: 1,
    success: 'Stored names stay cheap to find.',
  },
  {
    title: 'Visitor: Mooncell',
    prompt: 'No room owns this name. What should the keeper return?',
    options: ['invent a door', 'no such room', 'search forever'],
    correctIndex: 1,
    success: 'Missing names can be answered cleanly.',
  },
];

export const FREQUENCY_FORGE_ROUNDS: HashHighlandsChoiceRound[] = [
  {
    title: 'Stream: A A B C A',
    prompt: 'Which glyph is most common so far?',
    options: ['A', 'B', 'C'],
    correctIndex: 0,
    success: 'One bin glows brightest.',
  },
  {
    title: 'Compare B and D',
    prompt: 'B has 3 marks. D has 1 mark. Which bin is heavier?',
    options: ['B', 'D', 'same count'],
    correctIndex: 0,
    success: 'The count beats the full stream.',
  },
  {
    title: 'Reference: R R S T',
    prompt: 'Current stream is R S T. Which reference glyph is missing?',
    options: ['R', 'S', 'T'],
    correctIndex: 0,
    success: 'Frequency reveals the missing mark.',
  },
];

export const ANAGRAM_GARDEN_ROUNDS: HashHighlandsChoiceRound[] = [
  {
    title: 'LISTEN Arrives',
    prompt: 'Which flower bed should SILENT join?',
    options: ['EILNST bed', 'STONE bed', 'alone bed'],
    correctIndex: 0,
    success: 'Sorted letters reveal the shared key.',
  },
  {
    title: 'SPARE Arrives',
    prompt: 'Which bloom belongs with PEARS?',
    options: ['SPEAR', 'STONE', 'TRACE'],
    correctIndex: 0,
    success: 'Different word, same signature.',
  },
  {
    title: 'ODD Bloom',
    prompt: 'A flower has a signature no bed has seen.',
    options: ['force a match', 'start a new bed', 'discard it'],
    correctIndex: 1,
    success: 'A new key gets its own group.',
  },
];

export const CACHE_CAVERN_ROUNDS: HashHighlandsChoiceRound[] = [
  {
    title: 'Question: F(6)',
    prompt: 'The cave has never seen this question. What happens first?',
    options: ['solve and store', 'pretend cached', 'erase the table'],
    correctIndex: 0,
    success: 'First answers become future shortcuts.',
  },
  {
    title: 'Question: F(6)',
    prompt: 'The same question returns. What is fastest now?',
    options: ['solve again', 'read the cache', 'ask every crystal'],
    correctIndex: 1,
    success: 'A past answer helps the present.',
  },
  {
    title: 'Cache Full',
    prompt: 'A new question arrives, but every slot is occupied.',
    options: ['evict old entry', 'forget all entries', 'refuse all work'],
    correctIndex: 0,
    success: 'Memory has a cost and a policy.',
  },
];

export const ARCHIVIST_ROUNDS: HashHighlandsChoiceRound[] = [
  {
    title: 'Phase 1: Name Query',
    prompt: 'The Archivist asks for a room by name.',
    options: ['look up key', 'scan every room', 'shuffle shelves'],
    correctIndex: 0,
    success: 'The query lands instantly.',
  },
  {
    title: 'Phase 2: Count Storm',
    prompt: 'Letters pour into bins. The Archivist asks what changed.',
    options: ['read counts', 'replay stream', 'ignore bins'],
    correctIndex: 0,
    success: 'The bins hold the shape of the stream.',
  },
  {
    title: 'Phase 3: Scrambled Bloom',
    prompt: 'A word arrives scrambled but shares a hidden signature.',
    options: ['sort to key', 'compare to all words', 'throw away'],
    correctIndex: 0,
    success: 'The signature finds the bed.',
  },
  {
    title: 'Phase 4: Deep Cache',
    prompt: 'A nested question repeats an answer already solved.',
    options: ['read cache', 'solve from zero', 'rename the question'],
    correctIndex: 0,
    success: 'The archive stops re-solving itself.',
  },
];

export function isCorrectHashChoice(round: HashHighlandsChoiceRound, choiceIndex: number): boolean {
  return choiceIndex === round.correctIndex;
}
