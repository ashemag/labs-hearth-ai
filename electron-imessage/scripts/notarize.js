const { notarize } = require('@electron/notarize');
const path = require('path');

exports.default = async function notarizing(context) {
    const { electronPlatformName, appOutDir } = context;

    // Only notarize macOS builds
    if (electronPlatformName !== 'darwin') {
        console.log('Skipping notarization - not macOS');
        return;
    }

    // Skip notarization if credentials aren't set
    if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD || !process.env.APPLE_TEAM_ID) {
        console.log('Skipping notarization - missing Apple credentials');
        console.log('Set APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID to enable notarization');
        return;
    }

    const appName = context.packager.appInfo.productFilename;
    const appPath = path.join(appOutDir, `${appName}.app`);

    console.log(`Notarizing ${appPath}...`);

    try {
        await notarize({
            tool: 'notarytool',
            appPath,
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
            teamId: process.env.APPLE_TEAM_ID,
        });
        console.log('Notarization complete!');
    } catch (error) {
        console.error('Notarization failed:', error);
        throw error;
    }
};
