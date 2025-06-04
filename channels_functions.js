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
•	Este script fue desarrollado específicamente para la interfaz de dispositivos HGU de Askey Wifi 5 y 6. Es posible que no funcione de manera
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
    navigateTo5GHzManagement,
    getBandwidthOptions,
    BandwidthAndIterateChannels,
    captureScreenshots,
    iterateChannels,
    handleDialog
};

function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}


let dialogRegistered = false;


//Función gestiona los diálogos pop-up

async function handleDialog(page) {
    if (!dialogRegistered) {
        page.on('dialog', async (dialog) => {
            try {
                console.log(`Mensaje del dispositivo: ${dialog.message()}`);
                await dialog.accept();
            } catch (error) {
                console.error("Error al manejar el diálogo:", error);
            }
        });
        dialogRegistered = true;
    }
}

// Ingresa a las Web de administración del dispositivo

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


// Naegva a hasta la configuración avanzada

async function navigateToAdvancedSettings(wifiFrame) {
    try {
        await wifiFrame.click('li[href="me_configuracion_avanzada.asp"]');
        console.log("Intentando acceder a la configuración avanzada...");
        await delay(2000);
        
        await wifiFrame.waitForSelector('input[type="button"][value="Aceptar"]', { visible: true, timeout: 5000 });
        await wifiFrame.evaluate(() => {
            const btn = document.querySelector('input[type="button"][value="Aceptar"]');
            if (btn) btn.scrollIntoView();
        });
        await wifiFrame.click('input[type="button"][value="Aceptar"]');
        
        console.log("Se accedió a la configuración avanzada");
        return true;
    } catch (error) {
        console.error("Error al acceder a la configuración avanzada:", error);
        return false;
    }
}

// Navega hasta la configuración de la interfaz de 2,4GHz

async function navigateTo24GHzManagement(CAFrame) {
    try {
        await CAFrame.click('a[url="wifi.asp"]');
        console.log("Se ingresó a la gestión de la red de 2,4GHz");
        return true;
    } catch (error) {
        console.error("Error al acceder a la gestión de la red de 2,4GHz:", error);
        return false;
    }
}

// Navega hasta la configuración de la interfaz de 5GHz

async function navigateTo5GHzManagement(CAFrame) {
    try {
        await CAFrame.click('a[url="wifi5g.asp"]');
        console.log("Se ingresó a la gestión de la red de 5GHz");
        return true;
    } catch (error) {
        console.error("Error al acceder a la gestión de la red de 5GHz:", error);
        return false;
    }
}

// Obtiene la ruta del escritorio

function getDesktopPath() {
    return path.resolve(require('os').homedir(), 'OneDrive - NTT DATA EMEAL', 'Escritorio');
}

// Obtiene los valores de ancho de banda desde el DOM

async function getBandwidthOptions(mainFrame) {
    await mainFrame.waitForSelector('select#adm_bandwidth', { visible: true });
    try {
        return await mainFrame.evaluate(() => {
            const options = document.querySelectorAll('select#adm_bandwidth option');
            if (!options.length) throw new Error('No se encontraron opciones para el ancho de banda.');
            return Array.from(options).map(option => ({
                value: option.value,
                bandwidth: option.textContent.trim()
            }));
        });
    } catch (error) {
        console.error('Error al obtener los datos del selector de ancho de banda:', error.message);
        return [];
    }
}

async function BandwidthAndIterateChannels(mainFrame, finalPath, page, band, optionsData) {
    for (const { value, bandwidth } of optionsData) {
        console.log(`Ancho de banda seleccionado: ${bandwidth}`);
        let bandwidthForName = bandwidth.replace('/', '_').replace(' ', '');

        try {
            await handleDialog(page);
            await mainFrame.waitForSelector('select#adm_bandwidth', { visible: true, timeout: 5000 });
            await mainFrame.select('select#adm_bandwidth', value);
            await mainFrame.click('input[value="Apply"]');
        } catch (error) {
            console.error(`Error al cambiar el ancho de banda a ${bandwidth}:`, error.message);
            continue;
        }

        await delay(2000);
        let freqFolder = band === '5GHz' ? '5GHz' : '2,4GHz';
        let bwFolder = bandwidth.replace(' ', '').replace('/', '_');
        if (band === '2.4GHz' && !['20MHz', '20MHz_40MHz'].includes(bwFolder)) continue;
        if (band === '5GHz' && !['20MHz', '40MHz', '80MHz'].includes(bwFolder)) continue;
        const savePath = path.join(finalPath, freqFolder, bwFolder);


        let availableChannels = await mainFrame.$$eval('select#adm_channel option', options => 
            options.map(opt => opt.value).filter(value => value !== "0") // Excluir "Auto"
        );
        
        console.log("Canales disponibles:", availableChannels);
        
        for (let channel of availableChannels) {
            console.log(`Seleccionando canal ${channel}. Ancho de banda ${bandwidth}...`);
            try {
                await mainFrame.select('select#adm_channel', channel);
                await delay(2000);
                await handleDialog(page);
                await mainFrame.click('input[value="Apply"]');
        
                // Esperar para confirmar el cambio
                await delay(5000);
                let selectedChannel = await mainFrame.$eval('select#adm_channel', sel => sel.value);
                console.log(`Canal aplicado: ${selectedChannel}`);
        
            } catch (error) {
                console.error(`Error al seleccionar el canal ${channel} en el ancho de banda ${bandwidth}:`, error.message);
                continue;
            }
        
            console.log(`Se aplicaron los cambios`);
            await delay(15000);
            await captureScreenshots(page, savePath, channel, bandwidthForName);
        }


        console.log(`Seleccionando configuración automática. Ancho de banda: ${bandwidthForName}...`);
        try {
            await mainFrame.select('select#adm_channel', '0');
            await delay(2000);
            await handleDialog(page);
            await mainFrame.click('input[value="Apply"]');
        } catch (error) {
            console.error(`Error al seleccionar la configuración automática del canal en el ancho de banda ${bandwidth}:`, error.message);
            continue;
        }
        await delay(30000);
        await captureScreenshots(page, savePath, 'auto', bandwidthForName);
    }
}

