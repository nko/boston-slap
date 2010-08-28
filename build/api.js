var sys;
sys = require('sys');
module.exports = function() {
  var args;
  args = arguments;
  return function(request, response, next) {
    return response.sendBody(sys.inspect(args));
  };
};