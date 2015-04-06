// 
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="../Assert.ts" />
/// <reference path="../Framework/Model/ObservableCollection.ts" />
/// <reference path="../Framework/Templating/TemplateControl.ts" />
/// <reference path="Button.ts" />
/// <reference path="ItemsControl.ts" />

module Common.Controls {
    "use strict";

    /**
     * A control which adds scrolling and selection to an ItemsControl
     */
    export class RibbonControl extends ItemsControl {
        /** CSS class to apply to the menu item root element when it's selected */
        private static HORIZONTAL_PANEL_CLASS = "BPT-horizontalRibbonPanel";
        private static PANEL_CLASS = "BPT-ribbonPanel";
        private static SELECTED_ITEM_CLASS = "BPT-selected";

        private _backwardScrollButton: Button;
        private _backwardScrollHandler: () => void;
        private _forwardScrollButton: Button;
        private _forwardScrollHandler: () => void;
        private _lengthProperty: string;
        private _offsetProperty: string;
        private _onFocusInHandler: (e: FocusEvent) => void;
        private _onFocusOutHandler: (e: FocusEvent) => void;
        private _onKeyDownhandler: (e: KeyboardEvent) => boolean;
        private _panelTabIndex: number;
        private _positioningProperty: string;
        private _selectedItem: any;
        private _currentOffset: number;

        public static BackwardScrollButtonName = "_backwardScrollButton";
        public static ForwardScrollButtonName = "_forwardScrollButton";
        public static IsVerticalPropertyName = "isVertical";
        public static ScrollIncrementPropertyName = "scrollIncrement";
        public static ScrollPositionPropertyName = "scrollPosition";
        public static SelectedIndexPropertyName = "selectedIndex";
        public static SelectedItemPropertyName = "selectedItem";

        /**
         * [ObservableProperty] Determines whether the ribbon should scroll vertically or horizontally
         */
        public isVertical: boolean;

        /**
         * [ObservableProperty] Gets or sets the number of items to scroll by on each click
         */
        public scrollIncrement: number;

        /**
         * [ObservableProperty] Gets or sets the item that should be displayed first in the ribbon
         */
        public scrollPosition: number;

        /**
         * [ObservableProperty] Gets or sets the index of the item to mark as selected
         */
        public selectedIndex: number;

        /**
         * Constructor
         * @param templateId The id of the template to apply to the control. 
         */
        constructor(templateId?: string) {
            this._currentOffset = 0;
            this._backwardScrollHandler = () => this.scrollBackward();
            this._forwardScrollHandler = () => this.scrollForward();
            this._onFocusInHandler = (e: FocusEvent) => this.onFocusIn(e);
            this._onFocusOutHandler = (e: FocusEvent) => this.onFocusOut(e);
            this._onKeyDownhandler = (e: KeyboardEvent) => { return this.onKeyDown(e); };

            super(templateId);

            this.selectedItem = null;
        }

        /**
         * [ObservableProperty] The selected item in the ribbon (null if nothing is selected)
         */
        public get selectedItem(): any { return this._selectedItem; }
        public set selectedItem(value: any) {
            if (value !== this._selectedItem) {
                var itemIndex = this.getItemCount() === 0 ? undefined : this.getIndex(value);
                if (itemIndex !== undefined) {
                    this._selectedItem = value;
                    this.selectedIndex = itemIndex;
                } else {
                    this._selectedItem = null;
                    this.selectedIndex = null;
                }

                this.propertyChanged.invoke(RibbonControl.SelectedItemPropertyName);
            }
        }

        public static initialize(): void {
            Common.ObservableHelpers.defineProperty(RibbonControl, RibbonControl.IsVerticalPropertyName, /*defaultValue=*/ false, (obj: RibbonControl) => obj.onIsVerticalChanged());
            Common.ObservableHelpers.defineProperty(RibbonControl, RibbonControl.ScrollIncrementPropertyName, /*defaultValue=*/ 1, (obj: RibbonControl) => obj.updateButtons());
            Common.ObservableHelpers.defineProperty(RibbonControl, RibbonControl.ScrollPositionPropertyName, /*defaultValue=*/ 0, (obj: RibbonControl) => obj.onScrollPositionChanged());
            Common.ObservableHelpers.defineProperty(RibbonControl, RibbonControl.SelectedIndexPropertyName, /*defaultValue=*/ null, (obj: RibbonControl, oldValue: number, newValue: number) => obj.onSelectedIndexChanged(oldValue, newValue));
        }

        public scrollBackward(): void {
            this.scrollPosition = Math.max(this.scrollPosition - this.scrollIncrement, 0);
        }