async function captureScreenshots(page, savePath, channel, bandwidthForName) {
    try {
        await page.screenshot({ path: `${savePath}/WEB/channel_${channel}_${bandwidthForName}.png` });
        screenshot({ filename: `${savePath}/INSSIDER/inSSIDer_channel_${channel}_${bandwidthForName}.png` });
        console.log("Capturas de pantalla (WEB e InSSider) guardadas");
    } catch (error) {
        console.error('Error al guardar las capturas de pantalla:', error.message);
    }
}

async function iterateChannels(mainFrame, finalPath, page, band) {
    // Espera extra para que el contenido de la sección haya cargado completamente
    await delay(1500); // se puede ajustar
    const optionsData = await getBandwidthOptions(mainFrame);
    console.log(`Opciones de ancho de banda detectadas para ${band}:`, optionsData.map(opt => opt.bandwidth));
    
    if (optionsData.length === 0) {
        console.warn(`No se encontraron opciones de ancho de banda para ${band}`);
        return;
    }

    await BandwidthAndIterateChannels(mainFrame, finalPath, page, band, optionsData);
}

/*
async function iterateChannels(mainFrame, finalPath, page, band) {
    const optionsData = await getBandwidthOptions(mainFrame);
    if (optionsData.length === 0) return;
    await BandwidthAndIterateChannels(mainFrame, finalPath, page, band, optionsData);
}
*/


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

        // Crear estructura de 2,4GHz
        const path24GHz = path.join(finalPath, '2,4GHz');
        fs.mkdirSync(path24GHz, { recursive: true });

        ['20MHz', '20MHz_40MHz'].forEach(subFolder => {
            const subPath = path.join(path24GHz, subFolder);
            fs.mkdirSync(subPath, { recursive: true });
            fs.mkdirSync(path.join(subPath, 'WEB'), { recursive: true });
            fs.mkdirSync(path.join(subPath, 'INSSIDER'), { recursive: true });
        });

        // Crear estructura de 5GHz
        const path5GHz = path.join(finalPath, '5GHz');
        fs.mkdirSync(path5GHz, { recursive: true });

        ['20MHz', '40MHz', '80MHz'].forEach(subFolder => {
            const subPath = path.join(path5GHz, subFolder);
            fs.mkdirSync(subPath, { recursive: true });
            fs.mkdirSync(path.join(subPath, 'WEB'), { recursive: true });
            fs.mkdirSync(path.join(subPath, 'INSSIDER'), { recursive: true });
        });

        console.log("Estructura de carpetas creada correctamente.");
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
    let targetFrame = page.frames().find(frame => frame.url().includes('te_acceso_router.asp'));

    while (!loginSuccessful) {
        password = await requestPassword();
        if (!password) {
            console.log("El usuario canceló la entrada de la contraseña.");
            return false;
        }
        try {
            await targetFrame.waitForSelector('input[type="password"]', { visible: true, timeout: 120000 });
            await targetFrame.type('input[type="password"]', password);
            await targetFrame.click('.te_acceso_router_enter');
            const dialog = await Promise.race([
                new Promise(resolve => page.once('dialog', resolve)),
                delay(5000).then(() => null)
            ]);
            if (dialog) {
                console.log(`Mensaje del dispositivo: ${dialog.message()}`);
                await dialog.accept();
                loginSuccessful = !dialog.message().includes('incorrecta');
            } else {
                await targetFrame.waitForSelector('td.menuimg', { timeout: 5000 });
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
