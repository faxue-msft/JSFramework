//
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="../assert.ts" />
/// <reference path="ControlUtilities.ts" />
/// <reference path="Button.ts" />

module Common.Controls {
    "use strict";

    /**
     * An enumeration that specifies the kind of the tab press
     */
    export enum TabPressKind {
        None,
        Tab,
        ShiftTab
    }

    /**
     * A PopupControl class which provides the popup behaviour to its given HTML template
     */
    export class PopupControl extends TemplateControl {
        /** CSS class to apply on the root element */
        private static CLASS_POPUP: string = "BPT-popup";

        /** CSS class to apply to the target element when the popup is visible */
        private static CLASS_POPUP_ACTIVE_ONTARGET: string = "BPT-popupActive";

        private _blurHandler: (ev: FocusEvent) => void;
        private _focusOutHandler: (e: FocusEvent) => boolean;
        private _keyHandler: (e: KeyboardEvent) => void;
        private _mouseHandler: (e: MouseEvent) => void;
        private _skipTargetButtonFocus: boolean;
        private _tabLastPressed: TabPressKind;
        private _targetButtonClickEvtReg: IEventRegistration;
        private _targetButtonClickHandler: () => void;
        private _targetButtonKeyHandler: (e: KeyboardEvent) => void;
        private _windowResizeHandler: (e: UIEvent) => void;

        /** When set, the popup will dismiss when the target button clicked as opposed to keeping the popup open */
        public dismissOnTargetButtonClick: boolean;
        
        /** When set, the popup's target button will not have a visual indicator when the popup is active */
        public disablePopupActiveIndicator: boolean;

        /** When set, the popup remain visible even when it loses focus */
        public keepVisibleOnBlur: boolean;

        /** When set, the margin to avoid showing the popup at in the viewport */
        public viewportMargin: ClientRect;

        /**
         * [ObservableProperty] Target button element which is used to display the popup control
         */
        public targetButtonElement: HTMLElement;

        /**
         * @constructor
         * As part of initialization, caches references to event handler instances and loads the template content.
         * @param templateId: Optional template id for the control.
         */
        constructor(templateId?: string) {
            this._blurHandler = (e: FocusEvent) => this.onBlur(e);
            this._focusOutHandler = (e: FocusEvent) => this.onFocusOut(e);
            this._keyHandler = (e: KeyboardEvent) => this.onKeyEvent(e);
            this._mouseHandler = (e: MouseEvent) => this.onDocumentMouseHandler(e);
            this._targetButtonClickHandler = () => this.onTargetButtonClick();
            this._targetButtonKeyHandler = (e: KeyboardEvent) => this.onTargetButtonKeyUp(e);
            this._windowResizeHandler = (e: UIEvent) => this.onWindowResize(e);

            super(templateId);
        }

        /**
         * Initializes the observable properties which should be performed once per each class.
         */
        public static initialize(): void {
            Common.ObservableHelpers.defineProperty(PopupControl, "targetButtonElement", /*defaultValue=*/ null, (obj: PopupControl, oldValue: HTMLElement, newValue: HTMLElement) => obj.onTargetButtonElementChanged(oldValue, newValue));
        }

        /**
         * Updates the control when the template has changed
         */
        public onApplyTemplate(): void {
            super.onApplyTemplate();

            if (this.rootElement) {
                this.rootElement.classList.add(PopupControl.CLASS_POPUP);
            }

            this.onTargetButtonElementChanged(null, this.targetButtonElement);
        }

        /**
         * Protected virtual function called when initializing the control instance
         */
        public onInitializeOverride(): void {
            super.onInitializeOverride();

            // By default the popup control is not visible
            this.isVisible = false;
        }

        /**
         * Protected virtual function used to notify subclasses that the template is about to change.
         * Can used to perform cleanup on the previous root element
         */
        public onTemplateChanging(): void {
            if (this.rootElement) {
                this.rootElement.classList.remove(PopupControl.CLASS_POPUP);
            }
        }

