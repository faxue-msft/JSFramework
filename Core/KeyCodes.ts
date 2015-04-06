// 
// Copyright (C) Microsoft. All rights reserved.
//

module Common {
    "use strict";

    /**
     * Use the Keys members to test against KeyboardEvent.key.
     * This is preferred over testing KeyboardEvent.keyCode, which is deprecated.
     */
    export class Keys {
        public static C = "c";
        public static DEL = "Del";
        public static DOWN = "Down";
        public static END = "End";
        public static ENTER = "Enter";
        public static F10 = "F10";
        public static HOME = "Home";
        public static LEFT = "Left";
        public static RIGHT = "Right";
        public static SPACEBAR = "Spacebar";
        public static UP = "Up";
    }

    /**
     * Use the KeyCodes enumeration to test against KeyboardEvent.keyCode.
     * This is deprecated in favor of testing KeyboardEvent.key.
     */
    export enum KeyCodes {
        Backspace = 8,
        Tab = 9,
        Enter = 13,
        Shift = 16,
        Control = 17,
        Alt = 18,
        CapsLock = 20,
        Escape = 27,
        Space = 32,
        PageUp = 33,
        PageDown = 34,
        End = 35,
        Home = 36,
        ArrowLeft = 37,
        ArrowFirst = 37,
        ArrowUp = 38,
        ArrowRight = 39,
        ArrowDown = 40,
        ArrowLast = 40,
        Insert = 45,
        Delete = 46,
        A = 65,
        B = 66,
        C = 67,
        D = 68,
        E = 69,
        F = 70,
        G = 71,
        H = 72,
        I = 73,
        J = 74,
        K = 75,
        L = 76,
        M = 77,
        N = 78,
        O = 79,
        P = 80,
        Q = 81,
        R = 82,
        S = 83,
        T = 84,
        U = 85,
        V = 86,
        W = 87,
        X = 88,
        Y = 89,
        Z = 90,
        ContextMenu = 93,
        Multiply = 106,
        Plus = 107,
        Minus = 109,
        F1 = 112,
        F2 = 113,
        F3 = 114,
        F4 = 115,
        F5 = 116,
        F6 = 117,
        F7 = 118,
        F8 = 119,
        F9 = 120,
        F10 = 121,
        F11 = 122,
        F12 = 123,
        Comma = 188,
        Period = 190
    }

    export enum MouseButtons {
        LeftButton = 0,
        MiddleButton = 1,
        RightButton = 2
    }

    // This maps to KeyFlags enum defined in 
    // $/devdiv/feature/VSClient_1/src/bpt/diagnostics/Host/Common/common.h
    export enum KeyFlags {
        None = 0x0,
        Shift = 0x1,
        Ctrl = 0x2,
        Alt = 0x4
    }

    /**
     * Add listeners to the document to prevent certain IE browser accelerator keys from
     * triggering their default action in IE
     */
    export function blockBrowserAccelerators(): void {
        // Prevent the default F5 refresh, default F6 address bar focus, and default SHIFT + F10 context menu
        document.addEventListener("keydown", (e: KeyboardEvent) => {
            return preventIEKeys(e);
        });

        // Prevent the default context menu
        document.addEventListener("contextmenu", (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });

        // Prevent mouse wheel zoom
        window.addEventListener("mousewheel", (e: MouseEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        });
    }

    /**
     * Checks to see if any of the ALT, SHIFT, or CTRL keys are pressed
     * @param e The keyboard event to check
     * @return true if the event has any of the key flags toggled on
     */
    export function HasAnyOfAltCtrlShiftKeyFlags(e: KeyboardEvent): boolean {
        return e.shiftKey || e.ctrlKey || e.altKey;
    }

     /**
      * Checks to see if only CTRL keys are pressed, not ALT or SHIFT
      * @param e The keyboard event to check
      * @return true if the event has any of the key flags toggled on
      */
    export function HasOnlyCtrlKeyFlags(e: KeyboardEvent): boolean {
        return e.ctrlKey && !e.shiftKey && !e.altKey;
    }

    /**
     * Prevents IE from executing default behavior for certain shortcut keys
     * This should be called from keydown handlers that do not already call preventDefault().
     * Some shortcuts cannot be blocked via javascript (such as CTRL + P print dialog) so these
     * are already blocked by the native hosting code and will not get sent to the key event handlers.
     * @param e The keyboard event to check and prevent the action on
     * @return false to stop the default action- which matches the keydown/keyup handlers
     */
    export function preventIEKeys(e: KeyboardEvent): boolean {
        // Check if a known key combo is pressed
        if (e.keyCode === Common.KeyCodes.F5 ||                  // F5 Refresh
            e.keyCode === Common.KeyCodes.F6 ||                  // F6 Address bar focus
            (e.keyCode === Common.KeyCodes.F10 && e.shiftKey) || // SHIFT + F10 Context menu
            (e.keyCode === Common.KeyCodes.F && e.ctrlKey)) {    // CTRL + F Find dialog
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        return true;
    }
}
