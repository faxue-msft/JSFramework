// 
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="Button.ts" />

module Common.Controls {
    "use strict";

    /**
     * A Button class which is templatable and provides basic button functionality
     */
    export class ToggleButton extends Button {
        /** CSS class to apply to the button's root element when it's checked */
        private static CLASS_CHECKED = "checked";

        /** The handler for attribute changes */
        private _modificationHandler: (event: MutationEvent) => void;

        /** Keeps track of whether we're changing the aria-pressed attribute to determine if the change is coming from an accessibility tool, or from us */
        private _isChangingAriaPressed: boolean;

        /**
         * [ObservableProperty] Gets or sets a value indicating whether the button is currently checked.
         */
        public isChecked: boolean;

        /**
         * Switch isChecked state by clicking on the button. Default is true.
         */
        public toggleIsCheckedOnClick: boolean;

        /**
         * Constructor
         * @param templateId The id of the template to apply to the control
         */
        constructor(templateId?: string) {
            this._modificationHandler = (e: MutationEvent) => this.onModificationEvent(e);

            super(templateId);

            this.toggleIsCheckedOnClick = true;

            this.click.addHandler((e: Event) => {
                if (this.toggleIsCheckedOnClick) {
                    this.isChecked = !this.isChecked;
                }
            });
        }

        /**
         * Static constructor used to initialize observable properties
         */
        public static initialize(): void {
            Common.ObservableHelpers.defineProperty(Button, "isChecked", false, (obj: ToggleButton, oldValue: boolean, newValue: boolean) => obj.onIsCheckedChanged(oldValue, newValue));
        }

        /**
         * Updates the control when the template has changed
         */
        public onApplyTemplate(): void {
            super.onApplyTemplate();

            if (this.rootElement) {
                this.rootElement.addEventListener("DOMAttrModified", this._modificationHandler);

                // Ensure the control is in the correct state
                this.onIsCheckedChanged(null, this.isChecked);
            }
        }

        /**
         * Updates the control when the template is about to change. Removes event handlers from previous root element.
         */
        public onTemplateChanging(): void {
            super.onTemplateChanging();

            if (this.rootElement) {
                this.rootElement.removeEventListener("DOMAttrModified", this._modificationHandler);
            }
        }

        /**
         * Handles a change to the isChecked property
         * @param oldValue The old value for the property
         * @param newValue The new value for the property
         */
        private onIsCheckedChanged(oldValue: boolean, newValue: boolean): void {
            if (this.rootElement) {
                if (!this._isChangingAriaPressed) {
                    this._isChangingAriaPressed = true;
                    this.rootElement.setAttribute("aria-pressed", newValue + "");
                    this._isChangingAriaPressed = false;
                }

                if (newValue) {
                    this.rootElement.classList.add(ToggleButton.CLASS_CHECKED);
                } else {
                    this.rootElement.classList.remove(ToggleButton.CLASS_CHECKED);
                }
            }
        }

        /**
         * Handles DOM modification events to determine if an accessibility tool has changed aria-pressed
         * @param e The keyboard event
         */
        private onModificationEvent(e: MutationEvent): void {
            if (!this._isChangingAriaPressed && this.isEnabled && e.attrName === "aria-pressed" && e.attrChange === e.MODIFICATION) {
                this._isChangingAriaPressed = true;
                this.isChecked = e.newValue === "true";
                this._isChangingAriaPressed = false;
            }
        }
    }

    ToggleButton.initialize();
}
