import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDMRvUf6SoTmDmqcFRD5pJbPjBYJ6VwuzU",
  authDomain: "duelo-sala.firebaseapp.com",
  projectId: "duelo-sala",
  storageBucket: "duelo-sala.firebasestorage.app",
  messagingSenderId: "483039726893",
  appId: "1:483039726893:web:f32bd8056fdf17d842d7a4"
};

const backupDocId = import.meta.env.VITE_FIREBASE_BACKUP_ID || 'imagem-acao-backup';
let db = null;

export function initFirebase() {
  if (db) return db;
  if (!firebaseConfig.projectId) {
    console.warn('Firebase não está configurado. Defina as variáveis VITE_FIREBASE_* no .env.');
    return null;
  }

  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    return db;
  } catch (error) {
    console.error('Erro ao inicializar Firebase:', error);
    return null;
  }
}

export async function salvarBackupImAcao(payload) {
  try {
    const firestore = initFirebase();
    if (!firestore) {
      console.warn('salvarBackupImAcao: firestore não inicializado; pular backup.');
      return;
    }

    const backupRef = doc(firestore, 'duelo_sala_backups', backupDocId);
    await setDoc(backupRef, {
      ...payload,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.error('Erro ao salvar backup no Firebase:', error);
    // não propaga para evitar quebrar a UI — deixa o chamador lidar com status
  }
}

export async function publicarBancoNuvem(codigoSala, dados) {
  try {
    const firestore = initFirebase();
    if (!firestore) {
      console.warn('publicarBancoNuvem: firestore não inicializado.');
      return false;
    }

    const docRef = doc(firestore, 'duelo_sala_professores', codigoSala.trim().toUpperCase());
    await setDoc(docRef, {
      ...dados,
      codigoSala: codigoSala.trim().toUpperCase(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Erro ao publicar banco no Firebase:', error);
    throw error;
  }
}

export async function obterBancoNuvem(codigoSala) {
  try {
    const firestore = initFirebase();
    if (!firestore) {
      console.warn('obterBancoNuvem: firestore não inicializado.');
      return null;
    }

    const docRef = doc(firestore, 'duelo_sala_professores', codigoSala.trim().toUpperCase());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error('Erro ao obter banco do Firebase:', error);
    throw error;
  }
}
