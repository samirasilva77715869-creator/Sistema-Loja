import React, { useEffect, useMemo, useRef, useState } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  limit
} from 'firebase/firestore';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  DollarSign,
  ShoppingBag,
  Users,
  Settings,
  ShieldCheck,
  Store,
  LogOut,
  Plus,
  Search,
  Printer,
  CheckCircle2,
  AlertTriangle,
  X,
  Trash2,
  Edit3,
  RotateCcw,
  Barcode,
  Layers,
  ArrowUpRight,
  Activity,
  Check,
  Lock,
  Menu
} from 'lucide-react';

// ============================================================================
// 1. CONFIGURAÇÃO DO FIREBASE (PROJETO: sistemaloja-232f1)
// ============================================================================
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const FALLBACK_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDVrcLxpCrT-MplN17tGzAzOJpa5iAiVBM",
  authDomain: "sistemaloja-232f1.firebaseapp.com",
  projectId: "sistemaloja-232f1",
  storageBucket: "sistemaloja-232f1.firebasestorage.app",
  messagingSenderId: "865838406214",
  appId: "1:865838406214:web:d5e86529f0aafe67ae4847",
  measurementId: "G-8JWBR4ZZ0Y"
};
function resolveFirebaseConfig() {
  try {
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      const parsed =
        typeof __firebase_config === 'string'
          ? JSON.parse(__firebase_config)
          : __firebase_config;
      if (parsed && typeof parsed === 'object' && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Falha ao ler __firebase_config, usando configuração do projeto.', e);
  }

  const envConfig = {
    apiKey: import.meta?.env?.VITE_FIREBASE_API_KEY,
    authDomain: import.meta?.env?.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta?.env?.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta?.env?.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta?.env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta?.env?.VITE_FIREBASE_APP_ID
  };

  if (envConfig.apiKey && envConfig.projectId) {
    return envConfig;
  }

  return FALLBACK_FIREBASE_CONFIG;
}

const firebaseConfig = resolveFirebaseConfig();
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const APP_ID =
  typeof __app_id !== 'undefined' && __app_id
    ? String(__app_id).replace(/[^a-zA-Z0-9_-]/g, '_')
    : 'sistemaloja_232f1_erp';

const getPublicCol = (colName) =>
  collection(db, 'artifacts', APP_ID, 'public', 'data', colName);

const getPublicDoc = (colName, docId) =>
  doc(db, 'artifacts', APP_ID, 'public', 'data', colName, docId);

// ============================================================================
// 2. CONSTANTES E HELPERS SEGUROS
// ============================================================================
const DEFAULT_STORE_CONFIG = {
  nomeFantasia: 'Minha Loja & ERP',
  razaoSocial: 'Comércio Varejista Ltda',
  cnpj: '00.000.000/0001-00',
  telefone: '(11) 99999-9999',
  endereco: 'Rua Principal, 100 - Centro',
  chavePix: 'financeiro@minhaloja.com.br',
  mensagemRodape: 'Obrigado pela preferência! Comprovante não fiscal.',
  larguraCupom: '80mm',
  impressaoAutomatica: false
};

const DEFAULT_DEMO_ADMIN = {
  id: 'admin-demo-pin',
  nome: 'Administrador Demo',
  cargo: 'Administrador',
  pin: '0000',
  status: 'Ativo',
  isDemo: true
};

const safeArr = (v) => (Array.isArray(v) ? v : []);
const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const formatBRL = (value) =>
  safeNum(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

const formatDateTime = (isoOrDate) => {
  if (!isoOrDate) return '-';
  try {
    const d = new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return String(isoOrDate);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(isoOrDate);
  }
};

function generateEAN13() {
  let base12 = '789';
  for (let i = 0; i < 9; i++) {
    base12 += Math.floor(Math.random() * 10);
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(base12[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return base12 + String(checkDigit);
}

function sortByDateDesc(list, field = 'dataHora') {
  return [...safeArr(list)].sort((a, b) => {
    const ta = new Date(a?.[field] || a?.criadoEm || 0).getTime() || 0;
    const tb = new Date(b?.[field] || b?.criadoEm || 0).getTime() || 0;
    return tb - ta;
  });
}

// ============================================================================
// 3. ERROR BOUNDARY GLOBAL (NUNCA DEIXA TELA BRANCA)
// ============================================================================
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Ocorreu um erro inesperado na interface.'
    };
  }

  componentDidCatch(error, info) {
    console.error('Erro capturado pelo ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold">Recuperação de Tela</h2>
            </div>
            <p className="text-sm text-slate-300">{this.state.errorMessage}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm transition-colors"
            >
              Recarregar Aplicação
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================================
// 4. IMPRESSÃO DE CUPOM TÉRMICO (58mm / 80mm)
// ============================================================================
function buildReceiptHtml(receipt, storeConfig) {
  const cfg = { ...DEFAULT_STORE_CONFIG, ...(storeConfig || {}) };
  const widthCss = cfg.larguraCupom === '58mm' ? '58mm' : '80mm';
  const itens = safeArr(receipt?.itens);
  const codigo = String(receipt?.id || Date.now()).slice(-6).toUpperCase();

  const rowsHtml = itens
    .map(
      (item) => `
      <tr>
        <td colspan="3" style="padding-top:4px;font-weight:700;">
          ${item.produtoNome || 'Item'} ${item.tamanho ? `[${item.tamanho}]` : ''} ${item.cor ? `(${item.cor})` : ''}
        </td>
      </tr>
      <tr>
        <td>${safeNum(item.quantidade)} x ${formatBRL(item.precoUnitario)}</td>
        <td></td>
        <td style="text-align:right;font-weight:700;">${formatBRL(item.subtotal)}</td>
      </tr>
    `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Cupom #${codigo}</title>
<style>
  @page { size: ${widthCss} auto; margin: 2mm; }
  body {
    font-family: 'Courier New', Courier, monospace;
    width: ${widthCss};
    margin: 0 auto;
    padding: 4px;
    color: #000;
    font-size: 11px;
    line-height: 1.35;
  }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .line { border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  .tot-row td { padding-top: 2px; }
  .grand-total td { font-size: 13px; font-weight: 700; padding-top: 4px; }
</style>
</head>
<body>
  <div class="center bold" style="font-size:13px;">${cfg.nomeFantasia}</div>
  <div class="center">${cfg.razaoSocial}</div>
  <div class="center">CNPJ: ${cfg.cnpj}</div>
  <div class="center">${cfg.endereco}</div>
  <div class="center">Tel: ${cfg.telefone}</div>
  <div class="line"></div>
  <div><strong>COMPROVANTE #${codigo}</strong></div>
  <div>Data: ${formatDateTime(receipt?.dataHora)}</div>
  <div>Operador: ${receipt?.usuarioNome || 'Caixa'}</div>
  <div>Cliente: ${receipt?.clienteNome || 'Consumidor Final'}</div>
  ${receipt?.clienteDoc ? `<div>CPF/CNPJ: ${receipt.clienteDoc}</div>` : ''}
  <div class="line"></div>
  <table>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="line"></div>
  <table>
    <tbody>
      <tr class="tot-row">
        <td>Subtotal:</td>
        <td style="text-align:right;">${formatBRL(receipt?.subtotal ?? receipt?.total)}</td>
      </tr>
      ${
        safeNum(receipt?.desconto) > 0
          ? `<tr class="tot-row"><td>Desconto:</td><td style="text-align:right;">-${formatBRL(receipt.desconto)}</td></tr>`
          : ''
      }
      <tr class="grand-total">
        <td>TOTAL:</td>
        <td style="text-align:right;">${formatBRL(receipt?.total)}</td>
      </tr>
      <tr class="tot-row">
        <td>Pagamento:</td>
        <td style="text-align:right;">${receipt?.formaPagamento || 'PIX'}</td>
      </tr>
      ${
        safeNum(receipt?.troco) > 0
          ? `<tr class="tot-row"><td>Troco:</td><td style="text-align:right;">${formatBRL(receipt.troco)}</td></tr>`
          : ''
      }
    </tbody>
  </table>
  ${
    cfg.chavePix
      ? `<div class="line"></div><div class="center">PIX: ${cfg.chavePix}</div>`
      : ''
  }
  <div class="line"></div>
  <div class="center">${cfg.mensagemRodape}</div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 150);
    };
  </script>
</body>
</html>`;
}

// ============================================================================
// 5. COMPONENTE PRINCIPAL DO SISTEMA (APP)
// ============================================================================
export default function App() {
  return (
    <GlobalErrorBoundary>
      <ErpPdvSystem />
    </GlobalErrorBoundary>
  );
}

function ErpPdvSystem() {
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');

  const [usuarios, setUsuarios] = useState([DEFAULT_DEMO_ADMIN]);
  const [currentOperator, setCurrentOperator] = useState(null);
  const [publicMode, setPublicMode] = useState('erp'); // 'erp' | 'storefront'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [storeConfig, setStoreConfig] = useState(DEFAULT_STORE_CONFIG);
  const [produtos, setProdutos] = useState([]);
  const [variacoes, setVariacoes] = useState([]);
  const [caixas, setCaixas] = useState([]);
  const [movimentacoesCaixa, setMovimentacoesCaixa] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [pedidosOnline, setPedidosOnline] = useState([]);
  const [logsAuditoria, setLogsAuditoria] = useState([]);

  const [receiptModalData, setReceiptModalData] = useState(null);
  const [toasts, setToasts] = useState([]);
  const printFrameRef = useRef(null);

  const showToast = (message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...safeArr(prev), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => safeArr(prev).filter((t) => t.id !== id));
    }, 3800);
  };

  const handleDbError = (contexto, err) => {
    console.error(`Erro no Firestore (${contexto}):`, err);
    if (err?.code === 'permission-denied') {
      showToast(
        `Permissão negada no Firestore em ${contexto}. Verifique as regras de segurança do banco.`,
        'error'
      );
    } else {
      showToast(`Falha ao salvar/atualizar (${contexto}). Tente novamente.`, 'error');
    }
  };

  // --------------------------------------------------------------------------
  // 6. AUTENTICAÇÃO ANÔNIMA / CUSTOM TOKEN NO FIREBASE
  // --------------------------------------------------------------------------
  useEffect(() => {
    let active = true;

    const unsub = onAuthStateChanged(auth, (user) => {
      if (!active) return;
      if (user) {
        setAuthReady(true);
        setAuthError('');
      }
    });

    (async () => {
      try {
        if (auth.currentUser) {
          if (active) setAuthReady(true);
          return;
        }
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
        if (active) setAuthReady(true);
      } catch (err) {
        console.error('Erro na autenticação Firebase:', err);
        if (active) {
          setAuthError(
            'Não foi possível autenticar no Firebase. Ative Anonymous Auth no console do projeto sistemaloja-232f1.'
          );
          setAuthReady(true);
        }
      }
    })();

    return () => {
      active = false;
      unsub();
    };
  }, []);

  // --------------------------------------------------------------------------
  // 7. ASSINATURAS EM TEMPO REAL NO FIRESTORE (SOMENTE APÓS AUTH)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!authReady || !auth.currentUser) return;

    const unsubs = [];

    unsubs.push(
      onSnapshot(
        getPublicDoc('configuracoes_loja', 'principal'),
        (snap) => {
          if (snap.exists()) {
            setStoreConfig({ ...DEFAULT_STORE_CONFIG, ...snap.data() });
          }
        },
        (err) => console.warn('Erro ao ler configuracoes_loja:', err)
      )
    );

    unsubs.push(
      onSnapshot(
        query(getPublicCol('usuarios'), limit(100)),
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          const hasAdminAtivo = list.some(
            (u) => u.cargo === 'Administrador' && u.status === 'Ativo'
          );
          setUsuarios(hasAdminAtivo ? list : [DEFAULT_DEMO_ADMIN, ...list]);
        },
        (err) => console.warn('Erro ao ler usuarios:', err)
      )
    );

    unsubs.push(
      onSnapshot(
        query(getPublicCol('produtos'), limit(300)),
        (snap) => {
          setProdutos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        },
        (err) => console.warn('Erro ao ler produtos:', err)
      )
    );

    unsubs.push(
      onSnapshot(
        query(getPublicCol('variacoes'), limit(800)),
        (snap) => {
          setVariacoes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        },
        (err) => console.warn('Erro ao ler variacoes:', err)
      )
    );

    unsubs.push(
      onSnapshot(
        query(getPublicCol('caixas'), limit(100)),
        (snap) => {
          setCaixas(sortByDateDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })), 'aberturaData'));
        },
        (err) => console.warn('Erro ao ler caixas:', err)
      )
    );

    unsubs.push(
      onSnapshot(
        query(getPublicCol('movimentacoes_caixa'), limit(400)),
        (snap) => {
          setMovimentacoesCaixa(
            sortByDateDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })), 'dataHora')
          );
        },
        (err) => console.warn('Erro ao ler movimentacoes_caixa:', err)
      )
    );

    unsubs.push(
      onSnapshot(
        query(getPublicCol('vendas'), limit(400)),
        (snap) => {
          setVendas(sortByDateDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })), 'dataHora'));
        },
        (err) => console.warn('Erro ao ler vendas:', err)
      )
    );

    unsubs.push(
      onSnapshot(
        query(getPublicCol('despesas'), limit(300)),
        (snap) => {
          setDespesas(sortByDateDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })), 'data'));
        },
        (err) => console.warn('Erro ao ler despesas:', err)
      )
    );

    unsubs.push(
      onSnapshot(
        query(getPublicCol('pedidos_online'), limit(300)),
        (snap) => {
          setPedidosOnline(
            sortByDateDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })), 'dataHora')
          );
        },
        (err) => console.warn('Erro ao ler pedidos_online:', err)
      )
    );

    unsubs.push(
      onSnapshot(
        query(getPublicCol('logs_auditoria'), limit(200)),
        (snap) => {
          setLogsAuditoria(
            sortByDateDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })), 'dataHora')
          );
        },
        (err) => console.warn('Erro ao ler logs_auditoria:', err)
      )
    );

    return () => {
      for (const fn of unsubs) {
        try {
          fn();
        } catch {
          // ignora erro ao limpar listener
        }
      }
    };
  }, [authReady]);

  // --------------------------------------------------------------------------
  // 8. AUDITORIA E IMPRESSÃO TÉRMICA
  // --------------------------------------------------------------------------
  const registrarAuditoria = async (acao, detalhes) => {
    if (!auth.currentUser) return;
    try {
      await addDoc(getPublicCol('logs_auditoria'), {
        acao: String(acao || 'Ação'),
        detalhes: String(detalhes || ''),
        usuarioId: currentOperator?.id || 'sistema',
        usuarioNome: currentOperator?.nome || 'Sistema/Visitante',
        dataHora: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Falha ao registrar log de auditoria:', err);
    }
  };

  const triggerThermalPrint = (receiptData) => {
    setReceiptModalData(receiptData);
    setTimeout(() => {
      try {
        const html = buildReceiptHtml(receiptData, storeConfig);
        if (printFrameRef.current) {
          const docFrame =
            printFrameRef.current.contentDocument ||
            printFrameRef.current.contentWindow?.document;
          if (docFrame) {
            docFrame.open();
            docFrame.write(html);
            docFrame.close();
            setTimeout(() => {
              try {
                printFrameRef.current.contentWindow?.focus();
                printFrameRef.current.contentWindow?.print();
              } catch {
                window.print();
              }
            }, 200);
            return;
          }
        }
        const win = window.open('', '_blank', 'width=380,height=600');
        if (win) {
          win.document.write(html);
          win.document.close();
        }
      } catch (err) {
        console.warn('Impressão direta indisponível, use o modal de cupom:', err);
      }
    }, 80);
  };

  const caixaAberto = useMemo(
    () => safeArr(caixas).find((c) => c && c.status === 'Aberto') || null,
    [caixas]
  );

  const isAdmin = currentOperator?.cargo === 'Administrador';

  useEffect(() => {
    if (!currentOperator) return;
    const adminOnlyTabs = ['usuarios', 'configuracoes'];
    if (!isAdmin && adminOnlyTabs.includes(activeTab)) {
      setActiveTab('dashboard');
      showToast('Acesso restrito ao Administrador.', 'error');
    }
  }, [isAdmin, activeTab, currentOperator]);

  // --------------------------------------------------------------------------
  // 9. TELA DE BLOQUEIO POR PIN OU VITRINE PÚBLICA
  // --------------------------------------------------------------------------
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-3 p-6">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-300">Conectando ao sistema em nuvem...</p>
      </div>
    );
  }

  if (publicMode === 'storefront') {
    return (
      <>
        <StorefrontView
          storeConfig={storeConfig}
          produtos={produtos}
          variacoes={variacoes}
          onBackToErp={() => setPublicMode('erp')}
          showToast={showToast}
          registrarAuditoria={registrarAuditoria}
        />
        <ToastContainer toasts={toasts} />
      </>
    );
  }

  if (!currentOperator) {
    return (
      <>
        <PinLockScreen
          storeConfig={storeConfig}
          usuarios={usuarios}
          authError={authError}
          onUnlock={(user) => {
            setCurrentOperator(user);
            setActiveTab('dashboard');
            showToast(`Bem-vindo(a), ${user.nome}!`, 'success');
          }}
          onOpenStorefront={() => setPublicMode('storefront')}
        />
        <ToastContainer toasts={toasts} />
      </>
    );
  }

  // --------------------------------------------------------------------------
  // 10. SHELL PRINCIPAL DO ERP / PDV
  // --------------------------------------------------------------------------
  const navItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard, adminOnly: false },
    { id: 'pdv', label: 'Frente de Caixa (PDV)', icon: ShoppingCart, adminOnly: false },
    { id: 'produtos', label: 'Produtos e Estoque', icon: Package, adminOnly: false },
    { id: 'financeiro', label: 'Controle Financeiro', icon: DollarSign, adminOnly: false },
    {
      id: 'pedidos_online',
      label: 'Pedidos Online',
      icon: ShoppingBag,
      adminOnly: false,
      badge: safeArr(pedidosOnline).filter((p) => p?.status === 'Pendente').length
    },
    { id: 'usuarios', label: 'Equipe e Acessos', icon: Users, adminOnly: true },
    { id: 'configuracoes', label: 'Configurações da Loja', icon: Settings, adminOnly: true },
    { id: 'status_sistema', label: 'Status e Integrações', icon: ShieldCheck, adminOnly: false }
  ].filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row">
      <iframe
        ref={printFrameRef}
        title="Impressão Térmica"
        className="hidden"
        aria-hidden="true"
      />

      <div className="lg:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="truncate">
            <p className="font-bold text-sm truncate">{storeConfig.nomeFantasia}</p>
            <p className="text-[11px] text-emerald-400 truncate">
              {currentOperator.nome} • {currentOperator.cargo}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPublicMode('storefront')}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold flex items-center gap-1"
          >
            <Store className="w-3.5 h-3.5" />
            Loja
          </button>
          <button
            type="button"
            onClick={() => setCurrentOperator(null)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-200"
            title="Bloquear / Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } lg:flex lg:flex-col lg:w-64 bg-slate-900 text-slate-200 shrink-0 lg:min-h-screen lg:sticky lg:top-0`}
      >
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-white text-sm truncate">{storeConfig.nomeFantasia}</h1>
              <p className="text-[11px] text-slate-400 truncate">ERP + PDV + Loja Virtual</p>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700/70">
            <p className="text-xs font-semibold text-white truncate">{currentOperator.nome}</p>
            <p className="text-[11px] text-emerald-400">{currentOperator.cargo}</p>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Caixa:</span>
              {caixaAberto ? (
                <span className="text-emerald-400 font-semibold">● Aberto</span>
              ) : (
                <span className="text-rose-400 font-semibold">○ Fechado</span>
              )}
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge > 0 && (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-500 text-slate-950">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-1.5">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              setPublicMode('storefront');
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors"
          >
            <Store className="w-4 h-4" />
            Abrir Loja Virtual Pública
          </button>
          <button
            type="button"
            onClick={() => setCurrentOperator(null)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-600/90 text-slate-300 hover:text-white text-xs font-medium transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            Bloquear Tela (PIN)
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {activeTab === 'dashboard' && (
          <DashboardView
            vendas={vendas}
            variacoes={variacoes}
            despesas={despesas}
            pedidosOnline={pedidosOnline}
            logsAuditoria={logsAuditoria}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'pdv' && (
          <PdvView
            produtos={produtos}
            variacoes={variacoes}
            vendas={vendas}
            caixaAberto={caixaAberto}
            currentOperator={currentOperator}
            storeConfig={storeConfig}
            showToast={showToast}
            registrarAuditoria={registrarAuditoria}
            triggerThermalPrint={triggerThermalPrint}
            setActiveTab={setActiveTab}
            onDbError={handleDbError}
          />
        )}

        {activeTab === 'produtos' && (
          <ProdutosEstoqueView
            produtos={produtos}
            variacoes={variacoes}
            isAdmin={isAdmin}
            currentOperator={currentOperator}
            showToast={showToast}
            registrarAuditoria={registrarAuditoria}
            onDbError={handleDbError}
          />
        )}

        {activeTab === 'financeiro' && (
          <FinanceiroView
            caixas={caixas}
            caixaAberto={caixaAberto}
            movimentacoesCaixa={movimentacoesCaixa}
            vendas={vendas}
            despesas={despesas}
            currentOperator={currentOperator}
            showToast={showToast}
            registrarAuditoria={registrarAuditoria}
            onDbError={handleDbError}
          />
        )}

        {activeTab === 'pedidos_online' && (
          <PedidosOnlineAdminView
            pedidosOnline={pedidosOnline}
            variacoes={variacoes}
            currentOperator={currentOperator}
            showToast={showToast}
            registrarAuditoria={registrarAuditoria}
            triggerThermalPrint={triggerThermalPrint}
            onDbError={handleDbError}
          />
        )}

        {activeTab === 'usuarios' && isAdmin && (
          <UsuariosView
            usuarios={usuarios}
            currentOperator={currentOperator}
            isAdmin={isAdmin}
            showToast={showToast}
            registrarAuditoria={registrarAuditoria}
            onDbError={handleDbError}
          />
        )}

        {activeTab === 'configuracoes' && isAdmin && (
          <ConfiguracoesLojaView
            storeConfig={storeConfig}
            currentOperator={currentOperator}
            showToast={showToast}
            registrarAuditoria={registrarAuditoria}
            onDbError={handleDbError}
          />
        )}

        {activeTab === 'status_sistema' && <StatusSistemaView />}
      </main>

      {receiptModalData && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setReceiptModalData(null)}
        >
          <div
            className="bg-white text-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm">
                  Comprovante #{String(receiptModalData.id || '').slice(-6).toUpperCase()}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModalData(null)}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-amber-50/60 border border-dashed border-slate-300 rounded-xl p-3.5 font-mono text-xs space-y-2 max-h-80 overflow-y-auto">
              <div className="text-center font-bold">{storeConfig.nomeFantasia}</div>
              <div className="text-center text-[11px] text-slate-600">{storeConfig.endereco}</div>
              <div className="border-t border-dashed border-slate-300 pt-2">
                {safeArr(receiptModalData.itens).map((item, idx) => (
                  <div key={idx} className="flex justify-between gap-2 py-0.5">
                    <span className="truncate">
                      {safeNum(item.quantidade)}x {item.produtoNome} ({item.tamanho}/{item.cor})
                    </span>
                    <span className="font-semibold shrink-0">{formatBRL(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
                {safeNum(receiptModalData.desconto) > 0 && (
                  <div className="flex justify-between text-rose-700">
                    <span>Desconto:</span>
                    <span>-{formatBRL(receiptModalData.desconto)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm">
                  <span>TOTAL:</span>
                  <span>{formatBRL(receiptModalData.total)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Pagamento:</span>
                  <span>{receiptModalData.formaPagamento || 'PIX'}</span>
                </div>
                {safeNum(receiptModalData.troco) > 0 && (
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Troco:</span>
                    <span>{formatBRL(receiptModalData.troco)}</span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              Comprovante interno não fiscal ({storeConfig.larguraCupom || '80mm'}).
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => triggerThermalPrint(receiptModalData)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Imprimir Novamente
              </button>
              <button
                type="button"
                onClick={() => setReceiptModalData(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}

// ============================================================================
// TELA DE LOGIN POR PIN DE 4 DÍGITOS
// ============================================================================
function PinLockScreen({
  storeConfig,
  usuarios,
  authError,
  onUnlock,
  onOpenStorefront
}) {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleDigit = (digit) => {
    setErrorMsg('');
    if (pin.length < 4) {
      const next = pin + digit;
      setPin(next);
      if (next.length === 4) {
        verifyPin(next);
      }
    }
  };

  const handleBackspace = () => {
    setErrorMsg('');
    setPin((prev) => prev.slice(0, -1));
  };

  const verifyPin = (candidatePin) => {
    const clean = String(candidatePin || '').trim();
    const list = safeArr(usuarios);
    const matched = list.find((u) => String(u.pin || '').trim() === clean);

    if (!matched) {
      setErrorMsg('PIN não encontrado. Verifique os 4 dígitos.');
      setTimeout(() => setPin(''), 450);
      return;
    }

    if (matched.status === 'Bloqueado') {
      setErrorMsg(`Acesso bloqueado para ${matched.nome}. Fale com o Administrador.`);
      setTimeout(() => setPin(''), 450);
      return;
    }

    onUnlock(matched);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    verifyPin(pin);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6">
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <span className="text-xs font-semibold text-emerald-400">
          {storeConfig.nomeFantasia}
        </span>
        <button
          type="button"
          onClick={onOpenStorefront}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-300 flex items-center gap-1.5 border border-slate-700"
        >
          <Store className="w-3.5 h-3.5" />
          Ver Loja Virtual
        </button>
      </div>

      <div className="max-w-sm w-full mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 my-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold">Acesso Operacional (PIN)</h1>
          <p className="text-xs text-slate-400">
            Digite seu PIN de 4 dígitos para entrar no ERP e PDV
          </p>
        </div>

        {authError && (
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs">
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-12 h-14 rounded-2xl border flex items-center justify-center text-2xl font-bold ${
                  pin.length > idx
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-700 bg-slate-950 text-slate-600'
                }`}
              >
                {pin.length > idx ? '•' : ''}
              </div>
            ))}
          </div>

          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 4);
              setErrorMsg('');
              setPin(v);
              if (v.length === 4) verifyPin(v);
            }}
            placeholder="0000"
            aria-label="PIN de 4 dígitos"
            className="w-full text-center tracking-[0.6em] py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono focus:outline-none focus:border-emerald-500"
          />

          {errorMsg && (
            <p className="text-xs text-rose-400 text-center font-medium">{errorMsg}</p>
          )}

          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDigit(d)}
                className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 font-bold text-base transition-all"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPin('');
                setErrorMsg('');
              }}
              className="py-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-xs font-semibold text-slate-400"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 font-bold text-base transition-all"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="py-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-xs font-semibold text-slate-300"
            >
              Apagar
            </button>
          </div>
        </form>

        <div className="pt-2 border-t border-slate-800 text-center text-[11px] text-slate-400 space-y-1">
          <p>
            PIN inicial de demonstração: <strong className="text-emerald-400">0000</strong>{' '}
            (Administrador Demo)
          </p>
          <p>Cadastre seu PIN próprio em Equipe e Acessos após entrar.</p>
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-500">
        Projeto Firebase: sistemaloja-232f1
      </div>
    </div>
  );
}

// ============================================================================
// 11. VISÃO GERAL / DASHBOARD
// ============================================================================
function DashboardView({
  vendas,
  variacoes,
  despesas,
  pedidosOnline,
  logsAuditoria,
  setActiveTab
}) {
  const hoje = new Date().toISOString().slice(0, 10);

  const vendasValidas = useMemo(
    () => safeArr(vendas).filter((v) => v && v.status !== 'Cancelada' && v.status !== 'Devolvida'),
    [vendas]
  );

  const vendasHoje = useMemo(
    () => vendasValidas.filter((v) => String(v.dataHora || '').startsWith(hoje)),
    [vendasValidas, hoje]
  );

  const faturamentoHoje = vendasHoje.reduce((acc, v) => acc + safeNum(v.total), 0);
  const faturamentoTotal = vendasValidas.reduce((acc, v) => acc + safeNum(v.total), 0);
  const lucroBrutoTotal = vendasValidas.reduce((acc, v) => acc + safeNum(v.lucroEstimado), 0);
  const totalDespesas = safeArr(despesas).reduce((acc, d) => acc + safeNum(d.valor), 0);
  const lucroLiquido = lucroBrutoTotal - totalDespesas;

  const estoqueBaixo = useMemo(() => {
    return safeArr(variacoes).filter((v) => safeNum(v?.estoque) <= safeNum(v?.estoqueMinimo, 2));
  }, [variacoes]);

  const pedidosPendentes = safeArr(pedidosOnline).filter((p) => p?.status === 'Pendente');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Painel de Gestão Comercial</h2>
          <p className="text-sm text-slate-500">Resumo operacional, financeiro e sincronização em tempo real</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pdv')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center gap-2 shadow-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            Abrir Frente de Caixa
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('produtos')}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Vendas Hoje</span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{formatBRL(faturamentoHoje)}</p>
          <p className="text-xs text-slate-500 mt-1">{vendasHoje.length} venda(s) hoje</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Lucro Líquido Estimado</span>
            <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <p className={`text-2xl font-bold mt-2 ${lucroLiquido >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
            {formatBRL(lucroLiquido)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Bruto {formatBRL(faturamentoTotal)} - Despesas {formatBRL(totalDespesas)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Pedidos Online</span>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <ShoppingBag className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{pedidosPendentes.length} pendente(s)</p>
          <p className="text-xs text-slate-500 mt-1">{safeArr(pedidosOnline).length} pedido(s) na vitrine</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Alerta de Estoque</span>
            <span className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{estoqueBaixo.length} variação(ões)</p>
          <p className="text-xs text-slate-500 mt-1">De {safeArr(variacoes).length} variações cadastradas</p>
        </div>
      </div>

      <div className="bg-slate-900 text-slate-200 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
          <div>
            <h3 className="font-semibold text-white text-sm">Transparência Operacional e Integrações</h3>
            <p className="text-xs text-slate-400">
              Banco em nuvem, estoque, PDV, financeiro e loja virtual ativos. Emissão NFC-e/SEFAZ e gateways externos exigem integração própria.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('status_sistema')}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700"
        >
          Ver Status Técnico
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Variações com Estoque Baixo / Zerado
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab('produtos')}
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              Ver Estoque
            </button>
          </div>
          {estoqueBaixo.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              Nenhuma variação com estoque crítico no momento.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {estoqueBaixo.map((v) => (
                <div key={v.id} className="py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-slate-800">{v.produtoNome}</p>
                    <p className="text-xs text-slate-500">
                      Tam: <strong>{v.tamanho}</strong> • Cor: <strong>{v.cor}</strong> • SKU: {v.sku || '-'}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      safeNum(v.estoque) === 0
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {safeNum(v.estoque)} un
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            Últimas Atividades (Auditoria)
          </h3>
          {safeArr(logsAuditoria).length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">Nenhum registro de auditoria ainda.</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {safeArr(logsAuditoria).slice(0, 8).map((log) => (
                <div key={log.id} className="py-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{log.acao}</span>
                    <span className="text-slate-400">{formatDateTime(log.dataHora)}</span>
                  </div>
                  <p className="text-slate-600 mt-0.5">{log.detalhes}</p>
                  <span className="text-[11px] text-slate-400">Por: {log.usuarioNome}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 12. FRENTE DE CAIXA (PDV) COM GRADE, CÓDIGO DE BARRAS E IMPRESSÃO TÉRMICA
// ============================================================================
function PdvView({
  produtos,
  variacoes,
  vendas,
  caixaAberto,
  currentOperator,
  storeConfig,
  showToast,
  registrarAuditoria,
  triggerThermalPrint,
  setActiveTab,
  onDbError
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [desconto, setDesconto] = useState(0);
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [valorRecebido, setValorRecebido] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteDoc, setClienteDoc] = useState('');
  const [processandoVenda, setProcessandoVenda] = useState(false);

  const [selectedProdutoForMatrix, setSelectedProdutoForMatrix] = useState(null);
  const [showHistoricoVendas, setShowHistoricoVendas] = useState(false);

  const produtosAtivos = useMemo(
    () => safeArr(produtos).filter((p) => p && p.ativo !== false),
    [produtos]
  );

  const variacoesPorProduto = useMemo(() => {
    const map = {};
    for (const v of safeArr(variacoes)) {
      if (!v || !v.produtoId) continue;
      if (!map[v.produtoId]) map[v.produtoId] = [];
      map[v.produtoId].push(v);
    }
    return map;
  }, [variacoes]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return;

      const exactVar = safeArr(variacoes).find(
        (v) =>
          String(v.codigoBarras || '').toLowerCase() === term ||
          String(v.sku || '').toLowerCase() === term
      );
      if (exactVar) {
        const prod = produtosAtivos.find((p) => p.id === exactVar.produtoId);
        if (prod) {
          addToCart(prod, exactVar);
          setSearchTerm('');
          return;
        }
      }

      const exactProd = produtosAtivos.find(
        (p) => String(p.codigoBarras || '').toLowerCase() === term
      );
      if (exactProd) {
        handleSelectProduto(exactProd);
        setSearchTerm('');
      }
    }
  };

  const filteredProdutos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return produtosAtivos;
    return produtosAtivos.filter((p) => {
      const matchProd =
        String(p.nome || '').toLowerCase().includes(term) ||
        String(p.categoria || '').toLowerCase().includes(term) ||
        String(p.codigoBarras || '').toLowerCase().includes(term);
      const vars = variacoesPorProduto[p.id] || [];
      const matchVar = vars.some(
        (v) =>
          String(v.codigoBarras || '').toLowerCase().includes(term) ||
          String(v.sku || '').toLowerCase().includes(term) ||
          String(v.cor || '').toLowerCase().includes(term) ||
          String(v.tamanho || '').toLowerCase().includes(term)
      );
      return matchProd || matchVar;
    });
  }, [produtosAtivos, variacoesPorProduto, searchTerm]);

  const handleSelectProduto = (prod) => {
    const vars = variacoesPorProduto[prod.id] || [];
    if (vars.length === 1) {
      addToCart(prod, vars[0]);
    } else if (vars.length > 1) {
      setSelectedProdutoForMatrix(prod);
    } else {
      showToast('Este produto não possui variações cadastradas em estoque.', 'error');
    }
  };

  const addToCart = (prod, variacao) => {
    if (!variacao) return;
    const estoqueDisp = safeNum(variacao.estoque);
    if (estoqueDisp <= 0) {
      showToast(`Sem estoque para ${prod.nome} (${variacao.tamanho}/${variacao.cor}).`, 'error');
      return;
    }

    setCart((prev) => {
      const list = safeArr(prev);
      const idx = list.findIndex((item) => item.variacaoId === variacao.id);
      const precoUnit = safeNum(variacao.precoVenda ?? prod.precoVenda);
      const custoUnit = safeNum(variacao.precoCusto ?? prod.precoCusto);

      if (idx >= 0) {
        const atual = list[idx];
        const novaQtd = atual.quantidade + 1;
        if (novaQtd > estoqueDisp) {
          showToast(`Estoque máximo disponível: ${estoqueDisp} un.`, 'error');
          return list;
        }
        const copia = [...list];
        copia[idx] = {
          ...atual,
          quantidade: novaQtd,
          subtotal: novaQtd * atual.precoUnitario
        };
        return copia;
      }

      return [
        ...list,
        {
          variacaoId: variacao.id,
          produtoId: prod.id,
          produtoNome: prod.nome,
          tamanho: variacao.tamanho || 'Único',
          cor: variacao.cor || 'Padrão',
          sku: variacao.sku || '',
          codigoBarras: variacao.codigoBarras || prod.codigoBarras || '',
          quantidade: 1,
          precoUnitario: precoUnit,
          precoCusto: custoUnit,
          subtotal: precoUnit
        }
      ];
    });

    setSelectedProdutoForMatrix(null);
    showToast(`${prod.nome} (${variacao.tamanho}/${variacao.cor}) adicionado.`, 'success');
  };

  const updateCartQty = (variacaoId, novaQtd) => {
    const vObj = safeArr(variacoes).find((v) => v.id === variacaoId);
    const maxEstoque = vObj ? safeNum(vObj.estoque) : 9999;

    if (novaQtd <= 0) {
      setCart((prev) => safeArr(prev).filter((i) => i.variacaoId !== variacaoId));
      return;
    }

    if (novaQtd > maxEstoque) {
      showToast(`Limite de estoque: ${maxEstoque} unidade(s).`, 'error');
      return;
    }

    setCart((prev) =>
      safeArr(prev).map((item) =>
        item.variacaoId === variacaoId
          ? { ...item, quantidade: novaQtd, subtotal: novaQtd * item.precoUnitario }
          : item
      )
    );
  };

  const subtotalCarrinho = useMemo(
    () => safeArr(cart).reduce((acc, item) => acc + safeNum(item.subtotal), 0),
    [cart]
  );

  const descontoVal = Math.max(0, Math.min(subtotalCarrinho, safeNum(desconto)));
  const totalVenda = Math.max(0, subtotalCarrinho - descontoVal);
  const recebidoVal = safeNum(valorRecebido);
  const trocoVal = formaPagamento === 'Dinheiro' ? Math.max(0, recebidoVal - totalVenda) : 0;

  const handleFinalizarVenda = async (e) => {
    e.preventDefault();
    if (!caixaAberto) {
      showToast('Abra o Caixa antes de registrar uma venda!', 'error');
      return;
    }
    if (safeArr(cart).length === 0) {
      showToast('Adicione ao menos um item ao carrinho.', 'error');
      return;
    }
    if (formaPagamento === 'Dinheiro' && recebidoVal < totalVenda) {
      showToast('Valor recebido em dinheiro é menor que o total da venda.', 'error');
      return;
    }

    setProcessandoVenda(true);
    try {
      for (const item of cart) {
        const vAtual = safeArr(variacoes).find((v) => v.id === item.variacaoId);
        const estoqueAtual = vAtual ? safeNum(vAtual.estoque) : 0;
        const novoEstoque = Math.max(0, estoqueAtual - safeNum(item.quantidade));
        await updateDoc(getPublicDoc('variacoes', item.variacaoId), {
          estoque: novoEstoque
        });
      }

      const custoTotal = safeArr(cart).reduce(
        (acc, i) => acc + safeNum(i.precoCusto) * safeNum(i.quantidade),
        0
      );
      const lucroEstimado = totalVenda - custoTotal;
      const agoraIso = new Date().toISOString();

      const vendaPayload = {
        caixaId: caixaAberto.id,
        usuarioId: currentOperator.id,
        usuarioNome: currentOperator.nome,
        clienteNome: clienteNome.trim() || 'Consumidor Final',
        clienteDoc: clienteDoc.trim(),
        itens: cart,
        subtotal: subtotalCarrinho,
        desconto: descontoVal,
        total: totalVenda,
        custoTotal,
        lucroEstimado,
        formaPagamento,
        valorRecebido: formaPagamento === 'Dinheiro' ? recebidoVal : totalVenda,
        troco: trocoVal,
        origem: 'PDV',
        status: 'Concluída',
        dataHora: agoraIso
      };

      const vendaDocRef = await addDoc(getPublicCol('vendas'), vendaPayload);

      await addDoc(getPublicCol('movimentacoes_caixa'), {
        caixaId: caixaAberto.id,
        tipo: 'Venda',
        formaPagamento,
        valor: totalVenda,
        observacao: `Venda PDV #${vendaDocRef.id.slice(-6).toUpperCase()} - ${vendaPayload.clienteNome}`,
        usuarioId: currentOperator.id,
        usuarioNome: currentOperator.nome,
        dataHora: agoraIso
      });

      await registrarAuditoria(
        'Venda Finalizada (PDV)',
        `Venda #${vendaDocRef.id.slice(-6).toUpperCase()} no valor de ${formatBRL(totalVenda)} (${formaPagamento}).`
      );

      const vendaCompleta = { id: vendaDocRef.id, ...vendaPayload };
      showToast(`Venda de ${formatBRL(totalVenda)} finalizada com sucesso!`, 'success');

      setCart([]);
      setDesconto(0);
      setValorRecebido('');
      setClienteNome('');
      setClienteDoc('');

      if (storeConfig.impressaoAutomatica) {
        triggerThermalPrint(vendaCompleta);
      }
    } catch (err) {
      onDbError('finalização de venda no PDV', err);
    } finally {
      setProcessandoVenda(false);
    }
  };

  const handleDevolverVenda = async (venda) => {
    if (!venda || venda.status === 'Devolvida' || venda.status === 'Cancelada') return;
    try {
      for (const item of safeArr(venda.itens)) {
        if (!item.variacaoId) continue;
        const vAtual = safeArr(variacoes).find((v) => v.id === item.variacaoId);
        if (vAtual) {
          await updateDoc(getPublicDoc('variacoes', item.variacaoId), {
            estoque: safeNum(vAtual.estoque) + safeNum(item.quantidade)
          });
        }
      }

      await updateDoc(getPublicDoc('vendas', venda.id), {
        status: 'Devolvida',
        devolvidoEm: new Date().toISOString(),
        devolvidoPor: currentOperator.nome
      });

      if (caixaAberto) {
        await addDoc(getPublicCol('movimentacoes_caixa'), {
          caixaId: caixaAberto.id,
          tipo: 'Sangria',
          formaPagamento: venda.formaPagamento || 'Caixa',
          valor: safeNum(venda.total),
          observacao: `Estorno/Devolução da venda #${String(venda.id).slice(-6).toUpperCase()}`,
          usuarioId: currentOperator.id,
          usuarioNome: currentOperator.nome,
          dataHora: new Date().toISOString()
        });
      }

      await registrarAuditoria(
        'Devolução / Estorno de Venda',
        `Venda #${String(venda.id).slice(-6).toUpperCase()} (${formatBRL(venda.total)}) estornada e estoque reposto.`
      );
      showToast('Venda devolvida e estoque reposto com sucesso!', 'success');
    } catch (err) {
      onDbError('devolução de venda', err);
    }
  };

  return (
    <div className="space-y-5">
      {!caixaAberto && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <h3 className="font-bold text-rose-900 text-sm">O Caixa está Fechado!</h3>
              <p className="text-xs text-rose-700">
                É obrigatório abrir um turno de caixa antes de registrar vendas no PDV.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('financeiro')}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
          >
            Ir para Controle de Caixa
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Frente de Caixa (PDV)</h2>
          <p className="text-xs text-slate-500">
            {caixaAberto
              ? `Caixa aberto por ${caixaAberto.usuarioNome} em ${formatDateTime(caixaAberto.aberturaData)}`
              : 'Nenhum turno de caixa ativo'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowHistoricoVendas(!showHistoricoVendas)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {showHistoricoVendas ? 'Voltar ao Caixa' : `Vendas / Devoluções (${safeArr(vendas).length})`}
          </button>
        </div>
      </div>

      {showHistoricoVendas ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h3 className="font-bold text-slate-900 text-lg">Histórico de Vendas e Devoluções</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                  <th className="py-3 px-2">Código</th>
                  <th className="py-3 px-2">Data/Hora</th>
                  <th className="py-3 px-2">Cliente</th>
                  <th className="py-3 px-2">Pagamento</th>
                  <th className="py-3 px-2">Total</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {safeArr(vendas).map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="py-3 px-2 font-mono text-xs font-bold">
                      #{String(v.id).slice(-6).toUpperCase()}
                    </td>
                    <td className="py-3 px-2 text-xs text-slate-600">{formatDateTime(v.dataHora)}</td>
                    <td className="py-3 px-2 font-medium">{v.clienteNome || 'Consumidor Final'}</td>
                    <td className="py-3 px-2 text-xs">{v.formaPagamento}</td>
                    <td className="py-3 px-2 font-bold text-slate-900">{formatBRL(v.total)}</td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          v.status === 'Devolvida' || v.status === 'Cancelada'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {v.status || 'Concluída'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => triggerThermalPrint(v)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1"
                        title="Imprimir Cupom"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Cupom
                      </button>
                      {v.status !== 'Devolvida' && v.status !== 'Cancelada' && (
                        <button
                          type="button"
                          onClick={() => handleDevolverVenda(v)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Devolver
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Bipar código de barras, SKU ou buscar produto..."
                className="w-full text-sm focus:outline-none text-slate-800"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {filteredProdutos.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
                Nenhum produto encontrado. Cadastre produtos em <strong>Produtos e Estoque</strong>.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredProdutos.map((prod) => {
                  const vars = variacoesPorProduto[prod.id] || [];
                  const estoqueTotal = vars.reduce((acc, v) => acc + safeNum(v.estoque), 0);
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleSelectProduto(prod)}
                      className="text-left bg-white hover:border-emerald-500 border border-slate-200 rounded-2xl p-4 shadow-sm transition-all flex flex-col justify-between gap-3 group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {prod.categoria || 'Geral'}
                          </span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              estoqueTotal > 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {estoqueTotal} un
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 mt-2 group-hover:text-emerald-700 transition-colors">
                          {prod.nome}
                        </h3>
                        {prod.codigoBarras && (
                          <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                            <Barcode className="w-3.5 h-3.5" />
                            {prod.codigoBarras}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-base font-extrabold text-emerald-700">
                          {formatBRL(prod.precoVenda)}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {vars.length > 1 ? `${vars.length} grades` : 'Adicionar'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                Cupom / Carrinho ({safeArr(cart).reduce((a, b) => a + safeNum(b.quantidade), 0)})
              </h3>
              {safeArr(cart).length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  Limpar
                </button>
              )}
            </div>

            {safeArr(cart).length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Selecione um produto ou bipe um código de barras para iniciar a venda.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {safeArr(cart).map((item) => (
                  <div
                    key={item.variacaoId}
                    className="flex items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{item.produtoNome}</p>
                      <p className="text-xs text-slate-500">
                        Tam: <strong>{item.tamanho}</strong> • Cor: <strong>{item.cor}</strong> •{' '}
                        {formatBRL(item.precoUnitario)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.variacaoId, safeNum(item.quantidade) - 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-100"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-xs font-bold">{item.quantidade}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.variacaoId, safeNum(item.quantidade) + 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleFinalizarVenda} className="space-y-3 pt-3 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Cliente (Opcional)
                  </label>
                  <input
                    type="text"
                    value={clienteNome}
                    onChange={(e) => setClienteNome(e.target.value)}
                    placeholder="Consumidor Final"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    CPF / CNPJ (Opcional)
                  </label>
                  <input
                    type="text"
                    value={clienteDoc}
                    onChange={(e) => setClienteDoc(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Desconto (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={desconto}
                    onChange={(e) => setDesconto(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {formaPagamento === 'Dinheiro' && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-emerald-900">Valor Recebido (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorRecebido}
                      onChange={(e) => setValorRecebido(e.target.value)}
                      placeholder="0,00"
                      className="w-32 px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white text-xs font-bold text-right"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span>Troco:</span>
                    <span className="text-sm">{formatBRL(trocoVal)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1 pt-1 text-sm">
                <div className="flex justify-between text-slate-500 text-xs">
                  <span>Subtotal:</span>
                  <span>{formatBRL(subtotalCarrinho)}</span>
                </div>
                {descontoVal > 0 && (
                  <div className="flex justify-between text-rose-600 text-xs font-semibold">
                    <span>Desconto:</span>
                    <span>-{formatBRL(descontoVal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-extrabold text-slate-900 pt-1">
                  <span>Total a Pagar:</span>
                  <span className="text-emerald-700">{formatBRL(totalVenda)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={processandoVenda || !caixaAberto || safeArr(cart).length === 0}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {processandoVenda ? 'Registrando Venda...' : 'Finalizar Venda'}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedProdutoForMatrix && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedProdutoForMatrix(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{selectedProdutoForMatrix.nome}</h3>
                <p className="text-xs text-slate-500">Selecione o Tamanho e a Cor na grade</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProdutoForMatrix(null)}
                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto">
              {(variacoesPorProduto[selectedProdutoForMatrix.id] || []).map((v) => {
                const disp = safeNum(v.estoque);
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={disp <= 0}
                    onClick={() => addToCart(selectedProdutoForMatrix, v)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      disp > 0
                        ? 'border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40'
                        : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-sm text-slate-900">
                        {v.tamanho} • {v.cor}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400">{v.codigoBarras || v.sku}</p>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full ${
                        disp > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {disp} un
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function BarcodeSvg({ value }) {
  const svgRef = React.useRef(null);

  React.useEffect(() => {
    const code = String(value || '').trim();
    if (!svgRef.current || !code) return;

    const renderBars = () => {
      if (!window.JsBarcode || !svgRef.current) return;
      const draw = (fmt) => {
        window.JsBarcode(svgRef.current, code, {
          format: fmt,
          width: 2,
          height: 44,
          displayValue: true,
          fontSize: 12,
          margin: 6,
          background: '#ffffff',
          lineColor: '#000000'
        });
      };
      try {
        draw(code.length === 13 ? 'EAN13' : 'CODE128');
      } catch {
        try {
          draw('CODE128');
        } catch (_) {}
      }
    };

    if (window.JsBarcode) {
      renderBars();
    } else {
      const existing = document.querySelector('script[data-jsbarcode="true"]');
      if (existing) {
        existing.addEventListener('load', renderBars, { once: true });
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
        script.async = true;
        script.dataset.jsbarcode = 'true';
        script.onload = renderBars;
        document.head.appendChild(script);
      }
    }
  }, [value]);

  if (!String(value || '').trim()) return null;
  return <svg ref={svgRef} className="max-w-full bg-white" />;
}

// ============================================================================
// 13. PRODUTOS, GRADE (TAMANHO x COR) E CÓDIGO DE BARRAS EAN-13
// ============================================================================
function ProdutosEstoqueView({
  produtos,
  variacoes,
  isAdmin,
  currentOperator,
  showToast,
  registrarAuditoria,
  onDbError
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingProduto, setEditingProduto] = useState(null);

  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('Moda / Vestuário');
  const [precoVenda, setPrecoVenda] = useState('');
  const [precoCusto, setPrecoCusto] = useState('');
  const [codigoBarrasBase, setCodigoBarrasBase] = useState(() => generateEAN13());
  const [publicadoOnline, setPublicadoOnline] = useState(true);
  const [ativo, setAtivo] = useState(true);

  const [tamanhosSelecionados, setTamanhosSelecionados] = useState(['P', 'M', 'G']);
  const [coresSelecionadas, setCoresSelecionadas] = useState(['Preto', 'Branco']);
  const [estoqueInicialGrade, setEstoqueInicialGrade] = useState('5');
  const [estoqueMinimoGrade, setEstoqueMinimoGrade] = useState('2');

  const [filtroTexto, setFiltroTexto] = useState('');
  const [ajusteVariacaoId, setAjusteVariacaoId] = useState(null);
  const [novoEstoqueValor, setNovoEstoqueValor] = useState('');

  const opcoesTamanho = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'Único'];
  const opcoesCor = ['Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Bege', 'Cinza'];

  const resetForm = () => {
    setEditingProduto(null);
    setNome('');
    setCategoria('Moda / Vestuário');
    setPrecoVenda('');
    setPrecoCusto('');
    setCodigoBarrasBase(generateEAN13());
    setPublicadoOnline(true);
    setAtivo(true);
    setTamanhosSelecionados(['P', 'M', 'G']);
    setCoresSelecionadas(['Preto', 'Branco']);
    setEstoqueInicialGrade('5');
    setEstoqueMinimoGrade('2');
  };

  const openNewProduto = () => {
    if (!isAdmin) {
      showToast('Apenas o Administrador pode cadastrar novos produtos.', 'error');
      return;
    }
    resetForm();
    setShowForm(true);
  };

  const openEditProduto = (prod) => {
    if (!isAdmin) {
      showToast('Apenas o Administrador pode editar dados de produtos.', 'error');
      return;
    }
    setEditingProduto(prod);
    setNome(prod.nome || '');
    setCategoria(prod.categoria || 'Geral');
    setPrecoVenda(String(prod.precoVenda ?? ''));
    setPrecoCusto(String(prod.precoCusto ?? ''));
    setCodigoBarrasBase(prod.codigoBarras || generateEAN13());
    setPublicadoOnline(prod.publicadoOnline !== false);
    setAtivo(prod.ativo !== false);
    setShowForm(true);
  };

  const toggleItem = (arr, setArr, val) => {
    setArr((prev) =>
      safeArr(prev).includes(val) ? safeArr(prev).filter((i) => i !== val) : [...safeArr(prev), val]
    );
  };

  const handleSaveProduto = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Sem permissão de Administrador.', 'error');
      return;
    }
    if (!nome.trim() || safeNum(precoVenda) <= 0) {
      showToast('Informe o nome do produto e um preço de venda válido.', 'error');
      return;
    }

    try {
      const vendaNum = safeNum(precoVenda);
      const custoNum = safeNum(precoCusto);
      const barcodeLimpo = codigoBarrasBase.trim() || generateEAN13();

      if (editingProduto) {
        await updateDoc(getPublicDoc('produtos', editingProduto.id), {
          nome: nome.trim(),
          categoria: categoria.trim() || 'Geral',
          precoVenda: vendaNum,
          precoCusto: custoNum,
          codigoBarras: barcodeLimpo,
          publicadoOnline,
          ativo,
          atualizadoEm: new Date().toISOString()
        });

        await registrarAuditoria(
          'Edição de Produto',
          `Produto "${nome.trim()}" atualizado por ${currentOperator.nome}.`
        );
        showToast('Produto atualizado com sucesso!', 'success');
      } else {
        const prodRef = await addDoc(getPublicCol('produtos'), {
          nome: nome.trim(),
          categoria: categoria.trim() || 'Geral',
          precoVenda: vendaNum,
          precoCusto: custoNum,
          codigoBarras: barcodeLimpo,
          publicadoOnline,
          ativo,
          criadoEm: new Date().toISOString()
        });

        const tamList = safeArr(tamanhosSelecionados).length > 0 ? tamanhosSelecionados : ['Único'];
        const corList = safeArr(coresSelecionadas).length > 0 ? coresSelecionadas : ['Padrão'];
        const qtdIni = Math.max(0, safeNum(estoqueInicialGrade));
        const qtdMin = Math.max(0, safeNum(estoqueMinimoGrade));

        let countVars = 0;
        for (const tam of tamList) {
          for (const cor of corList) {
            const skuGerado = `${nome
              .trim()
              .slice(0, 3)
              .toUpperCase()}-${tam}-${cor.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
            const codBarrasVar = countVars === 0 ? barcodeLimpo : generateEAN13();
            await addDoc(getPublicCol('variacoes'), {
              produtoId: prodRef.id,
              produtoNome: nome.trim(),
              tamanho: tam,
              cor,
              sku: skuGerado,
              codigoBarras: codBarrasVar,
              precoVenda: vendaNum,
              precoCusto: custoNum,
              estoque: qtdIni,
              estoqueMinimo: qtdMin,
              criadoEm: new Date().toISOString()
            });
            countVars += 1;
          }
        }

        await registrarAuditoria(
          'Cadastro de Produto e Grade',
          `Produto "${nome.trim()}" criado com ${countVars} variação(ões) de Tamanho/Cor.`
        );
        showToast(`Produto criado com ${countVars} variação(ões) na grade!`, 'success');
      }

      setShowForm(false);
      resetForm();
    } catch (err) {
      onDbError('salvamento de produto/grade', err);
    }
  };

  const handleConfirmarAjusteEstoque = async (variacao) => {
    if (!variacao) return;
    const novoQtd = Math.max(0, safeNum(novoEstoqueValor));
    try {
      await updateDoc(getPublicDoc('variacoes', variacao.id), {
        estoque: novoQtd
      });
      await registrarAuditoria(
        'Ajuste de Estoque',
        `Estoque de "${variacao.produtoNome}" (${variacao.tamanho}/${variacao.cor}) ajustado para ${novoQtd} un.`
      );
      setAjusteVariacaoId(null);
      setNovoEstoqueValor('');
      showToast('Estoque atualizado!', 'success');
    } catch (err) {
      onDbError('ajuste de estoque', err);
    }
  };

  const handleExcluirProduto = async (prod) => {
    if (!isAdmin) {
      showToast('Apenas o Administrador pode excluir produtos.', 'error');
      return;
    }
    try {
      const varsRel = safeArr(variacoes).filter((v) => v.produtoId === prod.id);
      for (const v of varsRel) {
        await deleteDoc(getPublicDoc('variacoes', v.id));
      }
      await deleteDoc(getPublicDoc('produtos', prod.id));
      await registrarAuditoria(
        'Exclusão de Produto',
        `Produto "${prod.nome}" e suas ${varsRel.length} variação(ões) foram removidos.`
      );
      showToast('Produto excluído com sucesso.', 'success');
    } catch (err) {
      onDbError('exclusão de produto', err);
    }
  };

  const variacoesFiltradas = useMemo(() => {
    const term = filtroTexto.trim().toLowerCase();
    if (!term) return safeArr(variacoes);
    return safeArr(variacoes).filter(
      (v) =>
        String(v.produtoNome || '').toLowerCase().includes(term) ||
        String(v.tamanho || '').toLowerCase().includes(term) ||
        String(v.cor || '').toLowerCase().includes(term) ||
        String(v.sku || '').toLowerCase().includes(term) ||
        String(v.codigoBarras || '').toLowerCase().includes(term)
    );
  }, [variacoes, filtroTexto]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Produtos, Grade e Estoque</h2>
          <p className="text-sm text-slate-500">
            Controle por grade (Tamanho x Cor), código de barras EAN-13 e publicação na loja online
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={openNewProduto}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Produto / Grade
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <form
          onSubmit={handleSaveProduto}
          className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-lg text-slate-900">
              {editingProduto ? `Editar: ${editingProduto.nome}` : 'Novo Produto com Grade (Tamanho x Cor)'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="p-2 rounded-xl bg-slate-100 text-slate-600"
            >
              <X className="w-4 h-4" />
                  </button>
    </div>
    
      
  
      
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nome do Produto *</label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Camiseta Algodão Premium"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Categoria</label>
              <input
                type="text"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ex: Moda, Calçados"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Código de Barras (EAN-13)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={codigoBarrasBase}
                  onChange={(e) => setCodigoBarrasBase(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setCodigoBarrasBase(generateEAN13())}
                  title="Gerar EAN-13"
                  className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  <Barcode className="w-4 h-4" />
                </button>
                  </div>
    <div className="mt-2">
      <BarcodeSvg value={codigoBarrasBase} />
    </div>
  </div>
  <div>
    
              <label className="block text-xs font-semibold text-slate-600 mb-1">Preço de Venda (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={precoVenda}
                onChange={(e) => setPrecoVenda(e.target.value)}
                placeholder="89,90"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Preço de Custo (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={precoCusto}
                onChange={(e) => setPrecoCusto(e.target.value)}
                placeholder="39,90"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publicadoOnline}
                  onChange={(e) => setPublicadoOnline(e.target.checked)}
                  className="rounded"
                />
                Exibir na Loja Virtual
              </label>
            </div>

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="rounded"
                />
                Produto Ativo no PDV
              </label>
            </div>
          </div>

          {!editingProduto && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Grade de Variações (Tamanho x Cor)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs font-semibold text-slate-600 mb-1.5">Tamanhos</span>
                  <div className="flex flex-wrap gap-1.5">
                    {opcoesTamanho.map((tam) => {
                      const active = safeArr(tamanhosSelecionados).includes(tam);
                      return (
                        <button
                          key={tam}
                          type="button"
                          onClick={() => toggleItem(tamanhosSelecionados, setTamanhosSelecionados, tam)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            active
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          {tam}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-semibold text-slate-600 mb-1.5">Cores</span>
                  <div className="flex flex-wrap gap-1.5">
                    {opcoesCor.map((cor) => {
                      const active = safeArr(coresSelecionadas).includes(cor);
                      return (
                        <button
                          key={cor}
                          type="button"
                          onClick={() => toggleItem(coresSelecionadas, setCoresSelecionadas, cor)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            active
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          {cor}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Estoque Inicial por Variação
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={estoqueInicialGrade}
                    onChange={(e) => setEstoqueInicialGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Estoque Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={estoqueMinimoGrade}
                    onChange={(e) => setEstoqueMinimoGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"
            >
              {editingProduto ? 'Salvar Alterações' : 'Criar Produto e Grade'}
            </button>
          </div>
        </form>
      )}

      {isAdmin && safeArr(produtos).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-900 text-sm mb-3">Produtos Cadastrados ({safeArr(produtos).length})</h3>
          <div className="divide-y divide-slate-100">
            {safeArr(produtos).map((p) => (
              <div key={p.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-bold text-slate-900">{p.nome}</p>
                  <p className="text-xs text-slate-500">
                    {p.categoria || 'Geral'} • Venda: <strong>{formatBRL(p.precoVenda)}</strong> • Custo:{' '}
                    {formatBRL(p.precoCusto)} • {p.publicadoOnline !== false ? 'Na Loja Online' : 'Oculto Online'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEditProduto(p)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExcluirProduto(p)}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-slate-900">Grade de Estoque ({variacoesFiltradas.length} variações)</h3>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Filtrar tamanho, cor, SKU ou código..."
              className="w-full bg-transparent text-xs focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                <th className="py-3 px-2">Produto</th>
                <th className="py-3 px-2">Tamanho</th>
                <th className="py-3 px-2">Cor</th>
                <th className="py-3 px-2">Código de Barras</th>
                <th className="py-3 px-2">Preço</th>
                <th className="py-3 px-2">Estoque</th>
                <th className="py-3 px-2 text-right">Ajuste</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {variacoesFiltradas.map((v) => {
                const baixo = safeNum(v.estoque) <= safeNum(v.estoqueMinimo, 2);
                const editandoAqui = ajusteVariacaoId === v.id;
                return (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="py-3 px-2 font-semibold text-slate-900">{v.produtoNome}</td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-bold">
                        {v.tamanho}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-xs font-medium text-slate-700">{v.cor}</td>
                    <td className="py-3 px-2 font-mono text-xs text-slate-500">{v.codigoBarras || '-'}</td>
                    <td className="py-3 px-2 font-semibold">{formatBRL(v.precoVenda)}</td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          safeNum(v.estoque) === 0
                            ? 'bg-rose-100 text-rose-700'
                            : baixo
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {safeNum(v.estoque)} un
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      {editandoAqui ? (
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            value={novoEstoqueValor}
                            onChange={(e) => setNovoEstoqueValor(e.target.value)}
                            className="w-20 px-2 py-1 rounded-lg border border-slate-300 text-xs font-bold text-right"
                          />
                          <button
                            type="button"
                            onClick={() => handleConfirmarAjusteEstoque(v)}
                            className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                            title="Confirmar"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setAjusteVariacaoId(null)}
                            className="p-1.5 rounded-lg bg-slate-200 text-slate-700"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAjusteVariacaoId(v.id);
                            setNovoEstoqueValor(String(safeNum(v.estoque)));
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                        >
                          Ajustar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 14. CONTROLE FINANCEIRO, CAIXA E DESPESAS
// ============================================================================
function FinanceiroView({
  caixas,
  caixaAberto,
  movimentacoesCaixa,
  vendas,
  despesas,
  currentOperator,
  showToast,
  registrarAuditoria,
  onDbError
}) {
  const [saldoInicialInput, setSaldoInicialInput] = useState('100');
  const [movTipo, setMovTipo] = useState('Suprimento');
  const [movValor, setMovValor] = useState('');
  const [movObs, setMovObs] = useState('');

  const [despDesc, setDespDesc] = useState('');
  const [despCat, setDespCat] = useState('Operacional');
  const [despValor, setDespValor] = useState('');
  const [despData, setDespData] = useState(() => new Date().toISOString().slice(0, 10));

  const handleAbrirCaixa = async (e) => {
    e.preventDefault();
    if (caixaAberto) {
      showToast('Já existe um caixa aberto.', 'error');
      return;
    }
    const saldoIni = Math.max(0, safeNum(saldoInicialInput));
    const agoraIso = new Date().toISOString();

    try {
      const caixaRef = await addDoc(getPublicCol('caixas'), {
        usuarioId: currentOperator.id,
        usuarioNome: currentOperator.nome,
        saldoInicial: saldoIni,
        status: 'Aberto',
        aberturaData: agoraIso
      });

      if (saldoIni > 0) {
        await addDoc(getPublicCol('movimentacoes_caixa'), {
          caixaId: caixaRef.id,
          tipo: 'Suprimento',
          formaPagamento: 'Dinheiro',
          valor: saldoIni,
          observacao: 'Fundo inicial de abertura de caixa',
          usuarioId: currentOperator.id,
          usuarioNome: currentOperator.nome,
          dataHora: agoraIso
        });
      }

      await registrarAuditoria(
        'Abertura de Caixa',
        `Caixa aberto por ${currentOperator.nome} com saldo inicial de ${formatBRL(saldoIni)}.`
      );
      showToast('Caixa aberto com sucesso!', 'success');
    } catch (err) {
      onDbError('abertura de caixa', err);
    }
  };

  const movsDoCaixaAtual = useMemo(() => {
    if (!caixaAberto) return [];
    return safeArr(movimentacoesCaixa).filter((m) => m.caixaId === caixaAberto.id);
  }, [caixaAberto, movimentacoesCaixa]);

  const saldoAtualCaixa = useMemo(() => {
    if (!caixaAberto) return 0;
    let total = safeNum(caixaAberto.saldoInicial);
    for (const m of movsDoCaixaAtual) {
      if (m.observacao === 'Fundo inicial de abertura de caixa' && m.tipo === 'Suprimento') {
        continue;
      }
      if (m.tipo === 'Venda' || m.tipo === 'Suprimento') {
        total += safeNum(m.valor);
      } else if (m.tipo === 'Sangria') {
        total -= safeNum(m.valor);
      }
    }
    return total;
  }, [caixaAberto, movsDoCaixaAtual]);

  const handleMovimentacao = async (e) => {
    e.preventDefault();
    if (!caixaAberto) {
      showToast('Abra o caixa primeiro.', 'error');
      return;
    }
    const val = safeNum(movValor);
    if (val <= 0) {
      showToast('Informe um valor maior que zero.', 'error');
      return;
    }

    try {
      await addDoc(getPublicCol('movimentacoes_caixa'), {
        caixaId: caixaAberto.id,
        tipo: movTipo,
        formaPagamento: 'Dinheiro',
        valor: val,
        observacao: movObs.trim() || `${movTipo} de caixa`,
        usuarioId: currentOperator.id,
        usuarioNome: currentOperator.nome,
        dataHora: new Date().toISOString()
      });

      await registrarAuditoria(
        `${movTipo} de Caixa`,
        `${movTipo} de ${formatBRL(val)} (${movObs.trim() || 'sem obs.'}).`
      );
      setMovValor('');
      setMovObs('');
      showToast(`${movTipo} registrado com sucesso!`, 'success');
    } catch (err) {
      onDbError('movimentação de caixa', err);
    }
  };

  const handleFecharCaixa = async () => {
    if (!caixaAberto) return;
    try {
      await updateDoc(getPublicDoc('caixas', caixaAberto.id), {
        status: 'Fechado',
        saldoFinal: saldoAtualCaixa,
        fechamentoData: new Date().toISOString(),
        fechadoPor: currentOperator.nome
      });
      await registrarAuditoria(
        'Fechamento de Caixa',
        `Caixa encerrado por ${currentOperator.nome} com saldo final de ${formatBRL(saldoAtualCaixa)}.`
      );
      showToast('Caixa fechado com sucesso!', 'success');
    } catch (err) {
      onDbError('fechamento de caixa', err);
    }
  };

  const handleAddDespesa = async (e) => {
    e.preventDefault();
    const val = safeNum(despValor);
    if (!despDesc.trim() || val <= 0) {
      showToast('Preencha a descrição e o valor da despesa.', 'error');
      return;
    }
    try {
      await addDoc(getPublicCol('despesas'), {
        descricao: despDesc.trim(),
        categoria: despCat.trim() || 'Operacional',
        valor: val,
        data: despData || new Date().toISOString().slice(0, 10),
        usuarioId: currentOperator.id,
        usuarioNome: currentOperator.nome,
        criadoEm: new Date().toISOString()
      });
      await registrarAuditoria(
        'Lançamento de Despesa',
        `Despesa "${despDesc.trim()}" no valor de ${formatBRL(val)} lançada.`
      );
      setDespDesc('');
      setDespValor('');
      showToast('Despesa registrada!', 'success');
    } catch (err) {
      onDbError('lançamento de despesa', err);
    }
  };

  const handleDeleteDespesa = async (desp) => {
    try {
      await deleteDoc(getPublicDoc('despesas', desp.id));
      await registrarAuditoria('Exclusão de Despesa', `Despesa "${desp.descricao}" removida.`);
      showToast('Despesa removida.', 'success');
    } catch (err) {
      onDbError('exclusão de despesa', err);
    }
  };

  const vendasValidas = safeArr(vendas).filter((v) => v && v.status !== 'Cancelada' && v.status !== 'Devolvida');
  const receitaVendas = vendasValidas.reduce((a, b) => a + safeNum(b.total), 0);
  const lucroBruto = vendasValidas.reduce((a, b) => a + safeNum(b.lucroEstimado), 0);
  const totalDespesas = safeArr(despesas).reduce((a, b) => a + safeNum(b.valor), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Controle Financeiro e Caixa</h2>
        <p className="text-sm text-slate-500">Abertura/fechamento de caixa, sangrias, suprimentos e despesas</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Receita de Vendas</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{formatBRL(receitaVendas)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total de Despesas</span>
          <p className="text-2xl font-bold text-rose-600 mt-1">{formatBRL(totalDespesas)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Resultado Líquido Estimado</span>
          <p className={`text-2xl font-bold mt-1 ${lucroBruto - totalDespesas >= 0 ? 'text-indigo-700' : 'text-rose-600'}`}>
            {formatBRL(lucroBruto - totalDespesas)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
        {!caixaAberto ? (
          <form onSubmit={handleAbrirCaixa} className="flex flex-wrap items-end gap-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900 mb-1">Caixa Fechado — Iniciar Turno</h3>
              <p className="text-xs text-slate-500">Informe o fundo inicial em dinheiro para abrir o caixa.</p>
            </div>
            <div className="flex-1 min-w-[180px] max-w-xs">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Saldo Inicial (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={saldoInicialInput}
                onChange={(e) => setSaldoInicialInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm"
            >
              Abrir Caixa Agora
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  ● Caixa Aberto
                </span>
                <h3 className="font-bold text-lg text-slate-900 mt-1">
                  Saldo Atual em Caixa: <span className="text-emerald-700">{formatBRL(saldoAtualCaixa)}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Aberto por {caixaAberto.usuarioNome} em {formatDateTime(caixaAberto.aberturaData)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleFecharCaixa}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Fechar Caixa
              </button>
            </div>

            <form onSubmit={handleMovimentacao} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo</label>
                <select
                  value={movTipo}
                  onChange={(e) => setMovTipo(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  <option value="Suprimento">Suprimento (Entrada)</option>
                  <option value="Sangria">Sangria (Retirada)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={movValor}
                  onChange={(e) => setMovValor(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Observação</label>
                <input
                  type="text"
                  value={movObs}
                  onChange={(e) => setMovObs(e.target.value)}
                  placeholder="Ex: Troco, pagamento motoboy"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <button
                type="submit"
                className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold"
              >
                Registrar Movimentação
              </button>
            </form>

            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {movsDoCaixaAtual.map((m) => (
                <div key={m.id} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{m.tipo}</span> •{' '}
                    <span className="text-slate-600">{m.observacao}</span>
                    <span className="text-slate-400 ml-2">({formatDateTime(m.dataHora)})</span>
                  </div>
                  <span
                    className={`font-bold ${
                      m.tipo === 'Sangria' ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {m.tipo === 'Sangria' ? '-' : '+'} {formatBRL(m.valor)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
        <h3 className="font-bold text-lg text-slate-900">Despesas Operacionais</h3>
        <form onSubmit={handleAddDespesa} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição *</label>
            <input
              type="text"
              required
              value={despDesc}
              onChange={(e) => setDespDesc(e.target.value)}
              placeholder="Ex: Conta de energia, aluguel, embalagens"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Valor (R$) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={despValor}
              onChange={(e) => setDespValor(e.target.value)}
              placeholder="0,00"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Data</label>
            <input
              type="date"
              value={despData}
              onChange={(e) => setDespData(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <button
            type="submit"
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"
          >
            Lançar Despesa
          </button>
        </form>

        <div className="divide-y divide-slate-100">
          {safeArr(despesas).map((d) => (
            <div key={d.id} className="py-3 flex items-center justify-between text-sm">
              <div>
                <p className="font-semibold text-slate-900">{d.descricao}</p>
                <p className="text-xs text-slate-500">
                  {d.categoria || 'Operacional'} • Data: {d.data || '-'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-rose-600">{formatBRL(d.valor)}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteDespesa(d)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 15. PEDIDOS ONLINE (ADMIN)
// ============================================================================
function PedidosOnlineAdminView({
  pedidosOnline,
  variacoes,
  currentOperator,
  showToast,
  registrarAuditoria,
  triggerThermalPrint,
  onDbError
}) {
  const handleConfirmarPedido = async (pedido) => {
    if (!pedido || pedido.status !== 'Pendente') return;
    try {
      for (const item of safeArr(pedido.itens)) {
        if (!item.variacaoId) continue;
        const vAtual = safeArr(variacoes).find((v) => v.id === item.variacaoId);
        if (vAtual) {
          const novoEst = Math.max(0, safeNum(vAtual.estoque) - safeNum(item.quantidade));
          await updateDoc(getPublicDoc('variacoes', item.variacaoId), {
            estoque: novoEst
          });
        }
      }

      await updateDoc(getPublicDoc('pedidos_online', pedido.id), {
        status: 'Confirmado',
        confirmadoPor: currentOperator.nome,
        confirmadoEm: new Date().toISOString()
      });

      await addDoc(getPublicCol('vendas'), {
        usuarioId: currentOperator.id,
        usuarioNome: currentOperator.nome,
        clienteNome: pedido.clienteNome || 'Cliente Loja Online',
        clienteTelefone: pedido.clienteTelefone || '',
        itens: pedido.itens,
        subtotal: pedido.total,
        desconto: 0,
        total: pedido.total,
        formaPagamento: pedido.formaPagamento || 'PIX / Combinado',
        origem: 'Loja Virtual',
        status: 'Concluída',
        dataHora: new Date().toISOString()
      });

      await registrarAuditoria(
        'Confirmação de Pedido Online',
        `Pedido online #${String(pedido.id).slice(-6).toUpperCase()} (${formatBRL(pedido.total)}) confirmado e estoque baixado.`
      );
      showToast('Pedido online confirmado e estoque atualizado!', 'success');
    } catch (err) {
      onDbError('confirmação de pedido online', err);
    }
  };

  const handleCancelarPedido = async (pedido) => {
    if (!pedido) return;
    try {
      await updateDoc(getPublicDoc('pedidos_online', pedido.id), {
        status: 'Cancelado',
        canceladoPor: currentOperator.nome,
        canceladoEm: new Date().toISOString()
      });
      await registrarAuditoria(
        'Cancelamento de Pedido Online',
        `Pedido #${String(pedido.id).slice(-6).toUpperCase()} cancelado.`
      );
      showToast('Pedido cancelado.', 'success');
    } catch (err) {
      onDbError('cancelamento de pedido online', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Pedidos da Loja Virtual</h2>
        <p className="text-sm text-slate-500">Confirme pedidos para baixar o estoque automaticamente</p>
      </div>

      {safeArr(pedidosOnline).length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
          Nenhum pedido recebido pela Loja Virtual ainda.
        </div>
      ) : (
        <div className="space-y-4">
          {safeArr(pedidosOnline).map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-500">
                    #{String(p.id).slice(-6).toUpperCase()}
                  </span>
                  <h3 className="font-bold text-slate-900">{p.clienteNome || 'Cliente'}</h3>
                  <p className="text-xs text-slate-500">
                    {p.clienteTelefone || 'Sem telefone'} • {formatDateTime(p.dataHora)}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      p.status === 'Confirmado'
                        ? 'bg-emerald-100 text-emerald-800'
                        : p.status === 'Cancelado'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {p.status || 'Pendente'}
                  </span>
                  <p className="text-lg font-extrabold text-slate-900 mt-1">{formatBRL(p.total)}</p>
                </div>
              </div>

              <div className="text-xs space-y-1">
                {safeArr(p.itens).map((item, i) => (
                  <div key={i} className="flex justify-between text-slate-700">
                    <span>
                      {safeNum(item.quantidade)}x {item.produtoNome} ({item.tamanho}/{item.cor})
                    </span>
                    <span className="font-semibold">{formatBRL(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => triggerThermalPrint(p)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir
                </button>
                {p.status === 'Pendente' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleCancelarPedido(p)}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmarPedido(p)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                    >
                      Confirmar e Baixar Estoque
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 16. EQUIPE E ACESSOS (PIN DE 4 DÍGITOS)
// ============================================================================
function UsuariosView({
  usuarios,
  currentOperator,
  isAdmin,
  showToast,
  registrarAuditoria,
  onDbError
}) {
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('Operador de Caixa');
  const [pin, setPin] = useState('');

  const handleCriarUsuario = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Apenas o Administrador pode cadastrar usuários.', 'error');
      return;
    }
    const cleanPin = String(pin || '').replace(/\D/g, '');
    if (!nome.trim() || cleanPin.length !== 4) {
      showToast('Informe o nome e um PIN numérico de exatamente 4 dígitos.', 'error');
      return;
    }

    const pinJaExiste = safeArr(usuarios).some((u) => u.pin === cleanPin);
    if (pinJaExiste) {
      showToast('Este PIN de 4 dígitos já está em uso por outro usuário.', 'error');
      return;
    }

    try {
      await addDoc(getPublicCol('usuarios'), {
        nome: nome.trim(),
        cargo,
        pin: cleanPin,
        status: 'Ativo',
        isDemo: false,
        criadoEm: new Date().toISOString()
      });
      await registrarAuditoria(
        'Novo Operador Criado',
        `Usuário "${nome.trim()}" (${cargo}) cadastrado com PIN de 4 dígitos.`
      );
      setNome('');
      setPin('');
      showToast('Usuário cadastrado com sucesso!', 'success');
    } catch (err) {
      onDbError('cadastro de usuário', err);
    }
  };

  const handleToggleStatus = async (u) => {
    if (!isAdmin) {
      showToast('Apenas o Administrador pode alterar status de acesso.', 'error');
      return;
    }
    if (u.id === currentOperator.id) {
      showToast('Você não pode bloquear seu próprio usuário ativo.', 'error');
      return;
    }
    const nextStatus = u.status === 'Ativo' ? 'Bloqueado' : 'Ativo';
    try {
      await updateDoc(getPublicDoc('usuarios', u.id), { status: nextStatus });
      await registrarAuditoria(
        'Alteração de Status de Usuário',
        `Usuário "${u.nome}" alterado para ${nextStatus}.`
      );
      showToast(`Usuário ${nextStatus.toLowerCase()}.`, 'success');
    } catch (err) {
      onDbError('alteração de status de usuário', err);
    }
  };

  const handleExcluirUsuario = async (u) => {
    if (!isAdmin) {
      showToast('Apenas o Administrador pode excluir usuários.', 'error');
      return;
    }
    if (u.id === currentOperator.id) {
      showToast('Você não pode excluir o usuário atualmente logado.', 'error');
      return;
    }
    try {
      await deleteDoc(getPublicDoc('usuarios', u.id));
      await registrarAuditoria('Exclusão de Usuário', `Usuário "${u.nome}" removido.`);
      showToast('Usuário removido.', 'success');
    } catch (err) {
      onDbError('exclusão de usuário', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Equipe e Controle de Acessos</h2>
        <p className="text-sm text-slate-500">Gerencie operadores, cargos e PINs numéricos de 4 dígitos</p>
      </div>

      {isAdmin && (
        <form
          onSubmit={handleCriarUsuario}
          className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Completo *</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Maria Silva"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Cargo</label>
            <select
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="Operador de Caixa">Operador de Caixa</option>
              <option value="Vendedor">Vendedor</option>
              <option value="Administrador">Administrador</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">PIN (4 dígitos) *</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Ex: 1234"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono tracking-widest"
            />
          </div>
          <button
            type="submit"
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"
          >
            Adicionar Usuário
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h3 className="font-bold text-slate-900 text-sm">Usuários Cadastrados ({safeArr(usuarios).length})</h3>
        <div className="divide-y divide-slate-100">
          {safeArr(usuarios).map((u) => (
            <div key={u.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-bold text-slate-900">
                  {u.nome}{' '}
                  {u.isDemo && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold ml-1">
                      Demo
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  Cargo: <strong>{u.cargo}</strong> • PIN: <span className="font-mono">{u.pin}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    u.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {u.status}
                </span>
                {isAdmin && u.id !== currentOperator.id && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(u)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                    >
                      {u.status === 'Ativo' ? 'Bloquear' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExcluirUsuario(u)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                      title="Excluir usuário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 17. CONFIGURAÇÕES DA LOJA (SOMENTE ADMIN)
// ============================================================================
function ConfiguracoesLojaView({
  storeConfig,
  currentOperator,
  showToast,
  registrarAuditoria,
  onDbError
}) {
  const [form, setForm] = useState(storeConfig);

  useEffect(() => {
    setForm(storeConfig);
  }, [storeConfig]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await setDoc(
        getPublicDoc('configuracoes_loja', 'principal'),
        { ...DEFAULT_STORE_CONFIG, ...form },
        { merge: true }
      );
      await registrarAuditoria(
        'Atualização de Configurações da Loja',
        `Dados da loja "${form.nomeFantasia}" salvos por ${currentOperator.nome}.`
      );
      showToast('Configurações da loja salvas com sucesso!', 'success');
    } catch (err) {
      onDbError('salvamento de configurações da loja', err);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Configurações da Loja e Cupom</h2>
        <p className="text-sm text-slate-500">Dados comerciais, chave PIX e preferências de impressão térmica</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Fantasia</label>
          <input
            type="text"
            value={form.nomeFantasia || ''}
            onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Razão Social</label>
          <input
            type="text"
            value={form.razaoSocial || ''}
            onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">CNPJ</label>
          <input
            type="text"
            value={form.cnpj || ''}
            onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone / WhatsApp</label>
          <input
            type="text"
            value={form.telefone || ''}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Endereço Completo</label>
          <input
            type="text"
            value={form.endereco || ''}
            onChange={(e) => setForm({ ...form, endereco: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Chave PIX</label>
          <input
            type="text"
            value={form.chavePix || ''}
            onChange={(e) => setForm({ ...form, chavePix: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Largura do Cupom Térmico</label>
          <select
            value={form.larguraCupom || '80mm'}
            onChange={(e) => setForm({ ...form, larguraCupom: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
          >
            <option value="80mm">80mm</option>
            <option value="58mm">58mm</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Mensagem de Rodapé do Cupom</label>
          <input
            type="text"
            value={form.mensagemRodape || ''}
            onChange={(e) => setForm({ ...form, mensagemRodape: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.impressaoAutomatica}
              onChange={(e) => setForm({ ...form, impressaoAutomatica: e.target.checked })}
              className="rounded"
            />
            Abrir diálogo de impressão automaticamente ao finalizar venda no PDV
          </label>
        </div>
      </div>

      <button
        type="submit"
        className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm"
      >
        Salvar Configurações
      </button>
    </form>
  );
}

// ============================================================================
// 18. STATUS TÉCNICO E TRANSPARÊNCIA DE INTEGRAÇÕES
// ============================================================================
function StatusSistemaView() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Status do Sistema e Integrações</h2>
        <p className="text-sm text-slate-500">O que está ativo no navegador/nuvem e o que depende de serviços externos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-emerald-200 p-5 space-y-2">
          <span className="text-xs font-bold uppercase text-emerald-700">● Ativo e Sincronizado</span>
          <h3 className="font-bold text-slate-900">Firestore & Autenticação Firebase</h3>
          <p className="text-xs text-slate-600">
            Produtos, grade de estoque, vendas, caixa, despesas, pedidos online, usuários e auditoria sincronizados em tempo real no projeto <strong>sistemaloja-232f1</strong>.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200 p-5 space-y-2">
          <span className="text-xs font-bold uppercase text-emerald-700">● Ativo no Navegador</span>
          <h3 className="font-bold text-slate-900">Impressão de Comprovante Não Fiscal</h3>
          <p className="text-xs text-slate-600">
            Formata o comprovante em 80mm ou 58mm e aciona a impressão do sistema operacional/navegador.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200 p-5 space-y-2">
          <span className="text-xs font-bold uppercase text-amber-700">○ Requer Serviço Externo</span>
          <h3 className="font-bold text-slate-900">Emissão Fiscal Oficial (NF-e / NFC-e / SEFAZ)</h3>
          <p className="text-xs text-slate-600">
            O comprovante emitido é interno/não fiscal. A transmissão oficial à SEFAZ exige certificado digital e API/backend fiscal homologado.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200 p-5 space-y-2">
          <span className="text-xs font-bold uppercase text-amber-700">○ Requer Integração Própria</span>
          <h3 className="font-bold text-slate-900">Gateways de Pagamento e Cobrança Automática</h3>
          <p className="text-xs text-slate-600">
            O PDV e a Loja Virtual registram a forma de pagamento escolhida e exibem a chave PIX configurada; confirmação automática via webhook exige gateway externo.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 19. LOJA VIRTUAL PÚBLICA
// ============================================================================
function StorefrontView({
  storeConfig,
  produtos,
  variacoes,
  onBackToErp,
  showToast,
  registrarAuditoria
}) {
  const [busca, setBusca] = useState('');
  const [sacola, setSacola] = useState([]);
  const [modalProduto, setModalProduto] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [enviandoPedido, setEnviandoPedido] = useState(false);

  const catalogo = useMemo(() => {
    const ativos = safeArr(produtos).filter(
      (p) => p && p.ativo !== false && p.publicadoOnline !== false
    );
    const term = busca.trim().toLowerCase();
    if (!term) return ativos;
    return ativos.filter(
      (p) =>
        String(p.nome || '').toLowerCase().includes(term) ||
        String(p.categoria || '').toLowerCase().includes(term)
    );
  }, [produtos, busca]);

  const getVariacoesDisponiveis = (produtoId) =>
    safeArr(variacoes).filter((v) => v.produtoId === produtoId && safeNum(v.estoque) > 0);

  const adicionarSacola = (prod, variacao) => {
    const disp = safeNum(variacao.estoque);
    setSacola((prev) => {
      const list = safeArr(prev);
      const idx = list.findIndex((i) => i.variacaoId === variacao.id);
      const preco = safeNum(variacao.precoVenda ?? prod.precoVenda);
      if (idx >= 0) {
        const atual = list[idx];
        const prox = atual.quantidade + 1;
        if (prox > disp) {
          showToast(`Máximo disponível: ${disp} un.`, 'error');
          return list;
        }
        const copia = [...list];
        copia[idx] = { ...atual, quantidade: prox, subtotal: prox * preco };
        return copia;
      }
      return [
        ...list,
        {
          variacaoId: variacao.id,
          produtoId: prod.id,
          produtoNome: prod.nome,
          tamanho: variacao.tamanho || 'Único',
          cor: variacao.cor || 'Padrão',
          quantidade: 1,
          precoUnitario: preco,
          subtotal: preco
        }
      ];
    });
    setModalProduto(null);
    showToast('Adicionado à sacola!', 'success');
  };

  const totalSacola = safeArr(sacola).reduce((a, b) => a + safeNum(b.subtotal), 0);

  const handleEnviarPedido = async (e) => {
    e.preventDefault();
    if (!clienteNome.trim() || !clienteTelefone.trim()) {
      showToast('Informe seu nome e telefone/WhatsApp.', 'error');
      return;
    }
    if (safeArr(sacola).length === 0) {
      showToast('Sua sacola está vazia.', 'error');
      return;
    }

    setEnviandoPedido(true);
    try {
      const agoraIso = new Date().toISOString();
      const docRef = await addDoc(getPublicCol('pedidos_online'), {
        clienteNome: clienteNome.trim(),
        clienteTelefone: clienteTelefone.trim(),
        formaPagamento,
        itens: sacola,
        total: totalSacola,
        status: 'Pendente',
        dataHora: agoraIso
      });

      await registrarAuditoria(
        'Novo Pedido na Loja Virtual',
        `Pedido #${docRef.id.slice(-6).toUpperCase()} de ${clienteNome.trim()} (${formatBRL(totalSacola)}).`
      );

      setSacola([]);
      setClienteNome('');
      setClienteTelefone('');
      setCheckoutOpen(false);
      showToast('Pedido enviado! A loja confirmará em breve.', 'success');
    } catch (err) {
      console.error('Erro ao enviar pedido online:', err);
      showToast('Não foi possível enviar o pedido agora.', 'error');
    } finally {
      setEnviandoPedido(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3.5">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">{storeConfig.nomeFantasia}</h1>
              <p className="text-[11px] text-slate-500">{storeConfig.endereco}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCheckoutOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              Sacola ({safeArr(sacola).reduce((a, b) => a + safeNum(b.quantidade), 0)}) •{' '}
              {formatBRL(totalSacola)}
            </button>
            <button
              type="button"
              onClick={onBackToErp}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Voltar ao ERP
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center gap-2.5">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produtos na loja..."
            className="w-full text-sm focus:outline-none"
          />
        </div>

        {catalogo.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
            Nenhum produto disponível na vitrine no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalogo.map((prod) => {
              const disponiveis = getVariacoesDisponiveis(prod.id);
              const totalDisp = disponiveis.reduce((a, b) => a + safeNum(b.estoque), 0);
              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4 shadow-sm"
                >
                  <div>
                    <span className="text-[11px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {prod.categoria || 'Catálogo'}
                    </span>
                    <h2 className="font-bold text-lg text-slate-900 mt-2">{prod.nome}</h2>
                    <p className="text-xl font-extrabold text-slate-900 mt-2">
                      {formatBRL(prod.precoVenda)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {totalDisp > 0 ? `${totalDisp} unidade(s) em estoque` : 'Esgotado'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={totalDisp <= 0}
                    onClick={() => setModalProduto({ prod, disponiveis })}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold"
                  >
                    {totalDisp > 0 ? 'Escolher Tamanho / Cor' : 'Indisponível'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {modalProduto && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4"
          onClick={() => setModalProduto(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">{modalProduto.prod.nome}</h3>
              <button
                type="button"
                onClick={() => setModalProduto(null)}
                className="p-2 rounded-xl bg-slate-100 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {modalProduto.disponiveis.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => adicionarSacola(modalProduto.prod, v)}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-500 flex items-center justify-between text-left"
                >
                  <span className="font-bold text-sm">
                    {v.tamanho} • {v.cor}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">
                    {safeNum(v.estoque)} disp.
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {checkoutOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4"
          onClick={() => setCheckoutOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">Finalizar Pedido</h3>
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                className="p-2 rounded-xl bg-slate-100 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {safeArr(sacola).length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">Sua sacola está vazia.</p>
            ) : (
              <form onSubmit={handleEnviarPedido} className="space-y-4">
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl">
                  {safeArr(sacola).map((item) => (
                    <div key={item.variacaoId} className="flex justify-between text-xs">
                      <span>
                        {safeNum(item.quantidade)}x {item.produtoNome} ({item.tamanho}/{item.cor})
                      </span>
                      <span className="font-bold">{formatBRL(item.subtotal)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-extrabold text-sm pt-2 border-t border-slate-200">
                    <span>Total:</span>
                    <span className="text-emerald-700">{formatBRL(totalSacola)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Seu Nome *</label>
                  <input
                    type="text"
                    required
                    value={clienteNome}
                    onChange={(e) => setClienteNome(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={clienteTelefone}
                    onChange={(e) => setClienteTelefone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Forma de Pagamento Preferida
                  </label>
                  <select
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro na entrega/retirada</option>
                    <option value="Cartão">Cartão</option>
                  </select>
                </div>

                {formaPagamento === 'PIX' && storeConfig.chavePix && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                    <strong>Chave PIX da Loja:</strong> <span className="font-mono">{storeConfig.chavePix}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={enviandoPedido}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm"
                >
                  {enviandoPedido ? 'Enviando Pedido...' : 'Enviar Pedido'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 20. NOTIFICAÇÕES TOAST
// ============================================================================
function ToastContainer({ toasts }) {
  const list = safeArr(toasts);
  if (list.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
      {list.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto px-4 py-3 rounded-2xl shadow-xl text-white text-xs font-semibold flex items-center gap-2.5 ${
            t.type === 'error' ? 'bg-rose-600' : 'bg-slate-900 border border-slate-700'
          }`}
        >
          {t.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
