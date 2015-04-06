/// <reference path="core/framework/templating/templateloader.ts" />
/// <reference path="core/framework/templating/htmltemplaterepository.ts" />
/// <reference path="models.ts" />

// Use the templates inside the main HTML page to load templates
Common.templateLoader = new Common.TemplateLoader(new Common.HtmlTemplateRepository());

class Greeter {
    element: HTMLElement;

    sampleListControl: Common.Controls.ItemsControl;
    sampleListModel: Common.ObservableCollection<FxUsageExampleModel>;

    constructor(element: HTMLElement) {
        this.sampleListControl = new Common.Controls.ItemsControl("sampleListTemplate");

        this.sampleListModel = new Common.ObservableCollection<FxUsageExampleModel>();
        this.sampleListModel.push(new FxUsageExampleModel("SVG Sample", (root) => { this.SvgSample(root); }));
        this.sampleListModel.push(new FxUsageExampleModel("Background SVG Sample", (root) => { this.backgroundSvgSample(root); }));
        this.sampleListModel.push(new FxUsageExampleModel("Special Shape Button Sample", (root) => { this.specialShapeButtonSample(root); }));
        this.sampleListModel.push(new FxUsageExampleModel("2 Divs Overlap Sample", (root) => { this.twoDivOverlapSample(root); }));
        this.sampleListModel.push(new FxUsageExampleModel("Many Icon Divs Sample", (root) => { this.manyIconDivOverlapSample(root); }));
        this.sampleListModel.push(new FxUsageExampleModel("Many Bg Divs Sample", (root) => { this.manyBgDivOverlapSample(root); }));
        this.sampleListModel.push(new FxUsageExampleModel("Product Code Sample", (root) => { this.productCodeSample(root); }));
        this.sampleListModel.push(new FxUsageExampleModel("Product Code Sample 2", (root) => { this.productCodeSampleNoBinding(root); }));
        this.sampleListControl.items = this.sampleListModel;
        this.sampleListControl.itemContainerControl = "Common.Controls.Button(fxUsageSampleTemplate)";

        element.appendChild(this.sampleListControl.rootElement);
        this.addClickHandler();
    }

    private addClickHandler() {
        var el = document.getElementById('sample-div');

        this.getElements(
            this.sampleListControl.rootElement, "button", Common.TemplateDataAttributes.NAME, "fxUsageSampleButton",
            (control: Common.IControl) => {
                var button = <Common.Controls.Button>control;
                if (button) {
                    button.click.addHandler((e: Event) =>
                    {
                        el.innerHTML = "";
                        (<FxUsageExampleModel>button.model).sampleFunction.call(this, el);
                    });
                }
            });        
    }

    private getElements(root: HTMLElement, tagName: string, attribute: string, value: string, callback: (element: Common.IControl) => void) {        
        var tags = window.document.getElementsByTagName(tagName);
        for (var i = 0; i < tags.length; i++) {
            var element = <HTMLElement>tags[i];
            if (element && element.getAttribute(attribute) == value) {
                var control = (<Common.IHTMLControlLink><any>element).control;
                if (control) {
                    callback(control);
                }
            }
        }
    }

    public SvgSample(root: HTMLElement) {
        var showBorderClass: string = "show-border";

        /// Sample 1: simplest SVG image
        var control1 = new Common.TemplateControl("svgcontrolTemplate1");
        root.appendChild(control1.rootElement);

        /// Sample 2: click SVG button
        var control2 = new Common.Controls.Button("svgcontrolTemplate2");
        var svgModel2 = new SvgControlModel("svg\\TimelineMarkException_14x.svg", showBorderClass);
        control2.model = svgModel2;
        root.appendChild(control2.rootElement);

        control2.click.addHandler((e: Event) => {
            if (svgModel2.svgPath.indexOf("14x") > 0) {
                svgModel2.svgPath = "svg\\TimelineMarkException_16x.svg";
            } else {
                svgModel2.svgPath = "svg\\TimelineMarkException_14x.svg";
            }
        });

        /// Sample 3: click SVG button, bind to className
        var control3 = new Common.Controls.Button("svgcontrolTemplate2");
        var svgModel3 = new SvgControlModel("svg\\TimelineMarkException_14x.svg", showBorderClass + " svg-icon-14px");
        control3.model = svgModel3;
        root.appendChild(control3.rootElement);

        control3.click.addHandler((e: Event) => {
            if (svgModel3.svgPath.indexOf("14x") > 0) {
                svgModel3.svgPath = "svg\\TimelineMarkException_16x.svg";
                svgModel3.cssClass = showBorderClass + " svg-icon-16px";
            } else {
                svgModel3.svgPath = "svg\\TimelineMarkException_14x.svg";
                svgModel3.cssClass = showBorderClass + " svg-icon-14px";
            }
        });

        /// Sample 4: click SVG button, style binding
        var control4 = new Common.Controls.Button("svgcontrolTemplate3");
        var svgModel4 = new SvgControlModel("svg\\TimelineMarkException_14x.svg", "", "2px");
        control4.model = svgModel4;
        root.appendChild(control4.rootElement);

        control4.click.addHandler((e: Event) => {
            if (svgModel4.svgPath.indexOf("14x") > 0) {
                svgModel4.svgPath = "svg\\TimelineMarkException_16x.svg";
                svgModel4.svgPadding = "1px";
            } else {
                svgModel4.svgPath = "svg\\TimelineMarkException_14x.svg";
                svgModel4.svgPadding = "2px";
            }
        });
    }

