// 
// Copyright (C) Microsoft. All rights reserved.
//

module Common {
    "use strict";
    /** Interface for the a function which handles an event from EventSource */
    export interface IEventHandler<T> {
        /**
         * Handles the event
         * @param args The event args which were passed to EventSource.invoke
         */
        (args: T): any;
    }
}
