import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCDTi7y818BdiBuSb226ey9LLJ92yfF5Po",
    authDomain: "matai-552cc.firebaseapp.com",
    projectId: "matai-552cc",
    storageBucket: "matai-552cc.appspot.com",
    messagingSenderId: "397553247396",
    appId: "1:397553247396:web:5de2f5eeae26f281053231",
    measurementId: "G-G4WLR80P1G"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);