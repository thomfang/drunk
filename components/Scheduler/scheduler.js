/// <reference path="../../build/drunk.d.ts" />
/**
 * 调度器模块
 */
var drunk;
(function (drunk) {
    var Scheduler;
    (function (Scheduler) {
        var util = drunk.util;
        var Promise = drunk.Promise;
        /**
         * 调度器优先级
         */
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
        /**
         * 调度方法
         * @param  work      调度的执行函数
         * @param  priority  优先级
         * @param  context   上下文
         */
        function schedule(work, priority, context) {
            if (priority === void 0) { priority = Priority.normal; }
            var job = new Job(work, clampPriority(priority), context);
            addJobAtTailOfPriority(job);
            return job;
        }
        Scheduler.schedule = schedule;
        /**
         * 当指定优化级的任何都执行完成后触发的回调
         * @param  priority  优先级
         * @param  callback  回调
         */
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
        /**
         * 当指定优化级的任何都执行完成后触发的回调
         * @param  priority  优先级
         * @param  callback  回调
         */
        function requestDrainPromise(priority) {
            return new Promise(function (resolve) { return requestDrain(priority, resolve); });
        }
        Scheduler.requestDrainPromise = requestDrainPromise;
        /**
         * 调度器生成的工作对象类
         */
        var Job = (function () {
            /**
             * @param  _work    调度的回调
             * @param  priority 工作的优先级
             * @param  _context 回调的this参数
             */
            function Job(_work, _priority, _context) {
                this._work = _work;
                this._priority = _priority;
                this._context = _context;
            }
            Object.defineProperty(Job.prototype, "priority", {
                /**
                 * 优先级
                 */
                get: function () {
                    return this._priority;
                },
                set: function (value) {
                    this._priority = clampPriority(value);
                },
                enumerable: true,
                configurable: true
            });
            /**
             * 取消该否工作，会释放引用
             */
            Job.prototype.cancel = function () {
                if (this.completed || this._cancelled) {
                    return;
                }
                this._remove();
                this._release();
            };
            /**
             * 暂停该工作，不会释放引用
             */
            Job.prototype.pause = function () {
                if (this.completed || this._cancelled) {
                    return;
                }
                this._remove();
                this._isPaused = true;
            };
            /**
             * 恢复工作
             */
            Job.prototype.resume = function () {
                if (!this.completed && !this._cancelled && this._isPaused) {
                    addJobAtTailOfPriority(this);
                    this._isPaused = false;
                }
            };
            /**
             * 内部方法，执行回调
             */
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
            /**
             * 从调度任务队列中移除
             */
            Job.prototype._remove = function () {
                util.removeArrayItem(jobStore[this.priority], this);
                updateHighWaterMark();
            };
            /**
             * 释放引用
             */
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
                /**
                 * 是否应该让出线程
                 */
                get: function () {
                    this._throwIfDisabled();
                    return this._shouldYield();
                },
                enumerable: true,
                configurable: true
            });
            /**
             * 设置当前优先级的新一个调度工作，会立即添加到该优先级的任务队列尾部
             */
            JobInfo.prototype.setWork = function (work) {
                this._throwIfDisabled();
                this._result = work;
            };
            /**
             * 当promise任务完成后设置当前优先级的新一个调度工作，会添加到该优先级的任务队列尾部
             */
            JobInfo.prototype.setPromise = function (promise) {
                this._throwIfDisabled();
                this._result = promise;
            };
            /**
             * 释放引用并设置API不再可用
             */
            JobInfo.prototype._release = function () {
                this._publicApiDisabled = true;
                this._result = null;
                this._shouldYield = null;
            };
            /**
             * 如果API不再可用，用户尝试调用会抛出错误
             */
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