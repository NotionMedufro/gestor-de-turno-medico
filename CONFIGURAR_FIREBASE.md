# 🔥 Configuración de Firebase para Sincronización en Tiempo Real

## Paso 1: Crear Proyecto Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en **"Crear un proyecto"**
3. Nombre del proyecto: `gestor-turno-medico` (o el que prefieras)
4. **NO** habilites Google Analytics (no lo necesitamos)
5. Haz clic en **"Crear proyecto"**

## Paso 2: Configurar Realtime Database

1. En el panel izquierdo, haz clic en **"Realtime Database"**
2. Haz clic en **"Crear base de datos"**
3. **Ubicación**: Elige la más cercana (ej: `us-central1`)
4. **Reglas de seguridad**: Selecciona **"Empezar en modo de prueba"**
   
   Las reglas serán:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
   
   ⚠️ **IMPORTANTE**: Estas reglas son para desarrollo. Para producción, configura reglas más restrictivas.

## Paso 3: Obtener Configuración

1. En el panel izquierdo, haz clic en **"Configuración del proyecto"** (ícono de engranaje)
2. En la pestaña **"General"**, baja hasta **"Tus apps"**
3. Haz clic en **"</>"** para agregar una app web
4. **Nombre de la app**: `Gestor Turno Médico`
5. **NO** marques "También configura Firebase Hosting"
6. Haz clic en **"Registrar app"

### ⚠️ **IMPORTANTE para GitHub Pages:**

Después de crear la app, debes configurar los dominios autorizados:

1. Ve a **"Authentication"** → **"Settings"** → **"Authorized domains"**
2. Agrega estos dominios:
   - `notionmedufro.github.io`
   - `localhost` (para desarrollo local)
3. Haz clic en **"Add domain"**

## Paso 4: Copiar Configuración

Verás algo como esto:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "gestor-turno-medico.firebaseapp.com",
  databaseURL: "https://gestor-turno-medico-default-rtdb.firebaseio.com/",
  projectId: "gestor-turno-medico",
  storageBucket: "gestor-turno-medico.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789012345"
};
```

## Paso 5: Actualizar firebase-config.js

1. Abre el archivo `firebase-config.js`
2. **Reemplaza** la configuración placeholder con la tuya:

```javascript
// Configuración de Firebase
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI", // ← Reemplaza con tu apiKey
  authDomain: "TU_PROJECT_ID.firebaseapp.com", // ← Reemplaza con tu authDomain
  databaseURL: "https://TU_PROJECT_ID-default-rtdb.firebaseio.com/", // ← Reemplaza con tu databaseURL
  projectId: "TU_PROJECT_ID", // ← Reemplaza con tu projectId
  storageBucket: "TU_PROJECT_ID.appspot.com", // ← Reemplaza con tu storageBucket
  messagingSenderId: "TU_SENDER_ID", // ← Reemplaza con tu messagingSenderId
  appId: "TU_APP_ID" // ← Reemplaza con tu appId
};

// NO CAMBIES EL RESTO DEL ARCHIVO
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
window.firebaseDB = database;
console.log("🔥 Firebase inicializado correctamente");
```

## Paso 6: Probar la Configuración

1. Abre `index.html` en tu navegador
2. Abre la consola del navegador (F12)
3. Deberías ver:
   - `🔥 Firebase inicializado correctamente`
   - `🔥 Firebase Sync Service inicializado`
   - El indicador de estado debe mostrar **🔥 Sincronizado**

## Verificación

### ✅ Todo Funciona Si:
- El indicador muestra **"🔥 Sincronizado"**
- No hay errores en la consola
- Los cambios se sincronizan entre pestañas/dispositivos

### ❌ Posibles Problemas:

**Error: "Firebase no se cargó"**
- Verifica que copiaste correctamente la configuración
- Revisa que no tengas bloqueadores de ads activos

**Error: "Permission denied"**
- Ve a Firebase Console → Realtime Database → Reglas
- Asegúrate que las reglas permitan lectura/escritura

**Indicador muestra "❌ Error Firebase"**
- Revisa la consola del navegador para errores específicos
- Verifica la URL de la base de datos

## Reglas de Seguridad (OBLIGATORIO para GitHub Pages)

⚠️ **Como tu aplicación está públicamente accesible, DEBES configurar reglas de seguridad:**

### Opción 1: Reglas Básicas (Recomendado)

```json
{
  "rules": {
    "blocks": {
      ".read": true,
      ".write": true,
      "$blockId": {
        ".validate": "newData.hasChildren(['type', 'lastModified']) && newData.child('lastModified').isNumber()"
      }
    }
  }
}
```

### Opción 2: Reglas con Limitaciones (Más Seguro)

```json
{
  "rules": {
    "blocks": {
      ".read": true,
      ".write": "auth != null || (data.exists() && now - data.child('lastModified').val() < 86400000)",
      "$blockId": {
        ".validate": "newData.hasChildren(['type', 'lastModified']) && newData.child('type').isString() && newData.child('lastModified').isNumber()",
        "formData": {
          "$field": {
            ".validate": "newData.isString() && newData.val().length <= 1000"
          }
        }
      }
    }
  }
}
```

### Cómo Aplicar las Reglas:

1. Ve a **Firebase Console** → **Realtime Database** → **Reglas**
2. Reemplaza las reglas existentes con una de las opciones de arriba
3. Haz clic en **"Publicar"**

## 🎉 ¡Listo!

Una vez configurado, tu aplicación tendrá:
- ✅ **Sincronización en tiempo real** entre dispositivos
- ✅ **Backup automático** en la nube
- ✅ **Funciona offline** con sincronización automática
- ✅ **Indicador visual** del estado de conexión

### Migración Automática

La primera vez que abras la aplicación con Firebase configurado:
1. Se migrarán automáticamente todos los datos de localStorage a Firebase
2. Se mantendrá localStorage como backup
3. Verás los logs de migración en la consola

¡Ahora tu aplicación funcionará como Google Docs! 🚀
