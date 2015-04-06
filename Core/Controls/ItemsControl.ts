// 
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="../assert.ts" />
/// <reference path="../Framework/Model/ObservableCollection.ts" />
/// <reference path="../Framework/Templating/TemplateControl.ts" />

module Common.Controls {
    "use strict";

    /**
     * A control which binds to an array or ObservableCollection and generates an item container for each
     */
    export class ItemsControl extends TemplateControl {
        private _collection: ObservableCollection<any>;
        private _collectionChangedRegistration: IEventRegistration;
        private _itemContainerClassType: any;
        private _itemContainerIsTemplateControl: boolean;
        private _itemContainerTemplateId: string;

        /** The root element which will be used to contain all items. If no element was found with this name, the control rootElement is used. */
        public static PanelRootElementName = "_panel";

        /**
         * [ObservableProperty] Gets or sets the array or ObservableCollection to show in the view. 
         */
        public items: any;

        /**
         * [ObservableProperty] Gets or sets the control to use as the item container. You can 
         * specify both the control type and a templateId to pass to the control, ex:
         *    Common.TemplateControl(someTemplate)
         *    MyItemContainer
         */
        public itemContainerControl: string;

        /** A reference to the root element which contains all the items */
        public panelRootElement: HTMLElement;

        /**
         * Constructor
         * @param templateId The id of the template to apply to the control. 
         */
        constructor(templateId?: string) {
            super(templateId);
        }

        /**
         * Static constructor used to initialize observable properties
         */
        public static initialize(): void {
            Common.ObservableHelpers.defineProperty(ItemsControl, "items", "", (obj: ItemsControl, oldValue: any, newValue: any) => obj.onItemsChange(oldValue, newValue));
            Common.ObservableHelpers.defineProperty(ItemsControl, "itemContainerControl", "", (obj: ItemsControl, oldValue: string, newValue: string) => obj.onItemContainerControlChange(oldValue, newValue));
        }

        /**
         * Retrieves the first index of a matching item in the current items collection
         * @param item The item to retrieve
         * @return The requested index, or undefined if the item does not exist
         */
        public getIndex(item: any): number {
            F12.Tools.Utility.Assert.isTrue(!!this._collection, "Expecting a non-null collection in the ItemsControl");
            var index: number = this._collection.indexOf(item);
            if (index !== -1) {
                return index;
            }
        }

        /**
         * Retrieves an item from the current items collection
         * @param index The index of the item to retrieve
         * @return The requested item, or undefined if the item does not exist
         */
        public getItem(index: number): any {
            F12.Tools.Utility.Assert.isTrue(!!this._collection, "Expecting a non-null collection in the ItemsControl");
            return this._collection.getItem(index);
        }

        /**
         * Retrieves the number of items in the current items collection
         * @return The number of items currently in the ItemsControl's collection
         */
        public getItemCount(): number {
            if (!this._collection) {
                return 0;
            }

            return this._collection.length;
        }

        /**
         * Protected override. Handles a change to the tooltip property
         */
        public onTooltipChangedOverride(): void {
            super.onTooltipChangedOverride();
            this.updateTooltip(this.tooltip);
        }

        /**
         * Implemented by the derived class to dispose any events or resources created for the container
         */
        public disposeItemContainerOverride(control: IControl): void {
            // Implemented by the derived class
        }

        /**
         * Implemented by the derived class to allow it to customize the container control
         */
        public prepareItemContainerOverride(control: IControl, item: any): void {
            // Implemented by the derived class
        }

        /**
         * Updates the control when the template has changed.
         */
        public onApplyTemplate(): void {
            super.onApplyTemplate();

            this.panelRootElement = this.getNamedElement(ItemsControl.PanelRootElementName) || this.rootElement;
            F12.Tools.Utility.Assert.isTrue(!!this.panelRootElement, "Expecting a root element for the panel in ItemsControl.");
            this.updateTooltip(this.tooltip);

            this.regenerateItemControls();
        }

        /**
         * Updates the control when the template is about to change.
         */
        public onTemplateChanging(): void {
            this.updateTooltip(null);
            this.removeAllItemControls();

            super.onTemplateChanging();
        }

        /**
         * Overridable and allows sub-classes to update when the items property changes
         */
        public onItemsChangedOverride(): void {
        }

        /**
         * Overridable and allows sub-classes to update when the items container control
         * changes (which results in a full rebuild of the child controls).
         */
        public onItemContainerControlChangedOverride(): void {
        }

        /**
         * Overridable and allows sub-classes to update when the container collection is changed
         */
        public onCollectionChangedOverride(args: ICollectionChangedEventArgs<any>): void {
        }

        private onItemsChange(oldValue: any, newValue: any): void {
            if (this._collectionChangedRegistration) {
                this._collectionChangedRegistration.unregister();
                this._collectionChangedRegistration = null;
            }

            this._collection = null;

            if (this.items) {
                if ((<ObservableCollection<any>>this.items).collectionChanged) {
                    this._collectionChangedRegistration = (<IObservableCollection<any>>this.items).collectionChanged.addHandler(this.onCollectionChanged.bind(this));
                    this._collection = <ObservableCollection<any>>this.items;
                } else {
                    // items is just an array, wrap it with a collection
                    this._collection = new ObservableCollection(this.items);
                }
            }

            this.regenerateItemControls();
            this.onItemsChangedOverride();
        }

