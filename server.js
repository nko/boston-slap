var router = new (require('biggie-router'))();

router.get('/').module('gzip').bind(function (request, response) {
  response.sendBody('Index page.');
});

router.get(/^\/.*\.(js|css|html).*$/).module('gzip');

router.module('static', __dirname + '/public').bind(function (request, response) {
  response.sendBody(404, 'Asset not found: ' + request.uri);
});

router.listen(80);
