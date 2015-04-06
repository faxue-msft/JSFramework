// 
// Copyright (C) Microsoft. All rights reserved.
//

module Common {
    "use strict";
    /** Interface for the return value from EventSource.addHandler which can be unregistered to clean it up */
    export interface IEventRegistration {
        /** Removes the event registration, so that the handler will no longer be called */
        unregister(): void;
    }

    export interface IStringToRegistrationMap {
        // NOTE(rbuckton): conflicts with the indexer. Consider switching to Map type if available.
        // hasOwnProperty(id: string): boolean; 
        [index: string]: IEventRegistration;
    }
}

