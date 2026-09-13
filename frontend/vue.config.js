module.exports = {
  lintOnSave: false,
  chainWebpack: config => {
    config.plugin('html').tap(args => {
      args[0].title = 'Bug Feed | Cyber Threat Intelligence';
      return args;
    });
  },
  devServer: {
    port: 8080,
    proxy: {
      '^/api': {
        target: 'http://localhost:9600',
        changeOrigin: true
      }
    }
  }
};