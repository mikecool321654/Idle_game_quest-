const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  webServer: {
    command: 'python3 -m http.server 3000',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
});
