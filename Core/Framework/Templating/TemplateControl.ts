// 
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="../IControl.ts" />
/// <reference path="../Model/Observable.ts" />
/// <reference path="TemplateLoader.ts" />
/// <reference path="TemplateDataBinding.ts" />

module Common {
    "use strict";

    /**
     * A template control used to create controls from templates and uses data binding
     */
    export class TemplateControl extends Observable implements IControl {
        private static CLASS_DISABLED = "disabled";

        private _model: any;
        private _templateId: string;
        private _binding: TemplateDataBinding;
        private _tabIndex: number;

        public static CLASS_HIDDEN = "BPT-hidden";
        public static ClassNamePropertyName = "className";
        public static IsEnabledPropertyName = "isEnabled";
        public static IsVisiblePropertyName = "isVisible";
        public static ModelPropertyName = "model";
        public static TabIndexPropertyName = "tabIndex";
        public static TemplateIdPropertyName = "templateId";
        public static TooltipPropertyName = "tooltip";

        public rootElement: HTMLElement;

        /**
         * [ObservableProperty] Gets or sets the CSS class name(s) (space separated) to be applied to the root element
         */
        public className: string;

        /**
         * [ObservableProperty] Gets or sets a value indicating whether the control is currently enabled.
         */
        public isEnabled: boolean;

        /**
         * [ObservableProperty] Gets or sets a value indicating whether the control is visible or not.
         */
        public isVisible: boolean;

        /**
         * [ObservableProperty] Gets or sets the tooltip to diplay when hovering on the control. The default behaviour in
         * TemplateControl is that setting tooltip doesn't do anything. Tooltip should be set in the template by controlbinding
         * or in code by the derived controls.
         */
        public tooltip: string;

        /**
         * Constructor
         * @param templateId The templateId to use with this control. If not provided the template root will be a <div> element.
         */
        constructor(templateId?: string) {
            super();

            // Call onInitialize before we set the rootElement
            this.onInitializeOverride();

            this._templateId = templateId;
            this.setRootElementFromTemplate();
        }

        /**
         * Gets the data model assigned to the control
         */
        public get model(): any {
            return this._model;
        }

        /**
         * Sets the data model on the control
         */
        public set model(value: any) {
            if (this._model !== value) {
                this._model = value;
                this.propertyChanged.invoke(TemplateControl.ModelPropertyName);
                this.onModelChanged();
            }
        }

        /**
         * Gets the tabIndex value for the control.
         */
        public get tabIndex(): number {
            if (this._tabIndex) {
                return this._tabIndex;
            }

            return 0;
        }

        /**
         * Sets the tabIndex value for the control.
         */
        public set tabIndex(value: number) {
            if (this._tabIndex !== value) {
                var oldValue = this._tabIndex;
                this._tabIndex = value >> 0;   // Making sure the passed value is a number
                this.propertyChanged.invoke(TemplateControl.TabIndexPropertyName);
                this.onTabIndexChanged(oldValue, this._tabIndex);
            }
        }

        /**
         * Gets the templateId used on the control
         */
        public get templateId(): string {
            return this._templateId;
        }

        /**
         * Sets a new templateId on the control
         */
        public set templateId(value: string) {
            if (this._templateId !== value) {
                this._templateId = value;
                this._binding.unbind();
                this.setRootElementFromTemplate();
                this.propertyChanged.invoke(TemplateControl.TemplateIdPropertyName);
            }
        }

        /**
         * Static constructor used to initialize observable properties
         */
        public static initialize(): void {
            Common.ObservableHelpers.defineProperty(TemplateControl, TemplateControl.ClassNamePropertyName, /*defaultValue=*/ null, (obj: TemplateControl, oldValue: string, newValue: string) => obj.onClassNameChanged(oldValue, newValue));
            Common.ObservableHelpers.defineProperty(TemplateControl, TemplateControl.IsEnabledPropertyName, /*defaultValue=*/ true, (obj: TemplateControl) => obj.onIsEnabledChanged());
            Common.ObservableHelpers.defineProperty(TemplateControl, TemplateControl.IsVisiblePropertyName, /*defaultValue=*/ true, (obj: TemplateControl) => obj.onIsVisibleChanged());
            Common.ObservableHelpers.defineProperty(TemplateControl, TemplateControl.TooltipPropertyName, /*defaultValue=*/ null, (obj: TemplateControl) => obj.onTooltipChanged());
        }

        /**
         * Gets the binding that represents the given destination and destination property
         * @param destination The destination object
         * @param destinationProperty The name of the destination property
         * @returns the binding object that is associated with the given destination
         */
        public getBinding(destination: any, destinationProperty: string): Binding {
            var binding: Binding;

            if (this._binding) {
                binding = this._binding.findBinding(destination, destinationProperty);
            }

            return binding;
        }

        /**
         * Protected virtual function used to notify subclasses that the template has changed
         */
        public onApplyTemplate(): void {
            this.onClassNameChanged(null, this.className);
            this.onIsVisibleChanged();
            this.onTabIndexChanged(null, this._tabIndex);
            this.onTooltipChanged();
        }

        /**
         * Protected virtual function called when initializing the control instance
         */
        public onInitializeOverride(): void {
        }

        /**
         * Protected virtual function used to notify subclasses that the model has changed
         */
        public onModelChanged(): void {
        }

        /**
         * Protected virtual function used to notify subclasses that the template is about to change.
         * Can used to perform cleanup on the previous root element
         */
        public onTemplateChanging(): void {
        }

