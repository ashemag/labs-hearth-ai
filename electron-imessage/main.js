const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

function debugLog(...args) {
    console.log(...args);
}

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

// Build a handle (phone/email) to contact image (base64) map from macOS Contacts
function getContactImagesFromAddressBook() {
    const handleToImage = new Map(); // normalized handle -> { base64, mimeType }

    try {
        const dbPath = findAddressBookDB();
        if (!dbPath) return handleToImage;

        const dbDir = path.dirname(dbPath);
        const externalDataDir = path.join(dbDir, '.AddressBook-v22_SUPPORT', '_EXTERNAL_DATA');

        const buffer = fs.readFileSync(dbPath);
        const db = new SQL.Database(buffer);

        // Build Z_PK -> image data map from ZTHUMBNAILIMAGEDATA blobs
        const zpkToImage = new Map();
        const imgResult = db.exec(`
            SELECT Z_PK, ZTHUMBNAILIMAGEDATA
            FROM ZABCDRECORD
            WHERE ZTHUMBNAILIMAGEDATA IS NOT NULL AND length(ZTHUMBNAILIMAGEDATA) > 0
        `);

        if (imgResult.length && imgResult[0].values.length) {
            for (const row of imgResult[0].values) {
                const zpk = row[0];
                const blob = row[1];
                if (!blob) continue;

                const imgBuf = Buffer.from(blob);
                const imageData = extractContactImageFromBlob(imgBuf, externalDataDir);
                if (imageData) {
                    zpkToImage.set(zpk, imageData);
                }
            }
        }

        debugLog(`Found ${zpkToImage.size} contact images in AddressBook DB`);

        // Map phone handles to images
        const phoneQuery = `
            SELECT r.Z_PK, p.ZFULLNUMBER
            FROM ZABCDRECORD r
            JOIN ZABCDPHONENUMBER p ON r.Z_PK = p.ZOWNER
            WHERE p.ZFULLNUMBER IS NOT NULL
        `;
        const phoneResult = db.exec(phoneQuery);
        if (phoneResult.length && phoneResult[0].values.length) {
            for (const row of phoneResult[0].values) {
                const zpk = row[0];
                const phone = row[1];
                const normalizedPhone = normalizePhoneForLookup(phone);
                if (normalizedPhone && zpkToImage.has(zpk)) {
                    handleToImage.set(normalizedPhone, zpkToImage.get(zpk));
                }
            }
        }

        // Map email handles to images
        const emailQuery = `
            SELECT r.Z_PK, e.ZADDRESS
            FROM ZABCDRECORD r
            JOIN ZABCDEMAILADDRESS e ON r.Z_PK = e.ZOWNER
            WHERE e.ZADDRESS IS NOT NULL
        `;
        const emailResult = db.exec(emailQuery);
        if (emailResult.length && emailResult[0].values.length) {
            for (const row of emailResult[0].values) {
                const zpk = row[0];
                const email = row[1];
                if (email && zpkToImage.has(zpk)) {
                    const normalizedEmail = email.toLowerCase();
                    if (!handleToImage.has(normalizedEmail)) {
                        handleToImage.set(normalizedEmail, zpkToImage.get(zpk));
                    }
                }
            }
        }

        db.close();
        debugLog(`Loaded ${handleToImage.size} contact images from AddressBook`);
    } catch (error) {
        console.error('Error reading AddressBook images:', error);
    }

    return handleToImage;
}

