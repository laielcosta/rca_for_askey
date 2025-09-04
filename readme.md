# Channel Availability Test Script

## 📋 Descripción

Este script automatiza las pruebas de disponibilidad de canales WiFi en dispositivos HGU (Home Gateway Unit) de Askey WiFi 5 y 6. Interactúa con la interfaz web del dispositivo para cambiar automáticamente entre diferentes canales de 2.4GHz y 5GHz, capturando pantallas tanto de la interfaz web como del software inSSIDer durante el proceso.

## ⚡ Instalación y Ejecución Rápida

### Para usuarios nuevos (método más fácil):

1. **Descarga** todos los archivos del proyecto
2. **Ejecuta** `run.bat` como administrador (click derecho → "Ejecutar como administrador")
3. **Espera** a que se instalen automáticamente todas las dependencias
4. **¡Listo!** El script comenzará a ejecutarse

```batch
# Solo necesitas hacer esto:
run.bat
```

## 🔧 Requisitos del Sistema

- **Sistema Operativo**: Windows 10/11
- **Permisos**: Administrador (solo para la primera instalación)
- **Conexión**: Internet (para descargar dependencias)
- **Software adicional**: inSSIDer Home instalado en la ruta por defecto

## 📁 Estructura del Proyecto

```
proyecto/
├── channels.js              # Script principal
├── channels_functions.js    # Funciones auxiliares
├── install_deps.ps1         # Instalador de dependencias
├── run.bat                  # Lanzador principal
├── package.json             # Configuración del proyecto
├── package-lock.json        # Dependencias bloqueadas
└── README.md               # Esta documentación
```

## 🚀 Guía de Uso

### 🔴 PREPARACIÓN CRÍTICA - LEER ANTES DE EJECUTAR

**📺 VENTANA DE inSSIDer - MUY IMPORTANTE:**
- ✅ La ventana de inSSIDer **DEBE estar VISIBLE** durante toda la ejecución
- ❌ **NO minimizar** la ventana de inSSIDer nunca
- ❌ **NO poner** otras aplicaciones encima de inSSIDer
- 📸 Las capturas de inSSIDer se toman de **lo que se ve en pantalla**
- 🔧 Las capturas web se toman automáticamente en segundo plano (no requieren ventana visible)

**🖥️ CONFIGURACIÓN DE PANTALLA:**
- Desactivar protector de pantalla temporalmente
- No bloquear el equipo durante la ejecución
- Mantener el monitor encendido

### Método 1: Ejecución Automática (Recomendado)

```batch
# Ejecutar como administrador la primera vez
run.bat
```

### Método 2: Instalación Manual

Si prefieres instalar manualmente las dependencias:

```bash
# 1. Instalar Node.js desde https://nodejs.org/ (versión 18 o superior)

# 2. Instalar dependencias
npm install

# 3. Instalar navegador Chromium
npx puppeteer browsers install chrome

# 4. Ejecutar script
node channels.js
```

## 📋 Proceso de Ejecución Paso a Paso

### 🔄 Flujo Completo del Script

1. **Inicio**: `run.bat` verifica e instala dependencias automáticamente
2. **Navegador**: Se abre Chromium en modo invisible (headless)
3. **Login**: Solicita contraseña para acceder al dispositivo (192.168.1.1)
4. **🔴 inSSIDer**: Se abre automáticamente - **MANTENER VENTANA VISIBLE TODO EL TIEMPO**
5. **SSID**: El script muestra el SSID - configurar filtro en inSSIDer manualmente
6. **Navegación**: Accede automáticamente a configuración avanzada WiFi
7. **2.4GHz**: Cambia canales y anchos de banda, toma capturas:
   - **📱 Web**: Capturas automáticas en segundo plano (invisible)
   - **📺 inSSIDer**: Capturas de la pantalla visible (requiere ventana abierta)
8. **5GHz**: Repite el proceso para la banda de 5GHz
9. **Finalización**: Organiza capturas en carpetas y cierra aplicaciones

