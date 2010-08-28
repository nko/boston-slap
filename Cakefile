fs           = require 'fs'
path         = require 'path'
exec         = require('child_process').exec
coffeescript = require 'coffee-script'

APP_NAME    = 'nodudio'
COFFEE_ARGS = ['--no-wrap', '-c']
BUILD_DIR   = 'build'
SOURCE_DIR  = 'src'

directoryWalker = (dir, callback, maxLevels, currentLevel, fromRoot) ->
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

run = (cmd, args) ->
  proc = exec cmd + ' ' + args.join(' ')
  proc.stderr.on 'data', (err) -> if err then console.log err.toString()

task 'build', 'Build the ' + APP_NAME + ' from source', ->
  dirs = {}
  directoryWalker SOURCE_DIR, (file, shortPath, fullPath) ->
    if @isDirectory()
      run 'mkdir', ['-p', BUILD_DIR + '/' + shortPath + file]
    else if /\.coffee$/.test file
      args = Array::slice.call COFFEE_ARGS
      args.push.apply args, ['-o', BUILD_DIR + '/' + shortPath, fullPath]
      run 'coffee', args
    else if /\.(js|node|addon)$/.test file
      run 'cp', [fullPath, BUILD_DIR + '/' + shortPath + file]

task 'deploy', 'Commit changes and deploy to Joyent', ->
  deploy = exec 'cake build && git push && git push joyent master'
  deploy.stdout.on 'data', (chunk) ->
    console.log chunk.toString()
