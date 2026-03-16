import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyBFLHrv3tC4Gx1RuWnPEti-z4vMK0rArGg",
  authDomain: "yaya-live-agent-eee5f.firebaseapp.com",
  projectId: "yaya-live-agent-eee5f",
  storageBucket: "yaya-live-agent-eee5f.firebasestorage.app",
  messagingSenderId: "195249157935",
  appId: "1:195249157935:web:34d31cb74b08b534f553da"
};

const app = initializeApp(firebaseConfig);

export { app }; const genAI = new GoogleGenAI({ apiKey: "AIzaSyANfI-k8T5ecAZ1OiXTaTyQ2NaaqhM2o-U" });

