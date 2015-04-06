//
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="../assert.ts" />
/// <reference path="ControlUtilities.ts" />
/// <reference path="Panel.ts" />
/// <reference path="ContentControl.ts" />

/// <disable code="SA1513" rule="ClosingCurlyBracketMustBeFollowedByBlankLine" justification="tscop is not liking do/while syntax"/>

module Common.Controls {
    "use strict";

    /**
     * A toolbar class which is templatable and provides toolbar functionality
     */
    export class ToolbarControl extends Panel {
        private static TOOLBAR_PANEL_ELEMENT_NAME = "_toolbarPanel";

        private _activeIndex: number;
        private _controls: Common.TemplateControl[];
        private _controlsPropChangedRegistration: IEventRegistration[];
        private _focusInHandler: (e: FocusEvent) => void;
        private _toolbarKeyHandler: (e: KeyboardEvent) => void;
        private _toolbarPanel: HTMLElement;

        public static PanelTemplateIdPropertyName = "panelTemplateId";
        public static TitlePropertyName = "title";

        /**
         * [ObservableProperty] Gets or sets the templateId of the toolbar panel which holds the toolbar controls (i.e. Buttons)
         */
        public panelTemplateId: string;

        /**
         * [ObservableProperty] Gets or sets the title of the toolbar
         */
        public title: string;

        /**
         * Constructor
         * @constructor
         * @param templateId The id of the template to apply to the control, for example: Common.toolbarTemplateWithSearchBox.
         *        Default is Common.defaultToolbarTemplate.
         */
        constructor(templateId?: string) {
            this._activeIndex = -1;
            this._controls = [];
            this._controlsPropChangedRegistration = [];
            this._focusInHandler = (e: FocusEvent) => this.onFocusIn(e);
            this._toolbarKeyHandler = (e: KeyboardEvent): void => this.onToolbarKeyboardEvent(e);
            this._toolbarPanel = null;

            super(templateId || "Common.defaultToolbarTemplate");

            if ((<any>Plugin).F12) {
                // Add the listener for host changing event
                (<any>Plugin).F12.addEventListener("hostinfochanged", (e: Event) => this.onHostInfoChanged(e));
                this.onHostInfoChanged((<any>Plugin).F12.getHostInfo());
            }
        }

        /**
         * Static constructor used to initialize observable properties
         */
        public static initialize(): void {
            Common.ObservableHelpers.defineProperty(ToolbarControl, ToolbarControl.PanelTemplateIdPropertyName, /*defaultValue=*/ "", (obj: ToolbarControl, oldValue: string, newValue: string) => obj.onPanelTemplateIdChanged(oldValue, newValue));
            Common.ObservableHelpers.defineProperty(ToolbarControl, ToolbarControl.TitlePropertyName, /*defaultValue=*/ "");
        }

        /**
         * Gets the active element that should have focus when tapping into the toolbar
         * @return The active element (or null if none if there isn't an active element)
         */
        public getActiveElement(): HTMLElement {
            if (this._activeIndex >= 0 && this._activeIndex < this._controls.length) {
                return this._controls[this._activeIndex].rootElement;
            }

            return null;
        }

        /**
         * Moves focus to the next/previous control
         * @param direction A direction to move selection in (Next/Previous)
         */
        private moveToControl(direction: NavigationDirection): void {
            var step = (direction === NavigationDirection.Next) ? 1 : this._controls.length - 1;

            var focusedElement = <HTMLElement>document.activeElement;

            if (this._controls.length === 0 || this._activeIndex === -1 || !focusedElement) {
                return;
            }

            var startIndex: number = this._activeIndex;

            // We need to find the startIndex form the document's activeElement if it's inside the toolbar
            // Because we can have a button that still has focus when it got disabled. So, in this case
            // while _activeIndex already moved, we still want to start from that index.
            for (var i = 0; i < this._controls.length; i++) {
                if (this._controls[i].rootElement === focusedElement) {
                    startIndex = i;
                    break;
                }
            }

            var currentIndex: number = startIndex;

            // Find the next visible and enabled control to focus (wrapping around the end/start if needed)
            while (startIndex !== (currentIndex = (currentIndex + step) % this._controls.length)) {
                var control: TemplateControl = this._controls[currentIndex];
                if (control.isVisible && control.isEnabled) {
                    this.setActiveIndex(currentIndex, /*setFocus=*/ true);
                    break;
                }
            }
        }

        private onFocusIn(e: FocusEvent): void {
            // Find the control which contains the target and set it as the active index
            var controlIndex = 0;
            for (; controlIndex < this._controls.length; controlIndex++) {
                var control: TemplateControl = this._controls[controlIndex];
                if (control.rootElement.contains(<HTMLElement>e.target)) {
                    break;
                }
            }

            if (controlIndex < this._controls.length) {
                this.setActiveIndex(controlIndex);
            }
        }

