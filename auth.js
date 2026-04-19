import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, arrayUnion, arrayRemove, onSnapshot, addDoc, orderBy, limit } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Re-use config from social.js, or better, we can import it if social.js exports it.
// Since we want this accessible globally, let's redefine config quickly or rely on window.firebaseConfig...
// Wait, we can't easily rely on social.js if it doesn't export the app. Let's make a config.js or just re-init here (Firebase 11 allows getApp).

// For ease, we will assume the config is same as social.js. 
// We will just read it from window.firebaseConfig if we export it there, or just re-declare.
// I will re-declare it for safety.
const firebaseConfig = {
  apiKey: "AIzaSyA0XBhY5Burt4YbQrta8Byig81UU-Zt82c",
  authDomain: "avatar-8075f.firebaseapp.com",
  projectId: "avatar-8075f",
  storageBucket: "avatar-8075f.firebasestorage.app",
  messagingSenderId: "734390838910",
  appId: "1:734390838910:web:848d67dcf82dafa71dda2f",
  measurementId: "G-K9GEPBN7ND"
};

const app = initializeApp(firebaseConfig, "AuthApp");
const auth = getAuth(app);
const db = getFirestore(app);

// Helper to prevent infinite hangs if Firestore isn't created
const withTimeout = (promise, ms, name) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Firestore timeout on ${name}. Did you create the Firestore Database in the console?`)), ms))
  ]);
};

window.CognixAuth = {
  auth,
  db,
  currentUser: null,
  userData: null,

  signup: async (email, password, username) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userData = {
        uid: user.uid,
        email: email,
        username: username,
        casesLeft: 10,
        lastReset: new Date().toISOString(),
        voiceEnabled: true,
        friends: [],
        createdAt: new Date().toISOString()
      };

      // Firestore is best-effort so registration still completes if the DB is unavailable.
      try {
        await withTimeout(setDoc(doc(db, "users", user.uid), userData), 5000, "setDoc");
      } catch (error) {
        console.warn("Firestore profile write failed during signup, continuing with local fallback:", error);
        saveLocalProfile(user.uid, userData);
      }

      localStorage.setItem("cognix_voice", "true");
      window.CognixAuth.userData = userData;
      return user;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  login: async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return cred.user;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  logout: async () => {
    await signOut(auth);
    window.location.href = "./index.html";
  },

  checkDailyLimit: async (uid) => {
    try {
      const userRef = doc(db, "users", uid);
      const snap = await withTimeout(getDoc(userRef), 4000, "getDoc");
      
      if (!snap.exists()) {
        return loadLocalProfile(uid);
      }
      
      const data = snap.data();
      const lastResetDate = new Date(data.lastReset);
      const now = new Date();
      
      if (now.getDate() !== lastResetDate.getDate() || now.getMonth() !== lastResetDate.getMonth() || now.getFullYear() !== lastResetDate.getFullYear()) {
        await updateDoc(userRef, {
          casesLeft: 10,
          lastReset: now.toISOString()
        });
        data.casesLeft = 10;
        data.lastReset = now.toISOString();
      }
      saveLocalProfile(uid, data);
      return data;
    } catch (e) {
      console.warn("Skipping DB check due to error:", e.message);
      return loadLocalProfile(uid) || { username: "Local User", casesLeft: 10 }; // Fallback to avoid breaking
    }
  },

  useCase: async (uid) => {
     const data = await window.CognixAuth.checkDailyLimit(uid);
     if (data && data.casesLeft > 0) {
         try {
            await withTimeout(updateDoc(doc(db, "users", uid), {
                casesLeft: data.casesLeft - 1
            }), 3000, "updateDoc");
         } catch(e) { }
         return true;
     }
     return false;
  },

  searchUsers: async (usernameQuery) => {
    if (!usernameQuery) return [];
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", ">=", usernameQuery), where("username", "<=", usernameQuery + "\uf8ff"));
        const snap = await withTimeout(getDocs(q), 5000, "getDocs");
        const results = [];
        snap.forEach(doc => {
            if (doc.data().uid !== window.CognixAuth.currentUser?.uid) {
                results.push(doc.data());
            }
        });
        return results;
    } catch (e) {
        console.error(e);
        return [];
    }
  },

  addFriend: async (friendUid) => {
      const uid = window.CognixAuth.currentUser?.uid;
      if (!uid) return;
      try {
        await updateDoc(doc(db, "users", uid), {
            friends: arrayUnion(friendUid)
        });
      } catch(e) {}
  },

  getFriends: async () => {
      const uids = window.CognixAuth.userData?.friends || [];
      if (!uids.length) return [];
      try {
         const q = query(collection(db, "users"), where("uid", "in", uids));
         const snap = await withTimeout(getDocs(q), 4000, "getFriends");
         const friends = [];
         snap.forEach(d => friends.push(d.data()));
         return friends;
      } catch(e) { return []; }
  },

  sendInvite: async (friendUid, roomId) => {
      try {
         const sender = window.CognixAuth.userData?.username || "Someone";
         await updateDoc(doc(db, "users", friendUid), {
             invites: arrayUnion({ roomId, from: sender, timestamp: Date.now() })
         });
      } catch(e) {}
  },

  saveProblemHistory: async (entry) => {
      const uid = window.CognixAuth.currentUser?.uid;
      if (!uid || !entry) return null;

      const record = {
        ...entry,
        id: entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: entry.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      try {
        await setDoc(doc(db, "users", uid, "problemHistory", record.id), record);
      } catch (error) {
        console.warn("Could not save Cognix problem history to Firestore:", error);
      }

      try {
        const storageKey = `cognix_problem_history_${uid}`;
        const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
        const next = [record, ...existing.filter((item) => item.id !== record.id)].slice(0, 20);
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (error) {
        console.warn("Could not save Cognix problem history to localStorage:", error);
      }

      return record;
  },

  getProblemHistory: async () => {
      const uid = window.CognixAuth.currentUser?.uid;
      if (!uid) return [];

      try {
        const historyRef = collection(db, "users", uid, "problemHistory");
        const snap = await getDocs(query(historyRef, orderBy("createdAt", "desc"), limit(20)));
        const items = [];
        snap.forEach((item) => items.push(item.data()));
        return items;
      } catch (error) {
        console.warn("Falling back to local problem history:", error);
      }

      try {
        const storageKey = `cognix_problem_history_${uid}`;
        return JSON.parse(localStorage.getItem(storageKey) || "[]");
      } catch (error) {
        return [];
      }
  },
  
  clearInvite: async (inviteObj) => {
      try {
         await updateDoc(doc(db, "users", window.CognixAuth.currentUser.uid), {
             invites: arrayRemove(inviteObj)
         });
      } catch(e) {}
  }
};

function loadLocalProfile(uid) {
  try {
    const raw = localStorage.getItem(`cognix_profile_${uid}`);
    if (!raw) {
      return null;
    }

    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") {
      return null;
    }

    return {
      ...data,
      casesLeft: data.casesLeft ?? 10,
      lastReset: data.lastReset || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function saveLocalProfile(uid, data) {
  try {
    localStorage.setItem(`cognix_profile_${uid}`, JSON.stringify(data));
  } catch {
    // Ignore localStorage quota or privacy failures.
  }
}

onAuthStateChanged(auth, async (user) => {
  window.CognixAuth.currentUser = user;
  
  document.querySelectorAll('.auth-protected').forEach(el => {
      el.style.display = user ? 'inline-block' : 'none';
  });

  if (window.authCurrentUnsub) {
      window.authCurrentUnsub();
      window.authCurrentUnsub = null;
  }

  if (user) {
    window.CognixAuth.userData = await window.CognixAuth.checkDailyLimit(user.uid);
    document.dispatchEvent(new CustomEvent('cognix_auth_ready', { detail: { user, userData: window.CognixAuth.userData }}));
    
    // Listen for invites
    window.authCurrentUnsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
       if (docSnap.exists()) {
           const data = docSnap.data();
           if (data.invites && data.invites.length > 0) {
               document.dispatchEvent(new CustomEvent('cognix_receive_invite', { detail: data.invites[0] }));
           }
       }
    });

  } else {
    document.dispatchEvent(new CustomEvent('cognix_auth_ready', { detail: { user: null }}));
  }
});


