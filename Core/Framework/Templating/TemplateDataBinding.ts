// 
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="../IControl.ts" />
/// <reference path="../Binding/Binding.ts" />
/// <reference path="TemplateControl.ts" />

module Common {
    "use strict";

    /**
     * Defines the binding command which is used to setup a binding relationship
     */
    export interface IBindingCommand {
        /** The target object */
        target: any;

        /** The access method to use with the target */
        targetAccess: ITargetAccess;

        /** The target property name */
        targetName: string;

        /** The source information */
        source?: IBindingSource;

        /** The value to assign to the target property */
        value?: string;
    }

    /**
     * Defines the binding source (name, mode, and converter)
     */
    export interface IBindingSource {
        /** The id of the source property name */
        name: string;

        /** The mode (oneway or twoway) */
        mode?: string;

        /** The converter object to use */
        converter?: IConverter;
    }

    /**
     * Holds all the binding relationships for the control.
     */
    export class TemplateDataBinding {
        private static ATTRIBUTE_PREFIX: string = "attr-";
        private static MODEL_PREFIX: string = "model.";
        private static STYLE_PREFIX: string = "style.";
        private static CONTROL_PREFIX: string = "control.";

        private _bindings: Binding[];

        /**
         * @param control The template control to create the binding relationships for
         */
        constructor(control: TemplateControl) {
            this._bindings = TemplateDataBinding.bind(control);
        }

        /**
         * Find the binding that represents the given destination and destination property
         * @param destination The destination object
         * @param destinationProperty The name of the destination property
         * @returns The binding object which represents the given destination
         */
        public findBinding(destination: any, destinationProperty: string): Binding {
            var binding: Binding;

            if (this._bindings) {
                for (var i = 0; i < this._bindings.length; i++) {
                    var currBinding: Binding = this._bindings[i];
                    if (currBinding.isForDestination(destination, destinationProperty)) {
                        binding = currBinding;
                        break;
                    }
                }
            }

            return binding;
        }

        /**
         * Unbind all the binding relationships
         */
        public unbind(): void {
            if (this._bindings) {
                for (var i = 0; i < this._bindings.length; i++) {
                    this._bindings[i].unbind();
                }
            }

            this._bindings = null;
        }

        private static buildBindingCommand(target: any, element: HTMLElement, targetName: string, bindingSource?: IBindingSource, value?: any): IBindingCommand {
            var targetAccess: ITargetAccess = Common.targetAccessViaProperty;

            if (target === element) {
                // 1- if the target name begins with 'style.', change the target to be the style object and remove the 'style.' prefix.
                // 2- if the target name begins with 'attr-', use the attribute access method on the target and remove the 'attr-' prefix.
                // 3- if the target name begins with 'control.', change the target to be the control object and remove the 'control.' prefix.
                if (targetName.substr(0, TemplateDataBinding.STYLE_PREFIX.length) === TemplateDataBinding.STYLE_PREFIX) {
                    target = element.style;
                    targetName = targetName.substr(TemplateDataBinding.STYLE_PREFIX.length);
                } else if (targetName.substr(0, TemplateDataBinding.ATTRIBUTE_PREFIX.length) === TemplateDataBinding.ATTRIBUTE_PREFIX) {
                    targetName = targetName.substr(TemplateDataBinding.ATTRIBUTE_PREFIX.length);
                    targetAccess = Common.targetAccessViaAttribute;
                } else if (targetName.substr(0, TemplateDataBinding.CONTROL_PREFIX.length) === TemplateDataBinding.CONTROL_PREFIX) {
                    var elementControlLink: IHTMLControlLink = <any>element;
                    target = elementControlLink.control;
                    targetName = targetName.substr(TemplateDataBinding.CONTROL_PREFIX.length);
                }
            }

            var bindingCommand = <IBindingCommand>{
                target: target,
                targetAccess: targetAccess,
                targetName: targetName,
                source: bindingSource,
                value: value
            };

            return bindingCommand;
        }

