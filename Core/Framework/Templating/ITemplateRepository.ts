// 
// Copyright (C) Microsoft. All rights reserved.
//

module Common {
    "use strict";
    /**
     * Defines the Template-Repository interface. The template repository allows us to
     * access template strings using thier templateId's
     */
    export interface ITemplateRepository {
        /**
         * Returns the template string associated with the given templateId
         * @param templateId The template ID
         * @return The template string
         */
        getTemplateString(templateId: string): string;

        /**
         * Register the given html with the repository
         * @param templateId The template ID. Must be unique.
         * @param html The html content of the template
         */
        registerTemplateString(templateId: string, html: string): void;
    }
}