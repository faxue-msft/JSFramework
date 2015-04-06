// 
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="../assert.ts" />
/// <reference path="../Framework/Templating/TemplateControl.ts" />
/// <reference path="Button.ts" />

module Common.Controls {
    "use strict";

    /**
     * A panel class which is templatable and provides easy access to controls
     * for the purpose of event handler subscription, etc
     */
    export class Panel extends TemplateControl {
        /**
         * Constructor
         * @constructor
         * @param templateId The templateId to use with this panel. If not provided the template root will be a <div> element.
         */
        constructor(templateId?: string) {
            super(templateId);
        }

        /**
         * Static constructor used to initialize observable properties
         */
        public static initialize(): void {
        }

        /**
         * Updates the button with the given name with a click handler
         * @param buttonName Name of the button as provided in data-name attribute
         * @param clickHandler Click handler to be added to the button
         */
        public addClickHandlerToButton(buttonName: string, clickHandler: IEventHandler<Event>): void {
            var element: IHTMLControlLink = <any>this.getNamedElement(buttonName);

            if (element && element.control) {
                (<Common.Controls.Button>element.control).click.addHandler(clickHandler);
            }
        }
    }

    Panel.initialize();
}
