// A small, dependency-free practice exercise. No answers are persisted.
export const genjutsuModeQuestions = Object.freeze([
  {
    id: 'single-player',
    scenario: 'Replace one football player with your reference character. Keep the other players, stadium, camera and timing unchanged.',
    answer: 'object',
    explanation: 'Object Swap targets a selected person while preserving the surrounding shot.'
  },
  {
    id: 'new-world',
    scenario: 'Rebuild a dance clip with a new cast and location, but keep the original choreography, camera movement and timing.',
    answer: 'motion',
    explanation: 'Motion Transfer follows the source performance while allowing the cast and scene to be rebuilt.'
  }
]);

export function checkGenjutsuMode(questionId, selectedMode) {
  const question = genjutsuModeQuestions.find(item => item.id === questionId);
  if (!question || !['object', 'motion'].includes(selectedMode)) return null;
  return {
    correct: selectedMode === question.answer,
    explanation: question.explanation,
    expectedMode: question.answer
  };
}
