//
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="../../assert.ts" />
/// <reference path="../EventSource.ts" />
/// <reference path="IConverter.ts" />

module Common {
    "use strict";

    /**
     * Defines the interface used to access the target (read/write)
     */
    export interface ITargetAccess {
        /** Get a value from the target */
        getValue(target: any, prop: string): any;

        /** Determine if the given value supported by the target */
        isValueSupported(value: any, isConverter: boolean): boolean;

        /** Set a value to the target */
        setValue(target: any, prop: string, value: any): void;
    }

    /**
     * Access the target using properties, ex: obj[prop]
     */
    export var targetAccessViaProperty: ITargetAccess = {
        getValue: (target: any, prop: string): any => target[prop],

        isValueSupported: (value: any, isConverter: boolean): boolean => {
            // - undefined is always not allowed
            // - null is allowed only if returned from a converter
            return value !== undefined && (isConverter || value !== null);
        },

        setValue: (target: any, prop: string, value: any): void => { target[prop] = value; }
    };

    /**
     * Access the target by calling getAttribute/setAttribute. This is used with HTMLElements in some scenarios.
     */
    export var targetAccessViaAttribute: ITargetAccess = {
        getValue: (target: HTMLElement, prop: string): any => target.getAttribute(prop),

        isValueSupported: (value: any, isConverter: boolean): boolean => {
            // All values are allowed. Undefined and null have special treatment in setValue.
            return true;
        },

        setValue: (target: HTMLElement, prop: string, value: any): void => {
            if (value === null || value === undefined) {
                target.removeAttribute(prop);
            } else {
                target.setAttribute(prop, value);
            }
        }
    };

    /**
     * A binding class which keeps the property value in sync between to objects.  It listens to the .changed event or the dom "onchange" event.
     * The binding is released by calling unbind
     */
    export class Binding {
        /** The source object of the current binding */
        private _source: any;

        /** The single property to listen for changes on.  This is the first part of sourceExpression.  The rest is handled via recursive bindings */
        private _sourceProperty: string;

        /** The event registration listening for source changes */
        private _sourceChangedRegistration: IEventRegistration;

        /** The event registration listening for destination changes if the binding is two way */
        private _destChangedRegistration: IEventRegistration;

        /** The child binding used for binding to the remainder of sourceExpression when sourceExpression isn't a simple property name */
        private _childBinding: Binding;

        /** True if the binding is currently paused and shouldn't react to events.  Used to avoid reentrancy in TwoWay binding */
        private _paused: boolean;

        /** True if the binding is two way */
        private _twoWay: boolean;

        /** The converter which converts from source value to destination value and back (in the case of two way binding) */
        private _converter: IConverter;

        /** The object to set properties on */
        private _destination: any;

        /** The property to set on _destination */
        private _destinationProperty: string;

        /** The method used to access the target */
        private _targetAccess: ITargetAccess;

        /** The string used to signify one way binding */
        public static ONE_WAY_MODE: string = "oneway";

        /** The string used to signify two way binding */
        public static TWO_WAY_MODE: string = "twoway";

        /**
         * @constructor
         * @param source - The object to get the value from
         * @param sourceExpression - A property or property chain of the named property to retrieve from source can contain . but not []
         * @param destination - The object to assign the value to
         * @param destinationProperty - The property on destination which will receive the value.  Cannot contain . or []
         * @param converter - The function to convert from the value on source to the value on destination, default is no conversion
         * @param mode - The binding mode 'oneway' (default) or 'twoway'.  TwoWay binding will copy the value from destination to source when destination changes
         * @param targetAccess - An accessor object which provides us options between accessing the members of the target via attribute or property. Default is
         * Common.targetAccessViaProperty. Other option is Common.targetAccessViaAttribute
         */
        constructor(source: any, sourceExpression: string, destination: any, destinationProperty: string, converter?: IConverter, mode?: string, targetAccess?: ITargetAccess) {
            // Validation
            F12.Tools.Utility.Assert.hasValue(sourceExpression, "sourceExpression");
            F12.Tools.Utility.Assert.hasValue(destination, "destination");
            F12.Tools.Utility.Assert.hasValue(destinationProperty, "destinationProperty");

            // Default the mode to OneWay
            mode = mode || Binding.ONE_WAY_MODE;
            var expressionParts = sourceExpression.split(".");

            this._source = null;
            this._sourceChangedRegistration = null;
            this._destChangedRegistration = null;
            this._sourceProperty = expressionParts[0];
            this._childBinding = null;
            this._paused = false;
            this._twoWay = false;
            this._converter = converter;
            this._destination = destination;
            this._destinationProperty = destinationProperty;
            this._targetAccess = targetAccess || Common.targetAccessViaProperty;

            // If there is more than one property in the sourceExpression, we have to create a child binding
            if (expressionParts.length > 1) {
                expressionParts.splice(0, 1);
                this._childBinding = new Binding(null, expressionParts.join("."), destination, destinationProperty, converter, mode, this._targetAccess);
            } else if (mode.toLowerCase() === Binding.TWO_WAY_MODE) {
                this._twoWay = true;
                this._destChangedRegistration = this.attachChangeHandler(destination, (e: any) => {
                    var propertyName = <string>e;
                    if (typeof propertyName !== "string" || propertyName === null || propertyName === this._destinationProperty) {
                        this.updateSourceFromDest();
                    }
                });
            }

            this.setSource(source);
        }

