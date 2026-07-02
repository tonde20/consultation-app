const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
let serverProcess = null;

const PORT = 3456;
const isDev = !app.isPackaged;

// Charge les variables d'environnement depuis env.config
function loadEnv() {
  const envPath = isDev
    ? path.join(__dirname, '..', '.env.local')
    : path.join(process.resourcesPath, 'app', '.next', 'standalone', 'env.config');

  if (!fs.existsSync(envPath)) return {};

  const result = {};
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["'](.*)["']$/, '$1');
    if (key) result[key] = val;
  }
  return result;
}

// Attend que le serveur Next.js soit prêt
function waitForServer(port, maxTries = 60) {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const attempt = () => {
      tries++;
      const req = http.get(`http://127.0.0.1:${port}`, (res) => {
        if (res.statusCode < 500) return resolve();
        if (tries >= maxTries) return reject(new Error('Le serveur ne répond pas'));
        setTimeout(attempt, 1000);
      });
      req.on('error', () => {
        if (tries >= maxTries) return reject(new Error('Délai d\'attente dépassé'));
        setTimeout(attempt, 1000);
      });
      req.end();
    };
    attempt();
  });
}

// Démarre le serveur Next.js standalone
function startServer(env) {
  const appRoot = path.join(process.resourcesPath, 'app');
  const serverScript = path.join(appRoot, '.next', 'standalone', 'server.js');
  const cwd = path.join(appRoot, '.next', 'standalone');

  serverProcess = spawn(process.execPath, [serverScript], {
    cwd,
    env: {
      ...process.env,
      ...env,
      PORT: String(PORT),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
      ELECTRON_RUN_AS_NODE: '1',
    },
  });

  serverProcess.stdout?.on('data', (d) => console.log('[Next.js]', d.toString().trim()));
  serverProcess.stderr?.on('data', (d) => console.error('[Next.js]', d.toString().trim()));
}

// Configure et lance la vérification des mises à jour
function setupAutoUpdater(ghToken) {
  process.env.GH_TOKEN = ghToken;

  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'tonde20',
    repo: 'consultation-app',
    private: true,
    token: ghToken,
  });

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Mise à jour disponible',
      message: 'Une nouvelle version de HDB Boromo est disponible.\nElle sera téléchargée en arrière-plan et installée à la prochaine fermeture.',
      buttons: ['OK'],
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Mise à jour prête',
      message: 'La mise à jour a été téléchargée.\nVoulez-vous redémarrer l\'application pour l\'installer maintenant ?',
      buttons: ['Redémarrer', 'Plus tard'],
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('[Updater]', err.message);
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Erreur de mise à jour',
      message: `Impossible de vérifier les mises à jour.\n\n${err.message}`,
      buttons: ['OK'],
    }).catch(() => {});
  });

  // Vérifier les mises à jour 5 secondes après le démarrage
  setTimeout(() => autoUpdater.checkForUpdates(), 5000);
}

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Hôpital de District de Boromo',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.maximize();
  mainWindow.loadURL(url);
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url: href }) => {
    shell.openExternal(href);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  if (isDev) {
    createWindow('http://localhost:3000');
    return;
  }

  const env = loadEnv();

  if (!env.DATABASE_URL) {
    dialog.showErrorBox(
      'Configuration manquante',
      'Le fichier de configuration est introuvable ou ne contient pas DATABASE_URL.\n\n' +
      'Contactez votre administrateur système.'
    );
    return app.quit();
  }

  startServer(env);

  try {
    await waitForServer(PORT);
    createWindow(`http://127.0.0.1:${PORT}`);

    // Activer les mises à jour automatiques si GH_TOKEN disponible
    if (env.GH_TOKEN) {
      setupAutoUpdater(env.GH_TOKEN);
    }
  } catch (err) {
    dialog.showErrorBox(
      'Erreur de démarrage',
      `Impossible de démarrer le serveur interne.\n\n${err.message}`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  serverProcess?.kill();
  app.quit();
});

app.on('before-quit', () => {
  serverProcess?.kill();
});
