/// <reference path="../../build/drunk.d.ts" />
declare namespace drunk {
    import Component = drunk.Component;
    interface IRouterState {
        url: string;
        route: string;
        params: {
            [name: string]: any;
        };
        viewId: string;
    }
    interface IRouterComponent extends drunk.IComponentOptions {
        onEnter?(state: IRouterState, navigationState?: Object): any;
        onExit?(): any;
    }
    interface IApplication {
        start(rootElement?: HTMLElement, url?: string): void;
        navigate(url: string, replaceState?: boolean, state?: any): void;
        back(): void;
    }
    class RouterComponent extends Component implements IApplication {
        private _rootUrl;
        private _routeList;
        private _currView;
        private _currViewId;
        private _isNavigating;
        private _routeState;
        private _navigationState;
        private _navigatingPromise;
        private _visibleViews;
        /**
         * 启动
         * @param  rootElement  默认以document.body启动
         * @param  url          启动的路由
         */
        start(rootElement?: HTMLElement, url?: string): void;
        /**
         * 导航到指定url
         * @param  url           url参数
         * @param  replaceState  是否替换掉当前的页面历史纪录
         * @param  state         传递的参数
         */
        navigate(url: string, replaceState?: boolean, state?: any): void;
        /**
         * 后退
         */
        back(): void;
        private _viewCreated(view);
        private _viewRelease(view);
        private _viewMounted(view);
        private _templateLoadFailed(view);
        private _parse(rootElement);
        private _addRoute(route, viewId);
        private _initNavigationEvent();
        private _navigate(url);
        private _parseUrl(url);
    }
    var Application: IApplication;
}
