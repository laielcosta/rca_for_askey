/*
Channels Availability - Askey Router
Versión portable con selección de interfaz
*/

const puppeteer = require('puppeteer');
const readline = require('readline');
const func = require('./askey_channels_functions.js');

// Función para solicitar selección de interfaz
function askForInterface() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        console.log('\n================================================');
        console.log('   SELECCIÓN DE INTERFAZ WIFI');
        console.log('================================================\n');
        console.log('¿Qué interfaz desea probar?\n');
        console.log('  1) Solo 2.4 GHz');
        console.log('  2) Solo 5 GHz');
        console.log('  3) Ambas interfaces (2.4 GHz y 5 GHz)\n');
        
        rl.question('Ingrese su opción (1, 2 o 3): ', (answer) => {
            rl.close();
            const option = answer.trim();
            
            if (option === '1') {
                console.log('\n✓ Seleccionado: Solo 2.4 GHz\n');
                resolve('2.4GHz');
            } else if (option === '2') {
                console.log('\n✓ Seleccionado: Solo 5 GHz\n');
                resolve('5GHz');
            } else if (option === '3') {
                console.log('\n✓ Seleccionado: Ambas interfaces\n');
                resolve('both');
            } else {
                console.log('\n⚠ Opción no válida. Ejecutando ambas interfaces por defecto.\n');
                resolve('both');
            }
        });
    });
}

(async () => {
    let browser;
    
    try {
        // Solicitar selección de interfaz al inicio
        const selectedInterface = await askForInterface();
        
        console.log('Iniciando navegador Chromium...');
        
        browser = await puppeteer.launch({
            headless: true,
            defaultViewport: { width: 1366, height: 768 },
            protocolTimeout: 120000,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
        
        console.log('Navegador iniciado correctamente.');
        const page = await browser.newPage();

        page.setDefaultNavigationTimeout(60000);
        page.setDefaultTimeout(30000);

        // Acceder a la página del dispositivo
        if (!(await func.navigateToDeviceWebPage(page))) {
            throw new Error("No se pudo acceder a la página del dispositivo");
        }
        
        // Login
        if (!(await func.login(page))) {
            throw new Error("No se pudo iniciar sesión");
        }

        // Obtener frame WiFi inicial
        const wifiFrame = page.frames().find(frame => frame.url().includes('te_wifi.asp'));
        
        if (!wifiFrame) {
            throw new Error("No se encontró el frame WiFi");
        }
        
        // Ejecutar inSSIDer
        console.log("Preparando el escenario...");
        func.runInSSIDer('"C:\\Program Files (x86)\\MetaGeek\\inSSIDer Home\\inSSIDerHome.exe"');
        await func.delay(2000);
        
        // Obtener SSID para filtro en inSSIDer
        const ssidValue = await wifiFrame.$eval('input.Input_box[type="text"]', el => el.value);
        console.log("Filtre en inSSIDer por SSID:", ssidValue);

        // Click sobre el menú
        await wifiFrame.click('td.menuimg');

        // Acceder a la configuración avanzada
        if (!(await func.navigateToAdvancedSettings(wifiFrame))) {
            throw new Error("No se pudo acceder a configuración avanzada");
        }
        await func.delay(2000);

        // Crear carpeta de trabajo
        const finalPath = func.createMainFolder();
        if (!finalPath) {
            throw new Error("No se pudo crear el directorio de trabajo");
        }
        
        await func.delay(2000);

        // Acceder al frame de configuración avanzada
        const CAFrame = page.frames().find(frame => frame.url().includes('monu.asp'));
        
        if (!CAFrame) {
            throw new Error("No se encontró el frame de configuración avanzada");
        }

        // ========================================
        // CONFIGURACIÓN 2.4GHz
        // ========================================
        if (selectedInterface === '2.4GHz' || selectedInterface === 'both') {
            console.log("\n=== INICIANDO CONFIGURACIÓN 2.4GHz ===\n");
            
            if (!(await func.navigateTo24GHzManagement(CAFrame))) {
                throw new Error("No se pudo acceder a la gestión de 2.4GHz");
            }
            
            // Obtener mainFrame para operaciones
            const mainFrame24 = page.frames().find(frame => frame.name() === 'mainFrm');
            
            if (!mainFrame24) {
                throw new Error("No se encontró mainFrame para 2.4GHz");
            }

            try {
                console.log("Llamando a iterateChannels para 2.4GHz...");
                await func.iterateChannels(mainFrame24, finalPath, page, "2.4GHz");
                console.log("✓ iterateChannels para 2.4GHz finalizó correctamente.");
            } catch (error) {
                console.error("❌ Error dentro de iterateChannels para 2.4GHz:", error.message);
                console.error(error.stack);
            }
        } else {
            console.log("\n⏭️  Saltando configuración de 2.4GHz (no seleccionada)\n");
        }

        // ========================================
        // CONFIGURACIÓN 5GHz
        // ========================================
        if (selectedInterface === '5GHz' || selectedInterface === 'both') {
            console.log("\n=== INICIANDO CONFIGURACIÓN 5GHz ===\n");
            
            if (!(await func.navigateTo5GHzManagement(CAFrame))) {
                throw new Error("No se pudo acceder a la gestión de 5GHz");
            }
            
            const mainFrame5 = page.frames().find(frame => frame.name() === 'mainFrm');
            
            if (!mainFrame5) {
                throw new Error("No se encontró mainFrame para 5GHz");
            }
             
            try {
                console.log("Llamando a iterateChannels para 5GHz...");
                await func.iterateChannels(mainFrame5, finalPath, page, "5GHz");
                console.log("✓ iterateChannels para 5GHz finalizó correctamente.");
            } catch (error) {
                console.error("❌ Error dentro de iterateChannels para 5GHz:", error.message);
                console.error(error.stack);
            }
        } else {
            console.log("\n⏭️  Saltando configuración de 5GHz (no seleccionada)\n");
        }

        // ========================================
        // FINALIZACIÓN
        // ========================================
        console.log("\n================================================");
        console.log("✓✓✓ Script completado exitosamente ✓✓✓");
        console.log("================================================");
        console.log("TODAS LAS CAPTURAS SE GUARDARON EN:");
        console.log(finalPath);
        console.log("================================================\n");

    } catch (error) {
        console.error("\n❌ Error durante la ejecución:", error.message);
        console.error(error.stack);
        
        // Diagnóstico para errores de Chromium
        if (error.message.includes('Could not find Chromium') || 
            error.message.includes('Failed to launch') ||
            error.message.includes('spawn ENOENT')) {
            console.error("\n=== DIAGNÓSTICO DE CHROMIUM ===");
            console.error("El navegador Chromium no se encuentra instalado.");
            console.error("Si esto es un paquete portable, verifica que:");
            console.error("1. La carpeta contiene todos los archivos");
            console.error("2. Se ejecutó desde la ubicación correcta");
            console.error("3. Chromium se descargó correctamente en node_modules");
            console.error("================================\n");
        }
        
        process.exit(1);
    } finally {
        if (browser) {
            try {
                await browser.close();
                console.log("Navegador cerrado correctamente.");
            } catch (error) {
                console.error("Error al cerrar el navegador:", error.message);
            }
        }
    }
})();