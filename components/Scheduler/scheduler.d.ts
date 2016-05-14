/// <reference path="../../build/drunk.d.ts" />
/**
 * 调度器模块
 */
declare namespace drunk.Scheduler {
    import Promise = drunk.Promise;
    /**
     * 调度器优先级
     */
    enum Priority {
        max = 15,
        high = 13,
        aboveNormal = 9,
        normal = 0,
        belowNormal = -9,
        idle = -13,
        min = -15,
    }
    /**
     * 调度方法
     * @param  work      调度的执行函数
     * @param  priority  优先级
     * @param  context   上下文
     */
    function schedule(work: IWork, priority?: Priority, context?: any): IJob;
    /**
     * 当指定优化级的任何都执行完成后触发的回调
     * @param  priority  优先级
     * @param  callback  回调
     */
    function requestDrain(priority: Priority, callback: () => any): any;
    /**
     * 当指定优化级的任何都执行完成后触发的回调
     * @param  priority  优先级
     * @param  callback  回调
     */
    function requestDrainPromise(priority: Priority): Promise<{}>;
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
