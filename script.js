// Clase para manejar el sistema de gestión de ingresos y controles
class IngresoControlManager {
    constructor() {
        this.towers = {
            'tower-a': { name: 'Torre Nueva B', rooms: 12, beds: 3, startRoom: 501 },
            'tower-b': { name: 'Torre Nueva A', rooms: 17, beds: 3, startRoom: 513 },
            'tower-ep': { name: 'EP', rooms: 5, beds: 4, startRoom: 595 }
        };
        this.allBlocks = [];
        this.saveTimeout = null;
        this.currentFilter = 'all';
        this.currentEncargadoFilter = null;
        this.expandedTower = null;
        this.encargados = [];
        this.init();
    }

    async init() {
        this.generateTowers();
        await this.loadSavedContent();
        this.setupEventListeners();
        this.setupControlButtons();
        this.setupFilterListeners();
        this.setupTowerExpansion();
        this.setupEncargados();
        this.updateFilterCounts();
    }

    // Generar torres y salas dinámicamente
    generateTowers() {
        Object.keys(this.towers).forEach(towerId => {
            const tower = this.towers[towerId];
            const towerContainer = document.getElementById(towerId);
            
            for (let room = 1; room <= tower.rooms; room++) {
                const roomNumber = tower.startRoom ? tower.startRoom + room - 1 : room;
                
                // Crear fila para la vista expandida
                const roomRow = document.createElement('div');
                roomRow.className = 'room-row';
                roomRow.setAttribute('data-room', roomNumber);
                
                for (let bed = 1; bed <= tower.beds; bed++) {
                    const blockId = `${towerId}-room-${roomNumber}-bed-${bed}`;
                    this.allBlocks.push(blockId);
                    
                    const blockHTML = `
                        <div class="block-container" id="container-${blockId}" data-type="empty" data-tower="${towerId}" data-room="${roomNumber}" data-bed="${bed}">
                            <div class="block-header">
                                <h3>${roomNumber}-${bed}</h3>
                                <span class="save-indicator" id="indicator-${blockId}">💾</span>
                            </div>
                            <div class="block-content" id="block-${blockId}">
                                <div class="option-selector" id="selector-${blockId}">
                                    <label class="option-checkbox">
                                        <input type="checkbox" name="type-${blockId}" value="empty" data-block="${blockId}">
                                        <span class="checkbox-custom"></span>
                                        Vacía
                                    </label>
                                    <label class="option-checkbox">
                                        <input type="checkbox" name="type-${blockId}" value="ingreso" data-block="${blockId}">
                                        <span class="checkbox-custom"></span>
                                        Asignado
                                    </label>
                                    <label class="option-checkbox">
                                        <input type="checkbox" name="type-${blockId}" value="control" data-block="${blockId}">
                                        <span class="checkbox-custom"></span>
                                        Control
                                    </label>
                                </div>
                                <div class="content-area" id="content-${blockId}"></div>
                            </div>
                        </div>
                    `;
                    
                    roomRow.innerHTML += blockHTML;
                }
                
                towerContainer.appendChild(roomRow);
            }
        });
    }

    // Cargar contenido guardado desde Firebase
    async loadSavedContent() {
        // Esperar a que Firebase esté disponible
        await this.waitForFirebaseSync();
        
        for (const blockId of this.allBlocks) {
            try {
                const savedData = await window.firebaseSync.getBlockData(blockId);
                if (savedData) {
                    this.restoreBlockState(blockId, savedData);
                }
            } catch (error) {
                console.error(`Error loading block ${blockId}:`, error);
            }
        }
    }
    
