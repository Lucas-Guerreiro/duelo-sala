import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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
