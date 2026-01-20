/**
 * Hearth Rolodex - Background Service Worker
 */

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'IMPORT_PROFILE') {
        handleLinkedInImport(message.data, message.settings)
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message }));
        return true;
    }

    if (message.type === 'IMPORT_X_PROFILE') {
        handleXImport(message.data, message.settings)
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message }));
        return true;
    }
    
    if (message.type === 'CHECK_AUTH') {
        checkAuthentication(message.settings)
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message }));
        return true;
    }

    if (message.type === 'CHECK_CONTACT') {
        checkContactExists(message.data, message.settings)
            .then(sendResponse)
            .catch(error => sendResponse({ exists: false, error: error.message }));
        return true;
    }
});

// Handle LinkedIn profile import
async function handleLinkedInImport(profileData, settings) {
    const { apiUrl } = settings;
    
    if (!apiUrl) {
        throw new Error('API URL not configured');
    }

    const baseUrl = apiUrl.replace(/\/$/, '');
    const endpoint = `${baseUrl}/api/rolodex/linkedin-import`;

    console.log('[Hearth] Importing LinkedIn profile:', profileData.name);

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profileData),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
            throw new Error('Not logged in. Please log in to Hearth first.');
        }
        throw new Error(errorData.error || `Import failed (${response.status})`);
    }

    return await response.json();
}

// Handle X profile import
async function handleXImport(profileData, settings) {
    const { apiUrl } = settings;
    
    if (!apiUrl) {
        throw new Error('API URL not configured');
    }

    const baseUrl = apiUrl.replace(/\/$/, '');
    const endpoint = `${baseUrl}/api/rolodex/x-import`;

    console.log('[Hearth] Importing X profile:', profileData.username);

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profileData),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
            throw new Error('Not logged in. Please log in to Hearth first.');
        }
        throw new Error(errorData.error || `Import failed (${response.status})`);
    }

    return await response.json();
}

// Check if user is authenticated
async function checkAuthentication(settings) {
    const { apiUrl } = settings;
    
    if (!apiUrl) {
        return { authenticated: false, error: 'API URL not configured' };
    }

    const baseUrl = apiUrl.replace(/\/$/, '');
    
    try {
        const response = await fetch(`${baseUrl}/api/rolodex/contacts`, {
            method: 'GET',
            credentials: 'include',
        });

        if (response.ok) {
            return { authenticated: true };
        } else if (response.status === 401) {
            return { authenticated: false, error: 'Not logged in' };
        } else {
            return { authenticated: false, error: `Server error (${response.status})` };
        }
    } catch (error) {
        return { authenticated: false, error: 'Could not connect to server' };
    }
}

// Check if contact already exists
async function checkContactExists(data, settings) {
    const { apiUrl } = settings;
    
    if (!apiUrl) {
        return { exists: false };
    }

    const baseUrl = apiUrl.replace(/\/$/, '');
    
    try {
        const params = new URLSearchParams();
        if (data.name) params.append('name', data.name);
        if (data.linkedinUrl) params.append('linkedinUrl', data.linkedinUrl);
        if (data.username) params.append('xUsername', data.username);
        if (data.platform) params.append('platform', data.platform);

        const response = await fetch(`${baseUrl}/api/rolodex/check-contact?${params}`, {
            method: 'GET',
            credentials: 'include',
        });

        if (response.ok) {
            const result = await response.json();
            return { exists: result.exists, contactId: result.contactId };
        }
        
        return { exists: false };
    } catch (error) {
        console.error('[Hearth] Error checking contact:', error);
        return { exists: false };
    }
}

// On install, set default API URL
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ apiUrl: 'http://localhost:3000' });
});