// Extract image data from a ZTHUMBNAILIMAGEDATA blob
// Inline images: start with 0x01 header byte followed by JPEG/PNG data
// External refs: 38 bytes containing 0x02 + UUID string + 0x00 -> file in _EXTERNAL_DATA/
function extractContactImageFromBlob(imgBuf, externalDataDir) {
    try {
        if (imgBuf.length <= 1) return null;

        const firstByte = imgBuf[0];

        if (firstByte === 0x01 && imgBuf.length > 100) {
            // Inline image: skip the 0x01 header byte
            const imageData = imgBuf.slice(1);
            const mimeType = detectMimeType(imageData);
            return { base64: imageData.toString('base64'), mimeType };
        }

        if (firstByte === 0x02 && imgBuf.length === 38) {
            // External reference: extract UUID from bytes 1..37 (null-terminated ASCII)
            const uuidStr = imgBuf.slice(1, 37).toString('ascii');
            if (uuidStr && fs.existsSync(externalDataDir)) {
                const extPath = path.join(externalDataDir, uuidStr);
                if (fs.existsSync(extPath)) {
                    const fileData = fs.readFileSync(extPath);
                    if (fileData.length > 0) {
                        const mimeType = detectMimeType(fileData);
                        return { base64: fileData.toString('base64'), mimeType };
                    }
                }
            }
        }

        // Try treating the whole blob as image data (fallback)
        if (imgBuf.length > 100) {
            const mimeType = detectMimeType(imgBuf);
            if (mimeType) {
                return { base64: imgBuf.toString('base64'), mimeType };
            }
        }
    } catch (error) {
        // Silently skip unreadable images
    }
    return null;
}

