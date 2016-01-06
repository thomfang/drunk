/// <reference path="../promise/promise" />
/// <reference path="../util/util" />
/// <reference path="../events/eventemitter" />

/**
 * 调度器模块
 */
namespace drunk.Scheduler {
    
    /**
     * 调度方法
     * @param  work      调度的执行函数
     * @param  priority  优先级
     * @param  context   上下文
     */
    export function schedule(work: IWork, priority?: Priority, context?: any): IJob {
        let job = new Job(work, clampPriority(priority), context);

        addJobToQueue(job);

        return job;
    }
    
    /**
     * 当指定优化级的任何都执行完成后触发的回调
     * @param  priority  优先级
     * @param  callback  回调
     */
    export function requestDrain(priority: Priority, callback: () => any) {
        util.addArrayItem(drainPriorityQueue, priority);
        drainPriorityQueue.sort();
        drainEventEmitter.$once(String(priority), callback);
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
                addJobToQueue(this);
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
                    addJobToQueue(this);
                }
                else {
                    result.then((newWork: IWork) => {
                        if (this._cancelled) {
                            return;
                        }
                        this._work = newWork;
                        addJobToQueue(this);
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
            let jobList = getJobListAtPriority(this.priority);
            util.removeArrayItem(jobList, this);
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

    var isRunning = false;
    var immediateYield = false;

    var drainEventEmitter = new EventEmitter();

    const TIME_SLICE = 30;
    const PRIORITY_TAIL = Priority.min - 1;

    var drainPriorityQueue: Priority[] = [];
    var jobStore: { [key: number]: Job[] } = {};

    for (let i = Priority.min; i <= Priority.max; i++) {
        jobStore[i] = [];
    }

    function getJobListAtPriority(priority: Priority) {
        return jobStore[priority];
    }

    function getHighestPriority() {
        for (let priority = Priority.max; priority >= Priority.min; priority--) {
            if (jobStore[priority].length) {
                return priority;
            }
        }
        return PRIORITY_TAIL;
    }

    function getHighestPriorityJobList() {
        return jobStore[getHighestPriority()];
    }

    function addJobToQueue(job: Job) {
        let jobList = getJobListAtPriority(job.priority);
        jobList.push(job);

        if (job.priority > getHighestPriority()) {
            immediateYield = true;
        }

        startRunning();
    }

    function clampPriority(priority: Priority) {
        priority = priority || Priority.normal;
        return Math.min(Priority.max, Math.max(Priority.min, priority));
    }

    function run() {
        if (isRunning) {
            return;
        }

        if (drainPriorityQueue.length && getHighestPriority() === PRIORITY_TAIL) {
            return drainPriorityQueue.forEach(priority => drainEventEmitter.$emit(String(priority)));
        }

        isRunning = true;
        immediateYield = false;

        let endTime = Date.now() + TIME_SLICE;

        function shouldYield(): boolean {
            if (immediateYield) {
                return true;
            }
            if (drainPriorityQueue.length) {
                return false;
            }
            return Date.now() > endTime;
        }

        while (getHighestPriority() >= Priority.min && !shouldYield()) {
            let jobList = getHighestPriorityJobList();
            let currJob = jobList.shift();

            do {
                currJob._execute(shouldYield);
                currJob = jobList.shift();
            } while (currJob && !immediateYield);

            notifyDrainPriority();
        }

        immediateYield = false;
        isRunning = false;

        if (getHighestPriority() > PRIORITY_TAIL) {
            startRunning();
        }
    }

    function notifyDrainPriority() {
        let count = 0;
        let highestPriority = getHighestPriority();

        drainPriorityQueue.some((priority) => {
            if (priority > highestPriority) {
                count += 1;
                drainEventEmitter.$emit(String(priority));
                return true;
            }

            return false;
        });

        if (count > 0) {
            drainPriorityQueue.splice(0, count);
        }
    }

    function startRunning() {
        if (!isRunning) {
            util.execAsyncWork(run);
        }
    }
}