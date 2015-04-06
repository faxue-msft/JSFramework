// 
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="../../assert.ts" />
/// <reference path="ITemplateRepository.ts" />

// The ControlTemplates module is used to host all auto-generated templates.
// Before using the module below, we need to make sure it's declared first.
// This way we don't depend on what order the auto-genreated template file is injected or added.
module ControlTemplates {
    class PlaceHolder { }
}

module Common {
    "use strict";

    /**
     * Represents a map that holds html templates
     */
    export interface ITemplateRegistryMap {
        [id: string]: string;
    }

    /**
     * Implements a template repository used to access the templates
     * hosted in script.        
     */
    export class ScriptTemplateRepository implements ITemplateRepository {
        private _container: any;
        private _registeredTemplates: ITemplateRegistryMap;

        /**
         * Constructor
         * @param container The root object of where all script repository belongs
         */
        constructor(container: any) {
            F12.Tools.Utility.Assert.hasValue(container, "Invalid template container.");

            this._container = container;
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

            // First lookup in the registry, otherwise use the container
            template = this._registeredTemplates[templateId];
            if (!template) {
                var container = this._container;
                var templateParts: string[] = templateId.split(".");

                for (var i = 0; i < templateParts.length; i++) {
                    var part: string = templateParts[i];
                    container = container[part];
                    F12.Tools.Utility.Assert.isTrue(!!container, "Couldn't find the template with the given ID '" + templateId + "'.");
                }

                template = <string>container;
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

    /**
     * The global templateRepository member is an instance of ScriptTemplateRepository
     */
    export var templateRepository: ITemplateRepository = new ScriptTemplateRepository(ControlTemplates);
}
