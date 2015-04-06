//
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="IObservable.ts" />

module Common {
    "use strict";

    /**
     * An collection (array) which fires events when items are added and removed
     * NB: This does not fully implement Array<T>, but may incorporate more functionality
     *     in the future if it is needed.
     */
    export class ObservableCollection<T> implements IObservable, IObservableCollection<T> {
        /** The backing data for the observable collection */
        private _list: any/*T*/[];

        /** Represents the name of the length property on the ObservableCollection */
        public static LengthProperty = "length";

        /** The event which will be fired when a property on this object is updated */
        public propertyChanged: EventSource<string>;

        /** The event which will be fired when the collection is modified */
        public collectionChanged: EventSource<ICollectionChangedEventArgs<T>>;

        /**
         * @constructor
         * @param list An optional list containing data to populate into the ObservableCollection
         */
        constructor(list: T[] = []) {
            this._list = list.slice(0);
            this.propertyChanged = new EventSource<string>();
            this.collectionChanged = new EventSource<ICollectionChangedEventArgs<T>>();
        }

        /**
         * Gets the current length of the collection
         */
        public get length(): number {
            return this._list.length;
        }

        /**
         * Adds an item or items to the end of the collection
         * @param items New item(s) to add to the collection
         * @return The new length of the collection
         */
        public push(...items: T[]): number {
            var insertionIndex = this._list.length;
            var newLength = Array.prototype.push.apply(this._list, items);

            this.propertyChanged.invoke(ObservableCollection.LengthProperty);
            this.invokeCollectionChanged(CollectionChangedAction.Add, items, insertionIndex);
            return newLength;
        }

        /**
         * Removes an item from the end of the collection
         * @return The item that was removed from the collection
         */
        public pop(): T {
            var oldItem = this._list.pop();

            this.propertyChanged.invoke(ObservableCollection.LengthProperty);
            this.invokeCollectionChanged(CollectionChangedAction.Remove, null, null, [oldItem], this._list.length);
            return oldItem;
        }

        /**
         * Remove items from the collection and add to the collection at the given index
         * @param index The location of where to remove and add items
         * @param removeCount The number of items to rmeove
         * @param items New item(s) to add to the collection
         * @return The removed items
         */
        public splice(index: number, removeCount: number, ...items: T[]): T[] {
            var args: any[] = [index, removeCount];
            if (items) {
                Array.prototype.push.apply(args, items);
            }

            var removedItems: T[] = Array.prototype.splice.apply(this._list, args);

            var itemsRemoved: boolean = removedItems.length > 0;
            var itemsAdded: boolean = items && items.length > 0;

            if (itemsRemoved || itemsAdded) {
                this.propertyChanged.invoke(ObservableCollection.LengthProperty);

                if (itemsRemoved) {
                    this.invokeCollectionChanged(CollectionChangedAction.Remove, null, null, removedItems, index);
                }

                if (itemsAdded) {
                    this.invokeCollectionChanged(CollectionChangedAction.Add, items, index, null, null);
                }
            }

            return removedItems;
        }

        /**
         * Returns the first occurrence of an item in the collection
         * @param searchElement The item to search for
         * @param fromIndex The starting index to search from (defaults to collection start)
         * @return The index of the first occurrence of the item, or -1 if it was not found
         */
        public indexOf(searchElement: T, fromIndex?: number): number {
            return this._list.indexOf(searchElement, fromIndex);
        }

        /**
         * Returns the last occurrence of an item in the collection
         * @param searchElement The item to search for
         * @param fromIndex The starting index to search from (defaults to collection end)
         * @return The index of the last occurrence of the item, or -1 if it was not found
         */
        public lastIndexOf(searchElement: T, fromIndex: number = -1): number {
            return this._list.lastIndexOf(searchElement, fromIndex);
        }

        /**
         * Clears the contents of the collection to an empty collection
         */
        public clear(): void {
            this._list = [];

            this.propertyChanged.invoke(ObservableCollection.LengthProperty);
            this.invokeCollectionChanged(CollectionChangedAction.Clear);
        }

        /**
         * Returns the elements of the collection that meet the condition specified in a callback function.
         * @param callbackfn A function that accepts up to three arguments. The filter method calls the callbackfn function one time for each element in the collection.
         * @param thisArg An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
         */
        public filter(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): T[] {
            return this._list.filter(callbackfn, thisArg);
        }

        /**
         * Calls a defined callback function on each element of the collection, and returns an array that contains the results.
         * @param callbackfn A function that accepts up to three arguments. The map method calls the callbackfn function one time for each element in the array. 
         * @param thisArg An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
         */
        public map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[] {
            return this._list.map(callbackfn, thisArg);
        }

        /**
         * Retrieves an item from the collection
         * @param index The index of the item to retrieve
         * @return The requested item, or undefined if the item does not exist
         */
        public getItem(index: number): T {
            return this._list[index];
        }

        /**
         * Replaces the contents of the collection with the supplied items
         * @return The new length of the collection
         */
        public resetItems(items: T[]): number {
            this._list = [];
            var newLength = Array.prototype.push.apply(this._list, items);

            this.propertyChanged.invoke(ObservableCollection.LengthProperty);
            this.invokeCollectionChanged(CollectionChangedAction.Reset);
            return newLength;
        }

        /**
         * Helper method to invoke a CollectionChangedEvent
         * @param action The action which provoked the event (Add, Remove, Reset or Clear)
         * @param newItems The new items which were involved in an Add event
         * @param newStartingIndex The index at which the Add occurred
         * @param oldItems The old items which were involved in a Remove event
         * @param oldStartingIndex The index at which the Remove occurred
         */
        private invokeCollectionChanged(
            action: CollectionChangedAction,
            newItems?: T[],
            newStartingIndex?: number,
            oldItems?: T[],
            oldStartingIndex?: number): void {
            var event: ICollectionChangedEventArgs<T> = {
                action: action,
                newItems: newItems,
                newStartingIndex: newStartingIndex,
                oldItems: oldItems,
                oldStartingIndex: oldStartingIndex
            };
            this.collectionChanged.invoke(event);
        }
    }
}
