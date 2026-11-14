// Histórico com filtros (data a data, status, base) e relatório em PDF (impressão A4 do navegador).
import { h, cabecalho, botao, titulo2, muted, banner, vazio, campo, chips, icone, ICONES, logo } from './ui.js';
import { ROTULO_STATUS, TODOS_STATUS } from './status.js';
import { podeGerarRelatorio, temCargo } from './acesso.js';
import { carregarLista, cartaoSolicitacao } from './telas.js';
import { filtrarLinhas, resumir, rotaDe, placaDe, realizouDe, dataBr } from './filtro.js';
import { MOTIVOS } from './config.js';
import * as api from './servicos.js';

const rotuloPeriodo = (f) => (f.de || f.ate ? `${f.de ? dataBr(f.de) : 'início'} a ${f.ate ? dataBr(f.ate) : 'hoje'}` : 'Todos os períodos');

// ---------------------------------------------------------------- histórico
export function telaSolicitacoes(ctx) {
  const p = ctx.perfil;
  const f = { ...ctx.filtros };
  let todas = [];
  const lista = h('div', { class: 'pilha' });
  const dados = h('div', { class: 'pilha' });

  const pdf = podeGerarRelatorio(p)
    ? h('button', { type: 'button', class: 'btn primary pequeno', 'aria-label': 'Gerar relatório em PDF', onclick: () => ctx.ir('#/relatorio') }, icone(ICONES.pdf, 18), 'Gerar PDF')
    : null;

  const opcoesBases = p.todasAsBases ? ctx.basesConhecidas() : p.bases.map((b) => ({ valor: b, rotulo: ctx.nomeBase(b) }));
  const de = campo('De', { tipo: 'date', valor: f.de ?? '' });
  const ate = campo('Até', { tipo: 'date', valor: f.ate ?? '' });
  const status = chips(TODOS_STATUS.map((s) => ({ valor: s, rotulo: ROTULO_STATUS[s] })), f.status ?? [], { multiplo: true, aoMudar: (v) => { f.status = v; aplicar(); } });
  const bases = opcoesBases.length > 1 && !temCargo(p, 'despachante')
    ? chips(opcoesBases, f.bases ?? [], { multiplo: true, aoMudar: (v) => { f.bases = v; aplicar(); } }) : null;
  de.input.addEventListener('change', () => { f.de = de.input.value || undefined; aplicar(); });
  ate.input.addEventListener('change', () => { f.ate = ate.input.value || undefined; aplicar(); });

  function aplicar() {
    ctx.definirFiltros({ de: f.de, ate: f.ate, status: f.status?.length ? f.status : undefined, bases: f.bases?.length ? f.bases : undefined });
    const r = filtrarLinhas(todas, ctx.filtros);
    const s = resumir(r);
    dados.replaceChildren(
      h('div', { class: 'secao' }, h('div', { class: 'h2' }, `${r.length} resultado${r.length === 1 ? '' : 's'}`),
        h('div', { class: 'muted' }, `${s.aprovados} aprovados · ${s.recusados} recusados`)),
      r.length ? h('div', { class: 'lista' }, ...r.map((x) => cartaoSolicitacao(ctx, x)))
        : vazio('Nenhuma solicitação', 'Não há registros para estes filtros.'));
  }

  const raiz = h('main', { class: 'tela' },
    cabecalho(temCargo(p, 'despachante') ? 'Meus pedidos' : 'Histórico', p.todasAsBases ? 'Todas as bases' : 'Bases autorizadas', pdf),
    h('div', { class: 'cartao' },
      h('div', { class: 'secao' }, h('div', { class: 'h2' }, 'Filtros'),
        h('button', { type: 'button', class: 'link', onclick: () => { ctx.definirFiltros({}); ctx.ir('#/solicitacoes'); } }, 'Limpar')),
      h('div', { class: 'dupla' }, de, ate),
      h('div', { class: 'pilha' }, h('div', { class: 'rotulo' }, 'Status'), status),
      bases ? h('div', { class: 'pilha' }, h('div', { class: 'rotulo' }, 'Base'), bases) : null),
    lista);
  carregarLista(ctx, {}, lista, {
    aoCarregar: (linhas) => { todas = linhas; lista.append(dados); aplicar(); },
  });
  return raiz;
}

// ---------------------------------------------------------------- relatório (impressão A4 / Salvar como PDF)
function grafico(titulo, mapa, rotulos = (k) => k) {
  const itens = Object.entries(mapa).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...itens.map(([, n]) => n));
  return h('div', {}, h('div', { class: 'h2' }, titulo),
    ...(itens.length ? itens.map(([k, n]) => h('div', { class: 'rel-barra' }, h('div', { class: 'n' }, rotulos(k)),
      h('div', { class: 'trilho' }, h('div', { style: `width:${Math.round((n / max) * 100)}%` })), h('div', { class: 'q' }, String(n))))
      : [h('div', { class: 'muted' }, 'Sem dados')]));
}