        public scrollForward(): void {
            if (this.scrollPosition + this.scrollIncrement < this.getItemCount()) {
                this.scrollPosition += this.scrollIncrement;
            }
        }

        /**
         * Updates the control when the template has changed.
         */
        public onApplyTemplate(): void {
            super.onApplyTemplate();

            this._panelTabIndex = this.panelRootElement.tabIndex;
            this.panelRootElement.classList.add(RibbonControl.PANEL_CLASS);
            this.onIsVerticalChanged();

            this.initializeButtons();
            this.initializeKeyboard();
            this.refresh();
        }

        /**
         * Protected virtual function used to notify subclasses that the template is about to change.
         * Can used to perform cleanup on the previous root element
         */
        public onTemplateChanging(): void {
            if (this.panelRootElement) {
                this.cleanupKeyboard();
                this.cleanupButtons();

                this.selectedIndex = null;
                this.scrollPosition = 0;
                this.panelRootElement.classList.remove(RibbonControl.HORIZONTAL_PANEL_CLASS);
                this.panelRootElement.classList.remove(RibbonControl.PANEL_CLASS);
                this._panelTabIndex = null;
            }

            super.onTemplateChanging();
        }

        public onItemsChangedOverride(): void {
            super.onItemsChangedOverride();
            this.resetState();
        }

        public onCollectionChangedOverride(args: ICollectionChangedEventArgs<any>): void {
            super.onCollectionChangedOverride(args);
            this.resetState();
        }

        /**
         * If placed within a PopupControl or the like, display changes cannot be applied while hidden,
         * and the UI for the RibbonControl will need to be refreshed when shown.
         */
        public refresh(): void {
            this.onScrollPositionChanged();
            this.displaySelected();
            this.updateButtons();
        }

        private onIsVerticalChanged(): void {
            // Clear scroll in existing orientation
            this.setOffset(0);

            if (!this.isVertical) {
                this._lengthProperty = "offsetWidth";
                this._offsetProperty = "offsetLeft";
                this._positioningProperty = "left";
                this.panelRootElement.classList.add(RibbonControl.HORIZONTAL_PANEL_CLASS);
            } else {
                this._lengthProperty = "offsetHeight";
                this._offsetProperty = "offsetTop";
                this._positioningProperty = "top";
                this.panelRootElement.classList.remove(RibbonControl.HORIZONTAL_PANEL_CLASS);
            }

            // Refresh to display in new orientation
            this.refresh();
        }

        private onScrollPositionChanged(): void {
            this.updateButtons();

            if (this.getItemCount() === 0) {
                F12.Tools.Utility.Assert.areEqual(0, this.scrollPosition);
                this.setOffset(0);
                return;
            }

            F12.Tools.Utility.Assert.isTrue(this.scrollPosition >= 0 && this.scrollPosition < this.getItemCount(), "Scrolled to invalid position");

            var displayChild = <any>(this.panelRootElement.children[this.scrollPosition]);

            this.setOffset(this._currentOffset + displayChild[this._offsetProperty]);
        }

        private onSelectedIndexChanged(oldValue: number, newValue: number): void {
            // Clear the old selection if it exists
            if (oldValue !== null && oldValue < this.getItemCount()) {
                F12.Tools.Utility.Assert.isTrue(oldValue >= 0 && oldValue < this.getItemCount(), "Invalid existing index " + oldValue);
                (<HTMLElement>this.panelRootElement.children[oldValue]).classList.remove(RibbonControl.SELECTED_ITEM_CLASS);
            }

            if (newValue === null) {
                this.selectedItem = null;
            } else {
                F12.Tools.Utility.Assert.isTrue(this.selectedIndex >= 0 && this.selectedIndex < this.getItemCount(), "Invalid new index " + this.selectedIndex);
                this.selectedItem = this.getItem(newValue);
            }

            this.displaySelected();
        }

        private displaySelected(): void {
            if (this.selectedIndex !== null) {
                var selectedElement: HTMLElement = <HTMLElement>this.panelRootElement.children[this.selectedIndex];
                F12.Tools.Utility.Assert.isTrue(!!selectedElement, "No HTML element for selected index: " + this.selectedIndex);

                this.scrollIntoView(selectedElement);
                selectedElement.classList.add(RibbonControl.SELECTED_ITEM_CLASS);
            }
        }