### ⏱️ Tiempos Aproximados
- **Instalación inicial**: 5-10 minutos (solo primera vez)
- **Configuración 2.4GHz**: 15-20 minutos 
- **Configuración 5GHz**: 15-25 minutos
- **Total**: 30-60 minutos dependiendo del dispositivo

**🔴 DURANTE ESTOS 30-60 MINUTOS: NO MINIMIZAR inSSIDer**

## 📊 Funcionalidades

### ✅ Automatización Completa
- Instalación automática de Node.js
- Instalación de dependencias npm
- Descarga automática del navegador Chromium
- Configuración del entorno completa

### 🌐 Gestión Web Automática
- Login automático al dispositivo (IP: 192.168.1.1)
- Navegación por la interfaz de configuración
- Cambio automático de canales 2.4GHz y 5GHz
- Configuración de diferentes anchos de banda

### 📸 Captura de Pantallas - IMPORTANTE
- **🔧 Screenshots WEB**: Se toman automáticamente en segundo plano (sin ventana visible)
- **📺 Screenshots inSSIDer**: Se toman de la ventana visible (REQUIERE VENTANA ABIERTA)
- Organización automática por frecuencia y ancho de banda
- Nomenclatura sistemática de archivos

### 📁 Organización Automática
Las capturas se guardan en:
```
Desktop/Channel_availability_YYYY-MM-DD/
├── 2,4GHz/
│   ├── 20MHz/
│   │   ├── WEB/          ← Capturas automáticas
│   │   └── INSSIDER/     ← Capturas de ventana visible
│   └── 20MHz_40MHz/
│       ├── WEB/
│       └── INSSIDER/
└── 5GHz/
    ├── 20MHz/
    ├── 40MHz/
    └── 80MHz/
```

## ⚙️ Configuración

### Configuración del Dispositivo
- **IP del dispositivo**: 192.168.1.1 (modificable en `channels_functions.js`)
- **Autenticación**: Solicitará contraseña durante la ejecución
- **Timeout**: 120 segundos para operaciones de red

### 🔴 Configuración CRÍTICA de inSSIDer
- **Ruta por defecto**: `C:\Program Files (x86)\MetaGeek\inSSIDer Home\inSSIDerHome.exe`
- **Requisito**: Debe estar instalado antes de ejecutar el script
- **🔴 CRÍTICO**: La ventana de inSSIDer debe permanecer **VISIBLE** durante toda la ejecución
- **Filtrado**: Se abre automáticamente, filtrar manualmente por SSID mostrado
- **No hacer**: No minimizar, no cerrar, no poner otras ventanas encima

## 🛠️ Solución de Problemas

### Problemas Comunes y Soluciones

#### ❌ "Node.js no encontrado"
```bash
# Solución automática: ejecutar run.bat como administrador
# Solución manual: instalar desde https://nodejs.org/
```

#### ❌ "Could not find Chromium"
```bash
# Ejecutar en terminal:
npx puppeteer browsers install chrome

# O reinstalar completamente:
npm install puppeteer --force
```

#### ❌ "No se pudo acceder a la página del dispositivo"
- Verificar que el dispositivo esté conectado y en 192.168.1.1
- Comprobar conectividad de red
- Verificar que no haya proxy o firewall bloqueando

#### ❌ "Contraseña incorrecta"
- Verificar credenciales del dispositivo
- Asegurar que no hay bloqueo por intentos fallidos

#### ❌ "inSSIDer no se abre"
- Verificar instalación en la ruta por defecto
- Instalar inSSIDer Home desde el sitio oficial
- Ejecutar manualmente para verificar funcionamiento

#### 🔴 "Las capturas de inSSIDer salen en negro/vacías"
- **Causa Principal**: La ventana de inSSIDer está minimizada, oculta o tapada
- **Solución**: Mantener inSSIDer **siempre visible** durante la ejecución
- **Verificar**: 
  - La ventana debe estar en primer plano o visible en pantalla
  - No debe estar minimizada en la barra de tareas
  - Ninguna otra aplicación debe estar encima
- **Capturas web funcionan normal**: Estas se toman en segundo plano automáticamente

### Logs y Diagnóstico

