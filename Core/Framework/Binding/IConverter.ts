// 
// Copyright (C) Microsoft. All rights reserved.
//

module Common {
    "use strict";
    /** Interface for the a converter class which can convert between two types for tools like binding */
    export interface IConverter/*<TFrom, TTo>*/ {
        /**
         * Converts a value to the destination type
         * @param from The value to convert
         * @return The converted value
         */
        convertTo(from: any /*TFrom*/): any /*TTo*/;

        /**
         * Converts a value from the destination type
         * @param to The value to convert
         * @return The converted value
         */
        convertFrom(to: any /*TTo*/): any /*TFrom*/;
    }
}
