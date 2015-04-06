// 
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="../assert.ts" />
/// <reference path="../Framework/Model/Observable.ts" />
/// <reference path="../Framework/Templating/TemplateControl.ts" />

module Common.Controls {
    "use strict";

    /**
     * A base class for controls which have content
     */
    export class ContentControl extends TemplateControl {
        /**
         * Gets or sets the content to display within the button.
         * NOTE: This is actually an observable property implemented by ObservableHelpers.defineProperty
         */
        public content: any;

        /**
         * Constructor
         * @param templateId The id of the template to apply to the control
         */
        constructor(templateId?: string) {
            super(templateId);
        }

        /**
         * Static constructor used to initialize observable properties
         */
        public static initialize(): void {
            Common.ObservableHelpers.defineProperty(ContentControl, "content", null);
        }
    }

    ContentControl.initialize();
}
