// ══════════════════════════════════════════════
//  CONSTANTES E CONFIGURAÇÕES PADRÃO
// ══════════════════════════════════════════════
const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

const CDESP = {
  moradia: '🏠 Moradia',
  alimentacao: '🍽️ Alimentação',
  transporte: '🚗 Transporte',
  saude: '💊 Saúde',
  educacao: '📚 Educação',
  lazer: '🎮 Lazer',
  filho: '👦 Filho',
  outros: '📦 Outros'
};

const CREC = {
  salario: '💼 Salário',
  extra: '💡 Renda Extra',
  investimento: '📊 Investimento',
  terreno: '🏞️ Recebível do terreno',
  outros: '📦 Outros'
};

// ══════════════════════════════════════════════
//  ESTADO DA APLICAÇÃO
// ══════════════════════════════════════════════
let mes = new Date().getMonth();
let ano = new Date().getFullYear();
let filtro = 'todos';
let togAtivo = 'r';
let membroVisualizacao = 'todos'; // 'todos' ou id do membro ativo

let bd = {
  receitas: [],
  despesas: [],
  fixos: [],
  metas: [],
  pagamentos: {}, // "itemId-ano-mes" -> {pago: true, dataPag: string, valorPago: number}
  recebiveis: [],
  dividas: []
};

let cfg = {
  membros: [
    { id: 'pai', nome: 'Pai', icone: '👨', rendaMensal: 5000, cor: '#3a7bd5' },
    { id: 'mae', nome: 'Mãe', icone: '👩', rendaMensal: 4000, cor: '#e94560' },
    { id: 'filho', nome: 'Filho', icone: '👦', rendaMensal: 200, cor: '#f7971e' },
    { id: 'familia', nome: 'Família (Conjunto)', icone: '👨‍👩‍👦', rendaMensal: 0, cor: '#38ef7d' }
  ],
  orc: {
    moradia: 1500,
    alimentacao: 800,
    transporte: 400,
    saude: 300,
    educacao: 500,
    lazer: 300,
    filho: 400,
    outros: 200
  },
  tema: 'dark',
  senhaHash: ''
};

// ══════════════════════════════════════════════
//  INICIALIZAÇÃO & PWA REGISTRO
// ══════════════════════════════════════════════
window.onload = () => {
  carregarTudo();
  aplicarTema();
  atualizarStatusSenha();
  
  // Registrar Service Worker para PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .then(reg => { reg.update(); console.log('SW atualizado:', reg.scope); })
      .catch(err => console.log('Falha ao registrar SW:', err));
  }

  // Preencher seletores de ano e mês
  const sa = document.getElementById('selAno');
  sa.innerHTML = '';
  for (let y = ano - 2; y <= ano + 2; y++) {
    const o = document.createElement('option');
    o.value = y;
    o.textContent = y;
    if (y === ano) o.selected = true;
    sa.appendChild(o);
  }
  document.getElementById('selMes').value = mes;

  // Datas padrões dos formulários
  const hj = new Date().toISOString().split('T')[0];
  if (document.getElementById('r-data')) document.getElementById('r-data').value = hj;
  if (document.getElementById('d-data')) document.getElementById('d-data').value = hj;

  atualizarSelectsMembros();
  renderBarraPerfil();
  renderGerenciamentoMembros();
  renderCfgOrc();
  renderTudo();
  verificarBloqueio();
};

// ══════════════════════════════════════════════
//  PERSISTÊNCIA & MIGRAÇÃO TRANSPARENTE
// ══════════════════════════════════════════════
function salvarBD() {
  localStorage.setItem('ff_bd', JSON.stringify(bd));
}

function salvarCfg() {
  localStorage.setItem('ff_cfg', JSON.stringify(cfg));
  aplicarTema();
  atualizarSelectsMembros();
  renderBarraPerfil();
  renderGerenciamentoMembros();
  renderTudo();
}

function carregarTudo() {
  const rc = localStorage.getItem('ff_cfg');
  const rb = localStorage.getItem('ff_bd');

  if (rc) {
    try {
      const parsedCfg = JSON.parse(rc);
      // Migração de schema legado {pai, mae, filho, sp, sm, mf} para {membros: [...]}
      if (!parsedCfg.membros && (parsedCfg.pai || parsedCfg.mae)) {
        cfg.membros = [
          { id: 'pai', nome: parsedCfg.pai || 'Pai', icone: '👨', rendaMensal: parsedCfg.sp || 5000, cor: '#3a7bd5' },
          { id: 'mae', nome: parsedCfg.mae || 'Mãe', icone: '👩', rendaMensal: parsedCfg.sm || 4000, cor: '#e94560' },
          { id: 'filho', nome: parsedCfg.filho || 'Filho', icone: '👦', rendaMensal: parsedCfg.mf || 200, cor: '#f7971e' },
          { id: 'familia', nome: 'Família (Conjunto)', icone: '👨‍👩‍👦', rendaMensal: 0, cor: '#38ef7d' }
        ];
        if (parsedCfg.orc) cfg.orc = { ...cfg.orc, ...parsedCfg.orc };
        salvarCfg();
      } else {
        cfg = { ...cfg, ...parsedCfg };
      }
    } catch (e) {
      console.error('Erro ao ler configurações:', e);
    }
  }

  if (rb) {
    try {
      const s = JSON.parse(rb);
      bd.receitas = s.receitas || [];
      bd.despesas = s.despesas || [];
      bd.fixos = s.fixos || [];
      bd.metas = s.metas || [];
      bd.pagamentos = s.pagamentos || {};
      bd.recebiveis = s.recebiveis || [];
      bd.dividas = s.dividas || [];
    } catch (e) {
      console.error('Erro ao ler banco de dados:', e);
    }
  }
  importarDadosExcelUmaVez();
}

// ══════════════════════════════════════════════
//  HELPERS BASE & FORMATAÇÃO
// ══════════════════════════════════════════════
function v(id) {
  const e = document.getElementById(id);
  return e ? e.value : '';
}

function sv(id, val) {
  const e = document.getElementById(id);
  if (e) e.value = val;
}

function set(id, val) {
  const e = document.getElementById(id);
  if (e) e.textContent = val;
}

