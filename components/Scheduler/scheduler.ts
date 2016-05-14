/// <reference path="../../build/drunk.d.ts" />

/**
 * 调度器模块
 */
namespace drunk.Scheduler {

    import util = drunk.util;
    import Promise = drunk.Promise;

    /**
     * 调度器优先级
     */
    export enum Priority {
        max = 15,
        high = 13,
        aboveNormal = 9,
        normal = 0,
        belowNormal = -9,
        idle = -13,
        min = -15
    };

    const TIME_SLICE = 30;
    const PRIORITY_TAIL = Priority.min - 1;

    var isRunning = false;
    var immediateYield = false;
    var highWaterMark = PRIORITY_TAIL;

    var jobStore: { [key: number]: Job[] } = {};
    var drainPriorityQueue: Priority[] = [];
    var drainListeners: { [priority: number]: Array<() => any> } = {};

    /**
     * 调度方法
     * @param  work      调度的执行函数
     * @param  priority  优先级
     * @param  context   上下文
     */
    export function schedule(work: IWork, priority: Priority = Priority.normal, context?: any): IJob {
        let job = new Job(work, clampPriority(priority), context);
        addJobAtTailOfPriority(job);
        return job;
    }

    /**
     * 当指定优化级的任何都执行完成后触发的回调
     * @param  priority  优先级
     * @param  callback  回调
     */
    export function requestDrain(priority: Priority, callback: () => any) {
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

    /**
     * 当指定优化级的任何都执行完成后触发的回调
     * @param  priority  优先级
     * @param  callback  回调
     */
    export function requestDrainPromise(priority: Priority) {
        return new Promise(resolve => requestDrain(priority, resolve));
    }

    export interface IJob {
        priority: Priority;
        completed: boolean;
        cancel(): void;
        pause(): void;
        resume(): void;
    }

    export interface IJobInfo {
        shouldYield: boolean;
        setWork(work: (jobInfo: IJobInfo) => any): void;
        setPromise(promise: Promise<IWork>): void;
    }

    export interface IWork {
        (jobInfo: IJobInfo): any;
    }

    /**
     * 调度器生成的工作对象类
     */
    class Job implements IJob {

        /**
         * 是否已经暂停
         */
        private _isPaused: boolean;

        /**
         * 是否已经取消
         */
        private _cancelled: boolean;

        /**
         * 是否已经完成
         */
        completed: boolean;

        /**
         * @param  _work    调度的回调
         * @param  priority 工作的优先级
         * @param  _context 回调的this参数
         */
        constructor(private _work: IWork, private _priority: Priority, private _context: any) {

        }

        /**
         * 优先级
         */
        get priority() {
            return this._priority;
        }
        set priority(value: Priority) {
            this._priority = clampPriority(value);
        }

        /**
         * 取消该否工作，会释放引用
         */
        cancel() {
            if (this.completed || this._cancelled) {
                return;
            }
            this._remove();
            this._release();
        }

        /**
         * 暂停该工作，不会释放引用
         */
        pause() {
            if (this.completed || this._cancelled) {
                return;
            }
            this._remove();
            this._isPaused = true;
        }

        /**
         * 恢复工作
         */
        resume() {
            if (!this.completed && !this._cancelled && this._isPaused) {
                addJobAtTailOfPriority(this);
                this._isPaused = false;
            }
        }

        /**
         * 内部方法，执行回调
         */
        _execute(shouldYield) {
            let jobInfo = new JobInfo(shouldYield);

            this._work.call(this._context, jobInfo);

            let result: any = jobInfo._result;
            jobInfo._release();

            if (result) {
                if (typeof result === 'function') {
                    this._work = result;
                    addJobAtHeadOfPriority(this);
                }
                else {
                    result.then((newWork: IWork) => {
                        if (this._cancelled) {
                            return;
                        }
                        this._work = newWork;
                        addJobAtTailOfPriority(this);
                    });
                }
            }
            else {
                this._release();
                this.completed = true;
            }
        }

        /**
         * 从调度任务队列中移除
         */
        private _remove() {
            util.removeArrayItem(jobStore[this.priority], this);
            updateHighWaterMark();
        }

        /**
         * 释放引用
         */
        private _release() {
            this._work = null;
            this._context = null;
            this._priority = null;
        }
    }

    class JobInfo implements IJobInfo {

        /**
         * 公共API是否还能访问
         */
        private _publicApiDisabled: boolean;

        /**
         * 调度工作执行后的后续工作
         */
        _result: Function | Promise<IWork>;

        constructor(private _shouldYield: () => boolean) {

        }

        /**
         * 是否应该让出线程
         */
        get shouldYield() {
            this._throwIfDisabled();
            return this._shouldYield();
        }

        /**
         * 设置当前优先级的新一个调度工作，会立即添加到该优先级的任务队列尾部
         */
        setWork(work: IWork): void {
            this._throwIfDisabled();
            this._result = work;
        }

        /**
         * 当promise任务完成后设置当前优先级的新一个调度工作，会添加到该优先级的任务队列尾部
         */
        setPromise(promise: Promise<IWork>): void {
            this._throwIfDisabled();
            this._result = promise;
        }

        /**
         * 释放引用并设置API不再可用
         */
        _release() {
            this._publicApiDisabled = true;
            this._result = null;
            this._shouldYield = null;
        }

        /**
         * 如果API不再可用，用户尝试调用会抛出错误
         */
        private _throwIfDisabled() {
            if (this._publicApiDisabled) {
                throw new Error('The APIs of this JobInfo object are disabled');
            }
        }
    }

    for (let i = Priority.min; i <= Priority.max; i++) {
        jobStore[i] = [];
    }

    function addJobAtTailOfPriority(job: Job) {
        let jobList = jobStore[job.priority];
        jobList.push(job);

        if (job.priority > highWaterMark) {
            highWaterMark = job.priority;

            if (isRunning) {
                immediateYield = true;
            }
        }

        startRunning();
    }

    function addJobAtHeadOfPriority(job: Job) {
        let jobList = jobStore[job.priority];
        jobList.unshift(job);

        if (job.priority > highWaterMark) {
            highWaterMark = job.priority;

            if (isRunning) {
                immediateYield = true;
            }
        }

        startRunning();
    }

    function clampPriority(priority: Priority) {
        priority = priority | 0;
        return Math.min(Priority.max, Math.max(Priority.min, priority));
    }

    function run() {
        if (drainPriorityQueue.length && highWaterMark === PRIORITY_TAIL) {
            isRunning = false;
            return drainPriorityQueue.forEach(priority => notifyAtPriorityDrainListener(priority));
        }

        immediateYield = false;

        let endTime = Date.now() + TIME_SLICE;
        let yieldForPriorityBoundary: boolean;
        let ranJobSuccessfully: boolean;
        let currJob: Job;

        try {
            function shouldYield(): boolean {
                if (immediateYield) {
                    return true;
                }
                if (drainPriorityQueue.length) {
                    return false;
                }
                return Date.now() > endTime;
            }

            while (highWaterMark >= Priority.min && !shouldYield() && !yieldForPriorityBoundary) {
                let currPriority = highWaterMark;
                let jobList = jobStore[currPriority];

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
        let priority = Priority.max;
        while (priority > PRIORITY_TAIL && !jobStore[priority].length) {
            priority -= 1;
        }
        highWaterMark = priority;
    }

    function notifyAtPriorityDrainListener(priority: Priority) {
        if (!drainListeners[priority] || !drainListeners[priority].length) {
            return;
        }
        drainListeners[priority].forEach(listener => listener());
        drainListeners[priority].length = 0;
        util.removeArrayItem(drainPriorityQueue, priority);
    }

    function startRunning() {
        if (!isRunning) {
            isRunning = true;
            util.execAsyncWork(run);
        }
    }
}