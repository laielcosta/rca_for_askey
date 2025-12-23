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

// 🔑 Función para normalizar bandwidths y crear nombres de carpeta
function normalizeBandwidthForFolder(bandwidthText) {
    const lower = bandwidthText.toLowerCase().trim();
    
    // Eliminar "(auto)" y espacios extras
    let clean = lower.replace(/\(auto\)/g, '').trim();
    
    // Reemplazar "/" por "_"
    clean = clean.replace(/\//g, '_');
    
    // Reemplazar espacios por ""
    clean = clean.replace(/\s+/g, '');
    
    // Mapeo específico
    const mapping = {
        '20mhz': '20MHz',
        '20-40mhz': '20MHz_40MHz',
        '20_40mhz': '20MHz_40MHz',
        '40mhz': '40MHz',
        '80mhz': '80MHz',
        '160mhz': '160MHz',
    };
    
    if (mapping[clean]) {
        return mapping[clean];
    }
    
    // Capitalizar MHz si está presente
    if (clean.includes('mhz')) {
        clean = clean.replace('mhz', 'MHz');
    }
    
    // Asegurar formato correcto
    return sanitizeName(clean);
}

async function getBandwidthOptions(mainFrame, band) {
    try {
        await mainFrame.waitForSelector('select#adm_bandwidth', { visible: true, timeout: 10000 });
        
        // Verificar si el selector está deshabilitado
        const isDisabled = await mainFrame.$eval('select#adm_bandwidth', el => el.disabled);
        
        if (isDisabled) {
            console.log(`⚠️  Bandwidth selector está DESHABILITADO (gris) en ${band}`);
            console.log(`   Este router solo tiene UNA opción de bandwidth fija.`);
            
            // Obtener la opción actual aunque esté disabled
            const currentBandwidth = await mainFrame.$eval('select#adm_bandwidth', el => {
                const selected = el.options[el.selectedIndex];
                return {
                    value: selected.value,
                    bandwidth: selected.textContent.trim(),
                    disabled: true
                };
            });
            
            console.log(`   Bandwidth fija detectada: ${currentBandwidth.bandwidth}`);
            return [currentBandwidth];
        }
        
        // Si NO está disabled, obtener todas las opciones
        const options = await mainFrame.evaluate(() => {
            const select = document.querySelector('select#adm_bandwidth');
            if (!select) return [];
            
            return Array.from(select.options).map(option => ({
                value: option.value,
                bandwidth: option.textContent.trim(),
                disabled: false
            }));
        });
        
        if (options.length === 0) {
            console.warn(`⚠️  No se encontraron opciones de bandwidth para ${band}`);
        }
        
        return options;
        
    } catch (error) {
        console.error(`Error al obtener bandwidths para ${band}:`, error.message);
        return [];
    }
}

async function BandwidthAndIterateChannels(mainFrame, finalPath, page, band, optionsData) {
    console.log(`\n╔════════════════════════════════════════════════╗`);
    console.log(`║  Iniciando iteración para ${band.padEnd(26)} ║`);
    console.log(`╚════════════════════════════════════════════════╝\n`);
    
    await handleDialog(page);
    
    if (optionsData.length === 0) {
        console.error(`❌ No hay bandwidths disponibles para ${band}`);
        return;
    }
    
    for (let bwIndex = 0; bwIndex < optionsData.length; bwIndex++) {
        const { value, bandwidth, disabled } = optionsData[bwIndex];
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`   BANDWIDTH ${bwIndex + 1}/${optionsData.length}: ${bandwidth}`);
        console.log(`${'='.repeat(60)}`);
        
        // Normalizar nombre para carpeta
        const bandwidthForFolder = normalizeBandwidthForFolder(bandwidth);
        console.log(`   → Nombre de carpeta: ${bandwidthForFolder}`);
        
        // Si el bandwidth NO está disabled, seleccionarlo
        if (!disabled) {
            try {
                console.log(`   → Seleccionando bandwidth en dropdown...`);
                await handleDialog(page);
                await mainFrame.waitForSelector('select#adm_bandwidth', { visible: true, timeout: 5000 });
                await mainFrame.select('select#adm_bandwidth', value);
                await delay(2000);
                
                // Aplicar el cambio
                console.log(`   → Aplicando bandwidth...`);
                await mainFrame.click('input[value="Apply"]');
                await delay(5000);
                console.log(`   ✓ Bandwidth aplicado`);
                
            } catch (error) {
                console.error(`   ❌ Error al cambiar bandwidth: ${error.message}`);
                continue;
            }
        } else {
            console.log(`   ℹ️  Bandwidth fija (no seleccionable) - usando actual`);
        }
        
        // Crear estructura de carpetas
        let freqFolder = band === '5GHz' ? '5GHz' : sanitizeName('2_4GHz');
        const savePath = path.join(finalPath, freqFolder, bandwidthForFolder);
        
        if (!fs.existsSync(savePath)) {
            fs.mkdirSync(savePath, { recursive: true });
            fs.mkdirSync(path.join(savePath, 'WEB'), { recursive: true });
            fs.mkdirSync(path.join(savePath, 'INSSIDER'), { recursive: true });
            console.log(`   ✓ Carpeta creada: ${savePath}`);
        }
        
        // Obtener canales disponibles
        console.log(`\n   📋 Obteniendo canales disponibles...`);
        await delay(2000);
        
        let availableChannels;
        try {
            availableChannels = await mainFrame.$$eval('select#adm_channel option', options => 
                options.map(opt => ({
                    value: opt.value,
                    text: opt.textContent.trim()
                }))
            );
        } catch (error) {
            console.error(`   ❌ Error obteniendo canales: ${error.message}`);
            continue;
        }
        
        console.log(`   ✓ Canales detectados: ${availableChannels.map(ch => ch.text).join(', ')}`);
        
        if (availableChannels.length === 0) {
            console.warn(`   ⚠️  No hay canales disponibles`);
            continue;
        }
        
        // ═══════════════════════════════════════════════════════════
        // ITERACIÓN DE CANALES
        // ═══════════════════════════════════════════════════════════
        
        for (let i = 0; i < availableChannels.length; i++) {
            const { value: channelValue, text: channelText } = availableChannels[i];
            const channelDisplay = channelValue === '0' ? 'Auto' : channelText;
            
            console.log(`\n   ┌─────────────────────────────────────────────┐`);
            console.log(`   │ Canal ${i + 1}/${availableChannels.length}: ${channelDisplay.padEnd(30)}│`);
            console.log(`   └─────────────────────────────────────────────┘`);
            
            try {
                // Seleccionar el canal
                console.log(`     → Seleccionando canal en dropdown...`);
                await mainFrame.select('select#adm_channel', channelValue);
                await delay(2000);
                
                // Aplicar
                console.log(`     → Aplicando cambio...`);
                await handleDialog(page);
                await mainFrame.click('input[value="Apply"]');
                
                // ⚠️ ESPERA ESTÁNDAR (el router aplica rápido)
                console.log(`     ⏳ Esperando 8s para aplicación...`);
                await delay(8000);
                
                // ⚠️ ESPERA PARA INSSIDER (problema real)
                console.log(`     ⏳ Esperando 12s para estabilización de inSSIDer...`);
                await delay(12000);
                
                // Capturar
                console.log(`     📸 Capturando evidencias...`);
                await captureScreenshots(page, savePath, channelDisplay, bandwidthForFolder);
                
            } catch (error) {
                console.error(`     ❌ Error en canal ${channelDisplay}: ${error.message}`);
                continue;
            }
        }
    }
    
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`✓✓✓ Iteración completada para ${band}`);
    console.log(`${'═'.repeat(60)}\n`);
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
        
        // Captura WEB (1 sola)
        const webFilename = `channel_${safeChannel}_${safeBandwidth}.png`;
        await page.screenshot({ path: path.join(webPath, webFilename), fullPage: true });
        console.log(`       ✓ WEB: ${webFilename}`);
        
        // Capturas inSSIDer (2 con intervalo)
        for (let i = 1; i <= 2; i++) {
            const inssiderFilename = `inSSIDer_channel_${safeChannel}_${safeBandwidth}_${i}.png`;
            
            try {
                await screenshot({ filename: path.join(inssiderPath, inssiderFilename) });
                console.log(`       ✓ inSSIDer ${i}/2: ${inssiderFilename}`);
            } catch (error) {
                console.error(`       ⚠ Error captura inSSIDer ${i}/2: ${error.message}`);
            }
            
            if (i < 2) {
                await delay(3000);
            }
        }
        
    } catch (error) {
        console.error('     ❌ Error guardando capturas:', error.message);
    }
}

async function iterateChannels(mainFrame, finalPath, page, band) {
    if (!mainFrame) {
        console.error(`❌ mainFrame no definido para ${band}`);
        return;
    }
    
    await delay(1500);
    
    // Obtener bandwidths (puede ser 1 fijo disabled, o múltiples)
    const optionsData = await getBandwidthOptions(mainFrame, band);
    
    console.log(`\n📊 Resumen de bandwidths para ${band}:`);
    optionsData.forEach((opt, idx) => {
        const status = opt.disabled ? '[FIJO]' : '[SELECCIONABLE]';
        console.log(`   ${idx + 1}. ${opt.bandwidth} ${status}`);
    });
    
    if (optionsData.length === 0) {
        console.warn(`⚠️  No se encontraron opciones de bandwidth para ${band}`);
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
        console.log(`\n📁 Carpeta principal: ${finalPath}\n`);
        return finalPath;
    } catch (error) {
        console.error(`Error al crear carpeta principal: ${error.message}`);
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