        /**
         * Protected overridable method. Gets called when the isVisible value changes
         */
        public onIsVisibleChangedOverride(): void {
            super.onIsVisibleChangedOverride();

            if (this.isVisible) {
                window.setImmediate(() => {
                    this.rootElement.focus();
                });

                this._tabLastPressed = TabPressKind.None;

                if (this.targetButtonElement && !this.disablePopupActiveIndicator) {
                    this.targetButtonElement.classList.add(PopupControl.CLASS_POPUP_ACTIVE_ONTARGET);
                }

                this.setPopupPosition();

                // Add event handlers for popup navigation and dismissal
                window.addEventListener("resize", this._windowResizeHandler);
                document.addEventListener("focusout", this._focusOutHandler, /*useCapture=*/true);
                document.addEventListener("mousedown", this._mouseHandler, /*useCapture=*/true);
                document.addEventListener("mouseup", this._mouseHandler, /*useCapture=*/true);
                document.addEventListener("mousewheel", this._mouseHandler, /*useCapture=*/true);
                document.addEventListener("click", this._mouseHandler, /*useCapture=*/true);
                this.rootElement.addEventListener("blur", this._blurHandler, /*useCapture=*/true);
                this.rootElement.addEventListener("keydown", this._keyHandler);
                this.rootElement.addEventListener("keyup", this._keyHandler);
            } else {
                if (this.targetButtonElement) {
                    this.targetButtonElement.classList.remove(PopupControl.CLASS_POPUP_ACTIVE_ONTARGET);
                    if (!this._skipTargetButtonFocus) {
                        window.setImmediate(() => {
                            if (this.targetButtonElement) {
                                this.targetButtonElement.focus();
                            }
                        });
                    }
                }

                // Remove event handlers for popup navigation and dismissal
                window.removeEventListener("resize", this._windowResizeHandler);
                document.removeEventListener("focusout", this._focusOutHandler, /*useCapture=*/true);
                document.removeEventListener("mousedown", this._mouseHandler, /*useCapture=*/true);
                document.removeEventListener("mouseup", this._mouseHandler, /*useCapture=*/true);
                document.removeEventListener("mousewheel", this._mouseHandler, /*useCapture=*/true);
                document.removeEventListener("click", this._mouseHandler, /*useCapture=*/true);
                this.rootElement.removeEventListener("blur", this._blurHandler, /*useCapture=*/true);
                this.rootElement.removeEventListener("keydown", this._keyHandler);
                this.rootElement.removeEventListener("keyup", this._keyHandler);
            }
        }

        /**
         * Protected overridable method. Gets called on the keydown event.
         * @param e the keyboard event object
         * @returns true if the event was handled and no need for extra processing
         */
        public onKeyDownOverride(e: KeyboardEvent): boolean {
            return false;
        }

        /**
         * Protected overridable method. Gets called on the keyup event.
         * @param e the keyboard event object
         * @returns true if the event was handled and no need for extra processing
         */
        public onKeyUpOverride(e: KeyboardEvent): boolean {
            return false;
        }

        /**
         * Displays the popup control at the given absolute co-ordinates
         * @param x x-coordinate of the right end of the popup control
         * @param y y-coordinate of the top of the popup control
         */
        public show(x?: number, y?: number): void {
            this.isVisible = true;

            if (x !== undefined && y !== undefined) {
                this.rootElement.style.left = (x - this.rootElement.offsetWidth) + "px";
                this.rootElement.style.top = y + "px";
            }
        }

        public /*protected*/ updatePopupPosition(): void {
            this.setPopupPosition();
        }

        private static totalOffsetLeft(elem: HTMLElement): number {
            var offsetLeft = 0;
            do {
                if (!isNaN(elem.offsetLeft)) {
                    offsetLeft += elem.offsetLeft;
                }
            } while (elem = <HTMLElement>elem.offsetParent);

            return offsetLeft;
        }

        private static totalOffsetTop(elem: HTMLElement): number {
            var offsetTop = 0;
            do {
                if (!isNaN(elem.offsetTop)) {
                    offsetTop += elem.offsetTop;
                }
            } while (elem = <HTMLElement>elem.offsetParent);

            return offsetTop;
        }

