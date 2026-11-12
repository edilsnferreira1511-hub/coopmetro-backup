// Código de vínculo do Telegram. Módulo puro (sem Firebase) para poder ser testado.
// 6 caracteres sem letras/números que se confundem (0/O, 1/I). Combina com as regras: ^[A-Z0-9]{6}$.
export const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 símbolos: 256 % 32 == 0, sem viés
export const VALIDADE_CODIGO_MIN = 15;

/** `bytes(n)` devolve n bytes aleatórios (no navegador: crypto.getRandomValues). */
export function gerarCodigo(bytes) {
  const b = bytes(6);
  return Array.from(b, (x) => ALFABETO_CODIGO[x % ALFABETO_CODIGO.length]).join('');
}
