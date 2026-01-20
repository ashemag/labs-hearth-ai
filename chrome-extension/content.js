/**
 * Hearth Rolodex - LinkedIn Profile Scraper Content Script
 * 
 * This script runs on LinkedIn profile pages and extracts profile data.
 */

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_PROFILE_DATA') {
        const data = extractProfileData();
        sendResponse(data);
    }
    return true;
});

// Check if we're on a LinkedIn profile page
function isProfilePage() {
    return window.location.pathname.startsWith('/in/');
}

// Extract profile data from the page
function extractProfileData() {
    const data = {
        linkedinUrl: window.location.href.split('?')[0],
        name: null,
        headline: null,
        location: null,
        profileImageUrl: null,
        about: null,
        experience: [],
        education: [],
    };

    // Helper to safely get text content
    const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : null;
    };

    // Extract name - try multiple selectors
    const nameSelectors = [
        'h1.text-heading-xlarge',
        'h1[class*="text-heading"]',
        '.pv-text-details__left-panel h1',
        'section.pv-top-card h1',
        '.ph5 h1',
    ];
    
    for (const selector of nameSelectors) {
        const text = getText(selector);
        if (text && text.length > 0 && text.length < 100) {
            data.name = text;
            break;
        }
    }

    // Fallback: get any h1 on the page
    if (!data.name) {
        const h1 = document.querySelector('h1');
        if (h1 && h1.textContent.trim().length < 100) {
            data.name = h1.textContent.trim();
        }
    }

    // Extract headline - the text below the name
    const headlineSelectors = [
        '.text-body-medium.break-words',
        'div.text-body-medium',
        '.pv-text-details__left-panel .text-body-medium',
        '.ph5 .text-body-medium',
    ];
    
    for (const selector of headlineSelectors) {
        const text = getText(selector);
        if (text && text.length > 0 && text.length < 500) {
            data.headline = text;
            break;
        }
    }

    // Extract location - usually in a span with specific styling
    const locationSelectors = [
        '.text-body-small.inline.t-black--light.break-words',
        'span.text-body-small.t-black--light',
    ];
    
    for (const selector of locationSelectors) {
        const el = document.querySelector(selector);
        if (el) {
            const text = el.textContent.trim();
            if (text && !text.includes('connection') && !text.includes('follower') && text.length < 100) {
                data.location = text;
                break;
            }
        }
    }

    // Fallback location extraction
    if (!data.location) {
        const allSpans = document.querySelectorAll('.text-body-small');
        for (const span of allSpans) {
            const text = span.textContent.trim();
            if (text && 
                (text.includes(',') || text.includes('Area') || text.includes('Metro')) &&
                !text.includes('connection') && 
                !text.includes('follower') &&
                text.length < 100) {
                data.location = text;
                break;
            }
        }
    }

    // Extract profile image
    const imageSelectors = [
        'img.pv-top-card-profile-picture__image--show',
        'img.pv-top-card-profile-picture__image',
        '.pv-top-card-profile-picture__container img',
        'button[aria-label*="photo"] img',
        '.pv-top-card img[width="200"]',
        '.presence-entity__image',
    ];
    
    for (const selector of imageSelectors) {
        const img = document.querySelector(selector);
        if (img && img.src && img.src.startsWith('http') && !img.src.includes('ghost')) {
            data.profileImageUrl = img.src;
            break;
        }
    }

    // Try getting image from a button element
    if (!data.profileImageUrl) {
        const photoContainer = document.querySelector('.pv-top-card-profile-picture__container');
        if (photoContainer) {
            const img = photoContainer.querySelector('img');
            if (img && img.src) {
                data.profileImageUrl = img.src;
            }
        }
    }

    // Extract about section
    const aboutSection = document.querySelector('#about');
    if (aboutSection) {
        const aboutContainer = aboutSection.closest('section');
        if (aboutContainer) {
            const aboutText = aboutContainer.querySelector('.inline-show-more-text span[aria-hidden="true"]') ||
                             aboutContainer.querySelector('.inline-show-more-text');
            if (aboutText) {
                data.about = aboutText.textContent.trim();
            }
        }
    }

    // Extract experience
    const experienceSection = document.querySelector('#experience');
    if (experienceSection) {
        const expContainer = experienceSection.closest('section');
        if (expContainer) {
            const expItems = expContainer.querySelectorAll('li.artdeco-list__item');
            expItems.forEach((item, index) => {
                if (index >= 5) return; // Limit to 5 most recent
                
                const titleEl = item.querySelector('.t-bold span[aria-hidden="true"]') ||
                               item.querySelector('.t-bold');
                const companyEl = item.querySelector('.t-normal span[aria-hidden="true"]') ||
                                 item.querySelector('.t-14.t-normal');
                const datesEl = item.querySelector('.t-black--light span[aria-hidden="true"]') ||
                               item.querySelector('.t-black--light');
                
                const title = titleEl?.textContent?.trim();
                const company = companyEl?.textContent?.trim();
                const dates = datesEl?.textContent?.trim();
                
                if (title || company) {
                    data.experience.push({
                        title: title || '',
                        company: company || '',
                        dates: dates || '',
                    });
                }
            });
        }
    }

    // Extract education
    const educationSection = document.querySelector('#education');
    if (educationSection) {
        const eduContainer = educationSection.closest('section');
        if (eduContainer) {
            const eduItems = eduContainer.querySelectorAll('li.artdeco-list__item');
            eduItems.forEach((item, index) => {
                if (index >= 3) return; // Limit to 3
                
                const schoolEl = item.querySelector('.t-bold span[aria-hidden="true"]') ||
                                item.querySelector('.t-bold');
                const degreeEl = item.querySelector('.t-normal span[aria-hidden="true"]') ||
                                item.querySelector('.t-14.t-normal');
                
                const school = schoolEl?.textContent?.trim();
                const degree = degreeEl?.textContent?.trim();
                
                if (school) {
                    data.education.push({
                        school: school || '',
                        degree: degree || '',
                    });
                }
            });
        }
    }

    console.log('[Hearth] Extracted profile data:', data);
    return data;
}

// Log that the content script is loaded
console.log('[Hearth] Content script loaded on:', window.location.href);