        /**
         * The syntax for the binding statement:
         *   binding statement =    binding[, <binding statement>]
         *   binding           =    targetName:sourceName[; mode=(oneway|twoway); converter=<converter id>]
         */
        private static extractBindingCommandsForBinding(commands: IBindingCommand[], target: any, element: HTMLElement, allBindings: string, isControlBinding: boolean): void {
            var bindings: string[] = allBindings.split(",");
            var bindingsCount = bindings.length;

            for (var i = 0; i < bindingsCount; i++) {
                var binding = bindings[i];

                var keyValue: string[] = binding.split(":", 2);
                F12.Tools.Utility.Assert.areEqual(keyValue.length, 2, "Invalid binding syntax, the keyvalue pair should have the syntax target:source '" + binding + "'.");

                var targetName = keyValue[0].trim();
                var sourceSyntax = keyValue[1].trim();

                var bindingSource: IBindingSource = TemplateDataBinding.parseSourceSyntax(sourceSyntax);

                // For data binding, assume it's a control binding and add the model accessor at the front
                if (!isControlBinding) {
                    bindingSource.name = TemplateDataBinding.MODEL_PREFIX + bindingSource.name;
                }

                var bindingCommand: IBindingCommand = TemplateDataBinding.buildBindingCommand(target, element, targetName, bindingSource, /*value=*/ null);

                F12.Tools.Utility.Assert.isTrue(!!bindingCommand.targetName, "Invalid binding syntax. Target name is missing '" + binding + "'.");

                commands.push(bindingCommand);
            }
        }

        /**
         * The syntax for the option statement:
         *   option statement =    option[, <option statement>]
         *   option           =    targetName:value[; converter=<converter id>]
         */
        private static extractBindingCommandsForOptions(commands: IBindingCommand[], target: any, element: HTMLElement, allOptions: string): void {
            var options: string[] = allOptions.split(",");
            var optionsCount = options.length;

            for (var i = 0; i < optionsCount; i++) {
                var option = options[i];

                var keyValue: string[] = option.split(":", 2);
                F12.Tools.Utility.Assert.areEqual(keyValue.length, 2, "Invalid options syntax, the keyvalue pair should have the syntax target:source '" + option + "'.");

                var targetName: string = keyValue[0].trim();
                var valueSyntax: string = keyValue[1].trim();

                // Get the converter and convert the value if it is present
                var valueSource: IBindingSource = TemplateDataBinding.parseSourceSyntax(valueSyntax);
                var value: string = valueSource.name;
                if (valueSource.converter && valueSource.converter.convertTo) {
                    value = valueSource.converter.convertTo(value);
                }

                var bindingCommand: IBindingCommand = TemplateDataBinding.buildBindingCommand(target, element, targetName, /*bindingSource=*/ null, value);

                F12.Tools.Utility.Assert.isTrue(!!bindingCommand.targetName, "Invalid option syntax. Target name is missing '" + option + "'.");

                commands.push(bindingCommand);
            }
        }

        /**
         * Gets all the binding commands which will be used to create the 
         * binding relationships
         * @param control The control to work on
         * @return An array of all the binding commands extracted from the control
         */
        private static getBindingCommands(control: TemplateControl): IBindingCommand[] {
            var bindingCommands: IBindingCommand[];

            var elements: HTMLElement[] = [];
            elements.push(control.rootElement);

            while (elements.length > 0) {
                var element: HTMLElement = elements.pop();
                var childControl: IControl = (<IHTMLControlLink><any>element).control;

                // The target for the binding is always the element except for a child control in this case the target becomes the child control.
                var target: any = element;
                if (childControl && childControl !== control) {
                    target = childControl;
                }

                if (target) {
                    var attr: Attr;

                    attr = element.getAttributeNode(TemplateDataAttributes.BINDING);
                    if (attr) {
                        bindingCommands = bindingCommands || [];
                        TemplateDataBinding.extractBindingCommandsForBinding(bindingCommands, target, element, attr.value, false /* isControlBinding */);
                        element.removeAttributeNode(attr);
                    }

                    attr = element.getAttributeNode(TemplateDataAttributes.CONTROL_BINDING);
                    if (attr) {
                        bindingCommands = bindingCommands || [];
                        TemplateDataBinding.extractBindingCommandsForBinding(bindingCommands, target, element, attr.value, true /* isControlBinding */);
                        element.removeAttributeNode(attr);
                    }

                    attr = element.getAttributeNode(TemplateDataAttributes.OPTIONS);
                    if (attr) {
                        bindingCommands = bindingCommands || [];
                        
                        // The target for options is always the control except if it's an element
                        var optionsTarget: any = childControl || element; 
                        TemplateDataBinding.extractBindingCommandsForOptions(bindingCommands, optionsTarget, element, attr.value);
                        element.removeAttributeNode(attr);
                    }
                }

                // Don't traverse through control children elements
                if (element.children && (!element.hasAttribute(TemplateDataAttributes.CONTROL) || element === control.rootElement)) {
                    var childrenCount = element.children.length;
                    for (var i = 0; i < childrenCount; i++) {
                        elements.push(<HTMLElement>element.children[i]);
                    }
                }
            }

            return bindingCommands;
        }

