import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, Grid3x3, ArrowRight } from 'lucide-react';

const Home: React.FC = () => {
  return (
    <div className="flex flex-col items-center min-h-screen w-full bg-[#121212] text-slate-200 p-8">
      
      {/* Hero Section */}
      <div className="max-w-4xl w-full text-center mt-12 mb-16 space-y-4">
        <div className="flex justify-center mb-4">
          <Gamepad2 className="w-16 h-16 text-blue-500 animate-bounce" />
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-wider text-slate-100 drop-shadow-lg">
          Arcade de Jogos
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Uma coleção de jogos clássicos reinventados para estrategistas modernos. 
          Jogue contra a IA ou desafie seus amigos online.
        </p>
      </div>

      {/* Game Grid */}
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {/* Super Jogo da Velha Card */}
        <Link to="/super-jogo-da-velha" className="group relative bg-[#1e1e1e] border border-slate-700 rounded-xl overflow-hidden hover:border-blue-500 transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:-translate-y-2">
          <div className="h-48 bg-slate-800/50 flex items-center justify-center border-b border-slate-700 group-hover:bg-slate-800/80 transition">
             <Grid3x3 className="w-24 h-24 text-slate-500 group-hover:text-blue-400 transition-colors duration-300" />
          </div>
          <div className="p-6">
            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">Super Jogo da Velha</h3>
            <p className="text-slate-400 text-sm mb-4 h-20 overflow-hidden">
              Não é apenas um jogo da velha. É um tabuleiro dentro de outro tabuleiro. Vença 3 mini-tabuleiros para ganhar o jogo global.
            </p>
            <div className="flex items-center text-blue-400 font-bold text-sm tracking-wide">
              JOGAR AGORA <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Placeholder for Future Game */}
        <div className="group relative bg-[#1e1e1e] border border-slate-800 rounded-xl overflow-hidden opacity-50 cursor-not-allowed">
          <div className="h-48 bg-slate-900/50 flex items-center justify-center border-b border-slate-800">
             <span className="text-6xl text-slate-700 font-bold">?</span>
          </div>
          <div className="p-6">
            <h3 className="text-2xl font-bold text-slate-500 mb-2">Em Breve</h3>
            <p className="text-slate-600 text-sm mb-4">
              Estamos trabalhando em novos desafios. Fique ligado para mais jogos de estratégia e raciocínio.
            </p>
          </div>
        </div>

      </div>

      <footer className="mt-auto py-12 text-slate-600 text-sm">
        &copy; {new Date().getFullYear()} Arcade de Jogos. Desenvolvido com React.
      </footer>
    </div>
  );
};

export default Home;