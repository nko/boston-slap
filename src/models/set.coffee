
class Set
  constructor: (elements) ->
    @elements = elements || []

  add: (element) ->
    @elements.push element
    this

  get: (index) ->
    @elements[index]

  remove: (index) ->
    first     = @elements.slice 0, index
    second    = if index is -1 then [] else @elements.slice index + 1
    first.push.apply first, second
    @elements = first
    this

  forEach: (fn) ->
    @elements.forEach fn
    this

module.exports = Set
