// Generated by CoffeeScript 1.3.3
(function() {
  var Scheduler, Task, Transaction, TransactionBuilder, act, actGenerator, _final, _getTime, _interp, _maxEndTime, _setTimeout, _smoothTicks;

  actGenerator = function() {
    var act;
    act = function(obj, key, op, value) {
      var destination, k, ops, scheduler, task, v;
      destination = {};
      if (_.isString(key)) {
        if (value != null) {
          destination[key] = {
            op: op,
            value: value
          };
        } else {
          destination[key] = {
            op: '=',
            value: op
          };
        }
      } else {
        for (k in key) {
          v = key[k];
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
      }
      scheduler = act._scheduler;
      task = new Task(obj, destination);
      return scheduler.addTask(task);
    };
    act.clone = actGenerator;
    act.rate = 1;
    act.tickInterval = 1 / 60;
    act._transactionBuilders = [];
    act.play = function() {
      var state, ticker;
      if (!this._playState) {
        this._playState = state = {
          lastTick: _getTime()
        };
        ticker = function() {
          var timeCurrent, timeElapsed;
          if (this._playState === state) {
            timeCurrent = _getTime();
            timeElapsed = timeCurrent - state.lastTick;
            act._tick(timeElapsed * act.rate);
            state.lastTick = timeCurrent;
            return setTimeout(ticker, act.tickInterval * 1000);
          }
        };
        return setTimeout(ticker, act.tickInterval * 1000);
      }
    };
    act._tick = function(dt) {
      return act._rootScheduler.tick(dt);
    };
    act.fastForward = act._tick;
    act.stop = function() {
      return this._playState = null;
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
    return act;
  };

  Task = (function() {

    function Task(obj, destination, options) {
      this.obj = obj;
      this.destination = destination;
      if (options == null) {
        options = {};
      }
      this.duration = options.duration || 1;
      this.started = options.started || function() {};
      this.completed = options.completed || function() {};
      this.startTime = 0;
      this._elapsed = 0;
    }

    Task.prototype.update = function(time) {
      var elapsed, k, v, _ref;
      elapsed = time - this.startTime;
      if ((this._elapsed <= 0) && (elapsed <= 0)) {
        return;
      }
      if ((this._elapsed <= 0) && (elapsed > 0)) {
        this._start();
      } else if ((this._elapsed >= this.duration) && (elapsed >= this.duration)) {
        return;
      }
      if (elapsed < this.startTime) {
        elapsed = this.startTime;
      }
      if (elapsed > this.duration) {
        elapsed = this.duration;
      }
      _ref = this.final;
      for (k in _ref) {
        v = _ref[k];
        this.obj[k] = _interp(this.initial[k], v, elapsed / this.duration);
      }
      if (elapsed >= this.duration) {
        this._complete();
      }
      return this._elapsed = elapsed;
    };

    Task.prototype._start = function() {
      var key;
      this.initial = {};
      this.final = {};
      for (key in this.destination) {
        this.initial[key] = this.obj[key];
        this.final[key] = _final(this.obj[key], this.destination[key]['op'], this.destination[key]['value']);
      }
      return typeof this.started === "function" ? this.started() : void 0;
    };

    Task.prototype._complete = function() {
      return typeof this.completed === "function" ? this.completed() : void 0;
    };

    return Task;

  })();

  _interp = function(a, b, t) {
    return a * (1.0 - t) + b * t;
  };

  _final = function(initial, op, value) {
    if (op === '==' || op === '=') {
      return value;
    } else if (op === '/=' || op === '/') {
      return initial / value;
    } else if (op === '*=' || op === '*') {
      return initial * value;
    } else if (op === '-=' || op === '-') {
      return initial - value;
    } else if (op === '+=' || op === '+') {
      return initial + value;
    }
  };

  _maxEndTime = function(tasks) {
    return _.reduce(tasks, (function(acc, task) {
      return Math.max(acc, task.startTime + task.duration);
    }), 0);
  };

  Transaction = (function() {

    function Transaction(fields) {
      this._serial = fields.serial;
      this._rate = fields.rate;
      this._tasks = fields.tasks;
      this._reverseTasks = (this._tasks.slice(0)).reverse();
      this._elapsed = 0;
      this.duration = (_maxEndTime(this._tasks)) / this._rate;
      this.startTime = 0;
    }

    Transaction.prototype.update = function(time) {
      var elapsed, task, tasks, _i, _len, _ref;
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
      _ref = this._tasks;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        task = _ref[_i];
        task.update(elapsed * this._rate);
      }
      if (elapsed >= this.duration) {
        this._complete();
      }
      return this._elapsed = elapsed;
    };

    Transaction.prototype._start = function() {
      return typeof this.started === "function" ? this.started() : void 0;
    };

    Transaction.prototype._complete = function() {
      return typeof this.completed === "function" ? this.completed() : void 0;
    };

    return Transaction;

  })();

  TransactionBuilder = (function() {

    function TransactionBuilder(fields) {
      if (fields == null) {
        fields = {};
      }
      this.rate = fields.rate || 1;
      this.started = fields.started || function() {};
      this.complete = fields.complete || function() {};
      this.serial = fields.serial || false;
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
        complete: this.complete,
        serial: this.serial,
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

  _setTimeout = function(timeSeconds, fn) {
    return setTimeout(fn, timeSeconds * 1000);
  };

  _getTime = function() {
    return (new Date).getTime();
  };

  _getTime = function() {
    return (new Date).getTime();
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

  act = actGenerator();

  act.version = '0.0.1';

  module.exports = act;

}).call(this);
