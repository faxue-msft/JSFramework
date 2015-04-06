// 
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="IObservable.ts" />

module Common {
    "use strict";

    /** An object which fires propertyChanged events when its properties are updated */
    export class Observable implements IObservable {
        /** The event which will be fired when a property on this object is updated */
        public propertyChanged: EventSource<string>;

        constructor() {
            this.propertyChanged = new EventSource<string>();
        }

        /**
         * Generates an ObservableObject from a given plain object.  The returned object
         * matches the shape of the supplied object, but with an additional propertyChanged
         * event source that can be subscribed to.
         */
        public static fromObject(obj: any): IObservable {
            // Prevent re-wrapping objects that statisfy IObservable already
            if (typeof (<IObservable>obj).propertyChanged !== "undefined") {
                return obj;
            }

            var returnValue = new Observable();
            var backingData = {};
            Object.defineProperties(returnValue, ObservableHelpers.expandProperties(obj, backingData, returnValue));
            (<any>returnValue)["_backingData"] = backingData;
            return returnValue;
        }
    }

    /** Helper methods for the ObservableObject class */
    export class ObservableHelpers {
        /**
         * Defines an observable property on a class' prototype
         * @param classToExtend The class which should be extended
         * @param propertyName The name of the property to add
         * @param onChanged Callback to handle value changes
         * @param onChanging Callback gets called before changing the value
         * @param defaultValue The initial value of the property
         */
        public static defineProperty/*<T>*/(classToExtend: any, propertyName: string, defaultValue: any/*T*/, onChanged?: (obj: any, oldValue: any/*T*/, newValue: any/*T*/) => void, onChanging?: (obj: any, oldValue: any/*T*/, newValue: any/*T*/) => void): void {
            var backingFieldName = "_" + propertyName;

            Object.defineProperty(
                classToExtend.prototype,
                propertyName,
                <PropertyDescriptor>{
                    get: function (): any {
                        if (typeof this[backingFieldName] === "undefined") {
                            this[backingFieldName] = defaultValue;
                        }

                        return this[backingFieldName];
                    },
                    set: function (newValue: any): void {
                        var oldValue = this[backingFieldName];
                        if (newValue !== oldValue) {
                            if (onChanging) {
                                onChanging(this, oldValue, newValue);
                            }

                            this[backingFieldName] = newValue;

                            var observable = <IObservable>this;
                            observable.propertyChanged.invoke(propertyName);

                            if (onChanged) {
                                onChanged(this, oldValue, newValue);
                            }
                        }
                    }
                });
        }

        /**
         * Creates a PropertyDescriptor for a given property on a given object and stores backing data in a supplied dictionary object
         * for the purpose of generating a property that invokes a propertyChanged event when it is updated.
         * @param propertyName The property to generate a descriptor for
         * @param objectShape The plain object which contains the property in question
         * @param backingDataStore The object which will contain the backing data for the property that is generated
         * @param invokableObserver The observer which will receive the propertyChanged event when the property is changed
         */
        public static describePropertyForObjectShape(propertyName: string, objectShape: any, backingDataStore: any, invokableObserver: IObservable): PropertyDescriptor {
            var returnValue = <PropertyDescriptor>{
                get: () => backingDataStore[propertyName],
                enumerable: true
            };

            var propertyValue = objectShape[propertyName];
            if (typeof propertyValue === "object") {
                // Wrap objects in observers of their own
                backingDataStore[propertyName] = Observable.fromObject(propertyValue);

                returnValue.set = (value: any) => {
                    if (value !== backingDataStore[propertyName]) {
                        // Additionally, ensure that objects which replace this value are wrapped again
                        backingDataStore[propertyName] = Observable.fromObject(value);
                        invokableObserver.propertyChanged.invoke(propertyName);
                    }
                };
            } else {
                backingDataStore[propertyName] = propertyValue;

                returnValue.set = (value: any) => {
                    if (value !== backingDataStore[propertyName]) {
                        backingDataStore[propertyName] = value;
                        invokableObserver.propertyChanged.invoke(propertyName);
                    }
                };
            }

            return returnValue;
        }

        /**
         * Creates a PropertyDescriptorMap of all the enumerated properties on a given object and stores backing data
         * for each property in a supplied dictionary object for the purpose of generating equivalent properties,
         * matching the shape of the supplied object, which fire propertyChanged events when they are updated.
         * @param objectShape The plain object which we want to obtain properties for
         * @param backingDataStore The object which will contain the backing data for the properties that are generated
         * @param invokableObserver The observer which will receive the propertyChanged events when the properties are changed
         */
        public static expandProperties(objectShape: any, backingDataStore: any, invokableObserver: IObservable): PropertyDescriptorMap {
            var properties = <PropertyDescriptorMap>{};

            // Traverse prototype chain for all properties
            for (var propertyName in objectShape) {
                properties[propertyName] = ObservableHelpers.describePropertyForObjectShape(propertyName, objectShape, backingDataStore, invokableObserver);
            }

            return properties;
        }
    }
}
