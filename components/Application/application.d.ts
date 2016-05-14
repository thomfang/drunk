/// <reference path="../../build/drunk.d.ts" />
declare namespace drunk {
    import Component = drunk.Component;
    interface IApplication {
        start(rootElement?: HTMLElement, url?: string): void;
        navigate(url: string, replaceState?: boolean, state?: any): void;
        back(): void;
    }
    class RouterComponent extends Component implements IApplication {
        private __routeIndex;
        private __routerList;
        private __currentView;
        private __currentViewId;
        private __routerState;
        private __navigationState;
        private __visibleMap;
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
        private __enterView(view);
        private __exitView(view);
        private __scanElement(rootElement);
        private __addRoute(route, viewId);
        private __initNavigationEvent();
        private __navigate(url);
        private __parseUrl(url);
    }
    var Application: IApplication;
}
