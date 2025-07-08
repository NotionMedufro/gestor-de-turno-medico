# 📝 Página de Bloques Editables

Una página web simple que permite a cualquier usuario escribir y editar contenido en 4 bloques independientes. El contenido se guarda automáticamente en el navegador y persiste incluso después de cerrar la página.

## 🚀 Características

- **4 bloques editables independientes** - Cada uno puede contener texto diferente
- **Guardado automático** - El contenido se guarda mientras escribes (con debounce de 500ms)
- **Persistencia local** - Los datos se almacenan en localStorage del navegador
- **Indicadores visuales** - Iconos que muestran el estado de guardado
- **Exportar/Importar** - Funcionalidad para hacer backup de los datos
- **Interfaz limpia** - Diseño moderno y responsivo
- **Sin servidor requerido** - Funciona completamente en el frontend

## 📋 Funcionalidades

### Edición
- Haz clic en cualquier bloque para empezar a escribir
- El texto se guarda automáticamente mientras escribes
- Soporte para formato básico (enter para nueva línea)
- Limpieza automática de formato al pegar contenido

### Guardado
- **Automático**: Se guarda cada 500ms después de dejar de escribir
- **Periódico**: Guardado automático cada 30 segundos
- **Al cerrar**: Guardado automático antes de cerrar la página
- **Indicadores**: 💾 (guardando) → ✅ (guardado)

### Gestión de datos
- **Limpiar todo**: Elimina todo el contenido (con confirmación)
- **Exportar**: Descarga un archivo JSON con todo el contenido
- **Importar**: Carga contenido desde un archivo JSON

## 🛠️ Uso

1. **Abrir la página**: Simplemente abre `index.html` en tu navegador
2. **Escribir**: Haz clic en cualquier bloque y empieza a escribir
3. **El contenido se guarda automáticamente** - No necesitas hacer nada más

### Botones de control

- **🗑️ Limpiar Todo**: Elimina todo el contenido (pide confirmación)
- **📥 Exportar**: Descarga un archivo JSON con el contenido actual
- **📤 Importar**: Carga contenido desde un archivo JSON

## 📁 Estructura del proyecto

```
editable-blocks-page/
├── index.html          # Página principal
├── styles.css          # Estilos CSS
├── script.js           # Lógica JavaScript
└── README.md           # Este archivo
```

## 🔧 Tecnologías utilizadas

- **HTML5** - Estructura semántica
- **CSS3** - Estilos modernos con Grid y Flexbox
- **JavaScript ES6+** - Funcionalidad completa
- **localStorage** - Persistencia de datos local
- **Google Fonts** - Tipografía (Inter)

## 💾 Almacenamiento de datos

Los datos se almacenan localmente en el navegador usando `localStorage`:

- **Clave**: `block-1`, `block-2`, `block-3`, `block-4`
- **Valor**: Contenido HTML del bloque
- **Persistencia**: Los datos persisten hasta que:
  - El usuario los elimine manualmente
  - Se limpie el localStorage del navegador
  - Se use la función "Limpiar Todo"

## 🌐 Compatibilidad

- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ⚠️ Internet Explorer (funcionalidad limitada)

## 📱 Responsive

La página es completamente responsive y funciona en:
- 💻 Desktop
- 📱 Tablets
- 📱 Móviles

## 🚀 Despliegue

Para hacer la página accesible online:

1. **GitHub Pages**: Sube los archivos a un repositorio de GitHub y activa Pages
2. **Netlify**: Arrastra la carpeta del proyecto a Netlify
3. **Vercel**: Conecta el repositorio con Vercel
4. **Servidor web**: Sube los archivos a cualquier hosting web

## 🔍 Debug

Para ver qué se está almacenando, abre la consola del navegador y ejecuta:

```javascript
showStorageInfo()
```

## 📝 Notas importantes

- Los datos se almacenan **localmente** en cada navegador
- **No hay sincronización** entre dispositivos diferentes
- Usa **Exportar/Importar** para transferir datos entre dispositivos
- El contenido es **privado** y no se envía a ningún servidor

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Si quieres mejorar la página:

1. Fork el proyecto
2. Crea una rama para tu feature
3. Haz commit de tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.
