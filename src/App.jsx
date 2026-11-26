import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  DollarSign,
  Store,
  Users,
  Settings,
  LogOut,
  Lock,
  Plus,
  Trash2,
  Edit3,
  Search,
  Barcode,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ShoppingBag,
  Menu,
  CreditCard,
  Banknote,
  QrCode,
  RotateCcw,
  X,
  Check,
  ChevronRight,
  Layers,
  Activity,
  ExternalLink,
  ShieldCheck,
  WifiOff
} from 'lucide-react';

// ============================================================================
// 1. ERROR BOUNDARY RESILIENTE
// ============================================================================
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('Erro capturado pelo ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Ocorreu um erro inesperado</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  A interface foi protegida para evitar travamentos. Seus dados salvos na nuvem permanecem intactos.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar Sistema
              </button>
              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700"
              >
                {this.state.showDetails ? 'Ocultar Detalhes Técnicos' : 'Detalhes Técnicos'}
              </button>
            </div>

            {this.state.showDetails && (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-rose-300 overflow-x-auto max-h-48">
                <p className="font-bold mb-1">{String(this.state.error || 'Erro desconhecido')}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-[10px] text-slate-400 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// 2. CONFIGURAÇÃO FIREBASE DO PROJETO (sistemaloja-232f1) E UTILITÁRIOS
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDVrcLxpCrT-MplN17tGzAzOJpa5iAiVBM",
  authDomain: "sistemaloja-232f1.firebaseapp.com",
  projectId: "sistemaloja-232f1",
  storageBucket: "sistemaloja-232f1.firebasestorage.app",
  messagingSenderId: "865838406214",
  appId: "1:865838406214:web:d5e86529f0aafe67ae4847",
  measurementId: "G-8JWBR4ZZ0Y",
};

let firebaseApp = null;
let auth = null;
let db = null;
let firebaseInitError = null;
const appId = 'sistemaloja-232f1';

try {
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
} catch (err) {
  console.error('Falha ao inicializar Firebase:', err);
  firebaseInitError = err?.message || 'Falha ao inicializar os serviços do Firebase.';
}

const DEFAULT_STORE_CONFIG = {
  nomeFantasia: 'Minha Loja Brasil',
  razaoSocial: 'Minha Loja Comércio LTDA',
  cnpj: '00.000.000/0001-00',
  inscricaoEstadual: 'ISENTO',
  endereco: 'Rua Principal, 100 - Centro',
  telefone: '(15) 99999-0000',
  chavePix: '00.000.000/0001-00',
  logoUrl: '',
  regimeTributario: 'Simples Nacional',
  serieNfce: '1',
  ambienteFiscal: 'Homologação (Sem emissão SEFAZ)',
  tokenCsc: '',
  larguraCupom: '80mm',
  mensagemRodape: 'Obrigado pela preferência! Volte sempre.',
  impressaoAutomatica: false
};

const safeNum = (val, fallback = 0) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

const safeArr = (val) => (Array.isArray(val) ? val : []);

const formatBRL = (val) => {
  return safeNum(val, 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};

const formatDateTime = (isoStr) => {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return String(isoStr);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(isoStr);
  }
};

const generateEAN13 = () => {
  const prefix = '789';
  let body = '';
  for (let i = 0; i < 9; i++) {
    body += Math.floor(Math.random() * 10);
  }
  const code12 = prefix + body;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code12[i], 10) || 0;
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return code12 + checkDigit;
};

const getPublicCol = (colName) => {
  if (!db) return null;
  return collection(db, 'artifacts', appId, 'public', 'data', colName);
};

const getPublicDoc = (colName, docId) => {
  if (!db) return null;
  return doc(db, 'artifacts', appId, 'public', 'data', colName, docId);
};

// ============================================================================
// 3. WRAPPER COM ERROR BOUNDARY
// ============================================================================
export default function App() {
  return (
    <ErrorBoundary>
      <ErpPdvSystem />
    </ErrorBoundary>
  );
}

// ============================================================================
// 4. SISTEMA PRINCIPAL
// ============================================================================
function ErpPdvSystem() {
  const [fbUser, setFbUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [firestoreError, setFirestoreError] = useState(firebaseInitError || '');

  // Controle de Operador / PIN
  const [currentOperator, setCurrentOperator] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [selectedUserForPin, setSelectedUserForPin] = useState('');

  // Navegação
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isStorefrontMode, setIsStorefrontMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dados Persistentes
  const [usuarios, setUsuarios] = useState([]);
  const [storeConfig, setStoreConfig] = useState(DEFAULT_STORE_CONFIG);
  const [produtos, setProdutos] = useState([]);
  const [variacoes, setVariacoes] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [caixas, setCaixas] = useState([]);
  const [movimentacoesCaixa, setMovimentacoesCaixa] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [pedidosOnline, setPedidosOnline] = useState([]);
  const [logsAuditoria, setLogsAuditoria] = useState([]);

  // Notificações e Impressão
  const [toasts, setToasts] = useState([]);
  const [receiptToPrint, setReceiptToPrint] = useState(null);

  const showToast = (message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...safeArr(prev), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => safeArr(prev).filter((t) => t.id !== id));
    }, 4500);
  };

  const handleFirestoreError = (contextLabel, err) => {
    console.error(`Erro Firestore [${contextLabel}]:`, err);
    const code = err?.code || '';
    if (code === 'permission-denied') {
      setFirestoreError(
        'Permissão negada no banco de dados (permission-denied). Verifique as regras de segurança do Firestore.'
      );
      showToast('Sem permissão no banco de dados para esta operação.', 'error');
    } else if (code === 'unavailable' || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      setFirestoreError('Conexão instável ou sem internet (unavailable). Alterações serão sincronizadas ao reconectar.');
      showToast('Sem conexão com o banco de dados no momento.', 'error');
    } else {
      showToast(`Falha em ${contextLabel}: ${err?.message || 'erro inesperado'}.`, 'error');
    }
  };

  const registrarAuditoria = async (acao, detalhes, operadorOverride = null) => {
    if (!db || !fbUser) return;
    const op = operadorOverride || currentOperator || { id: 'cliente-online', nome: 'Loja Virtual / Cliente' };
    try {
      const colRef = getPublicCol('auditoria');
      if (!colRef) return;
      await addDoc(colRef, {
        acao: String(acao || 'Ação'),
        detalhes: String(detalhes || ''),
        usuarioId: String(op.id || 'desconhecido'),
        usuarioNome: String(op.nome || 'Operador'),
        dataHora: new Date().toISOString()
      });
    } catch (err) {
      console.error('Erro ao registrar auditoria:', err);
    }
  };

  // ==========================================================================
  // 5. AUTENTICAÇÃO RESILIENTE
  // ==========================================================================
  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      setLoadingInitial(false);
      return;
    }

    let cancelled = false;

    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error('Erro na autenticação anônima:', err);
        if (!cancelled) {
          setFirestoreError('Falha na autenticação com o Firebase. Verifique se o login Anônimo está ativado.');
        }
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (!cancelled) {
          setFbUser(user);
          setAuthReady(true);
          if (user) {
            setFirestoreError((prev) =>
              prev && prev.includes('autenticação') ? '' : prev
            );
          }
        }
      },
      (err) => {
        console.error('onAuthStateChanged erro:', err);
        if (!cancelled) setAuthReady(true);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // ==========================================================================
  // 6. SINCRONIZAÇÃO EM TEMPO REAL + INICIALIZAÇÃO SEGURA DE DADOS BASE
  // ==========================================================================
  useEffect(() => {
    if (!authReady) return;
    if (!db || !fbUser) {
      setLoadingInitial(false);
      return;
    }

    let usersLoaded = false;
    let configLoaded = false;

    const checkLoaded = () => {
      if (usersLoaded && configLoaded) {
        setLoadingInitial(false);
      }
    };

    const configRef = getPublicDoc('configuracoes_loja', 'principal');
    if (configRef) {
      setDoc(configRef, DEFAULT_STORE_CONFIG, { merge: true }).catch((err) => {
        console.error('Seed config falhou:', err);
      });
    }

    const unsubUsuarios = onSnapshot(
      getPublicCol('usuarios'),
      async (snapshot) => {
        const list = safeArr(snapshot?.docs).map((d) => ({ id: d.id, ...d.data() }));
        setUsuarios(list);

        if (!usersLoaded) {
          usersLoaded = true;
          if (list.length === 0) {
            try {
              const adminRef = getPublicDoc('usuarios', 'admin-demo-0000');
              if (adminRef) {
                await setDoc(
                  adminRef,
                  {
                    nome: 'Administrador (Demo)',
                    cargo: 'Administrador',
                    pin: '0000',
                    status: 'Ativo',
                    isDemo: true,
                    criadoEm: new Date().toISOString()
                  },
                  { merge: true }
                );
              }
            } catch (seedErr) {
              handleFirestoreError('criação do usuário demo inicial', seedErr);
            }
          }
          checkLoaded();
        }
      },
      (err) => {
        usersLoaded = true;
        handleFirestoreError('escuta de usuários', err);
        checkLoaded();
      }
    );

    const unsubConfig = onSnapshot(
      getPublicDoc('configuracoes_loja', 'principal'),
      (docSnap) => {
        if (docSnap?.exists()) {
          setStoreConfig((prev) => ({ ...DEFAULT_STORE_CONFIG, ...prev, ...docSnap.data() }));
        }
        configLoaded = true;
        checkLoaded();
      },
      (err) => {
        configLoaded = true;
        handleFirestoreError('escuta de configurações', err);
        checkLoaded();
      }
    );

    const unsubProdutos = onSnapshot(
      getPublicCol('produtos'),
      (snapshot) => {
        const list = safeArr(snapshot?.docs).map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')));
        setProdutos(list);
      },
      (err) => handleFirestoreError('escuta de produtos', err)
    );

    const unsubVariacoes = onSnapshot(
      getPublicCol('variacoes'),
      (snapshot) => {
        const list = safeArr(snapshot?.docs).map((d) => ({ id: d.id, ...d.data() }));
        setVariacoes(list);
      },
      (err) => handleFirestoreError('escuta de variações', err)
    );

    const unsubVendas = onSnapshot(
      getPublicCol('vendas'),
      (snapshot) => {
        const list = safeArr(snapshot?.docs).map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => String(b.dataHora || '').localeCompare(String(a.dataHora || '')));
        setVendas(list);
      },
      (err) => handleFirestoreError('escuta de vendas', err)
    );

    const unsubCaixas = onSnapshot(
      getPublicCol('caixas'),
      (snapshot) => {
        const list = safeArr(snapshot?.docs).map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => String(b.aberturaData || '').localeCompare(String(a.aberturaData || '')));
        setCaixas(list);
      },
      (err) => handleFirestoreError('escuta de caixas', err)
    );

    const unsubMovCaixa = onSnapshot(
      getPublicCol('movimentacoes_caixa'),
      (snapshot) => {
        const list = safeArr(snapshot?.docs).map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => String(b.dataHora || '').localeCompare(String(a.dataHora || '')));
        setMovimentacoesCaixa(list);
      },
      (err) => handleFirestoreError('escuta de movimentações do caixa', err)
    );

    const unsubDespesas = onSnapshot(
      getPublicCol('despesas'),
      (snapshot) => {
        const list = safeArr(snapshot?.docs).map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
        setDespesas(list);
      },
      (err) => handleFirestoreError('escuta de despesas', err)
    );

    const unsubPedidos = onSnapshot(
      getPublicCol('pedidos_online'),
      (snapshot) => {
        const list = safeArr(snapshot?.docs).map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => String(b.dataHora || '').localeCompare(String(a.dataHora || '')));
        setPedidosOnline(list);
      },
      (err) => handleFirestoreError('escuta de pedidos online', err)
    );

    const unsubAuditoria = onSnapshot(
      getPublicCol('auditoria'),
      (snapshot) => {
        const list = safeArr(snapshot?.docs).map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => String(b.dataHora || '').localeCompare(String(a.dataHora || '')));
        setLogsAuditoria(list.slice(0, 100));
      },
      (err) => handleFirestoreError('escuta de auditoria', err)
    );

    return () => {
      unsubUsuarios();
      unsubConfig();
      unsubProdutos();
      unsubVariacoes();
      unsubVendas();
      unsubCaixas();
      unsubMovCaixa();
      unsubDespesas();
      unsubPedidos();
      unsubAuditoria();
    };
  }, [authReady, fbUser]);

  useEffect(() => {
    if (!currentOperator) return;
    const updated = safeArr(usuarios).find((u) => u.id === currentOperator.id);
    if (updated) {
      if (updated.status === 'Bloqueado') {
        setCurrentOperator(null);
        showToast('Seu acesso foi bloqueado pelo Administrador.', 'error');
      } else {
        setCurrentOperator(updated);
      }
    }
  }, [usuarios, currentOperator]);

  const caixaAberto = useMemo(() => {
    return safeArr(caixas).find((c) => c && c.status === 'Aberto') || null;
  }, [caixas]);

  const isAdmin = currentOperator?.cargo === 'Administrador';

  useEffect(() => {
    if (!isAdmin && activeTab === 'configuracoes') {
      setActiveTab('dashboard');
    }
  }, [isAdmin, activeTab]);

  const triggerThermalPrint = (receiptData) => {
    if (!receiptData) return;
    setReceiptToPrint(receiptData);
    setTimeout(() => {
      try {
        if (typeof window !== 'undefined' && typeof window.print === 'function') {
          window.print();
        }
      } catch (err) {
        console.error('Erro ao disparar impressão:', err);
      }
    }, 250);
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold tracking-tight">Carregando Sistema Comercial...</h2>
        <p className="text-slate-400 text-sm mt-1">Conectando ao banco de dados e sincronizando permissões</p>
      </div>
    );
  }

  if (isStorefrontMode) {
    return (
      <>
        {firestoreError && (
          <div className="bg-amber-900 text-amber-100 text-xs px-4 py-2 text-center flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>{firestoreError}</span>
          </div>
        )}
        <StorefrontView
          storeConfig={storeConfig}
          produtos={produtos}
          variacoes={variacoes}
          onBackToErp={() => setIsStorefrontMode(false)}
          showToast={showToast}
          registrarAuditoria={registrarAuditoria}
        />
        <ToastContainer toasts={toasts} />
      </>
    );
  }

  if (!currentOperator) {
    const activeUsers = safeArr(usuarios).filter((u) => u && u.status === 'Ativo');
    const demoUserExists = activeUsers.some((u) => u.pin === '0000' && u.isDemo);

    const handlePinDigit = (digit) => {
      if (pinInput.length >= 4) return;
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      setLoginError('');

      if (nextPin.length === 4) {
        const matched = selectedUserForPin
          ? activeUsers.find((u) => u.id === selectedUserForPin && u.pin === nextPin)
          : activeUsers.find((u) => u.pin === nextPin);

        if (matched) {
          setCurrentOperator(matched);
          setPinInput('');
          setLoginError('');
          showToast(`Bem-vindo(a), ${matched.nome}!`, 'success');
          registrarAuditoria(
            'Login no Sistema',
            `Operador ${matched.nome} (${matched.cargo}) acessou o sistema.`,
            matched
          );
        } else {
          const blockedMatch = safeArr(usuarios).find((u) => u.pin === nextPin && u.status === 'Bloqueado');
          if (blockedMatch) {
            setLoginError('Usuário bloqueado. Contate o Administrador.');
          } else {
            setLoginError('PIN inválido ou usuário não encontrado.');
          }
          setTimeout(() => setPinInput(''), 550);
        }
      }
    };

    const handleBackspace = () => {
      setPinInput((prev) => prev.slice(0, -1));
      setLoginError('');
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6">
        <div className="max-w-5xl w-full mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {storeConfig.logoUrl ? (
              <img
                src={storeConfig.logoUrl}
                alt="Logo"
                className="w-10 h-10 rounded-xl object-cover bg-white p-0.5"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-lg shadow-lg">
                <Store className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-lg leading-tight">{storeConfig.nomeFantasia}</h1>
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <span className={`w-2 h-2 rounded-full ${db && fbUser ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {db && fbUser ? 'Banco em Nuvem Conectado' : 'Modo Local / Reconectando'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsStorefrontMode(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium transition-all"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            Abrir Loja Virtual (Cliente)
          </button>
        </div>

        {firestoreError && (
          <div className="max-w-md w-full mx-auto mt-4 p-3 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5">
            <WifiOff className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{firestoreError}</span>
          </div>
        )}

        <div className="max-w-md w-full mx-auto my-6 bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Lock className="w-7 h-7 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Acesso Rápido por PIN</h2>
            <p className="text-slate-400 text-sm mt-1">Digite seu PIN numérico de 4 dígitos</p>
          </div>

          {demoUserExists && (
            <div className="mb-5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-amber-300">Demonstração Inicial</span>
                Use o PIN <strong className="font-mono bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-200">0000</strong> para o Administrador inicial. Crie sua equipe e altere este PIN após o primeiro acesso.
              </div>
            </div>
          )}

          {activeUsers.length > 1 && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Selecionar Funcionário (Opcional)
              </label>
              <select
                value={selectedUserForPin}
                onChange={(e) => {
                  setSelectedUserForPin(e.target.value);
                  setPinInput('');
                  setLoginError('');
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Qualquer usuário ativo com este PIN</option>
                {activeUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} ({u.cargo})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-center gap-4 my-6">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
                  pinInput.length > idx
                    ? 'bg-emerald-500 border-emerald-400 scale-110 shadow-md shadow-emerald-500/40'
                    : 'bg-slate-800 border-slate-600'
                }`}
              />
            ))}
          </div>

          {loginError && (
            <p className="text-center text-rose-400 text-xs font-medium mb-4 bg-rose-500/10 py-2 px-3 rounded-xl border border-rose-500/20">
              {loginError}
            </p>
          )}

          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handlePinDigit(num)}
                className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700/80 text-xl font-bold text-white transition-all"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPinInput('');
                setLoginError('');
              }}
              className="h-14 rounded-2xl bg-slate-800/50 hover:bg-slate-800 text-xs font-semibold text-slate-400 transition-all"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => handlePinDigit('0')}
              className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700/80 text-xl font-bold text-white transition-all"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-14 rounded-2xl bg-slate-800/50 hover:bg-slate-800 text-sm font-semibold text-slate-300 transition-all"
            >
              ⌫
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500">
          Gestão Comercial ERP • PDV • Grade de Estoque • Loja Virtual Sincronizada
        </div>
        <ToastContainer toasts={toasts} />
      </div>
    );
  }

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
    { id: 'usuarios', label: 'Equipe e Acessos', icon: Users, adminOnly: false },
    { id: 'configuracoes', label: 'Configurações da Loja', icon: Settings, adminOnly: true },
    { id: 'status_sistema', label: 'Status e Integrações', icon: Activity, adminOnly: false }
  ];

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col md:flex-row">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-print-area, #thermal-print-area * {
            visibility: visible !important;
          }
          #thermal-print-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: ${storeConfig.larguraCupom === '58mm' ? '58mm' : '80mm'} !important;
            padding: 4mm !important;
            background: #fff !important;
            color: #000 !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 11px !important;
            line-height: 1.3 !important;
            z-index: 99999 !important;
          }
        }
      `}</style>

      {receiptToPrint && (
        <div id="thermal-print-area" className="hidden print:block">
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '6px' }}>
            <strong style={{ fontSize: '13px', display: 'block' }}>{storeConfig.nomeFantasia}</strong>
            <span>{storeConfig.razaoSocial}</span><br />
            <span>CNPJ: {storeConfig.cnpj} | IE: {storeConfig.inscricaoEstadual}</span><br />
            <span>{storeConfig.endereco}</span><br />
            <span>Tel: {storeConfig.telefone}</span>
          </div>
          <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '6px' }}>
            COMPROVANTE NÃO FISCAL<br />
            <span style={{ fontSize: '9px', fontWeight: 'normal' }}>(Documento interno - sem validade fiscal SEFAZ)</span>
          </div>
          <div style={{ borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '6px' }}>
            <div>Data: {formatDateTime(receiptToPrint.dataHora)}</div>
            <div>Código: #{String(receiptToPrint.id || '').slice(-6).toUpperCase()}</div>
            <div>Responsável: {receiptToPrint.usuarioNome || currentOperator.nome}</div>
            {receiptToPrint.clienteNome && <div>Cliente: {receiptToPrint.clienteNome}</div>}
          </div>
          <div style={{ borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '6px' }}>
            {safeArr(receiptToPrint.itens).map((item, idx) => (
              <div key={idx} style={{ marginBottom: '4px' }}>
                <div>{item.produtoNome} ({item.tamanho}/{item.cor})</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{safeNum(item.quantidade)}x {formatBRL(item.precoUnitario)}</span>
                  <strong>{formatBRL(item.subtotal)}</strong>
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal:</span>
              <span>{formatBRL(receiptToPrint.subtotal ?? receiptToPrint.total)}</span>
            </div>
            {safeNum(receiptToPrint.desconto) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Desconto:</span>
                <span>-{formatBRL(receiptToPrint.desconto)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', marginTop: '4px' }}>
              <span>TOTAL:</span>
              <span>{formatBRL(receiptToPrint.total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span>Pagamento:</span>
              <span>{receiptToPrint.formaPagamento}</span>
            </div>
            {receiptToPrint.formaPagamento === 'Dinheiro' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Recebido:</span>
                  <span>{formatBRL(receiptToPrint.valorRecebido)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Troco:</span>
                  <span>{formatBRL(receiptToPrint.troco)}</span>
                </div>
              </>
            )}
          </div>
          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            {storeConfig.mensagemRodape}
          </div>
        </div>
      )}

      <aside className="hidden md:flex md:w-64 lg:w-72 bg-slate-950 text-slate-200 flex-col justify-between shrink-0 border-r border-slate-800">
        <div>
          <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
            {storeConfig.logoUrl ? (
              <img
                src={storeConfig.logoUrl}
                alt="Logo"
                className="w-10 h-10 rounded-xl object-cover bg-white p-0.5 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-bold text-white text-sm truncate">{storeConfig.nomeFantasia}</h1>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Sincronizado
              </span>
            </div>
          </div>

          <nav className="p-3 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </span>
                  {item.badge > 0 && (
                    <span className="bg-amber-500 text-slate-950 text-xs font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pt-3 mt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setIsStorefrontMode(true)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 transition-all"
              >
                <span className="flex items-center gap-3">
                  <ExternalLink className="w-4 h-4" />
                  Ver Loja Virtual
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between mb-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{currentOperator.nome}</p>
              <span
                className={`inline-block text-[11px] px-2 py-0.5 rounded-md font-medium mt-0.5 ${
                  isAdmin ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {currentOperator.cargo}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setCurrentOperator(null);
                setPinInput('');
              }}
              title="Bloquear / Trocar Operador"
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="text-[11px] flex items-center justify-between text-slate-400">
            <span>Status do Caixa:</span>
            {caixaAberto ? (
              <span className="text-emerald-400 font-semibold">● Aberto</span>
            ) : (
              <span className="text-rose-400 font-semibold">● Fechado</span>
            )}
          </div>
        </div>
      </aside>

      <header className="md:hidden bg-slate-950 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-900 text-slate-200"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div>
            <h1 className="font-bold text-sm leading-tight">{storeConfig.nomeFantasia}</h1>
            <p className="text-[11px] text-slate-400">
              {currentOperator.nome} ({currentOperator.cargo})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsStorefrontMode(true)}
            className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-600/30"
            title="Loja Virtual"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentOperator(null)}
            className="p-2 rounded-xl bg-slate-900 text-rose-400"
            title="Trocar Operador"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="w-72 bg-slate-950 h-full p-4 flex flex-col justify-between border-r border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1 mt-2">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium ${
                      isActive ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </span>
                    {item.badge > 0 && (
                      <span className="bg-amber-500 text-slate-950 text-xs font-bold px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setIsStorefrontMode(true);
              }}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              Abrir Loja Virtual
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {firestoreError && (
          <div className="mb-4 bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs text-rose-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{firestoreError}</span>
            </div>
            <button
              type="button"
              onClick={() => setFirestoreError('')}
              className="text-rose-700 font-bold hover:underline shrink-0"
            >
              Fechar
            </button>
          </div>
        )}

        {currentOperator.isDemo && (
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Acesso de <strong>Demonstração Inicial (PIN 0000)</strong>. Cadastre sua equipe e altere este PIN em <strong>Equipe e Acessos</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('usuarios')}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-colors"
            >
              Gerenciar Usuários
            </button>
          </div>
        )}

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
            onDbError={handleFirestoreError}
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
            onDbError={handleFirestoreError}
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
            onDbError={handleFirestoreError}
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
            onDbError={handleFirestoreError}
          />
        )}

        {activeTab === 'usuarios' && (
          <UsuariosView
            usuarios={usuarios}
            currentOperator={currentOperator}
            isAdmin={isAdmin}
            showToast={showToast}
            registrarAuditoria={registrarAuditoria}
            onDbError={handleFirestoreError}
          />
        )}

        {activeTab === 'configuracoes' && isAdmin && (
          <ConfiguracoesLojaView
            storeConfig={storeConfig}
            currentOperator={currentOperator}
            showToast={showToast}
            registrarAuditoria={registrarAuditoria}
            onDbError={handleFirestoreError}
          />
        )}

        {activeTab === 'status_sistema' && <StatusSistemaView />}
      </main>

      <ToastContainer toasts={toasts} />
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

          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4
