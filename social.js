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
      console.error("Error creating room: ", e);
    }
  },

  joinDebateRoom: (roomId, callback) => {
    console.log("Joining room:", roomId);
    const roomRef = doc(db, "debate_rooms", roomId);
    
    // Връщаме функция (unsubsribe) за спиране на слушането
    return onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
         console.log("Room data changed:", docSnap.data());
         if (callback) callback(docSnap.data());
      } else {
         console.error("Room does not exist!");
      }
    });
  },
  
  addArgument: async (roomId, userId, argumentText) => {
    const roomRef = doc(db, "debate_rooms", roomId);
    // Ъпдейтваме специфично поле arguments.userId
    await updateDoc(roomRef, {
        [`arguments.${userId}`]: argumentText
    });
  }
};

console.log("Cognix Social (Firebase) module loaded!");
