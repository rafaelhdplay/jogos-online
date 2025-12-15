import { MiniBoardStatus, Player, GameState, BoardIndex, CellIndex } from '../types';
import { WIN_PATTERNS } from '../constants';

// Check if a set of cells results in a win
export const checkWinner = (cells: (Player | MiniBoardStatus)[]): { winner: Player | 'Draw' | null, line: number[] | null } => {
  for (const pattern of WIN_PATTERNS) {
    const [a, b, c] = pattern;
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return { winner: cells[a] as Player, line: pattern };
    }
  }

  if (cells.every((cell) => cell !== null)) {
    return { winner: 'Draw', line: null };
  }

  return { winner: null, line: null };
};

// Simple heuristic AI for determining the best move
export const getBestMove = (gameState: GameState): { boardIndex: number, cellIndex: number } => {
  const { miniBoards, globalBoard, nextBoard } = gameState;
  const cpu = 'O';
  const human = 'X';
  const difficulty = gameState.difficulty;

  // Get all valid moves
  let validMoves: { boardIndex: number, cellIndex: number }[] = [];
  
  const boardsToSearch = nextBoard !== null && globalBoard[nextBoard] === null 
    ? [nextBoard] 
    : globalBoard.map((status, idx) => status === null ? idx : -1).filter(idx => idx !== -1);

  for (const bIdx of boardsToSearch) {
    for (let cIdx = 0; cIdx < 9; cIdx++) {
      if (miniBoards[bIdx][cIdx] === null) {
        validMoves.push({ boardIndex: bIdx, cellIndex: cIdx });
      }
    }
  }

  if (validMoves.length === 0) return { boardIndex: -1, cellIndex: -1 };

  // Easy mode: Random move
  if (difficulty === 'Easy') {
    const randomIndex = Math.floor(Math.random() * validMoves.length);
    return validMoves[randomIndex];
  }

  // Hard mode: Heuristic Scoring
  let bestScore = -Infinity;
  let bestMove = validMoves[0];

  for (const move of validMoves) {
    let score = 0;
    const { boardIndex, cellIndex } = move;

    // 1. Win a local board immediately (Highest Priority)
    const tempBoard = [...miniBoards[boardIndex]];
    tempBoard[cellIndex] = cpu;
    const localWin = checkWinner(tempBoard).winner === cpu;
    if (localWin) score += 100;

    // 2. Block human from winning local board (High Priority)
    tempBoard[cellIndex] = human;
    const blockLoss = checkWinner(tempBoard).winner === human;
    if (blockLoss) score += 80;

    // 3. Strategic placement (Center is good)
    if (cellIndex === 4) score += 5;
    else if ([0, 2, 6, 8].includes(cellIndex)) score += 3;

    // 4. Penalty for sending opponent to a board where they can win or a free board
    // The move at 'cellIndex' sends opponent to board 'cellIndex'
    const targetBoardIndex = cellIndex;
    const targetBoardStatus = globalBoard[targetBoardIndex];

    if (targetBoardStatus !== null) {
      // Sending to a finished board gives them a free move. BAD.
      score -= 50; 
    } else {
      // Check if opponent can win immediately in the target board
      let canOpponentWinTarget = false;
      for (let i = 0; i < 9; i++) {
        if (miniBoards[targetBoardIndex][i] === null) {
          const tBoard = [...miniBoards[targetBoardIndex]];
          tBoard[i] = human;
          if (checkWinner(tBoard).winner === human) {
            canOpponentWinTarget = true;
            break;
          }
        }
      }
      if (canOpponentWinTarget) score -= 60; // Very dangerous
    }

    // 5. Global Strategy (if winning this board helps win the game)
    if (localWin) {
      const tempGlobal = [...globalBoard];
      tempGlobal[boardIndex] = cpu;
      const globalWin = checkWinner(tempGlobal).winner === cpu;
      if (globalWin) score += 500; // Game winning move
      
      // Does it block a global win?
      tempGlobal[boardIndex] = human;
      const blockGlobalLoss = checkWinner(tempGlobal).winner === human;
      if (blockGlobalLoss) score += 200;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
};
