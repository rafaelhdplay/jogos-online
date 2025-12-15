import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import SuperTicTacToe from './SuperTicTacToe';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/super-jogo-da-velha" element={<SuperTicTacToe />} />
        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Home />} />
      </Routes>
    </HashRouter>
  );
};

export default App;