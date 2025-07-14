// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA4X1-9i5F2gmB7Hvrj8YhYY93COWMSnwQ",
  authDomain: "gestor-turno-medico.firebaseapp.com",
  databaseURL: "https://gestor-turno-medico-default-rtdb.firebaseio.com/",
  projectId: "gestor-turno-medico",
  storageBucket: "gestor-turno-medico.firebasestorage.app",
  messagingSenderId: "938179927291",
  appId: "1:938179927291:web:bab860637982f90d8aa45e"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Obtener referencia a la base de datos
const database = firebase.database();

// Variable global para acceso fácil
window.firebaseDB = database;

console.log("🔥 Firebase inicializado correctamente");
