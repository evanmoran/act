
# act
# ====================================================================
# Transaction based animation for dom and canvas
#
# ### Usage
#
# #### act
#


# act.function
# ---------------------------------------------------------------------

actGenerator = ->

  # act.function
  # ---------------------------------------------------------------------
  act = (obj, key, op, value) ->
    destination = {}
    if _.isString(key)
      if value?
        destination[key] = op: op, value: value
      else
        destination[key] = op: '=', value: op
    else
      for k, v of key
        if _.isObject v
          ops = _.keys v
          throw "act: expected only one operator (#{ops})" unless ops.length == 1
          destination[k] = op: ops[0], value: v[ops[0]]
        else
          destination[k] = op: '=', value: v

    scheduler = act._scheduler
    task = new Task obj, destination
    scheduler.addTask task

  # act.clone
  # ---------------------------------------------------------------------
  # Create a seperate act function with seperate scheduler, rate, etc
  # This does not clone tasks.

  act.clone = actGenerator

  # act.rate
  # ---------------------------------------------------------------------
  # Rate allows speeding up and slowing down time.
  #
  #     rate = 2        Twice as fast
  #     rate = 0.5      Half as fast
  #

  act.rate = 1

  # act.tickInterval
  # ---------------------------------------------------------------------
  # Interval in seconds between update ticks (default: 1/60, 60 Hz)
  act.tickInterval = 1/60

  # act._transactionBuilders
  # ---------------------------------------------------------------------

  act._transactionBuilders = []

  # act.play
  # ---------------------------------------------------------------------

  act.play = ->
    if not @_playState
      # Store reference to state to indentity specific start has been stopped
      @_playState = state = lastTick: _getTime()
      ticker = ->
        if @_playState == state
          timeCurrent = _getTime()
          timeElapsed = timeCurrent - state.lastTick
          act._tick timeElapsed * act.rate
          state.lastTick = timeCurrent
          # Continue tick
          setTimeout ticker, act.tickInterval * 1000
      # Start tick
      setTimeout ticker, act.tickInterval * 1000

  # act._tick
  # ---------------------------------------------------------------------
  # Tick all your tasks

  act._tick = (dt) ->
    act._rootScheduler.tick dt

  # act.fastForward
  # ---------------------------------------------------------------------
  # Fast forward in time

  act.fastForward = act._tick

  # act.stop
  # ---------------------------------------------------------------------

  act.stop = ->
    @_playState = null

  # act.begin
  # ---------------------------------------------------------------------
  # Start defining a new transaction
  act.begin = (options) ->
    builder = new TransactionBuilder options
    act._transactionBuilders.push builder
    builder

  # act._scheduler
  # ---------------------------------------------------------------------
  Object.defineProperty act, '_scheduler',
    get: ->
      len = act._transactionBuilders.length
      if len then act._transactionBuilders[len-1] else act._rootScheduler
    enumerable: false

  # act.commit
  # ---------------------------------------------------------------------
  # Stop defining a transaction and add it to its parent transaction
  act.commit = () ->
    builderTop = act._transactionBuilders.pop()
    scheduler = @_scheduler
    scheduler.addTask builderTop.transaction()

  # _rootScheduler
  # ---------------------------------------------------------------------
  # act root scheduler
  act._rootScheduler = new Scheduler()

  return act


# act.Task
# ---------------------------------------------------------------------
class Task
  constructor: (@obj, @destination, options = {}) ->
    @duration = options.duration || 1
    @started = options.started || ->
    @completed = options.completed || ->

  # Smooth ticks for better simulation
  tick: (dt) ->
    # Start if we need to
    if not @_state
      @_state = totalElapsed: 0
      @_start()
    # Check that we've not already completed
    if @_state.totalElapsed >= @duration
      return# Truncate total elapsed time to our duration
    lastElapsed = @_state.totalElapsed
    shouldComplete = (lastElapsed + dt >= @duration)
    @_state.totalElapsed += dt
    if shouldComplete
      @_state.totalElapsed = @duration

    for k, v of @final
      @obj[k] = _interp @initial[k], v, (@_state.totalElapsed / @duration)

    # Complete if we have reached our duration
    if shouldComplete
      @_complete()

  _start: ->
    @initial = {}
    @final = {}
    for key of @destination
      @initial[key] = @obj[key]
      # Do conversion from relative to absolute here
      @final[key] = _final @obj[key], @destination[key]['op'], @destination[key]['value']
    @started?()

  _complete: ->
    @completed?()

