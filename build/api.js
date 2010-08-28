var sys;
sys = require('sys');
module.exports = function() {
  return function(request, response, next) {
    return response.sendBody(sys.inspect(arguments));
  };
};