// Clase para manejar el guardado de bloques
class EditableBlocksManager {
    constructor() {
        this.blocks = ['block-1', 'block-2', 'block-3', 'block-4'];
        this.saveTimeout = null;
        this.init();
    }

    init() {
        this.loadSavedContent();
        this.setupEventListeners();
        this.setupControlButtons();
    }

    // Cargar contenido guardado desde localStorage
    loadSavedContent() {
        this.blocks.forEach(blockId => {
            const savedContent = localStorage.getItem(blockId);
            const block = document.getElementById(blockId);
            if (savedContent && block) {
                block.innerHTML = savedContent;
            }
        });
    }

    // Configurar listeners para eventos de edición
    setupEventListeners() {
        this.blocks.forEach(blockId => {
            const block = document.getElementById(blockId);
            if (block) {
                // Evento de input para guardado automático
                block.addEventListener('input', () => {
                    this.debouncedSave(blockId);
                    this.showSaveIndicator(blockId);
                });

                // Evento de focus para mejor experiencia de usuario
                block.addEventListener('focus', () => {
                    block.style.borderColor = '#007bff';
                });

                // Evento de blur para restablecer el borde
                block.addEventListener('blur', () => {
                    block.style.borderColor = '#ccc';
                });

                // Eventos de paste para manejar contenido pegado
                block.addEventListener('paste', (e) => {
                    // Permitir paste pero limpiar el formato
                    setTimeout(() => {
                        this.cleanPastedContent(blockId);
                        this.debouncedSave(blockId);
                    }, 10);
                });
            }
        });
    }

    // Limpiar contenido pegado de formatos no deseados
    cleanPastedContent(blockId) {
        const block = document.getElementById(blockId);
        if (block) {
            const content = block.innerText;
            block.innerHTML = content.replace(/\n/g, '<br>');
        }
    }

    // Guardado con debounce para evitar múltiples guardados
    debouncedSave(blockId) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.saveBlock(blockId);
        }, 500); // Guardar 500ms después de que el usuario deje de escribir
    }

    // Guardar un bloque específico
    saveBlock(blockId) {
        const block = document.getElementById(blockId);
        if (block) {
            const content = block.innerHTML;
            localStorage.setItem(blockId, content);
            this.hideSaveIndicator(blockId);
        }
    }

    // Mostrar indicador de guardado
    showSaveIndicator(blockId) {
        const indicator = document.getElementById(`indicator-${blockId.split('-')[1]}`);
        if (indicator) {
            indicator.textContent = '💾';
            indicator.style.opacity = '1';
        }
    }

    // Ocultar indicador de guardado
    hideSaveIndicator(blockId) {
        const indicator = document.getElementById(`indicator-${blockId.split('-')[1]}`);
        if (indicator) {
            indicator.textContent = '✅';
            setTimeout(() => {
                indicator.style.opacity = '0.5';
            }, 1000);
        }
    }

    // Configurar botones de control
    setupControlButtons() {
        // Botón de limpiar todo
        const clearBtn = document.getElementById('clearAll');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('¿Estás seguro de que quieres limpiar todo el contenido?')) {
                    this.clearAllBlocks();
                }
            });
        }

        // Botón de exportar
        const exportBtn = document.getElementById('exportData');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }

        // Botón de importar
        const importBtn = document.getElementById('importData');
        const importFile = document.getElementById('importFile');
        if (importBtn && importFile) {
            importBtn.addEventListener('click', () => {
                importFile.click();
            });

            importFile.addEventListener('change', (e) => {
                this.importData(e.target.files[0]);
            });
        }
    }

    // Limpiar todos los bloques
    clearAllBlocks() {
        this.blocks.forEach(blockId => {
            const block = document.getElementById(blockId);
            if (block) {
                block.innerHTML = '';
                localStorage.removeItem(blockId);
            }
        });
    }

    // Exportar datos a archivo JSON
    exportData() {
        const data = {};
        this.blocks.forEach(blockId => {
            const content = localStorage.getItem(blockId);
            data[blockId] = content || '';
        });

        const exportData = {
            timestamp: new Date().toISOString(),
            blocks: data
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bloques-editables-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Importar datos desde archivo JSON
    importData(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (importedData.blocks) {
                    // Confirmar importación
                    if (confirm('¿Quieres importar estos datos? Esto sobrescribirá el contenido actual.')) {
                        this.blocks.forEach(blockId => {
                            const content = importedData.blocks[blockId];
                            if (content !== undefined) {
                                const block = document.getElementById(blockId);
                                if (block) {
                                    block.innerHTML = content;
                                    localStorage.setItem(blockId, content);
                                }
                            }
                        });
                        alert('¡Datos importados exitosamente!');
                    }
                } else {
                    alert('Formato de archivo no válido.');
                }
            } catch (error) {
                alert('Error al leer el archivo. Asegúrate de que sea un archivo JSON válido.');
            }
        };
        reader.readAsText(file);
    }

    // Guardar todo inmediatamente (útil antes de cerrar la página)
    saveAll() {
        this.blocks.forEach(blockId => {
            this.saveBlock(blockId);
        });
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const manager = new EditableBlocksManager();

    // Guardar todo antes de cerrar la página
    window.addEventListener('beforeunload', () => {
        manager.saveAll();
    });

    // Guardar periódicamente cada 30 segundos
    setInterval(() => {
        manager.saveAll();
    }, 30000);
});

// Función para mostrar información de debug (opcional)
function showStorageInfo() {
    console.log('Contenido almacenado:');
    ['block-1', 'block-2', 'block-3', 'block-4'].forEach(blockId => {
        console.log(`${blockId}:`, localStorage.getItem(blockId));
    });
}
