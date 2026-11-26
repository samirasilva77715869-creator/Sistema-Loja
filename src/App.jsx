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
    const
