var router = new (require('biggie-router'))();
require('./build/service');

router.addModule('nodudio', './build/api');

router.get('/').module('gzip').bind(function (request, response) {
  response.sendBody('Index page.');
});

router.get(/^\/.*\.(js|css|html).*$/).module('gzip');

router.all(/^\/api\/?(.*)$/).module('nodudio');

router.module('static', __dirname + '/public').bind(function (request, response) {
  response.sendBody(404, 'Asset not found: ' + request.url);
});

router.listen(80);
