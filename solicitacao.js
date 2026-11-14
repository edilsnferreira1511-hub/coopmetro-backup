// Nova solicitação (3 etapas), detalhes e decisão.
import {
  h, cabecalho, botao, cartao, titulo2, muted, banner, carregando, vazio, campo, fmt, badge, icone, ICONES, linhaValor, opcoes, chips,
} from './ui.js';
import { ROTULO_STATUS } from './status.js';
import { podeVer, podeDecidir, podeColocarEmAnalise, podeCancelar, podeExcluir } from './acesso.js';
import * as api from './servicos.js';
import { abrirLeitorQr } from './leitorqr.js';
import { VERSAO_APP, MOTIVOS } from './config.js';
import { hoje, rotaDe, placaDe, realizouDe, dataBr } from './filtro.js';

const limparRota = (t) => String(t ?? '').trim().replace(/^>+/, '').trim().toUpperCase();
const limparPlaca = (t) => String(t ?? '').trim().toUpperCase();

// ---------------------------------------------------------------- nova solicitação
function blocoQr({ titulo, valores, aoLer, aoDigitar, rotuloManual, dica, vazioTexto }) {
  const raiz = h('div', { class: 'pilha' });
  let digitando = false;
  const desenhar = () => {
    const corpo = h('div', { class: 'qr' });
    if (valores) {
      corpo.append(h('div', { class: 'qr-ok' }, icone(ICONES.ok, 18), 'Dados preenchidos'),
        h('div', { class: 'qr-valores' }, ...valores.map(([k, v]) => h('div', {}, h('div', { class: 'muted' }, k), h('div', { class: 'mono' }, v || '—')))));
    } else {
      corpo.append(muted(vazioTexto));
    }
    if (digitando) {
      const c = campo(rotuloManual, { placeholder: dica, maiusculas: true });
      corpo.append(c, h('div', { class: 'acoes' },
        botao('Usar', { variante: 'primary', aoClicar: () => { if (c.input.value.trim()) { aoDigitar(c.input.value); } } }),
        botao('Cancelar', { aoClicar: () => { digitando = false; desenhar(); } })));
    } else {
      corpo.append(h('div', { class: 'qr-links' },
        h('button', { type: 'button', class: 'link', onclick: aoLer }, valores ? 'Ler novamente' : 'Ler QR Code'),
        h('button', { type: 'button', class: 'link', style: 'color:var(--muted)', onclick: () => { digitando = true; desenhar(); } }, 'Digitar manualmente')));
    }
    raiz.replaceChildren(h('div', { class: 'rotulo' }, titulo), corpo);
  };
  desenhar();
  return raiz;
}