        private onFocusIn(e: FocusEvent): void {
            // If focused on item, set it as selected
            var itemIndex = 0;
            var numItems = this.panelRootElement.children.length;
            for (; itemIndex < numItems; itemIndex++) {
                var itemElement: HTMLElement = <HTMLElement>this.panelRootElement.children[itemIndex];
                if (itemElement.contains(<HTMLElement>e.target)) {
                    this.makeTabbable(itemElement);
                    if (this.selectedIndex === itemIndex) {
                        this.displaySelected();
                    } else {
                        this.selectedIndex = itemIndex;
                    }

                    return;
                }
            }

            // Otherwise, trigger focus on the selected item, if there is one
            if (this.selectedIndex !== null) {
                e.preventDefault();
                this.setFocus(<HTMLElement>this.panelRootElement.children[this.selectedIndex]);
            }
        }
        
        private onFocusOut(e: FocusEvent): void {
            // If tabbing out of the panel, make sure the root element is tabbable again
            if (!e.relatedTarget ||
                (<HTMLElement>e.relatedTarget !== this.panelRootElement &&
                !this.panelRootElement.contains(<HTMLElement>e.relatedTarget))) {
                this.makeTabbable(this.panelRootElement);
            }
        }

        /**
         * Protected overridable method. Gets called on the keyup event.
         * @param e the keyboard event object
         * @returns true if the event was handled and no need for extra processing
         */
        private onKeyDown(e: KeyboardEvent): boolean {
            var handled = false;
            var backwardKey = this.isVertical ? Common.KeyCodes.ArrowUp : Common.KeyCodes.ArrowLeft;
            var forwardKey = this.isVertical ? Common.KeyCodes.ArrowDown : Common.KeyCodes.ArrowRight;

            switch (e.keyCode) {
                case forwardKey:
                    this.focusNext();
                    handled = true;
                    break;
                case backwardKey:
                    this.focusPrevious();
                    handled = true;
                    break;
            }

            if (handled) {
                e.stopImmediatePropagation();
            }

            return handled;
        }

        private focusPrevious(): void {
            var newIndex: number;

            if (this.getItemCount() > 0) {
                if (this.selectedIndex === null) {
                    newIndex = this.getItemCount() - 1;
                } else {
                    F12.Tools.Utility.Assert.isTrue((this.selectedIndex >= 0) && (this.selectedIndex < this.getItemCount()), "Invalid selected index");
                    newIndex = Math.max(this.selectedIndex - 1, 0);
                }
                
                this.setFocus(<HTMLElement>this.panelRootElement.children[newIndex]);
            }
        }

        private focusNext(): void {
            var newIndex: number;

            if (this.getItemCount() > 0) {
                if (this.selectedIndex === null) {
                    newIndex = 0;
                } else {
                    F12.Tools.Utility.Assert.isTrue((this.selectedIndex >= 0) && (this.selectedIndex < this.getItemCount()), "Invalid selected index");
                    newIndex = Math.min(this.selectedIndex + 1, this.getItemCount() - 1);
                }

                this.setFocus(<HTMLElement>this.panelRootElement.children[newIndex]);
            }
        }

        private scrollIntoView(element: HTMLElement): void {
            // Figure out the minimum number of scrollIncrements forwards or backwards to place element in view
            if (this.isForwardEdgeOutOfView(element)) {
                for (var position = this.scrollPosition; position < this.getItemCount(); position += this.scrollIncrement) {
                    if (this.isInView(element, position)) {
                        this.scrollPosition = position;
                        return;
                    }
                }

                F12.Tools.Utility.Assert.fail("Could not find a scroll setting that brings element fully into view - is your scrollIncrement too big or your panel incorrectly sized?");
            } else if (this.isBackwardEdgeOutOfView(element)) {
                for (var position = this.scrollPosition; position >= 0; position -= this.scrollIncrement) {
                    if (this.isInView(element, position)) {
                        this.scrollPosition = position;
                        return;
                    }
                }

                F12.Tools.Utility.Assert.fail("Could not find a scroll setting that brings element fully into view - is your scrollIncrement too big or your panel incorrectly sized?");
            }
        }

        private isInView(element: HTMLElement, position?: number): boolean {
            return (!this.isForwardEdgeOutOfView(element, position) && !this.isBackwardEdgeOutOfView(element, position));
        }

        private isBackwardEdgeOutOfView(element: HTMLElement, position?: number): boolean {
            if ((position === undefined) || (position === null)) {
                position = this.scrollPosition;
            }

            var relativeOffset = (<any>element)[this._offsetProperty] - (<any>this.panelRootElement.children[position])[this._offsetProperty];

            return (relativeOffset < 0);
        }

