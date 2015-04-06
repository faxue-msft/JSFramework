// 
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="../../assert.ts" />
/// <reference path="../IControl.ts" />
/// <reference path="ITemplateRepository.ts" />
/// <reference path="TemplateControl.ts" />
/// <reference path="TemplateDataAttributes.ts" />
/// <reference path="ScriptTemplateRepository.ts" />

module Common {
    "use strict";

    /**
     * Represents a map that holds string as a key
     */
    export interface IStringSet {
        [name: string]: boolean;
    }

    /**
     * Defines the template cache map
     */
    export interface ITemplateCache {
        [id: string]: HTMLElement;
    }

    /**
     * Defines the template loader used to load templates, resolve template placeholders and then generate
     * HTML root element from the template.
     */
    export class TemplateLoader {
        private _parsingNode: HTMLElement;
        private _repository: ITemplateRepository;
        private _templateCache: ITemplateCache;
        private _visitedControls: IStringSet;
        private _visitedTemplates: IStringSet;

        /**
         * Constructor
         * @param repository The repository used to find template strings
         */
        constructor(repository: ITemplateRepository) {
            F12.Tools.Utility.Assert.hasValue(repository, "Invalid template repository.");

            this._parsingNode = document.createElement("div");
            this._repository = repository;
            this._templateCache = {};
            this._visitedControls = {};
            this._visitedTemplates = {};
        }

        /**
         * Gets the repository used to host html contents with this loader
         */
        public get repository(): ITemplateRepository {
            return this._repository;
        }

        /**
         * Gets the control type from the given control full name
         * @param controlName The fully qualified name of the control
         * @return The control type
         */
        public static getControlType(controlName: string): any {
            F12.Tools.Utility.Assert.isTrue(!!controlName, "Invalid control name.");

            var controlType: any = window;
            var nameParts: string[] = controlName.split(".");

            for (var i = 0; i < nameParts.length; i++) {
                var part: string = nameParts[i];
                controlType = controlType[part];
                F12.Tools.Utility.Assert.hasValue(controlType, "Couldn't find the control with the given name '" + controlName + "'.");
            }

            F12.Tools.Utility.Assert.areEqual(typeof controlType, "function",
                "The given control '" + controlName + "' doesn't represent a control type which implements IControl.");

            return controlType;
        }

        /**
         * Loads the template providing its templateId. Caches the loaded templates by their templateId.
         * @param templateId The template ID to get the HTML for
         * @return The HTML element root for the template
         */
        public loadTemplate(templateId: string): HTMLElement {
            var cachedElement: HTMLElement = this._templateCache[templateId];
            if (!cachedElement) {
                var template: string = this._repository.getTemplateString(templateId);

                F12.Tools.Utility.Assert.isFalse(this._visitedTemplates[templateId],
                    "Detected a recursive template. TemplateId '" + templateId + "' is part of the parents hierarchy.");

                this._visitedTemplates[templateId] = true;
                try {
                    cachedElement = this.loadTemplateUsingHtml(template);
                } finally {
                    this._visitedTemplates[templateId] = false;
                }

                this._templateCache[templateId] = cachedElement;
            }

            var rootElement = <HTMLElement>cachedElement.cloneNode(true);
            rootElement = this.resolvePlaceholders(rootElement);
            return rootElement;
        }

        /**
         * Loads the template providing the HTML string for the template.
         * @param templateHtml An HTML string for the template
         * @return The HTML element root for the template
         */
        private loadTemplateUsingHtml(templateHtml: string): HTMLElement {
            this._parsingNode.innerHTML = templateHtml;
            F12.Tools.Utility.Assert.areEqual(this._parsingNode.childElementCount, 1, "Template should have only one root element.");

            var rootElement = <HTMLElement>this._parsingNode.children[0];

            // No use for the parsing node anymore. So, disconnect the rootElement from it.
            this._parsingNode.removeChild(rootElement);

            return rootElement;
        }

        private getControlInstance(controlName: string, templateId: string): IControl {
            F12.Tools.Utility.Assert.isTrue(!!controlName, "Invalid control name.");

            var controlType: any = TemplateLoader.getControlType(controlName);
            var control: IControl;

            // For template controls, pass the templateId to the constructor
            if (TemplateControl.prototype.isPrototypeOf(controlType.prototype) ||
                Common.TemplateControl.prototype === controlType.prototype) {
                control = new controlType(templateId);
            } else {
                control = new controlType();
            }

            F12.Tools.Utility.Assert.hasValue(control.rootElement,
                "The given control '" + controlName + "' doesn't represent a control type which implements IControl.");

            // Attach the control to the root element if it's not yet attached
            if ((<IHTMLControlLink><any>control.rootElement).control !== control) {
                (<IHTMLControlLink><any>control.rootElement).control = control;
            }

            return control;
        }

        private resolvePlaceholders(root: HTMLElement): HTMLElement {
            // Test the node itself, otherwise test its children
            if (root.hasAttribute(TemplateDataAttributes.CONTROL)) {
                root = this.resolvePlaceholder(root);
            } else {
                // Resolve all children
                var placeholders: NodeList = root.querySelectorAll("div[" + TemplateDataAttributes.CONTROL + "]");
                var placeholdersCount = placeholders.length;
                for (var i = 0; i < placeholdersCount; i++) {
                    var node = <HTMLElement>placeholders[i];
                    this.resolvePlaceholder(node);
                }
            }

            return root;
        }

        private resolvePlaceholder(node: HTMLElement): HTMLElement {
            F12.Tools.Utility.Assert.isFalse(node.hasChildNodes(), "Control placeholders cannot have children.");

            var controlName: string = node.getAttribute(TemplateDataAttributes.CONTROL);
            var templateId: string = node.getAttribute(TemplateDataAttributes.CONTROL_TEMPLATE_ID);

            var controlVisistedKey: string = controlName + (templateId ? "," + templateId : "");

            F12.Tools.Utility.Assert.isFalse(this._visitedControls[controlVisistedKey],
                "Detected a recursive control. Control '" + controlVisistedKey + "' is part of the parents hierarchy.");

            this._visitedControls[controlVisistedKey] = true;
            try {
                var controlInstance: IControl = this.getControlInstance(controlName, templateId);
            } finally {
                this._visitedControls[controlVisistedKey] = false;
            }

            var controlNode = controlInstance.rootElement;

            // Copy all properties from original node to the new node
            for (var i = 0; i < node.attributes.length; i++) {
                var sourceAttribute: Attr = node.attributes[i];
                controlNode.setAttribute(sourceAttribute.name, sourceAttribute.value);
            }

            if (node.parentElement) {
                node.parentElement.replaceChild(controlNode, node);
            }

            return controlNode;
        }
    }

    /**
     * The global templateLoader member
     */
    export var templateLoader: TemplateLoader = new TemplateLoader(templateRepository);
}
