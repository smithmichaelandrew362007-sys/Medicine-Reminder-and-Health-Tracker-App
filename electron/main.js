/* ==========================================================================
   CARESYNC - ELECTRON DESKTOP RUNTIME (MAIN PROCESS)
   Medicine Reminder & Health Tracker Desktop Application
   ========================================================================== */

import { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, shell, Notification } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let tray = null;
let backendProcess = null;
let isQuitting = false;

const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;
const VITE_DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
const BACKEND_PORT = 3001;

/**
 * Check if the backend API server is already running
 */
function checkBackendLive() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${BACKEND_PORT}/api/config/neon/status`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Ensure backend server is running; spawn child process if needed
 */
async function ensureBackendServer() {
  const isAlive = await checkBackendLive();
  if (isAlive) {
    console.log(`[CareSync Desktop] Backend already running on http://localhost:${BACKEND_PORT}`);
    return;
  }

  console.log('[CareSync Desktop] Starting embedded backend API server...');
  const serverScript = path.resolve(__dirname, '..', 'server', 'index.js');
  
  backendProcess = spawn('node', [serverScript], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: String(BACKEND_PORT) },
    stdio: 'inherit'
  });

  backendProcess.on('error', (err) => {
    console.warn('[CareSync Desktop] Could not start embedded backend:', err.message);
  });
}

/**
 * Create Main Desktop Window
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'CareSync Health | Medicine Reminder & Health Tracker',
    backgroundColor: '#0c1322',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    show: false // Show when ready-to-show for smooth rendering
  });

  // Load URL
  if (isDev) {
    mainWindow.loadURL(`${VITE_DEV_URL}/login.html`);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'login.html'));
  }

  // Graceful show on ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Minimize to tray on close if tray is active
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (Notification.isSupported()) {
        new Notification({
          title: 'CareSync Health',
          body: 'CareSync is running in the background. Medicine reminders remain active!'
        }).show();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  setupAppMenu();
  setupSystemTray();
}

/**
 * Build Desktop Application Menu
 */
function setupAppMenu() {
  const template = [
    {
      label: 'CareSync',
      submenu: [
        {
          label: 'About CareSync',
          click: () => {
            shell.openExternal('https://github.com/smithmichaelandrew362007-sys/Medicine-Reminder-and-Health-Tracker-App');
          }
        },
        { type: 'separator' },
        {
          label: 'Reload App',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.reload()
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => mainWindow?.webContents.toggleDevTools()
        },
        { type: 'separator' },
        {
          label: 'Quit CareSync',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Sign In / Switch User',
          click: () => {
            if (isDev) {
              mainWindow?.loadURL(`${VITE_DEV_URL}/login.html`);
            } else {
              mainWindow?.loadFile(path.join(__dirname, '..', 'dist', 'login.html'));
            }
          }
        },
        {
          label: 'Health Dashboard',
          click: () => {
            if (isDev) {
              mainWindow?.loadURL(`${VITE_DEV_URL}/index.html`);
            } else {
              mainWindow?.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
            }
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation & Guides',
          click: () => shell.openExternal('https://github.com/smithmichaelandrew362007-sys/Medicine-Reminder-and-Health-Tracker-App#readme')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Setup System Tray for background reminder persistence
 */
function setupSystemTray() {
  try {
    // Generate an in-memory 16x16 icon for tray
    const icon = nativeImage.createFromBuffer(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZElEQVQ4T2NkoBAwUqifYdQAkD9Mzc2Z/zMwqGCI4zP4/39/xv///zOgiWNgYOD+9u0bAw8PD8M/RkYGFgZ8gHqaoJmBLhgcBgC1/8fDwyODz8DAgG7AP6gGDAwMDKSYQYwBAMj0I2PmsYqLAAAAAElFTkSuQmCC',
        'base64'
      )
    );

    tray = new Tray(icon);
    tray.setToolTip('CareSync Health - Medicine Reminders Active');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open CareSync',
        click: () => {
          mainWindow?.show();
          mainWindow?.focus();
        }
      },
      {
        label: 'Today Schedule',
        click: () => {
          mainWindow?.show();
          if (isDev) {
            mainWindow?.loadURL(`${VITE_DEV_URL}/index.html`);
          } else {
            mainWindow?.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      mainWindow?.show();
      mainWindow?.focus();
    });
  } catch (err) {
    console.warn('[CareSync Desktop] System tray init note:', err.message);
  }
}

/**
 * IPC Event Listeners
 */
ipcMain.on('app:notification', (event, { title, body, icon }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title || 'CareSync Health Alert',
      body: body || 'Time to take scheduled medication.',
      silent: false
    }).show();
  }
});

ipcMain.on('app:open-external', (event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url);
  }
});

ipcMain.on('app:minimize-to-tray', () => {
  mainWindow?.hide();
});

/**
 * App Lifecycle
 */
app.whenReady().then(async () => {
  await ensureBackendServer();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