        /**
         * Helper method to get a named control direct child from the subtree of the control, ignoring nested controls
         */
        public getNamedControl(name: string): IControl {
            var element: HTMLElement = this.getNamedElement(name);
            if (!element) {
                return null;
            }

            return (<IHTMLControlLink><any>element).control;
        }

        /**
         * Helper method to get a named element from the subtree of the control, ignoring nested controls
         */
        public getNamedElement(name: string): HTMLElement {
            var elements: HTMLElement[] = [];
            elements.push(this.rootElement);

            while (elements.length > 0) {
                var element: HTMLElement = elements.pop();

                if (element.getAttribute(TemplateDataAttributes.NAME) === name) {
                    return element;
                }

                // Don't traverse through control children elements
                if (element.children && (!element.hasAttribute(TemplateDataAttributes.CONTROL) || element === this.rootElement)) {
                    var childrenCount = element.children.length;
                    for (var i = 0; i < childrenCount; i++) {
                        elements.push(<HTMLElement>element.children[i]);
                    }
                }
            }

            return null;
        }

        /**
         * Protected overridable method. Gets called when isEnabled value changes
         */
        public onIsEnabledChangedOverride(): void {
        }

        /**
         * Protected overridable method. Gets called when isVisible value changes
         */
        public onIsVisibleChangedOverride(): void {
        }

        /**
         * Protected override method. Gets called when the tabIndex value changes
         */
        public onTabIndexChangedOverride(): void {
        }

        /**
         * Protected overridable method. Gets called when tooltip value changes
         */
        public onTooltipChangedOverride(): void {
        }

        private onClassNameChanged(oldValue: string, newValue: string): void {
            if (this.rootElement) {
                if (oldValue) {
                    var oldClasses = oldValue.split(" ");
                    for (var i = 0; i < oldClasses.length; i++) {
                        this.rootElement.classList.remove(oldClasses[i]);
                    }
                }

                if (newValue) {
                    var newClasses = newValue.split(" ");
                    for (var i = 0; i < newClasses.length; i++) {
                        this.rootElement.classList.add(newClasses[i]);
                    }
                }
            }
        }

        /**
         * Handles a change to the isEnabled property
         */
        private onIsEnabledChanged(): void {
            if (this.rootElement) {
                if (this.isEnabled) {
                    this.rootElement.classList.remove(TemplateControl.CLASS_DISABLED);
                    this.rootElement.removeAttribute("aria-disabled");
                    this.onTabIndexChanged(this._tabIndex, this._tabIndex);
                } else {
                    this.rootElement.classList.add(TemplateControl.CLASS_DISABLED);
                    this.rootElement.setAttribute("aria-disabled", true.toString());
                    this.rootElement.tabIndex = -1;
                }

                this.onIsEnabledChangedOverride();
            }
        }

        /**
         * Handles a change to the isVisible property
         */
        private onIsVisibleChanged(): void {
            if (this.rootElement) {
                if (this.isVisible) {
                    this.rootElement.classList.remove(TemplateControl.CLASS_HIDDEN);
                    this.rootElement.removeAttribute("aria-hidden");
                    this.onTabIndexChanged(this._tabIndex, this._tabIndex);
                } else {
                    this.rootElement.classList.add(TemplateControl.CLASS_HIDDEN);
                    this.rootElement.setAttribute("aria-hidden", "true");
                    this.rootElement.tabIndex = -1;
                }

                this.onIsVisibleChangedOverride();
            }
        }

        /**
         * Handles a change to the tabIndex property
         */
        private onTabIndexChanged(oldValue: number, newValue: number): void {
            if (this.rootElement) {
                // Only set tabIndex on the root when the control is enabled and visible. Otherwise the isEnabled 
                // and isVisible change handlers will call this method to update the tabIndex on the element.
                if (this.isEnabled && this.isVisible) {
                    // Only set it on the rootElement if either we had a value or we got assigned a new value
                    // This way we don't set a 0 tabIndex on all elements at initialization
                    if (oldValue || newValue || newValue === 0) {
                        this.rootElement.tabIndex = newValue;
                    }
                }

                // Do the check here because the isEnabled handler will call us without really changing the tabIndex value
                if (oldValue !== newValue) {
                    this.onTabIndexChangedOverride();
                }
            }
        }

        /**
         * Handles a change to the tooltip property
         */
        private onTooltipChanged(): void {
            if (this.rootElement) {
                this.onTooltipChangedOverride();
            }
        }

        /**
         * Sets the rootElement from the current templateId and initialize 
         * bindings relationships
         */
        private setRootElementFromTemplate(): void {
            var previousRoot: HTMLElement;

            // Notify subclasses that the template is about to change
            this.onTemplateChanging();

            // Unattach ourselves from the previous rootElement before we 
            // create a new rootElement
            if (this.rootElement) {
                previousRoot = this.rootElement;
                (<IHTMLControlLink><any>this.rootElement).control = null;
            }

            if (this._templateId) {
                this.rootElement = templateLoader.loadTemplate(this._templateId);
            } else {
                this.rootElement = document.createElement("div");
            }

            // Copy only the original name to the new root
            if (previousRoot) {
                var attr: Attr = (<any>previousRoot.attributes).getNamedItem(TemplateDataAttributes.NAME);
                if (attr) {
                    this.rootElement.setAttribute(attr.name, attr.value);
                }
            }

            (<IHTMLControlLink><any>this.rootElement).control = this;

            this._binding = new TemplateDataBinding(this);

            // If the previous root has a parentElement then replace it with the new root
            if (previousRoot && previousRoot.parentElement) {
                previousRoot.parentElement.replaceChild(this.rootElement, previousRoot);
            }

            this.onApplyTemplate();
        }
    }

    TemplateControl.initialize();
}
