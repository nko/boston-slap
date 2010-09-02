var directoryWalker, fs, path;
fs = require('fs');
path = require('path');
directoryWalker = (exports.directoryWalker = function(dir, callback, maxLevels, currentLevel, fromRoot) {
  maxLevels = 'number' === typeof maxLevels ? maxLevels : 0;
  currentLevel = 'number' === typeof currentLevel ? currentLevel : 1;
  fromRoot = 'string' === typeof fromRoot ? fromRoot : '';
  return fs.readdir(dir, function(error, files) {
    return error ? console.log(error.message) : files.forEach(function(file) {
      return fs.stat(path.join(dir, file), function(error, stats) {
        if (error) {
          return console.log(error.message);
        }
        if (stats.isDirectory()) {
          if (0 === maxLevels || maxLevels > currentLevel) {
            directoryWalker(path.join(dir, file), callback, maxLevels, 1 + currentLevel, fromRoot + file + '/');
          }
        }
        return callback.call(stats, file, fromRoot, path.join(dir, file), stats);
      });
    });
  });
});