        /**
         * Gets all the binding relationships from the given control
         * @param control The control to work on
         * @return An array of all the binding relationships extracted from the control
         */
        private static bind(control: TemplateControl): Binding[] {
            var bindings: Binding[];

            var bindingCommands: IBindingCommand[] = TemplateDataBinding.getBindingCommands(control);
            if (bindingCommands) {
                bindings = [];

                var bindingCommandsCount = bindingCommands.length;
                for (var i = 0; i < bindingCommandsCount; i++) {
                    var bindingCommand = bindingCommands[i];

                    if (bindingCommand.source) {
                        // Create a binding to the control target
                        var binding = new Binding(
                            control,                        // source
                            bindingCommand.source.name,
                            bindingCommand.target,
                            bindingCommand.targetName,
                            bindingCommand.source.converter,
                            bindingCommand.source.mode,
                            bindingCommand.targetAccess);
                        bindings.push(binding);
                    } else if (bindingCommand.value !== undefined) {
                        // Assign the value
                        bindingCommand.targetAccess.setValue(
                            bindingCommand.target, bindingCommand.targetName, bindingCommand.value);
                    }
                }
            }

            return bindings && bindings.length > 0 ? bindings : null;
        }

        /**
         * Get the converter instance for the given identifier
         * @param identifier The full id for the converter
         * @return The converter instance
         */
        private static getConverterInstance(identifier: string): IConverter {
            var obj: any = window;
            var parts: string[] = identifier.split(".");

            for (var i = 0; i < parts.length; i++) {
                var part: string = parts[i];
                obj = obj[part];
                F12.Tools.Utility.Assert.hasValue(obj, "Couldn't find the converter instance with the given name '" + identifier + "'.");
            }

            F12.Tools.Utility.Assert.hasValue(
                (<IConverter>obj).convertFrom || (<IConverter>obj).convertTo, "The converter instance with the given name '" + identifier + "' doesn't point to a valid converter instance.");

            return <IConverter>obj;
        }

        /**
         * Parse the source syntax extracting the source id, mode and converter
         * @param syntax The binding syntax
         * @return The binding source object
         */
        private static parseSourceSyntax(syntax: string): IBindingSource {
            F12.Tools.Utility.Assert.isTrue(!!syntax, "Invalid binding syntax.");

            var parts: string[] = syntax.split(";");

            var bindingSource: IBindingSource = {
                name: parts[0].trim()
            };

            for (var i = 1; i < parts.length; i++) {
                var keyValue = parts[i].split("=", 2);
                F12.Tools.Utility.Assert.areEqual(keyValue.length, 2, "Invalid binding syntax, the keyvalue pair should have the syntax key=value.");

                switch (keyValue[0].trim().toLowerCase()) {
                    case "mode":
                        bindingSource.mode = keyValue[1].trim().toLowerCase();
                        break;

                    case "converter":
                        bindingSource.converter = TemplateDataBinding.getConverterInstance(keyValue[1].trim());
                        break;
                }
            }

            return bindingSource;
        }
    }
}