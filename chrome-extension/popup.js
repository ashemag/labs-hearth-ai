/**
 * Hearth Rolodex Extension Popup
 */

const API_URL = 'https://labs.hearth.ai/api';
let currentProfileData = null;
let isExistingContact = false;
let currentPlatform = null; // 'linkedin' or 'x'

document.addEventListener('DOMContentLoaded', async () => {
    const importSection = document.getElementById('import-section');
    const notSupportedSection = document.getElementById('not-supported-section');
    const importButton = document.getElementById('import-button');
    const buttonText = document.getElementById('button-text');
    const iconBookmark = document.querySelector('.icon-bookmark');
    const iconRefresh = document.querySelector('.icon-refresh');
    const importStatus = document.getElementById('import-status');
    const profileName = document.getElementById('profile-name');
    const profileHeadline = document.getElementById('profile-headline');
    const profileAvatar = document.getElementById('profile-avatar');
    const existingBadge = document.getElementById('existing-badge');
    const platformBadge = document.getElementById('platform-badge');
    const platformIcon = document.getElementById('platform-icon');
    const platformName = document.getElementById('platform-name');
    const openRolodexLink = document.getElementById('open-rolodex');
    const statusDot = document.getElementById('status-dot');
    const noteInput = document.getElementById('note-input');

    // Store API URL for background script
    await chrome.storage.sync.set({ apiUrl: API_URL });

    // Check current page
    checkCurrentPage();

    // Check auth status
    checkAuthStatus();

    // Import button handler
    importButton.addEventListener('click', async () => {
        if (!currentProfileData || (!currentProfileData.name && !currentProfileData.username)) {
            showToast('No profile data', 'error');
            return;
        }

        importButton.classList.add('loading');
        importButton.disabled = true;
        importStatus.className = 'import-status hidden';

        try {
            const messageType = currentPlatform === 'x' ? 'IMPORT_X_PROFILE' : 'IMPORT_PROFILE';
            const note = noteInput.value.trim();

            const response = await chrome.runtime.sendMessage({
                type: messageType,
                data: { ...currentProfileData, note },
                settings: { apiUrl: API_URL },
            });

            if (response.error) {
                throw new Error(response.error);
            }

            // Success
            importButton.classList.remove('loading');
            importButton.classList.add('success');
            iconBookmark.classList.add('hidden');
            iconRefresh.classList.add('hidden');
            
            const successText = response.isNew ? 'Added!' : 'Updated!';
            buttonText.textContent = successText;

            if (response.isNew) {
                isExistingContact = true;
                existingBadge.classList.remove('hidden');
            }

            // Clear the note input after successful save
            noteInput.value = '';

            setTimeout(() => {
                importButton.classList.remove('success');
                updateButtonState();
                importButton.disabled = false;
            }, 2000);

        } catch (error) {
            importButton.classList.remove('loading');
            importStatus.textContent = error.message || 'Failed to save';
            importStatus.className = 'import-status error';
            importButton.disabled = false;
        }
    });

    // Open Rolodex
    openRolodexLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: `${API_URL}/app/rolodex` });
    });

    async function checkCurrentPage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab?.url) {
                showNotSupported();
                return;
            }

            const url = tab.url;
            
            // Check for LinkedIn profile
            if (url.match(/linkedin\.com\/in\//)) {
                currentPlatform = 'linkedin';
                setPlatformBadge('linkedin');
                importSection.classList.remove('hidden');
                notSupportedSection.classList.add('hidden');
                await extractProfileData(tab.id, 'linkedin');
                return;
            }
            
            // Check for X/Twitter profile
            if (url.match(/(twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/?$/)) {
                currentPlatform = 'x';
                setPlatformBadge('x');
                importSection.classList.remove('hidden');
                notSupportedSection.classList.add('hidden');
                await extractProfileData(tab.id, 'x');
                return;
            }

            showNotSupported();
        } catch (error) {
            console.error('Error:', error);
            showNotSupported();
        }
    }

    function showNotSupported() {
        importSection.classList.add('hidden');
        notSupportedSection.classList.remove('hidden');
    }

    function setPlatformBadge(platform) {
        platformBadge.className = `platform-badge ${platform}`;
        if (platform === 'linkedin') {
            platformIcon.textContent = '🔗';
            platformName.textContent = 'LinkedIn';
        } else if (platform === 'x') {
            platformIcon.textContent = '𝕏';
            platformName.textContent = 'X / Twitter';
        }
    }

    async function extractProfileData(tabId, platform) {
        try {
            profileName.textContent = 'Loading...';
            profileHeadline.textContent = '';

            // Try content script first
            try {
                const response = await chrome.tabs.sendMessage(tabId, { type: 'GET_PROFILE_DATA' });
                if (response && (response.name || response.username)) {
                    currentProfileData = response;
                    await updatePreview(platform);
                    return;
                }
            } catch (e) {
                console.log('Content script not ready, injecting...');
            }

            // Fallback: inject script
            const scrapeFunc = platform === 'x' ? scrapeXProfile : scrapeLinkedInProfile;
            const results = await chrome.scripting.executeScript({
                target: { tabId },
                func: scrapeFunc,
            });

            if (results?.[0]?.result) {
                currentProfileData = results[0].result;
                await updatePreview(platform);
            } else {
                throw new Error('No data');
            }
        } catch (error) {
            profileName.textContent = 'Could not load';
            profileHeadline.textContent = 'Refresh the page';
            currentProfileData = null;
        }
    }

    async function updatePreview(platform) {
        if (!currentProfileData) return;
        
        if (platform === 'x') {
            profileName.textContent = currentProfileData.name || `@${currentProfileData.username}` || 'Unknown';
            profileHeadline.textContent = currentProfileData.username ? `@${currentProfileData.username}` : '';
        } else {
            profileName.textContent = currentProfileData.name || 'Unknown';
            profileHeadline.textContent = currentProfileData.headline || currentProfileData.location || '';
        }
        
        if (currentProfileData.profileImageUrl) {
            profileAvatar.style.backgroundImage = `url(${currentProfileData.profileImageUrl})`;
        }

        await checkIfExists(platform);
    }

    async function checkIfExists(platform) {
        const checkData = platform === 'x' 
            ? { username: currentProfileData.username, platform: 'x' }
            : { name: currentProfileData.name, linkedinUrl: currentProfileData.linkedinUrl || currentProfileData.profileUrl };

        try {
            const response = await chrome.runtime.sendMessage({
                type: 'CHECK_CONTACT',
                data: checkData,
                settings: { apiUrl: API_URL },
            });

            isExistingContact = response?.exists || false;
            
            if (isExistingContact) {
                existingBadge.classList.remove('hidden');
            } else {
                existingBadge.classList.add('hidden');
            }
            
            updateButtonState();
        } catch (error) {
            console.error('Error checking contact:', error);
            isExistingContact = false;
            updateButtonState();
        }
    }

    function updateButtonState() {
        if (isExistingContact) {
            buttonText.textContent = 'Update Contact';
            importButton.classList.add('update-mode');
            iconBookmark.classList.add('hidden');
            iconRefresh.classList.remove('hidden');
        } else {
            buttonText.textContent = 'Save to Rolodex';
            importButton.classList.remove('update-mode');
            iconBookmark.classList.remove('hidden');
            iconRefresh.classList.add('hidden');
        }
    }

    async function checkAuthStatus() {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'CHECK_AUTH',
                settings: { apiUrl: API_URL },
            });
            statusDot.className = response?.authenticated ? 'status-dot connected' : 'status-dot disconnected';
        } catch {
            statusDot.className = 'status-dot disconnected';
        }
    }

    function showToast(message, type = 'success') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 200);
        }, 2500);
    }
});

