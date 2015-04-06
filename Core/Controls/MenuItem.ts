// 
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="../assert.ts" />
/// <reference path="ContentControl.ts" />
/// <reference path="MenuControl.ts" />
/// <reference path="../KeyCodes.ts" />

module Common.Controls {
    "use strict";

    /**
     * A MenuItem class which is templatable and is a single menu item in the menu control
     */
    export class MenuItem extends ContentControl {
        /** CSS class to apply to the menu item root element when it's checked */
        private static CLASS_HIDDEN_CHECK_MARK = "hiddenCheckMark";

        /** The DOM Mutation event handler */
        private _domEventHanlder: (e: MutationEvent) => void;

        /** The key handler function for the root element */
        private _keyUpHandler: (e: KeyboardEvent) => void;

        /** The mouse handler for the root element */
        private _mouseHandler: (e: MouseEvent) => void;

        public static GroupNamePropertyName = "groupName";
        public static IsChecked = "isChecked";

        /**
         * The event which is fired when the menu item is clicked.
         * NOTE: A click can occur via keyboard, or mouse interaction
         */
        public click: EventSource<Event>;

        /**
         * [ObservableProperty] Gets or sets a value indicating the group name of the menu control.
         */
        public groupName: string;

        /**
         * [ObservableProperty] Gets or sets a value indicating whether the menu item is currently checked.
         */
        public isChecked: boolean;

        /**
         * @constructor
         * As part of initialization, caches references to event handler instances and loads the template content.
         * @param templateId: Optional template id for the control. Default is Common.menuItemTemplate. Other option can 
         * be Common.menuItemCheckMarkTemplate
         */
        constructor(templateId?: string) {
            this._mouseHandler = (e: MouseEvent) => this.onMouseEvent(e);
            this._keyUpHandler = (e: KeyboardEvent) => this.onKeyUp(e);
            this._domEventHanlder = (e: MutationEvent) => this.onDomAttributeModified(e);

            super(templateId || "Common.menuItemTemplate");

            this.click = new EventSource<Event>();
        }

        /**
         * Initializes the observable properties which should be performed once per each class.
         */
        public static initialize(): void {
            Common.ObservableHelpers.defineProperty(MenuItem, MenuItem.GroupNamePropertyName, /*defaultValue=*/ null);
            Common.ObservableHelpers.defineProperty(MenuItem, MenuItem.IsChecked, /*defaultValue=*/ false, (obj: MenuItem, oldValue: boolean, newValue: boolean) => obj.onIsCheckedChanged(oldValue, newValue));
        }

        /**
         * Updates the control when the template has changed. Adds event handlers to the current root element.
         */
        public onApplyTemplate(): void {
            super.onApplyTemplate();

            if (this.rootElement) {
                this.rootElement.addEventListener("click", this._mouseHandler);
                this.rootElement.addEventListener("mousedown", this._mouseHandler);
                this.rootElement.addEventListener("mouseup", this._mouseHandler);
                this.rootElement.addEventListener("mouseleave", this._mouseHandler);
                this.rootElement.addEventListener("keyup", this._keyUpHandler);
                this.rootElement.addEventListener("DOMAttrModified", this._domEventHanlder);
            }

            // Ensure the control is in the correct state
            this.onIsCheckedChanged(null, this.isChecked);
        }

        /**
         * Handles a change to the isEnabled property
         */
        public onIsEnabledChangedOverride(): void {
            super.onIsEnabledChangedOverride();

            if (this.isEnabled) {
                this.rootElement.removeAttribute("disabled");
            } else {
                this.rootElement.setAttribute("disabled");
            }
        }

        /**
         * Overridable protected to allow the derived class to intercept handling key-up event.
         * @param e The keyboard event
         */
        public onKeyUpOverride(e: KeyboardEvent): boolean {
            return false;
        }

        /**
         * Overridable protected to allow the derived class to intercept handling mouse click evnet
         * @param e The mouse event
         */
        public onMouseClickOverride(e: MouseEvent): boolean {
            return false;
        }

        /**
         * Updates the control when the template is about to change. Removes event handlers from previous root element.
         */
        public onTemplateChanging(): void {
            super.onTemplateChanging();

            if (this.rootElement) {
                this.rootElement.removeEventListener("click", this._mouseHandler);
                this.rootElement.removeEventListener("mousedown", this._mouseHandler);
                this.rootElement.removeEventListener("mouseup", this._mouseHandler);
                this.rootElement.removeEventListener("mouseleave", this._mouseHandler);
                this.rootElement.removeEventListener("keyup", this._keyUpHandler);
                this.rootElement.removeEventListener("DOMAttrModified", this._domEventHanlder);
            }
        }

        /**
         * Dispatches a click event on the menu item only if the menu item is enabled
         * @param e An optional event object.
         */
        public press(e?: Event): void {
            if (this.isEnabled) {
                this.click.invoke(e);
            }
        }

        /**
         * Handles mutation events to allow the menu item to be interacted with via the accessibility tool.
         * @param e The DOM mutation event
         */
        private onDomAttributeModified(e: MutationEvent): void {
            if (e.attrName === "aria-checked") {
                var checked: boolean = e.newValue === "true";
                if (this.isChecked !== checked) {
                    this.isChecked = checked;
                }
            }
        }

        /**
         * Handles changes to isChecked by displaying a check mark on the DOM element and unchecking any other items in the radio group
         * @param oldValue The old value for the property
         * @param newValue The new value for the property
         */
        private onIsCheckedChanged(oldValue: boolean, newValue: boolean): void {
            if (this.rootElement) {
                if (newValue) {
                    this.rootElement.classList.remove(MenuItem.CLASS_HIDDEN_CHECK_MARK);
                } else {
                    this.rootElement.classList.add(MenuItem.CLASS_HIDDEN_CHECK_MARK);
                }

                this.rootElement.setAttribute("aria-checked", "" + newValue);
                this.rootElement.focus();
            }
        }

        /**
         * Handles keyboard events to allow the menu item to be interacted with via the keyboard
         * @param e The keyboard event
         */
        private onKeyUp(e: KeyboardEvent): void {
            if (this.isEnabled) {
                var handled: boolean = this.onKeyUpOverride(e);
                if (!handled) {
                    if (e.keyCode === Common.KeyCodes.Enter || e.keyCode === Common.KeyCodes.Space) {
                        this.press(e);
                        handled = true;
                    }
                }

                if (handled) {
                    e.stopImmediatePropagation();
                }
            }
        }

        /**
         * Handles mouse events to allow the menu item to be interacted with via the mouse
         * @param e The mouse event
         */
        private onMouseEvent(e: MouseEvent): void {
            if (this.isEnabled) {
                switch (e.type) {
                    case "click":
                        var handled: boolean = this.onMouseClickOverride(e);
                        if (!handled) {
                            this.press(e);
                        }

                        break;
                    case "mousedown":
                    case "mouseup":
                    case "mouseleave":
                        break;
                    default:
                        F12.Tools.Utility.Assert.fail("Unexpected");
                }

                e.stopImmediatePropagation();
            }
        }
    }

    MenuItem.initialize();
}
