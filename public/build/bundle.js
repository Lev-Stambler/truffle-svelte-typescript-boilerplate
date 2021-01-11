
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
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
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
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
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
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
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
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
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
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
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
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
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
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
            mount_component(component, options.target, options.anchor);
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
            this.$destroy = noop;
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

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.31.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var contractName = "SimpleStorage";
    var abi = [
    	{
    		anonymous: false,
    		inputs: [
    			{
    				indexed: false,
    				internalType: "string",
    				name: "_message",
    				type: "string"
    			}
    		],
    		name: "StorageSet",
    		type: "event"
    	},
    	{
    		inputs: [
    		],
    		name: "storedData",
    		outputs: [
    			{
    				internalType: "uint256",
    				name: "",
    				type: "uint256"
    			}
    		],
    		stateMutability: "view",
    		type: "function"
    	},
    	{
    		inputs: [
    			{
    				internalType: "uint256",
    				name: "x",
    				type: "uint256"
    			}
    		],
    		name: "setStore",
    		outputs: [
    		],
    		stateMutability: "nonpayable",
    		type: "function"
    	},
    	{
    		inputs: [
    		],
    		name: "get",
    		outputs: [
    			{
    				internalType: "uint256",
    				name: "retVal",
    				type: "uint256"
    			}
    		],
    		stateMutability: "view",
    		type: "function"
    	}
    ];
    var metadata = "{\"compiler\":{\"version\":\"0.7.0+commit.9e61f92b\"},\"language\":\"Solidity\",\"output\":{\"abi\":[{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"string\",\"name\":\"_message\",\"type\":\"string\"}],\"name\":\"StorageSet\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"get\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"retVal\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"x\",\"type\":\"uint256\"}],\"name\":\"setStore\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"storedData\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"}],\"devdoc\":{\"kind\":\"dev\",\"methods\":{},\"version\":1},\"userdoc\":{\"kind\":\"user\",\"methods\":{},\"version\":1}},\"settings\":{\"compilationTarget\":{\"/home/lev/code/blockchain/truffle-svelte-typescript-boilerplate/truffle-svelte-starter/contracts/SimpleStorage.sol\":\"SimpleStorage\"},\"evmVersion\":\"istanbul\",\"libraries\":{},\"metadata\":{\"bytecodeHash\":\"ipfs\"},\"optimizer\":{\"enabled\":false,\"runs\":200},\"remappings\":[]},\"sources\":{\"/home/lev/code/blockchain/truffle-svelte-typescript-boilerplate/truffle-svelte-starter/contracts/SimpleStorage.sol\":{\"keccak256\":\"0x68129a79d3ae5be4eb5ab3fe89b2489eee5d308a13502f9c81a3e4d772418c66\",\"urls\":[\"bzz-raw://c4f0ac4185b642aa429442fe24bfee1c325d7d9690502c909b6232971d8b6c09\",\"dweb:/ipfs/QmYvCSWmmCfX5CSHqtwSYjboE4gLCJrhstjMcqSpeUcXua\"]}},\"version\":1}";
    var bytecode = "0x608060405234801561001057600080fd5b50610167806100206000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c80632a1afcd9146100465780636d4ce63c146100645780637f626f1a14610082575b600080fd5b61004e6100b0565b6040518082815260200191505060405180910390f35b61006c6100b6565b6040518082815260200191505060405180910390f35b6100ae6004803603602081101561009857600080fd5b81019080803590602001909291905050506100bf565b005b60005481565b60008054905090565b806000819055507f60cdc157ca4737a5d39a0e107532616e7bf6946e615228812c7f9bc9f81797a66040518080602001828103825260198152602001807f446174612073746f726564207375636365737366756c6c79210000000000000081525060200191505060405180910390a15056fea264697066735822122007bfe5316e5718a21f7f096b1fffb225c82c62207c591fcc929e952a82b1cf4c64736f6c63430007000033";
    var deployedBytecode = "0x608060405234801561001057600080fd5b50600436106100415760003560e01c80632a1afcd9146100465780636d4ce63c146100645780637f626f1a14610082575b600080fd5b61004e6100b0565b6040518082815260200191505060405180910390f35b61006c6100b6565b6040518082815260200191505060405180910390f35b6100ae6004803603602081101561009857600080fd5b81019080803590602001909291905050506100bf565b005b60005481565b60008054905090565b806000819055507f60cdc157ca4737a5d39a0e107532616e7bf6946e615228812c7f9bc9f81797a66040518080602001828103825260198152602001807f446174612073746f726564207375636365737366756c6c79210000000000000081525060200191505060405180910390a15056fea264697066735822122007bfe5316e5718a21f7f096b1fffb225c82c62207c591fcc929e952a82b1cf4c64736f6c63430007000033";
    var immutableReferences = {
    };
    var sourceMap = "25:308:1:-:0;;;;;;;;;;;;;;;;;;;";
    var deployedSourceMap = "25:308:1:-:0;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;94:22;;;:::i;:::-;;;;;;;;;;;;;;;;;;;248:83;;;:::i;:::-;;;;;;;;;;;;;;;;;;;123:119;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::i;:::-;;94:22;;;;:::o;248:83::-;284:11;314:10;;307:17;;248:83;:::o;123:119::-;179:1;166:10;:14;;;;196:39;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;123:119;:::o";
    var source = "pragma solidity ^0.7.0;\n\ncontract SimpleStorage {\n    event StorageSet(string _message);\n\n    uint public storedData;\n\n    function setStore(uint x) public {\n        storedData = x;\n\n        emit StorageSet(\"Data stored successfully!\");\n    }\n\n    function get() view public returns (uint retVal) {\n        return storedData;\n    }\n}";
    var sourcePath = "/home/lev/code/blockchain/truffle-svelte-typescript-boilerplate/truffle-svelte-starter/contracts/SimpleStorage.sol";
    var ast = {
    	absolutePath: "/home/lev/code/blockchain/truffle-svelte-typescript-boilerplate/truffle-svelte-starter/contracts/SimpleStorage.sol",
    	exportedSymbols: {
    		SimpleStorage: [
    			87
    		]
    	},
    	id: 88,
    	license: null,
    	nodeType: "SourceUnit",
    	nodes: [
    		{
    			id: 58,
    			literals: [
    				"solidity",
    				"^",
    				"0.7",
    				".0"
    			],
    			nodeType: "PragmaDirective",
    			src: "0:23:1"
    		},
    		{
    			abstract: false,
    			baseContracts: [
    			],
    			contractDependencies: [
    			],
    			contractKind: "contract",
    			documentation: null,
    			fullyImplemented: true,
    			id: 87,
    			linearizedBaseContracts: [
    				87
    			],
    			name: "SimpleStorage",
    			nodeType: "ContractDefinition",
    			nodes: [
    				{
    					anonymous: false,
    					documentation: null,
    					id: 62,
    					name: "StorageSet",
    					nodeType: "EventDefinition",
    					parameters: {
    						id: 61,
    						nodeType: "ParameterList",
    						parameters: [
    							{
    								constant: false,
    								id: 60,
    								indexed: false,
    								mutability: "mutable",
    								name: "_message",
    								nodeType: "VariableDeclaration",
    								overrides: null,
    								scope: 62,
    								src: "71:15:1",
    								stateVariable: false,
    								storageLocation: "default",
    								typeDescriptions: {
    									typeIdentifier: "t_string_memory_ptr",
    									typeString: "string"
    								},
    								typeName: {
    									id: 59,
    									name: "string",
    									nodeType: "ElementaryTypeName",
    									src: "71:6:1",
    									typeDescriptions: {
    										typeIdentifier: "t_string_storage_ptr",
    										typeString: "string"
    									}
    								},
    								value: null,
    								visibility: "internal"
    							}
    						],
    						src: "70:17:1"
    					},
    					src: "54:34:1"
    				},
    				{
    					constant: false,
    					functionSelector: "2a1afcd9",
    					id: 64,
    					mutability: "mutable",
    					name: "storedData",
    					nodeType: "VariableDeclaration",
    					overrides: null,
    					scope: 87,
    					src: "94:22:1",
    					stateVariable: true,
    					storageLocation: "default",
    					typeDescriptions: {
    						typeIdentifier: "t_uint256",
    						typeString: "uint256"
    					},
    					typeName: {
    						id: 63,
    						name: "uint",
    						nodeType: "ElementaryTypeName",
    						src: "94:4:1",
    						typeDescriptions: {
    							typeIdentifier: "t_uint256",
    							typeString: "uint256"
    						}
    					},
    					value: null,
    					visibility: "public"
    				},
    				{
    					body: {
    						id: 77,
    						nodeType: "Block",
    						src: "156:86:1",
    						statements: [
    							{
    								expression: {
    									argumentTypes: null,
    									id: 71,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									lValueRequested: false,
    									leftHandSide: {
    										argumentTypes: null,
    										id: 69,
    										name: "storedData",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 64,
    										src: "166:10:1",
    										typeDescriptions: {
    											typeIdentifier: "t_uint256",
    											typeString: "uint256"
    										}
    									},
    									nodeType: "Assignment",
    									operator: "=",
    									rightHandSide: {
    										argumentTypes: null,
    										id: 70,
    										name: "x",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 66,
    										src: "179:1:1",
    										typeDescriptions: {
    											typeIdentifier: "t_uint256",
    											typeString: "uint256"
    										}
    									},
    									src: "166:14:1",
    									typeDescriptions: {
    										typeIdentifier: "t_uint256",
    										typeString: "uint256"
    									}
    								},
    								id: 72,
    								nodeType: "ExpressionStatement",
    								src: "166:14:1"
    							},
    							{
    								eventCall: {
    									argumentTypes: null,
    									"arguments": [
    										{
    											argumentTypes: null,
    											hexValue: "446174612073746f726564207375636365737366756c6c7921",
    											id: 74,
    											isConstant: false,
    											isLValue: false,
    											isPure: true,
    											kind: "string",
    											lValueRequested: false,
    											nodeType: "Literal",
    											src: "207:27:1",
    											subdenomination: null,
    											typeDescriptions: {
    												typeIdentifier: "t_stringliteral_e3f80da8c3742cb225df557f335969ea1a3da0020617c534164a2e7912c74501",
    												typeString: "literal_string \"Data stored successfully!\""
    											},
    											value: "Data stored successfully!"
    										}
    									],
    									expression: {
    										argumentTypes: [
    											{
    												typeIdentifier: "t_stringliteral_e3f80da8c3742cb225df557f335969ea1a3da0020617c534164a2e7912c74501",
    												typeString: "literal_string \"Data stored successfully!\""
    											}
    										],
    										id: 73,
    										name: "StorageSet",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 62,
    										src: "196:10:1",
    										typeDescriptions: {
    											typeIdentifier: "t_function_event_nonpayable$_t_string_memory_ptr_$returns$__$",
    											typeString: "function (string memory)"
    										}
    									},
    									id: 75,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									kind: "functionCall",
    									lValueRequested: false,
    									names: [
    									],
    									nodeType: "FunctionCall",
    									src: "196:39:1",
    									tryCall: false,
    									typeDescriptions: {
    										typeIdentifier: "t_tuple$__$",
    										typeString: "tuple()"
    									}
    								},
    								id: 76,
    								nodeType: "EmitStatement",
    								src: "191:44:1"
    							}
    						]
    					},
    					documentation: null,
    					functionSelector: "7f626f1a",
    					id: 78,
    					implemented: true,
    					kind: "function",
    					modifiers: [
    					],
    					name: "setStore",
    					nodeType: "FunctionDefinition",
    					overrides: null,
    					parameters: {
    						id: 67,
    						nodeType: "ParameterList",
    						parameters: [
    							{
    								constant: false,
    								id: 66,
    								mutability: "mutable",
    								name: "x",
    								nodeType: "VariableDeclaration",
    								overrides: null,
    								scope: 78,
    								src: "141:6:1",
    								stateVariable: false,
    								storageLocation: "default",
    								typeDescriptions: {
    									typeIdentifier: "t_uint256",
    									typeString: "uint256"
    								},
    								typeName: {
    									id: 65,
    									name: "uint",
    									nodeType: "ElementaryTypeName",
    									src: "141:4:1",
    									typeDescriptions: {
    										typeIdentifier: "t_uint256",
    										typeString: "uint256"
    									}
    								},
    								value: null,
    								visibility: "internal"
    							}
    						],
    						src: "140:8:1"
    					},
    					returnParameters: {
    						id: 68,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "156:0:1"
    					},
    					scope: 87,
    					src: "123:119:1",
    					stateMutability: "nonpayable",
    					virtual: false,
    					visibility: "public"
    				},
    				{
    					body: {
    						id: 85,
    						nodeType: "Block",
    						src: "297:34:1",
    						statements: [
    							{
    								expression: {
    									argumentTypes: null,
    									id: 83,
    									name: "storedData",
    									nodeType: "Identifier",
    									overloadedDeclarations: [
    									],
    									referencedDeclaration: 64,
    									src: "314:10:1",
    									typeDescriptions: {
    										typeIdentifier: "t_uint256",
    										typeString: "uint256"
    									}
    								},
    								functionReturnParameters: 82,
    								id: 84,
    								nodeType: "Return",
    								src: "307:17:1"
    							}
    						]
    					},
    					documentation: null,
    					functionSelector: "6d4ce63c",
    					id: 86,
    					implemented: true,
    					kind: "function",
    					modifiers: [
    					],
    					name: "get",
    					nodeType: "FunctionDefinition",
    					overrides: null,
    					parameters: {
    						id: 79,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "260:2:1"
    					},
    					returnParameters: {
    						id: 82,
    						nodeType: "ParameterList",
    						parameters: [
    							{
    								constant: false,
    								id: 81,
    								mutability: "mutable",
    								name: "retVal",
    								nodeType: "VariableDeclaration",
    								overrides: null,
    								scope: 86,
    								src: "284:11:1",
    								stateVariable: false,
    								storageLocation: "default",
    								typeDescriptions: {
    									typeIdentifier: "t_uint256",
    									typeString: "uint256"
    								},
    								typeName: {
    									id: 80,
    									name: "uint",
    									nodeType: "ElementaryTypeName",
    									src: "284:4:1",
    									typeDescriptions: {
    										typeIdentifier: "t_uint256",
    										typeString: "uint256"
    									}
    								},
    								value: null,
    								visibility: "internal"
    							}
    						],
    						src: "283:13:1"
    					},
    					scope: 87,
    					src: "248:83:1",
    					stateMutability: "view",
    					virtual: false,
    					visibility: "public"
    				}
    			],
    			scope: 88,
    			src: "25:308:1"
    		}
    	],
    	src: "0:333:1"
    };
    var legacyAST = {
    	attributes: {
    		absolutePath: "/home/lev/code/blockchain/truffle-svelte-typescript-boilerplate/truffle-svelte-starter/contracts/SimpleStorage.sol",
    		exportedSymbols: {
    			SimpleStorage: [
    				87
    			]
    		},
    		license: null
    	},
    	children: [
    		{
    			attributes: {
    				literals: [
    					"solidity",
    					"^",
    					"0.7",
    					".0"
    				]
    			},
    			id: 58,
    			name: "PragmaDirective",
    			src: "0:23:1"
    		},
    		{
    			attributes: {
    				abstract: false,
    				baseContracts: [
    					null
    				],
    				contractDependencies: [
    					null
    				],
    				contractKind: "contract",
    				documentation: null,
    				fullyImplemented: true,
    				linearizedBaseContracts: [
    					87
    				],
    				name: "SimpleStorage",
    				scope: 88
    			},
    			children: [
    				{
    					attributes: {
    						anonymous: false,
    						documentation: null,
    						name: "StorageSet"
    					},
    					children: [
    						{
    							children: [
    								{
    									attributes: {
    										constant: false,
    										indexed: false,
    										mutability: "mutable",
    										name: "_message",
    										overrides: null,
    										scope: 62,
    										stateVariable: false,
    										storageLocation: "default",
    										type: "string",
    										value: null,
    										visibility: "internal"
    									},
    									children: [
    										{
    											attributes: {
    												name: "string",
    												type: "string"
    											},
    											id: 59,
    											name: "ElementaryTypeName",
    											src: "71:6:1"
    										}
    									],
    									id: 60,
    									name: "VariableDeclaration",
    									src: "71:15:1"
    								}
    							],
    							id: 61,
    							name: "ParameterList",
    							src: "70:17:1"
    						}
    					],
    					id: 62,
    					name: "EventDefinition",
    					src: "54:34:1"
    				},
    				{
    					attributes: {
    						constant: false,
    						functionSelector: "2a1afcd9",
    						mutability: "mutable",
    						name: "storedData",
    						overrides: null,
    						scope: 87,
    						stateVariable: true,
    						storageLocation: "default",
    						type: "uint256",
    						value: null,
    						visibility: "public"
    					},
    					children: [
    						{
    							attributes: {
    								name: "uint",
    								type: "uint256"
    							},
    							id: 63,
    							name: "ElementaryTypeName",
    							src: "94:4:1"
    						}
    					],
    					id: 64,
    					name: "VariableDeclaration",
    					src: "94:22:1"
    				},
    				{
    					attributes: {
    						documentation: null,
    						functionSelector: "7f626f1a",
    						implemented: true,
    						isConstructor: false,
    						kind: "function",
    						modifiers: [
    							null
    						],
    						name: "setStore",
    						overrides: null,
    						scope: 87,
    						stateMutability: "nonpayable",
    						virtual: false,
    						visibility: "public"
    					},
    					children: [
    						{
    							children: [
    								{
    									attributes: {
    										constant: false,
    										mutability: "mutable",
    										name: "x",
    										overrides: null,
    										scope: 78,
    										stateVariable: false,
    										storageLocation: "default",
    										type: "uint256",
    										value: null,
    										visibility: "internal"
    									},
    									children: [
    										{
    											attributes: {
    												name: "uint",
    												type: "uint256"
    											},
    											id: 65,
    											name: "ElementaryTypeName",
    											src: "141:4:1"
    										}
    									],
    									id: 66,
    									name: "VariableDeclaration",
    									src: "141:6:1"
    								}
    							],
    							id: 67,
    							name: "ParameterList",
    							src: "140:8:1"
    						},
    						{
    							attributes: {
    								parameters: [
    									null
    								]
    							},
    							children: [
    							],
    							id: 68,
    							name: "ParameterList",
    							src: "156:0:1"
    						},
    						{
    							children: [
    								{
    									children: [
    										{
    											attributes: {
    												argumentTypes: null,
    												isConstant: false,
    												isLValue: false,
    												isPure: false,
    												lValueRequested: false,
    												operator: "=",
    												type: "uint256"
    											},
    											children: [
    												{
    													attributes: {
    														argumentTypes: null,
    														overloadedDeclarations: [
    															null
    														],
    														referencedDeclaration: 64,
    														type: "uint256",
    														value: "storedData"
    													},
    													id: 69,
    													name: "Identifier",
    													src: "166:10:1"
    												},
    												{
    													attributes: {
    														argumentTypes: null,
    														overloadedDeclarations: [
    															null
    														],
    														referencedDeclaration: 66,
    														type: "uint256",
    														value: "x"
    													},
    													id: 70,
    													name: "Identifier",
    													src: "179:1:1"
    												}
    											],
    											id: 71,
    											name: "Assignment",
    											src: "166:14:1"
    										}
    									],
    									id: 72,
    									name: "ExpressionStatement",
    									src: "166:14:1"
    								},
    								{
    									children: [
    										{
    											attributes: {
    												argumentTypes: null,
    												isConstant: false,
    												isLValue: false,
    												isPure: false,
    												isStructConstructorCall: false,
    												lValueRequested: false,
    												names: [
    													null
    												],
    												tryCall: false,
    												type: "tuple()",
    												type_conversion: false
    											},
    											children: [
    												{
    													attributes: {
    														argumentTypes: [
    															{
    																typeIdentifier: "t_stringliteral_e3f80da8c3742cb225df557f335969ea1a3da0020617c534164a2e7912c74501",
    																typeString: "literal_string \"Data stored successfully!\""
    															}
    														],
    														overloadedDeclarations: [
    															null
    														],
    														referencedDeclaration: 62,
    														type: "function (string memory)",
    														value: "StorageSet"
    													},
    													id: 73,
    													name: "Identifier",
    													src: "196:10:1"
    												},
    												{
    													attributes: {
    														argumentTypes: null,
    														hexvalue: "446174612073746f726564207375636365737366756c6c7921",
    														isConstant: false,
    														isLValue: false,
    														isPure: true,
    														lValueRequested: false,
    														subdenomination: null,
    														token: "string",
    														type: "literal_string \"Data stored successfully!\"",
    														value: "Data stored successfully!"
    													},
    													id: 74,
    													name: "Literal",
    													src: "207:27:1"
    												}
    											],
    											id: 75,
    											name: "FunctionCall",
    											src: "196:39:1"
    										}
    									],
    									id: 76,
    									name: "EmitStatement",
    									src: "191:44:1"
    								}
    							],
    							id: 77,
    							name: "Block",
    							src: "156:86:1"
    						}
    					],
    					id: 78,
    					name: "FunctionDefinition",
    					src: "123:119:1"
    				},
    				{
    					attributes: {
    						documentation: null,
    						functionSelector: "6d4ce63c",
    						implemented: true,
    						isConstructor: false,
    						kind: "function",
    						modifiers: [
    							null
    						],
    						name: "get",
    						overrides: null,
    						scope: 87,
    						stateMutability: "view",
    						virtual: false,
    						visibility: "public"
    					},
    					children: [
    						{
    							attributes: {
    								parameters: [
    									null
    								]
    							},
    							children: [
    							],
    							id: 79,
    							name: "ParameterList",
    							src: "260:2:1"
    						},
    						{
    							children: [
    								{
    									attributes: {
    										constant: false,
    										mutability: "mutable",
    										name: "retVal",
    										overrides: null,
    										scope: 86,
    										stateVariable: false,
    										storageLocation: "default",
    										type: "uint256",
    										value: null,
    										visibility: "internal"
    									},
    									children: [
    										{
    											attributes: {
    												name: "uint",
    												type: "uint256"
    											},
    											id: 80,
    											name: "ElementaryTypeName",
    											src: "284:4:1"
    										}
    									],
    									id: 81,
    									name: "VariableDeclaration",
    									src: "284:11:1"
    								}
    							],
    							id: 82,
    							name: "ParameterList",
    							src: "283:13:1"
    						},
    						{
    							children: [
    								{
    									attributes: {
    										functionReturnParameters: 82
    									},
    									children: [
    										{
    											attributes: {
    												argumentTypes: null,
    												overloadedDeclarations: [
    													null
    												],
    												referencedDeclaration: 64,
    												type: "uint256",
    												value: "storedData"
    											},
    											id: 83,
    											name: "Identifier",
    											src: "314:10:1"
    										}
    									],
    									id: 84,
    									name: "Return",
    									src: "307:17:1"
    								}
    							],
    							id: 85,
    							name: "Block",
    							src: "297:34:1"
    						}
    					],
    					id: 86,
    					name: "FunctionDefinition",
    					src: "248:83:1"
    				}
    			],
    			id: 87,
    			name: "ContractDefinition",
    			src: "25:308:1"
    		}
    	],
    	id: 88,
    	name: "SourceUnit",
    	src: "0:333:1"
    };
    var compiler = {
    	name: "solc",
    	version: "0.7.0+commit.9e61f92b.Emscripten.clang"
    };
    var networks = {
    };
    var schemaVersion = "3.3.3";
    var updatedAt = "2021-01-10T22:58:06.896Z";
    var devdoc = {
    	kind: "dev",
    	methods: {
    	},
    	version: 1
    };
    var userdoc = {
    	kind: "user",
    	methods: {
    	},
    	version: 1
    };
    var SimpleStorageContract = {
    	contractName: contractName,
    	abi: abi,
    	metadata: metadata,
    	bytecode: bytecode,
    	deployedBytecode: deployedBytecode,
    	immutableReferences: immutableReferences,
    	sourceMap: sourceMap,
    	deployedSourceMap: deployedSourceMap,
    	source: source,
    	sourcePath: sourcePath,
    	ast: ast,
    	legacyAST: legacyAST,
    	compiler: compiler,
    	networks: networks,
    	schemaVersion: schemaVersion,
    	updatedAt: updatedAt,
    	devdoc: devdoc,
    	userdoc: userdoc
    };

    async function loadWeb3 () {
        // window.Web3 = Web3
        if (window.ethereum) {
            window.web3 = new window.Web3(window.ethereum);
            // await window.ethereum.enable()
        }
        else if (window.web3) {
            window.web3 = new window.Web3(window.web3.currentProvider);
        }
        else {
            window.alert("Non-Ethereum browser detected. You should consider trying MetaMask!");
        }
        return window.web3;
    }

    /* src/App.svelte generated by Svelte v3.31.2 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let div3;
    	let div2;
    	let div1;
    	let h1;
    	let t1;
    	let h40;
    	let t3;
    	let div0;
    	let h41;
    	let t5;
    	let p0;
    	let t7;
    	let p1;
    	let t8;
    	let t9;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Truffle Box";
    			t1 = space();
    			h40 = element("h4");
    			h40.textContent = "Skeleton SvelteJS truffle box";
    			t3 = space();
    			div0 = element("div");
    			h41 = element("h4");
    			h41.textContent = "Smart Contract Example";
    			t5 = space();
    			p0 = element("p");
    			p0.textContent = "If your contracts compiled and migrated successfully, below will show\n          a stored value of 5 (by default).";
    			t7 = space();
    			p1 = element("p");
    			t8 = text("The stored value is: ");
    			t9 = text(/*storageValue*/ ctx[0]);
    			attr_dev(h1, "class", "masthead text-center text-dark svelte-hqbxra");
    			add_location(h1, file, 49, 6, 2089);
    			attr_dev(h40, "class", "text-center text-primary");
    			add_location(h40, file, 50, 6, 2155);
    			add_location(h41, file, 55, 8, 2322);
    			add_location(p0, file, 56, 8, 2362);
    			add_location(p1, file, 61, 8, 2520);
    			attr_dev(div0, "class", "alert alert-secondary");
    			add_location(div0, file, 54, 6, 2278);
    			attr_dev(div1, "class", "col-8 offset-2");
    			add_location(div1, file, 48, 4, 2054);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file, 47, 2, 2032);
    			attr_dev(div3, "class", "container");
    			add_location(div3, file, 46, 0, 2006);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, h1);
    			append_dev(div1, t1);
    			append_dev(div1, h40);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			append_dev(div0, h41);
    			append_dev(div0, t5);
    			append_dev(div0, p0);
    			append_dev(div0, t7);
    			append_dev(div0, p1);
    			append_dev(p1, t8);
    			append_dev(p1, t9);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*storageValue*/ 1) set_data_dev(t9, /*storageValue*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);

    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	let storageValue;
    	let connected = false;
    	let web3;

    	onMount(() => __awaiter(void 0, void 0, void 0, function* () {
    		const instance = yield loadWeb3();
    		window["web3"] = web3 = instance;
    		yield loadBlockchainData();
    	}));

    	function loadBlockchainData() {
    		return __awaiter(this, void 0, void 0, function* () {
    			const accounts = (yield window.ethereum.send("eth_requestAccounts")).result;
    			const networkId = yield window.web3.eth.net.getId();
    			const simpleStorageData = SimpleStorageContract.networks[networkId];

    			if (simpleStorageData) {
    				const simpleStorage = new web3.eth.Contract(SimpleStorageContract.abi, simpleStorageData.address);
    				console.log(simpleStorage.methods);
    				yield simpleStorage.methods.setStore(5).send({ from: accounts[0] });
    				$$invalidate(0, storageValue = yield simpleStorage.methods.storedData().call());
    				console.log(storageValue);
    				connected = true;
    			} else {
    				window.alert("Simple Storage contract not deployed to detected network.");
    			}
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		__awaiter,
    		SimpleStorageContract,
    		loadWeb3,
    		onMount,
    		storageValue,
    		connected,
    		web3,
    		loadBlockchainData
    	});

    	$$self.$inject_state = $$props => {
    		if ("__awaiter" in $$props) __awaiter = $$props.__awaiter;
    		if ("storageValue" in $$props) $$invalidate(0, storageValue = $$props.storageValue);
    		if ("connected" in $$props) connected = $$props.connected;
    		if ("web3" in $$props) web3 = $$props.web3;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [storageValue];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
        props: {
            name: 'world'
        }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
