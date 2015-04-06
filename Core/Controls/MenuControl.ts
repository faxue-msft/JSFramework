//
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="../assert.ts" />
/// <reference path="ControlUtilities.ts" />
/// <reference path="PopupControl.ts" />
/// <reference path="MenuItem.ts" />
/// <reference path="Button.ts" />

/// <disable code="SA1201" rule="ElementsMustAppearInTheCorrectOrder" justification="egregious TSSC rule"/>

module Common.Controls {
    "use strict";

    /**
     * A MenuControl class which is templatable and provide menu functionality
     */
    export class MenuControl extends PopupControl {
        /** CSS class to apply to the menu item root element when it's selected */
        private static CLASS_SELECTED: string = "selected";

        private _focusInHandler: (e: FocusEvent) => void;
        private _menuItemsClickRegistration: IEventRegistration[];
        private _menuItemsPropChangedRegistration: IEventRegistration[];
        private _selectedIndex: number;

        public static MenuItemsTemplateIdPropertyName = "menuItemsTemplateId";
        public static SelectedItemPropertyName = "selectedItem";

        /** When set, the menu will dismiss when any menu item clicked */
        public dismissOnMenuItemClick: boolean;

        /** Array containing all menu items */
        public menuItems: MenuItem[];

        /**
         * [ObservableProperty] Gets or sets a value for the template used to load menu items inside the control.
         */
        public menuItemsTemplateId: string;

        /**
         * [ObservableProperty] Gets or sets the current selected menu item in the control.
         */
        public selectedItem: MenuItem;

        /**
         * @constructor
         * As part of initialization, caches references to event handler instances and loads the template content.
         * @param templateId: Optional template id for the control. Default template is Common.menuControlTemplate.
         */
        constructor(templateId?: string) {
            this._focusInHandler = (e: FocusEvent) => this.onFocusIn(e);
            this._selectedIndex = -1;
            this._menuItemsClickRegistration = [];
            this._menuItemsPropChangedRegistration = [];
            this.menuItems = [];

            super(templateId || "Common.menuControlTemplate");
        }

        /**
         * Initializes the observable properties which should be performed once per each class.
         */
        public static initialize(): void {
            Common.ObservableHelpers.defineProperty(MenuControl, MenuControl.MenuItemsTemplateIdPropertyName, /*defaultValue=*/ null, (obj: MenuControl, oldValue: string, newValue: string) => obj.onMenuTemplateIdChanged(oldValue, newValue));
            Common.ObservableHelpers.defineProperty(MenuControl, MenuControl.SelectedItemPropertyName, /*defaultValue=*/ null, (obj: MenuControl) => obj.onSelectedItemChanged());
        }

        /**
         * Attach a handler to the given menu item
         * @param menu item name of the control as provided in data-name attribute
         * @param clickHandler Click handler to be added to the menu item
         */
        public addClickHandlerToMenuItem(menuItemName: string, clickHandler: IEventHandler<Event>): void {
            var element: IHTMLControlLink = <any>this.getNamedElement(menuItemName);
            if (element && element.control) {
                (<Common.Controls.MenuItem>element.control).click.addHandler(clickHandler);
            }
        }

        /**
         * Protected overridable. Handles a change to the isVisible property. Updates the menu controls display properties and event handlers.
         */
        public onIsVisibleChangedOverride(): void {
            super.onIsVisibleChangedOverride();

            if (this.isVisible) {
                this.rootElement.addEventListener("focusin", this._focusInHandler);

                // Always reset the selected index when the menu opens
                this.selectedItem = null;
                for (var i = 0; i < this.menuItems.length; i++) {
                    this.menuItems[i].rootElement.classList.remove(MenuControl.CLASS_SELECTED);
                }
            } else {
                this.rootElement.removeEventListener("focusin", this._focusInHandler);
            }
        }

        /**
         * Protected overridable method. Gets called on the keyup event.
         * @param e the keyboard event object
         * @returns true if the event was handled and no need for extra processing
         */
        public onKeyUpOverride(e: KeyboardEvent): boolean {
            var handled = false;

            switch (e.keyCode) {
                case Common.KeyCodes.ArrowDown:
                    this.changeSelection(NavigationDirection.Next);
                    handled = true;
                    break;
                case Common.KeyCodes.ArrowUp:
                    this.changeSelection(NavigationDirection.Previous);
                    handled = true;
                    break;
                case Common.KeyCodes.Space:
                case Common.KeyCodes.Enter:
                    this.pressSelectedItem();
                    handled = true;
                    break;
            }

            if (!handled) {
                handled = super.onKeyUpOverride(e);
            }

            return handled;
        }

        private onMenuItemClick(): void {
            if (this.dismissOnMenuItemClick) {
                this.isVisible = false;
            }
        }

        /**
         * Handles update of the menu items in the same group when one of the menu items in that group is changed.
         * @param menuItem A menu item which is changed.
         * @param propertyName Name of the observable property which was changed on the menu item.
         */
        private onMenuItemPropertyChanged(menuItem: MenuItem, propertyName: string): void {
            if (propertyName === "isChecked" || propertyName === "groupName") {
                if (menuItem.groupName && menuItem.isChecked) {
                    // If a menu item is checked, then it unchecks other menu items in the same group. If a menu item is added to the
                    // group and is checked, then it unchecks menu items of the same group.
                    for (var index = 0; index < this.menuItems.length; index++) {
                        var item: MenuItem = this.menuItems[index];

                        if (item !== menuItem && item.groupName === menuItem.groupName && item.isChecked) {
                            item.isChecked = false;
                        }
                    }
                }
            }
        }

