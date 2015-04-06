// 
// Copyright (C) Microsoft. All rights reserved.
//

module Common {
    "use strict";
    /**
     * The common interface for all controls
     */
    export interface IControl {
        /** The root HTML Element of the control */
        rootElement: HTMLElement;
    }

    /**
     * Contains the attached property on the HTML Element which allows us to link to the control object
     */
    export interface IHTMLControlLink {
        /** The control which connects to the current HTML Element */
        control: IControl;
    }
}