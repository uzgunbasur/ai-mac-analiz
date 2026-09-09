/**
 * AI MatchPulse - Firebase Cloud Firestore Entegrasyon Servisi
 * Firebase v10 CDN ES Modules - Zero Build Tool / Zero Dependencies
 * Gerçek zamanlı (onSnapshot) çift yönlü bulut senkronizasyonu sağlar.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export const firebaseConfig = {
  apiKey: "AIzaSyA3Ops_j5_nIJLQfNc1FQIL-NNiqcHcfHk",
  authDomain: "menajer-panel.firebaseapp.com",
  projectId: "menajer-panel",
  storageBucket: "menajer-panel.firebasestorage.app",
  messagingSenderId: "110681218557",
  appId: "1:110681218557:web:02947f2c1164fe1df84d94",
  measurementId: "G-PMJ01YGHMZ"
};

const MATCHES_COLLECTION = 'aimatchpulse_matches';
const CONFIG_COLLECTION = 'aimatchpulse_config';
const CONFIG_DOC_ID = 'settings';

class FirebaseMatchService {
  constructor() {
    this.app = null;
    this.db = null;
    this.isOnline = false;
    this.unsubscribeMatches = null;
    this.unsubscribeConfig = null;
    this.statusListeners = [];
  }

  init() {
    try {
      this.app = initializeApp(firebaseConfig);
      this.db = getFirestore(this.app);
      this.isOnline = true;
      this.notifyStatus(true);
      console.log('⚡ Firebase Cloud Firestore bağlantısı kuruldu.');
      return true;
    } catch (err) {
      console.warn('⚠️ Firebase başlatılamadı, yerel fallback modunda çalışılıyor:', err);
      this.isOnline = false;
      this.notifyStatus(false, err.message);
      return false;
    }
  }

  onConnectionChange(callback) {
    if (typeof callback === 'function') {
      this.statusListeners.push(callback);
      callback(this.isOnline);
    }
  }

  notifyStatus(status, error = null) {
    this.isOnline = status;
    this.statusListeners.forEach(fn => {
      try { fn(status, error); } catch (e) {}
    });
  }

  /**
   * Firestore doküman ID'leri için anahtar temizleme (slashes "/" geçersizdir)
   */
  sanitizeKey(key) {
    return String(key || '').trim().replace(/\//g, '___');
  }

  /**
   * Gerçek Zamanlı Maç Dinleyicisi (onSnapshot)
   * Herhangi bir kullanıcı maç eklediğinde, skoru güncellediğinde veya sildiğinde anında tetiklenir.
   */
  subscribeToMatches(onDataReceived, onError) {
    if (!this.db) {
      if (onError) onError(new Error('Firestore başlatılmadı'));
      return () => {};
    }

    try {
      const colRef = collection(this.db, MATCHES_COLLECTION);
      this.unsubscribeMatches = onSnapshot(colRef, (snapshot) => {
        const matches = {};
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          const key = docSnap.id;
          matches[key] = data;
        });

        this.notifyStatus(true);
        if (onDataReceived) onDataReceived(matches);
      }, (err) => {
        console.warn('Firestore onSnapshot hatası:', err);
        this.notifyStatus(false, err.message);
        if (onError) onError(err);
      });

      return this.unsubscribeMatches;
    } catch (err) {
      console.warn('subscribeToMatches başlatılamadı:', err);
      this.notifyStatus(false, err.message);
      if (onError) onError(err);
      return () => {};
    }
  }

  /**
   * Gerçek Zamanlı Ayarlar / AI Listesi Dinleyicisi
   */
  subscribeToConfig(onConfigReceived) {
    if (!this.db) return () => {};

    try {
      const docRef = doc(this.db, CONFIG_COLLECTION, CONFIG_DOC_ID);
      this.unsubscribeConfig = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists() && onConfigReceived) {
          onConfigReceived(docSnap.data());
        }
      }, (err) => {
        console.warn('Config snapshot hatası:', err);
      });
      return this.unsubscribeConfig;
    } catch (err) {
      return () => {};
    }
  }

  /**
   * Tek Bir Maçı Buluta Kaydet / Güncelle
   */
  async saveMatch(matchKey, matchData) {
    if (!this.db) return false;
    const safeKey = this.sanitizeKey(matchKey);
    try {
      const docRef = doc(this.db, MATCHES_COLLECTION, safeKey);
      await setDoc(docRef, {
        ...matchData,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error(`Buluta maç kaydedilemedi (${safeKey}):`, err);
      return false;
    }
  }

  /**
   * Toplu Maç Kaydet (Batch Write)
   */
  async saveMatchesBatch(matchesMap) {
    if (!this.db || !matchesMap) return false;
    try {
      const batch = writeBatch(this.db);
      const nowIso = new Date().toISOString();

      Object.entries(matchesMap).forEach(([key, data]) => {
        const safeKey = this.sanitizeKey(key);
        const docRef = doc(this.db, MATCHES_COLLECTION, safeKey);
        batch.set(docRef, {
          ...data,
          updatedAt: nowIso
        }, { merge: true });
      });

      await batch.commit();
      return true;
    } catch (err) {
      console.error('Batch maç kaydı hatası:', err);
      return false;
    }
  }

  /**
   * Tek Bir Maçı Buluttan Sil
   */
  async deleteMatch(matchKey) {
    if (!this.db) return false;
    const safeKey = this.sanitizeKey(matchKey);
    try {
      const docRef = doc(this.db, MATCHES_COLLECTION, safeKey);
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      console.error(`Buluttan maç silinemedi (${safeKey}):`, err);
      return false;
    }
  }

  /**
   * Toplu Maç Sil (Batch Delete)
   */
  async deleteMatchesBatch(keysArray) {
    if (!this.db || !keysArray || keysArray.length === 0) return false;
    try {
      const batch = writeBatch(this.db);
      keysArray.forEach(key => {
        const safeKey = this.sanitizeKey(key);
        const docRef = doc(this.db, MATCHES_COLLECTION, safeKey);
        batch.delete(docRef);
      });
      await batch.commit();
      return true;
    } catch (err) {
      console.error('Batch silme hatası:', err);
      return false;
    }
  }

  /**
   * Tüm Maçları Buluttan Sıfırla
   */
  async clearAllMatches() {
    if (!this.db) return false;
    try {
      const colRef = collection(this.db, MATCHES_COLLECTION);
      const snapshot = await getDocs(colRef);
      if (snapshot.empty) return true;

      const batch = writeBatch(this.db);
      snapshot.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      return true;
    } catch (err) {
      console.error('Tüm maçlar temizlenirken hata:', err);
      return false;
    }
  }

  /**
   * Ayarları / Kullanılabilir AI Listesini Kaydet
   */
  async saveAvailableAIs(availableAIs) {
    if (!this.db || !availableAIs) return false;
    try {
      const docRef = doc(this.db, CONFIG_COLLECTION, CONFIG_DOC_ID);
      await setDoc(docRef, {
        availableAIs,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      return false;
    }
  }
}

export const firebaseService = new FirebaseMatchService();
