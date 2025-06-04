const path = require('path');
require ('./channels_functions');

function getDesktopPath() {
    return path.join(require('os').homedir(), 'Desktop');
}

console.log(`Ruta final:${getDesktopPath()}`);

console.log(bandwidth);


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