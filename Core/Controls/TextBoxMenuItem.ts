// 
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="../assert.ts" />
/// <reference path="MenuItem.ts" />

module Common.Controls {
    "use strict";

    /**
     * A menu item with a textbox input.
     */
    export class TextBoxMenuItem extends Common.Controls.MenuItem {
        private _focusInHandler: (e: FocusEvent) => void;
        private _textBox: HTMLInputElement;

        public static PlaceholderPropertyName = "placeholder";

        /**
         * [ObservableProperty] Gets or sets the placeholder value which shows a short hint describing the expected value of the textbox.
         */
        public placeholder: string;

        constructor(templateId?: string) {
            this._focusInHandler = (e: FocusEvent) => this.onFocusIn(e);

            super(templateId || "Common.menuItemTextBoxTemplate");
        }

        /**
         * Static constructor used to initialize observable properties
         */
        public static initialize(): void {
            Common.ObservableHelpers.defineProperty(TextBoxMenuItem, TextBoxMenuItem.PlaceholderPropertyName, null);
        }

        public onApplyTemplate(): void {
            super.onApplyTemplate();

            this._textBox = <HTMLInputElement>this.getNamedElement("BPT-menuItemTextBox");
            F12.Tools.Utility.Assert.isTrue(!!this._textBox, "Expecting a textbox with the name BPT-menuItemTextBox");

            this.rootElement.addEventListener("focusin", this._focusInHandler);
        }

        /**
         * Overridable protected to allow the derived class to intercept handling key-up event.
         * @param e The keyboard event
         */
        public onKeyUpOverride(e: KeyboardEvent): boolean {
            var handled = false;

            if (e.srcElement === this._textBox && e.keyCode === Common.KeyCodes.Escape) {
                // We don't want the key to reach the menu control
                e.stopImmediatePropagation();
                handled = true;
            }

            if (!handled) {
                handled = super.onKeyUpOverride(e);
            }

            return handled;
        }

        public onTemplateChanging(): void {
            super.onTemplateChanging();

            if (this.rootElement) {
                this.rootElement.removeEventListener("focusin", this._focusInHandler);
            }
        }

        /**
         * Handles checking the menuitem when clicked
         * @param e An optional event object.
         */
        public press(e?: Event): void {
            // The textbox menu item cannot be pressed.
        }

        private onFocusIn(e: FocusEvent): void {
            // Transfer focus to the textbox when the menu item gets focus
            this._textBox.focus();

            // Don't stop the event from bubbling, we still want the event to reach the menu control to update the current selectedIndex
        }
    }

    TextBoxMenuItem.initialize();
} 