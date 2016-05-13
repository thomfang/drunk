/// <reference path="../../build/drunk.d.ts" />
declare namespace drunk.Scheduler {
    import Promise = drunk.Promise;
    enum Priority {
        max = 15,
        high = 13,
        aboveNormal = 9,
        normal = 0,
        belowNormal = -9,
        idle = -13,
        min = -15,
    }
    interface IJob {
        priority: Priority;
        completed: boolean;
        cancel(): void;
        pause(): void;
        resume(): void;
    }
    interface IJobInfo {
        shouldYield: boolean;
        setWork(work: (jobInfo: IJobInfo) => any): void;
        setPromise(promise: Promise<IWork>): void;
    }
    interface IWork {
        (jobInfo: IJobInfo): any;
    }
}
