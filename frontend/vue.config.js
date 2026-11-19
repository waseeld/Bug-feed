module.exports = {
  lintOnSave: false,
  chainWebpack: config => {
    config.plugin('html').tap(args => {
      args[0].title = 'Bug Feed | Cyber Threat Intelligence';
      return args;
    });
  },
  devServer: {
    port: Number(process.env.DEV_PORT) || 8080,
    historyApiFallback: true,
    proxy: {
      '^/api': {
        // Override with API_TARGET=http://localhost:<port> to point the dev UI at another backend.
        target: process.env.API_TARGET || 'http://localhost:9600',
        changeOrigin: true
      }
    }
  }
};