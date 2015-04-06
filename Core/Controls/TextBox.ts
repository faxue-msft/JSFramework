//
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="../assert.ts" />
/// <reference path="../KeyCodes.ts" />
/// <reference path="../Framework/Model/Observable.ts" />
/// <reference path="../Framework/Templating/TemplateControl.ts" />

module Common.Controls {
    "use strict";

    export class TextBox extends TemplateControl {
        /** The keyboard handler for the input element */
        private _keyboardHandler: (e: KeyboardEvent) => void;

        /** The root element for the text box */
        private _inputRootElement: HTMLInputElement;

        /** The binding object between the textbox value property and text, used to force source update */
        private _textBinding: Binding;

        public static PlaceholderPropertyName = "placeholder";
        public static ReadonlyPropertyName = "readonly";
        public static TextPropertyName = "text";

        /** The root element which will be used to contain all items. If no element was found with this name, the control rootElement is used. */
        public static InputElementName = "_textBoxRoot";

        /**
         * [ObservableProperty] Gets or sets the placeholder value which shows a short hint describing the expected value of the textbox.
         */
        public placeholder: string;

        /**
         * [ObservableProperty] Gets or sets the readonly behaviour on the text box.
         */
        public readonly: boolean;

        /**
         * [ObservableProperty] Gets or sets a value which corresponds to the text contents of the text box.
         */
        public text: string;

        /**
         * Clears the content of the textbox when escape is hit
         */
        public clearOnEscape: boolean;

        /**
         * When set the control updates the text source whenever the textbox input event fires 
         * as appose to updating when the user submits the changes by loosing focus or clicking Enter.
         */
        public updateOnInput: boolean;

        /**
         * Constructor
         * @param templateId The id of the template to apply to the control
         */
        constructor(templateId?: string) {
            this._keyboardHandler = (e: KeyboardEvent) => this.onKeyboardEvent(e);

            super(templateId || "Common.defaultTextBoxTemplate");
        }

        public get focusableElement(): HTMLElement { return this.rootElement; }

        /**
         * Static constructor used to initialize observable properties
         */
        public static initialize(): void {
            Common.ObservableHelpers.defineProperty(TextBox, TextBox.PlaceholderPropertyName, "");
            Common.ObservableHelpers.defineProperty(TextBox, TextBox.ReadonlyPropertyName, false, (obj: TextBox) => obj.onReadonlyChanged());
            Common.ObservableHelpers.defineProperty(TextBox, TextBox.TextPropertyName, "");
        }

        /**
         * Updates the control when the template has changed
         */
        public onApplyTemplate(): void {
            super.onApplyTemplate();

            this._inputRootElement = <HTMLInputElement>(this.getNamedElement(TextBox.InputElementName) || this.rootElement);
            F12.Tools.Utility.Assert.isTrue(!!this._inputRootElement, "Expecting a root element for the input element in TextBox.");

            this._textBinding = this.getBinding(this._inputRootElement, "value");

            this._inputRootElement.addEventListener("keydown", this._keyboardHandler);
            this._inputRootElement.addEventListener("keypress", this._keyboardHandler);
            this._inputRootElement.addEventListener("input", this._keyboardHandler);
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
         * Updates the control when the template is about to change. Removes event handlers from previous root element.
         */
        public onTemplateChanging(): void {
            super.onTemplateChanging();

            if (this._inputRootElement) {
                this._inputRootElement.removeEventListener("keypress", this._keyboardHandler);
                this._inputRootElement.removeEventListener("keydown", this._keyboardHandler);
                this._inputRootElement.removeEventListener("input", this._keyboardHandler);
            }
        }

        /**
         * Handles keyboard events to allow the button to be interacted with via the keyboard
         * @param e The mouse event
         */
        private onKeyboardEvent(e: KeyboardEvent): void {
            if (this.isEnabled) {
                switch (e.type) {
                    case "keydown":
                        if (e.key === Keys.ENTER) {
                            if (this._textBinding) {
                                this._textBinding.updateSourceFromDest();
                            }
                        }

                        break;
                    case "keypress":
                        if (this.clearOnEscape && e.keyCode === Common.KeyCodes.Escape) {
                            this._inputRootElement.value = "";

                            if (this._textBinding) {
                                this._textBinding.updateSourceFromDest();
                            }

                            // We don't want the textbox to handle escape
                            e.stopImmediatePropagation();
                            e.preventDefault();
                        }

                        break;
                    case "input":
                        if (this.updateOnInput) {
                            if (this._textBinding) {
                                this._textBinding.updateSourceFromDest();
                            }
                        }

                        break;
                    default:
                        F12.Tools.Utility.Assert.fail("Unexpected");
                }
            }
        }

        private onReadonlyChanged(): void {
            if (this._inputRootElement) {
                this._inputRootElement.readOnly = this.readonly;
            }
        }
    }

    TextBox.initialize();
}
