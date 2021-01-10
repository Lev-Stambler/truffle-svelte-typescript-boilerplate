
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
    function empty() {
        return text('');
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
    let outros;
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
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
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

    /* src/components/Information.svelte generated by Svelte v3.31.2 */

    const file = "src/components/Information.svelte";

    // (6:0) {:else}
    function create_else_block(ctx) {
    	let div;
    	let h4;
    	let t1;
    	let p0;
    	let p1;
    	let p2;
    	let t4;
    	let ul;
    	let li0;
    	let t5;
    	let a0;
    	let t7;
    	let t8;
    	let li1;
    	let t9;
    	let a1;
    	let t11;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h4 = element("h4");
    			h4.textContent = "Not connected";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Could not connect to the blockchain!";
    			p1 = element("p");
    			p2 = element("p");
    			p2.textContent = "Check that:";
    			t4 = space();
    			ul = element("ul");
    			li0 = element("li");
    			t5 = text("Your ");
    			a0 = element("a");
    			a0.textContent = "metamask";
    			t7 = text(" settings are correct.");
    			t8 = space();
    			li1 = element("li");
    			t9 = text("You are running an ethereum ");
    			a1 = element("a");
    			a1.textContent = "testrpc";
    			t11 = text(".");
    			add_location(h4, file, 7, 2, 173);
    			add_location(p0, file, 8, 2, 198);
    			add_location(p1, file, 8, 41, 237);
    			add_location(p2, file, 9, 2, 243);
    			attr_dev(a0, "href", "https://metamask.io/");
    			attr_dev(a0, "target", "_blank");
    			add_location(a0, file, 11, 13, 282);
    			add_location(li0, file, 11, 4, 273);
    			attr_dev(a1, "href", "https://www.npmjs.com/package/truffle-testrpc");
    			attr_dev(a1, "target", "_blank");
    			add_location(a1, file, 12, 36, 405);
    			add_location(li1, file, 12, 4, 373);
    			add_location(ul, file, 10, 2, 264);
    			attr_dev(div, "class", "alert alert-danger");
    			add_location(div, file, 6, 0, 138);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h4);
    			append_dev(div, t1);
    			append_dev(div, p0);
    			append_dev(div, p1);
    			append_dev(div, p2);
    			append_dev(div, t4);
    			append_dev(div, ul);
    			append_dev(ul, li0);
    			append_dev(li0, t5);
    			append_dev(li0, a0);
    			append_dev(li0, t7);
    			append_dev(ul, t8);
    			append_dev(ul, li1);
    			append_dev(li1, t9);
    			append_dev(li1, a1);
    			append_dev(li1, t11);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(6:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1:0) {#if connected}
    function create_if_block(ctx) {
    	let div;
    	let h4;
    	let t1;
    	let p;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h4 = element("h4");
    			h4.textContent = "Good to Go!";
    			t1 = space();
    			p = element("p");
    			p.textContent = "Your Truffle Box is installed and ready.";
    			add_location(h4, file, 2, 2, 52);
    			add_location(p, file, 3, 2, 75);
    			attr_dev(div, "class", "alert alert-success");
    			add_location(div, file, 1, 0, 16);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h4);
    			append_dev(div, t1);
    			append_dev(div, p);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(1:0) {#if connected}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*connected*/ ctx[0]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
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
    	validate_slots("Information", slots, []);
    	let { connected = false } = $$props;
    	const writable_props = ["connected"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Information> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("connected" in $$props) $$invalidate(0, connected = $$props.connected);
    	};

    	$$self.$capture_state = () => ({ connected });

    	$$self.$inject_state = $$props => {
    		if ("connected" in $$props) $$invalidate(0, connected = $$props.connected);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [connected];
    }

    class Information extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { connected: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Information",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get connected() {
    		throw new Error("<Information>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set connected(value) {
    		throw new Error("<Information>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
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
    		type: "function",
    		constant: true
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
    		type: "function",
    		constant: true
    	}
    ];
    var metadata = "{\"compiler\":{\"version\":\"0.7.0+commit.9e61f92b\"},\"language\":\"Solidity\",\"output\":{\"abi\":[{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"string\",\"name\":\"_message\",\"type\":\"string\"}],\"name\":\"StorageSet\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"get\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"retVal\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"x\",\"type\":\"uint256\"}],\"name\":\"setStore\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"storedData\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"}],\"devdoc\":{\"kind\":\"dev\",\"methods\":{},\"version\":1},\"userdoc\":{\"kind\":\"user\",\"methods\":{},\"version\":1}},\"settings\":{\"compilationTarget\":{\"/home/lev/code/blockchain/dapp-site-store/contracts/SimpleStorage.sol\":\"SimpleStorage\"},\"evmVersion\":\"istanbul\",\"libraries\":{},\"metadata\":{\"bytecodeHash\":\"ipfs\"},\"optimizer\":{\"enabled\":false,\"runs\":200},\"remappings\":[]},\"sources\":{\"/home/lev/code/blockchain/dapp-site-store/contracts/SimpleStorage.sol\":{\"keccak256\":\"0x68129a79d3ae5be4eb5ab3fe89b2489eee5d308a13502f9c81a3e4d772418c66\",\"urls\":[\"bzz-raw://c4f0ac4185b642aa429442fe24bfee1c325d7d9690502c909b6232971d8b6c09\",\"dweb:/ipfs/QmYvCSWmmCfX5CSHqtwSYjboE4gLCJrhstjMcqSpeUcXua\"]}},\"version\":1}";
    var bytecode = "0x608060405234801561001057600080fd5b50610167806100206000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c80632a1afcd9146100465780636d4ce63c146100645780637f626f1a14610082575b600080fd5b61004e6100b0565b6040518082815260200191505060405180910390f35b61006c6100b6565b6040518082815260200191505060405180910390f35b6100ae6004803603602081101561009857600080fd5b81019080803590602001909291905050506100bf565b005b60005481565b60008054905090565b806000819055507f60cdc157ca4737a5d39a0e107532616e7bf6946e615228812c7f9bc9f81797a66040518080602001828103825260198152602001807f446174612073746f726564207375636365737366756c6c79210000000000000081525060200191505060405180910390a15056fea2646970667358221220907099c232fd1af4c3b0367acfbaaebe7addd9947df76cad08eb92d68717887a64736f6c63430007000033";
    var deployedBytecode = "0x608060405234801561001057600080fd5b50600436106100415760003560e01c80632a1afcd9146100465780636d4ce63c146100645780637f626f1a14610082575b600080fd5b61004e6100b0565b6040518082815260200191505060405180910390f35b61006c6100b6565b6040518082815260200191505060405180910390f35b6100ae6004803603602081101561009857600080fd5b81019080803590602001909291905050506100bf565b005b60005481565b60008054905090565b806000819055507f60cdc157ca4737a5d39a0e107532616e7bf6946e615228812c7f9bc9f81797a66040518080602001828103825260198152602001807f446174612073746f726564207375636365737366756c6c79210000000000000081525060200191505060405180910390a15056fea2646970667358221220907099c232fd1af4c3b0367acfbaaebe7addd9947df76cad08eb92d68717887a64736f6c63430007000033";
    var immutableReferences = {
    };
    var sourceMap = "25:308:1:-:0;;;;;;;;;;;;;;;;;;;";
    var deployedSourceMap = "25:308:1:-:0;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;94:22;;;:::i;:::-;;;;;;;;;;;;;;;;;;;248:83;;;:::i;:::-;;;;;;;;;;;;;;;;;;;123:119;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::i;:::-;;94:22;;;;:::o;248:83::-;284:11;314:10;;307:17;;248:83;:::o;123:119::-;179:1;166:10;:14;;;;196:39;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;123:119;:::o";
    var source = "pragma solidity ^0.7.0;\n\ncontract SimpleStorage {\n    event StorageSet(string _message);\n\n    uint public storedData;\n\n    function setStore(uint x) public {\n        storedData = x;\n\n        emit StorageSet(\"Data stored successfully!\");\n    }\n\n    function get() view public returns (uint retVal) {\n        return storedData;\n    }\n}";
    var sourcePath = "/home/lev/code/blockchain/dapp-site-store/contracts/SimpleStorage.sol";
    var ast = {
    	absolutePath: "/home/lev/code/blockchain/dapp-site-store/contracts/SimpleStorage.sol",
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
    		absolutePath: "/home/lev/code/blockchain/dapp-site-store/contracts/SimpleStorage.sol",
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
    	"5777": {
    		events: {
    			"0x60cdc157ca4737a5d39a0e107532616e7bf6946e615228812c7f9bc9f81797a6": {
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
    			}
    		},
    		links: {
    		},
    		address: "0x5B6458945b6F039A50197CC9056384923ca00235",
    		transactionHash: "0x4f57dca71db1f4153f727a48345dbdda157cb076d6ad9d84b1ac55f962fa4a39"
    	}
    };
    var schemaVersion = "3.3.3";
    var updatedAt = "2021-01-10T20:45:16.661Z";
    var networkType = "ethereum";
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
    	networkType: networkType,
    	devdoc: devdoc,
    	userdoc: userdoc
    };

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    /**
     * Copyright (c) 2014-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     */

    var runtime_1 = createCommonjsModule(function (module) {
    var runtime = (function (exports) {

      var Op = Object.prototype;
      var hasOwn = Op.hasOwnProperty;
      var undefined$1; // More compressible than void 0.
      var $Symbol = typeof Symbol === "function" ? Symbol : {};
      var iteratorSymbol = $Symbol.iterator || "@@iterator";
      var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
      var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

      function define(obj, key, value) {
        Object.defineProperty(obj, key, {
          value: value,
          enumerable: true,
          configurable: true,
          writable: true
        });
        return obj[key];
      }
      try {
        // IE 8 has a broken Object.defineProperty that only works on DOM objects.
        define({}, "");
      } catch (err) {
        define = function(obj, key, value) {
          return obj[key] = value;
        };
      }

      function wrap(innerFn, outerFn, self, tryLocsList) {
        // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
        var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
        var generator = Object.create(protoGenerator.prototype);
        var context = new Context(tryLocsList || []);

        // The ._invoke method unifies the implementations of the .next,
        // .throw, and .return methods.
        generator._invoke = makeInvokeMethod(innerFn, self, context);

        return generator;
      }
      exports.wrap = wrap;

      // Try/catch helper to minimize deoptimizations. Returns a completion
      // record like context.tryEntries[i].completion. This interface could
      // have been (and was previously) designed to take a closure to be
      // invoked without arguments, but in all the cases we care about we
      // already have an existing method we want to call, so there's no need
      // to create a new function object. We can even get away with assuming
      // the method takes exactly one argument, since that happens to be true
      // in every case, so we don't have to touch the arguments object. The
      // only additional allocation required is the completion record, which
      // has a stable shape and so hopefully should be cheap to allocate.
      function tryCatch(fn, obj, arg) {
        try {
          return { type: "normal", arg: fn.call(obj, arg) };
        } catch (err) {
          return { type: "throw", arg: err };
        }
      }

      var GenStateSuspendedStart = "suspendedStart";
      var GenStateSuspendedYield = "suspendedYield";
      var GenStateExecuting = "executing";
      var GenStateCompleted = "completed";

      // Returning this object from the innerFn has the same effect as
      // breaking out of the dispatch switch statement.
      var ContinueSentinel = {};

      // Dummy constructor functions that we use as the .constructor and
      // .constructor.prototype properties for functions that return Generator
      // objects. For full spec compliance, you may wish to configure your
      // minifier not to mangle the names of these two functions.
      function Generator() {}
      function GeneratorFunction() {}
      function GeneratorFunctionPrototype() {}

      // This is a polyfill for %IteratorPrototype% for environments that
      // don't natively support it.
      var IteratorPrototype = {};
      IteratorPrototype[iteratorSymbol] = function () {
        return this;
      };

      var getProto = Object.getPrototypeOf;
      var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
      if (NativeIteratorPrototype &&
          NativeIteratorPrototype !== Op &&
          hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
        // This environment has a native %IteratorPrototype%; use it instead
        // of the polyfill.
        IteratorPrototype = NativeIteratorPrototype;
      }

      var Gp = GeneratorFunctionPrototype.prototype =
        Generator.prototype = Object.create(IteratorPrototype);
      GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
      GeneratorFunctionPrototype.constructor = GeneratorFunction;
      GeneratorFunction.displayName = define(
        GeneratorFunctionPrototype,
        toStringTagSymbol,
        "GeneratorFunction"
      );

      // Helper for defining the .next, .throw, and .return methods of the
      // Iterator interface in terms of a single ._invoke method.
      function defineIteratorMethods(prototype) {
        ["next", "throw", "return"].forEach(function(method) {
          define(prototype, method, function(arg) {
            return this._invoke(method, arg);
          });
        });
      }

      exports.isGeneratorFunction = function(genFun) {
        var ctor = typeof genFun === "function" && genFun.constructor;
        return ctor
          ? ctor === GeneratorFunction ||
            // For the native GeneratorFunction constructor, the best we can
            // do is to check its .name property.
            (ctor.displayName || ctor.name) === "GeneratorFunction"
          : false;
      };

      exports.mark = function(genFun) {
        if (Object.setPrototypeOf) {
          Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
        } else {
          genFun.__proto__ = GeneratorFunctionPrototype;
          define(genFun, toStringTagSymbol, "GeneratorFunction");
        }
        genFun.prototype = Object.create(Gp);
        return genFun;
      };

      // Within the body of any async function, `await x` is transformed to
      // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
      // `hasOwn.call(value, "__await")` to determine if the yielded value is
      // meant to be awaited.
      exports.awrap = function(arg) {
        return { __await: arg };
      };

      function AsyncIterator(generator, PromiseImpl) {
        function invoke(method, arg, resolve, reject) {
          var record = tryCatch(generator[method], generator, arg);
          if (record.type === "throw") {
            reject(record.arg);
          } else {
            var result = record.arg;
            var value = result.value;
            if (value &&
                typeof value === "object" &&
                hasOwn.call(value, "__await")) {
              return PromiseImpl.resolve(value.__await).then(function(value) {
                invoke("next", value, resolve, reject);
              }, function(err) {
                invoke("throw", err, resolve, reject);
              });
            }

            return PromiseImpl.resolve(value).then(function(unwrapped) {
              // When a yielded Promise is resolved, its final value becomes
              // the .value of the Promise<{value,done}> result for the
              // current iteration.
              result.value = unwrapped;
              resolve(result);
            }, function(error) {
              // If a rejected Promise was yielded, throw the rejection back
              // into the async generator function so it can be handled there.
              return invoke("throw", error, resolve, reject);
            });
          }
        }

        var previousPromise;

        function enqueue(method, arg) {
          function callInvokeWithMethodAndArg() {
            return new PromiseImpl(function(resolve, reject) {
              invoke(method, arg, resolve, reject);
            });
          }

          return previousPromise =
            // If enqueue has been called before, then we want to wait until
            // all previous Promises have been resolved before calling invoke,
            // so that results are always delivered in the correct order. If
            // enqueue has not been called before, then it is important to
            // call invoke immediately, without waiting on a callback to fire,
            // so that the async generator function has the opportunity to do
            // any necessary setup in a predictable way. This predictability
            // is why the Promise constructor synchronously invokes its
            // executor callback, and why async functions synchronously
            // execute code before the first await. Since we implement simple
            // async functions in terms of async generators, it is especially
            // important to get this right, even though it requires care.
            previousPromise ? previousPromise.then(
              callInvokeWithMethodAndArg,
              // Avoid propagating failures to Promises returned by later
              // invocations of the iterator.
              callInvokeWithMethodAndArg
            ) : callInvokeWithMethodAndArg();
        }

        // Define the unified helper method that is used to implement .next,
        // .throw, and .return (see defineIteratorMethods).
        this._invoke = enqueue;
      }

      defineIteratorMethods(AsyncIterator.prototype);
      AsyncIterator.prototype[asyncIteratorSymbol] = function () {
        return this;
      };
      exports.AsyncIterator = AsyncIterator;

      // Note that simple async functions are implemented on top of
      // AsyncIterator objects; they just return a Promise for the value of
      // the final result produced by the iterator.
      exports.async = function(innerFn, outerFn, self, tryLocsList, PromiseImpl) {
        if (PromiseImpl === void 0) PromiseImpl = Promise;

        var iter = new AsyncIterator(
          wrap(innerFn, outerFn, self, tryLocsList),
          PromiseImpl
        );

        return exports.isGeneratorFunction(outerFn)
          ? iter // If outerFn is a generator, return the full iterator.
          : iter.next().then(function(result) {
              return result.done ? result.value : iter.next();
            });
      };

      function makeInvokeMethod(innerFn, self, context) {
        var state = GenStateSuspendedStart;

        return function invoke(method, arg) {
          if (state === GenStateExecuting) {
            throw new Error("Generator is already running");
          }

          if (state === GenStateCompleted) {
            if (method === "throw") {
              throw arg;
            }

            // Be forgiving, per 25.3.3.3.3 of the spec:
            // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
            return doneResult();
          }

          context.method = method;
          context.arg = arg;

          while (true) {
            var delegate = context.delegate;
            if (delegate) {
              var delegateResult = maybeInvokeDelegate(delegate, context);
              if (delegateResult) {
                if (delegateResult === ContinueSentinel) continue;
                return delegateResult;
              }
            }

            if (context.method === "next") {
              // Setting context._sent for legacy support of Babel's
              // function.sent implementation.
              context.sent = context._sent = context.arg;

            } else if (context.method === "throw") {
              if (state === GenStateSuspendedStart) {
                state = GenStateCompleted;
                throw context.arg;
              }

              context.dispatchException(context.arg);

            } else if (context.method === "return") {
              context.abrupt("return", context.arg);
            }

            state = GenStateExecuting;

            var record = tryCatch(innerFn, self, context);
            if (record.type === "normal") {
              // If an exception is thrown from innerFn, we leave state ===
              // GenStateExecuting and loop back for another invocation.
              state = context.done
                ? GenStateCompleted
                : GenStateSuspendedYield;

              if (record.arg === ContinueSentinel) {
                continue;
              }

              return {
                value: record.arg,
                done: context.done
              };

            } else if (record.type === "throw") {
              state = GenStateCompleted;
              // Dispatch the exception by looping back around to the
              // context.dispatchException(context.arg) call above.
              context.method = "throw";
              context.arg = record.arg;
            }
          }
        };
      }

      // Call delegate.iterator[context.method](context.arg) and handle the
      // result, either by returning a { value, done } result from the
      // delegate iterator, or by modifying context.method and context.arg,
      // setting context.delegate to null, and returning the ContinueSentinel.
      function maybeInvokeDelegate(delegate, context) {
        var method = delegate.iterator[context.method];
        if (method === undefined$1) {
          // A .throw or .return when the delegate iterator has no .throw
          // method always terminates the yield* loop.
          context.delegate = null;

          if (context.method === "throw") {
            // Note: ["return"] must be used for ES3 parsing compatibility.
            if (delegate.iterator["return"]) {
              // If the delegate iterator has a return method, give it a
              // chance to clean up.
              context.method = "return";
              context.arg = undefined$1;
              maybeInvokeDelegate(delegate, context);

              if (context.method === "throw") {
                // If maybeInvokeDelegate(context) changed context.method from
                // "return" to "throw", let that override the TypeError below.
                return ContinueSentinel;
              }
            }

            context.method = "throw";
            context.arg = new TypeError(
              "The iterator does not provide a 'throw' method");
          }

          return ContinueSentinel;
        }

        var record = tryCatch(method, delegate.iterator, context.arg);

        if (record.type === "throw") {
          context.method = "throw";
          context.arg = record.arg;
          context.delegate = null;
          return ContinueSentinel;
        }

        var info = record.arg;

        if (! info) {
          context.method = "throw";
          context.arg = new TypeError("iterator result is not an object");
          context.delegate = null;
          return ContinueSentinel;
        }

        if (info.done) {
          // Assign the result of the finished delegate to the temporary
          // variable specified by delegate.resultName (see delegateYield).
          context[delegate.resultName] = info.value;

          // Resume execution at the desired location (see delegateYield).
          context.next = delegate.nextLoc;

          // If context.method was "throw" but the delegate handled the
          // exception, let the outer generator proceed normally. If
          // context.method was "next", forget context.arg since it has been
          // "consumed" by the delegate iterator. If context.method was
          // "return", allow the original .return call to continue in the
          // outer generator.
          if (context.method !== "return") {
            context.method = "next";
            context.arg = undefined$1;
          }

        } else {
          // Re-yield the result returned by the delegate method.
          return info;
        }

        // The delegate iterator is finished, so forget it and continue with
        // the outer generator.
        context.delegate = null;
        return ContinueSentinel;
      }

      // Define Generator.prototype.{next,throw,return} in terms of the
      // unified ._invoke helper method.
      defineIteratorMethods(Gp);

      define(Gp, toStringTagSymbol, "Generator");

      // A Generator should always return itself as the iterator object when the
      // @@iterator function is called on it. Some browsers' implementations of the
      // iterator prototype chain incorrectly implement this, causing the Generator
      // object to not be returned from this call. This ensures that doesn't happen.
      // See https://github.com/facebook/regenerator/issues/274 for more details.
      Gp[iteratorSymbol] = function() {
        return this;
      };

      Gp.toString = function() {
        return "[object Generator]";
      };

      function pushTryEntry(locs) {
        var entry = { tryLoc: locs[0] };

        if (1 in locs) {
          entry.catchLoc = locs[1];
        }

        if (2 in locs) {
          entry.finallyLoc = locs[2];
          entry.afterLoc = locs[3];
        }

        this.tryEntries.push(entry);
      }

      function resetTryEntry(entry) {
        var record = entry.completion || {};
        record.type = "normal";
        delete record.arg;
        entry.completion = record;
      }

      function Context(tryLocsList) {
        // The root entry object (effectively a try statement without a catch
        // or a finally block) gives us a place to store values thrown from
        // locations where there is no enclosing try statement.
        this.tryEntries = [{ tryLoc: "root" }];
        tryLocsList.forEach(pushTryEntry, this);
        this.reset(true);
      }

      exports.keys = function(object) {
        var keys = [];
        for (var key in object) {
          keys.push(key);
        }
        keys.reverse();

        // Rather than returning an object with a next method, we keep
        // things simple and return the next function itself.
        return function next() {
          while (keys.length) {
            var key = keys.pop();
            if (key in object) {
              next.value = key;
              next.done = false;
              return next;
            }
          }

          // To avoid creating an additional object, we just hang the .value
          // and .done properties off the next function object itself. This
          // also ensures that the minifier will not anonymize the function.
          next.done = true;
          return next;
        };
      };

      function values(iterable) {
        if (iterable) {
          var iteratorMethod = iterable[iteratorSymbol];
          if (iteratorMethod) {
            return iteratorMethod.call(iterable);
          }

          if (typeof iterable.next === "function") {
            return iterable;
          }

          if (!isNaN(iterable.length)) {
            var i = -1, next = function next() {
              while (++i < iterable.length) {
                if (hasOwn.call(iterable, i)) {
                  next.value = iterable[i];
                  next.done = false;
                  return next;
                }
              }

              next.value = undefined$1;
              next.done = true;

              return next;
            };

            return next.next = next;
          }
        }

        // Return an iterator with no values.
        return { next: doneResult };
      }
      exports.values = values;

      function doneResult() {
        return { value: undefined$1, done: true };
      }

      Context.prototype = {
        constructor: Context,

        reset: function(skipTempReset) {
          this.prev = 0;
          this.next = 0;
          // Resetting context._sent for legacy support of Babel's
          // function.sent implementation.
          this.sent = this._sent = undefined$1;
          this.done = false;
          this.delegate = null;

          this.method = "next";
          this.arg = undefined$1;

          this.tryEntries.forEach(resetTryEntry);

          if (!skipTempReset) {
            for (var name in this) {
              // Not sure about the optimal order of these conditions:
              if (name.charAt(0) === "t" &&
                  hasOwn.call(this, name) &&
                  !isNaN(+name.slice(1))) {
                this[name] = undefined$1;
              }
            }
          }
        },

        stop: function() {
          this.done = true;

          var rootEntry = this.tryEntries[0];
          var rootRecord = rootEntry.completion;
          if (rootRecord.type === "throw") {
            throw rootRecord.arg;
          }

          return this.rval;
        },

        dispatchException: function(exception) {
          if (this.done) {
            throw exception;
          }

          var context = this;
          function handle(loc, caught) {
            record.type = "throw";
            record.arg = exception;
            context.next = loc;

            if (caught) {
              // If the dispatched exception was caught by a catch block,
              // then let that catch block handle the exception normally.
              context.method = "next";
              context.arg = undefined$1;
            }

            return !! caught;
          }

          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];
            var record = entry.completion;

            if (entry.tryLoc === "root") {
              // Exception thrown outside of any try block that could handle
              // it, so set the completion value of the entire function to
              // throw the exception.
              return handle("end");
            }

            if (entry.tryLoc <= this.prev) {
              var hasCatch = hasOwn.call(entry, "catchLoc");
              var hasFinally = hasOwn.call(entry, "finallyLoc");

              if (hasCatch && hasFinally) {
                if (this.prev < entry.catchLoc) {
                  return handle(entry.catchLoc, true);
                } else if (this.prev < entry.finallyLoc) {
                  return handle(entry.finallyLoc);
                }

              } else if (hasCatch) {
                if (this.prev < entry.catchLoc) {
                  return handle(entry.catchLoc, true);
                }

              } else if (hasFinally) {
                if (this.prev < entry.finallyLoc) {
                  return handle(entry.finallyLoc);
                }

              } else {
                throw new Error("try statement without catch or finally");
              }
            }
          }
        },

        abrupt: function(type, arg) {
          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];
            if (entry.tryLoc <= this.prev &&
                hasOwn.call(entry, "finallyLoc") &&
                this.prev < entry.finallyLoc) {
              var finallyEntry = entry;
              break;
            }
          }

          if (finallyEntry &&
              (type === "break" ||
               type === "continue") &&
              finallyEntry.tryLoc <= arg &&
              arg <= finallyEntry.finallyLoc) {
            // Ignore the finally entry if control is not jumping to a
            // location outside the try/catch block.
            finallyEntry = null;
          }

          var record = finallyEntry ? finallyEntry.completion : {};
          record.type = type;
          record.arg = arg;

          if (finallyEntry) {
            this.method = "next";
            this.next = finallyEntry.finallyLoc;
            return ContinueSentinel;
          }

          return this.complete(record);
        },

        complete: function(record, afterLoc) {
          if (record.type === "throw") {
            throw record.arg;
          }

          if (record.type === "break" ||
              record.type === "continue") {
            this.next = record.arg;
          } else if (record.type === "return") {
            this.rval = this.arg = record.arg;
            this.method = "return";
            this.next = "end";
          } else if (record.type === "normal" && afterLoc) {
            this.next = afterLoc;
          }

          return ContinueSentinel;
        },

        finish: function(finallyLoc) {
          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];
            if (entry.finallyLoc === finallyLoc) {
              this.complete(entry.completion, entry.afterLoc);
              resetTryEntry(entry);
              return ContinueSentinel;
            }
          }
        },

        "catch": function(tryLoc) {
          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];
            if (entry.tryLoc === tryLoc) {
              var record = entry.completion;
              if (record.type === "throw") {
                var thrown = record.arg;
                resetTryEntry(entry);
              }
              return thrown;
            }
          }

          // The context.catch method must only be called with a location
          // argument that corresponds to a known catch block.
          throw new Error("illegal catch attempt");
        },

        delegateYield: function(iterable, resultName, nextLoc) {
          this.delegate = {
            iterator: values(iterable),
            resultName: resultName,
            nextLoc: nextLoc
          };

          if (this.method === "next") {
            // Deliberately forget the last sent value so that we don't
            // accidentally pass it on to the delegate.
            this.arg = undefined$1;
          }

          return ContinueSentinel;
        }
      };

      // Regardless of whether this script is executing as a CommonJS module
      // or not, return the runtime object so that we can declare the variable
      // regeneratorRuntime in the outer scope, which allows this module to be
      // injected easily by `bin/regenerator --include-runtime script.js`.
      return exports;

    }(
      // If this script is executing as a CommonJS module, use module.exports
      // as the regeneratorRuntime namespace. Otherwise create a new empty
      // object. Either way, the resulting object will be used to initialize
      // the regeneratorRuntime variable at the top of this file.
       module.exports 
    ));

    try {
      regeneratorRuntime = runtime;
    } catch (accidentalStrictMode) {
      // This module should not be running in strict mode, so the above
      // assignment should always work unless something is misconfigured. Just
      // in case runtime.js accidentally runs in strict mode, we can escape
      // strict mode using a global Function call. This could conceivably fail
      // if a Content Security Policy forbids using Function, but in that case
      // the proper solution is to fix the accidental strict mode problem. If
      // you've misconfigured your bundler to force strict mode and applied a
      // CSP to forbid Function, and you're not willing to fix either of those
      // problems, please detail your unique predicament in a GitHub issue.
      Function("r", "regeneratorRuntime = r")(runtime);
    }
    });

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

    function loadWeb3 () {
      return _ref.apply(this, arguments);
    }

    function _ref() {
      _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (window.ethereum) {
                  window.web3 = new window.Web3(window.ethereum); // await window.ethereum.enable()
                } else if (window.web3) {
                  window.web3 = new window.Web3(window.web3.currentProvider);
                } else {
                  window.alert("Non-Ethereum browser detected. You should consider trying MetaMask!");
                }

                return _context.abrupt("return", window.web3);

              case 2:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
      return _ref.apply(this, arguments);
    }

    /* src/components/App.svelte generated by Svelte v3.31.2 */

    const { console: console_1 } = globals;
    const file$1 = "src/components/App.svelte";

    function create_fragment$1(ctx) {
    	let div3;
    	let div2;
    	let div1;
    	let h1;
    	let t1;
    	let h40;
    	let t3;
    	let information;
    	let t4;
    	let div0;
    	let h41;
    	let t6;
    	let p0;
    	let t8;
    	let p1;
    	let t9;
    	let t10;
    	let current;

    	information = new Information({
    			props: { connected: /*connected*/ ctx[1] },
    			$$inline: true
    		});

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
    			create_component(information.$$.fragment);
    			t4 = space();
    			div0 = element("div");
    			h41 = element("h4");
    			h41.textContent = "Smart Contract Example";
    			t6 = space();
    			p0 = element("p");
    			p0.textContent = "If your contracts compiled and migrated successfully, below will show\n          a stored value of 5 (by default).";
    			t8 = space();
    			p1 = element("p");
    			t9 = text("The stored value is: ");
    			t10 = text(/*storageValue*/ ctx[0]);
    			attr_dev(h1, "class", "masthead text-center text-dark svelte-eo0j4y");
    			add_location(h1, file$1, 44, 6, 1308);
    			attr_dev(h40, "class", "text-center text-primary");
    			add_location(h40, file$1, 45, 6, 1374);
    			add_location(h41, file$1, 50, 8, 1532);
    			add_location(p0, file$1, 51, 8, 1572);
    			add_location(p1, file$1, 56, 8, 1730);
    			attr_dev(div0, "class", "alert alert-secondary");
    			add_location(div0, file$1, 49, 6, 1488);
    			attr_dev(div1, "class", "col-8 offset-2");
    			add_location(div1, file$1, 43, 4, 1273);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$1, 42, 2, 1251);
    			attr_dev(div3, "class", "container");
    			add_location(div3, file$1, 41, 0, 1225);
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
    			mount_component(information, div1, null);
    			append_dev(div1, t4);
    			append_dev(div1, div0);
    			append_dev(div0, h41);
    			append_dev(div0, t6);
    			append_dev(div0, p0);
    			append_dev(div0, t8);
    			append_dev(div0, p1);
    			append_dev(p1, t9);
    			append_dev(p1, t10);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const information_changes = {};
    			if (dirty & /*connected*/ 2) information_changes.connected = /*connected*/ ctx[1];
    			information.$set(information_changes);
    			if (!current || dirty & /*storageValue*/ 1) set_data_dev(t10, /*storageValue*/ ctx[0]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(information.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(information.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_component(information);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let storageValue;
    	let connected = false;
    	let web3;

    	onMount(async () => {
    		const instance = await loadWeb3();
    		window["web3"] = web3 = instance;
    		await loadBlockchainData();
    	});

    	async function loadBlockchainData() {
    		const accounts = (await window.ethereum.send("eth_requestAccounts")).result;
    		const networkId = await window.web3.eth.net.getId();
    		const simpleStorageData = SimpleStorageContract.networks[networkId];

    		if (simpleStorageData) {
    			const simpleStorage = new web3.eth.Contract(SimpleStorageContract.abi, simpleStorageData.address);
    			console.log(simpleStorage.methods);
    			await simpleStorage.methods.setStore(5).send({ from: accounts[0] });
    			$$invalidate(0, storageValue = await simpleStorage.methods.storedData().call());
    			console.log(storageValue);
    			$$invalidate(1, connected = true);
    		} else {
    			window.alert("Simple Storage contract not deployed to detected network.");
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Information,
    		SimpleStorageContract,
    		loadWeb3,
    		onMount,
    		storageValue,
    		connected,
    		web3,
    		loadBlockchainData
    	});

    	$$self.$inject_state = $$props => {
    		if ("storageValue" in $$props) $$invalidate(0, storageValue = $$props.storageValue);
    		if ("connected" in $$props) $$invalidate(1, connected = $$props.connected);
    		if ("web3" in $$props) web3 = $$props.web3;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [storageValue, connected];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    var app = new App({
      target: document.body,
      props: {}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
