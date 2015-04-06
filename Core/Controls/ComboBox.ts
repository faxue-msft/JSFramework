//
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="../assert.ts" />
/// <reference path="../Framework/Model/Observable.ts" />
/// <reference path="ItemsControl.ts" />

module Common.Controls {
    "use strict";

    export interface IComboBoxItemModel {
        value: string;
        text: string;
        tooltip?: string;
        label?: string;
    }

    export class ComboBox extends ItemsControl {
        /** The mouse handler for the root element */
        private _mouseHandler: (e: MouseEvent) => void;
                
        public static SelectedValuePropertyName = "selectedValue";

        /**
         * [ObservableProperty] Gets or sets current selected item value of the combo box.
         */
        public selectedValue: string;

        /**
         * Constructor
         * @param templateId The id of the template to apply to the control
         */
        constructor(templateId?: string) {
            this._mouseHandler = (e: MouseEvent) => this.onMouseEvent(e);

            super(templateId || "Common.defaultComboBoxTemplate");
            this.itemContainerControl = "Common.TemplateControl(Common.defaultComboBoxItemTemplate)";
        }

        public get focusableElement(): HTMLElement { return this.rootElement; }

       /**
        * Static constructor used to initialize observable properties
        */
        public static initialize(): void {
            Common.ObservableHelpers.defineProperty(ComboBox, ComboBox.SelectedValuePropertyName, "");
        }

        /**
         * Updates the control when the template has changed
         */
        public onApplyTemplate(): void {
            super.onApplyTemplate();

            if (this.rootElement) {
                this.rootElement.addEventListener("mouseover", this._mouseHandler);
            }
        }

        /**
         * Updates the control when the template is about to change. Removes event handlers from previous root element.
         */
        public onTemplateChanging(): void {
            super.onTemplateChanging();

            if (this.rootElement) {
                this.rootElement.removeEventListener("mouseover", this._mouseHandler);
            }
        }
           
        /**
         * Overridable and allows sub-classes to update when the items property changes
         */
        public onItemsChangedOverride(): void {
            // Ensure the view is notified so that the selection can be properly reflected
            this.propertyChanged.invoke(ComboBox.SelectedValuePropertyName);
        }

        /**
         * Overridable and allows sub-classes to update when the items container control
         * changes (which results in a full rebuild of the child controls).
         */
        public onItemContainerControlChangedOverride(): void {
            // Ensure the view is notified so that the selection can be properly reflected
            this.propertyChanged.invoke(ComboBox.SelectedValuePropertyName);
        }

        /**
         * Overridable and allows sub-classes to update when the container collection is changed
         */
        public onCollectionChangedOverride(args: ICollectionChangedEventArgs<any>): void {
            // Ensure the view is notified so that the selection can be properly reflected
            this.propertyChanged.invoke(ComboBox.SelectedValuePropertyName);
        }

        /**
         * Protected overridable method. Gets called when isEnabled value changes
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
         * Handles mouse events to allow the button to be interacted with via the mouse
         * @param e The mouse event
         */
        private onMouseEvent(e: MouseEvent): void {
            if (this.isEnabled) {
                switch (e.type) {
                    case "mouseover":
                        var currentValue = this.selectedValue;

                        var itemCount = this.getItemCount();
                        for (var i = 0; i < itemCount; i++) {
                            var item = <IComboBoxItemModel>this.getItem(i);

                            if (item.value === currentValue) {
                                if (item.tooltip) {
                                    Plugin.Tooltip.show({ content: item.tooltip });
                                }
                            }
                        }

                        break;
                    default:
                        F12.Tools.Utility.Assert.fail("Unexpected");
                }

                e.stopImmediatePropagation();
                e.preventDefault();
            }
        }
    }

    ComboBox.initialize();
}