        private setPopupPosition(): void {
            this.rootElement.style.left = "0px";
            this.rootElement.style.top = "0px";

            if (!this.targetButtonElement) {
                // Cannot determine the position if there is no targetButtonElement
                return;
            }
            
            var viewportTop = this.viewportMargin ? (this.viewportMargin.top || 0) : 0;
            var viewportBottom = window.innerHeight - (this.viewportMargin ? (this.viewportMargin.bottom || 0) : 0);
            var viewportLeft = this.viewportMargin ? (this.viewportMargin.left || 0) : 0;
            var viewportRight = window.innerWidth - (this.viewportMargin ? (this.viewportMargin.right || 0) : 0);

            // The positioning logic works by getting the viewport position of the target element then
            // mapping that position to the popup coordinates.
            // The mapping logic use the following arithmatic:
            //   pos = popup_scrollPos + targetElem_viewPortPos - popup_zeroOffsetToDocumnet
            //
            // Get the coordinates of target based on the viewport
            var targetRect: ClientRect = this.targetButtonElement.getBoundingClientRect();
            var targetViewportLeft = Math.round(targetRect.left);
            var targetViewportTop = Math.round(targetRect.top);

            // Get the total scroll position of the popup, so we can map the viewport coordinates to it
            var scrollTopTotal = 0;
            var scrollLeftTotal = 0;
            var elem = <HTMLElement>this.rootElement.offsetParent;
            while (elem) {
                scrollLeftTotal += elem.scrollLeft;
                scrollTopTotal += elem.scrollTop;
                elem = <HTMLElement>elem.offsetParent;
            }

            // Gets the offset position when the popup control is at 0,0 to adjust later on this value.
            // because 0,0 doesn't necessarily land on document 0,0 if there is a parent with absolute position.
            var zeroOffsetLeft = PopupControl.totalOffsetLeft(this.rootElement);
            var zeroOffsetTop = PopupControl.totalOffsetTop(this.rootElement);

            // Calculate the left position 
            var left = targetViewportLeft;
            var right = left + this.rootElement.offsetWidth;
            if (right > viewportRight) {
                var newRight = targetViewportLeft + this.targetButtonElement.offsetWidth;
                var newLeft = newRight - this.rootElement.offsetWidth;
                if (newLeft >= viewportLeft) {
                    left = newLeft;
                    right = newRight;
                }
            }

            this.rootElement.style.left = scrollLeftTotal + left - zeroOffsetLeft + "px";

            // Calculate the top position
            var top = targetViewportTop + this.targetButtonElement.offsetHeight;
            var bottom = top + this.rootElement.offsetHeight;
            if (bottom > viewportBottom) {
                var newBottom = targetViewportTop;
                var newTop = newBottom - this.rootElement.offsetHeight;
                if (newTop >= viewportTop) {
                    top = newTop;
                    bottom = newBottom;
                }
            }

            // Move the menu up 1 pixel if both the menu and the target button have borders
            if (parseInt(window.getComputedStyle(this.rootElement).borderTopWidth) > 0 &&
                parseInt(window.getComputedStyle(this.targetButtonElement).borderBottomWidth) > 0) {
                top--;
            }

            this.rootElement.style.top = scrollTopTotal + top - zeroOffsetTop + "px";
        }

        private onBlur(e: FocusEvent): void {
            if (!this.keepVisibleOnBlur && !document.hasFocus() && !this._tabLastPressed) {
                this.isVisible = false;
            }
        }

        /**
         * Handles a change to the targetButtonElement property. Updates the aria properties of the popup item
         * @param oldValue The old value for the property
         * @param newValue The new value for the property
         */
        private onTargetButtonElementChanged(oldValue: HTMLElement, newValue: HTMLElement): void {
            if (oldValue) {
                oldValue.removeAttribute("aria-haspopup");
                oldValue.removeAttribute("aria-owns");

                if (this._targetButtonClickEvtReg) {
                    this._targetButtonClickEvtReg.unregister();
                    this._targetButtonClickEvtReg = null;
                }

                oldValue.removeEventListener("click", this._targetButtonClickHandler);
                oldValue.removeEventListener("keyup", this._targetButtonKeyHandler);
            }

            if (newValue) {
                newValue.setAttribute("aria-haspopup", "true");
                newValue.setAttribute("aria-owns", this.rootElement.id);

                var targetControl: IControl = (<IHTMLControlLink><any>newValue).control;
                if (targetControl && targetControl instanceof Button) {
                    var targetButton = <Button>targetControl;
                    this._targetButtonClickEvtReg = targetButton.click.addHandler(this._targetButtonClickHandler);
                } else {
                    newValue.addEventListener("click", this._targetButtonClickHandler);
                    newValue.addEventListener("keyup", this._targetButtonKeyHandler);
                }
            }
        }

        private onTargetButtonClick(): void {
            this.show();
        }