// LinkedIn scraper function
function scrapeLinkedInProfile() {
    const data = {
        platform: 'linkedin',
        linkedinUrl: window.location.href.split('?')[0],
        profileUrl: window.location.href.split('?')[0],
        name: null,
        headline: null,
        location: null,
        profileImageUrl: null,
        about: null,
        experience: [],
        education: [],
    };

    const nameEl = document.querySelector('h1.text-heading-xlarge') || 
                   document.querySelector('h1[class*="text-heading"]') ||
                   document.querySelector('h1');
    if (nameEl) data.name = nameEl.textContent.trim();

    const headlineEl = document.querySelector('.text-body-medium.break-words') ||
                       document.querySelector('div.text-body-medium');
    if (headlineEl) data.headline = headlineEl.textContent.trim();

    const spans = document.querySelectorAll('.text-body-small');
    for (const span of spans) {
        const text = span.textContent.trim();
        if (text && (text.includes(',') || text.includes('Area')) && 
            !text.includes('connection') && !text.includes('follower') && text.length < 80) {
            data.location = text;
            break;
        }
    }

    const img = document.querySelector('img.pv-top-card-profile-picture__image--show') ||
                document.querySelector('img.pv-top-card-profile-picture__image') ||
                document.querySelector('.pv-top-card-profile-picture__container img');
    if (img?.src && !img.src.includes('ghost')) data.profileImageUrl = img.src;

    const aboutSection = document.querySelector('#about');
    if (aboutSection) {
        const aboutContainer = aboutSection.closest('section');
        if (aboutContainer) {
            const aboutText = aboutContainer.querySelector('.inline-show-more-text span[aria-hidden="true"]') ||
                             aboutContainer.querySelector('.inline-show-more-text');
            if (aboutText) data.about = aboutText.textContent.trim();
        }
    }

    const experienceSection = document.querySelector('#experience');
    if (experienceSection) {
        const expContainer = experienceSection.closest('section');
        if (expContainer) {
            const expItems = expContainer.querySelectorAll('li.artdeco-list__item');
            expItems.forEach((item, index) => {
                if (index >= 5) return;
                const titleEl = item.querySelector('.t-bold span[aria-hidden="true"]') || item.querySelector('.t-bold');
                const companyEl = item.querySelector('.t-normal span[aria-hidden="true"]') || item.querySelector('.t-14.t-normal');
                const datesEl = item.querySelector('.t-black--light span[aria-hidden="true"]') || item.querySelector('.t-black--light');
                const title = titleEl?.textContent?.trim();
                const company = companyEl?.textContent?.trim();
                const dates = datesEl?.textContent?.trim();
                if (title || company) {
                    data.experience.push({ title: title || '', company: company || '', dates: dates || '' });
                }
            });
        }
    }

    const educationSection = document.querySelector('#education');
    if (educationSection) {
        const eduContainer = educationSection.closest('section');
        if (eduContainer) {
            const eduItems = eduContainer.querySelectorAll('li.artdeco-list__item');
            eduItems.forEach((item, index) => {
                if (index >= 3) return;
                const schoolEl = item.querySelector('.t-bold span[aria-hidden="true"]') || item.querySelector('.t-bold');
                const degreeEl = item.querySelector('.t-normal span[aria-hidden="true"]') || item.querySelector('.t-14.t-normal');
                const school = schoolEl?.textContent?.trim();
                const degree = degreeEl?.textContent?.trim();
                if (school) {
                    data.education.push({ school: school || '', degree: degree || '' });
                }
            });
        }
    }

    return data;
}

