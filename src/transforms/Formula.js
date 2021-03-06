var Transform = require('./Transform'),
    tuple = require('../dataflow/tuple'), 
    expression = require('../parse/expr'),
    log = require('../util/log'),
    C = require('../util/constants');

function Formula(graph) {
  Transform.prototype.init.call(this, graph);
  Transform.addParameters(this, {
    field: {type: "value"},
    expr:  {type: "expr"}
  });

  return this;
}

var proto = (Formula.prototype = new Transform());

proto.transform = function(input) {
  log.debug(input, ["formulating"]);
  var t = this, 
      g = this._graph,
      field = this.param("field"),
      expr = this.param("expr"),
      signals = this.dependency(C.SIGNALS);
  
  function set(x) {
    var val = expression.eval(g, expr, {datum: x, signals: signals});
    tuple.set(x, field, val);
  }

  input.add.forEach(set);
  
  if (this.reevaluate(input)) {
    input.mod.forEach(set);
  }

  input.fields[field] = 1;
  return input;
};

module.exports = Formula;