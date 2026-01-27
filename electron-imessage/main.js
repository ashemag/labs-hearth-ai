const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Debug log file
const DEBUG_LOG = path.join(os.homedir(), 'Desktop', 'hearth-debug.log');
function debugLog(...args) {
    const msg = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
    fs.appendFileSync(DEBUG_LOG, msg);
    console.log(...args);
}
debugLog('=== Electron app starting ===');

let mainWindow;
let SQL;

// iMessage database path
const IMESSAGE_DB_PATH = path.join(os.homedir(), 'Library/Messages/chat.db');

// macOS Contacts (AddressBook) database path
const ADDRESSBOOK_DIR = path.join(os.homedir(), 'Library/Application Support/AddressBook/Sources');

// Find the AddressBook database
function findAddressBookDB() {
    try {
        if (!fs.existsSync(ADDRESSBOOK_DIR)) {
            console.log('AddressBook Sources directory not found');
            return null;
        }
        
        // Look for .abcddb files in subdirectories
        const sources = fs.readdirSync(ADDRESSBOOK_DIR);
        for (const source of sources) {
            const sourcePath = path.join(ADDRESSBOOK_DIR, source);
            if (fs.statSync(sourcePath).isDirectory()) {
                const dbPath = path.join(sourcePath, 'AddressBook-v22.abcddb');
                if (fs.existsSync(dbPath)) {
                    return dbPath;
                }
            }
        }
        console.log('AddressBook database not found');
        return null;
    } catch (error) {
        console.error('Error finding AddressBook:', error);
        return null;
    }
}

// Build a handle (phone/email) to contact name map from macOS Contacts
function getContactNamesFromAddressBook() {
    const handleToName = new Map();
    
    try {
        debugLog('getContactNamesFromAddressBook called');
        const dbPath = findAddressBookDB();
        if (!dbPath) {
            debugLog('No AddressBook DB found');
            return handleToName;
        }
        
        debugLog('Reading AddressBook from:', dbPath);
        const buffer = fs.readFileSync(dbPath);
        const db = new SQL.Database(buffer);
        
        // Query to get contact names and their phone numbers
        const phoneQuery = `
            SELECT 
                r.ZFIRSTNAME,
                r.ZLASTNAME,
                p.ZFULLNUMBER
            FROM ZABCDRECORD r
            JOIN ZABCDPHONENUMBER p ON r.Z_PK = p.ZOWNER
            WHERE p.ZFULLNUMBER IS NOT NULL
        `;
        
        const phoneResult = db.exec(phoneQuery);
        
        if (phoneResult.length && phoneResult[0].values.length) {
            for (const row of phoneResult[0].values) {
                const firstName = row[0] || '';
                const lastName = row[1] || '';
                const phone = row[2];
                
                const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
                if (fullName && phone) {
                    const normalizedPhone = normalizePhoneForLookup(phone);
                    if (normalizedPhone) {
                        handleToName.set(normalizedPhone, fullName);
                    }
                }
            }
        }
        
        // Also query emails for iMessage contacts who use Apple ID
        const emailQuery = `
            SELECT 
                r.ZFIRSTNAME,
                r.ZLASTNAME,
                e.ZADDRESS
            FROM ZABCDRECORD r
            JOIN ZABCDEMAILADDRESS e ON r.Z_PK = e.ZOWNER
            WHERE e.ZADDRESS IS NOT NULL
        `;
        
        const emailResult = db.exec(emailQuery);
        
        if (emailResult.length && emailResult[0].values.length) {
            for (const row of emailResult[0].values) {
                const firstName = row[0] || '';
                const lastName = row[1] || '';
                const email = row[2];
                
                const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
                if (fullName && email) {
                    // Store email lowercase for matching
                    handleToName.set(email.toLowerCase(), fullName);
                }
            }
        }
        
        db.close();
        
        debugLog(`Loaded ${handleToName.size} contacts (phones + emails) from AddressBook`);
    } catch (error) {
        console.error('Error reading AddressBook:', error);
    }
    
    return handleToName;
}

// Normalize phone number for matching
function normalizePhoneForLookup(phone) {
    if (!phone) return null;
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    // If it starts with 1 and is 11 digits, remove the 1
    if (digits.length === 11 && digits.startsWith('1')) {
        return digits.slice(1);
    }
    // If it's 10 digits, return as-is
    if (digits.length === 10) {
        return digits;
    }
    // Return whatever we have for international numbers
    return digits;
}

