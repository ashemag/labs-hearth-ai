# Hearth Rolodex - LinkedIn Importer Chrome Extension

Import LinkedIn profiles directly into your Hearth Rolodex with one click.

## Features

- **One-Click Import**: Add any LinkedIn profile to your rolodex with a single click
- **Smart Enrichment**: If the contact already exists, their profile is automatically updated
- **Photo Sync**: Profile photos are downloaded and stored in your Supabase storage
- **Automatic Data Extraction**: Pulls name, headline, location, and profile photo

## Installation

### For Development

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked"
4. Select the `chrome-extension` folder from this repository

### For Production

1. Build the extension (zip the chrome-extension folder)
2. Upload to Chrome Web Store (requires developer account)

## Setup

1. Install the extension
2. Click the extension icon in Chrome toolbar
3. Enter your Hearth instance URL (e.g., `http://localhost:3000` for development)
4. Make sure you're logged into Hearth in the same browser
5. Click "Save Settings"

## Usage

1. Navigate to any LinkedIn profile page (`linkedin.com/in/...`)
2. You'll see a "Save to Rolodex" button in the bottom-right corner
3. Click the button to import/update the contact
4. The extension will:
   - Check if the contact already exists (by LinkedIn URL or name)
   - Create a new contact OR update the existing one
   - Download and save their profile photo to your storage
   - Save their headline and location

## How It Works

### Content Script (`content.js`)
- Runs on LinkedIn profile pages
- Extracts profile data from the page DOM
- Adds the floating import button

### Background Script (`background.js`)
- Handles communication with your Hearth API
- Manages authentication state

### Popup (`popup.html`, `popup.js`)
- Configure your Hearth instance URL
- Check connection status
- Quick access to open Rolodex

## API Endpoint

The extension communicates with `/api/rolodex/linkedin-import` which:

1. Receives profile data from the extension
2. Checks for existing contacts by LinkedIn URL or name
3. Creates or updates the contact
4. Downloads profile image and uploads to Supabase storage
5. Returns success/failure status

## Icons

The extension requires icon files at the following sizes:
- `icons/icon16.png` - 16x16 pixels
- `icons/icon32.png` - 32x32 pixels  
- `icons/icon48.png` - 48x48 pixels
- `icons/icon128.png` - 128x128 pixels

You can generate these from an SVG or create custom icons.

## Troubleshooting

### "Not logged in" error
- Make sure you're logged into Hearth in the same browser
- Try opening the Rolodex page first, then use the extension

### "Could not extract profile name"
- LinkedIn's page structure may have changed
- Try refreshing the LinkedIn profile page
- Report the issue so we can update the selectors

### Extension not appearing
- Make sure you're on a LinkedIn profile page (`/in/...`)
- Wait a moment for the page to fully load
- Check the browser console for errors

## Development

To modify the extension:

1. Edit the source files in `chrome-extension/`
2. Go to `chrome://extensions/`
3. Click the refresh button on the extension card
4. Reload the LinkedIn page to test changes

## Privacy

- The extension only activates on LinkedIn profile pages
- Data is sent directly to YOUR Hearth instance
- No data is sent to third parties
- Profile photos are stored in your own Supabase storage
