const { contextBridge, ipcRenderer } = require('electron');

// Expose safe desktop capabilities to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  
  // Native desktop notifications
  sendNotification: (options) => {
    ipcRenderer.send('app:notification', options);
  },

  // Shell open external links
  openExternal: (url) => {
    ipcRenderer.send('app:open-external', url);
  },

  // Window control
  minimizeToTray: () => {
    ipcRenderer.send('app:minimize-to-tray');
  },

  // App version
  getVersion: () => process.env.npm_package_version || '1.0.0'
});
