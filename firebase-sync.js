// Servicio de sincronización Firebase
class FirebaseSyncService {
    constructor() {
        this.database = null;
        this.isOnline = navigator.onLine;
        this.localCache = {};
        this.listeners = new Map();
        this.retryQueue = [];
        this.isInitialized = false;
        
        this.setupOnlineListeners();
        this.init();
    }

    async init() {
        try {
            // Esperar a que Firebase esté disponible
            await this.waitForFirebase();
            this.database = window.firebaseDB;
            this.isInitialized = true;
            
            // Migrar datos existentes de localStorage
            await this.migrateFromLocalStorage();
            
            // Configurar listeners para cambios remotos
            this.setupRealtimeListeners();
            
            console.log("🔥 Firebase Sync Service inicializado");
        } catch (error) {
            console.error("❌ Error inicializando Firebase:", error);
            // Fallback a localStorage si Firebase falla
            this.fallbackToLocalStorage();
        }
    }

    waitForFirebase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            const check = () => {
                attempts++;
                if (window.firebaseDB) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error("Firebase no se cargó"));
                } else {
                    setTimeout(check, 100);
                }
            };
            
            check();
        });
    }

    // Migrar datos existentes de localStorage a Firebase
    async migrateFromLocalStorage() {
        if (!this.isOnline || !this.database) return;

        const keysToMigrate = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('block-') && key.endsWith('-data')) {
                keysToMigrate.push(key);
            }
        }

        if (keysToMigrate.length === 0) return;

        console.log("🔄 Migrando datos de localStorage a Firebase...");

        for (const key of keysToMigrate) {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    const blockId = key.replace('block-', '').replace('-data', '');
                    await this.saveToFirebase(blockId, JSON.parse(data));
                    console.log(`✅ Migrado: ${key}`);
                }
            } catch (error) {
                console.error(`❌ Error migrando ${key}:`, error);
            }
        }

        console.log("✅ Migración completada");
    }

    // Configurar listeners en tiempo real
    setupRealtimeListeners() {
        if (!this.database) {
            console.error('❌ No se pueden configurar listeners: database no disponible');
            return;
        }

        const blocksRef = this.database.ref('blocks');
        console.log('🔄 Configurando listeners en:', blocksRef.toString());
        
        // Listener para cambios en tiempo real
        blocksRef.on('child_changed', (snapshot) => {
            const blockId = snapshot.key;
            const data = snapshot.val();
            
            console.log('📡 Cambio detectado en Firebase:', blockId, data);
            console.log('🆔 Mi cliente ID:', this.getClientId());
            console.log('🆔 Cambio hecho por:', data?.lastModifiedBy);
            
            // Solo actualizar si el cambio no vino de este cliente
            if (data && data.lastModifiedBy !== this.getClientId()) {
                console.log('✅ Aplicando cambio remoto');
                this.handleRemoteChange(blockId, data);
            } else {
                console.log('⏭️ Ignorando cambio propio');
            }
        });

        // Listener para nuevos bloques
        blocksRef.on('child_added', (snapshot) => {
            const blockId = snapshot.key;
            const data = snapshot.val();
            
            console.log('🆕 Nuevo bloque detectado:', blockId);
            
            if (data && data.lastModifiedBy !== this.getClientId()) {
                console.log('✅ Aplicando nuevo bloque remoto');
                this.handleRemoteChange(blockId, data);
            }
        });

        // Listener para errores
        blocksRef.on('error', (error) => {
            console.error('❌ Error en listener de Firebase:', error);
        });

        console.log('👂 Listeners de tiempo real configurados correctamente');
    }

    // Manejar cambios remotos
    handleRemoteChange(blockId, data) {
        console.log(`🔄 Cambio remoto detectado en ${blockId}`);
        console.log('📊 Datos del cambio:', data);
        
        // Actualizar cache local
        this.localCache[blockId] = data;
        
        // Notificar a la aplicación
        if (window.ingresoManager && this.isInitialized) {
            console.log('✅ Notificando a ingresoManager');
            window.ingresoManager.handleRemoteUpdate(blockId, data);
        } else {
            console.error('❌ No se puede notificar cambio:', {
                ingresoManager: !!window.ingresoManager,
                isInitialized: this.isInitialized
            });
        }
    }

    // Guardar datos (reemplaza localStorage.setItem)
    async saveBlockData(blockId, data) {
        const enrichedData = {
            ...data,
            lastModified: Date.now(),
            lastModifiedBy: this.getClientId()
        };

        // Guardar en cache local inmediatamente
        this.localCache[blockId] = enrichedData;

        if (this.isOnline && this.database) {
            try {
                await this.saveToFirebase(blockId, enrichedData);
            } catch (error) {
                console.error("❌ Error guardando en Firebase:", error);
                console.error("📋 Detalles del error:", {
                    code: error.code,
                    message: error.message,
                    blockId: blockId,
                    dataSize: JSON.stringify(data).length
                });
                // Agregar a cola de reintentos
                this.retryQueue.push({ blockId, data: enrichedData });
                // Fallback a localStorage
                localStorage.setItem(`block-${blockId}-data`, JSON.stringify(data));
            }
        } else {
            // Sin conexión, guardar en localStorage
            localStorage.setItem(`block-${blockId}-data`, JSON.stringify(data));
            // Agregar a cola de reintentos
            this.retryQueue.push({ blockId, data: enrichedData });
        }
    }

    async saveToFirebase(blockId, data) {
        if (!this.database) throw new Error("Database no disponible");
        
        // Importar funciones necesarias para la nueva API
        const { ref, set } = await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js');
        
        await set(ref(this.database, `blocks/${blockId}`), data);
        
        // Remover de localStorage una vez guardado en Firebase
        localStorage.removeItem(`block-${blockId}-data`);
    }

    // Obtener datos (reemplaza localStorage.getItem)
    async getBlockData(blockId) {
        // Primero verificar cache local
        if (this.localCache[blockId]) {
            return this.localCache[blockId];
        }

        // Luego intentar Firebase
        if (this.isOnline && this.database) {
            try {
                const snapshot = await this.database.ref(`blocks/${blockId}`).once('value');
                const data = snapshot.val();
                if (data) {
                    this.localCache[blockId] = data;
                    return data;
                }
            } catch (error) {
                console.error(`❌ Error obteniendo datos de Firebase para ${blockId}:`, error);
            }
        }

        // Fallback a localStorage
        const localData = localStorage.getItem(`block-${blockId}-data`);
        if (localData) {
            try {
                const parsed = JSON.parse(localData);
                this.localCache[blockId] = parsed;
                return parsed;
            } catch (error) {
                console.error(`❌ Error parseando localStorage para ${blockId}:`, error);
            }
        }

        return null;
    }

    // Limpiar todos los datos
    async clearAllData() {
        this.localCache = {};
        
        if (this.isOnline && this.database) {
            try {
                await this.database.ref('blocks').remove();
            } catch (error) {
                console.error("❌ Error limpiando Firebase:", error);
            }
        }

        // Limpiar localStorage también
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('block-') && key.endsWith('-data')) {
                localStorage.removeItem(key);
            }
        });
    }

    // Configurar listeners de conectividad
    setupOnlineListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log("🌐 Conexión restaurada");
            this.processRetryQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log("📴 Sin conexión - usando localStorage");
        });
    }

    // Procesar cola de reintentos
    async processRetryQueue() {
        if (!this.isOnline || !this.database || this.retryQueue.length === 0) return;

        console.log(`🔄 Procesando ${this.retryQueue.length} elementos en cola...`);

        const queue = [...this.retryQueue];
        this.retryQueue = [];

        for (const item of queue) {
            try {
                await this.saveToFirebase(item.blockId, item.data);
                console.log(`✅ Sincronizado: ${item.blockId}`);
            } catch (error) {
                console.error(`❌ Error reintentando ${item.blockId}:`, error);
                this.retryQueue.push(item);
            }
        }
    }

    // Fallback a localStorage si Firebase falla
    fallbackToLocalStorage() {
        console.log("⚠️ Usando localStorage como fallback");
        this.isInitialized = true;
    }

    // Obtener ID único del cliente
    getClientId() {
        if (!this.clientId) {
            this.clientId = localStorage.getItem('firebase-client-id') || 
                           'client-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('firebase-client-id', this.clientId);
        }
        return this.clientId;
    }

    // Obtener estado de conexión
    getConnectionStatus() {
        return {
            online: this.isOnline,
            firebase: !!this.database,
            initialized: this.isInitialized,
            retryQueueLength: this.retryQueue.length
        };
    }
    
    // Limpiar cola de reintentos (para debug)
    clearRetryQueue() {
        console.log(`🗑️ Limpiando ${this.retryQueue.length} elementos de la cola`);
        this.retryQueue = [];
    }
    
    // Mostrar errores de la cola
    showRetryQueueErrors() {
        console.log(`📋 Cola de reintentos (${this.retryQueue.length} elementos):`);
        this.retryQueue.forEach((item, index) => {
            console.log(`${index + 1}. ${item.blockId}:`, item.data);
        });
    }
}