// Detect MIME type from magic bytes
function detectMimeType(buf) {
    if (buf[0] === 0xFF && buf[1] === 0xD8) return 'image/jpeg';
    if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
    if (buf[0] === 0x49 && buf[1] === 0x49) return 'image/tiff';
    if (buf[0] === 0x4D && buf[1] === 0x4D) return 'image/tiff';
    // Default to JPEG for Apple contact images
    return 'image/jpeg';
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

// Lock to prevent concurrent token refresh attempts (Supabase rotates refresh tokens)
let refreshPromise = null;

// Refresh the access token using the refresh token
async function refreshAccessToken() {
    if (!authData.refreshToken) {
        console.log('No refresh token available');
        return false;
    }

    // If a refresh is already in progress, wait for it instead of starting another
    if (refreshPromise) {
        console.log('Token refresh already in progress, waiting...');
        return refreshPromise;
    }

    refreshPromise = (async () => {
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
                const body = await response.text().catch(() => '');
                console.log(`Token refresh failed: ${response.status} - ${body}`);
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
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
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
        console.log('Token validation returned', response.status, '- attempting refresh...');
        return await refreshAccessToken();
    } catch (error) {
        console.error('Error validating token:', error);
        return await refreshAccessToken();
    }
}

// Make an authenticated API call with automatic retry on 401
async function authenticatedFetch(url, options = {}) {
    const valid = await ensureValidToken();
    if (!valid) {
        throw new Error('Session expired. Please sign in again.');
    }

    const makeRequest = () => fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${authData.accessToken}`,
        }
    });

    let response = await makeRequest();

    // If 401, refresh token and retry once
    if (response.status === 401) {
        console.log('Got 401 from API, refreshing token and retrying...');
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
            throw new Error('Session expired. Please sign in again.');
        }
        response = await makeRequest();
    }

    return response;
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
            // Don't clear auth immediately - the refresh token may still be valid
            // for a future attempt. Only clear if we have no refresh token at all.
            if (!authData.refreshToken) {
                console.log('No refresh token available, clearing auth...');
                authData = { accessToken: null, refreshToken: null, user: null };
                clearAuthData();
            } else {
                console.log('Token validation failed but refresh token exists - keeping auth data for later retry');
            }
        } else {
            console.log('Auth valid for:', authData.user?.email);
        }
    }

    // Proactively refresh the token every 45 minutes (Supabase access tokens expire in 1 hour)
    setInterval(async () => {
        if (authData.refreshToken) {
            console.log('Proactive token refresh...');
            await refreshAccessToken();
        }
    }, 45 * 60 * 1000);

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

    try {
        const response = await authenticatedFetch(`${getApiBaseUrl()}/rolodex/imessage-sync`, {
            method: 'GET',
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

    try {
        const response = await authenticatedFetch(`${getApiBaseUrl()}/rolodex/imessage-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Sync failed: ${response.status}`);
        }

        const result = await response.json();

        // After sync, upload Apple contact images for all handles in the background
        try {
            const handleIds = messages.map(m => m.handle_id).filter(Boolean);
            if (handleIds.length > 0) {
                const imageMap = getContactImagesFromAddressBook();
                const imagesToUpload = {};
                for (const handleId of handleIds) {
                    const isEmail = handleId.includes('@');
                    const lookupKey = isEmail ? handleId.toLowerCase() : normalizePhoneForLookup(handleId);
                    if (lookupKey && imageMap.has(lookupKey)) {
                        const img = imageMap.get(lookupKey);
                        imagesToUpload[handleId] = `data:${img.mimeType};base64,${img.base64}`;
                    }
                }

                const imageCount = Object.keys(imagesToUpload).length;
                if (imageCount > 0) {
                    console.log(`[Sync] Uploading ${imageCount} Apple contact images...`);
                    const imgRes = await authenticatedFetch(`${getApiBaseUrl()}/rolodex/imessage-handle-images`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ images: imagesToUpload })
                    });
                    if (imgRes.ok) {
                        const imgResult = await imgRes.json();
                        console.log(`[Sync] Uploaded ${imgResult.uploaded} handle images`);
                    }
                }
            }
        } catch (imgError) {
            console.error('[Sync] Error uploading handle images (non-fatal):', imgError);
        }

        return result;
    } catch (error) {
        console.error('Error syncing to Hearth:', error);
        return { success: false, error: error.message };
    }
});

// Backfill contact info from already-synced iMessages
ipcMain.handle('backfill-contact-info', async () => {
    if (!authData.accessToken) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const response = await authenticatedFetch(`${getApiBaseUrl()}/rolodex/imessage-sync`, {
            method: 'PATCH',
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Backfill failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error backfilling contact info:', error);
        return { success: false, error: error.message };
    }
});

// Upload Apple contact images for all known handles to the server (backfill)
ipcMain.handle('upload-handle-images', async () => {
    if (!authData.accessToken) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        // Get all handles from iMessage database
        const db = openDatabase();
        const result = db.exec('SELECT DISTINCT id FROM handle');
        db.close();

        if (!result.length || !result[0].values.length) {
            return { success: true, uploaded: 0, message: 'No handles found' };
        }

        const allHandles = result[0].values.map(row => row[0]).filter(Boolean);
        console.log(`[Upload Images] Found ${allHandles.length} handles in iMessage DB`);

        const imageMap = getContactImagesFromAddressBook();
        const imagesToUpload = {};

        for (const handleId of allHandles) {
            const isEmail = handleId.includes('@');
            const lookupKey = isEmail ? handleId.toLowerCase() : normalizePhoneForLookup(handleId);
            if (lookupKey && imageMap.has(lookupKey)) {
                const img = imageMap.get(lookupKey);
                imagesToUpload[handleId] = `data:${img.mimeType};base64,${img.base64}`;
            }
        }

        const imageCount = Object.keys(imagesToUpload).length;
        if (imageCount === 0) {
            return { success: true, uploaded: 0, message: 'No Apple contact images found for any handles' };
        }

        console.log(`[Upload Images] Uploading ${imageCount} Apple contact images...`);
        const response = await authenticatedFetch(`${getApiBaseUrl()}/rolodex/imessage-handle-images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images: imagesToUpload })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Upload failed: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[Upload Images] Uploaded ${data.uploaded} handle images`);
        return { success: true, uploaded: data.uploaded };
    } catch (error) {
        console.error('[Upload Images] Error:', error);
        return { success: false, error: error.message };
    }
});

// Get contact images from macOS AddressBook for unmatched handles
ipcMain.handle('get-contact-images', async (event, handleIds) => {
    try {
        const imageMap = getContactImagesFromAddressBook();
        const result = {};

        for (const handleId of handleIds) {
            // Normalize the handle for lookup
            const isEmail = handleId.includes('@');
            let lookupKey;
            if (isEmail) {
                lookupKey = handleId.toLowerCase();
            } else {
                lookupKey = normalizePhoneForLookup(handleId);
            }

            if (lookupKey && imageMap.has(lookupKey)) {
                const img = imageMap.get(lookupKey);
                result[handleId] = `data:${img.mimeType};base64,${img.base64}`;
            }
        }

        return { success: true, images: result };
    } catch (error) {
        console.error('Error getting contact images:', error);
        return { success: false, error: error.message, images: {} };
    }
});

// Open external link
ipcMain.handle('open-external', async (event, url) => {
    shell.openExternal(url);
});
