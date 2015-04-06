//
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="errorHandling.ts" />

/// <disable code="SA9017" />

module F12.Tools.Utility {
    "use strict";
    /**
     * Utility functions for verifying internal state.
     * These assertions always be true unless there is a programming error or installation error.
     * User error should be tested with "if" and fail with a localized string.
     * Not intended to be used in unit test code, only product code.
     */
    export class Assert {
        // Possible other asserts:
        //
        // isInstanceOfType(value: any, comparand: any)
        // succeeded(message: string, (any)=>any)
        // isMatch(value: string, pattern: string)
        // isNumber/Array/Function/String
        //

        public static isTrue(condition: any, message?: string): void {
            if (!condition) {
                message = message ? "Internal error. " + message : "Internal error. Unexpectedly false.";
                Assert.fail(message);
            }
        }

        public static isFalse(condition: any, message?: string): void {
            if (condition) {
                message = message ? "Internal error. " + message : "Internal error. Unexpectedly true.";
                Assert.fail(message);
            }
        }

        public static isNull(value: any, message?: string): void {
            if (value !== null) {
                message = message ? "Internal error. " + message : "Internal error. Unexpectedly not null.";
                message += " '" + value + "'";
                Assert.fail(message);
            }
        }

        public static isUndefined(value: any, message?: string): void {
            if (undefined !== void 0) {
                // This cannot happen in the Chakra engine.
                message = "Internal error. Unexpectedly undefined has been redefined.";
                message += " '" + undefined + "'";
                Assert.fail(message);
            }

            if (value !== undefined) {
                message = message ? "Internal error. " + message : "Internal error. Unexpectedly not undefined.";
                message += " '" + value + "'";
                Assert.fail(message);
            }
        }

        public static hasValue(value: any, message?: string): void {
            if (undefined !== void 0) {
                // This cannot happen in the Chakra engine.
                message = "Internal error. Unexpectedly undefined has been redefined.";
                message += " '" + undefined + "'";
                Assert.fail(message);
            }

            if (value === null || value === undefined) {
                message = message ? "Internal error. " + message : ("Internal error. Unexpectedly " + (value === null ? "null" : "undefined") + ".");
                Assert.fail(message);
            }
        }

        public static areEqual(value1: any, value2: any, message?: string): void {
            // Could probe for an equals() method?
            if (value1 !== value2) {
                message = message ? "Internal error. " + message : "Internal error. Unexpectedly not equal.";
                message += " '" + value1 + "' !== '" + value2 + "'.";
                Assert.fail(message);
            }
        }

        public static areNotEqual(value1: any, value2: any, message?: string): void {
            if (value1 === value2) {
                message = message ? "Internal error. " + message : "Internal error. Unexpectedly equal.";
                message += " '" + value1 + "' === '" + value2 + "'.";
                Assert.fail(message);
            }
        }

        public static fail(message: string): void {
            // Uncomment next line if you wish
            // debugger;
            var error = new Error((message || "Assert failed.") + "\n");

            try {
                // The error must be thrown in order to have a call stack for us to report
                throw error;
            } catch (ex) {
                if (Common && Common.ErrorHandling) { // If we are not in remote code
                    // The error now has a call stack so we can report it
                    // If we simply let this throw, we would instead report it in windows.onerror, and would not have the callstack at that point
                    Common.ErrorHandling.reportErrorGivenStack(ex);
                }

                // We could choose to comment out this line to ship (or in release) so that we plow on.
                // However, plowing on in an unknown state is rarely doing the user a favor.
                // Instead, we should catch the exception at a sufficiently high level in the stack that we can recover.
                // This will generally get trapped in the global exception handler, which Daytona will translate into a WER report (unless WER is disabled)
                throw ex;
            }
        }

        public static failDebugOnly(message: string): void {
            // Fail if it is a debug build
            if (isDebugBuild) {
                Assert.fail(message);
            }
        }
    }
}
