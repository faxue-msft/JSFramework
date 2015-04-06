/// <reference path="core/framework/model/observable.ts" />

class FxUsageExampleModel extends Common.Observable {
    /* [ObservableProperty] */
    public sampleName: string;

    public sampleFunction: (root: HTMLElement) => void;

    constructor(sampleName: string, sampleFunction?: (root: HTMLElement) => void) {
        super();

        this.sampleName = sampleName;
        this.sampleFunction = sampleFunction;
    }

    public static init(): void {
        Common.ObservableHelpers.defineProperty(FxUsageExampleModel, "sampleName", "");
    }
}
FxUsageExampleModel.init();

class IntelliTraceEventModel extends Common.Observable {
    /* [ObservableProperty] */
    public isHovered: boolean;

    public static init(): void {
        Common.ObservableHelpers.defineProperty(FxUsageExampleModel, "isHovered", "");
    }
}
IntelliTraceEventModel.init();

class SvgControlModel extends Common.Observable {
    /* [ObservableProperty] */
    public svgPath: string;

    /* [ObservableProperty] */
    public cssClass: string;

    /* [ObservableProperty] */
    public svgPadding: string;

    constructor(svgPath: string, cssClass: string, svgPadding?: string) {
        super();

        this.svgPath = svgPath;
        this.cssClass = cssClass;
        this.svgPadding = svgPadding;
    }

    public static init(): void {
        Common.ObservableHelpers.defineProperty(SvgControlModel, "svgPath", "");
        Common.ObservableHelpers.defineProperty(SvgControlModel, "cssClass", "");
        Common.ObservableHelpers.defineProperty(SvgControlModel, "svgPadding", "");
    }
}
SvgControlModel.init();

class Point extends Common.Observable {
    /* [ObservableProperty] */
    public x: string;

    /* [ObservableProperty] */
    public y: string;

    constructor(x: string, y: string) {
        super();

        this.x = x;
        this.y = y;
    }

    public static init(): void {
        Common.ObservableHelpers.defineProperty(Point, "x", "");
        Common.ObservableHelpers.defineProperty(Point, "y", "");
    }
}
Point.init();

class EventPointModel extends Common.Observable {
    /* [ObservableProperty] */
    public position: Point;

    /* [ObservableProperty] */
    public svgPath: string;

    constructor(x: string, y: string, svgPath: string) {
        super();

        this.position = new Point(x, y);
        this.svgPath = svgPath;
    }

    public static init(): void {
        Common.ObservableHelpers.defineProperty(EventPointModel, "position", "");
        Common.ObservableHelpers.defineProperty(EventPointModel, "svgPath", "");
    }
}
EventPointModel.init();