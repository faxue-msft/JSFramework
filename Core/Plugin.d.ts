declare module Plugin {
    module Host {
        interface ICore {
            hostDescription(): string;
            postMessage(message: string): void;
            messageReceived: (message: string) => void;
        }
    }
    module Utilities {
        class EventManager {
            private target;
            private listeners;
            public addEventListener(type: string, listener: (e: Event) => void): void;
            public dispatchEvent(type: any, eventArg?: any): boolean;
            public removeEventListener(type: string, listener: (e: Event) => void): void;
            public setTarget(value: any): void;
        }
        interface MarshalledError extends Error {
            innerError: Error;
            source: string;
            helpLink: string;
        }
        function marshalHostError(hostErrorObject: any): MarshalledError;
        function formatString(message: string, optionalParams: any[]): string;
    }
    interface IPromise {
        cancel(): void;
        done(completed?: (result: any) => void, error?: (value: Error) => void, progress?: (value: any) => void): void;
        then(completed?: (result: any) => any, error?: (value: Error) => void, progress?: (value: any) => void): IPromise;
    }
    interface ITypeSafePromise<T> {
        cancel(): void;
        done(completed?: (result: T) => void, error?: (value: Error) => void, progress?: (value: any) => void): void;
        then<R>(completed?: (value: T) => ITypeSafePromise<R>, error?: (value: Error) => void): ITypeSafePromise<R>;
        then<R>(completed?: (value: T) => R, error?: (value: Error) => void): ITypeSafePromise<R>;
    }
    class Promise {
        constructor(init: (completed: (value: any) => void) => void, oncancel?: () => void);
        constructor(init: (completed: (value: any) => void, error: (value: Error) => void) => void, oncancel?: () => void);
        constructor(init: (completed: (value: any) => void, error: (value: Error) => void, progress: (value: any) => void) => void, oncancel?: () => void);
        public cancel(): void;
        public done(completed?: (result: any) => void, error?: (value: Error) => void, progress?: (value: any) => void): void;
        public then(completed?: (result: any) => any, error?: (value: Error) => void, progress?: (value: any) => void): Promise;
        static addEventListener(eventType: string, listener: (args: Event) => void, capture?: boolean): void;
        static any(values: Promise[]): Promise;
        static as(value: any): Promise;
        static cancel(): Promise;
        static dispatchEvent(eventType: string, details?: any): boolean;
        static is(value: any): boolean;
        static join(values: any[]): Promise;
        static removeEventListener(eventType: string, listener: (args: Event) => void, capture?: boolean): void;
        static supportedForProcessing: boolean;
        static then(value: any, completed: (result: any) => void, error?: (value: Error) => void, progress?: (value: any) => void): Promise;
        static thenEach(values: any[], completed: (result: any) => void, error?: (value: Error) => void, progress?: (value: any) => void): Promise;
        static timeout(time?: number, promise?: Promise): Promise;
        static wrap(value: any): Promise;
        static wrapError(value: Error): Promise;
    }
    enum PortState {
        connected = 0,
        disconnected = 1,
        closed = 2,
    }
    interface Port extends EventTarget {
        state: PortState;
        connect(): void;
        postMessage(message: string): void;
        sendMessage(message: string): Promise;
        close(): void;
    }
    interface MarshalledError extends Error {
        innerError: Error;
        source: string;
        helpLink: string;
    }
    interface PublishedObject {
        _forceConnect(): boolean;
        _postMessage(message: string): void;
        _sendMessage(message: string): Promise;
    }
    function attachToPublishedObject(name: string, objectDefinition: any, messageHandler: (message: string) => void, closeHandler?: (error: Event) => void, createOnFirstUse?: boolean): PublishedObject;
    function _logError(message: string): void;
    function addEventListener(type: string, listener: (e: Event) => void): void;
    function removeEventListener(type: string, listener: (e: Event) => void): void;
    function createPort(name: string): Port;
}
declare module Plugin.Utilities.JSONMarshaler {
    interface MarshaledObject extends PublishedObject, EventTarget {
        _call(name: string, ...args: any[]): Promise;
        _post(name: string, ...args: any[]): void;
    }
    function attachToPublishedObject(name: string, objectDefinition?: any, createOnFirstUse?: boolean): MarshaledObject;
}
declare module Plugin.Diagnostics {
    module Host {
        interface IDiagnostics {
            reportError(message: string, url: string, lineNumber: string, additionalInfo: any, columnNumber?: string): number;
            terminate(): void;
        }
    }
    function onerror(message: any, uri: string, lineNumber: number, columnNumber?: number, error?: Error): boolean;
    function reportError(error: Error, uri?: string, lineNumber?: number, additionalInfo?: any, columnNumber?: number): number;
    function reportError(message: string, uri?: string, lineNumber?: number, additionalInfo?: any, columnNumber?: number): number;
    function terminate(): void;
}
declare module Plugin.Culture {
    interface CultureInfoEvent extends Event {
        language: string;
        direction: string;
        formatRegion: string;
        dateTimeFormat: any;
        numberFormat: any;
    }
    module Host {
        interface ICulture {
            addEventListener(eventType: string, listener: (e: any) => void): void;
        }
    }
    var dir: string;
    var lang: string;
    var formatRegion: string;
    var DateTimeFormat: any;
    var NumberFormat: any;
    function addEventListener(type: string, listener: (e: Event) => void): void;
    function removeEventListener(type: string, listener: (e: Event) => void): void;
}
declare module Plugin {
    module Host {
        interface IOutput {
            log(message: string): void;
        }
    }
    function log(message: any, ...optionalParams: any[]): void;
}
declare module Plugin.Resources {
    module Host {
        interface ResourceEvent extends Event {
            ResourceMap?: {
                [key: string]: {
                    [key: string]: string;
                };
            };
            DefaultAlias?: string;
            GenericError?: string;
        }
        interface IResources {
            addEventListener(name: string, callback: (e: ResourceEvent) => void): void;
            removeEventListener(name: string, callback: (e: ResourceEvent) => void): void;
        }
    }
    function getString(resourceId: string, ...args: any[]): string;
    function getErrorString(errorId: string): string;
    function addEventListener(name: string, callback: (e: Event) => void): void;
    function removeEventListener(name: string, callback: (e: Event) => void): void;
}
declare module Plugin.Storage {
    module Host {
        interface IStorage {
            closeFile(streamId: string): Plugin.Promise;
            fileDialog(mode: FileDialogMode, dialogOptions?: FileDialogOptions, fileOptions?: FileOptions): Plugin.Promise;
            getFileList(path?: string, persistence?: FilePersistence, index?: number, count?: number): Plugin.Promise;
            openFile(path?: string, options?: FileOptions): Plugin.Promise;
            seek(streamId: string, offset: number, origin: SeekOrigin): Plugin.Promise;
            read(streamId: string, count?: number, type?: FileType): Plugin.Promise;
            write(streamId: string, data: any, offset?: number, count?: number, type?: FileType): Plugin.Promise;
        }
    }
    enum FileAccess {
        read = 1,
        write = 2,
        readWrite = 3,
    }
    enum FileDialogMode {
        open = 0,
        save = 1,
    }
    enum FileMode {
        createNew = 1,
        create = 2,
        open = 3,
        openOrCreate = 4,
        truncate = 5,
        append = 6,
    }
    enum FileShare {
        none = 0,
        read = 1,
        write = 2,
        readWrite = 3,
        delete = 4,
    }
    enum FileType {
        binary = 0,
        text = 1,
    }
    enum FilePersistence {
        permanent = 0,
        temporary = 1,
    }
    enum SeekOrigin {
        begin = 0,
        current = 1,
        end = 2,
    }
    interface FileDialogOptions {
        name?: string;
        extensions?: string[];
        extensionsIndex?: number;
        initialDirectory?: string;
        title?: string;
    }
    interface FileOptions {
        access?: FileAccess;
        encoding?: string;
        mode?: FileMode;
        share?: FileShare;
        persistence?: FilePersistence;
        type?: FileType;
    }
    interface File {
        streamId: string;
        close(): Plugin.Promise;
        read(count?: number): Plugin.Promise;
        seek(offset: number, origin: SeekOrigin): Plugin.Promise;
        write(data: any, offset?: number, count?: number): Plugin.Promise;
    }
    function getFileList(path?: string, persistence?: FilePersistence, index?: number, count?: number): Plugin.Promise;
    function createFile(path?: string, options?: FileOptions): Plugin.Promise;
    function openFile(path: string, options?: FileOptions): Plugin.Promise;
    function openFileDialog(dialogOptions?: FileDialogOptions, fileOptions?: FileOptions): Plugin.Promise;
    function saveFileDialog(dialogOptions?: FileDialogOptions, fileOptions?: FileOptions): Plugin.Promise;
}
declare module Plugin.Theme {
    interface ThemeEvent extends Event {
        PluginCss: string;
        themeMap: {
            [key: string]: string;
        };
        isHighContrastTheme?: boolean;
    }
    module Host {
        interface ITheme {
            addEventListener(name: string, callback: (e: ThemeEvent) => void): void;
            fireThemeReady(): void;
            getCssFile(name: string): Plugin.Promise;
        }
    }
    function getValue(key: any): string;
    module _cssHelpers {
        function processCssFileContents(href: string, targetDoc: any, refNode?: any, fireThemeReady?: boolean, isHighContrast?: boolean): void;
        function processImages(targetDoc: Document): void;
    }
    function addEventListener(type: string, listener: (e: Event) => void): void;
    function removeEventListener(type: string, listener: (e: Event) => void): void;
}
declare module Plugin.VS.Commands {
    interface CommandState {
        name: string;
        enabled?: boolean;
        visible?: boolean;
    }
    interface NameSet {
        indexOf(name: string): number;
    }
    interface CommandsInitializedEvent extends Event {
        menuAliases: NameSet;
        commandAliases: NameSet;
    }
    interface CommandInvokeEvent extends Event {
        CommandName: string;
    }
    module Host {
        interface ICommands {
            showContextMenu(menuName: string, xPosition: number, yPosition: number): Plugin.Promise;
            setCommandsStates(states: CommandState[]): Plugin.Promise;
            addEventListener(eventType: string, listener: (e: any) => void): void;
        }
    }
    class ContextMenuBinding {
        private name;
        constructor(name: string);
        public show(xPosition: number, yPosition: number): Plugin.Promise;
    }
    interface CommandBindingState {
        enabled?: boolean;
        visible?: boolean;
    }
    class CommandBinding {
        public _name: string;
        public _onexecute: () => void;
        public _enabled: boolean;
        public _visible: boolean;
        constructor(name: string, onexecute: () => void, enabled: boolean, visible: boolean);
        public setState(state: CommandBindingState): void;
    }
    function bindContextMenu(name: string): ContextMenuBinding;
    interface CommandBindingDefinition {
        name: string;
        onexecute: () => void;
        enabled?: boolean;
        visible?: boolean;
    }
    function bindCommand(command: CommandBindingDefinition): CommandBinding;
    interface CommandStateRequest {
        command: CommandBinding;
        enabled?: boolean;
        visible?: boolean;
    }
    function setStates(...states: CommandStateRequest[]): void;
}
declare module Plugin.VS.Internal.CodeMarkers {
    module Host {
        interface ICodeMarkers {
            fireCodeMarker(marker: number): void;
        }
    }
    function fire(marker: number): void;
}
declare module Plugin.Host {
    interface IHost {
        showDocument(documentPath: string, line: number, col: number): Promise;
        getDocumentLocation(documentPath: string): Promise;
        supportsAllowSetForeground(): boolean;
        allowSetForeground(processId: number): boolean;
    }
    function showDocument(documentPath: string, line: number, col: number): Promise;
    function getDocumentLocation(documentPath: string): Promise;
    function supportsAllowSetForeground(): boolean;
    function allowSetForeground(processId: number): boolean;
}
declare module Plugin.VS.Keyboard {
    function setClipboardState(state: boolean): void;
    function setZoomState(state: boolean): void;
}
declare module Plugin.Tooltip {
    interface Point {
        X: number;
        Y: number;
    }
    interface Size {
        Width: number;
        Height: number;
    }
    interface PopupDisplayParameters {
        content: string;
        clientCoordinates: Point;
        contentSize: Size;
        useCachedDocument?: boolean;
        ensureNotUnderMouseCursor?: boolean;
        placementTargetIsMouseRect?: boolean;
    }
    module Host {
        interface ITooltip {
            getDblClickTime(): number;
            canCreatePopup(): boolean;
            getScreenSizeForXY(screenX: number, screenY: number): Size;
            hostContentInPopup(displayParameters: PopupDisplayParameters): void;
            dismissPopup(): void;
        }
    }
    var defaultTooltipContentToHTML: boolean;
    function invalidatePopupTooltipDocumentCache(): void;
    function initializeElementTooltip(element: Element): void;
    interface TooltipConfiguration {
        content?: string;
        resource?: string;
        delay?: number;
        duration?: number;
        x?: number;
        y?: number;
    }
    function show(config: TooltipConfiguration): void;
    function dismiss(reset?: boolean): void;
}
declare module Plugin.Settings {
    module Host {
        interface ISettings {
            get(collection?: string, requestedProperties?: string[]): Plugin.Promise;
            set(collection?: string, toSet?: any): any;
        }
    }
    function get(collection?: string, requestedProperties?: string[]): Plugin.Promise;
    function set(collection?: string, toSet?: any): any;
}
declare module Plugin.VS.ActivityLog {
    module Host {
        interface IActivityLog {
            logEntry(entryType: number, message: string): any;
        }
    }
    function info(message: string, ...args: string[]): void;
    function warn(message: string, ...args: string[]): void;
    function error(message: string, ...args: string[]): void;
}
declare module Plugin.ContextMenu {
    interface ContextMenuClickEvent extends Event {
        Id: string;
    }
    interface ContextMenuDismissEvent extends Event {
        Id: string;
    }
    interface ContextMenuInitializeEvent extends Event {
        Id: string;
        AriaLabel: string;
        ContextMenus: string;
    }
    module Host {
        interface IContextMenu {
            adjustShowCoordinates(coordinates: Point): Point;
            callback(id: string): Plugin.Promise;
            canCreatePopup(hasSubmenu?: boolean): boolean;
            disableZoom(): void;
            dismiss(): Plugin.Promise;
            dismissCurrent(ignoreDismissForRoot: boolean): Plugin.Promise;
            dismissSubmenus(currentCoordinates: Point): Plugin.Promise;
            fireContentReady(): Plugin.Promise;
            show(menuId: string, ariaLabel: string, contextMenus: HTMLElement, positionInfo: _positionHelpers.PositionInfo): Plugin.Promise;
            addEventListener(name: string, callback: (e: any) => void): any;
        }
    }
    enum MenuItemType {
        checkbox = 0,
        command = 1,
        radio = 2,
        separator = 3,
    }
    interface ContextMenu {
        attach(element: HTMLElement): void;
        detach(element: HTMLElement): void;
        dismiss(): void;
        dispose(): void;
        show(xPosition: number, yPosition: number, widthOffset?: number, targetId?: string): void;
        addEventListener(type: string, listener: (e: Event) => void): any;
        removeEventListener(type: string, listener: (e: Event) => void): any;
    }
    interface ContextMenuItem {
        id?: string;
        callback?: (menuId?: string, menuItem?: ContextMenuItem, targetId?: string) => void;
        label?: string;
        type?: MenuItemType;
        iconEnabled?: string;
        iconDisabled?: string;
        accessKey?: string;
        hidden?: () => boolean;
        disabled?: () => boolean;
        checked?: () => boolean;
        cssClass?: string;
        submenu?: ContextMenuItem[];
    }
    function dismissAll(): Plugin.Promise;
    function create(menuItems: ContextMenuItem[], id?: string, ariaLabel?: string, cssClass?: string, callback?: (menuId?: string, menuItem?: ContextMenuItem, targetId?: string) => void): ContextMenu;
    function canCreatePopup(): boolean;
    interface Point {
        X: number;
        Y: number;
    }
    module _positionHelpers {
        interface PositionInfo {
            clientCoordinates: Point;
            width: number;
            height: number;
            viewPortWidth: number;
            viewPortHeight: number;
            scrollOffsetLeft: number;
            scrollOffsetTop: number;
            elementOffsetTop: number;
            widthOffset: number;
        }
        function show(element: HTMLElement, ariaLabel: string, xPosition: number, yPosition: number, elementOffsetTop?: number, widthOffset?: number, displayType?: string, tryAdjustCoordinates?: (positionInfo: PositionInfo) => PositionInfo, showOutsideOfAirspace?: (id: string, ariaLabel: string, contextMenus: HTMLElement, positionInfo: PositionInfo) => void): void;
    }
}
declare module Plugin.VS.Utilities {
    function createExternalObject(fileAlias: string, clsid: string): any;
}