// Extract text from attributedBody blob (newer iMessage format)
function extractTextFromAttributedBody(blob) {
    if (!blob) return '';
    
    try {
        // Convert blob to buffer
        let data;
        if (Buffer.isBuffer(blob)) {
            data = blob;
        } else if (blob instanceof Uint8Array) {
            data = Buffer.from(blob);
        } else {
            return '';
        }
        
        // The attributedBody is a serialized NSAttributedString
        // Format: ... NSString ... [header bytes] [length] [text] ...
        
        const str = data.toString('binary');
        const nsStringIndex = str.indexOf('NSString');
        if (nsStringIndex === -1) return '';
        
        // The text starts at NSString + 14 bytes (fixed offset based on analysis)
        // Byte at NSString+13 is the length, text starts at NSString+14
        const lengthOffset = nsStringIndex + 13;
        const textOffset = nsStringIndex + 14;
        
        if (lengthOffset >= data.length) return '';
        
        const textLength = data[lengthOffset];
        
        if (textLength > 0 && textOffset + textLength <= data.length) {
            const textBytes = data.slice(textOffset, textOffset + textLength);
            let text = textBytes.toString('utf8');
            
            // Clean up: remove control characters
            text = text.replace(/[\x00-\x1F]/g, '');
            
            // Remove replacement characters and other garbage at start/end
            text = text.replace(/^[\uFFFD\uFFFF\uFFFE]+/, '');
            text = text.replace(/[\uFFFD\uFFFF\uFFFE]+.*$/g, '');
            
            // Remove Object Replacement Character (U+FFFC) often used for attachments
            text = text.replace(/\uFFFC/g, '');
            
            return text.trim();
        }
        
        return '';
    } catch (e) {
        return '';
    }
}

// API configuration
// For local dev testing, use localhost. Change to production URL when deploying.
const USE_LOCAL_DEV = true; // Set to false for production builds

function getApiBaseUrl() {
    if (process.env.HEARTH_API_URL) {
        return process.env.HEARTH_API_URL;
    }
    if (USE_LOCAL_DEV) {
        return 'http://localhost:3000/api';
    }
    return 'https://labs.hearth.ai/api';
}

// Web app base URL for auth redirects
function getWebAppBaseUrl() {
    if (process.env.HEARTH_WEB_URL) {
        return process.env.HEARTH_WEB_URL;
    }
    if (USE_LOCAL_DEV) {
        return 'http://localhost:3000';
    }
    return 'https://labs.hearth.ai';
}

// Supabase configuration (public keys - safe to include)
const SUPABASE_URL = 'https://pqlkkgtbvaegqqqnozvl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_CuzgVaLWBQjcabA7v77jjQ_EzCyv--I';

// Custom protocol for magic link redirect
const PROTOCOL = 'hearth-sync';

// Auth storage path (in user data directory)
function getAuthStoragePath() {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'auth.json');
}

// Load saved auth data from disk
function loadAuthData() {
    try {
        const authPath = getAuthStoragePath();
        if (fs.existsSync(authPath)) {
            const data = JSON.parse(fs.readFileSync(authPath, 'utf8'));
            console.log('Loaded saved auth data for:', data.user?.email);
            return data;
        }
    } catch (error) {
        console.error('Error loading auth data:', error);
    }
    return { accessToken: null, refreshToken: null, user: null };
}

// Save auth data to disk
function saveAuthData(data) {
    try {
        const authPath = getAuthStoragePath();
        fs.writeFileSync(authPath, JSON.stringify(data, null, 2));
        console.log('Saved auth data for:', data.user?.email);
    } catch (error) {
        console.error('Error saving auth data:', error);
    }
}

// Clear auth data from disk
function clearAuthData() {
    try {
        const authPath = getAuthStoragePath();
        if (fs.existsSync(authPath)) {
            fs.unlinkSync(authPath);
            console.log('Cleared saved auth data');
        }
    } catch (error) {
        console.error('Error clearing auth data:', error);
    }
}

