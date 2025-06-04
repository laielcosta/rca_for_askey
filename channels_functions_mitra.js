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
const fs = require('fs');
const path = require('path');
const { exec } = require("child_process");
const screenshot = require('screenshot-desktop');

module.exports = {
    createMainFolder,
    requestPassword,
    runInSSIDer,
    login,
    delay,
    navigateToDeviceWebPage,
    navigateToAdvancedSettings,
    navigateTo24GHzManagement,
    iterateChannels,
    handleDialog
};

function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}

async function handleDialog(page) {
    page.once('dialog', async (dialog) => {
        //console.log(`Mensaje del dispositivo: ${dialog.message()}`);
        await dialog.accept();
    });
}

async function navigateToDeviceWebPage(page) {
    try {
        console.log('Accediendo a la WEB del dispositivo...');
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36");
        await page.goto("http://192.168.1.1", { waitUntil: "networkidle2" });
        await delay(1000);
        return true;
    } catch (error) {
        console.error("Error al navegar a la página web del dispositivo:", error);
        return false;
    }
}

async function navigateToAdvancedSettings(page) {
    try {
        await page.click('li[href="me_configuracion_avanzada.asp"]');
        console.log("Intentando acceder a la configuración avanzada...");
        await delay(2000);
        await page.click('input[type="button"][value="Aceptar"]');
        console.log("Se accedió a la configuración avanzada");
        return true;
    } catch (error) {
        console.error("Error al acceder a la configuración avanzada:", error);
        return false;
    }
}

async function navigateTo24GHzManagement(page) {
    try {
        await page.click('a[url="wifi.asp"]');
        console.log("Se ingresó a la gestión de la red de 2,4GHz");
        return true;
    } catch (error) {
        console.error("Error al acceder a la gestión de la red de 2,4GHz:", error);
        return false;
    }
}

async function iterateChannels(page, finalPath) {
    // Extraer todos los valores en un solo paso
    const optionsData = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('select#adm_bandwidth option')).map(option => ({
            value: option.value,
            bandwidth: option.textContent.trim()
        }));
    });

    for (const { value, bandwidth } of optionsData) {
        console.log(`Ancho de banda seleccionado: ${bandwidth}`);

        await handleDialog(page);
        await page.select('select#adm_bandwidth', value); // Cambia el valor del select
        await page.click('input[value="Apply"]');
        await delay(2000); // Espera para aplicar cambios antes de pasar a la siguiente opción
    



    

        const channelCount = await page.$$eval('select#adm_channel option', options => options.length) - 1;
        console.log("Cantidad de canales disponibles:", channelCount);
        
        
            for (let i = 1; i <= channelCount; i++) {
                console.log(`Seleccionando canal ${i}. Acho de banda ${bandwidth}...`);
                await page.select('select#adm_channel', i.toString());
                await delay(2000);
                await handleDialog(page);
                await page.click('input[value="Apply"]');
                console.log(`Se aplicaron los cambios`);
                await delay(30000);
                
                await page.screenshot({ path: `${finalPath}/WEB/channel_${i}_${bandwidth}.png` });
                screenshot({ filename: `${finalPath}/INSSIDER/inSSIDer_channel_${i}_${bandwidth}.png` });
                console.log("Capturas de pantalla (WEB e InSSider) guaradas");
            }
        
            // Configuración automática del canal
            console.log(`Seleccionando configuración automática. Ancho de banda: ${bandwidth}...`);
            await page.select('select#adm_channel', '0');
            await delay(2000);
            await handleDialog(page);
            await page.click('input[value="Apply"]');
            await delay(30000);
            await page.screenshot({ path: `${finalPath}/WEB/channel_auto_${bandwidth}.png` });
            screenshot({ filename: `${finalPath}/INSSIDER/inSSIDer_channel_auto_${bandwidth}.png` });
            console.log("Capturas de pantalla (WEB e InSSider) guardadas");
     }

    
}

function getDesktopPath() {
    return path.resolve(require('os').homedir(), 'OneDrive - NTT DATA EMEAL', 'Escritorio');
}

function createMainFolder() {
    const desktopPath = getDesktopPath();
    const date = new Date().toISOString().split('T')[0];
    let folderName = `Channel_availability_${date}`;
    let finalPath = path.join(desktopPath, folderName);
    let counter = 1;

    while (fs.existsSync(finalPath)) {
        folderName = `Channel_availability_${date}_(${counter++})`;
        finalPath = path.join(desktopPath, folderName);
    }

    try {
        fs.mkdirSync(finalPath, { recursive: true });
        console.log(`Las capturas se guardarán en: ${finalPath}`);
        fs.mkdirSync(path.join(finalPath, 'WEB'), { recursive: true });
        fs.mkdirSync(path.join(finalPath, 'INSSIDER'), { recursive: true });
        console.log("Subcarpetas WEB e INSSIDER creadas.");
        return finalPath;
    } catch (error) {
        console.error(`Error al crear las carpetas: ${error.message}`);
        return null;
    }
}

function requestPassword() {
    return new Promise((resolve) => {
        const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
        readline.question("Ingrese la contraseña (o presione Enter para cancelar): ", (password) => {
            readline.close();
            resolve(password.trim() || null);
        });
    });
}

function runInSSIDer(inSSIDerPath) {
    exec(inSSIDerPath, (error) => {
        if (error) console.error("Error al ejecutar inSSIDer:", error.message);
    });
}

async function login(page) {
    let password, loginSuccessful = false;

    while (!loginSuccessful) {
        password = await requestPassword();
        if (!password) {
            console.log("El usuario canceló la entrada de la contraseña.");
            return false;
        }
        try {
            await page.waitForSelector('#syspasswd_1', { visible: true, timeout: 120000 });
            await page.type('#syspasswd_1', password);
            await page.click('#Submit');
            const dialog = await Promise.race([
                new Promise(resolve => page.once('dialog', resolve)),
                delay(5000).then(() => null)
            ]);
            if (dialog) {
                console.log(`Mensaje del dispositivo: ${dialog.message()}`);
                await dialog.accept();
                loginSuccessful = !dialog.message().includes('incorrecta');
            } else {
                await page.waitForSelector('#pagemenu', { timeout: 5000 });
                loginSuccessful = true;
            }
            console.log(loginSuccessful ? 'Inicio de sesión exitoso' : 'Contraseña incorrecta. Intente nuevamente.');
        } catch (error) {
            console.error("Error durante el intento de inicio de sesión:", error);
            return false;
        }
    }
    return true;
}
