import React from 'react';
import { RULES_TEXT } from '../constants';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1e1e1e] border border-slate-700 rounded-lg shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-slate-100">{title}</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="p-6 overflow-y-auto text-slate-300">
          {children}
        </div>
        <div className="p-4 border-t border-slate-700 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export const RulesModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Como Jogar">
    <div className="whitespace-pre-line leading-relaxed text-sm sm:text-base">
      {RULES_TEXT}
    </div>
  </Modal>
);

interface NameModalProps {
  isOpen: boolean;
  onClose: () => void;
  names: { X: string; O: string };
  setNames: (names: { X: string; O: string }) => void;
}

export const NameModal: React.FC<NameModalProps> = ({ isOpen, onClose, names, setNames }) => {
  const [tempNames, setTempNames] = React.useState(names);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNames(tempNames);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Personalizar Nomes">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Jogador X</label>
          <input 
            type="text" 
            value={tempNames.X}
            onChange={(e) => setTempNames({...tempNames, X: e.target.value})}
            className="w-full bg-[#2a2a2a] border border-slate-600 rounded p-2 text-white focus:outline-none focus:border-blue-500"
            maxLength={12}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Jogador O (ou Computador)</label>
          <input 
            type="text" 
            value={tempNames.O}
            onChange={(e) => setTempNames({...tempNames, O: e.target.value})}
            className="w-full bg-[#2a2a2a] border border-slate-600 rounded p-2 text-white focus:outline-none focus:border-blue-500"
            maxLength={12}
          />
        </div>
        <div className="pt-2">
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-bold">
                Salvar
            </button>
        </div>
      </form>
    </Modal>
  );
};
