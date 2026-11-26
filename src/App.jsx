import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Store,
  ShoppingBag,
  Package,
  BarChart3,
  Settings,
  Lock,
  Unlock,
  Plus,
  Minus,
  Trash2,
  Search,
  Barcode,
  CheckCircle2,
  AlertCircle,
  Globe,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  Users,
  RefreshCw,
} from 'lucide-react';

// Configuração oficial do Firebase do projeto
const firebaseConfig = {
  apiKey: "AIzaSyDVrcLxpCrT-MplN17tGzAzOJpa5iAiVBM",
  authDomain: "sistemaloja-232f1.firebaseapp.com",
  projectId: "sistemaloja-232f1",
  storageBucket: "sistemaloja-232f1.firebasestorage.app",
  messagingSenderId: "865838406214",
  appId: "1:865838406214:web:d5e86529f0aafe67ae4847",
  measurementId: "G-8JWBR4ZZ0Y",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const DEFAULT_CONFIG = {
  storeName: 'SistemaLoja',
  currency: 'R$',
  adminPin: '1234',
  staffPin: '0000',
  onlineStoreEnabled: true,
  whatsappNumber: '',
};

const DEFAULT_SIZES = ['P', 'M', 'G', 'GG'];
const DEFAULT_COLORS = ['Preto', 'Branco', 'Azul', 'Vermelho'];

function generateBarcode(prefix = '789') {
  const randomDigits = Math.floor(100000000 + Math.random() * 900000000).toString();
  return `${prefix}${randomDigits}`.slice(0, 13);
}

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Sessão local por PIN (admin | staff | null)
  const [role, setRole] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Navegação principal
  const [activeTab, setActiveTab] = useState('pos'); // pos | inventory | online | finance | settings
  const [toast, setToast] = useState(null);

  // Dados sincronizados em tempo real
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Carrinho PDV
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [saleChannel, setSaleChannel] = useState('PDV'); // PDV | Loja Virtual
  const [customerName, setCustomerName] = useState('');

  // Formulário de produto (Grade Tamanho/Cor + Código de Barras)
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCost, setProdCost] = useState('');
  const [prodBarcode, setProdBarcode] = useState(() => generateBarcode());
  const [prodPublishedOnline, setProdPublishedOnline] = useState(true);
  const [matrixSizes, setMatrixSizes] = useState(['P', 'M', 'G']);
  const [matrixColors, setMatrixColors] = useState(['Preto', 'Branco']);
  const [matrixQtyPerVariant, setMatrixQtyPerVariant] = useState('5');

  // Lançamento financeiro manual
  const [txType, setTxType] = useState('expense'); // income | expense
  const [txDesc, setTxDesc] = useState('');
  const [txAmount, setTxAmount] = useState('');

  // Configurações editáveis
  const [cfgForm, setCfgForm] = useState(DEFAULT_CONFIG);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Autenticação anónima no Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        setAuthLoading(false);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          setFirebaseUser(cred.user);
          setAuthError('');
        } catch (err) {
          console.error(err);
          setAuthError('Falha ao autenticar no Firebase. Verifique se o login Anónimo está ativado.');
        } finally {
          setAuthLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Escuta em tempo real das coleções do Firestore após autenticado
  useEffect(() => {
    if (!firebaseUser) return;

    const cfgRef = doc(db, 'settings', 'storeConfig');
    const unsubCfg = onSnapshot(
      cfgRef,
      (snap) => {
        if (snap.exists()) {
          const merged = { ...DEFAULT_CONFIG, ...snap.data() };
          setConfig(merged);
          setCfgForm(merged);
        } else {
          setDoc(cfgRef, DEFAULT_CONFIG).catch(() => {});
        }
      },
      (err) => console.error('Erro config:', err)
    );

    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setProducts(list);
      },
      (err) => console.error('Erro produtos:', err)
    );

    const unsubSales = onSnapshot(
      collection(db, 'sales'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setSales(list);
      },
      (err) => console.error('Erro vendas:', err)
    );

    const unsubTx = onSnapshot(
      collection(db, 'transactions'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setTransactions(list);
      },
      (err) => console.error('Erro financeiro:', err)
    );

    return () => {
      unsubCfg();
      unsubProducts();
      unsubSales();
      unsubTx();
    };
  }, [firebaseUser]);

  // Login por PIN
  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === config.adminPin) {
      setRole('admin');
      setPinError('');
      setPinInput('');
      showToast('Acesso Administrador liberado');
    } else if (pinInput === config.staffPin) {
      setRole('staff');
      setActiveTab('pos');
      setPinError('');
      setPinInput('');
      showToast('Acesso Equipe (PDV) liberado');
    } else {
      setPinError('PIN inválido. Tente novamente.');
    }
  };

  // Filtragem de produtos no PDV e Loja Virtual
  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.color?.toLowerCase().includes(q) ||
        p.size?.toLowerCase().includes(q)
    );
  }, [products, searchTerm]);

  const onlineProducts = useMemo(
    () => products.filter((p) => p.publishedOnline && Number(p.stock) > 0),
    [products]
  );

  // Carrinho
  const addToCart = (product) => {
    const currentStock = Number(product.stock || 0);
    if (currentStock <= 0) {
      showToast('Produto sem estoque disponível', 'error');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.qty + 1 > currentStock) {
          showToast('Quantidade máxima em estoque atingida', 'error');
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          size: product.size || '-',
          color: product.color || '-',
          barcode: product.barcode || '',
          price: Number(product.price || 0),
          qty: 1,
          maxStock: currentStock,
        },
      ];
    });
  };

  const updateCartQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          const nextQty = item.qty + delta;
          if (nextQty <= 0) return null;
          if (nextQty > item.maxStock) {
            showToast('Limite do estoque atingido', 'error');
            return item;
          }
          return { ...item, qty: nextQty };
        })
        .filter(Boolean)
    );
  };

  const cartTotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.price * item.qty, 0),
    [cart]
  );

  // Finalizar venda e sincronizar estoque + financeiro
  const handleCheckout = async (channelOverride = null) => {
    if (cart.length === 0) {
      showToast('Adicione itens ao carrinho antes de finalizar', 'error');
      return;
    }

    const activeChannel = channelOverride || saleChannel;

    try {
      for (const item of cart) {
        const prodDoc = doc(db, 'products', item.id);
        const newStock = Math.max(0, Number(item.maxStock) - Number(item.qty));
        await updateDoc(prodDoc, { stock: newStock });
      }

      await addDoc(collection(db, 'sales'), {
        items: cart,
        total: cartTotal,
        paymentMethod,
        channel: activeChannel,
        customerName: customerName.trim() || 'Cliente Balcão',
        operatorRole: role,
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'transactions'), {
        type: 'income',
        description: `Venda ${activeChannel} (${paymentMethod}) - ${customerName.trim() || 'Consumidor'}`,
        amount: cartTotal,
        createdAt: serverTimestamp(),
      });

      setCart([]);
      setCustomerName('');
      showToast(`Venda de ${config.currency} ${cartTotal.toFixed(2)} registrada!`);
    } catch (err) {
      console.error(err);
      showToast('Erro ao registrar venda no Firestore', 'error');
    }
  };

  // Criar variações de produto na grade Tamanho x Cor
  const toggleMatrixItem = (list, setList, value) => {
    setList((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
    );
  };

  const handleCreateProductMatrix = async (e) => {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice) {
      showToast('Informe nome e preço do produto', 'error');
      return;
    }

    const sizesToUse = matrixSizes.length > 0 ? matrixSizes : ['Único'];
    const colorsToUse = matrixColors.length > 0 ? matrixColors : ['Padrão'];
    const qtyNum = Math.max(0, Number(matrixQtyPerVariant || 0));
    const priceNum = Number(prodPrice);
    const costNum = Number(prodCost || 0);

    try {
      let idx = 0;
      for (const size of sizesToUse) {
        for (const color of colorsToUse) {
          const code =
            idx === 0 && prodBarcode.trim()
              ? prodBarcode.trim()
              : generateBarcode();
          await addDoc(collection(db, 'products'), {
            name: prodName.trim(),
            size,
            color,
            price: priceNum,
            cost: costNum,
            stock: qtyNum,
            barcode: code,
            publishedOnline: prodPublishedOnline,
            createdAt: serverTimestamp(),
          });
          idx += 1;
        }
      }

      setProdName('');
      setProdPrice('');
      setProdCost('');
      setProdBarcode(generateBarcode());
      showToast(`${idx} variação(ões) adicionada(s) ao estoque!`);
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar produto', 'error');
    }
  };

  const handleAdjustStock = async (productId, currentStock, delta) => {
    const nextStock = Math.max(0, Number(currentStock || 0) + delta);
    try {
      await updateDoc(doc(db, 'products', productId), { stock: nextStock });
    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar estoque', 'error');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (role !== 'admin') {
      showToast('Apenas o Administrador pode excluir produtos', 'error');
      return;
    }
    try {
      await deleteDoc(doc(db, 'products', productId));
      showToast('Produto removido');
    } catch (err) {
      console.error(err);
      showToast('Erro ao remover produto', 'error');
    }
  };

  // Lançamento financeiro avulso
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!txDesc.trim() || !txAmount || Number(txAmount) <= 0) {
      showToast('Preencha descrição e valor válido', 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'transactions'), {
        type: txType,
        description: txDesc.trim(),
        amount: Number(txAmount),
        createdAt: serverTimestamp(),
      });
      setTxDesc('');
      setTxAmount('');
      showToast('Lançamento financeiro salvo');
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar lançamento', 'error');
    }
  };

  // Salvar configurações da loja
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (role !== 'admin') {
      showToast('Apenas o Administrador pode alterar configurações', 'error');
      return;
    }
    try {
      await setDoc(
        doc(db, 'settings', 'storeConfig'),
        {
          ...cfgForm,
          adminPin: String(cfgForm.adminPin || '1234').trim(),
          staffPin: String(cfgForm.staffPin || '0000').trim(),
        },
        { merge: true }
      );
      showToast('Configurações da loja salvas!');
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar configurações', 'error');
    }
  };

  // Resumo financeiro
  const financeSummary = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const expense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="flex items-center gap-3 text-slate-700 font-medium">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          Conectando ao Firebase...
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow p-6 border border-red-200">
          <div className="flex items-center gap-2 text-red-600 font-semibold mb-2">
            <AlertCircle className="w-5 h-5" />
            Erro de Conexão
          </div>
          <p className="text-sm text-slate-600">{authError}</p>
        </div>
      </div>
    );
  }

  // Tela de bloqueio por PIN
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg mb-3">
              <Store className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">{config.storeName}</h1>
            <p className="text-xs text-slate-500 mt-1">
              ERP • PDV • Loja Virtual Sincronizada
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Digite o seu PIN de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-center text-lg tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {pinError && (
                <p className="text-xs text-red-600 mt-1.5 font-medium">{pinError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md transition flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              Entrar no Sistema
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400 text-center space-y-1">
            <p>PIN Admin padrão: <strong>{config.adminPin}</strong> • PIN Equipa: <strong>{config.staffPin}</strong></p>
            <p>Altere os PINs na aba Ajustes após entrar.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24">
      {/* Notificação Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium flex items-center gap-2 ${
            toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Cabeçalho */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight text-slate-900">
              {config.storeName}
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              <Users className="w-3 h-3" />
              {role === 'admin' ? 'Administrador' : 'Equipa / Caixa'}
            </span>
          </div>
        </div>

        <button
          onClick={() => setRole(null)}
          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          Bloquear
        </button>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-5xl mx-auto p-4 space-y-5">
        {/* ABA 1: PDV (Ponto de Venda) */}
        {activeTab === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por nome, tamanho, cor ou código de barras..."
                  className="w-full text-sm focus:outline-none"
                />
              </div>

              {filteredProducts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500 text-sm">
                  Nenhum produto registado ainda. Vá a <strong>Estoque</strong> para adicionar itens.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-slate-900">{p.name}</h3>
                          <span className="font-bold text-blue-600 text-sm whitespace-nowrap">
                            {config.currency} {Number(p.price || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2 text-xs">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                            Tam: {p.size || '-'}
                          </span>
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                            Cor: {p.color || '-'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md font-medium ${
                              Number(p.stock) > 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            Estoque: {p.stock}
                          </span>
                        </div>
                        {p.barcode && (
                          <p className="text-[11px] text-slate-400 font-mono mt-2 flex items-center gap-1">
                            <Barcode className="w-3.5 h-3.5" />
                            {p.barcode}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => addToCart(p)}
                        disabled={Number(p.stock) <= 0}
                        className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold transition"
                      >
                        {Number(p.stock) > 0 ? 'Adicionar ao Carrinho' : 'Esgotado'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Carrinho de Venda */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm h-fit space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                  Carrinho ({cart.reduce((s, i) => s + i.qty, 0)})
                </h2>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs text-red-600 font-medium hover:underline"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  O carrinho está vazio.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {item.size} • {item.color} • {config.currency} {item.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateCartQty(item.id, -1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold w-5 text-center">{item.qty}</span>
                        <button
                          onClick={() => updateCartQty(item.id, 1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    Cliente (opcional)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nome do cliente"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Pagamento
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="PIX">PIX</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Cartão">Cartão</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Canal
                    </label>
                    <select
                      value={saleChannel}
                      onChange={(e) => setSaleChannel(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="PDV">Loja Física (PDV)</option>
                      <option value="Loja Virtual">Loja Virtual</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between text-base font-bold text-slate-900 pt-1">
                  <span>Total</span>
                  <span>
                    {config.currency} {cartTotal.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={() => handleCheckout()}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition"
                >
                  Finalizar Venda
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: ESTOQUE & GRADE TAMANHO/COR */}
        {activeTab === 'inventory' && (
          <div className="space-y-5">
            {role === 'admin' ? (
              <form
                onSubmit={handleCreateProductMatrix}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4"
              >
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Registar Produto com Grade (Tamanho x Cor) & Código de Barras
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nome do Produto *
                    </label>
                    <input
                      type="text"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      placeholder="Ex: T-shirt Básica"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Preço de Venda ({config.currency}) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      placeholder="79.90"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Custo Unitário ({config.currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={prodCost}
                      onChange={(e) => setProdCost(e.target.value)}
                      placeholder="35.00"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Tamanhos na Grade
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_SIZES.map((sz) => {
                        const active = matrixSizes.includes(sz);
                        return (
                          <button
                            type="button"
                            key={sz}
                            onClick={() => toggleMatrixItem(matrixSizes, setMatrixSizes, sz)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                              active
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {sz}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Cores na Grade
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_COLORS.map((col) => {
                        const active = matrixColors.includes(col);
                        return (
                          <button
                            type="button"
                            key={col}
                            onClick={() => toggleMatrixItem(matrixColors, setMatrixColors, col)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                              active
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {col}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Qtd Inicial por Variação
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={matrixQtyPerVariant}
                      onChange={(e) => setMatrixQtyPerVariant(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Código de Barras (EAN/SKU)
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={prodBarcode}
                        onChange={(e) => setProdBarcode(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setProdBarcode(generateBarcode())}
                        className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold"
                        title="Gerar novo código"
                      >
                        <Barcode className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 py-2">
                    <input
                      type="checkbox"
                      checked={prodPublishedOnline}
                      onChange={(e) => setProdPublishedOnline(e.target.checked)}
                      className="rounded"
                    />
                    Publicar na Loja Virtual
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition"
                >
                  Guardar Variações no Estoque
                </button>
              </form>
            ) : (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-xs">
                Modo Equipa: pode consultar e ajustar quantidades. A eliminação e criação em lote exigem PIN de Administrador.
              </div>
            )}

            {/* Lista de Estoque */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">
                  Itens em Estoque ({products.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-sm">{p.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {p.size} • {p.color}
                        </span>
                        {p.publishedOnline && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                            Online
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-mono">
                        {config.currency} {Number(p.price || 0).toFixed(2)} • Cód: {p.barcode || '-'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAdjustStock(p.id, p.stock, -1)}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="min-w-[3.5rem] text-center text-xs font-bold bg-slate-50 border border-slate-200 py-1.5 rounded-lg">
                        {p.stock} un
                      </span>
                      <button
                        onClick={() => handleAdjustStock(p.id, p.stock, 1)}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      {role === 'admin' && (
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="w-8 h-8 rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: LOJA VIRTUAL */}
        {activeTab === 'online' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-600" />
                  Montra Online Sincronizada
                </h2>
                <p className="text-xs text-slate-500">
                  Pedidos feitos aqui descontam o estoque em tempo real para o PDV físico.
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  config.onlineStoreEnabled
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {config.onlineStoreEnabled ? 'Loja Ativa' : 'Loja Pausada'}
              </span>
            </div>

            {!config.onlineStoreEnabled ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-sm text-slate-500">
                A Loja Virtual está pausada nos Ajustes.
              </div>
            ) : onlineProducts.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-sm text-slate-500">
                Nenhum produto publicado com estoque disponível no momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {onlineProducts.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-3"
                  >
                    <div>
                      <span className="text-[11px] font-semibold text-blue-600 uppercase">
                        {p.size} • {p.color}
                      </span>
                      <h3 className="font-bold text-slate-900 mt-0.5">{p.name}</h3>
                      <p className="text-lg font-extrabold text-slate-900 mt-2">
                        {config.currency} {Number(p.price || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{p.stock} disponíveis</p>
                    </div>
                    <button
                      onClick={() => {
                        addToCart(p);
                        setSaleChannel('Loja Virtual');
                        setActiveTab('pos');
                      }}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                    >
                      Adicionar ao Pedido
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA 4: FINANCEIRO & VENDAS */}
        {activeTab === 'finance' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  Entradas
                </p>
                <p className="text-xl font-bold text-emerald-700 mt-1">
                  {config.currency} {financeSummary.income.toFixed(2)}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                  Saídas
                </p>
                <p className="text-xl font-bold text-red-600 mt-1">
                  {config.currency} {financeSummary.expense.toFixed(2)}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Wallet className="w-4 h-4 text-blue-600" />
                  Saldo em Caixa
                </p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {config.currency} {financeSummary.balance.toFixed(2)}
                </p>
              </div>
            </div>

            {role === 'admin' && (
              <form
                onSubmit={handleAddTransaction}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="income">Entrada</option>
                    <option value="expense">Saída / Despesa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Descrição
                  </label>
                  <input
                    type="text"
                    value={txDesc}
                    onChange={(e) => setTxDesc(e.target.value)}
                    placeholder="Ex: Eletricidade, Fornecedor"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Valor ({config.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                >
                  Lançar
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-2.5">
                <h3 className="font-bold text-sm text-slate-900">
                  Últimas Vendas ({sales.length})
                </h3>
                {sales.slice(0, 10).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">
                        {s.customerName} • <span className="text-blue-600">{s.channel}</span>
                      </p>
                      <p className="text-slate-400">{s.paymentMethod}</p>
                    </div>
                    <span className="font-bold text-emerald-700">
                      {config.currency} {Number(s.total || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-2.5">
                <h3 className="font-bold text-sm text-slate-900">
                  Fluxo de Caixa ({transactions.length})
                </h3>
                {transactions.slice(0, 10).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0"
                  >
                    <span className="font-medium text-slate-700">{t.description}</span>
                    <span
                      className={`font-bold ${
                        t.type === 'income' ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '-'} {config.currency}{' '}
                      {Number(t.amount || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABA 5: AJUSTES */}
        {activeTab === 'settings' && (
          <form
            onSubmit={handleSaveConfig}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-xl"
          >
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Ajustes da Loja e PINs
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nome da Loja
                </label>
                <input
                  type="text"
                  value={cfgForm.storeName}
                  onChange={(e) => setCfgForm({ ...cfgForm, storeName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Moeda
                </label>
                <input
                  type="text"
                  value={cfgForm.currency}
                  onChange={(e) => setCfgForm({ ...cfgForm, currency: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  PIN Administrador
                </label>
                <input
                  type="text"
                  value={cfgForm.adminPin}
                  onChange={(e) => setCfgForm({ ...cfgForm, adminPin: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  PIN Equipa (PDV)
                </label>
                <input
                  type="text"
                  value={cfgForm.staffPin}
                  onChange={(e) => setCfgForm({ ...cfgForm, staffPin: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={!!cfgForm.onlineStoreEnabled}
                onChange={(e) =>
                  setCfgForm({ ...cfgForm, onlineStoreEnabled: e.target.checked })
                }
              />
              Manter Loja Virtual ativa
            </label>

            <button
              type="submit"
              disabled={role !== 'admin'}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-semibold"
            >
              Guardar Ajustes
            </button>
          </form>
        )}
      </main>

      {/* Barra de Navegação Inferior (Mobile-first) */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-2 py-1.5 z-30">
        <div className="max-w-5xl mx-auto grid grid-cols-5 gap-1 text-[11px] font-semibold">
          <button
            onClick={() => setActiveTab('pos')}
            className={`py-2 rounded-xl flex flex-col items-center gap-0.5 ${
              activeTab === 'pos' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            PDV
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-2 rounded-xl flex flex-col items-center gap-0.5 ${
              activeTab === 'inventory' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'
            }`}
          >
            <Package className="w-4 h-4" />
            Estoque
          </button>

          <button
            onClick={() => setActiveTab('online')}
            className={`py-2 rounded-xl flex flex-col items-center gap-0.5 ${
              activeTab === 'online' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'
            }`}
          >
            <Globe className="w-4 h-4" />
            Loja
          </button>

          <button
            onClick={() => setActiveTab('finance')}
            className={`py-2 rounded-xl flex flex-col items-center gap-0.5 ${
              activeTab === 'finance' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Caixa
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 rounded-xl flex flex-col items-center gap-0.5 ${
              activeTab === 'settings' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'
            }`}
          >
            <Settings className="w-4 h-4" />
            Ajustes
          </button>
        </div>
      </nav>
    </div>
  );
}
