/// <reference path="../promise/promise" />
/// <reference path="../util/util" />
/// <reference path="../events/eventemitter" />

module drunk.scheduler {
    
    export interface IJob {
        priority: Priority;
        cancel(): void;
        pause(): void;
        resume(): void;
    }
    
    export interface IJobInfo {
        shouldYield: boolean;
    }
    
    /**
     * 调度器优先级
     * @property Priority
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
    
    var isRunning = false;
    var immediateYield = false;
    
    var drainEventEmitter = new EventEmitter();
    
    const TIME_SLICE = 30;
    const PRIORITY_TAIL = Priority.min - 1;
    
    var drainPriorityQueue: Priority[] = [];
    var jobStore: {[key: number]: Job[]} = { };
    
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
    
    class Job implements IJob {
        
        private _isPaused: boolean;
        
        constructor(private _work: (jobInfo: IJobInfo) => any, private _priority: Priority, private _context: any) {
            
        }
        
        get priority() {
            return this._priority;
        }
        set priority(value: Priority) {
            this._priority = clampPriority(value);
        }
        
        cancel() {
            this._remove();
            this._release();
        }
        
        pause() {
            this._remove();
            this._isPaused = true;
        }
        
        resume() {
            if (this._isPaused) {
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
                    (<Promise<Function>>result).then((newWork: (IJobInfo) => any) => {
                        this._work = newWork;
                        this._priority = priority;
                        this._context = context;
                        addJobToQueue(this);
                    });
                }
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
    
    class JobInfo implements IJobInfo {
        
        private _publicApiDisabled: boolean;
        
        _result: Function | Promise<Function>;
        
        constructor(private _shouldYield: () => boolean) {
            
        }
        
        get shouldYield() {
            this._throwIfDisabled();
            return this._shouldYield();
        }
        
        setWork(work: (jobInfo: IJobInfo) => any): void {
            this._throwIfDisabled();
            this._result = work;
        }
        
        setPromise(promise: Promise<any>) {
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
    
    export function schedule(work: (jobInfo: IJobInfo) => any, priority?: Priority, context?: any): IJob {
        let job = new Job(work, clampPriority(priority), context);
        
        addJobToQueue(job);
        
        return job;
    }
    
    export function requestDrain(priority: Priority, callback: () => any) {
        util.addArrayItem(drainPriorityQueue, priority);
        drainPriorityQueue.sort();
        drainEventEmitter.once(String(priority), callback);
    }
}