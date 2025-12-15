export type Player = 'X' | 'O' | null;
export type MiniBoardStatus = 'X' | 'O' | 'Draw' | null;

// The entire 9x9 grid is represented as 9 mini-boards, each having 9 cells
export type CellIndex = number; // 0-8
export type BoardIndex = number; // 0-8

export interface GameState {
  // 9 arrays of 9 cells each
  miniBoards: Player[][];
  // Status of the 9 mini-boards (who won them)
  globalBoard: MiniBoardStatus[];
  currentPlayer: 'X' | 'O';
  // The index of the mini-board the current player MUST play in. -1 or null means anywhere.
  nextBoard: BoardIndex | null;
  winner: Player | 'Draw';
  gameMode: 'PvP' | 'PvC' | 'Online'; // Player vs Player or Player vs Computer or Online P2P
  difficulty: 'Easy' | 'Hard';
  playerNames: {
    X: string;
    O: string;
  };
  winningLine: number[] | null; // Indices of winning global boards
}