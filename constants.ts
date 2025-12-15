export const WIN_PATTERNS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

export const RULES_TEXT = `
Regras do Super Jogo da Velha:

1. O Tabuleiro: O jogo consiste em um grande tabuleiro 3x3, onde cada campo contém um mini-tabuleiro 3x3 menor. Total de 81 células.

2. O Objetivo: Vencer 3 mini-tabuleiros em linha (horizontal, vertical ou diagonal) no tabuleiro global.

3. Como Jogar:
   - O primeiro jogador joga em qualquer célula de qualquer mini-tabuleiro.
   - O movimento feito "envia" o oponente para o mini-tabuleiro correspondente. 
     (Ex: Se você jogar no canto inferior direito de um mini-tabuleiro, o oponente deve jogar no mini-tabuleiro do canto inferior direito do tabuleiro global).

4. Ganhando um Mini-Tabuleiro:
   - Funciona como o jogo da velha clássico. Alinhe 3 símbolos para conquistar aquele quadrado maior.
   - Se um mini-tabuleiro der empate (velha), ele é considerado nulo para ambos.

5. Regra do "Tabuleiro Livre":
   - Se você for enviado para um mini-tabuleiro que já foi conquistado ou está cheio, você ganha o direito de jogar em QUALQUER mini-tabuleiro disponível no jogo.

Estratégia: Pense não apenas onde você quer marcar, mas para onde você está enviando seu oponente!
`;
