import express from 'express';
import http from 'http';
import libpath from 'path';
import liburl from 'url';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import createProxyServer from './lib/create-proxy-server';
import devtoolsServefiles from './lib/devtools-servefiles';
import historyApiFallback from './lib/history-api-fallback';
import stripCookieDomain from './lib/strip-cookie-domain';
import webpackConfig from './webpack-config.dev';
import bc from './build-config';

const proxy = createProxyServer(bc.bridgeServerUrl, stripCookieDomain);
const app = express();
const httpServer = http.createServer(app);

// webpack
{
    const compiler = webpack(webpackConfig);
    const devServer = webpackDevMiddleware(compiler, {
        noInfo: false,
        publicPath: webpackConfig.output.publicPath,
        stats: {colors: true},
    });
    app.use(devServer);
    app.use(webpackHotMiddleware(compiler));
}

// api
{
    app.use('/api/', proxy.web);
    httpServer.on('upgrade', proxy.ws);
}

// static
{
    const items = [
        [
            '/node_modules/',
            './node_modules/',
        ],
        [
            '/bower_components/',
            './bower_components/',
        ],
        [
            '/devtools/',
            './node_modules/chrome-devtools-frontend/front_end/',
        ],
    ];
    app.use('/devtools/', devtoolsServefiles(
        '54.0.2840.100+ed651c97177b2ac846b27f62bb8efed6dac0f90b'));
    const option = {fallthrough: false};
    for (const [url, path] of items) {
        app.use(url, express.static(path, option));
    }
}

// root
{
    const root = './src/webroot/';
    const index = 'index.dev.html';
    const option = {index, fallthrough: true};
    const fallback = libpath.resolve(root, index);
    app.use(express.static(root, option));
    app.use(historyApiFallback(fallback));
}

// startup
const address = liburl.parse(bc.debugListen);
console.info(`服务器地址：http://${address.host}/\n`);
httpServer.listen(address.port, address.hostname, (error) => {
    if (error) {
        console.error(error);
    }
});
