// Filtros e totais do histórico e do relatório (funções puras, testáveis).
import { MOTIVOS } from './config.js';

export const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** f: { de, ate (AAAA-MM-DD, sobre a data do backup), status: [], bases: [] }. Excluídos nunca entram. */
export function filtrarLinhas(linhas, f = {}) {
  let r = linhas.filter((x) => !x.excluido);
  if (f.status?.length) r = r.filter((x) => f.status.includes(x.status));
  if (f.bases?.length) r = r.filter((x) => f.bases.includes(x.xptId));
  if (f.de) r = r.filter((x) => String(x.dataBackup) >= f.de);
  if (f.ate) r = r.filter((x) => String(x.dataBackup) <= f.ate);
  return r;
}

const contar = (lista, chave) => lista.reduce((m, x) => { const k = chave(x); m[k] = (m[k] ?? 0) + 1; return m; }, {});

export function resumir(linhas) {
  const status = contar(linhas, (x) => x.status);
  return {
    total: linhas.length,
    status,
    aprovados: status.APROVADO ?? 0,
    recusados: status.RECUSADO ?? 0,
    abertos: (status.PENDENTE ?? 0) + (status.EM_ANALISE ?? 0),
    descontos: linhas.filter((x) => x.decisao?.descontoCooperado === 'SIM').length,
    porBase: contar(linhas, (x) => x.xptId),
    porMotivo: contar(linhas, (x) => (MOTIVOS.includes(x.motivo) ? x.motivo : 'Outros')),
  };
}

export const rotaDe = (r) => String(r.rotaNome ?? r.rotaId ?? '').replace(/^>+/, '') || '—';
export const placaDe = (r) => r.placa ?? r.veiculo?.placa ?? '—';
export function realizouDe(r) {
  const x = r.realizou;
  if (!x) return '—';
  const rota = String(x.rota ?? '').replace(/^>+/, '');
  return x.tipo === 'ESPELHADA' ? `Espelhada ${rota}` : rota || '—';
}
export const dataBr = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(String(iso)) ? iso.split('-').reverse().join('/') : String(iso ?? '—'));
export const dataCurta = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(String(iso)) ? iso.split('-').reverse().slice(0, 2).join('/') : String(iso ?? '—'));
