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
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, getDocs, deleteDoc } from 'firebase/firestore';

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
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn('[Firebase] Credenciais não configuradas. Sincronização com nuvem desativada.');
    return;
  }
  try {
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
    throw e;
  }
}

/**
 * Salva um backup do estado do jogo Imagem & Ação no Firestore.
 * @param {Object} payload - Objeto com o estado do jogo.
 * @returns {Promise<boolean>} true se salvo com sucesso.
 */
export async function salvarBackupImAcao(payload) {
  if (!firebaseInitializado || !db) {
    throw new Error("Firebase não inicializado ou sem conexão com o banco de dados.");
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
    throw new Error("Firebase não inicializado ou sem conexão com o banco de dados.");
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
    throw new Error("Firebase não inicializado ou sem conexão com o banco de dados.");
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

/**
 * Publica o estado principal do Duelo Online.
 */
export async function publicarEstadoDueloOnline(codigoSala, state) {
  if (!firebaseInitializado || !db) {
    throw new Error("Firebase não inicializado ou sem conexão com o banco de dados.");
  }
  try {
    const chave = codigoSala.trim().toUpperCase();
    const ref = doc(db, 'salas', chave, 'duelo', 'estado');
    await setDoc(ref, { ...state, _updatedAt: new Date().toISOString() });
    return true;
  } catch (e) {
    console.error('[Firebase] Erro ao publicar estado do duelo:', e);
    throw e;
  }
}

/**
 * Escuta o estado principal do Duelo Online em tempo real.
 */
export function ouvirEstadoDueloOnline(codigoSala, callback, errorCallback = null) {
  if (!firebaseInitializado || !db) {
    if (errorCallback) errorCallback(new Error("Firebase não inicializado ou sem conexão com o banco de dados."));
    return () => {};
  }
  const chave = codigoSala.trim().toUpperCase();
  const ref = doc(db, 'salas', chave, 'duelo', 'estado');
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    } else {
      callback(null);
    }
  }, (err) => {
    console.error('[Firebase] Erro ao ouvir estado do duelo:', err);
    if (errorCallback) errorCallback(err);
  });
}

/**
 * Envia a resposta individual de um aluno para o Firestore.
 */
export async function enviarRespostaDueloOnline(codigoSala, pid, equipe, optIdx, correct, speedBonus, nomeAluno = '') {
  if (!firebaseInitializado || !db) {
    throw new Error("Firebase não inicializado ou sem conexão com o banco de dados.");
  }
  try {
    const chave = codigoSala.trim().toUpperCase();
    const ref = doc(db, 'salas', chave, 'duelo_respostas', pid);
    await setDoc(ref, {
      team: equipe,
      pid: pid,
      optIdx: optIdx,
      correct: correct,
      speedBonus: speedBonus,
      nomeAluno: nomeAluno,
      timestamp: new Date().toISOString()
    });
    return true;
  } catch (e) {
    console.error("Erro ao gravar aluno no Firestore:", e);
    alert("Falha de conexão com o servidor do jogo! Não foi possível salvar seu jogador no banco de dados.\n\nDetalhes: " + (e.message || String(e)));
    throw e;
  }
}

/**
 * Escuta em tempo real as respostas dos alunos na rodada ativa.
 */
export function ouvirRespostasDueloOnline(codigoSala, callback, errorCallback = null) {
  if (!firebaseInitializado || !db) {
    if (errorCallback) errorCallback(new Error("Firebase não inicializado ou sem conexão com o banco de dados."));
    return () => {};
  }
  const chave = codigoSala.trim().toUpperCase();
  const ref = collection(db, 'salas', chave, 'duelo_respostas');
  return onSnapshot(ref, (snap) => {
    const respostas = [];
    snap.forEach(d => respostas.push(d.data()));
    callback(respostas);
  }, (err) => {
    console.error('[Firebase] Erro ao ouvir respostas do duelo:', err);
    if (errorCallback) errorCallback(err);
  });
}

/**
 * Limpa todas as respostas enviadas na subcoleção duelo_respostas.
 */
export async function limparRespostasDueloOnline(codigoSala) {
  if (!firebaseInitializado || !db) {
    throw new Error("Firebase não inicializado ou sem conexão com o banco de dados.");
  }
  try {
    const chave = codigoSala.trim().toUpperCase();
    const colRef = collection(db, 'salas', chave, 'duelo_respostas');
    const snap = await getDocs(colRef);
    const promessas = [];
    snap.forEach(d => {
      promessas.push(deleteDoc(d.ref));
    });
    await Promise.all(promessas);
    return true;
  } catch (e) {
    console.error('[Firebase] Erro ao limpar respostas do duelo:', e);
    throw e;
  }
}
