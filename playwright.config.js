import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 60000,
    use: {
        baseURL: 'http://localhost:4173',
        launchOptions: {
            // Allow Tone.js AudioContext to start without a user gesture
            args: ['--autoplay-policy=no-user-gesture-required']
        }
    },
    webServer: {
        command: 'python3 -m http.server 4173',
        url: 'http://localhost:4173',
        reuseExistingServer: true
    }
});
