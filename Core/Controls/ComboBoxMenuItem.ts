// 
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="../assert.ts" />
/// <reference path="MenuItem.ts" />

module Common.Controls {
    "use strict";

    /**
     * A menu item with a combobox input.
     */
    export class ComboBoxMenuItem extends Common.Controls.MenuItem {
        private _focusInHandler: (e: FocusEvent) => void;
        private _selectElement: HTMLSelectElement;

        /**
         * [ObservableProperty] Gets or sets the array of items to bind to the underlying combobox
         */
        public items: Common.Controls.IComboBoxItemModel[];

        /**
         * [ObservableProperty] Gets or sets the value that is currently selected
         */
        public selectedValue: string;

        constructor(templateId?: string) {
            this._focusInHandler = (e: FocusEvent) => this.onFocusIn(e);

            super(templateId || "Common.menuItemComboBoxTemplate");
        }

        /**
         * Static constructor used to initialize observable properties
         */
        public static initialize(): void {
            Common.ObservableHelpers.defineProperty(ComboBoxMenuItem, "items", null);
            Common.ObservableHelpers.defineProperty(ComboBoxMenuItem, "selectedValue", null);
        }

        public onApplyTemplate(): void {
            super.onApplyTemplate();

            this._selectElement = <HTMLSelectElement>this.getNamedElement("BPT-menuItemComboBox");
            F12.Tools.Utility.Assert.isTrue(!!this._selectElement, "Expecting a combobox with the name BPT-menuItemComboBox");

            this.rootElement.addEventListener("focusin", this._focusInHandler);
        }

        /**
         * Overridable protected to allow the derived class to intercept handling key-up event.
         * @param e The keyboard event
         */
        public onKeyUpOverride(e: KeyboardEvent): boolean {
            var handled = false;

            // The combobox needs to handle the following keys in order to function as expected.
            if (e.srcElement === this._selectElement &&
                e.key === Common.Keys.SPACEBAR || e.key === Common.Keys.ENTER || e.key === Common.Keys.DOWN || e.key === Common.Keys.UP) {
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
            // The combobox menu item has no pressing logic
        }

        private onFocusIn(e: FocusEvent): void {
            // Transfer focus to the combobox when the menu item gets focus
            this._selectElement.focus();
        }
    }

    ComboBoxMenuItem.initialize();
} 