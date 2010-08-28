var respondWith404, sys;
sys = require('sys');
module.exports = function() {
  return function(request, response, next, path) {
    return response.sendJson({
      result: {
        path: path
      }
    });
  };
};
respondWith404 = function(request, response) {
  return response.sendBody(404, {
    error: "Resource not found"
  });
};