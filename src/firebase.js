// =====================================================================
// firebase.js — Módulo de integração com Firebase Firestore
//
// COMO CONFIGURAR:
// 1. Acesse https://console.firebase.google.com/ e crie um projeto.
// 2. Ative o Firestore no modo de banco de dados.
// 3. Copie as credenciais do seu app Firebase para FIREBASE_CONFIG abaixo.
// 4. Defina as regras de segurança do Firestore (leitura/escrita pública para testes).
// =====================================================================

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDMRvUf6SoTmDmqcFRD5pJbPjBYJ6VwuzU",
  authDomain: "duelo-sala.firebaseapp.com",
  projectId: "duelo-sala",
  storageBucket: "duelo-sala.firebasestorage.app",
  messagingSenderId: "483039726893",
  appId: "1:483039726893:web:f32bd8056fdf17d842d7a4"
};

let db = null;
let firebaseInitializado = false;

/**
 * Inicializa o Firebase. Chamado uma vez ao montar o App.
 * Se as credenciais estiverem vazias, opera em modo offline silencioso.
 */
export function initFirebase() {
  try {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.warn('[Firebase] Credenciais não configuradas. Sincronização com nuvem desativada.');
      return;
    }
    if (getApps().length === 0) {
      const app = initializeApp(firebaseConfig);
      db = getFirestore(app);
    } else {
      db = getFirestore(getApps()[0]);
    }
    firebaseInitializado = true;
    console.log('[Firebase] Inicializado com sucesso.');
  } catch (e) {
    console.error('[Firebase] Erro ao inicializar:', e);
  }
}

/**
 * Salva um backup do estado do jogo Imagem & Ação no Firestore.
 * @param {Object} payload - Objeto com o estado do jogo.
 * @returns {Promise<boolean>} true se salvo com sucesso.
 */
export async function salvarBackupImAcao(payload) {
  if (!firebaseInitializado || !db) {
    console.warn('[Firebase] Backup ignorado: Firebase não inicializado.');
    return false;
  }
  try {
    const ref = doc(db, 'backups', 'imacao');
    await setDoc(ref, { ...payload, _updatedAt: new Date().toISOString() });
    return true;
  } catch (e) {
    console.error('[Firebase] Erro ao salvar backup:', e);
    throw e;
  }
}

/**
 * Publica o banco de dados completo na nuvem, identificado por um código de sala.
 * @param {string} codigoSala - Código único da sala (ex: "SALA123").
 * @param {Object} payload - Dados completos do banco de perguntas/cartas.
 * @returns {Promise<boolean>} true se publicado com sucesso, false se Firebase não ativo.
 */
export async function publicarBancoNuvem(codigoSala, payload) {
  if (!firebaseInitializado || !db) {
    console.warn('[Firebase] Publicação ignorada: Firebase não inicializado.');
    return false;
  }
  try {
    const chave = codigoSala.trim().toUpperCase();
    const ref = doc(db, 'salas', chave);
    await setDoc(ref, { ...payload, _updatedAt: new Date().toISOString() });
    return true;
  } catch (e) {
    console.error('[Firebase] Erro ao publicar banco na nuvem:', e);
    throw e;
  }
}

/**
 * Obtém o banco de dados da nuvem pelo código de sala.
 * @param {string} codigoSala - Código único da sala.
 * @returns {Promise<Object|null>} Dados da sala ou null se não encontrado.
 */
export async function obterBancoNuvem(codigoSala) {
  if (!firebaseInitializado || !db) {
    console.warn('[Firebase] Busca ignorada: Firebase não inicializado.');
    return null;
  }
  try {
    const chave = codigoSala.trim().toUpperCase();
    const ref = doc(db, 'salas', chave);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (e) {
    console.error('[Firebase] Erro ao obter banco da nuvem:', e);
    throw e;
  }
}
