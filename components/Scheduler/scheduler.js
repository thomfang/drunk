var drunk;
(function (drunk) {
    var Scheduler;
    (function (Scheduler) {
        var util = drunk.util;
        var Promise = drunk.Promise;
        (function (Priority) {
            Priority[Priority["max"] = 15] = "max";
            Priority[Priority["high"] = 13] = "high";
            Priority[Priority["aboveNormal"] = 9] = "aboveNormal";
            Priority[Priority["normal"] = 0] = "normal";
            Priority[Priority["belowNormal"] = -9] = "belowNormal";
            Priority[Priority["idle"] = -13] = "idle";
            Priority[Priority["min"] = -15] = "min";
        })(Scheduler.Priority || (Scheduler.Priority = {}));
        var Priority = Scheduler.Priority;
        ;
        var TIME_SLICE = 30;
        var PRIORITY_TAIL = Priority.min - 1;
        var isRunning = false;
        var immediateYield = false;
        var highWaterMark = PRIORITY_TAIL;
        var jobStore = {};
        var drainPriorityQueue = [];
        var drainListeners = {};
        function schedule(work, priority, context) {
            if (priority === void 0) { priority = Priority.normal; }
            var job = new Job(work, clampPriority(priority), context);
            addJobAtTailOfPriority(job);
            return job;
        }
        Scheduler.schedule = schedule;
        function requestDrain(priority, callback) {
            if (highWaterMark === PRIORITY_TAIL) {
                return callback();
            }
            if (!drainListeners[priority]) {
                drainListeners[priority] = [];
            }
            util.addArrayItem(drainPriorityQueue, priority);
            util.addArrayItem(drainListeners[priority], callback);
            drainPriorityQueue.sort();
        }
        Scheduler.requestDrain = requestDrain;
        function requestDrainPromise(priority) {
            return new Promise(function (resolve) { return requestDrain(priority, resolve); });
        }
        Scheduler.requestDrainPromise = requestDrainPromise;
        var Job = (function () {
            function Job(_work, _priority, _context) {
                this._work = _work;
                this._priority = _priority;
                this._context = _context;
            }
            Object.defineProperty(Job.prototype, "priority", {
                get: function () {
                    return this._priority;
                },
                set: function (value) {
                    this._priority = clampPriority(value);
                },
                enumerable: true,
                configurable: true
            });
            Job.prototype.cancel = function () {
                if (this.completed || this._cancelled) {
                    return;
                }
                this._remove();
                this._release();
            };
            Job.prototype.pause = function () {
                if (this.completed || this._cancelled) {
                    return;
                }
                this._remove();
                this._isPaused = true;
            };
            Job.prototype.resume = function () {
                if (!this.completed && !this._cancelled && this._isPaused) {
                    addJobAtTailOfPriority(this);
                    this._isPaused = false;
                }
            };
            Job.prototype._execute = function (shouldYield) {
                var _this = this;
                var jobInfo = new JobInfo(shouldYield);
                this._work.call(this._context, jobInfo);
                var result = jobInfo._result;
                jobInfo._release();
                if (result) {
                    if (typeof result === 'function') {
                        this._work = result;
                        addJobAtHeadOfPriority(this);
                    }
                    else {
                        result.then(function (newWork) {
                            if (_this._cancelled) {
                                return;
                            }
                            _this._work = newWork;
                            addJobAtTailOfPriority(_this);
                        });
                    }
                }
                else {
                    this._release();
                    this.completed = true;
                }
            };
            Job.prototype._remove = function () {
                util.removeArrayItem(jobStore[this.priority], this);
                updateHighWaterMark();
            };
            Job.prototype._release = function () {
                this._work = null;
                this._context = null;
                this._priority = null;
            };
            return Job;
        }());
        var JobInfo = (function () {
            function JobInfo(_shouldYield) {
                this._shouldYield = _shouldYield;
            }
            Object.defineProperty(JobInfo.prototype, "shouldYield", {
                get: function () {
                    this._throwIfDisabled();
                    return this._shouldYield();
                },
                enumerable: true,
                configurable: true
            });
            JobInfo.prototype.setWork = function (work) {
                this._throwIfDisabled();
                this._result = work;
            };
            JobInfo.prototype.setPromise = function (promise) {
                this._throwIfDisabled();
                this._result = promise;
            };
            JobInfo.prototype._release = function () {
                this._publicApiDisabled = true;
                this._result = null;
                this._shouldYield = null;
            };
            JobInfo.prototype._throwIfDisabled = function () {
                if (this._publicApiDisabled) {
                    throw new Error('The APIs of this JobInfo object are disabled');
                }
            };
            return JobInfo;
        }());
        for (var i = Priority.min; i <= Priority.max; i++) {
            jobStore[i] = [];
        }
        function addJobAtTailOfPriority(job) {
            var jobList = jobStore[job.priority];
            jobList.push(job);
            if (job.priority > highWaterMark) {
                highWaterMark = job.priority;
                if (isRunning) {
                    immediateYield = true;
                }
            }
            startRunning();
        }
        function addJobAtHeadOfPriority(job) {
            var jobList = jobStore[job.priority];
            jobList.unshift(job);
            if (job.priority > highWaterMark) {
                highWaterMark = job.priority;
                if (isRunning) {
                    immediateYield = true;
                }
            }
            startRunning();
        }
        function clampPriority(priority) {
            priority = priority | 0;
            return Math.min(Priority.max, Math.max(Priority.min, priority));
        }
        function run() {
            if (drainPriorityQueue.length && highWaterMark === PRIORITY_TAIL) {
                isRunning = false;
                return drainPriorityQueue.forEach(function (priority) { return notifyAtPriorityDrainListener(priority); });
            }
            immediateYield = false;
            var endTime = Date.now() + TIME_SLICE;
            var yieldForPriorityBoundary;
            var ranJobSuccessfully;
            var currJob;
            try {
                function shouldYield() {
                    if (immediateYield) {
                        return true;
                    }
                    if (drainPriorityQueue.length) {
                        return false;
                    }
                    return Date.now() > endTime;
                }
                while (highWaterMark >= Priority.min && !shouldYield() && !yieldForPriorityBoundary) {
                    var currPriority = highWaterMark;
                    var jobList = jobStore[currPriority];
                    do {
                        currJob = jobList.shift();
                        ranJobSuccessfully = false;
                        currJob._execute(shouldYield);
                        ranJobSuccessfully = true;
                    } while (jobList.length && !shouldYield());
                    if (ranJobSuccessfully && !jobList.length) {
                        notifyAtPriorityDrainListener(currPriority);
                        yieldForPriorityBoundary = true;
                    }
                }
            }
            finally {
                if (!ranJobSuccessfully && currJob) {
                    currJob.cancel();
                }
                updateHighWaterMark();
            }
            immediateYield = false;
            isRunning = false;
            if (highWaterMark >= Priority.min) {
                startRunning();
            }
        }
        function updateHighWaterMark() {
            var priority = Priority.max;
            while (priority > PRIORITY_TAIL && !jobStore[priority].length) {
                priority -= 1;
            }
            highWaterMark = priority;
        }
        function notifyAtPriorityDrainListener(priority) {
            if (!drainListeners[priority] || !drainListeners[priority].length) {
                return;
            }
            drainListeners[priority].forEach(function (listener) { return listener(); });
            drainListeners[priority].length = 0;
            util.removeArrayItem(drainPriorityQueue, priority);
        }
        function startRunning() {
            if (!isRunning) {
                isRunning = true;
                util.execAsyncWork(run);
            }
        }
    })(Scheduler = drunk.Scheduler || (drunk.Scheduler = {}));
})(drunk || (drunk = {}));
//# sourceMappingURL=scheduler.js.map