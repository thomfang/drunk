/// <reference path="../promise/promise" />
/// <reference path="../util/util" />
/// <reference path="../events/eventemitter" />

module drunk.scheduler {
    
    interface IJob {
        priority: Priority;
        cancel(): void;
        pause(): void;
        resume(): void;
    }
    
    interface IJobInfo {
        shouldYield: boolean;
    }
    
    var jobList: Job[] = [];
    var drainPriorityQueue: Priority[] = [];
    
    var isRunning = false;
    var immediateYield = false;
    
    var drainEventEmitter = new EventEmitter;
    
    const TIME_SLICE = 30;
    
    export enum Priority {
        high = 13,
        aboveNormal = 9,
        normal = 0,
        belowNormal = -9,
        idle = -13
    };
    
    export class Job implements IJob {
        
        private _isPaused: boolean;
        
        constructor(private _work: (jobInfo: IJobInfo) => any, private _priority: Priority, private _sender: any) {
            
        }
        
        get priority() {
            return this._priority;
        }
        set priority(value: Priority) {
            this._priority = clampPriority(value);
        }
        
        cancel() {
            util.removeArrayItem(jobList, this);
        }
        
        pause() {
            util.removeArrayItem(jobList, this);
            this._isPaused = true;
        }
        
        resume() {
            if (this._isPaused) {
                addJobToList(this);
                this._isPaused = false;
            }
        }
        
        _invoke(shouldYield) {
            this._work.call(this._sender, new JobInfo(shouldYield));
            
            this._work = null;
            this._sender = null;
            this._priority = null;
        }
    }
    
    export class JobInfo implements IJobInfo {
        
        constructor(private _shouldYield: () => boolean) {
            
        }
        
        get shouldYield() {
            return this._shouldYield();
        }
        
        setWork() {
            
        }
        
        setPromise() {
            
        }
    }
    
    function addJobToList(job) {
        jobList.push(job);
        jobList.sort((a, b) => b.priority - a.priority);
        startRunning();
    }
    
    function clampPriority(priority: Priority) {
        priority = priority || Priority.normal;
        return Math.min(Priority.high, Math.max(Priority.idle, priority));
    }
    
    function run() {
        if (isRunning || !jobList.length) {
            return;
        }
        
        isRunning = true;
        
        let endTime = Date.now() + TIME_SLICE;
        let currJob = jobList[0];
        let drainPriority = drainPriorityQueue.length ? drainPriorityQueue[0] : Priority.idle;
        
        function shouldYield() {
            if (drainPriorityQueue.length) {
                return false;
            }
            if (drainPriority > currJob.priority) {
                drainPriorityQueue.shift();
                return true;
            }
            return Date.now() > endTime;
        }
        
        while (!immediateYield && !shouldYield()) {
            currJob._invoke(shouldYield);
            
            if (!jobList.length) {
                break;
            }
            currJob = jobList.shift();
        }
        
        isRunning = false;
    }
    
    function startRunning() {
        if (!isRunning) {
            setTimeout(run, 0);
        }
    }
    
    export function schedule(work: (jobInfo: IJobInfo) => any, priority?: Priority, sender?: any): IJob {
        let job = new Job(work, clampPriority(priority), sender);
        
        addJobToList(job);
        
        return job;
    }
    
    export function requestDrain(priority: Priority) {
        util.addArrayItem(drainPriorityQueue, priority);
        drainPriorityQueue.sort();
        
        let promise = new Promise((resolve) => {
            drainEventEmitter.once(String(priority), resolve);
        });
        
        startRunning();
        
        return promise;
    }
}