import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyAvBqNaljicbqT_ggQZEbFbMikVgY-ou-s",
  authDomain: "mookata-stock.firebaseapp.com",
  projectId: "mookata-stock",
  storageBucket: "mookata-stock.firebasestorage.app",
  messagingSenderId: "974486982332",
  appId: "1:974486982332:web:9dd632f8bac77e4db94ab9",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
