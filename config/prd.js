/* exported Options */
window.Options = {
    server: {
        "trusted" : true,
        "websocket_ip" : "live.stellar.org",
        "websocket_port" : 9001,
        "websocket_ssl" : true
    },

    mixpanel: {
        "token": '',
        // Don't track events by default
        "track": false
    },

    INFLATION_DEST: 'g4eRqgZfzfj3132y17iaf2fp6HQj1gofjt',

    APP_ID: '1411202179109031',
    DOMAIN_NAME: 'hcoinssite.cloudapp.net',
    DEFAULT_FEDERATION_DOMAIN: 'hccoin.azurewebsites.net',
    API_SERVER: 'http://hccoin.azurewebsites.net',
    API_STATUS_PATH: '/status.json',
    WALLET_SERVER: 'https://wallet.stellar.org',
    TRUST_SERVER: 'https://live.stellar.org:9002',

    PERSISTENT_SESSION: false,
    DEFAULT_IDLE_LOGOUT_TIMEOUT: 30 * 60 * 1000, //15 minutes
    COOKIE_SECURE: true,

    REPORT_ERRORS: true,
    SENTRY_DSN: "https://5c08986e949742d2bb29e1ffac78e50a@app.getsentry.com/26645",

    // Number of transactions each page has in balance tab notifications
    TRANSACTIONS_PER_PAGE: 25,

    LOGOUT_WITH_REFRESH: true,
    MAX_WALLET_ATTEMPTS: 3,

    MAX_CONTACT_AGE: 24 * 60 * 60 * 1000, // One day in milliseconds.

    ANGULARTICS_WRITE_KEY: "U8cLXTFMPm",

    DEFAULT_AJAX_TIMEOUT: 10000, // 10 seconds

    SIFT_SCIENCE_ACCOUNT: '825bae1b99'
};
