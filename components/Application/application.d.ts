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
        start(rootElement?: HTMLElement, url?: string): void;
        navigate(url: string, replaceState?: boolean, state?: any): void;
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
