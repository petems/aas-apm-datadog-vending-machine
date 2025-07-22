module.exports = {
  "version": 2,
  "discovery": {
    "allowedHostnames": [
      "localhost"
    ],
    "disallowedHostnames": [],
    "networkIdleTimeout": 100,
    "concurrency": 1
  },
  "snapshot": {
    "widths": [
      1280,
      1920
    ],
    "minHeight": 1024,
    "percyCSS": "\n      /* Hide any dynamic content that might cause flakiness */\n      .debug-info { display: none !important; }\n      .loading-spinner { display: none !important; }\n    "
  },
  "static": {
    "baseUrl": "/",
    "include": [
      "public/**/*"
    ]
  }
};