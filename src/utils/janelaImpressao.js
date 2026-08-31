/**
 * Abre uma janela nova com o HTML dado e dispara a impressão.
 *
 * Sem a checagem de `win`, um bloqueador de popup faz `win.document` estourar
 * TypeError e o botão de relatório simplesmente não faz nada — sem feedback
 * nenhum para o professor.
 *
 * @returns {boolean} false se o popup foi bloqueado.
 */
export function abrirJanelaImpressao(html, { delay = 400, autoPrint = true } = {}) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Permita popups nesta página para gerar o relatório.');
    return false;
  }
  win.document.write(html);
  win.document.close();
  if (autoPrint) {
    setTimeout(() => { win.focus(); win.print(); }, delay);
  }
  return true;
}
