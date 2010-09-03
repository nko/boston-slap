var Album, Artist, ID3, Song, Task, addToQueue, cleanIndex, config, dirs, fs, fullScan, idFromString, isMedia, mtimes, next, path_m, queue, queueUpdated, redis, saveAlbum, saveArtist, scanDirectory, utils, watchDirectory, working;
ID3 = require('id3');
redis = require('./redis');
utils = require('./utils');
config = require('./config');
fs = require('fs');
path_m = require('path');
Song = require('./model/song');
Artist = require('./model/artist');
Album = require('./model/album');
Task = require('parallel').Task;
idFromString = function(string) {
  return string.trim().toLowerCase().replace(/[^a-z0-9]+/ig, '-');
};
saveArtist = function(song, tags, cb) {
  var artist, done, saved;
  artist = new Artist({
    name: song.get('artist_name')
  });
  artist.lower = idFromString(artist.get('name'));
  redis.getLink('artist', artist.lower, function(error, result) {
    if (error) {
      return cb(error);
    }
    if (result) {
      artist.id = result.toString();
      return done();
    } else {
      return artist.save(saved);
    }
  });
  saved = function(error) {
    if (error) {
      return cb(error);
    }
    song.set('artist_id', artist.id);
    return done();
  };
  return (done = function() {
    return saveAlbum(artist, song, tags, cb);
  });
};
saveAlbum = function(artist, song, tags, cb) {
  var album, album_lower, saved, song_lower;
  album = new Album({
    name: song.get('album_name'),
    year: tags.get('year') || ''
  });
  album_lower = idFromString(album.get('name'));
  song_lower = idFromString(song.get('title'));
  redis.getLink("artist:" + (artist.id), album_lower, function(error, link) {
    if (error) {
      return cb(error);
    }
    if (link) {
      album.id = link.toString();
    }
    return album.save(saved);
  });
  return (saved = function(error, model) {
    var link_task;
    if (error) {
      return cb(error);
    }
    song.set('album_id', album.id);
    link_task = new Task({
      song: [redis.addLink, "song", ("" + (song_lower) + ":" + (artist.lower) + ":" + (album_lower)), song.id],
      artist: [redis.addModelLink, artist, album],
      artist2: [redis.addLink, 'artist', artist.lower, artist.id],
      album: [redis.addModelLink, album, song],
      album2: [redis.addLink, ("artist:" + (artist.id)), album_lower, album.id]
    });
    error = null;
    return link_task.run(function(task, err) {
      if (err) {
        error = err;
      }
      if (!task) {
        if (error) {
          return cb(error);
        }
        return cb(null, song);
      }
    });
  });
};
working = false;
queue = [];
mtimes = [];
addToQueue = function(filename, stat) {
  if (queue.indexOf(filename) === -1) {
    queue.unshift(filename);
    mtimes.unshift(stat.mtime);
  }
  return queueUpdated();
};
queueUpdated = function() {
  var addMore, done, mtime, parseSong, path, path_e, populate, saveSong, song, tags;
  if (working) {
    return null;
  }
  if (queue.length === 0) {
    return null;
  }
  working = true;
  path = queue.pop();
  path_e = encodeURI(path);
  mtime = mtimes.pop().getTime();
  tags = (song = null);
  redis.getLink('path', path_e, function(error, data) {
    if (error) {
      return null;
    }
    return data ? redis.getModel(new Song(), data.toString(), populate) : populate(null, new Song());
  });
  populate = function(error, song_model) {
    var prev_mtime;
    if (error) {
      return next();
    }
    song = song_model;
    prev_mtime = +(song.get('mtime', 0));
    if (prev_mtime >= mtime) {
      return next();
    }
    return fs.readFile(path, parseSong);
  };
  parseSong = function(error, buffer) {
    var album_lower, artist_id, song_lower;
    if (error) {
      return redis.deleteLink('path', path_e, function() {
        return next();
      });
    }
    tags = new ID3(buffer);
    tags.parse();
    song.set('title', (tags.get('title')) || 'Unknown');
    song.set('artist_name', (tags.get('artist')) || 'Unknown');
    song.set('album_name', (tags.get('album')) || 'Unknown');
    song.set('mtime', mtime);
    song.set('genre', (tags.get('genre')) || 'Unknown');
    song.set('rating', song.get('rating', 0));
    song.set('path', path);
    song_lower = idFromString(song.get('title'));
    artist_id = idFromString(song.get('artist_name'));
    album_lower = idFromString(song.get('album_name'));
    return redis.getLink('song', "" + (song_lower) + ":" + (artist_id) + ":" + (album_lower), saveSong);
  };
  saveSong = function(error, song_id) {
    if (error) {
      return next();
    }
    if (song_id) {
      song.id = song_id.toString();
    }
    song.save(path, addMore);
    return next();
  };
  addMore = function(error, model) {
    if (error) {
      return null;
    }
    return saveArtist(song, tags, done);
  };
  return (done = function(error) {
    var actions, album_id, artist_id;
    if (error) {
      redis.deleteModel('song', song.id, function(error) {
        if (error) {
          return null;
        }
      });
      artist_id = song.get('artist_id');
      album_id = song.get('album_id');
      actions = [];
      if (artist_id) {
        actions.push("link:artist:" + (artist_id) + ":album");
        actions.push("link:artist:" + (artist_id));
        redis.deleteModel('artist', artist_id, function(error) {
          if (error) {
            return null;
          }
        });
      }
      if (album_id) {
        actions.push("link:album:" + (album_id) + ":song");
        redis.deleteModel('album', album_id, function(error) {
          if (error) {
            return null;
          }
        });
      }
      redis.deleteLink('path', path_e, function(error) {
        if (error) {
          return null;
        }
      });
      return redis["delete"](actions, function(error) {
        if (error) {
          return null;
        }
      });
    } else {
      console.log("[Index] Added: " + (song.get('title')) + " - " + (song.get('artist_name')) + " (" + (song.get('album_name')) + ")");
      return song.save(function() {});
    }
  });
};
next = function() {
  working = false;
  return queueUpdated();
};
dirs = [];
watchDirectory = function(dir) {
  if (dirs.indexOf(dir) !== -1) {
    return null;
  }
  dirs.push(dir);
  return fs.watchFile(dir, function(current, previous) {
    return scanDirectory(dir);
  });
};
scanDirectory = function(dir, cb) {
  return fs.readdir(dir, function(error, list) {
    var _a, _b, _c, task;
    if (error) {
      return console.error(error);
    }
    task = new Task();
    _b = list;
    for (_a = 0, _c = _b.length; _a < _c; _a++) {
      (function() {
        var filename = _b[_a];
        if (isMedia(filename)) {
          return task.add(filename, [fs.stat, path.join(dir, filename)]);
        } else if (stat.isDirectory()) {
          return (function(dir) {
            return scanDirectory(dir, function() {
              return watchDirectory(dir);
            });
          })(path.join(dir, filename));
        }
      })();
    }
    return task.run(function(filename, error, stat) {
      if (!task) {
        return cb();
      } else if (stat) {
        return addToQueue(path.join(dir, filename), stat);
      }
    });
  });
};
isMedia = function(filename) {
  return config.filetypes.indexOf(path_m.extname(filename)) !== -1;
};
fullScan = function(cb) {
  watchDirectory(config.music_dir);
  return utils.directoryWalker(config.music_dir, function(filename, dirname, path) {
    if (this.isDirectory()) {
      return watchDirectory(path);
    }
    return isMedia(filename) ? addToQueue(path, this) : null;
  });
};
redis.onLoad(fullScan);
setInterval(fullScan, config.service_interval * 60 * 1000);
cleanIndex = (exports.cleanIndex = function() {});
exports.reIndex = function() {
  return redis.getCollection('song', function(error, songs) {
    var _a, _b, _c, song;
    if (error) {
      return console.error(error);
    }
    _b = songs;
    for (_a = 0, _c = _b.length; _a < _c; _a++) {
      song = _b[_a];
      song = song.toString();
      redis.hSet("song:" + (song), 'mtime', 0);
    }
    return fullScan();
  });
};