/*
Instrucciones para ejecutar el script:
Este script interactúa con la WEBGUI del DUT, accediendo a la gestión de la interfaz de 2,4 GHz y 5GHZ, cambiando los canales disponibles
uno a uno y realizando capturas tanto de la WEB como de InSSIDer en el proceso.

Antes de ejecutar el script:
1.	Instalar Node.js:
    Descarga e instala Node.js desde https://nodejs.org/.
    Verifica la instalación ejecutando:
    node -v
    npm -v

2.	Instalar dependencias del proyecto:
    En la terminal, navega a la carpeta del proyecto y ejecuta:
    npm install puppeteer screenshot-desktop fs path child_process

3.	Ejecutar el script:
    Una vez instaladas todas las dependencias, puedes ejecutar el script con:
    node channels.js
    O simplemente ejecutar: run.bat

Notas importantes:
•	Este script fue desarrollado específicamente para la interfaz de dispositivos HGU de Askey Wifi 5 y 6. Es posible que no funcione de manera
 equivalente en productos de otros fabricantes debido a diferencias en la arquitectura y protocolos de comunicación.

Versión mejorada con mejor detección de dependencias y navegador.
*/

// ---------- Self-check de dependencias ----------
const { spawnSync } = require('child_process');
const path  = require('path');

(function ensureDeps() {
  try {
    require.resolve('puppeteer');
    require.resolve('screenshot-desktop');
    return;                              // ← todo OK, continúa ejecución
  } catch { /* nada */ }

  // si ya intentamos una vez en este proceso, abortar
  if (process.env.DEPS_ATTEMPTED) {
    console.error('Las dependencias siguen sin instalarse. Abortando.');
    process.exit(1);
  }

  console.log('Faltan dependencias. Ejecutando install_deps.ps1 …');
  const ps1 = path.join(__dirname, 'install_deps.ps1');
  const code = spawnSync('powershell.exe',
    ['-NoProfile','-ExecutionPolicy','Bypass','-File', ps1],
    { stdio: 'inherit' }
  ).status;

  if (code !== 0) {
    console.error('install_deps.ps1 terminó con error', code);
    process.exit(code);
  }

  // relanza UNA sola vez
  spawnSync(process.argv0, process.argv.slice(1), {
    stdio: 'inherit',
    env: { ...process.env, DEPS_ATTEMPTED: '1' }
  });
  process.exit(0);
})();
//  -------------------------------------------------------------

const puppeteer = require('puppeteer');
const func = require('./channels_functions.js');

(async () => {
    let browser;
    
    try {
        console.log('Iniciando navegador Chromium...');
        
        // Configuración mejorada del navegador
        browser = await puppeteer.launch({
            headless: true,
            defaultViewport: { width: 1366, height: 768 },  // Tamaño de ventana para simular un portátil
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

        // Configurar timeouts
        page.setDefaultNavigationTimeout(60000);
        page.setDefaultTimeout(30000);

        if (!(await func.navigateToDeviceWebPage(page))) throw new Error("No se pudo acceder a la página del dispositivo");
        if (!(await func.login(page))) throw new Error("No se pudo iniciar sesión");

        const wifiFrame = page.frames().find(frame => frame.url().includes('te_wifi.asp'));
        /*
        // Deshabilitar Unique SSID
        
        await wifiFrame.click('input[type="radio"][name="uniqueSSID"][value="0"]');
        await wifiFrame.click('button[value="Aplicar cambios"]');
        await func.delay(2000);
        console.log("Unique SSID deshabilitado");
        */
        
        // Ejecutar inSSIDer
        console.log("Preparando el escenario...");
        func.runInSSIDer('"C:\\Program Files (x86)\\MetaGeek\\inSSIDer Home\\inSSIDerHome.exe"');
        await func.delay(2000);
        
        // Obtener SSID
        const ssidValue = await wifiFrame.$eval('input.Input_box[type="text"]', el => el.value);
        console.log("Filtre en inSSIDer por SSID:", ssidValue);

        //Click sobre el menú
        await wifiFrame.click('td.menuimg');

        //Acceder a la configuración avanzada
        if (!(await func.navigateToAdvancedSettings(wifiFrame))) throw new Error("No se pudo acceder a configuración avanzada");
        await func.delay(2000);

        //
        const finalPath = func.createMainFolder();
        await func.delay(2000);

        //Acceder a la configuración de "2,4GHz"
        const CAFrame = page.frames().find(frame => frame.url().includes('monu.asp'));

        if (!(await func.navigateTo24GHzManagement(CAFrame))) throw new Error("No se pudo acceder a la gestión de 2.4GHz");
        
        // Iterar sobre bandas y canales y capturar pantallas
        const mainFrame = page.frames().find(frame => frame.name() === 'mainFrm');

        try {
            console.log("Llamando a iterateChannels para 2.4GHz...");
            await func.iterateChannels(mainFrame, finalPath, page, "2.4GHz");
            console.log("iterateChannels para 2.4GHz finalizó correctamente.");
        } catch (error) {
            console.error("Error dentro de iterateChannels para 2.4GHz:", error.message);
        }

        //Acceder a la configuración de "5GHz"
        if (!(await func.navigateTo5GHzManagement(CAFrame))) throw new Error("No se pudo acceder a la gestión de 5GHz");
             
        //Iterar sobre bandas y canales y capturar pantallas
        try {
            console.log("Llamando a iterateChannels para 5GHz...");
            await func.iterateChannels(mainFrame, finalPath, page, "5GHz");
            console.log("iterateChannels para 5GHz finalizó correctamente.");
        } catch (error) {
            console.error("Error dentro de iterateChannels para 5GHz:", error.message);
        }

        console.log("Script completado exitosamente.");

    } catch (error) {
        console.error("Error durante la ejecución:", error.message);
        
        // Diagnóstico adicional para errores de Chromium
        if (error.message.includes('Could not find Chromium') || 
            error.message.includes('Failed to launch') ||
            error.message.includes('spawn ENOENT')) {
            console.error("\n=== DIAGNÓSTICO DE CHROMIUM ===");
            console.error("Parece que hay un problema con la instalación de Chromium.");
            console.error("Soluciones sugeridas:");
            console.error("1. Ejecuta: npx puppeteer browsers install chrome");
            console.error("2. O ejecuta: node -e \"require('puppeteer').launch().then(() => console.log('OK'))\"");
            console.error("3. Verifica que no hay restricciones de firewall/antivirus");
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