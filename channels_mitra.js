/*
Instrucciones para ejecutar el script:
Este script interactúa con la WEBGUI del DUT, accediendo a la gestión de la interfaz de 2,4 GHz, cambiando los canales disponibles
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
    node main.js

Notas importantes:
•	Este script fue desarrollado específicamente para la interfaz de dispositivos HGU de Askey Wifi 5. Es posible que no funcione de manera
 equivalente en productos de otros fabricantes debido a diferencias en la arquitectura y protocolos de comunicación.

Sigue en desarrollo…
*/
const puppeteer = require('puppeteer');
const func = require('./channels_functions_mitra.js');

(async () => {
    const browser = await puppeteer.launch({ headless: true, defaultViewport: null, protocolTimeout: 120000, args: ['--window-size=1366,768'] });
    const page = await browser.newPage();

    try {
        if (!(await func.navigateToDeviceWebPage(page))) throw new Error("No se pudo acceder a la página del dispositivo");
        if (!(await func.login(page))) throw new Error("No se pudo iniciar sesión");
        
        // Deshabilitar Unique SSID
        await page.click('input[type="radio"][name="uniqueSSID"][value="0"]');
        await page.click('button[value="Aplicar cambios"]');
        await func.delay(2000);
        console.log("Unique SSID deshabilitado");
        
        // Ejecutar inSSIDer
        console.log("Preparando el escenario...");
        func.runInSSIDer('"C:\\Program Files (x86)\\MetaGeek\\inSSIDer Home\\inSSIDerHome.exe"');
        await func.delay(2000);

        // Obtener SSID y acceder a configuración avanzada
        const ssidValue = await page.$eval('input.Input_box[type="text"]', el => el.value);
        console.log("Filtre en inSSIDer por SSID:", ssidValue);
        await page.click('#pagemenu');
        if (!(await func.navigateToAdvancedSettings(page))) throw new Error("No se pudo acceder a configuración avanzada");
        await func.delay(2000);

        if (!(await func.navigateTo24GHzManagement(page))) throw new Error("No se pudo acceder a la gestión de 2.4GHz");
        
        const finalPath = func.createMainFolder();
        await func.delay(2000);
 
        // Iterar sobre canales y capturar pantallas
        if (!(await func.iterateChannels(page, finalPath))) throw new Error("No se pudo iterar sobre los canales");
       
;
    } catch (error) {
        console.error("Error durante la ejecución:", error.message);
    } finally {
        await browser.close();
    }
})();