// Refresh the access token using the refresh token
async function refreshAccessToken() {
    if (!authData.refreshToken) {
        console.log('No refresh token available');
        return false;
    }

    try {
        console.log('Refreshing access token...');
        const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                refresh_token: authData.refreshToken
            })
        });

        if (!response.ok) {
            console.log('Token refresh failed:', response.status);
            return false;
        }

        const data = await response.json();
        authData.accessToken = data.access_token;
        authData.refreshToken = data.refresh_token;
        authData.user = data.user || authData.user;
        saveAuthData(authData);
        console.log('Token refreshed successfully for:', authData.user?.email);
        return true;
    } catch (error) {
        console.error('Error refreshing token:', error);
        return false;
    }
}

// Ensure we have a valid token, refreshing if needed
async function ensureValidToken() {
    if (!authData.accessToken) return false;

    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${authData.accessToken}`,
                'apikey': SUPABASE_ANON_KEY
            }
        });

        if (response.ok) return true;

        // Token expired, try refresh
        console.log('Token expired, attempting refresh...');
        return await refreshAccessToken();
    } catch (error) {
        console.error('Error validating token:', error);
        return await refreshAccessToken();
    }
}

// Token storage (loaded from disk on startup)
let authData = { accessToken: null, refreshToken: null, user: null };

let pendingProtocolUrl = null;

// Handle the protocol URL (magic link callback)
function handleProtocolUrl(url) {
    console.log('=== RECEIVED PROTOCOL URL ===');
    console.log('URL:', url);

    try {
        const hashPart = url.split('#')[1];
        if (!hashPart) return;

        const params = new URLSearchParams(hashPart);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken) {
            fetchUserWithToken(accessToken, refreshToken);
        }
    } catch (error) {
        console.error('Error parsing protocol URL:', error);
    }
}

// Fetch user info after magic link auth
async function fetchUserWithToken(accessToken, refreshToken) {
    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'apikey': SUPABASE_ANON_KEY
            }
        });

        if (response.ok) {
            const user = await response.json();
            authData = {
                accessToken,
                refreshToken,
                user
            };

            // Persist auth data to disk
            saveAuthData(authData);

            if (mainWindow) {
                mainWindow.webContents.send('auth-success', {
                    user: { email: user.email, id: user.id }
                });
                mainWindow.focus();
            }
        }
    } catch (error) {
        console.error('Error fetching user:', error);
    }
}

// Ensure single instance and handle deep links
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, argv) => {
        const protocolArg = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
        if (protocolArg) {
            handleProtocolUrl(protocolArg);
        }

        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

// Handle protocol on macOS
app.on('open-url', (event, url) => {
    event.preventDefault();
    if (app.isReady()) {
        handleProtocolUrl(url);
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    } else {
        pendingProtocolUrl = url;
    }
});

// Initialize SQL.js
async function initSqlJs() {
    try {
        const initSqlJs = require('sql.js');

        const wasmPath = app.isPackaged
            ? path.join(process.resourcesPath, 'sql-wasm.wasm')
            : path.join(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm');

        SQL = await initSqlJs({
            locateFile: () => wasmPath
        });
        console.log('SQL.js initialized');
    } catch (error) {
        console.error('Error initializing SQL.js:', error);
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 650,
        resizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#ffffff'
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(async () => {
    // Register protocol handler
    app.removeAsDefaultProtocolClient(PROTOCOL);
    if (process.defaultApp) {
        const appPath = process.argv.length >= 2
            ? path.resolve(process.argv[1])
            : path.resolve(app.getAppPath());
        app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [appPath]);
    } else {
        app.setAsDefaultProtocolClient(PROTOCOL);
    }

    // Load saved auth data
    authData = loadAuthData();

    // Validate saved token if present, refresh if expired
    if (authData.accessToken) {
        const valid = await ensureValidToken();
        if (!valid) {
            console.log('Could not validate or refresh token, clearing auth...');
            authData = { accessToken: null, refreshToken: null, user: null };
            clearAuthData();
        } else {
            console.log('Auth valid for:', authData.user?.email);
        }
    }

    await initSqlJs();
    createWindow();

    if (pendingProtocolUrl) {
        handleProtocolUrl(pendingProtocolUrl);
        pendingProtocolUrl = null;
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Helper to open the iMessage database
function openDatabase() {
    if (!SQL) {
        throw new Error('SQL.js not initialized');
    }
    const buffer = fs.readFileSync(IMESSAGE_DB_PATH);
    return new SQL.Database(buffer);
}

// Check if we have Full Disk Access
ipcMain.handle('check-disk-access', async () => {
    debugLog('check-disk-access called');
    try {
        if (!fs.existsSync(IMESSAGE_DB_PATH)) {
            debugLog('iMessage database not found at', IMESSAGE_DB_PATH);
            return { hasAccess: false, error: 'iMessage database not found' };
        }
        const db = openDatabase();
        debugLog('Database opened successfully');
        db.close();
        return { hasAccess: true };
    } catch (error) {
        return { hasAccess: false, error: error.message };
    }
});

// Open System Preferences for Full Disk Access
ipcMain.handle('open-disk-access-settings', async () => {
    shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles');
});

// Send magic link email
ipcMain.handle('send-magic-link', async (event, { email }) => {
    try {
        // Use configurable web base URL for magic link redirect
        const redirectUrl = `${getWebAppBaseUrl()}/auth/electron-callback`;

        console.log('Sending magic link to:', email);
        console.log('Redirect URL:', redirectUrl);

        const response = await fetch(`${getApiBaseUrl()}/auth/magic-link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                redirectTo: redirectUrl
            })
        });

        const data = await response.json();
        console.log('Magic link response:', response.status, data);

        if (!response.ok) {
            if (data.error === 'not_allowed') {
                return { success: false, error: 'No account found with this email. Please sign up at labs.hearth.ai first.' };
            }
            if (data.msg?.includes('User not found') || data.error_description?.includes('User not found')) {
                return { success: false, error: 'No account found with this email. Please sign up at labs.hearth.ai first.' };
            }
            return { success: false, error: data.error_description || data.msg || 'Failed to send magic link' };
        }

        return { success: true };
    } catch (error) {
        console.error('Magic link error:', error);
        return { success: false, error: error.message };
    }
});

