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

async function navigateTo24GHzManagement(CAFrame) {
    try {
        await CAFrame.click('a[url="wifi.asp"]');
        console.log("Se ingresó a la gestión de la red de 2.4GHz");
        return true;
    } catch (error) {
        console.error("Error al acceder a la gestión de la red de 2.4GHz:", error);
        return false;
    }
}

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

function sanitizeName(name) {
    return name.replace(/[^a-z0-9_\-\.]/gi, "_");
}

function getDesktopPath() {
    return path.resolve("C:\\CapturasCanales");
}

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
    console.log(`\nIniciando iteración de anchos de banda para ${band}...`);
    
    await handleDialog(page);
    
    for (const { value, bandwidth } of optionsData) {
        console.log(`\n=== Configurando ancho de banda: ${bandwidth} ===`);
        
        let bandwidthForName = sanitizeName(bandwidth.replace('/', '_').replace(' ', ''));

        // Filtrar bandwidths según la banda
        if (band === '2.4GHz' && !['20MHz', '20MHz_40MHz'].includes(bandwidthForName)) {
            console.log(`  ⏭️  Saltando bandwidth ${bandwidth} (no compatible con 2.4GHz)`);
            continue;
        }
        if (band === '5GHz' && !['20MHz', '40MHz', '80MHz'].includes(bandwidthForName)) {
            console.log(`  ⏭️  Saltando bandwidth ${bandwidth} (no compatible con 5GHz)`);
            continue;
        }

        try {
            await handleDialog(page);
            
            // Seleccionar el bandwidth
            await mainFrame.waitForSelector('select#adm_bandwidth', { visible: true, timeout: 5000 });
            await mainFrame.select('select#adm_bandwidth', value);
            console.log(`  Bandwidth seleccionado: ${bandwidth}`);
            await delay(2000);
            
            // Hacer clic en Apply
            await mainFrame.click('input[value="Apply"]');
            console.log(`  ✓ Botón Apply presionado`);
            
            // Esperar según la banda (Askey no reinicia interfaz como Mitrastar)
            console.log('  ⏳ Esperando 5 segundos para aplicar cambios...');
            await delay(5000);
            
        } catch (error) {
            console.error(`Error al cambiar el ancho de banda a ${bandwidth}:`, error.message);
            continue;
        }

        // Crear carpeta para este bandwidth
        let freqFolder = band === '5GHz' ? '5GHz' : sanitizeName('2_4GHz');
        let bwFolder = sanitizeName(bandwidth.replace(' ', '').replace('/', '_'));
        
        const savePath = path.join(finalPath, freqFolder, bwFolder);
        
        // Asegurarnos de que la carpeta existe
        if (!fs.existsSync(savePath)) {
            fs.mkdirSync(savePath, { recursive: true });
            fs.mkdirSync(path.join(savePath, 'WEB'), { recursive: true });
            fs.mkdirSync(path.join(savePath, 'INSSIDER'), { recursive: true });
        }

        // Obtener canales disponibles
        console.log('  Obteniendo canales disponibles...');
        await delay(2000);
        
        let availableChannels = await mainFrame.$$eval('select#adm_channel option', options => 
            options.map(opt => opt.value)
        );
        
        console.log(`  Canales disponibles: ${availableChannels.join(', ')}`);
        
        if (availableChannels.length === 0) {
            console.warn(`  No se encontraron canales para ${bandwidth}`);
            continue;
        }

        // ============================================================
        // ITERACIÓN DE CANALES - VERSIÓN MEJORADA ESTILO MITRASTAR
        // ============================================================
        
        // 🔑 Determinar si son canales DFS (5GHz)
        const isDFSChannel = (channel) => {
            const channelNum = parseInt(channel);
            return band === '5GHz' && channelNum >= 52 && channelNum <= 144;
        };
        
        for (let i = 0; i < availableChannels.length; i++) {
            const channel = availableChannels[i];
            const channelText = channel === '0' ? 'Auto' : channel;
            const isFirstChannel = i === 0;
            
            console.log(`\n    → Configurando canal ${channelText}...`);
            
            try {
                // Seleccionar el canal
                await mainFrame.select('select#adm_channel', channel);
                console.log(`    Canal ${channelText} seleccionado en dropdown`);
                await delay(2000);
                
                // Aplicar el cambio
                await handleDialog(page);
                await mainFrame.click('input[value="Apply"]');
                console.log(`    ✓ Botón Apply presionado`);
                
                // ⚠️ CRÍTICO: TIEMPOS AJUSTADOS PARA ASKEY
                let waitTime;
                
                if (band === '5GHz') {
                    // 5GHz necesita más tiempo
                    if (channel === '0') {
                        waitTime = 35000; // 35s para Auto
                        console.log(`    ⏳ [5GHz-Auto] Esperando ${waitTime/1000}s...`);
                    } else if (isFirstChannel) {
                        waitTime = 40000; // 40s para primer canal
                        console.log(`    ⏳ [5GHz-Primer canal post-BW] Esperando ${waitTime/1000}s...`);
                    } else if (isDFSChannel(channel)) {
                        waitTime = 35000; // 35s para canales DFS
                        console.log(`    ⏳ [5GHz-DFS] Esperando ${waitTime/1000}s (escaneo de radar)...`);
                    } else {
                        waitTime = 28000; // 28s para canales normales
                        console.log(`    ⏳ [5GHz-Normal] Esperando ${waitTime/1000}s...`);
                    }
                } else {
                    // 2.4GHz - Askey es más rápido que Mitrastar
                    if (channel === '0') {
                        waitTime = 25000; // 25s para Auto
                        console.log(`    ⏳ [2.4GHz-Auto] Esperando ${waitTime/1000}s...`);
                    } else {
                        waitTime = 20000; // 20s para canales normales
                        console.log(`    ⏳ [2.4GHz-Normal] Esperando ${waitTime/1000}s...`);
                    }
                }
                
                // ⚠️ NO HACER NADA MÁS DESPUÉS DE APPLY
                // Simplemente esperar sin interrupciones
                await delay(waitTime);
                
                // Estabilización de inSSIDer
                console.log(`    ⏳ Esperando 6s adicionales para estabilización de inSSIDer...`);
                await delay(6000);
                
                // Solo ahora capturar - sin verificar nada antes
                console.log(`    📸 Capturando evidencias...`);
                await captureScreenshots(page, savePath, channelText, bandwidthForName);
                
            } catch (error) {
                console.error(`    ❌ Error configurando canal ${channelText}:`, error.message);
                continue;
            }
        }
    }
}

