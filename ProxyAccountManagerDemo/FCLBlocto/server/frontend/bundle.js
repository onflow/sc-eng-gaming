var app = (function () {
    'use strict';

    function noop$8() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update$4(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update$4($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop$8,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop$8;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function _arrayWithHoles(arr) {
      if (Array.isArray(arr)) return arr;
    }

    function _iterableToArrayLimit(arr, i) {
      var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];

      if (_i == null) return;
      var _arr = [];
      var _n = true;
      var _d = false;

      var _s, _e;

      try {
        for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);

          if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"] != null) _i["return"]();
        } finally {
          if (_d) throw _e;
        }
      }

      return _arr;
    }

    function _arrayLikeToArray(arr, len) {
      if (len == null || len > arr.length) len = arr.length;

      for (var i = 0, arr2 = new Array(len); i < len; i++) {
        arr2[i] = arr[i];
      }

      return arr2;
    }

    function _unsupportedIterableToArray(o, minLen) {
      if (!o) return;
      if (typeof o === "string") return _arrayLikeToArray(o, minLen);
      var n = Object.prototype.toString.call(o).slice(8, -1);
      if (n === "Object" && o.constructor) n = o.constructor.name;
      if (n === "Map" || n === "Set") return Array.from(o);
      if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
    }

    function _nonIterableRest() {
      throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }

    function _slicedToArray(arr, i) {
      return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
    }

    function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
      try {
        var info = gen[key](arg);
        var value = info.value;
      } catch (error) {
        reject(error);
        return;
      }

      if (info.done) {
        resolve(value);
      } else {
        Promise.resolve(value).then(_next, _throw);
      }
    }

    function _asyncToGenerator(fn) {
      return function () {
        var self = this,
            args = arguments;
        return new Promise(function (resolve, reject) {
          var gen = fn.apply(self, args);

          function _next(value) {
            asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
          }

          function _throw(err) {
            asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
          }

          _next(undefined);
        });
      };
    }

    var regeneratorRuntime$1 = {exports: {}};

    var _typeof$1 = {exports: {}};

    (function (module) {
    	function _typeof(obj) {
    	  "@babel/helpers - typeof";

    	  return (module.exports = _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) {
    	    return typeof obj;
    	  } : function (obj) {
    	    return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    	  }, module.exports.__esModule = true, module.exports["default"] = module.exports), _typeof(obj);
    	}

    	module.exports = _typeof, module.exports.__esModule = true, module.exports["default"] = module.exports;
    } (_typeof$1));

    (function (module) {
    	var _typeof = _typeof$1.exports["default"];

    	function _regeneratorRuntime() {
    	  /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */

    	  module.exports = _regeneratorRuntime = function _regeneratorRuntime() {
    	    return exports;
    	  }, module.exports.__esModule = true, module.exports["default"] = module.exports;
    	  var exports = {},
    	      Op = Object.prototype,
    	      hasOwn = Op.hasOwnProperty,
    	      $Symbol = "function" == typeof Symbol ? Symbol : {},
    	      iteratorSymbol = $Symbol.iterator || "@@iterator",
    	      asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator",
    	      toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

    	  function define(obj, key, value) {
    	    return Object.defineProperty(obj, key, {
    	      value: value,
    	      enumerable: !0,
    	      configurable: !0,
    	      writable: !0
    	    }), obj[key];
    	  }

    	  try {
    	    define({}, "");
    	  } catch (err) {
    	    define = function define(obj, key, value) {
    	      return obj[key] = value;
    	    };
    	  }

    	  function wrap(innerFn, outerFn, self, tryLocsList) {
    	    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator,
    	        generator = Object.create(protoGenerator.prototype),
    	        context = new Context(tryLocsList || []);
    	    return generator._invoke = function (innerFn, self, context) {
    	      var state = "suspendedStart";
    	      return function (method, arg) {
    	        if ("executing" === state) throw new Error("Generator is already running");

    	        if ("completed" === state) {
    	          if ("throw" === method) throw arg;
    	          return doneResult();
    	        }

    	        for (context.method = method, context.arg = arg;;) {
    	          var delegate = context.delegate;

    	          if (delegate) {
    	            var delegateResult = maybeInvokeDelegate(delegate, context);

    	            if (delegateResult) {
    	              if (delegateResult === ContinueSentinel) continue;
    	              return delegateResult;
    	            }
    	          }

    	          if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) {
    	            if ("suspendedStart" === state) throw state = "completed", context.arg;
    	            context.dispatchException(context.arg);
    	          } else "return" === context.method && context.abrupt("return", context.arg);
    	          state = "executing";
    	          var record = tryCatch(innerFn, self, context);

    	          if ("normal" === record.type) {
    	            if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue;
    	            return {
    	              value: record.arg,
    	              done: context.done
    	            };
    	          }

    	          "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg);
    	        }
    	      };
    	    }(innerFn, self, context), generator;
    	  }

    	  function tryCatch(fn, obj, arg) {
    	    try {
    	      return {
    	        type: "normal",
    	        arg: fn.call(obj, arg)
    	      };
    	    } catch (err) {
    	      return {
    	        type: "throw",
    	        arg: err
    	      };
    	    }
    	  }

    	  exports.wrap = wrap;
    	  var ContinueSentinel = {};

    	  function Generator() {}

    	  function GeneratorFunction() {}

    	  function GeneratorFunctionPrototype() {}

    	  var IteratorPrototype = {};
    	  define(IteratorPrototype, iteratorSymbol, function () {
    	    return this;
    	  });
    	  var getProto = Object.getPrototypeOf,
    	      NativeIteratorPrototype = getProto && getProto(getProto(values([])));
    	  NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype);
    	  var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype);

    	  function defineIteratorMethods(prototype) {
    	    ["next", "throw", "return"].forEach(function (method) {
    	      define(prototype, method, function (arg) {
    	        return this._invoke(method, arg);
    	      });
    	    });
    	  }

    	  function AsyncIterator(generator, PromiseImpl) {
    	    function invoke(method, arg, resolve, reject) {
    	      var record = tryCatch(generator[method], generator, arg);

    	      if ("throw" !== record.type) {
    	        var result = record.arg,
    	            value = result.value;
    	        return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) {
    	          invoke("next", value, resolve, reject);
    	        }, function (err) {
    	          invoke("throw", err, resolve, reject);
    	        }) : PromiseImpl.resolve(value).then(function (unwrapped) {
    	          result.value = unwrapped, resolve(result);
    	        }, function (error) {
    	          return invoke("throw", error, resolve, reject);
    	        });
    	      }

    	      reject(record.arg);
    	    }

    	    var previousPromise;

    	    this._invoke = function (method, arg) {
    	      function callInvokeWithMethodAndArg() {
    	        return new PromiseImpl(function (resolve, reject) {
    	          invoke(method, arg, resolve, reject);
    	        });
    	      }

    	      return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg();
    	    };
    	  }

    	  function maybeInvokeDelegate(delegate, context) {
    	    var method = delegate.iterator[context.method];

    	    if (undefined === method) {
    	      if (context.delegate = null, "throw" === context.method) {
    	        if (delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method)) return ContinueSentinel;
    	        context.method = "throw", context.arg = new TypeError("The iterator does not provide a 'throw' method");
    	      }

    	      return ContinueSentinel;
    	    }

    	    var record = tryCatch(method, delegate.iterator, context.arg);
    	    if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel;
    	    var info = record.arg;
    	    return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel);
    	  }

    	  function pushTryEntry(locs) {
    	    var entry = {
    	      tryLoc: locs[0]
    	    };
    	    1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry);
    	  }

    	  function resetTryEntry(entry) {
    	    var record = entry.completion || {};
    	    record.type = "normal", delete record.arg, entry.completion = record;
    	  }

    	  function Context(tryLocsList) {
    	    this.tryEntries = [{
    	      tryLoc: "root"
    	    }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0);
    	  }

    	  function values(iterable) {
    	    if (iterable) {
    	      var iteratorMethod = iterable[iteratorSymbol];
    	      if (iteratorMethod) return iteratorMethod.call(iterable);
    	      if ("function" == typeof iterable.next) return iterable;

    	      if (!isNaN(iterable.length)) {
    	        var i = -1,
    	            next = function next() {
    	          for (; ++i < iterable.length;) {
    	            if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next;
    	          }

    	          return next.value = undefined, next.done = !0, next;
    	        };

    	        return next.next = next;
    	      }
    	    }

    	    return {
    	      next: doneResult
    	    };
    	  }

    	  function doneResult() {
    	    return {
    	      value: undefined,
    	      done: !0
    	    };
    	  }

    	  return GeneratorFunction.prototype = GeneratorFunctionPrototype, define(Gp, "constructor", GeneratorFunctionPrototype), define(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) {
    	    var ctor = "function" == typeof genFun && genFun.constructor;
    	    return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name));
    	  }, exports.mark = function (genFun) {
    	    return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun;
    	  }, exports.awrap = function (arg) {
    	    return {
    	      __await: arg
    	    };
    	  }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () {
    	    return this;
    	  }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) {
    	    void 0 === PromiseImpl && (PromiseImpl = Promise);
    	    var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl);
    	    return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) {
    	      return result.done ? result.value : iter.next();
    	    });
    	  }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () {
    	    return this;
    	  }), define(Gp, "toString", function () {
    	    return "[object Generator]";
    	  }), exports.keys = function (object) {
    	    var keys = [];

    	    for (var key in object) {
    	      keys.push(key);
    	    }

    	    return keys.reverse(), function next() {
    	      for (; keys.length;) {
    	        var key = keys.pop();
    	        if (key in object) return next.value = key, next.done = !1, next;
    	      }

    	      return next.done = !0, next;
    	    };
    	  }, exports.values = values, Context.prototype = {
    	    constructor: Context,
    	    reset: function reset(skipTempReset) {
    	      if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) {
    	        "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined);
    	      }
    	    },
    	    stop: function stop() {
    	      this.done = !0;
    	      var rootRecord = this.tryEntries[0].completion;
    	      if ("throw" === rootRecord.type) throw rootRecord.arg;
    	      return this.rval;
    	    },
    	    dispatchException: function dispatchException(exception) {
    	      if (this.done) throw exception;
    	      var context = this;

    	      function handle(loc, caught) {
    	        return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught;
    	      }

    	      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
    	        var entry = this.tryEntries[i],
    	            record = entry.completion;
    	        if ("root" === entry.tryLoc) return handle("end");

    	        if (entry.tryLoc <= this.prev) {
    	          var hasCatch = hasOwn.call(entry, "catchLoc"),
    	              hasFinally = hasOwn.call(entry, "finallyLoc");

    	          if (hasCatch && hasFinally) {
    	            if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0);
    	            if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc);
    	          } else if (hasCatch) {
    	            if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0);
    	          } else {
    	            if (!hasFinally) throw new Error("try statement without catch or finally");
    	            if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc);
    	          }
    	        }
    	      }
    	    },
    	    abrupt: function abrupt(type, arg) {
    	      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
    	        var entry = this.tryEntries[i];

    	        if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) {
    	          var finallyEntry = entry;
    	          break;
    	        }
    	      }

    	      finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null);
    	      var record = finallyEntry ? finallyEntry.completion : {};
    	      return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record);
    	    },
    	    complete: function complete(record, afterLoc) {
    	      if ("throw" === record.type) throw record.arg;
    	      return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel;
    	    },
    	    finish: function finish(finallyLoc) {
    	      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
    	        var entry = this.tryEntries[i];
    	        if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel;
    	      }
    	    },
    	    "catch": function _catch(tryLoc) {
    	      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
    	        var entry = this.tryEntries[i];

    	        if (entry.tryLoc === tryLoc) {
    	          var record = entry.completion;

    	          if ("throw" === record.type) {
    	            var thrown = record.arg;
    	            resetTryEntry(entry);
    	          }

    	          return thrown;
    	        }
    	      }

    	      throw new Error("illegal catch attempt");
    	    },
    	    delegateYield: function delegateYield(iterable, resultName, nextLoc) {
    	      return this.delegate = {
    	        iterator: values(iterable),
    	        resultName: resultName,
    	        nextLoc: nextLoc
    	      }, "next" === this.method && (this.arg = undefined), ContinueSentinel;
    	    }
    	  }, exports;
    	}

    	module.exports = _regeneratorRuntime, module.exports.__esModule = true, module.exports["default"] = module.exports;
    } (regeneratorRuntime$1));

    // TODO(Babel 8): Remove this file.

    var runtime = regeneratorRuntime$1.exports();
    var regenerator = runtime;

    // Copied from https://github.com/facebook/regenerator/blob/main/packages/runtime/runtime.js#L736=
    try {
      regeneratorRuntime = runtime;
    } catch (accidentalStrictMode) {
      if (typeof globalThis === "object") {
        globalThis.regeneratorRuntime = runtime;
      } else {
        Function("r", "regeneratorRuntime = r")(runtime);
      }
    }

    function _iterableToArray(iter) {
      if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
    }

    function _toArray(arr) {
      return _arrayWithHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableRest();
    }

    function _typeof(obj) {
      "@babel/helpers - typeof";

      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) {
        return typeof obj;
      } : function (obj) {
        return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      }, _typeof(obj);
    }

    function _defineProperty(obj, key, value) {
      if (key in obj) {
        Object.defineProperty(obj, key, {
          value: value,
          enumerable: true,
          configurable: true,
          writable: true
        });
      } else {
        obj[key] = value;
      }

      return obj;
    }

    function ownKeys(object, enumerableOnly) {
      var keys = Object.keys(object);

      if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(object);
        enumerableOnly && (symbols = symbols.filter(function (sym) {
          return Object.getOwnPropertyDescriptor(object, sym).enumerable;
        })), keys.push.apply(keys, symbols);
      }

      return keys;
    }

    function _objectSpread2(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = null != arguments[i] ? arguments[i] : {};
        i % 2 ? ownKeys(Object(source), !0).forEach(function (key) {
          _defineProperty(target, key, source[key]);
        }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) {
          Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
      }

      return target;
    }

    function _createForOfIteratorHelper(o, allowArrayLike) {
      var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];

      if (!it) {
        if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
          if (it) o = it;
          var i = 0;

          var F = function F() {};

          return {
            s: F,
            n: function n() {
              if (i >= o.length) return {
                done: true
              };
              return {
                done: false,
                value: o[i++]
              };
            },
            e: function e(_e) {
              throw _e;
            },
            f: F
          };
        }

        throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
      }

      var normalCompletion = true,
          didErr = false,
          err;
      return {
        s: function s() {
          it = it.call(o);
        },
        n: function n() {
          var step = it.next();
          normalCompletion = step.done;
          return step;
        },
        e: function e(_e2) {
          didErr = true;
          err = _e2;
        },
        f: function f() {
          try {
            if (!normalCompletion && it["return"] != null) it["return"]();
          } finally {
            if (didErr) throw err;
          }
        }
      };
    }

    let promise$2;

    var queueMicrotask_1$2 = typeof queueMicrotask === 'function'
      ? queueMicrotask
      // reuse resolved promise, and allocate it lazily
      : cb => (promise$2 || (promise$2 = Promise.resolve()))
        .then(cb)
        .catch(err => setTimeout(() => { throw err }, 0));

    var mailbox$2 = function mailbox() {
      var queue = [];
      var next;
      return {
        deliver: function deliver(msg) {
          return _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee() {
            return regenerator.wrap(function _callee$(_context) {
              while (1) {
                switch (_context.prev = _context.next) {
                  case 0:
                    queue.push(msg);

                    if (next) {
                      next(queue.shift());
                      next = undefined;
                    }

                  case 2:
                  case "end":
                    return _context.stop();
                }
              }
            }, _callee);
          }))();
        },
        receive: function receive() {
          return new Promise(function innerReceive(resolve) {
            var msg = queue.shift();
            if (msg) return resolve(msg);
            next = resolve;
          });
        }
      };
    };

    var INIT$2 = "INIT";
    var SUBSCRIBE$2 = "SUBSCRIBE";
    var UNSUBSCRIBE$2 = "UNSUBSCRIBE";
    var UPDATED$5 = "UPDATED";
    var SNAPSHOT$1 = "SNAPSHOT";
    var EXIT$2 = "EXIT";
    var TERMINATE$2 = "TERMINATE";
    var root$2 = (typeof self === "undefined" ? "undefined" : _typeof(self)) === "object" && self.self === self && self || (typeof global === "undefined" ? "undefined" : _typeof(global)) === "object" && global.global === global && global || (typeof window === "undefined" ? "undefined" : _typeof(window)) === "object" && window.window === window && window;
    root$2.FCL_REGISTRY = root$2.FCL_REGISTRY == null ? {} : root$2.FCL_REGISTRY;
    var pid$2 = 0;
    var DEFAULT_TIMEOUT$2 = 5000;

    var _send$2 = function send(addr, tag, data) {
      var opts = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
      return new Promise(function (reply, reject) {
        var expectReply = opts.expectReply || false;
        var timeout = opts.timeout != null ? opts.timeout : DEFAULT_TIMEOUT$2;

        if (expectReply && timeout) {
          setTimeout(function () {
            return reject(new Error("Timeout: ".concat(timeout, "ms passed without a response.")));
          }, timeout);
        }

        var payload = {
          to: addr,
          from: opts.from,
          tag: tag,
          data: data,
          timeout: timeout,
          reply: reply,
          reject: reject
        };

        try {
          root$2.FCL_REGISTRY[addr] && root$2.FCL_REGISTRY[addr].mailbox.deliver(payload);
          if (!expectReply) reply(true);
        } catch (error) {
          console.error("FCL.Actor -- Could Not Deliver Message", payload, root$2.FCL_REGISTRY[addr], error);
        }
      });
    };
    var kill$2 = function kill(addr) {
      delete root$2.FCL_REGISTRY[addr];
    };

    var fromHandlers$2 = function fromHandlers() {
      var handlers = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      return /*#__PURE__*/function () {
        var _ref = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(ctx) {
          var letter;
          return regenerator.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  if (!(typeof handlers[INIT$2] === "function")) {
                    _context.next = 3;
                    break;
                  }

                  _context.next = 3;
                  return handlers[INIT$2](ctx);

                case 3:

                  _context.next = 6;
                  return ctx.receive();

                case 6:
                  letter = _context.sent;
                  _context.prev = 7;

                  if (!(letter.tag === EXIT$2)) {
                    _context.next = 13;
                    break;
                  }

                  if (!(typeof handlers[TERMINATE$2] === "function")) {
                    _context.next = 12;
                    break;
                  }

                  _context.next = 12;
                  return handlers[TERMINATE$2](ctx, letter, letter.data || {});

                case 12:
                  return _context.abrupt("break", 25);

                case 13:
                  _context.next = 15;
                  return handlers[letter.tag](ctx, letter, letter.data || {});

                case 15:
                  _context.next = 20;
                  break;

                case 17:
                  _context.prev = 17;
                  _context.t0 = _context["catch"](7);
                  console.error("".concat(ctx.self(), " Error"), letter, _context.t0);

                case 20:
                  _context.prev = 20;
                  return _context.abrupt("continue", 3);

                case 23:
                  _context.next = 3;
                  break;

                case 25:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee, null, [[7, 17, 20, 23]]);
        }));

        return function (_x) {
          return _ref.apply(this, arguments);
        };
      }();
    };

    var spawn$2 = function spawn(fn) {
      var addr = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      if (addr == null) addr = ++pid$2;
      if (root$2.FCL_REGISTRY[addr] != null) return addr;
      root$2.FCL_REGISTRY[addr] = {
        addr: addr,
        mailbox: mailbox$2(),
        subs: new Set(),
        kvs: {},
        error: null
      };
      var ctx = {
        self: function self() {
          return addr;
        },
        receive: function receive() {
          return root$2.FCL_REGISTRY[addr].mailbox.receive();
        },
        send: function send(to, tag, data) {
          var opts = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
          opts.from = addr;
          return _send$2(to, tag, data, opts);
        },
        sendSelf: function sendSelf(tag, data, opts) {
          if (root$2.FCL_REGISTRY[addr]) _send$2(addr, tag, data, opts);
        },
        broadcast: function broadcast(tag, data) {
          var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
          opts.from = addr;

          var _iterator = _createForOfIteratorHelper(root$2.FCL_REGISTRY[addr].subs),
              _step;

          try {
            for (_iterator.s(); !(_step = _iterator.n()).done;) {
              var to = _step.value;

              _send$2(to, tag, data, opts);
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }
        },
        subscribe: function subscribe(sub) {
          return sub != null && root$2.FCL_REGISTRY[addr].subs.add(sub);
        },
        unsubscribe: function unsubscribe(sub) {
          return sub != null && root$2.FCL_REGISTRY[addr].subs["delete"](sub);
        },
        subscriberCount: function subscriberCount() {
          return root$2.FCL_REGISTRY[addr].subs.size;
        },
        hasSubs: function hasSubs() {
          return !!root$2.FCL_REGISTRY[addr].subs.size;
        },
        put: function put(key, value) {
          if (key != null) root$2.FCL_REGISTRY[addr].kvs[key] = value;
        },
        get: function get(key, fallback) {
          var value = root$2.FCL_REGISTRY[addr].kvs[key];
          return value == null ? fallback : value;
        },
        "delete": function _delete(key) {
          delete root$2.FCL_REGISTRY[addr].kvs[key];
        },
        update: function update(key, fn) {
          if (key != null) root$2.FCL_REGISTRY[addr].kvs[key] = fn(root$2.FCL_REGISTRY[addr].kvs[key]);
        },
        keys: function keys() {
          return Object.keys(root$2.FCL_REGISTRY[addr].kvs);
        },
        all: function all() {
          return root$2.FCL_REGISTRY[addr].kvs;
        },
        where: function where(pattern) {
          return Object.keys(root$2.FCL_REGISTRY[addr].kvs).reduce(function (acc, key) {
            return pattern.test(key) ? _objectSpread2(_objectSpread2({}, acc), {}, _defineProperty({}, key, root$2.FCL_REGISTRY[addr].kvs[key])) : acc;
          }, {});
        },
        merge: function merge() {
          var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
          Object.keys(data).forEach(function (key) {
            return root$2.FCL_REGISTRY[addr].kvs[key] = data[key];
          });
        },
        fatalError: function fatalError(error) {
          root$2.FCL_REGISTRY[addr].error = error;

          var _iterator2 = _createForOfIteratorHelper(root$2.FCL_REGISTRY[addr].subs),
              _step2;

          try {
            for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
              var to = _step2.value;

              _send$2(to, UPDATED$5);
            }
          } catch (err) {
            _iterator2.e(err);
          } finally {
            _iterator2.f();
          }
        }
      };
      if (_typeof(fn) === "object") fn = fromHandlers$2(fn);
      queueMicrotask_1$2( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2() {
        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return fn(ctx);

              case 2:
                kill$2(addr);

              case 3:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      })));
      return addr;
    }; // Returns an unsubscribe function
    // A SUBSCRIBE handler will need to be created to handle the subscription event
    //
    //  [SUBSCRIBE]: (ctx, letter) => {
    //    ctx.subscribe(letter.from)
    //    ctx.send(letter.from, UPDATED, ctx.all())
    //  }
    //

    function subscriber$2(address, spawnFn, callback) {
      spawnFn(address);
      var EXIT = "@EXIT";
      var self = spawn$2( /*#__PURE__*/function () {
        var _ref3 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee3(ctx) {
          var letter, error;
          return regenerator.wrap(function _callee3$(_context3) {
            while (1) {
              switch (_context3.prev = _context3.next) {
                case 0:
                  ctx.send(address, SUBSCRIBE$2);

                case 1:

                  _context3.next = 4;
                  return ctx.receive();

                case 4:
                  letter = _context3.sent;
                  error = root$2.FCL_REGISTRY[address].error;

                  if (!(letter.tag === EXIT)) {
                    _context3.next = 9;
                    break;
                  }

                  ctx.send(address, UNSUBSCRIBE$2);
                  return _context3.abrupt("return");

                case 9:
                  if (!error) {
                    _context3.next = 13;
                    break;
                  }

                  callback(null, error);
                  ctx.send(address, UNSUBSCRIBE$2);
                  return _context3.abrupt("return");

                case 13:
                  callback(letter.data, null);
                  _context3.next = 1;
                  break;

                case 16:
                case "end":
                  return _context3.stop();
              }
            }
          }, _callee3);
        }));

        return function (_x2) {
          return _ref3.apply(this, arguments);
        };
      }());
      return function () {
        return _send$2(self, EXIT);
      };
    } // Returns a promise that returns a result
    // A SNAPSHOT handler will need to be created to handle the snapshot event
    //
    //  [SNAPSHOT]: (ctx, letter) => {
    //    letter.reply(ctx.all())
    //  }
    //

    function snapshoter(address, spawnFn) {
      spawnFn(address);
      return _send$2(address, SNAPSHOT$1, null, {
        expectReply: true,
        timeout: 0
      });
    }

    var _HANDLERS$6;
    var NAME$3 = "config";
    var PUT$2 = "PUT_CONFIG";
    var GET$2 = "GET_CONFIG";
    var GET_ALL$2 = "GET_ALL_CONFIG";
    var UPDATE$2 = "UPDATE_CONFIG";
    var DELETE$2 = "DELETE_CONFIG";
    var CLEAR$2 = "CLEAR_CONFIG";
    var WHERE$2 = "WHERE_CONFIG";
    var UPDATED$4 = "CONFIG/UPDATED";

    var identity$3 = function identity(v) {
      return v;
    };

    var HANDLERS$4 = (_HANDLERS$6 = {}, _defineProperty(_HANDLERS$6, PUT$2, function (ctx, _letter, _ref) {
      var key = _ref.key,
          value = _ref.value;
      if (key == null) throw new Error("Missing 'key' for config/put.");
      ctx.put(key, value);
      ctx.broadcast(UPDATED$4, _objectSpread2({}, ctx.all()));
    }), _defineProperty(_HANDLERS$6, GET$2, function (ctx, letter, _ref2) {
      var key = _ref2.key,
          fallback = _ref2.fallback;
      if (key == null) throw new Error("Missing 'key' for config/get");
      letter.reply(ctx.get(key, fallback));
    }), _defineProperty(_HANDLERS$6, GET_ALL$2, function (ctx, letter) {
      letter.reply(_objectSpread2({}, ctx.all()));
    }), _defineProperty(_HANDLERS$6, UPDATE$2, function (ctx, letter, _ref3) {
      var key = _ref3.key,
          fn = _ref3.fn;
      if (key == null) throw new Error("Missing 'key' for config/update");
      ctx.update(key, fn || identity$3);
      ctx.broadcast(UPDATED$4, _objectSpread2({}, ctx.all()));
    }), _defineProperty(_HANDLERS$6, DELETE$2, function (ctx, letter, _ref4) {
      var key = _ref4.key;
      if (key == null) throw new Error("Missing 'key' for config/delete");
      ctx["delete"](key);
      ctx.broadcast(UPDATED$4, _objectSpread2({}, ctx.all()));
    }), _defineProperty(_HANDLERS$6, CLEAR$2, function (ctx, letter) {
      var keys = Object.keys(ctx.all());

      for (var _i = 0, _keys = keys; _i < _keys.length; _i++) {
        var key = _keys[_i];
        ctx["delete"](key);
      }

      ctx.broadcast(UPDATED$4, _objectSpread2({}, ctx.all()));
    }), _defineProperty(_HANDLERS$6, WHERE$2, function (ctx, letter, _ref5) {
      var pattern = _ref5.pattern;
      if (pattern == null) throw new Error("Missing 'pattern' for config/where");
      letter.reply(ctx.where(pattern));
    }), _defineProperty(_HANDLERS$6, SUBSCRIBE$2, function (ctx, letter) {
      ctx.subscribe(letter.from);
      ctx.send(letter.from, UPDATED$4, _objectSpread2({}, ctx.all()));
    }), _defineProperty(_HANDLERS$6, UNSUBSCRIBE$2, function (ctx, letter) {
      ctx.unsubscribe(letter.from);
    }), _HANDLERS$6);
    spawn$2(HANDLERS$4, NAME$3);

    function put$3(key, value) {
      _send$2(NAME$3, PUT$2, {
        key: key,
        value: value
      });
      return config$2();
    }

    function get$3(key, fallback) {
      return _send$2(NAME$3, GET$2, {
        key: key,
        fallback: fallback
      }, {
        expectReply: true,
        timeout: 10
      });
    }

    function first$2() {
      return _first$2.apply(this, arguments);
    }

    function _first$2() {
      _first$2 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2() {
        var wants,
            fallback,
            _wants,
            head,
            rest,
            ret,
            _args2 = arguments;

        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                wants = _args2.length > 0 && _args2[0] !== undefined ? _args2[0] : [];
                fallback = _args2.length > 1 ? _args2[1] : undefined;

                if (wants.length) {
                  _context2.next = 4;
                  break;
                }

                return _context2.abrupt("return", fallback);

              case 4:
                _wants = _toArray(wants), head = _wants[0], rest = _wants.slice(1);
                _context2.next = 7;
                return get$3(head);

              case 7:
                ret = _context2.sent;

                if (!(ret == null)) {
                  _context2.next = 10;
                  break;
                }

                return _context2.abrupt("return", first$2(rest, fallback));

              case 10:
                return _context2.abrupt("return", ret);

              case 11:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));
      return _first$2.apply(this, arguments);
    }

    function all$2() {
      return _send$2(NAME$3, GET_ALL$2, null, {
        expectReply: true,
        timeout: 10
      });
    }

    function update$3(key) {
      var fn = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : identity$3;
      _send$2(NAME$3, UPDATE$2, {
        key: key,
        fn: fn
      });
      return config$2();
    }

    function _delete$2(key) {
      _send$2(NAME$3, DELETE$2, {
        key: key
      });
      return config$2();
    }

    function where$2(pattern) {
      return _send$2(NAME$3, WHERE$2, {
        pattern: pattern
      }, {
        expectReply: true,
        timeout: 10
      });
    }

    function subscribe$3(callback) {
      return subscriber$2(NAME$3, function () {
        return spawn$2(HANDLERS$4, NAME$3);
      }, callback);
    }

    function clearConfig$2() {
      return _send$2(NAME$3, CLEAR$2);
    }

    function config$2(values) {
      if (values != null && _typeof(values) === "object") {
        Object.keys(values).map(function (d) {
          return put$3(d, values[d]);
        });
      }

      return {
        put: put$3,
        get: get$3,
        all: all$2,
        first: first$2,
        update: update$3,
        "delete": _delete$2,
        where: where$2,
        subscribe: subscribe$3,
        overload: overload$2
      };
    }

    config$2.put = put$3;
    config$2.get = get$3;
    config$2.all = all$2;
    config$2.first = first$2;
    config$2.update = update$3;
    config$2["delete"] = _delete$2;
    config$2.where = where$2;
    config$2.subscribe = subscribe$3;
    config$2.overload = overload$2;

    var noop$7 = function noop(v) {
      return v;
    };

    function overload$2() {
      var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : noop$7;
      return new Promise( /*#__PURE__*/function () {
        var _ref6 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(resolve, reject) {
          var oldConfig, result;
          return regenerator.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  _context.next = 2;
                  return all$2();

                case 2:
                  oldConfig = _context.sent;
                  _context.prev = 3;
                  config$2(opts);
                  _context.t0 = callback;
                  _context.next = 8;
                  return all$2();

                case 8:
                  _context.t1 = _context.sent;
                  _context.next = 11;
                  return (0, _context.t0)(_context.t1);

                case 11:
                  result = _context.sent;
                  _context.next = 14;
                  return clearConfig$2();

                case 14:
                  _context.next = 16;
                  return config$2(oldConfig);

                case 16:
                  resolve(result);
                  _context.next = 26;
                  break;

                case 19:
                  _context.prev = 19;
                  _context.t2 = _context["catch"](3);
                  _context.next = 23;
                  return clearConfig$2();

                case 23:
                  _context.next = 25;
                  return config$2(oldConfig);

                case 25:
                  reject(_context.t2);

                case 26:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee, null, [[3, 19]]);
        }));

        return function (_x, _x2) {
          return _ref6.apply(this, arguments);
        };
      }());
    }

    function invariant$1(fact, msg) {
      if (!fact) {
        var _console;

        var error = new Error("INVARIANT ".concat(msg));
        error.stack = error.stack.split("\n").filter(function (d) {
          return !/at invariant/.test(d);
        }).join("\n");

        for (var _len = arguments.length, rest = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          rest[_key - 2] = arguments[_key];
        }

        (_console = console).error.apply(_console, ["\n\n---\n\n", error, "\n\n"].concat(rest, ["\n\n---\n\n"]));

        throw error;
      }
    }

    function _arrayWithoutHoles(arr) {
      if (Array.isArray(arr)) return _arrayLikeToArray(arr);
    }

    function _nonIterableSpread() {
      throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }

    function _toConsumableArray(arr) {
      return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
    }

    var LEVELS$2 = Object.freeze({
      debug: 5,
      info: 4,
      log: 3,
      warn: 2,
      error: 1
    });

    var buildLoggerMessageArgs$2 = function buildLoggerMessageArgs(_ref) {
      var title = _ref.title,
          message = _ref.message;
      return ["\n    %c".concat(title, "\n    ============================\n\n    ").concat(message, "\n\n    ============================\n    ").replace(/\n[^\S\r\n]+/g, "\n").trim(),, "font-weight:bold;font-family:monospace;"];
    };

    var log$2 = /*#__PURE__*/function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(_ref2) {
        var _console, _console2, _console3, _console4, _console5;

        var title, message, level, _ref2$always, always, configLoggerLevel, loggerMessageArgs;

        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                title = _ref2.title, message = _ref2.message, level = _ref2.level, _ref2$always = _ref2.always, always = _ref2$always === void 0 ? false : _ref2$always;
                _context.next = 3;
                return config$2.get("logger.level", LEVELS$2.warn);

              case 3:
                configLoggerLevel = _context.sent;

                if (!(!always && configLoggerLevel < level)) {
                  _context.next = 6;
                  break;
                }

                return _context.abrupt("return");

              case 6:
                loggerMessageArgs = buildLoggerMessageArgs$2({
                  title: title,
                  message: message
                });
                _context.t0 = level;
                _context.next = _context.t0 === LEVELS$2.debug ? 10 : _context.t0 === LEVELS$2.info ? 12 : _context.t0 === LEVELS$2.warn ? 14 : _context.t0 === LEVELS$2.error ? 16 : 18;
                break;

              case 10:
                (_console = console).debug.apply(_console, _toConsumableArray(loggerMessageArgs));

                return _context.abrupt("break", 19);

              case 12:
                (_console2 = console).info.apply(_console2, _toConsumableArray(loggerMessageArgs));

                return _context.abrupt("break", 19);

              case 14:
                (_console3 = console).warn.apply(_console3, _toConsumableArray(loggerMessageArgs));

                return _context.abrupt("break", 19);

              case 16:
                (_console4 = console).error.apply(_console4, _toConsumableArray(loggerMessageArgs));

                return _context.abrupt("break", 19);

              case 18:
                (_console5 = console).log.apply(_console5, _toConsumableArray(loggerMessageArgs));

              case 19:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      return function log(_x) {
        return _ref3.apply(this, arguments);
      };
    }();

    log$2.deprecate = function (_ref4) {
      var pkg = _ref4.pkg,
          subject = _ref4.subject,
          transition = _ref4.transition,
          _ref4$level = _ref4.level,
          level = _ref4$level === void 0 ? LEVELS$2.warn : _ref4$level,
          _ref4$message = _ref4.message,
          message = _ref4$message === void 0 ? "" : _ref4$message,
          _ref4$callback = _ref4.callback,
          callback = _ref4$callback === void 0 ? null : _ref4$callback;

      var capitalizeFirstLetter = function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
      };

      var logMessage = function logMessage() {
        return log$2({
          title: "".concat(pkg ? pkg + " " : "", "Deprecation Notice"),
          message: "\n      ".concat(subject ? "".concat(capitalizeFirstLetter(subject), " is deprecated and will cease to work in future releases").concat(pkg ? " of " + pkg : "", ".") : "").concat(message ? "\n" + message : "").concat(transition ? "\nYou can learn more (including a guide on common transition paths) here: ".concat(transition) : "", "\n    ").trim(),
          level: level
        });
      };

      if (typeof callback === "function") {
        return /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2() {
          var _args2 = arguments;
          return regenerator.wrap(function _callee2$(_context2) {
            while (1) {
              switch (_context2.prev = _context2.next) {
                case 0:
                  _context2.next = 2;
                  return logMessage();

                case 2:
                  _context2.next = 4;
                  return callback.apply(void 0, _args2);

                case 4:
                  return _context2.abrupt("return", _context2.sent);

                case 5:
                case "end":
                  return _context2.stop();
              }
            }
          }, _callee2);
        }));
      }

      return logMessage();
    };

    var buffer = {};

    var base64Js = {};

    base64Js.byteLength = byteLength;
    base64Js.toByteArray = toByteArray;
    base64Js.fromByteArray = fromByteArray;

    var lookup = [];
    var revLookup = [];
    var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;

    var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    for (var i = 0, len = code.length; i < len; ++i) {
      lookup[i] = code[i];
      revLookup[code.charCodeAt(i)] = i;
    }

    // Support decoding URL-safe base64 strings, as Node.js does.
    // See: https://en.wikipedia.org/wiki/Base64#URL_applications
    revLookup['-'.charCodeAt(0)] = 62;
    revLookup['_'.charCodeAt(0)] = 63;

    function getLens (b64) {
      var len = b64.length;

      if (len % 4 > 0) {
        throw new Error('Invalid string. Length must be a multiple of 4')
      }

      // Trim off extra bytes after placeholder bytes are found
      // See: https://github.com/beatgammit/base64-js/issues/42
      var validLen = b64.indexOf('=');
      if (validLen === -1) validLen = len;

      var placeHoldersLen = validLen === len
        ? 0
        : 4 - (validLen % 4);

      return [validLen, placeHoldersLen]
    }

    // base64 is 4/3 + up to two characters of the original data
    function byteLength (b64) {
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];
      return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
    }

    function _byteLength (b64, validLen, placeHoldersLen) {
      return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
    }

    function toByteArray (b64) {
      var tmp;
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];

      var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));

      var curByte = 0;

      // if there are placeholders, only get up to the last complete 4 chars
      var len = placeHoldersLen > 0
        ? validLen - 4
        : validLen;

      var i;
      for (i = 0; i < len; i += 4) {
        tmp =
          (revLookup[b64.charCodeAt(i)] << 18) |
          (revLookup[b64.charCodeAt(i + 1)] << 12) |
          (revLookup[b64.charCodeAt(i + 2)] << 6) |
          revLookup[b64.charCodeAt(i + 3)];
        arr[curByte++] = (tmp >> 16) & 0xFF;
        arr[curByte++] = (tmp >> 8) & 0xFF;
        arr[curByte++] = tmp & 0xFF;
      }

      if (placeHoldersLen === 2) {
        tmp =
          (revLookup[b64.charCodeAt(i)] << 2) |
          (revLookup[b64.charCodeAt(i + 1)] >> 4);
        arr[curByte++] = tmp & 0xFF;
      }

      if (placeHoldersLen === 1) {
        tmp =
          (revLookup[b64.charCodeAt(i)] << 10) |
          (revLookup[b64.charCodeAt(i + 1)] << 4) |
          (revLookup[b64.charCodeAt(i + 2)] >> 2);
        arr[curByte++] = (tmp >> 8) & 0xFF;
        arr[curByte++] = tmp & 0xFF;
      }

      return arr
    }

    function tripletToBase64 (num) {
      return lookup[num >> 18 & 0x3F] +
        lookup[num >> 12 & 0x3F] +
        lookup[num >> 6 & 0x3F] +
        lookup[num & 0x3F]
    }

    function encodeChunk (uint8, start, end) {
      var tmp;
      var output = [];
      for (var i = start; i < end; i += 3) {
        tmp =
          ((uint8[i] << 16) & 0xFF0000) +
          ((uint8[i + 1] << 8) & 0xFF00) +
          (uint8[i + 2] & 0xFF);
        output.push(tripletToBase64(tmp));
      }
      return output.join('')
    }

    function fromByteArray (uint8) {
      var tmp;
      var len = uint8.length;
      var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
      var parts = [];
      var maxChunkLength = 16383; // must be multiple of 3

      // go through the array every three bytes, we'll deal with trailing stuff later
      for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
        parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
      }

      // pad the end with zeros, but make sure to not forget the extra bytes
      if (extraBytes === 1) {
        tmp = uint8[len - 1];
        parts.push(
          lookup[tmp >> 2] +
          lookup[(tmp << 4) & 0x3F] +
          '=='
        );
      } else if (extraBytes === 2) {
        tmp = (uint8[len - 2] << 8) + uint8[len - 1];
        parts.push(
          lookup[tmp >> 10] +
          lookup[(tmp >> 4) & 0x3F] +
          lookup[(tmp << 2) & 0x3F] +
          '='
        );
      }

      return parts.join('')
    }

    var ieee754 = {};

    /*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */

    ieee754.read = function (buffer, offset, isLE, mLen, nBytes) {
      var e, m;
      var eLen = (nBytes * 8) - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var nBits = -7;
      var i = isLE ? (nBytes - 1) : 0;
      var d = isLE ? -1 : 1;
      var s = buffer[offset + i];

      i += d;

      e = s & ((1 << (-nBits)) - 1);
      s >>= (-nBits);
      nBits += eLen;
      for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

      m = e & ((1 << (-nBits)) - 1);
      e >>= (-nBits);
      nBits += mLen;
      for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

      if (e === 0) {
        e = 1 - eBias;
      } else if (e === eMax) {
        return m ? NaN : ((s ? -1 : 1) * Infinity)
      } else {
        m = m + Math.pow(2, mLen);
        e = e - eBias;
      }
      return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
    };

    ieee754.write = function (buffer, value, offset, isLE, mLen, nBytes) {
      var e, m, c;
      var eLen = (nBytes * 8) - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
      var i = isLE ? 0 : (nBytes - 1);
      var d = isLE ? 1 : -1;
      var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

      value = Math.abs(value);

      if (isNaN(value) || value === Infinity) {
        m = isNaN(value) ? 1 : 0;
        e = eMax;
      } else {
        e = Math.floor(Math.log(value) / Math.LN2);
        if (value * (c = Math.pow(2, -e)) < 1) {
          e--;
          c *= 2;
        }
        if (e + eBias >= 1) {
          value += rt / c;
        } else {
          value += rt * Math.pow(2, 1 - eBias);
        }
        if (value * c >= 2) {
          e++;
          c /= 2;
        }

        if (e + eBias >= eMax) {
          m = 0;
          e = eMax;
        } else if (e + eBias >= 1) {
          m = ((value * c) - 1) * Math.pow(2, mLen);
          e = e + eBias;
        } else {
          m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
          e = 0;
        }
      }

      for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

      e = (e << mLen) | m;
      eLen += mLen;
      for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

      buffer[offset + i - d] |= s * 128;
    };

    /*!
     * The buffer module from node.js, for the browser.
     *
     * @author   Feross Aboukhadijeh <https://feross.org>
     * @license  MIT
     */

    (function (exports) {

    	const base64 = base64Js;
    	const ieee754$1 = ieee754;
    	const customInspectSymbol =
    	  (typeof Symbol === 'function' && typeof Symbol['for'] === 'function') // eslint-disable-line dot-notation
    	    ? Symbol['for']('nodejs.util.inspect.custom') // eslint-disable-line dot-notation
    	    : null;

    	exports.Buffer = Buffer;
    	exports.SlowBuffer = SlowBuffer;
    	exports.INSPECT_MAX_BYTES = 50;

    	const K_MAX_LENGTH = 0x7fffffff;
    	exports.kMaxLength = K_MAX_LENGTH;

    	/**
    	 * If `Buffer.TYPED_ARRAY_SUPPORT`:
    	 *   === true    Use Uint8Array implementation (fastest)
    	 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
    	 *               implementation (most compatible, even IE6)
    	 *
    	 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
    	 * Opera 11.6+, iOS 4.2+.
    	 *
    	 * We report that the browser does not support typed arrays if the are not subclassable
    	 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
    	 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
    	 * for __proto__ and has a buggy typed array implementation.
    	 */
    	Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport();

    	if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    	    typeof console.error === 'function') {
    	  console.error(
    	    'This browser lacks typed array (Uint8Array) support which is required by ' +
    	    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
    	  );
    	}

    	function typedArraySupport () {
    	  // Can typed array instances can be augmented?
    	  try {
    	    const arr = new Uint8Array(1);
    	    const proto = { foo: function () { return 42 } };
    	    Object.setPrototypeOf(proto, Uint8Array.prototype);
    	    Object.setPrototypeOf(arr, proto);
    	    return arr.foo() === 42
    	  } catch (e) {
    	    return false
    	  }
    	}

    	Object.defineProperty(Buffer.prototype, 'parent', {
    	  enumerable: true,
    	  get: function () {
    	    if (!Buffer.isBuffer(this)) return undefined
    	    return this.buffer
    	  }
    	});

    	Object.defineProperty(Buffer.prototype, 'offset', {
    	  enumerable: true,
    	  get: function () {
    	    if (!Buffer.isBuffer(this)) return undefined
    	    return this.byteOffset
    	  }
    	});

    	function createBuffer (length) {
    	  if (length > K_MAX_LENGTH) {
    	    throw new RangeError('The value "' + length + '" is invalid for option "size"')
    	  }
    	  // Return an augmented `Uint8Array` instance
    	  const buf = new Uint8Array(length);
    	  Object.setPrototypeOf(buf, Buffer.prototype);
    	  return buf
    	}

    	/**
    	 * The Buffer constructor returns instances of `Uint8Array` that have their
    	 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
    	 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
    	 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
    	 * returns a single octet.
    	 *
    	 * The `Uint8Array` prototype remains unmodified.
    	 */

    	function Buffer (arg, encodingOrOffset, length) {
    	  // Common case.
    	  if (typeof arg === 'number') {
    	    if (typeof encodingOrOffset === 'string') {
    	      throw new TypeError(
    	        'The "string" argument must be of type string. Received type number'
    	      )
    	    }
    	    return allocUnsafe(arg)
    	  }
    	  return from(arg, encodingOrOffset, length)
    	}

    	Buffer.poolSize = 8192; // not used by this implementation

    	function from (value, encodingOrOffset, length) {
    	  if (typeof value === 'string') {
    	    return fromString(value, encodingOrOffset)
    	  }

    	  if (ArrayBuffer.isView(value)) {
    	    return fromArrayView(value)
    	  }

    	  if (value == null) {
    	    throw new TypeError(
    	      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    	      'or Array-like Object. Received type ' + (typeof value)
    	    )
    	  }

    	  if (isInstance(value, ArrayBuffer) ||
    	      (value && isInstance(value.buffer, ArrayBuffer))) {
    	    return fromArrayBuffer(value, encodingOrOffset, length)
    	  }

    	  if (typeof SharedArrayBuffer !== 'undefined' &&
    	      (isInstance(value, SharedArrayBuffer) ||
    	      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
    	    return fromArrayBuffer(value, encodingOrOffset, length)
    	  }

    	  if (typeof value === 'number') {
    	    throw new TypeError(
    	      'The "value" argument must not be of type number. Received type number'
    	    )
    	  }

    	  const valueOf = value.valueOf && value.valueOf();
    	  if (valueOf != null && valueOf !== value) {
    	    return Buffer.from(valueOf, encodingOrOffset, length)
    	  }

    	  const b = fromObject(value);
    	  if (b) return b

    	  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
    	      typeof value[Symbol.toPrimitive] === 'function') {
    	    return Buffer.from(value[Symbol.toPrimitive]('string'), encodingOrOffset, length)
    	  }

    	  throw new TypeError(
    	    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    	    'or Array-like Object. Received type ' + (typeof value)
    	  )
    	}

    	/**
    	 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
    	 * if value is a number.
    	 * Buffer.from(str[, encoding])
    	 * Buffer.from(array)
    	 * Buffer.from(buffer)
    	 * Buffer.from(arrayBuffer[, byteOffset[, length]])
    	 **/
    	Buffer.from = function (value, encodingOrOffset, length) {
    	  return from(value, encodingOrOffset, length)
    	};

    	// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
    	// https://github.com/feross/buffer/pull/148
    	Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype);
    	Object.setPrototypeOf(Buffer, Uint8Array);

    	function assertSize (size) {
    	  if (typeof size !== 'number') {
    	    throw new TypeError('"size" argument must be of type number')
    	  } else if (size < 0) {
    	    throw new RangeError('The value "' + size + '" is invalid for option "size"')
    	  }
    	}

    	function alloc (size, fill, encoding) {
    	  assertSize(size);
    	  if (size <= 0) {
    	    return createBuffer(size)
    	  }
    	  if (fill !== undefined) {
    	    // Only pay attention to encoding if it's a string. This
    	    // prevents accidentally sending in a number that would
    	    // be interpreted as a start offset.
    	    return typeof encoding === 'string'
    	      ? createBuffer(size).fill(fill, encoding)
    	      : createBuffer(size).fill(fill)
    	  }
    	  return createBuffer(size)
    	}

    	/**
    	 * Creates a new filled Buffer instance.
    	 * alloc(size[, fill[, encoding]])
    	 **/
    	Buffer.alloc = function (size, fill, encoding) {
    	  return alloc(size, fill, encoding)
    	};

    	function allocUnsafe (size) {
    	  assertSize(size);
    	  return createBuffer(size < 0 ? 0 : checked(size) | 0)
    	}

    	/**
    	 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
    	 * */
    	Buffer.allocUnsafe = function (size) {
    	  return allocUnsafe(size)
    	};
    	/**
    	 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
    	 */
    	Buffer.allocUnsafeSlow = function (size) {
    	  return allocUnsafe(size)
    	};

    	function fromString (string, encoding) {
    	  if (typeof encoding !== 'string' || encoding === '') {
    	    encoding = 'utf8';
    	  }

    	  if (!Buffer.isEncoding(encoding)) {
    	    throw new TypeError('Unknown encoding: ' + encoding)
    	  }

    	  const length = byteLength(string, encoding) | 0;
    	  let buf = createBuffer(length);

    	  const actual = buf.write(string, encoding);

    	  if (actual !== length) {
    	    // Writing a hex string, for example, that contains invalid characters will
    	    // cause everything after the first invalid character to be ignored. (e.g.
    	    // 'abxxcd' will be treated as 'ab')
    	    buf = buf.slice(0, actual);
    	  }

    	  return buf
    	}

    	function fromArrayLike (array) {
    	  const length = array.length < 0 ? 0 : checked(array.length) | 0;
    	  const buf = createBuffer(length);
    	  for (let i = 0; i < length; i += 1) {
    	    buf[i] = array[i] & 255;
    	  }
    	  return buf
    	}

    	function fromArrayView (arrayView) {
    	  if (isInstance(arrayView, Uint8Array)) {
    	    const copy = new Uint8Array(arrayView);
    	    return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength)
    	  }
    	  return fromArrayLike(arrayView)
    	}

    	function fromArrayBuffer (array, byteOffset, length) {
    	  if (byteOffset < 0 || array.byteLength < byteOffset) {
    	    throw new RangeError('"offset" is outside of buffer bounds')
    	  }

    	  if (array.byteLength < byteOffset + (length || 0)) {
    	    throw new RangeError('"length" is outside of buffer bounds')
    	  }

    	  let buf;
    	  if (byteOffset === undefined && length === undefined) {
    	    buf = new Uint8Array(array);
    	  } else if (length === undefined) {
    	    buf = new Uint8Array(array, byteOffset);
    	  } else {
    	    buf = new Uint8Array(array, byteOffset, length);
    	  }

    	  // Return an augmented `Uint8Array` instance
    	  Object.setPrototypeOf(buf, Buffer.prototype);

    	  return buf
    	}

    	function fromObject (obj) {
    	  if (Buffer.isBuffer(obj)) {
    	    const len = checked(obj.length) | 0;
    	    const buf = createBuffer(len);

    	    if (buf.length === 0) {
    	      return buf
    	    }

    	    obj.copy(buf, 0, 0, len);
    	    return buf
    	  }

    	  if (obj.length !== undefined) {
    	    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
    	      return createBuffer(0)
    	    }
    	    return fromArrayLike(obj)
    	  }

    	  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    	    return fromArrayLike(obj.data)
    	  }
    	}

    	function checked (length) {
    	  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
    	  // length is NaN (which is otherwise coerced to zero.)
    	  if (length >= K_MAX_LENGTH) {
    	    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
    	                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
    	  }
    	  return length | 0
    	}

    	function SlowBuffer (length) {
    	  if (+length != length) { // eslint-disable-line eqeqeq
    	    length = 0;
    	  }
    	  return Buffer.alloc(+length)
    	}

    	Buffer.isBuffer = function isBuffer (b) {
    	  return b != null && b._isBuffer === true &&
    	    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
    	};

    	Buffer.compare = function compare (a, b) {
    	  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength);
    	  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength);
    	  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    	    throw new TypeError(
    	      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    	    )
    	  }

    	  if (a === b) return 0

    	  let x = a.length;
    	  let y = b.length;

    	  for (let i = 0, len = Math.min(x, y); i < len; ++i) {
    	    if (a[i] !== b[i]) {
    	      x = a[i];
    	      y = b[i];
    	      break
    	    }
    	  }

    	  if (x < y) return -1
    	  if (y < x) return 1
    	  return 0
    	};

    	Buffer.isEncoding = function isEncoding (encoding) {
    	  switch (String(encoding).toLowerCase()) {
    	    case 'hex':
    	    case 'utf8':
    	    case 'utf-8':
    	    case 'ascii':
    	    case 'latin1':
    	    case 'binary':
    	    case 'base64':
    	    case 'ucs2':
    	    case 'ucs-2':
    	    case 'utf16le':
    	    case 'utf-16le':
    	      return true
    	    default:
    	      return false
    	  }
    	};

    	Buffer.concat = function concat (list, length) {
    	  if (!Array.isArray(list)) {
    	    throw new TypeError('"list" argument must be an Array of Buffers')
    	  }

    	  if (list.length === 0) {
    	    return Buffer.alloc(0)
    	  }

    	  let i;
    	  if (length === undefined) {
    	    length = 0;
    	    for (i = 0; i < list.length; ++i) {
    	      length += list[i].length;
    	    }
    	  }

    	  const buffer = Buffer.allocUnsafe(length);
    	  let pos = 0;
    	  for (i = 0; i < list.length; ++i) {
    	    let buf = list[i];
    	    if (isInstance(buf, Uint8Array)) {
    	      if (pos + buf.length > buffer.length) {
    	        if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
    	        buf.copy(buffer, pos);
    	      } else {
    	        Uint8Array.prototype.set.call(
    	          buffer,
    	          buf,
    	          pos
    	        );
    	      }
    	    } else if (!Buffer.isBuffer(buf)) {
    	      throw new TypeError('"list" argument must be an Array of Buffers')
    	    } else {
    	      buf.copy(buffer, pos);
    	    }
    	    pos += buf.length;
    	  }
    	  return buffer
    	};

    	function byteLength (string, encoding) {
    	  if (Buffer.isBuffer(string)) {
    	    return string.length
    	  }
    	  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    	    return string.byteLength
    	  }
    	  if (typeof string !== 'string') {
    	    throw new TypeError(
    	      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
    	      'Received type ' + typeof string
    	    )
    	  }

    	  const len = string.length;
    	  const mustMatch = (arguments.length > 2 && arguments[2] === true);
    	  if (!mustMatch && len === 0) return 0

    	  // Use a for loop to avoid recursion
    	  let loweredCase = false;
    	  for (;;) {
    	    switch (encoding) {
    	      case 'ascii':
    	      case 'latin1':
    	      case 'binary':
    	        return len
    	      case 'utf8':
    	      case 'utf-8':
    	        return utf8ToBytes(string).length
    	      case 'ucs2':
    	      case 'ucs-2':
    	      case 'utf16le':
    	      case 'utf-16le':
    	        return len * 2
    	      case 'hex':
    	        return len >>> 1
    	      case 'base64':
    	        return base64ToBytes(string).length
    	      default:
    	        if (loweredCase) {
    	          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
    	        }
    	        encoding = ('' + encoding).toLowerCase();
    	        loweredCase = true;
    	    }
    	  }
    	}
    	Buffer.byteLength = byteLength;

    	function slowToString (encoding, start, end) {
    	  let loweredCase = false;

    	  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
    	  // property of a typed array.

    	  // This behaves neither like String nor Uint8Array in that we set start/end
    	  // to their upper/lower bounds if the value passed is out of range.
    	  // undefined is handled specially as per ECMA-262 6th Edition,
    	  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
    	  if (start === undefined || start < 0) {
    	    start = 0;
    	  }
    	  // Return early if start > this.length. Done here to prevent potential uint32
    	  // coercion fail below.
    	  if (start > this.length) {
    	    return ''
    	  }

    	  if (end === undefined || end > this.length) {
    	    end = this.length;
    	  }

    	  if (end <= 0) {
    	    return ''
    	  }

    	  // Force coercion to uint32. This will also coerce falsey/NaN values to 0.
    	  end >>>= 0;
    	  start >>>= 0;

    	  if (end <= start) {
    	    return ''
    	  }

    	  if (!encoding) encoding = 'utf8';

    	  while (true) {
    	    switch (encoding) {
    	      case 'hex':
    	        return hexSlice(this, start, end)

    	      case 'utf8':
    	      case 'utf-8':
    	        return utf8Slice(this, start, end)

    	      case 'ascii':
    	        return asciiSlice(this, start, end)

    	      case 'latin1':
    	      case 'binary':
    	        return latin1Slice(this, start, end)

    	      case 'base64':
    	        return base64Slice(this, start, end)

    	      case 'ucs2':
    	      case 'ucs-2':
    	      case 'utf16le':
    	      case 'utf-16le':
    	        return utf16leSlice(this, start, end)

    	      default:
    	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
    	        encoding = (encoding + '').toLowerCase();
    	        loweredCase = true;
    	    }
    	  }
    	}

    	// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
    	// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
    	// reliably in a browserify context because there could be multiple different
    	// copies of the 'buffer' package in use. This method works even for Buffer
    	// instances that were created from another copy of the `buffer` package.
    	// See: https://github.com/feross/buffer/issues/154
    	Buffer.prototype._isBuffer = true;

    	function swap (b, n, m) {
    	  const i = b[n];
    	  b[n] = b[m];
    	  b[m] = i;
    	}

    	Buffer.prototype.swap16 = function swap16 () {
    	  const len = this.length;
    	  if (len % 2 !== 0) {
    	    throw new RangeError('Buffer size must be a multiple of 16-bits')
    	  }
    	  for (let i = 0; i < len; i += 2) {
    	    swap(this, i, i + 1);
    	  }
    	  return this
    	};

    	Buffer.prototype.swap32 = function swap32 () {
    	  const len = this.length;
    	  if (len % 4 !== 0) {
    	    throw new RangeError('Buffer size must be a multiple of 32-bits')
    	  }
    	  for (let i = 0; i < len; i += 4) {
    	    swap(this, i, i + 3);
    	    swap(this, i + 1, i + 2);
    	  }
    	  return this
    	};

    	Buffer.prototype.swap64 = function swap64 () {
    	  const len = this.length;
    	  if (len % 8 !== 0) {
    	    throw new RangeError('Buffer size must be a multiple of 64-bits')
    	  }
    	  for (let i = 0; i < len; i += 8) {
    	    swap(this, i, i + 7);
    	    swap(this, i + 1, i + 6);
    	    swap(this, i + 2, i + 5);
    	    swap(this, i + 3, i + 4);
    	  }
    	  return this
    	};

    	Buffer.prototype.toString = function toString () {
    	  const length = this.length;
    	  if (length === 0) return ''
    	  if (arguments.length === 0) return utf8Slice(this, 0, length)
    	  return slowToString.apply(this, arguments)
    	};

    	Buffer.prototype.toLocaleString = Buffer.prototype.toString;

    	Buffer.prototype.equals = function equals (b) {
    	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
    	  if (this === b) return true
    	  return Buffer.compare(this, b) === 0
    	};

    	Buffer.prototype.inspect = function inspect () {
    	  let str = '';
    	  const max = exports.INSPECT_MAX_BYTES;
    	  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim();
    	  if (this.length > max) str += ' ... ';
    	  return '<Buffer ' + str + '>'
    	};
    	if (customInspectSymbol) {
    	  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect;
    	}

    	Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
    	  if (isInstance(target, Uint8Array)) {
    	    target = Buffer.from(target, target.offset, target.byteLength);
    	  }
    	  if (!Buffer.isBuffer(target)) {
    	    throw new TypeError(
    	      'The "target" argument must be one of type Buffer or Uint8Array. ' +
    	      'Received type ' + (typeof target)
    	    )
    	  }

    	  if (start === undefined) {
    	    start = 0;
    	  }
    	  if (end === undefined) {
    	    end = target ? target.length : 0;
    	  }
    	  if (thisStart === undefined) {
    	    thisStart = 0;
    	  }
    	  if (thisEnd === undefined) {
    	    thisEnd = this.length;
    	  }

    	  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    	    throw new RangeError('out of range index')
    	  }

    	  if (thisStart >= thisEnd && start >= end) {
    	    return 0
    	  }
    	  if (thisStart >= thisEnd) {
    	    return -1
    	  }
    	  if (start >= end) {
    	    return 1
    	  }

    	  start >>>= 0;
    	  end >>>= 0;
    	  thisStart >>>= 0;
    	  thisEnd >>>= 0;

    	  if (this === target) return 0

    	  let x = thisEnd - thisStart;
    	  let y = end - start;
    	  const len = Math.min(x, y);

    	  const thisCopy = this.slice(thisStart, thisEnd);
    	  const targetCopy = target.slice(start, end);

    	  for (let i = 0; i < len; ++i) {
    	    if (thisCopy[i] !== targetCopy[i]) {
    	      x = thisCopy[i];
    	      y = targetCopy[i];
    	      break
    	    }
    	  }

    	  if (x < y) return -1
    	  if (y < x) return 1
    	  return 0
    	};

    	// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
    	// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
    	//
    	// Arguments:
    	// - buffer - a Buffer to search
    	// - val - a string, Buffer, or number
    	// - byteOffset - an index into `buffer`; will be clamped to an int32
    	// - encoding - an optional encoding, relevant is val is a string
    	// - dir - true for indexOf, false for lastIndexOf
    	function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
    	  // Empty buffer means no match
    	  if (buffer.length === 0) return -1

    	  // Normalize byteOffset
    	  if (typeof byteOffset === 'string') {
    	    encoding = byteOffset;
    	    byteOffset = 0;
    	  } else if (byteOffset > 0x7fffffff) {
    	    byteOffset = 0x7fffffff;
    	  } else if (byteOffset < -0x80000000) {
    	    byteOffset = -0x80000000;
    	  }
    	  byteOffset = +byteOffset; // Coerce to Number.
    	  if (numberIsNaN(byteOffset)) {
    	    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    	    byteOffset = dir ? 0 : (buffer.length - 1);
    	  }

    	  // Normalize byteOffset: negative offsets start from the end of the buffer
    	  if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
    	  if (byteOffset >= buffer.length) {
    	    if (dir) return -1
    	    else byteOffset = buffer.length - 1;
    	  } else if (byteOffset < 0) {
    	    if (dir) byteOffset = 0;
    	    else return -1
    	  }

    	  // Normalize val
    	  if (typeof val === 'string') {
    	    val = Buffer.from(val, encoding);
    	  }

    	  // Finally, search either indexOf (if dir is true) or lastIndexOf
    	  if (Buffer.isBuffer(val)) {
    	    // Special case: looking for empty string/buffer always fails
    	    if (val.length === 0) {
    	      return -1
    	    }
    	    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
    	  } else if (typeof val === 'number') {
    	    val = val & 0xFF; // Search for a byte value [0-255]
    	    if (typeof Uint8Array.prototype.indexOf === 'function') {
    	      if (dir) {
    	        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
    	      } else {
    	        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
    	      }
    	    }
    	    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
    	  }

    	  throw new TypeError('val must be string, number or Buffer')
    	}

    	function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
    	  let indexSize = 1;
    	  let arrLength = arr.length;
    	  let valLength = val.length;

    	  if (encoding !== undefined) {
    	    encoding = String(encoding).toLowerCase();
    	    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
    	        encoding === 'utf16le' || encoding === 'utf-16le') {
    	      if (arr.length < 2 || val.length < 2) {
    	        return -1
    	      }
    	      indexSize = 2;
    	      arrLength /= 2;
    	      valLength /= 2;
    	      byteOffset /= 2;
    	    }
    	  }

    	  function read (buf, i) {
    	    if (indexSize === 1) {
    	      return buf[i]
    	    } else {
    	      return buf.readUInt16BE(i * indexSize)
    	    }
    	  }

    	  let i;
    	  if (dir) {
    	    let foundIndex = -1;
    	    for (i = byteOffset; i < arrLength; i++) {
    	      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
    	        if (foundIndex === -1) foundIndex = i;
    	        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
    	      } else {
    	        if (foundIndex !== -1) i -= i - foundIndex;
    	        foundIndex = -1;
    	      }
    	    }
    	  } else {
    	    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
    	    for (i = byteOffset; i >= 0; i--) {
    	      let found = true;
    	      for (let j = 0; j < valLength; j++) {
    	        if (read(arr, i + j) !== read(val, j)) {
    	          found = false;
    	          break
    	        }
    	      }
    	      if (found) return i
    	    }
    	  }

    	  return -1
    	}

    	Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
    	  return this.indexOf(val, byteOffset, encoding) !== -1
    	};

    	Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
    	  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
    	};

    	Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
    	  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
    	};

    	function hexWrite (buf, string, offset, length) {
    	  offset = Number(offset) || 0;
    	  const remaining = buf.length - offset;
    	  if (!length) {
    	    length = remaining;
    	  } else {
    	    length = Number(length);
    	    if (length > remaining) {
    	      length = remaining;
    	    }
    	  }

    	  const strLen = string.length;

    	  if (length > strLen / 2) {
    	    length = strLen / 2;
    	  }
    	  let i;
    	  for (i = 0; i < length; ++i) {
    	    const parsed = parseInt(string.substr(i * 2, 2), 16);
    	    if (numberIsNaN(parsed)) return i
    	    buf[offset + i] = parsed;
    	  }
    	  return i
    	}

    	function utf8Write (buf, string, offset, length) {
    	  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
    	}

    	function asciiWrite (buf, string, offset, length) {
    	  return blitBuffer(asciiToBytes(string), buf, offset, length)
    	}

    	function base64Write (buf, string, offset, length) {
    	  return blitBuffer(base64ToBytes(string), buf, offset, length)
    	}

    	function ucs2Write (buf, string, offset, length) {
    	  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
    	}

    	Buffer.prototype.write = function write (string, offset, length, encoding) {
    	  // Buffer#write(string)
    	  if (offset === undefined) {
    	    encoding = 'utf8';
    	    length = this.length;
    	    offset = 0;
    	  // Buffer#write(string, encoding)
    	  } else if (length === undefined && typeof offset === 'string') {
    	    encoding = offset;
    	    length = this.length;
    	    offset = 0;
    	  // Buffer#write(string, offset[, length][, encoding])
    	  } else if (isFinite(offset)) {
    	    offset = offset >>> 0;
    	    if (isFinite(length)) {
    	      length = length >>> 0;
    	      if (encoding === undefined) encoding = 'utf8';
    	    } else {
    	      encoding = length;
    	      length = undefined;
    	    }
    	  } else {
    	    throw new Error(
    	      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    	    )
    	  }

    	  const remaining = this.length - offset;
    	  if (length === undefined || length > remaining) length = remaining;

    	  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    	    throw new RangeError('Attempt to write outside buffer bounds')
    	  }

    	  if (!encoding) encoding = 'utf8';

    	  let loweredCase = false;
    	  for (;;) {
    	    switch (encoding) {
    	      case 'hex':
    	        return hexWrite(this, string, offset, length)

    	      case 'utf8':
    	      case 'utf-8':
    	        return utf8Write(this, string, offset, length)

    	      case 'ascii':
    	      case 'latin1':
    	      case 'binary':
    	        return asciiWrite(this, string, offset, length)

    	      case 'base64':
    	        // Warning: maxLength not taken into account in base64Write
    	        return base64Write(this, string, offset, length)

    	      case 'ucs2':
    	      case 'ucs-2':
    	      case 'utf16le':
    	      case 'utf-16le':
    	        return ucs2Write(this, string, offset, length)

    	      default:
    	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
    	        encoding = ('' + encoding).toLowerCase();
    	        loweredCase = true;
    	    }
    	  }
    	};

    	Buffer.prototype.toJSON = function toJSON () {
    	  return {
    	    type: 'Buffer',
    	    data: Array.prototype.slice.call(this._arr || this, 0)
    	  }
    	};

    	function base64Slice (buf, start, end) {
    	  if (start === 0 && end === buf.length) {
    	    return base64.fromByteArray(buf)
    	  } else {
    	    return base64.fromByteArray(buf.slice(start, end))
    	  }
    	}

    	function utf8Slice (buf, start, end) {
    	  end = Math.min(buf.length, end);
    	  const res = [];

    	  let i = start;
    	  while (i < end) {
    	    const firstByte = buf[i];
    	    let codePoint = null;
    	    let bytesPerSequence = (firstByte > 0xEF)
    	      ? 4
    	      : (firstByte > 0xDF)
    	          ? 3
    	          : (firstByte > 0xBF)
    	              ? 2
    	              : 1;

    	    if (i + bytesPerSequence <= end) {
    	      let secondByte, thirdByte, fourthByte, tempCodePoint;

    	      switch (bytesPerSequence) {
    	        case 1:
    	          if (firstByte < 0x80) {
    	            codePoint = firstByte;
    	          }
    	          break
    	        case 2:
    	          secondByte = buf[i + 1];
    	          if ((secondByte & 0xC0) === 0x80) {
    	            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
    	            if (tempCodePoint > 0x7F) {
    	              codePoint = tempCodePoint;
    	            }
    	          }
    	          break
    	        case 3:
    	          secondByte = buf[i + 1];
    	          thirdByte = buf[i + 2];
    	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
    	            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
    	            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
    	              codePoint = tempCodePoint;
    	            }
    	          }
    	          break
    	        case 4:
    	          secondByte = buf[i + 1];
    	          thirdByte = buf[i + 2];
    	          fourthByte = buf[i + 3];
    	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
    	            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
    	            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
    	              codePoint = tempCodePoint;
    	            }
    	          }
    	      }
    	    }

    	    if (codePoint === null) {
    	      // we did not generate a valid codePoint so insert a
    	      // replacement char (U+FFFD) and advance only 1 byte
    	      codePoint = 0xFFFD;
    	      bytesPerSequence = 1;
    	    } else if (codePoint > 0xFFFF) {
    	      // encode to utf16 (surrogate pair dance)
    	      codePoint -= 0x10000;
    	      res.push(codePoint >>> 10 & 0x3FF | 0xD800);
    	      codePoint = 0xDC00 | codePoint & 0x3FF;
    	    }

    	    res.push(codePoint);
    	    i += bytesPerSequence;
    	  }

    	  return decodeCodePointsArray(res)
    	}

    	// Based on http://stackoverflow.com/a/22747272/680742, the browser with
    	// the lowest limit is Chrome, with 0x10000 args.
    	// We go 1 magnitude less, for safety
    	const MAX_ARGUMENTS_LENGTH = 0x1000;

    	function decodeCodePointsArray (codePoints) {
    	  const len = codePoints.length;
    	  if (len <= MAX_ARGUMENTS_LENGTH) {
    	    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
    	  }

    	  // Decode in chunks to avoid "call stack size exceeded".
    	  let res = '';
    	  let i = 0;
    	  while (i < len) {
    	    res += String.fromCharCode.apply(
    	      String,
    	      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    	    );
    	  }
    	  return res
    	}

    	function asciiSlice (buf, start, end) {
    	  let ret = '';
    	  end = Math.min(buf.length, end);

    	  for (let i = start; i < end; ++i) {
    	    ret += String.fromCharCode(buf[i] & 0x7F);
    	  }
    	  return ret
    	}

    	function latin1Slice (buf, start, end) {
    	  let ret = '';
    	  end = Math.min(buf.length, end);

    	  for (let i = start; i < end; ++i) {
    	    ret += String.fromCharCode(buf[i]);
    	  }
    	  return ret
    	}

    	function hexSlice (buf, start, end) {
    	  const len = buf.length;

    	  if (!start || start < 0) start = 0;
    	  if (!end || end < 0 || end > len) end = len;

    	  let out = '';
    	  for (let i = start; i < end; ++i) {
    	    out += hexSliceLookupTable[buf[i]];
    	  }
    	  return out
    	}

    	function utf16leSlice (buf, start, end) {
    	  const bytes = buf.slice(start, end);
    	  let res = '';
    	  // If bytes.length is odd, the last 8 bits must be ignored (same as node.js)
    	  for (let i = 0; i < bytes.length - 1; i += 2) {
    	    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256));
    	  }
    	  return res
    	}

    	Buffer.prototype.slice = function slice (start, end) {
    	  const len = this.length;
    	  start = ~~start;
    	  end = end === undefined ? len : ~~end;

    	  if (start < 0) {
    	    start += len;
    	    if (start < 0) start = 0;
    	  } else if (start > len) {
    	    start = len;
    	  }

    	  if (end < 0) {
    	    end += len;
    	    if (end < 0) end = 0;
    	  } else if (end > len) {
    	    end = len;
    	  }

    	  if (end < start) end = start;

    	  const newBuf = this.subarray(start, end);
    	  // Return an augmented `Uint8Array` instance
    	  Object.setPrototypeOf(newBuf, Buffer.prototype);

    	  return newBuf
    	};

    	/*
    	 * Need to make sure that buffer isn't trying to write out of bounds.
    	 */
    	function checkOffset (offset, ext, length) {
    	  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
    	  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
    	}

    	Buffer.prototype.readUintLE =
    	Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
    	  offset = offset >>> 0;
    	  byteLength = byteLength >>> 0;
    	  if (!noAssert) checkOffset(offset, byteLength, this.length);

    	  let val = this[offset];
    	  let mul = 1;
    	  let i = 0;
    	  while (++i < byteLength && (mul *= 0x100)) {
    	    val += this[offset + i] * mul;
    	  }

    	  return val
    	};

    	Buffer.prototype.readUintBE =
    	Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
    	  offset = offset >>> 0;
    	  byteLength = byteLength >>> 0;
    	  if (!noAssert) {
    	    checkOffset(offset, byteLength, this.length);
    	  }

    	  let val = this[offset + --byteLength];
    	  let mul = 1;
    	  while (byteLength > 0 && (mul *= 0x100)) {
    	    val += this[offset + --byteLength] * mul;
    	  }

    	  return val
    	};

    	Buffer.prototype.readUint8 =
    	Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
    	  offset = offset >>> 0;
    	  if (!noAssert) checkOffset(offset, 1, this.length);
    	  return this[offset]
    	};

    	Buffer.prototype.readUint16LE =
    	Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
    	  offset = offset >>> 0;
    	  if (!noAssert) checkOffset(offset, 2, this.length);
    	  return this[offset] | (this[offset + 1] << 8)
    	};

    	Buffer.prototype.readUint16BE =
    	Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
    	  offset = offset >>> 0;
    	  if (!noAssert) checkOffset(offset, 2, this.length);
    	  return (this[offset] << 8) | this[offset + 1]
    	};

    	Buffer.prototype.readUint32LE =
    	Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
    	  offset = offset >>> 0;
    	  if (!noAssert) checkOffset(offset, 4, this.length);

    	  return ((this[offset]) |
    	      (this[offset + 1] << 8) |
    	      (this[offset + 2] << 16)) +
    	      (this[offset + 3] * 0x1000000)
    	};

    	Buffer.prototype.readUint32BE =
    	Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
    	  offset = offset >>> 0;
    	  if (!noAssert) checkOffset(offset, 4, this.length);

    	  return (this[offset] * 0x1000000) +
    	    ((this[offset + 1] << 16) |
    	    (this[offset + 2] << 8) |
    	    this[offset + 3])
    	};

    	Buffer.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE (offset) {
    	  offset = offset >>> 0;
    	  validateNumber(offset, 'offset');
    	  const first = this[offset];
    	  const last = this[offset + 7];
    	  if (first === undefined || last === undefined) {
    	    boundsError(offset, this.length - 8);
    	  }

    	  const lo = first +
    	    this[++offset] * 2 ** 8 +
    	    this[++offset] * 2 ** 16 +
    	    this[++offset] * 2 ** 24;

    	  const hi = this[++offset] +
    	    this[++offset] * 2 ** 8 +
    	    this[++offset] * 2 ** 16 +
    	    last * 2 ** 24;

    	  return BigInt(lo) + (BigInt(hi) << BigInt(32))
    	});

    	Buffer.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE (offset) {
    	  offset = offset >>> 0;
    	  validateNumber(offset, 'offset');
    	  const first = this[offset];
    	  const last = this[offset + 7];
    	  if (first === undefined || last === undefined) {
    	    boundsError(offset, this.length - 8);
    	  }

    	  const hi = first * 2 ** 24 +
    	    this[++offset] * 2 ** 16 +
    	    this[++offset] * 2 ** 8 +
    	    this[++offset];

    	  const lo = this[++offset] * 2 ** 24 +
    	    this[++offset] * 2 ** 16 +
    	    this[++offset] * 2 ** 8 +
    	    last;

    	  return (BigInt(hi) << BigInt(32)) + BigInt(lo)
    	});

    	Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
    	  offset = offset >>> 0;
    	  byteLength = byteLength >>> 0;
    	  if (!noAssert) checkOffset(offset, byteLength, this.length);

    	  let val = this[offset];
    	  let mul = 1;
    	  let i = 0;
    	  while (++i < byteLength && (mul *= 0x100)) {
    	    val += this[offset + i] * mul;
    	  }
    	  mul *= 0x80;

    	  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

    	  return val
    	};

    	Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
    	  offset = offset >>> 0;
    	  byteLength = byteLength >>> 0;
    	  if (!noAssert) checkOffset(offset, byteLength, this.length);

    	  let i = byteLength;
    	  let mul = 1;
    	  let val = this[offset + --i];
    	  while (i > 0 && (mul *= 0x100)) {
    	    val += this[offset + --i] * mul;
    	  }
    	  mul *= 0x80;

    	  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

    	  return val
    	};

    	Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
    	  offset = offset >>> 0;
    	  if (!noAssert) checkOffset(offset, 1, this.length);
    	  if (!(this[offset] & 0x80)) return (this[offset])
    	  return ((0xff - this[offset] + 1) * -1)
    	};

    	Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
    	  offset = offset >>> 0;
    	  if (!noAssert) checkOffset(offset, 2, this.length);
    	  const val = this[offset] | (this[offset + 1] << 8);
    	  return (val & 0x8000) ? val | 0xFFFF0000 : val
    	};

    	Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
    	  offset = offset >>> 0;
    	  if (!noAssert) checkOffset(offset, 2, this.length);
    	  const val = this[offset + 1] | (this[offset] << 8);
    	  return (val & 0x8000) ? val | 0xFFFF0000 : val
    	};

    	Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
    	  offset = offset >>> 0;
    	  if (!noAssert) checkOffset(offset, 4, this.length);

    	  return (this[offset]) |
    	    (this[offset + 1] << 8) |
    	    (this[offset + 2] << 16) |
    	    (this[offset + 3] << 24)
    	};

    	Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
    	  offset = offset >>> 0;
    	  if (!noAssert) checkOffset(offset, 4, this.length);

    	  return (this[offset] << 24) |
    	    (this[offset + 1] << 16) |
    	    (this[offset + 2] << 8) |
    	    (this[offset + 3])
    	};

    	Buffer.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE (offset) {
    	  offset = offset >>> 0;
    	  validateNumber(offset, 'offset');
    	  const first = this[offset];
    	  const last = this[offset + 7];
    	  if (first === undefined || last === undefined) {
    	    boundsError(offset, this.length - 8);
    	  }

    	  const val = this[offset + 4] +
    	    this[offset + 5] * 2 ** 8 +
    	    this[offset + 6] * 2 ** 16 +
    	    (last << 24); // Overflow

    	  return (BigInt(val) << BigInt(32)) +
    	    BigInt(first +
    	    this[++offset] * 2 ** 8 +
    	    this[++offset] * 2 ** 16 +
    	    this[++offset] * 2 ** 24)
    	});

    	Buffer.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE (offset) {
    	  offset = offset >>> 0;
    	  validateNumber(offset, 'offset');
    	  const first = this[offset];
    	  const last = this[offset + 7];
    	  if (first === undefined || last === undefined) {
    	    boundsError(offset, this.length - 8);
    	  }

    	  const val = (first << 24) + // Overflow
    	    this[++offset] * 2 ** 16 +
    	    this[++offset] * 2 ** 8 +
    	    this[++offset];

    	  return (BigInt(val) << BigInt(32)) +
    	    BigInt(this[++offset] * 2 ** 24 +
    	    this[++offset] * 2 ** 16 +
    	    this[++offset] * 2 ** 8 +
    	    last)
    	});

    	Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
    	  offset = offset >>> 0;
    	  if (!noAssert) checkOffset(offset, 4, this.length);
    	  return ieee754$1.read(this, offset, true, 23, 4)
    	};

    	Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
    	  offset = offset >>> 0;
    	  if (!noAssert) checkOffset(offset, 4, this.length);
    	  return ieee754$1.read(this, offset, false, 23, 4)
    	};

    	Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
    	  offset = offset >>> 0;
    	  if (!noAssert) checkOffset(offset, 8, this.length);
    	  return ieee754$1.read(this, offset, true, 52, 8)
    	};

    	Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
    	  offset = offset >>> 0;
    	  if (!noAssert) checkOffset(offset, 8, this.length);
    	  return ieee754$1.read(this, offset, false, 52, 8)
    	};

    	function checkInt (buf, value, offset, ext, max, min) {
    	  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
    	  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
    	  if (offset + ext > buf.length) throw new RangeError('Index out of range')
    	}

    	Buffer.prototype.writeUintLE =
    	Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
    	  value = +value;
    	  offset = offset >>> 0;
    	  byteLength = byteLength >>> 0;
    	  if (!noAssert) {
    	    const maxBytes = Math.pow(2, 8 * byteLength) - 1;
    	    checkInt(this, value, offset, byteLength, maxBytes, 0);
    	  }

    	  let mul = 1;
    	  let i = 0;
    	  this[offset] = value & 0xFF;
    	  while (++i < byteLength && (mul *= 0x100)) {
    	    this[offset + i] = (value / mul) & 0xFF;
    	  }

    	  return offset + byteLength
    	};

    	Buffer.prototype.writeUintBE =
    	Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
    	  value = +value;
    	  offset = offset >>> 0;
    	  byteLength = byteLength >>> 0;
    	  if (!noAssert) {
    	    const maxBytes = Math.pow(2, 8 * byteLength) - 1;
    	    checkInt(this, value, offset, byteLength, maxBytes, 0);
    	  }

    	  let i = byteLength - 1;
    	  let mul = 1;
    	  this[offset + i] = value & 0xFF;
    	  while (--i >= 0 && (mul *= 0x100)) {
    	    this[offset + i] = (value / mul) & 0xFF;
    	  }

    	  return offset + byteLength
    	};

    	Buffer.prototype.writeUint8 =
    	Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
    	  value = +value;
    	  offset = offset >>> 0;
    	  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
    	  this[offset] = (value & 0xff);
    	  return offset + 1
    	};

    	Buffer.prototype.writeUint16LE =
    	Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
    	  value = +value;
    	  offset = offset >>> 0;
    	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
    	  this[offset] = (value & 0xff);
    	  this[offset + 1] = (value >>> 8);
    	  return offset + 2
    	};

    	Buffer.prototype.writeUint16BE =
    	Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
    	  value = +value;
    	  offset = offset >>> 0;
    	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
    	  this[offset] = (value >>> 8);
    	  this[offset + 1] = (value & 0xff);
    	  return offset + 2
    	};

    	Buffer.prototype.writeUint32LE =
    	Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
    	  value = +value;
    	  offset = offset >>> 0;
    	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
    	  this[offset + 3] = (value >>> 24);
    	  this[offset + 2] = (value >>> 16);
    	  this[offset + 1] = (value >>> 8);
    	  this[offset] = (value & 0xff);
    	  return offset + 4
    	};

    	Buffer.prototype.writeUint32BE =
    	Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
    	  value = +value;
    	  offset = offset >>> 0;
    	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
    	  this[offset] = (value >>> 24);
    	  this[offset + 1] = (value >>> 16);
    	  this[offset + 2] = (value >>> 8);
    	  this[offset + 3] = (value & 0xff);
    	  return offset + 4
    	};

    	function wrtBigUInt64LE (buf, value, offset, min, max) {
    	  checkIntBI(value, min, max, buf, offset, 7);

    	  let lo = Number(value & BigInt(0xffffffff));
    	  buf[offset++] = lo;
    	  lo = lo >> 8;
    	  buf[offset++] = lo;
    	  lo = lo >> 8;
    	  buf[offset++] = lo;
    	  lo = lo >> 8;
    	  buf[offset++] = lo;
    	  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff));
    	  buf[offset++] = hi;
    	  hi = hi >> 8;
    	  buf[offset++] = hi;
    	  hi = hi >> 8;
    	  buf[offset++] = hi;
    	  hi = hi >> 8;
    	  buf[offset++] = hi;
    	  return offset
    	}

    	function wrtBigUInt64BE (buf, value, offset, min, max) {
    	  checkIntBI(value, min, max, buf, offset, 7);

    	  let lo = Number(value & BigInt(0xffffffff));
    	  buf[offset + 7] = lo;
    	  lo = lo >> 8;
    	  buf[offset + 6] = lo;
    	  lo = lo >> 8;
    	  buf[offset + 5] = lo;
    	  lo = lo >> 8;
    	  buf[offset + 4] = lo;
    	  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff));
    	  buf[offset + 3] = hi;
    	  hi = hi >> 8;
    	  buf[offset + 2] = hi;
    	  hi = hi >> 8;
    	  buf[offset + 1] = hi;
    	  hi = hi >> 8;
    	  buf[offset] = hi;
    	  return offset + 8
    	}

    	Buffer.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE (value, offset = 0) {
    	  return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
    	});

    	Buffer.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE (value, offset = 0) {
    	  return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
    	});

    	Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
    	  value = +value;
    	  offset = offset >>> 0;
    	  if (!noAssert) {
    	    const limit = Math.pow(2, (8 * byteLength) - 1);

    	    checkInt(this, value, offset, byteLength, limit - 1, -limit);
    	  }

    	  let i = 0;
    	  let mul = 1;
    	  let sub = 0;
    	  this[offset] = value & 0xFF;
    	  while (++i < byteLength && (mul *= 0x100)) {
    	    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
    	      sub = 1;
    	    }
    	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
    	  }

    	  return offset + byteLength
    	};

    	Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
    	  value = +value;
    	  offset = offset >>> 0;
    	  if (!noAssert) {
    	    const limit = Math.pow(2, (8 * byteLength) - 1);

    	    checkInt(this, value, offset, byteLength, limit - 1, -limit);
    	  }

    	  let i = byteLength - 1;
    	  let mul = 1;
    	  let sub = 0;
    	  this[offset + i] = value & 0xFF;
    	  while (--i >= 0 && (mul *= 0x100)) {
    	    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
    	      sub = 1;
    	    }
    	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
    	  }

    	  return offset + byteLength
    	};

    	Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
    	  value = +value;
    	  offset = offset >>> 0;
    	  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
    	  if (value < 0) value = 0xff + value + 1;
    	  this[offset] = (value & 0xff);
    	  return offset + 1
    	};

    	Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
    	  value = +value;
    	  offset = offset >>> 0;
    	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
    	  this[offset] = (value & 0xff);
    	  this[offset + 1] = (value >>> 8);
    	  return offset + 2
    	};

    	Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
    	  value = +value;
    	  offset = offset >>> 0;
    	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
    	  this[offset] = (value >>> 8);
    	  this[offset + 1] = (value & 0xff);
    	  return offset + 2
    	};

    	Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
    	  value = +value;
    	  offset = offset >>> 0;
    	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
    	  this[offset] = (value & 0xff);
    	  this[offset + 1] = (value >>> 8);
    	  this[offset + 2] = (value >>> 16);
    	  this[offset + 3] = (value >>> 24);
    	  return offset + 4
    	};

    	Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
    	  value = +value;
    	  offset = offset >>> 0;
    	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
    	  if (value < 0) value = 0xffffffff + value + 1;
    	  this[offset] = (value >>> 24);
    	  this[offset + 1] = (value >>> 16);
    	  this[offset + 2] = (value >>> 8);
    	  this[offset + 3] = (value & 0xff);
    	  return offset + 4
    	};

    	Buffer.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE (value, offset = 0) {
    	  return wrtBigUInt64LE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
    	});

    	Buffer.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE (value, offset = 0) {
    	  return wrtBigUInt64BE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
    	});

    	function checkIEEE754 (buf, value, offset, ext, max, min) {
    	  if (offset + ext > buf.length) throw new RangeError('Index out of range')
    	  if (offset < 0) throw new RangeError('Index out of range')
    	}

    	function writeFloat (buf, value, offset, littleEndian, noAssert) {
    	  value = +value;
    	  offset = offset >>> 0;
    	  if (!noAssert) {
    	    checkIEEE754(buf, value, offset, 4);
    	  }
    	  ieee754$1.write(buf, value, offset, littleEndian, 23, 4);
    	  return offset + 4
    	}

    	Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
    	  return writeFloat(this, value, offset, true, noAssert)
    	};

    	Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
    	  return writeFloat(this, value, offset, false, noAssert)
    	};

    	function writeDouble (buf, value, offset, littleEndian, noAssert) {
    	  value = +value;
    	  offset = offset >>> 0;
    	  if (!noAssert) {
    	    checkIEEE754(buf, value, offset, 8);
    	  }
    	  ieee754$1.write(buf, value, offset, littleEndian, 52, 8);
    	  return offset + 8
    	}

    	Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
    	  return writeDouble(this, value, offset, true, noAssert)
    	};

    	Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
    	  return writeDouble(this, value, offset, false, noAssert)
    	};

    	// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
    	Buffer.prototype.copy = function copy (target, targetStart, start, end) {
    	  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
    	  if (!start) start = 0;
    	  if (!end && end !== 0) end = this.length;
    	  if (targetStart >= target.length) targetStart = target.length;
    	  if (!targetStart) targetStart = 0;
    	  if (end > 0 && end < start) end = start;

    	  // Copy 0 bytes; we're done
    	  if (end === start) return 0
    	  if (target.length === 0 || this.length === 0) return 0

    	  // Fatal error conditions
    	  if (targetStart < 0) {
    	    throw new RangeError('targetStart out of bounds')
    	  }
    	  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
    	  if (end < 0) throw new RangeError('sourceEnd out of bounds')

    	  // Are we oob?
    	  if (end > this.length) end = this.length;
    	  if (target.length - targetStart < end - start) {
    	    end = target.length - targetStart + start;
    	  }

    	  const len = end - start;

    	  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    	    // Use built-in when available, missing from IE11
    	    this.copyWithin(targetStart, start, end);
    	  } else {
    	    Uint8Array.prototype.set.call(
    	      target,
    	      this.subarray(start, end),
    	      targetStart
    	    );
    	  }

    	  return len
    	};

    	// Usage:
    	//    buffer.fill(number[, offset[, end]])
    	//    buffer.fill(buffer[, offset[, end]])
    	//    buffer.fill(string[, offset[, end]][, encoding])
    	Buffer.prototype.fill = function fill (val, start, end, encoding) {
    	  // Handle string cases:
    	  if (typeof val === 'string') {
    	    if (typeof start === 'string') {
    	      encoding = start;
    	      start = 0;
    	      end = this.length;
    	    } else if (typeof end === 'string') {
    	      encoding = end;
    	      end = this.length;
    	    }
    	    if (encoding !== undefined && typeof encoding !== 'string') {
    	      throw new TypeError('encoding must be a string')
    	    }
    	    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
    	      throw new TypeError('Unknown encoding: ' + encoding)
    	    }
    	    if (val.length === 1) {
    	      const code = val.charCodeAt(0);
    	      if ((encoding === 'utf8' && code < 128) ||
    	          encoding === 'latin1') {
    	        // Fast path: If `val` fits into a single byte, use that numeric value.
    	        val = code;
    	      }
    	    }
    	  } else if (typeof val === 'number') {
    	    val = val & 255;
    	  } else if (typeof val === 'boolean') {
    	    val = Number(val);
    	  }

    	  // Invalid ranges are not set to a default, so can range check early.
    	  if (start < 0 || this.length < start || this.length < end) {
    	    throw new RangeError('Out of range index')
    	  }

    	  if (end <= start) {
    	    return this
    	  }

    	  start = start >>> 0;
    	  end = end === undefined ? this.length : end >>> 0;

    	  if (!val) val = 0;

    	  let i;
    	  if (typeof val === 'number') {
    	    for (i = start; i < end; ++i) {
    	      this[i] = val;
    	    }
    	  } else {
    	    const bytes = Buffer.isBuffer(val)
    	      ? val
    	      : Buffer.from(val, encoding);
    	    const len = bytes.length;
    	    if (len === 0) {
    	      throw new TypeError('The value "' + val +
    	        '" is invalid for argument "value"')
    	    }
    	    for (i = 0; i < end - start; ++i) {
    	      this[i + start] = bytes[i % len];
    	    }
    	  }

    	  return this
    	};

    	// CUSTOM ERRORS
    	// =============

    	// Simplified versions from Node, changed for Buffer-only usage
    	const errors = {};
    	function E (sym, getMessage, Base) {
    	  errors[sym] = class NodeError extends Base {
    	    constructor () {
    	      super();

    	      Object.defineProperty(this, 'message', {
    	        value: getMessage.apply(this, arguments),
    	        writable: true,
    	        configurable: true
    	      });

    	      // Add the error code to the name to include it in the stack trace.
    	      this.name = `${this.name} [${sym}]`;
    	      // Access the stack to generate the error message including the error code
    	      // from the name.
    	      this.stack; // eslint-disable-line no-unused-expressions
    	      // Reset the name to the actual name.
    	      delete this.name;
    	    }

    	    get code () {
    	      return sym
    	    }

    	    set code (value) {
    	      Object.defineProperty(this, 'code', {
    	        configurable: true,
    	        enumerable: true,
    	        value,
    	        writable: true
    	      });
    	    }

    	    toString () {
    	      return `${this.name} [${sym}]: ${this.message}`
    	    }
    	  };
    	}

    	E('ERR_BUFFER_OUT_OF_BOUNDS',
    	  function (name) {
    	    if (name) {
    	      return `${name} is outside of buffer bounds`
    	    }

    	    return 'Attempt to access memory outside buffer bounds'
    	  }, RangeError);
    	E('ERR_INVALID_ARG_TYPE',
    	  function (name, actual) {
    	    return `The "${name}" argument must be of type number. Received type ${typeof actual}`
    	  }, TypeError);
    	E('ERR_OUT_OF_RANGE',
    	  function (str, range, input) {
    	    let msg = `The value of "${str}" is out of range.`;
    	    let received = input;
    	    if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
    	      received = addNumericalSeparator(String(input));
    	    } else if (typeof input === 'bigint') {
    	      received = String(input);
    	      if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
    	        received = addNumericalSeparator(received);
    	      }
    	      received += 'n';
    	    }
    	    msg += ` It must be ${range}. Received ${received}`;
    	    return msg
    	  }, RangeError);

    	function addNumericalSeparator (val) {
    	  let res = '';
    	  let i = val.length;
    	  const start = val[0] === '-' ? 1 : 0;
    	  for (; i >= start + 4; i -= 3) {
    	    res = `_${val.slice(i - 3, i)}${res}`;
    	  }
    	  return `${val.slice(0, i)}${res}`
    	}

    	// CHECK FUNCTIONS
    	// ===============

    	function checkBounds (buf, offset, byteLength) {
    	  validateNumber(offset, 'offset');
    	  if (buf[offset] === undefined || buf[offset + byteLength] === undefined) {
    	    boundsError(offset, buf.length - (byteLength + 1));
    	  }
    	}

    	function checkIntBI (value, min, max, buf, offset, byteLength) {
    	  if (value > max || value < min) {
    	    const n = typeof min === 'bigint' ? 'n' : '';
    	    let range;
    	    if (byteLength > 3) {
    	      if (min === 0 || min === BigInt(0)) {
    	        range = `>= 0${n} and < 2${n} ** ${(byteLength + 1) * 8}${n}`;
    	      } else {
    	        range = `>= -(2${n} ** ${(byteLength + 1) * 8 - 1}${n}) and < 2 ** ` +
    	                `${(byteLength + 1) * 8 - 1}${n}`;
    	      }
    	    } else {
    	      range = `>= ${min}${n} and <= ${max}${n}`;
    	    }
    	    throw new errors.ERR_OUT_OF_RANGE('value', range, value)
    	  }
    	  checkBounds(buf, offset, byteLength);
    	}

    	function validateNumber (value, name) {
    	  if (typeof value !== 'number') {
    	    throw new errors.ERR_INVALID_ARG_TYPE(name, 'number', value)
    	  }
    	}

    	function boundsError (value, length, type) {
    	  if (Math.floor(value) !== value) {
    	    validateNumber(value, type);
    	    throw new errors.ERR_OUT_OF_RANGE(type || 'offset', 'an integer', value)
    	  }

    	  if (length < 0) {
    	    throw new errors.ERR_BUFFER_OUT_OF_BOUNDS()
    	  }

    	  throw new errors.ERR_OUT_OF_RANGE(type || 'offset',
    	                                    `>= ${type ? 1 : 0} and <= ${length}`,
    	                                    value)
    	}

    	// HELPER FUNCTIONS
    	// ================

    	const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;

    	function base64clean (str) {
    	  // Node takes equal signs as end of the Base64 encoding
    	  str = str.split('=')[0];
    	  // Node strips out invalid characters like \n and \t from the string, base64-js does not
    	  str = str.trim().replace(INVALID_BASE64_RE, '');
    	  // Node converts strings with length < 2 to ''
    	  if (str.length < 2) return ''
    	  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
    	  while (str.length % 4 !== 0) {
    	    str = str + '=';
    	  }
    	  return str
    	}

    	function utf8ToBytes (string, units) {
    	  units = units || Infinity;
    	  let codePoint;
    	  const length = string.length;
    	  let leadSurrogate = null;
    	  const bytes = [];

    	  for (let i = 0; i < length; ++i) {
    	    codePoint = string.charCodeAt(i);

    	    // is surrogate component
    	    if (codePoint > 0xD7FF && codePoint < 0xE000) {
    	      // last char was a lead
    	      if (!leadSurrogate) {
    	        // no lead yet
    	        if (codePoint > 0xDBFF) {
    	          // unexpected trail
    	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
    	          continue
    	        } else if (i + 1 === length) {
    	          // unpaired lead
    	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
    	          continue
    	        }

    	        // valid lead
    	        leadSurrogate = codePoint;

    	        continue
    	      }

    	      // 2 leads in a row
    	      if (codePoint < 0xDC00) {
    	        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
    	        leadSurrogate = codePoint;
    	        continue
    	      }

    	      // valid surrogate pair
    	      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
    	    } else if (leadSurrogate) {
    	      // valid bmp char, but last char was a lead
    	      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
    	    }

    	    leadSurrogate = null;

    	    // encode utf8
    	    if (codePoint < 0x80) {
    	      if ((units -= 1) < 0) break
    	      bytes.push(codePoint);
    	    } else if (codePoint < 0x800) {
    	      if ((units -= 2) < 0) break
    	      bytes.push(
    	        codePoint >> 0x6 | 0xC0,
    	        codePoint & 0x3F | 0x80
    	      );
    	    } else if (codePoint < 0x10000) {
    	      if ((units -= 3) < 0) break
    	      bytes.push(
    	        codePoint >> 0xC | 0xE0,
    	        codePoint >> 0x6 & 0x3F | 0x80,
    	        codePoint & 0x3F | 0x80
    	      );
    	    } else if (codePoint < 0x110000) {
    	      if ((units -= 4) < 0) break
    	      bytes.push(
    	        codePoint >> 0x12 | 0xF0,
    	        codePoint >> 0xC & 0x3F | 0x80,
    	        codePoint >> 0x6 & 0x3F | 0x80,
    	        codePoint & 0x3F | 0x80
    	      );
    	    } else {
    	      throw new Error('Invalid code point')
    	    }
    	  }

    	  return bytes
    	}

    	function asciiToBytes (str) {
    	  const byteArray = [];
    	  for (let i = 0; i < str.length; ++i) {
    	    // Node's code seems to be doing this and not & 0x7F..
    	    byteArray.push(str.charCodeAt(i) & 0xFF);
    	  }
    	  return byteArray
    	}

    	function utf16leToBytes (str, units) {
    	  let c, hi, lo;
    	  const byteArray = [];
    	  for (let i = 0; i < str.length; ++i) {
    	    if ((units -= 2) < 0) break

    	    c = str.charCodeAt(i);
    	    hi = c >> 8;
    	    lo = c % 256;
    	    byteArray.push(lo);
    	    byteArray.push(hi);
    	  }

    	  return byteArray
    	}

    	function base64ToBytes (str) {
    	  return base64.toByteArray(base64clean(str))
    	}

    	function blitBuffer (src, dst, offset, length) {
    	  let i;
    	  for (i = 0; i < length; ++i) {
    	    if ((i + offset >= dst.length) || (i >= src.length)) break
    	    dst[i + offset] = src[i];
    	  }
    	  return i
    	}

    	// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
    	// the `instanceof` check but they should be treated as of that type.
    	// See: https://github.com/feross/buffer/issues/166
    	function isInstance (obj, type) {
    	  return obj instanceof type ||
    	    (obj != null && obj.constructor != null && obj.constructor.name != null &&
    	      obj.constructor.name === type.name)
    	}
    	function numberIsNaN (obj) {
    	  // For IE11 support
    	  return obj !== obj // eslint-disable-line no-self-compare
    	}

    	// Create lookup table for `toString('hex')`
    	// See: https://github.com/feross/buffer/issues/219
    	const hexSliceLookupTable = (function () {
    	  const alphabet = '0123456789abcdef';
    	  const table = new Array(256);
    	  for (let i = 0; i < 16; ++i) {
    	    const i16 = i * 16;
    	    for (let j = 0; j < 16; ++j) {
    	      table[i16 + j] = alphabet[i] + alphabet[j];
    	    }
    	  }
    	  return table
    	})();

    	// Return not function with Error if BigInt not supported
    	function defineBigIntMethod (fn) {
    	  return typeof BigInt === 'undefined' ? BufferBigIntNotDefined : fn
    	}

    	function BufferBigIntNotDefined () {
    	  throw new Error('BigInt not supported')
    	}
    } (buffer));

    /**
     * Built on top of rlp library, removing the BN dependency for the flow.
     * Package : https://github.com/ethereumjs/rlp
     * RLP License : https://github.com/ethereumjs/rlp/blob/master/LICENSE
     *
     * ethereumjs/rlp is licensed under the
     * Mozilla Public License 2.0
     * Permissions of this weak copyleft license are conditioned on making available source code of licensed files and modifications of those files under the same license (or in certain cases, one of the GNU licenses). Copyright and license notices must be preserved. Contributors provide an express grant of patent rights. However, a larger work using the licensed work may be distributed under different terms and without source code for files added in the larger work.
     **/

    /**
     * @param input - will be converted to buffer
     * @returns returns buffer of encoded data
     **/

    function encode(input) {
      if (Array.isArray(input)) {
        var output = [];

        for (var i = 0; i < input.length; i++) {
          output.push(encode(input[i]));
        }

        var buf = buffer.Buffer.concat(output);
        return buffer.Buffer.concat([encodeLength(buf.length, 192), buf]);
      } else {
        var inputBuf = toBuffer(input);
        return inputBuf.length === 1 && inputBuf[0] < 128 ? inputBuf : buffer.Buffer.concat([encodeLength(inputBuf.length, 128), inputBuf]);
      }
    }

    function encodeLength(len, offset) {
      if (len < 56) {
        return buffer.Buffer.from([len + offset]);
      } else {
        var hexLength = intToHex(len);
        var lLength = hexLength.length / 2;
        var firstByte = intToHex(offset + 55 + lLength);
        return buffer.Buffer.from(firstByte + hexLength, "hex");
      }
    }
    /** Check if a string is prefixed by 0x */


    function isHexPrefixed(str) {
      return str.slice(0, 2) === "0x";
    }
    /** Removes 0x from a given String */


    function stripHexPrefix(str) {
      if (typeof str !== "string") {
        return str;
      }

      return isHexPrefixed(str) ? str.slice(2) : str;
    }
    /** Transform an integer into its hexadecimal value */


    function intToHex(integer) {
      if (integer < 0) {
        throw new Error("Invalid integer as argument, must be unsigned!");
      }

      var hex = integer.toString(16);
      return hex.length % 2 ? "0" + hex : hex;
    }
    /** Pad a string to be even */


    function padToEven(a) {
      return a.length % 2 ? "0" + a : a;
    }
    /** Transform an integer into a Buffer */


    function intToBuffer(integer) {
      var hex = intToHex(integer);
      return buffer.Buffer.from(hex, "hex");
    }
    /** Transform anything into a Buffer */


    function toBuffer(v) {
      if (!buffer.Buffer.isBuffer(v)) {
        if (typeof v === "string") {
          if (isHexPrefixed(v)) {
            return buffer.Buffer.from(padToEven(stripHexPrefix(v)), "hex");
          } else {
            return buffer.Buffer.from(v);
          }
        } else if (typeof v === "number") {
          if (!v) {
            return buffer.Buffer.from([]);
          } else {
            return intToBuffer(v);
          }
        } else if (v === null || v === undefined) {
          return buffer.Buffer.from([]);
        } else if (v instanceof Uint8Array) {
          return buffer.Buffer.from(v);
        } else {
          throw new Error("invalid type");
        }
      }

      return v;
    }

    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      Object.defineProperty(Constructor, "prototype", {
        writable: false
      });
      return Constructor;
    }

    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }

    function _setPrototypeOf(o, p) {
      _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) {
        o.__proto__ = p;
        return o;
      };
      return _setPrototypeOf(o, p);
    }

    function _inherits(subClass, superClass) {
      if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function");
      }

      subClass.prototype = Object.create(superClass && superClass.prototype, {
        constructor: {
          value: subClass,
          writable: true,
          configurable: true
        }
      });
      Object.defineProperty(subClass, "prototype", {
        writable: false
      });
      if (superClass) _setPrototypeOf(subClass, superClass);
    }

    function _getPrototypeOf(o) {
      _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) {
        return o.__proto__ || Object.getPrototypeOf(o);
      };
      return _getPrototypeOf(o);
    }

    function _isNativeReflectConstruct() {
      if (typeof Reflect === "undefined" || !Reflect.construct) return false;
      if (Reflect.construct.sham) return false;
      if (typeof Proxy === "function") return true;

      try {
        Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
        return true;
      } catch (e) {
        return false;
      }
    }

    function _assertThisInitialized(self) {
      if (self === void 0) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      }

      return self;
    }

    function _possibleConstructorReturn(self, call) {
      if (call && (_typeof(call) === "object" || typeof call === "function")) {
        return call;
      } else if (call !== void 0) {
        throw new TypeError("Derived constructors may only return object or undefined");
      }

      return _assertThisInitialized(self);
    }

    function _createSuper(Derived) {
      var hasNativeReflectConstruct = _isNativeReflectConstruct();
      return function _createSuperInternal() {
        var Super = _getPrototypeOf(Derived),
            result;

        if (hasNativeReflectConstruct) {
          var NewTarget = _getPrototypeOf(this).constructor;
          result = Reflect.construct(Super, arguments, NewTarget);
        } else {
          result = Super.apply(this, arguments);
        }

        return _possibleConstructorReturn(this, result);
      };
    }

    function _isNativeFunction(fn) {
      return Function.toString.call(fn).indexOf("[native code]") !== -1;
    }

    function _construct(Parent, args, Class) {
      if (_isNativeReflectConstruct()) {
        _construct = Reflect.construct.bind();
      } else {
        _construct = function _construct(Parent, args, Class) {
          var a = [null];
          a.push.apply(a, args);
          var Constructor = Function.bind.apply(Parent, a);
          var instance = new Constructor();
          if (Class) _setPrototypeOf(instance, Class.prototype);
          return instance;
        };
      }

      return _construct.apply(null, arguments);
    }

    function _wrapNativeSuper(Class) {
      var _cache = typeof Map === "function" ? new Map() : undefined;

      _wrapNativeSuper = function _wrapNativeSuper(Class) {
        if (Class === null || !_isNativeFunction(Class)) return Class;

        if (typeof Class !== "function") {
          throw new TypeError("Super expression must either be null or a function");
        }

        if (typeof _cache !== "undefined") {
          if (_cache.has(Class)) return _cache.get(Class);

          _cache.set(Class, Wrapper);
        }

        function Wrapper() {
          return _construct(Class, arguments, _getPrototypeOf(this).constructor);
        }

        Wrapper.prototype = Object.create(Class.prototype, {
          constructor: {
            value: Wrapper,
            enumerable: false,
            writable: true,
            configurable: true
          }
        });
        return _setPrototypeOf(Wrapper, Class);
      };

      return _wrapNativeSuper(Class);
    }

    var browser = {exports: {}};

    (function (module, exports) {

    	// ref: https://github.com/tc39/proposal-global
    	var getGlobal = function () {
    		// the only reliable means to get the global object is
    		// `Function('return this')()`
    		// However, this causes CSP violations in Chrome apps.
    		if (typeof self !== 'undefined') { return self; }
    		if (typeof window !== 'undefined') { return window; }
    		if (typeof global !== 'undefined') { return global; }
    		throw new Error('unable to locate global object');
    	};

    	var global = getGlobal();

    	module.exports = exports = global.fetch;

    	// Needed for TypeScript and Webpack.
    	if (global.fetch) {
    		exports.default = global.fetch.bind(global);
    	}

    	exports.Headers = global.Headers;
    	exports.Request = global.Request;
    	exports.Response = global.Response;
    } (browser, browser.exports));

    var fetchTransport = browser.exports;

    function sansPrefix(address) {
      if (address == null) return null;
      return address.replace(/^0x/, "").replace(/^Fx/, "");
    }
    function withPrefix$1(address) {
      if (address == null) return null;
      return "0x" + sansPrefix(address);
    }

    var HTTPRequestError = /*#__PURE__*/function (_Error) {
      _inherits(HTTPRequestError, _Error);

      var _super = _createSuper(HTTPRequestError);

      function HTTPRequestError(_ref) {
        var _this;

        var error = _ref.error,
            hostname = _ref.hostname,
            path = _ref.path,
            method = _ref.method,
            requestBody = _ref.requestBody,
            responseBody = _ref.responseBody,
            responseStatusText = _ref.responseStatusText,
            statusCode = _ref.statusCode;

        _classCallCheck(this, HTTPRequestError);

        var msg = "\n      HTTP Request Error: An error occurred when interacting with the Access API.\n      ".concat(error ? "error=".concat(error) : "", "\n      ").concat(hostname ? "hostname=".concat(hostname) : "", "\n      ").concat(path ? "path=".concat(path) : "", "\n      ").concat(method ? "method=".concat(method) : "", "\n      ").concat(requestBody ? "requestBody=".concat(requestBody) : "", "\n      ").concat(responseBody ? "responseBody=".concat(responseBody) : "", "\n      ").concat(responseStatusText ? "responseStatusText=".concat(responseStatusText) : "", "\n      ").concat(statusCode ? "statusCode=".concat(statusCode) : "", "\n    ");
        _this = _super.call(this, msg);
        _this.name = "HTTP Request Error";
        _this.statusCode = statusCode;
        _this.errorMessage = error;
        return _this;
      }

      return _createClass(HTTPRequestError);
    }( /*#__PURE__*/_wrapNativeSuper(Error));
    /**
     * Creates an HTTP Request to be sent to a REST Access API via Fetch API.
     *
     * @param {Object} options - Options for the HTTP Request
     * @param {String} options.hostname - Access API Hostname
     * @param {String} options.path - Path to the resource on the Access API
     * @param {String} options.method - HTTP Method
     * @param {Object} options.body - HTTP Request Body
     * @param {Object | Headers} [options.headers] - HTTP Request Headers
     *
     * @returns JSON object response from Access API.
     */


    function httpRequest(_x) {
      return _httpRequest.apply(this, arguments);
    }

    function _httpRequest() {
      _httpRequest = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee4(_ref2) {
        var hostname, path, method, body, headers, _ref2$retryLimit, retryLimit, _ref2$retryIntervalMs, retryIntervalMs, bodyJSON, makeRequest, requestLoop, _requestLoop;

        return regenerator.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _requestLoop = function _requestLoop3() {
                  _requestLoop = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee3() {
                    var retryAttempt,
                        resp,
                        retryStatusCodes,
                        _args3 = arguments;
                    return regenerator.wrap(function _callee3$(_context3) {
                      while (1) {
                        switch (_context3.prev = _context3.next) {
                          case 0:
                            retryAttempt = _args3.length > 0 && _args3[0] !== undefined ? _args3[0] : 0;
                            _context3.prev = 1;
                            _context3.next = 4;
                            return makeRequest();

                          case 4:
                            resp = _context3.sent;
                            return _context3.abrupt("return", resp);

                          case 8:
                            _context3.prev = 8;
                            _context3.t0 = _context3["catch"](1);
                            retryStatusCodes = [408, 429, 500, 502, 503, 504];

                            if (!retryStatusCodes.includes(_context3.t0.statusCode)) {
                              _context3.next = 17;
                              break;
                            }

                            _context3.next = 14;
                            return new Promise(function (resolve, reject) {
                              if (retryAttempt < retryLimit) {
                                console.warn("Access node unavailable, retrying in ".concat(retryIntervalMs, " ms..."));
                                setTimeout(function () {
                                  resolve(requestLoop(retryAttempt + 1));
                                }, retryIntervalMs);
                              } else {
                                reject(_context3.t0);
                              }
                            });

                          case 14:
                            return _context3.abrupt("return", _context3.sent);

                          case 17:
                            throw _context3.t0;

                          case 18:
                          case "end":
                            return _context3.stop();
                        }
                      }
                    }, _callee3, null, [[1, 8]]);
                  }));
                  return _requestLoop.apply(this, arguments);
                };

                requestLoop = function _requestLoop2() {
                  return _requestLoop.apply(this, arguments);
                };

                makeRequest = function _makeRequest() {
                  return fetchTransport("".concat(hostname).concat(path), {
                    method: method,
                    body: bodyJSON,
                    headers: headers
                  }).then( /*#__PURE__*/function () {
                    var _ref3 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(res) {
                      var responseText, response;
                      return regenerator.wrap(function _callee$(_context) {
                        while (1) {
                          switch (_context.prev = _context.next) {
                            case 0:
                              if (!res.ok) {
                                _context.next = 2;
                                break;
                              }

                              return _context.abrupt("return", res.json());

                            case 2:
                              if (!res.body) {
                                _context.next = 8;
                                break;
                              }

                              _context.next = 5;
                              return res.text();

                            case 5:
                              _context.t0 = _context.sent;
                              _context.next = 9;
                              break;

                            case 8:
                              _context.t0 = null;

                            case 9:
                              responseText = _context.t0;
                              response = safeParseJSON(responseText);
                              throw new HTTPRequestError({
                                error: response === null || response === void 0 ? void 0 : response.message,
                                hostname: hostname,
                                path: path,
                                method: method,
                                requestBody: bodyJSON,
                                responseBody: responseText,
                                responseStatusText: res.statusText,
                                statusCode: res.status
                              });

                            case 12:
                            case "end":
                              return _context.stop();
                          }
                        }
                      }, _callee);
                    }));

                    return function (_x2) {
                      return _ref3.apply(this, arguments);
                    };
                  }())["catch"]( /*#__PURE__*/function () {
                    var _ref4 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2(e) {
                      return regenerator.wrap(function _callee2$(_context2) {
                        while (1) {
                          switch (_context2.prev = _context2.next) {
                            case 0:
                              if (!(e instanceof HTTPRequestError)) {
                                _context2.next = 2;
                                break;
                              }

                              throw e;

                            case 2:
                              _context2.next = 4;
                              return log$2({
                                title: "Access Node Error",
                                message: "The provided access node ".concat(hostname, " does not appear to be a valid REST/HTTP access node.\nPlease verify that you are not unintentionally using a GRPC access node.\nSee more here: https://docs.onflow.org/fcl/reference/sdk-guidelines/#connect"),
                                level: LEVELS$2.error
                              });

                            case 4:
                              throw new HTTPRequestError({
                                error: e === null || e === void 0 ? void 0 : e.message,
                                hostname: hostname,
                                path: path,
                                method: method,
                                requestBody: bodyJSON
                              });

                            case 5:
                            case "end":
                              return _context2.stop();
                          }
                        }
                      }, _callee2);
                    }));

                    return function (_x3) {
                      return _ref4.apply(this, arguments);
                    };
                  }());
                };

                hostname = _ref2.hostname, path = _ref2.path, method = _ref2.method, body = _ref2.body, headers = _ref2.headers, _ref2$retryLimit = _ref2.retryLimit, retryLimit = _ref2$retryLimit === void 0 ? 5 : _ref2$retryLimit, _ref2$retryIntervalMs = _ref2.retryIntervalMs, retryIntervalMs = _ref2$retryIntervalMs === void 0 ? 1000 : _ref2$retryIntervalMs;
                bodyJSON = body ? JSON.stringify(body) : null;
                _context4.next = 7;
                return requestLoop();

              case 7:
                return _context4.abrupt("return", _context4.sent);

              case 8:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4);
      }));
      return _httpRequest.apply(this, arguments);
    }

    function safeParseJSON(data) {
      try {
        return JSON.parse(data);
      } catch (_unused) {
        return null;
      }
    }

    function sendExecuteScriptAtBlockIDRequest(_x, _x2, _x3) {
      return _sendExecuteScriptAtBlockIDRequest.apply(this, arguments);
    }

    function _sendExecuteScriptAtBlockIDRequest() {
      _sendExecuteScriptAtBlockIDRequest = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(ix, context, opts) {
        var httpRequest$1, res;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                httpRequest$1 = opts.httpRequest || httpRequest;
                _context.next = 3;
                return httpRequest$1({
                  hostname: opts.node,
                  path: "/v1/scripts?block_id=".concat(ix.block.id),
                  method: "POST",
                  body: {
                    script: context.Buffer.from(ix.message.cadence).toString("base64"),
                    arguments: ix.message.arguments.map(function (arg) {
                      return context.Buffer.from(JSON.stringify(ix.arguments[arg].asArgument)).toString("base64");
                    })
                  }
                });

              case 3:
                res = _context.sent;
                return _context.abrupt("return", constructResponse$4(ix, context, res));

              case 5:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _sendExecuteScriptAtBlockIDRequest.apply(this, arguments);
    }

    function sendExecuteScriptAtBlockHeightRequest(_x4, _x5, _x6) {
      return _sendExecuteScriptAtBlockHeightRequest.apply(this, arguments);
    }

    function _sendExecuteScriptAtBlockHeightRequest() {
      _sendExecuteScriptAtBlockHeightRequest = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2(ix, context, opts) {
        var httpRequest$1, res;
        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                httpRequest$1 = opts.httpRequest || httpRequest;
                _context2.next = 3;
                return httpRequest$1({
                  hostname: opts.node,
                  path: "/v1/scripts?block_height=".concat(ix.block.height),
                  method: "POST",
                  body: {
                    script: context.Buffer.from(ix.message.cadence).toString("base64"),
                    arguments: ix.message.arguments.map(function (arg) {
                      return context.Buffer.from(JSON.stringify(ix.arguments[arg].asArgument)).toString("base64");
                    })
                  }
                });

              case 3:
                res = _context2.sent;
                return _context2.abrupt("return", constructResponse$4(ix, context, res));

              case 5:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));
      return _sendExecuteScriptAtBlockHeightRequest.apply(this, arguments);
    }

    function sendExecuteScriptAtLatestBlockRequest(_x7, _x8, _x9) {
      return _sendExecuteScriptAtLatestBlockRequest.apply(this, arguments);
    }

    function _sendExecuteScriptAtLatestBlockRequest() {
      _sendExecuteScriptAtLatestBlockRequest = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee3(ix, context, opts) {
        var httpRequest$1, res;
        return regenerator.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                httpRequest$1 = opts.httpRequest || httpRequest;
                _context3.next = 3;
                return httpRequest$1({
                  hostname: opts.node,
                  path: "/v1/scripts?block_height=sealed",
                  method: "POST",
                  body: {
                    script: context.Buffer.from(ix.message.cadence).toString("base64"),
                    arguments: ix.message.arguments.map(function (arg) {
                      return context.Buffer.from(JSON.stringify(ix.arguments[arg].asArgument)).toString("base64");
                    })
                  }
                });

              case 3:
                res = _context3.sent;
                return _context3.abrupt("return", constructResponse$4(ix, context, res));

              case 5:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3);
      }));
      return _sendExecuteScriptAtLatestBlockRequest.apply(this, arguments);
    }

    function constructResponse$4(ix, context, res) {
      var ret = context.response();
      ret.tag = ix.tag;
      ret.encodedData = JSON.parse(context.Buffer.from(res, "base64").toString());
      return ret;
    }

    function sendExecuteScript(_x10) {
      return _sendExecuteScript.apply(this, arguments);
    }

    function _sendExecuteScript() {
      _sendExecuteScript = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee4(ix) {
        var context,
            opts,
            _args4 = arguments;
        return regenerator.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                context = _args4.length > 1 && _args4[1] !== undefined ? _args4[1] : {};
                opts = _args4.length > 2 && _args4[2] !== undefined ? _args4[2] : {};
                invariant$1(opts.node, "SDK Send Execute Script Error: opts.node must be defined.");
                invariant$1(context.response, "SDK Send Execute Script Error: context.response must be defined.");
                invariant$1(context.Buffer, "SDK Send Execute Script Error: context.Buffer must be defined.");
                _context4.next = 7;
                return ix;

              case 7:
                ix = _context4.sent;

                if (!ix.block.id) {
                  _context4.next = 14;
                  break;
                }

                _context4.next = 11;
                return sendExecuteScriptAtBlockIDRequest(ix, context, opts);

              case 11:
                return _context4.abrupt("return", _context4.sent);

              case 14:
                if (!ix.block.height) {
                  _context4.next = 20;
                  break;
                }

                _context4.next = 17;
                return sendExecuteScriptAtBlockHeightRequest(ix, context, opts);

              case 17:
                return _context4.abrupt("return", _context4.sent);

              case 20:
                _context4.next = 22;
                return sendExecuteScriptAtLatestBlockRequest(ix, context, opts);

              case 22:
                return _context4.abrupt("return", _context4.sent);

              case 23:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4);
      }));
      return _sendExecuteScript.apply(this, arguments);
    }

    var HashAlgorithmIDs = {
      SHA2_256: 1,
      SHA2_384: 2,
      SHA3_256: 3,
      SHA3_384: 4,
      KMAC128_BLS_BLS12_381: 5
    };
    var SignatureAlgorithmIDs = {
      ECDSA_P256: 1,
      ECDSA_secp256k1: 2,
      BLS_BLS12_381: 3
    };

    function sendGetAccountAtBlockHeightRequest(_x, _x2, _x3) {
      return _sendGetAccountAtBlockHeightRequest.apply(this, arguments);
    }

    function _sendGetAccountAtBlockHeightRequest() {
      _sendGetAccountAtBlockHeightRequest = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(ix, context, opts) {
        var httpRequest$1, res;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                httpRequest$1 = opts.httpRequest || httpRequest;
                _context.next = 3;
                return httpRequest$1({
                  hostname: opts.node,
                  path: "/v1/accounts/".concat(ix.account.addr, "?block_height=").concat(ix.block.height, "&expand=contracts,keys"),
                  method: "GET",
                  body: null
                });

              case 3:
                res = _context.sent;
                return _context.abrupt("return", constructResponse$3(ix, context, res));

              case 5:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _sendGetAccountAtBlockHeightRequest.apply(this, arguments);
    }

    function sendGetAccountAtLatestBlockRequest(_x4, _x5, _x6) {
      return _sendGetAccountAtLatestBlockRequest.apply(this, arguments);
    }

    function _sendGetAccountAtLatestBlockRequest() {
      _sendGetAccountAtLatestBlockRequest = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2(ix, context, opts) {
        var httpRequest$1, res;
        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                httpRequest$1 = opts.httpRequest || httpRequest;
                _context2.next = 3;
                return httpRequest$1({
                  hostname: opts.node,
                  path: "/v1/accounts/".concat(ix.account.addr, "?block_height=sealed&expand=contracts,keys"),
                  method: "GET",
                  body: null
                });

              case 3:
                res = _context2.sent;
                return _context2.abrupt("return", constructResponse$3(ix, context, res));

              case 5:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));
      return _sendGetAccountAtLatestBlockRequest.apply(this, arguments);
    }

    function constructResponse$3(ix, context, res) {
      var _res$keys$map, _res$keys;

      var ret = context.response();
      ret.tag = ix.tag;

      var unwrapContracts = function unwrapContracts(contracts) {
        var c = {};
        if (!contracts) return c;

        for (var _i = 0, _Object$keys = Object.keys(contracts); _i < _Object$keys.length; _i++) {
          var key = _Object$keys[_i];
          c[key] = context.Buffer.from(contracts[key], "base64").toString();
        }

        return c;
      };

      ret.account = {
        address: res.address,
        balance: Number(res.balance),
        code: "",
        contracts: unwrapContracts(res.contracts),
        keys: (_res$keys$map = (_res$keys = res.keys) === null || _res$keys === void 0 ? void 0 : _res$keys.map(function (key) {
          return {
            index: Number(key.index),
            publicKey: key.public_key.replace(/^0x/, ""),
            signAlgo: SignatureAlgorithmIDs[key.signing_algorithm],
            signAlgoString: key.signing_algorithm,
            hashAlgo: HashAlgorithmIDs[key.hashing_algorithm],
            hashAlgoString: key.hashing_algorithm,
            sequenceNumber: Number(key.sequence_number),
            weight: Number(key.weight),
            revoked: key.revoked
          };
        })) !== null && _res$keys$map !== void 0 ? _res$keys$map : []
      };
      return ret;
    }

    function sendGetAccount(_x7) {
      return _sendGetAccount.apply(this, arguments);
    }

    function _sendGetAccount() {
      _sendGetAccount = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee3(ix) {
        var context,
            opts,
            _args3 = arguments;
        return regenerator.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                context = _args3.length > 1 && _args3[1] !== undefined ? _args3[1] : {};
                opts = _args3.length > 2 && _args3[2] !== undefined ? _args3[2] : {};
                invariant$1(opts.node, "SDK Send Get Account Error: opts.node must be defined.");
                invariant$1(context.response, "SDK Send Get Account Error: context.response must be defined.");
                invariant$1(context.Buffer, "SDK Send Get Account Error: context.Buffer must be defined.");
                _context3.next = 7;
                return ix;

              case 7:
                ix = _context3.sent;

                if (!(ix.block.height !== null)) {
                  _context3.next = 14;
                  break;
                }

                _context3.next = 11;
                return sendGetAccountAtBlockHeightRequest(ix, context, opts);

              case 11:
                return _context3.abrupt("return", _context3.sent);

              case 14:
                _context3.next = 16;
                return sendGetAccountAtLatestBlockRequest(ix, context, opts);

              case 16:
                return _context3.abrupt("return", _context3.sent);

              case 17:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3);
      }));
      return _sendGetAccount.apply(this, arguments);
    }

    function sendGetBlockHeaderByIDRequest(_x, _x2, _x3) {
      return _sendGetBlockHeaderByIDRequest.apply(this, arguments);
    }

    function _sendGetBlockHeaderByIDRequest() {
      _sendGetBlockHeaderByIDRequest = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(ix, context, opts) {
        var httpRequest$1, res;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                httpRequest$1 = opts.httpRequest || httpRequest;
                _context.next = 3;
                return httpRequest$1({
                  hostname: opts.node,
                  path: "/v1/blocks/".concat(ix.block.id),
                  method: "GET",
                  body: null
                });

              case 3:
                res = _context.sent;
                return _context.abrupt("return", constructResponse$2(ix, context, res));

              case 5:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _sendGetBlockHeaderByIDRequest.apply(this, arguments);
    }

    function sendGetBlockHeaderByHeightRequest(_x4, _x5, _x6) {
      return _sendGetBlockHeaderByHeightRequest.apply(this, arguments);
    }

    function _sendGetBlockHeaderByHeightRequest() {
      _sendGetBlockHeaderByHeightRequest = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2(ix, context, opts) {
        var httpRequest$1, res;
        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                httpRequest$1 = opts.httpRequest || httpRequest;
                _context2.next = 3;
                return httpRequest$1({
                  hostname: opts.node,
                  path: "/v1/blocks?height=".concat(ix.block.height),
                  method: "GET",
                  body: null
                });

              case 3:
                res = _context2.sent;
                return _context2.abrupt("return", constructResponse$2(ix, context, res));

              case 5:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));
      return _sendGetBlockHeaderByHeightRequest.apply(this, arguments);
    }

    function sendGetLatestBlockHeaderRequest(_x7, _x8, _x9) {
      return _sendGetLatestBlockHeaderRequest.apply(this, arguments);
    }

    function _sendGetLatestBlockHeaderRequest() {
      _sendGetLatestBlockHeaderRequest = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee3(ix, context, opts) {
        var _ix$block;

        var httpRequest$1, height, res;
        return regenerator.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                httpRequest$1 = opts.httpRequest || httpRequest;
                height = (_ix$block = ix.block) !== null && _ix$block !== void 0 && _ix$block.isSealed ? "sealed" : "finalized";
                _context3.next = 4;
                return httpRequest$1({
                  hostname: opts.node,
                  path: "/v1/blocks?height=".concat(height),
                  method: "GET",
                  body: null
                });

              case 4:
                res = _context3.sent;
                return _context3.abrupt("return", constructResponse$2(ix, context, res));

              case 6:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3);
      }));
      return _sendGetLatestBlockHeaderRequest.apply(this, arguments);
    }

    function constructResponse$2(ix, context, res) {
      var block = res.length ? res[0] : null;
      var ret = context.response();
      ret.tag = ix.tag;
      ret.blockHeader = {
        id: block.header.id,
        parentId: block.header.parent_id,
        height: Number(block.header.height),
        timestamp: block.header.timestamp
      };
      return ret;
    }

    function sendGetBlockHeader(_x10) {
      return _sendGetBlockHeader.apply(this, arguments);
    }

    function _sendGetBlockHeader() {
      _sendGetBlockHeader = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee4(ix) {
        var context,
            opts,
            interactionHasBlockID,
            interactionHasBlockHeight,
            _args4 = arguments;
        return regenerator.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                context = _args4.length > 1 && _args4[1] !== undefined ? _args4[1] : {};
                opts = _args4.length > 2 && _args4[2] !== undefined ? _args4[2] : {};
                invariant$1(opts.node, "SDK Send Get Block Header Error: opts.node must be defined.");
                invariant$1(context.response, "SDK Send Get Block Header Error: context.response must be defined.");
                _context4.next = 6;
                return ix;

              case 6:
                ix = _context4.sent;
                interactionHasBlockID = ix.block.id !== null;
                interactionHasBlockHeight = ix.block.height !== null;

                if (!interactionHasBlockID) {
                  _context4.next = 15;
                  break;
                }

                _context4.next = 12;
                return sendGetBlockHeaderByIDRequest(ix, context, opts);

              case 12:
                return _context4.abrupt("return", _context4.sent);

              case 15:
                if (!interactionHasBlockHeight) {
                  _context4.next = 21;
                  break;
                }

                _context4.next = 18;
                return sendGetBlockHeaderByHeightRequest(ix, context, opts);

              case 18:
                return _context4.abrupt("return", _context4.sent);

              case 21:
                _context4.next = 23;
                return sendGetLatestBlockHeaderRequest(ix, context, opts);

              case 23:
                return _context4.abrupt("return", _context4.sent);

              case 24:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4);
      }));
      return _sendGetBlockHeader.apply(this, arguments);
    }

    function sendGetBlockByIDRequest(_x, _x2, _x3) {
      return _sendGetBlockByIDRequest.apply(this, arguments);
    }

    function _sendGetBlockByIDRequest() {
      _sendGetBlockByIDRequest = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(ix, context, opts) {
        var httpRequest$1, res;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                httpRequest$1 = opts.httpRequest || httpRequest;
                _context.next = 3;
                return httpRequest$1({
                  hostname: opts.node,
                  path: "/v1/blocks/".concat(ix.block.id, "?expand=payload"),
                  method: "GET",
                  body: null
                });

              case 3:
                res = _context.sent;
                return _context.abrupt("return", constructResponse$1(ix, context, res));

              case 5:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _sendGetBlockByIDRequest.apply(this, arguments);
    }

    function sendGetBlockByHeightRequest(_x4, _x5, _x6) {
      return _sendGetBlockByHeightRequest.apply(this, arguments);
    }

    function _sendGetBlockByHeightRequest() {
      _sendGetBlockByHeightRequest = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2(ix, context, opts) {
        var httpRequest$1, res;
        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                httpRequest$1 = opts.httpRequest || httpRequest;
                _context2.next = 3;
                return httpRequest$1({
                  hostname: opts.node,
                  path: "/v1/blocks?height=".concat(ix.block.height, "&expand=payload"),
                  method: "GET",
                  body: null
                });

              case 3:
                res = _context2.sent;
                return _context2.abrupt("return", constructResponse$1(ix, context, res));

              case 5:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));
      return _sendGetBlockByHeightRequest.apply(this, arguments);
    }

    function sendGetBlockRequest(_x7, _x8, _x9) {
      return _sendGetBlockRequest.apply(this, arguments);
    }

    function _sendGetBlockRequest() {
      _sendGetBlockRequest = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee3(ix, context, opts) {
        var _ix$block;

        var httpRequest$1, height, res;
        return regenerator.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                httpRequest$1 = opts.httpRequest || httpRequest;
                height = (_ix$block = ix.block) !== null && _ix$block !== void 0 && _ix$block.isSealed ? "sealed" : "final";
                _context3.next = 4;
                return httpRequest$1({
                  hostname: opts.node,
                  path: "/v1/blocks?height=".concat(height, "&expand=payload"),
                  method: "GET",
                  body: null
                });

              case 4:
                res = _context3.sent;
                return _context3.abrupt("return", constructResponse$1(ix, context, res));

              case 6:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3);
      }));
      return _sendGetBlockRequest.apply(this, arguments);
    }

    function constructResponse$1(ix, context, res) {
      var block = res.length ? res[0] : null;
      var ret = context.response();
      ret.tag = ix.tag;
      ret.block = {
        id: block.header.id,
        parentId: block.header.parent_id,
        height: Number(block.header.height),
        timestamp: block.header.timestamp,
        collectionGuarantees: block.payload.collection_guarantees.map(function (collectionGuarantee) {
          return {
            collectionId: collectionGuarantee.collection_id,
            signerIds: collectionGuarantee.signer_ids
          };
        }),
        blockSeals: block.payload.block_seals.map(function (blockSeal) {
          return {
            blockId: blockSeal.block_id,
            executionReceiptId: blockSeal.result_id
          };
        })
      };
      return ret;
    }

    function sendGetBlock(_x10) {
      return _sendGetBlock.apply(this, arguments);
    }

    function _sendGetBlock() {
      _sendGetBlock = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee4(ix) {
        var context,
            opts,
            interactionHasBlockID,
            interactionHasBlockHeight,
            _args4 = arguments;
        return regenerator.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                context = _args4.length > 1 && _args4[1] !== undefined ? _args4[1] : {};
                opts = _args4.length > 2 && _args4[2] !== undefined ? _args4[2] : {};
                invariant$1(opts.node, "SDK Send Get Block Error: opts.node must be defined.");
                invariant$1(context.response, "SDK Send Get Block Error: context.response must be defined.");
                _context4.next = 6;
                return ix;

              case 6:
                ix = _context4.sent;
                interactionHasBlockID = ix.block.id !== null;
                interactionHasBlockHeight = ix.block.height !== null;

                if (!interactionHasBlockID) {
                  _context4.next = 15;
                  break;
                }

                _context4.next = 12;
                return sendGetBlockByIDRequest(ix, context, opts);

              case 12:
                return _context4.abrupt("return", _context4.sent);

              case 15:
                if (!interactionHasBlockHeight) {
                  _context4.next = 21;
                  break;
                }

                _context4.next = 18;
                return sendGetBlockByHeightRequest(ix, context, opts);

              case 18:
                return _context4.abrupt("return", _context4.sent);

              case 21:
                _context4.next = 23;
                return sendGetBlockRequest(ix, context, opts);

              case 23:
                return _context4.abrupt("return", _context4.sent);

              case 24:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4);
      }));
      return _sendGetBlock.apply(this, arguments);
    }

    function sendGetCollection(_x) {
      return _sendGetCollection.apply(this, arguments);
    }

    function _sendGetCollection() {
      _sendGetCollection = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(ix) {
        var context,
            opts,
            httpRequest$1,
            res,
            ret,
            _args = arguments;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                context = _args.length > 1 && _args[1] !== undefined ? _args[1] : {};
                opts = _args.length > 2 && _args[2] !== undefined ? _args[2] : {};
                invariant$1(opts.node, "SDK Send Get Collection Error: opts.node must be defined.");
                invariant$1(context.response, "SDK Send Get Collection Error: context.response must be defined.");
                httpRequest$1 = opts.httpRequest || httpRequest;
                _context.next = 7;
                return httpRequest$1({
                  hostname: opts.node,
                  path: "/v1/collections/".concat(ix.collection.id, "?expand=transactions"),
                  method: "GET",
                  body: null
                });

              case 7:
                res = _context.sent;
                ret = context.response();
                ret.tag = ix.tag;
                ret.collection = {
                  id: res.id,
                  transactionIds: res.transactions.map(function (transaction) {
                    return transaction.id;
                  })
                };
                return _context.abrupt("return", ret);

              case 12:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _sendGetCollection.apply(this, arguments);
    }

    function sendGetEventsForHeightRangeRequest(_x, _x2, _x3) {
      return _sendGetEventsForHeightRangeRequest.apply(this, arguments);
    }

    function _sendGetEventsForHeightRangeRequest() {
      _sendGetEventsForHeightRangeRequest = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(ix, context, opts) {
        var httpRequest$1, res;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                httpRequest$1 = opts.httpRequest || httpRequest;
                _context.next = 3;
                return httpRequest$1({
                  hostname: opts.node,
                  path: "/v1/events?type=".concat(ix.events.eventType, "&start_height=").concat(ix.events.start, "&end_height=").concat(ix.events.end),
                  method: "GET",
                  body: null
                });

              case 3:
                res = _context.sent;
                return _context.abrupt("return", constructResponse(ix, context, res));

              case 5:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _sendGetEventsForHeightRangeRequest.apply(this, arguments);
    }

    function sendGetEventsForBlockIDsRequest(_x4, _x5, _x6) {
      return _sendGetEventsForBlockIDsRequest.apply(this, arguments);
    }

    function _sendGetEventsForBlockIDsRequest() {
      _sendGetEventsForBlockIDsRequest = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2(ix, context, opts) {
        var httpRequest$1, res;
        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                httpRequest$1 = opts.httpRequest || httpRequest;
                _context2.next = 3;
                return httpRequest$1({
                  hostname: opts.node,
                  path: "/v1/events?type=".concat(ix.events.eventType, "&block_ids=").concat(ix.events.blockIds.join(",")),
                  method: "GET",
                  body: null
                });

              case 3:
                res = _context2.sent;
                return _context2.abrupt("return", constructResponse(ix, context, res));

              case 5:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));
      return _sendGetEventsForBlockIDsRequest.apply(this, arguments);
    }

    function constructResponse(ix, context, res) {
      var ret = context.response();
      ret.tag = ix.tag;
      ret.events = [];
      res.forEach(function (block) {
        return block.events ? block.events.forEach(function (event) {
          return ret.events.push({
            blockId: block.block_id,
            blockHeight: Number(block.block_height),
            blockTimestamp: block.block_timestamp,
            type: event.type,
            transactionId: event.transaction_id,
            transactionIndex: Number(event.transaction_index),
            eventIndex: Number(event.event_index),
            payload: JSON.parse(context.Buffer.from(event.payload, "base64").toString())
          });
        }) : null;
      });
      return ret;
    }

    function sendGetEvents(_x7) {
      return _sendGetEvents.apply(this, arguments);
    }

    function _sendGetEvents() {
      _sendGetEvents = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee3(ix) {
        var context,
            opts,
            interactionContainsBlockHeightRange,
            interactionContainsBlockIDsList,
            _args3 = arguments;
        return regenerator.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                context = _args3.length > 1 && _args3[1] !== undefined ? _args3[1] : {};
                opts = _args3.length > 2 && _args3[2] !== undefined ? _args3[2] : {};
                invariant$1(opts.node, "SDK Send Get Events Error: opts.node must be defined.");
                invariant$1(context.response, "SDK Send Get Events Error: context.response must be defined.");
                invariant$1(context.Buffer, "SDK Send Get Events Error: context.Buffer must be defined.");
                _context3.next = 7;
                return ix;

              case 7:
                ix = _context3.sent;
                interactionContainsBlockHeightRange = ix.events.start !== null;
                interactionContainsBlockIDsList = Array.isArray(ix.events.blockIds) && ix.events.blockIds.length > 0;
                invariant$1(interactionContainsBlockHeightRange || interactionContainsBlockIDsList, "SendGetEventsError: Unable to determine which get events request to send. Either a block height range, or block IDs must be specified.");

                if (!interactionContainsBlockHeightRange) {
                  _context3.next = 17;
                  break;
                }

                _context3.next = 14;
                return sendGetEventsForHeightRangeRequest(ix, context, opts);

              case 14:
                return _context3.abrupt("return", _context3.sent);

              case 17:
                _context3.next = 19;
                return sendGetEventsForBlockIDsRequest(ix, context, opts);

              case 19:
                return _context3.abrupt("return", _context3.sent);

              case 20:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3);
      }));
      return _sendGetEvents.apply(this, arguments);
    }

    function sendGetTransaction(_x) {
      return _sendGetTransaction.apply(this, arguments);
    }

    function _sendGetTransaction() {
      _sendGetTransaction = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(ix) {
        var context,
            opts,
            httpRequest$1,
            res,
            unwrapKey,
            unwrapSignature,
            unwrapArg,
            ret,
            _args = arguments;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                context = _args.length > 1 && _args[1] !== undefined ? _args[1] : {};
                opts = _args.length > 2 && _args[2] !== undefined ? _args[2] : {};
                invariant$1(opts.node, "SDK Send Get Transaction Error: opts.node must be defined.");
                invariant$1(context.response, "SDK Send Get Transaction Error: context.response must be defined.");
                invariant$1(context.Buffer, "SDK Send Get Transaction Error: context.Buffer must be defined.");
                httpRequest$1 = opts.httpRequest || httpRequest;
                _context.next = 8;
                return ix;

              case 8:
                ix = _context.sent;
                _context.next = 11;
                return httpRequest$1({
                  hostname: opts.node,
                  path: "/v1/transactions/".concat(ix.transaction.id),
                  method: "GET",
                  body: null
                });

              case 11:
                res = _context.sent;

                unwrapKey = function unwrapKey(key) {
                  return {
                    address: key.address,
                    keyId: Number(key.key_id),
                    sequenceNumber: Number(key.sequence_number)
                  };
                };

                unwrapSignature = function unwrapSignature(sig) {
                  return {
                    address: sig.address,
                    keyId: Number(sig.key_index),
                    signature: sig.signature
                  };
                };

                unwrapArg = function unwrapArg(arg) {
                  return JSON.parse(context.Buffer.from(arg, "base64").toString());
                };

                ret = context.response();
                ret.tag = ix.tag;
                ret.transaction = {
                  script: context.Buffer.from(res.script, "base64").toString(),
                  args: _toConsumableArray(res.arguments.map(unwrapArg)),
                  referenceBlockId: res.reference_block_id,
                  gasLimit: Number(res.gas_limit),
                  payer: res.payer,
                  proposalKey: res.proposal_key ? unwrapKey(res.proposal_key) : res.proposal_key,
                  authorizers: res.authorizers,
                  payloadSignatures: _toConsumableArray(res.payload_signatures.map(unwrapSignature)),
                  envelopeSignatures: _toConsumableArray(res.envelope_signatures.map(unwrapSignature))
                };
                return _context.abrupt("return", ret);

              case 19:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _sendGetTransaction.apply(this, arguments);
    }

    var STATUS_MAP = {
      UNKNOWN: 0,
      PENDING: 1,
      FINALIZED: 2,
      EXECUTED: 3,
      SEALED: 4,
      EXPIRED: 5
    };
    function sendGetTransactionStatus(_x) {
      return _sendGetTransactionStatus.apply(this, arguments);
    }

    function _sendGetTransactionStatus() {
      _sendGetTransactionStatus = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(ix) {
        var context,
            opts,
            httpRequest$1,
            res,
            ret,
            _args = arguments;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                context = _args.length > 1 && _args[1] !== undefined ? _args[1] : {};
                opts = _args.length > 2 && _args[2] !== undefined ? _args[2] : {};
                invariant$1(opts.node, "SDK Send Get Transaction Status Error: opts.node must be defined.");
                invariant$1(context.response, "SDK Send Get Transaction Status Error: context.response must be defined.");
                invariant$1(context.Buffer, "SDK Send Get Transaction Status Error: context.Buffer must be defined.");
                httpRequest$1 = opts.httpRequest || httpRequest;
                _context.next = 8;
                return ix;

              case 8:
                ix = _context.sent;
                _context.next = 11;
                return httpRequest$1({
                  hostname: opts.node,
                  path: "/v1/transaction_results/".concat(ix.transaction.id),
                  method: "GET",
                  body: null
                });

              case 11:
                res = _context.sent;
                ret = context.response();
                ret.tag = ix.tag;
                ret.transactionStatus = {
                  blockId: res.block_id,
                  status: STATUS_MAP[res.status.toUpperCase()] || "",
                  statusString: res.status.toUpperCase(),
                  statusCode: res.status_code,
                  errorMessage: res.error_message,
                  events: res.events.map(function (event) {
                    return {
                      type: event.type,
                      transactionId: event.transaction_id,
                      transactionIndex: Number(event.transaction_index),
                      eventIndex: Number(event.event_index),
                      payload: JSON.parse(context.Buffer.from(event.payload, "base64").toString())
                    };
                  })
                };
                return _context.abrupt("return", ret);

              case 16:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _sendGetTransactionStatus.apply(this, arguments);
    }

    function sendPing(_x) {
      return _sendPing.apply(this, arguments);
    }

    function _sendPing() {
      _sendPing = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(ix) {
        var context,
            opts,
            httpRequest$1,
            ret,
            _args = arguments;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                context = _args.length > 1 && _args[1] !== undefined ? _args[1] : {};
                opts = _args.length > 2 && _args[2] !== undefined ? _args[2] : {};
                invariant$1(opts.node, "SDK Send Ping Error: opts.node must be defined.");
                invariant$1(context.response, "SDK Send Ping Error: context.response must be defined.");
                httpRequest$1 = opts.httpRequest || httpRequest;
                _context.next = 7;
                return httpRequest$1({
                  hostname: opts.node,
                  path: "/v1/blocks?height=sealed",
                  method: "GET",
                  body: null
                });

              case 7:
                ret = context.response();
                ret.tag = ix.tag;
                return _context.abrupt("return", ret);

              case 10:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _sendPing.apply(this, arguments);
    }

    var idof = function idof(acct) {
      return "".concat(withPrefix(acct.addr), "-").concat(acct.keyId);
    };

    function sendTransaction(_x) {
      return _sendTransaction.apply(this, arguments);
    }

    function _sendTransaction() {
      _sendTransaction = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(ix) {
        var context,
            opts,
            httpRequest$1,
            payloadSignatures,
            _i,
            _Object$values,
            acct,
            envelopeSignatures,
            _i2,
            _Object$values2,
            _acct,
            id,
            t1,
            res,
            t2,
            ret,
            _args = arguments;

        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                context = _args.length > 1 && _args[1] !== undefined ? _args[1] : {};
                opts = _args.length > 2 && _args[2] !== undefined ? _args[2] : {};
                invariant$1(opts.node, "SDK Send Transaction Error: opts.node must be defined.");
                invariant$1(context.response, "SDK Send Transaction Error: context.response must be defined.");
                invariant$1(context.Buffer, "SDK Send Transaction Error: context.Buffer must be defined.");
                httpRequest$1 = opts.httpRequest || httpRequest;
                _context.next = 8;
                return ix;

              case 8:
                ix = _context.sent;
                // Apply Non Payer Signatures to Payload Signatures
                payloadSignatures = [];
                _i = 0, _Object$values = Object.values(ix.accounts);

              case 11:
                if (!(_i < _Object$values.length)) {
                  _context.next = 24;
                  break;
                }

                acct = _Object$values[_i];
                _context.prev = 13;

                if (!acct.role.payer && acct.signature != null) {
                  payloadSignatures.push({
                    address: sansPrefix(acct.addr),
                    key_index: String(acct.keyId),
                    signature: context.Buffer.from(acct.signature, "hex").toString("base64")
                  });
                }

                _context.next = 21;
                break;

              case 17:
                _context.prev = 17;
                _context.t0 = _context["catch"](13);
                console.error("SDK HTTP Send Error: Trouble applying payload signature", {
                  acct: acct,
                  ix: ix
                });
                throw _context.t0;

              case 21:
                _i++;
                _context.next = 11;
                break;

              case 24:
                // Apply Payer Signatures to Envelope Signatures
                envelopeSignatures = {};
                _i2 = 0, _Object$values2 = Object.values(ix.accounts);

              case 26:
                if (!(_i2 < _Object$values2.length)) {
                  _context.next = 39;
                  break;
                }

                _acct = _Object$values2[_i2];
                _context.prev = 28;

                if (_acct.role.payer && _acct.signature != null) {
                  id = _acct.tempId || idof(_acct);
                  envelopeSignatures[id] = envelopeSignatures[id] || {
                    address: sansPrefix(_acct.addr),
                    key_index: String(_acct.keyId),
                    signature: context.Buffer.from(_acct.signature, "hex").toString("base64")
                  };
                }

                _context.next = 36;
                break;

              case 32:
                _context.prev = 32;
                _context.t1 = _context["catch"](28);
                console.error("SDK HTTP Send Error: Trouble applying envelope signature", {
                  acct: _acct,
                  ix: ix
                });
                throw _context.t1;

              case 36:
                _i2++;
                _context.next = 26;
                break;

              case 39:
                envelopeSignatures = Object.values(envelopeSignatures);
                t1 = Date.now();
                _context.next = 43;
                return httpRequest$1({
                  hostname: opts.node,
                  path: "/v1/transactions",
                  method: "POST",
                  body: {
                    script: context.Buffer.from(ix.message.cadence).toString("base64"),
                    arguments: _toConsumableArray(ix.message.arguments.map(function (arg) {
                      return context.Buffer.from(JSON.stringify(ix.arguments[arg].asArgument)).toString("base64");
                    })),
                    reference_block_id: ix.message.refBlock ? ix.message.refBlock : null,
                    gas_limit: String(ix.message.computeLimit),
                    payer: sansPrefix(ix.accounts[Array.isArray(ix.payer) ? ix.payer[0] : ix.payer].addr),
                    proposal_key: {
                      address: sansPrefix(ix.accounts[ix.proposer].addr),
                      key_index: String(ix.accounts[ix.proposer].keyId),
                      sequence_number: String(ix.accounts[ix.proposer].sequenceNum)
                    },
                    authorizers: ix.authorizations.map(function (tempId) {
                      return ix.accounts[tempId].addr;
                    }).reduce(function (prev, current) {
                      return prev.find(function (item) {
                        return item === current;
                      }) ? prev : [].concat(_toConsumableArray(prev), [current]);
                    }, []).map(sansPrefix),
                    payload_signatures: payloadSignatures,
                    envelope_signatures: envelopeSignatures
                  }
                });

              case 43:
                res = _context.sent;
                t2 = Date.now();
                ret = context.response();
                ret.tag = ix.tag;
                ret.transactionId = res.id;

                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("FLOW::TX", {
                    detail: {
                      txId: ret.transactionId,
                      delta: t2 - t1
                    }
                  }));
                }

                return _context.abrupt("return", ret);

              case 50:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, null, [[13, 17], [28, 32]]);
      }));
      return _sendTransaction.apply(this, arguments);
    }

    var send$1 = /*#__PURE__*/function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(ix) {
        var context,
            opts,
            _args = arguments;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                context = _args.length > 1 && _args[1] !== undefined ? _args[1] : {};
                opts = _args.length > 2 && _args[2] !== undefined ? _args[2] : {};
                invariant$1(opts.node, "SDK Send Error: Either opts.node or \"accessNode.api\" in config must be defined.");
                invariant$1(context.ix, "SDK Send Error: context.ix must be defined.");
                _context.next = 6;
                return ix;

              case 6:
                ix = _context.sent;
                _context.t0 = true;
                _context.next = _context.t0 === context.ix.isTransaction(ix) ? 10 : _context.t0 === context.ix.isGetTransactionStatus(ix) ? 11 : _context.t0 === context.ix.isGetTransaction(ix) ? 12 : _context.t0 === context.ix.isScript(ix) ? 13 : _context.t0 === context.ix.isGetAccount(ix) ? 14 : _context.t0 === context.ix.isGetEvents(ix) ? 15 : _context.t0 === context.ix.isGetBlock(ix) ? 16 : _context.t0 === context.ix.isGetBlockHeader(ix) ? 17 : _context.t0 === context.ix.isGetCollection(ix) ? 18 : _context.t0 === context.ix.isPing(ix) ? 19 : 20;
                break;

              case 10:
                return _context.abrupt("return", opts.sendTransaction ? opts.sendTransaction(ix, context, opts) : sendTransaction(ix, context, opts));

              case 11:
                return _context.abrupt("return", opts.sendGetTransactionStatus ? opts.sendGetTransactionStatus(ix, context, opts) : sendGetTransactionStatus(ix, context, opts));

              case 12:
                return _context.abrupt("return", opts.sendGetTransaction ? opts.sendGetTransaction(ix, context, opts) : sendGetTransaction(ix, context, opts));

              case 13:
                return _context.abrupt("return", opts.sendExecuteScript ? opts.sendExecuteScript(ix, context, opts) : sendExecuteScript(ix, context, opts));

              case 14:
                return _context.abrupt("return", opts.sendGetAccount ? opts.sendGetAccount(ix, context, opts) : sendGetAccount(ix, context, opts));

              case 15:
                return _context.abrupt("return", opts.sendGetEvents ? opts.sendGetEvents(ix, context, opts) : sendGetEvents(ix, context, opts));

              case 16:
                return _context.abrupt("return", opts.sendGetBlock ? opts.sendGetBlock(ix, context, opts) : sendGetBlock(ix, context, opts));

              case 17:
                return _context.abrupt("return", opts.sendGetBlockHeader ? opts.sendGetBlockHeader(ix, context, opts) : sendGetBlockHeader(ix, context, opts));

              case 18:
                return _context.abrupt("return", opts.sendGetCollection ? opts.sendGetCollection(ix, context, opts) : sendGetCollection(ix, context, opts));

              case 19:
                return _context.abrupt("return", opts.sendPing ? opts.sendPing(ix, context, opts) : sendPing(ix, context, opts));

              case 20:
                return _context.abrupt("return", ix);

              case 21:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      return function send(_x) {
        return _ref.apply(this, arguments);
      };
    }();

    var sha3$1 = {};

    var sponge$1 = {};

    var permute$1 = {};

    var chi$1 = {};

    var copy$1=function copy(I,i){return function(O,o){var oi=o*2;var ii=i*2;O[oi]=I[ii];O[oi+1]=I[ii+1];}};var copy_1$1=copy$1;

    (function (exports) {
    Object.defineProperty(exports,"__esModule",{value:true});exports["default"]=void 0;var _copy=_interopRequireDefault(copy_1$1);function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{"default":obj}}var chi=function chi(_ref){var A=_ref.A,C=_ref.C;for(var y=0;y<25;y+=5){for(var x=0;x<5;x++){(0, _copy["default"])(A,y+x)(C,x);}for(var _x=0;_x<5;_x++){var xy=(y+_x)*2;var x1=(_x+1)%5*2;var x2=(_x+2)%5*2;A[xy]^=~C[x1]&C[x2];A[xy+1]^=~C[x1+1]&C[x2+1];}}};var _default=chi;exports["default"]=_default;
    } (chi$1));

    var iota$1 = {};

    var roundConstants$1 = {};

    (function (exports) {
    Object.defineProperty(exports,"__esModule",{value:true});exports["default"]=void 0;var ROUND_CONSTANTS=new Uint32Array([0,1,0,32898,2147483648,32906,2147483648,2147516416,0,32907,0,2147483649,2147483648,2147516545,2147483648,32777,0,138,0,136,0,2147516425,0,2147483658,0,2147516555,2147483648,139,2147483648,32905,2147483648,32771,2147483648,32770,2147483648,128,0,32778,2147483648,2147483658,2147483648,2147516545,2147483648,32896,0,2147483649,2147483648,2147516424]);var _default=ROUND_CONSTANTS;exports["default"]=_default;
    } (roundConstants$1));

    (function (exports) {
    Object.defineProperty(exports,"__esModule",{value:true});exports["default"]=void 0;var _roundConstants=_interopRequireDefault(roundConstants$1);function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{"default":obj}}var iota=function iota(_ref){var A=_ref.A,roundIndex=_ref.roundIndex;var i=roundIndex*2;A[0]^=_roundConstants["default"][i];A[1]^=_roundConstants["default"][i+1];};var _default=iota;exports["default"]=_default;
    } (iota$1));

    var rhoPi$1 = {};

    var piShuffles$1 = {};

    (function (exports) {
    Object.defineProperty(exports,"__esModule",{value:true});exports["default"]=void 0;var PI_SHUFFLES=[10,7,11,17,18,3,5,16,8,21,24,4,15,23,19,13,12,2,20,14,22,9,6,1];var _default=PI_SHUFFLES;exports["default"]=_default;
    } (piShuffles$1));

    var rhoOffsets$1 = {};

    (function (exports) {
    Object.defineProperty(exports,"__esModule",{value:true});exports["default"]=void 0;var RHO_OFFSETS=[1,3,6,10,15,21,28,36,45,55,2,14,27,41,56,8,25,43,62,18,39,61,20,44];var _default=RHO_OFFSETS;exports["default"]=_default;
    } (rhoOffsets$1));

    (function (exports) {
    Object.defineProperty(exports,"__esModule",{value:true});exports["default"]=void 0;var _piShuffles=_interopRequireDefault(piShuffles$1);var _rhoOffsets=_interopRequireDefault(rhoOffsets$1);var _copy=_interopRequireDefault(copy_1$1);function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{"default":obj}}var rhoPi=function rhoPi(_ref){var A=_ref.A,C=_ref.C,W=_ref.W;(0, _copy["default"])(A,1)(W,0);var H=0;var L=0;var Wi=0;var ri=32;for(var i=0;i<24;i++){var j=_piShuffles["default"][i];var r=_rhoOffsets["default"][i];(0, _copy["default"])(A,j)(C,0);H=W[0];L=W[1];ri=32-r;Wi=r<32?0:1;W[Wi]=H<<r|L>>>ri;W[(Wi+1)%2]=L<<r|H>>>ri;(0, _copy["default"])(W,0)(A,j);(0, _copy["default"])(C,0)(W,0);}};var _default=rhoPi;exports["default"]=_default;
    } (rhoPi$1));

    var theta$1 = {};

    (function (exports) {
    Object.defineProperty(exports,"__esModule",{value:true});exports["default"]=void 0;var _copy=_interopRequireDefault(copy_1$1);function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{"default":obj}}var theta=function theta(_ref){var A=_ref.A,C=_ref.C,D=_ref.D,W=_ref.W;var H=0;var L=0;for(var x=0;x<5;x++){var x20=x*2;var x21=(x+5)*2;var x22=(x+10)*2;var x23=(x+15)*2;var x24=(x+20)*2;C[x20]=A[x20]^A[x21]^A[x22]^A[x23]^A[x24];C[x20+1]=A[x20+1]^A[x21+1]^A[x22+1]^A[x23+1]^A[x24+1];}for(var _x=0;_x<5;_x++){(0, _copy["default"])(C,(_x+1)%5)(W,0);H=W[0];L=W[1];W[0]=H<<1|L>>>31;W[1]=L<<1|H>>>31;D[_x*2]=C[(_x+4)%5*2]^W[0];D[_x*2+1]=C[(_x+4)%5*2+1]^W[1];for(var y=0;y<25;y+=5){A[(y+_x)*2]^=D[_x*2];A[(y+_x)*2+1]^=D[_x*2+1];}}};var _default=theta;exports["default"]=_default;
    } (theta$1));

    (function (exports) {
    Object.defineProperty(exports,"__esModule",{value:true});exports["default"]=void 0;var _chi=_interopRequireDefault(chi$1);var _iota=_interopRequireDefault(iota$1);var _rhoPi=_interopRequireDefault(rhoPi$1);var _theta=_interopRequireDefault(theta$1);function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{"default":obj}}var permute=function permute(){var C=new Uint32Array(10);var D=new Uint32Array(10);var W=new Uint32Array(2);return function(A){for(var roundIndex=0;roundIndex<24;roundIndex++){(0, _theta["default"])({A:A,C:C,D:D,W:W});(0, _rhoPi["default"])({A:A,C:C,W:W});(0, _chi["default"])({A:A,C:C});(0, _iota["default"])({A:A,roundIndex:roundIndex});}C.fill(0);D.fill(0);W.fill(0);}};var _default=permute;exports["default"]=_default;
    } (permute$1));

    (function (exports) {
    Object.defineProperty(exports,"__esModule",{value:true});exports["default"]=void 0;var _buffer=buffer;var _permute=_interopRequireDefault(permute$1);function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{"default":obj}}var xorWords=function xorWords(I,O){for(var i=0;i<I.length;i+=8){var o=i/4;O[o]^=I[i+7]<<24|I[i+6]<<16|I[i+5]<<8|I[i+4];O[o+1]^=I[i+3]<<24|I[i+2]<<16|I[i+1]<<8|I[i];}return O};var readWords=function readWords(I,O){for(var o=0;o<O.length;o+=8){var i=o/4;O[o]=I[i+1];O[o+1]=I[i+1]>>>8;O[o+2]=I[i+1]>>>16;O[o+3]=I[i+1]>>>24;O[o+4]=I[i];O[o+5]=I[i]>>>8;O[o+6]=I[i]>>>16;O[o+7]=I[i]>>>24;}return O};var Sponge=function Sponge(_ref){var _this=this;var capacity=_ref.capacity,padding=_ref.padding;var keccak=(0, _permute["default"])();var stateSize=200;var blockSize=capacity/8;var queueSize=stateSize-capacity/4;var queueOffset=0;var state=new Uint32Array(stateSize/4);var queue=_buffer.Buffer.allocUnsafe(queueSize);this.absorb=function(buffer){for(var i=0;i<buffer.length;i++){queue[queueOffset]=buffer[i];queueOffset+=1;if(queueOffset>=queueSize){xorWords(queue,state);keccak(state);queueOffset=0;}}return _this};this.squeeze=function(){var options=arguments.length>0&&arguments[0]!==undefined?arguments[0]:{};var output={buffer:options.buffer||_buffer.Buffer.allocUnsafe(blockSize),padding:options.padding||padding,queue:_buffer.Buffer.allocUnsafe(queue.length),state:new Uint32Array(state.length)};queue.copy(output.queue);for(var i=0;i<state.length;i++){output.state[i]=state[i];}output.queue.fill(0,queueOffset);output.queue[queueOffset]|=output.padding;output.queue[queueSize-1]|=128;xorWords(output.queue,output.state);for(var offset=0;offset<output.buffer.length;offset+=queueSize){keccak(output.state);readWords(output.state,output.buffer.slice(offset,offset+queueSize));}return output.buffer};this.reset=function(){queue.fill(0);state.fill(0);queueOffset=0;return _this};return this};var _default=Sponge;exports["default"]=_default;
    } (sponge$1));

    (function (exports) {
    Object.defineProperty(exports,"__esModule",{value:true});exports["default"]=exports.SHAKE=exports.SHA3Hash=exports.SHA3=exports.Keccak=void 0;var _buffer=buffer;var _sponge=_interopRequireDefault(sponge$1);function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{"default":obj}}var createHash=function createHash(_ref){var allowedSizes=_ref.allowedSizes,defaultSize=_ref.defaultSize,padding=_ref.padding;return function Hash(){var _this=this;var size=arguments.length>0&&arguments[0]!==undefined?arguments[0]:defaultSize;if(!this||this.constructor!==Hash){return new Hash(size)}if(allowedSizes&&!allowedSizes.includes(size)){throw new Error("Unsupported hash length")}var sponge=new _sponge["default"]({capacity:size});this.update=function(input){var encoding=arguments.length>1&&arguments[1]!==undefined?arguments[1]:"utf8";if(_buffer.Buffer.isBuffer(input)){sponge.absorb(input);return _this}if(typeof input==="string"){return _this.update(_buffer.Buffer.from(input,encoding))}throw new TypeError("Not a string or buffer")};this.digest=function(){var formatOrOptions=arguments.length>0&&arguments[0]!==undefined?arguments[0]:"binary";var options=typeof formatOrOptions==="string"?{format:formatOrOptions}:formatOrOptions;var buffer=sponge.squeeze({buffer:options.buffer,padding:options.padding||padding});if(options.format&&options.format!=="binary"){return buffer.toString(options.format)}return buffer};this.reset=function(){sponge.reset();return _this};return this}};var Keccak=createHash({allowedSizes:[224,256,384,512],defaultSize:512,padding:1});exports.Keccak=Keccak;var SHA3=createHash({allowedSizes:[224,256,384,512],defaultSize:512,padding:6});exports.SHA3=SHA3;var SHAKE=createHash({allowedSizes:[128,256],defaultSize:256,padding:31});exports.SHAKE=SHAKE;var SHA3Hash=Keccak;exports.SHA3Hash=SHA3Hash;SHA3.SHA3Hash=SHA3Hash;var _default=SHA3;exports["default"]=_default;
    } (sha3$1));

    var promise$1;
    var queueMicrotask_1$1 = typeof queueMicrotask === 'function' ? queueMicrotask // reuse resolved promise, and allocate it lazily
    : function (cb) {
      return (promise$1 || (promise$1 = Promise.resolve())).then(cb)["catch"](function (err) {
        return setTimeout(function () {
          throw err;
        }, 0);
      });
    };

    var mailbox$1 = function mailbox() {
      var queue = [];
      var next;
      return {
        deliver: function deliver(msg) {
          return _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee() {
            return regenerator.wrap(function _callee$(_context) {
              while (1) {
                switch (_context.prev = _context.next) {
                  case 0:
                    queue.push(msg);

                    if (next) {
                      next(queue.shift());
                      next = undefined;
                    }

                  case 2:
                  case "end":
                    return _context.stop();
                }
              }
            }, _callee);
          }))();
        },
        receive: function receive() {
          return new Promise(function innerReceive(resolve) {
            var msg = queue.shift();
            if (msg) return resolve(msg);
            next = resolve;
          });
        }
      };
    };

    var INIT$1 = "INIT";
    var SUBSCRIBE$1 = "SUBSCRIBE";
    var UNSUBSCRIBE$1 = "UNSUBSCRIBE";
    var UPDATED$1$2 = "UPDATED";
    var EXIT$1 = "EXIT";
    var TERMINATE$1 = "TERMINATE";
    var root$1 = (typeof self === "undefined" ? "undefined" : _typeof(self)) === "object" && self.self === self && self || (typeof global === "undefined" ? "undefined" : _typeof(global)) === "object" && global.global === global && global || (typeof window === "undefined" ? "undefined" : _typeof(window)) === "object" && window.window === window && window;
    root$1.FCL_REGISTRY = root$1.FCL_REGISTRY == null ? {} : root$1.FCL_REGISTRY;
    var pid$1 = 0;
    var DEFAULT_TIMEOUT$1 = 5000;

    var _send$1 = function send(addr, tag, data) {
      var opts = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
      return new Promise(function (reply, reject) {
        var expectReply = opts.expectReply || false;
        var timeout = opts.timeout != null ? opts.timeout : DEFAULT_TIMEOUT$1;

        if (expectReply && timeout) {
          setTimeout(function () {
            return reject(new Error("Timeout: ".concat(timeout, "ms passed without a response.")));
          }, timeout);
        }

        var payload = {
          to: addr,
          from: opts.from,
          tag: tag,
          data: data,
          timeout: timeout,
          reply: reply,
          reject: reject
        };

        try {
          root$1.FCL_REGISTRY[addr] && root$1.FCL_REGISTRY[addr].mailbox.deliver(payload);
          if (!expectReply) reply(true);
        } catch (error) {
          console.error("FCL.Actor -- Could Not Deliver Message", payload, root$1.FCL_REGISTRY[addr], error);
        }
      });
    };

    var kill$1 = function kill(addr) {
      delete root$1.FCL_REGISTRY[addr];
    };

    var fromHandlers$1 = function fromHandlers() {
      var handlers = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      return /*#__PURE__*/function () {
        var _ref = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(ctx) {
          var letter;
          return regenerator.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  if (!(typeof handlers[INIT$1] === "function")) {
                    _context.next = 3;
                    break;
                  }

                  _context.next = 3;
                  return handlers[INIT$1](ctx);

                case 3:
                  _context.next = 6;
                  return ctx.receive();

                case 6:
                  letter = _context.sent;
                  _context.prev = 7;

                  if (!(letter.tag === EXIT$1)) {
                    _context.next = 13;
                    break;
                  }

                  if (!(typeof handlers[TERMINATE$1] === "function")) {
                    _context.next = 12;
                    break;
                  }

                  _context.next = 12;
                  return handlers[TERMINATE$1](ctx, letter, letter.data || {});

                case 12:
                  return _context.abrupt("break", 25);

                case 13:
                  _context.next = 15;
                  return handlers[letter.tag](ctx, letter, letter.data || {});

                case 15:
                  _context.next = 20;
                  break;

                case 17:
                  _context.prev = 17;
                  _context.t0 = _context["catch"](7);
                  console.error("".concat(ctx.self(), " Error"), letter, _context.t0);

                case 20:
                  _context.prev = 20;
                  return _context.abrupt("continue", 3);

                case 23:
                  _context.next = 3;
                  break;

                case 25:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee, null, [[7, 17, 20, 23]]);
        }));

        return function (_x) {
          return _ref.apply(this, arguments);
        };
      }();
    };

    var spawn$1 = function spawn(fn) {
      var addr = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      if (addr == null) addr = ++pid$1;
      if (root$1.FCL_REGISTRY[addr] != null) return addr;
      root$1.FCL_REGISTRY[addr] = {
        addr: addr,
        mailbox: mailbox$1(),
        subs: new Set(),
        kvs: {},
        error: null
      };
      var ctx = {
        self: function self() {
          return addr;
        },
        receive: function receive() {
          return root$1.FCL_REGISTRY[addr].mailbox.receive();
        },
        send: function send(to, tag, data) {
          var opts = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
          opts.from = addr;
          return _send$1(to, tag, data, opts);
        },
        sendSelf: function sendSelf(tag, data, opts) {
          if (root$1.FCL_REGISTRY[addr]) _send$1(addr, tag, data, opts);
        },
        broadcast: function broadcast(tag, data) {
          var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
          opts.from = addr;

          var _iterator = _createForOfIteratorHelper(root$1.FCL_REGISTRY[addr].subs),
              _step;

          try {
            for (_iterator.s(); !(_step = _iterator.n()).done;) {
              var to = _step.value;

              _send$1(to, tag, data, opts);
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }
        },
        subscribe: function subscribe(sub) {
          return sub != null && root$1.FCL_REGISTRY[addr].subs.add(sub);
        },
        unsubscribe: function unsubscribe(sub) {
          return sub != null && root$1.FCL_REGISTRY[addr].subs["delete"](sub);
        },
        subscriberCount: function subscriberCount() {
          return root$1.FCL_REGISTRY[addr].subs.size;
        },
        hasSubs: function hasSubs() {
          return !!root$1.FCL_REGISTRY[addr].subs.size;
        },
        put: function put(key, value) {
          if (key != null) root$1.FCL_REGISTRY[addr].kvs[key] = value;
        },
        get: function get(key, fallback) {
          var value = root$1.FCL_REGISTRY[addr].kvs[key];
          return value == null ? fallback : value;
        },
        "delete": function _delete(key) {
          delete root$1.FCL_REGISTRY[addr].kvs[key];
        },
        update: function update(key, fn) {
          if (key != null) root$1.FCL_REGISTRY[addr].kvs[key] = fn(root$1.FCL_REGISTRY[addr].kvs[key]);
        },
        keys: function keys() {
          return Object.keys(root$1.FCL_REGISTRY[addr].kvs);
        },
        all: function all() {
          return root$1.FCL_REGISTRY[addr].kvs;
        },
        where: function where(pattern) {
          return Object.keys(root$1.FCL_REGISTRY[addr].kvs).reduce(function (acc, key) {
            return pattern.test(key) ? _objectSpread2(_objectSpread2({}, acc), {}, _defineProperty({}, key, root$1.FCL_REGISTRY[addr].kvs[key])) : acc;
          }, {});
        },
        merge: function merge() {
          var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
          Object.keys(data).forEach(function (key) {
            return root$1.FCL_REGISTRY[addr].kvs[key] = data[key];
          });
        },
        fatalError: function fatalError(error) {
          root$1.FCL_REGISTRY[addr].error = error;

          var _iterator2 = _createForOfIteratorHelper(root$1.FCL_REGISTRY[addr].subs),
              _step2;

          try {
            for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
              var to = _step2.value;

              _send$1(to, UPDATED$1$2);
            }
          } catch (err) {
            _iterator2.e(err);
          } finally {
            _iterator2.f();
          }
        }
      };
      if (_typeof(fn) === "object") fn = fromHandlers$1(fn);
      queueMicrotask_1$1( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2() {
        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return fn(ctx);

              case 2:
                kill$1(addr);

              case 3:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      })));
      return addr;
    }; // Returns an unsubscribe function
    // A SUBSCRIBE handler will need to be created to handle the subscription event
    //
    //  [SUBSCRIBE]: (ctx, letter) => {
    //    ctx.subscribe(letter.from)
    //    ctx.send(letter.from, UPDATED, ctx.all())
    //  }
    //


    function subscriber$1(address, spawnFn, callback) {
      spawnFn(address);
      var EXIT = "@EXIT";
      var self = spawn$1( /*#__PURE__*/function () {
        var _ref3 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee3(ctx) {
          var letter, error;
          return regenerator.wrap(function _callee3$(_context3) {
            while (1) {
              switch (_context3.prev = _context3.next) {
                case 0:
                  ctx.send(address, SUBSCRIBE$1);

                case 1:
                  _context3.next = 4;
                  return ctx.receive();

                case 4:
                  letter = _context3.sent;
                  error = root$1.FCL_REGISTRY[address].error;

                  if (!(letter.tag === EXIT)) {
                    _context3.next = 9;
                    break;
                  }

                  ctx.send(address, UNSUBSCRIBE$1);
                  return _context3.abrupt("return");

                case 9:
                  if (!error) {
                    _context3.next = 13;
                    break;
                  }

                  callback(null, error);
                  ctx.send(address, UNSUBSCRIBE$1);
                  return _context3.abrupt("return");

                case 13:
                  callback(letter.data, null);
                  _context3.next = 1;
                  break;

                case 16:
                case "end":
                  return _context3.stop();
              }
            }
          }, _callee3);
        }));

        return function (_x2) {
          return _ref3.apply(this, arguments);
        };
      }());
      return function () {
        return _send$1(self, EXIT);
      };
    } // Returns a promise that returns a result

    var _HANDLERS$5;

    var NAME$2 = "config";
    var PUT$1 = "PUT_CONFIG";
    var GET$1 = "GET_CONFIG";
    var GET_ALL$1 = "GET_ALL_CONFIG";
    var UPDATE$1 = "UPDATE_CONFIG";
    var DELETE$1 = "DELETE_CONFIG";
    var CLEAR$1 = "CLEAR_CONFIG";
    var WHERE$1 = "WHERE_CONFIG";
    var UPDATED$3 = "CONFIG/UPDATED";

    var identity$2 = function identity(v) {
      return v;
    };

    var HANDLERS$3 = (_HANDLERS$5 = {}, _defineProperty(_HANDLERS$5, PUT$1, function (ctx, _letter, _ref) {
      var key = _ref.key,
          value = _ref.value;
      if (key == null) throw new Error("Missing 'key' for config/put.");
      ctx.put(key, value);
      ctx.broadcast(UPDATED$3, _objectSpread2({}, ctx.all()));
    }), _defineProperty(_HANDLERS$5, GET$1, function (ctx, letter, _ref2) {
      var key = _ref2.key,
          fallback = _ref2.fallback;
      if (key == null) throw new Error("Missing 'key' for config/get");
      letter.reply(ctx.get(key, fallback));
    }), _defineProperty(_HANDLERS$5, GET_ALL$1, function (ctx, letter) {
      letter.reply(_objectSpread2({}, ctx.all()));
    }), _defineProperty(_HANDLERS$5, UPDATE$1, function (ctx, letter, _ref3) {
      var key = _ref3.key,
          fn = _ref3.fn;
      if (key == null) throw new Error("Missing 'key' for config/update");
      ctx.update(key, fn || identity$2);
      ctx.broadcast(UPDATED$3, _objectSpread2({}, ctx.all()));
    }), _defineProperty(_HANDLERS$5, DELETE$1, function (ctx, letter, _ref4) {
      var key = _ref4.key;
      if (key == null) throw new Error("Missing 'key' for config/delete");
      ctx["delete"](key);
      ctx.broadcast(UPDATED$3, _objectSpread2({}, ctx.all()));
    }), _defineProperty(_HANDLERS$5, CLEAR$1, function (ctx, letter) {
      var keys = Object.keys(ctx.all());

      for (var _i = 0, _keys = keys; _i < _keys.length; _i++) {
        var key = _keys[_i];
        ctx["delete"](key);
      }

      ctx.broadcast(UPDATED$3, _objectSpread2({}, ctx.all()));
    }), _defineProperty(_HANDLERS$5, WHERE$1, function (ctx, letter, _ref5) {
      var pattern = _ref5.pattern;
      if (pattern == null) throw new Error("Missing 'pattern' for config/where");
      letter.reply(ctx.where(pattern));
    }), _defineProperty(_HANDLERS$5, SUBSCRIBE$1, function (ctx, letter) {
      ctx.subscribe(letter.from);
      ctx.send(letter.from, UPDATED$3, _objectSpread2({}, ctx.all()));
    }), _defineProperty(_HANDLERS$5, UNSUBSCRIBE$1, function (ctx, letter) {
      ctx.unsubscribe(letter.from);
    }), _HANDLERS$5);
    spawn$1(HANDLERS$3, NAME$2);

    function put$2(key, value) {
      _send$1(NAME$2, PUT$1, {
        key: key,
        value: value
      });
      return config$1();
    }

    function get$2(key, fallback) {
      return _send$1(NAME$2, GET$1, {
        key: key,
        fallback: fallback
      }, {
        expectReply: true,
        timeout: 10
      });
    }

    function first$1() {
      return _first$1.apply(this, arguments);
    }

    function _first$1() {
      _first$1 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2() {
        var wants,
            fallback,
            _wants,
            head,
            rest,
            ret,
            _args2 = arguments;

        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                wants = _args2.length > 0 && _args2[0] !== undefined ? _args2[0] : [];
                fallback = _args2.length > 1 ? _args2[1] : undefined;

                if (wants.length) {
                  _context2.next = 4;
                  break;
                }

                return _context2.abrupt("return", fallback);

              case 4:
                _wants = _toArray(wants), head = _wants[0], rest = _wants.slice(1);
                _context2.next = 7;
                return get$2(head);

              case 7:
                ret = _context2.sent;

                if (!(ret == null)) {
                  _context2.next = 10;
                  break;
                }

                return _context2.abrupt("return", first$1(rest, fallback));

              case 10:
                return _context2.abrupt("return", ret);

              case 11:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));
      return _first$1.apply(this, arguments);
    }

    function all$1() {
      return _send$1(NAME$2, GET_ALL$1, null, {
        expectReply: true,
        timeout: 10
      });
    }

    function update$2(key) {
      var fn = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : identity$2;
      _send$1(NAME$2, UPDATE$1, {
        key: key,
        fn: fn
      });
      return config$1();
    }

    function _delete$1(key) {
      _send$1(NAME$2, DELETE$1, {
        key: key
      });
      return config$1();
    }

    function where$1(pattern) {
      return _send$1(NAME$2, WHERE$1, {
        pattern: pattern
      }, {
        expectReply: true,
        timeout: 10
      });
    }

    function subscribe$2(callback) {
      return subscriber$1(NAME$2, function () {
        return spawn$1(HANDLERS$3, NAME$2);
      }, callback);
    }

    function clearConfig$1() {
      return _send$1(NAME$2, CLEAR$1);
    }

    function config$1(values) {
      if (values != null && _typeof(values) === "object") {
        Object.keys(values).map(function (d) {
          return put$2(d, values[d]);
        });
      }

      return {
        put: put$2,
        get: get$2,
        all: all$1,
        first: first$1,
        update: update$2,
        "delete": _delete$1,
        where: where$1,
        subscribe: subscribe$2,
        overload: overload$1
      };
    }

    config$1.put = put$2;
    config$1.get = get$2;
    config$1.all = all$1;
    config$1.first = first$1;
    config$1.update = update$2;
    config$1["delete"] = _delete$1;
    config$1.where = where$1;
    config$1.subscribe = subscribe$2;
    config$1.overload = overload$1;

    var noop$6 = function noop(v) {
      return v;
    };

    function overload$1() {
      var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : noop$6;
      return new Promise( /*#__PURE__*/function () {
        var _ref6 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(resolve, reject) {
          var oldConfig, result;
          return regenerator.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  _context.next = 2;
                  return all$1();

                case 2:
                  oldConfig = _context.sent;
                  _context.prev = 3;
                  config$1(opts);
                  _context.t0 = callback;
                  _context.next = 8;
                  return all$1();

                case 8:
                  _context.t1 = _context.sent;
                  _context.next = 11;
                  return (0, _context.t0)(_context.t1);

                case 11:
                  result = _context.sent;
                  _context.next = 14;
                  return clearConfig$1();

                case 14:
                  _context.next = 16;
                  return config$1(oldConfig);

                case 16:
                  resolve(result);
                  _context.next = 26;
                  break;

                case 19:
                  _context.prev = 19;
                  _context.t2 = _context["catch"](3);
                  _context.next = 23;
                  return clearConfig$1();

                case 23:
                  _context.next = 25;
                  return config$1(oldConfig);

                case 25:
                  reject(_context.t2);

                case 26:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee, null, [[3, 19]]);
        }));

        return function (_x, _x2) {
          return _ref6.apply(this, arguments);
        };
      }());
    }

    var LEVELS$1 = Object.freeze({
      debug: 5,
      info: 4,
      log: 3,
      warn: 2,
      error: 1
    });

    var buildLoggerMessageArgs$1 = function buildLoggerMessageArgs(_ref) {
      var title = _ref.title,
          message = _ref.message;
      return ["\n    %c".concat(title, "\n    ============================\n\n    ").concat(message, "\n\n    ============================\n    ").replace(/\n[^\S\r\n]+/g, "\n").trim(),, "font-weight:bold;font-family:monospace;"];
    };

    var log$1 = /*#__PURE__*/function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(_ref2) {
        var _console, _console2, _console3, _console4, _console5;

        var title, message, level, _ref2$always, always, configLoggerLevel, loggerMessageArgs;

        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                title = _ref2.title, message = _ref2.message, level = _ref2.level, _ref2$always = _ref2.always, always = _ref2$always === void 0 ? false : _ref2$always;
                _context.next = 3;
                return config$1.get("logger.level", LEVELS$1.warn);

              case 3:
                configLoggerLevel = _context.sent;

                if (!(!always && configLoggerLevel < level)) {
                  _context.next = 6;
                  break;
                }

                return _context.abrupt("return");

              case 6:
                loggerMessageArgs = buildLoggerMessageArgs$1({
                  title: title,
                  message: message
                });
                _context.t0 = level;
                _context.next = _context.t0 === LEVELS$1.debug ? 10 : _context.t0 === LEVELS$1.info ? 12 : _context.t0 === LEVELS$1.warn ? 14 : _context.t0 === LEVELS$1.error ? 16 : 18;
                break;

              case 10:
                (_console = console).debug.apply(_console, _toConsumableArray(loggerMessageArgs));

                return _context.abrupt("break", 19);

              case 12:
                (_console2 = console).info.apply(_console2, _toConsumableArray(loggerMessageArgs));

                return _context.abrupt("break", 19);

              case 14:
                (_console3 = console).warn.apply(_console3, _toConsumableArray(loggerMessageArgs));

                return _context.abrupt("break", 19);

              case 16:
                (_console4 = console).error.apply(_console4, _toConsumableArray(loggerMessageArgs));

                return _context.abrupt("break", 19);

              case 18:
                (_console5 = console).log.apply(_console5, _toConsumableArray(loggerMessageArgs));

              case 19:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      return function log(_x) {
        return _ref3.apply(this, arguments);
      };
    }();

    log$1.deprecate = function (_ref4) {
      var pkg = _ref4.pkg,
          subject = _ref4.subject,
          transition = _ref4.transition,
          _ref4$level = _ref4.level,
          level = _ref4$level === void 0 ? LEVELS$1.warn : _ref4$level,
          _ref4$message = _ref4.message,
          message = _ref4$message === void 0 ? "" : _ref4$message,
          _ref4$callback = _ref4.callback,
          callback = _ref4$callback === void 0 ? null : _ref4$callback;

      var capitalizeFirstLetter = function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
      };

      var logMessage = function logMessage() {
        return log$1({
          title: "".concat(pkg ? pkg + " " : "", "Deprecation Notice"),
          message: "\n      ".concat(subject ? "".concat(capitalizeFirstLetter(subject), " is deprecated and will cease to work in future releases").concat(pkg ? " of " + pkg : "", ".") : "").concat(message ? "\n" + message : "").concat(transition ? "\nYou can learn more (including a guide on common transition paths) here: ".concat(transition) : "", "\n    ").trim(),
          level: level
        });
      };

      if (typeof callback === "function") {
        return /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2() {
          var _args2 = arguments;
          return regenerator.wrap(function _callee2$(_context2) {
            while (1) {
              switch (_context2.prev = _context2.next) {
                case 0:
                  _context2.next = 2;
                  return logMessage();

                case 2:
                  _context2.next = 4;
                  return callback.apply(void 0, _args2);

                case 4:
                  return _context2.abrupt("return", _context2.sent);

                case 5:
                case "end":
                  return _context2.stop();
              }
            }
          }, _callee2);
        }));
      }

      return logMessage();
    };

    function interleave() {
      var a = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      var b = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
      var c = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
      if (!a.length && !b.length) return c;
      if (!a.length) return c;
      if (!b.length) return [].concat(_toConsumableArray(c), [a[0]]);

      var _a = _toArray(a),
          aHead = _a[0],
          aRest = _a.slice(1);

      var _b = _toArray(b),
          bHead = _b[0],
          bRest = _b.slice(1);

      if (aHead !== undefined) c.push(aHead);
      if (bHead !== undefined) c.push(bHead);
      return interleave(aRest, bRest, c);
    }

    function recApply(d) {
      return function (arg1) {
        if (typeof arg1 === "function") {
          log$1.deprecate({
            pkg: "FCL/SDK",
            subject: "Interopolation of functions into template literals",
            transition: "https://github.com/onflow/flow-js-sdk/blob/master/packages/sdk/TRANSITIONS.md#0001-deprecate-params"
          });
          return recApply(d)(arg1(d));
        }

        return String(arg1);
      };
    }

    function template(head) {
      for (var _len = arguments.length, rest = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        rest[_key - 1] = arguments[_key];
      }

      if (typeof head === "string") return function () {
        return head;
      };

      if (Array.isArray(head)) {
        return function (d) {
          return interleave(head, rest.map(recApply(d))).join("").trim();
        };
      }

      return head;
    }

    var UNKNOWN
    /*                       */
    = "UNKNOWN";
    var SCRIPT
    /*                        */
    = "SCRIPT";
    var TRANSACTION
    /*                   */
    = "TRANSACTION";
    var GET_TRANSACTION_STATUS
    /*        */
    = "GET_TRANSACTION_STATUS";
    var GET_ACCOUNT
    /*                   */
    = "GET_ACCOUNT";
    var GET_EVENTS
    /*                    */
    = "GET_EVENTS";
    var PING
    /*                          */
    = "PING";
    var GET_TRANSACTION
    /*               */
    = "GET_TRANSACTION";
    var GET_BLOCK
    /*                     */
    = "GET_BLOCK";
    var GET_BLOCK_HEADER
    /*              */
    = "GET_BLOCK_HEADER";
    var GET_COLLECTION
    /*                */
    = "GET_COLLECTION";
    var BAD
    /* */
    = "BAD";
    var OK
    /*  */
    = "OK";
    var ACCOUNT
    /*  */
    = "ACCOUNT";
    var PARAM
    /*    */
    = "PARAM";
    var ARGUMENT
    /* */
    = "ARGUMENT";
    var AUTHORIZER
    /* */
    = "authorizer";
    var PAYER
    /*      */
    = "payer";
    var PROPOSER
    /*   */
    = "proposer";
    var ACCT = "{\n  \"kind\":\"".concat(ACCOUNT, "\",\n  \"tempId\":null,\n  \"addr\":null,\n  \"keyId\":null,\n  \"sequenceNum\":null,\n  \"signature\":null,\n  \"signingFunction\":null,\n  \"resolve\":null,\n  \"role\": {\n    \"proposer\":false,\n    \"authorizer\":false,\n    \"payer\":false,\n    \"param\":false\n  }\n}");
    var ARG = "{\n  \"kind\":\"".concat(ARGUMENT, "\",\n  \"tempId\":null,\n  \"value\":null,\n  \"asArgument\":null,\n  \"xform\":null,\n  \"resolve\": null,\n  \"resolveArgument\": null\n}");
    var IX = "{\n  \"tag\":\"".concat(UNKNOWN, "\",\n  \"assigns\":{},\n  \"status\":\"").concat(OK, "\",\n  \"reason\":null,\n  \"accounts\":{},\n  \"params\":{},\n  \"arguments\":{},\n  \"message\": {\n    \"cadence\":null,\n    \"refBlock\":null,\n    \"computeLimit\":null,\n    \"proposer\":null,\n    \"payer\":null,\n    \"authorizations\":[],\n    \"params\":[],\n    \"arguments\":[]\n  },\n  \"proposer\":null,\n  \"authorizations\":[],\n  \"payer\":[],\n  \"events\": {\n    \"eventType\":null,\n    \"start\":null,\n    \"end\":null,\n    \"blockIds\":[]\n  },\n  \"transaction\": {\n    \"id\":null\n  },\n  \"block\": {\n    \"id\":null,\n    \"height\":null,\n    \"isSealed\":null\n  },\n  \"account\": {\n    \"addr\":null\n  },\n  \"collection\": {\n    \"id\":null\n  }\n}");
    var KEYS = new Set(Object.keys(JSON.parse(IX)));
    var interaction = function interaction() {
      return JSON.parse(IX);
    };
    var CHARS = "abcdefghijklmnopqrstuvwxyz0123456789".split("");

    var randChar = function randChar() {
      return CHARS[~~(Math.random() * CHARS.length)];
    };

    var uuid = function uuid() {
      return Array.from({
        length: 10
      }, randChar).join("");
    };
    var isNumber$1$1 = function isNumber(d) {
      return typeof d === "number";
    };
    var isArray$1 = function isArray(d) {
      return Array.isArray(d);
    };
    var isObj$1 = function isObj(d) {
      return d !== null && _typeof(d) === "object";
    };
    var isNull$1 = function isNull(d) {
      return d == null;
    };
    var isFn$3 = function isFn(d) {
      return typeof d === "function";
    };
    var isInteraction = function isInteraction(ix) {
      if (!isObj$1(ix) || isNull$1(ix) || isNumber$1$1(ix)) return false;

      var _iterator = _createForOfIteratorHelper(KEYS),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var key = _step.value;
          if (!ix.hasOwnProperty(key)) return false;
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      return true;
    };
    var Ok = function Ok(ix) {
      ix.status = OK;
      return ix;
    };
    var Bad = function Bad(ix, reason) {
      ix.status = BAD;
      ix.reason = reason;
      return ix;
    };

    var makeIx = function makeIx(wat) {
      return function (ix) {
        ix.tag = wat;
        return Ok(ix);
      };
    };

    var prepAccountKeyId = function prepAccountKeyId(acct) {
      if (acct.keyId == null) return acct;
      invariant$1(!isNaN(parseInt(acct.keyId)), "account.keyId must be an integer");
      return _objectSpread2(_objectSpread2({}, acct), {}, {
        keyId: parseInt(acct.keyId)
      });
    };

    var prepAccount = function prepAccount(acct) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      return function (ix) {
        invariant$1(typeof acct === "function" || _typeof(acct) === "object", "prepAccount must be passed an authorization function or an account object");
        invariant$1(opts.role != null, "Account must have a role");
        var ACCOUNT = JSON.parse(ACCT);
        var role = opts.role;
        var tempId = uuid();
        if (acct.authorization && isFn$3(acct.authorization)) acct = {
          resolve: acct.authorization
        };
        if (!acct.authorization && isFn$3(acct)) acct = {
          resolve: acct
        };
        var resolve = acct.resolve;
        if (resolve) acct.resolve = function (acct) {
          for (var _len = arguments.length, rest = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            rest[_key - 1] = arguments[_key];
          }

          return [resolve, prepAccountKeyId].reduce( /*#__PURE__*/function () {
            var _ref = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(d, fn) {
              return regenerator.wrap(function _callee$(_context) {
                while (1) {
                  switch (_context.prev = _context.next) {
                    case 0:
                      _context.t0 = fn;
                      _context.t1 = void 0;
                      _context.next = 4;
                      return d;

                    case 4:
                      _context.t2 = _context.sent;
                      _context.t3 = [_context.t2].concat(rest);
                      return _context.abrupt("return", _context.t0.apply.call(_context.t0, _context.t1, _context.t3));

                    case 7:
                    case "end":
                      return _context.stop();
                  }
                }
              }, _callee);
            }));

            return function (_x, _x2) {
              return _ref.apply(this, arguments);
            };
          }(), acct);
        };
        acct = prepAccountKeyId(acct);
        ix.accounts[tempId] = _objectSpread2(_objectSpread2(_objectSpread2({}, ACCOUNT), {}, {
          tempId: tempId
        }, acct), {}, {
          role: _objectSpread2(_objectSpread2(_objectSpread2({}, ACCOUNT.role), _typeof(acct.role) === "object" ? acct.role : {}), {}, _defineProperty({}, role, true))
        });

        if (role === AUTHORIZER) {
          ix.authorizations.push(tempId);
        } else if (role === PAYER) {
          ix.payer.push(tempId);
        } else {
          ix[role] = tempId;
        }

        return ix;
      };
    };
    var makeArgument = function makeArgument(arg) {
      return function (ix) {
        var tempId = uuid();
        ix.message.arguments.push(tempId);
        ix.arguments[tempId] = JSON.parse(ARG);
        ix.arguments[tempId].tempId = tempId;
        ix.arguments[tempId].value = arg.value;
        ix.arguments[tempId].asArgument = arg.asArgument;
        ix.arguments[tempId].xform = arg.xform;
        ix.arguments[tempId].resolve = arg.resolve;
        ix.arguments[tempId].resolveArgument = isFn$3(arg.resolveArgument) ? arg.resolveArgument.bind(arg) : arg.resolveArgument;
        return Ok(ix);
      };
    };
    var makeUnknown
    /*                 */
    = makeIx(UNKNOWN);
    var makeScript
    /*                  */
    = makeIx(SCRIPT);
    var makeTransaction
    /*             */
    = makeIx(TRANSACTION);
    var makeGetTransactionStatus
    /*    */
    = makeIx(GET_TRANSACTION_STATUS);
    var makeGetTransaction
    /*          */
    = makeIx(GET_TRANSACTION);
    var makeGetAccount
    /*              */
    = makeIx(GET_ACCOUNT);
    var makeGetEvents
    /*               */
    = makeIx(GET_EVENTS);
    var makePing
    /*                    */
    = makeIx(PING);
    var makeGetBlock
    /*                */
    = makeIx(GET_BLOCK);
    var makeGetBlockHeader
    /*          */
    = makeIx(GET_BLOCK_HEADER);
    var makeGetCollection
    /*           */
    = makeIx(GET_COLLECTION);

    var is$1 = function is(wat) {
      return function (ix) {
        return ix.tag === wat;
      };
    };

    var isUnknown$1
    /*                 */
    = is$1(UNKNOWN);
    var isScript
    /*                  */
    = is$1(SCRIPT);
    var isTransaction
    /*             */
    = is$1(TRANSACTION);
    var isGetTransactionStatus
    /*    */
    = is$1(GET_TRANSACTION_STATUS);
    var isGetTransaction
    /*          */
    = is$1(GET_TRANSACTION);
    var isGetAccount
    /*              */
    = is$1(GET_ACCOUNT);
    var isGetEvents
    /*               */
    = is$1(GET_EVENTS);
    var isPing
    /*                    */
    = is$1(PING);
    var isGetBlock
    /*                */
    = is$1(GET_BLOCK);
    var isGetBlockHeader
    /*          */
    = is$1(GET_BLOCK_HEADER);
    var isGetCollection
    /*           */
    = is$1(GET_COLLECTION);
    var isOk
    /*  */
    = function isOk
    /*  */
    (ix) {
      return ix.status === OK;
    };
    var isBad
    /* */
    = function isBad
    /* */
    (ix) {
      return ix.status === BAD;
    };
    var why
    /*   */
    = function why
    /*   */
    (ix) {
      return ix.reason;
    };
    var isAccount
    /*  */
    = function isAccount
    /*  */
    (account) {
      return account.kind === ACCOUNT;
    };
    var isParam
    /*    */
    = function isParam
    /*    */
    (param) {
      return param.kind === PARAM;
    };
    var isArgument
    /* */
    = function isArgument
    /* */
    (argument) {
      return argument.kind === ARGUMENT;
    };

    var hardMode = function hardMode(ix) {
      for (var _i = 0, _Object$keys = Object.keys(ix); _i < _Object$keys.length; _i++) {
        var key = _Object$keys[_i];
        if (!KEYS.has(key)) throw new Error("\"".concat(key, "\" is an invalid root level Interaction property."));
      }

      return ix;
    };

    var recPipe = /*#__PURE__*/function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2(ix) {
        var fns,
            _fns,
            hd,
            rest,
            cur,
            _args2 = arguments;

        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                fns = _args2.length > 1 && _args2[1] !== undefined ? _args2[1] : [];
                _context2.prev = 1;
                _context2.t0 = hardMode;
                _context2.next = 5;
                return ix;

              case 5:
                _context2.t1 = _context2.sent;
                ix = (0, _context2.t0)(_context2.t1);

                if (!isBad(ix)) {
                  _context2.next = 9;
                  break;
                }

                throw new Error("Interaction Error: ".concat(ix.reason));

              case 9:
                if (fns.length) {
                  _context2.next = 11;
                  break;
                }

                return _context2.abrupt("return", ix);

              case 11:
                _fns = _toArray(fns), hd = _fns[0], rest = _fns.slice(1);
                _context2.next = 14;
                return hd;

              case 14:
                cur = _context2.sent;

                if (!isFn$3(cur)) {
                  _context2.next = 17;
                  break;
                }

                return _context2.abrupt("return", recPipe(cur(ix), rest));

              case 17:
                if (!(isNull$1(cur) || !cur)) {
                  _context2.next = 19;
                  break;
                }

                return _context2.abrupt("return", recPipe(ix, rest));

              case 19:
                if (!isInteraction(cur)) {
                  _context2.next = 21;
                  break;
                }

                return _context2.abrupt("return", recPipe(cur, rest));

              case 21:
                throw new Error("Invalid Interaction Composition");

              case 24:
                _context2.prev = 24;
                _context2.t2 = _context2["catch"](1);
                throw _context2.t2;

              case 27:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, null, [[1, 24]]);
      }));

      return function recPipe(_x3) {
        return _ref2.apply(this, arguments);
      };
    }();

    var pipe = function pipe() {
      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      var arg1 = args[0],
          arg2 = args[1];
      if (isArray$1(arg1) && arg2 == null) return function (d) {
        return pipe(d, arg1);
      };
      return recPipe(arg1, arg2);
    };

    var identity$1 = function identity(v) {
      return v;
    };

    var get$1 = function get(ix, key, fallback) {
      return ix.assigns[key] == null ? fallback : ix.assigns[key];
    };
    var put$1 = function put(key, value) {
      return function (ix) {
        ix.assigns[key] = value;
        return Ok(ix);
      };
    };
    var update$1 = function update(key) {
      var fn = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : identity$1;
      return function (ix) {
        ix.assigns[key] = fn(ix.assigns[key], ix);
        return Ok(ix);
      };
    };
    var destroy = function destroy(key) {
      return function (ix) {
        delete ix.assigns[key];
        return Ok(ix);
      };
    };

    var ixModule = /*#__PURE__*/Object.freeze({
      __proto__: null,
      UNKNOWN: UNKNOWN,
      SCRIPT: SCRIPT,
      TRANSACTION: TRANSACTION,
      GET_TRANSACTION_STATUS: GET_TRANSACTION_STATUS,
      GET_ACCOUNT: GET_ACCOUNT,
      GET_EVENTS: GET_EVENTS,
      PING: PING,
      GET_TRANSACTION: GET_TRANSACTION,
      GET_BLOCK: GET_BLOCK,
      GET_BLOCK_HEADER: GET_BLOCK_HEADER,
      GET_COLLECTION: GET_COLLECTION,
      BAD: BAD,
      OK: OK,
      ACCOUNT: ACCOUNT,
      PARAM: PARAM,
      ARGUMENT: ARGUMENT,
      AUTHORIZER: AUTHORIZER,
      PAYER: PAYER,
      PROPOSER: PROPOSER,
      interaction: interaction,
      uuid: uuid,
      isNumber: isNumber$1$1,
      isArray: isArray$1,
      isObj: isObj$1,
      isNull: isNull$1,
      isFn: isFn$3,
      isInteraction: isInteraction,
      Ok: Ok,
      Bad: Bad,
      prepAccount: prepAccount,
      makeArgument: makeArgument,
      makeUnknown: makeUnknown,
      makeScript: makeScript,
      makeTransaction: makeTransaction,
      makeGetTransactionStatus: makeGetTransactionStatus,
      makeGetTransaction: makeGetTransaction,
      makeGetAccount: makeGetAccount,
      makeGetEvents: makeGetEvents,
      makePing: makePing,
      makeGetBlock: makeGetBlock,
      makeGetBlockHeader: makeGetBlockHeader,
      makeGetCollection: makeGetCollection,
      isUnknown: isUnknown$1,
      isScript: isScript,
      isTransaction: isTransaction,
      isGetTransactionStatus: isGetTransactionStatus,
      isGetTransaction: isGetTransaction,
      isGetAccount: isGetAccount,
      isGetEvents: isGetEvents,
      isPing: isPing,
      isGetBlock: isGetBlock,
      isGetBlockHeader: isGetBlockHeader,
      isGetCollection: isGetCollection,
      isOk: isOk,
      isBad: isBad,
      why: why,
      isAccount: isAccount,
      isParam: isParam,
      isArgument: isArgument,
      pipe: pipe,
      get: get$1,
      put: put$1,
      update: update$1,
      destroy: destroy
    });

    function build() {
      var fns = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      return pipe(interaction(), fns);
    }

    var DEFAULT_RESPONSE = "{\n    \"tag\":null,\n    \"transaction\":null,\n    \"transactionStatus\":null,\n    \"transactionId\":null,\n    \"encodedData\":null,\n    \"events\":null,\n    \"account\":null,\n    \"block\":null,\n    \"blockHeader\":null,\n    \"latestBlock\":null,\n    \"collection\":null\n}";
    var response = function response() {
      return JSON.parse(DEFAULT_RESPONSE);
    };

    function getBlock() {
      var isSealed = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      return pipe([makeGetBlock, function (ix) {
        ix.block.isSealed = isSealed;
        return Ok(ix);
      }]);
    }

    function getAccount(addr) {
      return pipe([makeGetAccount, function (ix) {
        ix.account.addr = sansPrefix(addr);
        return Ok(ix);
      }]);
    }

    var latestBlockDeprecationNotice = function latestBlockDeprecationNotice() {
      log$2.deprecate({
        pkg: "@onflow/decode",
        subject: "Operating upon data of the latestBlock field of the response object",
        transition: "https://github.com/onflow/flow-js-sdk/blob/master/packages/decode/WARNINGS.md#0001-Deprecating-latestBlock-field"
      });
    };

    var decodeImplicit = /*#__PURE__*/function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2(i) {
        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                return _context2.abrupt("return", i);

              case 1:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));

      return function decodeImplicit(_x4) {
        return _ref2.apply(this, arguments);
      };
    }();

    var decodeVoid = /*#__PURE__*/function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee3() {
        return regenerator.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                return _context3.abrupt("return", null);

              case 1:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3);
      }));

      return function decodeVoid() {
        return _ref3.apply(this, arguments);
      };
    }();

    var decodeType = /*#__PURE__*/function () {
      var _ref4 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee4(type) {
        return regenerator.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                return _context4.abrupt("return", type.staticType);

              case 1:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4);
      }));

      return function decodeType(_x5) {
        return _ref4.apply(this, arguments);
      };
    }();

    var decodePath = /*#__PURE__*/function () {
      var _ref5 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee5(path) {
        return regenerator.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                return _context5.abrupt("return", {
                  domain: path.domain,
                  identifier: path.identifier
                });

              case 1:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5);
      }));

      return function decodePath(_x6) {
        return _ref5.apply(this, arguments);
      };
    }();

    var decodeCapability = /*#__PURE__*/function () {
      var _ref6 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee6(cap) {
        return regenerator.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                return _context6.abrupt("return", {
                  path: cap.path,
                  address: cap.address,
                  borrowType: cap.borrowType
                });

              case 1:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6);
      }));

      return function decodeCapability(_x7) {
        return _ref6.apply(this, arguments);
      };
    }();

    var decodeOptional = /*#__PURE__*/function () {
      var _ref7 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee7(optional, decoders, stack) {
        return regenerator.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                if (!optional) {
                  _context7.next = 6;
                  break;
                }

                _context7.next = 3;
                return recurseDecode(optional, decoders, stack);

              case 3:
                _context7.t0 = _context7.sent;
                _context7.next = 7;
                break;

              case 6:
                _context7.t0 = null;

              case 7:
                return _context7.abrupt("return", _context7.t0);

              case 8:
              case "end":
                return _context7.stop();
            }
          }
        }, _callee7);
      }));

      return function decodeOptional(_x8, _x9, _x10) {
        return _ref7.apply(this, arguments);
      };
    }();

    var decodeReference = /*#__PURE__*/function () {
      var _ref8 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee8(v) {
        return regenerator.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                return _context8.abrupt("return", {
                  address: v.address,
                  type: v.type
                });

              case 1:
              case "end":
                return _context8.stop();
            }
          }
        }, _callee8);
      }));

      return function decodeReference(_x11) {
        return _ref8.apply(this, arguments);
      };
    }();

    var decodeArray = /*#__PURE__*/function () {
      var _ref9 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee10(array, decoders, stack) {
        return regenerator.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                _context10.next = 2;
                return Promise.all(array.map(function (v) {
                  return new Promise( /*#__PURE__*/function () {
                    var _ref10 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee9(res) {
                      return regenerator.wrap(function _callee9$(_context9) {
                        while (1) {
                          switch (_context9.prev = _context9.next) {
                            case 0:
                              _context9.t0 = res;
                              _context9.next = 3;
                              return recurseDecode(v, decoders, [].concat(_toConsumableArray(stack), [v.type]));

                            case 3:
                              _context9.t1 = _context9.sent;
                              return _context9.abrupt("return", (0, _context9.t0)(_context9.t1));

                            case 5:
                            case "end":
                              return _context9.stop();
                          }
                        }
                      }, _callee9);
                    }));

                    return function (_x15) {
                      return _ref10.apply(this, arguments);
                    };
                  }());
                }));

              case 2:
                return _context10.abrupt("return", _context10.sent);

              case 3:
              case "end":
                return _context10.stop();
            }
          }
        }, _callee10);
      }));

      return function decodeArray(_x12, _x13, _x14) {
        return _ref9.apply(this, arguments);
      };
    }();

    var decodeDictionary = /*#__PURE__*/function () {
      var _ref11 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee12(dictionary, decoders, stack) {
        return regenerator.wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                _context12.next = 2;
                return dictionary.reduce( /*#__PURE__*/function () {
                  var _ref12 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee11(acc, v) {
                    return regenerator.wrap(function _callee11$(_context11) {
                      while (1) {
                        switch (_context11.prev = _context11.next) {
                          case 0:
                            _context11.next = 2;
                            return acc;

                          case 2:
                            acc = _context11.sent;
                            _context11.next = 5;
                            return recurseDecode(v.key, decoders, [].concat(_toConsumableArray(stack), [v.key]));

                          case 5:
                            _context11.t0 = _context11.sent;
                            _context11.next = 8;
                            return recurseDecode(v.value, decoders, [].concat(_toConsumableArray(stack), [v.key]));

                          case 8:
                            acc[_context11.t0] = _context11.sent;
                            return _context11.abrupt("return", acc);

                          case 10:
                          case "end":
                            return _context11.stop();
                        }
                      }
                    }, _callee11);
                  }));

                  return function (_x19, _x20) {
                    return _ref12.apply(this, arguments);
                  };
                }(), Promise.resolve({}));

              case 2:
                return _context12.abrupt("return", _context12.sent);

              case 3:
              case "end":
                return _context12.stop();
            }
          }
        }, _callee12);
      }));

      return function decodeDictionary(_x16, _x17, _x18) {
        return _ref11.apply(this, arguments);
      };
    }();

    var decodeComposite = /*#__PURE__*/function () {
      var _ref13 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee14(composite, decoders, stack) {
        var decoded, decoder;
        return regenerator.wrap(function _callee14$(_context14) {
          while (1) {
            switch (_context14.prev = _context14.next) {
              case 0:
                _context14.next = 2;
                return composite.fields.reduce( /*#__PURE__*/function () {
                  var _ref14 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee13(acc, v) {
                    return regenerator.wrap(function _callee13$(_context13) {
                      while (1) {
                        switch (_context13.prev = _context13.next) {
                          case 0:
                            _context13.next = 2;
                            return acc;

                          case 2:
                            acc = _context13.sent;
                            _context13.next = 5;
                            return recurseDecode(v.value, decoders, [].concat(_toConsumableArray(stack), [v.name]));

                          case 5:
                            acc[v.name] = _context13.sent;
                            return _context13.abrupt("return", acc);

                          case 7:
                          case "end":
                            return _context13.stop();
                        }
                      }
                    }, _callee13);
                  }));

                  return function (_x24, _x25) {
                    return _ref14.apply(this, arguments);
                  };
                }(), Promise.resolve({}));

              case 2:
                decoded = _context14.sent;
                decoder = composite.id && decoderLookup(decoders, composite.id);

                if (!decoder) {
                  _context14.next = 10;
                  break;
                }

                _context14.next = 7;
                return decoder(decoded);

              case 7:
                _context14.t0 = _context14.sent;
                _context14.next = 11;
                break;

              case 10:
                _context14.t0 = decoded;

              case 11:
                return _context14.abrupt("return", _context14.t0);

              case 12:
              case "end":
                return _context14.stop();
            }
          }
        }, _callee14);
      }));

      return function decodeComposite(_x21, _x22, _x23) {
        return _ref13.apply(this, arguments);
      };
    }();

    var defaultDecoders = {
      UInt: decodeImplicit,
      Int: decodeImplicit,
      UInt8: decodeImplicit,
      Int8: decodeImplicit,
      UInt16: decodeImplicit,
      Int16: decodeImplicit,
      UInt32: decodeImplicit,
      Int32: decodeImplicit,
      UInt64: decodeImplicit,
      Int64: decodeImplicit,
      UInt128: decodeImplicit,
      Int128: decodeImplicit,
      UInt256: decodeImplicit,
      Int256: decodeImplicit,
      Word8: decodeImplicit,
      Word16: decodeImplicit,
      Word32: decodeImplicit,
      Word64: decodeImplicit,
      UFix64: decodeImplicit,
      Fix64: decodeImplicit,
      String: decodeImplicit,
      Character: decodeImplicit,
      Bool: decodeImplicit,
      Address: decodeImplicit,
      Void: decodeVoid,
      Optional: decodeOptional,
      Reference: decodeReference,
      Array: decodeArray,
      Dictionary: decodeDictionary,
      Event: decodeComposite,
      Resource: decodeComposite,
      Struct: decodeComposite,
      Enum: decodeComposite,
      Type: decodeType,
      Path: decodePath,
      Capability: decodeCapability
    };

    var decoderLookup = function decoderLookup(decoders, lookup) {
      var found = Object.keys(decoders).find(function (decoder) {
        if (/^\/.*\/$/.test(decoder)) {
          var reg = new RegExp(decoder.substring(1, decoder.length - 1));
          return reg.test(lookup);
        }

        return decoder === lookup;
      });
      return lookup && found && decoders[found];
    };

    var recurseDecode = /*#__PURE__*/function () {
      var _ref15 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee15(decodeInstructions, decoders, stack) {
        var decoder;
        return regenerator.wrap(function _callee15$(_context15) {
          while (1) {
            switch (_context15.prev = _context15.next) {
              case 0:
                decoder = decoderLookup(decoders, decodeInstructions.type);

                if (decoder) {
                  _context15.next = 3;
                  break;
                }

                throw new Error("Undefined Decoder Error: ".concat(decodeInstructions.type, "@").concat(stack.join(".")));

              case 3:
                _context15.next = 5;
                return decoder(decodeInstructions.value, decoders, stack);

              case 5:
                return _context15.abrupt("return", _context15.sent);

              case 6:
              case "end":
                return _context15.stop();
            }
          }
        }, _callee15);
      }));

      return function recurseDecode(_x26, _x27, _x28) {
        return _ref15.apply(this, arguments);
      };
    }();

    var decode$1 = /*#__PURE__*/function () {
      var _ref16 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee16(decodeInstructions) {
        var customDecoders,
            stack,
            filteredDecoders,
            decoders,
            _args16 = arguments;
        return regenerator.wrap(function _callee16$(_context16) {
          while (1) {
            switch (_context16.prev = _context16.next) {
              case 0:
                customDecoders = _args16.length > 1 && _args16[1] !== undefined ? _args16[1] : {};
                stack = _args16.length > 2 && _args16[2] !== undefined ? _args16[2] : [];
                // Filter out all default decoders which are overridden by a custom decoder regex
                filteredDecoders = Object.keys(defaultDecoders).filter(function (decoder) {
                  return !Object.keys(customDecoders).find(function (customDecoder) {
                    return new RegExp(customDecoder).test(decoder);
                  });
                }).reduce(function (decoders, decoderKey) {
                  decoders[decoderKey] = defaultDecoders[decoderKey];
                  return decoders;
                }, customDecoders);
                decoders = _objectSpread2(_objectSpread2({}, filteredDecoders), customDecoders);
                return _context16.abrupt("return", recurseDecode(decodeInstructions, decoders, stack));

              case 5:
              case "end":
                return _context16.stop();
            }
          }
        }, _callee16);
      }));

      return function decode(_x29) {
        return _ref16.apply(this, arguments);
      };
    }();
    var decodeResponse = /*#__PURE__*/function () {
      var _ref17 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee19(response) {
        var customDecoders,
            _args19 = arguments;
        return regenerator.wrap(function _callee19$(_context19) {
          while (1) {
            switch (_context19.prev = _context19.next) {
              case 0:
                customDecoders = _args19.length > 1 && _args19[1] !== undefined ? _args19[1] : {};

                if (!response.encodedData) {
                  _context19.next = 5;
                  break;
                }

                return _context19.abrupt("return", decode$1(response.encodedData, customDecoders));

              case 5:
                if (!response.transactionStatus) {
                  _context19.next = 16;
                  break;
                }

                _context19.t0 = _objectSpread2;
                _context19.t1 = _objectSpread2({}, response.transactionStatus);
                _context19.t2 = {};
                _context19.next = 11;
                return Promise.all(response.transactionStatus.events.map( /*#__PURE__*/function () {
                  var _decodeEvents = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee17(e) {
                    return regenerator.wrap(function _callee17$(_context17) {
                      while (1) {
                        switch (_context17.prev = _context17.next) {
                          case 0:
                            _context17.t0 = e.type;
                            _context17.t1 = e.transactionId;
                            _context17.t2 = e.transactionIndex;
                            _context17.t3 = e.eventIndex;
                            _context17.next = 6;
                            return decode$1(e.payload, customDecoders);

                          case 6:
                            _context17.t4 = _context17.sent;
                            return _context17.abrupt("return", {
                              type: _context17.t0,
                              transactionId: _context17.t1,
                              transactionIndex: _context17.t2,
                              eventIndex: _context17.t3,
                              data: _context17.t4
                            });

                          case 8:
                          case "end":
                            return _context17.stop();
                        }
                      }
                    }, _callee17);
                  }));

                  function decodeEvents(_x31) {
                    return _decodeEvents.apply(this, arguments);
                  }

                  return decodeEvents;
                }()));

              case 11:
                _context19.t3 = _context19.sent;
                _context19.t4 = {
                  events: _context19.t3
                };
                return _context19.abrupt("return", (0, _context19.t0)(_context19.t1, _context19.t2, _context19.t4));

              case 16:
                if (!response.transaction) {
                  _context19.next = 20;
                  break;
                }

                return _context19.abrupt("return", response.transaction);

              case 20:
                if (!response.events) {
                  _context19.next = 26;
                  break;
                }

                _context19.next = 23;
                return Promise.all(response.events.map( /*#__PURE__*/function () {
                  var _decodeEvents2 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee18(e) {
                    return regenerator.wrap(function _callee18$(_context18) {
                      while (1) {
                        switch (_context18.prev = _context18.next) {
                          case 0:
                            _context18.t0 = e.blockId;
                            _context18.t1 = e.blockHeight;
                            _context18.t2 = e.blockTimestamp;
                            _context18.t3 = e.type;
                            _context18.t4 = e.transactionId;
                            _context18.t5 = e.transactionIndex;
                            _context18.t6 = e.eventIndex;
                            _context18.next = 9;
                            return decode$1(e.payload, customDecoders);

                          case 9:
                            _context18.t7 = _context18.sent;
                            return _context18.abrupt("return", {
                              blockId: _context18.t0,
                              blockHeight: _context18.t1,
                              blockTimestamp: _context18.t2,
                              type: _context18.t3,
                              transactionId: _context18.t4,
                              transactionIndex: _context18.t5,
                              eventIndex: _context18.t6,
                              data: _context18.t7
                            });

                          case 11:
                          case "end":
                            return _context18.stop();
                        }
                      }
                    }, _callee18);
                  }));

                  function decodeEvents(_x32) {
                    return _decodeEvents2.apply(this, arguments);
                  }

                  return decodeEvents;
                }()));

              case 23:
                return _context19.abrupt("return", _context19.sent);

              case 26:
                if (!response.account) {
                  _context19.next = 30;
                  break;
                }

                return _context19.abrupt("return", response.account);

              case 30:
                if (!response.block) {
                  _context19.next = 34;
                  break;
                }

                return _context19.abrupt("return", response.block);

              case 34:
                if (!response.blockHeader) {
                  _context19.next = 38;
                  break;
                }

                return _context19.abrupt("return", response.blockHeader);

              case 38:
                if (!response.latestBlock) {
                  _context19.next = 43;
                  break;
                }

                latestBlockDeprecationNotice();
                return _context19.abrupt("return", response.latestBlock);

              case 43:
                if (!response.transactionId) {
                  _context19.next = 47;
                  break;
                }

                return _context19.abrupt("return", response.transactionId);

              case 47:
                if (!response.collection) {
                  _context19.next = 49;
                  break;
                }

                return _context19.abrupt("return", response.collection);

              case 49:
                return _context19.abrupt("return", null);

              case 50:
              case "end":
                return _context19.stop();
            }
          }
        }, _callee19);
      }));

      return function decodeResponse(_x30) {
        return _ref17.apply(this, arguments);
      };
    }();

    var isFn$2 = function isFn(v) {
      return typeof v === "function";
    };

    var isString$1$1 = function isString(v) {
      return typeof v === "string";
    };

    function resolveCadence(_x) {
      return _resolveCadence.apply(this, arguments);
    }

    function _resolveCadence() {
      _resolveCadence = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(ix) {
        var cadence;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!(isTransaction(ix) || isScript(ix))) {
                  _context.next = 11;
                  break;
                }

                cadence = get$1(ix, "ix.cadence");
                invariant$1(isFn$2(cadence) || isString$1$1(cadence), "Cadence needs to be a function or a string.");

                if (!isFn$2(cadence)) {
                  _context.next = 7;
                  break;
                }

                _context.next = 6;
                return cadence({});

              case 6:
                cadence = _context.sent;

              case 7:
                invariant$1(isString$1$1(cadence), "Cadence needs to be a string at this point.");
                _context.next = 10;
                return config$2().where(/^0x/).then(function (d) {
                  return Object.entries(d).reduce(function (cadence, _ref) {
                    var _ref2 = _slicedToArray(_ref, 2),
                        key = _ref2[0],
                        value = _ref2[1];

                    var regex = new RegExp("(\\b" + key + "\\b)", "g");
                    return cadence.replace(regex, value);
                  }, cadence);
                });

              case 10:
                ix.message.cadence = _context.sent;

              case 11:
                return _context.abrupt("return", ix);

              case 12:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _resolveCadence.apply(this, arguments);
    }

    var isFn$1 = function isFn(v) {
      return typeof v === "function";
    };

    function cast(arg) {
      // prettier-ignore
      invariant$1(_typeof(arg.xform) != null, "No type specified for argument: ".concat(arg.value));
      if (isFn$1(arg.xform)) return arg.xform(arg.value);
      if (isFn$1(arg.xform.asArgument)) return arg.xform.asArgument(arg.value); // prettier-ignore

      invariant$1(false, "Invalid Argument", arg);
    }

    function handleArgResolution(_x) {
      return _handleArgResolution.apply(this, arguments);
    }

    function _handleArgResolution() {
      _handleArgResolution = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(arg) {
        var depth,
            resolvedArg,
            _args = arguments;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                depth = _args.length > 1 && _args[1] !== undefined ? _args[1] : 3;
                invariant$1(depth > 0, "Argument Resolve Recursion Limit Exceeded for Arg: ".concat(arg.tempId));

                if (!isFn$1(arg.resolveArgument)) {
                  _context.next = 9;
                  break;
                }

                _context.next = 5;
                return arg.resolveArgument();

              case 5:
                resolvedArg = _context.sent;
                return _context.abrupt("return", handleArgResolution(resolvedArg, depth - 1));

              case 9:
                return _context.abrupt("return", arg);

              case 10:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _handleArgResolution.apply(this, arguments);
    }

    function resolveArguments(_x2) {
      return _resolveArguments.apply(this, arguments);
    }

    function _resolveArguments() {
      _resolveArguments = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2(ix) {
        var _i, _Object$entries, _Object$entries$_i, id, arg, res;

        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!(isTransaction(ix) || isScript(ix))) {
                  _context2.next = 11;
                  break;
                }

                _i = 0, _Object$entries = Object.entries(ix.arguments);

              case 2:
                if (!(_i < _Object$entries.length)) {
                  _context2.next = 11;
                  break;
                }

                _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2), id = _Object$entries$_i[0], arg = _Object$entries$_i[1];
                _context2.next = 6;
                return handleArgResolution(arg);

              case 6:
                res = _context2.sent;
                ix.arguments[id].asArgument = cast(res);

              case 8:
                _i++;
                _context2.next = 2;
                break;

              case 11:
                return _context2.abrupt("return", ix);

              case 12:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));
      return _resolveArguments.apply(this, arguments);
    }

    var encodeTransactionPayload = function encodeTransactionPayload(tx) {
      return prependTransactionDomainTag(rlpEncode(preparePayload(tx)));
    };
    var encodeTransactionEnvelope = function encodeTransactionEnvelope(tx) {
      return prependTransactionDomainTag(rlpEncode(prepareEnvelope(tx)));
    };

    var rightPaddedHexBuffer = function rightPaddedHexBuffer(value, pad) {
      return buffer.Buffer.from(value.padEnd(pad * 2, 0), "hex");
    };

    var leftPaddedHexBuffer = function leftPaddedHexBuffer(value, pad) {
      return buffer.Buffer.from(value.padStart(pad * 2, 0), "hex");
    };

    var TRANSACTION_DOMAIN_TAG = rightPaddedHexBuffer(buffer.Buffer.from("FLOW-V0.0-transaction").toString("hex"), 32).toString("hex");

    var prependTransactionDomainTag = function prependTransactionDomainTag(tx) {
      return TRANSACTION_DOMAIN_TAG + tx;
    };

    var addressBuffer = function addressBuffer(addr) {
      return leftPaddedHexBuffer(addr, 8);
    };

    var blockBuffer = function blockBuffer(block) {
      return leftPaddedHexBuffer(block, 32);
    };

    var argumentToString = function argumentToString(arg) {
      return buffer.Buffer.from(JSON.stringify(arg), "utf8");
    };

    var scriptBuffer = function scriptBuffer(script) {
      return buffer.Buffer.from(script, "utf8");
    };

    var signatureBuffer = function signatureBuffer(signature) {
      return buffer.Buffer.from(signature, "hex");
    };

    var rlpEncode = function rlpEncode(v) {
      return encode(v).toString("hex");
    };

    var preparePayload = function preparePayload(tx) {
      validatePayload(tx);
      return [scriptBuffer(tx.cadence), tx.arguments.map(argumentToString), blockBuffer(tx.refBlock), tx.computeLimit, addressBuffer(sansPrefix(tx.proposalKey.address)), tx.proposalKey.keyId, tx.proposalKey.sequenceNum, addressBuffer(sansPrefix(tx.payer)), tx.authorizers.map(function (authorizer) {
        return addressBuffer(sansPrefix(authorizer));
      })];
    };

    var prepareEnvelope = function prepareEnvelope(tx) {
      validateEnvelope(tx);
      return [preparePayload(tx), preparePayloadSignatures(tx)];
    };

    var preparePayloadSignatures = function preparePayloadSignatures(tx) {
      var signers = collectSigners(tx);
      return tx.payloadSigs.map(function (sig) {
        return {
          signerIndex: signers.get(sig.address),
          keyId: sig.keyId,
          sig: sig.sig
        };
      }).sort(function (a, b) {
        if (a.signerIndex > b.signerIndex) return 1;
        if (a.signerIndex < b.signerIndex) return -1;
        if (a.keyId > b.keyId) return 1;
        if (a.keyId < b.keyId) return -1;
      }).map(function (sig) {
        return [sig.signerIndex, sig.keyId, signatureBuffer(sig.sig)];
      });
    };

    var collectSigners = function collectSigners(tx) {
      var signers = new Map();
      var i = 0;

      var addSigner = function addSigner(addr) {
        if (!signers.has(addr)) {
          signers.set(addr, i);
          i++;
        }
      };

      addSigner(tx.proposalKey.address);
      addSigner(tx.payer);
      tx.authorizers.forEach(addSigner);
      return signers;
    };

    var validatePayload = function validatePayload(tx) {
      payloadFields.forEach(function (field) {
        return checkField(tx, field);
      });
      proposalKeyFields.forEach(function (field) {
        return checkField(tx.proposalKey, field, "proposalKey");
      });
    };

    var validateEnvelope = function validateEnvelope(tx) {
      payloadSigsFields.forEach(function (field) {
        return checkField(tx, field);
      });
      tx.payloadSigs.forEach(function (sig, index) {
        payloadSigFields.forEach(function (field) {
          return checkField(sig, field, "payloadSigs", index);
        });
      });
    };

    var isNumber$2 = function isNumber(v) {
      return typeof v === "number";
    };

    var isString$2 = function isString(v) {
      return typeof v === "string";
    };

    var isObject$1 = function isObject(v) {
      return v !== null && _typeof(v) === "object";
    };

    var isArray$2 = function isArray(v) {
      return isObject$1(v) && v instanceof Array;
    };

    var payloadFields = [{
      name: "cadence",
      check: isString$2
    }, {
      name: "arguments",
      check: isArray$2
    }, {
      name: "refBlock",
      check: isString$2,
      defaultVal: "0"
    }, {
      name: "computeLimit",
      check: isNumber$2
    }, {
      name: "proposalKey",
      check: isObject$1
    }, {
      name: "payer",
      check: isString$2
    }, {
      name: "authorizers",
      check: isArray$2
    }];
    var proposalKeyFields = [{
      name: "address",
      check: isString$2
    }, {
      name: "keyId",
      check: isNumber$2
    }, {
      name: "sequenceNum",
      check: isNumber$2
    }];
    var payloadSigsFields = [{
      name: "payloadSigs",
      check: isArray$2
    }];
    var payloadSigFields = [{
      name: "address",
      check: isString$2
    }, {
      name: "keyId",
      check: isNumber$2
    }, {
      name: "sig",
      check: isString$2
    }];

    var checkField = function checkField(obj, field, base, index) {
      var name = field.name,
          check = field.check,
          defaultVal = field.defaultVal;
      if (obj[name] == null && defaultVal != null) obj[name] = defaultVal;
      if (obj[name] == null) throw missingFieldError(name, base, index);
      if (!check(obj[name])) throw invalidFieldError(name, base, index);
    };

    var printFieldName = function printFieldName(field, base, index) {
      if (!!base) return index == null ? "".concat(base, ".").concat(field) : "".concat(base, ".").concat(index, ".").concat(field);
      return field;
    };

    var missingFieldError = function missingFieldError(field, base, index) {
      return new Error("Missing field ".concat(printFieldName(field, base, index)));
    };

    var invalidFieldError = function invalidFieldError(field, base, index) {
      return new Error("Invalid field ".concat(printFieldName(field, base, index)));
    };

    function findInsideSigners(ix) {
      // Inside Signers Are: (authorizers + proposer) - payer
      var inside = new Set(ix.authorizations);
      inside.add(ix.proposer);

      if (Array.isArray(ix.payer)) {
        ix.payer.forEach(function (p) {
          return inside["delete"](p);
        });
      } else {
        inside["delete"](ix.payer);
      }

      return Array.from(inside);
    }
    function findOutsideSigners(ix) {
      // Outside Signers Are: (payer)
      var outside = new Set(Array.isArray(ix.payer) ? ix.payer : [ix.payer]);
      return Array.from(outside);
    }
    var createSignableVoucher = function createSignableVoucher(ix) {
      var buildAuthorizers = function buildAuthorizers() {
        var authorizations = ix.authorizations.map(function (cid) {
          return withPrefix$1(ix.accounts[cid].addr);
        }).reduce(function (prev, current) {
          return prev.find(function (item) {
            return item === current;
          }) ? prev : [].concat(_toConsumableArray(prev), [current]);
        }, []);
        return authorizations[0] ? authorizations : [];
      };

      var buildInsideSigners = function buildInsideSigners() {
        return findInsideSigners(ix).map(function (id) {
          return {
            address: withPrefix$1(ix.accounts[id].addr),
            keyId: ix.accounts[id].keyId,
            sig: ix.accounts[id].signature
          };
        });
      };

      var buildOutsideSigners = function buildOutsideSigners() {
        return findOutsideSigners(ix).map(function (id) {
          return {
            address: withPrefix$1(ix.accounts[id].addr),
            keyId: ix.accounts[id].keyId,
            sig: ix.accounts[id].signature
          };
        });
      };

      return {
        cadence: ix.message.cadence,
        refBlock: ix.message.refBlock || null,
        computeLimit: ix.message.computeLimit,
        arguments: ix.message.arguments.map(function (id) {
          return ix.arguments[id].asArgument;
        }),
        proposalKey: {
          address: withPrefix$1(ix.accounts[ix.proposer].addr),
          keyId: ix.accounts[ix.proposer].keyId,
          sequenceNum: ix.accounts[ix.proposer].sequenceNum
        },
        payer: withPrefix$1(ix.accounts[Array.isArray(ix.payer) ? ix.payer[0] : ix.payer].addr),
        authorizers: buildAuthorizers(),
        payloadSigs: buildInsideSigners(),
        envelopeSigs: buildOutsideSigners()
      };
    };

    var idof$1 = function idof(acct) {
      return "".concat(withPrefix$1(acct.addr), "-").concat(acct.keyId);
    };

    var isFn$4 = function isFn(v) {
      return typeof v === "function";
    };

    function buildPreSignable(acct, ix) {
      try {
        return {
          f_type: "PreSignable",
          f_vsn: "1.0.1",
          roles: acct.role,
          cadence: ix.message.cadence,
          args: ix.message.arguments.map(function (d) {
            return ix.arguments[d].asArgument;
          }),
          data: {},
          interaction: ix,
          voucher: createSignableVoucher(ix)
        };
      } catch (error) {
        console.error("buildPreSignable", error);
        throw error;
      }
    }

    function collectAccounts(_x, _x2, _x3) {
      return _collectAccounts.apply(this, arguments);
    }

    function _collectAccounts() {
      _collectAccounts = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(ix, accounts, last) {
        var depth,
            authorizations,
            _iterator,
            _step,
            _loop,
            old,
            _args2 = arguments;

        return regenerator.wrap(function _callee$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                depth = _args2.length > 3 && _args2[3] !== undefined ? _args2[3] : 3;
                invariant$1(depth, "Account Resolve Recursion Limit Exceeded", {
                  ix: ix,
                  accounts: accounts
                });
                authorizations = [];
                _iterator = _createForOfIteratorHelper(accounts);
                _context2.prev = 4;
                _loop = /*#__PURE__*/regenerator.mark(function _loop() {
                  var ax, resolve, dupList, payerAccts, multiAccts;
                  return regenerator.wrap(function _loop$(_context) {
                    while (1) {
                      switch (_context.prev = _context.next) {
                        case 0:
                          ax = _step.value;
                          resolve = ax.resolve;
                          ax.resolve = null;
                          old = last || ax;

                          if (!isFn$4(resolve)) {
                            _context.next = 8;
                            break;
                          }

                          _context.next = 7;
                          return resolve(ax, buildPreSignable(ax, ix));

                        case 7:
                          ax = _context.sent;

                        case 8:
                          if (!Array.isArray(ax)) {
                            _context.next = 13;
                            break;
                          }

                          _context.next = 11;
                          return collectAccounts(ix, ax, old, depth - 1);

                        case 11:
                          _context.next = 30;
                          break;

                        case 13:
                          if (ax.addr) {
                            ax.addr = sansPrefix(ax.addr);
                          }

                          if (ax.addr != null && ax.keyId != null) {
                            ax.tempId = idof$1(ax);
                          }

                          ix.accounts[ax.tempId] = ix.accounts[ax.tempId] || ax;
                          ix.accounts[ax.tempId].role.proposer = ix.accounts[ax.tempId].role.proposer || ax.role.proposer;
                          ix.accounts[ax.tempId].role.payer = ix.accounts[ax.tempId].role.payer || ax.role.payer;
                          ix.accounts[ax.tempId].role.authorizer = ix.accounts[ax.tempId].role.authorizer || ax.role.authorizer;

                          if (ix.accounts[ax.tempId].role.proposer && ix.proposer === old.tempId) {
                            ix.proposer = ax.tempId;
                          }

                          if (!ix.accounts[ax.tempId].role.payer) {
                            _context.next = 29;
                            break;
                          }

                          if (Array.isArray(ix.payer)) {
                            ix.payer = Array.from(new Set([].concat(_toConsumableArray(ix.payer), [ax.tempId]).map(function (d) {
                              return d === old.tempId ? ax.tempId : d;
                            })));
                          } else {
                            ix.payer = Array.from(new Set([ix.payer, ax.tempId].map(function (d) {
                              return d === old.tempId ? ax.tempId : d;
                            })));
                          }

                          if (!(ix.payer.length > 1)) {
                            _context.next = 29;
                            break;
                          }

                          // remove payer dups based on addr and keyId
                          dupList = [];
                          payerAccts = [];
                          ix.payer = ix.payer.reduce(function (g, tempId) {
                            var addr = ix.accounts[tempId].addr;
                            var key = idof$1(ix.accounts[tempId]);
                            payerAccts.push(addr);
                            if (dupList.includes(key)) return g;
                            dupList.push(key);
                            return [].concat(_toConsumableArray(g), [tempId]);
                          }, []);
                          multiAccts = Array.from(new Set(payerAccts));

                          if (!(multiAccts.length > 1)) {
                            _context.next = 29;
                            break;
                          }

                          throw new Error("Payer can not be different accounts");

                        case 29:
                          if (ix.accounts[ax.tempId].role.authorizer) {
                            if (last) {
                              // do group replacement
                              authorizations = Array.from(new Set([].concat(_toConsumableArray(authorizations), [ax.tempId])));
                            } else {
                              // do 1-1 replacement
                              ix.authorizations = ix.authorizations.map(function (d) {
                                return d === old.tempId ? ax.tempId : d;
                              });
                            }
                          }

                        case 30:
                          if (old.tempId != ax.tempId) delete ix.accounts[old.tempId];

                        case 31:
                        case "end":
                          return _context.stop();
                      }
                    }
                  }, _loop);
                });

                _iterator.s();

              case 7:
                if ((_step = _iterator.n()).done) {
                  _context2.next = 11;
                  break;
                }

                return _context2.delegateYield(_loop(), "t0", 9);

              case 9:
                _context2.next = 7;
                break;

              case 11:
                _context2.next = 16;
                break;

              case 13:
                _context2.prev = 13;
                _context2.t1 = _context2["catch"](4);

                _iterator.e(_context2.t1);

              case 16:
                _context2.prev = 16;

                _iterator.f();

                return _context2.finish(16);

              case 19:
                if (last) {
                  // complete (flatmap) group replacement
                  ix.authorizations = ix.authorizations.map(function (d) {
                    return d === last.tempId ? authorizations : d;
                  }).reduce(function (prev, curr) {
                    return Array.isArray(curr) ? [].concat(_toConsumableArray(prev), _toConsumableArray(curr)) : [].concat(_toConsumableArray(prev), [curr]);
                  }, []);
                }

              case 20:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee, null, [[4, 13, 16, 19]]);
      }));
      return _collectAccounts.apply(this, arguments);
    }

    function resolveAccounts(_x4) {
      return _resolveAccounts.apply(this, arguments);
    }

    function _resolveAccounts() {
      _resolveAccounts = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2(ix) {
        return regenerator.wrap(function _callee2$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                if (!isTransaction(ix)) {
                  _context3.next = 13;
                  break;
                }

                if (!Array.isArray(ix.payer)) {
                  log$2.deprecate({
                    pkg: "FCL",
                    subject: '"ix.payer" must be an array. Support for ix.payer as a singular',
                    message: "See changelog for more info."
                  });
                }

                _context3.prev = 2;
                _context3.next = 5;
                return collectAccounts(ix, Object.values(ix.accounts));

              case 5:
                _context3.next = 7;
                return collectAccounts(ix, Object.values(ix.accounts));

              case 7:
                _context3.next = 13;
                break;

              case 9:
                _context3.prev = 9;
                _context3.t0 = _context3["catch"](2);
                console.error("=== SAD PANDA ===\n\n", _context3.t0, "\n\n=== SAD PANDA ===");
                throw _context3.t0;

              case 13:
                return _context3.abrupt("return", ix);

              case 14:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee2, null, [[2, 9]]);
      }));
      return _resolveAccounts.apply(this, arguments);
    }

    function resolveSignatures(_x) {
      return _resolveSignatures.apply(this, arguments);
    }

    function _resolveSignatures() {
      _resolveSignatures = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2(ix) {
        var insideSigners, insidePayload, outsideSigners, outsidePayload;
        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!isTransaction(ix)) {
                  _context2.next = 16;
                  break;
                }

                _context2.prev = 1;
                insideSigners = findInsideSigners(ix);
                insidePayload = encodeTransactionPayload(prepForEncoding(ix));
                _context2.next = 6;
                return Promise.all(insideSigners.map(fetchSignature(ix, insidePayload)));

              case 6:
                outsideSigners = findOutsideSigners(ix);
                outsidePayload = encodeTransactionEnvelope(_objectSpread2(_objectSpread2({}, prepForEncoding(ix)), {}, {
                  payloadSigs: insideSigners.map(function (id) {
                    return {
                      address: ix.accounts[id].addr,
                      keyId: ix.accounts[id].keyId,
                      sig: ix.accounts[id].signature
                    };
                  })
                }));
                _context2.next = 10;
                return Promise.all(outsideSigners.map(fetchSignature(ix, outsidePayload)));

              case 10:
                _context2.next = 16;
                break;

              case 12:
                _context2.prev = 12;
                _context2.t0 = _context2["catch"](1);
                console.error("Signatures", _context2.t0, {
                  ix: ix
                });
                throw _context2.t0;

              case 16:
                return _context2.abrupt("return", ix);

              case 17:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, null, [[1, 12]]);
      }));
      return _resolveSignatures.apply(this, arguments);
    }

    function fetchSignature(ix, payload) {
      return /*#__PURE__*/function () {
        var _innerFetchSignature = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(id) {
          var acct, _yield$acct$signingFu, signature;

          return regenerator.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  acct = ix.accounts[id];

                  if (!(acct.signature != null)) {
                    _context.next = 3;
                    break;
                  }

                  return _context.abrupt("return");

                case 3:
                  _context.next = 5;
                  return acct.signingFunction(buildSignable(acct, payload, ix));

                case 5:
                  _yield$acct$signingFu = _context.sent;
                  signature = _yield$acct$signingFu.signature;
                  ix.accounts[id].signature = signature;

                case 8:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee);
        }));

        function innerFetchSignature(_x2) {
          return _innerFetchSignature.apply(this, arguments);
        }

        return innerFetchSignature;
      }();
    }

    function buildSignable(acct, message, ix) {
      try {
        return {
          f_type: "Signable",
          f_vsn: "1.0.1",
          message: message,
          addr: sansPrefix(acct.addr),
          keyId: acct.keyId,
          roles: acct.role,
          cadence: ix.message.cadence,
          args: ix.message.arguments.map(function (d) {
            return ix.arguments[d].asArgument;
          }),
          data: {},
          interaction: ix,
          voucher: createSignableVoucher(ix)
        };
      } catch (error) {
        console.error("buildSignable", error);
        throw error;
      }
    }

    function prepForEncoding(ix) {
      var payerAddress = sansPrefix((Array.isArray(ix.payer) ? ix.accounts[ix.payer[0]] : ix.accounts[ix.payer]).addr);
      return {
        cadence: ix.message.cadence,
        refBlock: ix.message.refBlock || null,
        computeLimit: ix.message.computeLimit,
        arguments: ix.message.arguments.map(function (id) {
          return ix.arguments[id].asArgument;
        }),
        proposalKey: {
          address: sansPrefix(ix.accounts[ix.proposer].addr),
          keyId: ix.accounts[ix.proposer].keyId,
          sequenceNum: ix.accounts[ix.proposer].sequenceNum
        },
        payer: payerAddress,
        authorizers: ix.authorizations.map(function (cid) {
          return sansPrefix(ix.accounts[cid].addr);
        }).reduce(function (prev, current) {
          return prev.find(function (item) {
            return item === current;
          }) ? prev : [].concat(_toConsumableArray(prev), [current]);
        }, [])
      };
    }

    function resolveValidators(_x) {
      return _resolveValidators.apply(this, arguments);
    }

    function _resolveValidators() {
      _resolveValidators = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(ix) {
        var validators;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                validators = get$1(ix, "ix.validators", []);
                return _context.abrupt("return", pipe(ix, validators.map(function (cb) {
                  return function (ix) {
                    return cb(ix, {
                      Ok: Ok,
                      Bad: Bad
                    });
                  };
                })));

              case 2:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _resolveValidators.apply(this, arguments);
    }

    function resolveFinalNormalization(_x) {
      return _resolveFinalNormalization.apply(this, arguments);
    }

    function _resolveFinalNormalization() {
      _resolveFinalNormalization = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(ix) {
        var _i, _Object$keys, key;

        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                for (_i = 0, _Object$keys = Object.keys(ix.accounts); _i < _Object$keys.length; _i++) {
                  key = _Object$keys[_i];
                  ix.accounts[key].addr = sansPrefix(ix.accounts[key].addr);
                }

                return _context.abrupt("return", ix);

              case 2:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _resolveFinalNormalization.apply(this, arguments);
    }

    function resolveVoucherIntercept(_x) {
      return _resolveVoucherIntercept.apply(this, arguments);
    }

    function _resolveVoucherIntercept() {
      _resolveVoucherIntercept = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(ix) {
        var fn;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                fn = get$1(ix, "ix.voucher-intercept");

                if (!isFn$3(fn)) {
                  _context.next = 4;
                  break;
                }

                _context.next = 4;
                return fn(createSignableVoucher(ix));

              case 4:
                return _context.abrupt("return", ix);

              case 5:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _resolveVoucherIntercept.apply(this, arguments);
    }

    var DEFAULT_COMPUTE_LIMIT = 100;
    function resolveComputeLimit(_x) {
      return _resolveComputeLimit.apply(this, arguments);
    }

    function _resolveComputeLimit() {
      _resolveComputeLimit = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(ix) {
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!isTransaction(ix)) {
                  _context.next = 8;
                  break;
                }

                _context.t0 = ix.message.computeLimit;

                if (_context.t0) {
                  _context.next = 6;
                  break;
                }

                _context.next = 5;
                return config$2.get("fcl.limit");

              case 5:
                _context.t0 = _context.sent;

              case 6:
                ix.message.computeLimit = _context.t0;

                if (!ix.message.computeLimit) {
                  log$2.deprecate({
                    pkg: "FCL/SDK",
                    subject: "The built-in default compute limit (DEFAULT_COMPUTE_LIMIT=10)",
                    transition: "https://github.com/onflow/flow-js-sdk/blob/master/packages/sdk/TRANSITIONS.md#0009-deprecate-default-compute-limit"
                  });
                  ix.message.computeLimit = DEFAULT_COMPUTE_LIMIT;
                }

              case 8:
                return _context.abrupt("return", ix);

              case 9:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _resolveComputeLimit.apply(this, arguments);
    }

    var noop$5 = function noop(v) {
      return v;
    };

    var debug = function debug(key) {
      var fn = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : noop$5;
      return /*#__PURE__*/function () {
        var _ref = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(ix) {
          var accts, log;
          return regenerator.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:

                  accts = function accts(ix) {
                    return ["\nAccounts:", {
                      proposer: ix.proposer,
                      authorizations: ix.authorizations,
                      payer: ix.payer
                    }, "\n\nDetails:", ix.accounts].filter(Boolean);
                  };

                  log = function log() {
                    var _console;

                    for (var _len = arguments.length, msg = new Array(_len), _key = 0; _key < _len; _key++) {
                      msg[_key] = arguments[_key];
                    }

                    (_console = console).log.apply(_console, ["debug[".concat(key, "] ---\n")].concat(msg, ["\n\n\n---"]));
                  };

                  _context.next = 5;
                  return config$2.get("debug.".concat(key));

                case 5:
                  if (!_context.sent) {
                    _context.next = 8;
                    break;
                  }

                  _context.next = 8;
                  return fn(ix, log, accts);

                case 8:
                  return _context.abrupt("return", ix);

                case 9:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee);
        }));

        return function (_x) {
          return _ref.apply(this, arguments);
        };
      }();
    };

    var resolve = pipe([resolveCadence, debug("cadence", function (ix, log) {
      return log(ix.message.cadence);
    }), resolveComputeLimit, debug("compute limit", function (ix, log) {
      return log(ix.message.computeLimit);
    }), resolveArguments, debug("arguments", function (ix, log) {
      return log(ix.message.arguments, ix.message);
    }), resolveAccounts, debug("accounts", function (ix, log, accts) {
      return log.apply(void 0, _toConsumableArray(accts(ix)));
    }),
    /* special */
    execFetchRef,
    /* special */
    execFetchSequenceNumber, resolveSignatures, debug("signatures", function (ix, log, accts) {
      return log.apply(void 0, _toConsumableArray(accts(ix)));
    }), resolveFinalNormalization, resolveValidators, resolveVoucherIntercept, debug("resolved", function (ix, log) {
      return log(ix);
    })]);

    function execFetchRef(_x2) {
      return _execFetchRef.apply(this, arguments);
    }

    function _execFetchRef() {
      _execFetchRef = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2(ix) {
        var node, sendFn;
        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!(isTransaction(ix) && ix.message.refBlock == null)) {
                  _context2.next = 11;
                  break;
                }

                _context2.next = 3;
                return config$2().get("accessNode.api");

              case 3:
                node = _context2.sent;
                _context2.next = 6;
                return config$2.first(["sdk.transport", "sdk.send"], send$1);

              case 6:
                sendFn = _context2.sent;
                invariant$1(sendFn, "Required value for sdk.transport is not defined in config. See: ".concat("https://github.com/onflow/fcl-js/blob/master/packages/sdk/CHANGELOG.md#0057-alpha1----2022-01-21"));
                _context2.next = 10;
                return sendFn(build([getBlock()]), {
                  config: config$2,
                  response: response,
                  Buffer: buffer.Buffer,
                  ix: ixModule
                }, {
                  node: node
                }).then(decodeResponse);

              case 10:
                ix.message.refBlock = _context2.sent.id;

              case 11:
                return _context2.abrupt("return", ix);

              case 12:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));
      return _execFetchRef.apply(this, arguments);
    }

    function execFetchSequenceNumber(_x3) {
      return _execFetchSequenceNumber.apply(this, arguments);
    }

    function _execFetchSequenceNumber() {
      _execFetchSequenceNumber = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee3(ix) {
        var acct, node, sendFn;
        return regenerator.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                if (!isTransaction(ix)) {
                  _context3.next = 20;
                  break;
                }

                acct = Object.values(ix.accounts).find(function (a) {
                  return a.role.proposer;
                });
                invariant$1(acct, "Transactions require a proposer");

                if (!(acct.sequenceNum == null)) {
                  _context3.next = 20;
                  break;
                }

                _context3.next = 6;
                return config$2().get("accessNode.api");

              case 6:
                node = _context3.sent;
                _context3.next = 9;
                return config$2.first(["sdk.transport", "sdk.send"], send$1);

              case 9:
                sendFn = _context3.sent;
                invariant$1(sendFn, "Required value for sdk.transport is not defined in config. See: ".concat("https://github.com/onflow/fcl-js/blob/master/packages/sdk/CHANGELOG.md#0057-alpha1----2022-01-21"));
                _context3.t0 = sendFn;
                _context3.next = 14;
                return build([getAccount(acct.addr)]);

              case 14:
                _context3.t1 = _context3.sent;
                _context3.t2 = {
                  config: config$2,
                  response: response,
                  Buffer: buffer.Buffer,
                  ix: ixModule
                };
                _context3.t3 = {
                  node: node
                };
                _context3.next = 19;
                return (0, _context3.t0)(_context3.t1, _context3.t2, _context3.t3).then(decodeResponse).then(function (acct) {
                  return acct.keys;
                }).then(function (keys) {
                  return keys.find(function (key) {
                    return key.index === acct.keyId;
                  });
                }).then(function (key) {
                  return key.sequenceNumber;
                });

              case 19:
                ix.accounts[acct.tempId].sequenceNum = _context3.sent;

              case 20:
                return _context3.abrupt("return", ix);

              case 21:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3);
      }));
      return _execFetchSequenceNumber.apply(this, arguments);
    }

    function invariant() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      if (args.length > 1) {
        var predicate = args[0],
            message = args[1];
        return invariant(function (ix, _ref) {
          var Ok = _ref.Ok,
              Bad = _ref.Bad;
          return predicate ? Ok(ix) : Bad(ix, message);
        });
      }

      var fn = args[0];
      return function (ix) {
        return fn(ix, {
          Ok: Ok,
          Bad: Bad
        });
      };
    }

    var send = /*#__PURE__*/function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee() {
        var args,
            opts,
            sendFn,
            resolveFn,
            _args = arguments;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                args = _args.length > 0 && _args[0] !== undefined ? _args[0] : [];
                opts = _args.length > 1 && _args[1] !== undefined ? _args[1] : {};
                _context.next = 4;
                return config$2.first(["sdk.transport", "sdk.send"], opts.send || send$1);

              case 4:
                sendFn = _context.sent;
                invariant(sendFn, "Required value for sdk.transport is not defined in config. See: ".concat("https://github.com/onflow/fcl-js/blob/master/packages/sdk/CHANGELOG.md#0057-alpha1----2022-01-21"));
                _context.next = 8;
                return config$2.first(["sdk.resolve"], opts.resolve || resolve);

              case 8:
                resolveFn = _context.sent;
                _context.t0 = opts.node;

                if (_context.t0) {
                  _context.next = 14;
                  break;
                }

                _context.next = 13;
                return config$2().get("accessNode.api");

              case 13:
                _context.t0 = _context.sent;

              case 14:
                opts.node = _context.t0;
                if (Array.isArray(args)) args = pipe(interaction(), args);
                _context.t1 = sendFn;
                _context.next = 19;
                return resolveFn(args);

              case 19:
                _context.t2 = _context.sent;
                _context.t3 = {
                  config: config$2,
                  response: response,
                  ix: ixModule,
                  Buffer: buffer.Buffer
                };
                _context.t4 = opts;
                return _context.abrupt("return", (0, _context.t1)(_context.t2, _context.t3, _context.t4));

              case 23:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      return function send() {
        return _ref.apply(this, arguments);
      };
    }();

    function decode(_x) {
      return _decode.apply(this, arguments);
    }

    function _decode() {
      _decode = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(response) {
        var decodersFromConfig, decoders;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return config$2().where(/^decoder\./);

              case 2:
                decodersFromConfig = _context.sent;
                decoders = Object.entries(decodersFromConfig).map(function (_ref) {
                  var _ref2 = _slicedToArray(_ref, 2),
                      pattern = _ref2[0],
                      xform = _ref2[1];

                  pattern = "/".concat(pattern.replace(/^decoder\./, ""), "$/");
                  return [pattern, xform];
                });
                return _context.abrupt("return", decodeResponse(response, Object.fromEntries(decoders)));

              case 5:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _decode.apply(this, arguments);
    }

    function validator(cb) {
      return update$1("ix.validators", function (validators) {
        return Array.isArray(validators) ? validators.push(cb) : [cb];
      });
    }

    function atBlockHeight(height) {
      return pipe([function (ix) {
        ix.block.height = height;
        return ix;
      }, validator(function (ix) {
        if (typeof ix.block.isSealed === "boolean") throw new Error("Unable to specify both block height and isSealed.");
        if (ix.block.id) throw new Error("Unable to specify both block height and block id.");
        return ix;
      })]);
    }

    function atBlockId(id) {
      return pipe([function (ix) {
        ix.block.id = id;
        return Ok(ix);
      }, validator(function (ix, _ref) {
        var Ok = _ref.Ok,
            Bad = _ref.Bad;
        if (isGetAccount(ix)) return Bad(ix, "Unable to specify a block id with a Get Account interaction.");
        if (typeof ix.block.isSealed === "boolean") return Bad(ix, "Unable to specify both block id and isSealed.");
        if (ix.block.height) return Bad(ix, "Unable to specify both block id and block height.");
        return Ok(ix);
      })]);
    }

    function block() {
      var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
          _ref$sealed = _ref.sealed,
          sealed = _ref$sealed === void 0 ? false : _ref$sealed,
          id = _ref.id,
          height = _ref.height;

      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      invariant$1(!(sealed && id || sealed && height), "Method: block -- Cannot pass \"sealed\" with \"id\" or \"height\"");
      invariant$1(!(id && height), "Method: block -- Cannot pass \"id\" and \"height\" simultaneously"); // Get block by ID

      if (id) return send([getBlock(), atBlockId(id)], opts).then(decodeResponse); // Get block by height

      if (height) return send([getBlock(), atBlockHeight(height)], opts).then(decodeResponse); // Get latest block

      return send([getBlock(sealed)], opts).then(decodeResponse);
    }

    function authorizations() {
      var ax = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      return pipe(ax.map(function (authz) {
        return prepAccount(authz, {
          role: AUTHORIZER
        });
      }));
    }

    function getEventsAtBlockHeightRange(eventType, start, end) {
      return pipe([makeGetEvents, function (ix) {
        ix.events.eventType = eventType;
        ix.events.start = start;
        ix.events.end = end;
        return Ok(ix);
      }]);
    }

    function getTransactionStatus(transactionId) {
      return pipe([makeGetTransactionStatus, function (ix) {
        ix.transaction.id = transactionId;
        return Ok(ix);
      }]);
    }

    function limit(computeLimit) {
      return function (ix) {
        ix.message.computeLimit = computeLimit;
        return ix;
      };
    }

    function args() {
      var ax = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      return pipe(ax.map(makeArgument));
    }
    function arg(value, xform) {
      return {
        value: value,
        xform: xform
      };
    }

    function proposer(_x) {
      return _proposer.apply(this, arguments);
    }

    function _proposer() {
      _proposer = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(authz) {
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                return _context.abrupt("return", prepAccount(authz, {
                  role: PROPOSER
                }));

              case 1:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _proposer.apply(this, arguments);
    }

    function payer(_x) {
      return _payer.apply(this, arguments);
    }

    function _payer() {
      _payer = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(authz) {
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                return _context.abrupt("return", prepAccount(authz, {
                  role: PAYER
                }));

              case 1:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _payer.apply(this, arguments);
    }

    function script() {
      return pipe([makeScript, put$1("ix.cadence", template.apply(void 0, arguments))]);
    }

    var DEFAULT_SCRIPT_ACCOUNTS = [];
    var DEFUALT_REF = null;
    function transaction$1() {
      return pipe([makeTransaction, put$1("ix.cadence", template.apply(void 0, arguments)), function (ix) {
        ix.message.refBlock = ix.message.refBlock || DEFUALT_REF;
        ix.authorizations = ix.authorizations || DEFAULT_SCRIPT_ACCOUNTS;
        return Ok(ix);
      }]);
    }

    var promise;
    var queueMicrotask_1 = typeof queueMicrotask === 'function' ? queueMicrotask // reuse resolved promise, and allocate it lazily
    : function (cb) {
      return (promise || (promise = Promise.resolve())).then(cb)["catch"](function (err) {
        return setTimeout(function () {
          throw err;
        }, 0);
      });
    };

    var mailbox = function mailbox() {
      var queue = [];
      var next;
      return {
        deliver: function deliver(msg) {
          return _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee() {
            return regenerator.wrap(function _callee$(_context) {
              while (1) {
                switch (_context.prev = _context.next) {
                  case 0:
                    queue.push(msg);

                    if (next) {
                      next(queue.shift());
                      next = undefined;
                    }

                  case 2:
                  case "end":
                    return _context.stop();
                }
              }
            }, _callee);
          }))();
        },
        receive: function receive() {
          return new Promise(function innerReceive(resolve) {
            var msg = queue.shift();
            if (msg) return resolve(msg);
            next = resolve;
          });
        }
      };
    };

    var INIT = "INIT";
    var SUBSCRIBE = "SUBSCRIBE";
    var UNSUBSCRIBE = "UNSUBSCRIBE";
    var UPDATED$1$1 = "UPDATED";
    var EXIT = "EXIT";
    var TERMINATE = "TERMINATE";
    var root = (typeof self === "undefined" ? "undefined" : _typeof(self)) === "object" && self.self === self && self || (typeof global === "undefined" ? "undefined" : _typeof(global)) === "object" && global.global === global && global || (typeof window === "undefined" ? "undefined" : _typeof(window)) === "object" && window.window === window && window;
    root.FCL_REGISTRY = root.FCL_REGISTRY == null ? {} : root.FCL_REGISTRY;
    var pid = 0;
    var DEFAULT_TIMEOUT = 5000;

    var _send = function send(addr, tag, data) {
      var opts = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
      return new Promise(function (reply, reject) {
        var expectReply = opts.expectReply || false;
        var timeout = opts.timeout != null ? opts.timeout : DEFAULT_TIMEOUT;

        if (expectReply && timeout) {
          setTimeout(function () {
            return reject(new Error("Timeout: ".concat(timeout, "ms passed without a response.")));
          }, timeout);
        }

        var payload = {
          to: addr,
          from: opts.from,
          tag: tag,
          data: data,
          timeout: timeout,
          reply: reply,
          reject: reject
        };

        try {
          root.FCL_REGISTRY[addr] && root.FCL_REGISTRY[addr].mailbox.deliver(payload);
          if (!expectReply) reply(true);
        } catch (error) {
          console.error("FCL.Actor -- Could Not Deliver Message", payload, root.FCL_REGISTRY[addr], error);
        }
      });
    };

    var kill = function kill(addr) {
      delete root.FCL_REGISTRY[addr];
    };

    var fromHandlers = function fromHandlers() {
      var handlers = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      return /*#__PURE__*/function () {
        var _ref = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(ctx) {
          var letter;
          return regenerator.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  if (!(typeof handlers[INIT] === "function")) {
                    _context.next = 3;
                    break;
                  }

                  _context.next = 3;
                  return handlers[INIT](ctx);

                case 3:
                  _context.next = 6;
                  return ctx.receive();

                case 6:
                  letter = _context.sent;
                  _context.prev = 7;

                  if (!(letter.tag === EXIT)) {
                    _context.next = 13;
                    break;
                  }

                  if (!(typeof handlers[TERMINATE] === "function")) {
                    _context.next = 12;
                    break;
                  }

                  _context.next = 12;
                  return handlers[TERMINATE](ctx, letter, letter.data || {});

                case 12:
                  return _context.abrupt("break", 25);

                case 13:
                  _context.next = 15;
                  return handlers[letter.tag](ctx, letter, letter.data || {});

                case 15:
                  _context.next = 20;
                  break;

                case 17:
                  _context.prev = 17;
                  _context.t0 = _context["catch"](7);
                  console.error("".concat(ctx.self(), " Error"), letter, _context.t0);

                case 20:
                  _context.prev = 20;
                  return _context.abrupt("continue", 3);

                case 23:
                  _context.next = 3;
                  break;

                case 25:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee, null, [[7, 17, 20, 23]]);
        }));

        return function (_x) {
          return _ref.apply(this, arguments);
        };
      }();
    };

    var spawn = function spawn(fn) {
      var addr = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      if (addr == null) addr = ++pid;
      if (root.FCL_REGISTRY[addr] != null) return addr;
      root.FCL_REGISTRY[addr] = {
        addr: addr,
        mailbox: mailbox(),
        subs: new Set(),
        kvs: {},
        error: null
      };
      var ctx = {
        self: function self() {
          return addr;
        },
        receive: function receive() {
          return root.FCL_REGISTRY[addr].mailbox.receive();
        },
        send: function send(to, tag, data) {
          var opts = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
          opts.from = addr;
          return _send(to, tag, data, opts);
        },
        sendSelf: function sendSelf(tag, data, opts) {
          if (root.FCL_REGISTRY[addr]) _send(addr, tag, data, opts);
        },
        broadcast: function broadcast(tag, data) {
          var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
          opts.from = addr;

          var _iterator = _createForOfIteratorHelper(root.FCL_REGISTRY[addr].subs),
              _step;

          try {
            for (_iterator.s(); !(_step = _iterator.n()).done;) {
              var to = _step.value;

              _send(to, tag, data, opts);
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }
        },
        subscribe: function subscribe(sub) {
          return sub != null && root.FCL_REGISTRY[addr].subs.add(sub);
        },
        unsubscribe: function unsubscribe(sub) {
          return sub != null && root.FCL_REGISTRY[addr].subs["delete"](sub);
        },
        subscriberCount: function subscriberCount() {
          return root.FCL_REGISTRY[addr].subs.size;
        },
        hasSubs: function hasSubs() {
          return !!root.FCL_REGISTRY[addr].subs.size;
        },
        put: function put(key, value) {
          if (key != null) root.FCL_REGISTRY[addr].kvs[key] = value;
        },
        get: function get(key, fallback) {
          var value = root.FCL_REGISTRY[addr].kvs[key];
          return value == null ? fallback : value;
        },
        "delete": function _delete(key) {
          delete root.FCL_REGISTRY[addr].kvs[key];
        },
        update: function update(key, fn) {
          if (key != null) root.FCL_REGISTRY[addr].kvs[key] = fn(root.FCL_REGISTRY[addr].kvs[key]);
        },
        keys: function keys() {
          return Object.keys(root.FCL_REGISTRY[addr].kvs);
        },
        all: function all() {
          return root.FCL_REGISTRY[addr].kvs;
        },
        where: function where(pattern) {
          return Object.keys(root.FCL_REGISTRY[addr].kvs).reduce(function (acc, key) {
            return pattern.test(key) ? _objectSpread2(_objectSpread2({}, acc), {}, _defineProperty({}, key, root.FCL_REGISTRY[addr].kvs[key])) : acc;
          }, {});
        },
        merge: function merge() {
          var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
          Object.keys(data).forEach(function (key) {
            return root.FCL_REGISTRY[addr].kvs[key] = data[key];
          });
        },
        fatalError: function fatalError(error) {
          root.FCL_REGISTRY[addr].error = error;

          var _iterator2 = _createForOfIteratorHelper(root.FCL_REGISTRY[addr].subs),
              _step2;

          try {
            for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
              var to = _step2.value;

              _send(to, UPDATED$1$1);
            }
          } catch (err) {
            _iterator2.e(err);
          } finally {
            _iterator2.f();
          }
        }
      };
      if (_typeof(fn) === "object") fn = fromHandlers(fn);
      queueMicrotask_1( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2() {
        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return fn(ctx);

              case 2:
                kill(addr);

              case 3:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      })));
      return addr;
    }; // Returns an unsubscribe function
    // A SUBSCRIBE handler will need to be created to handle the subscription event
    //
    //  [SUBSCRIBE]: (ctx, letter) => {
    //    ctx.subscribe(letter.from)
    //    ctx.send(letter.from, UPDATED, ctx.all())
    //  }
    //


    function subscriber(address, spawnFn, callback) {
      spawnFn(address);
      var EXIT = "@EXIT";
      var self = spawn( /*#__PURE__*/function () {
        var _ref3 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee3(ctx) {
          var letter, error;
          return regenerator.wrap(function _callee3$(_context3) {
            while (1) {
              switch (_context3.prev = _context3.next) {
                case 0:
                  ctx.send(address, SUBSCRIBE);

                case 1:
                  _context3.next = 4;
                  return ctx.receive();

                case 4:
                  letter = _context3.sent;
                  error = root.FCL_REGISTRY[address].error;

                  if (!(letter.tag === EXIT)) {
                    _context3.next = 9;
                    break;
                  }

                  ctx.send(address, UNSUBSCRIBE);
                  return _context3.abrupt("return");

                case 9:
                  if (!error) {
                    _context3.next = 13;
                    break;
                  }

                  callback(null, error);
                  ctx.send(address, UNSUBSCRIBE);
                  return _context3.abrupt("return");

                case 13:
                  callback(letter.data, null);
                  _context3.next = 1;
                  break;

                case 16:
                case "end":
                  return _context3.stop();
              }
            }
          }, _callee3);
        }));

        return function (_x2) {
          return _ref3.apply(this, arguments);
        };
      }());
      return function () {
        return _send(self, EXIT);
      };
    } // Returns a promise that returns a result

    var _HANDLERS$4;

    var NAME$1 = "config";
    var PUT = "PUT_CONFIG";
    var GET = "GET_CONFIG";
    var GET_ALL = "GET_ALL_CONFIG";
    var UPDATE = "UPDATE_CONFIG";
    var DELETE = "DELETE_CONFIG";
    var CLEAR = "CLEAR_CONFIG";
    var WHERE = "WHERE_CONFIG";
    var UPDATED$2 = "CONFIG/UPDATED";

    var identity = function identity(v) {
      return v;
    };

    var HANDLERS = (_HANDLERS$4 = {}, _defineProperty(_HANDLERS$4, PUT, function (ctx, _letter, _ref) {
      var key = _ref.key,
          value = _ref.value;
      if (key == null) throw new Error("Missing 'key' for config/put.");
      ctx.put(key, value);
      ctx.broadcast(UPDATED$2, _objectSpread2({}, ctx.all()));
    }), _defineProperty(_HANDLERS$4, GET, function (ctx, letter, _ref2) {
      var key = _ref2.key,
          fallback = _ref2.fallback;
      if (key == null) throw new Error("Missing 'key' for config/get");
      letter.reply(ctx.get(key, fallback));
    }), _defineProperty(_HANDLERS$4, GET_ALL, function (ctx, letter) {
      letter.reply(_objectSpread2({}, ctx.all()));
    }), _defineProperty(_HANDLERS$4, UPDATE, function (ctx, letter, _ref3) {
      var key = _ref3.key,
          fn = _ref3.fn;
      if (key == null) throw new Error("Missing 'key' for config/update");
      ctx.update(key, fn || identity);
      ctx.broadcast(UPDATED$2, _objectSpread2({}, ctx.all()));
    }), _defineProperty(_HANDLERS$4, DELETE, function (ctx, letter, _ref4) {
      var key = _ref4.key;
      if (key == null) throw new Error("Missing 'key' for config/delete");
      ctx["delete"](key);
      ctx.broadcast(UPDATED$2, _objectSpread2({}, ctx.all()));
    }), _defineProperty(_HANDLERS$4, CLEAR, function (ctx, letter) {
      var keys = Object.keys(ctx.all());

      for (var _i = 0, _keys = keys; _i < _keys.length; _i++) {
        var key = _keys[_i];
        ctx["delete"](key);
      }

      ctx.broadcast(UPDATED$2, _objectSpread2({}, ctx.all()));
    }), _defineProperty(_HANDLERS$4, WHERE, function (ctx, letter, _ref5) {
      var pattern = _ref5.pattern;
      if (pattern == null) throw new Error("Missing 'pattern' for config/where");
      letter.reply(ctx.where(pattern));
    }), _defineProperty(_HANDLERS$4, SUBSCRIBE, function (ctx, letter) {
      ctx.subscribe(letter.from);
      ctx.send(letter.from, UPDATED$2, _objectSpread2({}, ctx.all()));
    }), _defineProperty(_HANDLERS$4, UNSUBSCRIBE, function (ctx, letter) {
      ctx.unsubscribe(letter.from);
    }), _HANDLERS$4);
    spawn(HANDLERS, NAME$1);

    function put(key, value) {
      _send(NAME$1, PUT, {
        key: key,
        value: value
      });
      return config();
    }

    function get(key, fallback) {
      return _send(NAME$1, GET, {
        key: key,
        fallback: fallback
      }, {
        expectReply: true,
        timeout: 10
      });
    }

    function first() {
      return _first.apply(this, arguments);
    }

    function _first() {
      _first = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2() {
        var wants,
            fallback,
            _wants,
            head,
            rest,
            ret,
            _args2 = arguments;

        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                wants = _args2.length > 0 && _args2[0] !== undefined ? _args2[0] : [];
                fallback = _args2.length > 1 ? _args2[1] : undefined;

                if (wants.length) {
                  _context2.next = 4;
                  break;
                }

                return _context2.abrupt("return", fallback);

              case 4:
                _wants = _toArray(wants), head = _wants[0], rest = _wants.slice(1);
                _context2.next = 7;
                return get(head);

              case 7:
                ret = _context2.sent;

                if (!(ret == null)) {
                  _context2.next = 10;
                  break;
                }

                return _context2.abrupt("return", first(rest, fallback));

              case 10:
                return _context2.abrupt("return", ret);

              case 11:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));
      return _first.apply(this, arguments);
    }

    function all() {
      return _send(NAME$1, GET_ALL, null, {
        expectReply: true,
        timeout: 10
      });
    }

    function update(key) {
      var fn = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : identity;
      _send(NAME$1, UPDATE, {
        key: key,
        fn: fn
      });
      return config();
    }

    function _delete(key) {
      _send(NAME$1, DELETE, {
        key: key
      });
      return config();
    }

    function where(pattern) {
      return _send(NAME$1, WHERE, {
        pattern: pattern
      }, {
        expectReply: true,
        timeout: 10
      });
    }

    function subscribe$1(callback) {
      return subscriber(NAME$1, function () {
        return spawn(HANDLERS, NAME$1);
      }, callback);
    }

    function clearConfig() {
      return _send(NAME$1, CLEAR);
    }

    function config(values) {
      if (values != null && _typeof(values) === "object") {
        Object.keys(values).map(function (d) {
          return put(d, values[d]);
        });
      }

      return {
        put: put,
        get: get,
        all: all,
        first: first,
        update: update,
        "delete": _delete,
        where: where,
        subscribe: subscribe$1,
        overload: overload
      };
    }

    config.put = put;
    config.get = get;
    config.all = all;
    config.first = first;
    config.update = update;
    config["delete"] = _delete;
    config.where = where;
    config.subscribe = subscribe$1;
    config.overload = overload;

    var noop$4 = function noop(v) {
      return v;
    };

    function overload() {
      var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : noop$4;
      return new Promise( /*#__PURE__*/function () {
        var _ref6 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(resolve, reject) {
          var oldConfig, result;
          return regenerator.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  _context.next = 2;
                  return all();

                case 2:
                  oldConfig = _context.sent;
                  _context.prev = 3;
                  config(opts);
                  _context.t0 = callback;
                  _context.next = 8;
                  return all();

                case 8:
                  _context.t1 = _context.sent;
                  _context.next = 11;
                  return (0, _context.t0)(_context.t1);

                case 11:
                  result = _context.sent;
                  _context.next = 14;
                  return clearConfig();

                case 14:
                  _context.next = 16;
                  return config(oldConfig);

                case 16:
                  resolve(result);
                  _context.next = 26;
                  break;

                case 19:
                  _context.prev = 19;
                  _context.t2 = _context["catch"](3);
                  _context.next = 23;
                  return clearConfig();

                case 23:
                  _context.next = 25;
                  return config(oldConfig);

                case 25:
                  reject(_context.t2);

                case 26:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee, null, [[3, 19]]);
        }));

        return function (_x, _x2) {
          return _ref6.apply(this, arguments);
        };
      }());
    }

    var LEVELS = Object.freeze({
      debug: 5,
      info: 4,
      log: 3,
      warn: 2,
      error: 1
    });

    var buildLoggerMessageArgs = function buildLoggerMessageArgs(_ref) {
      var title = _ref.title,
          message = _ref.message;
      return ["\n    %c".concat(title, "\n    ============================\n\n    ").concat(message, "\n\n    ============================\n    ").replace(/\n[^\S\r\n]+/g, "\n").trim(),, "font-weight:bold;font-family:monospace;"];
    };

    var log = /*#__PURE__*/function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(_ref2) {
        var _console, _console2, _console3, _console4, _console5;

        var title, message, level, _ref2$always, always, configLoggerLevel, loggerMessageArgs;

        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                title = _ref2.title, message = _ref2.message, level = _ref2.level, _ref2$always = _ref2.always, always = _ref2$always === void 0 ? false : _ref2$always;
                _context.next = 3;
                return config.get("logger.level", LEVELS.warn);

              case 3:
                configLoggerLevel = _context.sent;

                if (!(!always && configLoggerLevel < level)) {
                  _context.next = 6;
                  break;
                }

                return _context.abrupt("return");

              case 6:
                loggerMessageArgs = buildLoggerMessageArgs({
                  title: title,
                  message: message
                });
                _context.t0 = level;
                _context.next = _context.t0 === LEVELS.debug ? 10 : _context.t0 === LEVELS.info ? 12 : _context.t0 === LEVELS.warn ? 14 : _context.t0 === LEVELS.error ? 16 : 18;
                break;

              case 10:
                (_console = console).debug.apply(_console, _toConsumableArray(loggerMessageArgs));

                return _context.abrupt("break", 19);

              case 12:
                (_console2 = console).info.apply(_console2, _toConsumableArray(loggerMessageArgs));

                return _context.abrupt("break", 19);

              case 14:
                (_console3 = console).warn.apply(_console3, _toConsumableArray(loggerMessageArgs));

                return _context.abrupt("break", 19);

              case 16:
                (_console4 = console).error.apply(_console4, _toConsumableArray(loggerMessageArgs));

                return _context.abrupt("break", 19);

              case 18:
                (_console5 = console).log.apply(_console5, _toConsumableArray(loggerMessageArgs));

              case 19:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      return function log(_x) {
        return _ref3.apply(this, arguments);
      };
    }();

    log.deprecate = function (_ref4) {
      var pkg = _ref4.pkg,
          subject = _ref4.subject,
          transition = _ref4.transition,
          _ref4$level = _ref4.level,
          level = _ref4$level === void 0 ? LEVELS.warn : _ref4$level,
          _ref4$message = _ref4.message,
          message = _ref4$message === void 0 ? "" : _ref4$message,
          _ref4$callback = _ref4.callback,
          callback = _ref4$callback === void 0 ? null : _ref4$callback;

      var capitalizeFirstLetter = function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
      };

      var logMessage = function logMessage() {
        return log({
          title: "".concat(pkg ? pkg + " " : "", "Deprecation Notice"),
          message: "\n      ".concat(subject ? "".concat(capitalizeFirstLetter(subject), " is deprecated and will cease to work in future releases").concat(pkg ? " of " + pkg : "", ".") : "").concat(message ? "\n" + message : "").concat(transition ? "\nYou can learn more (including a guide on common transition paths) here: ".concat(transition) : "", "\n    ").trim(),
          level: level
        });
      };

      if (typeof callback === "function") {
        return /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2() {
          var _args2 = arguments;
          return regenerator.wrap(function _callee2$(_context2) {
            while (1) {
              switch (_context2.prev = _context2.next) {
                case 0:
                  _context2.next = 2;
                  return logMessage();

                case 2:
                  _context2.next = 4;
                  return callback.apply(void 0, _args2);

                case 4:
                  return _context2.abrupt("return", _context2.sent);

                case 5:
                case "end":
                  return _context2.stop();
              }
            }
          }, _callee2);
        }));
      }

      return logMessage();
    };

    var type = function type(label, asArgument, asInjection) {
      return {
        label: label,
        asArgument: asArgument,
        asInjection: asInjection
      };
    };

    var isArray = function isArray(d) {
      return Array.isArray(d);
    };

    var isObj = function isObj(d) {
      return _typeof(d) === "object";
    };

    var isNull = function isNull(d) {
      return d == null;
    };

    var isBoolean = function isBoolean(d) {
      return typeof d === "boolean";
    };

    var isNumber$1 = function isNumber(d) {
      return typeof d === "number";
    };

    var isInteger = function isInteger(d) {
      return Number.isInteger(d);
    };

    var isString$1 = function isString(d) {
      return typeof d === "string";
    };

    var throwTypeError = function throwTypeError(msg) {
      throw new Error("Type Error: " + msg);
    };

    var numberValuesDeprecationNotice = function numberValuesDeprecationNotice(type) {
      log.deprecate({
        pkg: "@onflow/types",
        subject: "Passing in Number as value for ".concat(type),
        message: "Going forward, use String as value for ".concat(type, "."),
        transition: "https://github.com/onflow/flow-js-sdk/blob/master/packages/types/WARNINGS.md#0002-[U]Int*-and-Word*-as-Number"
      });
    };

    var Identity = type("Identity", function (v) {
      return v;
    }, function (v) {
      return v;
    });
    var UInt = type("UInt", function (v) {
      if (isNumber$1(v) && isInteger(v)) {
        numberValuesDeprecationNotice("UInt");
        return {
          type: "UInt",
          value: v.toString()
        };
      }

      if (isString$1(v)) {
        return {
          type: "UInt",
          value: v
        };
      }

      throwTypeError("Expected Positive Integer for type Unsigned Int");
    }, function (v) {
      return v;
    });
    var Int = type("Int", function (v) {
      if (isNumber$1(v) && isInteger(v)) {
        numberValuesDeprecationNotice("Int");
        return {
          type: "Int",
          value: v.toString()
        };
      }

      if (isString$1(v)) {
        return {
          type: "Int",
          value: v
        };
      }

      throwTypeError("Expected Integer for type Int");
    }, function (v) {
      return v;
    });
    var UInt8 = type("UInt8", function (v) {
      if (isNumber$1(v) && isInteger(v)) {
        numberValuesDeprecationNotice("UInt8");
        return {
          type: "UInt8",
          value: v.toString()
        };
      }

      if (isString$1(v)) {
        return {
          type: "UInt8",
          value: v
        };
      }

      throwTypeError("Expected integer for UInt8");
    }, function (v) {
      return v;
    });
    var Int8 = type("Int8", function (v) {
      if (isNumber$1(v) && isInteger(v)) {
        numberValuesDeprecationNotice("Int8");
        return {
          type: "Int8",
          value: v.toString()
        };
      }

      if (isString$1(v)) {
        return {
          type: "Int8",
          value: v
        };
      }

      throwTypeError("Expected positive integer for Int8");
    }, function (v) {
      return v;
    });
    var UInt16 = type("UInt16", function (v) {
      if (isNumber$1(v) && isInteger(v)) {
        numberValuesDeprecationNotice("UInt16");
        return {
          type: "UInt16",
          value: v.toString()
        };
      }

      if (isString$1(v)) {
        return {
          type: "UInt16",
          value: v
        };
      }

      throwTypeError("Expected integer for UInt16");
    }, function (v) {
      return v;
    });
    var Int16 = type("Int16", function (v) {
      if (isNumber$1(v) && isInteger(v)) {
        numberValuesDeprecationNotice("Int16");
        return {
          type: "Int16",
          value: v.toString()
        };
      }

      if (isString$1(v)) {
        return {
          type: "Int16",
          value: v
        };
      }

      throwTypeError("Expected positive integer for Int16");
    }, function (v) {
      return v;
    });
    var UInt32 = type("UInt32", function (v) {
      if (isNumber$1(v) && isInteger(v)) {
        numberValuesDeprecationNotice("UInt32");
        return {
          type: "UInt32",
          value: v.toString()
        };
      }

      if (isString$1(v)) {
        return {
          type: "UInt32",
          value: v
        };
      }

      throwTypeError("Expected integer for UInt32");
    }, function (v) {
      return v;
    });
    var Int32 = type("Int32", function (v) {
      if (isNumber$1(v) && isInteger(v)) {
        numberValuesDeprecationNotice("Int32");
        return {
          type: "Int32",
          value: v.toString()
        };
      }

      if (isString$1(v)) {
        return {
          type: "Int32",
          value: v
        };
      }

      throwTypeError("Expected positive integer for Int32");
    }, function (v) {
      return v;
    });
    var UInt64 = type("UInt64", function (v) {
      if (isNumber$1(v) && isInteger(v)) {
        numberValuesDeprecationNotice("UInt64");
        return {
          type: "UInt64",
          value: v.toString()
        };
      }

      if (isString$1(v)) {
        return {
          type: "UInt64",
          value: v
        };
      }

      throwTypeError("Expected integer for UInt64");
    }, function (v) {
      return v;
    });
    var Int64 = type("Int64", function (v) {
      if (isNumber$1(v) && isInteger(v)) {
        numberValuesDeprecationNotice("Int64");
        return {
          type: "Int64",
          value: v.toString()
        };
      }

      if (isString$1(v)) {
        return {
          type: "Int64",
          value: v
        };
      }

      throwTypeError("Expected positive integer for Int64");
    }, function (v) {
      return v;
    });
    var UInt128 = type("UInt128", function (v) {
      if (isNumber$1(v) && isInteger(v)) {
        numberValuesDeprecationNotice("UInt128");
        return {
          type: "UInt128",
          value: v.toString()
        };
      }

      if (isString$1(v)) {
        return {
          type: "UInt128",
          value: v
        };
      }

      throwTypeError("Expected integer for UInt128");
    }, function (v) {
      return v;
    });
    var Int128 = type("Int128", function (v) {
      if (isNumber$1(v) && isInteger(v)) {
        numberValuesDeprecationNotice("Int128");
        return {
          type: "Int128",
          value: v.toString()
        };
      }

      if (isString$1(v)) {
        return {
          type: "Int128",
          value: v
        };
      }

      throwTypeError("Expected positive integer for Int128");
    }, function (v) {
      return v;
    });
    var UInt256 = type("UInt256", function (v) {
      if (isNumber$1(v) && isInteger(v)) {
        numberValuesDeprecationNotice("UInt256");
        return {
          type: "UInt256",
          value: v.toString()
        };
      }

      if (isString$1(v)) {
        return {
          type: "UInt256",
          value: v
        };
      }

      throwTypeError("Expected integer for UInt256");
    }, function (v) {
      return v;
    });
    var Int256 = type("Int256", function (v) {
      if (isNumber$1(v) && isInteger(v)) {
        numberValuesDeprecationNotice("Int256");
        return {
          type: "Int256",
          value: v.toString()
        };
      }

      if (isString$1(v)) {
        return {
          type: "Int256",
          value: v
        };
      }

      throwTypeError("Expected integer for Int256");
    }, function (v) {
      return v;
    });
    var Word8 = type("Word8", function (v) {
      if (isNumber$1(v) && isInteger(v)) {
        numberValuesDeprecationNotice("Word8");
        return {
          type: "Word8",
          value: v.toString()
        };
      }

      if (isString$1(v)) {
        return {
          type: "Word8",
          value: v
        };
      }

      throwTypeError("Expected positive number for Word8");
    }, function (v) {
      return v;
    });
    var Word16 = type("Word16", function (v) {
      if (isNumber$1(v) && isInteger(v)) {
        numberValuesDeprecationNotice("Word16");
        return {
          type: "Word16",
          value: v.toString()
        };
      }

      if (isString$1(v)) {
        return {
          type: "Word16",
          value: v
        };
      }

      throwTypeError("Expected positive number for Word16");
    }, function (v) {
      return v;
    });
    var Word32 = type("Word32", function (v) {
      if (isNumber$1(v) && isInteger(v)) {
        numberValuesDeprecationNotice("Word32");
        return {
          type: "Word32",
          value: v.toString()
        };
      }

      if (isString$1(v)) {
        return {
          type: "Word32",
          value: v
        };
      }

      throwTypeError("Expected positive number for Word32");
    }, function (v) {
      return v;
    });
    var Word64 = type("Word64", function (v) {
      if (isNumber$1(v) && isInteger(v)) {
        numberValuesDeprecationNotice("Word64");
        return {
          type: "Word64",
          value: v.toString()
        };
      }

      if (isString$1(v)) {
        return {
          type: "Word64",
          value: v
        };
      }

      throwTypeError("Expected positive number for Word64");
    }, function (v) {
      return v;
    });

    var UFix64AndFix64NumberDeprecationNotice = function UFix64AndFix64NumberDeprecationNotice() {
      log.deprecate({
        subject: "Passing in Numbers as values for Fix64 and UFix64 types",
        pkg: "@onflow/types",
        transition: "https://github.com/onflow/flow-js-sdk/blob/master/packages/types/WARNINGS.md#0001-[U]Fix64-as-Number"
      });
    };

    var UFix64 = type("UFix64", function (v) {
      if (isString$1(v)) {
        var vParts = v.split(".");

        if (vParts.length !== 2) {
          throwTypeError("Expected one decimal but found ".concat(vParts.length, " in the [U]Fix64 value. Find out more about [U]Fix64 types here: https://docs.onflow.org/cadence/json-cadence-spec/#fixed-point-numbers"));
        }

        if (vParts[1].length == 0 || vParts[1].length > 8) {
          throwTypeError("Expected at least one digit, and at most 8 digits following the decimal of the [U]Fix64 value but found ".concat(vParts[1].length, " digits. Find out more about [U]Fix64 types here: https://docs.onflow.org/cadence/json-cadence-spec/#fixed-point-numbers"));
        } // make sure the number is extended to 8 decimal places so it matches cadence encoding of UFix values


        vParts[1] = vParts[1].padEnd(8, "0");
        v = vParts.join(".");
        return {
          type: "UFix64",
          value: v
        };
      } else if (isNumber$1(v)) {
        UFix64AndFix64NumberDeprecationNotice();
        return {
          type: "UFix64",
          value: v.toString()
        };
      }

      throwTypeError("Expected String for UFix64");
    }, function (v) {
      return v;
    });
    var Fix64 = type("Fix64", function (v) {
      if (isString$1(v)) {
        var vParts = v.split(".");

        if (vParts.length !== 2) {
          throwTypeError("Expected one decimal but found ".concat(vParts.length, " in the [U]Fix64 value. Find out more about [U]Fix64 types here: https://docs.onflow.org/cadence/json-cadence-spec/#fixed-point-numbers"));
        }

        if (vParts[1].length == 0 || vParts[1].length > 8) {
          throwTypeError("Expected at least one digit, and at most 8 digits following the decimal of the [U]Fix64 value but found ".concat(vParts[1].length, " digits. Find out more about [U]Fix64 types here: https://docs.onflow.org/cadence/json-cadence-spec/#fixed-point-numbers"));
        } // make sure the number is extended to 8 decimal places so it matches cadence encoding of Fix64 values


        vParts[1] = vParts[1].padEnd(8, "0");
        v = vParts.join(".");
        return {
          type: "Fix64",
          value: v
        };
      } else if (isNumber$1(v)) {
        UFix64AndFix64NumberDeprecationNotice();
        return {
          type: "Fix64",
          value: v.toString()
        };
      }

      throwTypeError("Expected String for Fix64");
    }, function (v) {
      return v;
    });
    var String$1 = type("String", function (v) {
      if (isString$1(v)) return {
        type: "String",
        value: v
      };
      throwTypeError("Expected String for type String");
    }, function (v) {
      return v;
    });
    var Character = type("Character", function (v) {
      if (isString$1(v)) return {
        type: "Character",
        value: v
      };
      throwTypeError("Expected Character for type Character");
    }, function (v) {
      return v;
    });
    var Bool = type("Bool", function (v) {
      if (isBoolean(v)) return {
        type: "Bool",
        value: v
      };
      throwTypeError("Expected Boolean for type Bool");
    }, function (v) {
      return v;
    });
    var Address = type("Address", function (v) {
      if (isString$1(v)) return {
        type: "Address",
        value: v
      };
      throwTypeError("Expected Address for type Address");
    }, function (v) {
      return v;
    });
    var Void = type("Void", function (v) {
      if (!v || isNull(v)) return {
        type: "Void"
      };
      throwTypeError("Expected Void for type Void");
    }, function (v) {
      return v;
    });
    var Optional = function Optional(children) {
      return type("Optional", function (v) {
        return {
          type: "Optional",
          value: isNull(v) ? null : children.asArgument(v)
        };
      }, function (v) {
        return v;
      });
    };
    var Reference = type("Reference", function (v) {
      if (isObj(v)) return {
        type: "Reference",
        value: v
      };
      throwTypeError("Expected Object for type Reference");
    }, function (v) {
      return v;
    });
    var _Array = function _Array() {
      var children = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      return type("Array", function (v) {
        return {
          type: "Array",
          value: isArray(children) ? children.map(function (c, i) {
            return c.asArgument(v[i]);
          }) : v.map(function (x) {
            return children.asArgument(x);
          })
        };
      }, function (v) {
        return v;
      });
    };
    var Dictionary = function Dictionary() {
      var children = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      return type("Dictionary", function (v) {
        if (isObj(v)) return {
          type: "Dictionary",
          value: isArray(children) ? children.map(function (c, i) {
            return {
              key: c.key.asArgument(v[i].key),
              value: c.value.asArgument(v[i].value)
            };
          }) : isArray(v) ? v.map(function (x) {
            return {
              key: children.key.asArgument(x.key),
              value: children.value.asArgument(x.value)
            };
          }) : [{
            key: children.key.asArgument(v.key),
            value: children.value.asArgument(v.value)
          }]
        };
        throwTypeError("Expected Object for type Dictionary");
      }, function (v) {
        return v;
      });
    };
    var Event = function Event(id) {
      var fields = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
      return type("Event", function (v) {
        if (isObj(v)) return {
          type: "Event",
          value: {
            id: id,
            fields: isArray(fields) ? fields.map(function (c, i) {
              return {
                name: v.fields[i].name,
                value: c.value.asArgument(v.fields[i].value)
              };
            }) : v.fields.map(function (x) {
              return {
                name: x.name,
                value: fields.value.asArgument(x.value)
              };
            })
          }
        };
        throwTypeError("Expected Object for type Event");
      }, function (v) {
        return v;
      });
    };
    var Resource = function Resource(id) {
      var fields = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
      return type("Resource", function (v) {
        if (isObj(v)) return {
          type: "Resource",
          value: {
            id: id,
            fields: isArray(fields) ? fields.map(function (c, i) {
              return {
                name: v.fields[i].name,
                value: c.value.asArgument(v.fields[i].value)
              };
            }) : v.fields.map(function (x) {
              return {
                name: x.name,
                value: fields.value.asArgument(x.value)
              };
            })
          }
        };
        throwTypeError("Expected Object for type Resource");
      }, function (v) {
        return v;
      });
    };
    var Struct = function Struct(id) {
      var fields = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
      return type("Struct", function (v) {
        if (isObj(v)) return {
          type: "Struct",
          value: {
            id: id,
            fields: isArray(fields) ? fields.map(function (c, i) {
              return {
                name: v.fields[i].name,
                value: c.value.asArgument(v.fields[i].value)
              };
            }) : v.fields.map(function (x) {
              return {
                name: x.name,
                value: fields.value.asArgument(x.value)
              };
            })
          }
        };
        throwTypeError("Expected Object for type Struct");
      }, function (v) {
        return v;
      });
    };
    var Path = type("Path", function (v) {
      if (isObj(v)) {
        if (!isString$1(v.domain)) {
          throwTypeError("Expected a string for the Path domain but found ".concat(v.domain, ". Find out more about the Path type here: https://docs.onflow.org/cadence/json-cadence-spec/#path"));
        }

        if (!(v.domain === "storage" || v.domain === "private" || v.domain === "public")) {
          throwTypeError("Expected either \"storage\", \"private\" or \"public\" as the Path domain but found ".concat(v.domain, ". Find out more about the Path type here: https://docs.onflow.org/cadence/json-cadence-spec/#path"));
        }

        if (!isString$1(v.identifier)) {
          throwTypeError("Expected a string for the Path identifier but found ".concat(v.identifier, ". Find out more about the Path type here: https://docs.onflow.org/cadence/json-cadence-spec/#path"));
        }

        return {
          type: "Path",
          value: {
            domain: v.domain,
            identifier: v.identifier
          }
        };
      }

      throwTypeError("Expected Object for type Path");
    }, function (v) {
      return v;
    });

    var t$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        Address: Address,
        Array: _Array,
        Bool: Bool,
        Character: Character,
        Dictionary: Dictionary,
        Event: Event,
        Fix64: Fix64,
        Identity: Identity,
        Int: Int,
        Int128: Int128,
        Int16: Int16,
        Int256: Int256,
        Int32: Int32,
        Int64: Int64,
        Int8: Int8,
        Optional: Optional,
        Path: Path,
        Reference: Reference,
        Resource: Resource,
        String: String$1,
        Struct: Struct,
        UFix64: UFix64,
        UInt: UInt,
        UInt128: UInt128,
        UInt16: UInt16,
        UInt256: UInt256,
        UInt32: UInt32,
        UInt64: UInt64,
        UInt8: UInt8,
        Void: Void,
        Word16: Word16,
        Word32: Word32,
        Word64: Word64,
        Word8: Word8,
        _Array: _Array
    });

    // Inspired by: https://github.com/lukeed/uid/blob/master/src/index.js , thank you Luke! https://github.com/lukeed
    var HEX = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var T = HEX.length;
    function uid() {
      var str = "",
          num = 32;

      while (num--) {
        str += HEX[Math.random() * T | 0];
      }

      return str;
    }

    var isServerSide = function isServerSide() {
      return typeof window === "undefined";
    };

    var SESSION_STORAGE = {
      can: !isServerSide(),
      get: function () {
        var _get = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(key) {
          return regenerator.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  return _context.abrupt("return", JSON.parse(sessionStorage.getItem(key)));

                case 1:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee);
        }));

        function get(_x) {
          return _get.apply(this, arguments);
        }

        return get;
      }(),
      put: function () {
        var _put = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2(key, value) {
          return regenerator.wrap(function _callee2$(_context2) {
            while (1) {
              switch (_context2.prev = _context2.next) {
                case 0:
                  return _context2.abrupt("return", sessionStorage.setItem(key, JSON.stringify(value)));

                case 1:
                case "end":
                  return _context2.stop();
              }
            }
          }, _callee2);
        }));

        function put(_x2, _x3) {
          return _put.apply(this, arguments);
        }

        return put;
      }()
    };
    config$2({
      "discovery.wallet.method.default": "IFRAME/RPC",
      "fcl.storage.default": SESSION_STORAGE
    });
    function configLens(_x4) {
      return _configLens.apply(this, arguments);
    }

    function _configLens() {
      _configLens = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee3(regex) {
        return regenerator.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.t0 = Object;
                _context3.t1 = Object;
                _context3.next = 4;
                return config$2().where(regex);

              case 4:
                _context3.t2 = _context3.sent;
                _context3.t3 = _context3.t1.entries.call(_context3.t1, _context3.t2).map(function (_ref) {
                  var _ref2 = _slicedToArray(_ref, 2),
                      key = _ref2[0],
                      value = _ref2[1];

                  return [key.replace(regex, ""), value];
                });
                return _context3.abrupt("return", _context3.t0.fromEntries.call(_context3.t0, _context3.t3));

              case 7:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3);
      }));
      return _configLens.apply(this, arguments);
    }

    var VERSION = "1.3.1" ;

    var is = function is(type) {
      return function (d) {
        return _typeof(d) === type;
      };
    };

    var isRequired = function isRequired(d) {
      return d != null;
    };
    var isObject = is("object");
    var isString = is("string");
    var isFunc = is("function");
    var isNumber = is("number");

    function normalizeArgs(ax) {
      if (isFunc(ax)) return ax(arg, t$1);
      return [];
    }

    function httpDocumentResolver(_x) {
      return _httpDocumentResolver.apply(this, arguments);
    }

    function _httpDocumentResolver() {
      _httpDocumentResolver = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(_ref) {
        var url, res, document;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                url = _ref.url;
                invariant$1(typeof url !== "undefined", "retrieve({ url }) -- url must be defined");
                _context.prev = 2;
                _context.next = 5;
                return fetchTransport(url);

              case 5:
                res = _context.sent;
                _context.next = 11;
                break;

              case 8:
                _context.prev = 8;
                _context.t0 = _context["catch"](2);
                throw new Error("httpDocumentResolver Error: Failed to retrieve document.");

              case 11:
                if (!res.ok) {
                  _context.next = 17;
                  break;
                }

                _context.next = 14;
                return res.json();

              case 14:
                _context.t1 = _context.sent;
                _context.next = 18;
                break;

              case 17:
                _context.t1 = null;

              case 18:
                document = _context.t1;
                return _context.abrupt("return", document);

              case 20:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, null, [[2, 8]]);
      }));
      return _httpDocumentResolver.apply(this, arguments);
    }

    var DOCUMENT_RESOLVERS = new Map([["http", httpDocumentResolver], ["https", httpDocumentResolver]]);
    function retrieve(_x2) {
      return _retrieve.apply(this, arguments);
    }

    function _retrieve() {
      _retrieve = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2(_ref2) {
        var url, documentResolversFromConfig, urlParts, protocol, resolver, document;
        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                url = _ref2.url;
                invariant$1(typeof url !== "undefined", "retrieve({ url }) -- url must be defined");
                invariant$1(typeof url === "string", "retrieve({ url }) -- url must be a string");
                _context2.next = 5;
                return config$2().where(/^document\.resolver\./);

              case 5:
                documentResolversFromConfig = _context2.sent;
                Object.keys(documentResolversFromConfig).map(function (key) {
                  var resolverFromConfig = documentResolversFromConfig[key];
                  var resolverProtocol = key.replace(/^document\.resolver\./, "");
                  DOCUMENT_RESOLVERS.set(resolverProtocol, resolverFromConfig);
                });
                urlParts = /^(.*):\/\/([A-Za-z0-9\-\.]+)(:[0-9]+)?(.*)$/.exec(url);
                invariant$1(urlParts, "Failed to parse URL");
                protocol = urlParts[1];
                invariant$1(urlParts, "Failed to parse URL protocol");
                resolver = DOCUMENT_RESOLVERS.get(protocol);
                invariant$1(resolver, "No resolver found for protcol=".concat(protocol));
                _context2.next = 15;
                return resolver({
                  url: url
                });

              case 15:
                document = _context2.sent;
                return _context2.abrupt("return", document);

              case 17:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));
      return _retrieve.apply(this, arguments);
    }

    function normalizeInteractionTemplate(template) {
      if (template == null) return null;

      switch (template["f_version"]) {
        case "1.0.0":
          return template;

        default:
          throw new Error("normalizeInteractionTemplate Error: Invalid InteractionTemplate");
      }
    }

    function deriveCadenceByNetwork(_ref) {
      var _template, _template$data;

      var network = _ref.network,
          template = _ref.template;
      invariant(network != undefined, "deriveCadenceByNetwork({ network }) -- network must be defined");
      invariant(typeof network === "string", "deriveCadenceByNetwork({ network }) -- network must be a string");
      invariant(template != undefined, "generateDependencyPin({ template }) -- template must be defined");
      invariant(_typeof(template) === "object", "generateDependencyPin({ template }) -- template must be an object");
      invariant(template.f_type === "InteractionTemplate", "generateDependencyPin({ template }) -- template must be an InteractionTemplate");
      template = normalizeInteractionTemplate(template);

      switch (template.f_version) {
        case "1.0.0":
          var networkDependencies = Object.keys((_template = template) === null || _template === void 0 ? void 0 : (_template$data = _template.data) === null || _template$data === void 0 ? void 0 : _template$data.dependencies).map(function (dependencyPlaceholder) {
            var _template2, _template2$data, _template2$data$depen;

            var dependencyNetworkContracts = Object.values((_template2 = template) === null || _template2 === void 0 ? void 0 : (_template2$data = _template2.data) === null || _template2$data === void 0 ? void 0 : (_template2$data$depen = _template2$data.dependencies) === null || _template2$data$depen === void 0 ? void 0 : _template2$data$depen[dependencyPlaceholder]);
            invariant(dependencyNetworkContracts, "deriveCadenceByNetwork -- Could not find contracts for dependency placeholder: ".concat(dependencyPlaceholder));
            invariant(dependencyNetworkContracts.length === 0, "deriveCadenceByNetwork -- Could not find contracts for dependency placeholder: ".concat(dependencyPlaceholder));
            var dependencyContract = dependencyNetworkContracts[0];
            var dependencyContractForNetwork = dependencyContract === null || dependencyContract === void 0 ? void 0 : dependencyContract[network];
            invariant(dependencyContractForNetwork, "deriveCadenceByNetwork -- Could not find ".concat(network, " network information for dependency: ").concat(dependencyPlaceholder));
            return [dependencyPlaceholder, dependencyContractForNetwork.address];
          });
          return networkDependencies.reduce(function (cadence, _ref2) {
            var _ref3 = _slicedToArray(_ref2, 2),
                placeholder = _ref3[0],
                address = _ref3[1];

            var regex = new RegExp("(\\b" + placeholder + "\\b)", "g");
            return cadence.replace(regex, address);
          }, template.data.cadence);

        default:
          throw new Error("deriveCadenceByNetwork Error: Unsupported template version");
      }
    }

    function deriveDependencies(_x) {
      return _deriveDependencies.apply(this, arguments);
    }

    function _deriveDependencies() {
      _deriveDependencies = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(_ref) {
        var _template$data;

        var template, network, derivedDependencies, dependencyPlaceholderKeys, _i, _dependencyPlaceholde, _template$data2, dependencyPlaceholderKey, dependencyPlaceholder, dependencyPlaceholderContractsKeys, dependencyPlaceholderContract, dependency;

        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                template = _ref.template;
                _context.next = 3;
                return config$2.get("flow.network");

              case 3:
                network = _context.sent;
                invariant$1(network, "FCL configureDependencies Error: Missing configuration value for 'flow.network'");
                derivedDependencies = {};
                _context.t0 = template["f_version"];
                _context.next = _context.t0 === "1.0.0" ? 9 : 12;
                break;

              case 9:
                dependencyPlaceholderKeys = Object.keys(template === null || template === void 0 ? void 0 : (_template$data = template.data) === null || _template$data === void 0 ? void 0 : _template$data.dependencies);

                for (_i = 0, _dependencyPlaceholde = dependencyPlaceholderKeys; _i < _dependencyPlaceholde.length; _i++) {
                  dependencyPlaceholderKey = _dependencyPlaceholde[_i];
                  dependencyPlaceholder = template === null || template === void 0 ? void 0 : (_template$data2 = template.data) === null || _template$data2 === void 0 ? void 0 : _template$data2.dependencies[dependencyPlaceholderKey];
                  dependencyPlaceholderContractsKeys = Object.keys(dependencyPlaceholder);
                  invariant$1(dependencyPlaceholderContractsKeys.length > 0, "FCL configureDependencies Error: No contracts found in template for placeholder=".concat(dependencyPlaceholderKey));
                  dependencyPlaceholderContract = dependencyPlaceholder[dependencyPlaceholderContractsKeys[0]];
                  dependency = dependencyPlaceholderContract[network];
                  invariant$1(dependency, "FCL configureDependencies Error: No dependency information for placeholder=".concat(dependencyPlaceholderKey, " contract=").concat(dependencyPlaceholderContractsKeys[0], " network=").concat(network));
                  invariant$1(dependency === null || dependency === void 0 ? void 0 : dependency.address, "FCL configureDependencies Error: No address information for placeholder=".concat(dependencyPlaceholderKey, " contract=").concat(dependencyPlaceholderContractsKeys[0], " network=").concat(network));
                  derivedDependencies[dependencyPlaceholderKey] = withPrefix$1(dependency === null || dependency === void 0 ? void 0 : dependency.address);
                }

                return _context.abrupt("return", derivedDependencies);

              case 12:
                throw new Error("FCL configureDependencies Error: Unsupported template version");

              case 13:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _deriveDependencies.apply(this, arguments);
    }

    function prepTemplateOpts(_x) {
      return _prepTemplateOpts.apply(this, arguments);
    }

    function _prepTemplateOpts() {
      _prepTemplateOpts = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(opts) {
        var dependencies, cadence;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!isString(opts === null || opts === void 0 ? void 0 : opts.template)) {
                  _context.next = 4;
                  break;
                }

                _context.next = 3;
                return retrieve({
                  url: opts === null || opts === void 0 ? void 0 : opts.template
                });

              case 3:
                opts.template = _context.sent;

              case 4:
                dependencies = {};

                if (!(opts !== null && opts !== void 0 && opts.template)) {
                  _context.next = 10;
                  break;
                }

                opts.template = normalizeInteractionTemplate(opts === null || opts === void 0 ? void 0 : opts.template);
                _context.next = 9;
                return deriveDependencies({
                  template: opts.template
                });

              case 9:
                dependencies = _context.sent;

              case 10:
                _context.t0 = opts.cadence;

                if (_context.t0) {
                  _context.next = 19;
                  break;
                }

                _context.t1 = deriveCadenceByNetwork;
                _context.t2 = opts.template;
                _context.next = 16;
                return config$2().get("flow.network");

              case 16:
                _context.t3 = _context.sent;
                _context.t4 = {
                  template: _context.t2,
                  network: _context.t3
                };
                _context.t0 = (0, _context.t1)(_context.t4);

              case 19:
                cadence = _context.t0;
                opts.cadence = cadence;
                opts.dependencies = dependencies;
                return _context.abrupt("return", opts);

              case 23:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _prepTemplateOpts.apply(this, arguments);
    }

    function pre(_x, _x2) {
      return _pre.apply(this, arguments);
    }

    function _pre() {
      _pre = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(type, opts) {
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                // prettier-ignore
                invariant$1(isRequired(opts), "".concat(type, "(opts) -- opts is required")); // prettier-ignore

                invariant$1(isObject(opts), "".concat(type, "(opts) -- opts must be an object")); // prettier-ignore

                invariant$1(!(opts.cadence && opts.template), "".concat(type, "({ template, cadence }) -- cannot pass both cadence and template")); // prettier-ignore

                invariant$1(isRequired(opts.cadence || (opts === null || opts === void 0 ? void 0 : opts.template)), "".concat(type, "({ cadence }) -- cadence is required")); // // prettier-ignore

                invariant$1(isString(opts.cadence) || (opts === null || opts === void 0 ? void 0 : opts.template), "".concat(type, "({ cadence }) -- cadence must be a string")); // prettier-ignore

                _context.t0 = invariant$1;
                _context.t1 = opts.cadence;

                if (_context.t1) {
                  _context.next = 11;
                  break;
                }

                _context.next = 10;
                return config$2().get("flow.network");

              case 10:
                _context.t1 = _context.sent;

              case 11:
                _context.t2 = _context.t1;
                _context.t3 = "".concat(type, "(opts) -- Required value for \"flow.network\" not defined in config. See: ", "https://github.com/onflow/flow-js-sdk/blob/master/packages/fcl/src/exec/query.md#configuration");
                (0, _context.t0)(_context.t2, _context.t3);
                _context.t4 = invariant$1;
                _context.next = 17;
                return config$2().get("accessNode.api");

              case 17:
                _context.t5 = _context.sent;
                _context.t6 = "".concat(type, "(opts) -- Required value for \"accessNode.api\" not defined in config. See: ", "https://github.com/onflow/flow-js-sdk/blob/master/packages/fcl/src/exec/query.md#configuration");
                (0, _context.t4)(_context.t5, _context.t6);

              case 20:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _pre.apply(this, arguments);
    }

    function preMutate(_x3) {
      return _preMutate.apply(this, arguments);
    }

    function _preMutate() {
      _preMutate = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2(opts) {
        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                return _context2.abrupt("return", pre("mutate", opts));

              case 1:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));
      return _preMutate.apply(this, arguments);
    }

    function preQuery(_x4) {
      return _preQuery.apply(this, arguments);
    }

    function _preQuery() {
      _preQuery = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee3(opts) {
        return regenerator.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                return _context3.abrupt("return", pre("query", opts));

              case 1:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3);
      }));
      return _preQuery.apply(this, arguments);
    }

    /** Query the Flow Blockchain
     *
     *  @arg {Object} opts         - Query Options and configuration
     *  @arg {string} opts.cadence - Cadence Script used to query Flow
     *  @arg {ArgsFn} opts.args    - Arguments passed to cadence script
     *  @arg {Object} opts.template - Interaction Template for a script
     *  @arg {number} opts.limit   - Compute Limit for Query
     *  @returns {Promise<Response>}
     *
     *  Where:
     *    @callback ArgsFn
     *    @arg {ArgFn}  arg - Argument function to define a single argument
     *    @arg {Object} t   - Cadence Types object used to define the type
     *    @returns {args[]}
     *
     *    @callback ArgFn
     *    @arg {Any}  value - the value of the argument
     *    @arg {Type} type  - the cadence type of the value
     *    @returns {arg}
     *
     *  Example:
     *    const cadence = `
     *      cadence: `
     *        pub fun main(a: Int, b: Int, c: Address): Int {
     *          log(c)
     *          return a + b
     *        }
     *    `.trim()
     *
     *    const args = (arg, t) => [
     *      arg(5, t.Int),
     *      arg(7, t.Int),
     *      arg("0xb2db43ad6bc345fec9", t.Address),
     *    ]
     *
     *    await query({ cadence, args })
     */

    function query() {
      return _query.apply(this, arguments);
    }

    function _query() {
      _query = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2() {
        var opts,
            _args2 = arguments;
        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                opts = _args2.length > 0 && _args2[0] !== undefined ? _args2[0] : {};
                _context2.next = 3;
                return preQuery(opts);

              case 3:
                _context2.next = 5;
                return prepTemplateOpts(opts);

              case 5:
                opts = _context2.sent;
                return _context2.abrupt("return", config$2().overload(opts.dependencies || {}, /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee() {
                  return regenerator.wrap(function _callee$(_context) {
                    while (1) {
                      switch (_context.prev = _context.next) {
                        case 0:
                          return _context.abrupt("return", // prettier-ignore
                          send([script(opts.cadence), args(normalizeArgs(opts.args || [])), opts.limit && typeof opts.limit === "number" && limit(opts.limit)]).then(decode));

                        case 1:
                        case "end":
                          return _context.stop();
                      }
                    }
                  }, _callee);
                }))));

              case 7:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));
      return _query.apply(this, arguments);
    }

    function fetchServices(_x, _x2) {
      return _fetchServices.apply(this, arguments);
    }

    function _fetchServices() {
      _fetchServices = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(servicesURL, code) {
        var url, resp, services, _iterator, _step, service;

        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!(servicesURL == null || code == null)) {
                  _context.next = 2;
                  break;
                }

                return _context.abrupt("return", []);

              case 2:
                url = new URL(servicesURL);
                url.searchParams.append("code", code);
                _context.next = 6;
                return fetch(url, {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json"
                  }
                }).then(function (d) {
                  return d.json();
                });

              case 6:
                resp = _context.sent;

                if (!Array.isArray(resp)) {
                  _context.next = 9;
                  break;
                }

                return _context.abrupt("return", resp);

              case 9:
                // Backwards compatibility for First-Gen Wallet Providers
                services = []; // Convert authorizations into authz services

                if (Array.isArray(resp.authorizations)) {
                  _iterator = _createForOfIteratorHelper(resp.authorizations);

                  try {
                    for (_iterator.s(); !(_step = _iterator.n()).done;) {
                      service = _step.value;
                      services.push(_objectSpread2({
                        type: "authz",
                        keyId: resp.keyId
                      }, service));
                    }
                  } catch (err) {
                    _iterator.e(err);
                  } finally {
                    _iterator.f();
                  }
                } // Convert Provider info into an authn service


                if (resp.provider != null) {
                  services.push(_objectSpread2({
                    type: "authn",
                    id: "wallet-provider#authn"
                  }, resp.provider));
                }

                return _context.abrupt("return", services);

              case 13:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _fetchServices.apply(this, arguments);
    }

    function mergeServices() {
      var sx1 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      var sx2 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
      // TODO: Make this smarter
      return [].concat(_toConsumableArray(sx1), _toConsumableArray(sx2));
    }

    var SERVICE_PRAGMA = {
      f_type: "Service",
      f_vsn: "1.0.0"
    };
    var IDENTITY_PRAGMA = {
      f_type: "Identity",
      f_vsn: "1.0.0"
    };
    var USER_PRAGMA = {
      f_type: "USER",
      f_vsn: "1.0.0"
    };
    var POLLING_RESPONSE_PRAGMA = {
      f_type: "PollingResponse",
      f_vsn: "1.0.0"
    };
    var COMPOSITE_SIGNATURE_PRAGMA = {
      f_type: "CompositeSignature",
      f_vsn: "1.0.0"
    };

    //   "f_type": "Service",
    //   "f_vsn": "1.0.0",
    //   "type": "authn",
    //   "uid": "uniqueDedupeKey",
    //   "endpoint": "https://rawr",
    //   "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // wallets internal id for the user
    //   "identity": {
    //     "address": "0x____"
    //   },
    //   "provider": {
    //     "address": "0x____",
    //     "name": "Best Wallet",
    //     "description": "The Best Wallet"
    //     "icon": "https://",
    //   }
    // }

    function normalizeAuthn(service) {
      if (service == null) return null;

      switch (service["f_vsn"]) {
        case "1.0.0":
          return service;

        default:
          return _objectSpread2(_objectSpread2({}, SERVICE_PRAGMA), {}, {
            type: service.type,
            uid: service.id,
            endpoint: service.authn,
            id: service.pid,
            provider: {
              address: withPrefix$1(service.addr),
              name: service.name,
              icon: service.icon
            }
          });
      }
    }

    //   "f_type": "service",
    //   "f_vsn": "1.0.0",
    //   "type": "authz",
    //   "uid": "uniqueDedupeKey",
    //   "endpoint": "https://rawr",
    //   "method": "HTTP/POST", // HTTP/POST | IFRAME/RPC | HTTP/RPC
    //   "identity": {
    //      "address": "0x______",
    //      "keyId": 0,
    //   },
    //   "data": {}, // included in body of authz request
    //   "params": {}, // included as query params on endpoint url
    // }

    function normalizeAuthz(service) {
      if (service == null) return null;

      switch (service["f_vsn"]) {
        case "1.0.0":
          return service;

        default:
          return _objectSpread2(_objectSpread2({}, SERVICE_PRAGMA), {}, {
            type: service.type,
            uid: service.id,
            endpoint: service.endpoint,
            method: service.method,
            identity: _objectSpread2(_objectSpread2({}, IDENTITY_PRAGMA), {}, {
              address: withPrefix$1(service.addr),
              keyId: service.keyId
            }),
            params: service.params,
            data: service.data
          });
      }
    }

    //   "f_type": "service",
    //   "f_vsn": "1.0.0",
    //   "type": "pre-authz",
    //   "uid": "uniqueDedupeKey",
    //   "endpoint": "https://rawr",
    //   "method": "HTTP/POST", // HTTP/POST | IFRAME/RPC | HTTP/RPC
    //   "identity": {
    //      "address": "0x______",
    //      "keyId": 0,
    //   },
    //   "data": {}, // included in body of pre-authz request
    //   "params": {}, // included as query params on endpoint url
    // }

    function normalizePreAuthz(service) {
      if (service == null) return null;

      switch (service["f_vsn"]) {
        case "1.0.0":
          return service;

        default:
          return _objectSpread2(_objectSpread2({}, SERVICE_PRAGMA), {}, {
            type: service.type,
            uid: service.id,
            endpoint: service.endpoint,
            method: service.method,
            identity: _objectSpread2(_objectSpread2({}, IDENTITY_PRAGMA), {}, {
              address: withPrefix$1(service.addr),
              keyId: service.keyId
            }),
            params: service.params,
            data: service.data
          });
      }
    }

    //    "f_type": "Service",
    //    "f_vsn": "1.0.0",
    //    "type": "frame",
    //    "endpoint": "https://rawr",
    //    "data": {},   // Sent to frame when ready
    //    "params": {}, // include in query params on frame
    // }

    function normalizeFrame(service) {
      if (service == null) return null;

      switch (service["f_vsn"]) {
        case "1.0.0":
          return service;

        default:
          return _objectSpread2(_objectSpread2({
            old: service
          }, SERVICE_PRAGMA), {}, {
            type: "frame",
            endpoint: service.endpoint,
            params: service.params || {},
            data: service.data || {}
          });
      }
    }

    //    "f_type": "Service",
    //    "f_vsn": "1.0.0",
    //    "type": "back-channel-rpc",
    //    "endpoint": "https://rawr",
    //    "method": "HTTP/GET", // HTTP/GET | HTTP/POST
    //    "data": {},           // included in body of rpc
    //    "params": {},         // included as query params on endpoint url
    // }

    function normalizeBackChannelRpc(service) {
      if (service == null) return null;

      switch (service["f_vsn"]) {
        case "1.0.0":
          return service;

        default:
          return _objectSpread2(_objectSpread2({}, SERVICE_PRAGMA), {}, {
            type: "back-channel-rpc",
            endpoint: service.endpoint,
            method: service.method,
            params: service.params || {},
            data: service.data || {}
          });
      }
    }

    //   "f_type": "Service",
    //   "f_vsn": "1.0.0",
    //   "type": "open-id",
    //   "uid": "uniqueDedupeKey",
    //   "method: "data",
    //   "data": {
    //      "profile": {
    //        "name": "Bob",
    //        "family_name": "Builder",
    //        "given_name": "Robert",
    //        "middle_name": "the",
    //        "nickname": "Bob the Builder",
    //        "perferred_username": "bob",
    //        "profile": "https://www.bobthebuilder.com/",
    //        "picture": "https://avatars.onflow.org/avatar/bob",
    //        "gender": "...",
    //        "birthday": "2001-01-18",
    //        "zoneinfo": "America/Vancouver",
    //        "locale": "en-us",
    //        "updated_at": "1614970797388"
    //      },
    //      "email": {
    //        "email": "bob@bob.bob",
    //        "email_verified": true
    //      },
    //      "address": {
    //        "address": "One Apple Park Way, Cupertino, CA 95014, USA"
    //      },
    //      "phone": {
    //        "phone_number": "+1 (xxx) yyy-zzzz",
    //        "phone_number_verified": true
    //      },
    //      "social": {
    //        "twitter": "@_qvvg",
    //        "twitter_verified": true
    //      },
    //   }
    // }

    function normalizeOpenId(service) {
      if (service == null) return null;

      switch (service["f_vsn"]) {
        case "1.0.0":
          return service;

        default:
          return null;
      }
    }

    // {
    //   "f_type": "Service",
    //   "f_vsn": "1.0.0",
    //   "type": "user-signature",
    //   "uid": "uniqueDedupeKey",
    //   "endpoint": "https://rawr",
    //   "method": "IFRAME/RPC", // HTTP/POST | IFRAME/RPC | HTTP/RPC
    //   "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // wallets internal id for the user
    //   "data": {}, // included in body of user-signature request
    //   "params": {}, // included as query params on endpoint url
    // }
    function normalizeUserSignature(service) {
      if (service == null) return null;

      switch (service["f_vsn"]) {
        case "1.0.0":
          return service;

        default:
          throw new Error("Invalid user-signature service");
      }
    }

    //    "f_type": "Service",
    //    "f_vsn": "1.0.0",
    //    type: "local-view",
    //    method: "VIEW/IFRAME",
    //    endpoint: "https://woot.org/authz/local",
    //    data: {},
    //    params: {},
    // }

    function normalizeLocalView(resp) {
      if (resp == null) return null;

      if (resp.method == null) {
        resp = _objectSpread2(_objectSpread2({}, resp), {}, {
          type: "local-view",
          method: "VIEW/IFRAME"
        });
      }

      switch (resp["f_vsn"]) {
        case "1.0.0":
          return resp;

        default:
          return _objectSpread2(_objectSpread2({}, SERVICE_PRAGMA), {}, {
            type: resp.type || "local-view",
            method: resp.method,
            endpoint: resp.endpoint,
            data: resp.data || {},
            params: resp.params || {}
          });
      }
    }

    // {
    //   "f_type": "Service",                    // Its a service!
    //   "f_vsn": "1.0.0",                       // Follows the v1.0.0 spec for the service
    //   "type": "account-proof",                // the type of service it is
    //   "method": "DATA",                       // Its data!
    //   "uid": "awesome-wallet#account-proof",  // A unique identifier for the service
    //   "data": {
    //     "f_type": "account-proof",
    //     "f_vsn": "1.0.0",
    //     "nonce": "0A1BC2FF",                  // Nonce signed by the current account-proof (minimum 32 bytes in total, i.e 64 hex characters)
    //     "address": "0xUSER",                  // The user's address (8 bytes, i.e 16 hex characters)
    //     "signature": CompositeSignature,      // address (sans-prefix), keyId, signature (hex)
    // }
    function normalizeAccountProof(service) {
      if (service == null) return null;

      switch (service["f_vsn"]) {
        case "1.0.0":
          return service;

        default:
          throw new Error("FCL Normalizer Error: Invalid account-proof service");
      }
    }

    // {
    //   "f_type": "Service",
    //   "f_vsn": "1.0.0",
    //   "type": "authn-refresh",
    //   "uid": "uniqueDedupeKey",
    //   "endpoint": "https://rawr",
    //   "method": "HTTP/POST",  // "HTTP/POST", // HTTP/POST | IFRAME/RPC | HTTP/RPC
    //   "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // wallets internal id for the user
    //   "data": {}, // included in body of request
    //   "params": {}, // included as query params on endpoint url
    // }
    function normalizeAuthnRefresh(service) {
      if (service == null) return null;

      switch (service["f_vsn"]) {
        case "1.0.0":
          return service;

        default:
          throw new Error("Invalid authn-refresh service");
      }
    }

    var serviceNormalizers = {
      "back-channel-rpc": normalizeBackChannelRpc,
      "pre-authz": normalizePreAuthz,
      authz: normalizeAuthz,
      authn: normalizeAuthn,
      frame: normalizeFrame,
      "open-id": normalizeOpenId,
      "user-signature": normalizeUserSignature,
      "local-view": normalizeLocalView,
      "account-proof": normalizeAccountProof,
      "authn-refresh": normalizeAuthnRefresh
    };
    function normalizeService(service, data) {
      try {
        var normalized = serviceNormalizers[service.type](service, data);
        return normalized;
      } catch (error) {
        console.error("Unrecognized FCL Service Type [".concat(service.type, "]"), service, error);
        return service;
      }
    }

    function deriveCompositeId(authn) {
      return encode([authn.provider.address || authn.provider.name || "UNSPECIFIED", authn.id]).toString("hex");
    }

    function normalizeData(data) {
      data.addr = data.addr ? withPrefix$1(data.addr) : null;
      data.paddr = data.paddr ? withPrefix$1(data.paddr) : null;
      return data;
    }

    function findService(type, services) {
      return services.find(function (d) {
        return d.type === type;
      });
    }

    function buildUser(_x) {
      return _buildUser.apply(this, arguments);
    }

    function _buildUser() {
      _buildUser = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(data) {
        var services, authn;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                data = normalizeData(data);
                _context.t0 = mergeServices;
                _context.t1 = data.services || [];
                _context.next = 5;
                return fetchServices(data.hks, data.code);

              case 5:
                _context.t2 = _context.sent;
                services = (0, _context.t0)(_context.t1, _context.t2).map(function (service) {
                  return normalizeService(service, data);
                });
                authn = findService("authn", services);
                return _context.abrupt("return", _objectSpread2(_objectSpread2({}, USER_PRAGMA), {}, {
                  addr: withPrefix$1(data.addr),
                  cid: deriveCompositeId(authn),
                  loggedIn: true,
                  services: services,
                  expiresAt: data.expires
                }));

              case 9:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _buildUser.apply(this, arguments);
    }

    function serviceOfType() {
      var services = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      var type = arguments.length > 1 ? arguments[1] : undefined;
      return services.find(function (service) {
        return service.type === type;
      });
    }

    function serviceEndpoint(service) {
      var url = new URL(service.endpoint);
      url.searchParams.append("l6n", window.location.origin);

      if (service.params != null) {
        for (var _i = 0, _Object$entries = Object.entries(service.params || {}); _i < _Object$entries.length; _i++) {
          var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
              key = _Object$entries$_i[0],
              value = _Object$entries$_i[1];

          url.searchParams.append(key, value);
        }
      }

      return url;
    }

    function fetchService(service) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var method = opts.method || "POST";
      var body = method === "GET" ? undefined : JSON.stringify(opts.data || service.data || {});
      return fetch(serviceEndpoint(service), {
        method: method,
        headers: _objectSpread2(_objectSpread2(_objectSpread2({}, service.headers || {}), opts.headers || {}), {}, {
          "Content-Type": "application/json"
        }),
        body: body
      }).then(function (d) {
        return d.json();
      });
    }

    //    "f_type": "PollingResponse",
    //    "f_vsn": "1.0.0",
    //    "status": "PENDING", // PENDING | APPROVED | DECLINED | REDIRECT
    //    "reason": null,      // Reason for Declining Transaction
    //    "data": null,        // Return value for APPROVED
    //    "updates": BackChannelRpc,
    //    "local": Frame,
    // }

    function normalizePollingResponse(resp) {
      var _resp$status, _resp$reason;

      if (resp == null) return null;

      switch (resp["f_vsn"]) {
        case "1.0.0":
          return resp;

        default:
          return _objectSpread2(_objectSpread2({}, POLLING_RESPONSE_PRAGMA), {}, {
            status: (_resp$status = resp.status) !== null && _resp$status !== void 0 ? _resp$status : "APPROVED",
            reason: (_resp$reason = resp.reason) !== null && _resp$reason !== void 0 ? _resp$reason : null,
            data: resp.compositeSignature || resp.data || _objectSpread2({}, resp) || {},
            updates: normalizeBackChannelRpc(resp.authorizationUpdates),
            local: normalizeFrame((resp.local || [])[0])
          });
      }
    }

    var OPTIONS = {
      "HTTP/GET": "GET",
      "HTTP/POST": "POST"
    };

    var serviceMethod = function serviceMethod(service) {
      invariant$1(OPTIONS[service.method], "Invalid Service Method for type back-channel-rpc", {
        service: service
      });
      return OPTIONS[service.method];
    };

    function poll(_x) {
      return _poll.apply(this, arguments);
    }

    function _poll() {
      _poll = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(service) {
        var canContinue,
            resp,
            _args = arguments;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                canContinue = _args.length > 1 && _args[1] !== undefined ? _args[1] : function () {
                  return true;
                };
                invariant$1(service, "Missing Polling Service", {
                  service: service
                });

                if (canContinue()) {
                  _context.next = 4;
                  break;
                }

                throw new Error("Externally Halted");

              case 4:
                _context.next = 6;
                return fetchService(service, {
                  method: serviceMethod(service)
                }).then(normalizePollingResponse);

              case 6:
                resp = _context.sent;
                _context.t0 = resp.status;
                _context.next = _context.t0 === "APPROVED" ? 10 : _context.t0 === "DECLINED" ? 11 : 12;
                break;

              case 10:
                return _context.abrupt("return", resp.data);

              case 11:
                throw new Error("Declined: ".concat(resp.reason || "No reason supplied."));

              case 12:
                _context.next = 14;
                return new Promise(function (r) {
                  return setTimeout(r, 500);
                });

              case 14:
                return _context.abrupt("return", poll(resp.updates, canContinue));

              case 15:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _poll.apply(this, arguments);
    }

    var FRAME = "FCL_IFRAME";
    var FRAME_STYLES = "\n  position:fixed;\n  top: 0px;\n  right: 0px;\n  bottom: 0px;\n  left: 0px;\n  height: 100%;\n  width: 100vw;\n  display:block;\n  background:rgba(0,0,0,0.25);\n  z-index: 2147483647;\n  box-sizing: border-box;\n";
    function renderFrame(src) {
      invariant$1(!document.getElementById(FRAME), "Attempt at triggering multiple Frames", {
        src: src
      });
      var $frame = document.createElement("iframe");
      $frame.src = src;
      $frame.id = FRAME;
      $frame.allow = "usb *; hid *";
      $frame.frameBorder = "0";
      $frame.style.cssText = FRAME_STYLES;
      document.body.append($frame);

      var unmount = function unmount() {
        if (document.getElementById(FRAME)) {
          document.getElementById(FRAME).remove();
        }
      };

      return [$frame.contentWindow, unmount];
    }

    var POP = "FCL_POP";
    var popup = null;
    var previousUrl$1 = null;

    function popupWindow(url, windowName, win, w, h) {
      var y = win.top.outerHeight / 2 + win.top.screenY - h / 2;
      var x = win.top.outerWidth / 2 + win.top.screenX - w / 2;
      var popup = win.open(url, windowName, "toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=".concat(w, ", height=").concat(h, ", top=").concat(y, ", left=").concat(x));
      if (!popup) throw new Error("Popup failed to open (was it blocked by a popup blocker?)");
      return popup;
    }

    function renderPop(src) {
      var _popup;

      if (popup == null || (_popup = popup) !== null && _popup !== void 0 && _popup.closed) {
        popup = popupWindow(src, POP, window, 640, 770);
      } else if (previousUrl$1 !== src) {
        popup.location.replace(src);
        popup.focus();
      } else {
        popup.focus();
      }

      previousUrl$1 = src;

      var unmount = function unmount() {
        if (popup && !popup.closed) {
          popup.close();
        }

        popup = null;
      };

      return [popup, unmount];
    }

    var tab$1 = null;
    var previousUrl = null;
    function renderTab(src) {
      var _tab;

      if (tab$1 == null || (_tab = tab$1) !== null && _tab !== void 0 && _tab.closed) {
        tab$1 = window.open(src, "_blank");
        if (!tab$1) throw new Error("Tab failed to open (was it blocked by the browser?)");
      } else if (previousUrl !== src) {
        tab$1.location.replace(src);
        tab$1.focus();
      } else {
        tab$1.focus();
      }

      previousUrl = src;

      var unmount = function unmount() {
        if (tab$1 && !tab$1.closed) {
          tab$1.close();
        }

        tab$1 = null;
      };

      return [tab$1, unmount];
    }

    var VIEWS = {
      "VIEW/IFRAME": renderFrame,
      "VIEW/POP": renderPop,
      "VIEW/TAB": renderTab
    };
    function execLocal(_x) {
      return _execLocal.apply(this, arguments);
    }

    function _execLocal() {
      _execLocal = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(service) {
        var opts,
            _args = arguments;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                opts = _args.length > 1 && _args[1] !== undefined ? _args[1] : {};
                _context.prev = 1;
                return _context.abrupt("return", VIEWS[service.method](serviceEndpoint(service), opts));

              case 5:
                _context.prev = 5;
                _context.t0 = _context["catch"](1);
                console.error("execLocal({service, opts = {}})", _context.t0, {
                  service: service,
                  opts: opts
                });
                throw _context.t0;

              case 9:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, null, [[1, 5]]);
      }));
      return _execLocal.apply(this, arguments);
    }

    function execHttpPost(_x) {
      return _execHttpPost.apply(this, arguments);
    }

    function _execHttpPost() {
      _execHttpPost = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(_ref) {
        var service, body, config, resp, canContinue, _yield$execLocal, _yield$execLocal2, unmount, close;

        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                service = _ref.service, body = _ref.body, config = _ref.config, _ref.opts;
                _context.next = 3;
                return fetchService(service, {
                  data: _objectSpread2({
                    fclVersion: VERSION,
                    service: {
                      params: service.params,
                      data: service.data,
                      type: service.type
                    },
                    config: config
                  }, body)
                }).then(normalizePollingResponse);

              case 3:
                resp = _context.sent;

                if (!(resp.status === "APPROVED")) {
                  _context.next = 8;
                  break;
                }

                return _context.abrupt("return", resp.data);

              case 8:
                if (!(resp.status === "DECLINED")) {
                  _context.next = 12;
                  break;
                }

                throw new Error("Declined: ".concat(resp.reason || "No reason supplied."));

              case 12:
                if (!(resp.status === "REDIRECT")) {
                  _context.next = 16;
                  break;
                }

                return _context.abrupt("return", resp);

              case 16:
                if (!(resp.status === "PENDING")) {
                  _context.next = 28;
                  break;
                }

                canContinue = true;
                _context.next = 20;
                return execLocal(normalizeLocalView(resp.local));

              case 20:
                _yield$execLocal = _context.sent;
                _yield$execLocal2 = _slicedToArray(_yield$execLocal, 2);
                _yield$execLocal2[0];
                unmount = _yield$execLocal2[1];

                close = function close() {
                  try {
                    unmount();
                    canContinue = false;
                  } catch (error) {
                    console.error("Frame Close Error", error);
                  }
                };

                return _context.abrupt("return", poll(resp.updates, function () {
                  return canContinue;
                }).then(function (serviceResponse) {
                  close();
                  return serviceResponse;
                })["catch"](function (error) {
                  console.error(error);
                  close();
                  throw error;
                }));

              case 28:
                console.error("Auto Decline: Invalid Response", {
                  service: service,
                  resp: resp
                });
                throw new Error("Auto Decline: Invalid Response");

              case 30:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _execHttpPost.apply(this, arguments);
    }

    var CLOSE_EVENT = "FCL:VIEW:CLOSE";
    var READY_EVENT = "FCL:VIEW:READY";
    var RESPONSE_EVENT = "FCL:VIEW:RESPONSE";

    var _ = function _(e) {
      return typeof e === "string" && e.toLowerCase();
    };

    var IGNORE = new Set(["monetizationstart", "monetizationpending", "monetizationprogress", "monetizationstop"]);

    var deprecate = function deprecate(was, want) {
      return console.warn("DEPRECATION NOTICE", "Received ".concat(was, ", please use ").concat(want, " for this and future versions of FCL"));
    };

    var buildMessageHandler = function buildMessageHandler(_ref) {
      var close = _ref.close,
          send = _ref.send,
          onReady = _ref.onReady,
          onResponse = _ref.onResponse,
          onMessage = _ref.onMessage;
      return function (e) {
        try {
          if (_typeof(e.data) !== "object") return;
          if (IGNORE.has(e.data.type)) return;
          if (_(e.data.type) === _(CLOSE_EVENT)) close();
          if (_(e.data.type) === _(READY_EVENT)) onReady(e, {
            send: send,
            close: close
          });
          if (_(e.data.type) === _(RESPONSE_EVENT)) onResponse(e, {
            send: send,
            close: close
          });
          onMessage(e, {
            send: send,
            close: close
          }); // Backwards Compatible

          if (_(e.data.type) === _("FCL:FRAME:READY")) {
            deprecate(e.data.type, READY_EVENT);
            onReady(e, {
              send: send,
              close: close
            });
          }

          if (_(e.data.type) === _("FCL:FRAME:RESPONSE")) {
            deprecate(e.data.type, RESPONSE_EVENT);
            onResponse(e, {
              send: send,
              close: close
            });
          }

          if (_(e.data.type) === _("FCL:FRAME:CLOSE")) {
            deprecate(e.data.type, CLOSE_EVENT);
            close();
          } //


          if (_(e.data.type) === _("FCL::CHALLENGE::RESPONSE")) {
            deprecate(e.data.type, RESPONSE_EVENT);
            onResponse(e, {
              send: send,
              close: close
            });
          }

          if (_(e.data.type) === _("FCL::AUTHZ_READY")) {
            deprecate(e.data.type, READY_EVENT);
            onReady(e, {
              send: send,
              close: close
            });
          }

          if (_(e.data.type) === _("FCL::CHALLENGE::CANCEL")) {
            deprecate(e.data.type, CLOSE_EVENT);
            close();
          }

          if (_(e.data.type) === _("FCL::CANCEL")) {
            deprecate(e.data.type, CLOSE_EVENT);
            close();
          }
        } catch (error) {
          console.error("Frame Callback Error", error);
          close();
        }
      };
    };

    var noop$3 = function noop() {};

    function frame(service) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      if (service == null) return {
        send: noop$3,
        close: noop$3
      };
      var onClose = opts.onClose || noop$3;
      var onMessage = opts.onMessage || noop$3;
      var onReady = opts.onReady || noop$3;
      var onResponse = opts.onResponse || noop$3;
      var handler = buildMessageHandler({
        close: close,
        send: send,
        onReady: onReady,
        onResponse: onResponse,
        onMessage: onMessage
      });
      window.addEventListener("message", handler);

      var _renderFrame = renderFrame(serviceEndpoint(service)),
          _renderFrame2 = _slicedToArray(_renderFrame, 2),
          $frame = _renderFrame2[0],
          unmount = _renderFrame2[1];

      return {
        send: send,
        close: close
      };

      function close() {
        try {
          window.removeEventListener("message", handler);
          unmount();
          onClose();
        } catch (error) {
          console.error("Frame Close Error", error);
        }
      }

      function send(msg) {
        try {
          $frame.postMessage(JSON.parse(JSON.stringify(msg || {})), "*");
        } catch (error) {
          console.error("Frame Send Error", msg, error);
        }
      }
    }

    function execIframeRPC(_ref) {
      var service = _ref.service,
          body = _ref.body,
          config = _ref.config,
          opts = _ref.opts;
      return new Promise(function (resolve, reject) {
        var id = uid();
        var includeOlderJsonRpcCall = opts.includeOlderJsonRpcCall;
        frame(service, {
          onReady: function onReady(_, _ref2) {
            return _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee() {
              var send;
              return regenerator.wrap(function _callee$(_context) {
                while (1) {
                  switch (_context.prev = _context.next) {
                    case 0:
                      send = _ref2.send;
                      _context.prev = 1;
                      send({
                        type: "FCL:VIEW:READY:RESPONSE",
                        fclVersion: VERSION,
                        body: body,
                        service: {
                          params: service.params,
                          data: service.data,
                          type: service.type
                        },
                        config: config
                      });
                      send({
                        fclVersion: VERSION,
                        type: "FCL:FRAME:READY:RESPONSE",
                        body: body,
                        service: {
                          params: service.params,
                          data: service.data,
                          type: service.type
                        },
                        config: config,
                        deprecated: {
                          message: "FCL:FRAME:READY:RESPONSE is deprecated and replaced with type: FCL:VIEW:READY:RESPONSE"
                        }
                      });

                      if (includeOlderJsonRpcCall) {
                        send({
                          jsonrpc: "2.0",
                          id: id,
                          method: "fcl:sign",
                          params: [body, service.params],
                          deprecated: {
                            message: "jsonrpc is deprecated and replaced with type: FCL:VIEW:READY:RESPONSE"
                          }
                        });
                      }

                      _context.next = 10;
                      break;

                    case 7:
                      _context.prev = 7;
                      _context.t0 = _context["catch"](1);
                      throw _context.t0;

                    case 10:
                    case "end":
                      return _context.stop();
                  }
                }
              }, _callee, null, [[1, 7]]);
            }))();
          },
          onResponse: function onResponse(e, _ref3) {
            var close = _ref3.close;

            try {
              if (_typeof(e.data) !== "object") return;
              var resp = normalizePollingResponse(e.data);

              switch (resp.status) {
                case "APPROVED":
                  resolve(resp.data);
                  close();
                  break;

                case "DECLINED":
                  reject("Declined: ".concat(resp.reason || "No reason supplied"));
                  close();
                  break;

                case "REDIRECT":
                  resolve(resp);
                  close();
                  break;

                default:
                  reject("Declined: No reason supplied");
                  close();
                  break;
              }
            } catch (error) {
              console.error("execIframeRPC onResponse error", error);
              throw error;
            }
          },
          onMessage: function onMessage(e, _ref4) {
            var close = _ref4.close;

            try {
              if (_typeof(e.data) !== "object") return;
              if (e.data.jsonrpc !== "2.0") return;
              if (e.data.id !== id) return;
              var resp = normalizePollingResponse(e.data.result);

              switch (resp.status) {
                case "APPROVED":
                  resolve(resp.data);
                  close();
                  break;

                case "DECLINED":
                  reject("Declined: ".concat(resp.reason || "No reason supplied"));
                  close();
                  break;

                case "REDIRECT":
                  resolve(resp);
                  close();
                  break;

                default:
                  reject("Declined: No reason supplied");
                  close();
                  break;
              }
            } catch (error) {
              console.error("execIframeRPC onMessage error", error);
              throw error;
            }
          },
          onClose: function onClose() {
            reject("Declined: Externally Halted");
          }
        });
      });
    }

    var noop$2 = function noop() {};

    function pop(service) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      if (service == null) return {
        send: noop$2,
        close: noop$2
      };
      var onClose = opts.onClose || noop$2;
      var onMessage = opts.onMessage || noop$2;
      var onReady = opts.onReady || noop$2;
      var onResponse = opts.onResponse || noop$2;
      var handler = buildMessageHandler({
        close: close,
        send: send,
        onReady: onReady,
        onResponse: onResponse,
        onMessage: onMessage
      });
      window.addEventListener("message", handler);

      var _renderPop = renderPop(serviceEndpoint(service)),
          _renderPop2 = _slicedToArray(_renderPop, 2),
          $pop = _renderPop2[0],
          unmount = _renderPop2[1];

      var timer = setInterval(function () {
        if ($pop && $pop.closed) {
          close();
        }
      }, 500);
      return {
        send: send,
        close: close
      };

      function close() {
        try {
          window.removeEventListener("message", handler);
          clearInterval(timer);
          unmount();
          onClose();
        } catch (error) {
          console.error("Popup Close Error", error);
        }
      }

      function send(msg) {
        try {
          $pop.postMessage(JSON.parse(JSON.stringify(msg || {})), "*");
        } catch (error) {
          console.error("Popup Send Error", msg, error);
        }
      }
    }

    function execPopRPC(_ref) {
      var service = _ref.service,
          body = _ref.body,
          config = _ref.config,
          opts = _ref.opts;
      return new Promise(function (resolve, reject) {
        var id = uid();
        var redir = opts.redir,
            includeOlderJsonRpcCall = opts.includeOlderJsonRpcCall;
        pop(service, {
          onReady: function onReady(_, _ref2) {
            return _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee() {
              var send;
              return regenerator.wrap(function _callee$(_context) {
                while (1) {
                  switch (_context.prev = _context.next) {
                    case 0:
                      send = _ref2.send;
                      _context.prev = 1;
                      send({
                        fclVersion: VERSION,
                        type: "FCL:VIEW:READY:RESPONSE",
                        body: body,
                        service: {
                          params: service.params,
                          data: service.data,
                          type: service.type
                        },
                        config: config
                      });
                      send({
                        fclVersion: VERSION,
                        type: "FCL:FRAME:READY:RESPONSE",
                        body: body,
                        service: {
                          params: service.params,
                          data: service.data,
                          type: service.type
                        },
                        config: config,
                        deprecated: {
                          message: "FCL:FRAME:READY:RESPONSE is deprecated and replaced with type: FCL:VIEW:READY:RESPONSE"
                        }
                      });

                      if (includeOlderJsonRpcCall) {
                        send({
                          jsonrpc: "2.0",
                          id: id,
                          method: "fcl:sign",
                          params: [body, service.params]
                        });
                      }

                      _context.next = 10;
                      break;

                    case 7:
                      _context.prev = 7;
                      _context.t0 = _context["catch"](1);
                      throw _context.t0;

                    case 10:
                    case "end":
                      return _context.stop();
                  }
                }
              }, _callee, null, [[1, 7]]);
            }))();
          },
          onResponse: function onResponse(e, _ref3) {
            var close = _ref3.close;

            try {
              if (_typeof(e.data) !== "object") return;
              var resp = normalizePollingResponse(e.data);

              switch (resp.status) {
                case "APPROVED":
                  resolve(resp.data);
                  !redir && close();
                  break;

                case "DECLINED":
                  reject("Declined: ".concat(resp.reason || "No reason supplied"));
                  close();
                  break;

                case "REDIRECT":
                  resolve(resp);
                  close();
                  break;

                default:
                  reject("Declined: No reason supplied");
                  close();
                  break;
              }
            } catch (error) {
              console.error("execPopRPC onResponse error", error);
              throw error;
            }
          },
          onMessage: function onMessage(e, _ref4) {
            var close = _ref4.close;

            try {
              if (_typeof(e.data) !== "object") return;
              if (e.data.jsonrpc !== "2.0") return;
              if (e.data.id !== id) return;
              var resp = normalizePollingResponse(e.data.result);

              switch (resp.status) {
                case "APPROVED":
                  resolve(resp.data);
                  !redir && close();
                  break;

                case "DECLINED":
                  reject("Declined: ".concat(resp.reason || "No reason supplied"));
                  close();
                  break;

                case "REDIRECT":
                  resolve(resp);
                  close();
                  break;

                default:
                  reject("Declined: No reason supplied");
                  close();
                  break;
              }
            } catch (error) {
              console.error("execPopRPC onMessage error", error);
              throw error;
            }
          },
          onClose: function onClose() {
            reject("Declined: Externally Halted");
          }
        });
      });
    }

    var noop$1 = function noop() {};

    function tab(service) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      if (service == null) return {
        send: noop$1,
        close: noop$1
      };
      var onClose = opts.onClose || noop$1;
      var onMessage = opts.onMessage || noop$1;
      var onReady = opts.onReady || noop$1;
      var onResponse = opts.onResponse || noop$1;
      var handler = buildMessageHandler({
        close: close,
        send: send,
        onReady: onReady,
        onResponse: onResponse,
        onMessage: onMessage
      });
      window.addEventListener("message", handler);

      var _renderTab = renderTab(serviceEndpoint(service)),
          _renderTab2 = _slicedToArray(_renderTab, 2),
          $tab = _renderTab2[0],
          unmount = _renderTab2[1];

      var timer = setInterval(function () {
        if ($tab && $tab.closed) {
          close();
        }
      }, 500);
      return {
        send: send,
        close: close
      };

      function close() {
        try {
          window.removeEventListener("message", handler);
          clearInterval(timer);
          unmount();
          onClose();
        } catch (error) {
          console.error("Tab Close Error", error);
        }
      }

      function send(msg) {
        try {
          $tab.postMessage(JSON.parse(JSON.stringify(msg || {})), "*");
        } catch (error) {
          console.error("Tab Send Error", msg, error);
        }
      }
    }

    function execTabRPC(_ref) {
      var service = _ref.service,
          body = _ref.body,
          config = _ref.config,
          opts = _ref.opts;
      return new Promise(function (resolve, reject) {
        var id = uid();
        var redir = opts.redir,
            includeOlderJsonRpcCall = opts.includeOlderJsonRpcCall;
        tab(service, {
          onReady: function onReady(_, _ref2) {
            return _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee() {
              var send;
              return regenerator.wrap(function _callee$(_context) {
                while (1) {
                  switch (_context.prev = _context.next) {
                    case 0:
                      send = _ref2.send;
                      _context.prev = 1;
                      send({
                        fclVersion: VERSION,
                        type: "FCL:VIEW:READY:RESPONSE",
                        body: body,
                        service: {
                          params: service.params,
                          data: service.data,
                          type: service.type
                        },
                        config: config
                      });
                      send({
                        fclVersion: VERSION,
                        type: "FCL:FRAME:READY:RESPONSE",
                        body: body,
                        service: {
                          params: service.params,
                          data: service.data,
                          type: service.type
                        },
                        config: config,
                        deprecated: {
                          message: "FCL:FRAME:READY:RESPONSE is deprecated and replaced with type: FCL:VIEW:READY:RESPONSE"
                        }
                      });

                      if (includeOlderJsonRpcCall) {
                        send({
                          jsonrpc: "2.0",
                          id: id,
                          method: "fcl:sign",
                          params: [body, service.params]
                        });
                      }

                      _context.next = 10;
                      break;

                    case 7:
                      _context.prev = 7;
                      _context.t0 = _context["catch"](1);
                      throw _context.t0;

                    case 10:
                    case "end":
                      return _context.stop();
                  }
                }
              }, _callee, null, [[1, 7]]);
            }))();
          },
          onResponse: function onResponse(e, _ref3) {
            var close = _ref3.close;

            try {
              if (_typeof(e.data) !== "object") return;
              var resp = normalizePollingResponse(e.data);

              switch (resp.status) {
                case "APPROVED":
                  resolve(resp.data);
                  !redir && close();
                  break;

                case "DECLINED":
                  reject("Declined: ".concat(resp.reason || "No reason supplied"));
                  close();
                  break;

                case "REDIRECT":
                  resolve(resp);
                  close();
                  break;

                default:
                  reject("Declined: No reason supplied");
                  close();
                  break;
              }
            } catch (error) {
              console.error("execPopRPC onResponse error", error);
              throw error;
            }
          },
          onMessage: function onMessage(e, _ref4) {
            var close = _ref4.close;

            try {
              if (_typeof(e.data) !== "object") return;
              if (e.data.jsonrpc !== "2.0") return;
              if (e.data.id !== id) return;
              var resp = normalizePollingResponse(e.data.result);

              switch (resp.status) {
                case "APPROVED":
                  resolve(resp.data);
                  !redir && close();
                  break;

                case "DECLINED":
                  reject("Declined: ".concat(resp.reason || "No reason supplied"));
                  close();
                  break;

                case "REDIRECT":
                  resolve(resp);
                  close();
                  break;

                default:
                  reject("Declined: No reason supplied");
                  close();
                  break;
              }
            } catch (error) {
              console.error("execPopRPC onMessage error", error);
              throw error;
            }
          },
          onClose: function onClose() {
            reject("Declined: Externally Halted");
          }
        });
      });
    }

    var noop = function noop() {};

    function extension(service) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      if (service == null) return {
        send: noop,
        close: noop
      };
      var onClose = opts.onClose || noop;
      var onMessage = opts.onMessage || noop;
      var onReady = opts.onReady || noop;
      var onResponse = opts.onResponse || noop;
      var handler = buildMessageHandler({
        close: close,
        send: send,
        onReady: onReady,
        onResponse: onResponse,
        onMessage: onMessage
      });
      window.addEventListener("message", handler);
      send({
        service: service
      });
      return {
        send: send,
        close: close
      };

      function close() {
        try {
          window.removeEventListener("message", handler);
          onClose();
        } catch (error) {
          console.error("Ext Close Error", error);
        }
      }

      function send(msg) {
        try {
          window && window.postMessage(JSON.parse(JSON.stringify(msg || {})), "*");
        } catch (error) {
          console.error("Ext Send Error", msg, error);
        }
      }
    }

    function execExtRPC(_ref) {
      var service = _ref.service,
          body = _ref.body,
          config = _ref.config;
          _ref.opts;
      return new Promise(function (resolve, reject) {
        extension(service, {
          onReady: function onReady(_, _ref2) {
            return _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee() {
              var send;
              return regenerator.wrap(function _callee$(_context) {
                while (1) {
                  switch (_context.prev = _context.next) {
                    case 0:
                      send = _ref2.send;
                      _context.prev = 1;
                      send({
                        fclVersion: VERSION,
                        type: "FCL:VIEW:READY:RESPONSE",
                        body: body,
                        service: {
                          params: service.params,
                          data: service.data,
                          type: service.type
                        },
                        config: config
                      });
                      _context.next = 8;
                      break;

                    case 5:
                      _context.prev = 5;
                      _context.t0 = _context["catch"](1);
                      throw _context.t0;

                    case 8:
                    case "end":
                      return _context.stop();
                  }
                }
              }, _callee, null, [[1, 5]]);
            }))();
          },
          onResponse: function onResponse(e, _ref3) {
            var close = _ref3.close;

            try {
              if (_typeof(e.data) !== "object") return;
              var resp = normalizePollingResponse(e.data);

              switch (resp.status) {
                case "APPROVED":
                  resolve(resp.data);
                  close();
                  break;

                case "DECLINED":
                  reject("Declined: ".concat(resp.reason || "No reason supplied"));
                  close();
                  break;

                case "REDIRECT":
                  resolve(resp);
                  close();
                  break;

                default:
                  reject("Declined: No reason supplied");
                  close();
                  break;
              }
            } catch (error) {
              console.error("execExtRPC onResponse error", error);
              throw error;
            }
          },
          onClose: function onClose() {
            reject("Declined: Externally Halted");
          }
        });
      });
    }

    var CORE_STRATEGIES = {
      "HTTP/RPC": execHttpPost,
      "HTTP/POST": execHttpPost,
      "IFRAME/RPC": execIframeRPC,
      "POP/RPC": execPopRPC,
      "TAB/RPC": execTabRPC,
      "EXT/RPC": execExtRPC
    };
    var supportedPlugins = ["ServicePlugin"];
    var supportedServicePlugins = ["discovery-service"];

    var validateDiscoveryPlugin = function validateDiscoveryPlugin(servicePlugin) {
      var services = servicePlugin.services,
          serviceStrategy = servicePlugin.serviceStrategy;
      invariant$1(Array.isArray(services) && services.length, "Array of Discovery Services is required");

      var _iterator = _createForOfIteratorHelper(services),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var ds = _step.value;
          invariant$1(isRequired(ds.f_type) && ds.f_type === "Service", "Service is required");
          invariant$1(isRequired(ds.type) && ds.type === "authn", "Service must be type authn. Received ".concat(ds.type));
          invariant$1(ds.method in CORE_STRATEGIES || serviceStrategy.method === ds.method, "Service method ".concat(ds.method, " is not supported"));
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      invariant$1(isRequired(serviceStrategy), "Service strategy is required");
      invariant$1(isRequired(serviceStrategy.method) && isString(serviceStrategy.method), "Service strategy method is required");
      invariant$1(isRequired(serviceStrategy.exec) && isFunc(serviceStrategy.exec), "Service strategy exec function is required");
      return {
        discoveryServices: services,
        serviceStrategy: serviceStrategy
      };
    };

    var ServiceRegistry = function ServiceRegistry() {
      var services = new Set();
      var strategies = new Map(Object.entries(CORE_STRATEGIES));

      var add = function add(servicePlugin) {
        invariant$1(supportedServicePlugins.includes(servicePlugin.type), "Service Plugin type ".concat(servicePlugin.type, " is not supported"));

        if (servicePlugin.type === "discovery-service") {
          var _validateDiscoveryPlu = validateDiscoveryPlugin(servicePlugin),
              discoveryServices = _validateDiscoveryPlu.discoveryServices,
              serviceStrategy = _validateDiscoveryPlu.serviceStrategy;

          setServices(discoveryServices);

          if (!strategies.has(serviceStrategy.method)) {
            strategies.set(serviceStrategy.method, serviceStrategy.exec);
          } else {
            log$2({
              title: "Add Service Plugin",
              message: "Service strategy for ".concat(serviceStrategy.method, " already exists"),
              level: LEVELS$2.warn
            });
          }
        }
      };

      var setServices = function setServices(discoveryServices) {
        return services = new Set(_toConsumableArray(discoveryServices));
      };

      var getServices = function getServices() {
        return _toConsumableArray(services);
      };

      var getStrategy = function getStrategy(method) {
        return strategies.get(method);
      };

      var getStrategies = function getStrategies() {
        return _toConsumableArray(strategies.keys());
      };

      return Object.freeze({
        add: add,
        getServices: getServices,
        getStrategy: getStrategy,
        getStrategies: getStrategies
      });
    };

    var validatePlugins = function validatePlugins(plugins) {
      var pluginsArray;
      invariant$1(plugins, "No plugins supplied");

      if (!Array.isArray(plugins)) {
        pluginsArray = [plugins];
      } else {
        pluginsArray = _toConsumableArray(plugins);
      }

      var _iterator2 = _createForOfIteratorHelper(pluginsArray),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var p = _step2.value;
          invariant$1(isRequired(p.name), "Plugin name is required");
          invariant$1(isRequired(p.f_type), "Plugin f_type is required");
          invariant$1(supportedPlugins.includes(p.f_type), "Plugin type ".concat(p.f_type, " is not supported"));
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }

      return pluginsArray;
    };

    var PluginRegistry = function PluginRegistry() {
      var pluginsMap = new Map();

      var getPlugins = function getPlugins() {
        return pluginsMap;
      };

      var add = function add(plugins) {
        var pluginsArray = validatePlugins(plugins);

        var _iterator3 = _createForOfIteratorHelper(pluginsArray),
            _step3;

        try {
          for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
            var p = _step3.value;
            pluginsMap.set(p.name, p);

            if (p.f_type === "ServicePlugin") {
              serviceRegistry.add(p);
            }
          }
        } catch (err) {
          _iterator3.e(err);
        } finally {
          _iterator3.f();
        }
      };

      return Object.freeze({
        add: add,
        getPlugins: getPlugins
      });
    };

    var serviceRegistry = ServiceRegistry();
    PluginRegistry();

    var execStrategy = /*#__PURE__*/function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(_ref) {
        var service, body, config, opts, strategy;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                service = _ref.service, body = _ref.body, config = _ref.config, opts = _ref.opts;
                strategy = serviceRegistry.getStrategy(service.method);
                return _context.abrupt("return", strategy({
                  service: service,
                  body: body,
                  config: config,
                  opts: opts
                }));

              case 3:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      return function execStrategy(_x) {
        return _ref2.apply(this, arguments);
      };
    }();

    function execService(_x2) {
      return _execService.apply(this, arguments);
    }

    function _execService() {
      _execService = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2(_ref3) {
        var _window$location$host, _window, _window$location;

        var service, _ref3$msg, msg, _ref3$config, config, _ref3$opts, opts, execConfig, res;

        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                service = _ref3.service, _ref3$msg = _ref3.msg, msg = _ref3$msg === void 0 ? {} : _ref3$msg, _ref3$config = _ref3.config, config = _ref3$config === void 0 ? {} : _ref3$config, _ref3$opts = _ref3.opts, opts = _ref3$opts === void 0 ? {} : _ref3$opts;
                msg.data = service.data;
                _context2.next = 4;
                return configLens(/^service\./);

              case 4:
                _context2.t0 = _context2.sent;
                _context2.next = 7;
                return configLens(/^app\.detail\./);

              case 7:
                _context2.t1 = _context2.sent;
                _context2.t2 = _objectSpread2(_objectSpread2({}, config.client), {}, {
                  fclVersion: VERSION,
                  fclLibrary: "https://github.com/onflow/fcl-js",
                  hostname: (_window$location$host = (_window = window) === null || _window === void 0 ? void 0 : (_window$location = _window.location) === null || _window$location === void 0 ? void 0 : _window$location.hostname) !== null && _window$location$host !== void 0 ? _window$location$host : null
                });
                execConfig = {
                  services: _context2.t0,
                  app: _context2.t1,
                  client: _context2.t2
                };
                _context2.prev = 10;
                _context2.next = 13;
                return execStrategy({
                  service: service,
                  body: msg,
                  config: execConfig,
                  opts: opts
                });

              case 13:
                res = _context2.sent;

                if (!(res.status === "REDIRECT")) {
                  _context2.next = 21;
                  break;
                }

                invariant$1(service.type === res.data.type, "Cannot shift recursive service type in execService");
                _context2.next = 18;
                return execService({
                  service: res.data,
                  msg: msg,
                  config: execConfig,
                  opts: opts
                });

              case 18:
                return _context2.abrupt("return", _context2.sent);

              case 21:
                return _context2.abrupt("return", res);

              case 22:
                _context2.next = 28;
                break;

              case 24:
                _context2.prev = 24;
                _context2.t3 = _context2["catch"](10);
                log$2({
                  title: "Error on execService ".concat(service === null || service === void 0 ? void 0 : service.type),
                  message: _context2.t3,
                  level: LEVELS$2.error
                });
                throw _context2.t3;

              case 28:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, null, [[10, 24]]);
      }));
      return _execService.apply(this, arguments);
    }

    //    "f_type": "CompositeSignature",
    //    "f_vsn": "1.0.0",
    //    "addr": "_____",         // sans-prefix
    //    "signature": "adfe1234", // hex
    //    "keyId": 3,
    // }

    function normalizeCompositeSignature(resp) {
      if (resp == null) return null;

      switch (resp["f_vsn"]) {
        case "1.0.0":
          return resp;

        default:
          return _objectSpread2(_objectSpread2({}, COMPOSITE_SIGNATURE_PRAGMA), {}, {
            addr: sansPrefix(resp.addr || resp.address),
            signature: resp.signature || resp.sig,
            keyId: resp.keyId
          });
      }
    }

    var makeDiscoveryServices = /*#__PURE__*/function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee() {
        var _window;

        var extensionServices;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                extensionServices = ((_window = window) === null || _window === void 0 ? void 0 : _window.fcl_extensions) || [];
                return _context.abrupt("return", [].concat(_toConsumableArray(extensionServices), _toConsumableArray(serviceRegistry.getServices())));

              case 2:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      return function makeDiscoveryServices() {
        return _ref.apply(this, arguments);
      };
    }();
    function getDiscoveryService(_x) {
      return _getDiscoveryService.apply(this, arguments);
    }

    function _getDiscoveryService() {
      _getDiscoveryService = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2(service) {
        var _service$endpoint;

        var discoveryAuthnInclude, discoveryWalletMethod, method, endpoint;
        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return config$2.get("discovery.authn.include", []);

              case 2:
                discoveryAuthnInclude = _context2.sent;
                _context2.next = 5;
                return config$2.first(["discovery.wallet.method", "discovery.wallet.method.default"]);

              case 5:
                discoveryWalletMethod = _context2.sent;
                method = service !== null && service !== void 0 && service.method ? service.method : discoveryWalletMethod;

                if (!((_service$endpoint = service === null || service === void 0 ? void 0 : service.endpoint) !== null && _service$endpoint !== void 0)) {
                  _context2.next = 11;
                  break;
                }

                _context2.t0 = _service$endpoint;
                _context2.next = 14;
                break;

              case 11:
                _context2.next = 13;
                return config$2.first(["discovery.wallet", "challenge.handshake"]);

              case 13:
                _context2.t0 = _context2.sent;

              case 14:
                endpoint = _context2.t0;
                invariant$1(endpoint, "\n    If no service is passed to \"authenticate,\" then \"discovery.wallet\" must be defined in fcl config.\n    See: \"https://docs.onflow.org/fcl/reference/api/#setting-configuration-values\"\n    ");
                return _context2.abrupt("return", _objectSpread2(_objectSpread2({}, service), {}, {
                  type: "authn",
                  endpoint: endpoint,
                  method: method,
                  discoveryAuthnInclude: discoveryAuthnInclude
                }));

              case 17:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));
      return _getDiscoveryService.apply(this, arguments);
    }

    function getServices(_x) {
      return _getServices.apply(this, arguments);
    }

    function _getServices() {
      _getServices = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(_ref) {
        var _window, _window$navigator;

        var types, endpoint, include, url;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                types = _ref.types;
                _context.next = 3;
                return config$2.get("discovery.authn.endpoint");

              case 3:
                endpoint = _context.sent;
                invariant$1(Boolean(endpoint), "\"discovery.authn.endpoint\" in config must be defined.");
                _context.next = 7;
                return config$2.get("discovery.authn.include", []);

              case 7:
                include = _context.sent;
                url = new URL(endpoint);
                _context.t0 = fetch;
                _context.t1 = url;
                _context.t2 = {
                  "Content-Type": "application/json"
                };
                _context.t3 = JSON;
                _context.t4 = types;
                _context.t5 = VERSION;
                _context.t6 = include;
                _context.next = 18;
                return makeDiscoveryServices();

              case 18:
                _context.t7 = _context.sent;
                _context.t8 = serviceRegistry.getStrategies();
                _context.t9 = (_window = window) === null || _window === void 0 ? void 0 : (_window$navigator = _window.navigator) === null || _window$navigator === void 0 ? void 0 : _window$navigator.userAgent;
                _context.t10 = {
                  type: _context.t4,
                  fclVersion: _context.t5,
                  include: _context.t6,
                  clientServices: _context.t7,
                  supportedStrategies: _context.t8,
                  userAgent: _context.t9
                };
                _context.t11 = _context.t3.stringify.call(_context.t3, _context.t10);
                _context.t12 = {
                  method: "POST",
                  headers: _context.t2,
                  body: _context.t11
                };
                return _context.abrupt("return", (0, _context.t0)(_context.t1, _context.t12).then(function (d) {
                  return d.json();
                }));

              case 25:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _getServices.apply(this, arguments);
    }

    var _HANDLERS$3;
    var SERVICE_ACTOR_KEYS = {
      AUTHN: "authn",
      RESULTS: "results",
      SNAPSHOT: "SNAPSHOT",
      UPDATED: "UPDATED",
      UPDATE_RESULTS: "UPDATE_RESULTS"
    };

    var warn = function warn(fact, msg) {
      if (fact) {
        console.warn("\n      %cFCL Warning\n      ============================\n      ".concat(msg, "\n      For more info, please see the docs: https://docs.onflow.org/fcl/\n      ============================\n      "), "font-weight:bold;font-family:monospace;");
      }
    };

    var fetchServicesFromDiscovery = /*#__PURE__*/function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee() {
        var services;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.prev = 0;
                _context.next = 3;
                return getServices({
                  types: [SERVICE_ACTOR_KEYS.AUTHN]
                });

              case 3:
                services = _context.sent;
                _send$2(SERVICE_ACTOR_KEYS.AUTHN, SERVICE_ACTOR_KEYS.UPDATE_RESULTS, {
                  results: services
                });
                _context.next = 10;
                break;

              case 7:
                _context.prev = 7;
                _context.t0 = _context["catch"](0);
                log$2({
                  title: "".concat(_context.t0.name, " Error fetching Discovery API services."),
                  message: _context.t0.message,
                  level: LEVELS$2.error
                });

              case 10:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, null, [[0, 7]]);
      }));

      return function fetchServicesFromDiscovery() {
        return _ref.apply(this, arguments);
      };
    }();

    (_HANDLERS$3 = {}, _defineProperty(_HANDLERS$3, INIT$2, function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee3(ctx) {
        return regenerator.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                warn(typeof window === "undefined", '"fcl.discovery" is only available in the browser.'); // If you call this before the window is loaded extensions will not be set yet

                if (document.readyState === 'complete') {
                  fetchServicesFromDiscovery();
                } else {
                  window.onload = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2() {
                    return regenerator.wrap(function _callee2$(_context2) {
                      while (1) {
                        switch (_context2.prev = _context2.next) {
                          case 0:
                            fetchServicesFromDiscovery();

                          case 1:
                          case "end":
                            return _context2.stop();
                        }
                      }
                    }, _callee2);
                  }));
                }

              case 2:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3);
      }));

      return function (_x) {
        return _ref2.apply(this, arguments);
      };
    }()), _defineProperty(_HANDLERS$3, SERVICE_ACTOR_KEYS.UPDATE_RESULTS, function (ctx, _letter, data) {
      ctx.merge(data);
      ctx.broadcast(SERVICE_ACTOR_KEYS.UPDATED, _objectSpread2({}, ctx.all()));
    }), _defineProperty(_HANDLERS$3, SUBSCRIBE$2, function (ctx, letter) {
      ctx.subscribe(letter.from);
      ctx.send(letter.from, SERVICE_ACTOR_KEYS.UPDATED, _objectSpread2({}, ctx.all()));
    }), _defineProperty(_HANDLERS$3, UNSUBSCRIBE$2, function (ctx, letter) {
      return ctx.unsubscribe(letter.from);
    }), _defineProperty(_HANDLERS$3, SERVICE_ACTOR_KEYS.SNAPSHOT, function () {
      var _ref4 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee4(ctx, letter) {
        return regenerator.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                return _context4.abrupt("return", letter.reply(_objectSpread2({}, ctx.all())));

              case 1:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4);
      }));

      return function (_x2, _x3) {
        return _ref4.apply(this, arguments);
      };
    }()), _HANDLERS$3);

    function isAndroid() {
      return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
    }
    function isSmallIOS() {
      return typeof navigator !== "undefined" && /iPhone|iPod/.test(navigator.userAgent);
    }
    function isLargeIOS() {
      return typeof navigator !== "undefined" && /iPad/.test(navigator.userAgent);
    }
    function isIOS() {
      return isSmallIOS() || isLargeIOS();
    }
    function isMobile() {
      return isAndroid() || isIOS();
    }

    var _HANDLERS$2;
    var isFn = function isFn(d) {
      return typeof d === "function";
    };
    var NAME = "CURRENT_USER";
    var UPDATED$1 = "CURRENT_USER/UPDATED";
    var SNAPSHOT = "SNAPSHOT";
    var SET_CURRENT_USER = "SET_CURRENT_USER";
    var DEL_CURRENT_USER = "DEL_CURRENT_USER";
    var DATA = "{\n  \"f_type\": \"User\",\n  \"f_vsn\": \"1.0.0\",\n  \"addr\":null,\n  \"cid\":null,\n  \"loggedIn\":null,\n  \"expiresAt\":null,\n  \"services\":[]\n}";

    var getStoredUser = /*#__PURE__*/function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(storage) {
        var fallback, stored;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                fallback = JSON.parse(DATA);
                _context.next = 3;
                return storage.get(NAME);

              case 3:
                stored = _context.sent;

                if (!(stored != null && fallback["f_vsn"] !== stored["f_vsn"])) {
                  _context.next = 7;
                  break;
                }

                storage.removeItem(NAME);
                return _context.abrupt("return", fallback);

              case 7:
                return _context.abrupt("return", stored || fallback);

              case 8:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      return function getStoredUser(_x) {
        return _ref.apply(this, arguments);
      };
    }();

    var HANDLERS$2 = (_HANDLERS$2 = {}, _defineProperty(_HANDLERS$2, INIT$2, function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2(ctx) {
        var storage, user;
        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (typeof window === "undefined") {
                  console.warn("\n        %cFCL Warning\n        ============================\n        \"currentUser\" is only available in the browser.\n        For more info, please see the docs: https://docs.onflow.org/fcl/\n        ============================\n        ", "font-weight:bold;font-family:monospace;");
                }

                ctx.merge(JSON.parse(DATA));
                _context2.next = 4;
                return config$2.first(["fcl.storage", "fcl.storage.default"]);

              case 4:
                storage = _context2.sent;

                if (!storage.can) {
                  _context2.next = 10;
                  break;
                }

                _context2.next = 8;
                return getStoredUser(storage);

              case 8:
                user = _context2.sent;
                if (notExpired(user)) ctx.merge(user);

              case 10:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));

      return function (_x2) {
        return _ref2.apply(this, arguments);
      };
    }()), _defineProperty(_HANDLERS$2, SUBSCRIBE$2, function (ctx, letter) {
      ctx.subscribe(letter.from);
      ctx.send(letter.from, UPDATED$1, _objectSpread2({}, ctx.all()));
    }), _defineProperty(_HANDLERS$2, UNSUBSCRIBE$2, function (ctx, letter) {
      ctx.unsubscribe(letter.from);
    }), _defineProperty(_HANDLERS$2, SNAPSHOT, function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee3(ctx, letter) {
        return regenerator.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                letter.reply(_objectSpread2({}, ctx.all()));

              case 1:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3);
      }));

      return function (_x3, _x4) {
        return _ref3.apply(this, arguments);
      };
    }()), _defineProperty(_HANDLERS$2, SET_CURRENT_USER, function () {
      var _ref4 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee4(ctx, letter, data) {
        var storage;
        return regenerator.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                ctx.merge(data);
                _context4.next = 3;
                return config$2.first(["fcl.storage", "fcl.storage.default"]);

              case 3:
                storage = _context4.sent;
                if (storage.can) storage.put(NAME, ctx.all());
                ctx.broadcast(UPDATED$1, _objectSpread2({}, ctx.all()));

              case 6:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4);
      }));

      return function (_x5, _x6, _x7) {
        return _ref4.apply(this, arguments);
      };
    }()), _defineProperty(_HANDLERS$2, DEL_CURRENT_USER, function () {
      var _ref5 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee5(ctx, letter) {
        var storage;
        return regenerator.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                ctx.merge(JSON.parse(DATA));
                _context5.next = 3;
                return config$2.first(["fcl.storage", "fcl.storage.default"]);

              case 3:
                storage = _context5.sent;
                if (storage.can) storage.put(NAME, ctx.all());
                ctx.broadcast(UPDATED$1, _objectSpread2({}, ctx.all()));

              case 6:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5);
      }));

      return function (_x8, _x9) {
        return _ref5.apply(this, arguments);
      };
    }()), _HANDLERS$2);

    var spawnCurrentUser = function spawnCurrentUser() {
      return spawn$2(HANDLERS$2, NAME);
    };

    function notExpired(user) {
      return user.expiresAt == null || user.expiresAt === 0 || user.expiresAt > Date.now();
    }

    function getAccountProofData() {
      return _getAccountProofData.apply(this, arguments);
    }

    function _getAccountProofData() {
      _getAccountProofData = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee8() {
        var accountProofDataResolver, accountProofData;
        return regenerator.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                _context8.next = 2;
                return config$2.get("fcl.accountProof.resolver");

              case 2:
                accountProofDataResolver = _context8.sent;

                if (isFn(accountProofDataResolver)) {
                  _context8.next = 5;
                  break;
                }

                return _context8.abrupt("return");

              case 5:
                _context8.next = 7;
                return accountProofDataResolver();

              case 7:
                accountProofData = _context8.sent;

                if (!(accountProofData == null)) {
                  _context8.next = 10;
                  break;
                }

                return _context8.abrupt("return");

              case 10:
                invariant$1(typeof accountProofData.appIdentifier === "string", "appIdentifier must be a string");
                invariant$1(/^[0-9a-f]+$/i.test(accountProofData.nonce), "Nonce must be a hex string");
                return _context8.abrupt("return", accountProofData);

              case 13:
              case "end":
                return _context8.stop();
            }
          }
        }, _callee8);
      }));
      return _getAccountProofData.apply(this, arguments);
    }

    var makeConfig = /*#__PURE__*/function () {
      var _ref7 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee6(_ref6) {
        var discoveryAuthnInclude;
        return regenerator.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                discoveryAuthnInclude = _ref6.discoveryAuthnInclude;
                _context6.t0 = discoveryAuthnInclude;
                _context6.next = 4;
                return makeDiscoveryServices();

              case 4:
                _context6.t1 = _context6.sent;
                _context6.t2 = serviceRegistry.getStrategies();
                _context6.t3 = {
                  discoveryAuthnInclude: _context6.t0,
                  clientServices: _context6.t1,
                  supportedStrategies: _context6.t2
                };
                return _context6.abrupt("return", {
                  client: _context6.t3
                });

              case 8:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6);
      }));

      return function makeConfig(_x10) {
        return _ref7.apply(this, arguments);
      };
    }();

    function authenticate$1() {
      return _authenticate.apply(this, arguments);
    }

    function _authenticate() {
      _authenticate = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee10() {
        var _service$provider, _service$provider2;

        var _ref11,
            service,
            _ref11$redir,
            redir,
            _service$provider3,
            _args10 = arguments;

        return regenerator.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                _ref11 = _args10.length > 0 && _args10[0] !== undefined ? _args10[0] : {}, service = _ref11.service, _ref11$redir = _ref11.redir, redir = _ref11$redir === void 0 ? false : _ref11$redir;

                if (!(service && !(service !== null && service !== void 0 && (_service$provider = service.provider) !== null && _service$provider !== void 0 && _service$provider.is_installed) && service !== null && service !== void 0 && (_service$provider2 = service.provider) !== null && _service$provider2 !== void 0 && _service$provider2.requires_install)) {
                  _context10.next = 4;
                  break;
                }

                window.location.href = service === null || service === void 0 ? void 0 : (_service$provider3 = service.provider) === null || _service$provider3 === void 0 ? void 0 : _service$provider3.install_link;
                return _context10.abrupt("return");

              case 4:
                return _context10.abrupt("return", new Promise( /*#__PURE__*/function () {
                  var _ref12 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee9(resolve, reject) {
                    var opts, user, discoveryService, refreshService, accountProofData, response, _response;

                    return regenerator.wrap(function _callee9$(_context9) {
                      while (1) {
                        switch (_context9.prev = _context9.next) {
                          case 0:
                            spawnCurrentUser();
                            opts = {
                              redir: redir
                            };
                            _context9.next = 4;
                            return snapshot();

                          case 4:
                            user = _context9.sent;
                            _context9.next = 7;
                            return getDiscoveryService(service);

                          case 7:
                            discoveryService = _context9.sent;
                            refreshService = serviceOfType(user.services, "authn-refresh");
                            _context9.prev = 9;
                            _context9.next = 12;
                            return getAccountProofData();

                          case 12:
                            accountProofData = _context9.sent;
                            _context9.next = 19;
                            break;

                          case 15:
                            _context9.prev = 15;
                            _context9.t0 = _context9["catch"](9);
                            console.error("Error During Authentication: Could not resolve account proof data.\n        ".concat(_context9.t0));
                            return _context9.abrupt("return", reject(_context9.t0));

                          case 19:
                            if (!user.loggedIn) {
                              _context9.next = 47;
                              break;
                            }

                            if (!refreshService) {
                              _context9.next = 46;
                              break;
                            }

                            _context9.prev = 21;
                            _context9.next = 24;
                            return execService({
                              service: refreshService,
                              msg: accountProofData,
                              opts: opts
                            });

                          case 24:
                            response = _context9.sent;
                            _context9.t1 = _send$2;
                            _context9.t2 = NAME;
                            _context9.t3 = SET_CURRENT_USER;
                            _context9.next = 30;
                            return buildUser(response);

                          case 30:
                            _context9.t4 = _context9.sent;
                            (0, _context9.t1)(_context9.t2, _context9.t3, _context9.t4);
                            _context9.next = 37;
                            break;

                          case 34:
                            _context9.prev = 34;
                            _context9.t5 = _context9["catch"](21);
                            console.error("Error: Could not refresh authentication.", _context9.t5);

                          case 37:
                            _context9.prev = 37;
                            _context9.t6 = resolve;
                            _context9.next = 41;
                            return snapshot();

                          case 41:
                            _context9.t7 = _context9.sent;
                            return _context9.abrupt("return", (0, _context9.t6)(_context9.t7));

                          case 44:
                            _context9.next = 47;
                            break;

                          case 46:
                            return _context9.abrupt("return", resolve(user));

                          case 47:
                            _context9.prev = 47;
                            _context9.t8 = execService;
                            _context9.t9 = discoveryService;
                            _context9.t10 = accountProofData;
                            _context9.next = 53;
                            return makeConfig(discoveryService);

                          case 53:
                            _context9.t11 = _context9.sent;
                            _context9.t12 = opts;
                            _context9.t13 = {
                              service: _context9.t9,
                              msg: _context9.t10,
                              config: _context9.t11,
                              opts: _context9.t12
                            };
                            _context9.next = 58;
                            return (0, _context9.t8)(_context9.t13);

                          case 58:
                            _response = _context9.sent;
                            _context9.t14 = _send$2;
                            _context9.t15 = NAME;
                            _context9.t16 = SET_CURRENT_USER;
                            _context9.next = 64;
                            return buildUser(_response);

                          case 64:
                            _context9.t17 = _context9.sent;
                            (0, _context9.t14)(_context9.t15, _context9.t16, _context9.t17);
                            _context9.next = 71;
                            break;

                          case 68:
                            _context9.prev = 68;
                            _context9.t18 = _context9["catch"](47);
                            console.error("Error while authenticating", _context9.t18);

                          case 71:
                            _context9.prev = 71;
                            _context9.t19 = resolve;
                            _context9.next = 75;
                            return snapshot();

                          case 75:
                            _context9.t20 = _context9.sent;
                            (0, _context9.t19)(_context9.t20);
                            return _context9.finish(71);

                          case 78:
                          case "end":
                            return _context9.stop();
                        }
                      }
                    }, _callee9, null, [[9, 15], [21, 34, 37, 44], [47, 68, 71, 78]]);
                  }));

                  return function (_x14, _x15) {
                    return _ref12.apply(this, arguments);
                  };
                }()));

              case 5:
              case "end":
                return _context10.stop();
            }
          }
        }, _callee10);
      }));
      return _authenticate.apply(this, arguments);
    }

    function unauthenticate$1() {
      spawnCurrentUser();
      _send$2(NAME, DEL_CURRENT_USER);
    }

    var normalizePreAuthzResponse = function normalizePreAuthzResponse(authz) {
      return {
        f_type: "PreAuthzResponse",
        f_vsn: "1.0.0",
        proposer: (authz || {}).proposer,
        payer: (authz || {}).payer || [],
        authorization: (authz || {}).authorization || []
      };
    };

    function resolvePreAuthz(authz) {
      var resp = normalizePreAuthzResponse(authz);
      var axs = [];
      if (resp.proposer != null) axs.push(["PROPOSER", resp.proposer]);

      var _iterator = _createForOfIteratorHelper(resp.payer || []),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var az = _step.value;
          axs.push(["PAYER", az]);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      var _iterator2 = _createForOfIteratorHelper(resp.authorization || []),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var _az = _step2.value;
          axs.push(["AUTHORIZER", _az]);
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }

      var result = axs.map(function (_ref8) {
        var _ref9 = _slicedToArray(_ref8, 2),
            role = _ref9[0],
            az = _ref9[1];

        return {
          tempId: [az.identity.address, az.identity.keyId].join("|"),
          addr: az.identity.address,
          keyId: az.identity.keyId,
          signingFunction: function signingFunction(signable) {
            return execService({
              service: az,
              msg: signable
            });
          },
          role: {
            proposer: role === "PROPOSER",
            payer: role === "PAYER",
            authorizer: role === "AUTHORIZER"
          }
        };
      });
      return result;
    }

    function authorization(_x11) {
      return _authorization.apply(this, arguments);
    }

    function _authorization() {
      _authorization = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee13(account) {
        return regenerator.wrap(function _callee13$(_context13) {
          while (1) {
            switch (_context13.prev = _context13.next) {
              case 0:
                spawnCurrentUser();
                return _context13.abrupt("return", _objectSpread2(_objectSpread2({}, account), {}, {
                  tempId: "CURRENT_USER",
                  resolve: function resolve(account, preSignable) {
                    return _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee12() {
                      var user, authz, preAuthz, windowRef;
                      return regenerator.wrap(function _callee12$(_context12) {
                        while (1) {
                          switch (_context12.prev = _context12.next) {
                            case 0:
                              _context12.next = 2;
                              return authenticate$1({
                                redir: true
                              });

                            case 2:
                              user = _context12.sent;
                              authz = serviceOfType(user.services, "authz");
                              preAuthz = serviceOfType(user.services, "pre-authz");

                              if (!preAuthz) {
                                _context12.next = 11;
                                break;
                              }

                              _context12.t0 = resolvePreAuthz;
                              _context12.next = 9;
                              return execService({
                                service: preAuthz,
                                msg: preSignable
                              });

                            case 9:
                              _context12.t1 = _context12.sent;
                              return _context12.abrupt("return", (0, _context12.t0)(_context12.t1));

                            case 11:
                              if (!authz) {
                                _context12.next = 14;
                                break;
                              }

                              if (isMobile() && authz.method === "WC/RPC") {
                                windowRef = window.open("", "_blank");
                              }

                              return _context12.abrupt("return", _objectSpread2(_objectSpread2({}, account), {}, {
                                tempId: "CURRENT_USER",
                                resolve: null,
                                addr: sansPrefix(authz.identity.address),
                                keyId: authz.identity.keyId,
                                sequenceNum: null,
                                signature: null,
                                signingFunction: function signingFunction(signable) {
                                  return _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee11() {
                                    return regenerator.wrap(function _callee11$(_context11) {
                                      while (1) {
                                        switch (_context11.prev = _context11.next) {
                                          case 0:
                                            _context11.t0 = normalizeCompositeSignature;
                                            _context11.next = 3;
                                            return execService({
                                              service: authz,
                                              msg: signable,
                                              opts: {
                                                includeOlderJsonRpcCall: true,
                                                windowRef: windowRef
                                              }
                                            });

                                          case 3:
                                            _context11.t1 = _context11.sent;
                                            return _context11.abrupt("return", (0, _context11.t0)(_context11.t1));

                                          case 5:
                                          case "end":
                                            return _context11.stop();
                                        }
                                      }
                                    }, _callee11);
                                  }))();
                                }
                              }));

                            case 14:
                              throw new Error("No Authz or PreAuthz Service configured for CURRENT_USER");

                            case 15:
                            case "end":
                              return _context12.stop();
                          }
                        }
                      }, _callee12);
                    }))();
                  }
                }));

              case 2:
              case "end":
                return _context13.stop();
            }
          }
        }, _callee13);
      }));
      return _authorization.apply(this, arguments);
    }

    function subscribe(callback) {
      spawnCurrentUser();
      var EXIT = "@EXIT";
      var self = spawn$2( /*#__PURE__*/function () {
        var _ref10 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee7(ctx) {
          var letter;
          return regenerator.wrap(function _callee7$(_context7) {
            while (1) {
              switch (_context7.prev = _context7.next) {
                case 0:
                  ctx.send(NAME, SUBSCRIBE$2);

                case 1:

                  _context7.next = 4;
                  return ctx.receive();

                case 4:
                  letter = _context7.sent;

                  if (!(letter.tag === EXIT)) {
                    _context7.next = 8;
                    break;
                  }

                  ctx.send(NAME, UNSUBSCRIBE$2);
                  return _context7.abrupt("return");

                case 8:
                  callback(letter.data);
                  _context7.next = 1;
                  break;

                case 11:
                case "end":
                  return _context7.stop();
              }
            }
          }, _callee7);
        }));

        return function (_x12) {
          return _ref10.apply(this, arguments);
        };
      }());
      return function () {
        return _send$2(self, EXIT);
      };
    }

    function snapshot() {
      spawnCurrentUser();
      return _send$2(NAME, SNAPSHOT, null, {
        expectReply: true,
        timeout: 0
      });
    }

    function resolveArgument() {
      return _resolveArgument.apply(this, arguments);
    }

    function _resolveArgument() {
      _resolveArgument = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee15() {
        var _yield$authenticate, addr;

        return regenerator.wrap(function _callee15$(_context15) {
          while (1) {
            switch (_context15.prev = _context15.next) {
              case 0:
                _context15.next = 2;
                return authenticate$1();

              case 2:
                _yield$authenticate = _context15.sent;
                addr = _yield$authenticate.addr;
                return _context15.abrupt("return", arg(withPrefix$1(addr), Address));

              case 5:
              case "end":
                return _context15.stop();
            }
          }
        }, _callee15);
      }));
      return _resolveArgument.apply(this, arguments);
    }

    var makeSignable = function makeSignable(msg) {
      invariant$1(/^[0-9a-f]+$/i.test(msg), "Message must be a hex string");
      return {
        message: msg
      };
    };

    function signUserMessage(_x13) {
      return _signUserMessage.apply(this, arguments);
    }

    function _signUserMessage() {
      _signUserMessage = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee16(msg) {
        var user, signingService, response;
        return regenerator.wrap(function _callee16$(_context16) {
          while (1) {
            switch (_context16.prev = _context16.next) {
              case 0:
                spawnCurrentUser();
                _context16.next = 3;
                return authenticate$1({
                  redir: true
                });

              case 3:
                user = _context16.sent;
                signingService = serviceOfType(user.services, "user-signature");
                invariant$1(signingService, "Current user must have authorized a signing service.");
                _context16.prev = 6;
                _context16.next = 9;
                return execService({
                  service: signingService,
                  msg: makeSignable(msg)
                });

              case 9:
                response = _context16.sent;

                if (!Array.isArray(response)) {
                  _context16.next = 14;
                  break;
                }

                return _context16.abrupt("return", response.map(function (compSigs) {
                  return normalizeCompositeSignature(compSigs);
                }));

              case 14:
                return _context16.abrupt("return", [normalizeCompositeSignature(response)]);

              case 15:
                _context16.next = 20;
                break;

              case 17:
                _context16.prev = 17;
                _context16.t0 = _context16["catch"](6);
                return _context16.abrupt("return", _context16.t0);

              case 20:
              case "end":
                return _context16.stop();
            }
          }
        }, _callee16, null, [[6, 17]]);
      }));
      return _signUserMessage.apply(this, arguments);
    }

    var currentUser = function currentUser() {
      return {
        authenticate: authenticate$1,
        unauthenticate: unauthenticate$1,
        authorization: authorization,
        signUserMessage: signUserMessage,
        subscribe: subscribe,
        snapshot: snapshot,
        resolveArgument: resolveArgument
      };
    };

    currentUser.authenticate = authenticate$1;
    currentUser.unauthenticate = unauthenticate$1;
    currentUser.authorization = authorization;
    currentUser.signUserMessage = signUserMessage;
    currentUser.subscribe = subscribe;
    currentUser.snapshot = snapshot;
    currentUser.resolveArgument = resolveArgument;

    /** As the current user Mutate the Flow Blockchain
     *
     *  @arg {Object} opts - Mutation Options and configuration
     *  @arg {string} opts.cadence - Cadence Transaction used to mutate Flow
     *  @arg {ArgsFn} opts.args - Arguments passed to cadence transaction
     *  @arg {Object} opts.template - Interaction Template for a transaction
     *  @arg {number} opts.limit - Compute Limit for transaction
     *  @returns {string} Transaction Id
     *
     *  Where:
     *    @callback ArgsFn
     *    @arg {ArgFn}  arg - Argument function to define a single argument
     *    @arg {Object} t   - Cadence Types object used to define the type
     *    @returns {args[]}
     *
     *    @callback ArgFn
     *    @arg {Any}  value - the value of the argument
     *    @arg {Type} type  - the cadence type of the value
     *    @returns {arg}
     *
     *  Example:
     *    fcl.mutate({
     *      cadence: `
     *        transaction(a: Int, b: Int, c: Address) {
     *          prepare(acct: AuthAccount) {
     *            log(acct)
     *            log(a)
     *            log(b)
     *            log(c)
     *          }
     *        }
     *      `,
     *      args: (arg, t) => [
     *        arg(6, t.Int),
     *        arg(7, t.Int),
     *        arg("0xba1132bc08f82fe2", t.Address),
     *      ],
     *    })
     *
     *
     *  Options:
     *    type Options = {
     *      template: InteractionTemplate | String // InteractionTemplate or url to one
     *      cadence: String!,
     *      args: (arg, t) => Array<Arg>,
     *      limit: Number,
     *      authz: AuthzFn, // will overload the trinity of signatory roles
     *      proposer: AuthzFn, // will overload the proposer signatory role
     *      payer: AuthzFn, // will overload the payer signatory role
     *      authorizations: [AuthzFn], // an array of authorization functions used as authorizations signatory roles
     *    }
     */

    function mutate() {
      return _mutate.apply(this, arguments);
    }

    function _mutate() {
      _mutate = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2() {
        var opts,
            txid,
            authz,
            _args2 = arguments;
        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                opts = _args2.length > 0 && _args2[0] !== undefined ? _args2[0] : {};
                _context2.prev = 1;
                _context2.next = 4;
                return preMutate(opts);

              case 4:
                _context2.next = 6;
                return prepTemplateOpts(opts);

              case 6:
                opts = _context2.sent;
                _context2.next = 9;
                return config$2().get("fcl.authz", currentUser().authorization);

              case 9:
                authz = _context2.sent;
                txid = config$2().overload(opts.dependencies || {}, /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee() {
                  return regenerator.wrap(function _callee$(_context) {
                    while (1) {
                      switch (_context.prev = _context.next) {
                        case 0:
                          return _context.abrupt("return", // prettier-ignore
                          send([transaction$1(opts.cadence), args(normalizeArgs(opts.args || [])), opts.limit && isNumber(opts.limit) && limit(opts.limit), // opts.proposer > opts.authz > authz
                          proposer(opts.proposer || opts.authz || authz), // opts.payer > opts.authz > authz
                          payer(opts.payer || opts.authz || authz), // opts.authorizations > [opts.authz > authz]
                          authorizations(opts.authorizations || [opts.authz || authz])]).then(decode));

                        case 1:
                        case "end":
                          return _context.stop();
                      }
                    }
                  }, _callee);
                })));
                return _context2.abrupt("return", txid);

              case 14:
                _context2.prev = 14;
                _context2.t0 = _context2["catch"](1);
                throw _context2.t0;

              case 17:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, null, [[1, 14]]);
      }));
      return _mutate.apply(this, arguments);
    }
    var USER_SIGNATURE = "USER_SIGNATURE";
    var validateArgs = function validateArgs(args) {
      if (args.appIdentifier) {
        var appIdentifier = args.appIdentifier,
            address = args.address,
            nonce = args.nonce,
            signatures = args.signatures;
        invariant$1(isString(appIdentifier), "verifyAccountProof({ appIdentifier }) -- appIdentifier must be a string");
        invariant$1(isString(address) && sansPrefix(address).length === 16, "verifyAccountProof({ address }) -- address must be a valid address");
        invariant$1(/^[0-9a-f]+$/i.test(nonce), "nonce must be a hex string");
        invariant$1(Array.isArray(signatures) && signatures.every(function (sig, i, arr) {
          return sig.f_type === "CompositeSignature";
        }), "Must include an Array of CompositeSignatures to verify");
        invariant$1(signatures.map(function (cs) {
          return cs.addr;
        }).every(function (addr, i, arr) {
          return addr === arr[0];
        }), "User signatures to be verified must be from a single account address");
        return true;
      } else {
        var message = args.message,
            _address = args.address,
            compSigs = args.compSigs;
        invariant$1(/^[0-9a-f]+$/i.test(message), "Signed message must be a hex string");
        invariant$1(isString(_address) && sansPrefix(_address).length === 16, "verifyUserSignatures({ address }) -- address must be a valid address");
        invariant$1(Array.isArray(compSigs) && compSigs.every(function (sig, i, arr) {
          return sig.f_type === "CompositeSignature";
        }), "Must include an Array of CompositeSignatures to verify");
        invariant$1(compSigs.map(function (cs) {
          return cs.addr;
        }).every(function (addr, i, arr) {
          return addr === arr[0];
        }), "User signatures to be verified must be from a single account address");
        return true;
      }
    };

    var getVerifySignaturesScript = /*#__PURE__*/function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(sig, opts) {
        var verifyFunction, network, fclCryptoContract;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                verifyFunction = sig === "ACCOUNT_PROOF" ? "verifyAccountProofSignatures" : "verifyUserSignatures";
                _context.next = 3;
                return config$2.get("flow.network");

              case 3:
                network = _context.sent;

                if (network) {
                  _context.next = 9;
                  break;
                }

                _context.next = 7;
                return config$2.get("env");

              case 7:
                network = _context.sent;
                if (network) log$2.deprecate({
                  pkg: "FCL",
                  subject: 'Using the "env" configuration key for specifying the flow network',
                  message: 'Please use "flow.network" instead.',
                  transition: "https://github.com/onflow/flow-js-sdk/blob/master/packages/fcl/TRANSITIONS.md#0001-deprecate-env-config-key"
                });

              case 9:
                invariant$1(opts.fclCryptoContract || network === "testnet" || network === "mainnet", "${verifyFunction}({ fclCryptoContract }) -- config.flow.network must be specified (testnet || mainnet) or contract address provided via opts.fclCryptoContract");

                if (opts.fclCryptoContract) {
                  fclCryptoContract = opts.fclCryptoContract;
                } else {
                  fclCryptoContract = network === "testnet" ? "0x74daa6f9c7ef24b1" : "0xb4b82a1c9d21d284";
                }

                return _context.abrupt("return", "\n      import FCLCrypto from ".concat(fclCryptoContract, "\n\n      pub fun main(\n          address: Address, \n          message: String, \n          keyIndices: [Int], \n          signatures: [String]\n      ): Bool {\n        return FCLCrypto.").concat(verifyFunction, "(address: address, message: message, keyIndices: keyIndices, signatures: signatures)\n      }\n    "));

              case 12:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      return function getVerifySignaturesScript(_x, _x2) {
        return _ref.apply(this, arguments);
      };
    }();

    function verifyUserSignatures$1(_x5, _x6) {
      return _verifyUserSignatures.apply(this, arguments);
    }

    function _verifyUserSignatures() {
      _verifyUserSignatures = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee3(message, compSigs) {
        var opts,
            address,
            signaturesArr,
            keyIndices,
            _iterator2,
            _step2,
            el,
            _args3 = arguments;

        return regenerator.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                opts = _args3.length > 2 && _args3[2] !== undefined ? _args3[2] : {};
                address = withPrefix$1(compSigs[0].addr);
                validateArgs({
                  message: message,
                  address: address,
                  compSigs: compSigs
                });
                signaturesArr = [];
                keyIndices = [];
                _iterator2 = _createForOfIteratorHelper(compSigs);

                try {
                  for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
                    el = _step2.value;
                    signaturesArr.push(el.signature);
                    keyIndices.push(el.keyId.toString());
                  }
                } catch (err) {
                  _iterator2.e(err);
                } finally {
                  _iterator2.f();
                }

                _context3.t0 = query;
                _context3.next = 10;
                return getVerifySignaturesScript(USER_SIGNATURE, opts);

              case 10:
                _context3.t1 = _context3.sent;

                _context3.t2 = function args(arg, t) {
                  return [arg(address, t.Address), arg(message, t.String), arg(keyIndices, t.Array(t.Int)), arg(signaturesArr, t.Array(t.String))];
                };

                _context3.t3 = {
                  cadence: _context3.t1,
                  args: _context3.t2
                };
                return _context3.abrupt("return", (0, _context3.t0)(_context3.t3));

              case 14:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3);
      }));
      return _verifyUserSignatures.apply(this, arguments);
    }

    /**
     * Verify a valid signature/s for an account on Flow.
     *
     * @deprecated since version '1.0.0-alpha.0', use AppUtils.verifyUserSignatures instead
     *
     */

    log$2.deprecate({
      pkg: "FCL",
      subject: "fcl.verifyUserSignatures()",
      message: "Please use fcl.AppUtils.verifyUserSignatures()",
      callback: function verifyUserSignatures(message, compSigs) {
        return verifyUserSignatures$1(message, compSigs);
      }
    });

    var _HANDLERS$1;
    var RATE$1 = 2500;
    var POLL = "POLL";

    var fetchTxStatus = /*#__PURE__*/function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(transactionId) {
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                return _context.abrupt("return", send([getTransactionStatus(transactionId)]).then(decode));

              case 1:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      return function fetchTxStatus(_x) {
        return _ref.apply(this, arguments);
      };
    }();

    var isExpired = function isExpired(tx) {
      return tx.status === 5;
    };

    var isSealed = function isSealed(tx) {
      return tx.status >= 4;
    };

    var isExecuted = function isExecuted(tx) {
      return tx.status >= 3;
    };

    var isFinalized = function isFinalized(tx) {
      return tx.status >= 2;
    };

    var isPending = function isPending(tx) {
      return tx.status >= 1;
    };

    var isUnknown = function isUnknown(tx) {
      return tx.status >= 0;
    };

    var isDiff = function isDiff(cur, next) {
      return JSON.stringify(cur) !== JSON.stringify(next);
    };

    var HANDLERS$1 = (_HANDLERS$1 = {}, _defineProperty(_HANDLERS$1, INIT$2, function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2(ctx) {
        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                ctx.sendSelf(POLL);

              case 1:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));

      return function (_x2) {
        return _ref2.apply(this, arguments);
      };
    }()), _defineProperty(_HANDLERS$1, SUBSCRIBE$2, function (ctx, letter) {
      ctx.subscribe(letter.from);
      ctx.send(letter.from, UPDATED$5, ctx.all());
    }), _defineProperty(_HANDLERS$1, UNSUBSCRIBE$2, function (ctx, letter) {
      ctx.unsubscribe(letter.from);
    }), _defineProperty(_HANDLERS$1, SNAPSHOT$1, function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee3(ctx, letter) {
        return regenerator.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                letter.reply(ctx.all());

              case 1:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3);
      }));

      return function (_x3, _x4) {
        return _ref3.apply(this, arguments);
      };
    }()), _defineProperty(_HANDLERS$1, POLL, function () {
      var _ref4 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee4(ctx) {
        var tx;
        return regenerator.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.prev = 0;
                _context4.next = 3;
                return fetchTxStatus(ctx.self());

              case 3:
                tx = _context4.sent;
                _context4.next = 9;
                break;

              case 6:
                _context4.prev = 6;
                _context4.t0 = _context4["catch"](0);
                return _context4.abrupt("return", ctx.fatalError(_context4.t0));

              case 9:
                if (!isSealed(tx)) setTimeout(function () {
                  return ctx.sendSelf(POLL);
                }, RATE$1);
                if (isDiff(ctx.all(), tx)) ctx.broadcast(UPDATED$5, tx);
                ctx.merge(tx);

              case 12:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, null, [[0, 6]]);
      }));

      return function (_x5) {
        return _ref4.apply(this, arguments);
      };
    }()), _HANDLERS$1);

    var scoped = function scoped(transactionId) {
      if (_typeof(transactionId) === "object") transactionId = transactionId.transactionId;
      if (transactionId == null) throw new Error("transactionId required");
      return transactionId;
    };

    var spawnTransaction = function spawnTransaction(transactionId) {
      return spawn$2(HANDLERS$1, scoped(transactionId));
    };

    function transaction(transactionId) {
      function snapshot() {
        return snapshoter(transactionId, spawnTransaction);
      }

      function subscribe(callback) {
        return subscriber$2(scoped(transactionId), spawnTransaction, callback);
      }

      function once(predicate) {
        return function innerOnce() {
          var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
          var suppress = opts.suppress || false;
          return new Promise(function (resolve, reject) {
            var unsub = subscribe(function (txStatus, error) {
              if ((error || txStatus.statusCode) && !suppress) {
                reject(error || txStatus.errorMessage);
                unsub();
              } else if (predicate(txStatus)) {
                resolve(txStatus);
                unsub();
              }
            });
          });
        };
      }

      return {
        snapshot: snapshot,
        subscribe: subscribe,
        onceFinalized: once(isFinalized),
        onceExecuted: once(isExecuted),
        onceSealed: once(isSealed)
      };
    }
    transaction.isUnknown = isUnknown;
    transaction.isPending = isPending;
    transaction.isFinalized = isFinalized;
    transaction.isExecuted = isExecuted;
    transaction.isSealed = isSealed;
    transaction.isExpired = isExpired;

    var _HANDLERS;
    var RATE = 10000;
    var UPDATED = "UPDATED";
    var TICK = "TICK";
    var HIGH_WATER_MARK = "hwm";

    var scheduleTick = /*#__PURE__*/function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(ctx) {
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.t0 = setTimeout;

                _context.t1 = function () {
                  return ctx.sendSelf(TICK);
                };

                _context.next = 4;
                return config$2().get("fcl.eventPollRate", RATE);

              case 4:
                _context.t2 = _context.sent;
                return _context.abrupt("return", (0, _context.t0)(_context.t1, _context.t2));

              case 6:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      return function scheduleTick(_x) {
        return _ref.apply(this, arguments);
      };
    }();

    (_HANDLERS = {}, _defineProperty(_HANDLERS, TICK, function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2(ctx) {
        var hwm, next, data, _iterator, _step, d;

        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (ctx.hasSubs()) {
                  _context2.next = 2;
                  break;
                }

                return _context2.abrupt("return");

              case 2:
                hwm = ctx.get(HIGH_WATER_MARK);

                if (!(hwm == null)) {
                  _context2.next = 18;
                  break;
                }

                _context2.t0 = ctx;
                _context2.t1 = HIGH_WATER_MARK;
                _context2.next = 8;
                return block();

              case 8:
                _context2.t2 = _context2.sent;

                _context2.t0.put.call(_context2.t0, _context2.t1, _context2.t2);

                _context2.t3 = ctx;
                _context2.t4 = TICK;
                _context2.next = 14;
                return scheduleTick(ctx);

              case 14:
                _context2.t5 = _context2.sent;

                _context2.t3.put.call(_context2.t3, _context2.t4, _context2.t5);

                _context2.next = 34;
                break;

              case 18:
                _context2.next = 20;
                return block();

              case 20:
                next = _context2.sent;
                ctx.put(HIGH_WATER_MARK, next);

                if (!(hwm.height < next.height)) {
                  _context2.next = 28;
                  break;
                }

                _context2.next = 25;
                return send([getEventsAtBlockHeightRange(ctx.self(), hwm.height + 1, next.height)]).then(decode);

              case 25:
                data = _context2.sent;
                _iterator = _createForOfIteratorHelper(data);

                try {
                  for (_iterator.s(); !(_step = _iterator.n()).done;) {
                    d = _step.value;
                    ctx.broadcast(UPDATED, d.data);
                  }
                } catch (err) {
                  _iterator.e(err);
                } finally {
                  _iterator.f();
                }

              case 28:
                _context2.t6 = ctx;
                _context2.t7 = TICK;
                _context2.next = 32;
                return scheduleTick(ctx);

              case 32:
                _context2.t8 = _context2.sent;

                _context2.t6.put.call(_context2.t6, _context2.t7, _context2.t8);

              case 34:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));

      return function (_x2) {
        return _ref2.apply(this, arguments);
      };
    }()), _defineProperty(_HANDLERS, SUBSCRIBE$2, function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee3(ctx, letter) {
        return regenerator.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                if (ctx.hasSubs()) {
                  _context3.next = 7;
                  break;
                }

                _context3.t0 = ctx;
                _context3.t1 = TICK;
                _context3.next = 5;
                return scheduleTick(ctx);

              case 5:
                _context3.t2 = _context3.sent;

                _context3.t0.put.call(_context3.t0, _context3.t1, _context3.t2);

              case 7:
                ctx.subscribe(letter.from);

              case 8:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3);
      }));

      return function (_x3, _x4) {
        return _ref3.apply(this, arguments);
      };
    }()), _defineProperty(_HANDLERS, UNSUBSCRIBE$2, function (ctx, letter) {
      ctx.unsubscribe(letter.from);

      if (!ctx.hasSubs()) {
        clearTimeout(ctx.get(TICK));
        ctx["delete"](TICK);
        ctx["delete"](HIGH_WATER_MARK);
      }
    }), _HANDLERS);

    var sha3 = {};

    var sponge = {};

    var permute = {};

    var chi = {};

    var copy = function copy(I, i) {
      return function (O, o) {
        var oi = o * 2;
        var ii = i * 2;
        O[oi] = I[ii];
        O[oi + 1] = I[ii + 1];
      };
    };

    var copy_1 = copy;

    (function (exports) {

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports["default"] = void 0;

      var _copy = _interopRequireDefault(copy_1);

      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
          "default": obj
        };
      }

      var chi = function chi(_ref) {
        var A = _ref.A,
            C = _ref.C;

        for (var y = 0; y < 25; y += 5) {
          for (var x = 0; x < 5; x++) {
            (0, _copy["default"])(A, y + x)(C, x);
          }

          for (var _x = 0; _x < 5; _x++) {
            var xy = (y + _x) * 2;
            var x1 = (_x + 1) % 5 * 2;
            var x2 = (_x + 2) % 5 * 2;
            A[xy] ^= ~C[x1] & C[x2];
            A[xy + 1] ^= ~C[x1 + 1] & C[x2 + 1];
          }
        }
      };

      var _default = chi;
      exports["default"] = _default;
    })(chi);

    var iota = {};

    var roundConstants = {};

    (function (exports) {

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports["default"] = void 0;
      var ROUND_CONSTANTS = new Uint32Array([0, 1, 0, 32898, 2147483648, 32906, 2147483648, 2147516416, 0, 32907, 0, 2147483649, 2147483648, 2147516545, 2147483648, 32777, 0, 138, 0, 136, 0, 2147516425, 0, 2147483658, 0, 2147516555, 2147483648, 139, 2147483648, 32905, 2147483648, 32771, 2147483648, 32770, 2147483648, 128, 0, 32778, 2147483648, 2147483658, 2147483648, 2147516545, 2147483648, 32896, 0, 2147483649, 2147483648, 2147516424]);
      var _default = ROUND_CONSTANTS;
      exports["default"] = _default;
    })(roundConstants);

    (function (exports) {

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports["default"] = void 0;

      var _roundConstants = _interopRequireDefault(roundConstants);

      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
          "default": obj
        };
      }

      var iota = function iota(_ref) {
        var A = _ref.A,
            roundIndex = _ref.roundIndex;
        var i = roundIndex * 2;
        A[0] ^= _roundConstants["default"][i];
        A[1] ^= _roundConstants["default"][i + 1];
      };

      var _default = iota;
      exports["default"] = _default;
    })(iota);

    var rhoPi = {};

    var piShuffles = {};

    (function (exports) {

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports["default"] = void 0;
      var PI_SHUFFLES = [10, 7, 11, 17, 18, 3, 5, 16, 8, 21, 24, 4, 15, 23, 19, 13, 12, 2, 20, 14, 22, 9, 6, 1];
      var _default = PI_SHUFFLES;
      exports["default"] = _default;
    })(piShuffles);

    var rhoOffsets = {};

    (function (exports) {

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports["default"] = void 0;
      var RHO_OFFSETS = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 2, 14, 27, 41, 56, 8, 25, 43, 62, 18, 39, 61, 20, 44];
      var _default = RHO_OFFSETS;
      exports["default"] = _default;
    })(rhoOffsets);

    (function (exports) {

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports["default"] = void 0;

      var _piShuffles = _interopRequireDefault(piShuffles);

      var _rhoOffsets = _interopRequireDefault(rhoOffsets);

      var _copy = _interopRequireDefault(copy_1);

      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
          "default": obj
        };
      }

      var rhoPi = function rhoPi(_ref) {
        var A = _ref.A,
            C = _ref.C,
            W = _ref.W;
        (0, _copy["default"])(A, 1)(W, 0);
        var H = 0;
        var L = 0;
        var Wi = 0;
        var ri = 32;

        for (var i = 0; i < 24; i++) {
          var j = _piShuffles["default"][i];
          var r = _rhoOffsets["default"][i];
          (0, _copy["default"])(A, j)(C, 0);
          H = W[0];
          L = W[1];
          ri = 32 - r;
          Wi = r < 32 ? 0 : 1;
          W[Wi] = H << r | L >>> ri;
          W[(Wi + 1) % 2] = L << r | H >>> ri;
          (0, _copy["default"])(W, 0)(A, j);
          (0, _copy["default"])(C, 0)(W, 0);
        }
      };

      var _default = rhoPi;
      exports["default"] = _default;
    })(rhoPi);

    var theta = {};

    (function (exports) {

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports["default"] = void 0;

      var _copy = _interopRequireDefault(copy_1);

      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
          "default": obj
        };
      }

      var theta = function theta(_ref) {
        var A = _ref.A,
            C = _ref.C,
            D = _ref.D,
            W = _ref.W;
        var H = 0;
        var L = 0;

        for (var x = 0; x < 5; x++) {
          var x20 = x * 2;
          var x21 = (x + 5) * 2;
          var x22 = (x + 10) * 2;
          var x23 = (x + 15) * 2;
          var x24 = (x + 20) * 2;
          C[x20] = A[x20] ^ A[x21] ^ A[x22] ^ A[x23] ^ A[x24];
          C[x20 + 1] = A[x20 + 1] ^ A[x21 + 1] ^ A[x22 + 1] ^ A[x23 + 1] ^ A[x24 + 1];
        }

        for (var _x = 0; _x < 5; _x++) {
          (0, _copy["default"])(C, (_x + 1) % 5)(W, 0);
          H = W[0];
          L = W[1];
          W[0] = H << 1 | L >>> 31;
          W[1] = L << 1 | H >>> 31;
          D[_x * 2] = C[(_x + 4) % 5 * 2] ^ W[0];
          D[_x * 2 + 1] = C[(_x + 4) % 5 * 2 + 1] ^ W[1];

          for (var y = 0; y < 25; y += 5) {
            A[(y + _x) * 2] ^= D[_x * 2];
            A[(y + _x) * 2 + 1] ^= D[_x * 2 + 1];
          }
        }
      };

      var _default = theta;
      exports["default"] = _default;
    })(theta);

    (function (exports) {

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports["default"] = void 0;

      var _chi = _interopRequireDefault(chi);

      var _iota = _interopRequireDefault(iota);

      var _rhoPi = _interopRequireDefault(rhoPi);

      var _theta = _interopRequireDefault(theta);

      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
          "default": obj
        };
      }

      var permute = function permute() {
        var C = new Uint32Array(10);
        var D = new Uint32Array(10);
        var W = new Uint32Array(2);
        return function (A) {
          for (var roundIndex = 0; roundIndex < 24; roundIndex++) {
            (0, _theta["default"])({
              A: A,
              C: C,
              D: D,
              W: W
            });
            (0, _rhoPi["default"])({
              A: A,
              C: C,
              W: W
            });
            (0, _chi["default"])({
              A: A,
              C: C
            });
            (0, _iota["default"])({
              A: A,
              roundIndex: roundIndex
            });
          }

          C.fill(0);
          D.fill(0);
          W.fill(0);
        };
      };

      var _default = permute;
      exports["default"] = _default;
    })(permute);

    (function (exports) {

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports["default"] = void 0;
      var _buffer = buffer;

      var _permute = _interopRequireDefault(permute);

      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
          "default": obj
        };
      }

      var xorWords = function xorWords(I, O) {
        for (var i = 0; i < I.length; i += 8) {
          var o = i / 4;
          O[o] ^= I[i + 7] << 24 | I[i + 6] << 16 | I[i + 5] << 8 | I[i + 4];
          O[o + 1] ^= I[i + 3] << 24 | I[i + 2] << 16 | I[i + 1] << 8 | I[i];
        }

        return O;
      };

      var readWords = function readWords(I, O) {
        for (var o = 0; o < O.length; o += 8) {
          var i = o / 4;
          O[o] = I[i + 1];
          O[o + 1] = I[i + 1] >>> 8;
          O[o + 2] = I[i + 1] >>> 16;
          O[o + 3] = I[i + 1] >>> 24;
          O[o + 4] = I[i];
          O[o + 5] = I[i] >>> 8;
          O[o + 6] = I[i] >>> 16;
          O[o + 7] = I[i] >>> 24;
        }

        return O;
      };

      var Sponge = function Sponge(_ref) {
        var _this = this;

        var capacity = _ref.capacity,
            padding = _ref.padding;
        var keccak = (0, _permute["default"])();
        var stateSize = 200;
        var blockSize = capacity / 8;
        var queueSize = stateSize - capacity / 4;
        var queueOffset = 0;
        var state = new Uint32Array(stateSize / 4);

        var queue = _buffer.Buffer.allocUnsafe(queueSize);

        this.absorb = function (buffer) {
          for (var i = 0; i < buffer.length; i++) {
            queue[queueOffset] = buffer[i];
            queueOffset += 1;

            if (queueOffset >= queueSize) {
              xorWords(queue, state);
              keccak(state);
              queueOffset = 0;
            }
          }

          return _this;
        };

        this.squeeze = function () {
          var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
          var output = {
            buffer: options.buffer || _buffer.Buffer.allocUnsafe(blockSize),
            padding: options.padding || padding,
            queue: _buffer.Buffer.allocUnsafe(queue.length),
            state: new Uint32Array(state.length)
          };
          queue.copy(output.queue);

          for (var i = 0; i < state.length; i++) {
            output.state[i] = state[i];
          }

          output.queue.fill(0, queueOffset);
          output.queue[queueOffset] |= output.padding;
          output.queue[queueSize - 1] |= 128;
          xorWords(output.queue, output.state);

          for (var offset = 0; offset < output.buffer.length; offset += queueSize) {
            keccak(output.state);
            readWords(output.state, output.buffer.slice(offset, offset + queueSize));
          }

          return output.buffer;
        };

        this.reset = function () {
          queue.fill(0);
          state.fill(0);
          queueOffset = 0;
          return _this;
        };

        return this;
      };

      var _default = Sponge;
      exports["default"] = _default;
    })(sponge);

    (function (exports) {

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports["default"] = exports.SHAKE = exports.SHA3Hash = exports.SHA3 = exports.Keccak = void 0;
      var _buffer = buffer;

      var _sponge = _interopRequireDefault(sponge);

      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
          "default": obj
        };
      }

      var createHash = function createHash(_ref) {
        var allowedSizes = _ref.allowedSizes,
            defaultSize = _ref.defaultSize,
            padding = _ref.padding;
        return function Hash() {
          var _this = this;

          var size = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : defaultSize;

          if (!this || this.constructor !== Hash) {
            return new Hash(size);
          }

          if (allowedSizes && !allowedSizes.includes(size)) {
            throw new Error("Unsupported hash length");
          }

          var sponge = new _sponge["default"]({
            capacity: size
          });

          this.update = function (input) {
            var encoding = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "utf8";

            if (_buffer.Buffer.isBuffer(input)) {
              sponge.absorb(input);
              return _this;
            }

            if (typeof input === "string") {
              return _this.update(_buffer.Buffer.from(input, encoding));
            }

            throw new TypeError("Not a string or buffer");
          };

          this.digest = function () {
            var formatOrOptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "binary";
            var options = typeof formatOrOptions === "string" ? {
              format: formatOrOptions
            } : formatOrOptions;
            var buffer = sponge.squeeze({
              buffer: options.buffer,
              padding: options.padding || padding
            });

            if (options.format && options.format !== "binary") {
              return buffer.toString(options.format);
            }

            return buffer;
          };

          this.reset = function () {
            sponge.reset();
            return _this;
          };

          return this;
        };
      };

      var Keccak = createHash({
        allowedSizes: [224, 256, 384, 512],
        defaultSize: 512,
        padding: 1
      });
      exports.Keccak = Keccak;
      var SHA3 = createHash({
        allowedSizes: [224, 256, 384, 512],
        defaultSize: 512,
        padding: 6
      });
      exports.SHA3 = SHA3;
      var SHAKE = createHash({
        allowedSizes: [128, 256],
        defaultSize: 256,
        padding: 31
      });
      exports.SHAKE = SHAKE;
      var SHA3Hash = Keccak;
      exports.SHA3Hash = SHA3Hash;
      SHA3.SHA3Hash = SHA3Hash;
      var _default = SHA3;
      exports["default"] = _default;
    })(sha3);
    currentUser().authorization;

    /* src\Account.svelte generated by Svelte v3.50.1 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (245:8) {:else}
    function create_else_block_2(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Fetching account info...");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p: noop$8,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (215:8) {#if mainAccountInfo}
    function create_if_block_5(ctx) {
    	let table;
    	let thead;
    	let t1;
    	let tbody;
    	let tr1;
    	let th1;
    	let t3;
    	let td0;
    	let t4_value = /*mainAccountInfo*/ ctx[0].address + "";
    	let t4;
    	let t5;
    	let tr2;
    	let th2;
    	let t7;
    	let td1;
    	let t8_value = /*mainAccountInfo*/ ctx[0].balance + "";
    	let t8;
    	let t9;
    	let tr3;
    	let th3;
    	let t11;
    	let td2;
    	let t12_value = /*mainAccountInfo*/ ctx[0].availableBalance + "";
    	let t12;
    	let t13;
    	let tr4;
    	let th4;
    	let t15;
    	let td3;
    	let t16_value = formatFileSize(/*mainAccountInfo*/ ctx[0].storageUsed) + "";
    	let t16;
    	let t17;
    	let tr5;
    	let th5;
    	let t19;
    	let td4;
    	let t20_value = formatFileSize(/*mainAccountInfo*/ ctx[0].storageCapacity) + "";
    	let t20;

    	return {
    		c() {
    			table = element("table");
    			thead = element("thead");
    			thead.innerHTML = `<tr><th colspan="2">Account Info</th></tr>`;
    			t1 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			th1 = element("th");
    			th1.textContent = "Address";
    			t3 = space();
    			td0 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			tr2 = element("tr");
    			th2 = element("th");
    			th2.textContent = "Flow Balance";
    			t7 = space();
    			td1 = element("td");
    			t8 = text(t8_value);
    			t9 = space();
    			tr3 = element("tr");
    			th3 = element("th");
    			th3.textContent = "Available Balance";
    			t11 = space();
    			td2 = element("td");
    			t12 = text(t12_value);
    			t13 = space();
    			tr4 = element("tr");
    			th4 = element("th");
    			th4.textContent = "Storage Used";
    			t15 = space();
    			td3 = element("td");
    			t16 = text(t16_value);
    			t17 = space();
    			tr5 = element("tr");
    			th5 = element("th");
    			th5.textContent = "Storage Capacity";
    			t19 = space();
    			td4 = element("td");
    			t20 = text(t20_value);
    			attr(table, "class", "table");
    		},
    		m(target, anchor) {
    			insert(target, table, anchor);
    			append(table, thead);
    			append(table, t1);
    			append(table, tbody);
    			append(tbody, tr1);
    			append(tr1, th1);
    			append(tr1, t3);
    			append(tr1, td0);
    			append(td0, t4);
    			append(tbody, t5);
    			append(tbody, tr2);
    			append(tr2, th2);
    			append(tr2, t7);
    			append(tr2, td1);
    			append(td1, t8);
    			append(tbody, t9);
    			append(tbody, tr3);
    			append(tr3, th3);
    			append(tr3, t11);
    			append(tr3, td2);
    			append(td2, t12);
    			append(tbody, t13);
    			append(tbody, tr4);
    			append(tr4, th4);
    			append(tr4, t15);
    			append(tr4, td3);
    			append(td3, t16);
    			append(tbody, t17);
    			append(tbody, tr5);
    			append(tr5, th5);
    			append(tr5, t19);
    			append(tr5, td4);
    			append(td4, t20);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*mainAccountInfo*/ 1 && t4_value !== (t4_value = /*mainAccountInfo*/ ctx[0].address + "")) set_data(t4, t4_value);
    			if (dirty & /*mainAccountInfo*/ 1 && t8_value !== (t8_value = /*mainAccountInfo*/ ctx[0].balance + "")) set_data(t8, t8_value);
    			if (dirty & /*mainAccountInfo*/ 1 && t12_value !== (t12_value = /*mainAccountInfo*/ ctx[0].availableBalance + "")) set_data(t12, t12_value);
    			if (dirty & /*mainAccountInfo*/ 1 && t16_value !== (t16_value = formatFileSize(/*mainAccountInfo*/ ctx[0].storageUsed) + "")) set_data(t16, t16_value);
    			if (dirty & /*mainAccountInfo*/ 1 && t20_value !== (t20_value = formatFileSize(/*mainAccountInfo*/ ctx[0].storageCapacity) + "")) set_data(t20, t20_value);
    		},
    		d(detaching) {
    			if (detaching) detach(table);
    		}
    	};
    }

    // (262:8) {:else}
    function create_else_block_1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("No proxy account creation request for this ID.");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p: noop$8,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (249:8) {#if transactionData != null && transactionData.public_key != ""}
    function create_if_block_4(ctx) {
    	let b0;
    	let t1;
    	let div0;
    	let ul;
    	let li0;
    	let t2;
    	let b1;
    	let t3_value = /*transactionData*/ ctx[3].nft_address + "";
    	let t3;
    	let t4;
    	let t5_value = /*transactionData*/ ctx[3].nft_contract + "";
    	let t5;
    	let t6;
    	let li1;
    	let t7;
    	let b2;
    	let t8_value = /*transactionData*/ ctx[3].proxy_name + "";
    	let t8;
    	let t9;
    	let li2;
    	let t11;
    	let li3;
    	let t12;
    	let b3;
    	let t13_value = /*transactionData*/ ctx[3].fund_amount + "";
    	let t13;
    	let t14;
    	let t15;
    	let div1;
    	let button;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			b0 = element("b");
    			b0.textContent = "Proxy account creation request, this transaction will do the following:";
    			t1 = space();
    			div0 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			t2 = text("Create an NFT collection of type ");
    			b1 = element("b");
    			t3 = text(t3_value);
    			t4 = text(".");
    			t5 = text(t5_value);
    			t6 = space();
    			li1 = element("li");
    			t7 = text("Create a proxy account with the name ");
    			b2 = element("b");
    			t8 = text(t8_value);
    			t9 = space();
    			li2 = element("li");
    			li2.textContent = "Grant limited permissions to the NFT collection on your main account to the proxy account";
    			t11 = space();
    			li3 = element("li");
    			t12 = text("Transfer ");
    			b3 = element("b");
    			t13 = text(t13_value);
    			t14 = text(" Flow into the proxy account from your main account");
    			t15 = space();
    			div1 = element("div");
    			button = element("button");
    			button.textContent = "Create Proxy";
    			set_style(div0, "margin-left", "15px");
    			attr(button, "class", "btn");
    			set_style(div1, "display", "flex");
    			set_style(div1, "flex-direction", "row-reverse");
    		},
    		m(target, anchor) {
    			insert(target, b0, anchor);
    			insert(target, t1, anchor);
    			insert(target, div0, anchor);
    			append(div0, ul);
    			append(ul, li0);
    			append(li0, t2);
    			append(li0, b1);
    			append(b1, t3);
    			append(b1, t4);
    			append(b1, t5);
    			append(ul, t6);
    			append(ul, li1);
    			append(li1, t7);
    			append(li1, b2);
    			append(b2, t8);
    			append(ul, t9);
    			append(ul, li2);
    			append(ul, t11);
    			append(ul, li3);
    			append(li3, t12);
    			append(li3, b3);
    			append(b3, t13);
    			append(li3, t14);
    			insert(target, t15, anchor);
    			insert(target, div1, anchor);
    			append(div1, button);

    			if (!mounted) {
    				dispose = listen(button, "click", /*createCollectionAndProxy*/ ctx[6]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*transactionData*/ 8 && t3_value !== (t3_value = /*transactionData*/ ctx[3].nft_address + "")) set_data(t3, t3_value);
    			if (dirty & /*transactionData*/ 8 && t5_value !== (t5_value = /*transactionData*/ ctx[3].nft_contract + "")) set_data(t5, t5_value);
    			if (dirty & /*transactionData*/ 8 && t8_value !== (t8_value = /*transactionData*/ ctx[3].proxy_name + "")) set_data(t8, t8_value);
    			if (dirty & /*transactionData*/ 8 && t13_value !== (t13_value = /*transactionData*/ ctx[3].fund_amount + "")) set_data(t13, t13_value);
    		},
    		d(detaching) {
    			if (detaching) detach(b0);
    			if (detaching) detach(t1);
    			if (detaching) detach(div0);
    			if (detaching) detach(t15);
    			if (detaching) detach(div1);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (281:20) {:else}
    function create_else_block$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Installed");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p: noop$8,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (278:20) {#if proxyInfo == null}
    function create_if_block_3(ctx) {
    	let t0;
    	let span;
    	let button;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			t0 = text("Not found\r\n                        ");
    			span = element("span");
    			button = element("button");
    			button.textContent = "Install";
    			attr(button, "class", "btn btn-sm");
    			set_style(span, "padding-left", "20px");
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, span, anchor);
    			append(span, button);

    			if (!mounted) {
    				dispose = listen(button, "click", /*installProxyManager*/ ctx[5]);
    				mounted = true;
    			}
    		},
    		p: noop$8,
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(span);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (286:12) {#if proxyList != null}
    function create_if_block_2(ctx) {
    	let tr;
    	let th;
    	let t1;
    	let td;
    	let t2_value = Object.keys(/*proxyList*/ ctx[2]).length + "";
    	let t2;

    	return {
    		c() {
    			tr = element("tr");
    			th = element("th");
    			th.textContent = "Proxy count";
    			t1 = space();
    			td = element("td");
    			t2 = text(t2_value);
    		},
    		m(target, anchor) {
    			insert(target, tr, anchor);
    			append(tr, th);
    			append(tr, t1);
    			append(tr, td);
    			append(td, t2);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*proxyList*/ 4 && t2_value !== (t2_value = Object.keys(/*proxyList*/ ctx[2]).length + "")) set_data(t2, t2_value);
    		},
    		d(detaching) {
    			if (detaching) detach(tr);
    		}
    	};
    }

    // (295:8) {#if proxyInfo != null}
    function create_if_block$1(ctx) {
    	let div;
    	let button;
    	let t1;
    	let mounted;
    	let dispose;
    	let if_block = /*proxyList*/ ctx[2] != null && create_if_block_1$1(ctx);

    	return {
    		c() {
    			div = element("div");
    			button = element("button");
    			button.textContent = "Refresh Proxy List";
    			t1 = space();
    			if (if_block) if_block.c();
    			attr(button, "class", "btn");
    			set_style(div, "text-align", "center");
    			set_style(div, "margin-top", "30px");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, button);
    			append(div, t1);
    			if (if_block) if_block.m(div, null);

    			if (!mounted) {
    				dispose = listen(button, "click", /*getProxyList*/ ctx[4]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (/*proxyList*/ ctx[2] != null) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (298:16) {#if proxyList != null}
    function create_if_block_1$1(ctx) {
    	let each_1_anchor;
    	let each_value = Object.keys(/*proxyList*/ ctx[2]);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*proxyList, Object*/ 4) {
    				each_value = Object.keys(/*proxyList*/ ctx[2]);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (299:20) {#each Object.keys(proxyList) as key}
    function create_each_block(ctx) {
    	let table;
    	let thead;
    	let tr0;
    	let th0;
    	let t0_value = /*proxyList*/ ctx[2][/*key*/ ctx[12]]["name"] + "";
    	let t0;
    	let t1;
    	let tbody;
    	let tr1;
    	let th1;
    	let t3;
    	let td0;
    	let t4_value = /*key*/ ctx[12] + "";
    	let t4;
    	let t5;
    	let tr2;
    	let th2;
    	let t7;
    	let td1;
    	let t8_value = /*proxyList*/ ctx[2][/*key*/ ctx[12]]["balance"] + "";
    	let t8;
    	let t9;
    	let tr3;
    	let th3;
    	let t11;
    	let td2;
    	let t12_value = /*proxyList*/ ctx[2][/*key*/ ctx[12]]["proxyCapability"]["borrowType"]["type"]["typeID"].split(".")[1] + "";
    	let t12;
    	let t13;
    	let t14_value = /*proxyList*/ ctx[2][/*key*/ ctx[12]]["proxyCapability"]["borrowType"]["type"]["typeID"].split(".")[2] + "";
    	let t14;
    	let t15;
    	let tr4;
    	let th4;
    	let t17;
    	let td3;
    	let t18_value = /*proxyList*/ ctx[2][/*key*/ ctx[12]]["active"] + "";
    	let t18;
    	let t19;

    	return {
    		c() {
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			th0 = element("th");
    			t0 = text(t0_value);
    			t1 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			th1 = element("th");
    			th1.textContent = "Address";
    			t3 = space();
    			td0 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			tr2 = element("tr");
    			th2 = element("th");
    			th2.textContent = "Flow Available";
    			t7 = space();
    			td1 = element("td");
    			t8 = text(t8_value);
    			t9 = space();
    			tr3 = element("tr");
    			th3 = element("th");
    			th3.textContent = "Capability";
    			t11 = space();
    			td2 = element("td");
    			t12 = text(t12_value);
    			t13 = text(".");
    			t14 = text(t14_value);
    			t15 = space();
    			tr4 = element("tr");
    			th4 = element("th");
    			th4.textContent = "Active";
    			t17 = space();
    			td3 = element("td");
    			t18 = text(t18_value);
    			t19 = space();
    			attr(th0, "colspan", "2");
    			attr(table, "class", "table");
    		},
    		m(target, anchor) {
    			insert(target, table, anchor);
    			append(table, thead);
    			append(thead, tr0);
    			append(tr0, th0);
    			append(th0, t0);
    			append(table, t1);
    			append(table, tbody);
    			append(tbody, tr1);
    			append(tr1, th1);
    			append(tr1, t3);
    			append(tr1, td0);
    			append(td0, t4);
    			append(tbody, t5);
    			append(tbody, tr2);
    			append(tr2, th2);
    			append(tr2, t7);
    			append(tr2, td1);
    			append(td1, t8);
    			append(tbody, t9);
    			append(tbody, tr3);
    			append(tr3, th3);
    			append(tr3, t11);
    			append(tr3, td2);
    			append(td2, t12);
    			append(td2, t13);
    			append(td2, t14);
    			append(tbody, t15);
    			append(tbody, tr4);
    			append(tr4, th4);
    			append(tr4, t17);
    			append(tr4, td3);
    			append(td3, t18);
    			append(table, t19);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*proxyList*/ 4 && t0_value !== (t0_value = /*proxyList*/ ctx[2][/*key*/ ctx[12]]["name"] + "")) set_data(t0, t0_value);
    			if (dirty & /*proxyList*/ 4 && t4_value !== (t4_value = /*key*/ ctx[12] + "")) set_data(t4, t4_value);
    			if (dirty & /*proxyList*/ 4 && t8_value !== (t8_value = /*proxyList*/ ctx[2][/*key*/ ctx[12]]["balance"] + "")) set_data(t8, t8_value);
    			if (dirty & /*proxyList*/ 4 && t12_value !== (t12_value = /*proxyList*/ ctx[2][/*key*/ ctx[12]]["proxyCapability"]["borrowType"]["type"]["typeID"].split(".")[1] + "")) set_data(t12, t12_value);
    			if (dirty & /*proxyList*/ 4 && t14_value !== (t14_value = /*proxyList*/ ctx[2][/*key*/ ctx[12]]["proxyCapability"]["borrowType"]["type"]["typeID"].split(".")[2] + "")) set_data(t14, t14_value);
    			if (dirty & /*proxyList*/ 4 && t18_value !== (t18_value = /*proxyList*/ ctx[2][/*key*/ ctx[12]]["active"] + "")) set_data(t18, t18_value);
    		},
    		d(detaching) {
    			if (detaching) detach(table);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let div4;
    	let div1;
    	let t0;
    	let div0;
    	let t1;
    	let div2;
    	let table;
    	let thead;
    	let t3;
    	let tbody;
    	let tr1;
    	let th1;
    	let t5;
    	let td;
    	let t6;
    	let t7;
    	let t8;
    	let div3;

    	function select_block_type(ctx, dirty) {
    		if (/*mainAccountInfo*/ ctx[0]) return create_if_block_5;
    		return create_else_block_2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*transactionData*/ ctx[3] != null && /*transactionData*/ ctx[3].public_key != "") return create_if_block_4;
    		return create_else_block_1;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block1 = current_block_type_1(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (/*proxyInfo*/ ctx[1] == null) return create_if_block_3;
    		return create_else_block$1;
    	}

    	let current_block_type_2 = select_block_type_2(ctx);
    	let if_block2 = current_block_type_2(ctx);
    	let if_block3 = /*proxyList*/ ctx[2] != null && create_if_block_2(ctx);
    	let if_block4 = /*proxyInfo*/ ctx[1] != null && create_if_block$1(ctx);

    	return {
    		c() {
    			div4 = element("div");
    			div1 = element("div");
    			if_block0.c();
    			t0 = space();
    			div0 = element("div");
    			if_block1.c();
    			t1 = space();
    			div2 = element("div");
    			table = element("table");
    			thead = element("thead");
    			thead.innerHTML = `<tr><th colspan="2">Proxy Manager</th></tr>`;
    			t3 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			th1 = element("th");
    			th1.textContent = "Status";
    			t5 = space();
    			td = element("td");
    			if_block2.c();
    			t6 = space();
    			if (if_block3) if_block3.c();
    			t7 = space();
    			if (if_block4) if_block4.c();
    			t8 = space();
    			div3 = element("div");
    			set_style(div0, "border", "1px solid gray");
    			set_style(div0, "margin-top", "10px");
    			set_style(div0, "padding", "10px");
    			attr(div1, "class", "clr-col-6");
    			attr(table, "class", "table");
    			attr(div2, "class", "clr-col-6");
    			attr(div4, "class", "clr-row");
    		},
    		m(target, anchor) {
    			insert(target, div4, anchor);
    			append(div4, div1);
    			if_block0.m(div1, null);
    			append(div1, t0);
    			append(div1, div0);
    			if_block1.m(div0, null);
    			append(div4, t1);
    			append(div4, div2);
    			append(div2, table);
    			append(table, thead);
    			append(table, t3);
    			append(table, tbody);
    			append(tbody, tr1);
    			append(tr1, th1);
    			append(tr1, t5);
    			append(tr1, td);
    			if_block2.m(td, null);
    			append(tbody, t6);
    			if (if_block3) if_block3.m(tbody, null);
    			append(div2, t7);
    			if (if_block4) if_block4.m(div2, null);
    			append(div4, t8);
    			append(div4, div3);
    		},
    		p(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div1, t0);
    				}
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div0, null);
    				}
    			}

    			if (current_block_type_2 === (current_block_type_2 = select_block_type_2(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type_2(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(td, null);
    				}
    			}

    			if (/*proxyList*/ ctx[2] != null) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_2(ctx);
    					if_block3.c();
    					if_block3.m(tbody, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (/*proxyInfo*/ ctx[1] != null) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block$1(ctx);
    					if_block4.c();
    					if_block4.m(div2, null);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}
    		},
    		i: noop$8,
    		o: noop$8,
    		d(detaching) {
    			if (detaching) detach(div4);
    			if_block0.d();
    			if_block1.d();
    			if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    		}
    	};
    }

    function formatFileSize(bytes, decimalPoint) {
    	if (bytes == 0) return '0 Bytes';

    	var k = 1000,
    		dm = decimalPoint || 2,
    		sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
    		i = Math.floor(Math.log(bytes) / Math.log(k));

    	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { user = null } = $$props;
    	let mainAccountInfo = null;
    	let proxyInfo = null;
    	let proxyList = null;
    	let transactionData = null;
    	let id = null;

    	async function getAccountInfo() {
    		$$invalidate(0, mainAccountInfo = await query({
    			cadence: `
            pub fun main() : AuthAccount {
                return getAuthAccount(0xUserAddress)
            }
        `
    		}));
    	}

    	async function getProxyInfo() {
    		$$invalidate(1, proxyInfo = await query({
    			cadence: `
            pub fun main() : Type? {
                return getAuthAccount(0xUserAddress).type(at:/storage/ProxyManager)
            }
        `
    		}));

    		await new Promise(r => setTimeout(r, 1000));
    		await getProxyList();
    	}

    	async function getProxyList() {
    		$$invalidate(2, proxyList = null);

    		$$invalidate(2, proxyList = await query({
    			cadence: `
            import AccountProxies from 0xAccountProxiesAddress

            pub fun main(address:Address) : &{Address: AccountProxies.ProxyInfo} {
                let adminRef = getAuthAccount(address).getCapability<&{AccountProxies.ProxyManagerAdminInterface}>(/private/ProxyManager).borrow() ?? panic("cannot borrow admin interface")
                return adminRef.GetProxies()
            }
            `,
    			args: (arg, t) => [arg(mainAccountInfo.address, t.Address)]
    		}));

    		Object.keys(proxyList).forEach(address => {
    			query({
    				cadence: `
                    pub fun main(address: Address) : AuthAccount {
                        return getAuthAccount(address)
                    }`,
    				args: (arg, t) => [arg(address, t.Address)]
    			}).then(data => {
    				$$invalidate(2, proxyList[address]["balance"] = data.availableBalance, proxyList);
    			});
    		});
    	}

    	async function installProxyManager() {
    		let transactionId = await mutate({
    			cadence: `
                import AccountProxies from 0xAccountProxiesAddress

                transaction
                {
                  let account : AuthAccount

                  prepare(acct: AuthAccount)
                  {
                    self.account = acct

                    if acct.borrow<&AccountProxies.ProxyManager>(from: /storage/ProxyManager) == nil
                    {
                      acct.save<@AccountProxies.ProxyManager>(<-AccountProxies.CreateProxyManager(), to: /storage/ProxyManager)
                      acct.link<&AccountProxies.ProxyManager{AccountProxies.ProxyManagerPublicInterface}>(/public/ProxyManager, target: /storage/ProxyManager)
                      acct.link<&AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdminInterface}>(/private/ProxyManager, target: /storage/ProxyManager)
                    }

                    log("ProxyManager Created on: ".concat(acct.address.toString()))
                  }

                  post
                  {
                    self.account.getCapability<&AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdminInterface}>(/private/ProxyManager).check(): "Could not find admin capability!"
                    getAccount(self.account.address).getCapability<&AccountProxies.ProxyManager{AccountProxies.ProxyManagerPublicInterface}>(/public/ProxyManager).check(): "Could not find public capability!"
                  }
                }
            `,
    			limit: 999
    		});

    		await transaction(transactionId).onceSealed();
    		await getProxyInfo();
    	}

    	async function createCollectionAndProxy() {
    		config$2.put("0x00TargetContractAddress", transactionData.nft_address);
    		config$2.put("0x00TargetContract", transactionData.nft_contract);
    		config$2.put("0x00PublicKey", transactionData.public_key);
    		config$2.put("0x00ProxyName", transactionData.proxy_name);
    		config$2.put("0x00FundingAmount", transactionData.fund_amount);

    		let transactionId = await mutate({
    			cadence: `
            import 0x00TargetContract from 0x00TargetContractAddress
            import NonFungibleToken from 0xNFTContractAddress
            import AccountProxies from 0xAccountProxiesAddress

            transaction {
                prepare(signer: AuthAccount) {
                    // Create collection if it doesn't exist
                    if signer.borrow<&0x00TargetContract.Collection>(from: 0x00TargetContract.CollectionStoragePath) == nil
                    {
                        // Create a new empty collection
                        let collection <- 0x00TargetContract.createEmptyCollection()

                        // save it to the account
                        signer.save(<-collection, to: 0x00TargetContract.CollectionStoragePath)

                        // link a public capability for the collection
                        signer.link<&{0x00TargetContract.CollectionPublic, NonFungibleToken.CollectionPublic}>(
                            0x00TargetContract.CollectionPublicPath,
                            target: 0x00TargetContract.CollectionStoragePath
                        )

                        // link private capability for the collection
                        signer.link<&{0x00TargetContract.CollectionPrivate}>(
                            0x00TargetContract.CollectionPrivatePath,
                            target: 0x00TargetContract.CollectionStoragePath
                        )

                        //link a proxy capability for the collection
                        signer.link<&{0x00TargetContract.CollectionProxy}>(
                            0x00TargetContract.CollectionProxyPath,
                            target: 0x00TargetContract.CollectionStoragePath
                        )
                    }

                    //Create proxy manager if it doesn't exist
                    if signer.borrow<&AccountProxies.ProxyManager>(from: /storage/ProxyManager) == nil
                    {
                      signer.save<@AccountProxies.ProxyManager>(<-AccountProxies.CreateProxyManager(), to: /storage/ProxyManager)
                      signer.link<&AccountProxies.ProxyManager{AccountProxies.ProxyManagerPublicInterface}>(/public/ProxyManager, target: /storage/ProxyManager)
                      signer.link<&AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdminInterface}>(/private/ProxyManager, target: /storage/ProxyManager)
                    }

                    //Create proxy account
                    let adminRef = signer.getCapability<&{AccountProxies.ProxyManagerAdminInterface}>(/private/ProxyManager).borrow() ?? panic("cannot borrow admin interface")
                    let proxyCap = signer.getCapability<&{0x00TargetContract.CollectionProxy}>(0x00TargetContract.CollectionProxyPath)

                    adminRef.CreateProxy(
                      signer: signer,
                      publicKey: "0x00PublicKey",
                      name: "0x00ProxyName",
                      capability: proxyCap,
                      initialFundingAmount: 0x00FundingAmount
                    )
                }
            }`
    		});

    		let transaction$1 = await transaction(transactionId).onceSealed();
    		let newAddress = "";

    		transaction$1.events.forEach(evt => {
    			if (evt.type == "flow.AccountCreated") {
    				newAddress = evt.data.address;
    				fetch("/set_proxy_address?id=" + id + "&address=" + newAddress).then($$invalidate(3, transactionData = null));
    			}
    		});

    		await getProxyInfo();
    		await getProxyList();
    	}

    	function getTransactionRequest() {
    		const urlParams = new URLSearchParams(window.location.search);
    		id = urlParams.get('id');

    		fetch("/get_transaction_info?id=" + id).then(response => response.json()).then(data => {
    			$$invalidate(3, transactionData = data);
    		});
    	} /*
    transactionData = {
        public_key: "PublicKey",
        proxy_name: "Test Proxy Name",
        nft_contract: "SampleNFT",
        nft_address: "0xdeadbeefcafe",
        fund_amount: 0.05,
        proxy_address: "None"
    }
    */ //console.log(transactionData);

    	getTransactionRequest();
    	getAccountInfo();
    	getProxyInfo();

    	$$self.$$set = $$props => {
    		if ('user' in $$props) $$invalidate(7, user = $$props.user);
    	};

    	return [
    		mainAccountInfo,
    		proxyInfo,
    		proxyList,
    		transactionData,
    		getProxyList,
    		installProxyManager,
    		createCollectionAndProxy,
    		user
    	];
    }

    class Account extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { user: 7 });
    	}
    }

    /* src\App.svelte generated by Svelte v3.50.1 */

    function create_if_block_1(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			button.textContent = "Log Out";
    			attr(button, "class", "btn");
    			set_style(button, "margin-left", "auto");
    			set_style(button, "margin-right", "10px");
    			set_style(button, "margin-top", "10px");
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler*/ ctx[1]);
    				mounted = true;
    			}
    		},
    		p: noop$8,
    		d(detaching) {
    			if (detaching) detach(button);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (42:12) {:else}
    function create_else_block(ctx) {
    	let account;
    	let current;
    	account = new Account({ props: { user: /*currentUser*/ ctx[0] } });

    	return {
    		c() {
    			create_component(account.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(account, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const account_changes = {};
    			if (dirty & /*currentUser*/ 1) account_changes.user = /*currentUser*/ ctx[0];
    			account.$set(account_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(account.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(account.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(account, detaching);
    		}
    	};
    }

    // (37:12) {#if currentUser == null || currentUser.addr == null}
    function create_if_block(ctx) {
    	let h4;
    	let t1;
    	let div;
    	let button;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			h4 = element("h4");
    			h4.textContent = "Log in to proceed";
    			t1 = space();
    			div = element("div");
    			button = element("button");
    			button.textContent = "Log In";
    			attr(button, "class", "btn");
    		},
    		m(target, anchor) {
    			insert(target, h4, anchor);
    			insert(target, t1, anchor);
    			insert(target, div, anchor);
    			append(div, button);

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler_1*/ ctx[2]);
    				mounted = true;
    			}
    		},
    		p: noop$8,
    		i: noop$8,
    		o: noop$8,
    		d(detaching) {
    			if (detaching) detach(h4);
    			if (detaching) detach(t1);
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment(ctx) {
    	let div2;
    	let header;
    	let h2;
    	let t1;
    	let t2;
    	let div1;
    	let div0;
    	let current_block_type_index;
    	let if_block1;
    	let current;
    	let if_block0 = /*currentUser*/ ctx[0] != null && /*currentUser*/ ctx[0].addr != null && create_if_block_1(ctx);
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*currentUser*/ ctx[0] == null || /*currentUser*/ ctx[0].addr == null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			div2 = element("div");
    			header = element("header");
    			h2 = element("h2");
    			h2.textContent = "Flow Proxy Account Manager";
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			div1 = element("div");
    			div0 = element("div");
    			if_block1.c();
    			set_style(h2, "margin-left", "1rem");
    			set_style(h2, "margin-top", "10px");
    			attr(header, "class", "header header-6");
    			attr(div0, "class", "content-area");
    			attr(div1, "class", "content-container");
    			attr(div2, "class", "main-container");
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, header);
    			append(header, h2);
    			append(header, t1);
    			if (if_block0) if_block0.m(header, null);
    			append(div2, t2);
    			append(div2, div1);
    			append(div1, div0);
    			if_blocks[current_block_type_index].m(div0, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*currentUser*/ ctx[0] != null && /*currentUser*/ ctx[0].addr != null) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(header, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block1 = if_blocks[current_block_type_index];

    				if (!if_block1) {
    					if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block1.c();
    				} else {
    					if_block1.p(ctx, dirty);
    				}

    				transition_in(if_block1, 1);
    				if_block1.m(div0, null);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block1);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block1);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div2);
    			if (if_block0) if_block0.d();
    			if_blocks[current_block_type_index].d();
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	config$2({
    		"discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn", // Endpoint set to Testnet"
    		"accessNode.api": "https://rest-testnet.onflow.org", // Mainnet: "https://rest-mainnet.onflow.org"
    		"app.detail.title": "Flow Proxy Account Manager",
    		"flow.network": "testnet",
    		"0xAccountProxiesAddress": "0xdc47b6640307a7c8",
    		"0xFungibleTokenAddress": "0x9a0766d93b6608b7",
    		"0xNFTContractAddress": "0x631e88ae7f1d7c20",
    		"fcl.limit": 999
    	});

    	let currentUser$1 = null;

    	function setUser(user) {
    		$$invalidate(0, currentUser$1 = user);
    		config$2.put("0xUserAddress", user.addr);
    	}

    	currentUser.subscribe(setUser);
    	currentUser().authenticate();
    	const click_handler = () => currentUser().unauthenticate();
    	const click_handler_1 = () => currentUser().authenticate();
    	return [currentUser$1, click_handler, click_handler_1];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    const app = new App({
        target: document.body,
        props: {
            name: 'Daffodil',
        },
    });

    return app;

})();
