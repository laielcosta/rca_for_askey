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
const func = require('./channels_functions.js');

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1366, height: 768 },  // Tamaño de ventana para simular un portátil
        protocolTimeout: 120000
    });
    const page = await browser.newPage();

    try {
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
            console.log("Llamando a iterateChannels...");
            await func.iterateChannels(mainFrame, finalPath, page), "2.4GHz";
            console.log("iterateChannels finalizó correctamente.");
        } catch (error) {
            console.error("Error dentro de iterateChannels:", error.message);
        }

    
        //Acceder a la configuración de "5GHz"
        if (!(await func.navigateTo5GHzManagement(CAFrame))) throw new Error("No se pudo acceder a la gestión de 5GHz");
             
        //Iterar sobre bandas y canales y capturar pantallas
        try {
            console.log("Llamando a iterateChannels...");
            await func.iterateChannels(mainFrame, finalPath, page, "5GHz");
            console.log("iterateChannels finalizó correctamente.");
        } catch (error) {
            console.error("Error dentro de iterateChannels:", error.message);
        }


    } catch (error) {
        console.error("Error durante la ejecución:", error.message);
    } finally {
        await browser.close();
    }
})();