    // Esperar a que Firebase Sync esté disponible
    waitForFirebaseSync() {
        return new Promise((resolve) => {
            const check = () => {
                if (window.firebaseSync && window.firebaseSync.isInitialized) {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    // Restaurar el estado de un bloque
    restoreBlockState(blockNum, data) {
        const container = document.getElementById(`container-${blockNum}`);
        
        // Primero desmarcar todos los checkboxes
        const allCheckboxes = document.querySelectorAll(`input[name="type-${blockNum}"]`);
        allCheckboxes.forEach(cb => cb.checked = false);
        
        // Manejar el tipo de datos
        if (data.type === 'none') {
            // No marcar ninguna checkbox y usar estado 'none'
            this.handleTypeChange(blockNum, 'none');
        } else {
            // Marcar solo el tipo correspondiente
            const checkbox = document.querySelector(`input[name="type-${blockNum}"][value="${data.type}"]`);
            if (checkbox) {
                checkbox.checked = true;
                this.handleTypeChange(blockNum, data.type);
                
                // Restaurar datos específicos del formulario
                if (data.formData) {
                    setTimeout(() => {
                        this.restoreFormData(blockNum, data.formData);
                        // Restaurar colores basados en el estado
                        if (data.type === 'ingreso' && data.formData.estado) {
                            this.updateBlockColors(blockNum, 'ingreso', data.formData.estado);
                        }
                    }, 100);
                }
            }
        }
    }

    // Restaurar datos del formulario
    restoreFormData(blockNum, formData) {
        const contentArea = document.getElementById(`content-${blockNum}`);
        const inputs = contentArea.querySelectorAll('input, textarea');
        
        inputs.forEach(input => {
            if (formData[input.name]) {
                input.value = formData[input.name];
                if (input.name === 'enlace') {
                    this.toggleLinkButton(input);
                }
            }
        });
        
        // Restaurar estado de botones de estado
        if (formData.estado) {
            const statusBtn = contentArea.querySelector(`[data-status="${formData.estado}"]`);
            if (statusBtn) {
                this.setActiveStatus(contentArea, statusBtn);
            }
        }
        
        // Restaurar selector de encargados
        setTimeout(() => {
            this.updateEncargadoSelector(blockNum);
        }, 50);
    }

    // Configurar listeners para eventos
    setupEventListeners() {
        this.allBlocks.forEach(blockId => {
            // Listeners para checkboxes
            const checkboxes = document.querySelectorAll(`input[name="type-${blockId}"]`);
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    this.handleCheckboxChange(blockId, e.target);
                });
            });
        });
    }

    // Manejar cambio de checkbox
    handleCheckboxChange(blockNum, changedCheckbox) {
        const allCheckboxes = document.querySelectorAll(`input[name="type-${blockNum}"]`);
        const currentlySelected = Array.from(allCheckboxes).find(cb => cb.checked && cb !== changedCheckbox);
        
        if (changedCheckbox.checked) {
            // Verificar si hay que mostrar confirmación al cambiar desde Asignado o Control
            if (currentlySelected && (currentlySelected.value === 'ingreso' || currentlySelected.value === 'control')) {
                const currentTypeText = currentlySelected.value === 'ingreso' ? 'el ingreso' : 'el control';
                if (!confirm(`¿Estás seguro de que quieres eliminar ${currentTypeText}?`)) {
                    // Usuario canceló, no hacer el cambio
                    changedCheckbox.checked = false;
                    return;
                }
            }
            
            // Si se marcó una opción, desmarcar las otras
            allCheckboxes.forEach(cb => {
                if (cb !== changedCheckbox) {
                    cb.checked = false;
                }
            });
            this.handleTypeChange(blockNum, changedCheckbox.value);
        } else {
            // Si se desmarcó una opción de ingreso o control, mostrar confirmación
            if (changedCheckbox.value === 'ingreso' || changedCheckbox.value === 'control') {
                const typeText = changedCheckbox.value === 'ingreso' ? 'el ingreso' : 'el control';
                if (confirm(`¿Estás seguro de que quieres eliminar ${typeText}?`)) {
                    // Usuario confirmó, proceder con la deseleción
                    this.handleTypeChange(blockNum, 'none');
                } else {
                    // Usuario canceló, volver a marcar el checkbox
                    changedCheckbox.checked = true;
                }
            } else {
                // Si es 'empty', verificar si hay otras opciones seleccionadas
                const hasAnySelected = Array.from(allCheckboxes).some(cb => cb.checked);
                if (!hasAnySelected) {
                    this.handleTypeChange(blockNum, 'none');
                } else {
                    // Mantener el estado actual si hay otra opción seleccionada
                }
            }
        }
    }

    // Manejar cambio de tipo de bloque
    handleTypeChange(blockNum, type) {
        const container = document.getElementById(`container-${blockNum}`);
        const contentArea = document.getElementById(`content-${blockNum}`);
        
        // Actualizar data-type del contenedor
        container.setAttribute('data-type', type === 'none' ? 'empty' : type);
        
        // Limpiar contenido anterior
        contentArea.innerHTML = '';
        
        // Crear contenido según el tipo
        switch (type) {
            case 'empty':
                this.createEmptyContent(blockNum, contentArea);
                break;
            case 'none':
                this.createNoneContent(blockNum, contentArea);
                break;
            case 'ingreso':
                this.createIngresoContent(blockNum, contentArea);
                break;
            case 'control':
                this.createControlContent(blockNum, contentArea);
                break;
        }
        
        // Actualizar colores del bloque
        this.updateBlockColors(blockNum, type);
        
        // Actualizar contadores de filtros
        this.updateFilterCounts();
        
        // Guardar el cambio
        this.saveBlockData(blockNum);
        this.showSaveIndicator(blockNum);
    }

    // Crear contenido para bloque vacío
    createEmptyContent(blockNum, contentArea) {
        contentArea.innerHTML = `
            <div class="empty-state">
                <input type="text" id="nota-${blockNum}" name="nota" class="form-input compact-input" placeholder="Dx o Nota importante">
            </div>
        `;
        
        this.setupFormListeners(blockNum, contentArea);
    }

    // Crear contenido para cuando no hay nada seleccionado
    createNoneContent(blockNum, contentArea) {
        contentArea.innerHTML = `
            <div class="none-state">
                <input type="text" id="nota-${blockNum}" name="nota" class="form-input compact-input" placeholder="Dx o Nota importante">
            </div>
        `;
        
        this.setupFormListeners(blockNum, contentArea);
    }

    // Crear contenido para ingreso
    createIngresoContent(blockNum, contentArea) {
        contentArea.innerHTML = `
            <div class="form-container">
                <div class="form-group">
                    <input type="text" id="nombre-${blockNum}" name="nombre" class="form-input" placeholder="Nombre del paciente">
                </div>
                
                <div class="form-group">
                    <input type="text" id="rut-${blockNum}" name="rut" class="form-input" placeholder="RUT: 12.345.678-9">
                </div>
                
                <div class="form-group">
                    <input type="text" id="cuenta-${blockNum}" name="cuenta" class="form-input" placeholder="Cuenta Corriente">
                </div>
                
                <div class="form-group">
                    <div class="link-group">
                        <input type="url" id="enlace-${blockNum}" name="enlace" class="form-input link-input" placeholder="Enlace HIS">
                        <button class="open-link-btn" id="open-link-${blockNum}" disabled onclick="ingresoManager.openLink('${blockNum}')">
                            🔗
                        </button>
                    </div>
                </div>
                
                <div class="status-buttons">
                    <button class="status-btn" data-status="llego" onclick="ingresoManager.setStatus('${blockNum}', 'llego', this)">
                        Llegó
                    </button>
                    <button class="status-btn" data-status="completado" onclick="ingresoManager.setStatus('${blockNum}', 'completado', this)">
                        Listo
                    </button>
                    <div class="encargado-selector" id="encargado-selector-${blockNum}">
                        <button class="encargado-circle-btn none" id="encargado-btn-${blockNum}" onclick="ingresoManager.toggleEncargadoDropdown('${blockNum}')">∅</button>
                        <div class="encargado-dropdown-mini" id="encargado-dropdown-${blockNum}"></div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupFormListeners(blockNum, contentArea);
        this.updateEncargadoSelector(blockNum);
    }

    // Crear contenido para control
    createControlContent(blockNum, contentArea) {
        contentArea.innerHTML = `
            <div class="form-container">
                <div class="form-group">
                    <input type="text" id="nombre-${blockNum}" name="nombre" class="form-input" placeholder="Nombre del paciente">
                </div>
                
                <div class="form-group">
                    <input type="text" id="diagnostico-${blockNum}" name="diagnostico" class="form-input" placeholder="Diagnóstico">
                </div>
                
                <div class="form-group">
                    <input type="text" id="tipo-control-${blockNum}" name="tipoControl" class="form-input" placeholder="Tipo de control">
                </div>
                
                <div class="form-group">
                    <div class="link-group">
                        <input type="url" id="enlace-${blockNum}" name="enlace" class="form-input link-input" placeholder="Enlace HIS">
                        <button class="open-link-btn" id="open-link-${blockNum}" disabled onclick="ingresoManager.openLink('${blockNum}')">
                            🔗
                        </button>
                    </div>
                </div>
                
                <div class="encargado-selector" id="encargado-selector-${blockNum}">
                    <button class="encargado-circle-btn none" id="encargado-btn-${blockNum}" onclick="ingresoManager.toggleEncargadoDropdown('${blockNum}')">∅</button>
                    <div class="encargado-dropdown-mini" id="encargado-dropdown-${blockNum}"></div>
                </div>
            </div>
        `;
        
        this.setupFormListeners(blockNum, contentArea);
        this.updateEncargadoSelector(blockNum);
    }

    // Configurar listeners para formularios
    setupFormListeners(blockNum, contentArea) {
        const inputs = contentArea.querySelectorAll('input, textarea');
        
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.debouncedSave(blockNum);
                
                // Manejar campo de enlace específicamente
                if (input.name === 'enlace') {
                    this.toggleLinkButton(input);
                }
            });
        });
    }

    // Alternar disponibilidad del botón de enlace
    toggleLinkButton(linkInput) {
        const blockNum = linkInput.id.split('-')[1];
        const openBtn = document.getElementById(`open-link-${blockNum}`);
        
        if (openBtn) {
            const isValidUrl = linkInput.value.trim() !== '' && linkInput.checkValidity();
            openBtn.disabled = !isValidUrl;
        }
    }

    // Abrir enlace en nueva pestaña
    openLink(blockNum) {
        const linkInput = document.getElementById(`enlace-${blockNum}`);
        if (linkInput && linkInput.value.trim()) {
            window.open(linkInput.value, '_blank');
        }
    }

    // Establecer estado para ingresos
    setStatus(blockNum, status, button) {
        const contentArea = document.getElementById(`content-${blockNum}`);
        this.setActiveStatus(contentArea, button);
        this.updateBlockColors(blockNum, 'ingreso', status);
        this.updateFilterCounts();
        this.debouncedSave(blockNum);
    }

    // Actualizar colores del bloque
    updateBlockColors(blockNum, type, status = null) {
        const container = document.getElementById(`container-${blockNum}`);
        
        // Remover todas las clases de estado
        container.classList.remove('state-empty', 'state-asignado', 'state-llego', 'state-listo', 'state-control');
        
        switch (type) {
            case 'empty':
                container.classList.add('state-empty');
                break;
            case 'ingreso':
                if (status === 'llego') {
                    container.classList.add('state-llego');
                } else if (status === 'completado') {
                    container.classList.add('state-listo');
                } else {
                    container.classList.add('state-asignado');
                }
                break;
            case 'control':
                container.classList.add('state-control');
                break;
        }
    }

    // Establecer botón de estado activo
    setActiveStatus(contentArea, activeButton) {
        const statusButtons = contentArea.querySelectorAll('.status-btn');
        statusButtons.forEach(btn => btn.classList.remove('active'));
        activeButton.classList.add('active');
    }


    // Guardado con debounce
    debouncedSave(blockNum) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.saveBlockData(blockNum);
        }, 500);
    }

    // Guardar datos de un bloque
    async saveBlockData(blockNum) {
        const container = document.getElementById(`container-${blockNum}`);
        const type = container.getAttribute('data-type');
        const contentArea = document.getElementById(`content-${blockNum}`);
        
        // Determinar el tipo real basado en las checkboxes seleccionadas
        const checkedCheckbox = document.querySelector(`input[name="type-${blockNum}"]:checked`);
        const realType = checkedCheckbox ? checkedCheckbox.value : 'none';
        
        const data = {
            type: realType,
            formData: {},
            encargado: await this.getBlockDataAsync(blockNum).then(d => d?.encargado || null)
        };
        
        // Recopilar datos del formulario si existe
        if (realType !== 'empty' && realType !== 'none') {
            const inputs = contentArea.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                data.formData[input.name] = input.value;
            });
            
            // Guardar estado activo si es ingreso
            const activeStatus = contentArea.querySelector('.status-btn.active');
            if (activeStatus) {
                data.formData.estado = activeStatus.getAttribute('data-status');
            }
        }
        
        // Usar Firebase en lugar de localStorage
        if (window.firebaseSync) {
            await window.firebaseSync.saveBlockData(blockNum, data);
        } else {
            // Fallback a localStorage si Firebase no está disponible
            localStorage.setItem(`block-${blockNum}-data`, JSON.stringify(data));
        }
        
        this.hideSaveIndicator(blockNum);
    }

    // Mostrar indicador de guardado
    showSaveIndicator(blockNum) {
        const indicator = document.getElementById(`indicator-${blockNum}`);
        if (indicator) {
            indicator.textContent = '💾';
            indicator.style.opacity = '1';
        }
    }

    // Ocultar indicador de guardado
    hideSaveIndicator(blockNum) {
        const indicator = document.getElementById(`indicator-${blockNum}`);
        if (indicator) {
            indicator.textContent = '✅';
            setTimeout(() => {
                indicator.style.opacity = '0.5';
            }, 1000);
        }
    }

    // Configurar botones de control principales
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
    }

    // Limpiar todos los bloques
    async clearAllBlocks() {
        // Limpiar de Firebase
        if (window.firebaseSync) {
            await window.firebaseSync.clearAllData();
        }
        
        // Limpiar localStorage también
        this.allBlocks.forEach(blockId => {
            localStorage.removeItem(`block-${blockId}-data`);
            // Desmarcar todos los checkboxes
            const allCheckboxes = document.querySelectorAll(`input[name="type-${blockId}"]`);
            allCheckboxes.forEach(cb => cb.checked = false);
            this.handleTypeChange(blockId, 'none');
        });
    }


    // Guardar todo
    saveAll() {
        this.allBlocks.forEach(blockId => {
            this.saveBlockData(blockId);
        });
    }

    // Configurar listeners para filtros
    setupFilterListeners() {
        const filterTags = document.querySelectorAll('.filter-tag');
        filterTags.forEach(tag => {
            tag.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const filter = e.currentTarget.getAttribute('data-filter');
                if (filter) {
                    this.applyFilter(filter);
                }
            });
        });
    }

    // Aplicar filtro
    applyFilter(filter) {
        this.currentFilter = filter;
        
        // Actualizar UI de filtros (solo los de estado, no el de encargado)
        document.querySelectorAll('.filter-tag:not(.filter-encargado)').forEach(tag => {
            tag.classList.remove('active');
        });
        
        // Manejar filtro especial para asignadas
        let targetId = filter;
        if (filter === 'asignadas-all') {
            targetId = 'asignadas';
        }
        
        const targetElement = document.getElementById(`filter-${targetId}`);
        if (targetElement) {
            targetElement.classList.add('active');
        }
        
        // Usar el nuevo sistema unificado de filtros
        this.updateFilterDisplay();
    }




    // Guardar actualización de encargados
    correctSaveBlockData(blockNum) {
        const container = document.getElementById(`container-${blockNum}`);
        const type = container.getAttribute('data-type');
        const contentArea = document.getElementById(`content-${blockNum}`);

        // Determinar tipo basado en checkboxes
        const checkedCheckbox = document.querySelector(`input[name="type-${blockNum}"]:checked`);
        const realType = checkedCheckbox ? checkedCheckbox.value : 'none';

        const data = {
            type: realType,
            formData: {},
            encargado: this.getBlockData(blockNum).encargado || null
        };

        // Leer inputs de formulario
        if (realType !== 'empty' && realType !== 'none') {
            const inputs = contentArea.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                data.formData[input.name] = input.value;
            });

            // Guardar botón de estado activo si hay
            const activeStatus = contentArea.querySelector('.status-btn.active');
            if (activeStatus) {
                data.formData.estado = activeStatus.getAttribute('data-status');
            }
        }

        localStorage.setItem(`block-${blockNum}-data`, JSON.stringify(data));
        this.hideSaveIndicator(blockNum);
    }



    // Verificar si bloque coincide con filtro
    blockMatchesFilter(container, filter) {
        if (filter === 'all') return true;
        
        const blockState = this.getBlockState(container);
        
        // Ocupadas: todo lo que NO sea vacío (incluye asignadas, control, y none)
        if (filter === 'ocupadas') {
            return blockState !== 'empty';
        }
        
        // Asignadas: incluye pendiente, llegó, listo
        if (filter === 'asignadas-all' || filter === 'asignadas') {
            return ['asignado', 'llego', 'listo'].includes(blockState);
        }
        
        // Filtros específicos
        if (filter === 'pendiente') {
            return blockState === 'asignado';
        }
        
        if (filter === 'llego') {
            return blockState === 'llego';
        }
        
        if (filter === 'listo') {
            return blockState === 'listo';
        }
        
        if (filter === 'empty') {
            return blockState === 'empty';
        }
        
        if (filter === 'control') {
            return blockState === 'control';
        }
        
        return blockState === filter;
    }

    // Verificar si tiene ingreso asignado
    hasIngresoAssigned(container) {
        const blockId = container.id.replace('container-', '');
        const checkbox = document.querySelector(`input[name="type-${blockId}"][value="ingreso"]:checked`);
        return !!checkbox;
    }

    // Obtener estado actual del bloque
    getBlockState(container) {
        const blockId = container.id.replace('container-', '');
        
        // Verificar qué checkbox está seleccionado
        const emptyChecked = document.querySelector(`input[name="type-${blockId}"][value="empty"]:checked`);
        const ingresoChecked = document.querySelector(`input[name="type-${blockId}"][value="ingreso"]:checked`);
        const controlChecked = document.querySelector(`input[name="type-${blockId}"][value="control"]:checked`);
        
        if (emptyChecked) {
            return 'empty';
        } else if (ingresoChecked) {
            // Verificar si tiene botón de estado activo
            const contentArea = document.getElementById(`content-${blockId}`);
            const activeButton = contentArea ? contentArea.querySelector('.status-btn.active') : null;
            
            if (activeButton) {
                const activeStatus = activeButton.getAttribute('data-status');
                if (activeStatus === 'llego') return 'llego';
                if (activeStatus === 'completado') return 'listo';
            }
            return 'asignado'; // Pendiente
        } else if (controlChecked) {
            return 'control';
        }
        
        // Si no hay nada seleccionado, considerar como 'none' (no vacía)
        return 'none';
    }

    // Actualizar contadores de filtros
    updateFilterCounts() {
        const counts = {
            all: 0,
            ocupadas: 0,
            empty: 0,
            asignadas: 0,
            pendiente: 0,
            llego: 0,
            listo: 0,
            control: 0
        };
        
        this.allBlocks.forEach(blockId => {
            const container = document.getElementById(`container-${blockId}`);
            const state = this.getBlockState(container);
            counts.all++;
            
            // Contar cada estado
            if (state === 'empty') {
                counts.empty++;
            } else {
                // Todo lo que no sea empty es ocupado
                counts.ocupadas++;
            }
            
            if (state === 'control') {
                counts.control++;
            }
            
            // Estados de asignadas
            if (['asignado', 'llego', 'listo'].includes(state)) {
                counts.asignadas++;
                
                if (state === 'asignado') {
                    counts.pendiente++;
                } else if (state === 'llego') {
                    counts.llego++;
                } else if (state === 'listo') {
                    counts.listo++;
                }
            }
        });
        
        // Actualizar UI
        Object.keys(counts).forEach(key => {
            const countElement = document.getElementById(`count-${key}`);
            if (countElement) {
                countElement.textContent = counts[key];
            }
        });
    }

    // Configurar expansión de torres
    setupTowerExpansion() {
        const towerTitles = document.querySelectorAll('.tower-title');
        towerTitles.forEach(title => {
            title.addEventListener('click', (e) => {
                const towerId = e.target.getAttribute('data-tower');
                this.toggleTowerExpansion(towerId);
            });
        });
    }

    // Alternar expansión de torre
    toggleTowerExpansion(towerId) {
        const towersGrid = document.querySelector('.towers-grid');
        const towers = document.querySelectorAll('.tower');
        
        if (this.expandedTower === towerId) {
            // Colapsar todo - volver a vista normal
            this.expandedTower = null;
            towersGrid.classList.remove('expanded');
            towers.forEach(tower => {
                tower.classList.remove('expanded', 'collapsed');
                const summary = tower.querySelector('.tower-summary');
                if (summary) summary.style.display = 'none';
            });
        } else {
            // Expandir torre seleccionada
            this.expandedTower = towerId;
            towersGrid.classList.add('expanded');
            
            towers.forEach(tower => {
                const towerContainer = tower.id;
                // Mapear IDs de contenedor a IDs de grid
                let expectedTowerId = '';
                if (towerContainer === 'tower-container-a') expectedTowerId = 'tower-a';
                else if (towerContainer === 'tower-container-b') expectedTowerId = 'tower-b';
                else if (towerContainer === 'tower-container-ep') expectedTowerId = 'tower-ep';
                
                if (expectedTowerId === towerId) {
                    tower.classList.add('expanded');
                    tower.classList.remove('collapsed');
                    const summary = tower.querySelector('.tower-summary');
                    if (summary) summary.style.display = 'none';
                } else {
                    tower.classList.add('collapsed');
                    tower.classList.remove('expanded');
                    const summary = tower.querySelector('.tower-summary');
                    if (summary) summary.style.display = 'block';
                }
            });
            
            this.updateTowerSummaries();
        }
    }

    // Actualizar resúmenes de torres colapsadas
    updateTowerSummaries() {
        const towers = ['tower-a', 'tower-b', 'tower-ep'];
        
        towers.forEach(towerId => {
            const summary = document.getElementById(`summary-${towerId}`);
            if (!summary || summary.style.display === 'none') return;
            
            const counts = { empty: 0, asignado: 0, llego: 0, listo: 0, control: 0 };
            
            // Contar bloques de esta torre
            this.allBlocks.forEach(blockId => {
                if (blockId.startsWith(towerId)) {
                    const container = document.getElementById(`container-${blockId}`);
                    if (container && (this.currentFilter === 'all' || container.style.display !== 'none')) {
                        const state = this.getBlockState(container);
                        counts[state]++;
                    }
                }
            });
            
            // Generar HTML del resumen
            let summaryHTML = '';
            Object.entries(counts).forEach(([state, count]) => {
                if (count > 0) {
                    summaryHTML += `<div class="summary-item ${state}">${count}</div>`;
                }
            });
            
            summary.innerHTML = summaryHTML;
        });
    }
    
    // === MÉTODOS DE GESTIÓN DE ENCARGADOS ===
    
    // Configurar sistema de encargados
    setupEncargados() {
        this.loadEncargados();
        this.setupEncargadoFilter();
        
        // Event listeners para agregar encargados
        const addBtn = document.getElementById('addEncargado');
        const input = document.getElementById('nuevoEncargado');
        
        if (addBtn && input) {
            addBtn.addEventListener('click', () => {
                this.addEncargado();
            });
            
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addEncargado();
                }
            });
        }
    }
    
    // Configurar filtro de encargados
    setupEncargadoFilter() {
        const filterBtn = document.getElementById('filter-encargado');
        const dropdown = document.getElementById('encargadoDropdown');
        
        if (filterBtn && dropdown) {
            filterBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = dropdown.style.display === 'block';
                this.closeAllDropdowns();
                if (!isOpen) {
                    dropdown.style.display = 'block';
                    filterBtn.classList.add('active');
                    this.renderEncargadoOptions();
                }
            });
            
            // Cerrar dropdown al hacer click fuera
            document.addEventListener('click', (e) => {
                if (!filterBtn.contains(e.target) && !dropdown.contains(e.target)) {
                    this.closeEncargadoDropdown();
                }
            });
        }
    }
    
    // Cargar encargados desde localStorage
    loadEncargados() {
        const saved = localStorage.getItem('encargados');
        if (saved) {
            try {
                this.encargados = JSON.parse(saved);
            } catch (error) {
                console.error('Error cargando encargados:', error);
                this.encargados = [];
            }
        }
    }
    
    // Guardar encargados en localStorage
    saveEncargados() {
        localStorage.setItem('encargados', JSON.stringify(this.encargados));
    }
    
    // Agregar nuevo encargado
    addEncargado() {
        const input = document.getElementById('nuevoEncargado');
        const tipoSelect = document.getElementById('tipoEncargado');
        const nombre = input.value.trim();
        const tipo = tipoSelect ? tipoSelect.value : 'interno';
        
        if (nombre && !this.encargados.find(e => e.nombre === nombre)) {
            this.encargados.push({ nombre, tipo });
            this.saveEncargados();
            this.renderEncargadoOptions();
            this.updateAllEncargadosSelectors();
            input.value = '';
        }
    }
    
    // Eliminar encargado
    deleteEncargado(nombre) {
        if (confirm(`¿Eliminar encargado "${nombre}"?`)) {
            this.encargados = this.encargados.filter(e => e.nombre !== nombre);
            this.saveEncargados();
            this.renderEncargadoOptions();
            this.updateAllEncargadosSelectors();
            
            // Limpiar selecciones de este encargado en todas las camas
            this.allBlocks.forEach(blockId => {
                const data = this.getBlockData(blockId);
                if (data.encargado === nombre) {
                    data.encargado = null;
                    this.saveBlockData(blockId);
                }
            });
        }
    }
    
    // Editar encargado inline
    editEncargadoInline(nombre) {
        const newName = prompt(`Editar nombre del encargado:`, nombre);
        if (newName && newName.trim() !== nombre && !this.encargados.find(e => e.nombre === newName.trim())) {
            this.editEncargado(nombre, newName.trim());
        }
    }
    
    // Editar nombre de encargado
    editEncargado(oldName, newName) {
        newName = newName.trim();
        if (newName && newName !== oldName && !this.encargados.find(e => e.nombre === newName)) {
            const encargado = this.encargados.find(e => e.nombre === oldName);
            if (encargado) {
                encargado.nombre = newName;
                this.saveEncargados();
                this.renderEncargadoOptions();
                this.updateAllEncargadosSelectors();
                
                // Actualizar selecciones existentes
                this.allBlocks.forEach(blockId => {
                    const data = this.getBlockData(blockId);
                    if (data.encargado === oldName) {
                        data.encargado = newName;
                        this.saveBlockData(blockId);
                    }
                });
            }
        }
    }
    
    // Renderizar lista de encargados
    renderEncargados() {
        const lista = document.getElementById('listaEncargados');
        lista.innerHTML = '';
        
        this.encargados.forEach(nombre => {
            const tag = document.createElement('div');
            tag.className = 'encargado-tag';
            tag.innerHTML = `
                <span class="encargado-name" onclick="ingresoManager.startEditEncargado(this, '${nombre}')">${nombre}</span>
                <button class="encargado-delete" onclick="ingresoManager.deleteEncargado('${nombre}')" title="Eliminar">✕</button>
            `;
            lista.appendChild(tag);
        });
    }
    
    // Iniciar edición de encargado
    startEditEncargado(span, originalName) {
        const tag = span.parentElement;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'encargado-edit-input';
        input.value = originalName;
        
        tag.classList.add('editing');
        span.replaceWith(input);
        input.focus();
        input.select();
        
        const finishEdit = () => {
            const newName = input.value.trim();
            if (newName) {
                this.editEncargado(originalName, newName);
            } else {
                this.renderEncargados();
            }
        };
        
        input.addEventListener('blur', finishEdit);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                finishEdit();
            } else if (e.key === 'Escape') {
                this.renderEncargados();
            }
        });
    }
    
    // Actualizar todos los selectores de encargados
    updateAllEncargadosSelectors() {
        this.allBlocks.forEach(blockId => {
            this.updateEncargadoSelector(blockId);
        });
    }
    
    // Actualizar selector de encargados para un bloque específico
    updateEncargadoSelector(blockId) {
        const btn = document.getElementById(`encargado-btn-${blockId}`);
        if (!btn) return;
        
        const currentData = this.getBlockData(blockId);
        const selectedEncargado = currentData.encargado;
        
        // Limpiar clases
        btn.className = 'encargado-circle-btn';
        
        if (!selectedEncargado) {
            btn.classList.add('none');
            btn.innerHTML = '∅';
            btn.title = 'Sin asignar';
        } else {
            const encargado = this.encargados.find(e => e.nombre === selectedEncargado);
            if (encargado) {
                btn.classList.add('selected', encargado.tipo);
                if (encargado.foto) {
                    btn.innerHTML = `<img src="${encargado.foto}" alt="${encargado.nombre}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                } else {
                    btn.innerHTML = this.getInitials(encargado.nombre);
                }
                btn.title = encargado.nombre;
            } else {
                // Encargado no encontrado (posiblemente eliminado)
                btn.classList.add('none');
                btn.innerHTML = '?';
                btn.title = 'Encargado no encontrado';
            }
        }
    }
    
    // Obtener iniciales de un nombre
    getInitials(nombre) {
        return nombre.split(' ').map(n => n.charAt(0).toUpperCase()).join('').substring(0, 2);
    }
    
    // Establecer encargado para un bloque
    async setEncargado(blockId, encargado) {
        // Obtener datos actuales del bloque
        const currentData = await this.getBlockDataAsync(blockId);
        
        // Actualizar solo el campo encargado
        currentData.encargado = encargado;
        
        // Guardar los datos actualizados en Firebase
        if (window.firebaseSync) {
            await window.firebaseSync.saveBlockData(blockId, currentData);
        } else {
            // Fallback a localStorage
            localStorage.setItem(`block-${blockId}-data`, JSON.stringify(currentData));
        }
        
        // Actualizar el selector visual
        this.updateEncargadoSelector(blockId);
        
        console.log(`Encargado ${encargado} asignado a ${blockId}`);
    }
    
    // Obtener datos de un bloque (síncrono - para compatibilidad)
    getBlockData(blockId) {
        // Para compatibilidad, intentar obtener de localStorage primero
        const saved = localStorage.getItem(`block-${blockId}-data`);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (error) {
                console.error(`Error loading block ${blockId}:`, error);
            }
        }
        return { encargado: null };
    }
    
    // Obtener datos de un bloque (asíncrono - con Firebase)
    async getBlockDataAsync(blockId) {
        if (window.firebaseSync) {
            try {
                return await window.firebaseSync.getBlockData(blockId) || { encargado: null };
            } catch (error) {
                console.error(`Error loading block ${blockId} from Firebase:`, error);
            }
        }
        
        // Fallback a localStorage
        return this.getBlockData(blockId);
    }
    
    // Manejar actualizaciones remotas de Firebase
    handleRemoteUpdate(blockId, data) {
        console.log(`🔄 Actualizando ${blockId} desde cambio remoto`);
        
        // Restaurar estado del bloque con los nuevos datos
        this.restoreBlockState(blockId, data);
        
        // Actualizar contadores y filtros
        this.updateFilterCounts();
        this.updateTowerSummaries();
        
        // Mostrar indicador visual de sincronización
        this.showSyncIndicator(blockId);
    }
    
    // Mostrar indicador de sincronización
    showSyncIndicator(blockNum) {
        const indicator = document.getElementById(`indicator-${blockNum}`);
        if (indicator) {
            indicator.textContent = '🔄';
            indicator.style.opacity = '1';
            indicator.style.color = '#007bff';
            
            setTimeout(() => {
                indicator.textContent = '✅';
                indicator.style.color = '#28a745';
                setTimeout(() => {
                    indicator.style.opacity = '0.5';
                }, 1000);
            }, 500);
        }
    }
    
    // Cerrar todos los dropdowns
    closeAllDropdowns() {
        document.querySelectorAll('.encargado-dropdown, .encargado-dropdown-mini').forEach(dropdown => {
            dropdown.style.display = 'none';
        });
        document.querySelectorAll('.filter-encargado').forEach(btn => {
            btn.classList.remove('active');
        });
    }
    
    // Cerrar dropdown de filtro de encargados
    closeEncargadoDropdown() {
        const dropdown = document.getElementById('encargadoDropdown');
        const filterBtn = document.getElementById('filter-encargado');
        if (dropdown) dropdown.style.display = 'none';
        if (filterBtn) filterBtn.classList.remove('active');
    }
    
    // Renderizar opciones de encargados en el filtro
    renderEncargadoOptions() {
        const container = document.getElementById('encargadoOptions');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Opción "Todos"
        const allOption = document.createElement('div');
        allOption.className = 'encargado-option';
        allOption.innerHTML = `
            <div class="encargado-info">
                <span>Todos los encargados</span>
            </div>
        `;
        allOption.onclick = () => this.filterByEncargado(null);
        container.appendChild(allOption);
        
        // Opciones de encargados ordenadas por número de camas
        const encargadosConCamas = this.getEncargadosWithCounts();
        encargadosConCamas.forEach(({ encargado, count }) => {
            const option = document.createElement('div');
            option.className = 'encargado-option';
            const circleContent = this.getEncargadoCircleContent(encargado);
            option.innerHTML = `
                <div class="encargado-info">
                    ${circleContent}
                    <span>${encargado.nombre}</span>
                </div>
                <div class="encargado-actions">
                    <span class="encargado-count">${count}</span>
                    <button class="action-btn photo" onclick="event.stopPropagation(); ingresoManager.uploadEncargadoPhoto('${encargado.nombre}')" title="Cambiar foto">📷</button>
                    <button class="action-btn edit" onclick="event.stopPropagation(); ingresoManager.editEncargadoInline('${encargado.nombre}')" title="Editar">✏️</button>
                    <button class="action-btn delete" onclick="event.stopPropagation(); ingresoManager.deleteEncargado('${encargado.nombre}')" title="Eliminar">🗑️</button>
                </div>
            `;
            option.onclick = () => this.filterByEncargado(encargado.nombre);
            container.appendChild(option);
        });
    }
    
    // Obtener contenido del círculo del encargado
    getEncargadoCircleContent(encargado) {
        if (encargado.foto) {
            return `<img src="${encargado.foto}" alt="${encargado.nombre}" class="encargado-foto">`;
        } else {
            return `<div class="encargado-circle ${encargado.tipo}">${this.getInitials(encargado.nombre)}</div>`;
        }
    }

    // Función para subir y comprimir fotos
    uploadEncargadoPhoto(nombre) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (file) {
                const compressed = await this.compressImage(file, 32, 32);
                this.setEncargadoFoto(nombre, compressed);
            }
        };
        input.click();
    }

    async compressImage(file, width, height) {
        const imageBitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imageBitmap, 0, 0, width, height);
        return canvas.toDataURL('image/png');
    }

    setEncargadoFoto(nombre, foto) {
        const encargado = this.encargados.find(e => e.nombre === nombre);
        if (encargado) {
            encargado.foto = foto;
            this.saveEncargados();
            this.renderEncargadoOptions();
            this.updateAllEncargadosSelectors();
        }
    }
    getEncargadosWithCounts() {
        const counts = {};
        
        // Contar camas por encargado
        this.allBlocks.forEach(blockId => {
            const data = this.getBlockData(blockId);
            if (data.encargado) {
                counts[data.encargado] = (counts[data.encargado] || 0) + 1;
            }
        });
        
        // Crear array con encargados y conteos
        const result = this.encargados.map(encargado => ({
            encargado,
            count: counts[encargado.nombre] || 0
        }));
        
        // Ordenar por número de camas (descendente)
        return result.sort((a, b) => b.count - a.count);
    }
    
    // Filtrar por encargado
    filterByEncargado(encargadoNombre) {
        this.currentEncargadoFilter = encargadoNombre;
        this.updateEncargadoFilterIndicator(encargadoNombre);
        this.updateFilterDisplay();
        this.closeEncargadoDropdown();
    }
    
    // Actualizar indicador de filtro de encargado
    updateEncargadoFilterIndicator(encargadoNombre) {
        const indicador = document.getElementById('filtro-encargado-actual');
        const nombreSpan = document.getElementById('nombre-encargado-actual');
        
        if (encargadoNombre) {
            const encargado = this.encargados.find(e => e.nombre === encargadoNombre);
            if (encargado) {
                nombreSpan.innerHTML = encargado.nombre;
                indicador.style.display = 'block';
            }
        } else {
            indicador.style.display = 'none';
        }
    }
    // Limpiar filtro de encargado
    clearEncargadoFilter() {
        this.currentEncargadoFilter = null;
        this.updateEncargadoFilterIndicator(null);
        this.updateFilterDisplay();
    }
    
    // Actualizar visualización de filtros
    updateFilterDisplay() {
        this.allBlocks.forEach(blockId => {
            const container = document.getElementById(`container-${blockId}`);
            if (!container) return;
            
            let shouldShow = true;
            
            // Aplicar filtro de estado
            if (this.currentFilter !== 'all') {
                shouldShow = shouldShow && this.blockMatchesFilter(container, this.currentFilter);
            }
            
            // Aplicar filtro de encargado
            if (this.currentEncargadoFilter) {
                const data = this.getBlockData(blockId);
                shouldShow = shouldShow && (data.encargado === this.currentEncargadoFilter);
            }
            
            container.style.display = shouldShow ? 'block' : 'none';
        });
        
        this.updateFilterCounts();
        this.updateTowerSummaries();
    }
    
    // Toggle dropdown de encargado en cama individual
    toggleEncargadoDropdown(blockId) {
        const dropdown = document.getElementById(`encargado-dropdown-${blockId}`);
        if (!dropdown) return;
        
        // Cerrar otros dropdowns
        document.querySelectorAll('.encargado-dropdown-mini').forEach(d => {
            if (d !== dropdown) d.style.display = 'none';
        });
        
        const isOpen = dropdown.style.display === 'block';
        dropdown.style.display = isOpen ? 'none' : 'block';
        
        if (!isOpen) {
            this.renderEncargadoMiniOptions(blockId);
        }
    }
    
    // Renderizar opciones mini de encargados para cama individual
    renderEncargadoMiniOptions(blockId) {
        const dropdown = document.getElementById(`encargado-dropdown-${blockId}`);
        if (!dropdown) return;
        
        dropdown.innerHTML = '';
        
        // Opción "Sin asignar"
        const noneOption = document.createElement('div');
        noneOption.className = 'encargado-option-mini';
        noneOption.title = 'Sin asignar';
        noneOption.innerHTML = `
            <div class="encargado-circle none">∅</div>
            <span>Sin asignar</span>
        `;
        noneOption.onclick = () => {
            this.setEncargado(blockId, null);
            dropdown.style.display = 'none';
        };
        dropdown.appendChild(noneOption);
        
        // Opciones de encargados
        this.encargados.forEach(encargado => {
            const option = document.createElement('div');
            option.className = 'encargado-option-mini';
            option.title = encargado.nombre;
            const circleContent = this.getEncargadoCircleContent(encargado);
            option.innerHTML = `
                ${circleContent}
                <span>${encargado.nombre}</span>
            `;
            option.onclick = () => {
                this.setEncargado(blockId, encargado.nombre);
                dropdown.style.display = 'none';
            };
            dropdown.appendChild(option);
        });
    }
}

// Variable global para acceso desde HTML
let ingresoManager;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    ingresoManager = new IngresoControlManager();

    // Guardar antes de cerrar
    window.addEventListener('beforeunload', () => {
        ingresoManager.saveAll();
    });

    // Guardado periódico
    setInterval(() => {
        ingresoManager.saveAll();
    }, 30000);
});

// Función de debug
function showStorageInfo() {
    console.log('Datos almacenados:');
    [1, 2, 3, 4].forEach(blockNum => {
        const data = localStorage.getItem(`block-${blockNum}-data`);
        console.log(`Block ${blockNum}:`, data ? JSON.parse(data) : 'No data');
    });
}
