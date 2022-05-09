import { makepuzzle, solvepuzzle } from 'sudoku';

async function createPuzzle() {
  try {
    let puzzle = await makepuzzle();
    let solution = await solvepuzzle(puzzle);
    puzzle = puzzle.map((e) => (e == 0 ? 9 : e));
    solution = solution.map((e) => (e == 0 ? 9 : e));
    return {
      puzzle,
      solution,
    };
  } catch (error) {
    throw new Error(`Error: ${error}`);
  }
}
export default createPuzzle;
