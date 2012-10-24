// Generated by CoffeeScript 1.3.3
(function() {
  var Ease, EaseIn, EaseIn2, EaseInOut, EaseInOut2, EaseLinear, EaseOut, EaseOut2, EaseOutBounce, Implicit, Scheduler, Task, Transaction, TransactionBuilder, act, actGenerator, linearAnimator, mapAnimatorFromName, setAtEndAnimator, _, _default, _extendEventFunctions, _final, _getTime, _interp, _maxEndTime, _objectFromKeysAndValues, _requestAnimFrame, _setTimeout, _smoothTicks,
    __slice = [].slice;

  _ = require('underscore');

  actGenerator = function() {
    var act, k, v, _defaultInterpolationForValue;
    act = function(obj, dest, options) {
      var k, scheduler, task, _results;
      if (options == null) {
        options = {};
      }
      scheduler = act._scheduler;
      if (obj instanceof Implicit) {
        obj = obj._obj;
      }
      if (options.animator) {
        task = new Task(obj, dest, options);
        return scheduler.addTask(task);
      } else {
        _results = [];
        for (k in dest) {
          task = new Task(obj, _.pick(dest, k), options);
          _results.push(scheduler.addTask(task));
        }
        return _results;
      }
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
    act.property = function(obj, key, val, options) {
      var setter, store;
      if ((_.isUndefined(options)) && obj.actOptions) {
        options = _.isFunction(obj.actOptions) ? obj.actOptions()[key] : obj.actOptions[key];
      }
      store = {
        value: val
      };
      setter = function(v) {
        return act(store, {
          value: v
        }, options);
      };
      setter._actStore = store;
      return Object.defineProperty(obj, key, {
        get: function() {
          return store.value;
        },
        set: setter
      });
    };
    act._implicitPropertyStore = function(obj, key) {
      var d, _ref;
      d = Object.getOwnPropertyDescriptor(obj, key);
      return d != null ? (_ref = d.set) != null ? _ref._actStore : void 0 : void 0;
    };
    act.properties = function(obj, properties, options) {
      var _results;
      _results = [];
      for (k in properties) {
        v = properties[k];
        _results.push(act.property(obj, k, v, options != null ? options[k] : void 0));
      }
      return _results;
    };
    act.implicit = function(obj, options) {
      if (options == null) {
        options = {};
      }
      options = _.clone(options);
      if (obj.actOptions) {
        _.defaults(options, (_.isFunction(obj.actOptions) ? obj.actOptions() : obj.actOptions));
      }
      for (k in obj) {
        v = obj[k];
        if (options[k] === null) {
          options[k] = {
            animator: null
          };
        } else if (options[k] === void 0) {
          options[k] = {
            animator: _defaultInterpolationForValue(v)
          };
        } else if (_.isString(options[k] || _.isFunction(options[k]))) {
          options[k] = {
            animator: options[k]
          };
        } else {
          throw new Error("act: animator is not string or function");
        }
      }
      return new Implicit(act, obj, options);
    };
    _defaultInterpolationForValue = function(v) {
      if (_.isNumber(v)) {
        return linearAnimator;
      } else {
        return setAtEndAnimator;
      }
    };
    act._rootScheduler = new Scheduler();
    act.play();
    return act;
  };

  linearAnimator = function(obj, destinations) {
    var finals, initials, k, ops, v;
    initials = {};
    finals = {};
    for (k in destinations) {
      v = destinations[k];
      if (_.isObject(v)) {
        ops = _.keys(v);
        if (ops.length !== 1) {
          throw new Error("act: expected only one operator (" + ops + ")");
        }
        destinations[k] = {
          op: ops[0],
          value: v[ops[0]]
        };
      } else {
        destinations[k] = {
          op: '=',
          value: v
        };
      }
      initials[k] = obj[k];
      finals[k] = _final(initials[k], destinations[k]['op'], destinations[k]['value']);
    }
    return function(t) {
      var changed;
      changed = {};
      for (k in finals) {
        v = finals[k];
        changed[k] = _interp(initials[k], finals[k], t);
      }
      return changed;
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

  setAtEndAnimator = function(obj, destinations) {
    var finals, initials;
    initials = _.pick.apply(_, [obj].concat(__slice.call(_.keys(destinations))));
    finals = _.clone(destinations);
    return function(t) {
      return _.clone((t < 1 ? initials : finals));
    };
  };

  mapAnimatorFromName = {
    'setAtEnd': setAtEndAnimator,
    'linear': linearAnimator
  };

  Task = (function() {

    function Task(obj, destination, options) {
      this.obj = obj;
      this.destination = destination;
      if (options == null) {
        options = {};
      }
      if ((options.duration != null) && options.duration <= 0) {
        throw new Error('act: duration must be positive');
      }
      this.duration = options.duration || 1;
      this.started = options.started || function() {};
      this.completed = options.completed || function() {};
      this._easing = options.easing || EaseLinear;
      this._animator = _.isString(options.animator) ? mapAnimatorFromName[options.animator] : options.animator || linearAnimator;
      this.startTime = 0;
      this._elapsed = 0;
    }

    Task.prototype.update = function(time) {
      var eased, elapsed, extender, k, store, v;
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
      extender = this._interpolator(eased);
      for (k in extender) {
        v = extender[k];
        if (store = act._implicitPropertyStore(this.obj, k)) {
          store.value = v;
        } else {
          this.obj[k] = v;
        }
      }
      if (elapsed >= this.duration) {
        this._complete();
      }
      return this._elapsed = elapsed;
    };

    Task.prototype._start = function() {
      var finalValue, initialValue, _base;
      this._interpolator = this._animator(this.obj, this.destination);
      finalValue = this._interpolator(1);
      initialValue = this._interpolator(0);
      if (typeof (_base = this.obj).actBefore === "function") {
        _base.actBefore(initialValue, finalValue);
      }
      return typeof this.started === "function" ? this.started() : void 0;
    };

    Task.prototype._complete = function() {
      var finalValue, initialValue, _base;
      initialValue = this._interpolator(0);
      finalValue = this._interpolator(1);
      if (typeof (_base = this.obj).actAfter === "function") {
        _base.actAfter(initialValue, finalValue);
      }
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

    function Transaction(fields) {
      this._serial = fields.serial;
      this._rate = fields.rate;
      if (!(this._rate > 0)) {
        throw new Error('act: rate must be positive');
      }
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

  _default = function(a, b) {
    if (a == null) {
      a = b;
    }
    return a;
  };

  TransactionBuilder = (function() {

    function TransactionBuilder(fields) {
      if (fields == null) {
        fields = {};
      }
      this.rate = _default(fields.rate, 1);
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

  Implicit = (function() {

    function Implicit(_act, _obj, options) {
      var k, opts, v, _defineAnimatedProperty, _definePassthroughProperty, _fn, _fn1, _proxyFunction, _ref,
        _this = this;
      this._act = _act;
      this._obj = _obj;
      _defineAnimatedProperty = function(k, actOptions) {
        return Object.defineProperty(_this, k, {
          get: function() {
            return _this._obj[k];
          },
          set: function(v) {
            return _this._act(_this._obj, _objectFromKeysAndValues(k, v), actOptions);
          }
        });
      };
      _definePassthroughProperty = function(k) {
        return Object.defineProperty(_this, k, {
          get: function() {
            return _this._obj[k];
          },
          set: function(v) {
            return _this._obj[k] = v;
          }
        });
      };
      _proxyFunction = function(k) {
        return _this[k] = function() {
          return this._obj[k].apply(this, arguments);
        };
      };
      _fn = function(k, opts) {
        if (opts === null || opts.animator === null) {
          return _definePassthroughProperty(k);
        } else {
          return _defineAnimatedProperty(k, opts);
        }
      };
      for (k in options) {
        opts = options[k];
        _fn(k, opts);
      }
      _ref = this._obj;
      _fn1 = function(k, v) {
        if (_.isFunction(v)) {
          return _proxyFunction(k);
        } else if (!(_this[k] != null)) {
          return _definePassthroughProperty(k);
        }
      };
      for (k in _ref) {
        v = _ref[k];
        _fn1(k, v);
      }
    }

    return Implicit;

  })();

  _objectFromKeysAndValues = function() {
    var i, k, obj, v;
    obj = Object.create(null);
    i = 0;
    while (i + 1 < arguments.length) {
      k = arguments[i];
      v = arguments[i + 1];
      obj[k] = v;
      i += 2;
    }
    return obj;
  };

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
      throw (new Error 'tick must be positive') unless tick > 0
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
    var _eventHandlers;
    if ((obj.on != null) || (obj.off != null) || (obj.trigger != null)) {
      throw new Error('act: object already has event functions');
    }
    _eventHandlers = {};
    obj.on = function(eventName, cb, context) {
      var eventHandler, eventNames, name, _i, _len;
      if (!_.isString(eventName)) {
        throw new Error("act.on: eventName is not a string (" + eventName + ")");
      }
      if (!_.isFunction(cb)) {
        throw new Error("act.on: eventHandler is not a function (eventName: " + eventName + ", eventHandler: " + cb + ")");
      }
      eventNames = eventName.split(' ');
      eventHandler = {
        cb: cb,
        context: context
      };
      for (_i = 0, _len = eventNames.length; _i < _len; _i++) {
        name = eventNames[_i];
        if (name.length) {
          if (!_eventHandlers[name]) {
            _eventHandlers[name] = [];
          }
          _eventHandlers[name].push(eventHandler);
        }
      }
      return function() {
        return obj.off(eventName, cb, context);
      };
    };
    obj.off = function(eventName, cb, context) {
      var eventHandlersToChange, eventNames, handlers, name, _i, _len;
      if (eventName) {
        eventHandlersToChange = {};
        eventNames = eventName.split(' ');
        for (_i = 0, _len = eventNames.length; _i < _len; _i++) {
          name = eventNames[_i];
          if (name.length && _eventHandlers[name]) {
            eventHandlersToChange[name] = _eventHandlers[name];
          }
        }
      } else {
        eventHandlersToChange = _eventHandlers;
      }
      for (name in eventHandlersToChange) {
        handlers = eventHandlersToChange[name];
        _eventHandlers[name] = _.reject(handlers, function(handler) {
          if (cb) {
            if (handler.cb !== cb) {
              return false;
            }
          }
          if (context) {
            if (handler.context !== context) {
              return false;
            }
          }
          return true;
        });
      }
      return null;
    };
    return obj.trigger = function(eventName) {
      var args, eventNames, handler, name, _i, _j, _len, _len1, _ref;
      eventNames = eventName.split(' ');
      for (_i = 0, _len = eventNames.length; _i < _len; _i++) {
        name = eventNames[_i];
        if (name.length && _eventHandlers[name]) {
          _ref = _eventHandlers[name];
          for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
            handler = _ref[_j];
            args = Array.prototype.slice.call(arguments, 1);
            handler.cb.apply(handler.context || obj, args);
          }
        }
      }
      return null;
    };
  };

  act = actGenerator();

  act.version = '0.0.4';

  module.exports = act;

}).call(this);
