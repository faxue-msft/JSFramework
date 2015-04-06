// 
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="IConverter.ts" />
/// <reference path="../../Plugin.d.ts" />

module Common {
    "use strict";
    
    /**
     * Common converters used by the templating engine.
     */
    export class CommonConverters {
        private static AriaConverterElement: HTMLSpanElement;
        private static JSONRegex = /^\{.*\}$/; // Matches strings that start with '{' and end with '}', which could be JSON

        public static HtmlTooltipFromResourceConverter: IConverter;
        public static IntToStringConverter: IConverter;
        public static InvertBool: IConverter;
        public static JsonHtmlTooltipToInnerTextConverter: IConverter;
        public static NullPermittedConverter: IConverter;
        public static ResourceConverter: IConverter;
        public static StringToBooleanConverter: IConverter;
        public static StringToIntConverter: IConverter;
        public static ThemedImageConverter: IConverter;

        /**
         * Static constructor for the class
         */
        public static initialize(): void {
            CommonConverters.AriaConverterElement = document.createElement("span");

            CommonConverters.HtmlTooltipFromResourceConverter = CommonConverters.getHtmlTooltipFromResourceConverter();
            CommonConverters.IntToStringConverter = CommonConverters.getIntToStringConverter();
            CommonConverters.InvertBool = CommonConverters.invertBoolConverter();
            CommonConverters.JsonHtmlTooltipToInnerTextConverter = CommonConverters.getJsonHtmlTooltipToInnerTextConverter();
            CommonConverters.NullPermittedConverter = CommonConverters.getNullPermittedConverter();
            CommonConverters.ResourceConverter = CommonConverters.getResourceConverter();
            CommonConverters.StringToBooleanConverter = CommonConverters.getStringToBooleanConverter();
            CommonConverters.StringToIntConverter = CommonConverters.getStringToIntConverter();
            CommonConverters.ThemedImageConverter = CommonConverters.getThemedImageConverter();
        }

        private static getResourceConverter(): IConverter {
            return {
                convertTo: (from: string): string => {
                    return Plugin.Resources.getString(from);
                },
                convertFrom: null
            };
        }

        private static getThemedImageConverter(): IConverter {
            return {
                convertTo: (from: string): string => {
                    return Plugin.Theme.getValue(from);
                },
                convertFrom: null
            };
        }

        private static getStringToBooleanConverter(): IConverter {
            return {
                convertTo: (from: string): boolean => {
                    return from === "true" ? true : false;
                },
                convertFrom: (from: boolean): string => {
                    return from ? "true" : "false";
                }
            };
        }

        private static getStringToIntConverter(): IConverter {
            return {
                convertTo: (from: string): number => {
                    return (<any>from) >> 0;
                },
                convertFrom: (from: number): string => {
                    return from.toString();
                }
            };
        }

        private static getIntToStringConverter(): IConverter {
            return {
                convertTo: (from: number): string => {
                    return from.toString();
                },
                convertFrom: (from: string): number => {
                    return (<any>from) >> 0;
                }
            };
        }

        private static invertBoolConverter(): IConverter {
            return {
                convertTo: (from: boolean) => {
                    return !from;
                },
                convertFrom: (to: boolean) => {
                    return !to;
                }
            };
        }

        /**
         * Converts a resource name into a value for a daytona tooltip that contains HTML to be rendered
         */
        private static getHtmlTooltipFromResourceConverter(): IConverter {
            return {
                convertTo: (from: string): string => {
                    return JSON.stringify({ content: Plugin.Resources.getString(from), contentContainsHTML: true });
                },
                convertFrom: null
            };
        }

        /**
         * Converts a JSON tooltip string with HTML into a text-only string of the tooltip content
         */
        private static getJsonHtmlTooltipToInnerTextConverter(): IConverter {
            return {
                convertTo: (from: string): string => {
                    if (from.match(CommonConverters.JSONRegex)) {
                        try {
                            var options: ITooltipConfig = JSON.parse(from);
                            if (options.contentContainsHTML) {
                                CommonConverters.AriaConverterElement.innerHTML = options.content;
                                var text = CommonConverters.AriaConverterElement.innerText;
                                CommonConverters.AriaConverterElement.innerHTML = "";
                                return text;
                            } else {
                                return options.content;
                            }
                        } catch (ex) { }
                    }

                    return from;
                },
                convertFrom: null
            };
        }

        /**
         * Returns whatever value was set, including null
         */
        private static getNullPermittedConverter(): IConverter {
            return {
                convertTo: (from: any): any => {
                    return from;
                },
                convertFrom: (to: any): any => {
                    return to;
                }
            };
        }
    }

    export interface ITooltipConfig {
        content: string;
        contentContainsHTML?: boolean;
    }

    CommonConverters.initialize();
}
 
