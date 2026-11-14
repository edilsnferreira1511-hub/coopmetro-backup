// Pequenos componentes de interface (sem framework). Todo texto entra como TEXTO, nunca como HTML.
import { ROTULO_STATUS } from './status.js';

export function h(tag, props = {}, ...filhos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  anexar(el, filhos);
  return el;
}

function anexar(el, filhos) {
  for (const f of filhos.flat(Infinity)) {
    if (f == null || f === false) continue;
    el.append(f.nodeType ? f : document.createTextNode(String(f)));
  }
}

/** Ícone SVG de traço. O `markup` é sempre texto fixo do código, nunca dado do usuário. */
export function icone(markup, tam = 22) {
  const t = document.createElement('template');
  t.innerHTML = `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${markup}</svg>`;
  return t.content.firstElementChild;
}
export const ICONES = {
  inicio: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>',
  nova: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v8M8 12h8"/>',
  solicitacoes: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  painel: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 12l3 3 5-6"/>',
  notificacoes: '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21h4"/>',
  perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1-4 4-6 8-6s7 2 8 6"/>',
  pdf: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 14h6M10 17h4"/>',
  voltar: '<path d="M15 6l-6 6 6 6"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  ok: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  agenda: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
};

export const fmt = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso ?? '—') : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

export const logo = (tam = 32) => h('img', { src: 'icone-192.png', alt: 'COOPMETRO', class: 'logo', width: tam, height: tam });

/** Faixa de topo das telas internas: logo, título, subtítulo e um item opcional à direita. */
export function cabecalho(titulo, sub, direita) {
  return h('header', { class: 'topo' }, logo(),
    h('div', { class: 'grow' }, h('div', { class: 'topo-titulo' }, titulo), sub ? h('div', { class: 'muted' }, sub) : null),
    direita);
}

/** Botão grande. Bloqueia cliques repetidos enquanto a ação roda. */
export function botao(rotulo, { aoClicar, variante = '', desabilitado = false } = {}) {
  const b = h('button', { class: `btn ${variante}`.trim(), type: 'button' }, rotulo);
  b.disabled = desabilitado;
  b.addEventListener('click', async () => {
    if (b.disabled) return;
    b.disabled = true;
    b.classList.add('carregando');
    try { await aoClicar?.(); } finally {
      if (b.isConnected) { b.disabled = desabilitado; b.classList.remove('carregando'); }
    }
  });
  return b;
}

export const cartao = (...filhos) => h('section', { class: 'cartao' }, ...filhos);
export const titulo2 = (t) => h('h2', { class: 'h2' }, t);
export const muted = (t) => h('div', { class: 'muted' }, t);
export const rotulo = (t) => h('div', { class: 'rotulo' }, t);
export const item = (k, v) => h('div', { class: 'item' }, h('div', { class: 'muted' }, k), h('div', {}, v === undefined || v === null || v === '' ? '—' : String(v)));
/** Linha rótulo à esquerda, valor à direita (resumos). */
export const linhaValor = (k, v, { mono = false } = {}) => h('div', { class: 'lv' }, h('span', { class: 'muted' }, k),
  h('span', { class: mono ? 'mono' : '' }, v === undefined || v === null || v === '' ? '—' : String(v)));

export function badge(status) {
  return h('span', { class: `badge st-${status}` }, ROTULO_STATUS[status] ?? status);
}

export function banner(tipo, msg) {
  return h('div', { class: `banner ${tipo}`, role: 'alert' }, msg);
}

export const carregando = (t = 'Carregando…') => h('div', { class: 'centro' }, h('div', { class: 'spinner' }), muted(t));
export const vazio = (t, dica) => h('div', { class: 'centro' }, titulo2(t), dica ? muted(dica) : null);

/** Campo de formulário. Devolve o elemento; o input fica em `.input`. */
export function campo(rot, { tipo = 'text', valor = '', multilinha = false, placeholder = '', modo, autocomplete, aoEnter, maiusculas = false } = {}) {
  const input = multilinha
    ? h('textarea', { rows: 4, placeholder })
    : h('input', { type: tipo, placeholder, inputmode: modo, autocomplete, autocapitalize: maiusculas ? 'characters' : 'none' });
  input.value = valor;
  if (aoEnter) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') aoEnter(); });
  const el = h('label', { class: 'campo' }, h('span', { class: 'rotulo' }, rot), input);
  el.input = input;
  return el;
}

/** Chips selecionáveis. `selecionados` é um array; devolve o elemento com `.valor()`. */
export function chips(opcoes, selecionados = [], { multiplo = false, aoMudar } = {}) {
  let sel = [...selecionados];
  const raiz = h('div', { class: 'chips' });
  const desenhar = () => {
    raiz.replaceChildren(...opcoes.map((o) => {
      const ativo = sel.includes(o.valor);
      const b = h('button', { type: 'button', class: `chip ${ativo ? 'ativo' : ''}`, 'aria-pressed': String(ativo) }, o.rotulo);
      b.addEventListener('click', () => {
        sel = multiplo ? (ativo ? sel.filter((x) => x !== o.valor) : [...sel, o.valor]) : [o.valor];
        desenhar();
        aoMudar?.(sel);
      });
      return b;
    }));
  };
  desenhar();
  raiz.valor = () => sel;
  return raiz;
}

/** Cartões de escolha única (rádio grande). opcoes: [{valor, rotulo}]. */
export function opcoes(lista, atual, aoMudar, { colunas = 2 } = {}) {
  const raiz = h('div', { class: 'opcoes', style: `grid-template-columns: repeat(${colunas}, minmax(0, 1fr))` });
  const desenhar = (sel) => {
    raiz.replaceChildren(...lista.map((o) => {
      const ativo = sel === o.valor;
      const b = h('button', { type: 'button', class: `opcao ${ativo ? 'ativa' : ''}`, role: 'radio', 'aria-checked': String(ativo) },
        h('span', { class: 'bolinha' }), o.rotulo);
      b.addEventListener('click', () => { desenhar(o.valor); aoMudar(o.valor); });
      return b;
    }));
  };
  desenhar(atual);
  return raiz;
}