function fmt(valor) {
  return (valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function obterMembro(id) {
  return cfg.membros.find(m => m.id === id) || { id, nome: id, icone: '👤', rendaMensal: 0, cor: '#aaa' };
}

function nomeMem(membroId) {
  const m = obterMembro(membroId);
  return `${m.icone} ${m.nome}`;
}

// Chave única para controle de status de pagamento: fixoId + ano + mes
function chavePag(fixoId, m = mes, a = ano) {
  return `${fixoId}-${a}-${m}`;
}

function getPag(fixoId, m = mes, a = ano) {
  return bd.pagamentos[chavePag(fixoId, m, a)] || { pago: false, dataPag: '', valorPago: 0 };
}

// ══════════════════════════════════════════════
//  GESTÃO FLEXÍVEL DE MEMBROS
// ══════════════════════════════════════════════
function atualizarSelectsMembros() {
  const selects = ['r-memb', 'd-memb', 'fx-memb'];
  selects.forEach(sId => {
    const el = document.getElementById(sId);
    if (!el) return;
    const curVal = el.value;
    el.innerHTML = cfg.membros.map(m => `<option value="${m.id}">${m.icone} ${m.nome}</option>`).join('');
    if (cfg.membros.some(m => m.id === curVal)) {
      el.value = curVal;
    }
  });

  // Atualizar botões de filtro no Lançar
  const barFiltros = document.getElementById('bar-filtros-lanc');
  if (barFiltros) {
    const fixosBtns = `
      <button class="fb ${filtro==='todos'?'on':''}" onclick="setFil('todos',this)">Todos</button>
      <button class="fb ${filtro==='rec'?'on':''}" onclick="setFil('rec',this)">💚 Receitas</button>
      <button class="fb ${filtro==='desp'?'on':''}" onclick="setFil('desp',this)">❤️ Despesas</button>
      <button class="fb ${filtro==='fixos'?'on':''}" onclick="setFil('fixos',this)">🔒 Fixos</button>
    `;
    const memBtns = cfg.membros.map(m => `
      <button class="fb ${filtro===m.id?'on':''}" onclick="setFil('${m.id}',this)">${m.icone} ${m.nome}</button>
    `).join('');
    barFiltros.innerHTML = fixosBtns + memBtns;
  }
}

function renderBarraPerfil() {
  const c = document.getElementById('bar-perfil-chips');
  if (!c) return;
  let html = `<button class="pchip ${membroVisualizacao==='todos'?'on':''}" onclick="selecionarMembroVisualizacao('todos')">👨‍👩‍👧‍👦 Todos (Geral)</button>`;
  cfg.membros.forEach(m => {
    html += `<button class="pchip ${membroVisualizacao===m.id?'on':''}" onclick="selecionarMembroVisualizacao('${m.id}')">${m.icone} ${m.nome}</button>`;
  });
  c.innerHTML = html;
}

function selecionarMembroVisualizacao(mId) {
  membroVisualizacao = mId;
  renderBarraPerfil();
  renderTudo();
  if (mId === 'todos') {
    notif('Mostrando finanças de todos os membros', 'info');
  } else {
    const m = obterMembro(mId);
    notif(`Filtrado por: ${m.icone} ${m.nome}`, 'info');
  }
}

function renderGerenciamentoMembros() {
  const cont = document.getElementById('lista-membros-gerenciamento');
  if (!cont) return;

  cont.innerHTML = cfg.membros.map((m, idx) => `
    <div class="membro-card">
      <div class="membro-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <input type="text" value="${m.icone}" id="mem-ico-${m.id}" style="width:38px;text-align:center;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:white;border-radius:8px;padding:4px;font-size:1.1rem;" onchange="atualizarDadosMembro('${m.id}')">
          <input type="text" value="${m.nome}" id="mem-nom-${m.id}" style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:white;border-radius:8px;padding:6px 10px;font-size:.85rem;font-weight:700;" onchange="atualizarDadosMembro('${m.id}')">
        </div>
        ${m.id !== 'familia' ? `
          <button onclick="removerMembro('${m.id}')" style="background:rgba(239,68,68,.2);border:1px solid rgba(239,68,68,.4);color:#fca5a5;padding:4px 8px;border-radius:8px;font-size:.7rem;cursor:pointer;">Excluir</button>
        ` : `<span style="font-size:.7rem;color:rgba(255,255,255,.4);">Conta Conjunta</span>`}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
        <span style="font-size:.78rem;color:rgba(255,255,255,.6);">Renda / Salário Base:</span>
        <div style="display:flex;align-items:center;gap:4px;">
          <span style="font-size:.75rem;color:#38ef7d;">R$</span>
          <input type="number" step="0.01" value="${m.rendaMensal || 0}" id="mem-ren-${m.id}" style="width:110px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#38ef7d;border-radius:8px;padding:5px 8px;font-size:.85rem;font-weight:700;text-align:right;" onchange="atualizarDadosMembro('${m.id}')">
        </div>
      </div>
    </div>
  `).join('');
}

function atualizarDadosMembro(id) {
  const m = cfg.membros.find(x => x.id === id);
  if (!m) return;
  const icoEl = document.getElementById(`mem-ico-${id}`);
  const nomEl = document.getElementById(`mem-nom-${id}`);
  const renEl = document.getElementById(`mem-ren-${id}`);

  if (icoEl) m.icone = icoEl.value.trim() || '👤';
  if (nomEl) m.nome = nomEl.value.trim() || id;
  if (renEl) m.rendaMensal = parseFloat(renEl.value) || 0;

  salvarCfg();
  notif('✅ Membro atualizado!', 'ok');
}

function abrirModalNovoMembro() {
  const nome = prompt('Nome do novo membro da família (ex: Filha, Vovó, Casal):');
  if (!nome || !nome.trim()) return;

  const icone = prompt('Ícone/Emoji para representar (ex: 👧, 👵, 🧑, 💼):', '👤') || '👤';
  const renda = parseFloat(prompt('Renda/Salário ou mesada mensal estimada R$ (opcional):', '0')) || 0;

  const novoId = 'm_' + Date.now().toString(36);
  cfg.membros.push({
    id: novoId,
    nome: nome.trim(),
    icone: icone.trim(),
    rendaMensal: renda,
    cor: '#a18cd1'
  });

  salvarCfg();
  notif(`✅ ${icone} ${nome} adicionado com sucesso!`, 'ok');
}

function removerMembro(id) {
  if (id === 'familia') {
    alert('A categoria conjunta da Família não pode ser excluída.');
    return;
  }
  const m = obterMembro(id);
  if (confirm(`Deseja remover ${m.icone} ${m.nome}?\nOs lançamentos já registrados continuarão visíveis no histórico.`)) {
    cfg.membros = cfg.membros.filter(x => x.id !== id);
    if (membroVisualizacao === id) membroVisualizacao = 'todos';
    salvarCfg();
    notif('Membro removido da lista!', 'info');
  }
}

// ══════════════════════════════════════════════
//  FILTROS DE DATA E ESCOPO
// ══════════════════════════════════════════════
function filtrarPorMembro(item) {
  if (membroVisualizacao === 'todos') return true;
  return item.membro === membroVisualizacao;
}

function recMes(m = mes, a = ano) {
  const manuais = bd.receitas.filter(r => r.mes === m && r.ano === a);
  const recebiveis = (bd.recebiveis || []).filter(r => r.mes === m && r.ano === a);
  return [...manuais, ...recebiveis].filter(filtrarPorMembro);
}

function despMes(m = mes, a = ano) {
  return bd.despesas.filter(d => d.mes === m && d.ano === a && filtrarPorMembro(d));
}

function fixosDesp() {
  return bd.fixos.filter(f => f.tipo === 'despesa' && filtrarPorMembro(f));
}

function fixosRec() {
  return bd.fixos.filter(f => f.tipo === 'receita' && filtrarPorMembro(f));
}

function totFixDesp() {
  return fixosDesp().reduce((s, f) => s + f.valor, 0);
}

function totFixRec() {
  return fixosRec().reduce((s, f) => s + f.valor, 0);
}

// ══════════════════════════════════════════════
//  TOTAIS COM PAGAMENTOS
// ══════════════════════════════════════════════
function calcTotais(m = mes, a = ano) {
  const recs = recMes(m, a);
  const desps = despMes(m, a);
  const fds = fixosDesp();
  const frs = fixosRec();

  // Receitas manuais + fixas
  const totRec = recs.reduce((s, r) => s + r.valor, 0) + frs.reduce((s, f) => s + f.valor, 0);

  // Despesas manuais (não fixas)
  const totDespVar = desps.reduce((s, d) => s + d.valor, 0);

  // Despesas fixas (previstas)
  const totDespFix = fds.reduce((s, f) => s + f.valor, 0);

  // Total geral de despesas previstas no mês
  const totDesp = totDespVar + totDespFix;

  // Total já pago: pagamentos confirmados de fixas + pagamentos confirmados de variáveis
  let totPago = 0;
  let qtdPagas = 0;
  let qtdPend = 0;

  fds.forEach(f => {
    const pag = getPag(f.id, m, a);
    if (pag.pago) {
      totPago += f.valor;
      qtdPagas++;
    } else {
      qtdPend++;
    }
  });

  desps.forEach(d => {
    const pag = getPag(d.id, m, a);
    if (pag.pago) {
      totPago += d.valor;
      qtdPagas++;
    } else {
      qtdPend++;
    }
  });

  const totFalta = Math.max(0, totDesp - totPago);
  const saldo = totRec - totDesp;
  const pctEco = totRec > 0 ? Math.max(0, ((saldo / totRec) * 100)).toFixed(1) : '0.0';
  const pctPago = totDesp > 0 ? ((totPago / totDesp) * 100).toFixed(0) : '0';

  return {
    totRec,
    totDesp,
    totDespFix,
    totDespVar,
    saldo,
    pctEco,
    totPago,
    totFalta,
    pctPago,
    qtdPagas,
    qtdPend
  };
}

// ══════════════════════════════════════════════
//  RENDERIZAÇÃO GERAL
// ══════════════════════════════════════════════
function renderTudo() {
  renderCards();
  renderHomePagamentos();
  renderUltimosLanc();
  renderAlertas();
  renderLanc();
  renderFixos();
  renderExcFixos();
  renderPagar();
  renderOrc();
  renderExcResumo();
  renderPorMembro();
  renderMetas();
  renderRecebiveisResumo();
}

function renderCards() {
  const t = calcTotais();
  set('cv-rec', 'R$ ' + fmt(t.totRec));
  set('cv-desp', 'R$ ' + fmt(t.totDesp));

  const salEl = document.getElementById('cv-sal');
  if (salEl) {
    salEl.textContent = 'R$ ' + fmt(t.saldo);
    salEl.style.color = t.saldo >= 0 ? '#38ef7d' : '#ff6b6b';
  }

  set('cv-eco', t.pctEco + '%');
  set('cv-pagas', t.qtdPagas + ' itens');
  set('cv-pend', t.qtdPend + ' itens');
}

function renderHomePagamentos() {
  const t = calcTotais();
  set('mes-label-home', MESES[mes] + '/' + ano);
  set('home-total-desp', 'R$ ' + fmt(t.totDesp));
  set('home-total-pago', 'R$ ' + fmt(t.totPago));
  set('home-total-falta', 'R$ ' + fmt(t.totFalta));

  const progEl = document.getElementById('home-prog-pag');
  if (progEl) progEl.style.width = t.pctPago + '%';
  set('home-prog-label', t.pctPago + '% pago');
}

function renderUltimosLanc() {
  const c = document.getElementById('lista-home');
  if (!c) return;

  const recs = recMes().map(r => ({ ...r, tipoItem: 'rec' }));
  const desps = despMes().map(d => ({ ...d, tipoItem: 'desp' }));
  const todos = [...recs, ...desps].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 5);

  if (todos.length === 0) {
    c.innerHTML = '<div style="color:rgba(255,255,255,.3);font-size:.8rem;text-align:center;padding:12px">Nenhum lançamento manual este mês</div>';
    return;
  }

  c.innerHTML = todos.map(it => {
    const isR = it.tipoItem === 'rec';
    const memb = obterMembro(it.membro);
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:.82rem">
        <div>
          <span style="font-weight:600">${isR ? '💚' : '❤️'} ${it.desc}</span>
          <span class="tag-membro" style="background:${memb.cor}22;color:${memb.cor};border:1px solid ${memb.cor}44">${memb.icone} ${memb.nome}</span>
          <div style="font-size:.7rem;color:rgba(255,255,255,.4)">${it.data || ''} · ${CDESP[it.cat] || CREC[it.cat] || it.cat}</div>
        </div>
        <span style="font-weight:700;color:${isR ? '#38ef7d' : '#ff6b6b'}">${isR ? '+' : '-'} R$ ${fmt(it.valor)}</span>
      </div>`;
  }).join('');
}

function renderAlertas() {
  const c = document.getElementById('alertas');
  if (!c) return;
  const desps = despMes();
  const fds = fixosDesp();
  const alertas = [];

  Object.entries(cfg.orc).forEach(([cat, lim]) => {
    if (!lim) return;
    const gastoVar = desps.filter(d => d.cat === cat).reduce((s, d) => s + d.valor, 0);
    const gastoFix = fds.filter(f => f.cat === cat).reduce((s, f) => s + f.valor, 0);
    const tot = gastoVar + gastoFix;
    const pct = (tot / lim) * 100;
    if (pct >= 100) {
      alertas.push(`<div style="color:#ff6b6b;padding:5px 0;font-size:.8rem">🔴 <b>${CDESP[cat] || cat}</b> estourou o limite! (R$ ${fmt(tot)} / R$ ${fmt(lim)})</div>`);
    } else if (pct >= 80) {
      alertas.push(`<div style="color:#ffd200;padding:5px 0;font-size:.8rem">🟡 <b>${CDESP[cat] || cat}</b> atingiu ${pct.toFixed(0)}% do limite!</div>`);
    }
  });

  c.innerHTML = alertas.length > 0 ? alertas.join('') : '<div style="color:#38ef7d;font-size:.8rem">✅ Orçamentos dentro do limite!</div>';
}

// ══════════════════════════════════════════════
//  LANÇAMENTOS
// ══════════════════════════════════════════════
function addRec() {
  const desc = v('r-desc').trim();
  const val = parseFloat(v('r-val'));
  const data = v('r-data') || new Date().toISOString().split('T')[0];
  const cat = v('r-cat');
  const memb = v('r-memb');
  const fixo = v('r-fixo') === 'sim';

  if (!desc || isNaN(val) || val <= 0) {
    notif('Preencha descrição e valor válido!', 'err');
    return;
  }

  const item = {
    id: 'r' + Date.now(),
    desc,
    valor: val,
    cat,
    membro: memb,
    data,
    mes,
    ano,
    tipo: 'receita',
    fixo,
    ts: Date.now()
  };

  bd.receitas.push(item);

  if (fixo) {
    bd.fixos.push({
      id: 'f' + Date.now(),
      tipo: 'receita',
      desc,
      valor: val,
      cat,
      membro: memb,
      diaVenc: parseInt(data.split('-')[2]) || 5
    });
    notif('🔄 Receita cadastrada como fixa para todo mês!', 'info');
  }

  salvarBD();
  sv('r-desc', '');
  sv('r-val', '');
  renderTudo();
  if (!fixo) notif('✅ Receita adicionada!', 'ok');
}

function delRec(id) {
  bd.receitas = bd.receitas.filter(r => r.id !== id);
  salvarBD();
  renderTudo();
  notif('🗑️ Receita removida!', 'ok');
}

function addDesp() {
  const desc = v('d-desc').trim();
  const val = parseFloat(v('d-val'));
  const data = v('d-data') || new Date().toISOString().split('T')[0];
  const cat = v('d-cat');
  const memb = v('d-memb');
  const tipo = v('d-tipo');

  if (!desc || isNaN(val) || val <= 0) {
    notif('Preencha descrição e valor válido!', 'err');
    return;
  }

  const item = {
    id: 'd' + Date.now(),
    desc,
    valor: val,
    cat,
    membro: memb,
    data,
    mes,
    ano,
    tipo: 'despesa',
    fixo: tipo === 'fixo',
    ts: Date.now()
  };

  bd.despesas.push(item);

  if (tipo === 'fixo') {
    bd.fixos.push({
      id: 'f' + Date.now(),
      tipo: 'despesa',
      desc,
      valor: val,
      cat,
      membro: memb,
      diaVenc: parseInt(data.split('-')[2]) || 10
    });
    notif('🔒 Despesa cadastrada como fixa recorrente!', 'info');
  }

  salvarBD();
  sv('d-desc', '');
  sv('d-val', '');
  renderTudo();
  if (tipo !== 'fixo') notif('✅ Despesa adicionada!', 'ok');
}

function delDesp(id) {
  bd.despesas = bd.despesas.filter(d => d.id !== id);
  salvarBD();
  renderTudo();
  notif('🗑️ Despesa removida!', 'ok');
}

function renderLanc() {
  const c = document.getElementById('lista-lanc');
  if (!c) return;

  const recs = recMes().map(r => ({ ...r, tipoItem: 'rec' }));
  const desps = despMes().map(d => ({ ...d, tipoItem: 'desp' }));
  let itens = [...recs, ...desps];

  if (filtro === 'rec') itens = itens.filter(i => i.tipoItem === 'rec');
  else if (filtro === 'desp') itens = itens.filter(i => i.tipoItem === 'desp');
  else if (filtro === 'fixos') itens = itens.filter(i => i.fixo);
  else if (filtro !== 'todos') itens = itens.filter(i => i.membro === filtro);

  itens.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  set('qtd-lanc', `${itens.length} registros`);

  if (itens.length === 0) {
    c.innerHTML = '<div style="color:rgba(255,255,255,.3);font-size:.8rem;text-align:center;padding:16px">Nenhum lançamento encontrado</div>';
    return;
  }

  c.innerHTML = itens.map(it => {
    const isR = it.tipoItem === 'rec';
    const delFn = isR ? (it.excel ? `delRecebivel('${it.id}')` : `delRec('${it.id}')`) : `delDesp('${it.id}')`;
    const pag = getPag(it.id);
    const memb = obterMembro(it.membro);

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:.83rem">
        <div>
          <div style="font-weight:600">
            ${isR ? '💚' : '❤️'} ${it.desc}
            ${it.fixo ? '<span style="font-size:.68rem;background:rgba(233,69,96,.2);color:#ff758c;padding:1px 5px;border-radius:6px;margin-left:4px">fixo</span>' : ''}
            <span class="tag-membro" style="background:${memb.cor}22;color:${memb.cor};border:1px solid ${memb.cor}44">${memb.icone} ${memb.nome}</span>
          </div>
          <div style="font-size:.7rem;color:rgba(255,255,255,.4)">
            ${it.data || ''} · ${CDESP[it.cat] || CREC[it.cat] || it.cat}
            ${!isR ? ` · <span style="color:${pag.pago ? '#38ef7d' : '#ffd200'}">${pag.pago ? '✅ Pago' : '⏳ Pendente'}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-weight:700;color:${isR ? '#38ef7d' : '#ff6b6b'}">
            ${isR ? '+' : '-'} R$ ${fmt(it.valor)}
          </span>
          <button onclick="${delFn}" style="background:none;border:none;color:rgba(255,255,255,.3);cursor:pointer;font-size:.85rem">🗑️</button>
        </div>
      </div>`;
  }).join('');
}

// ══════════════════════════════════════════════
//  ITENS FIXOS
// ══════════════════════════════════════════════
function addFixo() {
  const tipo = v('fx-tipo');
  const desc = v('fx-desc').trim();
  const val = parseFloat(v('fx-val'));
  const cat = v('fx-cat');
  const memb = v('fx-memb');
  const dia = parseInt(v('fx-dia')) || 10;

  if (!desc || isNaN(val) || val <= 0) {
    notif('Preencha descrição e valor válido!', 'err');
    return;
  }

  bd.fixos.push({
    id: 'f' + Date.now(),
    tipo,
    desc,
    valor: val,
    cat,
    membro: memb,
    diaVenc: dia
  });

  salvarBD();
  sv('fx-desc', '');
  sv('fx-val', '');
  renderFixos();
  renderExcFixos();
  renderPagar();
  renderCards();
  notif('🔒 Item fixo adicionado!', 'ok');
}

function delFixo(id) {
  bd.fixos = bd.fixos.filter(f => f.id !== id);
  Object.keys(bd.pagamentos).forEach(k => {
    if (k.startsWith(id)) delete bd.pagamentos[k];
  });
  salvarBD();
  renderFixos();
  renderExcFixos();
  renderPagar();
  renderCards();
  notif('🗑️ Item fixo removido!', 'ok');
}

function renderFixos() {
  const cD = document.getElementById('lista-fix-d');
  const cR = document.getElementById('lista-fix-r');
  if (!cD || !cR) return;

  const fds = fixosDesp();
  const frs = fixosRec();

  cD.innerHTML = fds.length === 0
    ? '<div style="color:rgba(255,255,255,.3);font-size:.8rem;padding:8px 0">Nenhuma despesa fixa cadastrada</div>'
    : fds.map(f => {
      const memb = obterMembro(f.membro);
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:.83rem">
          <div>
            <div style="font-weight:600">
              ❤️ ${f.desc}
              <span class="tag-membro" style="background:${memb.cor}22;color:${memb.cor};border:1px solid ${memb.cor}44">${memb.icone} ${memb.nome}</span>
            </div>
            <div style="font-size:.7rem;color:rgba(255,255,255,.4)">${CDESP[f.cat] || f.cat} · Vence dia ${f.diaVenc}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-weight:700;color:#ff6b6b">R$ ${fmt(f.valor)}</span>
            <button onclick="delFixo('${f.id}')" style="background:none;border:none;color:rgba(255,255,255,.3);cursor:pointer">🗑️</button>
          </div>
        </div>`;
    }).join('');

  cR.innerHTML = frs.length === 0
    ? '<div style="color:rgba(255,255,255,.3);font-size:.8rem;padding:8px 0">Nenhuma receita fixa cadastrada</div>'
    : frs.map(f => {
      const memb = obterMembro(f.membro);
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:.83rem">
          <div>
            <div style="font-weight:600">
              💚 ${f.desc}
              <span class="tag-membro" style="background:${memb.cor}22;color:${memb.cor};border:1px solid ${memb.cor}44">${memb.icone} ${memb.nome}</span>
            </div>
            <div style="font-size:.7rem;color:rgba(255,255,255,.4)">${CREC[f.cat] || f.cat} · Recebimento dia ${f.diaVenc}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-weight:700;color:#38ef7d">R$ ${fmt(f.valor)}</span>
            <button onclick="delFixo('${f.id}')" style="background:none;border:none;color:rgba(255,255,255,.3);cursor:pointer">🗑️</button>
          </div>
        </div>`;
    }).join('');
}

function renderExcFixos() {
  const c = document.getElementById('exc-fixos');
  if (!c) return;
  const fds = fixosDesp();
  const frs = fixosRec();
  if (fds.length === 0 && frs.length === 0) {
    c.innerHTML = '<div style="color:rgba(255,255,255,.3);font-size:.8rem;padding:8px 0">Nenhum item fixo cadastrado</div>';
    return;
  }
  const totD = fds.reduce((s, f) => s + f.valor, 0);
  const totR = frs.reduce((s, f) => s + f.valor, 0);

  c.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:.82rem">
      <thead>
        <tr style="color:rgba(255,255,255,.5);border-bottom:1px solid rgba(255,255,255,.1)">
          <th style="text-align:left;padding:6px 0">Item Fixo</th>
          <th style="text-align:center;padding:6px 0">Membro</th>
          <th style="text-align:right;padding:6px 0">Mensal</th>
          <th style="text-align:right;padding:6px 0">Ano (12x)</th>
        </tr>
      </thead>
      <tbody>
        ${frs.map(f => `
          <tr style="border-bottom:1px solid rgba(255,255,255,.05)">
            <td style="padding:7px 0;color:#38ef7d">💚 ${f.desc}</td>
            <td style="text-align:center;font-size:.75rem">${obterMembro(f.membro).icone}</td>
            <td style="text-align:right;color:#38ef7d;font-weight:700">R$ ${fmt(f.valor)}</td>
            <td style="text-align:right;color:#38ef7d">R$ ${fmt(f.valor * 12)}</td>
          </tr>
        `).join('')}
        ${fds.map(f => `
          <tr style="border-bottom:1px solid rgba(255,255,255,.05)">
            <td style="padding:7px 0;color:#ff6b6b">❤️ ${f.desc}</td>
            <td style="text-align:center;font-size:.75rem">${obterMembro(f.membro).icone}</td>
            <td style="text-align:right;color:#ff6b6b;font-weight:700">R$ ${fmt(f.valor)}</td>
            <td style="text-align:right;color:#ff6b6b">R$ ${fmt(f.valor * 12)}</td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr style="border-top:1px solid rgba(255,255,255,.15);font-weight:700">
          <td style="padding:8px 0">SALDO FIXO MENSAL</td>
          <td></td>
          <td style="text-align:right;color:${(totR - totD) >= 0 ? '#38ef7d' : '#ff6b6b'}">R$ ${fmt(totR - totD)}</td>
          <td style="text-align:right;color:${(totR - totD) >= 0 ? '#38ef7d' : '#ff6b6b'}">R$ ${fmt((totR - totD) * 12)}</td>
        </tr>
      </tfoot>
    </table>
  `;
}

// ══════════════════════════════════════════════
//  CONTROLE DE PAGAMENTOS
// ══════════════════════════════════════════════
function togglePag(itemId, isFixo, valor) {
  const ch = chavePag(itemId);
  const atual = bd.pagamentos[ch] || { pago: false };
  const novoEstado = !atual.pago;

  if (novoEstado) {
    bd.pagamentos[ch] = {
      pago: true,
      dataPag: new Date().toISOString().split('T')[0],
      valorPago: valor
    };
    notif('✅ Pagamento confirmado! R$ ' + fmt(valor) + ' abatido', 'ok');
  } else {
    bd.pagamentos[ch] = { pago: false, dataPag: '', valorPago: 0 };
    notif('↩️ Pagamento desfeito!', 'info');
  }

  salvarBD();
  renderTudo();
}

function renderPagar() {
  const cFix = document.getElementById('pag-lista-fix');
  const cVar = document.getElementById('pag-lista-var');
  const cRec = document.getElementById('pag-lista-rec');
  if (!cFix || !cVar || !cRec) return;

  const t = calcTotais();
  set('pag-label-mes', MESES[mes] + '/' + ano);
  set('pag-tot-desp', 'R$ ' + fmt(t.totDesp));
  set('pag-tot-pago', 'R$ ' + fmt(t.totPago));
  set('pag-tot-falta', 'R$ ' + fmt(t.totFalta));
  const progEl = document.getElementById('pag-barra');
  if (progEl) progEl.style.width = t.pctPago + '%';
  set('pag-prog-label', t.pctPago + '% pago');

  const fds = fixosDesp();
  cFix.innerHTML = fds.length === 0
    ? '<div style="color:rgba(255,255,255,.3);font-size:.8rem;padding:8px 0">Nenhuma despesa fixa cadastrada</div>'
    : fds.map(f => {
      const pag = getPag(f.id);
      const memb = obterMembro(f.membro);
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:.83rem">
          <div>
            <div style="font-weight:600;display:flex;align-items:center;gap:6px">
              <span>${pag.pago ? '✅' : '⏳'} ${f.desc}</span>
              <span class="tag-membro" style="background:${memb.cor}22;color:${memb.cor};border:1px solid ${memb.cor}44">${memb.icone} ${memb.nome}</span>
            </div>
            <div style="font-size:.7rem;color:rgba(255,255,255,.4)">
              Vence dia ${f.diaVenc} · ${CDESP[f.cat] || f.cat}
              ${pag.pago ? ` · <span style="color:#38ef7d">Pago em ${pag.dataPag}</span>` : ''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-weight:700;color:${pag.pago ? '#38ef7d' : '#ff6b6b'}">R$ ${fmt(f.valor)}</span>
            <button onclick="togglePag('${f.id}', true, ${f.valor})"
              style="border:none;border-radius:20px;padding:6px 12px;font-size:.75rem;font-weight:700;cursor:pointer;
                     background:${pag.pago ? 'rgba(56,239,125,.2)' : 'linear-gradient(90deg,#e94560,#ff6b6b)'};
                     color:${pag.pago ? '#38ef7d' : 'white'};border:1px solid ${pag.pago ? '#38ef7d' : 'transparent'}">
              ${pag.pago ? 'Pago ✅' : 'Pagar'}
            </button>
          </div>
        </div>`;
    }).join('');

  const desps = despMes();
  cVar.innerHTML = desps.length === 0
    ? '<div style="color:rgba(255,255,255,.3);font-size:.8rem;padding:8px 0">Nenhuma despesa variável este mês</div>'
    : desps.map(d => {
      const pag = getPag(d.id);
      const memb = obterMembro(d.membro);
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:.83rem">
          <div>
            <div style="font-weight:600;display:flex;align-items:center;gap:6px">
              <span>${pag.pago ? '✅' : '⏳'} ${d.desc}</span>
              <span class="tag-membro" style="background:${memb.cor}22;color:${memb.cor};border:1px solid ${memb.cor}44">${memb.icone} ${memb.nome}</span>
            </div>
            <div style="font-size:.7rem;color:rgba(255,255,255,.4)">
              ${d.data || ''} · ${CDESP[d.cat] || d.cat}
              ${pag.pago ? ` · <span style="color:#38ef7d">Pago em ${pag.dataPag}</span>` : ''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-weight:700;color:${pag.pago ? '#38ef7d' : '#ff6b6b'}">R$ ${fmt(d.valor)}</span>
            <button onclick="togglePag('${d.id}', false, ${d.valor})"
              style="border:none;border-radius:20px;padding:6px 12px;font-size:.75rem;font-weight:700;cursor:pointer;
                     background:${pag.pago ? 'rgba(56,239,125,.2)' : 'linear-gradient(90deg,#e94560,#ff6b6b)'};
                     color:${pag.pago ? '#38ef7d' : 'white'};border:1px solid ${pag.pago ? '#38ef7d' : 'transparent'}">
              ${pag.pago ? 'Pago ✅' : 'Pagar'}
            </button>
          </div>
        </div>`;
    }).join('');

  const frs = fixosRec();
  cRec.innerHTML = frs.length === 0
    ? '<div style="color:rgba(255,255,255,.3);font-size:.8rem;padding:8px 0">Nenhuma receita fixa cadastrada</div>'
    : frs.map(f => {
      const pag = getPag(f.id);
      const memb = obterMembro(f.membro);
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:.83rem">
          <div>
            <div style="font-weight:600">
              ${pag.pago ? '✅' : '⏳'} ${f.desc}
              <span class="tag-membro" style="background:${memb.cor}22;color:${memb.cor};border:1px solid ${memb.cor}44">${memb.icone} ${memb.nome}</span>
            </div>
            <div style="font-size:.7rem;color:rgba(255,255,255,.4)">Recebe dia ${f.diaVenc} · ${CREC[f.cat] || f.cat}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-weight:700;color:#38ef7d">R$ ${fmt(f.valor)}</span>
            <button onclick="togglePag('${f.id}', true, ${f.valor})"
              style="border:none;border-radius:20px;padding:6px 12px;font-size:.75rem;font-weight:700;cursor:pointer;
                     background:${pag.pago ? 'rgba(56,239,125,.2)' : 'rgba(255,255,255,.1)'};
                     color:${pag.pago ? '#38ef7d' : 'white'}">
              ${pag.pago ? 'Recebido ✅' : 'Receber'}
            </button>
          </div>
        </div>`;
    }).join('');
}

// ══════════════════════════════════════════════
//  RELATÓRIOS & ANÁLISE POR MEMBRO
// ══════════════════════════════════════════════
function renderOrc() {
  const c = document.getElementById('orcamento');
  if (!c) return;
  const desps = despMes();
  const fds = fixosDesp();

  c.innerHTML = Object.entries(CDESP).map(([k, n]) => {
    const lim = cfg.orc[k] || 0;
    const gV = desps.filter(d => d.cat === k).reduce((s, d) => s + d.valor, 0);
    const gF = fds.filter(f => f.cat === k).reduce((s, f) => s + f.valor, 0);
    const tot = gV + gF;
    const pct = lim > 0 ? Math.min(100, ((tot / lim) * 100)).toFixed(0) : 0;
    const ok = lim === 0 || tot <= lim;

    return `
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:4px">
          <span>${n}</span>
          <span style="font-weight:700;color:${ok ? '#38ef7d' : '#ff6b6b'}">
            ${ok ? '✅' : '⚠️'} R$ ${fmt(tot)} ${lim > 0 ? `/ R$ ${fmt(lim)}` : ''}
          </span>
        </div>
        <div class="pb"><div class="pf ${ok ? 'p-ok' : 'p-al'}" style="width:${pct}%"></div></div>
      </div>`;
  }).join('');
}

function renderExcResumo() {
  const c = document.getElementById('exc-resumo');
  if (!c) return;

  let tR = 0, tDF = 0, tDV = 0, tD = 0, tS = 0;
  const rows = MESES.map((n, i) => {
    const t = calcTotais(i, ano);
    tR += t.totRec;
    tDF += t.totDespFix;
    tDV += t.totDespVar;
    tD += t.totDesp;
    tS += t.saldo;
    const cur = i === mes;

    return `
      <tr style="${cur ? 'background:rgba(233,69,96,.1)' : ''}">
        <td style="font-weight:${cur ? 700 : 400};color:${cur ? '#ff6b6b' : 'inherit'}">${cur ? '▶ ' : ''}${n.slice(0, 3)}</td>
        <td class="vp">R$ ${fmt(t.totRec)}</td>
        <td style="color:#ffd200">R$ ${fmt(t.totDespFix)}</td>
        <td style="color:#fbc2eb">R$ ${fmt(t.totDespVar)}</td>
        <td class="vn">R$ ${fmt(t.totDesp)}</td>
        <td style="color:${t.saldo >= 0 ? '#38ef7d' : '#ff6b6b'};font-weight:700">R$ ${fmt(t.saldo)}</td>
        <td style="color:${parseFloat(t.pctEco) >= 20 ? '#38ef7d' : parseFloat(t.pctEco) >= 10 ? '#ffd200' : '#ff6b6b'}">${t.pctEco}%</td>
      </tr>`;
  }).join('');

  c.innerHTML = rows;
  const eT = tR > 0 ? ((tS / tR) * 100).toFixed(1) : '0.0';
  const foot = document.getElementById('exc-foot');
  if (foot) {
    foot.innerHTML = `
      <tr>
        <td>TOTAL</td>
        <td class="vp">R$ ${fmt(tR)}</td>
        <td style="color:#ffd200">R$ ${fmt(tDF)}</td>
        <td style="color:#fbc2eb">R$ ${fmt(tDV)}</td>
        <td class="vn">R$ ${fmt(tD)}</td>
        <td style="color:${tS >= 0 ? '#38ef7d' : '#ff6b6b'}">R$ ${fmt(tS)}</td>
        <td>${eT}%</td>
      </tr>`;
  }
}

function renderPorMembro() {
  const c = document.getElementById('por-membro');
  if (!c) return;

  const desps = despMes();
  const fds = fixosDesp();
  const recs = recMes();
  const frs = fixosRec();

  c.innerHTML = cfg.membros.map(m => {
    const totD = desps.filter(d => d.membro === m.id).reduce((s, d) => s + d.valor, 0)
               + fds.filter(f => f.membro === m.id).reduce((s, f) => s + f.valor, 0);

    const totR = recs.filter(r => r.membro === m.id).reduce((s, r) => s + r.valor, 0)
               + frs.filter(f => f.membro === m.id).reduce((s, f) => s + f.valor, 0);

    const salMembro = totR - totD;

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:.83rem">
        <div>
          <span style="font-weight:700;color:${m.cor}">${m.icone} ${m.nome}</span>
          ${m.rendaMensal > 0 ? `<div style="font-size:.7rem;color:rgba(255,255,255,.4)">Renda base: R$ ${fmt(m.rendaMensal)}</div>` : ''}
        </div>
        <div style="text-align:right">
          <div class="vn" style="font-weight:700">Despesas: R$ ${fmt(totD)}</div>
          <div style="font-size:.7rem;color:${salMembro >= 0 ? '#38ef7d' : '#ff6b6b'}">Saldo: R$ ${fmt(salMembro)}</div>
        </div>
      </div>`;
  }).join('');
}

// ══════════════════════════════════════════════
//  METAS
// ══════════════════════════════════════════════
function addMeta() {
  const nome = v('m-nome').trim();
  const total = parseFloat(v('m-total'));
  const atual = parseFloat(v('m-atual')) || 0;
  const prazo = v('m-prazo');

  if (!nome || isNaN(total) || total <= 0) {
    notif('Preencha nome e valor total da meta!', 'err');
    return;
  }

  bd.metas.push({
    id: 'm' + Date.now(),
    nome,
    total,
    atual,
    prazo
  });

  salvarBD();
  sv('m-nome', '');
  sv('m-total', '');
  sv('m-atual', '');
  renderMetas();
  notif('🎯 Meta criada!', 'ok');
}

function updMeta(id, val) {
  const vNum = parseFloat(val);
  if (isNaN(vNum) || vNum < 0) return;
  const m = bd.metas.find(x => x.id === id);
  if (m) {
    m.atual = vNum;
    salvarBD();
    renderMetas();
    notif('💾 Meta atualizada!', 'ok');
  }
}

function delMeta(id) {
  bd.metas = bd.metas.filter(m => m.id !== id);
  salvarBD();
  renderMetas();
  notif('🗑️ Meta excluída!', 'ok');
}

function renderMetas() {
  const c = document.getElementById('lista-metas');
  if (!c) return;

  if (bd.metas.length === 0) {
    c.innerHTML = '<div style="color:rgba(255,255,255,.3);font-size:.8rem;padding:8px 0">🎯 Nenhuma meta cadastrada</div>';
    return;
  }

  c.innerHTML = bd.metas.map(m => {
    const pct = Math.min(100, ((m.atual / m.total) * 100)).toFixed(0);
    return `
      <div class="box">
        <div class="bt">
          <span>🎯 ${m.nome}</span>
          <button onclick="delMeta('${m.id}')" style="background:none;border:none;color:rgba(255,255,255,.3);cursor:pointer">🗑️</button>
        </div>
        <div style="font-size:.8rem;color:rgba(255,255,255,.6);margin-bottom:6px">
          R$ ${fmt(m.atual)} de R$ ${fmt(m.total)} (${pct}%)
          ${m.prazo ? ` · Prazo: ${m.prazo}` : ''}
        </div>
        <div class="pb"><div class="pf p-ok" style="width:${pct}%"></div></div>
        <div style="display:flex;gap:7px;margin-top:9px">
          <input type="number" id="mu_${m.id}" placeholder="Atualizar valor guardado"
            style="flex:1;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);
                   color:white;padding:7px 10px;border-radius:8px;font-size:.8rem;outline:none">
          <button onclick="updMeta('${m.id}',document.getElementById('mu_${m.id}').value)"
            style="background:linear-gradient(90deg,#a18cd1,#fbc2eb);border:none;
                   color:#1a1a2e;padding:7px 12px;border-radius:8px;cursor:pointer;font-weight:700">💾</button>
        </div>
      </div>`;
  }).join('');
}

// ══════════════════════════════════════════════
//  CONFIGURAÇÃO DE ORÇAMENTO
// ══════════════════════════════════════════════
function renderCfgOrc() {
  const c = document.getElementById('cfg-orc');
  if (!c) return;

  c.innerHTML = Object.entries(CDESP).map(([k, n]) => `
    <div class="cfg-i">
      <div><div class="cfg-l">${n}</div></div>
      <input class="cfg-inp" type="number" value="${cfg.orc[k] || 0}"
        onchange="cfg.orc['${k}'] = parseFloat(this.value) || 0; localStorage.setItem('ff_cfg', JSON.stringify(cfg)); renderOrc();">
    </div>`).join('');
}

// ══════════════════════════════════════════════
//  EXCEL: DÍVIDAS E RECEBÍVEIS DO TERRENO
// ══════════════════════════════════════════════
function importarDadosExcelUmaVez() {
  if (localStorage.getItem('ff_excel_seed_v1') === '1') return;
  fetch('./excel_seed.json')
    .then(r => r.ok ? r.json() : Promise.reject(new Error('seed não encontrado')))
    .then(seed => {
      bd.recebiveis = (seed.recebiveis || []).map(r => ({ ...r, excel: true, tipo: 'receita' }));
      bd.dividas = seed.dividas || [];
      localStorage.setItem('ff_excel_seed_v1', '1');
      salvarBD(); renderTudo();
      notif(`📥 ${bd.recebiveis.length} recebíveis e ${bd.dividas.length} dívidas importados do Excel`, 'info');
    })
    .catch(() => console.warn('Importação automática do Excel indisponível neste modo de abertura.'));
}

function delRecebivel(id) {
  bd.recebiveis = (bd.recebiveis || []).filter(r => r.id !== id);
  salvarBD(); renderTudo(); notif('🗑️ Recebível removido!', 'ok');
}

function renderRecebiveisResumo() {
  const c = document.getElementById('recebiveis-resumo'); if (!c) return;
  const rs = bd.recebiveis || [];
  const total = rs.reduce((s, r) => s + Number(r.valor || 0), 0);
  const pagos = rs.filter(r => r.pago).reduce((s, r) => s + Number(r.valor || 0), 0);
  const dividas = bd.dividas || [];
  const dividaTotal = dividas.reduce((s, d) => s + Number(d.valorAtual || 0), 0);
  c.innerHTML = `<div class="pag-resumo">
    <div class="pag-card"><div class="pl">Total previsto</div><div class="pv vp">R$ ${fmt(total)}</div></div>
    <div class="pag-card"><div class="pl">Recebido</div><div class="pv vp">R$ ${fmt(pagos)}</div></div>
    <div class="pag-card"><div class="pl">Em aberto</div><div class="pv" style="color:#ffd200">R$ ${fmt(total - pagos)}</div></div>
  </div><div style="font-size:.78rem;color:rgba(255,255,255,.65);margin-bottom:9px">💳 Dívidas importadas: ${dividas.length} · Valor com desconto informado: R$ ${fmt(dividaTotal)}</div>
  <div class="exc"><table><thead><tr><th>Recebível</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead><tbody>
  ${rs.slice(-12).map(r => `<tr><td>${r.desc}</td><td>${r.data}</td><td>R$ ${fmt(r.valor)}</td><td>${r.pago ? '✅ Recebido' : '⏳ Em aberto'}</td></tr>`).join('')}</tbody></table></div>`;
}

// ══════════════════════════════════════════════
//  TEMA E SENHA LOCAL
// ══════════════════════════════════════════════
function aplicarTema() {
  const tema = cfg.tema === 'light' ? 'light' : 'dark';
  document.body.classList.toggle('theme-light', tema === 'light');
  const claro = document.getElementById('tema-claro'); const escuro = document.getElementById('tema-escuro');
  if (claro) claro.classList.toggle('active', tema === 'light');
  if (escuro) escuro.classList.toggle('active', tema === 'dark');
}
function definirTema(tema) { cfg.tema = tema === 'light' ? 'light' : 'dark'; salvarCfg(); notif(cfg.tema === 'light' ? '☀️ Tema claro ativado' : '🌙 Tema escuro ativado', 'info'); }
async function hashSenha(valor) {
  const data = new TextEncoder().encode(valor); const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function salvarSenhaAcesso() {
  const atual = v('senha-atual'), nova = v('senha-nova'), confirmacao = v('senha-confirmacao');
  if (cfg.senhaHash && await hashSenha(atual) !== cfg.senhaHash) return notif('Senha atual incorreta.', 'err');
  if (nova.length < 4) return notif('A nova senha precisa ter pelo menos 4 caracteres.', 'err');
  if (nova !== confirmacao) return notif('A confirmação não confere.', 'err');
  cfg.senhaHash = await hashSenha(nova); salvarCfg(); sv('senha-atual',''); sv('senha-nova',''); sv('senha-confirmacao',''); atualizarStatusSenha(); notif('🔒 Senha salva neste dispositivo.', 'ok');
}
async function removerSenhaAcesso() {
  if (!cfg.senhaHash) return notif('Não há senha configurada.', 'info');
  if (await hashSenha(v('senha-atual')) !== cfg.senhaHash) return notif('Informe a senha atual para removê-la.', 'err');
  cfg.senhaHash = ''; salvarCfg(); atualizarStatusSenha(); notif('🔓 Senha removida.', 'ok');
}
function atualizarStatusSenha() { const el = document.getElementById('status-senha'); if (el) el.textContent = cfg.senhaHash ? '✅ Senha configurada neste navegador.' : 'ℹ️ Nenhuma senha configurada.'; }
function verificarBloqueio() {
  const lock = document.getElementById('lock-screen'); if (!lock || !cfg.senhaHash || sessionStorage.getItem('ff_desbloqueado') === '1') return;
  lock.style.display = 'flex'; document.body.style.overflow = 'hidden';
}
async function desbloquearApp() {
  const erro = document.getElementById('erro-acesso');
  if (await hashSenha(v('senha-acesso')) !== cfg.senhaHash) { if (erro) erro.textContent = 'Senha incorreta.'; return; }
  sessionStorage.setItem('ff_desbloqueado', '1'); document.getElementById('lock-screen').style.display = 'none'; document.body.style.overflow = '';
}

// ══════════════════════════════════════════════
//  RELATÓRIO PDF
// ══════════════════════════════════════════════
function baixarRelatorioPDF() {
  const PDF = window.jspdf && window.jspdf.jsPDF;
  if (!PDF) return notif('Biblioteca PDF não carregada. Atualize a página.', 'err');
  const doc = new PDF({ unit: 'mm', format: 'a4' }); let y = 16; const margem = 14;
  const reais = n => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const linha = (texto, tamanho = 9, cor = [31,41,55]) => { doc.setFontSize(tamanho); doc.setTextColor(...cor); const ls = doc.splitTextToSize(String(texto), 182); if (y + ls.length * 5 > 282) { doc.addPage(); y = 16; } doc.text(ls, margem, y); y += ls.length * 5; };
  const titulo = texto => { y += 3; linha(texto, 13, [37,99,235]); y += 2; };
  const rs = bd.recebiveis || [], despesas = bd.despesas || [], fixas = bd.fixos.filter(f => f.tipo === 'despesa');
  const totalRec = rs.reduce((s,r) => s + Number(r.valor||0), 0), recebido = rs.filter(r=>r.pago).reduce((s,r)=>s+Number(r.valor||0),0), totalDesp = despesas.reduce((s,d)=>s+Number(d.valor||0),0) + fixas.reduce((s,d)=>s+Number(d.valor||0),0);
  doc.setFillColor(37,99,235); doc.rect(0,0,210,10,'F');
  linha('Finanças Família — Relatório completo', 16, [37,99,235]); linha(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 8, [100,116,139]);
  titulo('Resumo financeiro'); linha(`Recebíveis previstos: ${reais(totalRec)} | Recebido: ${reais(recebido)} | Em aberto: ${reais(totalRec-recebido)}`); linha(`Despesas manuais registradas: ${reais(totalDesp)}`);
  titulo('Recebíveis do terreno'); rs.forEach(r => linha(`${r.data} — ${r.desc} — ${reais(r.valor)} — ${r.pago ? 'Recebido' : 'Em aberto'}`, 8));
  titulo('Despesas registradas'); if (!despesas.length && !fixas.length) linha('Nenhuma despesa registrada.', 9, [100,116,139]); despesas.forEach(d => linha(`${d.data||'—'} — ${d.desc} — ${reais(d.valor)} — ${CDESP[d.cat]||d.cat||'Sem categoria'} — ${nomeMem(d.membro)}`, 8));
  fixas.forEach(d => linha(`Fixa mensal — ${d.desc} — ${reais(d.valor)} — ${CDESP[d.cat]||d.cat||'Sem categoria'} — ${nomeMem(d.membro)}`, 8));
  titulo('Dívidas importadas da planilha'); (bd.dividas||[]).forEach(d => linha(`${d.nome} — Valor com desconto: ${reais(d.valorAtual)} — À vista informado: ${reais(d.valorAtual)}`, 8));
  linha('Observação: os valores foram importados da planilha Controle_Dividas_Apresentacao.xlsx e devem ser conferidos antes de decisões financeiras.', 8, [100,116,139]);
  doc.save(`relatorio-financas-familia-${new Date().toISOString().slice(0,10)}.pdf`); notif('📄 Relatório PDF baixado.', 'ok');
}

// ══════════════════════════════════════════════
//  NAVEGAÇÃO ENTRE TELAS
// ══════════════════════════════════════════════
function ir(id, el, bi) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('on'));
  const target = document.getElementById('s-' + id);
  if (target) target.classList.add('on');

  document.querySelectorAll('.nb').forEach(b => b.classList.remove('on'));
  if (el) el.classList.add('on');

  document.querySelectorAll('.bb').forEach((b, i) => b.classList.toggle('on', i === bi));
  window.scrollTo(0, 0);

  if (id === 'fixos') { renderFixos(); renderExcFixos(); }
  if (id === 'pagar') renderPagar();
  if (id === 'relatorio') { renderOrc(); renderExcResumo(); renderPorMembro(); }
  if (id === 'metas') renderMetas();
}

function mudarMes(val) {
  const mesVal = val === undefined ? document.getElementById('selMes')?.value : val;
  const anoVal = document.getElementById('selAno')?.value;
  mes = Number.isFinite(parseInt(mesVal, 10)) ? parseInt(mesVal, 10) : mes;
  if (Number.isFinite(parseInt(anoVal, 10))) ano = parseInt(anoVal, 10);
  renderTudo();
}

function mudarAno(val) {
  const anoVal = val === undefined ? document.getElementById('selAno')?.value : val;
  ano = Number.isFinite(parseInt(anoVal, 10)) ? parseInt(anoVal, 10) : ano;
  renderTudo();
}

function setTog(t) {
  togAtivo = t;
  document.getElementById('form-r').style.display = t === 'r' ? 'block' : 'none';
  document.getElementById('form-d').style.display = t === 'd' ? 'block' : 'none';
  document.getElementById('tog-r').className = 'tb' + (t === 'r' ? ' tr' : '');
  document.getElementById('tog-d').className = 'tb' + (t === 'd' ? ' td' : '');
}

function setFil(f, btn) {
  filtro = f;
  document.querySelectorAll('.fb').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  renderLanc();
}

// ══════════════════════════════════════════════
//  BACKUP E RESTAURAÇÃO
// ══════════════════════════════════════════════
function exportar() {
  const dados = { bd, cfg, versao: '3.0' };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `financas_familia_${MESES[mes]}_${ano}.json`;
  a.click();
  URL.revokeObjectURL(url);
  notif('📤 Backup exportado com sucesso!', 'ok');
}

function importar(e) {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = ev => {
    try {
      const d = JSON.parse(ev.target.result);
      if (d.bd) {
        bd = d.bd;
        if (!bd.pagamentos) bd.pagamentos = {};
        if (!bd.recebiveis) bd.recebiveis = [];
        if (!bd.dividas) bd.dividas = [];
        if (d.cfg) {
          if (!d.cfg.membros && (d.cfg.pai || d.cfg.mae)) {
            cfg.membros = [
              { id: 'pai', nome: d.cfg.pai || 'Pai', icone: '👨', rendaMensal: d.cfg.sp || 5000, cor: '#3a7bd5' },
              { id: 'mae', nome: d.cfg.mae || 'Mãe', icone: '👩', rendaMensal: d.cfg.sm || 4000, cor: '#e94560' },
              { id: 'filho', nome: d.cfg.filho || 'Filho', icone: '👦', rendaMensal: d.cfg.mf || 200, cor: '#f7971e' },
              { id: 'familia', nome: 'Família (Conjunto)', icone: '👨‍👩‍👦', rendaMensal: 0, cor: '#38ef7d' }
            ];
            if (d.cfg.orc) cfg.orc = { ...cfg.orc, ...d.cfg.orc };
          } else {
            cfg = { ...cfg, ...d.cfg };
          }
        }
        salvarBD();
        salvarCfg();
        renderTudo();
        notif('📥 Dados importados com sucesso!', 'ok');
      }
    } catch (err) {
      notif('Arquivo de backup inválido!', 'err');
    }
  };
  r.readAsText(f);
}

function limparTudo() {
  if (confirm('⚠️ ATENÇÃO: Deseja apagar TODOS os lançamentos e configurações?\nEssa ação não pode ser desfeita!')) {
    bd = { receitas: [], despesas: [], fixos: [], metas: [], pagamentos: {}, recebiveis: [], dividas: [] };
    localStorage.removeItem('ff_excel_seed_v1');
    salvarBD();
    renderTudo();
    notif('🗑️ Dados limpos com sucesso!', 'ok');
  }
}

// ══════════════════════════════════════════════
//  NOTIFICAÇÕES FLUTUANTES TOAST
// ══════════════════════════════════════════════
function notif(msg, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = 'notif ' + (tipo === 'ok' ? 'nok' : tipo === 'info' ? 'ninfo' : 'nerr');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