// Sign out
ipcMain.handle('sign-out', async () => {
    authData = { accessToken: null, refreshToken: null, user: null };
    clearAuthData();
    return { success: true };
});

// Get current auth state
ipcMain.handle('get-auth', async () => {
    if (authData.accessToken && authData.user) {
        return {
            isAuthenticated: true,
            user: {
                email: authData.user.email,
                id: authData.user.id
            },
            token: authData.accessToken
        };
    }
    return { isAuthenticated: false, token: null };
});

// Get recent messages
ipcMain.handle('get-recent-messages', async (event, { sinceDate, sinceMessageId, limit = 500 }) => {
    debugLog('get-recent-messages called, sinceDate:', sinceDate, 'sinceMessageId:', sinceMessageId, 'limit:', limit);
    try {
        const db = openDatabase();
        
        // Get contact names from macOS Contacts
        debugLog('Loading AddressBook names...');
        const addressBookNames = getContactNamesFromAddressBook();
        debugLog('AddressBook loaded, size:', addressBookNames.size);

        // Build WHERE clause - prefer sinceMessageId (more reliable)
        let whereClause;
        if (sinceMessageId) {
            // Use ROWID for incremental sync (most reliable)
            whereClause = `m.ROWID > ${sinceMessageId}`;
            debugLog('Querying messages with ROWID >', sinceMessageId);
        } else if (sinceDate) {
            // Fall back to timestamp for initial sync
            const APPLE_EPOCH_SECONDS = 978307200n;
            const unixSeconds = BigInt(Math.floor(new Date(sinceDate).getTime() / 1000));
            const appleSeconds = unixSeconds - APPLE_EPOCH_SECONDS;
            const sinceTimestamp = appleSeconds * 1000000000n;
            whereClause = `m.date > ${sinceTimestamp.toString()}`;
            debugLog('Querying messages since timestamp:', sinceTimestamp.toString());
        } else {
            whereClause = '1=1';
        }

        const query = `
            SELECT
                m.ROWID as message_id,
                COALESCE(m.text, '') as text,
                m.attributedBody,
                m.is_from_me,
                datetime(m.date/1000000000 + 978307200, 'unixepoch') as date,
                m.date as raw_date,
                h.id as handle_id,
                h.service
            FROM message m
            JOIN handle h ON m.handle_id = h.ROWID
            WHERE ${whereClause}
            ORDER BY m.ROWID ASC
            LIMIT ${limit}
        `;

        const result = db.exec(query);
        db.close();

        if (!result.length || !result[0].values.length) {
            return { success: true, contacts: [], total_messages: 0 };
        }

        const columns = result[0].columns;
        const messages = result[0].values.map(row => {
            const obj = {};
            columns.forEach((col, i) => obj[col] = row[i]);
            return obj;
        });

        const byContact = {};
        for (const msg of messages) {
            const contactId = msg.handle_id;
            
            // Get contact name from AddressBook (try phone first, then email)
            let contactName = null;
            if (contactId) {
                // Check if it's an email (contains @)
                if (contactId.includes('@')) {
                    contactName = addressBookNames.get(contactId.toLowerCase());
                } else {
                    const normalizedPhone = normalizePhoneForLookup(contactId);
                    if (normalizedPhone) {
                        contactName = addressBookNames.get(normalizedPhone);
                    }
                }
                if (contactName) {
                    debugLog(`Matched ${contactId} to "${contactName}" from AddressBook`);
                }
            }
            if (!byContact[contactId]) {
                byContact[contactId] = {
                    handle_id: msg.handle_id,
                    contact_name: contactName,  // Use resolved name from AddressBook
                    service: msg.service,
                    messages: [],
                    last_message_date: msg.date
                };
            }
            // Extract text - try text field first, then attributedBody
            let messageText = msg.text || '';
            if (!messageText && msg.attributedBody) {
                messageText = extractTextFromAttributedBody(msg.attributedBody);
            }
            
            byContact[contactId].messages.push({
                message_id: msg.message_id,
                text: messageText,
                is_from_me: msg.is_from_me === 1,
                date: msg.date
            });
        }

        return {
            success: true,
            contacts: Object.values(byContact),
            total_messages: messages.length
        };
    } catch (error) {
        console.error('Error reading iMessages:', error);
        return { success: false, error: error.message };
    }
});