El script proporciona información detallada durante la ejecución:
- ✅ Estados de instalación
- 🔍 Progreso de navegación web
- 📸 Confirmación de capturas
- ❌ Errores específicos con soluciones sugeridas

## 📋 Requisitos de Hardware

### Dispositivos Compatibles
- **Modelos probados**: HGU Askey WiFi 5 y 6
- **Interfaz web**: Compatible con framework específico de Askey
- **Advertencia**: Puede no funcionar con otros fabricantes

### Requisitos del PC
- **RAM**: Mínimo 4GB (recomendado 8GB)
- **Espacio**: 500MB libres (para dependencias y capturas)
- **Resolución**: Mínimo 1366x768 (para capturas consistentes)
- **🔴 Pantalla**: Debe permanecer encendida durante la ejecución

## 🔄 Actualizaciones

### Actualización Manual
```bash
# Actualizar dependencias
npm update

# Reinstalar navegador si hay problemas
npx puppeteer browsers install chrome --force
```

### Verificación de Estado
```bash
# Verificar instalación
node -e "require('puppeteer').launch().then(() => console.log('✅ Todo OK'))"
```

## 🤝 Soporte

### Antes de Reportar Problemas
1. **Ejecutar** `run.bat` como administrador
2. **Verificar** que inSSIDer está instalado y visible
3. **Comprobar** conectividad con el dispositivo
4. **Revisar** los logs en consola
5. **Confirmar** que inSSIDer no está minimizado

### Información Útil para Soporte
- Versión de Windows
- Versión de Node.js (`node -v`)
- Modelo exacto del dispositivo
- Mensaje de error completo
- Logs de consola
- Estado de la ventana inSSIDer (visible/minimizada)

## 📝 Notas Importantes

### 🔴 ADVERTENCIAS CRÍTICAS
- **Primera ejecución**: Requiere permisos de administrador
- **Conectividad**: Mantener conexión estable durante las pruebas
- **Duración**: El proceso completo puede tomar 30-60 minutos
- **🔴 MUY IMPORTANTE - inSSIDer**: La ventana debe estar **SIEMPRE VISIBLE** durante toda la ejecución
  - ❌ No minimizar la ventana
  - ❌ No poner otras aplicaciones encima
  - ❌ No cerrar inSSIDer
  - 📸 Las capturas se toman de la pantalla visible
- **🔧 Navegador web**: Las capturas se toman automáticamente en segundo plano (no visible)

### 💡 Consejos Importantes
- Ejecutar en horarios de poco tráfico de red
- Cerrar aplicaciones innecesarias durante la ejecución
- Mantener el dispositivo encendido y estable
- No interrumpir el proceso una vez iniciado
- **📺 Configurar pantalla**: Desactivar protector de pantalla durante la ejecución
- **🔒 Bloqueo**: No bloquear el equipo mientras se ejecuta (afecta capturas de inSSIDer)
- **📱 Multitarea**: Evitar usar otras aplicaciones intensivas durante el proceso
- **☕ Paciencia**: El proceso es largo pero automático, solo supervisar que inSSIDer esté visible

### 🔒 Seguridad
- Las credenciales se solicitan interactivamente (no se almacenan)
- Solo se accede a la IP del dispositivo configurada
- No se envían datos a servicios externos

---

## 📞 Contacto y Contribuciones

Este script es una herramienta especializada para pruebas técnicas. Para mejoras o modificaciones específicas, considerar las particularidades del hardware y la interfaz web del dispositivo objetivo.

**Versión**: 1.0  
**Compatibilidad**: Windows 10/11, Node.js 18+  
**Última actualización**: 2025

---

## 🔴 RESUMEN RÁPIDO - LO MÁS IMPORTANTE

1. **Ejecutar**: `run.bat` como administrador (primera vez)
2. **🔴 CRÍTICO**: Mantener ventana inSSIDer VISIBLE todo el tiempo (30-60 minutos)
3. **Web**: Las capturas web son automáticas (en segundo plano)
4. **inSSIDer**: Las capturas requieren ventana visible en pantalla
5. **No hacer**: No minimizar inSSIDer, no bloquear PC, no cerrar aplicaciones