        /**
         * Handles a change to panelTemplateId. Resets the controls arrays with new controls
         * @param oldValue The old value for the property
         * @param newValue The new value for the property
         */
        private onPanelTemplateIdChanged(oldValue: string, newValue: string): void {
            if (this._toolbarPanel) {
                this._toolbarPanel.removeEventListener("focusin", this._focusInHandler);
                this._toolbarPanel.removeEventListener("keydown", this._toolbarKeyHandler);
                this._toolbarPanel = null;
            }

            while (this._controlsPropChangedRegistration.length > 0) {
                this._controlsPropChangedRegistration.pop().unregister();
            }

            if (newValue) {
                this._controls = [];
                this.setActiveIndex(-1);

                this._toolbarPanel = this.getNamedElement(ToolbarControl.TOOLBAR_PANEL_ELEMENT_NAME);
                F12.Tools.Utility.Assert.hasValue(this._toolbarPanel, "Expecting a toolbar panel with the name: " + ToolbarControl.TOOLBAR_PANEL_ELEMENT_NAME);

                this._toolbarPanel.addEventListener("focusin", this._focusInHandler);
                this._toolbarPanel.addEventListener("keydown", this._toolbarKeyHandler);

                for (var elementIndex = 0; elementIndex < this._toolbarPanel.children.length; elementIndex++) {
                    var element = <IHTMLControlLink><any>this._toolbarPanel.children[elementIndex];

                    if (element.control) {
                        F12.Tools.Utility.Assert.isTrue(element.control instanceof TemplateControl, "We only support controls of type TemplateControl in the Toolbar");

                        var control = <TemplateControl>element.control;
                        this._controls.push(control);
                        this._controlsPropChangedRegistration.push(control.propertyChanged.addHandler(this.onChildControlPropertyChanged.bind(this, control)));
                    }
                }
            }

            this.setTabStop();
        }

        private onHostInfoChanged(e: Event): void {
            // Update the right margin of the toolbar area to ensure the shell buttons don't overlap it
            var scaledControlAreaWidth = (<any>e).controlAreaWidth * (screen.logicalXDPI / screen.deviceXDPI);

            var toolbarContents = <HTMLElement>this.rootElement.querySelector(".BPT-ToolbarContents");
            F12.Tools.Utility.Assert.hasValue(toolbarContents, "Unable to find an element with selector .BPT-ToolbarContents in the toolbar on hostInfoChanged");

            if (toolbarContents) {
                toolbarContents.style.marginRight = scaledControlAreaWidth + "px";
            }
        }

        /**
         * Handles keyboard events to allow arrow key navigation for selecting the next/previous controls
         * @param e The keyboard event
         */
        private onToolbarKeyboardEvent(e: KeyboardEvent): void {
            if (e.keyCode === KeyCodes.ArrowLeft) {
                this.moveToControl(NavigationDirection.Previous);
                e.stopPropagation();
            } else if (e.keyCode === KeyCodes.ArrowRight) {
                this.moveToControl(NavigationDirection.Next);
                e.stopPropagation();
            }
        }

        /**
         * Handles update of the tab index when child-controls have their enabled and visible settings toggled
         * @param button The button who's property has changed
         * @param propertyName Name of the observable property which changed on the button
         */
        private onChildControlPropertyChanged(childControl: TemplateControl, propertyName: string): void {
            if (propertyName === TemplateControl.IsEnabledPropertyName || propertyName === TemplateControl.IsVisiblePropertyName) {
                if (this._activeIndex === -1) {
                    this.setTabStop();
                } else {
                    var currentActiveControl: TemplateControl = this._controls[this._activeIndex];
                    if (childControl === currentActiveControl) {
                        if (!(childControl.isEnabled && childControl.isVisible)) {
                            this.setTabStop(/*startAt=*/ this._activeIndex);
                        }
                    }
                }
            }
        }

        /**
         * Ensures that if there is a visible and enabled control it will get a tab stop (1) and all the others will be disabled (-1)
         */
        private setTabStop(startAt?: number): void {
            this.setActiveIndex(-1);

            startAt = startAt || 0;
            if (startAt < 0 || startAt >= this._controls.length) {
                return;
            }

            var currentIndex: number = startAt;
            var foundTabStop = false;

            do {
                var control: TemplateControl = this._controls[currentIndex];
                if (!foundTabStop && control.isVisible && control.isEnabled) {
                    this.setActiveIndex(currentIndex);
                    foundTabStop = true;
                } else {
                    control.tabIndex = -1;
                }
            } while (startAt !== (currentIndex = (currentIndex + 1) % this._controls.length));
        }

        private setActiveIndex(newIndex: number, setFocus?: boolean): void {
            if (this._activeIndex >= 0 && this._activeIndex < this._controls.length) {
                this._controls[this._activeIndex].tabIndex = -1;
            }

            this._activeIndex = newIndex;

            var control: TemplateControl = this._controls[this._activeIndex];
            if (control) {
                control.tabIndex = 1;

                if (setFocus) {
                    control.rootElement.focus();
                }
            }
        }
    }

    ToolbarControl.initialize();
}
