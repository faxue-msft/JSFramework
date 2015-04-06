//
// Copyright (C) Microsoft. All rights reserved.
//
// THIS IS ONLY HERE FOR UNIT TESTS. UNIT TESTS CURRENTLY BUILD IN SINGLE FILE MODE,
// FOLLOWING <reference> TAGS. THESE EXPECT THIS FILE TO BE IN THE SOURCE TREE IN THE COMMON
// DIRECTORY, WHEREAS IN REALITY IT'S ONLY IN THE COMMON DIRECTORY AFTER BUILDING.
var isDebugBuild = true;
//
// Copyright (C) Microsoft. All rights reserved.
//
/// <reference path="isDebugBuild.ts" />
/// <reference path="common.d.ts" />
/// <reference path="Plugin.d.ts" />
var Common;
(function (Common) {
    "use strict";

    var ErrorHandling = (function () {
        function ErrorHandling() {
        }
        /**
        * Reports to Watson given a textual stack, parsing out relevant information so it can be bucketed.
        * @param error The Error object.
        */
        ErrorHandling.reportErrorGivenStack = function (error) {
            // Example of error.stack:
            //
            // "Error: failure pretty printing
            //    at Anonymous function (res://C:\Program Files\Internet Explorer\iexplore.exe.local\F12Resources.dll/23/debugger/DebuggerMerged.js:11993:25)
            //    at notifySuccess(res://C:\Program Files\Internet Explorer\iexplore.exe.local\F12Resources.dll/23/pluginhost/plugin.f12.js:6739:21)
            //    at enter(res://C:\Program Files\Internet Explorer\iexplore.exe.local\F12Resources.dll/23/pluginhost/plugin.f12.js:6426:21)
            //    at _run(res://C:\Program Files\Internet Explorer\iexplore.exe.local\F12Resources.dll/23/pluginhost/plugin.f12.js:6642:17)
            //    at _completed(res://C:\Program Files\Internet Explorer\iexplore.exe.local\F12Resources.dll/23/pluginhost/plugin.f12.js:6610:13)
            //    at Anonymous function (res://C:\Program Files\Internet Explorer\iexplore.exe.local\F12Resources.dll/23/debugger/DebuggerMerged.js:11450:33)
            //    at notifySuccess(res://C:\Program Files\Internet Explorer\iexplore.exe.local\F12Resources.dll/23/pluginhost/plugin.f12.js:6739:21)
            //    at enter(res://C:\Program Files\Internet Explorer\iexplore.exe.local\F12Resources.dll/23/pluginhost/plugin.f12.js:6426:21)
            //    at _run(res://C:\Program Files\Internet Explorer\iexplore.exe.local\F12Resources.dll/23/pluginhost/plugin.f12.js:6642:17)
            //    at _completed(res://C:\Program Files\Internet Explorer\iexplore.exe.local\F12Resources.dll/23/pluginhost/plugin.f12.js:6610:13)"
            //
            // In this case we want "debugger/debuggermerged.js", 11993 and 25.
            //
            var message = error.message;
            var stack = error.stack;

            // Remove all but the top function
            var firstCloseParen = stack.indexOf(")");
            if (firstCloseParen > 0) {
                stack = stack.substr(0, firstCloseParen + 1);
            }

            var result = ErrorHandling.StackRegex.exec(stack);

            if (result) {
                // result[1] is the function name
                var file = result[3];
                var line = parseInt(result[4], 10);
                var column = parseInt(result[5], 10);

                window.reportError(message, file, line, error.stack, column);
            }
        };

        ErrorHandling.reportErrorDetails = function (errorDetails) {
            window.reportError(errorDetails.message, errorDetails.file, errorDetails.line, errorDetails.additionalInfo, errorDetails.column);
        };
        ErrorHandling.StackRegex = new RegExp(".* at ([^(]+) \(.*/23/([^:]+):([0-9]+):([0-9]+)\)", "gim");
        return ErrorHandling;
    })();
    Common.ErrorHandling = ErrorHandling;
})(Common || (Common = {}));

