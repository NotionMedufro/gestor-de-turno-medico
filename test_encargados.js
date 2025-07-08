
console.log('Testing encargados system...');

// Agregar algunos encargados de prueba
if (typeof ingresoManager !== 'undefined') {
    // Agregar encargados de prueba
    ingresoManager.encargados.push(
        { nombre: 'Dr. García', tipo: 'interno' },
        { nombre: 'Dr. López', tipo: 'becado' }
    );
    ingresoManager.saveEncargados();
    ingresoManager.renderEncargadoOptions();
    ingresoManager.updateAllEncargadosSelectors();
    console.log('Encargados agregados:', ingresoManager.encargados);
} else {
    console.log('ingresoManager no está disponible aún');
}

