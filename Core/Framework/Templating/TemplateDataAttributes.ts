// 
// Copyright (C) Microsoft. All rights reserved.
//

module Common {
    "use strict";

    /**
     * Defines constants used with the template control and data binding
     */
    export class TemplateDataAttributes {
        public static BINDING: string = "data-binding";
        public static CONTROL: string = "data-control";
        public static NAME: string = "data-name";
        public static CONTROL_TEMPLATE_ID: string = TemplateDataAttributes.CONTROL + "-templateId";
        public static CONTROL_BINDING: string = "data-controlbinding";
        public static OPTIONS: string = "data-options";
        public static TEMPLATE_ID_OPTION: string = TemplateDataAttributes.OPTIONS + "-templateId";
    }
}