    public backgroundSvgSample(root: HTMLElement) {
        /// Sample: SVG background
        var control1 = new Common.TemplateControl("svgBgTemplate1");
        root.appendChild(control1.rootElement);
        
        /// Sample: bind to style.background
        var control2 = new Common.Controls.Button("svgBgTemplate2");
        var svgModel2 = new SvgControlModel("url(svg\\\\TimelineMarkException_14x.svg)", "", "1px");
        control2.model = svgModel2;
        root.appendChild(control2.rootElement);

        control2.click.addHandler((e: Event) => {
            if (svgModel2.svgPath.indexOf("14x") > 0) {
                svgModel2.svgPath = "url(svg\\\\TimelineMarkException_16x.svg)";
                svgModel2.svgPadding = "0px";
            } else {
                svgModel2.svgPath = "url(svg\\\\TimelineMarkException_14x.svg)";
                svgModel2.svgPadding = "1px";
            }
        });
    }

    public specialShapeButtonSample(root: HTMLElement) {
        /// Sample special shape with CSS
        var control1 = new Common.TemplateControl("shapedButtonTemplate1");
        root.appendChild(control1.rootElement);
        
        /// Sample special shape with rotate
        var control2 = new Common.TemplateControl("shapedButtonTemplate2");
        root.appendChild(control2.rootElement);

        /// Sample: background shapes overlap
        var control3 = new Common.TemplateControl("shapedButtonTemplate3");
        root.appendChild(control3.rootElement);

        /// Sample: image shapes overlap
        var control4 = new Common.TemplateControl("shapedButtonTemplate4");
        root.appendChild(control4.rootElement);
    }

    public twoDivOverlapSample(root: HTMLElement) {
        /// Sample: simple overlap
        var control1 = new Common.TemplateControl("2divOverlap1");
        root.appendChild(control1.rootElement);

        /// Sample: with data binding
        var control2 = new Common.TemplateControl("2divOverlap1");
        var model2 = new EventPointModel("50px", "10px", "url(svg\\\\TimelineMarkException_14x.svg)");
        control2.model = model2;
        root.appendChild(control2.rootElement);
    }

    public manyIconDivOverlapSample(root: HTMLElement) {
        for (var i: number = 0; i < 150; ++i) {
            for (var j: number = 0; j < 6; ++j) {
                var control = new Common.Controls.Button("2divOverlap1");
                var model = new EventPointModel(i * 4 + (i * 0.132) + "px", j * 20 + "px", "url(svg\\\\TimelineMarkException_14x.svg)");
                control.model = model;
                control.click.addHandler(
                    (function (model) {
                        return function (e: Event) {
                            model.svgPath = "url(svg\\\\TimelineMarkExceptionHistoricalSelected_14x.svg)";
                        };
                    })(model)
                    );
                root.appendChild(control.rootElement);
            }
        }
    }

    public manyBgDivOverlapSample(root: HTMLElement) {
        for (var i: number = 0; i < 150; ++i) {
            for (var j: number = 0; j < 6; ++j) {
                var control = new Common.Controls.Button("bgDiv1");
                var model = new EventPointModel(i * 4 + "px", j * 20 + "px", "");
                control.model = model;
                root.appendChild(control.rootElement);
            }
        }
    }

    public productCodeSample(root: HTMLElement) {
        for (var i: number = 0; i < 150; ++i) {
            for (var j: number = 0; j < 6; ++j) {
                var control = new Common.Controls.Button("productDivs");
                var model = new EventPointModel(i * 4 + (i * 0.132) + "px", j * 20 + "px", "custom.png");
                control.model = model;
                root.appendChild(control.rootElement);
            }
        }
    }

    public productCodeSampleNoBinding(root: HTMLElement) {
        var fragment: HTMLDivElement = document.createElement("div");

        for (var i: number = 0; i < 150; ++i) {
            for (var j: number = 0; j < 6; ++j) {
                var div: HTMLDivElement = document.createElement("div");
                var innerDiv: HTMLDivElement = document.createElement("div");
                innerDiv.className = "rotate-nobackground";
                innerDiv.setAttribute("data-plugin-vs-tooltip", "hello long tooltip, this is not that long");
                innerDiv.setAttribute("aria-label", "hello long tooltip, this is not that long");
                div.appendChild(innerDiv);
                div.className = "no-binding";
                div.style.left = (i * 4 + (i * 0.132)) + "px";
                div.style.top = j * 20 + "px";
                div.addEventListener("click", this.onMouseEvent);  
                div.addEventListener("mousedown", this.onMouseEvent);  
                div.addEventListener("mouseup", this.onMouseEvent);  
                div.setAttribute("data-plugin-vs-tooltip", "hello long tooltip, this is not that long");
                div.setAttribute("aria-label", "hello long tooltip, this is not that long");
                fragment.appendChild(div);
            }
        }

        root.appendChild(fragment);
    }

    private onMouseEvent(e: MouseEvent): void {
        var stopPropagation = false;
        switch (e.type) {
            case "click":
                break;
            case "mousedown":
                break;
            case "mouseup":
            case "mouseleave":
                break;
            default:
                F12.Tools.Utility.Assert.fail("Unexpected");
        }

        if (stopPropagation) {
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }
}


window.onload = () => {
    var el = document.getElementById('content');
    var greeter = new Greeter(el);
    greeter.productCodeSample(document.getElementById('sample-div'));   
};