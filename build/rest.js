var api, fs, handleResult, pathm, redis, respondWith404, sendFile, sys;
sys = require('sys');
redis = require('./redis');
api = require('./api');
fs = require('fs');
pathm = require('path');
module.exports = function() {
  return function(request, response, next, path) {
    var _a, action, id, resource;
    _a = path.split('/');
    resource = _a[0];
    id = _a[1];
    action = _a[2];
    return resource === 'song' && action === 'download' ? api.get('song', id, null, function(error, song) {
      if (error || !song.id) {
        return respondWith404(request, response);
      }
      return sendFile(request, response, song.get('path'));
    }) : api.get(resource, id, null, function(error, result) {
      if (error) {
        return respondWith404(request, response);
      }
      return handleResult(request, response, result);
    });
  };
};
handleResult = function(request, response, result) {
  var _a, _b, _c, _d, model;
  if (Buffer.isBuffer(result)) {
    result.toString();
  } else if (Array.isArray(result)) {
    result = (function() {
      _a = []; _c = result;
      for (_b = 0, _d = _c.length; _b < _d; _b++) {
        model = _c[_b];
        _a.push(model.data);
      }
      return _a;
    })();
  } else if (result.data) {
    result = result.data;
  }
  return response.sendJson(200, {
    result: result
  });
};
sendFile = function(request, response, path) {
  return fs.stat(path, function(error, stat) {
    var _a, file, mime;
    if (error) {
      return respondWith404(request, response);
    }
    mime = (function() {
      if ((_a = pathm.extname(path)) === '.m4a') {
        return 'audio/mp4a-latm';
      } else {
        return 'audio/mpeg';
      }
    })();
    response.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': stat.size,
      'Last-Modified': stat.mtime.toUTCString(),
      'Expires': new Date(Date.now() + 31536000000).toUTCString(),
      'Cache-Control': 'public max-age=' + 31536000
    });
    file = fs.createReadStream(path);
    sys.pump(file, response);
    return file.on('end', function() {
      return response.end();
    });
  });
};
respondWith404 = function(request, response) {
  return response.sendJson(404, {
    error: "Resource not found"
  });
};