        private onTargetButtonKeyUp(e: KeyboardEvent): void {
            if (e.keyCode === Common.KeyCodes.Space || e.keyCode === Common.KeyCodes.Enter) {
                this.show();

                e.preventDefault();
                e.stopImmediatePropagation();
            }
        }

        private onWindowResize(e: UIEvent): void {
            this.isVisible = false;
        }

        /**
         * Focus out listener for the popup control when it is visible.
         */
        private onFocusOut(e: FocusEvent): boolean {
            if (e.relatedTarget && e.relatedTarget !== this.rootElement && !this.rootElement.contains(<HTMLElement>e.relatedTarget)) {
                // If focus out was due to tabbing out, then we need to set focus on either the first or the last tabbable element
                if (this._tabLastPressed !== TabPressKind.None) {
                    var tabbableChildren: NodeList = this.rootElement.querySelectorAll("[tabindex]");
                    var tabbableElement: HTMLElement = this.rootElement;

                    if (this._tabLastPressed === TabPressKind.Tab) {
                        // Find the first tabbable element
                        for (var i = 0; i < tabbableChildren.length; i++) {
                            var element = <HTMLElement>tabbableChildren.item(i);
                            // Check that it is both visible and tabbable
                            if (element.tabIndex >= 0 && element.offsetParent) {
                                tabbableElement = element;
                                break;
                            }
                        }
                    } else {
                        // Find the last tabbable element
                        for (var i = tabbableChildren.length - 1; i >= 0; i--) {
                            var element = <HTMLElement>tabbableChildren.item(i);
                            // Check that it is both visible and tabbable
                            if (element.tabIndex >= 0 && element.offsetParent) {
                                tabbableElement = element;
                                break;
                            }
                        }
                    }

                    window.setImmediate(() => {
                        tabbableElement.focus();
                    });
                } else {
                    this.isVisible = false;

                    // Dismiss the popup control and set focus on the requesting element
                    window.setImmediate(() => {
                        if (<HTMLElement>e.target) {
                            (<HTMLElement>e.target).focus();
                        }
                    });
                }
            }

            return false;
        }

        /**
         * Document click listener for the popup control when it is visible. Ignores click in the control itself.
         */
        private onDocumentMouseHandler(e: MouseEvent): void {
            var withinPopup: boolean = this.rootElement.contains(<HTMLDivElement>e.target);
            if (!withinPopup) {
                var withinTargetButton: boolean = this.targetButtonElement && this.targetButtonElement.contains(<HTMLDivElement>e.target);

                if (!withinTargetButton) {
                    // Still check the element under the mouse click. Using a scrollbar inside the popup causes and event to be raised with the document as the target
                    var elementUnderPoint = <HTMLElement>document.elementFromPoint(e.x, e.y);
                    withinPopup = this.rootElement.contains(elementUnderPoint);
                    if (!withinPopup) {
                        // Not within the target button, just hide the popup and not set focus on the target button
                        // Because the normal mouse handler will move focus to the target element
                        this._skipTargetButtonFocus = true;
                        try {
                            this.isVisible = false;
                        } finally {
                            this._skipTargetButtonFocus = false;
                        }
                    }
                } else {
                    // Within the target button
                    // Only hide the popup on the click event since it's the last event fired (mousedown -> mouseup -> click)
                    if (e.type === "click" && this.dismissOnTargetButtonClick) {
                        this.isVisible = false;
                    }

                    e.stopImmediatePropagation();
                    e.preventDefault();
                }
            }
        }

        /**
         * Document key listener for the popup control when it is visible.
         */
        private onKeyEvent(e: KeyboardEvent): boolean {
            // Prevent all key strokes from propagating up.
            e.stopImmediatePropagation();
            Common.preventIEKeys(e);

            this._tabLastPressed = e.keyCode === Common.KeyCodes.Tab ? (e.shiftKey ? TabPressKind.ShiftTab : TabPressKind.Tab) : TabPressKind.None;

            if (e.type === "keyup") {
                var handled: boolean = this.onKeyUpOverride(e);
                if (!handled) {
                    switch (e.keyCode) {
                        case Common.KeyCodes.Escape:
                            this.isVisible = false;
                            break;
                    }
                }
            } else if (e.type === "keydown") {
                this.onKeyDownOverride(e);
            }

            return false;
        }
    }

    PopupControl.initialize();
}