        private isForwardEdgeOutOfView(element: HTMLElement, position?: number): boolean {
            if ((position === undefined) || (position === null)) {
                position = this.scrollPosition;
            }

            var positionedChild = <any>this.panelRootElement.children[position];

            var elementEnd = (<any>element)[this._offsetProperty] + (<any>element)[this._lengthProperty];
            var relativeEndOffset = positionedChild[this._offsetProperty] + (<any>this.panelRootElement)[this._lengthProperty] - elementEnd;    // margin/padding cancels out

            return (relativeEndOffset < 0);
        }

        private updateButtons(): void {
            if (this._backwardScrollButton) {
                F12.Tools.Utility.Assert.hasValue(this._forwardScrollButton);
                this._backwardScrollButton.isEnabled = (this.scrollPosition > 0);
                this._forwardScrollButton.isEnabled = (this.scrollPosition + this.scrollIncrement < this.getItemCount());
            }
        }
        
        private makeTabbable(element: HTMLElement): void {
            this.panelRootElement.removeAttribute("tabIndex");
            if (this.selectedIndex !== null) {
                (<HTMLElement>this.panelRootElement.children[this.selectedIndex]).removeAttribute("tabIndex");
            }
            
            F12.Tools.Utility.Assert.hasValue(this._panelTabIndex);
            element.tabIndex = this._panelTabIndex;
        }

        private setOffset(offset: number): void {
            this._currentOffset = offset;
            var children = <any>this.panelRootElement.children;

            for (var i = 0; i < children.length; i++) {
                children[i].style[this._positioningProperty] = (-offset) + "px";
            }
        }

        private setFocus(element: HTMLElement): void {
            // Prevent focus handler loops
            if (!element.contains(<HTMLElement>document.activeElement)) {
                element.focus();
                // Clear scrollLeft and scrollTop on panel (IE sometimes mistakenly sets this thinking an element is out of view)
                this.panelRootElement.scrollLeft = 0;
                this.panelRootElement.scrollTop = 0;
            }
        }

        private resetState(): void {
            this.selectedIndex = null;
            this.scrollPosition = 0;
            this.refresh();
        }

        private initializeButtons(): void {
            this._backwardScrollButton = <Button>this.getNamedControl(RibbonControl.BackwardScrollButtonName);
            F12.Tools.Utility.Assert.hasValue(this._backwardScrollButton, "RibbonControl template must have a backward button control named " + RibbonControl.BackwardScrollButtonName + " as a direct child");
            this._forwardScrollButton = <Button>this.getNamedControl(RibbonControl.ForwardScrollButtonName);
            F12.Tools.Utility.Assert.hasValue(this._backwardScrollButton, "RibbonControl template must have a forward button control named " + RibbonControl.ForwardScrollButtonName + " as a direct child");

            this._backwardScrollButton.click.addHandler(this._backwardScrollHandler);
            this._forwardScrollButton.click.addHandler(this._forwardScrollHandler);

            this.updateButtons();
        }

        private cleanupButtons(): void {
            if (this._backwardScrollButton) {
                F12.Tools.Utility.Assert.hasValue(this._forwardScrollButton);
                this._backwardScrollButton.isEnabled = false;
                this._forwardScrollButton.isEnabled = false;
                this._backwardScrollButton.click.removeHandler(this._backwardScrollHandler);
                this._forwardScrollButton.click.removeHandler(this._forwardScrollHandler);
                this._backwardScrollButton = null;
                this._forwardScrollButton = null;
            }
        }

        private initializeKeyboard(): void {
            // The only thing that should be tabbable is the panel
            this.rootElement.removeAttribute("tabIndex");
            this._backwardScrollButton.rootElement.removeAttribute("tabIndex");
            this._forwardScrollButton.rootElement.removeAttribute("tabIndex");

            this.getNamedElement(ItemsControl.PanelRootElementName).addEventListener("focusin", this._onFocusInHandler);
            this.getNamedElement(ItemsControl.PanelRootElementName).addEventListener("focusout", this._onFocusOutHandler);
            this.getNamedElement(ItemsControl.PanelRootElementName).addEventListener("keydown", this._onKeyDownhandler);
        }

        private cleanupKeyboard(): void {
            this.getNamedElement(ItemsControl.PanelRootElementName).removeEventListener("focusin", this._onFocusInHandler);
            this.getNamedElement(ItemsControl.PanelRootElementName).removeEventListener("focusout", this._onFocusOutHandler);
            this.getNamedElement(ItemsControl.PanelRootElementName).removeEventListener("keydown", this._onKeyDownhandler);
        }
    }

    RibbonControl.initialize();
}
