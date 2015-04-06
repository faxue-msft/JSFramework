// 
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="../../assert.ts" />
/// <reference path="ITemplateRepository.ts" />

module Common {
    "use strict";

    /**
     * Implements a template repository used to access the templates
     * hosted in the main HTML file.
     */
    export class HtmlTemplateRepository implements ITemplateRepository {
        private _registeredTemplates: ITemplateRegistryMap;

        /**
         * Constructor
         */
        constructor() {
            this._registeredTemplates = {};
        }

        /**
         * Gets the template string using the template Id.
         * @param templateId The template ID
         * @return The template string
         */
        public getTemplateString(templateId: string): string {
            F12.Tools.Utility.Assert.isTrue(!!templateId, "Invalid template ID.");

            var template: string;

            // First lookup in the registry, otherwise look in the page
            template = this._registeredTemplates[templateId];
            if (!template) {
                var templateElement = document.getElementById(templateId);
                template = templateElement.innerHTML;
            }

            F12.Tools.Utility.Assert.areEqual(typeof template, "string", "The given template name doesn't point to a template.");

            return template;
        }

        /**
         * Register the given html with the repository
         * @param templateId The template ID. Must be unique.
         * @param html The html content of the template
         */
        public registerTemplateString(templateId: string, html: string): void {
            F12.Tools.Utility.Assert.isTrue(!!templateId, "Invalid template ID.");
            F12.Tools.Utility.Assert.isUndefined(this._registeredTemplates[templateId], "Template with id '" + templateId + "' already registered.");

            this._registeredTemplates[templateId] = html;
        }
    }
}