export function telaRelatorio(ctx) {
  const p = ctx.perfil;
  const corpo = h('div', { class: 'pilha' });
  const raiz = h('main', { class: 'tela' },
    h('div', { class: 'nao-imprimir pilha' },
      cabecalho('Relatório em PDF', 'Com os filtros do histórico'),
      h('div', { class: 'acoes' },
        botao('Voltar', { aoClicar: () => ctx.ir('#/solicitacoes') }),
        botao('Salvar PDF', { variante: 'primary', aoClicar: () => window.print() })),
      muted('Na janela que abrir, escolha "Salvar como PDF" (ou "Imprimir").')),
    corpo);
  carregarLista(ctx, {}, corpo, {
    aoCarregar: (linhas) => {
      const f = ctx.filtros;
      const r = filtrarLinhas(linhas, f).sort((a, b) => String(b.dataBackup).localeCompare(String(a.dataBackup)) || String(b.criadoEm).localeCompare(String(a.criadoEm)));
      const s = resumir(r);
      const baseTxt = f.bases?.length ? f.bases.map(ctx.nomeBase).join(', ') : p.todasAsBases ? 'Todas' : 'Minhas bases';
      const statusTxt = f.status?.length ? f.status.map((x) => ROTULO_STATUS[x]).join(', ') : 'Todos';
      const th = (t, c = '') => h('th', { class: c }, t);
      const td = (t, c = '') => h('td', { class: c }, t);
      const tabela = h('table', { class: 'rel-tabela' },
        h('thead', {}, h('tr', {}, th('DATA'), th('BASE'), th('ROTA · PLACA'), th('MOTIVO'), th('REALIZOU'), th('PAC./PAR.', 'dir'), th('STATUS'), th('DESC.'))),
        h('tbody', {}, ...r.map((x) => h('tr', {},
          td(dataBr(x.dataBackup)), td(ctx.nomeBase(x.xptId)), td(`${rotaDe(x)} · ${placaDe(x)}`), td(x.motivo),
          td(x.realizou ? `${realizouDe(x)} · ${x.realizou.placa ?? ''}` : '—'), td(`${x.qtdPacotes} / ${x.qtdParadas}`, 'dir'),
          td(ROTULO_STATUS[x.status], x.status === 'APROVADO' ? 'ap' : x.status === 'RECUSADO' ? 'rc' : ''),
          td(x.decisao?.descontoCooperado === 'SIM' ? 'Sim' : x.decisao?.descontoCooperado === 'NAO' ? 'Não' : '—')))));
      const chip = (k, v) => h('span', {}, `${k}: `, h('b', { style: 'font-weight:600' }, v));
      const kpi = (k, v, cor) => h('div', {}, h('div', { class: 'k' }, k), h('div', { class: 'v', style: cor ? `color:${cor}` : '' }, String(v)));
      corpo.replaceChildren(h('div', { class: 'rel' },
        h('div', { class: 'rel-topo' },
          h('div', { class: 'rel-marca' }, logo(40), h('div', {}, h('div', { class: 'n' }, 'COOPMETRO'), h('div', { class: 'muted' }, 'Relatório de solicitações de backup'))),
          h('div', { class: 'rel-gerado' }, `Gerado em ${new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`, h('br'), `por ${p.nome}`)),
        h('div', { class: 'rel-filtros' }, chip('Período', rotuloPeriodo(f)), chip('Base', baseTxt), chip('Status', statusTxt), chip('Registros', String(r.length))),
        h('div', { class: 'rel-totais' }, kpi('Total', s.total), kpi('Aprovados', s.aprovados, 'var(--ok)'), kpi('Recusados', s.recusados, 'var(--danger)'), kpi('Descontos', s.descontos)),
        h('div', { class: 'rel-graficos' }, grafico('Por base', s.porBase, (k) => ctx.nomeBase(k)), grafico('Por motivo', s.porMotivo)),
        h('div', {}, titulo2('Solicitações (da mais recente para a mais antiga)'),
          r.length ? h('div', { class: 'rel-rolagem' }, tabela) : banner('info', 'Nenhuma solicitação para estes filtros.')),
        h('div', { class: 'rel-assina' }, h('div', { style: 'flex:1' }, 'Coordenador geral: nome e assinatura'), h('div', { style: 'width:150px' }, 'Data')),
        h('div', { class: 'rel-rodape' }, 'COOPMETRO BACKUP · documento gerado automaticamente')));
    },
  });
  return raiz;
}