// Get contacts with their identifiers (phone/email)
ipcMain.handle('get-imessage-contacts', async () => {
    try {
        const db = openDatabase();

        const query = `
            SELECT DISTINCT
                h.id as identifier,
                h.service,
                c.display_name,
                MAX(m.date) as last_message_date
            FROM handle h
            LEFT JOIN chat_handle_join chj ON h.ROWID = chj.handle_id
            LEFT JOIN chat c ON chj.chat_id = c.ROWID
            LEFT JOIN message m ON m.handle_id = h.ROWID
            GROUP BY h.id
            ORDER BY last_message_date DESC
        `;

        const result = db.exec(query);
        db.close();

        if (!result.length) {
            return { success: true, contacts: [] };
        }

        const columns = result[0].columns;
        const contacts = result[0].values.map(row => {
            const obj = {};
            columns.forEach((col, i) => obj[col] = row[i]);
            return obj;
        });

        return { success: true, contacts };
    } catch (error) {
        console.error('Error reading contacts:', error);
        return { success: false, error: error.message };
    }
});

// Get last synced message ID from server
ipcMain.handle('get-last-sync', async () => {
    if (!authData.accessToken) {
        return { success: false, error: 'Not authenticated' };
    }

    // Ensure token is valid before making the call
    const valid = await ensureValidToken();
    if (!valid) {
        return { success: false, error: 'Session expired. Please sign in again.' };
    }

    try {
        const response = await fetch(`${getApiBaseUrl()}/rolodex/imessage-sync`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authData.accessToken}`
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to get last sync: ${response.status}`);
        }

        const data = await response.json();
        return { success: true, lastMessageId: data.lastMessageId };
    } catch (error) {
        console.error('Error getting last sync:', error);
        return { success: false, error: error.message };
    }
});

// Sync messages to Hearth API
ipcMain.handle('sync-to-hearth', async (event, { messages }) => {
    if (!authData.accessToken) {
        return { success: false, error: 'Not authenticated' };
    }

    // Ensure token is valid before making the call
    const valid = await ensureValidToken();
    if (!valid) {
        return { success: false, error: 'Session expired. Please sign in again.' };
    }

    try {
        const response = await fetch(`${getApiBaseUrl()}/rolodex/imessage-sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authData.accessToken}`
            },
            body: JSON.stringify({ messages })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Sync failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error syncing to Hearth:', error);
        return { success: false, error: error.message };
    }
});

// Open external link
ipcMain.handle('open-external', async (event, url) => {
    shell.openExternal(url);
});
