//
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="MenuItem.ts" />

module Common.Controls {
    "use strict";

    /**
     * A menu item with a checkbox input.
     */
    export class CheckBoxMenuItem extends Common.Controls.MenuItem {
        constructor(templateId?: string) {
            super(templateId || "Common.menuItemCheckBoxTemplate");
        }

        /**
         * Overridable protected to allow the derived class to intercept handling key-up event.
         * @param e The keyboard event
         */
        public onKeyUpOverride(e: KeyboardEvent): boolean {
            var handled = false;

            if (e.key === Common.Keys.SPACEBAR) {
                this.isChecked = !this.isChecked;
                handled = true;
            }

            if (!handled) {
                handled = super.onKeyUpOverride(e);
            }

            return handled;
        }

        /**
         * Handles checking the menuitem when clicked
         * @param e An optional event object.
         */
        public press(e?: Event): void {
            // If the source element was the checkbox, then we don't want to flip isChecked (because it is taken care of by the control binding)
            // and we don't want to raise the click event
            var checkBox = <HTMLInputElement>this.getNamedElement("BPT-menuItemCheckBox");
            if (!e || e.srcElement !== checkBox) {
                this.isChecked = !this.isChecked;
                super.press(e);
            }
        }
    }
}
