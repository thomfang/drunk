/// <reference path="../promise/promise" />
/// <reference path="../util/util" />
/// <reference path="../events/eventemitter" />

/**
 * @module drunk.Scheduler
 */
module drunk {
    
    /**
     * @class Scheduler
     */
    export class Scheduler {
    
        /**
         * 调度方法
         * @method schedule
         * @static
         * @param  {Scheduler.IWork}      work       调度的执行函数
         * @param  {Scheduler.Priority}  [priority]  优先级
         * @param  {any}                 [context]   上下文
         * @return {Scheduler.IJob}                  生成的工作对象
         */
        static schedule(work: Scheduler.IWork, priority?: Scheduler.Priority, context?: any): Scheduler.IJob {
            let job = new Job(work, clampPriority(priority), context);
            
            addJobToQueue(job);
            
            return job;
        }
        
        /**
         * @method requestDrain
         * @static
         * @param  {Scheduler.Priority}  priority  优先级
         * @param  {function}  callback  回调
         */
        static requestDrain(priority: Scheduler.Priority, callback: () => any) {
            util.addArrayItem(drainPriorityQueue, priority);
            drainPriorityQueue.sort();
            drainEventEmitter.once(String(priority), callback);
        }
    
    }
    
    export module Scheduler {
    
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
            setPromise(promise: Promise<Scheduler.IWork>): void;
        }
        
        export interface IWork {
            (jobInfo: IJobInfo): any;
        }
        
        /**
         * 调度器优先级
         * @property Scheduler.Priority
         * @type enum
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
    }
    
    class Job implements Scheduler.IJob {
        
        private _isPaused: boolean;
        
        completed: boolean;
        
        constructor(private _work: Scheduler.IWork, private _priority: Scheduler.Priority, private _context: any) {
            
        }
        
        get priority() {
            return this._priority;
        }
        set priority(value: Scheduler.Priority) {
            this._priority = clampPriority(value);
        }
        
        cancel() {
            if (this.completed) {
                return;
            }
            this._remove();
            this._release();
        }
        
        pause() {
            if (this.completed) {
                return;
            }
            this._remove();
            this._isPaused = true;
        }
        
        resume() {
            if (!this.completed && this._isPaused) {
                addJobToQueue(this);
                this._isPaused = false;
            }
        }
        
        _execute(shouldYield) {
            let jobInfo = new JobInfo(shouldYield);
            let work = this._work;
            let context = this._context;
            let priority = this._priority;
            
            this._release();
            
            work.call(context, jobInfo);
            
            let result: any = jobInfo._result;
            jobInfo._release();
            
            if (result) {
                if (typeof result === 'function') {
                    this._work = result;
                    this._priority = priority;
                    this._context = context;
                    addJobToQueue(this);
                }
                else {
                    (<Promise<any>>result).then((newWork: Scheduler.IWork) => {
                        this._work = newWork;
                        this._priority = priority;
                        this._context = context;
                        addJobToQueue(this);
                    });
                }
            }
            else {
                this.completed = true;
            }
        }
        
        private _remove() {
            let jobList = getJobListAtPriority(this.priority);
            util.removeArrayItem(jobList, this);
        }
        
        private _release() {
            this._work = null;
            this._context = null;
            this._priority = null;
        }
    }
    
    class JobInfo implements Scheduler.IJobInfo {
        
        private _publicApiDisabled: boolean;
        
        _result: Function | Promise<Scheduler.IWork>;
        
        constructor(private _shouldYield: () => boolean) {
            
        }
        
        get shouldYield() {
            this._throwIfDisabled();
            return this._shouldYield();
        }
        
        setWork(work: Scheduler.IWork): void {
            this._throwIfDisabled();
            this._result = work;
        }
        
        setPromise(promise: Promise<Scheduler.IWork>): void {
            this._throwIfDisabled();
            this._result = promise;
        }
        
        _release() {
            this._publicApiDisabled = true;
            this._result = null;
        }
        
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
    const PRIORITY_TAIL = Scheduler.Priority.min - 1;
    
    var drainPriorityQueue: Scheduler.Priority[] = [];
    var jobStore: {[key: number]: Job[]} = { };
    
    for (let i = Scheduler.Priority.min; i <= Scheduler.Priority.max; i++) {
        jobStore[i] = [];
    }
    
    function getJobListAtPriority(priority: Scheduler.Priority) {
        return jobStore[priority];
    }
    
    function getHighestPriority() {
        for (let priority = Scheduler.Priority.max; priority >= Scheduler.Priority.min; priority--) {
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
    
    function clampPriority(priority: Scheduler.Priority) {
        priority = priority || Scheduler.Priority.normal;
        return Math.min(Scheduler.Priority.max, Math.max(Scheduler.Priority.min, priority));
    }
    
    function run() {
        if (isRunning) {
            return;
        }
        
        if (drainPriorityQueue.length && getHighestPriority() === PRIORITY_TAIL) {
            return drainPriorityQueue.forEach(priority => drainEventEmitter.emit(String(priority)));
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
        
        while (getHighestPriority() >= Scheduler.Priority.min && !shouldYield()) {
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
                drainEventEmitter.emit(String(priority));
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
            setTimeout(run, 0);
        }
    }
}