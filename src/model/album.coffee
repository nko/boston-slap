Base  = require './base'

class Album extends Base
  name: 'album'

  properties: [
    'name', 'year'
  ]

module.exports = Album