// X/Twitter scraper function
function scrapeXProfile() {
    const data = {
        platform: 'x',
        profileUrl: window.location.href.split('?')[0],
        username: null,
        name: null,
        bio: null,
        location: null,
        website: null,
        profileImageUrl: null,
        pinnedTweet: null,
        joinDate: null,
        followersCount: null,
        followingCount: null,
    };

    // Username from URL
    const pathMatch = window.location.pathname.match(/^\/([a-zA-Z0-9_]+)/);
    if (pathMatch) data.username = pathMatch[1];

    // Display name
    const nameSelectors = [
        '[data-testid="UserName"] span span',
        '[data-testid="UserName"] > div > div > span > span',
    ];
    for (const selector of nameSelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent.trim() && !el.textContent.startsWith('@')) {
            data.name = el.textContent.trim();
            break;
        }
    }

    // Bio
    const bioEl = document.querySelector('[data-testid="UserDescription"]');
    if (bioEl) data.bio = bioEl.textContent.trim();

    // Location & Website from header items
    const headerItems = document.querySelector('[data-testid="UserProfileHeader_Items"]');
    if (headerItems) {
        // Website link
        const linkEl = headerItems.querySelector('a[href^="https://t.co"]');
        if (linkEl) data.website = linkEl.textContent.trim();
        
        // Join date
        const text = headerItems.textContent;
        const joinMatch = text.match(/Joined\s+(\w+\s+\d{4})/);
        if (joinMatch) data.joinDate = joinMatch[1];

        // Location (text that's not a link, not joined date)
        const spans = headerItems.querySelectorAll('span');
        for (const span of spans) {
            const t = span.textContent.trim();
            if (t && !t.includes('@') && !t.includes('http') && !t.includes('Joined') && 
                !t.includes('Born') && t.length < 50 && t.length > 2) {
                data.location = t;
                break;
            }
        }
    }

    // Profile image - find the specific user's avatar via their photo link
    if (data.username) {
        const photoLink = document.querySelector(`a[href="/${data.username}/photo"]`);
        if (photoLink) {
            const img = photoLink.querySelector('img');
            if (img?.src && img.src.includes('pbs.twimg.com/profile_images')) {
                data.profileImageUrl = img.src
                    .replace(/_normal\./, '_400x400.')
                    .replace(/_bigger\./, '_400x400.')
                    .replace(/_mini\./, '_400x400.');
            }
        }
    }
    // Fallback: look for large avatar
    if (!data.profileImageUrl) {
        const containers = document.querySelectorAll('[data-testid^="UserAvatar-Container"]');
        for (const c of containers) {
            const img = c.querySelector('img');
            if (img?.src && img.src.includes('pbs.twimg.com/profile_images')) {
                const rect = img.getBoundingClientRect();
                if (rect.width >= 100) {
                    data.profileImageUrl = img.src
                        .replace(/_normal\./, '_400x400.')
                        .replace(/_bigger\./, '_400x400.')
                        .replace(/_mini\./, '_400x400.');
                    break;
                }
            }
        }
    }

    // Pinned tweet
    const pinnedTweet = document.querySelector('[data-testid="tweet"] [data-testid="tweetText"]');
    if (pinnedTweet) {
        data.pinnedTweet = pinnedTweet.textContent.trim().substring(0, 500);
    }

    // Follower counts
    const followLinks = document.querySelectorAll('a[href*="/following"], a[href*="/followers"]');
    followLinks.forEach(link => {
        const text = link.textContent.trim();
        const match = text.match(/^([\d,.KMB]+)/);
        if (match) {
            if (link.href.includes('/following')) data.followingCount = match[1];
            else if (link.href.includes('/followers')) data.followersCount = match[1];
        }
    });

    return data;
}