export function telaNova(ctx) {
  const p = ctx.perfil;
  const E = {
    etapa: 1,
    base: p.bases.length === 1 ? p.bases[0] : '',
    motivo: '', rota: null, placa: '', veiculo: null, pacotes: '', paradas: '',
    real: { tipo: 'ROTA', rota: null, espelhada: '', placa: '', veiculo: null },
  };
  const raiz = h('main', { class: 'tela com-rodape' });
  const svcDe = (r) => r?.svc || ctx.nomeBase(E.base);

  const guardarRota = (d) => ({ rota: limparRota(d.rota), svc: d.svc, containerId: d.containerId });
  const qrRota = (aoOk) => abrirLeitorQr({ esperado: 'rota', aoConfirmar: (d) => { aoOk(guardarRota(d)); desenhar(); } });
  const qrVeic = (aoOk) => abrirLeitorQr({ esperado: 'veiculo', aoConfirmar: (d) => { aoOk(d); desenhar(); } });

  function topo() {
    const voltar = () => { if (E.etapa > 1) { E.etapa -= 1; desenhar(); } else ctx.voltar(); };
    return h('div', { class: 'passos' },
      h('div', { class: 'passos-linha' },
        h('button', { type: 'button', class: 'icone-btn', 'aria-label': 'Voltar', onclick: voltar }, icone(ICONES.voltar)),
        h('div', { class: 't' }, 'Nova solicitação'), h('div', { class: 'muted' }, `Etapa ${E.etapa} de 3`)),
      h('div', { class: 'progresso' }, h('div', { style: `width:${Math.round((E.etapa / 3) * 100)}%` })));
  }

  const erro = h('div');
  const falha = (m) => { erro.replaceChildren(banner('error', m)); erro.scrollIntoView?.({ block: 'center' }); return false; };

  function etapa1() {
    const pacotes = campo('Pacotes do backup', { tipo: 'number', modo: 'numeric', valor: E.pacotes });
    const paradas = campo('Paradas do backup', { tipo: 'number', modo: 'numeric', valor: E.paradas });
    pacotes.input.addEventListener('input', () => { E.pacotes = pacotes.input.value; });
    paradas.input.addEventListener('input', () => { E.paradas = paradas.input.value; });
    return [
      p.bases.length > 1 ? h('div', { class: 'pilha' }, h('div', { class: 'rotulo' }, 'Base'),
        chips(p.bases.map((b) => ({ valor: b, rotulo: ctx.nomeBase(b) })), E.base ? [E.base] : [], { aoMudar: ([b]) => { E.base = b; } })) : null,
      p.bases.length === 0 ? banner('warning', 'Nenhuma base vinculada ao seu usuário.') : null,
      h('div', { class: 'pilha' }, h('div', { class: 'rotulo' }, 'Motivo da solicitação'),
        opcoes(MOTIVOS.map((m) => ({ valor: m, rotulo: m })), E.motivo, (v) => { E.motivo = v; })),
      blocoQr({
        titulo: 'Rota que precisa do backup', vazioTexto: 'Leia o QR Code da rota para preencher a rota e o SVC.',
        valores: E.rota ? [['Rota', E.rota.rota], ['SVC', svcDe(E.rota)]] : null,
        aoLer: () => qrRota((r) => { E.rota = r; }),
        rotuloManual: 'ID da rota', dica: 'Ex.: B11_AM1', aoDigitar: (t) => { E.rota = { rota: limparRota(t), svc: '', manual: true }; desenhar(); },
      }),
      blocoQr({
        titulo: 'Veículo que precisa do backup', vazioTexto: 'Leia o QR Code do motorista para preencher a placa.',
        valores: E.placa ? [['Placa', E.placa]] : null,
        aoLer: () => qrVeic((v) => { E.veiculo = v; E.placa = limparPlaca(v.placa); }),
        rotuloManual: 'Placa', dica: 'Ex.: QRS4F56', aoDigitar: (t) => { E.veiculo = null; E.placa = limparPlaca(t); desenhar(); },
      }),
      h('div', { class: 'dupla' }, pacotes, paradas),
      h('div', { class: 'auto' }, `Preenchido automaticamente: data ${dataBr(hoje())} · SVC ${E.rota ? svcDe(E.rota) || ctx.nomeBase(E.base) : ctx.nomeBase(E.base) || '—'} · solicitante ${p.nome}`),
    ];
  }
  function validar1() {
    if (!E.base) return falha('Escolha a base solicitante.');
    if (!E.motivo) return falha('Escolha o motivo da solicitação.');
    if (!E.rota?.rota) return falha('Informe a rota que precisa do backup (QR Code ou digitando).');
    if (!E.placa) return falha('Informe a placa do veículo que precisa do backup.');
    const np = Number(E.pacotes), nd = Number(E.paradas);
    if (E.pacotes === '' || E.paradas === '' || !Number.isInteger(np) || np < 0 || !Number.isInteger(nd) || nd < 0) return falha('Pacotes e paradas devem ser números inteiros.');
    return true;
  }

  function etapa2() {
    const R = E.real;
    const espelhada = campo('ID da rota espelhada', { placeholder: 'Ex.: B11_AM1', valor: R.espelhada, maiusculas: true });
    espelhada.input.addEventListener('input', () => { R.espelhada = espelhada.input.value; });
    return [
      h('div', { class: 'pilha' }, h('div', { class: 'rotulo' }, 'O backup foi feito por uma rota ou espelhado?'),
        opcoes([{ valor: 'ROTA', rotulo: 'Rota' }, { valor: 'ESPELHADA', rotulo: 'Espelhada' }], R.tipo, (v) => { R.tipo = v; desenhar(); })),
      R.tipo === 'ROTA'
        ? blocoQr({
          titulo: 'Rota que realizou o backup', vazioTexto: 'Leia o QR Code da rota para preencher o nome dela.',
          valores: R.rota ? [['Rota', R.rota.rota]] : null,
          aoLer: () => qrRota((r) => { R.rota = r; }),
          rotuloManual: 'ID da rota', dica: 'Ex.: B07_PM2', aoDigitar: (t) => { R.rota = { rota: limparRota(t) }; desenhar(); },
        })
        : espelhada,
      blocoQr({
        titulo: 'Motorista que realizou o backup', vazioTexto: 'Leia o QR Code do segundo motorista para preencher a placa.',
        valores: R.placa ? [['Placa', R.placa]] : null,
        aoLer: () => qrVeic((v) => { R.veiculo = v; R.placa = limparPlaca(v.placa); }),
        rotuloManual: 'Placa', dica: 'Ex.: ABC1D23', aoDigitar: (t) => { R.veiculo = null; R.placa = limparPlaca(t); desenhar(); },
      }),
    ];
  }
  function validar2() {
    const R = E.real;
    if (R.tipo === 'ROTA' && !R.rota?.rota) return falha('Informe a rota que realizou o backup (QR Code ou digitando).');
    if (R.tipo === 'ESPELHADA' && !limparRota(R.espelhada)) return falha('Informe o ID da rota espelhada.');
    if (!R.placa) return falha('Informe a placa de quem realizou o backup.');
    return true;
  }

  const realizouRota = () => (E.real.tipo === 'ROTA' ? E.real.rota?.rota : limparRota(E.real.espelhada));
  function etapa3() {
    const bloco = (titulo, etapa, linhas) => h('div', { class: 'cartao' },
      h('div', { class: 'secao' }, h('div', { class: 'h2' }, titulo),
        etapa ? h('button', { type: 'button', class: 'link', onclick: () => { E.etapa = etapa; desenhar(); } }, 'Editar') : null), ...linhas);
    return [
      h('div', { class: 'h2' }, 'Confira antes de enviar'),
      bloco('Pedido', 1, [linhaValor('Data do backup', dataBr(hoje())), linhaValor('SVC', svcDe(E.rota)), linhaValor('Base', ctx.nomeBase(E.base)),
        linhaValor('Solicitante', p.nome), linhaValor('Motivo', E.motivo)]),
      bloco('Precisa do backup', 1, [linhaValor('Rota · placa', `${E.rota.rota} · ${E.placa}`, { mono: true }),
        linhaValor('Pacotes · paradas', `${Number(E.pacotes)} · ${Number(E.paradas)}`, { mono: true })]),
      bloco('Realizou o backup', 2, [linhaValor('Tipo', E.real.tipo === 'ROTA' ? 'Rota' : 'Espelhada'),
        linhaValor('Rota · placa', `${realizouRota()} · ${E.real.placa}`, { mono: true })]),
      h('div', { class: 'muted' }, 'Ao enviar, quem decide é avisado no Telegram (se tiver vinculado).'),
    ];
  }

  async function enviar() {
    erro.replaceChildren();
    const { tipo, ...veiculo } = E.veiculo ?? {};
    const dados = {
      dataBackup: hoje(), svc: svcDe(E.rota), xptId: E.base, rotaId: E.rota.rota, rotaNome: E.rota.rota,
      placa: E.placa, qtdPacotes: Number(E.pacotes), qtdParadas: Number(E.paradas), motivo: E.motivo,
      realizou: { tipo: E.real.tipo, rota: realizouRota(), placa: E.real.placa },
    };
    if (E.rota.containerId) dados.containerId = E.rota.containerId;
    if (E.veiculo) dados.veiculo = veiculo;
    try {
      const id = await api.criarSolicitacao(p, dados);
      ctx.ir(`#/solicitacao/${encodeURIComponent(id)}`);
    } catch (e) {
      const recusado = String(e.message).includes('servidor recusou');
      falha((e.message || 'Não foi possível enviar a solicitação.')
        + (recusado ? ` [Detalhe técnico — versão ${VERSAO_APP}; cargo: ${p.cargoOriginal}; base escolhida: ${E.base}; bases do usuário: ${p.bases.join(', ') || 'nenhuma'}; uid: ${p.uid}]` : ''));
    }
  }

  function desenhar() {
    erro.replaceChildren();
    const corpo = E.etapa === 1 ? etapa1() : E.etapa === 2 ? etapa2() : etapa3();
    const proximo = E.etapa < 3
      ? botao('Continuar', { variante: 'primary', aoClicar: () => { if ((E.etapa === 1 ? validar1() : validar2())) { E.etapa += 1; desenhar(); window.scrollTo(0, 0); } } })
      : botao('Enviar solicitação', { variante: 'primary', aoClicar: enviar });
    raiz.replaceChildren(topo(), ...corpo, erro,
      h('div', { class: 'rodape-fixo' },
        E.etapa > 1 ? botao('Voltar', { aoClicar: () => { E.etapa -= 1; desenhar(); } }) : null, proximo));
    const v = raiz.querySelector('.rodape-fixo .btn:first-child');
    if (v && E.etapa > 1) v.classList.add('voltar');
  }
  desenhar();
  return raiz;
}