        private onItemContainerControlChange(oldValue: string, newValue: string): void {
            this._itemContainerClassType = null;
            this._itemContainerTemplateId = null;
            this._itemContainerIsTemplateControl = false;

            if (this.itemContainerControl) {
                var parts: string[] = this.itemContainerControl.split(/[()]/, 2);
                if (parts && parts.length > 0) {
                    // Retrieve the classname and verify it's a valid string.
                    var className: string = parts[0];
                    if (className) {
                        className = className.trim();
                    }

                    F12.Tools.Utility.Assert.isTrue(!!className, "Invalid itemContainerControl value. The control class name is required.");

                    // templateId can be null or empty. So, no checks for it.
                    var templateId: string = parts[1];
                    if (templateId) {
                        templateId = templateId.trim();
                    }

                    this._itemContainerClassType = TemplateLoader.getControlType(className);
                    this._itemContainerTemplateId = templateId;
                    this._itemContainerIsTemplateControl = this._itemContainerClassType === Common.TemplateControl || this._itemContainerClassType.prototype instanceof Common.TemplateControl;
                }
            }

            this.regenerateItemControls();
            this.onItemContainerControlChangedOverride();
        }

        private onCollectionChanged(args: ICollectionChangedEventArgs<any>): void {
            switch (args.action) {
                case CollectionChangedAction.Add:
                    this.insertItemControls(args.newStartingIndex, args.newItems.length);
                    break;
                case CollectionChangedAction.Clear:
                    this.removeAllItemControls();
                    break;
                case CollectionChangedAction.Remove:
                    this.removeItemControls(args.oldStartingIndex, args.oldItems.length);
                    break;
                case CollectionChangedAction.Reset:
                    this.regenerateItemControls();
                    break;
            }

            this.onCollectionChangedOverride(args);
        }

        private createItemControl(item: any): IControl {
            var control: IControl = new this._itemContainerClassType(this._itemContainerTemplateId);

            this.prepareItemContainer(control, item);

            return control;
        }

        private disposeItemContainer(control: IControl): void {
            this.disposeItemContainerOverride(control);

            if (control && (<TemplateControl>control).model) {
                (<TemplateControl>control).model = null;
            }
        }

        private prepareItemContainer(control: IControl, item: any): void {
            if (this._itemContainerIsTemplateControl) {
                (<TemplateControl>control).model = item;
            }

            this.prepareItemContainerOverride(control, item);
        }

        private regenerateItemControls(): void {
            this.removeAllItemControls();

            if (!this._collection) {
                return;
            }

            this.insertItemControls(0, this._collection.length);
        }

        private insertItemControls(itemIndex: number, count: number): void {
            if (!this._itemContainerClassType) {
                return;
            }

            var end: number = itemIndex + count;
            F12.Tools.Utility.Assert.isTrue(end <= this._collection.length, "Unexpected range after inserting into items.");
            F12.Tools.Utility.Assert.isTrue(itemIndex <= this.panelRootElement.childElementCount, "Collection and child elements mismatch.");

            if (itemIndex === this.panelRootElement.childElementCount) {
                // We are adding items at the end, use appendChild
                for (var i = itemIndex; i < end; i++) {
                    var item: any = this._collection.getItem(i);
                    var control: IControl = this.createItemControl(item);
                    this.panelRootElement.appendChild(control.rootElement);
                }
            } else {
                // We are adding items in the middle, use insertBefore.
                // Find the node we would want to insert before.
                var endNode = <HTMLElement>this.panelRootElement.childNodes.item(itemIndex);

                for (var i = itemIndex; i < end; i++) {
                    var item: any = this._collection.getItem(i);
                    var control: IControl = this.createItemControl(item);
                    this.panelRootElement.insertBefore(control.rootElement, endNode);
                }
            }
        }

        private removeAllItemControls(): void {
            if (this.panelRootElement) {
                var children: HTMLCollection = this.panelRootElement.children;
                var childrenLength: number = children.length;
                for (var i = 0; i < childrenLength; i++) {
                    var control = <TemplateControl>(<IHTMLControlLink><any>children[i]).control;
                    this.disposeItemContainer(control);
                }

                this.panelRootElement.innerHTML = "";
            }
        }

        private removeItemControls(itemIndex: number, count: number): void {
            for (var i = itemIndex + count - 1; i >= itemIndex; i--) {
                var element: HTMLElement = <HTMLElement>this.panelRootElement.children[i];
                if (element) {
                    var control = <TemplateControl>(<IHTMLControlLink><any>element).control;
                    this.disposeItemContainer(control);
                    this.panelRootElement.removeChild(element);
                }
            }
        }

        private updateTooltip(tooltip: string): void {
            if (this.panelRootElement) {
                if (tooltip) {
                    this.panelRootElement.setAttribute("data-plugin-vs-tooltip", tooltip);
                    this.panelRootElement.setAttribute("aria-label", tooltip);
                } else {
                    this.panelRootElement.removeAttribute("data-plugin-vs-tooltip");
                    this.panelRootElement.removeAttribute("aria-label");
                }
            }
        }
    }

    ItemsControl.initialize();
}
