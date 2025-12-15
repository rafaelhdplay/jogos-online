import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Peer, DataConnection } from 'peerjs';
import { GameState, Player, BoardIndex, CellIndex } from './types';
import { checkWinner, getBestMove } from './utils/gameLogic';
import { ResetIcon, UserIcon, CpuIcon, TrashIcon, VolumeIcon, VolumeOffIcon, WifiIcon, CopyIcon, ExitIcon, ShareIcon } from './components/Icons';
import { RulesModal, NameModal } from './components/Modals';

// Initial Empty State
const getInitialState = (): GameState => ({
  miniBoards: Array(9).fill(null).map(() => Array(9).fill(null)),
  globalBoard: Array(9).fill(null),
  currentPlayer: 'X',
  nextBoard: null,
  winner: null,
  gameMode: 'PvC',
  difficulty: 'Hard',
  playerNames: { X: 'Jogador 1', O: 'Computador' },
  winningLine: null,
});

// MOVED OUTSIDE: Sketchy X Icon
// Wrapped in React.memo for performance
const SketchX = React.memo(({ className, strokeWidth = 2 }: { className?: string, strokeWidth?: number }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" className="animate-draw" strokeDasharray="24" strokeDashoffset="0" />
  </svg>
));

// MOVED OUTSIDE: Sketchy O Icon
const SketchO = React.memo(({ className, strokeWidth = 2 }: { className?: string, strokeWidth?: number }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9z" className="animate-draw" strokeDasharray="60" strokeDashoffset="0" />
  </svg>
));

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(getInitialState());
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [showRules, setShowRules] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // State to track the potential move (hover)
  const [hoveredMove, setHoveredMove] = useState<{ boardIdx: number, cellIdx: number } | null>(null);

  // Online State
  const [onlineRole, setOnlineRole] = useState<'Host' | 'Guest' | null>(null);
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'Disconnected' | 'Connecting' | 'Connected'>('Disconnected');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);

  // Check for join URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('join');
    if (joinId) {
      setGameState(prev => ({ ...prev, gameMode: 'Online' }));
      setRemotePeerId(joinId);
    }
  }, []);

  // Initialize Peer
  useEffect(() => {
    let peer: Peer | null = null;

    if (gameState.gameMode === 'Online') {
      // Robust STUN config for Mobile/Desktop cross-play
      peer = new Peer({
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        },
        debug: 1
      });
      
      peer.on('open', (id) => {
        setMyPeerId(id);
        setConnectionStatus('Disconnected');

        // Auto-connect if joining via link
        const params = new URLSearchParams(window.location.search);
        const joinId = params.get('join');
        if (joinId) {
             connectToPeer(joinId, peer);
        }
      });

      // HOST LOGIC: Handling incoming connections
      peer.on('connection', (conn) => {
        // IMPORTANT: Wait for the connection to be fully open before interacting
        conn.on('open', () => {
            connRef.current = conn;
            setConnectionStatus('Connected');
            setOnlineRole('Host');
            setStatusMessage('');
            
            // Send names to guest with a small delay to ensure Guest listeners are ready
            // This prevents the "Connection Error" race condition on the Host side
            setTimeout(() => {
                if (conn.open) {
                    conn.send({ type: 'SYNC_NAMES', names: gameState.playerNames });
                }
            }, 500);
        });
        
        conn.on('data', (data: any) => {
          handleIncomingData(data);
        });

        conn.on('close', () => {
          setConnectionStatus('Disconnected');
          setStatusMessage('Oponente desconectou.');
          setOnlineRole(null);
          connRef.current = null;
        });
        
        // Handle errors in connection
        conn.on('error', (err) => {
           console.error("Connection Error (Host)", err);
           setConnectionStatus('Disconnected');
           setStatusMessage('Erro na conexão.');
        });
      });
      
      peer.on('error', (err) => {
          console.error("Peer Error", err);
          if (err.type === 'peer-unavailable') {
              setStatusMessage('ID não encontrado ou oponente offline.');
              setConnectionStatus('Disconnected');
          } else if (err.type === 'disconnected' || err.type === 'network' || err.type === 'webrtc') {
              setStatusMessage('Erro de rede. Verifique sua conexão.');
              setConnectionStatus('Disconnected');
          } else {
             setStatusMessage(`Erro: ${err.type}`);
          }
      });

      peerRef.current = peer;
    }

    return () => {
      if (peer) {
        peer.destroy();
      }
      peerRef.current = null;
      connRef.current = null;
      setMyPeerId('');
      setConnectionStatus('Disconnected');
    };
  }, [gameState.gameMode]);

  // GUEST LOGIC: Connecting to Host
  const connectToPeer = (targetId: string = remotePeerId, currentPeer: Peer | null = peerRef.current) => {
    if (!currentPeer || !targetId) return;
    
    setConnectionStatus('Connecting');
    
    // Explicitly requesting reliable JSON channel for compatibility
    const conn = currentPeer.connect(targetId, { 
        reliable: true,
        serialization: 'json'
    });
    connRef.current = conn;

    conn.on('open', () => {
      setConnectionStatus('Connected');
      setOnlineRole('Guest');
      setStatusMessage('');
      
      setGameState(prev => ({
         ...getInitialState(),
         gameMode: 'Online',
         playerNames: { X: 'Host', O: 'Você' }
      }));
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    });

    conn.on('data', (data: any) => {
      handleIncomingData(data);
    });

    conn.on('close', () => {
      setConnectionStatus('Disconnected');
      setStatusMessage('Host desconectou.');
      setOnlineRole(null);
      connRef.current = null;
    });

    conn.on('error', (err) => {
        console.error("Connection Error (Guest)", err);
        setConnectionStatus('Disconnected');
        setStatusMessage('Erro ao conectar.');
    });
  };

  const handleIncomingData = (data: any) => {
    if (data.type === 'MOVE') {
      executeMove(data.boardIdx, data.cellIdx, false); // false = don't broadcast back
    } else if (data.type === 'RESET') {
      setGameState(prev => ({
        ...getInitialState(),
        gameMode: 'Online',
        playerNames: prev.playerNames
      }));
      setHoveredMove(null);
    } else if (data.type === 'SYNC_NAMES') {
      setGameState(prev => ({
        ...prev,
        playerNames: { X: data.names.X, O: prev.playerNames.O }
      }));
    }
  };

  const broadcastMove = (boardIdx: number, cellIdx: number) => {
    if (connRef.current && connectionStatus === 'Connected') {
      connRef.current.send({ type: 'MOVE', boardIdx, cellIdx });
    }
  };

  const broadcastReset = () => {
    if (connRef.current && connectionStatus === 'Connected') {
      connRef.current.send({ type: 'RESET' });
    }
  };

  const resetGame = () => {
    if (gameState.gameMode === 'Online') {
      if (connectionStatus === 'Connected') {
        broadcastReset();
      }
      setGameState(prev => ({
        ...getInitialState(),
        gameMode: 'Online',
        playerNames: prev.playerNames
      }));
    } else {
      setGameState(prev => ({
        ...getInitialState(),
        gameMode: prev.gameMode,
        difficulty: prev.difficulty,
        playerNames: prev.playerNames
      }));
    }
    setHoveredMove(null);
  };

  const resetScores = () => {
    setScores({ X: 0, O: 0 });
  };

  const cycleGameMode = () => {
    if (gameState.gameMode === 'Online') {
        setOnlineRole(null);
        setConnectionStatus('Disconnected');
        setGameState({ ...getInitialState(), gameMode: 'PvC' });
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        const newMode = gameState.gameMode === 'PvP' ? 'Online' : 'PvP';
        setGameState(prev => ({
        ...getInitialState(),
        gameMode: newMode,
        playerNames: newMode === 'PvP' 
            ? { X: 'Jogador 1', O: 'Jogador 2' } 
            : { X: 'Você (Host)', O: 'Oponente' }
        }));
    }
    resetScores();
    setHoveredMove(null);
  };

  const handleDifficultyChange = () => {
    setGameState(prev => ({
      ...prev,
      difficulty: prev.difficulty === 'Easy' ? 'Hard' : 'Easy'
    }));
  };

  // Separated move logic to allow execution without broadcasting
  const executeMove = (boardIdx: BoardIndex, cellIdx: CellIndex, shouldBroadcast: boolean = true) => {
    setGameState(prevState => {
      if (prevState.winner) return prevState;
      if (prevState.miniBoards[boardIdx][cellIdx] !== null) return prevState;
      if (prevState.globalBoard[boardIdx] !== null) return prevState;
      
      if (prevState.nextBoard !== null && prevState.nextBoard !== boardIdx) {
          return prevState; 
      }

      const newMiniBoards = prevState.miniBoards.map(row => [...row]);
      newMiniBoards[boardIdx][cellIdx] = prevState.currentPlayer;

      const newGlobalBoard = [...prevState.globalBoard];
      const miniWin = checkWinner(newMiniBoards[boardIdx]);
      if (miniWin.winner) {
        newGlobalBoard[boardIdx] = miniWin.winner;
      }

      const globalWinResult = checkWinner(newGlobalBoard);
      const newWinner = globalWinResult.winner;
      const newWinningLine = globalWinResult.line;

      let nextBoardIndex: number | null = cellIdx;
      if (newGlobalBoard[nextBoardIndex] !== null) {
        nextBoardIndex = null;
      }
      
      // Update scores if game ended
      if (newWinner && newWinner !== 'Draw') {
        setScores(prev => ({ ...prev, [newWinner]: prev[newWinner] + 1 }));
      }

      return {
        ...prevState,
        miniBoards: newMiniBoards,
        globalBoard: newGlobalBoard,
        currentPlayer: prevState.currentPlayer === 'X' ? 'O' : 'X',
        nextBoard: nextBoardIndex,
        winner: newWinner as Player | 'Draw',
        winningLine: newWinningLine
      };
    });
    
    if (shouldBroadcast && gameState.gameMode === 'Online') {
      broadcastMove(boardIdx, cellIdx);
    }
  };

  const handleMove = useCallback((boardIdx: BoardIndex, cellIdx: CellIndex) => {
     executeMove(boardIdx, cellIdx, true);
     setHoveredMove(null);
  }, [gameState.gameMode, onlineRole, connectionStatus]);

  // AI Turn
  useEffect(() => {
    if (gameState.gameMode === 'PvC' && gameState.currentPlayer === 'O' && !gameState.winner) {
      const timer = setTimeout(() => {
        const { boardIndex, cellIndex } = getBestMove(gameState);
        if (boardIndex !== -1) {
          executeMove(boardIndex, cellIndex, false);
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentPlayer, gameState.gameMode, gameState.winner, gameState.miniBoards, gameState.nextBoard]);

  const renderCell = (boardIdx: number, cellIdx: number) => {
    const value = gameState.miniBoards[boardIdx][cellIdx];
    
    // Is this cell playable?
    const isGlobalBoardActive = gameState.winner === null && (gameState.nextBoard === null || gameState.nextBoard === boardIdx);
    const isBoardPlayable = gameState.globalBoard[boardIdx] === null;
    const isCellEmpty = value === null;
    let isPlayable = isGlobalBoardActive && isBoardPlayable && isCellEmpty;
    
    let isHumanTurn = true;
    if (gameState.gameMode === 'PvC') {
        isHumanTurn = gameState.currentPlayer === 'X';
    } else if (gameState.gameMode === 'Online') {
        // Only playable if it's my turn
        if (onlineRole === 'Host' && gameState.currentPlayer !== 'X') isPlayable = false;
        if (onlineRole === 'Guest' && gameState.currentPlayer !== 'O') isPlayable = false;
        // Also must be connected
        if (connectionStatus !== 'Connected') isPlayable = false;
    }

    // Is this cell being hovered?
    const isHovered = hoveredMove?.boardIdx === boardIdx && hoveredMove?.cellIdx === cellIdx;

    let content = null;
    if (value === 'X') {
      content = <SketchX className="w-full h-full p-1 text-slate-200" strokeWidth={3} />;
    } else if (value === 'O') {
      content = <SketchO className="w-full h-full p-1 text-slate-200" strokeWidth={3} />;
    } else if (isPlayable && isHumanTurn && isHovered) {
      // Ghost Icon for Hover
      if (gameState.currentPlayer === 'X') {
        content = <SketchX className="w-full h-full p-1 text-white/20" strokeWidth={3} />;
      } else {
        content = <SketchO className="w-full h-full p-1 text-white/20" strokeWidth={3} />;
      }
    }

    return (
      <button
        key={`cell-${boardIdx}-${cellIdx}`}
        onClick={() => isPlayable && isHumanTurn && handleMove(boardIdx, cellIdx)}
        onMouseEnter={() => isPlayable && isHumanTurn && setHoveredMove({ boardIdx, cellIdx })}
        onMouseLeave={() => setHoveredMove(null)}
        disabled={!isPlayable || !isHumanTurn}
        className={`
          w-full h-full flex items-center justify-center
          border-slate-600/50
          ${cellIdx % 3 !== 2 ? 'border-r' : ''}
          ${cellIdx < 6 ? 'border-b' : ''}
          ${isPlayable && isHumanTurn ? 'hover:bg-slate-800/30 cursor-pointer' : 'cursor-default'}
          transition-colors duration-150
        `}
      >
        {content}
      </button>
    );
  };

  const renderMiniBoard = (boardIdx: number) => {
    const status = gameState.globalBoard[boardIdx];
    
    // Logic for Current Active Board (Where I MUST play)
    const isNext = gameState.winner === null && gameState.globalBoard[boardIdx] === null && (gameState.nextBoard === null || gameState.nextBoard === boardIdx);
    
    // Logic for Projected Target Board (Where opponent WILL play if I click)
    let isProjectedTarget = false;
    if (hoveredMove && gameState.winner === null) {
       // If I play at hoveredMove.cellIdx, opponent goes to that index.
       // Check if that board is available.
       const targetIdx = hoveredMove.cellIdx;
       if (gameState.globalBoard[targetIdx] === null) {
          // If the board is open, that is the strict target.
          if (boardIdx === targetIdx) isProjectedTarget = true;
       } 
    }

    // Dynamic classes
    let bgClass = '';
    if (isProjectedTarget) {
       bgClass = 'bg-slate-700/50 ring-2 ring-slate-500/50'; 
    } else if (isNext) {
       bgClass = 'bg-slate-800/20 shadow-[inset_0_0_15px_rgba(59,130,246,0.15)]';
    }

    return (
      <div 
        key={`board-${boardIdx}`} 
        className={`
          relative aspect-square p-2
          border-slate-400
          ${boardIdx % 3 !== 2 ? 'border-r-2' : ''}
          ${boardIdx < 6 ? 'border-b-2' : ''}
          ${bgClass}
          transition-all duration-200
        `}
      >
        <div className={`grid grid-cols-3 grid-rows-3 h-full w-full ${status !== null ? 'opacity-25 blur-[1px]' : ''}`}>
          {Array(9).fill(null).map((_, i) => renderCell(boardIdx, i))}
        </div>

        {/* Won Board Overlay */}
        {status !== null && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none animate-in fade-in zoom-in duration-300">
            {status === 'X' && (
               <SketchX className="w-4/5 h-4/5 text-red-600 drop-shadow-2xl filter" strokeWidth={2.5} />
            )}
            {status === 'O' && (
               <SketchO className="w-4/5 h-4/5 text-slate-200 drop-shadow-2xl filter" strokeWidth={2.5} />
            )}
             {status === 'Draw' && (
               <span className="text-4xl font-bold text-slate-500">-</span>
             )}
          </div>
        )}
      </div>
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setShowCopiedToast(true);
    setTimeout(() => setShowCopiedToast(false), 2000);
  };

  const getShareLink = () => {
    return `${window.location.origin}${window.location.pathname}?join=${myPeerId}`;
  };

  return (
    <div className="flex flex-col items-center min-h-full w-full text-slate-200 selection:bg-red-500/30">
      
      {/* Toast Notification */}
      <div className={`fixed top-4 right-4 bg-slate-800 text-white px-4 py-2 rounded shadow-lg transition-opacity duration-300 z-[100] ${showCopiedToast ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
         Copiado para a área de transferência!
      </div>

      {/* Breadcrumb / Top Bar */}
      <div className="w-full max-w-4xl px-4 py-3 text-xs md:text-sm text-slate-500 flex justify-start">
        <span className="underline cursor-pointer hover:text-slate-300">Página Inicial</span> 
        <span className="mx-2">/</span> 
        <span className="text-slate-300">Super Jogo da Velha</span>
      </div>

      <div className="flex flex-col items-center w-full max-w-2xl px-4 pb-12">
        
        {/* Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl mb-6 text-center text-slate-100 tracking-wide" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
          Super Jogo da velha
        </h1>

        {/* Control Bar Pill */}
        <div className="flex items-center justify-between w-full max-w-xs mb-8 px-6 py-2 border border-slate-200 rounded-full text-base sm:text-lg bg-[#121212] z-20">
          <button onClick={resetGame} className="text-slate-300 hover:text-white transition-transform hover:rotate-180 duration-500 p-1" title="Reiniciar Jogo">
            <ResetIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          
          <button onClick={cycleGameMode} className="flex items-center gap-2 hover:text-white transition-colors p-1" title={`Modo: ${gameState.gameMode}`}>
             {gameState.gameMode === 'PvP' ? <UserIcon className="w-5 h-5 sm:w-6 sm:h-6"/> : 
              gameState.gameMode === 'PvC' ? <CpuIcon className="w-5 h-5 sm:w-6 sm:h-6"/> : 
              <WifiIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-400"/>}
          </button>

          {gameState.gameMode === 'PvC' && (
            <button onClick={handleDifficultyChange} className="font-bold hover:text-white uppercase tracking-widest text-sm sm:text-base p-1">
              {gameState.difficulty === 'Easy' ? 'FÁCIL' : 'DIFÍCIL'}
            </button>
          )}
          
          {gameState.gameMode === 'Online' && (
            <button onClick={cycleGameMode} className="text-red-400 hover:text-red-300" title="Sair do Online">
              <ExitIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}
        </div>

        {/* Online Lobby / Connection UI */}
        {gameState.gameMode === 'Online' && connectionStatus !== 'Connected' && (
          <div className="w-full max-w-md bg-[#1e1e1e] border border-slate-700 rounded-lg p-6 mb-8 shadow-xl">
             <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
               <WifiIcon className="w-5 h-5 text-blue-400" /> 
               Modo Online
             </h3>
             
             {/* My ID Section */}
             <div className="mb-6">
               <label className="block text-sm text-slate-400 mb-2">Seu ID (Envie para um amigo):</label>
               <div className="flex gap-2">
                 <div className="bg-black/50 p-2 rounded flex-1 text-center font-mono text-lg tracking-wider border border-slate-700 select-all overflow-hidden text-ellipsis whitespace-nowrap">
                    {myPeerId || 'Gerando ID...'}
                 </div>
                 <button 
                    onClick={() => copyToClipboard(myPeerId)}
                    disabled={!myPeerId}
                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-white transition disabled:opacity-50"
                    title="Copiar ID"
                 >
                   <CopyIcon className="w-5 h-5" />
                 </button>
                 <button 
                    onClick={() => copyToClipboard(getShareLink())}
                    disabled={!myPeerId}
                    className="p-2 bg-blue-700 hover:bg-blue-600 rounded text-white transition disabled:opacity-50"
                    title="Copiar Link de Convite"
                 >
                   <ShareIcon className="w-5 h-5" />
                 </button>
               </div>
               <p className="text-xs text-slate-500 mt-2">
                 Clique no botão azul para copiar o link direto de convite.
               </p>
             </div>

             <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-700"></div>
                <span className="flex-shrink-0 mx-4 text-slate-500 text-sm">OU ENTRE</span>
                <div className="flex-grow border-t border-slate-700"></div>
            </div>

             {/* Connect Section */}
             <div className="mt-4">
               <label className="block text-sm text-slate-400 mb-2">ID do Amigo:</label>
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   value={remotePeerId}
                   onChange={(e) => setRemotePeerId(e.target.value)}
                   placeholder="Cole o ID aqui"
                   className="flex-1 bg-black/50 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                 />
                 <button 
                   onClick={() => connectToPeer()}
                   disabled={!remotePeerId || connectionStatus === 'Connecting'}
                   className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition disabled:opacity-50"
                 >
                   {connectionStatus === 'Connecting' ? '...' : 'Entrar'}
                 </button>
               </div>
             </div>
             
             {statusMessage && (
               <div className="mt-4 text-center text-red-400 text-sm animate-pulse">
                 {statusMessage}
               </div>
             )}
          </div>
        )}

        {/* Game Area Container */}
        <div className={`relative w-full flex justify-center transition-opacity duration-500 ${gameState.gameMode === 'Online' && connectionStatus !== 'Connected' ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
          {/* Main Board */}
          <div className="w-full max-w-[450px] aspect-square grid grid-cols-3 border-4 border-slate-500/50 bg-[#121212] overflow-hidden shadow-2xl">
            {Array(9).fill(null).map((_, i) => renderMiniBoard(i))}
          </div>

          {/* Connection Waiting Overlay */}
          {gameState.gameMode === 'Online' && connectionStatus !== 'Connected' && (
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/80 p-4 rounded text-center backdrop-blur-sm">
                   <p className="text-xl font-bold">Aguardando Oponente...</p>
                   <p className="text-sm text-slate-400">Compartilhe seu ID ou Link acima.</p>
                </div>
             </div>
          )}

          {/* Victory / Game Over Overlay */}
          {gameState.winner && (
             <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="text-3xl sm:text-4xl md:text-5xl text-white mb-6 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] rotate-[-2deg] text-center px-4">
                   {gameState.winner === 'Draw' ? 'Empate!' : `Jogador ${gameState.winner === 'X' ? '1' : '2'} ganha!`}
                </div>
                <button 
                  onClick={resetGame}
                  className="bg-[#7f1d1d]/90 hover:bg-[#991b1b] text-white text-lg sm:text-xl px-6 sm:px-8 py-2 rounded shadow-[0_0_10px_rgba(220,38,38,0.3)] border border-red-500/30 transform hover:scale-105 transition-all"
                >
                  Jogar novamente
                </button>
             </div>
          )}
        </div>

        {/* Scores & Players */}
        <div className="w-full max-w-md mt-8 grid grid-cols-2 gap-4 sm:gap-8 text-center relative">
          {/* Player 1 */}
          <div className={`flex flex-col items-center ${gameState.currentPlayer === 'X' ? 'opacity-100 scale-105' : 'opacity-60'} transition-all duration-300`}>
             <span className="text-lg sm:text-xl text-ellipsis overflow-hidden whitespace-nowrap max-w-full px-2">
               {gameState.gameMode === 'Online' ? (onlineRole === 'Host' ? 'Você (X)' : 'Oponente (X)') : 'Jogador 1'}
             </span>
             <span className="text-3xl sm:text-4xl font-bold font-sans">{scores.X}</span>
          </div>

          {/* Player 2/CPU */}
          <div className={`flex flex-col items-center ${gameState.currentPlayer === 'O' ? 'opacity-100 scale-105' : 'opacity-60'} transition-all duration-300`}>
             <span className="text-lg sm:text-xl text-ellipsis overflow-hidden whitespace-nowrap max-w-full px-2">
               {gameState.gameMode === 'Online' ? (onlineRole === 'Guest' ? 'Você (O)' : 'Oponente (O)') : gameState.playerNames.O}
             </span>
             <span className="text-3xl sm:text-4xl font-bold font-sans">{scores.O}</span>
          </div>

           {/* Middle Action Icons */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-6 flex gap-4 text-slate-500">
              <TrashIcon className="w-5 h-5 sm:w-6 sm:h-6 hover:text-white cursor-pointer transition-colors" onClick={resetScores} title="Zerar Placar" />
           </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex gap-2 sm:gap-4 mt-8 sm:mt-12 w-full max-w-md justify-between px-2 sm:px-4 text-sm sm:text-base">
           <button onClick={() => setShowNames(true)} disabled={gameState.gameMode === 'Online'} className="flex-1 px-2 sm:px-6 py-2 border border-slate-500 rounded-lg hover:bg-slate-800 hover:border-slate-300 transition whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed">
             Nomes
           </button>
           
           <div className="flex-shrink-0 flex items-center justify-center cursor-pointer text-slate-500 hover:text-white px-2" onClick={() => setSoundEnabled(!soundEnabled)}>
              {soundEnabled ? <VolumeIcon className="w-5 h-5 sm:w-6 sm:h-6" /> : <VolumeOffIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
           </div>

           <button onClick={() => setShowRules(true)} className="flex-1 px-2 sm:px-6 py-2 border border-slate-500 rounded-lg hover:bg-slate-800 hover:border-slate-300 transition whitespace-nowrap">
             Regras
           </button>
        </div>

        {/* Story Section */}
        <div className="mt-12 sm:mt-16 text-slate-400 text-sm md:text-base leading-relaxed max-w-3xl space-y-6 border-t border-slate-800 pt-8 px-2">
           <p>
             Bem-vindo ao mundo do "Super Jogo da Velha" — uma interpretação moderna do jogo clássico que conquistou o coração de milhões. 
             Esta versão extrema oferece um novo nível de diversão, combinando a simplicidade do jogo da velha original com as complexas 
             possibilidades combinatórias de jogar em um tabuleiro maior. Como resultado, cada jogo torna-se emocionante e único.
           </p>
           
           <div>
             <h3 className="text-xl sm:text-2xl text-slate-200 mb-2">História de Origem</h3>
             <p>
               O "Super Jogo da Velha" surgiu como uma evolução do jogo tradicional, em resposta ao desejo de torná-lo mais empolgante e menos previsível. 
               Embora os nomes exatos dos inventores sejam desconhecidos, está claro que eles visavam superar um dos principais problemas do jogo original — empates frequentes entre jogadores experientes.
             </p>
           </div>
        </div>

      </div>

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      <NameModal 
        isOpen={showNames} 
        onClose={() => setShowNames(false)} 
        names={gameState.playerNames}
        setNames={(names) => setGameState(prev => ({ ...prev, playerNames: names }))}
      />
    </div>
  );
};

export default App;