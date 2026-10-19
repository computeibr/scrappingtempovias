module.exports = {
  apps: [{
    name: "tempovias",
    script: "./app.js",
    exec_mode: "fork",
    autorestart: true,
    watch: ["controller", "middlewares", "models", "utils", "app.js"],
    ignore_watch: ["node_modules", "frontend", "public/upload", "logs"],
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "development"
    }
  }]
}
