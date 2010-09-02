var Set;
Set = function(elements) {
  this.elements = elements || [];
  return this;
};
Set.prototype.add = function(element) {
  this.elements.push(element);
  return this;
};
Set.prototype.get = function(index) {
  return this.elements[index];
};
Set.prototype.remove = function(index) {
  var first, second;
  first = this.elements.slice(0, index);
  second = index === -1 ? [] : this.elements.slice(index + 1);
  first.push.apply(first, second);
  this.elements = first;
  return this;
};
Set.prototype.forEach = function(fn) {
  this.elements.forEach(fn);
  return this;
};
module.exports = Set;