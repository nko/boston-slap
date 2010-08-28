
# Iterate over files
exports.directoryWalker = (dir, callback, maxLevels, currentLevel, fromRoot) ->
  maxLevels    = if 'number' is typeof maxLevels then maxLevels else 0
  currentLevel = if 'number' is typeof currentLevel then currentLevel else 1
  fromRoot     = if 'string' is typeof fromRoot then fromRoot else ''

  fs.readdir dir, (error, files) ->
    if error then console.log error.message
    else 
      files.forEach (file) ->
        fs.stat path.join(dir, file), (error, stats) ->
          return console.log error.message if error

          if stats.isDirectory()
            if 0 is maxLevels or maxLevels > currentLevel
              directoryWalker path.join(dir, file), callback,
                              maxLevels, 1 + currentLevel,
                              fromRoot + file + '/'
          callback.call stats, file, fromRoot, path.join(dir, file), stats
