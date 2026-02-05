const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hearthAPI', {
    // Disk access
    checkDiskAccess: () => ipcRenderer.invoke('check-disk-access'),
    openDiskAccessSettings: () => ipcRenderer.invoke('open-disk-access-settings'),

    // Auth
    sendMagicLink: (data) => ipcRenderer.invoke('send-magic-link', data),
    signOut: () => ipcRenderer.invoke('sign-out'),
    getAuth: () => ipcRenderer.invoke('get-auth'),
    onAuthSuccess: (callback) => {
        ipcRenderer.on('auth-success', (event, data) => callback(data));
    },

    // iMessage data
    getRecentMessages: (options) => ipcRenderer.invoke('get-recent-messages', options),
    getContacts: () => ipcRenderer.invoke('get-imessage-contacts'),

    // Sync
    getLastSync: () => ipcRenderer.invoke('get-last-sync'),
    syncToHearth: (data) => ipcRenderer.invoke('sync-to-hearth', data),

    // Utilities
    openExternal: (url) => ipcRenderer.invoke('open-external', url)
});
