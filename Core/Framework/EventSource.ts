// 
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="../assert.ts" />
/// <reference path="IEventHandler.ts" />
/// <reference path="IEventRegistration.ts" />

module Common {
    "use strict";

    /**
     * An event object which can have multiple listeners which are called when the event is invoked
     */
    export class EventSource<T> {
        /** The list of event listeners which should be invoked when the event is invoked */
        private _handlers: IEventHandler<T>[];

        /** Tracks the number of invokeAsync methods that are currently looping on _handlers. Used to prevent splicing the array underneath the invocation. */
        private _eventsRunning: number;

        constructor() {
            this._handlers = null;
            this._eventsRunning = 0;
        }

        /**
         * Adds a handler to the event.  The handler can be removed by calling dispose on the returned object, or by calling removeHandler
         * @param handler - The function to be called when the event is invoked
         * @return A disposable object which removes the handler when it's disposed
         */
        public addHandler(handler: IEventHandler<T>): IEventRegistration {
            F12.Tools.Utility.Assert.isTrue(typeof handler === "function", "handler must be function");

            if (!this._handlers) {
                this._handlers = [];
            }

            this._handlers.push(handler);
            return { unregister: () => this.removeHandler(handler) };
        }

        /**
         * Adds a handler which is called on the next invokation of the event, and then the handler is removed
         * @param handler - The handler to be called on the next invokation of the the event
         * @return A disposable object which removes the handler when it's disposed
         */
        public addOne(handler: IEventHandler<T>): IEventRegistration {
            var registration: IEventRegistration = this.addHandler((args: T) => {
                registration.unregister();
                handler(args);
            });
            return registration;
        }

        /**
         * Removes a handler from the list of handlers.  This can also be called by disposing the object returned from an
         * add call
         * @param handler - The event handler to remove
         */
        public removeHandler(handler: IEventHandler<T>): void {
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
        }

        /**
         * Invokes the event with the specified args
         * @param args - The event args to pass to each handler
         */
        public invoke(args?: T): void {
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
        }

        /**
         * Invokes the event with the sepecified args and waits for the
         * returns a promise that completes when all the async handlers complete
         * @param args - The event args to pass to each handler
         */
        public invokeAsync(args?: T): Plugin.Promise/*<void>*/ {
            if (this._handlers) {
                this._eventsRunning++;
                var promises: Plugin.Promise[] = [];

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
        }

        /**
         * Event handlers that get removed while an invoke() is still iterating are set to null instead of
         * being removed from this._handlers. This method executes after all invocations finish.
         */
        private cleanupNullHandlers(): void {
            for (var i = this._handlers.length - 1; i >= 0; i--) {
                if (!this._handlers[i]) {
                    this._handlers.splice(i, 1);
                }
            }
        }
    }
}