// ---------------------------------------------------------------- detalhes
export function telaDetalhes(ctx, id) {
  const raiz = h('main', { class: 'tela' }, carregando());
  const carregar = async () => {
    let r;
    try { r = await api.obterSolicitacao(id); } catch (e) {
      return raiz.replaceChildren(cabecalho('Solicitação'), banner('error', e.message || 'Falha ao carregar.'));
    }
    if (!r || !podeVer(ctx.perfil, r)) {
      return raiz.replaceChildren(cabecalho('Solicitação'), vazio('Solicitação não encontrada', 'Ela não existe ou você não tem acesso.'),
        botao('Voltar', { aoClicar: () => ctx.ir('#/solicitacoes') }));
    }
    const p = ctx.perfil;
    const erro = h('div');
    const agir = (fn) => async () => { erro.replaceChildren(); try { await fn(); await carregar(); } catch (e) { erro.append(banner('error', e.message)); } };
    const dec = r.decisao;
    const real = r.realizou;
    const confirmacao = h('div');
    const abrirExclusao = () => {
      const motivo = campo('Motivo da exclusão', { multilinha: true, placeholder: 'Obrigatório. Fica registrado na planilha.' });
      const msg = h('div');
      confirmacao.replaceChildren(h('div', { class: 'confirma' },
        h('div', { class: 'h2' }, `Excluir ${rotaDe(r)} de ${dataBr(r.dataBackup)}?`),
        muted('O pedido sai do sistema. A planilha mantém a linha, marcada como Excluído.'),
        r.status === 'APROVADO' ? banner('warning', 'Este pedido já foi aprovado e pode ter virado desconto.') : null,
        motivo, msg,
        h('div', { class: 'acoes' },
          botao('Confirmar exclusão', { variante: 'danger', aoClicar: async () => {
            msg.replaceChildren();
            try { await api.excluirSolicitacao(p, r, motivo.input.value); ctx.ir('#/solicitacoes'); } catch (e) { msg.append(banner('error', e.message)); }
          } }),
          botao('Cancelar', { aoClicar: () => confirmacao.replaceChildren() }))));
    };
    raiz.replaceChildren(
      cabecalho(`${rotaDe(r)}`, `${ctx.nomeBase(r.xptId)} · ${dataBr(r.dataBackup)}`, badge(r.status)),
      r.excluido ? banner('error', `Excluída por ${r.excluido.porNome} em ${fmt(r.excluido.em)}. Motivo: ${r.excluido.motivo}`) : null,
      erro,
      cartao(titulo2('Pedido'), linhaValor('Solicitante', r.solicitante.nome), linhaValor('Motivo', r.motivo), linhaValor('SVC', r.svc),
        linhaValor('Data do backup', dataBr(r.dataBackup))),
      cartao(titulo2('Precisa do backup'), linhaValor('Rota', rotaDe(r), { mono: true }), linhaValor('Placa', placaDe(r), { mono: true }),
        linhaValor('Pacotes', r.qtdPacotes), linhaValor('Paradas', r.qtdParadas)),
      real ? cartao(titulo2('Realizou o backup'), linhaValor('Tipo', real.tipo === 'ESPELHADA' ? 'Espelhada' : 'Rota'),
        linhaValor('Rota', realizouDe(r), { mono: true }), linhaValor('Placa', real.placa, { mono: true })) : null,
      dec ? cartao(titulo2(`Decisão: ${ROTULO_STATUS[dec.resultado]}`), linhaValor('Autorização', dec.resultado === 'APROVADO' ? 'Sim' : 'Não'),
        linhaValor('Justificativa', dec.justificativa),
        linhaValor('Descontar do cooperado', dec.descontoCooperado === 'SIM' ? 'Sim' : dec.descontoCooperado === 'NAO' ? 'Não' : dec.descontoCooperado),
        muted(`${dec.porNome} · ${fmt(dec.em)}`)) : null,
      cartao(titulo2('Histórico'), ...r.historico.map((e) => h('div', { class: 'item' }, h('div', {}, `${ROTULO_STATUS[e.status]} · ${e.porNome}`),
        muted(`${fmt(e.em)}${e.observacao ? ` — ${e.observacao}` : ''}`)))),
      podeColocarEmAnalise(p, r) ? botao('Colocar em análise', { aoClicar: agir(() => api.colocarEmAnalise(p, r)) }) : null,
      podeDecidir(p, r) ? botao('Analisar e decidir', { variante: 'primary', aoClicar: () => ctx.ir(`#/analise/${encodeURIComponent(r.id)}`) }) : null,
      podeCancelar(p, r) ? botao('Cancelar solicitação', { variante: 'danger', aoClicar: agir(() => api.cancelar(p, r)) }) : null,
      podeExcluir(p, r) ? botao('Excluir solicitação', { variante: 'danger', aoClicar: abrirExclusao }) : null,
      confirmacao);
  };
  carregar();
  return raiz;
}

