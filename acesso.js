// Regras de autorização no app. NÃO substituem as regras do Firestore (firestore.rules): são só conveniência de tela.
// Perfil: { uid, nome, email, cargos: [...], bases: [...], todasAsBases?: boolean }
// Cargos do app: despachante, coordenador_base, supervisor, coordenador_geral, administrativo (só consulta), admin_sistema.

export const temCargo = (p, cargo) => p.cargos.includes(cargo);
const algum = (p, lista) => lista.some((c) => temCargo(p, c));

export const podeAcessarBase = (p, base) => p.todasAsBases === true || p.bases.includes(base);

export const CARGOS_CRIAM = ['despachante', 'coordenador_base'];
export const CARGOS_REVISAM = ['supervisor', 'coordenador_geral'];
export const CARGOS_CONSULTAM = ['administrativo', 'admin_sistema'];

export const podeCriar = (p, base) => algum(p, CARGOS_CRIAM) && podeAcessarBase(p, base);

/** Despacho vê só os pedidos dele; coord. de base e supervisor, os da base; os demais, o que as bases permitirem. */
export const podeVer = (p, r) => {
  if (r.excluido) return temCargo(p, 'admin_sistema'); // excluído: só o administrador do sistema ainda abre
  if (temCargo(p, 'despachante') && !algum(p, ['coordenador_base', 'supervisor', 'coordenador_geral', 'administrativo', 'admin_sistema'])) {
    return r.solicitante?.uid === p.uid;
  }
  return algum(p, [...CARGOS_CRIAM, ...CARGOS_REVISAM, ...CARGOS_CONSULTAM]) && podeAcessarBase(p, r.xptId);
};

/** Bases consultáveis: lista ou 'TODAS' (só com acesso total cadastrado). Nunca presumido. */
export const basesVisiveis = (p) => (p.todasAsBases ? 'TODAS' : [...p.bases]);

/** Despacho enxerga só os pedidos dele (a consulta é por solicitante, não por base). */
export const veSoOsProprios = (p) => temCargo(p, 'despachante');

/** Só o coordenador geral decide, nas bases autorizadas, e nunca sobre o próprio pedido. */
export const podeDecidir = (p, r) =>
  temCargo(p, 'coordenador_geral') &&
  podeAcessarBase(p, r.xptId) &&
  r.solicitante.uid !== p.uid &&
  !r.excluido &&
  (r.status === 'PENDENTE' || r.status === 'EM_ANALISE');

/** Supervisor e coordenador geral só movem PENDENTE -> EM_ANALISE. */
export const podeColocarEmAnalise = (p, r) =>
  algum(p, CARGOS_REVISAM) && podeAcessarBase(p, r.xptId) && !r.excluido && r.status === 'PENDENTE';

/** O solicitante cancela enquanto estiver PENDENTE. */
export const podeCancelar = (p, r) => r.solicitante.uid === p.uid && r.status === 'PENDENTE' && !r.excluido;

/** Só o administrador do sistema exclui (a linha continua na planilha, marcada como Excluído). */
export const podeExcluir = (p, r) => temCargo(p, 'admin_sistema') && !r.excluido;

/** Histórico com filtros e PDF: todo cargo que enxerga pedidos. */
export const podeGerarRelatorio = (p) => algum(p, [...CARGOS_CRIAM, ...CARGOS_REVISAM, ...CARGOS_CONSULTAM]);

/** Abas liberadas. Cargo não reconhecido => só o perfil. */
export function abasPermitidas(p) {
  const cria = algum(p, CARGOS_CRIAM);
  const revisa = algum(p, CARGOS_REVISAM);
  if (!podeGerarRelatorio(p)) return ['perfil'];
  const abas = ['inicio'];
  if (cria) abas.push('nova');
  if (revisa) abas.push('painel');
  abas.push('solicitacoes');
  if (cria || revisa) abas.push('notificacoes');
  abas.push('perfil');
  return abas;
}

export const rotuloAba = (p, aba) => ({
  inicio: 'Início',
  nova: 'Nova',
  solicitacoes: algum(p, CARGOS_CRIAM) ? 'Pedidos' : 'Histórico',
  painel: temCargo(p, 'coordenador_geral') ? 'Decidir' : 'Pendências',
  notificacoes: 'Avisos',
  perfil: 'Perfil',
}[aba]);

export const podeGerirAcessos = (p) => temCargo(p, 'admin_sistema');