        /**
         * Handles a change to menuTemplateId. Resets the menuItems arrays with new menuItems
         * @param oldValue The old value for the property
         * @param newValue The new value for the property
         */
        private onMenuTemplateIdChanged(oldValue: string, newValue: string): void {
            // Unregister the event handlers of the previous menu items if they exist
            while (this._menuItemsPropChangedRegistration.length > 0) {
                this._menuItemsPropChangedRegistration.pop().unregister();
            }

            while (this._menuItemsClickRegistration.length > 0) {
                this._menuItemsClickRegistration.pop().unregister();
            }

            if (newValue) {
                this.menuItems = [];
                this.selectedItem = null;
                this._menuItemsPropChangedRegistration = [];
                this._menuItemsClickRegistration = [];

                var menuItemElements = this.rootElement.querySelectorAll("li[" + TemplateDataAttributes.CONTROL + "]");
                for (var index = 0; index < menuItemElements.length; index++) {
                    var menuItemElement = <Common.IHTMLControlLink><any>menuItemElements[index];
                    F12.Tools.Utility.Assert.isTrue(!!menuItemElement.control, "All menuItemElements must have a control");

                    var menuItem = <Common.Controls.MenuItem>menuItemElement.control;
                    this.menuItems.push(menuItem);

                    this._menuItemsPropChangedRegistration.push(menuItem.propertyChanged.addHandler(this.onMenuItemPropertyChanged.bind(this, menuItem)));
                    this._menuItemsClickRegistration.push(menuItem.click.addHandler(this.onMenuItemClick.bind(this)));
                }
            }
        }

        /**
         * Handles a change to selectedItem.
         */
        private onSelectedItemChanged(): void {
            if (!this.selectedItem) {
                this.setSelectedIndex(-1, false);
            } else {
                var itemIndex: number = this.menuItems.indexOf(this.selectedItem);
                if (itemIndex !== this._selectedIndex) {
                    this.setSelectedIndex(itemIndex, /*setFocus =*/ false);
                }
            }
        }

        private onFocusIn(e: FocusEvent): void {
            // Find the menu item which contains the target and set it as the selected index
            var menuItemIndex = 0;
            for (; menuItemIndex < this.menuItems.length; menuItemIndex++) {
                var menuItem: MenuItem = this.menuItems[menuItemIndex];
                if (menuItem.rootElement.contains(<HTMLElement>e.target)) {
                    break;
                }
            }

            if (menuItemIndex < this.menuItems.length) {
                this.setSelectedIndex(menuItemIndex, /*setFocus=*/ false);
            }
        }

        /**
         * Changes the selection to the next or the previous menu item
         * @param direction A direction to move selection in (Next/Previous)
         */
        private changeSelection(direction: NavigationDirection): void {
            if (this.menuItems.length === 0) {
                return;
            }

            var step = (direction === NavigationDirection.Next) ? 1 : -1;

            var startingMenuItem = this.menuItems[this._selectedIndex];
            var newMenuItem: MenuItem;
            var newIndex: number = this._selectedIndex;

            // Find the first next/previous menu item that is visibile and enabled
            do {
                newIndex = (newIndex + step) % this.menuItems.length;
                if (newIndex < 0) {
                    newIndex = this.menuItems.length - 1;
                }

                newMenuItem = this.menuItems[newIndex];
                if (!startingMenuItem) {
                    startingMenuItem = newMenuItem;
                } else if (newMenuItem === startingMenuItem) {
                    break; // looped over to reach the same starting item
                }
            } while (!(newMenuItem.isVisible && newMenuItem.isEnabled));

            if (newMenuItem.isVisible && newMenuItem.isEnabled) {
                this.setSelectedIndex(newIndex, /*setFocus=*/ true);
            }
        }

        /**
         * Call press method on the selected menu item
         */
        private pressSelectedItem(): void {
            var selectedItem: MenuItem = this.menuItems[this._selectedIndex];

            if (selectedItem) {
                selectedItem.press();
            }
        }

        /**
         * Sets the selected index to the given index
         * @param newIndex the index to set to
         * @param setFocus, if true the method will set focus on the menu item
         */
        private setSelectedIndex(newIndex: number, setFocus: boolean): void {
            if (this._selectedIndex >= 0 && this._selectedIndex < this.menuItems.length) {
                this.menuItems[this._selectedIndex].rootElement.classList.remove(MenuControl.CLASS_SELECTED);
            }

            this._selectedIndex = newIndex;

            var menuItem: MenuItem = this.menuItems[this._selectedIndex];
            if (menuItem) {
                menuItem.rootElement.classList.add(MenuControl.CLASS_SELECTED);

                if (setFocus) {
                    menuItem.rootElement.focus();
                }

                this.selectedItem = menuItem;
            }
        }
    }

    MenuControl.initialize();
}