        /**
         * Determines if the current binding is for the given destination and property
         */
        public isForDestination(destination: any, destinationProperty: string): boolean {
            return destination === this._destination && destinationProperty === this._destinationProperty;
        }

        /**
         * Unbinds the binding to clean up any object references and prevent any further updates from happening
         */
        public unbind(): void {
            this._source = null;
            if (this._sourceChangedRegistration) {
                this._sourceChangedRegistration.unregister();
                this._sourceChangedRegistration = null;
            }

            if (this._childBinding) {
                this._childBinding.unbind();
                this._childBinding = null;
            }

            if (this._destChangedRegistration) {
                this._destChangedRegistration.unregister();
                this._destChangedRegistration = null;
            }
        }

        /**
         * Updates the source value when the destination value changes
         */
        public updateSourceFromDest(): void {
            if (this._source && this._twoWay) {
                this._paused = true;
                var destValue = this._targetAccess.getValue(this._destination, this._destinationProperty);
                if (this._converter) {
                    destValue = this._converter.convertFrom(destValue);
                }

                this._source[this._sourceProperty] = destValue;
                this._paused = false;
            }
        }

        /**
         * Updates the destination or childBinding with the value from source
         * TODO: Once INotifyPropertyChanged or similar has been added, use the name property from that to filter this
         */
        public updateDestination(): void {
            if (this._paused) {
                return;
            }

            this._paused = true;
            var value = this.getValue();
            if (this._childBinding) {
                this._childBinding.setSource(value);
            } else {
                // If the source is not set, we don't want to call the converter
                var hasConverter: boolean = !!this._source && !!this._converter;
                if (hasConverter) {
                    value = this._converter.convertTo(value);
                }

                if (this._targetAccess.isValueSupported(value, !!hasConverter)) {
                    this._targetAccess.setValue(this._destination, this._destinationProperty, value);
                }
            }

            this._paused = false;
        }

        /**
         * Sets the source of the binding.  In the case of a child binding, this updates as the parent binding's value changes
         * @param source - The source object that the binding is listening to
         */
        private setSource(source: any): void {
            // Dispose the previous source change handler first
            if (this._sourceChangedRegistration) {
                this._sourceChangedRegistration.unregister();
                this._sourceChangedRegistration = null;
            }

            this._source = source;

            // Listen to change event on the new source
            if (this._source) {
                this._sourceChangedRegistration = this.attachChangeHandler(this._source, (propertyName: string) => {
                    if (typeof propertyName !== "string" || propertyName === null || propertyName === this._sourceProperty) {
                        this.updateDestination();
                    }
                });
            }

            this.updateDestination();
            this.updateSourceFromDest();
        }

        /**
         * Attaches a change handler to obj and returns an object that can be disposed to remove the handler
         * Prefers obj.propertyChanged, but will use the dom onchange event if that doesn't exist
         * @param obj - The object to listen for changes on
         * @param handler - The function to be called when a change occurs
         * @return An object that can be disposed to remove the change handler
         */
        private attachChangeHandler(obj: any, handler: (arg: any) => any): IEventRegistration {
            if (obj.propertyChanged) {
                return (<EventSource<string>>obj.propertyChanged).addHandler(handler);
            } else {
                var element = <HTMLElement>obj;
                if ((element.tagName === "INPUT" || element.tagName === "SELECT") &&
                    element.addEventListener && element.removeEventListener
                ) {
                    element.addEventListener("change", handler);
                    return { unregister: () => element.removeEventListener("change", handler) };
                }
            }
        }

        /**
         * Gets the current value from the source object
         * @return The current value from the source object
         */
        private getValue(): any {
            return this._source && this._source[this._sourceProperty];
        }
    }
}
