import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, onSnapshot, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// TODO: Постави своята конфигурация тук!
// За да я намериш: 
// 1. Влез във Firebase Console (console.firebase.google.com)
// 2. Кликни върху зъбното колело (Project Settings) горе вляво -> General
// 3. Скролни надолу до "Your apps" и избери иконката "</>" за уеб приложение
// 4. Регистрирай приложение с произволно име
// 5. Копирай обекта firebaseConfig и го постави тук:

const firebaseConfig = {
  apiKey: "AIzaSyA0XBhY5Burt4YbQrta8Byig81UU-Zt82c",
  authDomain: "avatar-8075f.firebaseapp.com",
  projectId: "avatar-8075f",
  storageBucket: "avatar-8075f.firebasestorage.app",
  messagingSenderId: "734390838910",
  appId: "1:734390838910:web:848d67dcf82dafa71dda2f",
  measurementId: "G-K9GEPBN7ND"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const LOCAL_ROOMS_KEY = "cognix_social_rooms";

function readLocalRooms() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ROOMS_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeLocalRooms(rooms) {
  try {
    localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(rooms));
  } catch {
    // Ignore storage failures.
  }
}

function readLocalRoom(roomId) {
  return readLocalRooms()[roomId] || null;
}

// Експортираме глобален обект, за да може да се ползва от app.js или конзолата
window.CognixSocial = {
  db,
  
  createDebateRoom: async (context, viewpointsCount) => {
    try {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const roomRef = doc(db, "debate_rooms", roomId);
      
      await setDoc(roomRef, {
        roomId: roomId,
        status: "waiting",
        context: context,
        viewpointsCount: viewpointsCount,
        arguments: {}, // тук ще се пазят доводите на участниците
        createdAt: new Date(),
        finalVerdict: null
      });
      
      console.log("Room created! ID:", roomId);
      return roomId;
    } catch (e) {
      console.warn("Falling back to local social room:", e);
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const rooms = readLocalRooms();
      rooms[roomId] = {
        roomId,
        status: "waiting",
        context,
        viewpointsCount,
        arguments: {},
        createdAt: new Date().toISOString(),
        finalVerdict: null
      };
      writeLocalRooms(rooms);
      return roomId;
    }
  },

  joinDebateRoom: (roomId, callback) => {
    console.log("Joining room:", roomId);
    const roomRef = doc(db, "debate_rooms", roomId);
    
    const localRoom = readLocalRoom(roomId);
    if (localRoom) {
      let lastPayload = "";
      const tick = () => {
        const room = readLocalRoom(roomId);
        if (!room) {
          return;
        }

        const payload = JSON.stringify(room);
        if (payload === lastPayload) {
          return;
        }

        lastPayload = payload;
        if (callback) callback(room);
      };

      tick();
      const interval = setInterval(tick, 500);
      return () => clearInterval(interval);
    }

    // Връщаме функция (unsubsribe) за спиране на слушането
    try {
      return onSnapshot(roomRef, (docSnap) => {
        if (docSnap.exists()) {
          console.log("Room data changed:", docSnap.data());
          if (callback) callback(docSnap.data());
        } else {
          console.warn("Room does not exist in Firestore, using local fallback.");
          const room = readLocalRoom(roomId);
          if (room && callback) {
            callback(room);
          }
        }
      });
    } catch (error) {
      console.warn("Falling back to local room listener:", error);
      let lastPayload = "";

      const tick = () => {
        const room = readLocalRoom(roomId);
        if (!room) {
          return;
        }

        const payload = JSON.stringify(room);
        if (payload === lastPayload) {
          return;
        }

        lastPayload = payload;
        if (callback) callback(room);
      };

      tick();
      const interval = setInterval(tick, 500);
      return () => clearInterval(interval);
    }
  },
  
  addArgument: async (roomId, userId, argumentText) => {
    const roomRef = doc(db, "debate_rooms", roomId);
    // Ъпдейтваме специфично поле arguments.userId
    try {
      await updateDoc(roomRef, {
          [`arguments.${userId}`]: argumentText
      });
    } catch (error) {
      console.warn("Updating local social room fallback:", error);
      const rooms = readLocalRooms();
      const room = rooms[roomId];
      if (!room) {
        return;
      }

      room.arguments = room.arguments || {};
      room.arguments[userId] = argumentText;
      room.updatedAt = new Date().toISOString();
      rooms[roomId] = room;
      writeLocalRooms(rooms);
    }
  }
};

console.log("Cognix Social (Firebase) module loaded!");
