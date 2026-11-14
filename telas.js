import {
  h, cabecalho, botao, cartao, titulo2, muted, item, banner, carregando, vazio, campo, fmt, badge, icone, ICONES,
} from './ui.js';
import { ROTULO_STATUS } from './status.js';
import { temCargo, CARGOS_CRIAM, CARGOS_REVISAM, podeGerirAcessos } from './acesso.js';
import * as api from './servicos.js';
import { configPendente, VERSAO_APP, BOT_TELEGRAM_USUARIO } from './config.js';
import { VALIDADE_CODIGO_MIN } from './telegram.js';
import { rotaDe, dataCurta } from './filtro.js';

export const ROTULO_CARGO = {
  despachante: 'Despacho', coordenador_base: 'Coordenador de base', supervisor: 'Supervisor', coordenador_geral: 'Coordenação geral',
  administrativo: 'Administrador', admin_sistema: 'Administrador do sistema',
};
const algum = (p, lista) => lista.some((c) => temCargo(p, c));
const dataLonga = () => {
  const t = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

// ---------------------------------------------------------------- login
export function telaLogin(ctx) {
  const email = campo('E-mail de acesso', { tipo: 'email', autocomplete: 'username', modo: 'email' });
  const senha = campo('Senha', { tipo: 'password', autocomplete: 'current-password', aoEnter: () => entrar.click() });
  const erro = h('div');
  const entrar = botao('Entrar', {
    variante: 'primary',
    aoClicar: async () => {
      erro.replaceChildren();
      if (!email.input.value.trim() || !senha.input.value) return erro.append(banner('error', 'Informe e-mail e senha.'));
      try { await api.login(email.input.value, senha.input.value); } catch (e) { erro.append(banner('error', api.mensagemErroAuth(e))); }
    },
  });
  const falta = configPendente();
  return h('main', { class: 'tela login' },
    h('div', { class: 'login-marca' }, h('img', { src: 'icone-192.png', alt: 'COOPMETRO', width: 96, height: 96, class: 'logo grande' }),
      h('h1', { class: 'h1' }, 'COOPMETRO BACKUP'), muted('Use o mesmo acesso do COOPMETRO XPT')),
    falta.length ? banner('warning', `Configuração pendente em config.js: ${falta.join('; ')}.`) : null,
    email, senha, erro, entrar);
}

export function telaSemAcesso(ctx, motivo) {
  return h('main', { class: 'tela' }, h('h1', { class: 'h1' }, 'Sem acesso'), banner('error', motivo), botao('Sair', { aoClicar: api.sair }));
}

// ---------------------------------------------------------------- peças reutilizáveis
const GALPAO = '<svg class="galpao" viewBox="0 0 220 120" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 118V50L110 14l100 36v68"/><path d="M10 118h200"/><rect x="34" y="60" width="152" height="58"/><path d="M34 72h152M34 84h152M34 96h152M34 108h152" stroke-opacity=".6"/><path d="M110 60v58" stroke-opacity=".8"/></g></svg>';
function galpao() {
  const t = document.createElement('template');
  t.innerHTML = GALPAO; // markup fixo do código
  return t.content.firstElementChild;
}

/** Cabeçalho da tela inicial: marca, base, data, nome e cargo, com o galpão em traço fino ao fundo. */
function hero(ctx) {
  const p = ctx.perfil;
  const base = p.todasAsBases ? 'Todas as bases' : p.bases.map(ctx.nomeBase).join(' · ') || 'Sem base';
  return h('header', { class: 'hero' }, galpao(),
    h('div', { class: 'hero-linha' },
      h('div', { class: 'marca' }, h('img', { src: 'icone-192.png', alt: '', width: 28, height: 28, class: 'logo' }), h('div', {}, 'COOPMETRO ', h('span', {}, 'Backup'))),
      h('div', { class: 'pilula' }, base)),
    h('div', { class: 'hero-texto' }, h('div', { class: 'muted' }, dataLonga()),
      h('div', { class: 'nome' }, `Olá, ${p.nome.split(' ')[0]}`), h('div', { class: 'muted' }, ROTULO_CARGO[p.cargos[0]] ?? '')));
}

export function cartaoSolicitacao(ctx, r) {
  const el = h('button', { class: 'item-lista', type: 'button' },
    h('div', {}, h('div', { class: 't' }, rotaDe(r), h('span', {}, ` · ${ctx.nomeBase(r.xptId)}`)),
      h('div', { class: 's' }, `${r.motivo} · ${r.qtdPacotes} pacotes · ${dataCurta(r.dataBackup)} · ${r.solicitante.nome}`)),
    badge(r.status));
  el.addEventListener('click', () => ctx.ir(`#/solicitacao/${encodeURIComponent(r.id)}`));
  return el;
}

export async function carregarLista(ctx, filtros, alvo, { aoCarregar } = {}) {
  alvo.replaceChildren(carregando());
  try {
    const linhas = await api.listarSolicitacoes(ctx.perfil, filtros);
    alvo.replaceChildren();
    aoCarregar?.(linhas);
    return linhas;
  } catch (e) {
    alvo.replaceChildren(banner('error', e.message || 'Não foi possível carregar as solicitações.'),
      botao('Tentar de novo', { aoClicar: () => carregarLista(ctx, filtros, alvo, { aoCarregar }) }));
    return null;
  }
}

const ORDEM_STATUS = ['PENDENTE', 'EM_ANALISE', 'APROVADO', 'RECUSADO'];
function contadores(ctx, linhas) {
  const raiz = h('div', { class: 'contadores' });
  ORDEM_STATUS.forEach((s) => {
    const b = h('button', { type: 'button', class: 'contador', 'aria-label': ROTULO_STATUS[s] },
      h('div', { class: 'numero' }, String(linhas.filter((r) => r.status === s).length)),
      h('div', { class: 'rot' }, h('i', { class: `ponto p-${s}` }), ROTULO_STATUS[s]));
    b.addEventListener('click', () => { ctx.definirFiltros({ status: [s] }); ctx.ir('#/solicitacoes'); });
    raiz.append(b);
  });
  return raiz;
}

const emAberto = (r) => r.status === 'PENDENTE' || r.status === 'EM_ANALISE';
const maisAntigoPrimeiro = (a, b) => String(a.criadoEm).localeCompare(String(b.criadoEm));

// ---------------------------------------------------------------- início (por cargo)
export function telaInicio(ctx) {
  const p = ctx.perfil;
  const cria = algum(p, CARGOS_CRIAM);
  const geral = temCargo(p, 'coordenador_geral');
  const revisa = algum(p, CARGOS_REVISAM);
  const global = p.todasAsBases === true;
  const caixa = h('div', { class: 'pilha' });
  const raiz = h('main', { class: 'tela' }, hero(ctx),
    cria && p.bases.length === 0 ? banner('warning', 'Seu usuário não tem base vinculada. Fale com o administrador.') : null,
    cria ? h('button', { type: 'button', class: 'acao-grande', onclick: () => ctx.ir('#/nova') }, h('span', {}, 'Nova solicitação de backup'), icone(ICONES.mais, 20)) : null,
    caixa);
  carregarLista(ctx, {}, caixa, {
    aoCarregar: (linhas) => {
      const abertos = linhas.filter(emAberto).sort(maisAntigoPrimeiro);
      if (geral) {
        const nBases = new Set(abertos.map((r) => r.xptId)).size;
        const d = h('button', { type: 'button', class: 'destaque', onclick: () => ctx.ir('#/painel') },
          h('div', {}, h('div', { class: 'pequeno' }, 'Aguardando sua decisão'),
            h('div', { class: 'grande' }, abertos.length ? `${abertos.length} solicitaç${abertos.length === 1 ? 'ão' : 'ões'} em ${nBases} base${nBases === 1 ? '' : 's'}` : 'Nada aguardando')),
          h('div', { class: 'numero' }, String(abertos.length)));
        caixa.append(d);
      }
      caixa.append(contadores(ctx, linhas));
      if (global) {
        const bases = [...new Set(linhas.map((r) => r.xptId))].sort();
        if (bases.length) {
          caixa.append(h('div', { class: 'pilha' }, h('div', { class: 'h2' }, 'Por base'),
            h('div', { class: 'lista' }, ...bases.map((b) => {
              const deB = linhas.filter((r) => r.xptId === b);
              const n = deB.filter(emAberto).length;
              return h('div', { class: 'barra-base' }, h('span', {}, ctx.nomeBase(b)),
                h('span', { class: 'muted' }, `${deB.length} no total`, n ? ` · ${n} em aberto` : ' · em dia'));
            }))));
        }
      }
      const lista = revisa ? abertos.slice(0, 4) : linhas.slice(0, 4);
      caixa.append(h('div', { class: 'pilha' },
        h('div', { class: 'secao' }, h('div', { class: 'h2' }, geral ? 'Fila de decisão' : revisa ? 'Pendências' : 'Solicitações recentes'),
          h('button', { type: 'button', class: 'link', onclick: () => ctx.ir(revisa ? '#/painel' : '#/solicitacoes') }, 'Ver todas')),
        lista.length ? h('div', { class: 'lista' }, ...lista.map((r) => cartaoSolicitacao(ctx, r)))
          : cartao(muted(revisa ? 'Nada pendente.' : 'Nenhuma solicitação ainda.'))));
    },
  });
  return raiz;
}

// ---------------------------------------------------------------- pendências (supervisor) / decidir (coord. geral)
export function telaPainel(ctx) {
  const geral = temCargo(ctx.perfil, 'coordenador_geral');
  const caixa = h('div', { class: 'pilha' });
  const raiz = h('main', { class: 'tela' },
    cabecalho(geral ? 'Decidir' : 'Pendências', geral ? 'Pedidos aguardando decisão, dos mais antigos' : 'Pedidos das suas bases aguardando andamento'), caixa);
  carregarLista(ctx, {}, caixa, {
    aoCarregar: (linhas) => {
      const abertos = linhas.filter(emAberto).sort(maisAntigoPrimeiro);
      if (!abertos.length) return caixa.append(vazio('Nada pendente', 'Quando entrar um pedido novo ele aparece aqui.'));
      caixa.append(muted(`${abertos.length} em aberto`), h('div', { class: 'lista' }, ...abertos.map((r) => cartaoSolicitacao(ctx, r))));
    },
  });
  return raiz;
}

// ---------------------------------------------------------------- avisos (derivados do histórico)
export function telaAvisos(ctx) {
  const p = ctx.perfil;
  const caixa = h('div', { class: 'pilha' });
  const raiz = h('main', { class: 'tela' }, cabecalho('Avisos', 'Atualizações dos pedidos'), caixa);
  carregarLista(ctx, {}, caixa, {
    aoCarregar: (linhas) => {
      const revisor = algum(p, CARGOS_REVISAM);
      const avisos = linhas.flatMap((r) => {
        const ult = r.historico[r.historico.length - 1];
        if (!ult) return [];
        if (revisor && emAberto(r)) return [{ id: r.id, em: ult.em, texto: `${ctx.nomeBase(r.xptId)} · ${rotaDe(r)}: aguardando decisão (${ROTULO_STATUS[r.status]})` }];
        if (!revisor && r.solicitante.uid === p.uid && ult.porUid !== p.uid) return [{ id: r.id, em: ult.em, texto: `Sua solicitação de ${dataCurta(r.dataBackup)} (${rotaDe(r)}) foi ${ROTULO_STATUS[r.status].toLowerCase()}` }];
        return [];
      }).sort((a, b) => String(b.em).localeCompare(String(a.em)));
      if (!avisos.length) return caixa.append(vazio('Sem avisos', 'Nada novo por enquanto.'));
      caixa.append(h('div', { class: 'lista' }, ...avisos.map((a) => {
        const el = h('button', { class: 'item-lista', type: 'button' }, h('div', {}, h('div', { class: 't' }, a.texto), h('div', { class: 's' }, fmt(a.em))));
        el.addEventListener('click', () => ctx.ir(`#/solicitacao/${encodeURIComponent(a.id)}`));
        return el;
      })));
    },
  });
  return raiz;
}

// ---------------------------------------------------------------- telegram
// Vincula o Telegram da pessoa para receber avisos (coord. geral, supervisor e coord. de base: pedido novo; quem pediu: decisão).
const CARGOS_TELEGRAM = ['despachante', 'coordenador_base', 'supervisor', 'coordenador_geral'];
function cartaoTelegram(ctx) {
  const p = ctx.perfil;
  if (!algum(p, CARGOS_TELEGRAM)) return null;
  const alvo = h('div', { class: 'coluna' }, carregando('Verificando…'));
  const caixa = cartao(titulo2('Avisos no Telegram'), alvo);
  let relogio = null;
  const parar = () => { if (relogio) { clearInterval(relogio); relogio = null; } };
  const textoAviso = () => (temCargo(p, 'coordenador_geral') ? 'Você recebe um aviso a cada pedido novo.'
    : temCargo(p, 'supervisor') ? 'Você recebe um aviso a cada pedido novo das suas bases.'
      : temCargo(p, 'coordenador_base') ? 'Você recebe os pedidos novos da sua base e o resultado dos pedidos que você fez.'
        : 'Você recebe um aviso quando seus pedidos forem aprovados ou recusados.');

  const mostrarVinculado = () => {
    parar();
    alvo.replaceChildren(banner('success', 'Telegram vinculado. Os avisos chegam por lá.'), muted(textoAviso()),
      botao('Desvincular', { aoClicar: async () => {
        try { await api.desvincularTelegram(p); mostrarInicial(); } catch (e) { alvo.prepend(banner('error', e.message)); }
      } }));
  };
  const mostrarInicial = () => {
    parar();
    alvo.replaceChildren(muted('Vincule o seu Telegram para receber avisos de pedidos. Leva menos de 1 minuto.'),
      botao('Vincular Telegram', { variante: 'primary', aoClicar: gerar }));
  };
  const gerar = async () => {
    try {
      const codigo = await api.gerarCodigoTelegram(p);
      const inicio = Date.now();
      const status = h('div', { class: 'muted' }, 'Aguardando você mandar o código ao robô…');
      alvo.replaceChildren(
        muted('1. Abra o robô do COOPMETRO no Telegram e aperte Iniciar.'),
        muted('2. Mande este código para o robô:'),
        h('div', { class: 'codigo-tg', 'aria-label': 'Código de vínculo' }, codigo),
        BOT_TELEGRAM_USUARIO ? h('a', { class: 'btn primary', href: `https://t.me/${BOT_TELEGRAM_USUARIO}?start=${codigo}`, target: '_blank', rel: 'noopener' }, 'Abrir o robô no Telegram') : null,
        muted(`3. Em até 1 minuto esta tela mostra "vinculado". O código vale ${VALIDADE_CODIGO_MIN} minutos.`),
        status,
        botao('Cancelar', { aoClicar: () => mostrarInicial() }));
      parar();
      relogio = setInterval(async () => {
        if (!alvo.isConnected) return parar();
        if (Date.now() - inicio > VALIDADE_CODIGO_MIN * 60000) { mostrarInicial(); alvo.prepend(banner('warning', 'O código venceu. Gere um novo.')); return; }
        try { if (await api.vinculoTelegram(p)) mostrarVinculado(); } catch { /* tenta de novo no próximo ciclo */ }
      }, 8000);
    } catch (e) { alvo.prepend(banner('error', e.message)); }
  };

  api.vinculoTelegram(p).then((v) => (v ? mostrarVinculado() : mostrarInicial()))
    .catch((e) => alvo.replaceChildren(banner('error', e.message || 'Não foi possível verificar o vínculo.')));
  return caixa;
}

// ---------------------------------------------------------------- perfil
export function telaPerfil(ctx) {
  const p = ctx.perfil;
  return h('main', { class: 'tela' },
    cabecalho(p.nome, p.email),
    cartao(titulo2('Acesso'), item('Cargo', p.cargos.map((c) => ROTULO_CARGO[c]).join(', ')),
      item('Cargo no XPT', p.cargoOriginal), item('Bases vinculadas', p.todasAsBases ? 'Todas (pelo cargo)' : p.bases.map(ctx.nomeBase).join(', ') || 'Nenhuma'),
      muted('Cargo e base vêm do cadastro do sistema e não podem ser alterados aqui.')),
    podeGerirAcessos(p) ? banner('info', 'Você é administrador do sistema: consulta tudo, gera PDF e pode excluir pedidos.') : null,
    cartaoTelegram(ctx),
    cartao(titulo2('Sistema'), item('Versão do app', VERSAO_APP)),
    botao('Sair', { variante: 'danger', aoClicar: api.sair }));
}
