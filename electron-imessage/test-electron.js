const { app } = require("electron"); console.log("app exists:", !!app); app.on("ready", () => { console.log("App ready!"); app.quit(); });
