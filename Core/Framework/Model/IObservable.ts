// 
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="CollectionChangedAction.ts" />
/// <reference path="../EventSource.ts" />

module Common {
    "use strict";
    /** Interface for an object to which a listener can subscribe for changes */
    export interface IObservable {
        /** Invoked when a property on the observable object changes (string value is property name) */
        propertyChanged: EventSource<string>;
    }

    /** Interface describing an event which can occur within an IObservableCollection */
    export interface ICollectionChangedEventArgs<T> {
        /** The change action that provoked the event */
        action: CollectionChangedAction;
         
        /** The list of new items affected by an Add action */
        newItems?: T[];

        /** The index where the change occurred */
        newStartingIndex?: number;

        /** The list of items affected by a Remove action */
        oldItems?: T[];

        /** The index where the Remove action occurred */
        oldStartingIndex?: number;
    }

    /** Interface for a collection object (array, etc) to which a listener can subscribe for changes of that nature (add, remove, etc) */
    export interface IObservableCollection<T> {
        /** Invoked when the collection is modified (ICollectionChangedEventArgs) */
        collectionChanged: EventSource<ICollectionChangedEventArgs<T>>;
    }
}
