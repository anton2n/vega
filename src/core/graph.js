define(function(require, exports, module) {
  var changeset = require('./changeset'),
      PriorityQueue = require('js-priority-queue');

  return function(model) {
    var doNotPropagate = {};

    function propagate(pulse, node) {
      var v, l, n, p,
        q = new PriorityQueue({ 
          comparator: function(a, b) { 
            // If the nodes are equal, propagate the non-touch pulse first,
            // so that we can ignore subsequent touch pulses. Also, if we're
            // hitting the renderer, render top down
            if(a.dest == b.dest) {
              if(a.dest._type == 'renderer' && b.dest._type == 'renderer') 
                return b.src._rank - a.src._rank; // children bounds nodes are lowest ranked.
              else return a.pulse.touch ? 1 : -1;
            }
            else return a.dest._rank - b.dest._rank; 
          } 
        });

      if(pulse.stamp) throw "Pulse already has a non-zero stamp"

      pulse.stamp = ++model._stamp;
      q.queue({ dest: node, pulse: pulse });

      while (q.length > 0) {
        v = q.dequeue(), n = v.dest, l = n._listeners, p = v.pulse;
        var touched = p.touch && n._stamp >= p.stamp/* && !(n._type == 'renderer')*/;
        if(touched) continue; // Don't needlessly touch ops.

        var run = !!p.add.length || !!p.rem.length || n._router;
        run = run || !touched;
        run = run || n.reevaluate(p);

        if(run) {
          pulse = n._fn(p);
          n._stamp = pulse.stamp;
        }

        // Even if we didn't run the node, we still want to propagate 
        // the pulse. 
        if (pulse != doNotPropagate || !run) {
          for (var i = 0; i < l.length; i++) {
            q.queue({ src: n, dest: l[i], pulse: pulse });
          }
        }
      }
    };

    // Connect nodes in the pipeline
    function traversePipeline(pipeline, fn) {
      var i, c, n;
      for(i = 0; i < pipeline.length; i++) {
        n = pipeline[i];
        if(n._touchable) c = n;

        fn(n, c, i);
      }
    }

    function connect(pipeline) {
      global.debug({}, ['connecting']);

      traversePipeline(pipeline, function(n, c, i) {
        if(n._deps.data.length > 0 || n._deps.signals.length > 0) {
          n._deps.data.forEach(function(d) { model.data(d).addListener(c); });
          n._deps.signals.forEach(function(s) { model.signal(s).addListener(c); });
        }

        if(i > 0) pipeline[i-1].addListener(pipeline[i]);
      });

      return pipeline;
    }

    function disconnect(pipeline) {
      global.debug({}, ['disconnecting']);

      traversePipeline(pipeline, function(n, c, i) {
        n._listeners.forEach(function(l) { n.removeListener(l); });
        n._deps.data.forEach(function(d) { model.data(d).removeListener(c); });
        n._deps.signals.forEach(function(s) { model.signal(s).removeListener(c); });    
      });

      return pipeline;
    }

    return {
      propagate: propagate,
      doNotPropagate: doNotPropagate,
      connect: connect,
      disconnect: disconnect
    };
  }
});