// Crear instancia global
window.firebaseSync = new FirebaseSyncService();

// Actualizar indicador de estado en la UI
function updateFirebaseStatusIndicator() {
    const statusElement = document.getElementById('firebase-status');
    const indicatorElement = document.getElementById('status-indicator');
    const textElement = document.getElementById('status-text');
    
    if (!statusElement || !window.firebaseSync) return;
    
    const status = window.firebaseSync.getConnectionStatus();
    
    // Remover clases anteriores
    statusElement.classList.remove('connected', 'offline', 'connecting');
    
    if (status.firebase && status.online && status.initialized) {
        statusElement.classList.add('connected');
        indicatorElement.textContent = '🔥';
        textElement.textContent = 'Sincronizado';
    } else if (!status.online) {
        statusElement.classList.add('offline');
        indicatorElement.textContent = '📴';
        textElement.textContent = 'Sin conexión';
    } else if (!status.initialized) {
        statusElement.classList.add('connecting');
        indicatorElement.textContent = '⏳';
        textElement.textContent = 'Conectando...';
    } else {
        statusElement.classList.add('offline');
        indicatorElement.textContent = '❌';
        textElement.textContent = 'Error Firebase';
    }
    
    // Agregar información de cola de reintentos si existe
    if (status.retryQueueLength > 0) {
        textElement.textContent += ` (${status.retryQueueLength} pendientes)`;
    }
}

// Actualizar el indicador cada 2 segundos
setInterval(updateFirebaseStatusIndicator, 2000);

// Actualizar inmediatamente cuando la página se carga
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(updateFirebaseStatusIndicator, 500);
});