async function captureScreenshots(page, savePath, channel, bandwidthForName) {
    try {
        const webPath = path.join(savePath, 'WEB');
        const inssiderPath = path.join(savePath, 'INSSIDER');
        
        if (!fs.existsSync(webPath)) {
            fs.mkdirSync(webPath, { recursive: true });
        }
        if (!fs.existsSync(inssiderPath)) {
            fs.mkdirSync(inssiderPath, { recursive: true });
        }

        const safeChannel = sanitizeName(channel.toString());
        const safeBandwidth = sanitizeName(bandwidthForName);
        
        // Captura de la WEB del router (una sola vez)
        const webFilename = `channel_${safeChannel}_${safeBandwidth}.png`;
        console.log(`    📸 Capturando interfaz web: ${webFilename}`);
        await page.screenshot({ path: path.join(webPath, webFilename), fullPage: true });
        
        // 🔑 MEJORA DE MITRASTAR: 2 capturas de inSSIDer con intervalo
        console.log(`    📸 Capturando inSSIDer (2 capturas)...`);
        
        for (let i = 1; i <= 2; i++) {
            const inssiderFilename = `inSSIDer_channel_${safeChannel}_${safeBandwidth}_${i}.png`;
            
            try {
                await screenshot({ filename: path.join(inssiderPath, inssiderFilename) });
                console.log(`      ✓ Captura ${i}/2 guardada`);
            } catch (error) {
                console.error(`      ⚠ Error en captura ${i}/2:`, error.message);
            }
            
            // Esperar 3 segundos entre capturas (solo después de la primera)
            if (i < 2) {
                await delay(3000);
            }
        }
        
        console.log("    ✓ Capturas completadas");
        
    } catch (error) {
        console.error('    Error al guardar capturas:', error.message);
    }
}

async function iterateChannels(mainFrame, finalPath, page, band) {
    if (!mainFrame) {
        console.error(`mainFrame no definido para ${band}`);
        return;
    }
    
    await delay(1500);
    const optionsData = await getBandwidthOptions(mainFrame);
    console.log(`Opciones de ancho de banda detectadas para ${band}:`, optionsData.map(opt => opt.bandwidth));
    
    if (optionsData.length === 0) {
        console.warn(`No se encontraron opciones de ancho de banda para ${band}`);
        return;
    }

    await BandwidthAndIterateChannels(mainFrame, finalPath, page, band, optionsData);
}

function createMainFolder() {
    const baseDir = getDesktopPath();
    const date = new Date().toISOString().split('T')[0];
    let folderName = sanitizeName(`Channel_availability_${date}`);
    let finalPath = path.join(baseDir, folderName);
    let counter = 1;

    try {
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
            console.log(`Directorio base creado: ${baseDir}`);
        }
    } catch (error) {
        console.error(`Error al crear el directorio base ${baseDir}:`, error.message);
        return null;
    }

    while (fs.existsSync(finalPath)) {
        folderName = sanitizeName(`Channel_availability_${date}_(${counter++})`);
        finalPath = path.join(baseDir, folderName);
    }

    try {
        fs.mkdirSync(finalPath, { recursive: true });
        console.log(`Las capturas se guardarán en: ${finalPath}`);

        // Crear estructura de 2.4GHz
        const path24GHz = path.join(finalPath, sanitizeName('2_4GHz'));
        fs.mkdirSync(path24GHz, { recursive: true });

        ['20MHz', '20MHz_40MHz'].forEach(subFolder => {
            const safeSubFolder = sanitizeName(subFolder);
            const subPath = path.join(path24GHz, safeSubFolder);
            fs.mkdirSync(subPath, { recursive: true });
            fs.mkdirSync(path.join(subPath, 'WEB'), { recursive: true });
            fs.mkdirSync(path.join(subPath, 'INSSIDER'), { recursive: true });
        });

        // Crear estructura de 5GHz
        const path5GHz = path.join(finalPath, '5GHz');
        fs.mkdirSync(path5GHz, { recursive: true });

        ['20MHz', '40MHz', '80MHz'].forEach(subFolder => {
            const safeSubFolder = sanitizeName(subFolder);
            const subPath = path.join(path5GHz, safeSubFolder);
            fs.mkdirSync(subPath, { recursive: true });
            fs.mkdirSync(path.join(subPath, 'WEB'), { recursive: true });
            fs.mkdirSync(path.join(subPath, 'INSSIDER'), { recursive: true });
        });

        console.log("Estructura de carpetas creada correctamente.");
        console.log(`Path absoluto completo: ${path.resolve(finalPath)}`);
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