// ---------------------------------------------------------------- decisão do coordenador geral
export function telaAnalise(ctx, id) {
  const raiz = h('main', { class: 'tela com-rodape' }, carregando());
  api.obterSolicitacao(id).then((r) => {
    const p = ctx.perfil;
    if (!r || !podeDecidir(p, r)) {
      return raiz.replaceChildren(cabecalho('Decisão'), vazio('Sem permissão para decidir',
        'Apenas o coordenador geral decide, nas bases autorizadas, e nunca sobre o próprio pedido.'),
      botao('Voltar', { aoClicar: () => ctx.voltar() }));
    }
    let resultado = null; let desconto = null;
    const just = campo('Justificativa', { multilinha: true, placeholder: 'Explique a decisão. Quem pediu vai receber este texto.' });
    const erro = h('div');
    const autor = opcoes([{ valor: 'APROVADO', rotulo: 'Sim, autorizar' }, { valor: 'RECUSADO', rotulo: 'Não autorizar' }], '', (v) => { resultado = v; });
    const desc = opcoes([{ valor: 'SIM', rotulo: 'Sim' }, { valor: 'NAO', rotulo: 'Não' }], '', (v) => { desconto = v; });
    raiz.replaceChildren(
      cabecalho(rotaDe(r), `${ctx.nomeBase(r.xptId)} · ${dataBr(r.dataBackup)}`, badge(r.status)),
      cartao(linhaValor('Solicitante', r.solicitante.nome), linhaValor('Motivo', r.motivo),
        linhaValor('Precisou', `${rotaDe(r)} · ${placaDe(r)}`, { mono: true }), linhaValor('Pacotes · paradas', `${r.qtdPacotes} · ${r.qtdParadas}`, { mono: true }),
        linhaValor('Realizou', r.realizou ? `${realizouDe(r)} · ${r.realizou.placa}` : '—', { mono: true })),
      h('div', { class: 'pilha' }, h('div', { class: 'rotulo' }, 'Autorização'), autor),
      just,
      h('div', { class: 'pilha' }, h('div', { class: 'rotulo' }, 'Descontar do cooperado?'), desc),
      erro,
      h('div', { class: 'rodape-fixo' },
        botao('Voltar', { aoClicar: () => ctx.voltar() }),
        botao('Registrar decisão', {
          variante: 'primary',
          aoClicar: async () => {
            erro.replaceChildren();
            const falha = (m) => erro.append(banner('error', m));
            if (!resultado) return falha('Escolha se autoriza ou não.');
            if (!just.input.value.trim()) return falha('A justificativa é obrigatória.');
            if (!desconto) return falha('Responda se deve descontar do cooperado (sim ou não).');
            try {
              await api.decidir(p, r, { resultado, justificativa: just.input.value.trim(), descontoCooperado: desconto });
              ctx.ir(`#/solicitacao/${encodeURIComponent(r.id)}`);
            } catch (e) { falha(e.message); }
          },
        })));
    raiz.querySelector('.rodape-fixo .btn')?.classList.add('voltar');
  }).catch((e) => raiz.replaceChildren(cabecalho('Decisão'), banner('error', e.message)));
  return raiz;
}