// window is undefined in web workers
if (typeof window !== "undefined") {
    // Overrides the implementation from bptoob\ScriptedHost\Scripts\diagnostics.ts (InternalApis\bptoob\inc\diagnostics.ts)
    // to add the ability to report the error to the window.errorDisplayHandler before doing "reportError"
    // It also does not call Plugin.Diagnostics.terminate() at the end of onerror.
    /**
    * Handles JavaScript errors in the toolwindows by reporting them as non-fatal errors
    * @param message The error message
    * @param file The file in which the error occurred
    * @param line The line on which the error occurred
    * @param additionalInfo Any additional information about the error such as callstack
    * @param column The column on which the error occurred
    */
    window.reportError = function (message, file, line, additionalInfo, column) {
        // Plugin error reporting causes an error if any of these values are null
        message = message || "";
        file = file || "";
        line = line || 0;
        additionalInfo = additionalInfo || "";
        column = column || 0;

        if (isDebugBuild) {
            // Report to the "UI" in some way
            var externalObj;
            if (window.parent.getExternalObj) {
                // Hosted in an IFRAME, so get the external object from there
                externalObj = window.parent.getExternalObj();
            } else if (window.external) {
                // Hosted in Visual Studio
                externalObj = window.external;
            }

            if (externalObj) {
                var component = (window.errorComponent ? window.errorComponent : "Common");
                console.error([component, message, file, line, column].join("\r\n"));

                // Display a warning message to the user
                if (window.errorDisplayHandler) {
                    window.errorDisplayHandler(message, file, line, additionalInfo, column);
                }
            }
        }

        // Report the NFE to the watson server
        if (Plugin && Plugin.Diagnostics && Plugin.Diagnostics.reportError) {
            Plugin.Diagnostics.reportError(message, file, line, additionalInfo, column);
        }
    };

    /**
    * Handles JavaScript errors in the toolwindows by reporting them as non-fatal errors
    * Some hosts then terminate, F12 does not.
    * @param message The error message
    * @param file The file in which the error occurred
    * @param line The line on which the error occurred
    * @param columnNumber Optional column number on which the error occurred
    * @return Returns true to mark the error as handled, False to display the default error dialog
    */
    window.onerror = function (message, file, line, columnNumber) {
        // In IE11 GDR onwards, there is actually a 5th argument, for error - but the Typescript stubs aren't updated
        var column = 0;
        var additionalInfo = "";
        if (arguments) {
            if (arguments[3] && typeof arguments[3] === "number") {
                column = arguments[3];
            }

            if (arguments[4] && arguments[4] instanceof Error) {
                additionalInfo = "Error number: " + arguments[4].number;
                additionalInfo += "\r\nStack: " + arguments[4].stack;
            }
        }

        window.reportError(message, file, line, additionalInfo, column);

        return true;
    };
}
//
// Copyright (C) Microsoft. All rights reserved.
//
var F12;
(function (F12) {
    (function (Tools) {
        /// <reference path="errorHandling.ts" />
        /// <disable code="SA9017" />
        (function (Utility) {
            "use strict";

            /**
            * Utility functions for verifying internal state.
            * These assertions always be true unless there is a programming error or installation error.
            * User error should be tested with "if" and fail with a localized string.
            * Not intended to be used in unit test code, only product code.
            */
            var Assert = (function () {
                function Assert() {
                }
                // Possible other asserts:
                //
                // isInstanceOfType(value: any, comparand: any)
                // succeeded(message: string, (any)=>any)
                // isMatch(value: string, pattern: string)
                // isNumber/Array/Function/String
                //
                Assert.isTrue = function (condition, message) {
                    if (!condition) {
                        message = message ? "Internal error. " + message : "Internal error. Unexpectedly false.";
                        Assert.fail(message);
                    }
                };

                Assert.isFalse = function (condition, message) {
                    if (condition) {
                        message = message ? "Internal error. " + message : "Internal error. Unexpectedly true.";
                        Assert.fail(message);
                    }
                };

                Assert.isNull = function (value, message) {
                    if (value !== null) {
                        message = message ? "Internal error. " + message : "Internal error. Unexpectedly not null.";
                        message += " '" + value + "'";
                        Assert.fail(message);
                    }
                };

                Assert.isUndefined = function (value, message) {
                    if (undefined !== void 0) {
                        // This cannot happen in the Chakra engine.
                        message = "Internal error. Unexpectedly undefined has been redefined.";
                        message += " '" + undefined + "'";
                        Assert.fail(message);
                    }

                    if (value !== undefined) {
                        message = message ? "Internal error. " + message : "Internal error. Unexpectedly not undefined.";
                        message += " '" + value + "'";
                        Assert.fail(message);
                    }
                };

                Assert.hasValue = function (value, message) {
                    if (undefined !== void 0) {
                        // This cannot happen in the Chakra engine.
                        message = "Internal error. Unexpectedly undefined has been redefined.";
                        message += " '" + undefined + "'";
                        Assert.fail(message);
                    }

                    if (value === null || value === undefined) {
                        message = message ? "Internal error. " + message : ("Internal error. Unexpectedly " + (value === null ? "null" : "undefined") + ".");
                        Assert.fail(message);
                    }
                };

                Assert.areEqual = function (value1, value2, message) {
                    // Could probe for an equals() method?
                    if (value1 !== value2) {
                        message = message ? "Internal error. " + message : "Internal error. Unexpectedly not equal.";
                        message += " '" + value1 + "' !== '" + value2 + "'.";
                        Assert.fail(message);
                    }
                };

                Assert.areNotEqual = function (value1, value2, message) {
                    if (value1 === value2) {
                        message = message ? "Internal error. " + message : "Internal error. Unexpectedly equal.";
                        message += " '" + value1 + "' === '" + value2 + "'.";
                        Assert.fail(message);
                    }
                };

                Assert.fail = function (message) {
                    // Uncomment next line if you wish
                    // debugger;
                    var error = new Error((message || "Assert failed.") + "\n");

                    try  {
                        throw error;
                    } catch (ex) {
                        if (Common && Common.ErrorHandling) {
                            // The error now has a call stack so we can report it
                            // If we simply let this throw, we would instead report it in windows.onerror, and would not have the callstack at that point
                            Common.ErrorHandling.reportErrorGivenStack(ex);
                        }

                        throw ex;
                    }
                };

                Assert.failDebugOnly = function (message) {
                    // Fail if it is a debug build
                    if (isDebugBuild) {
                        Assert.fail(message);
                    }
                };
                return Assert;
            })();
            Utility.Assert = Assert;
        })(Tools.Utility || (Tools.Utility = {}));
        var Utility = Tools.Utility;
    })(F12.Tools || (F12.Tools = {}));
    var Tools = F12.Tools;
})(F12 || (F12 = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    "use strict";

    

    
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    "use strict";

    
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    "use strict";

    /** Types of change events that can occur on IObservableCollection objects */
    (function (CollectionChangedAction) {
        CollectionChangedAction[CollectionChangedAction["Add"] = 0] = "Add";
        CollectionChangedAction[CollectionChangedAction["Remove"] = 1] = "Remove";
        CollectionChangedAction[CollectionChangedAction["Reset"] = 2] = "Reset";
        CollectionChangedAction[CollectionChangedAction["Clear"] = 3] = "Clear";
    })(Common.CollectionChangedAction || (Common.CollectionChangedAction = {}));
    var CollectionChangedAction = Common.CollectionChangedAction;
    ;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    "use strict";

    
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    "use strict";

    
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
/// <reference path="../assert.ts" />
/// <reference path="IEventHandler.ts" />
/// <reference path="IEventRegistration.ts" />
var Common;
(function (Common) {
    "use strict";

    /**
    * An event object which can have multiple listeners which are called when the event is invoked
    */
    var EventSource = (function () {
        function EventSource() {
            this._handlers = null;
            this._eventsRunning = 0;
        }
        /**
        * Adds a handler to the event.  The handler can be removed by calling dispose on the returned object, or by calling removeHandler
        * @param handler - The function to be called when the event is invoked
        * @return A disposable object which removes the handler when it's disposed
        */
        EventSource.prototype.addHandler = function (handler) {
            var _this = this;
            F12.Tools.Utility.Assert.isTrue(typeof handler === "function", "handler must be function");

            if (!this._handlers) {
                this._handlers = [];
            }

            this._handlers.push(handler);
            return { unregister: function () {
                    return _this.removeHandler(handler);
                } };
        };

        /**
        * Adds a handler which is called on the next invokation of the event, and then the handler is removed
        * @param handler - The handler to be called on the next invokation of the the event
        * @return A disposable object which removes the handler when it's disposed
        */
        EventSource.prototype.addOne = function (handler) {
            var registration = this.addHandler(function (args) {
                registration.unregister();
                handler(args);
            });
            return registration;
        };

        /**
        * Removes a handler from the list of handlers.  This can also be called by disposing the object returned from an
        * add call
        * @param handler - The event handler to remove
        */
        EventSource.prototype.removeHandler = function (handler) {
            F12.Tools.Utility.Assert.hasValue(this._handlers && this._handlers.length, "Shouldn't call remove before add");
            var i = this._handlers.length;
            while (i--) {
                if (this._handlers[i] === handler) {
                    if (this._eventsRunning > 0) {
                        this._handlers[i] = null;
                    } else {
                        this._handlers.splice(i, 1);
                    }

                    return;
                }
            }

            F12.Tools.Utility.Assert.fail("Called remove on a handler which wasn't added");
        };

        /**
        * Invokes the event with the specified args
        * @param args - The event args to pass to each handler
        */
        EventSource.prototype.invoke = function (args) {
            if (this._handlers) {
                this._eventsRunning++;

                for (var i = 0; i < this._handlers.length; i++) {
                    this._handlers[i] && this._handlers[i](args);
                }

                this._eventsRunning--;
                if (this._eventsRunning === 0) {
                    this.cleanupNullHandlers();
                }
            }
        };

        /**
        * Invokes the event with the sepecified args and waits for the
        * returns a promise that completes when all the async handlers complete
        * @param args - The event args to pass to each handler
        */
        EventSource.prototype.invokeAsync = function (args) {
            if (this._handlers) {
                this._eventsRunning++;
                var promises = [];

                for (var i = 0; i < this._handlers.length; i++) {
                    var promise = this._handlers[i] && this._handlers[i](args);
                    if (promise && promise.then) {
                        promises.push(promise);
                    }
                }

                this._eventsRunning--;
                if (this._eventsRunning === 0) {
                    this.cleanupNullHandlers();
                }

                return Plugin.Promise.join(promises);
            }

            return Plugin.Promise.wrap(null);
        };

        /**
        * Event handlers that get removed while an invoke() is still iterating are set to null instead of
        * being removed from this._handlers. This method executes after all invocations finish.
        */
        EventSource.prototype.cleanupNullHandlers = function () {
            for (var i = this._handlers.length - 1; i >= 0; i--) {
                if (!this._handlers[i]) {
                    this._handlers.splice(i, 1);
                }
            }
        };
        return EventSource;
    })();
    Common.EventSource = EventSource;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
/// <reference path="CollectionChangedAction.ts" />
/// <reference path="../EventSource.ts" />
var Common;
(function (Common) {
    "use strict";

    

    

    
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
/// <reference path="IObservable.ts" />
var Common;
(function (Common) {
    "use strict";

    /** An object which fires propertyChanged events when its properties are updated */
    var Observable = (function () {
        function Observable() {
            this.propertyChanged = new Common.EventSource();
        }
        /**
        * Generates an ObservableObject from a given plain object.  The returned object
        * matches the shape of the supplied object, but with an additional propertyChanged
        * event source that can be subscribed to.
        */
        Observable.fromObject = function (obj) {
            // Prevent re-wrapping objects that statisfy IObservable already
            if (typeof obj.propertyChanged !== "undefined") {
                return obj;
            }

            var returnValue = new Observable();
            var backingData = {};
            Object.defineProperties(returnValue, ObservableHelpers.expandProperties(obj, backingData, returnValue));
            returnValue["_backingData"] = backingData;
            return returnValue;
        };
        return Observable;
    })();
    Common.Observable = Observable;

    /** Helper methods for the ObservableObject class */
    var ObservableHelpers = (function () {
        function ObservableHelpers() {
        }
        /**
        * Defines an observable property on a class' prototype
        * @param classToExtend The class which should be extended
        * @param propertyName The name of the property to add
        * @param onChanged Callback to handle value changes
        * @param onChanging Callback gets called before changing the value
        * @param defaultValue The initial value of the property
        */
        ObservableHelpers.defineProperty = function (classToExtend, propertyName, defaultValue /*T*/ , onChanged, onChanging) {
            var backingFieldName = "_" + propertyName;

            Object.defineProperty(classToExtend.prototype, propertyName, {
                get: function () {
                    if (typeof this[backingFieldName] === "undefined") {
                        this[backingFieldName] = defaultValue;
                    }

                    return this[backingFieldName];
                },
                set: function (newValue) {
                    var oldValue = this[backingFieldName];
                    if (newValue !== oldValue) {
                        if (onChanging) {
                            onChanging(this, oldValue, newValue);
                        }

                        this[backingFieldName] = newValue;

                        var observable = this;
                        observable.propertyChanged.invoke(propertyName);

                        if (onChanged) {
                            onChanged(this, oldValue, newValue);
                        }
                    }
                }
            });
        };

        /**
        * Creates a PropertyDescriptor for a given property on a given object and stores backing data in a supplied dictionary object
        * for the purpose of generating a property that invokes a propertyChanged event when it is updated.
        * @param propertyName The property to generate a descriptor for
        * @param objectShape The plain object which contains the property in question
        * @param backingDataStore The object which will contain the backing data for the property that is generated
        * @param invokableObserver The observer which will receive the propertyChanged event when the property is changed
        */
        ObservableHelpers.describePropertyForObjectShape = function (propertyName, objectShape, backingDataStore, invokableObserver) {
            var returnValue = {
                get: function () {
                    return backingDataStore[propertyName];
                },
                enumerable: true
            };

            var propertyValue = objectShape[propertyName];
            if (typeof propertyValue === "object") {
                // Wrap objects in observers of their own
                backingDataStore[propertyName] = Observable.fromObject(propertyValue);

                returnValue.set = function (value) {
                    if (value !== backingDataStore[propertyName]) {
                        // Additionally, ensure that objects which replace this value are wrapped again
                        backingDataStore[propertyName] = Observable.fromObject(value);
                        invokableObserver.propertyChanged.invoke(propertyName);
                    }
                };
            } else {
                backingDataStore[propertyName] = propertyValue;

                returnValue.set = function (value) {
                    if (value !== backingDataStore[propertyName]) {
                        backingDataStore[propertyName] = value;
                        invokableObserver.propertyChanged.invoke(propertyName);
                    }
                };
            }

            return returnValue;
        };

        /**
        * Creates a PropertyDescriptorMap of all the enumerated properties on a given object and stores backing data
        * for each property in a supplied dictionary object for the purpose of generating equivalent properties,
        * matching the shape of the supplied object, which fire propertyChanged events when they are updated.
        * @param objectShape The plain object which we want to obtain properties for
        * @param backingDataStore The object which will contain the backing data for the properties that are generated
        * @param invokableObserver The observer which will receive the propertyChanged events when the properties are changed
        */
        ObservableHelpers.expandProperties = function (objectShape, backingDataStore, invokableObserver) {
            var properties = {};

            for (var propertyName in objectShape) {
                properties[propertyName] = ObservableHelpers.describePropertyForObjectShape(propertyName, objectShape, backingDataStore, invokableObserver);
            }

            return properties;
        };
        return ObservableHelpers;
    })();
    Common.ObservableHelpers = ObservableHelpers;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    "use strict";

    
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
/// <reference path="../../assert.ts" />
/// <reference path="../EventSource.ts" />
/// <reference path="IConverter.ts" />
var Common;
(function (Common) {
    "use strict";

    

    /**
    * Access the target using properties, ex: obj[prop]
    */
    Common.targetAccessViaProperty = {
        getValue: function (target, prop) {
            return target[prop];
        },
        isValueSupported: function (value, isConverter) {
            // - undefined is always not allowed
            // - null is allowed only if returned from a converter
            return value !== undefined && (isConverter || value !== null);
        },
        setValue: function (target, prop, value) {
            target[prop] = value;
        }
    };

    /**
    * Access the target by calling getAttribute/setAttribute. This is used with HTMLElements in some scenarios.
    */
    Common.targetAccessViaAttribute = {
        getValue: function (target, prop) {
            return target.getAttribute(prop);
        },
        isValueSupported: function (value, isConverter) {
            // All values are allowed. Undefined and null have special treatment in setValue.
            return true;
        },
        setValue: function (target, prop, value) {
            if (value === null || value === undefined) {
                target.removeAttribute(prop);
            } else {
                target.setAttribute(prop, value);
            }
        }
    };

    /**
    * A binding class which keeps the property value in sync between to objects.  It listens to the .changed event or the dom "onchange" event.
    * The binding is released by calling unbind
    */
    var Binding = (function () {
        /**
        * @constructor
        * @param source - The object to get the value from
        * @param sourceExpression - A property or property chain of the named property to retrieve from source can contain . but not []
        * @param destination - The object to assign the value to
        * @param destinationProperty - The property on destination which will receive the value.  Cannot contain . or []
        * @param converter - The function to convert from the value on source to the value on destination, default is no conversion
        * @param mode - The binding mode 'oneway' (default) or 'twoway'.  TwoWay binding will copy the value from destination to source when destination changes
        * @param targetAccess - An accessor object which provides us options between accessing the members of the target via attribute or property. Default is
        * Common.targetAccessViaProperty. Other option is Common.targetAccessViaAttribute
        */
        function Binding(source, sourceExpression, destination, destinationProperty, converter, mode, targetAccess) {
            var _this = this;
            // Validation
            F12.Tools.Utility.Assert.hasValue(sourceExpression, "sourceExpression");
            F12.Tools.Utility.Assert.hasValue(destination, "destination");
            F12.Tools.Utility.Assert.hasValue(destinationProperty, "destinationProperty");

            // Default the mode to OneWay
            mode = mode || Binding.ONE_WAY_MODE;
            var expressionParts = sourceExpression.split(".");

            this._source = null;
            this._sourceChangedRegistration = null;
            this._destChangedRegistration = null;
            this._sourceProperty = expressionParts[0];
            this._childBinding = null;
            this._paused = false;
            this._twoWay = false;
            this._converter = converter;
            this._destination = destination;
            this._destinationProperty = destinationProperty;
            this._targetAccess = targetAccess || Common.targetAccessViaProperty;

            // If there is more than one property in the sourceExpression, we have to create a child binding
            if (expressionParts.length > 1) {
                expressionParts.splice(0, 1);
                this._childBinding = new Binding(null, expressionParts.join("."), destination, destinationProperty, converter, mode, this._targetAccess);
            } else if (mode.toLowerCase() === Binding.TWO_WAY_MODE) {
                this._twoWay = true;
                this._destChangedRegistration = this.attachChangeHandler(destination, function (e) {
                    var propertyName = e;
                    if (typeof propertyName !== "string" || propertyName === null || propertyName === _this._destinationProperty) {
                        _this.updateSourceFromDest();
                    }
                });
            }

            this.setSource(source);
        }
        /**
        * Determines if the current binding is for the given destination and property
        */
        Binding.prototype.isForDestination = function (destination, destinationProperty) {
            return destination === this._destination && destinationProperty === this._destinationProperty;
        };

        /**
        * Unbinds the binding to clean up any object references and prevent any further updates from happening
        */
        Binding.prototype.unbind = function () {
            this._source = null;
            if (this._sourceChangedRegistration) {
                this._sourceChangedRegistration.unregister();
                this._sourceChangedRegistration = null;
            }

            if (this._childBinding) {
                this._childBinding.unbind();
                this._childBinding = null;
            }

            if (this._destChangedRegistration) {
                this._destChangedRegistration.unregister();
                this._destChangedRegistration = null;
            }
        };

        /**
        * Updates the source value when the destination value changes
        */
        Binding.prototype.updateSourceFromDest = function () {
            if (this._source && this._twoWay) {
                this._paused = true;
                var destValue = this._targetAccess.getValue(this._destination, this._destinationProperty);
                if (this._converter) {
                    destValue = this._converter.convertFrom(destValue);
                }

                this._source[this._sourceProperty] = destValue;
                this._paused = false;
            }
        };

        /**
        * Updates the destination or childBinding with the value from source
        * TODO: Once INotifyPropertyChanged or similar has been added, use the name property from that to filter this
        */
        Binding.prototype.updateDestination = function () {
            if (this._paused) {
                return;
            }

            this._paused = true;
            var value = this.getValue();
            if (this._childBinding) {
                this._childBinding.setSource(value);
            } else {
                // If the source is not set, we don't want to call the converter
                var hasConverter = !!this._source && !!this._converter;
                if (hasConverter) {
                    value = this._converter.convertTo(value);
                }

                if (this._targetAccess.isValueSupported(value, !!hasConverter)) {
                    this._targetAccess.setValue(this._destination, this._destinationProperty, value);
                }
            }

            this._paused = false;
        };

        /**
        * Sets the source of the binding.  In the case of a child binding, this updates as the parent binding's value changes
        * @param source - The source object that the binding is listening to
        */
        Binding.prototype.setSource = function (source) {
            var _this = this;
            // Dispose the previous source change handler first
            if (this._sourceChangedRegistration) {
                this._sourceChangedRegistration.unregister();
                this._sourceChangedRegistration = null;
            }

            this._source = source;

            // Listen to change event on the new source
            if (this._source) {
                this._sourceChangedRegistration = this.attachChangeHandler(this._source, function (propertyName) {
                    if (typeof propertyName !== "string" || propertyName === null || propertyName === _this._sourceProperty) {
                        _this.updateDestination();
                    }
                });
            }

            this.updateDestination();
            this.updateSourceFromDest();
        };

        /**
        * Attaches a change handler to obj and returns an object that can be disposed to remove the handler
        * Prefers obj.propertyChanged, but will use the dom onchange event if that doesn't exist
        * @param obj - The object to listen for changes on
        * @param handler - The function to be called when a change occurs
        * @return An object that can be disposed to remove the change handler
        */
        Binding.prototype.attachChangeHandler = function (obj, handler) {
            if (obj.propertyChanged) {
                return obj.propertyChanged.addHandler(handler);
            } else {
                var element = obj;
                if ((element.tagName === "INPUT" || element.tagName === "SELECT") && element.addEventListener && element.removeEventListener) {
                    element.addEventListener("change", handler);
                    return { unregister: function () {
                            return element.removeEventListener("change", handler);
                        } };
                }
            }
        };

        /**
        * Gets the current value from the source object
        * @return The current value from the source object
        */
        Binding.prototype.getValue = function () {
            return this._source && this._source[this._sourceProperty];
        };
        Binding.ONE_WAY_MODE = "oneway";

        Binding.TWO_WAY_MODE = "twoway";
        return Binding;
    })();
    Common.Binding = Binding;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
/// <reference path="../IControl.ts" />
/// <reference path="../Binding/Binding.ts" />
/// <reference path="TemplateControl.ts" />
var Common;
(function (Common) {
    "use strict";

    

    

    /**
    * Holds all the binding relationships for the control.
    */
    var TemplateDataBinding = (function () {
        /**
        * @param control The template control to create the binding relationships for
        */
        function TemplateDataBinding(control) {
            this._bindings = TemplateDataBinding.bind(control);
        }
        /**
        * Find the binding that represents the given destination and destination property
        * @param destination The destination object
        * @param destinationProperty The name of the destination property
        * @returns The binding object which represents the given destination
        */
        TemplateDataBinding.prototype.findBinding = function (destination, destinationProperty) {
            var binding;

            if (this._bindings) {
                for (var i = 0; i < this._bindings.length; i++) {
                    var currBinding = this._bindings[i];
                    if (currBinding.isForDestination(destination, destinationProperty)) {
                        binding = currBinding;
                        break;
                    }
                }
            }

            return binding;
        };

        /**
        * Unbind all the binding relationships
        */
        TemplateDataBinding.prototype.unbind = function () {
            if (this._bindings) {
                for (var i = 0; i < this._bindings.length; i++) {
                    this._bindings[i].unbind();
                }
            }

            this._bindings = null;
        };

        TemplateDataBinding.buildBindingCommand = function (target, element, targetName, bindingSource, value) {
            var targetAccess = Common.targetAccessViaProperty;

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
                    var elementControlLink = element;
                    target = elementControlLink.control;
                    targetName = targetName.substr(TemplateDataBinding.CONTROL_PREFIX.length);
                }
            }

            var bindingCommand = {
                target: target,
                targetAccess: targetAccess,
                targetName: targetName,
                source: bindingSource,
                value: value
            };

            return bindingCommand;
        };

        /**
        * The syntax for the binding statement:
        *   binding statement =    binding[, <binding statement>]
        *   binding           =    targetName:sourceName[; mode=(oneway|twoway); converter=<converter id>]
        */
        TemplateDataBinding.extractBindingCommandsForBinding = function (commands, target, element, allBindings, isControlBinding) {
            var bindings = allBindings.split(",");
            var bindingsCount = bindings.length;

            for (var i = 0; i < bindingsCount; i++) {
                var binding = bindings[i];

                var keyValue = binding.split(":", 2);
                F12.Tools.Utility.Assert.areEqual(keyValue.length, 2, "Invalid binding syntax, the keyvalue pair should have the syntax target:source '" + binding + "'.");

                var targetName = keyValue[0].trim();
                var sourceSyntax = keyValue[1].trim();

                var bindingSource = TemplateDataBinding.parseSourceSyntax(sourceSyntax);

                // For data binding, assume it's a control binding and add the model accessor at the front
                if (!isControlBinding) {
                    bindingSource.name = TemplateDataBinding.MODEL_PREFIX + bindingSource.name;
                }

                var bindingCommand = TemplateDataBinding.buildBindingCommand(target, element, targetName, bindingSource, null);

                F12.Tools.Utility.Assert.isTrue(!!bindingCommand.targetName, "Invalid binding syntax. Target name is missing '" + binding + "'.");

                commands.push(bindingCommand);
            }
        };

        /**
        * The syntax for the option statement:
        *   option statement =    option[, <option statement>]
        *   option           =    targetName:value[; converter=<converter id>]
        */
        TemplateDataBinding.extractBindingCommandsForOptions = function (commands, target, element, allOptions) {
            var options = allOptions.split(",");
            var optionsCount = options.length;

            for (var i = 0; i < optionsCount; i++) {
                var option = options[i];

                var keyValue = option.split(":", 2);
                F12.Tools.Utility.Assert.areEqual(keyValue.length, 2, "Invalid options syntax, the keyvalue pair should have the syntax target:source '" + option + "'.");

                var targetName = keyValue[0].trim();
                var valueSyntax = keyValue[1].trim();

                // Get the converter and convert the value if it is present
                var valueSource = TemplateDataBinding.parseSourceSyntax(valueSyntax);
                var value = valueSource.name;
                if (valueSource.converter && valueSource.converter.convertTo) {
                    value = valueSource.converter.convertTo(value);
                }

                var bindingCommand = TemplateDataBinding.buildBindingCommand(target, element, targetName, null, value);

                F12.Tools.Utility.Assert.isTrue(!!bindingCommand.targetName, "Invalid option syntax. Target name is missing '" + option + "'.");

                commands.push(bindingCommand);
            }
        };

        /**
        * Gets all the binding commands which will be used to create the
        * binding relationships
        * @param control The control to work on
        * @return An array of all the binding commands extracted from the control
        */
        TemplateDataBinding.getBindingCommands = function (control) {
            var bindingCommands;

            var elements = [];
            elements.push(control.rootElement);

            while (elements.length > 0) {
                var element = elements.pop();
                var childControl = element.control;

                // The target for the binding is always the element except for a child control in this case the target becomes the child control.
                var target = element;
                if (childControl && childControl !== control) {
                    target = childControl;
                }

                if (target) {
                    var attr;

                    attr = element.getAttributeNode(Common.TemplateDataAttributes.BINDING);
                    if (attr) {
                        bindingCommands = bindingCommands || [];
                        TemplateDataBinding.extractBindingCommandsForBinding(bindingCommands, target, element, attr.value, false);
                        element.removeAttributeNode(attr);
                    }

                    attr = element.getAttributeNode(Common.TemplateDataAttributes.CONTROL_BINDING);
                    if (attr) {
                        bindingCommands = bindingCommands || [];
                        TemplateDataBinding.extractBindingCommandsForBinding(bindingCommands, target, element, attr.value, true);
                        element.removeAttributeNode(attr);
                    }

                    attr = element.getAttributeNode(Common.TemplateDataAttributes.OPTIONS);
                    if (attr) {
                        bindingCommands = bindingCommands || [];

                        // The target for options is always the control except if it's an element
                        var optionsTarget = childControl || element;
                        TemplateDataBinding.extractBindingCommandsForOptions(bindingCommands, optionsTarget, element, attr.value);
                        element.removeAttributeNode(attr);
                    }
                }

                // Don't traverse through control children elements
                if (element.children && (!element.hasAttribute(Common.TemplateDataAttributes.CONTROL) || element === control.rootElement)) {
                    var childrenCount = element.children.length;
                    for (var i = 0; i < childrenCount; i++) {
                        elements.push(element.children[i]);
                    }
                }
            }

            return bindingCommands;
        };

        /**
        * Gets all the binding relationships from the given control
        * @param control The control to work on
        * @return An array of all the binding relationships extracted from the control
        */
        TemplateDataBinding.bind = function (control) {
            var bindings;

            var bindingCommands = TemplateDataBinding.getBindingCommands(control);
            if (bindingCommands) {
                bindings = [];

                var bindingCommandsCount = bindingCommands.length;
                for (var i = 0; i < bindingCommandsCount; i++) {
                    var bindingCommand = bindingCommands[i];

                    if (bindingCommand.source) {
                        // Create a binding to the control target
                        var binding = new Common.Binding(control, bindingCommand.source.name, bindingCommand.target, bindingCommand.targetName, bindingCommand.source.converter, bindingCommand.source.mode, bindingCommand.targetAccess);
                        bindings.push(binding);
                    } else if (bindingCommand.value !== undefined) {
                        // Assign the value
                        bindingCommand.targetAccess.setValue(bindingCommand.target, bindingCommand.targetName, bindingCommand.value);
                    }
                }
            }

            return bindings && bindings.length > 0 ? bindings : null;
        };

        /**
        * Get the converter instance for the given identifier
        * @param identifier The full id for the converter
        * @return The converter instance
        */
        TemplateDataBinding.getConverterInstance = function (identifier) {
            var obj = window;
            var parts = identifier.split(".");

            for (var i = 0; i < parts.length; i++) {
                var part = parts[i];
                obj = obj[part];
                F12.Tools.Utility.Assert.hasValue(obj, "Couldn't find the converter instance with the given name '" + identifier + "'.");
            }

            F12.Tools.Utility.Assert.hasValue(obj.convertFrom || obj.convertTo, "The converter instance with the given name '" + identifier + "' doesn't point to a valid converter instance.");

            return obj;
        };

        /**
        * Parse the source syntax extracting the source id, mode and converter
        * @param syntax The binding syntax
        * @return The binding source object
        */
        TemplateDataBinding.parseSourceSyntax = function (syntax) {
            F12.Tools.Utility.Assert.isTrue(!!syntax, "Invalid binding syntax.");

            var parts = syntax.split(";");

            var bindingSource = {
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
        };
        TemplateDataBinding.ATTRIBUTE_PREFIX = "attr-";
        TemplateDataBinding.MODEL_PREFIX = "model.";
        TemplateDataBinding.STYLE_PREFIX = "style.";
        TemplateDataBinding.CONTROL_PREFIX = "control.";
        return TemplateDataBinding;
    })();
    Common.TemplateDataBinding = TemplateDataBinding;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/// <reference path="../IControl.ts" />
/// <reference path="../Model/Observable.ts" />
/// <reference path="TemplateLoader.ts" />
/// <reference path="TemplateDataBinding.ts" />
var Common;
(function (Common) {
    "use strict";

    /**
    * A template control used to create controls from templates and uses data binding
    */
    var TemplateControl = (function (_super) {
        __extends(TemplateControl, _super);
        /**
        * Constructor
        * @param templateId The templateId to use with this control. If not provided the template root will be a <div> element.
        */
        function TemplateControl(templateId) {
            _super.call(this);

            // Call onInitialize before we set the rootElement
            this.onInitializeOverride();

            this._templateId = templateId;
            this.setRootElementFromTemplate();
        }
        Object.defineProperty(TemplateControl.prototype, "model", {
            /**
            * Gets the data model assigned to the control
            */
            get: function () {
                return this._model;
            },
            /**
            * Sets the data model on the control
            */
            set: function (value) {
                if (this._model !== value) {
                    this._model = value;
                    this.propertyChanged.invoke(TemplateControl.ModelPropertyName);
                    this.onModelChanged();
                }
            },
            enumerable: true,
            configurable: true
        });


        Object.defineProperty(TemplateControl.prototype, "tabIndex", {
            /**
            * Gets the tabIndex value for the control.
            */
            get: function () {
                if (this._tabIndex) {
                    return this._tabIndex;
                }

                return 0;
            },
            /**
            * Sets the tabIndex value for the control.
            */
            set: function (value) {
                if (this._tabIndex !== value) {
                    var oldValue = this._tabIndex;
                    this._tabIndex = value >> 0; // Making sure the passed value is a number
                    this.propertyChanged.invoke(TemplateControl.TabIndexPropertyName);
                    this.onTabIndexChanged(oldValue, this._tabIndex);
                }
            },
            enumerable: true,
            configurable: true
        });


        Object.defineProperty(TemplateControl.prototype, "templateId", {
            /**
            * Gets the templateId used on the control
            */
            get: function () {
                return this._templateId;
            },
            /**
            * Sets a new templateId on the control
            */
            set: function (value) {
                if (this._templateId !== value) {
                    this._templateId = value;
                    this._binding.unbind();
                    this.setRootElementFromTemplate();
                    this.propertyChanged.invoke(TemplateControl.TemplateIdPropertyName);
                }
            },
            enumerable: true,
            configurable: true
        });


        /**
        * Static constructor used to initialize observable properties
        */
        TemplateControl.initialize = function () {
            Common.ObservableHelpers.defineProperty(TemplateControl, TemplateControl.ClassNamePropertyName, null, function (obj, oldValue, newValue) {
                return obj.onClassNameChanged(oldValue, newValue);
            });
            Common.ObservableHelpers.defineProperty(TemplateControl, TemplateControl.IsEnabledPropertyName, true, function (obj) {
                return obj.onIsEnabledChanged();
            });
            Common.ObservableHelpers.defineProperty(TemplateControl, TemplateControl.IsVisiblePropertyName, true, function (obj) {
                return obj.onIsVisibleChanged();
            });
            Common.ObservableHelpers.defineProperty(TemplateControl, TemplateControl.TooltipPropertyName, null, function (obj) {
                return obj.onTooltipChanged();
            });
        };

        /**
        * Gets the binding that represents the given destination and destination property
        * @param destination The destination object
        * @param destinationProperty The name of the destination property
        * @returns the binding object that is associated with the given destination
        */
        TemplateControl.prototype.getBinding = function (destination, destinationProperty) {
            var binding;

            if (this._binding) {
                binding = this._binding.findBinding(destination, destinationProperty);
            }

            return binding;
        };

        /**
        * Protected virtual function used to notify subclasses that the template has changed
        */
        TemplateControl.prototype.onApplyTemplate = function () {
            this.onClassNameChanged(null, this.className);
            this.onIsVisibleChanged();
            this.onTabIndexChanged(null, this._tabIndex);
            this.onTooltipChanged();
        };

        /**
        * Protected virtual function called when initializing the control instance
        */
        TemplateControl.prototype.onInitializeOverride = function () {
        };

        /**
        * Protected virtual function used to notify subclasses that the model has changed
        */
        TemplateControl.prototype.onModelChanged = function () {
        };

        /**
        * Protected virtual function used to notify subclasses that the template is about to change.
        * Can used to perform cleanup on the previous root element
        */
        TemplateControl.prototype.onTemplateChanging = function () {
        };

        /**
        * Helper method to get a named control direct child from the subtree of the control, ignoring nested controls
        */
        TemplateControl.prototype.getNamedControl = function (name) {
            var element = this.getNamedElement(name);
            if (!element) {
                return null;
            }

            return element.control;
        };

        /**
        * Helper method to get a named element from the subtree of the control, ignoring nested controls
        */
        TemplateControl.prototype.getNamedElement = function (name) {
            var elements = [];
            elements.push(this.rootElement);

            while (elements.length > 0) {
                var element = elements.pop();

                if (element.getAttribute(Common.TemplateDataAttributes.NAME) === name) {
                    return element;
                }

                // Don't traverse through control children elements
                if (element.children && (!element.hasAttribute(Common.TemplateDataAttributes.CONTROL) || element === this.rootElement)) {
                    var childrenCount = element.children.length;
                    for (var i = 0; i < childrenCount; i++) {
                        elements.push(element.children[i]);
                    }
                }
            }

            return null;
        };

        /**
        * Protected overridable method. Gets called when isEnabled value changes
        */
        TemplateControl.prototype.onIsEnabledChangedOverride = function () {
        };

        /**
        * Protected overridable method. Gets called when isVisible value changes
        */
        TemplateControl.prototype.onIsVisibleChangedOverride = function () {
        };

        /**
        * Protected override method. Gets called when the tabIndex value changes
        */
        TemplateControl.prototype.onTabIndexChangedOverride = function () {
        };

        /**
        * Protected overridable method. Gets called when tooltip value changes
        */
        TemplateControl.prototype.onTooltipChangedOverride = function () {
        };

        TemplateControl.prototype.onClassNameChanged = function (oldValue, newValue) {
            if (this.rootElement) {
                if (oldValue) {
                    var oldClasses = oldValue.split(" ");
                    for (var i = 0; i < oldClasses.length; i++) {
                        this.rootElement.classList.remove(oldClasses[i]);
                    }
                }

                if (newValue) {
                    var newClasses = newValue.split(" ");
                    for (var i = 0; i < newClasses.length; i++) {
                        this.rootElement.classList.add(newClasses[i]);
                    }
                }
            }
        };

        /**
        * Handles a change to the isEnabled property
        */
        TemplateControl.prototype.onIsEnabledChanged = function () {
            if (this.rootElement) {
                if (this.isEnabled) {
                    this.rootElement.classList.remove(TemplateControl.CLASS_DISABLED);
                    this.rootElement.removeAttribute("aria-disabled");
                    this.onTabIndexChanged(this._tabIndex, this._tabIndex);
                } else {
                    this.rootElement.classList.add(TemplateControl.CLASS_DISABLED);
                    this.rootElement.setAttribute("aria-disabled", true.toString());
                    this.rootElement.tabIndex = -1;
                }

                this.onIsEnabledChangedOverride();
            }
        };

        /**
        * Handles a change to the isVisible property
        */
        TemplateControl.prototype.onIsVisibleChanged = function () {
            if (this.rootElement) {
                if (this.isVisible) {
                    this.rootElement.classList.remove(TemplateControl.CLASS_HIDDEN);
                    this.rootElement.removeAttribute("aria-hidden");
                    this.onTabIndexChanged(this._tabIndex, this._tabIndex);
                } else {
                    this.rootElement.classList.add(TemplateControl.CLASS_HIDDEN);
                    this.rootElement.setAttribute("aria-hidden", "true");
                    this.rootElement.tabIndex = -1;
                }

                this.onIsVisibleChangedOverride();
            }
        };

        /**
        * Handles a change to the tabIndex property
        */
        TemplateControl.prototype.onTabIndexChanged = function (oldValue, newValue) {
            if (this.rootElement) {
                // Only set tabIndex on the root when the control is enabled and visible. Otherwise the isEnabled
                // and isVisible change handlers will call this method to update the tabIndex on the element.
                if (this.isEnabled && this.isVisible) {
                    // Only set it on the rootElement if either we had a value or we got assigned a new value
                    // This way we don't set a 0 tabIndex on all elements at initialization
                    if (oldValue || newValue || newValue === 0) {
                        this.rootElement.tabIndex = newValue;
                    }
                }

                // Do the check here because the isEnabled handler will call us without really changing the tabIndex value
                if (oldValue !== newValue) {
                    this.onTabIndexChangedOverride();
                }
            }
        };

        /**
        * Handles a change to the tooltip property
        */
        TemplateControl.prototype.onTooltipChanged = function () {
            if (this.rootElement) {
                this.onTooltipChangedOverride();
            }
        };

        /**
        * Sets the rootElement from the current templateId and initialize
        * bindings relationships
        */
        TemplateControl.prototype.setRootElementFromTemplate = function () {
            var previousRoot;

            // Notify subclasses that the template is about to change
            this.onTemplateChanging();

            // Unattach ourselves from the previous rootElement before we
            // create a new rootElement
            if (this.rootElement) {
                previousRoot = this.rootElement;
                this.rootElement.control = null;
            }

            if (this._templateId) {
                this.rootElement = Common.templateLoader.loadTemplate(this._templateId);
            } else {
                this.rootElement = document.createElement("div");
            }

            // Copy only the original name to the new root
            if (previousRoot) {
                var attr = previousRoot.attributes.getNamedItem(Common.TemplateDataAttributes.NAME);
                if (attr) {
                    this.rootElement.setAttribute(attr.name, attr.value);
                }
            }

            this.rootElement.control = this;

            this._binding = new Common.TemplateDataBinding(this);

            // If the previous root has a parentElement then replace it with the new root
            if (previousRoot && previousRoot.parentElement) {
                previousRoot.parentElement.replaceChild(this.rootElement, previousRoot);
            }

            this.onApplyTemplate();
        };
        TemplateControl.CLASS_DISABLED = "disabled";

        TemplateControl.CLASS_HIDDEN = "BPT-hidden";
        TemplateControl.ClassNamePropertyName = "className";
        TemplateControl.IsEnabledPropertyName = "isEnabled";
        TemplateControl.IsVisiblePropertyName = "isVisible";
        TemplateControl.ModelPropertyName = "model";
        TemplateControl.TabIndexPropertyName = "tabIndex";
        TemplateControl.TemplateIdPropertyName = "templateId";
        TemplateControl.TooltipPropertyName = "tooltip";
        return TemplateControl;
    })(Common.Observable);
    Common.TemplateControl = TemplateControl;

    TemplateControl.initialize();
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    "use strict";

    /**
    * Defines constants used with the template control and data binding
    */
    var TemplateDataAttributes = (function () {
        function TemplateDataAttributes() {
        }
        TemplateDataAttributes.BINDING = "data-binding";
        TemplateDataAttributes.CONTROL = "data-control";
        TemplateDataAttributes.NAME = "data-name";
        TemplateDataAttributes.CONTROL_TEMPLATE_ID = TemplateDataAttributes.CONTROL + "-templateId";
        TemplateDataAttributes.CONTROL_BINDING = "data-controlbinding";
        TemplateDataAttributes.OPTIONS = "data-options";
        TemplateDataAttributes.TEMPLATE_ID_OPTION = TemplateDataAttributes.OPTIONS + "-templateId";
        return TemplateDataAttributes;
    })();
    Common.TemplateDataAttributes = TemplateDataAttributes;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
/// <reference path="../../assert.ts" />
/// <reference path="ITemplateRepository.ts" />
// The ControlTemplates module is used to host all auto-generated templates.
// Before using the module below, we need to make sure it's declared first.
// This way we don't depend on what order the auto-genreated template file is injected or added.
var ControlTemplates;
(function (ControlTemplates) {
    var PlaceHolder = (function () {
        function PlaceHolder() {
        }
        return PlaceHolder;
    })();
})(ControlTemplates || (ControlTemplates = {}));

var Common;
(function (Common) {
    "use strict";

    

    /**
    * Implements a template repository used to access the templates
    * hosted in script.
    */
    var ScriptTemplateRepository = (function () {
        /**
        * Constructor
        * @param container The root object of where all script repository belongs
        */
        function ScriptTemplateRepository(container) {
            F12.Tools.Utility.Assert.hasValue(container, "Invalid template container.");

            this._container = container;
            this._registeredTemplates = {};
        }
        /**
        * Gets the template string using the template Id.
        * @param templateId The template ID
        * @return The template string
        */
        ScriptTemplateRepository.prototype.getTemplateString = function (templateId) {
            F12.Tools.Utility.Assert.isTrue(!!templateId, "Invalid template ID.");

            var template;

            // First lookup in the registry, otherwise use the container
            template = this._registeredTemplates[templateId];
            if (!template) {
                var container = this._container;
                var templateParts = templateId.split(".");

                for (var i = 0; i < templateParts.length; i++) {
                    var part = templateParts[i];
                    container = container[part];
                    F12.Tools.Utility.Assert.isTrue(!!container, "Couldn't find the template with the given ID '" + templateId + "'.");
                }

                template = container;
            }

            F12.Tools.Utility.Assert.areEqual(typeof template, "string", "The given template name doesn't point to a template.");

            return template;
        };

        /**
        * Register the given html with the repository
        * @param templateId The template ID. Must be unique.
        * @param html The html content of the template
        */
        ScriptTemplateRepository.prototype.registerTemplateString = function (templateId, html) {
            F12.Tools.Utility.Assert.isTrue(!!templateId, "Invalid template ID.");
            F12.Tools.Utility.Assert.isUndefined(this._registeredTemplates[templateId], "Template with id '" + templateId + "' already registered.");

            this._registeredTemplates[templateId] = html;
        };
        return ScriptTemplateRepository;
    })();
    Common.ScriptTemplateRepository = ScriptTemplateRepository;

    /**
    * The global templateRepository member is an instance of ScriptTemplateRepository
    */
    Common.templateRepository = new ScriptTemplateRepository(ControlTemplates);
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
/// <reference path="../../assert.ts" />
/// <reference path="../IControl.ts" />
/// <reference path="ITemplateRepository.ts" />
/// <reference path="TemplateControl.ts" />
/// <reference path="TemplateDataAttributes.ts" />
/// <reference path="ScriptTemplateRepository.ts" />
var Common;
(function (Common) {
    "use strict";

    

    

    /**
    * Defines the template loader used to load templates, resolve template placeholders and then generate
    * HTML root element from the template.
    */
    var TemplateLoader = (function () {
        /**
        * Constructor
        * @param repository The repository used to find template strings
        */
        function TemplateLoader(repository) {
            F12.Tools.Utility.Assert.hasValue(repository, "Invalid template repository.");

            this._parsingNode = document.createElement("div");
            this._repository = repository;
            this._templateCache = {};
            this._visitedControls = {};
            this._visitedTemplates = {};
        }
        Object.defineProperty(TemplateLoader.prototype, "repository", {
            /**
            * Gets the repository used to host html contents with this loader
            */
            get: function () {
                return this._repository;
            },
            enumerable: true,
            configurable: true
        });

        /**
        * Gets the control type from the given control full name
        * @param controlName The fully qualified name of the control
        * @return The control type
        */
        TemplateLoader.getControlType = function (controlName) {
            F12.Tools.Utility.Assert.isTrue(!!controlName, "Invalid control name.");

            var controlType = window;
            var nameParts = controlName.split(".");

            for (var i = 0; i < nameParts.length; i++) {
                var part = nameParts[i];
                controlType = controlType[part];
                F12.Tools.Utility.Assert.hasValue(controlType, "Couldn't find the control with the given name '" + controlName + "'.");
            }

            F12.Tools.Utility.Assert.areEqual(typeof controlType, "function", "The given control '" + controlName + "' doesn't represent a control type which implements IControl.");

            return controlType;
        };

        /**
        * Loads the template providing its templateId. Caches the loaded templates by their templateId.
        * @param templateId The template ID to get the HTML for
        * @return The HTML element root for the template
        */
        TemplateLoader.prototype.loadTemplate = function (templateId) {
            var cachedElement = this._templateCache[templateId];
            if (!cachedElement) {
                var template = this._repository.getTemplateString(templateId);

                F12.Tools.Utility.Assert.isFalse(this._visitedTemplates[templateId], "Detected a recursive template. TemplateId '" + templateId + "' is part of the parents hierarchy.");

                this._visitedTemplates[templateId] = true;
                try  {
                    cachedElement = this.loadTemplateUsingHtml(template);
                } finally {
                    this._visitedTemplates[templateId] = false;
                }

                this._templateCache[templateId] = cachedElement;
            }

            var rootElement = cachedElement.cloneNode(true);
            rootElement = this.resolvePlaceholders(rootElement);
            return rootElement;
        };

        /**
        * Loads the template providing the HTML string for the template.
        * @param templateHtml An HTML string for the template
        * @return The HTML element root for the template
        */
        TemplateLoader.prototype.loadTemplateUsingHtml = function (templateHtml) {
            this._parsingNode.innerHTML = templateHtml;
            F12.Tools.Utility.Assert.areEqual(this._parsingNode.childElementCount, 1, "Template should have only one root element.");

            var rootElement = this._parsingNode.children[0];

            // No use for the parsing node anymore. So, disconnect the rootElement from it.
            this._parsingNode.removeChild(rootElement);

            return rootElement;
        };

        TemplateLoader.prototype.getControlInstance = function (controlName, templateId) {
            F12.Tools.Utility.Assert.isTrue(!!controlName, "Invalid control name.");

            var controlType = TemplateLoader.getControlType(controlName);
            var control;

            // For template controls, pass the templateId to the constructor
            if (Common.TemplateControl.prototype.isPrototypeOf(controlType.prototype) || Common.TemplateControl.prototype === controlType.prototype) {
                control = new controlType(templateId);
            } else {
                control = new controlType();
            }

            F12.Tools.Utility.Assert.hasValue(control.rootElement, "The given control '" + controlName + "' doesn't represent a control type which implements IControl.");

            // Attach the control to the root element if it's not yet attached
            if (control.rootElement.control !== control) {
                control.rootElement.control = control;
            }

            return control;
        };

        TemplateLoader.prototype.resolvePlaceholders = function (root) {
            // Test the node itself, otherwise test its children
            if (root.hasAttribute(Common.TemplateDataAttributes.CONTROL)) {
                root = this.resolvePlaceholder(root);
            } else {
                // Resolve all children
                var placeholders = root.querySelectorAll("div[" + Common.TemplateDataAttributes.CONTROL + "]");
                var placeholdersCount = placeholders.length;
                for (var i = 0; i < placeholdersCount; i++) {
                    var node = placeholders[i];
                    this.resolvePlaceholder(node);
                }
            }

            return root;
        };

        TemplateLoader.prototype.resolvePlaceholder = function (node) {
            F12.Tools.Utility.Assert.isFalse(node.hasChildNodes(), "Control placeholders cannot have children.");

            var controlName = node.getAttribute(Common.TemplateDataAttributes.CONTROL);
            var templateId = node.getAttribute(Common.TemplateDataAttributes.CONTROL_TEMPLATE_ID);

            var controlVisistedKey = controlName + (templateId ? "," + templateId : "");

            F12.Tools.Utility.Assert.isFalse(this._visitedControls[controlVisistedKey], "Detected a recursive control. Control '" + controlVisistedKey + "' is part of the parents hierarchy.");

            this._visitedControls[controlVisistedKey] = true;
            try  {
                var controlInstance = this.getControlInstance(controlName, templateId);
            } finally {
                this._visitedControls[controlVisistedKey] = false;
            }

            var controlNode = controlInstance.rootElement;

            for (var i = 0; i < node.attributes.length; i++) {
                var sourceAttribute = node.attributes[i];
                controlNode.setAttribute(sourceAttribute.name, sourceAttribute.value);
            }

            if (node.parentElement) {
                node.parentElement.replaceChild(controlNode, node);
            }

            return controlNode;
        };
        return TemplateLoader;
    })();
    Common.TemplateLoader = TemplateLoader;

    /**
    * The global templateLoader member
    */
    Common.templateLoader = new TemplateLoader(Common.templateRepository);
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
/// <reference path="../../assert.ts" />
/// <reference path="ITemplateRepository.ts" />
var Common;
(function (Common) {
    "use strict";

    /**
    * Implements a template repository used to access the templates
    * hosted in the main HTML file.
    */
    var HtmlTemplateRepository = (function () {
        /**
        * Constructor
        */
        function HtmlTemplateRepository() {
            this._registeredTemplates = {};
        }
        /**
        * Gets the template string using the template Id.
        * @param templateId The template ID
        * @return The template string
        */
        HtmlTemplateRepository.prototype.getTemplateString = function (templateId) {
            F12.Tools.Utility.Assert.isTrue(!!templateId, "Invalid template ID.");

            var template;

            // First lookup in the registry, otherwise look in the page
            template = this._registeredTemplates[templateId];
            if (!template) {
                var templateElement = document.getElementById(templateId);
                template = templateElement.innerHTML;
            }

            F12.Tools.Utility.Assert.areEqual(typeof template, "string", "The given template name doesn't point to a template.");

            return template;
        };

        /**
        * Register the given html with the repository
        * @param templateId The template ID. Must be unique.
        * @param html The html content of the template
        */
        HtmlTemplateRepository.prototype.registerTemplateString = function (templateId, html) {
            F12.Tools.Utility.Assert.isTrue(!!templateId, "Invalid template ID.");
            F12.Tools.Utility.Assert.isUndefined(this._registeredTemplates[templateId], "Template with id '" + templateId + "' already registered.");

            this._registeredTemplates[templateId] = html;
        };
        return HtmlTemplateRepository;
    })();
    Common.HtmlTemplateRepository = HtmlTemplateRepository;
})(Common || (Common = {}));
/// <reference path="core/framework/model/observable.ts" />
var FxUsageExampleModel = (function (_super) {
    __extends(FxUsageExampleModel, _super);
    function FxUsageExampleModel(sampleName, sampleFunction) {
        _super.call(this);

        this.sampleName = sampleName;
        this.sampleFunction = sampleFunction;
    }
    FxUsageExampleModel.init = function () {
        Common.ObservableHelpers.defineProperty(FxUsageExampleModel, "sampleName", "");
    };
    return FxUsageExampleModel;
})(Common.Observable);
FxUsageExampleModel.init();

var IntelliTraceEventModel = (function (_super) {
    __extends(IntelliTraceEventModel, _super);
    function IntelliTraceEventModel() {
        _super.apply(this, arguments);
    }
    IntelliTraceEventModel.init = function () {
        Common.ObservableHelpers.defineProperty(FxUsageExampleModel, "isHovered", "");
    };
    return IntelliTraceEventModel;
})(Common.Observable);
IntelliTraceEventModel.init();

var SvgControlModel = (function (_super) {
    __extends(SvgControlModel, _super);
    function SvgControlModel(svgPath, cssClass, svgPadding) {
        _super.call(this);

        this.svgPath = svgPath;
        this.cssClass = cssClass;
        this.svgPadding = svgPadding;
    }
    SvgControlModel.init = function () {
        Common.ObservableHelpers.defineProperty(SvgControlModel, "svgPath", "");
        Common.ObservableHelpers.defineProperty(SvgControlModel, "cssClass", "");
        Common.ObservableHelpers.defineProperty(SvgControlModel, "svgPadding", "");
    };
    return SvgControlModel;
})(Common.Observable);
SvgControlModel.init();

var Point = (function (_super) {
    __extends(Point, _super);
    function Point(x, y) {
        _super.call(this);

        this.x = x;
        this.y = y;
    }
    Point.init = function () {
        Common.ObservableHelpers.defineProperty(Point, "x", "");
        Common.ObservableHelpers.defineProperty(Point, "y", "");
    };
    return Point;
})(Common.Observable);
Point.init();

var EventPointModel = (function (_super) {
    __extends(EventPointModel, _super);
    function EventPointModel(x, y, svgPath) {
        _super.call(this);

        this.position = new Point(x, y);
        this.svgPath = svgPath;
    }
    EventPointModel.init = function () {
        Common.ObservableHelpers.defineProperty(EventPointModel, "position", "");
        Common.ObservableHelpers.defineProperty(EventPointModel, "svgPath", "");
    };
    return EventPointModel;
})(Common.Observable);
EventPointModel.init();
/// <reference path="core/framework/templating/templateloader.ts" />
/// <reference path="core/framework/templating/htmltemplaterepository.ts" />
/// <reference path="models.ts" />
// Use the templates inside the main HTML page to load templates
Common.templateLoader = new Common.TemplateLoader(new Common.HtmlTemplateRepository());

var Greeter = (function () {
    function Greeter(element) {
        var _this = this;
        this.sampleListControl = new Common.Controls.ItemsControl("sampleListTemplate");

        this.sampleListModel = new Common.ObservableCollection();
        this.sampleListModel.push(new FxUsageExampleModel("SVG Sample", function (root) {
            _this.SvgSample(root);
        }));
        this.sampleListModel.push(new FxUsageExampleModel("Background SVG Sample", function (root) {
            _this.backgroundSvgSample(root);
        }));
        this.sampleListModel.push(new FxUsageExampleModel("Special Shape Button Sample", function (root) {
            _this.specialShapeButtonSample(root);
        }));
        this.sampleListModel.push(new FxUsageExampleModel("2 Divs Overlap Sample", function (root) {
            _this.twoDivOverlapSample(root);
        }));
        this.sampleListModel.push(new FxUsageExampleModel("Many Icon Divs Sample", function (root) {
            _this.manyIconDivOverlapSample(root);
        }));
        this.sampleListModel.push(new FxUsageExampleModel("Many Bg Divs Sample", function (root) {
            _this.manyBgDivOverlapSample(root);
        }));
        this.sampleListModel.push(new FxUsageExampleModel("Product Code Sample", function (root) {
            _this.productCodeSample(root);
        }));
        this.sampleListModel.push(new FxUsageExampleModel("Product Code Sample 2", function (root) {
            _this.productCodeSampleNoBinding(root);
        }));
        this.sampleListControl.items = this.sampleListModel;
        this.sampleListControl.itemContainerControl = "Common.Controls.Button(fxUsageSampleTemplate)";

        element.appendChild(this.sampleListControl.rootElement);
        this.addClickHandler();
    }
    Greeter.prototype.addClickHandler = function () {
        var _this = this;
        var el = document.getElementById('sample-div');

        this.getElements(this.sampleListControl.rootElement, "button", Common.TemplateDataAttributes.NAME, "fxUsageSampleButton", function (control) {
            var button = control;
            if (button) {
                button.click.addHandler(function (e) {
                    el.innerHTML = "";
                    button.model.sampleFunction.call(_this, el);
                });
            }
        });
    };

    Greeter.prototype.getElements = function (root, tagName, attribute, value, callback) {
        var tags = window.document.getElementsByTagName(tagName);
        for (var i = 0; i < tags.length; i++) {
            var element = tags[i];
            if (element && element.getAttribute(attribute) == value) {
                var control = element.control;
                if (control) {
                    callback(control);
                }
            }
        }
    };

    Greeter.prototype.SvgSample = function (root) {
        var showBorderClass = "show-border";

        /// Sample 1: simplest SVG image
        var control1 = new Common.TemplateControl("svgcontrolTemplate1");
        root.appendChild(control1.rootElement);

        /// Sample 2: click SVG button
        var control2 = new Common.Controls.Button("svgcontrolTemplate2");
        var svgModel2 = new SvgControlModel("svg\\TimelineMarkException_14x.svg", showBorderClass);
        control2.model = svgModel2;
        root.appendChild(control2.rootElement);

        control2.click.addHandler(function (e) {
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

        control3.click.addHandler(function (e) {
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

        control4.click.addHandler(function (e) {
            if (svgModel4.svgPath.indexOf("14x") > 0) {
                svgModel4.svgPath = "svg\\TimelineMarkException_16x.svg";
                svgModel4.svgPadding = "1px";
            } else {
                svgModel4.svgPath = "svg\\TimelineMarkException_14x.svg";
                svgModel4.svgPadding = "2px";
            }
        });
    };

    Greeter.prototype.backgroundSvgSample = function (root) {
        /// Sample: SVG background
        var control1 = new Common.TemplateControl("svgBgTemplate1");
        root.appendChild(control1.rootElement);

        /// Sample: bind to style.background
        var control2 = new Common.Controls.Button("svgBgTemplate2");
        var svgModel2 = new SvgControlModel("url(svg\\\\TimelineMarkException_14x.svg)", "", "1px");
        control2.model = svgModel2;
        root.appendChild(control2.rootElement);

        control2.click.addHandler(function (e) {
            if (svgModel2.svgPath.indexOf("14x") > 0) {
                svgModel2.svgPath = "url(svg\\\\TimelineMarkException_16x.svg)";
                svgModel2.svgPadding = "0px";
            } else {
                svgModel2.svgPath = "url(svg\\\\TimelineMarkException_14x.svg)";
                svgModel2.svgPadding = "1px";
            }
        });
    };

    Greeter.prototype.specialShapeButtonSample = function (root) {
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
    };

    Greeter.prototype.twoDivOverlapSample = function (root) {
        /// Sample: simple overlap
        var control1 = new Common.TemplateControl("2divOverlap1");
        root.appendChild(control1.rootElement);

        /// Sample: with data binding
        var control2 = new Common.TemplateControl("2divOverlap1");
        var model2 = new EventPointModel("50px", "10px", "url(svg\\\\TimelineMarkException_14x.svg)");
        control2.model = model2;
        root.appendChild(control2.rootElement);
    };

    Greeter.prototype.manyIconDivOverlapSample = function (root) {
        for (var i = 0; i < 150; ++i) {
            for (var j = 0; j < 6; ++j) {
                var control = new Common.Controls.Button("2divOverlap1");
                var model = new EventPointModel(i * 4 + (i * 0.132) + "px", j * 20 + "px", "url(svg\\\\TimelineMarkException_14x.svg)");
                control.model = model;
                control.click.addHandler((function (model) {
                    return function (e) {
                        model.svgPath = "url(svg\\\\TimelineMarkExceptionHistoricalSelected_14x.svg)";
                    };
                })(model));
                root.appendChild(control.rootElement);
            }
        }
    };

    Greeter.prototype.manyBgDivOverlapSample = function (root) {
        for (var i = 0; i < 150; ++i) {
            for (var j = 0; j < 6; ++j) {
                var control = new Common.Controls.Button("bgDiv1");
                var model = new EventPointModel(i * 4 + "px", j * 20 + "px", "");
                control.model = model;
                root.appendChild(control.rootElement);
            }
        }
    };

    Greeter.prototype.productCodeSample = function (root) {
        for (var i = 0; i < 150; ++i) {
            for (var j = 0; j < 6; ++j) {
                var control = new Common.Controls.Button("productDivs");
                var model = new EventPointModel(i * 4 + (i * 0.132) + "px", j * 20 + "px", "custom.png");
                control.model = model;
                root.appendChild(control.rootElement);
            }
        }
    };

    Greeter.prototype.productCodeSampleNoBinding = function (root) {
        var fragment = document.createElement("div");

        for (var i = 0; i < 150; ++i) {
            for (var j = 0; j < 6; ++j) {
                var div = document.createElement("div");
                var innerDiv = document.createElement("div");
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
    };

    Greeter.prototype.onMouseEvent = function (e) {
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
    };
    return Greeter;
})();

window.onload = function () {
    var el = document.getElementById('content');
    var greeter = new Greeter(el);
    greeter.productCodeSample(document.getElementById('sample-div'));
};
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    /// <reference path="../assert.ts" />
    /// <reference path="../Framework/Model/Observable.ts" />
    /// <reference path="../Framework/Templating/TemplateControl.ts" />
    (function (Controls) {
        "use strict";

        /**
        * A base class for controls which have content
        */
        var ContentControl = (function (_super) {
            __extends(ContentControl, _super);
            /**
            * Constructor
            * @param templateId The id of the template to apply to the control
            */
            function ContentControl(templateId) {
                _super.call(this, templateId);
            }
            /**
            * Static constructor used to initialize observable properties
            */
            ContentControl.initialize = function () {
                Common.ObservableHelpers.defineProperty(ContentControl, "content", null);
            };
            return ContentControl;
        })(Common.TemplateControl);
        Controls.ContentControl = ContentControl;

        ContentControl.initialize();
    })(Common.Controls || (Common.Controls = {}));
    var Controls = Common.Controls;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    "use strict";

    /**
    * Use the Keys members to test against KeyboardEvent.key.
    * This is preferred over testing KeyboardEvent.keyCode, which is deprecated.
    */
    var Keys = (function () {
        function Keys() {
        }
        Keys.C = "c";
        Keys.DEL = "Del";
        Keys.DOWN = "Down";
        Keys.END = "End";
        Keys.ENTER = "Enter";
        Keys.F10 = "F10";
        Keys.HOME = "Home";
        Keys.LEFT = "Left";
        Keys.RIGHT = "Right";
        Keys.SPACEBAR = "Spacebar";
        Keys.UP = "Up";
        return Keys;
    })();
    Common.Keys = Keys;

    /**
    * Use the KeyCodes enumeration to test against KeyboardEvent.keyCode.
    * This is deprecated in favor of testing KeyboardEvent.key.
    */
    (function (KeyCodes) {
        KeyCodes[KeyCodes["Backspace"] = 8] = "Backspace";
        KeyCodes[KeyCodes["Tab"] = 9] = "Tab";
        KeyCodes[KeyCodes["Enter"] = 13] = "Enter";
        KeyCodes[KeyCodes["Shift"] = 16] = "Shift";
        KeyCodes[KeyCodes["Control"] = 17] = "Control";
        KeyCodes[KeyCodes["Alt"] = 18] = "Alt";
        KeyCodes[KeyCodes["CapsLock"] = 20] = "CapsLock";
        KeyCodes[KeyCodes["Escape"] = 27] = "Escape";
        KeyCodes[KeyCodes["Space"] = 32] = "Space";
        KeyCodes[KeyCodes["PageUp"] = 33] = "PageUp";
        KeyCodes[KeyCodes["PageDown"] = 34] = "PageDown";
        KeyCodes[KeyCodes["End"] = 35] = "End";
        KeyCodes[KeyCodes["Home"] = 36] = "Home";
        KeyCodes[KeyCodes["ArrowLeft"] = 37] = "ArrowLeft";
        KeyCodes[KeyCodes["ArrowFirst"] = 37] = "ArrowFirst";
        KeyCodes[KeyCodes["ArrowUp"] = 38] = "ArrowUp";
        KeyCodes[KeyCodes["ArrowRight"] = 39] = "ArrowRight";
        KeyCodes[KeyCodes["ArrowDown"] = 40] = "ArrowDown";
        KeyCodes[KeyCodes["ArrowLast"] = 40] = "ArrowLast";
        KeyCodes[KeyCodes["Insert"] = 45] = "Insert";
        KeyCodes[KeyCodes["Delete"] = 46] = "Delete";
        KeyCodes[KeyCodes["A"] = 65] = "A";
        KeyCodes[KeyCodes["B"] = 66] = "B";
        KeyCodes[KeyCodes["C"] = 67] = "C";
        KeyCodes[KeyCodes["D"] = 68] = "D";
        KeyCodes[KeyCodes["E"] = 69] = "E";
        KeyCodes[KeyCodes["F"] = 70] = "F";
        KeyCodes[KeyCodes["G"] = 71] = "G";
        KeyCodes[KeyCodes["H"] = 72] = "H";
        KeyCodes[KeyCodes["I"] = 73] = "I";
        KeyCodes[KeyCodes["J"] = 74] = "J";
        KeyCodes[KeyCodes["K"] = 75] = "K";
        KeyCodes[KeyCodes["L"] = 76] = "L";
        KeyCodes[KeyCodes["M"] = 77] = "M";
        KeyCodes[KeyCodes["N"] = 78] = "N";
        KeyCodes[KeyCodes["O"] = 79] = "O";
        KeyCodes[KeyCodes["P"] = 80] = "P";
        KeyCodes[KeyCodes["Q"] = 81] = "Q";
        KeyCodes[KeyCodes["R"] = 82] = "R";
        KeyCodes[KeyCodes["S"] = 83] = "S";
        KeyCodes[KeyCodes["T"] = 84] = "T";
        KeyCodes[KeyCodes["U"] = 85] = "U";
        KeyCodes[KeyCodes["V"] = 86] = "V";
        KeyCodes[KeyCodes["W"] = 87] = "W";
        KeyCodes[KeyCodes["X"] = 88] = "X";
        KeyCodes[KeyCodes["Y"] = 89] = "Y";
        KeyCodes[KeyCodes["Z"] = 90] = "Z";
        KeyCodes[KeyCodes["ContextMenu"] = 93] = "ContextMenu";
        KeyCodes[KeyCodes["Multiply"] = 106] = "Multiply";
        KeyCodes[KeyCodes["Plus"] = 107] = "Plus";
        KeyCodes[KeyCodes["Minus"] = 109] = "Minus";
        KeyCodes[KeyCodes["F1"] = 112] = "F1";
        KeyCodes[KeyCodes["F2"] = 113] = "F2";
        KeyCodes[KeyCodes["F3"] = 114] = "F3";
        KeyCodes[KeyCodes["F4"] = 115] = "F4";
        KeyCodes[KeyCodes["F5"] = 116] = "F5";
        KeyCodes[KeyCodes["F6"] = 117] = "F6";
        KeyCodes[KeyCodes["F7"] = 118] = "F7";
        KeyCodes[KeyCodes["F8"] = 119] = "F8";
        KeyCodes[KeyCodes["F9"] = 120] = "F9";
        KeyCodes[KeyCodes["F10"] = 121] = "F10";
        KeyCodes[KeyCodes["F11"] = 122] = "F11";
        KeyCodes[KeyCodes["F12"] = 123] = "F12";
        KeyCodes[KeyCodes["Comma"] = 188] = "Comma";
        KeyCodes[KeyCodes["Period"] = 190] = "Period";
    })(Common.KeyCodes || (Common.KeyCodes = {}));
    var KeyCodes = Common.KeyCodes;

    (function (MouseButtons) {
        MouseButtons[MouseButtons["LeftButton"] = 0] = "LeftButton";
        MouseButtons[MouseButtons["MiddleButton"] = 1] = "MiddleButton";
        MouseButtons[MouseButtons["RightButton"] = 2] = "RightButton";
    })(Common.MouseButtons || (Common.MouseButtons = {}));
    var MouseButtons = Common.MouseButtons;

    // This maps to KeyFlags enum defined in
    // $/devdiv/feature/VSClient_1/src/bpt/diagnostics/Host/Common/common.h
    (function (KeyFlags) {
        KeyFlags[KeyFlags["None"] = 0x0] = "None";
        KeyFlags[KeyFlags["Shift"] = 0x1] = "Shift";
        KeyFlags[KeyFlags["Ctrl"] = 0x2] = "Ctrl";
        KeyFlags[KeyFlags["Alt"] = 0x4] = "Alt";
    })(Common.KeyFlags || (Common.KeyFlags = {}));
    var KeyFlags = Common.KeyFlags;

    /**
    * Add listeners to the document to prevent certain IE browser accelerator keys from
    * triggering their default action in IE
    */
    function blockBrowserAccelerators() {
        // Prevent the default F5 refresh, default F6 address bar focus, and default SHIFT + F10 context menu
        document.addEventListener("keydown", function (e) {
            return preventIEKeys(e);
        });

        // Prevent the default context menu
        document.addEventListener("contextmenu", function (e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });

        // Prevent mouse wheel zoom
        window.addEventListener("mousewheel", function (e) {
            if (e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        });
    }
    Common.blockBrowserAccelerators = blockBrowserAccelerators;

    /**
    * Checks to see if any of the ALT, SHIFT, or CTRL keys are pressed
    * @param e The keyboard event to check
    * @return true if the event has any of the key flags toggled on
    */
    function HasAnyOfAltCtrlShiftKeyFlags(e) {
        return e.shiftKey || e.ctrlKey || e.altKey;
    }
    Common.HasAnyOfAltCtrlShiftKeyFlags = HasAnyOfAltCtrlShiftKeyFlags;

    /**
    * Checks to see if only CTRL keys are pressed, not ALT or SHIFT
    * @param e The keyboard event to check
    * @return true if the event has any of the key flags toggled on
    */
    function HasOnlyCtrlKeyFlags(e) {
        return e.ctrlKey && !e.shiftKey && !e.altKey;
    }
    Common.HasOnlyCtrlKeyFlags = HasOnlyCtrlKeyFlags;

    /**
    * Prevents IE from executing default behavior for certain shortcut keys
    * This should be called from keydown handlers that do not already call preventDefault().
    * Some shortcuts cannot be blocked via javascript (such as CTRL + P print dialog) so these
    * are already blocked by the native hosting code and will not get sent to the key event handlers.
    * @param e The keyboard event to check and prevent the action on
    * @return false to stop the default action- which matches the keydown/keyup handlers
    */
    function preventIEKeys(e) {
        // Check if a known key combo is pressed
        if (e.keyCode === 116 /* F5 */ || e.keyCode === 117 /* F6 */ || (e.keyCode === 121 /* F10 */ && e.shiftKey) || (e.keyCode === 70 /* F */ && e.ctrlKey)) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        return true;
    }
    Common.preventIEKeys = preventIEKeys;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
/// <reference path="IConverter.ts" />
/// <reference path="../../Plugin.d.ts" />
var Common;
(function (Common) {
    "use strict";

    /**
    * Common converters used by the templating engine.
    */
    var CommonConverters = (function () {
        function CommonConverters() {
        }
        /**
        * Static constructor for the class
        */
        CommonConverters.initialize = function () {
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
        };

        CommonConverters.getResourceConverter = function () {
            return {
                convertTo: function (from) {
                    return Plugin.Resources.getString(from);
                },
                convertFrom: null
            };
        };

        CommonConverters.getThemedImageConverter = function () {
            return {
                convertTo: function (from) {
                    return Plugin.Theme.getValue(from);
                },
                convertFrom: null
            };
        };

        CommonConverters.getStringToBooleanConverter = function () {
            return {
                convertTo: function (from) {
                    return from === "true" ? true : false;
                },
                convertFrom: function (from) {
                    return from ? "true" : "false";
                }
            };
        };

        CommonConverters.getStringToIntConverter = function () {
            return {
                convertTo: function (from) {
                    return from >> 0;
                },
                convertFrom: function (from) {
                    return from.toString();
                }
            };
        };

        CommonConverters.getIntToStringConverter = function () {
            return {
                convertTo: function (from) {
                    return from.toString();
                },
                convertFrom: function (from) {
                    return from >> 0;
                }
            };
        };

        CommonConverters.invertBoolConverter = function () {
            return {
                convertTo: function (from) {
                    return !from;
                },
                convertFrom: function (to) {
                    return !to;
                }
            };
        };

        /**
        * Converts a resource name into a value for a daytona tooltip that contains HTML to be rendered
        */
        CommonConverters.getHtmlTooltipFromResourceConverter = function () {
            return {
                convertTo: function (from) {
                    return JSON.stringify({ content: Plugin.Resources.getString(from), contentContainsHTML: true });
                },
                convertFrom: null
            };
        };

        /**
        * Converts a JSON tooltip string with HTML into a text-only string of the tooltip content
        */
        CommonConverters.getJsonHtmlTooltipToInnerTextConverter = function () {
            return {
                convertTo: function (from) {
                    if (from.match(CommonConverters.JSONRegex)) {
                        try  {
                            var options = JSON.parse(from);
                            if (options.contentContainsHTML) {
                                CommonConverters.AriaConverterElement.innerHTML = options.content;
                                var text = CommonConverters.AriaConverterElement.innerText;
                                CommonConverters.AriaConverterElement.innerHTML = "";
                                return text;
                            } else {
                                return options.content;
                            }
                        } catch (ex) {
                        }
                    }

                    return from;
                },
                convertFrom: null
            };
        };

        /**
        * Returns whatever value was set, including null
        */
        CommonConverters.getNullPermittedConverter = function () {
            return {
                convertTo: function (from) {
                    return from;
                },
                convertFrom: function (to) {
                    return to;
                }
            };
        };
        CommonConverters.JSONRegex = /^\{.*\}$/;
        return CommonConverters;
    })();
    Common.CommonConverters = CommonConverters;

    CommonConverters.initialize();
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    /// <reference path="ContentControl.ts" />
    /// <reference path="../assert.ts" />
    /// <reference path="../KeyCodes.ts" />
    /// <reference path="../Framework/binding/CommonConverters.ts" />
    /// <disable code="SA1201" rule="ElementsMustAppearInTheCorrectOrder" justification="egregious TSSC rule"/>
    (function (Controls) {
        "use strict";

        /**
        * A Button class which is templatable and provides basic button functionality
        */
        var Button = (function (_super) {
            __extends(Button, _super);
            /**
            * Constructor
            * @param templateId The id of the template to apply to the control
            */
            function Button(templateId) {
                var _this = this;
                this._mouseHandler = function (e) {
                    return _this.onMouseEvent(e);
                };
                this._keyHandler = function (e) {
                    return _this.onKeyboardEvent(e);
                };

                this.click = new Common.EventSource();

                _super.call(this, templateId || "Common.defaultButtonTemplate");
            }
            /**
            * Static constructor used to initialize observable properties
            */
            Button.initialize = function () {
                Common.ObservableHelpers.defineProperty(Button, Button.IsPressedPropertyName, false, function (obj, oldValue, newValue) {
                    return obj.onIsPressedChanged(oldValue, newValue);
                });
            };

            /**
            * Updates the control when the template has changed
            */
            Button.prototype.onApplyTemplate = function () {
                _super.prototype.onApplyTemplate.call(this);

                if (this.rootElement) {
                    if (!this.rootElement.hasAttribute("role")) {
                        // Consumers of this control are free to override this
                        // ie. A "link" is technically a button, but would override
                        // this attribute for accessibility reasons.
                        this.rootElement.setAttribute("role", "button");
                    }

                    this.rootElement.addEventListener("click", this._mouseHandler);
                    this.rootElement.addEventListener("mousedown", this._mouseHandler);
                    this.rootElement.addEventListener("mouseup", this._mouseHandler);
                    this.rootElement.addEventListener("mouseleave", this._mouseHandler);
                    this.rootElement.addEventListener("keydown", this._keyHandler);
                    this.rootElement.addEventListener("keyup", this._keyHandler);

                    // Ensure the control is in the correct state
                    this.onIsPressedChanged(null, this.isPressed);
                }
            };

            /**
            * Updates the control when the template is about to change. Removes event handlers from previous root element.
            */
            Button.prototype.onTemplateChanging = function () {
                _super.prototype.onTemplateChanging.call(this);

                if (this.rootElement) {
                    this.rootElement.removeEventListener("click", this._mouseHandler);
                    this.rootElement.removeEventListener("mousedown", this._mouseHandler);
                    this.rootElement.removeEventListener("mouseup", this._mouseHandler);
                    this.rootElement.removeEventListener("mouseleave", this._mouseHandler);
                    this.rootElement.removeEventListener("keydown", this._keyHandler);
                    this.rootElement.removeEventListener("keyup", this._keyHandler);
                }
            };

            /**
            * Protected override. Handles a change to the tooltip property
            */
            Button.prototype.onTooltipChangedOverride = function () {
                _super.prototype.onTooltipChangedOverride.call(this);

                if (this.tooltip) {
                    this.rootElement.setAttribute("data-plugin-vs-tooltip", this.tooltip);
                    this.rootElement.setAttribute("aria-label", Common.CommonConverters.JsonHtmlTooltipToInnerTextConverter.convertTo(this.tooltip));
                } else {
                    this.rootElement.removeAttribute("data-plugin-vs-tooltip");
                    this.rootElement.removeAttribute("aria-label");
                }
            };

            /**
            * Dispatches a click event only if the button is enabled
            * @param e An optional event object.
            */
            Button.prototype.press = function (e) {
                if (this.isEnabled) {
                    this.click.invoke(e);
                }
            };

            /**
            * Handles a change to the isPressed property
            * @param oldValue The old value for the property
            * @param newValue The new value for the property
            */
            Button.prototype.onIsPressedChanged = function (oldValue, newValue) {
                if (this.rootElement) {
                    if (newValue) {
                        this.rootElement.classList.add(Button.CLASS_PRESSED);
                    } else {
                        this.rootElement.classList.remove(Button.CLASS_PRESSED);
                    }
                }
            };

            /**
            * Handles mouse events to allow the button to be interacted with via the mouse
            * @param e The mouse event
            */
            Button.prototype.onMouseEvent = function (e) {
                if (this.isEnabled) {
                    var stopPropagation = false;
                    switch (e.type) {
                        case "click":
                            this.rootElement.focus();
                            this.click.invoke(e);
                            stopPropagation = true;
                            break;
                        case "mousedown":
                            this.isPressed = true;
                            break;
                        case "mouseup":
                        case "mouseleave":
                            this.isPressed = false;
                            break;
                        default:
                            F12.Tools.Utility.Assert.fail("Unexpected");
                    }

                    if (stopPropagation) {
                        e.stopImmediatePropagation();
                        e.preventDefault();
                    }
                }
            };

            /**
            * Handles keyboard events to allow the button to be interacted with via the keyboard
            * @param e The keyboard event
            */
            Button.prototype.onKeyboardEvent = function (e) {
                if (this.isEnabled && (e.keyCode === 13 /* Enter */ || e.keyCode === 32 /* Space */)) {
                    switch (e.type) {
                        case "keydown":
                            this.isPressed = true;
                            break;
                        case "keyup":
                            // Narrator bypasses normal keydown/up events and clicks
                            // directly.  Make sure we only perform a click here when
                            // the button has really been pressed.  (ie. via regular
                            // keyboard interaction)
                            if (this.isPressed) {
                                this.isPressed = false;
                                this.click.invoke(e);
                            }

                            break;
                        default:
                            F12.Tools.Utility.Assert.fail("Unexpected");
                    }
                }
            };
            Button.CLASS_PRESSED = "pressed";

            Button.IsPressedPropertyName = "isPressed";
            return Button;
        })(Controls.ContentControl);
        Controls.Button = Button;

        Button.initialize();
    })(Common.Controls || (Common.Controls = {}));
    var Controls = Common.Controls;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    (function (Controls) {
        "use strict";

        (function (NavigationDirection) {
            NavigationDirection[NavigationDirection["Next"] = 0] = "Next";
            NavigationDirection[NavigationDirection["Previous"] = 1] = "Previous";
        })(Controls.NavigationDirection || (Controls.NavigationDirection = {}));
        var NavigationDirection = Controls.NavigationDirection;
    })(Common.Controls || (Common.Controls = {}));
    var Controls = Common.Controls;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    /// <reference path="../assert.ts" />
    /// <reference path="ControlUtilities.ts" />
    /// <reference path="Button.ts" />
    (function (Controls) {
        "use strict";

        /**
        * An enumeration that specifies the kind of the tab press
        */
        (function (TabPressKind) {
            TabPressKind[TabPressKind["None"] = 0] = "None";
            TabPressKind[TabPressKind["Tab"] = 1] = "Tab";
            TabPressKind[TabPressKind["ShiftTab"] = 2] = "ShiftTab";
        })(Controls.TabPressKind || (Controls.TabPressKind = {}));
        var TabPressKind = Controls.TabPressKind;

        /**
        * A PopupControl class which provides the popup behaviour to its given HTML template
        */
        var PopupControl = (function (_super) {
            __extends(PopupControl, _super);
            /**
            * @constructor
            * As part of initialization, caches references to event handler instances and loads the template content.
            * @param templateId: Optional template id for the control.
            */
            function PopupControl(templateId) {
                var _this = this;
                this._blurHandler = function (e) {
                    return _this.onBlur(e);
                };
                this._focusOutHandler = function (e) {
                    return _this.onFocusOut(e);
                };
                this._keyHandler = function (e) {
                    return _this.onKeyEvent(e);
                };
                this._mouseHandler = function (e) {
                    return _this.onDocumentMouseHandler(e);
                };
                this._targetButtonClickHandler = function () {
                    return _this.onTargetButtonClick();
                };
                this._targetButtonKeyHandler = function (e) {
                    return _this.onTargetButtonKeyUp(e);
                };
                this._windowResizeHandler = function (e) {
                    return _this.onWindowResize(e);
                };

                _super.call(this, templateId);
            }
            /**
            * Initializes the observable properties which should be performed once per each class.
            */
            PopupControl.initialize = function () {
                Common.ObservableHelpers.defineProperty(PopupControl, "targetButtonElement", null, function (obj, oldValue, newValue) {
                    return obj.onTargetButtonElementChanged(oldValue, newValue);
                });
            };

            /**
            * Updates the control when the template has changed
            */
            PopupControl.prototype.onApplyTemplate = function () {
                _super.prototype.onApplyTemplate.call(this);

                if (this.rootElement) {
                    this.rootElement.classList.add(PopupControl.CLASS_POPUP);
                }

                this.onTargetButtonElementChanged(null, this.targetButtonElement);
            };

            /**
            * Protected virtual function called when initializing the control instance
            */
            PopupControl.prototype.onInitializeOverride = function () {
                _super.prototype.onInitializeOverride.call(this);

                // By default the popup control is not visible
                this.isVisible = false;
            };

            /**
            * Protected virtual function used to notify subclasses that the template is about to change.
            * Can used to perform cleanup on the previous root element
            */
            PopupControl.prototype.onTemplateChanging = function () {
                if (this.rootElement) {
                    this.rootElement.classList.remove(PopupControl.CLASS_POPUP);
                }
            };

            /**
            * Protected overridable method. Gets called when the isVisible value changes
            */
            PopupControl.prototype.onIsVisibleChangedOverride = function () {
                var _this = this;
                _super.prototype.onIsVisibleChangedOverride.call(this);

                if (this.isVisible) {
                    window.setImmediate(function () {
                        _this.rootElement.focus();
                    });

                    this._tabLastPressed = 0 /* None */;

                    if (this.targetButtonElement && !this.disablePopupActiveIndicator) {
                        this.targetButtonElement.classList.add(PopupControl.CLASS_POPUP_ACTIVE_ONTARGET);
                    }

                    this.setPopupPosition();

                    // Add event handlers for popup navigation and dismissal
                    window.addEventListener("resize", this._windowResizeHandler);
                    document.addEventListener("focusout", this._focusOutHandler, true);
                    document.addEventListener("mousedown", this._mouseHandler, true);
                    document.addEventListener("mouseup", this._mouseHandler, true);
                    document.addEventListener("mousewheel", this._mouseHandler, true);
                    document.addEventListener("click", this._mouseHandler, true);
                    this.rootElement.addEventListener("blur", this._blurHandler, true);
                    this.rootElement.addEventListener("keydown", this._keyHandler);
                    this.rootElement.addEventListener("keyup", this._keyHandler);
                } else {
                    if (this.targetButtonElement) {
                        this.targetButtonElement.classList.remove(PopupControl.CLASS_POPUP_ACTIVE_ONTARGET);
                        if (!this._skipTargetButtonFocus) {
                            window.setImmediate(function () {
                                if (_this.targetButtonElement) {
                                    _this.targetButtonElement.focus();
                                }
                            });
                        }
                    }

                    // Remove event handlers for popup navigation and dismissal
                    window.removeEventListener("resize", this._windowResizeHandler);
                    document.removeEventListener("focusout", this._focusOutHandler, true);
                    document.removeEventListener("mousedown", this._mouseHandler, true);
                    document.removeEventListener("mouseup", this._mouseHandler, true);
                    document.removeEventListener("mousewheel", this._mouseHandler, true);
                    document.removeEventListener("click", this._mouseHandler, true);
                    this.rootElement.removeEventListener("blur", this._blurHandler, true);
                    this.rootElement.removeEventListener("keydown", this._keyHandler);
                    this.rootElement.removeEventListener("keyup", this._keyHandler);
                }
            };

            /**
            * Protected overridable method. Gets called on the keydown event.
            * @param e the keyboard event object
            * @returns true if the event was handled and no need for extra processing
            */
            PopupControl.prototype.onKeyDownOverride = function (e) {
                return false;
            };

            /**
            * Protected overridable method. Gets called on the keyup event.
            * @param e the keyboard event object
            * @returns true if the event was handled and no need for extra processing
            */
            PopupControl.prototype.onKeyUpOverride = function (e) {
                return false;
            };

            /**
            * Displays the popup control at the given absolute co-ordinates
            * @param x x-coordinate of the right end of the popup control
            * @param y y-coordinate of the top of the popup control
            */
            PopupControl.prototype.show = function (x, y) {
                this.isVisible = true;

                if (x !== undefined && y !== undefined) {
                    this.rootElement.style.left = (x - this.rootElement.offsetWidth) + "px";
                    this.rootElement.style.top = y + "px";
                }
            };

            PopupControl.prototype.updatePopupPosition = function () {
                this.setPopupPosition();
            };

            PopupControl.totalOffsetLeft = function (elem) {
                var offsetLeft = 0;
                do {
                    if (!isNaN(elem.offsetLeft)) {
                        offsetLeft += elem.offsetLeft;
                    }
                } while(elem = elem.offsetParent);

                return offsetLeft;
            };

            PopupControl.totalOffsetTop = function (elem) {
                var offsetTop = 0;
                do {
                    if (!isNaN(elem.offsetTop)) {
                        offsetTop += elem.offsetTop;
                    }
                } while(elem = elem.offsetParent);

                return offsetTop;
            };

            PopupControl.prototype.setPopupPosition = function () {
                this.rootElement.style.left = "0px";
                this.rootElement.style.top = "0px";

                if (!this.targetButtonElement) {
                    // Cannot determine the position if there is no targetButtonElement
                    return;
                }

                var viewportTop = this.viewportMargin ? (this.viewportMargin.top || 0) : 0;
                var viewportBottom = window.innerHeight - (this.viewportMargin ? (this.viewportMargin.bottom || 0) : 0);
                var viewportLeft = this.viewportMargin ? (this.viewportMargin.left || 0) : 0;
                var viewportRight = window.innerWidth - (this.viewportMargin ? (this.viewportMargin.right || 0) : 0);

                // The positioning logic works by getting the viewport position of the target element then
                // mapping that position to the popup coordinates.
                // The mapping logic use the following arithmatic:
                //   pos = popup_scrollPos + targetElem_viewPortPos - popup_zeroOffsetToDocumnet
                //
                // Get the coordinates of target based on the viewport
                var targetRect = this.targetButtonElement.getBoundingClientRect();
                var targetViewportLeft = Math.round(targetRect.left);
                var targetViewportTop = Math.round(targetRect.top);

                // Get the total scroll position of the popup, so we can map the viewport coordinates to it
                var scrollTopTotal = 0;
                var scrollLeftTotal = 0;
                var elem = this.rootElement.offsetParent;
                while (elem) {
                    scrollLeftTotal += elem.scrollLeft;
                    scrollTopTotal += elem.scrollTop;
                    elem = elem.offsetParent;
                }

                // Gets the offset position when the popup control is at 0,0 to adjust later on this value.
                // because 0,0 doesn't necessarily land on document 0,0 if there is a parent with absolute position.
                var zeroOffsetLeft = PopupControl.totalOffsetLeft(this.rootElement);
                var zeroOffsetTop = PopupControl.totalOffsetTop(this.rootElement);

                // Calculate the left position
                var left = targetViewportLeft;
                var right = left + this.rootElement.offsetWidth;
                if (right > viewportRight) {
                    var newRight = targetViewportLeft + this.targetButtonElement.offsetWidth;
                    var newLeft = newRight - this.rootElement.offsetWidth;
                    if (newLeft >= viewportLeft) {
                        left = newLeft;
                        right = newRight;
                    }
                }

                this.rootElement.style.left = scrollLeftTotal + left - zeroOffsetLeft + "px";

                // Calculate the top position
                var top = targetViewportTop + this.targetButtonElement.offsetHeight;
                var bottom = top + this.rootElement.offsetHeight;
                if (bottom > viewportBottom) {
                    var newBottom = targetViewportTop;
                    var newTop = newBottom - this.rootElement.offsetHeight;
                    if (newTop >= viewportTop) {
                        top = newTop;
                        bottom = newBottom;
                    }
                }

                // Move the menu up 1 pixel if both the menu and the target button have borders
                if (parseInt(window.getComputedStyle(this.rootElement).borderTopWidth) > 0 && parseInt(window.getComputedStyle(this.targetButtonElement).borderBottomWidth) > 0) {
                    top--;
                }

                this.rootElement.style.top = scrollTopTotal + top - zeroOffsetTop + "px";
            };

            PopupControl.prototype.onBlur = function (e) {
                if (!this.keepVisibleOnBlur && !document.hasFocus() && !this._tabLastPressed) {
                    this.isVisible = false;
                }
            };

            /**
            * Handles a change to the targetButtonElement property. Updates the aria properties of the popup item
            * @param oldValue The old value for the property
            * @param newValue The new value for the property
            */
            PopupControl.prototype.onTargetButtonElementChanged = function (oldValue, newValue) {
                if (oldValue) {
                    oldValue.removeAttribute("aria-haspopup");
                    oldValue.removeAttribute("aria-owns");

                    if (this._targetButtonClickEvtReg) {
                        this._targetButtonClickEvtReg.unregister();
                        this._targetButtonClickEvtReg = null;
                    }

                    oldValue.removeEventListener("click", this._targetButtonClickHandler);
                    oldValue.removeEventListener("keyup", this._targetButtonKeyHandler);
                }

                if (newValue) {
                    newValue.setAttribute("aria-haspopup", "true");
                    newValue.setAttribute("aria-owns", this.rootElement.id);

                    var targetControl = newValue.control;
                    if (targetControl && targetControl instanceof Controls.Button) {
                        var targetButton = targetControl;
                        this._targetButtonClickEvtReg = targetButton.click.addHandler(this._targetButtonClickHandler);
                    } else {
                        newValue.addEventListener("click", this._targetButtonClickHandler);
                        newValue.addEventListener("keyup", this._targetButtonKeyHandler);
                    }
                }
            };

            PopupControl.prototype.onTargetButtonClick = function () {
                this.show();
            };

            PopupControl.prototype.onTargetButtonKeyUp = function (e) {
                if (e.keyCode === 32 /* Space */ || e.keyCode === 13 /* Enter */) {
                    this.show();

                    e.preventDefault();
                    e.stopImmediatePropagation();
                }
            };

            PopupControl.prototype.onWindowResize = function (e) {
                this.isVisible = false;
            };

            /**
            * Focus out listener for the popup control when it is visible.
            */
            PopupControl.prototype.onFocusOut = function (e) {
                if (e.relatedTarget && e.relatedTarget !== this.rootElement && !this.rootElement.contains(e.relatedTarget)) {
                    // If focus out was due to tabbing out, then we need to set focus on either the first or the last tabbable element
                    if (this._tabLastPressed !== 0 /* None */) {
                        var tabbableChildren = this.rootElement.querySelectorAll("[tabindex]");
                        var tabbableElement = this.rootElement;

                        if (this._tabLastPressed === 1 /* Tab */) {
                            for (var i = 0; i < tabbableChildren.length; i++) {
                                var element = tabbableChildren.item(i);

                                // Check that it is both visible and tabbable
                                if (element.tabIndex >= 0 && element.offsetParent) {
                                    tabbableElement = element;
                                    break;
                                }
                            }
                        } else {
                            for (var i = tabbableChildren.length - 1; i >= 0; i--) {
                                var element = tabbableChildren.item(i);

                                // Check that it is both visible and tabbable
                                if (element.tabIndex >= 0 && element.offsetParent) {
                                    tabbableElement = element;
                                    break;
                                }
                            }
                        }

                        window.setImmediate(function () {
                            tabbableElement.focus();
                        });
                    } else {
                        this.isVisible = false;

                        // Dismiss the popup control and set focus on the requesting element
                        window.setImmediate(function () {
                            if (e.target) {
                                e.target.focus();
                            }
                        });
                    }
                }

                return false;
            };

            /**
            * Document click listener for the popup control when it is visible. Ignores click in the control itself.
            */
            PopupControl.prototype.onDocumentMouseHandler = function (e) {
                var withinPopup = this.rootElement.contains(e.target);
                if (!withinPopup) {
                    var withinTargetButton = this.targetButtonElement && this.targetButtonElement.contains(e.target);

                    if (!withinTargetButton) {
                        // Still check the element under the mouse click. Using a scrollbar inside the popup causes and event to be raised with the document as the target
                        var elementUnderPoint = document.elementFromPoint(e.x, e.y);
                        withinPopup = this.rootElement.contains(elementUnderPoint);
                        if (!withinPopup) {
                            // Not within the target button, just hide the popup and not set focus on the target button
                            // Because the normal mouse handler will move focus to the target element
                            this._skipTargetButtonFocus = true;
                            try  {
                                this.isVisible = false;
                            } finally {
                                this._skipTargetButtonFocus = false;
                            }
                        }
                    } else {
                        // Within the target button
                        // Only hide the popup on the click event since it's the last event fired (mousedown -> mouseup -> click)
                        if (e.type === "click" && this.dismissOnTargetButtonClick) {
                            this.isVisible = false;
                        }

                        e.stopImmediatePropagation();
                        e.preventDefault();
                    }
                }
            };

            /**
            * Document key listener for the popup control when it is visible.
            */
            PopupControl.prototype.onKeyEvent = function (e) {
                // Prevent all key strokes from propagating up.
                e.stopImmediatePropagation();
                Common.preventIEKeys(e);

                this._tabLastPressed = e.keyCode === 9 /* Tab */ ? (e.shiftKey ? 2 /* ShiftTab */ : 1 /* Tab */) : 0 /* None */;

                if (e.type === "keyup") {
                    var handled = this.onKeyUpOverride(e);
                    if (!handled) {
                        switch (e.keyCode) {
                            case 27 /* Escape */:
                                this.isVisible = false;
                                break;
                        }
                    }
                } else if (e.type === "keydown") {
                    this.onKeyDownOverride(e);
                }

                return false;
            };
            PopupControl.CLASS_POPUP = "BPT-popup";

            PopupControl.CLASS_POPUP_ACTIVE_ONTARGET = "BPT-popupActive";
            return PopupControl;
        })(Common.TemplateControl);
        Controls.PopupControl = PopupControl;

        PopupControl.initialize();
    })(Common.Controls || (Common.Controls = {}));
    var Controls = Common.Controls;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    /// <reference path="../assert.ts" />
    /// <reference path="ControlUtilities.ts" />
    /// <reference path="PopupControl.ts" />
    /// <reference path="MenuItem.ts" />
    /// <reference path="Button.ts" />
    /// <disable code="SA1201" rule="ElementsMustAppearInTheCorrectOrder" justification="egregious TSSC rule"/>
    (function (Controls) {
        "use strict";

        /**
        * A MenuControl class which is templatable and provide menu functionality
        */
        var MenuControl = (function (_super) {
            __extends(MenuControl, _super);
            /**
            * @constructor
            * As part of initialization, caches references to event handler instances and loads the template content.
            * @param templateId: Optional template id for the control. Default template is Common.menuControlTemplate.
            */
            function MenuControl(templateId) {
                var _this = this;
                this._focusInHandler = function (e) {
                    return _this.onFocusIn(e);
                };
                this._selectedIndex = -1;
                this._menuItemsClickRegistration = [];
                this._menuItemsPropChangedRegistration = [];
                this.menuItems = [];

                _super.call(this, templateId || "Common.menuControlTemplate");
            }
            /**
            * Initializes the observable properties which should be performed once per each class.
            */
            MenuControl.initialize = function () {
                Common.ObservableHelpers.defineProperty(MenuControl, MenuControl.MenuItemsTemplateIdPropertyName, null, function (obj, oldValue, newValue) {
                    return obj.onMenuTemplateIdChanged(oldValue, newValue);
                });
                Common.ObservableHelpers.defineProperty(MenuControl, MenuControl.SelectedItemPropertyName, null, function (obj) {
                    return obj.onSelectedItemChanged();
                });
            };

            /**
            * Attach a handler to the given menu item
            * @param menu item name of the control as provided in data-name attribute
            * @param clickHandler Click handler to be added to the menu item
            */
            MenuControl.prototype.addClickHandlerToMenuItem = function (menuItemName, clickHandler) {
                var element = this.getNamedElement(menuItemName);
                if (element && element.control) {
                    element.control.click.addHandler(clickHandler);
                }
            };

            /**
            * Protected overridable. Handles a change to the isVisible property. Updates the menu controls display properties and event handlers.
            */
            MenuControl.prototype.onIsVisibleChangedOverride = function () {
                _super.prototype.onIsVisibleChangedOverride.call(this);

                if (this.isVisible) {
                    this.rootElement.addEventListener("focusin", this._focusInHandler);

                    // Always reset the selected index when the menu opens
                    this.selectedItem = null;
                    for (var i = 0; i < this.menuItems.length; i++) {
                        this.menuItems[i].rootElement.classList.remove(MenuControl.CLASS_SELECTED);
                    }
                } else {
                    this.rootElement.removeEventListener("focusin", this._focusInHandler);
                }
            };

            /**
            * Protected overridable method. Gets called on the keyup event.
            * @param e the keyboard event object
            * @returns true if the event was handled and no need for extra processing
            */
            MenuControl.prototype.onKeyUpOverride = function (e) {
                var handled = false;

                switch (e.keyCode) {
                    case 40 /* ArrowDown */:
                        this.changeSelection(0 /* Next */);
                        handled = true;
                        break;
                    case 38 /* ArrowUp */:
                        this.changeSelection(1 /* Previous */);
                        handled = true;
                        break;
                    case 32 /* Space */:
                    case 13 /* Enter */:
                        this.pressSelectedItem();
                        handled = true;
                        break;
                }

                if (!handled) {
                    handled = _super.prototype.onKeyUpOverride.call(this, e);
                }

                return handled;
            };

            MenuControl.prototype.onMenuItemClick = function () {
                if (this.dismissOnMenuItemClick) {
                    this.isVisible = false;
                }
            };

            /**
            * Handles update of the menu items in the same group when one of the menu items in that group is changed.
            * @param menuItem A menu item which is changed.
            * @param propertyName Name of the observable property which was changed on the menu item.
            */
            MenuControl.prototype.onMenuItemPropertyChanged = function (menuItem, propertyName) {
                if (propertyName === "isChecked" || propertyName === "groupName") {
                    if (menuItem.groupName && menuItem.isChecked) {
                        for (var index = 0; index < this.menuItems.length; index++) {
                            var item = this.menuItems[index];

                            if (item !== menuItem && item.groupName === menuItem.groupName && item.isChecked) {
                                item.isChecked = false;
                            }
                        }
                    }
                }
            };

            /**
            * Handles a change to menuTemplateId. Resets the menuItems arrays with new menuItems
            * @param oldValue The old value for the property
            * @param newValue The new value for the property
            */
            MenuControl.prototype.onMenuTemplateIdChanged = function (oldValue, newValue) {
                while (this._menuItemsPropChangedRegistration.length > 0) {
                    this._menuItemsPropChangedRegistration.pop().unregister();
                }

                while (this._menuItemsClickRegistration.length > 0) {
                    this._menuItemsClickRegistration.pop().unregister();
                }

                if (newValue) {
                    this.menuItems = [];
                    this.selectedItem = null;
                    this._menuItemsPropChangedRegistration = [];
                    this._menuItemsClickRegistration = [];

                    var menuItemElements = this.rootElement.querySelectorAll("li[" + Common.TemplateDataAttributes.CONTROL + "]");
                    for (var index = 0; index < menuItemElements.length; index++) {
                        var menuItemElement = menuItemElements[index];
                        F12.Tools.Utility.Assert.isTrue(!!menuItemElement.control, "All menuItemElements must have a control");

                        var menuItem = menuItemElement.control;
                        this.menuItems.push(menuItem);

                        this._menuItemsPropChangedRegistration.push(menuItem.propertyChanged.addHandler(this.onMenuItemPropertyChanged.bind(this, menuItem)));
                        this._menuItemsClickRegistration.push(menuItem.click.addHandler(this.onMenuItemClick.bind(this)));
                    }
                }
            };

            /**
            * Handles a change to selectedItem.
            */
            MenuControl.prototype.onSelectedItemChanged = function () {
                if (!this.selectedItem) {
                    this.setSelectedIndex(-1, false);
                } else {
                    var itemIndex = this.menuItems.indexOf(this.selectedItem);
                    if (itemIndex !== this._selectedIndex) {
                        this.setSelectedIndex(itemIndex, false);
                    }
                }
            };

            MenuControl.prototype.onFocusIn = function (e) {
                // Find the menu item which contains the target and set it as the selected index
                var menuItemIndex = 0;
                for (; menuItemIndex < this.menuItems.length; menuItemIndex++) {
                    var menuItem = this.menuItems[menuItemIndex];
                    if (menuItem.rootElement.contains(e.target)) {
                        break;
                    }
                }

                if (menuItemIndex < this.menuItems.length) {
                    this.setSelectedIndex(menuItemIndex, false);
                }
            };

            /**
            * Changes the selection to the next or the previous menu item
            * @param direction A direction to move selection in (Next/Previous)
            */
            MenuControl.prototype.changeSelection = function (direction) {
                if (this.menuItems.length === 0) {
                    return;
                }

                var step = (direction === 0 /* Next */) ? 1 : -1;

                var startingMenuItem = this.menuItems[this._selectedIndex];
                var newMenuItem;
                var newIndex = this._selectedIndex;

                do {
                    newIndex = (newIndex + step) % this.menuItems.length;
                    if (newIndex < 0) {
                        newIndex = this.menuItems.length - 1;
                    }

                    newMenuItem = this.menuItems[newIndex];
                    if (!startingMenuItem) {
                        startingMenuItem = newMenuItem;
                    } else if (newMenuItem === startingMenuItem) {
                        break;
                    }
                } while(!(newMenuItem.isVisible && newMenuItem.isEnabled));

                if (newMenuItem.isVisible && newMenuItem.isEnabled) {
                    this.setSelectedIndex(newIndex, true);
                }
            };

            /**
            * Call press method on the selected menu item
            */
            MenuControl.prototype.pressSelectedItem = function () {
                var selectedItem = this.menuItems[this._selectedIndex];

                if (selectedItem) {
                    selectedItem.press();
                }
            };

            /**
            * Sets the selected index to the given index
            * @param newIndex the index to set to
            * @param setFocus, if true the method will set focus on the menu item
            */
            MenuControl.prototype.setSelectedIndex = function (newIndex, setFocus) {
                if (this._selectedIndex >= 0 && this._selectedIndex < this.menuItems.length) {
                    this.menuItems[this._selectedIndex].rootElement.classList.remove(MenuControl.CLASS_SELECTED);
                }

                this._selectedIndex = newIndex;

                var menuItem = this.menuItems[this._selectedIndex];
                if (menuItem) {
                    menuItem.rootElement.classList.add(MenuControl.CLASS_SELECTED);

                    if (setFocus) {
                        menuItem.rootElement.focus();
                    }

                    this.selectedItem = menuItem;
                }
            };
            MenuControl.CLASS_SELECTED = "selected";

            MenuControl.MenuItemsTemplateIdPropertyName = "menuItemsTemplateId";
            MenuControl.SelectedItemPropertyName = "selectedItem";
            return MenuControl;
        })(Controls.PopupControl);
        Controls.MenuControl = MenuControl;

        MenuControl.initialize();
    })(Common.Controls || (Common.Controls = {}));
    var Controls = Common.Controls;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    /// <reference path="../assert.ts" />
    /// <reference path="ContentControl.ts" />
    /// <reference path="MenuControl.ts" />
    /// <reference path="../KeyCodes.ts" />
    (function (Controls) {
        "use strict";

        /**
        * A MenuItem class which is templatable and is a single menu item in the menu control
        */
        var MenuItem = (function (_super) {
            __extends(MenuItem, _super);
            /**
            * @constructor
            * As part of initialization, caches references to event handler instances and loads the template content.
            * @param templateId: Optional template id for the control. Default is Common.menuItemTemplate. Other option can
            * be Common.menuItemCheckMarkTemplate
            */
            function MenuItem(templateId) {
                var _this = this;
                this._mouseHandler = function (e) {
                    return _this.onMouseEvent(e);
                };
                this._keyUpHandler = function (e) {
                    return _this.onKeyUp(e);
                };
                this._domEventHanlder = function (e) {
                    return _this.onDomAttributeModified(e);
                };

                _super.call(this, templateId || "Common.menuItemTemplate");

                this.click = new Common.EventSource();
            }
            /**
            * Initializes the observable properties which should be performed once per each class.
            */
            MenuItem.initialize = function () {
                Common.ObservableHelpers.defineProperty(MenuItem, MenuItem.GroupNamePropertyName, null);
                Common.ObservableHelpers.defineProperty(MenuItem, MenuItem.IsChecked, false, function (obj, oldValue, newValue) {
                    return obj.onIsCheckedChanged(oldValue, newValue);
                });
            };

            /**
            * Updates the control when the template has changed. Adds event handlers to the current root element.
            */
            MenuItem.prototype.onApplyTemplate = function () {
                _super.prototype.onApplyTemplate.call(this);

                if (this.rootElement) {
                    this.rootElement.addEventListener("click", this._mouseHandler);
                    this.rootElement.addEventListener("mousedown", this._mouseHandler);
                    this.rootElement.addEventListener("mouseup", this._mouseHandler);
                    this.rootElement.addEventListener("mouseleave", this._mouseHandler);
                    this.rootElement.addEventListener("keyup", this._keyUpHandler);
                    this.rootElement.addEventListener("DOMAttrModified", this._domEventHanlder);
                }

                // Ensure the control is in the correct state
                this.onIsCheckedChanged(null, this.isChecked);
            };

            /**
            * Handles a change to the isEnabled property
            */
            MenuItem.prototype.onIsEnabledChangedOverride = function () {
                _super.prototype.onIsEnabledChangedOverride.call(this);

                if (this.isEnabled) {
                    this.rootElement.removeAttribute("disabled");
                } else {
                    this.rootElement.setAttribute("disabled");
                }
            };

            /**
            * Overridable protected to allow the derived class to intercept handling key-up event.
            * @param e The keyboard event
            */
            MenuItem.prototype.onKeyUpOverride = function (e) {
                return false;
            };

            /**
            * Overridable protected to allow the derived class to intercept handling mouse click evnet
            * @param e The mouse event
            */
            MenuItem.prototype.onMouseClickOverride = function (e) {
                return false;
            };

            /**
            * Updates the control when the template is about to change. Removes event handlers from previous root element.
            */
            MenuItem.prototype.onTemplateChanging = function () {
                _super.prototype.onTemplateChanging.call(this);

                if (this.rootElement) {
                    this.rootElement.removeEventListener("click", this._mouseHandler);
                    this.rootElement.removeEventListener("mousedown", this._mouseHandler);
                    this.rootElement.removeEventListener("mouseup", this._mouseHandler);
                    this.rootElement.removeEventListener("mouseleave", this._mouseHandler);
                    this.rootElement.removeEventListener("keyup", this._keyUpHandler);
                    this.rootElement.removeEventListener("DOMAttrModified", this._domEventHanlder);
                }
            };

            /**
            * Dispatches a click event on the menu item only if the menu item is enabled
            * @param e An optional event object.
            */
            MenuItem.prototype.press = function (e) {
                if (this.isEnabled) {
                    this.click.invoke(e);
                }
            };

            /**
            * Handles mutation events to allow the menu item to be interacted with via the accessibility tool.
            * @param e The DOM mutation event
            */
            MenuItem.prototype.onDomAttributeModified = function (e) {
                if (e.attrName === "aria-checked") {
                    var checked = e.newValue === "true";
                    if (this.isChecked !== checked) {
                        this.isChecked = checked;
                    }
                }
            };

            /**
            * Handles changes to isChecked by displaying a check mark on the DOM element and unchecking any other items in the radio group
            * @param oldValue The old value for the property
            * @param newValue The new value for the property
            */
            MenuItem.prototype.onIsCheckedChanged = function (oldValue, newValue) {
                if (this.rootElement) {
                    if (newValue) {
                        this.rootElement.classList.remove(MenuItem.CLASS_HIDDEN_CHECK_MARK);
                    } else {
                        this.rootElement.classList.add(MenuItem.CLASS_HIDDEN_CHECK_MARK);
                    }

                    this.rootElement.setAttribute("aria-checked", "" + newValue);
                    this.rootElement.focus();
                }
            };

            /**
            * Handles keyboard events to allow the menu item to be interacted with via the keyboard
            * @param e The keyboard event
            */
            MenuItem.prototype.onKeyUp = function (e) {
                if (this.isEnabled) {
                    var handled = this.onKeyUpOverride(e);
                    if (!handled) {
                        if (e.keyCode === 13 /* Enter */ || e.keyCode === 32 /* Space */) {
                            this.press(e);
                            handled = true;
                        }
                    }

                    if (handled) {
                        e.stopImmediatePropagation();
                    }
                }
            };

            /**
            * Handles mouse events to allow the menu item to be interacted with via the mouse
            * @param e The mouse event
            */
            MenuItem.prototype.onMouseEvent = function (e) {
                if (this.isEnabled) {
                    switch (e.type) {
                        case "click":
                            var handled = this.onMouseClickOverride(e);
                            if (!handled) {
                                this.press(e);
                            }

                            break;
                        case "mousedown":
                        case "mouseup":
                        case "mouseleave":
                            break;
                        default:
                            F12.Tools.Utility.Assert.fail("Unexpected");
                    }

                    e.stopImmediatePropagation();
                }
            };
            MenuItem.CLASS_HIDDEN_CHECK_MARK = "hiddenCheckMark";

            MenuItem.GroupNamePropertyName = "groupName";
            MenuItem.IsChecked = "isChecked";
            return MenuItem;
        })(Controls.ContentControl);
        Controls.MenuItem = MenuItem;

        MenuItem.initialize();
    })(Common.Controls || (Common.Controls = {}));
    var Controls = Common.Controls;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    /// <reference path="MenuItem.ts" />
    (function (Controls) {
        "use strict";

        /**
        * A menu item with a checkbox input.
        */
        var CheckBoxMenuItem = (function (_super) {
            __extends(CheckBoxMenuItem, _super);
            function CheckBoxMenuItem(templateId) {
                _super.call(this, templateId || "Common.menuItemCheckBoxTemplate");
            }
            /**
            * Overridable protected to allow the derived class to intercept handling key-up event.
            * @param e The keyboard event
            */
            CheckBoxMenuItem.prototype.onKeyUpOverride = function (e) {
                var handled = false;

                if (e.key === Common.Keys.SPACEBAR) {
                    this.isChecked = !this.isChecked;
                    handled = true;
                }

                if (!handled) {
                    handled = _super.prototype.onKeyUpOverride.call(this, e);
                }

                return handled;
            };

            /**
            * Handles checking the menuitem when clicked
            * @param e An optional event object.
            */
            CheckBoxMenuItem.prototype.press = function (e) {
                // If the source element was the checkbox, then we don't want to flip isChecked (because it is taken care of by the control binding)
                // and we don't want to raise the click event
                var checkBox = this.getNamedElement("BPT-menuItemCheckBox");
                if (!e || e.srcElement !== checkBox) {
                    this.isChecked = !this.isChecked;
                    _super.prototype.press.call(this, e);
                }
            };
            return CheckBoxMenuItem;
        })(Common.Controls.MenuItem);
        Controls.CheckBoxMenuItem = CheckBoxMenuItem;
    })(Common.Controls || (Common.Controls = {}));
    var Controls = Common.Controls;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
/// <reference path="IObservable.ts" />
var Common;
(function (Common) {
    "use strict";

    /**
    * An collection (array) which fires events when items are added and removed
    * NB: This does not fully implement Array<T>, but may incorporate more functionality
    *     in the future if it is needed.
    */
    var ObservableCollection = (function () {
        /**
        * @constructor
        * @param list An optional list containing data to populate into the ObservableCollection
        */
        function ObservableCollection(list) {
            if (typeof list === "undefined") { list = []; }
            this._list = list.slice(0);
            this.propertyChanged = new Common.EventSource();
            this.collectionChanged = new Common.EventSource();
        }
        Object.defineProperty(ObservableCollection.prototype, "length", {
            /**
            * Gets the current length of the collection
            */
            get: function () {
                return this._list.length;
            },
            enumerable: true,
            configurable: true
        });

        /**
        * Adds an item or items to the end of the collection
        * @param items New item(s) to add to the collection
        * @return The new length of the collection
        */
        ObservableCollection.prototype.push = function () {
            var items = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                items[_i] = arguments[_i + 0];
            }
            var insertionIndex = this._list.length;
            var newLength = Array.prototype.push.apply(this._list, items);

            this.propertyChanged.invoke(ObservableCollection.LengthProperty);
            this.invokeCollectionChanged(0 /* Add */, items, insertionIndex);
            return newLength;
        };

        /**
        * Removes an item from the end of the collection
        * @return The item that was removed from the collection
        */
        ObservableCollection.prototype.pop = function () {
            var oldItem = this._list.pop();

            this.propertyChanged.invoke(ObservableCollection.LengthProperty);
            this.invokeCollectionChanged(1 /* Remove */, null, null, [oldItem], this._list.length);
            return oldItem;
        };

        /**
        * Remove items from the collection and add to the collection at the given index
        * @param index The location of where to remove and add items
        * @param removeCount The number of items to rmeove
        * @param items New item(s) to add to the collection
        * @return The removed items
        */
        ObservableCollection.prototype.splice = function (index, removeCount) {
            var items = [];
            for (var _i = 0; _i < (arguments.length - 2); _i++) {
                items[_i] = arguments[_i + 2];
            }
            var args = [index, removeCount];
            if (items) {
                Array.prototype.push.apply(args, items);
            }

            var removedItems = Array.prototype.splice.apply(this._list, args);

            var itemsRemoved = removedItems.length > 0;
            var itemsAdded = items && items.length > 0;

            if (itemsRemoved || itemsAdded) {
                this.propertyChanged.invoke(ObservableCollection.LengthProperty);

                if (itemsRemoved) {
                    this.invokeCollectionChanged(1 /* Remove */, null, null, removedItems, index);
                }

                if (itemsAdded) {
                    this.invokeCollectionChanged(0 /* Add */, items, index, null, null);
                }
            }

            return removedItems;
        };

        /**
        * Returns the first occurrence of an item in the collection
        * @param searchElement The item to search for
        * @param fromIndex The starting index to search from (defaults to collection start)
        * @return The index of the first occurrence of the item, or -1 if it was not found
        */
        ObservableCollection.prototype.indexOf = function (searchElement, fromIndex) {
            return this._list.indexOf(searchElement, fromIndex);
        };

        /**
        * Returns the last occurrence of an item in the collection
        * @param searchElement The item to search for
        * @param fromIndex The starting index to search from (defaults to collection end)
        * @return The index of the last occurrence of the item, or -1 if it was not found
        */
        ObservableCollection.prototype.lastIndexOf = function (searchElement, fromIndex) {
            if (typeof fromIndex === "undefined") { fromIndex = -1; }
            return this._list.lastIndexOf(searchElement, fromIndex);
        };

        /**
        * Clears the contents of the collection to an empty collection
        */
        ObservableCollection.prototype.clear = function () {
            this._list = [];

            this.propertyChanged.invoke(ObservableCollection.LengthProperty);
            this.invokeCollectionChanged(3 /* Clear */);
        };

        /**
        * Returns the elements of the collection that meet the condition specified in a callback function.
        * @param callbackfn A function that accepts up to three arguments. The filter method calls the callbackfn function one time for each element in the collection.
        * @param thisArg An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
        */
        ObservableCollection.prototype.filter = function (callbackfn, thisArg) {
            return this._list.filter(callbackfn, thisArg);
        };

        /**
        * Calls a defined callback function on each element of the collection, and returns an array that contains the results.
        * @param callbackfn A function that accepts up to three arguments. The map method calls the callbackfn function one time for each element in the array.
        * @param thisArg An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
        */
        ObservableCollection.prototype.map = function (callbackfn, thisArg) {
            return this._list.map(callbackfn, thisArg);
        };

        /**
        * Retrieves an item from the collection
        * @param index The index of the item to retrieve
        * @return The requested item, or undefined if the item does not exist
        */
        ObservableCollection.prototype.getItem = function (index) {
            return this._list[index];
        };

        /**
        * Replaces the contents of the collection with the supplied items
        * @return The new length of the collection
        */
        ObservableCollection.prototype.resetItems = function (items) {
            this._list = [];
            var newLength = Array.prototype.push.apply(this._list, items);

            this.propertyChanged.invoke(ObservableCollection.LengthProperty);
            this.invokeCollectionChanged(2 /* Reset */);
            return newLength;
        };

        /**
        * Helper method to invoke a CollectionChangedEvent
        * @param action The action which provoked the event (Add, Remove, Reset or Clear)
        * @param newItems The new items which were involved in an Add event
        * @param newStartingIndex The index at which the Add occurred
        * @param oldItems The old items which were involved in a Remove event
        * @param oldStartingIndex The index at which the Remove occurred
        */
        ObservableCollection.prototype.invokeCollectionChanged = function (action, newItems, newStartingIndex, oldItems, oldStartingIndex) {
            var event = {
                action: action,
                newItems: newItems,
                newStartingIndex: newStartingIndex,
                oldItems: oldItems,
                oldStartingIndex: oldStartingIndex
            };
            this.collectionChanged.invoke(event);
        };
        ObservableCollection.LengthProperty = "length";
        return ObservableCollection;
    })();
    Common.ObservableCollection = ObservableCollection;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    /// <reference path="../assert.ts" />
    /// <reference path="../Framework/Model/ObservableCollection.ts" />
    /// <reference path="../Framework/Templating/TemplateControl.ts" />
    (function (Controls) {
        "use strict";

        /**
        * A control which binds to an array or ObservableCollection and generates an item container for each
        */
        var ItemsControl = (function (_super) {
            __extends(ItemsControl, _super);
            /**
            * Constructor
            * @param templateId The id of the template to apply to the control.
            */
            function ItemsControl(templateId) {
                _super.call(this, templateId);
            }
            /**
            * Static constructor used to initialize observable properties
            */
            ItemsControl.initialize = function () {
                Common.ObservableHelpers.defineProperty(ItemsControl, "items", "", function (obj, oldValue, newValue) {
                    return obj.onItemsChange(oldValue, newValue);
                });
                Common.ObservableHelpers.defineProperty(ItemsControl, "itemContainerControl", "", function (obj, oldValue, newValue) {
                    return obj.onItemContainerControlChange(oldValue, newValue);
                });
            };

            /**
            * Retrieves the first index of a matching item in the current items collection
            * @param item The item to retrieve
            * @return The requested index, or undefined if the item does not exist
            */
            ItemsControl.prototype.getIndex = function (item) {
                F12.Tools.Utility.Assert.isTrue(!!this._collection, "Expecting a non-null collection in the ItemsControl");
                var index = this._collection.indexOf(item);
                if (index !== -1) {
                    return index;
                }
            };

            /**
            * Retrieves an item from the current items collection
            * @param index The index of the item to retrieve
            * @return The requested item, or undefined if the item does not exist
            */
            ItemsControl.prototype.getItem = function (index) {
                F12.Tools.Utility.Assert.isTrue(!!this._collection, "Expecting a non-null collection in the ItemsControl");
                return this._collection.getItem(index);
            };

            /**
            * Retrieves the number of items in the current items collection
            * @return The number of items currently in the ItemsControl's collection
            */
            ItemsControl.prototype.getItemCount = function () {
                if (!this._collection) {
                    return 0;
                }

                return this._collection.length;
            };

            /**
            * Protected override. Handles a change to the tooltip property
            */
            ItemsControl.prototype.onTooltipChangedOverride = function () {
                _super.prototype.onTooltipChangedOverride.call(this);
                this.updateTooltip(this.tooltip);
            };

            /**
            * Implemented by the derived class to dispose any events or resources created for the container
            */
            ItemsControl.prototype.disposeItemContainerOverride = function (control) {
                // Implemented by the derived class
            };

            /**
            * Implemented by the derived class to allow it to customize the container control
            */
            ItemsControl.prototype.prepareItemContainerOverride = function (control, item) {
                // Implemented by the derived class
            };

            /**
            * Updates the control when the template has changed.
            */
            ItemsControl.prototype.onApplyTemplate = function () {
                _super.prototype.onApplyTemplate.call(this);

                this.panelRootElement = this.getNamedElement(ItemsControl.PanelRootElementName) || this.rootElement;
                F12.Tools.Utility.Assert.isTrue(!!this.panelRootElement, "Expecting a root element for the panel in ItemsControl.");
                this.updateTooltip(this.tooltip);

                this.regenerateItemControls();
            };

            /**
            * Updates the control when the template is about to change.
            */
            ItemsControl.prototype.onTemplateChanging = function () {
                this.updateTooltip(null);
                this.removeAllItemControls();

                _super.prototype.onTemplateChanging.call(this);
            };

            /**
            * Overridable and allows sub-classes to update when the items property changes
            */
            ItemsControl.prototype.onItemsChangedOverride = function () {
            };

            /**
            * Overridable and allows sub-classes to update when the items container control
            * changes (which results in a full rebuild of the child controls).
            */
            ItemsControl.prototype.onItemContainerControlChangedOverride = function () {
            };

            /**
            * Overridable and allows sub-classes to update when the container collection is changed
            */
            ItemsControl.prototype.onCollectionChangedOverride = function (args) {
            };

            ItemsControl.prototype.onItemsChange = function (oldValue, newValue) {
                if (this._collectionChangedRegistration) {
                    this._collectionChangedRegistration.unregister();
                    this._collectionChangedRegistration = null;
                }

                this._collection = null;

                if (this.items) {
                    if (this.items.collectionChanged) {
                        this._collectionChangedRegistration = this.items.collectionChanged.addHandler(this.onCollectionChanged.bind(this));
                        this._collection = this.items;
                    } else {
                        // items is just an array, wrap it with a collection
                        this._collection = new Common.ObservableCollection(this.items);
                    }
                }

                this.regenerateItemControls();
                this.onItemsChangedOverride();
            };

            ItemsControl.prototype.onItemContainerControlChange = function (oldValue, newValue) {
                this._itemContainerClassType = null;
                this._itemContainerTemplateId = null;
                this._itemContainerIsTemplateControl = false;

                if (this.itemContainerControl) {
                    var parts = this.itemContainerControl.split(/[()]/, 2);
                    if (parts && parts.length > 0) {
                        // Retrieve the classname and verify it's a valid string.
                        var className = parts[0];
                        if (className) {
                            className = className.trim();
                        }

                        F12.Tools.Utility.Assert.isTrue(!!className, "Invalid itemContainerControl value. The control class name is required.");

                        // templateId can be null or empty. So, no checks for it.
                        var templateId = parts[1];
                        if (templateId) {
                            templateId = templateId.trim();
                        }

                        this._itemContainerClassType = Common.TemplateLoader.getControlType(className);
                        this._itemContainerTemplateId = templateId;
                        this._itemContainerIsTemplateControl = this._itemContainerClassType === Common.TemplateControl || this._itemContainerClassType.prototype instanceof Common.TemplateControl;
                    }
                }

                this.regenerateItemControls();
                this.onItemContainerControlChangedOverride();
            };

            ItemsControl.prototype.onCollectionChanged = function (args) {
                switch (args.action) {
                    case 0 /* Add */:
                        this.insertItemControls(args.newStartingIndex, args.newItems.length);
                        break;
                    case 3 /* Clear */:
                        this.removeAllItemControls();
                        break;
                    case 1 /* Remove */:
                        this.removeItemControls(args.oldStartingIndex, args.oldItems.length);
                        break;
                    case 2 /* Reset */:
                        this.regenerateItemControls();
                        break;
                }

                this.onCollectionChangedOverride(args);
            };

            ItemsControl.prototype.createItemControl = function (item) {
                var control = new this._itemContainerClassType(this._itemContainerTemplateId);

                this.prepareItemContainer(control, item);

                return control;
            };

            ItemsControl.prototype.disposeItemContainer = function (control) {
                this.disposeItemContainerOverride(control);

                if (control && control.model) {
                    control.model = null;
                }
            };

            ItemsControl.prototype.prepareItemContainer = function (control, item) {
                if (this._itemContainerIsTemplateControl) {
                    control.model = item;
                }

                this.prepareItemContainerOverride(control, item);
            };

            ItemsControl.prototype.regenerateItemControls = function () {
                this.removeAllItemControls();

                if (!this._collection) {
                    return;
                }

                this.insertItemControls(0, this._collection.length);
            };

            ItemsControl.prototype.insertItemControls = function (itemIndex, count) {
                if (!this._itemContainerClassType) {
                    return;
                }

                var end = itemIndex + count;
                F12.Tools.Utility.Assert.isTrue(end <= this._collection.length, "Unexpected range after inserting into items.");
                F12.Tools.Utility.Assert.isTrue(itemIndex <= this.panelRootElement.childElementCount, "Collection and child elements mismatch.");

                if (itemIndex === this.panelRootElement.childElementCount) {
                    for (var i = itemIndex; i < end; i++) {
                        var item = this._collection.getItem(i);
                        var control = this.createItemControl(item);
                        this.panelRootElement.appendChild(control.rootElement);
                    }
                } else {
                    // We are adding items in the middle, use insertBefore.
                    // Find the node we would want to insert before.
                    var endNode = this.panelRootElement.childNodes.item(itemIndex);

                    for (var i = itemIndex; i < end; i++) {
                        var item = this._collection.getItem(i);
                        var control = this.createItemControl(item);
                        this.panelRootElement.insertBefore(control.rootElement, endNode);
                    }
                }
            };

            ItemsControl.prototype.removeAllItemControls = function () {
                if (this.panelRootElement) {
                    var children = this.panelRootElement.children;
                    var childrenLength = children.length;
                    for (var i = 0; i < childrenLength; i++) {
                        var control = children[i].control;
                        this.disposeItemContainer(control);
                    }

                    this.panelRootElement.innerHTML = "";
                }
            };

            ItemsControl.prototype.removeItemControls = function (itemIndex, count) {
                for (var i = itemIndex + count - 1; i >= itemIndex; i--) {
                    var element = this.panelRootElement.children[i];
                    if (element) {
                        var control = element.control;
                        this.disposeItemContainer(control);
                        this.panelRootElement.removeChild(element);
                    }
                }
            };

            ItemsControl.prototype.updateTooltip = function (tooltip) {
                if (this.panelRootElement) {
                    if (tooltip) {
                        this.panelRootElement.setAttribute("data-plugin-vs-tooltip", tooltip);
                        this.panelRootElement.setAttribute("aria-label", tooltip);
                    } else {
                        this.panelRootElement.removeAttribute("data-plugin-vs-tooltip");
                        this.panelRootElement.removeAttribute("aria-label");
                    }
                }
            };
            ItemsControl.PanelRootElementName = "_panel";
            return ItemsControl;
        })(Common.TemplateControl);
        Controls.ItemsControl = ItemsControl;

        ItemsControl.initialize();
    })(Common.Controls || (Common.Controls = {}));
    var Controls = Common.Controls;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    /// <reference path="../assert.ts" />
    /// <reference path="../Framework/Model/Observable.ts" />
    /// <reference path="ItemsControl.ts" />
    (function (Controls) {
        "use strict";

        var ComboBox = (function (_super) {
            __extends(ComboBox, _super);
            /**
            * Constructor
            * @param templateId The id of the template to apply to the control
            */
            function ComboBox(templateId) {
                var _this = this;
                this._mouseHandler = function (e) {
                    return _this.onMouseEvent(e);
                };

                _super.call(this, templateId || "Common.defaultComboBoxTemplate");
                this.itemContainerControl = "Common.TemplateControl(Common.defaultComboBoxItemTemplate)";
            }
            Object.defineProperty(ComboBox.prototype, "focusableElement", {
                get: function () {
                    return this.rootElement;
                },
                enumerable: true,
                configurable: true
            });

            /**
            * Static constructor used to initialize observable properties
            */
            ComboBox.initialize = function () {
                Common.ObservableHelpers.defineProperty(ComboBox, ComboBox.SelectedValuePropertyName, "");
            };

            /**
            * Updates the control when the template has changed
            */
            ComboBox.prototype.onApplyTemplate = function () {
                _super.prototype.onApplyTemplate.call(this);

                if (this.rootElement) {
                    this.rootElement.addEventListener("mouseover", this._mouseHandler);
                }
            };

            /**
            * Updates the control when the template is about to change. Removes event handlers from previous root element.
            */
            ComboBox.prototype.onTemplateChanging = function () {
                _super.prototype.onTemplateChanging.call(this);

                if (this.rootElement) {
                    this.rootElement.removeEventListener("mouseover", this._mouseHandler);
                }
            };

            /**
            * Overridable and allows sub-classes to update when the items property changes
            */
            ComboBox.prototype.onItemsChangedOverride = function () {
                // Ensure the view is notified so that the selection can be properly reflected
                this.propertyChanged.invoke(ComboBox.SelectedValuePropertyName);
            };

            /**
            * Overridable and allows sub-classes to update when the items container control
            * changes (which results in a full rebuild of the child controls).
            */
            ComboBox.prototype.onItemContainerControlChangedOverride = function () {
                // Ensure the view is notified so that the selection can be properly reflected
                this.propertyChanged.invoke(ComboBox.SelectedValuePropertyName);
            };

            /**
            * Overridable and allows sub-classes to update when the container collection is changed
            */
            ComboBox.prototype.onCollectionChangedOverride = function (args) {
                // Ensure the view is notified so that the selection can be properly reflected
                this.propertyChanged.invoke(ComboBox.SelectedValuePropertyName);
            };

            /**
            * Protected overridable method. Gets called when isEnabled value changes
            */
            ComboBox.prototype.onIsEnabledChangedOverride = function () {
                _super.prototype.onIsEnabledChangedOverride.call(this);

                if (this.isEnabled) {
                    this.rootElement.removeAttribute("disabled");
                } else {
                    this.rootElement.setAttribute("disabled");
                }
            };

            /**
            * Handles mouse events to allow the button to be interacted with via the mouse
            * @param e The mouse event
            */
            ComboBox.prototype.onMouseEvent = function (e) {
                if (this.isEnabled) {
                    switch (e.type) {
                        case "mouseover":
                            var currentValue = this.selectedValue;

                            var itemCount = this.getItemCount();
                            for (var i = 0; i < itemCount; i++) {
                                var item = this.getItem(i);

                                if (item.value === currentValue) {
                                    if (item.tooltip) {
                                        Plugin.Tooltip.show({ content: item.tooltip });
                                    }
                                }
                            }

                            break;
                        default:
                            F12.Tools.Utility.Assert.fail("Unexpected");
                    }

                    e.stopImmediatePropagation();
                    e.preventDefault();
                }
            };
            ComboBox.SelectedValuePropertyName = "selectedValue";
            return ComboBox;
        })(Controls.ItemsControl);
        Controls.ComboBox = ComboBox;

        ComboBox.initialize();
    })(Common.Controls || (Common.Controls = {}));
    var Controls = Common.Controls;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    /// <reference path="../assert.ts" />
    /// <reference path="MenuItem.ts" />
    (function (Controls) {
        "use strict";

        /**
        * A menu item with a combobox input.
        */
        var ComboBoxMenuItem = (function (_super) {
            __extends(ComboBoxMenuItem, _super);
            function ComboBoxMenuItem(templateId) {
                var _this = this;
                this._focusInHandler = function (e) {
                    return _this.onFocusIn(e);
                };

                _super.call(this, templateId || "Common.menuItemComboBoxTemplate");
            }
            /**
            * Static constructor used to initialize observable properties
            */
            ComboBoxMenuItem.initialize = function () {
                Common.ObservableHelpers.defineProperty(ComboBoxMenuItem, "items", null);
                Common.ObservableHelpers.defineProperty(ComboBoxMenuItem, "selectedValue", null);
            };

            ComboBoxMenuItem.prototype.onApplyTemplate = function () {
                _super.prototype.onApplyTemplate.call(this);

                this._selectElement = this.getNamedElement("BPT-menuItemComboBox");
                F12.Tools.Utility.Assert.isTrue(!!this._selectElement, "Expecting a combobox with the name BPT-menuItemComboBox");

                this.rootElement.addEventListener("focusin", this._focusInHandler);
            };

            /**
            * Overridable protected to allow the derived class to intercept handling key-up event.
            * @param e The keyboard event
            */
            ComboBoxMenuItem.prototype.onKeyUpOverride = function (e) {
                var handled = false;

                // The combobox needs to handle the following keys in order to function as expected.
                if (e.srcElement === this._selectElement && e.key === Common.Keys.SPACEBAR || e.key === Common.Keys.ENTER || e.key === Common.Keys.DOWN || e.key === Common.Keys.UP) {
                    handled = true;
                }

                if (!handled) {
                    handled = _super.prototype.onKeyUpOverride.call(this, e);
                }

                return handled;
            };

            ComboBoxMenuItem.prototype.onTemplateChanging = function () {
                _super.prototype.onTemplateChanging.call(this);

                if (this.rootElement) {
                    this.rootElement.removeEventListener("focusin", this._focusInHandler);
                }
            };

            /**
            * Handles checking the menuitem when clicked
            * @param e An optional event object.
            */
            ComboBoxMenuItem.prototype.press = function (e) {
                // The combobox menu item has no pressing logic
            };

            ComboBoxMenuItem.prototype.onFocusIn = function (e) {
                // Transfer focus to the combobox when the menu item gets focus
                this._selectElement.focus();
            };
            return ComboBoxMenuItem;
        })(Common.Controls.MenuItem);
        Controls.ComboBoxMenuItem = ComboBoxMenuItem;

        ComboBoxMenuItem.initialize();
    })(Common.Controls || (Common.Controls = {}));
    var Controls = Common.Controls;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    /// <reference path="../assert.ts" />
    /// <reference path="../Framework/Templating/TemplateControl.ts" />
    /// <reference path="Button.ts" />
    (function (Controls) {
        "use strict";

        /**
        * A panel class which is templatable and provides easy access to controls
        * for the purpose of event handler subscription, etc
        */
        var Panel = (function (_super) {
            __extends(Panel, _super);
            /**
            * Constructor
            * @constructor
            * @param templateId The templateId to use with this panel. If not provided the template root will be a <div> element.
            */
            function Panel(templateId) {
                _super.call(this, templateId);
            }
            /**
            * Static constructor used to initialize observable properties
            */
            Panel.initialize = function () {
            };

            /**
            * Updates the button with the given name with a click handler
            * @param buttonName Name of the button as provided in data-name attribute
            * @param clickHandler Click handler to be added to the button
            */
            Panel.prototype.addClickHandlerToButton = function (buttonName, clickHandler) {
                var element = this.getNamedElement(buttonName);

                if (element && element.control) {
                    element.control.click.addHandler(clickHandler);
                }
            };
            return Panel;
        })(Common.TemplateControl);
        Controls.Panel = Panel;

        Panel.initialize();
    })(Common.Controls || (Common.Controls = {}));
    var Controls = Common.Controls;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    /// <reference path="../Assert.ts" />
    /// <reference path="../Framework/Model/ObservableCollection.ts" />
    /// <reference path="../Framework/Templating/TemplateControl.ts" />
    /// <reference path="Button.ts" />
    /// <reference path="ItemsControl.ts" />
    (function (Controls) {
        "use strict";

        /**
        * A control which adds scrolling and selection to an ItemsControl
        */
        var RibbonControl = (function (_super) {
            __extends(RibbonControl, _super);
            /**
            * Constructor
            * @param templateId The id of the template to apply to the control.
            */
            function RibbonControl(templateId) {
                var _this = this;
                this._currentOffset = 0;
                this._backwardScrollHandler = function () {
                    return _this.scrollBackward();
                };
                this._forwardScrollHandler = function () {
                    return _this.scrollForward();
                };
                this._onFocusInHandler = function (e) {
                    return _this.onFocusIn(e);
                };
                this._onFocusOutHandler = function (e) {
                    return _this.onFocusOut(e);
                };
                this._onKeyDownhandler = function (e) {
                    return _this.onKeyDown(e);
                };

                _super.call(this, templateId);

                this.selectedItem = null;
            }
            Object.defineProperty(RibbonControl.prototype, "selectedItem", {
                /**
                * [ObservableProperty] The selected item in the ribbon (null if nothing is selected)
                */
                get: function () {
                    return this._selectedItem;
                },
                set: function (value) {
                    if (value !== this._selectedItem) {
                        var itemIndex = this.getItemCount() === 0 ? undefined : this.getIndex(value);
                        if (itemIndex !== undefined) {
                            this._selectedItem = value;
                            this.selectedIndex = itemIndex;
                        } else {
                            this._selectedItem = null;
                            this.selectedIndex = null;
                        }

                        this.propertyChanged.invoke(RibbonControl.SelectedItemPropertyName);
                    }
                },
                enumerable: true,
                configurable: true
            });

            RibbonControl.initialize = function () {
                Common.ObservableHelpers.defineProperty(RibbonControl, RibbonControl.IsVerticalPropertyName, false, function (obj) {
                    return obj.onIsVerticalChanged();
                });
                Common.ObservableHelpers.defineProperty(RibbonControl, RibbonControl.ScrollIncrementPropertyName, /*defaultValue=*/ 1, function (obj) {
                    return obj.updateButtons();
                });
                Common.ObservableHelpers.defineProperty(RibbonControl, RibbonControl.ScrollPositionPropertyName, /*defaultValue=*/ 0, function (obj) {
                    return obj.onScrollPositionChanged();
                });
                Common.ObservableHelpers.defineProperty(RibbonControl, RibbonControl.SelectedIndexPropertyName, null, function (obj, oldValue, newValue) {
                    return obj.onSelectedIndexChanged(oldValue, newValue);
                });
            };

            RibbonControl.prototype.scrollBackward = function () {
                this.scrollPosition = Math.max(this.scrollPosition - this.scrollIncrement, 0);
            };

            RibbonControl.prototype.scrollForward = function () {
                if (this.scrollPosition + this.scrollIncrement < this.getItemCount()) {
                    this.scrollPosition += this.scrollIncrement;
                }
            };

            /**
            * Updates the control when the template has changed.
            */
            RibbonControl.prototype.onApplyTemplate = function () {
                _super.prototype.onApplyTemplate.call(this);

                this._panelTabIndex = this.panelRootElement.tabIndex;
                this.panelRootElement.classList.add(RibbonControl.PANEL_CLASS);
                this.onIsVerticalChanged();

                this.initializeButtons();
                this.initializeKeyboard();
                this.refresh();
            };

            /**
            * Protected virtual function used to notify subclasses that the template is about to change.
            * Can used to perform cleanup on the previous root element
            */
            RibbonControl.prototype.onTemplateChanging = function () {
                if (this.panelRootElement) {
                    this.cleanupKeyboard();
                    this.cleanupButtons();

                    this.selectedIndex = null;
                    this.scrollPosition = 0;
                    this.panelRootElement.classList.remove(RibbonControl.HORIZONTAL_PANEL_CLASS);
                    this.panelRootElement.classList.remove(RibbonControl.PANEL_CLASS);
                    this._panelTabIndex = null;
                }

                _super.prototype.onTemplateChanging.call(this);
            };

            RibbonControl.prototype.onItemsChangedOverride = function () {
                _super.prototype.onItemsChangedOverride.call(this);
                this.resetState();
            };

            RibbonControl.prototype.onCollectionChangedOverride = function (args) {
                _super.prototype.onCollectionChangedOverride.call(this, args);
                this.resetState();
            };

            /**
            * If placed within a PopupControl or the like, display changes cannot be applied while hidden,
            * and the UI for the RibbonControl will need to be refreshed when shown.
            */
            RibbonControl.prototype.refresh = function () {
                this.onScrollPositionChanged();
                this.displaySelected();
                this.updateButtons();
            };

            RibbonControl.prototype.onIsVerticalChanged = function () {
                // Clear scroll in existing orientation
                this.setOffset(0);

                if (!this.isVertical) {
                    this._lengthProperty = "offsetWidth";
                    this._offsetProperty = "offsetLeft";
                    this._positioningProperty = "left";
                    this.panelRootElement.classList.add(RibbonControl.HORIZONTAL_PANEL_CLASS);
                } else {
                    this._lengthProperty = "offsetHeight";
                    this._offsetProperty = "offsetTop";
                    this._positioningProperty = "top";
                    this.panelRootElement.classList.remove(RibbonControl.HORIZONTAL_PANEL_CLASS);
                }

                // Refresh to display in new orientation
                this.refresh();
            };

            RibbonControl.prototype.onScrollPositionChanged = function () {
                this.updateButtons();

                if (this.getItemCount() === 0) {
                    F12.Tools.Utility.Assert.areEqual(0, this.scrollPosition);
                    this.setOffset(0);
                    return;
                }

                F12.Tools.Utility.Assert.isTrue(this.scrollPosition >= 0 && this.scrollPosition < this.getItemCount(), "Scrolled to invalid position");

                var displayChild = (this.panelRootElement.children[this.scrollPosition]);

                this.setOffset(this._currentOffset + displayChild[this._offsetProperty]);
            };

            RibbonControl.prototype.onSelectedIndexChanged = function (oldValue, newValue) {
                // Clear the old selection if it exists
                if (oldValue !== null && oldValue < this.getItemCount()) {
                    F12.Tools.Utility.Assert.isTrue(oldValue >= 0 && oldValue < this.getItemCount(), "Invalid existing index " + oldValue);
                    this.panelRootElement.children[oldValue].classList.remove(RibbonControl.SELECTED_ITEM_CLASS);
                }

                if (newValue === null) {
                    this.selectedItem = null;
                } else {
                    F12.Tools.Utility.Assert.isTrue(this.selectedIndex >= 0 && this.selectedIndex < this.getItemCount(), "Invalid new index " + this.selectedIndex);
                    this.selectedItem = this.getItem(newValue);
                }

                this.displaySelected();
            };

            RibbonControl.prototype.displaySelected = function () {
                if (this.selectedIndex !== null) {
                    var selectedElement = this.panelRootElement.children[this.selectedIndex];
                    F12.Tools.Utility.Assert.isTrue(!!selectedElement, "No HTML element for selected index: " + this.selectedIndex);

                    this.scrollIntoView(selectedElement);
                    selectedElement.classList.add(RibbonControl.SELECTED_ITEM_CLASS);
                }
            };

            RibbonControl.prototype.onFocusIn = function (e) {
                // If focused on item, set it as selected
                var itemIndex = 0;
                var numItems = this.panelRootElement.children.length;
                for (; itemIndex < numItems; itemIndex++) {
                    var itemElement = this.panelRootElement.children[itemIndex];
                    if (itemElement.contains(e.target)) {
                        this.makeTabbable(itemElement);
                        if (this.selectedIndex === itemIndex) {
                            this.displaySelected();
                        } else {
                            this.selectedIndex = itemIndex;
                        }

                        return;
                    }
                }

                // Otherwise, trigger focus on the selected item, if there is one
                if (this.selectedIndex !== null) {
                    e.preventDefault();
                    this.setFocus(this.panelRootElement.children[this.selectedIndex]);
                }
            };

            RibbonControl.prototype.onFocusOut = function (e) {
                // If tabbing out of the panel, make sure the root element is tabbable again
                if (!e.relatedTarget || (e.relatedTarget !== this.panelRootElement && !this.panelRootElement.contains(e.relatedTarget))) {
                    this.makeTabbable(this.panelRootElement);
                }
            };

            /**
            * Protected overridable method. Gets called on the keyup event.
            * @param e the keyboard event object
            * @returns true if the event was handled and no need for extra processing
            */
            RibbonControl.prototype.onKeyDown = function (e) {
                var handled = false;
                var backwardKey = this.isVertical ? 38 /* ArrowUp */ : 37 /* ArrowLeft */;
                var forwardKey = this.isVertical ? 40 /* ArrowDown */ : 39 /* ArrowRight */;

                switch (e.keyCode) {
                    case forwardKey:
                        this.focusNext();
                        handled = true;
                        break;
                    case backwardKey:
                        this.focusPrevious();
                        handled = true;
                        break;
                }

                if (handled) {
                    e.stopImmediatePropagation();
                }

                return handled;
            };

            RibbonControl.prototype.focusPrevious = function () {
                var newIndex;

                if (this.getItemCount() > 0) {
                    if (this.selectedIndex === null) {
                        newIndex = this.getItemCount() - 1;
                    } else {
                        F12.Tools.Utility.Assert.isTrue((this.selectedIndex >= 0) && (this.selectedIndex < this.getItemCount()), "Invalid selected index");
                        newIndex = Math.max(this.selectedIndex - 1, 0);
                    }

                    this.setFocus(this.panelRootElement.children[newIndex]);
                }
            };

            RibbonControl.prototype.focusNext = function () {
                var newIndex;

                if (this.getItemCount() > 0) {
                    if (this.selectedIndex === null) {
                        newIndex = 0;
                    } else {
                        F12.Tools.Utility.Assert.isTrue((this.selectedIndex >= 0) && (this.selectedIndex < this.getItemCount()), "Invalid selected index");
                        newIndex = Math.min(this.selectedIndex + 1, this.getItemCount() - 1);
                    }

                    this.setFocus(this.panelRootElement.children[newIndex]);
                }
            };

            RibbonControl.prototype.scrollIntoView = function (element) {
                // Figure out the minimum number of scrollIncrements forwards or backwards to place element in view
                if (this.isForwardEdgeOutOfView(element)) {
                    for (var position = this.scrollPosition; position < this.getItemCount(); position += this.scrollIncrement) {
                        if (this.isInView(element, position)) {
                            this.scrollPosition = position;
                            return;
                        }
                    }

                    F12.Tools.Utility.Assert.fail("Could not find a scroll setting that brings element fully into view - is your scrollIncrement too big or your panel incorrectly sized?");
                } else if (this.isBackwardEdgeOutOfView(element)) {
                    for (var position = this.scrollPosition; position >= 0; position -= this.scrollIncrement) {
                        if (this.isInView(element, position)) {
                            this.scrollPosition = position;
                            return;
                        }
                    }

                    F12.Tools.Utility.Assert.fail("Could not find a scroll setting that brings element fully into view - is your scrollIncrement too big or your panel incorrectly sized?");
                }
            };

            RibbonControl.prototype.isInView = function (element, position) {
                return (!this.isForwardEdgeOutOfView(element, position) && !this.isBackwardEdgeOutOfView(element, position));
            };

            RibbonControl.prototype.isBackwardEdgeOutOfView = function (element, position) {
                if ((position === undefined) || (position === null)) {
                    position = this.scrollPosition;
                }

                var relativeOffset = element[this._offsetProperty] - this.panelRootElement.children[position][this._offsetProperty];

                return (relativeOffset < 0);
            };

            RibbonControl.prototype.isForwardEdgeOutOfView = function (element, position) {
                if ((position === undefined) || (position === null)) {
                    position = this.scrollPosition;
                }

                var positionedChild = this.panelRootElement.children[position];

                var elementEnd = element[this._offsetProperty] + element[this._lengthProperty];
                var relativeEndOffset = positionedChild[this._offsetProperty] + this.panelRootElement[this._lengthProperty] - elementEnd;

                return (relativeEndOffset < 0);
            };

            RibbonControl.prototype.updateButtons = function () {
                if (this._backwardScrollButton) {
                    F12.Tools.Utility.Assert.hasValue(this._forwardScrollButton);
                    this._backwardScrollButton.isEnabled = (this.scrollPosition > 0);
                    this._forwardScrollButton.isEnabled = (this.scrollPosition + this.scrollIncrement < this.getItemCount());
                }
            };

            RibbonControl.prototype.makeTabbable = function (element) {
                this.panelRootElement.removeAttribute("tabIndex");
                if (this.selectedIndex !== null) {
                    this.panelRootElement.children[this.selectedIndex].removeAttribute("tabIndex");
                }

                F12.Tools.Utility.Assert.hasValue(this._panelTabIndex);
                element.tabIndex = this._panelTabIndex;
            };

            RibbonControl.prototype.setOffset = function (offset) {
                this._currentOffset = offset;
                var children = this.panelRootElement.children;

                for (var i = 0; i < children.length; i++) {
                    children[i].style[this._positioningProperty] = (-offset) + "px";
                }
            };

            RibbonControl.prototype.setFocus = function (element) {
                // Prevent focus handler loops
                if (!element.contains(document.activeElement)) {
                    element.focus();

                    // Clear scrollLeft and scrollTop on panel (IE sometimes mistakenly sets this thinking an element is out of view)
                    this.panelRootElement.scrollLeft = 0;
                    this.panelRootElement.scrollTop = 0;
                }
            };

            RibbonControl.prototype.resetState = function () {
                this.selectedIndex = null;
                this.scrollPosition = 0;
                this.refresh();
            };

            RibbonControl.prototype.initializeButtons = function () {
                this._backwardScrollButton = this.getNamedControl(RibbonControl.BackwardScrollButtonName);
                F12.Tools.Utility.Assert.hasValue(this._backwardScrollButton, "RibbonControl template must have a backward button control named " + RibbonControl.BackwardScrollButtonName + " as a direct child");
                this._forwardScrollButton = this.getNamedControl(RibbonControl.ForwardScrollButtonName);
                F12.Tools.Utility.Assert.hasValue(this._backwardScrollButton, "RibbonControl template must have a forward button control named " + RibbonControl.ForwardScrollButtonName + " as a direct child");

                this._backwardScrollButton.click.addHandler(this._backwardScrollHandler);
                this._forwardScrollButton.click.addHandler(this._forwardScrollHandler);

                this.updateButtons();
            };

            RibbonControl.prototype.cleanupButtons = function () {
                if (this._backwardScrollButton) {
                    F12.Tools.Utility.Assert.hasValue(this._forwardScrollButton);
                    this._backwardScrollButton.isEnabled = false;
                    this._forwardScrollButton.isEnabled = false;
                    this._backwardScrollButton.click.removeHandler(this._backwardScrollHandler);
                    this._forwardScrollButton.click.removeHandler(this._forwardScrollHandler);
                    this._backwardScrollButton = null;
                    this._forwardScrollButton = null;
                }
            };

            RibbonControl.prototype.initializeKeyboard = function () {
                // The only thing that should be tabbable is the panel
                this.rootElement.removeAttribute("tabIndex");
                this._backwardScrollButton.rootElement.removeAttribute("tabIndex");
                this._forwardScrollButton.rootElement.removeAttribute("tabIndex");

                this.getNamedElement(Controls.ItemsControl.PanelRootElementName).addEventListener("focusin", this._onFocusInHandler);
                this.getNamedElement(Controls.ItemsControl.PanelRootElementName).addEventListener("focusout", this._onFocusOutHandler);
                this.getNamedElement(Controls.ItemsControl.PanelRootElementName).addEventListener("keydown", this._onKeyDownhandler);
            };

            RibbonControl.prototype.cleanupKeyboard = function () {
                this.getNamedElement(Controls.ItemsControl.PanelRootElementName).removeEventListener("focusin", this._onFocusInHandler);
                this.getNamedElement(Controls.ItemsControl.PanelRootElementName).removeEventListener("focusout", this._onFocusOutHandler);
                this.getNamedElement(Controls.ItemsControl.PanelRootElementName).removeEventListener("keydown", this._onKeyDownhandler);
            };
            RibbonControl.HORIZONTAL_PANEL_CLASS = "BPT-horizontalRibbonPanel";
            RibbonControl.PANEL_CLASS = "BPT-ribbonPanel";
            RibbonControl.SELECTED_ITEM_CLASS = "BPT-selected";

            RibbonControl.BackwardScrollButtonName = "_backwardScrollButton";
            RibbonControl.ForwardScrollButtonName = "_forwardScrollButton";
            RibbonControl.IsVerticalPropertyName = "isVertical";
            RibbonControl.ScrollIncrementPropertyName = "scrollIncrement";
            RibbonControl.ScrollPositionPropertyName = "scrollPosition";
            RibbonControl.SelectedIndexPropertyName = "selectedIndex";
            RibbonControl.SelectedItemPropertyName = "selectedItem";
            return RibbonControl;
        })(Controls.ItemsControl);
        Controls.RibbonControl = RibbonControl;

        RibbonControl.initialize();
    })(Common.Controls || (Common.Controls = {}));
    var Controls = Common.Controls;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    /// <reference path="../assert.ts" />
    /// <reference path="../KeyCodes.ts" />
    /// <reference path="../Framework/Model/Observable.ts" />
    /// <reference path="../Framework/Templating/TemplateControl.ts" />
    (function (Controls) {
        "use strict";

        var TextBox = (function (_super) {
            __extends(TextBox, _super);
            /**
            * Constructor
            * @param templateId The id of the template to apply to the control
            */
            function TextBox(templateId) {
                var _this = this;
                this._keyboardHandler = function (e) {
                    return _this.onKeyboardEvent(e);
                };

                _super.call(this, templateId || "Common.defaultTextBoxTemplate");
            }
            Object.defineProperty(TextBox.prototype, "focusableElement", {
                get: function () {
                    return this.rootElement;
                },
                enumerable: true,
                configurable: true
            });

            /**
            * Static constructor used to initialize observable properties
            */
            TextBox.initialize = function () {
                Common.ObservableHelpers.defineProperty(TextBox, TextBox.PlaceholderPropertyName, "");
                Common.ObservableHelpers.defineProperty(TextBox, TextBox.ReadonlyPropertyName, false, function (obj) {
                    return obj.onReadonlyChanged();
                });
                Common.ObservableHelpers.defineProperty(TextBox, TextBox.TextPropertyName, "");
            };

            /**
            * Updates the control when the template has changed
            */
            TextBox.prototype.onApplyTemplate = function () {
                _super.prototype.onApplyTemplate.call(this);

                this._inputRootElement = (this.getNamedElement(TextBox.InputElementName) || this.rootElement);
                F12.Tools.Utility.Assert.isTrue(!!this._inputRootElement, "Expecting a root element for the input element in TextBox.");

                this._textBinding = this.getBinding(this._inputRootElement, "value");

                this._inputRootElement.addEventListener("keydown", this._keyboardHandler);
                this._inputRootElement.addEventListener("keypress", this._keyboardHandler);
                this._inputRootElement.addEventListener("input", this._keyboardHandler);
            };

            /**
            * Handles a change to the isEnabled property
            */
            TextBox.prototype.onIsEnabledChangedOverride = function () {
                _super.prototype.onIsEnabledChangedOverride.call(this);

                if (this.isEnabled) {
                    this.rootElement.removeAttribute("disabled");
                } else {
                    this.rootElement.setAttribute("disabled");
                }
            };

            /**
            * Updates the control when the template is about to change. Removes event handlers from previous root element.
            */
            TextBox.prototype.onTemplateChanging = function () {
                _super.prototype.onTemplateChanging.call(this);

                if (this._inputRootElement) {
                    this._inputRootElement.removeEventListener("keypress", this._keyboardHandler);
                    this._inputRootElement.removeEventListener("keydown", this._keyboardHandler);
                    this._inputRootElement.removeEventListener("input", this._keyboardHandler);
                }
            };

            /**
            * Handles keyboard events to allow the button to be interacted with via the keyboard
            * @param e The mouse event
            */
            TextBox.prototype.onKeyboardEvent = function (e) {
                if (this.isEnabled) {
                    switch (e.type) {
                        case "keydown":
                            if (e.key === Common.Keys.ENTER) {
                                if (this._textBinding) {
                                    this._textBinding.updateSourceFromDest();
                                }
                            }

                            break;
                        case "keypress":
                            if (this.clearOnEscape && e.keyCode === 27 /* Escape */) {
                                this._inputRootElement.value = "";

                                if (this._textBinding) {
                                    this._textBinding.updateSourceFromDest();
                                }

                                // We don't want the textbox to handle escape
                                e.stopImmediatePropagation();
                                e.preventDefault();
                            }

                            break;
                        case "input":
                            if (this.updateOnInput) {
                                if (this._textBinding) {
                                    this._textBinding.updateSourceFromDest();
                                }
                            }

                            break;
                        default:
                            F12.Tools.Utility.Assert.fail("Unexpected");
                    }
                }
            };

            TextBox.prototype.onReadonlyChanged = function () {
                if (this._inputRootElement) {
                    this._inputRootElement.readOnly = this.readonly;
                }
            };
            TextBox.PlaceholderPropertyName = "placeholder";
            TextBox.ReadonlyPropertyName = "readonly";
            TextBox.TextPropertyName = "text";

            TextBox.InputElementName = "_textBoxRoot";
            return TextBox;
        })(Common.TemplateControl);
        Controls.TextBox = TextBox;

        TextBox.initialize();
    })(Common.Controls || (Common.Controls = {}));
    var Controls = Common.Controls;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    /// <reference path="../assert.ts" />
    /// <reference path="MenuItem.ts" />
    (function (Controls) {
        "use strict";

        /**
        * A menu item with a textbox input.
        */
        var TextBoxMenuItem = (function (_super) {
            __extends(TextBoxMenuItem, _super);
            function TextBoxMenuItem(templateId) {
                var _this = this;
                this._focusInHandler = function (e) {
                    return _this.onFocusIn(e);
                };

                _super.call(this, templateId || "Common.menuItemTextBoxTemplate");
            }
            /**
            * Static constructor used to initialize observable properties
            */
            TextBoxMenuItem.initialize = function () {
                Common.ObservableHelpers.defineProperty(TextBoxMenuItem, TextBoxMenuItem.PlaceholderPropertyName, null);
            };

            TextBoxMenuItem.prototype.onApplyTemplate = function () {
                _super.prototype.onApplyTemplate.call(this);

                this._textBox = this.getNamedElement("BPT-menuItemTextBox");
                F12.Tools.Utility.Assert.isTrue(!!this._textBox, "Expecting a textbox with the name BPT-menuItemTextBox");

                this.rootElement.addEventListener("focusin", this._focusInHandler);
            };

            /**
            * Overridable protected to allow the derived class to intercept handling key-up event.
            * @param e The keyboard event
            */
            TextBoxMenuItem.prototype.onKeyUpOverride = function (e) {
                var handled = false;

                if (e.srcElement === this._textBox && e.keyCode === 27 /* Escape */) {
                    // We don't want the key to reach the menu control
                    e.stopImmediatePropagation();
                    handled = true;
                }

                if (!handled) {
                    handled = _super.prototype.onKeyUpOverride.call(this, e);
                }

                return handled;
            };

            TextBoxMenuItem.prototype.onTemplateChanging = function () {
                _super.prototype.onTemplateChanging.call(this);

                if (this.rootElement) {
                    this.rootElement.removeEventListener("focusin", this._focusInHandler);
                }
            };

            /**
            * Handles checking the menuitem when clicked
            * @param e An optional event object.
            */
            TextBoxMenuItem.prototype.press = function (e) {
                // The textbox menu item cannot be pressed.
            };

            TextBoxMenuItem.prototype.onFocusIn = function (e) {
                // Transfer focus to the textbox when the menu item gets focus
                this._textBox.focus();
                // Don't stop the event from bubbling, we still want the event to reach the menu control to update the current selectedIndex
            };
            TextBoxMenuItem.PlaceholderPropertyName = "placeholder";
            return TextBoxMenuItem;
        })(Common.Controls.MenuItem);
        Controls.TextBoxMenuItem = TextBoxMenuItem;

        TextBoxMenuItem.initialize();
    })(Common.Controls || (Common.Controls = {}));
    var Controls = Common.Controls;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    /// <reference path="Button.ts" />
    (function (Controls) {
        "use strict";

        /**
        * A Button class which is templatable and provides basic button functionality
        */
        var ToggleButton = (function (_super) {
            __extends(ToggleButton, _super);
            /**
            * Constructor
            * @param templateId The id of the template to apply to the control
            */
            function ToggleButton(templateId) {
                var _this = this;
                this._modificationHandler = function (e) {
                    return _this.onModificationEvent(e);
                };

                _super.call(this, templateId);

                this.toggleIsCheckedOnClick = true;

                this.click.addHandler(function (e) {
                    if (_this.toggleIsCheckedOnClick) {
                        _this.isChecked = !_this.isChecked;
                    }
                });
            }
            /**
            * Static constructor used to initialize observable properties
            */
            ToggleButton.initialize = function () {
                Common.ObservableHelpers.defineProperty(Controls.Button, "isChecked", false, function (obj, oldValue, newValue) {
                    return obj.onIsCheckedChanged(oldValue, newValue);
                });
            };

            /**
            * Updates the control when the template has changed
            */
            ToggleButton.prototype.onApplyTemplate = function () {
                _super.prototype.onApplyTemplate.call(this);

                if (this.rootElement) {
                    this.rootElement.addEventListener("DOMAttrModified", this._modificationHandler);

                    // Ensure the control is in the correct state
                    this.onIsCheckedChanged(null, this.isChecked);
                }
            };

            /**
            * Updates the control when the template is about to change. Removes event handlers from previous root element.
            */
            ToggleButton.prototype.onTemplateChanging = function () {
                _super.prototype.onTemplateChanging.call(this);

                if (this.rootElement) {
                    this.rootElement.removeEventListener("DOMAttrModified", this._modificationHandler);
                }
            };

            /**
            * Handles a change to the isChecked property
            * @param oldValue The old value for the property
            * @param newValue The new value for the property
            */
            ToggleButton.prototype.onIsCheckedChanged = function (oldValue, newValue) {
                if (this.rootElement) {
                    if (!this._isChangingAriaPressed) {
                        this._isChangingAriaPressed = true;
                        this.rootElement.setAttribute("aria-pressed", newValue + "");
                        this._isChangingAriaPressed = false;
                    }

                    if (newValue) {
                        this.rootElement.classList.add(ToggleButton.CLASS_CHECKED);
                    } else {
                        this.rootElement.classList.remove(ToggleButton.CLASS_CHECKED);
                    }
                }
            };

            /**
            * Handles DOM modification events to determine if an accessibility tool has changed aria-pressed
            * @param e The keyboard event
            */
            ToggleButton.prototype.onModificationEvent = function (e) {
                if (!this._isChangingAriaPressed && this.isEnabled && e.attrName === "aria-pressed" && e.attrChange === e.MODIFICATION) {
                    this._isChangingAriaPressed = true;
                    this.isChecked = e.newValue === "true";
                    this._isChangingAriaPressed = false;
                }
            };
            ToggleButton.CLASS_CHECKED = "checked";
            return ToggleButton;
        })(Controls.Button);
        Controls.ToggleButton = ToggleButton;

        ToggleButton.initialize();
    })(Common.Controls || (Common.Controls = {}));
    var Controls = Common.Controls;
})(Common || (Common = {}));
//
// Copyright (C) Microsoft. All rights reserved.
//
var Common;
(function (Common) {
    /// <reference path="../assert.ts" />
    /// <reference path="ControlUtilities.ts" />
    /// <reference path="Panel.ts" />
    /// <reference path="ContentControl.ts" />
    /// <disable code="SA1513" rule="ClosingCurlyBracketMustBeFollowedByBlankLine" justification="tscop is not liking do/while syntax"/>
    (function (Controls) {
        "use strict";

        /**
        * A toolbar class which is templatable and provides toolbar functionality
        */
        var ToolbarControl = (function (_super) {
            __extends(ToolbarControl, _super);
            /**
            * Constructor
            * @constructor
            * @param templateId The id of the template to apply to the control, for example: Common.toolbarTemplateWithSearchBox.
            *        Default is Common.defaultToolbarTemplate.
            */
            function ToolbarControl(templateId) {
                var _this = this;
                this._activeIndex = -1;
                this._controls = [];
                this._controlsPropChangedRegistration = [];
                this._focusInHandler = function (e) {
                    return _this.onFocusIn(e);
                };
                this._toolbarKeyHandler = function (e) {
                    return _this.onToolbarKeyboardEvent(e);
                };
                this._toolbarPanel = null;

                _super.call(this, templateId || "Common.defaultToolbarTemplate");

                if (Plugin.F12) {
                    // Add the listener for host changing event
                    Plugin.F12.addEventListener("hostinfochanged", function (e) {
                        return _this.onHostInfoChanged(e);
                    });
                    this.onHostInfoChanged(Plugin.F12.getHostInfo());
                }
            }
            /**
            * Static constructor used to initialize observable properties
            */
            ToolbarControl.initialize = function () {
                Common.ObservableHelpers.defineProperty(ToolbarControl, ToolbarControl.PanelTemplateIdPropertyName, "", function (obj, oldValue, newValue) {
                    return obj.onPanelTemplateIdChanged(oldValue, newValue);
                });
                Common.ObservableHelpers.defineProperty(ToolbarControl, ToolbarControl.TitlePropertyName, "");
            };

            /**
            * Gets the active element that should have focus when tapping into the toolbar
            * @return The active element (or null if none if there isn't an active element)
            */
            ToolbarControl.prototype.getActiveElement = function () {
                if (this._activeIndex >= 0 && this._activeIndex < this._controls.length) {
                    return this._controls[this._activeIndex].rootElement;
                }

                return null;
            };

            /**
            * Moves focus to the next/previous control
            * @param direction A direction to move selection in (Next/Previous)
            */
            ToolbarControl.prototype.moveToControl = function (direction) {
                var step = (direction === 0 /* Next */) ? 1 : this._controls.length - 1;

                var focusedElement = document.activeElement;

                if (this._controls.length === 0 || this._activeIndex === -1 || !focusedElement) {
                    return;
                }

                var startIndex = this._activeIndex;

                for (var i = 0; i < this._controls.length; i++) {
                    if (this._controls[i].rootElement === focusedElement) {
                        startIndex = i;
                        break;
                    }
                }

                var currentIndex = startIndex;

                while (startIndex !== (currentIndex = (currentIndex + step) % this._controls.length)) {
                    var control = this._controls[currentIndex];
                    if (control.isVisible && control.isEnabled) {
                        this.setActiveIndex(currentIndex, true);
                        break;
                    }
                }
            };

            ToolbarControl.prototype.onFocusIn = function (e) {
                // Find the control which contains the target and set it as the active index
                var controlIndex = 0;
                for (; controlIndex < this._controls.length; controlIndex++) {
                    var control = this._controls[controlIndex];
                    if (control.rootElement.contains(e.target)) {
                        break;
                    }
                }

                if (controlIndex < this._controls.length) {
                    this.setActiveIndex(controlIndex);
                }
            };

            /**
            * Handles a change to panelTemplateId. Resets the controls arrays with new controls
            * @param oldValue The old value for the property
            * @param newValue The new value for the property
            */
            ToolbarControl.prototype.onPanelTemplateIdChanged = function (oldValue, newValue) {
                if (this._toolbarPanel) {
                    this._toolbarPanel.removeEventListener("focusin", this._focusInHandler);
                    this._toolbarPanel.removeEventListener("keydown", this._toolbarKeyHandler);
                    this._toolbarPanel = null;
                }

                while (this._controlsPropChangedRegistration.length > 0) {
                    this._controlsPropChangedRegistration.pop().unregister();
                }

                if (newValue) {
                    this._controls = [];
                    this.setActiveIndex(-1);

                    this._toolbarPanel = this.getNamedElement(ToolbarControl.TOOLBAR_PANEL_ELEMENT_NAME);
                    F12.Tools.Utility.Assert.hasValue(this._toolbarPanel, "Expecting a toolbar panel with the name: " + ToolbarControl.TOOLBAR_PANEL_ELEMENT_NAME);

                    this._toolbarPanel.addEventListener("focusin", this._focusInHandler);
                    this._toolbarPanel.addEventListener("keydown", this._toolbarKeyHandler);

                    for (var elementIndex = 0; elementIndex < this._toolbarPanel.children.length; elementIndex++) {
                        var element = this._toolbarPanel.children[elementIndex];

                        if (element.control) {
                            F12.Tools.Utility.Assert.isTrue(element.control instanceof Common.TemplateControl, "We only support controls of type TemplateControl in the Toolbar");

                            var control = element.control;
                            this._controls.push(control);
                            this._controlsPropChangedRegistration.push(control.propertyChanged.addHandler(this.onChildControlPropertyChanged.bind(this, control)));
                        }
                    }
                }

                this.setTabStop();
            };

            ToolbarControl.prototype.onHostInfoChanged = function (e) {
                // Update the right margin of the toolbar area to ensure the shell buttons don't overlap it
                var scaledControlAreaWidth = e.controlAreaWidth * (screen.logicalXDPI / screen.deviceXDPI);

                var toolbarContents = this.rootElement.querySelector(".BPT-ToolbarContents");
                F12.Tools.Utility.Assert.hasValue(toolbarContents, "Unable to find an element with selector .BPT-ToolbarContents in the toolbar on hostInfoChanged");

                if (toolbarContents) {
                    toolbarContents.style.marginRight = scaledControlAreaWidth + "px";
                }
            };

            /**
            * Handles keyboard events to allow arrow key navigation for selecting the next/previous controls
            * @param e The keyboard event
            */
            ToolbarControl.prototype.onToolbarKeyboardEvent = function (e) {
                if (e.keyCode === 37 /* ArrowLeft */) {
                    this.moveToControl(1 /* Previous */);
                    e.stopPropagation();
                } else if (e.keyCode === 39 /* ArrowRight */) {
                    this.moveToControl(0 /* Next */);
                    e.stopPropagation();
                }
            };

            /**
            * Handles update of the tab index when child-controls have their enabled and visible settings toggled
            * @param button The button who's property has changed
            * @param propertyName Name of the observable property which changed on the button
            */
            ToolbarControl.prototype.onChildControlPropertyChanged = function (childControl, propertyName) {
                if (propertyName === Common.TemplateControl.IsEnabledPropertyName || propertyName === Common.TemplateControl.IsVisiblePropertyName) {
                    if (this._activeIndex === -1) {
                        this.setTabStop();
                    } else {
                        var currentActiveControl = this._controls[this._activeIndex];
                        if (childControl === currentActiveControl) {
                            if (!(childControl.isEnabled && childControl.isVisible)) {
                                this.setTabStop(this._activeIndex);
                            }
                        }
                    }
                }
            };

            /**
            * Ensures that if there is a visible and enabled control it will get a tab stop (1) and all the others will be disabled (-1)
            */
            ToolbarControl.prototype.setTabStop = function (startAt) {
                this.setActiveIndex(-1);

                startAt = startAt || 0;
                if (startAt < 0 || startAt >= this._controls.length) {
                    return;
                }

                var currentIndex = startAt;
                var foundTabStop = false;

                do {
                    var control = this._controls[currentIndex];
                    if (!foundTabStop && control.isVisible && control.isEnabled) {
                        this.setActiveIndex(currentIndex);
                        foundTabStop = true;
                    } else {
                        control.tabIndex = -1;
                    }
                } while(startAt !== (currentIndex = (currentIndex + 1) % this._controls.length));
            };

            ToolbarControl.prototype.setActiveIndex = function (newIndex, setFocus) {
                if (this._activeIndex >= 0 && this._activeIndex < this._controls.length) {
                    this._controls[this._activeIndex].tabIndex = -1;
                }

                this._activeIndex = newIndex;

                var control = this._controls[this._activeIndex];
                if (control) {
                    control.tabIndex = 1;

                    if (setFocus) {
                        control.rootElement.focus();
                    }
                }
            };
            ToolbarControl.TOOLBAR_PANEL_ELEMENT_NAME = "_toolbarPanel";

            ToolbarControl.PanelTemplateIdPropertyName = "panelTemplateId";
            ToolbarControl.TitlePropertyName = "title";
            return ToolbarControl;
        })(Controls.Panel);
        Controls.ToolbarControl = ToolbarControl;

        ToolbarControl.initialize();
    })(Common.Controls || (Common.Controls = {}));
    var Controls = Common.Controls;
})(Common || (Common = {}));
//# sourceMappingURL=out.js.map
