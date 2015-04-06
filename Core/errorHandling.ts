//
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="isDebugBuild.ts" />
/// <reference path="common.d.ts" />
/// <reference path="Plugin.d.ts" />

module Common {
    "use strict";

    export interface IErrorDetails {
        message: string;
        file: string;
        line: number;
        column: number;
        additionalInfo: string;
    }

    export class ErrorHandling {
        private static StackRegex: RegExp = new RegExp(".* at ([^(]+) \(.*/23/([^:]+):([0-9]+):([0-9]+)\)", "gim");

        /**
         * Reports to Watson given a textual stack, parsing out relevant information so it can be bucketed.
         * @param error The Error object.
         */
        public static reportErrorGivenStack(error: Error): void {
            // Example of error.stack:
            //
            // "Error: failure pretty printing
            //    at Anonymous function (res://C:\Program Files\Internet Explorer\iexplore.exe.local\F12Resources.dll/23/debugger/DebuggerMerged.js:11993:25)
            //    at notifySuccess(res://C:\Program Files\Internet Explorer\iexplore.exe.local\F12Resources.dll/23/pluginhost/plugin.f12.js:6739:21)
            //    at enter(res://C:\Program Files\Internet Explorer\iexplore.exe.local\F12Resources.dll/23/pluginhost/plugin.f12.js:6426:21)
            //    at _run(res://C:\Program Files\Internet Explorer\iexplore.exe.local\F12Resources.dll/23/pluginhost/plugin.f12.js:6642:17)
            //    at _completed(res://C:\Program Files\Internet Explorer\iexplore.exe.local\F12Resources.dll/23/pluginhost/plugin.f12.js:6610:13)
            //    at Anonymous function (res://C:\Program Files\Internet Explorer\iexplore.exe.local\F12Resources.dll/23/debugger/DebuggerMerged.js:11450:33)
            //    at notifySuccess(res://C:\Program Files\Internet Explorer\iexplore.exe.local\F12Resources.dll/23/pluginhost/plugin.f12.js:6739:21)
            //    at enter(res://C:\Program Files\Internet Explorer\iexplore.exe.local\F12Resources.dll/23/pluginhost/plugin.f12.js:6426:21)
            //    at _run(res://C:\Program Files\Internet Explorer\iexplore.exe.local\F12Resources.dll/23/pluginhost/plugin.f12.js:6642:17)
            //    at _completed(res://C:\Program Files\Internet Explorer\iexplore.exe.local\F12Resources.dll/23/pluginhost/plugin.f12.js:6610:13)"
            //
            // In this case we want "debugger/debuggermerged.js", 11993 and 25.
            //
            var message = error.message;
            var stack = (<any>error).stack;

            // Remove all but the top function
            var firstCloseParen = stack.indexOf(")");
            if (firstCloseParen > 0) {
                stack = stack.substr(0, firstCloseParen + 1);
            }

            var result = ErrorHandling.StackRegex.exec(stack);

            if (result) {
                // result[1] is the function name
                var file = result[3];
                var line: number = parseInt(result[4], 10);
                var column: number = parseInt(result[5], 10);

                window.reportError(message, file, line, (<any>error).stack /* full stack */, column);
            }
        }

        public static reportErrorDetails(errorDetails: IErrorDetails): void {
            window.reportError(errorDetails.message, errorDetails.file, errorDetails.line, errorDetails.additionalInfo, errorDetails.column);
        }
    }
}

// window is undefined in web workers
if (typeof window !== "undefined") {
    // Overrides the implementation from bptoob\ScriptedHost\Scripts\diagnostics.ts (InternalApis\bptoob\inc\diagnostics.ts)
    // to add the ability to report the error to the window.errorDisplayHandler before doing "reportError"
    // It also does not call Plugin.Diagnostics.terminate() at the end of onerror.
    /**
     * Handles JavaScript errors in the toolwindows by reporting them as non-fatal errors
     * @param message The error message
     * @param file The file in which the error occurred
     * @param line The line on which the error occurred
     * @param additionalInfo Any additional information about the error such as callstack
     * @param column The column on which the error occurred
     */
    window.reportError = function (message: string, file: string, line: number, additionalInfo: string, column?: number): void {
        // Plugin error reporting causes an error if any of these values are null
        message = message || "";
        file = file || "";
        line = line || 0;
        additionalInfo = additionalInfo || "";
        column = column || 0;

        if (isDebugBuild) {
            // Report to the "UI" in some way
            var externalObj: any;
            if (window.parent.getExternalObj) {
                // Hosted in an IFRAME, so get the external object from there
                externalObj = window.parent.getExternalObj();
            } else if (window.external) {
                // Hosted in Visual Studio
                externalObj = window.external;
            }

            if (externalObj) {
                var component = (window.errorComponent ? window.errorComponent : "Common");
                console.error((<any[]>[component, message, file, line, column]).join("\r\n"));

                // Display a warning message to the user
                if (window.errorDisplayHandler) {
                    window.errorDisplayHandler(message, file, line, additionalInfo, column);
                }
            }
        }

        // Report the NFE to the watson server
        if (Plugin && Plugin.Diagnostics && Plugin.Diagnostics.reportError) {
            Plugin.Diagnostics.reportError(message, file, line, additionalInfo, column);
        }
    };

    /**
     * Handles JavaScript errors in the toolwindows by reporting them as non-fatal errors
     * Some hosts then terminate, F12 does not.
     * @param message The error message
     * @param file The file in which the error occurred
     * @param line The line on which the error occurred
     * @param columnNumber Optional column number on which the error occurred
     * @return Returns true to mark the error as handled, False to display the default error dialog
     */
    window.onerror = function (message: any, file: string, line: number, columnNumber?: number): boolean {
        // In IE11 GDR onwards, there is actually a 5th argument, for error - but the Typescript stubs aren't updated
        var column: number = 0;
        var additionalInfo: string = "";
        if (arguments) {
            if (arguments[3] && typeof arguments[3] === "number") {
                column = <number>arguments[3];
            }

            if (arguments[4] && arguments[4] instanceof Error) {
                additionalInfo = "Error number: " + (<any>arguments[4]).number;
                additionalInfo += "\r\nStack: " + (<any>arguments[4]).stack;
            }
        }

        window.reportError(message, file, line, additionalInfo, column);

        return true;
    };
}