_interp = (a, b, t) -> a * (1.0 - t) + b * t

_final = (initial, op, value) ->
  if op == '==' or op == '='
    return value
  else if op == '/=' or op =='/'
    return initial / value
  else if op == '*=' or op =='*'
    return initial * value
  else if op == '-=' or op =='-'
    return initial - value
  else if op == '+=' or op =='+'
    return initial + value

_sumDurations = (tasks) -> _.reduce tasks, ((acc,task) -> acc += task.duration), 0

# Transaction
# ---------------------------------------------------------------------
class Transaction
  constructor: (fields) ->
    @_rate = fields.rate
    @_tasks = fields.tasks
    @duration = (_sumDurations @_tasks) / @_rate

  tick: (dt) ->
    # Start if we need to
    if not @_state
      @_state = totalElapsed: 0
      @_start()
    # Check that we've not already completed
    if @_state.totalElapsed >= @duration
      return# Truncate total elapsed time to our duration
    lastElapsed = @_state.totalElapsed
    shouldComplete = (lastElapsed + dt >= @duration)
    if shouldComplete
      dt = @duration - lastElapsed
    @_state.totalElapsed += dt
    # Tick _tasks
    for task in @_tasks
      task.tick (dt * @_rate)
    # Complete if we have reached our duration
    if shouldComplete
      @_complete()

  # Start calcuates duration and sets up everything
  _start: ->
    @started?()
  _complete: ->
    @completed?()

# TransactionBuilder
# ---------------------------------------------------------------------

class TransactionBuilder
  constructor: (fields = {}) ->
    @rate     = fields.rate || 1
    @started  = fields.started || ->
    @complete = fields.complete || ->
    @_tasks = []
  addTask: (task) ->
    @_tasks.push task
  transaction: ->
    new Transaction
      rate: @rate
      started: @started
      complete: @complete
      tasks: @_tasks


# Scheduler
# ---------------------------------------------------------------------
# Transactions are added to the scheduler
class Scheduler
  constructor: (options = {}) ->
    @_tasks = []
    @rate = options.rate || 1

  tick: (dt) ->
    for task in @_tasks
      task.tick (dt * @rate)

  # Add
  addTask: (task) ->
    @_tasks.push task

  @rate = 1.0

# _setTimeout
# ---------------------------------------------------------------------
# Abstract setTimeout to

_setTimeout = (timeSeconds, fn) ->
    setTimeout fn, timeSeconds * 1000

_getTime = ->
  (new Date).getTime()


# _getTime
# ---------------------------------------------------------------------
# Get current time

_getTime = ->
  (new Date).getTime()


# _smoothTicks
# ---------------------------------------------------------------------
# Smooths ticks
_smoothTicks = (simulate, tick, fn) ->
  return fn
  ###
  # TODO: Think about this later
  return fn unless simulate
  throw 'tick must be positive' unless tick > 0
  timeElapsed = 0
  (dt) ->
    timeElapsed += dt
    while timeElapsed > tick
      fn tick
      timeElapsed -= tick
  ###

# Array Remove - By John Resig (MIT Licensed)
# ---------------------------------------------------------------------
Array.prototype.remove = (from, to) ->
  rest = this.slice((to or from) + 1 or this.length)
  @length = if from < 0 then this.length + from else from
  @push.apply this, rest



# act
# ---------------------------------------------------------------------
act = actGenerator()


# Version
# ---------------------------------------------------------------------
act.version = '0.0.1'

# Export
# ---------------------------------------------------------------------
module.exports = act
