var router = new (require('biggie-router'))(),
    io     = require('socket.io'),
    config = require('./build/config');
require('./build/service');

router.addModule('nodudio', __dirname + '/build/rest');

router.get('/').module('gzip').bind(function (request, response, next) {
  request.url = 'index.html';
  next();
});

router.get(/^\/.*\.(js|css|html).*$/).module('gzip');

router.all(/^\/api\/?(.*)$/).module('nodudio');

router.module('static', __dirname + '/public').bind(function (request, response) {
  response.sendBody(404, 'Asset not found: ' + request.url);
});

router.listen(config.http_port);

var socket = exports.socket = io.listen(router);

process.setgid(1000);
process.setuid(1000);
