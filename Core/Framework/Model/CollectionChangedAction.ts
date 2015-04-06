// 
// Copyright (C) Microsoft. All rights reserved.
//

module Common {
    "use strict";

    /** Types of change events that can occur on IObservableCollection objects */
    export enum CollectionChangedAction {
        Add,
        Remove,
        Reset,
        Clear
    };
}
