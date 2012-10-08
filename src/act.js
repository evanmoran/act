// Generated by CoffeeScript 1.3.1
(function() {
  var Ease, EaseIn, EaseIn2, EaseInOut, EaseInOut2, EaseLinear, EaseOut, EaseOut2, EaseOutBounce, NumericInterpolator, Scheduler, Task, Transaction, TransactionBuilder, act, actGenerator, _, _extendEventFunctions, _final, _getTime, _interp, _maxEndTime, _requestAnimFrame, _setTimeout, _smoothTicks,
    __slice = [].slice;

  _ = require('underscore');

  actGenerator = function() {
    var act, k, v;
    act = function(obj, dest, options) {
      var destination, k, ops, scheduler, task, v;
      if (options == null) {
        options = {};
      }
      destination = {};
      for (k in dest) {
        v = dest[k];
        if (_.isObject(v)) {
          ops = _.keys(v);
          if (ops.length !== 1) {
            throw "act: expected only one operator (" + ops + ")";
          }
          destination[k] = {
            op: ops[0],
            value: v[ops[0]]
          };
        } else {
          destination[k] = {
            op: '=',
            value: v
          };
        }
      }
      scheduler = act._scheduler;
      task = new Task(obj, destination, options);
      return scheduler.addTask(task);
    };
    for (k in Ease) {
      v = Ease[k];
      act[k] = v;
    }
    _extendEventFunctions(act);
    act.clone = actGenerator;
    act.rate = 1;
    act.tickInterval = 1 / 60;
    act._transactionBuilders = [];
    act.play = function() {
      var state, ticker;
      if (!act._playState) {
        act._playState = state = {
          lastTick: _getTime()
        };
        ticker = function() {
          var timeCurrent, timeElapsed;
          if (act._playState === state) {
            _setTimeout(act.tickInterval, ticker);
            timeCurrent = _getTime();
            timeElapsed = timeCurrent - state.lastTick;
            act._tick(timeElapsed * act.rate);
            state.lastTick = timeCurrent;
            return act.trigger('render');
          }
        };
        return _setTimeout(act.tickInterval, ticker);
      }
    };
    act._tick = function(dt) {
      return act._rootScheduler.tick(dt);
    };
    act.fastForward = act._tick;
    act.stop = function() {
      return act._playState = null;
    };
    act.begin = function(options) {
      var builder;
      builder = new TransactionBuilder(options);
      act._transactionBuilders.push(builder);
      return builder;
    };
    Object.defineProperty(act, '_scheduler', {
      get: function() {
        var len;
        len = act._transactionBuilders.length;
        if (len) {
          return act._transactionBuilders[len - 1];
        } else {
          return act._rootScheduler;
        }
      },
      enumerable: false
    });
    act.commit = function() {
      var builderTop, scheduler;
      builderTop = act._transactionBuilders.pop();
      scheduler = this._scheduler;
      return scheduler.addTask(builderTop.transaction());
    };
    act._rootScheduler = new Scheduler();
    act.play();
    return act;
  };

  NumericInterpolator = function(obj, destination) {
    var final, initial, key;
    initial = {};
    final = {};
    for (key in destination) {
      initial[key] = obj[key];
      final[key] = _final(obj[key], destination[key]['op'], destination[key]['value']);
    }
    return function(t) {
      var k, v, _results;
      _results = [];
      for (k in final) {
        v = final[k];
        _results.push(obj[k] = _interp(initial[k], v, t));
      }
      return _results;
    };
  };

  _interp = function(a, b, t) {
    return a * (1.0 - t) + b * t;
  };

  _final = function(initial, op, value) {
    if (op === '==' || op === '=') {
      return value;
    } else if (op === '/=') {
      return initial / value;
    } else if (op === '*=') {
      return initial * value;
    } else if (op === '-=') {
      return initial - value;
    } else if (op === '+=') {
      return initial + value;
    }
  };

  Task = (function() {

    Task.name = 'Task';

    function Task(obj, destination, options) {
      this.obj = obj;
      this.destination = destination;
      if (options == null) {
        options = {};
      }
      this.duration = options.duration || 1;
      this.started = options.started || function() {};
      this.completed = options.completed || function() {};
      this._easing = options.easing || EaseLinear;
      this._interpolation = options.interpolation || NumericInterpolator;
      this.startTime = 0;
      this._elapsed = 0;
    }

    Task.prototype.update = function(time) {
      var eased, elapsed;
      elapsed = time - this.startTime;
      if ((this._elapsed <= 0) && (elapsed <= 0)) {
        return;
      }
      if ((this._elapsed <= 0) && (elapsed > 0)) {
        this._start();
      } else if ((this._elapsed >= this.duration) && (elapsed >= this.duration)) {
        return;
      }
      if (elapsed < 0) {
        elapsed = 0;
      }
      if (elapsed > this.duration) {
        elapsed = this.duration;
      }
      eased = this._easing(elapsed / this.duration);
      this._interpolator(eased);
      if (elapsed >= this.duration) {
        this._complete();
      }
      return this._elapsed = elapsed;
    };

    Task.prototype._start = function() {
      this._interpolator = this._interpolation(this.obj, this.destination);
      return typeof this.started === "function" ? this.started() : void 0;
    };

    Task.prototype._complete = function() {
      return typeof this.completed === "function" ? this.completed() : void 0;
    };

    return Task;

  })();

  _maxEndTime = function(tasks) {
    return _.reduce(tasks, (function(acc, task) {
      return Math.max(acc, task.startTime + task.duration);
    }), 0);
  };

  Ease = {};

  Ease.EaseLinear = EaseLinear = function(v) {
    return v;
  };

  Ease.EaseIn = EaseIn = function(v) {
    return v * v * v;
  };

  Ease.EaseOut = EaseOut = function(v) {
    return 1.0 - EaseIn(1.0 - v);
  };

  Ease.EaseIn2 = EaseIn2 = function(v) {
    return v * v;
  };

  Ease.EaseOut2 = EaseOut2 = function(v) {
    return 1.0 - EaseIn(1.0 - v);
  };

  Ease.EaseInOut = EaseInOut = function(v) {
    if (v < 0.5) {
      return EaseIn(v * 2) / 2;
    } else {
      return EaseOut(v * 2 - 1.0) / 2 + 0.5;
    }
  };

  Ease.EaseInOut2 = EaseInOut2 = function(v) {
    return (3 * v * v) - 2 * v * v * v;
  };

  Ease.EaseOutBounce = EaseOutBounce = function(v) {
    if (v < 1 / 2.75) {
      return 7.5625 * v * v;
    } else if (v < 2 / 2.75) {
      v -= 1.5 / 2.75;
      return 7.5625 * v * v + 0.75;
    } else if (v < 2.5 / 2.75) {
      v -= 2.25 / 2.75;
      return 7.5625 * v * v + 0.9375;
    } else {
      v -= 2.625 / 2.75;
      return 7.5625 * v * v + 0.984375;
    }
  };

  Transaction = (function() {

    Transaction.name = 'Transaction';

    function Transaction(fields) {
      this._serial = fields.serial;
      this._rate = fields.rate;
      this._easing = fields.easing;
      this._tasks = fields.tasks;
      this._reverseTasks = (this._tasks.slice(0)).reverse();
      this._started = fields.started;
      this._completed = fields.completed;
      this._elapsed = 0;
      this.duration = (_maxEndTime(this._tasks)) / this._rate;
      this.startTime = 0;
    }

    Transaction.prototype.update = function(time) {
      var eased, elapsed, task, tasks, _i, _len, _ref;
      elapsed = time - this.startTime;
      if ((this._elapsed <= 0) && (elapsed <= 0)) {
        return;
      }
      if ((this._elapsed <= 0) && (elapsed > 0)) {
        this._start();
      } else if ((this._elapsed >= this.duration) && (elapsed >= this.duration)) {
        return;
      }
      if (elapsed < 0) {
        elapsed = 0;
      }
      if (elapsed > this.duration) {
        elapsed = this.duration;
      }
      tasks = elapsed >= this._elapsed ? this._tasks : this._reverseTasks;
      eased = (this._easing(elapsed / this.duration)) * this.duration * this._rate;
      _ref = this._tasks;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        task = _ref[_i];
        task.update(eased);
      }
      if (elapsed >= this.duration) {
        this._complete();
      }
      return this._elapsed = elapsed;
    };

    Transaction.prototype._start = function() {
      return typeof this._started === "function" ? this._started() : void 0;
    };

    Transaction.prototype._complete = function() {
      return typeof this._completed === "function" ? this._completed() : void 0;
    };

    return Transaction;

  })();

  TransactionBuilder = (function() {

    TransactionBuilder.name = 'TransactionBuilder';

    function TransactionBuilder(fields) {
      if (fields == null) {
        fields = {};
      }
      this.rate = fields.rate || 1;
      this.started = fields.started || function() {};
      this.completed = fields.completed || function() {};
      this.serial = fields.serial || false;
      this.easing = fields.easing || EaseLinear;
      this._tasks = [];
    }

    TransactionBuilder.prototype.addTask = function(task) {
      return this._tasks.push(task);
    };

    TransactionBuilder.prototype.transaction = function() {
      var t, task, _i, _len, _ref;
      if (this.serial) {
        t = 0;
        _ref = this._tasks;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          task = _ref[_i];
          task.startTime = t;
          t += task.duration;
        }
      }
      return new Transaction({
        rate: this.rate,
        started: this.started,
        completed: this.completed,
        serial: this.serial,
        easing: this.easing,
        tasks: this._tasks
      });
    };

    return TransactionBuilder;

  })();

  Scheduler = (function() {

    Scheduler.name = 'Scheduler';

    function Scheduler(options) {
      if (options == null) {
        options = {};
      }
      this._tasks = [];
      this.rate = options.rate || 1;
      this._elapsed = 0;
    }

    Scheduler.prototype.tick = function(dt) {
      var task, _i, _len, _ref, _results;
      this._elapsed += dt * this.rate;
      _ref = this._tasks;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        task = _ref[_i];
        _results.push(task.update(this._elapsed));
      }
      return _results;
    };

    Scheduler.prototype.addTask = function(task) {
      task.startTime = this._elapsed;
      return this._tasks.push(task);
    };

    Scheduler.rate = 1.0;

    return Scheduler;

  })();

  _requestAnimFrame = function() {
    if (typeof window !== "undefined" && window !== null) {
      return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame;
    }
  };

  _setTimeout = function(timeSeconds, fn) {
    var requestAnimFrame;
    if (requestAnimFrame = _requestAnimFrame()) {
      return requestAnimFrame(fn);
    } else {
      return setTimeout(fn, timeSeconds * 1000);
    }
  };

  _getTime = function() {
    return (new Date).getTime() * 0.001;
  };

  _smoothTicks = function(simulate, tick, fn) {
    return fn;
    /*
      # TODO: Think about this later
      return fn unless simulate
      throw 'tick must be positive' unless tick > 0
      timeElapsed = 0
      (dt) ->
        timeElapsed += dt
        while timeElapsed > tick
          fn tick
          timeElapsed -= tick
    */

  };

  Array.prototype.remove = function(from, to) {
    var rest;
    rest = this.slice((to || from) + 1 || this.length);
    this.length = from < 0 ? this.length + from : from;
    return this.push.apply(this, rest);
  };

  _extendEventFunctions = function(obj) {
    var eventCallbacks;
    if ((obj.on != null) || (obj.off != null) || (obj.trigger != null)) {
      throw 'object already has event functions';
    }
    eventCallbacks = {};
    obj.on = function(eventName, cb) {
      var cbs;
      if (!_.isFunction(cb)) {
        throw 'cb is not a function';
      }
      cbs = eventCallbacks[eventName] ? eventCallbacks[eventName] : [];
      eventCallbacks[eventName] = cbs;
      cbs.push(cb);
      return function() {
        return obj.off(eventName, cb);
      };
    };
    obj.off = function(eventName, cb) {
      var cbs, ix;
      if (!cb) {
        return delete eventCallbacks[eventName];
      } else if (cbs = eventCallbacks[eventName]) {
        if ((ix = cbs.indexOf(cb)) !== -1) {
          return cbs.remove(ix);
        }
      }
    };
    return obj.trigger = function(eventName) {
      var cb, cbs, _i, _len, _results;
      if (cbs = eventCallbacks[eventName]) {
        _results = [];
        for (_i = 0, _len = cbs.length; _i < _len; _i++) {
          cb = cbs[_i];
          _results.push(cb.apply(null, [obj].concat(__slice.call(_.toArray(arguments).slice(1)))));
        }
        return _results;
      }
    };
  };

  act = actGenerator();

  act.version = '0.0.2';

  module.exports = act;

}).call(this);
