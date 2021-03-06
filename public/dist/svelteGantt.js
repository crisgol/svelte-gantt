var SvelteGantt = (function (moment) {
	'use strict';

	function noop() {}

	function assign(tar, src) {
		for (var k in src) tar[k] = src[k];
		return tar;
	}

	function assignTrue(tar, src) {
		for (var k in src) tar[k] = 1;
		return tar;
	}

	function callAfter(fn, i) {
		if (i === 0) fn();
		return () => {
			if (!--i) fn();
		};
	}

	function addLoc(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function run(fn) {
		fn();
	}

	function append(target, node) {
		target.appendChild(node);
	}

	function insert(target, node, anchor) {
		target.insertBefore(node, anchor);
	}

	function detachNode(node) {
		node.parentNode.removeChild(node);
	}

	function detachBetween(before, after) {
		while (before.nextSibling && before.nextSibling !== after) {
			before.parentNode.removeChild(before.nextSibling);
		}
	}

	function destroyEach(iterations, detach) {
		for (var i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detach);
		}
	}

	function createElement(name) {
		return document.createElement(name);
	}

	function createText(data) {
		return document.createTextNode(data);
	}

	function createComment() {
		return document.createComment('');
	}

	function addListener(node, event, handler, options) {
		node.addEventListener(event, handler, options);
	}

	function removeListener(node, event, handler, options) {
		node.removeEventListener(event, handler, options);
	}

	function setData(text, data) {
		text.data = '' + data;
	}

	function setStyle(node, key, value) {
		node.style.setProperty(key, value);
	}

	function addResizeListener(element, fn) {
		if (getComputedStyle(element).position === 'static') {
			element.style.position = 'relative';
		}

		const object = document.createElement('object');
		object.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; height: 100%; width: 100%; overflow: hidden; pointer-events: none; z-index: -1;');
		object.type = 'text/html';

		let win;

		object.onload = () => {
			win = object.contentDocument.defaultView;
			win.addEventListener('resize', fn);
		};

		if (/Trident/.test(navigator.userAgent)) {
			element.appendChild(object);
			object.data = 'about:blank';
		} else {
			object.data = 'about:blank';
			element.appendChild(object);
		}

		return {
			cancel: () => {
				win && win.removeEventListener && win.removeEventListener('resize', fn);
				element.removeChild(object);
			}
		};
	}

	function toggleClass(element, name, toggle) {
		element.classList[toggle ? 'add' : 'remove'](name);
	}

	function destroyBlock(block, lookup) {
		block.d(1);
		lookup[block.key] = null;
	}

	function outroAndDestroyBlock(block, lookup) {
		block.o(function() {
			destroyBlock(block, lookup);
		});
	}

	function updateKeyedEach(old_blocks, component, changed, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, intro_method, next, get_context) {
		var o = old_blocks.length;
		var n = list.length;

		var i = o;
		var old_indexes = {};
		while (i--) old_indexes[old_blocks[i].key] = i;

		var new_blocks = [];
		var new_lookup = {};
		var deltas = {};

		var i = n;
		while (i--) {
			var child_ctx = get_context(ctx, list, i);
			var key = get_key(child_ctx);
			var block = lookup[key];

			if (!block) {
				block = create_each_block(component, key, child_ctx);
				block.c();
			} else if (dynamic) {
				block.p(changed, child_ctx);
			}

			new_blocks[i] = new_lookup[key] = block;

			if (key in old_indexes) deltas[key] = Math.abs(i - old_indexes[key]);
		}

		var will_move = {};
		var did_move = {};

		function insert(block) {
			block[intro_method](node, next);
			lookup[block.key] = block;
			next = block.first;
			n--;
		}

		while (o && n) {
			var new_block = new_blocks[n - 1];
			var old_block = old_blocks[o - 1];
			var new_key = new_block.key;
			var old_key = old_block.key;

			if (new_block === old_block) {
				// do nothing
				next = new_block.first;
				o--;
				n--;
			}

			else if (!new_lookup[old_key]) {
				// remove old block
				destroy(old_block, lookup);
				o--;
			}

			else if (!lookup[new_key] || will_move[new_key]) {
				insert(new_block);
			}

			else if (did_move[old_key]) {
				o--;

			} else if (deltas[new_key] > deltas[old_key]) {
				did_move[new_key] = true;
				insert(new_block);

			} else {
				will_move[old_key] = true;
				o--;
			}
		}

		while (o--) {
			var old_block = old_blocks[o];
			if (!new_lookup[old_block.key]) destroy(old_block, lookup);
		}

		while (n) insert(new_blocks[n - 1]);

		return new_blocks;
	}

	function getSpreadUpdate(levels, updates) {
		var update = {};

		var to_null_out = {};
		var accounted_for = {};

		var i = levels.length;
		while (i--) {
			var o = levels[i];
			var n = updates[i];

			if (n) {
				for (var key in o) {
					if (!(key in n)) to_null_out[key] = 1;
				}

				for (var key in n) {
					if (!accounted_for[key]) {
						update[key] = n[key];
						accounted_for[key] = 1;
					}
				}

				levels[i] = n;
			} else {
				for (var key in o) {
					accounted_for[key] = 1;
				}
			}
		}

		for (var key in to_null_out) {
			if (!(key in update)) update[key] = undefined;
		}

		return update;
	}

	function blankObject() {
		return Object.create(null);
	}

	function destroy(detach) {
		this.destroy = noop;
		this.fire('destroy');
		this.set = noop;

		this._fragment.d(detach !== false);
		this._fragment = null;
		this._state = {};
	}

	function destroyDev(detach) {
		destroy.call(this, detach);
		this.destroy = function() {
			console.warn('Component was already destroyed');
		};
	}

	function _differs(a, b) {
		return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
	}

	function _differsImmutable(a, b) {
		return a != a ? b == b : a !== b;
	}

	function fire(eventName, data) {
		var handlers =
			eventName in this._handlers && this._handlers[eventName].slice();
		if (!handlers) return;

		for (var i = 0; i < handlers.length; i += 1) {
			var handler = handlers[i];

			if (!handler.__calling) {
				try {
					handler.__calling = true;
					handler.call(this, data);
				} finally {
					handler.__calling = false;
				}
			}
		}
	}

	function flush(component) {
		component._lock = true;
		callAll(component._beforecreate);
		callAll(component._oncreate);
		callAll(component._aftercreate);
		component._lock = false;
	}

	function get() {
		return this._state;
	}

	function init(component, options) {
		component._handlers = blankObject();
		component._slots = blankObject();
		component._bind = options._bind;
		component._staged = {};

		component.options = options;
		component.root = options.root || component;
		component.store = options.store || component.root.store;

		if (!options.root) {
			component._beforecreate = [];
			component._oncreate = [];
			component._aftercreate = [];
		}
	}

	function on(eventName, handler) {
		var handlers = this._handlers[eventName] || (this._handlers[eventName] = []);
		handlers.push(handler);

		return {
			cancel: function() {
				var index = handlers.indexOf(handler);
				if (~index) handlers.splice(index, 1);
			}
		};
	}

	function set(newState) {
		this._set(assign({}, newState));
		if (this.root._lock) return;
		flush(this.root);
	}

	function _set(newState) {
		var oldState = this._state,
			changed = {},
			dirty = false;

		newState = assign(this._staged, newState);
		this._staged = {};

		for (var key in newState) {
			if (this._differs(newState[key], oldState[key])) changed[key] = dirty = true;
		}
		if (!dirty) return;

		this._state = assign(assign({}, oldState), newState);
		this._recompute(changed, this._state);
		if (this._bind) this._bind(changed, this._state);

		if (this._fragment) {
			this.fire("state", { changed: changed, current: this._state, previous: oldState });
			this._fragment.p(changed, this._state);
			this.fire("update", { changed: changed, current: this._state, previous: oldState });
		}
	}

	function _stage(newState) {
		assign(this._staged, newState);
	}

	function setDev(newState) {
		if (typeof newState !== 'object') {
			throw new Error(
				this._debugName + '.set was called without an object of data key-values to update.'
			);
		}

		this._checkReadOnly(newState);
		set.call(this, newState);
	}

	function callAll(fns) {
		while (fns && fns.length) fns.shift()();
	}

	function _mount(target, anchor) {
		this._fragment[this._fragment.i ? 'i' : 'm'](target, anchor || null);
	}

	function removeFromStore() {
		this.store._remove(this);
	}

	var protoDev = {
		destroy: destroyDev,
		get,
		fire,
		on,
		set: setDev,
		_recompute: noop,
		_set,
		_stage,
		_mount,
		_differs
	};

	function isLeftClick(event) {
	    return event.which === 1;
	}
	/**
	 * Gets mouse position within an element
	 * @param node
	 * @param event
	 */
	function getRelativePos(node, event) {
	    const rect = node.getBoundingClientRect();
	    const x = event.clientX - rect.left; //x position within the element.
	    const y = event.clientY - rect.top; //y position within the element.
	    return {
	        x: x,
	        y: y
	    };
	}
	/**
	 * Adds an event listener that triggers once.
	 * @param target
	 * @param type
	 * @param listener
	 * @param addOptions
	 * @param removeOptions
	 */
	function addEventListenerOnce(target, type, listener, addOptions, removeOptions) {
	    target.addEventListener(type, function fn(event) {
	        target.removeEventListener(type, fn, removeOptions);
	        listener.apply(this, arguments, addOptions);
	    });
	}
	/**
	 * Sets the cursor on an element. Globally by default.
	 * @param cursor
	 * @param node
	 */
	function setCursor(cursor, node = document.body) {
	    node.style.cursor = cursor;
	}
	function debounce(func, wait, immediate) {
	    var timeout;
	    return function () {
	        var context = this, args = arguments;
	        var later = function () {
	            timeout = null;
	            if (!immediate)
	                func.apply(context, args);
	        };
	        var callNow = immediate && !timeout;
	        clearTimeout(timeout);
	        timeout = setTimeout(later, wait);
	        if (callNow)
	            func.apply(context, args);
	    };
	}
	//# sourceMappingURL=domUtils.js.map

	class ComponentPosProvider {
	    constructor(component) {
	        this.component = component;
	    }
	    getPos() {
	        const { x, y } = this.component.get();
	        return { x, y };
	    }
	    getWidth() {
	        const { currWidth } = this.component.get();
	        return currWidth;
	    }
	}
	//# sourceMappingURL=componentPosProvider.js.map

	const MIN_DRAG_X = 2;
	const MIN_DRAG_Y = 2;
	//# sourceMappingURL=constants.js.map

	/**
	 * Applies dragging interaction to gantt elements
	 */
	class Draggable {
	    constructor(node, settings, provider) {
	        this.dragging = false;
	        this.resizing = false;
	        this.resizeTriggered = false;
	        this.onmousedown = (event) => {
	            if (!isLeftClick(event)) {
	                return;
	            }
	            const { x, y } = this.provider.getPos(event);
	            const currWidth = this.provider.getWidth(event);
	            event.stopPropagation();
	            event.preventDefault();
	            const canDrag = this.dragAllowed;
	            const canResize = this.resizeAllowed;
	            if (canDrag || canResize) {
	                this.initialX = event.clientX;
	                this.initialY = event.clientY;
	                this.mouseStartPosX = getRelativePos(this.settings.container, event).x - x;
	                this.mouseStartPosY = getRelativePos(this.settings.container, event).y - y;
	                this.mouseStartRight = x + currWidth;
	                if (canResize && this.mouseStartPosX < this.settings.resizeHandleWidth) {
	                    this.direction = 'left';
	                    this.resizing = true;
	                    this.settings.onDown({
	                        x,
	                        currWidth,
	                        y,
	                        resizing: true
	                    });
	                }
	                else if (canResize && this.mouseStartPosX > currWidth - this.settings.resizeHandleWidth) {
	                    this.direction = 'right';
	                    this.resizing = true;
	                    this.settings.onDown({
	                        x,
	                        currWidth,
	                        y,
	                        resizing: true
	                    });
	                }
	                else if (canDrag) {
	                    this.dragging = true;
	                    this.settings.onDown({
	                        x,
	                        currWidth,
	                        y,
	                        dragging: true
	                    });
	                }
	                window.addEventListener('mousemove', this.onmousemove, false);
	                addEventListenerOnce(window, 'mouseup', this.onmouseup);
	            }
	        };
	        this.onmousemove = (event) => {
	            if (!this.resizeTriggered) {
	                if (Math.abs(event.clientX - this.initialX) > MIN_DRAG_X || Math.abs(event.clientY - this.initialY) > MIN_DRAG_Y) {
	                    this.resizeTriggered = true;
	                }
	                else {
	                    return;
	                }
	            }
	            event.preventDefault();
	            if (this.resizing) {
	                const mousePos = getRelativePos(this.settings.container, event);
	                const { x } = this.provider.getPos(event);
	                const currWidth = this.provider.getWidth(event);
	                if (this.direction === 'left') { //resize ulijevo
	                    if (mousePos.x > x + currWidth) {
	                        this.direction = 'right';
	                        this.settings.onResize({
	                            x: this.mouseStartRight,
	                            currWidth: this.mouseStartRight - mousePos.x
	                        });
	                        this.mouseStartRight = this.mouseStartRight + currWidth;
	                    }
	                    else {
	                        this.settings.onResize({
	                            x: mousePos.x,
	                            currWidth: this.mouseStartRight - mousePos.x
	                        });
	                    }
	                }
	                else if (this.direction === 'right') { //resize desno
	                    if (mousePos.x <= x) {
	                        this.direction = 'left';
	                        this.settings.onResize({
	                            x: mousePos.x,
	                            currWidth: x - mousePos.x
	                        });
	                        this.mouseStartRight = x;
	                    }
	                    else {
	                        this.settings.onResize({
	                            x,
	                            currWidth: mousePos.x - x
	                        });
	                    }
	                }
	            }
	            // mouseup
	            if (this.dragging) {
	                const mousePos = getRelativePos(this.settings.container, event);
	                this.settings.onDrag({
	                    x: mousePos.x - this.mouseStartPosX,
	                    y: mousePos.y - this.mouseStartPosY
	                });
	            }
	        };
	        this.onmouseup = (event) => {
	            const { x, y } = this.provider.getPos(event);
	            const currWidth = this.provider.getWidth(event);
	            if (this.resizeTriggered) {
	                this.settings.onDrop({
	                    x,
	                    y,
	                    currWidth,
	                    event,
	                    dragging: this.dragging,
	                    resizing: this.resizing
	                });
	            }
	            this.dragging = false;
	            this.resizing = false;
	            this.direction = null;
	            this.resizeTriggered = false;
	            window.removeEventListener('mousemove', this.onmousemove, false);
	        };
	        this.settings = settings;
	        this.provider = provider;
	        this.node = node;
	        node.addEventListener('mousedown', this.onmousedown, false);
	    }
	    get dragAllowed() {
	        if (typeof (this.settings.dragAllowed) === 'function') {
	            return this.settings.dragAllowed();
	        }
	        else {
	            return this.settings.dragAllowed;
	        }
	    }
	    get resizeAllowed() {
	        if (typeof (this.settings.resizeAllowed) === 'function') {
	            return this.settings.resizeAllowed();
	        }
	        else {
	            return this.settings.resizeAllowed;
	        }
	    }
	    destroy() {
	        this.node.removeEventListener('mousedown', this.onmousedown, false);
	        this.node.removeEventListener('mousemove', this.onmousemove, false);
	        this.node.removeEventListener('mouseup', this.onmouseup, false);
	    }
	}
	//# sourceMappingURL=draggable.js.map

	class DragDropManager {
	    constructor(gantt) {
	        this.handlerMap = {};
	        this.gantt = gantt;
	        this.register('row', (event) => {
	            let elements = document.elementsFromPoint(event.clientX, event.clientY);
	            let rowElement = elements.find((element) => !!element.getAttribute("data-row-id"));
	            if (rowElement !== undefined) {
	                const rowId = parseInt(rowElement.getAttribute("data-row-id"));
	                const { rowMap } = this.gantt.store.get();
	                const targetRow = rowMap[rowId];
	                if (targetRow.model.enableDragging) {
	                    return targetRow;
	                }
	            }
	            return null;
	        });
	    }
	    register(target, handler) {
	        this.handlerMap[target] = handler;
	    }
	    getTarget(target, event) {
	        //const rowCenterX = this.root.refs.mainContainer.getBoundingClientRect().left + this.root.refs.mainContainer.getBoundingClientRect().width / 2;
	        var handler = this.handlerMap[target];
	        if (handler) {
	            return handler(event);
	        }
	    }
	}
	//# sourceMappingURL=dragDropManager.js.map

	//# sourceMappingURL=index.js.map

	/* src\entities\Task.html generated by Svelte v2.16.0 */



	function selected({$selection, model}) {
		return $selection.indexOf(model.id) !== -1;
	}

	function row({$rowMap, model}) {
		return $rowMap[model.resourceId];
	}

	function data() {
	    return {
	        dragging: false,
	        selected: false,
	        resizing: false,

	        currWidth: null,
	        x: null,
	        y: null,

	        animating: true
	    }
	}
	var methods = {
	    select(event){
	        const { model } = this.get();
	        if(event.ctrlKey){
	            this.root.selectionManager.toggleSelection(model.id);
	        }
	        else{
	            this.root.selectionManager.selectSingle(model.id);
	        }
	        
	        if(this.get().selected){
	            this.root.api.tasks.raise.select(model);
	        }
	    },
	    onclick(event){
	        const { onTaskButtonClick } = this.store.get();
	        if(onTaskButtonClick) {
	            event.stopPropagation();
	            const { task } = this.get();
	            onTaskButtonClick(task);
	        }
	    }
	};

	function onstate({ changed, current, previous }) {
	    if((changed.left || changed.width || changed.top) && !current.dragging && !current.resizing){
	        this.set({
	            x: current.left,
	            currWidth: current.width,
	            y: current.top
	        });
	        // should NOT animate on resize/update of columns
	    }
			}
	function drag(node) {
	                const { rowContainerElement, resizeHandleWidth } = this.store.get();

	                const ondrop = ({ x, y, currWidth, event, dragging, resizing }) => {
	                    const { model } = this.get();
	                    const { taskMap, rowMap, rowPadding } = this.store.get();

	                    let rowChangeValid = true;
	                    //row switching
	                    if(dragging){
	                        const sourceRow = rowMap[model.resourceId];
	                        const targetRow = this.root.dndManager.getTarget('row', event);
	                        if(targetRow){
	                            model.resourceId = targetRow.model.id;
	                            this.root.api.tasks.raise.switchRow(this, targetRow, sourceRow);
	                        }
	                        else{
	                            rowChangeValid = false;
	                        }
	                    }
	                    
	                    this.set({dragging: false, resizing: false});

	                    const task = taskMap[model.id];

	                    if(rowChangeValid) {
	                        const newFrom = this.root.utils.roundTo(this.root.columnService.getDateByPosition(x));
	                        const newTo = this.root.utils.roundTo(this.root.columnService.getDateByPosition(x+currWidth));
	                        const newLeft = this.root.columnService.getPositionByDate(newFrom) | 0;
	                        const newRight = this.root.columnService.getPositionByDate(newTo) | 0;

	                        Object.assign(model, {
	                            from: newFrom,
	                            to: newTo
	                        });

	                        const left = newLeft;
	                        const width = newRight - newLeft;
	                        const top = rowPadding + rowMap[model.resourceId].y;
	                        
	                        this.store.updateTask({
	                            ...task,
	                            left,
	                            width,
	                            top,
	                            model
	                        });

	                        this.set({
	                            x: left,
	                            currWidth: width,
	                            y: top,
	                        });
	                    }
	                    else {
	                        // reset position
	                        this.set({
	                            x: task.left,
	                            currWidth: task.width,
	                            y: task.top,
	                        });
	                    }

	                    setCursor('default');
	                };

	                const draggable = new Draggable(node, {
	                    onDown: ({dragging, resizing}) => {
	                        //this.set({dragging, resizing});
	                        if(dragging) {
	                            setCursor('move');
	                        }
	                        if(resizing) {
	                            setCursor('e-resize');
	                        }
	                    }, 
	                    onResize: (state) => {
	                        this.set({...state, resizing: true});
	                    }, 
	                    onDrag: ({x, y}) => {
	                        this.set({x, y, dragging: true});
	                    }, 
	                    dragAllowed: () => {
	                        const { model } = this.get();
	                        const { rowMap } = this.store.get();
	                        const row = rowMap[model.resourceId];
	                        return row.model.enableDragging && model.enableDragging
	                    },
	                    resizeAllowed: () => {
	                        const { model } = this.get();
	                        const { rowMap } = this.store.get();
	                        const row = rowMap[model.resourceId];
	                        return row.model.enableDragging && model.enableDragging
	                    },
	                    onDrop: ondrop, 
	                    container: rowContainerElement, 
	                    resizeHandleWidth
	                }, new ComponentPosProvider(this));
	                return {
	                    destroy() { draggable.destroy(); }
	                }
	            }
	const file = "src\\entities\\Task.html";

	function create_main_fragment(component, ctx) {
		var div2, div0, text0, div1, text1, text2, div2_class_value, drag_action, current;

		function select_block_type(ctx) {
			if (ctx.model.html) return create_if_block_2;
			if (ctx.$taskContent) return create_if_block_3;
			return create_else_block;
		}

		var current_block_type = select_block_type(ctx);
		var if_block0 = current_block_type(component, ctx);

		var if_block1 = (ctx.model.showButton) && create_if_block_1(component, ctx);

		var if_block2 = (ctx.model.labelBottom) && create_if_block(component, ctx);

		function click_handler(event) {
			component.select(event);
		}

		return {
			c: function create() {
				div2 = createElement("div");
				div0 = createElement("div");
				text0 = createText("\r\n    ");
				div1 = createElement("div");
				if_block0.c();
				text1 = createText("\r\n        \r\n        \r\n\r\n        ");
				if (if_block1) if_block1.c();
				text2 = createText("\r\n\r\n    ");
				if (if_block2) if_block2.c();
				div0.className = "sg-task-background svelte-10z3olz";
				setStyle(div0, "width", "" + ctx.model.amountDone + "%");
				addLoc(div0, file, 11, 4, 318);
				div1.className = "sg-task-content svelte-10z3olz";
				addLoc(div1, file, 12, 4, 396);
				addListener(div2, "click", click_handler);
				div2.className = div2_class_value = "sg-task " + ctx.model.classes + " svelte-10z3olz";
				setStyle(div2, "width", "" + ctx.currWidth + "px");
				setStyle(div2, "height", "" + ctx.height + "px");
				setStyle(div2, "transform", "translate(" + ctx.x + "px, " + ctx.y + "px)");
				toggleClass(div2, "selected", ctx.selected);
				toggleClass(div2, "moving", ctx.dragging||ctx.resizing);
				toggleClass(div2, "animating", ctx.animating);
				addLoc(div2, file, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div0);
				append(div2, text0);
				append(div2, div1);
				if_block0.m(div1, null);
				append(div1, text1);
				if (if_block1) if_block1.m(div1, null);
				append(div2, text2);
				if (if_block2) if_block2.m(div2, null);
				component.refs.taskElement = div2;
				drag_action = drag.call(component, div2) || {};
				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.model) {
					setStyle(div0, "width", "" + ctx.model.amountDone + "%");
				}

				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
					if_block0.p(changed, ctx);
				} else {
					if_block0.d(1);
					if_block0 = current_block_type(component, ctx);
					if_block0.c();
					if_block0.m(div1, text1);
				}

				if (ctx.model.showButton) {
					if (if_block1) {
						if_block1.p(changed, ctx);
					} else {
						if_block1 = create_if_block_1(component, ctx);
						if_block1.c();
						if_block1.m(div1, null);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				if (ctx.model.labelBottom) {
					if (if_block2) {
						if_block2.p(changed, ctx);
					} else {
						if_block2 = create_if_block(component, ctx);
						if_block2.c();
						if_block2.m(div2, null);
					}
				} else if (if_block2) {
					if_block2.d(1);
					if_block2 = null;
				}

				if ((changed.model) && div2_class_value !== (div2_class_value = "sg-task " + ctx.model.classes + " svelte-10z3olz")) {
					div2.className = div2_class_value;
				}

				if (changed.currWidth) {
					setStyle(div2, "width", "" + ctx.currWidth + "px");
				}

				if (changed.height) {
					setStyle(div2, "height", "" + ctx.height + "px");
				}

				if (changed.x || changed.y) {
					setStyle(div2, "transform", "translate(" + ctx.x + "px, " + ctx.y + "px)");
				}

				if ((changed.model || changed.selected)) {
					toggleClass(div2, "selected", ctx.selected);
				}

				if ((changed.model || changed.dragging || changed.resizing)) {
					toggleClass(div2, "moving", ctx.dragging||ctx.resizing);
				}

				if ((changed.model || changed.animating)) {
					toggleClass(div2, "animating", ctx.animating);
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: run,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div2);
				}

				if_block0.d();
				if (if_block1) if_block1.d();
				if (if_block2) if_block2.d();
				removeListener(div2, "click", click_handler);
				if (component.refs.taskElement === div2) component.refs.taskElement = null;
				if (drag_action && typeof drag_action.destroy === 'function') drag_action.destroy.call(component);
			}
		};
	}

	// (18:8) {:else}
	function create_else_block(component, ctx) {
		var text_value = ctx.model.label, text;

		return {
			c: function create() {
				text = createText(text_value);
			},

			m: function mount(target, anchor) {
				insert(target, text, anchor);
			},

			p: function update(changed, ctx) {
				if ((changed.model) && text_value !== (text_value = ctx.model.label)) {
					setData(text, text_value);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(text);
				}
			}
		};
	}

	// (16:30) 
	function create_if_block_3(component, ctx) {
		var raw_value = ctx.$taskContent(this), raw_before, raw_after;

		return {
			c: function create() {
				raw_before = createElement('noscript');
				raw_after = createElement('noscript');
			},

			m: function mount(target, anchor) {
				insert(target, raw_before, anchor);
				raw_before.insertAdjacentHTML("afterend", raw_value);
				insert(target, raw_after, anchor);
			},

			p: function update(changed, ctx) {
				if ((changed.$taskContent) && raw_value !== (raw_value = ctx.$taskContent(this))) {
					detachBetween(raw_before, raw_after);
					raw_before.insertAdjacentHTML("afterend", raw_value);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachBetween(raw_before, raw_after);
					detachNode(raw_before);
					detachNode(raw_after);
				}
			}
		};
	}

	// (14:8) {#if model.html}
	function create_if_block_2(component, ctx) {
		var raw_value = ctx.model.html, raw_before, raw_after;

		return {
			c: function create() {
				raw_before = createElement('noscript');
				raw_after = createElement('noscript');
			},

			m: function mount(target, anchor) {
				insert(target, raw_before, anchor);
				raw_before.insertAdjacentHTML("afterend", raw_value);
				insert(target, raw_after, anchor);
			},

			p: function update(changed, ctx) {
				if ((changed.model) && raw_value !== (raw_value = ctx.model.html)) {
					detachBetween(raw_before, raw_after);
					raw_before.insertAdjacentHTML("afterend", raw_value);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachBetween(raw_before, raw_after);
					detachNode(raw_before);
					detachNode(raw_after);
				}
			}
		};
	}

	// (24:8) {#if model.showButton}
	function create_if_block_1(component, ctx) {
		var span, raw_value = ctx.model.buttonHtml, span_class_value;

		function click_handler(event) {
			component.onclick(event);
		}

		return {
			c: function create() {
				span = createElement("span");
				addListener(span, "click", click_handler);
				span.className = span_class_value = "sg-task-button " + ctx.model.buttonClasses + " svelte-10z3olz";
				addLoc(span, file, 24, 12, 747);
			},

			m: function mount(target, anchor) {
				insert(target, span, anchor);
				span.innerHTML = raw_value;
			},

			p: function update(changed, ctx) {
				if ((changed.model) && raw_value !== (raw_value = ctx.model.buttonHtml)) {
					span.innerHTML = raw_value;
				}

				if ((changed.model) && span_class_value !== (span_class_value = "sg-task-button " + ctx.model.buttonClasses + " svelte-10z3olz")) {
					span.className = span_class_value;
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(span);
				}

				removeListener(span, "click", click_handler);
			}
		};
	}

	// (31:4) {#if model.labelBottom}
	function create_if_block(component, ctx) {
		var label, text_value = ctx.model.labelBottom, text;

		return {
			c: function create() {
				label = createElement("label");
				text = createText(text_value);
				label.className = "sg-label-bottom svelte-10z3olz";
				addLoc(label, file, 31, 8, 955);
			},

			m: function mount(target, anchor) {
				insert(target, label, anchor);
				append(label, text);
			},

			p: function update(changed, ctx) {
				if ((changed.model) && text_value !== (text_value = ctx.model.labelBottom)) {
					setData(text, text_value);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(label);
				}
			}
		};
	}

	function Task(options) {
		this._debugName = '<Task>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}
		if (!options.store) {
			throw new Error("<Task> references store properties, but no store was provided");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(assign(this.store._init(["selection","rowMap","taskContent"]), data()), options.data);
		this.store._add(this, ["selection","rowMap","taskContent"]);

		this._recompute({ $selection: 1, model: 1, $rowMap: 1 }, this._state);
		if (!('$selection' in this._state)) console.warn("<Task> was created without expected data property '$selection'");
		if (!('model' in this._state)) console.warn("<Task> was created without expected data property 'model'");
		if (!('$rowMap' in this._state)) console.warn("<Task> was created without expected data property '$rowMap'");
		if (!('currWidth' in this._state)) console.warn("<Task> was created without expected data property 'currWidth'");
		if (!('height' in this._state)) console.warn("<Task> was created without expected data property 'height'");
		if (!('x' in this._state)) console.warn("<Task> was created without expected data property 'x'");
		if (!('y' in this._state)) console.warn("<Task> was created without expected data property 'y'");

		if (!('dragging' in this._state)) console.warn("<Task> was created without expected data property 'dragging'");
		if (!('resizing' in this._state)) console.warn("<Task> was created without expected data property 'resizing'");
		if (!('animating' in this._state)) console.warn("<Task> was created without expected data property 'animating'");
		if (!('$taskContent' in this._state)) console.warn("<Task> was created without expected data property '$taskContent'");
		this._intro = !!options.intro;

		this._handlers.state = [onstate];

		this._handlers.destroy = [removeFromStore];

		onstate.call(this, { changed: assignTrue({}, this._state), current: this._state });

		this._fragment = create_main_fragment(this, this._state);

		this.root._oncreate.push(() => {
			this.fire("update", { changed: assignTrue({}, this._state), current: this._state });
		});

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}

		this._intro = true;
	}

	assign(Task.prototype, protoDev);
	assign(Task.prototype, methods);

	Task.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('selected' in newState && !this._updatingReadonlyProperty) throw new Error("<Task>: Cannot set read-only property 'selected'");
		if ('row' in newState && !this._updatingReadonlyProperty) throw new Error("<Task>: Cannot set read-only property 'row'");
	};

	Task.prototype._recompute = function _recompute(changed, state) {
		if (changed.$selection || changed.model) {
			if (this._differs(state.selected, (state.selected = selected(state)))) changed.selected = true;
		}

		if (changed.$rowMap || changed.model) {
			if (this._differs(state.row, (state.row = row(state)))) changed.row = true;
		}
	};

	/* src\entities\Row.html generated by Svelte v2.16.0 */

	const file$1 = "src\\entities\\Row.html";

	function create_main_fragment$1(component, ctx) {
		var div, div_class_value, div_data_row_id_value, current;

		var if_block = (ctx.row.model.contentHtml) && create_if_block$1(component, ctx);

		return {
			c: function create() {
				div = createElement("div");
				if (if_block) if_block.c();
				div.className = div_class_value = "sg-row " + ctx.row.model.classes + " svelte-ejtbeo";
				setStyle(div, "height", "" + ctx.$rowHeight + "px");
				div.dataset.rowId = div_data_row_id_value = ctx.row.model.id;
				addLoc(div, file$1, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				if (if_block) if_block.m(div, null);
				component.refs.row = div;
				current = true;
			},

			p: function update(changed, ctx) {
				if (ctx.row.model.contentHtml) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block$1(component, ctx);
						if_block.c();
						if_block.m(div, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if ((changed.row) && div_class_value !== (div_class_value = "sg-row " + ctx.row.model.classes + " svelte-ejtbeo")) {
					div.className = div_class_value;
				}

				if (changed.$rowHeight) {
					setStyle(div, "height", "" + ctx.$rowHeight + "px");
				}

				if ((changed.row) && div_data_row_id_value !== (div_data_row_id_value = ctx.row.model.id)) {
					div.dataset.rowId = div_data_row_id_value;
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: run,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				if (if_block) if_block.d();
				if (component.refs.row === div) component.refs.row = null;
			}
		};
	}

	// (2:4) {#if row.model.contentHtml}
	function create_if_block$1(component, ctx) {
		var raw_value = ctx.row.model.contentHtml, raw_before, raw_after;

		return {
			c: function create() {
				raw_before = createElement('noscript');
				raw_after = createElement('noscript');
			},

			m: function mount(target, anchor) {
				insert(target, raw_before, anchor);
				raw_before.insertAdjacentHTML("afterend", raw_value);
				insert(target, raw_after, anchor);
			},

			p: function update(changed, ctx) {
				if ((changed.row) && raw_value !== (raw_value = ctx.row.model.contentHtml)) {
					detachBetween(raw_before, raw_after);
					raw_before.insertAdjacentHTML("afterend", raw_value);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachBetween(raw_before, raw_after);
					detachNode(raw_before);
					detachNode(raw_after);
				}
			}
		};
	}

	function Row(options) {
		this._debugName = '<Row>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}
		if (!options.store) {
			throw new Error("<Row> references store properties, but no store was provided");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(this.store._init(["rowHeight"]), options.data);
		this.store._add(this, ["rowHeight"]);
		if (!('row' in this._state)) console.warn("<Row> was created without expected data property 'row'");
		if (!('$rowHeight' in this._state)) console.warn("<Row> was created without expected data property '$rowHeight'");
		this._intro = !!options.intro;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$1(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}

		this._intro = true;
	}

	assign(Row.prototype, protoDev);

	Row.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src\entities\Milestone.html generated by Svelte v2.16.0 */

	function selected$1({$selection, model}) {
		return $selection.indexOf(model.id) !== -1;
	}

	function row$1({$rowMap, model}) {
		return $rowMap[model.resourceId];
	}

	function data$1() {
	    return {
	        dragging: false,
	        selected: false,

	        x: null,
	        y: null,
	        height: 20
	    }
	}
	var methods$1 = {
	    onmount() {
	        const { model } = this.get();

	        const left = this.root.columnService.getPositionByDate(model.from);
	        const top = this.store.get().rowMap[model.resourceId].y + this.store.get().rowPadding;
	        const height = this.store.get().rowMap[model.resourceId].height - 2 * this.store.get().rowPadding;

	        this.set({
	            left,
	            top,
	            height,
	            x: left,
	            y: top
	        });
	    },
	    select(event){
	        const { model } = this.get();
	        if(event.ctrlKey){
	            this.root.selectionManager.toggleSelection(model.id);
	        }
	        else{
	            this.root.selectionManager.selectSingle(model.id);
	        }
	        
	        if(this.get().selected){
	            this.root.api.tasks.raise.select(model);
	        }
	    }
	};

	function oncreate(){
	}
	function onstate$1({ changed, current, previous }) {
	    if(!previous) {
	        this.onmount();
	    }

	    else if(!current.dragging){
	        this.set({
	            x: current.left,
	            y: current.top,
	        });
	    }
			}
	function drag$1(node) {
	                const { rowContainerElement } = this.store.get();

	                const ondrop = ({ x, y, currWidth, event, dragging }) => {
	                    const { model } = this.get();
	                    const { taskMap, rowMap, rowPadding } = this.store.get();

	                    let rowChangeValid = true;
	                    //row switching
	                    if(dragging){
	                        const sourceRow = rowMap[model.resourceId];
	                        const targetRow = this.root.dndManager.getTarget('row', event);
	                        if(targetRow){
	                            model.resourceId = targetRow.model.id;
	                            this.root.api.tasks.raise.switchRow(this, targetRow, sourceRow);
	                        }
	                        else{
	                            rowChangeValid = false;
	                        }
	                    }
	                    
	                    this.set({dragging: false});
	                    const task = taskMap[model.id];
	                    if(rowChangeValid) {
	                        const newFrom = this.root.utils.roundTo(this.root.columnService.getDateByPosition(x)); 
	                        const newLeft = this.root.columnService.getPositionByDate(newFrom);

	                        Object.assign(model, {
	                            from: newFrom
	                        });
	                        
	                        this.store.updateTask({
	                            ...task,
	                            left: newLeft,
	                            top: rowPadding + rowMap[model.resourceId].y,
	                            model
	                        });
	                    }
	                    else {
	                        // reset position
	                        this.store.updateTask({
	                            ...task
	                        });
	                    }
	                };

	                const draggable = new Draggable(node, {
	                    onDown: ({x, y}) => {
	                        //this.set({x, y});
	                    }, 
	                    onDrag: ({x, y}) => {
	                        this.set({x, y, dragging: true});
	                    },
	                    dragAllowed: () => {
	                        const { model } = this.get();
	                        const { rowMap } = this.store.get();
	                        const row = rowMap[model.resourceId];
	                        return row.model.enableDragging && model.enableDragging
	                    },
	                    resizeAllowed: false,
	                    onDrop: ondrop, 
	                    container: rowContainerElement, 
	                }, new ComponentPosProvider(this));

	                return {
	                    destroy() { draggable.destroy(); }
	                }
	            }
	const file$2 = "src\\entities\\Milestone.html";

	function create_main_fragment$2(component, ctx) {
		var div1, div0, div1_class_value, drag_action, current;

		function click_handler(event) {
			component.select(event);
		}

		return {
			c: function create() {
				div1 = createElement("div");
				div0 = createElement("div");
				div0.className = "inside svelte-fuyhwd";
				addLoc(div0, file$2, 7, 4, 263);
				addListener(div1, "click", click_handler);
				div1.className = div1_class_value = "sg-milestone " + ctx.model.classes + " svelte-fuyhwd";
				setStyle(div1, "transform", "translate(" + ctx.x + "px, " + ctx.y + "px)");
				setStyle(div1, "height", "" + ctx.height + "px");
				setStyle(div1, "width", "" + ctx.height + "px");
				toggleClass(div1, "selected", ctx.selected);
				toggleClass(div1, "moving", ctx.dragging);
				addLoc(div1, file$2, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				component.refs.milestoneElement = div1;
				drag_action = drag$1.call(component, div1) || {};
				current = true;
			},

			p: function update(changed, ctx) {
				if ((changed.model) && div1_class_value !== (div1_class_value = "sg-milestone " + ctx.model.classes + " svelte-fuyhwd")) {
					div1.className = div1_class_value;
				}

				if (changed.x || changed.y) {
					setStyle(div1, "transform", "translate(" + ctx.x + "px, " + ctx.y + "px)");
				}

				if (changed.height) {
					setStyle(div1, "height", "" + ctx.height + "px");
					setStyle(div1, "width", "" + ctx.height + "px");
				}

				if ((changed.model || changed.selected)) {
					toggleClass(div1, "selected", ctx.selected);
				}

				if ((changed.model || changed.dragging)) {
					toggleClass(div1, "moving", ctx.dragging);
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: run,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div1);
				}

				removeListener(div1, "click", click_handler);
				if (component.refs.milestoneElement === div1) component.refs.milestoneElement = null;
				if (drag_action && typeof drag_action.destroy === 'function') drag_action.destroy.call(component);
			}
		};
	}

	function Milestone(options) {
		this._debugName = '<Milestone>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}
		if (!options.store) {
			throw new Error("<Milestone> references store properties, but no store was provided");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(assign(this.store._init(["selection","rowMap"]), data$1()), options.data);
		this.store._add(this, ["selection","rowMap"]);

		this._recompute({ $selection: 1, model: 1, $rowMap: 1 }, this._state);
		if (!('$selection' in this._state)) console.warn("<Milestone> was created without expected data property '$selection'");
		if (!('model' in this._state)) console.warn("<Milestone> was created without expected data property 'model'");
		if (!('$rowMap' in this._state)) console.warn("<Milestone> was created without expected data property '$rowMap'");
		if (!('x' in this._state)) console.warn("<Milestone> was created without expected data property 'x'");
		if (!('y' in this._state)) console.warn("<Milestone> was created without expected data property 'y'");
		if (!('height' in this._state)) console.warn("<Milestone> was created without expected data property 'height'");

		if (!('dragging' in this._state)) console.warn("<Milestone> was created without expected data property 'dragging'");
		this._intro = !!options.intro;

		this._handlers.state = [onstate$1];

		this._handlers.destroy = [removeFromStore];

		onstate$1.call(this, { changed: assignTrue({}, this._state), current: this._state });

		this._fragment = create_main_fragment$2(this, this._state);

		this.root._oncreate.push(() => {
			oncreate.call(this);
			this.fire("update", { changed: assignTrue({}, this._state), current: this._state });
		});

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}

		this._intro = true;
	}

	assign(Milestone.prototype, protoDev);
	assign(Milestone.prototype, methods$1);

	Milestone.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('selected' in newState && !this._updatingReadonlyProperty) throw new Error("<Milestone>: Cannot set read-only property 'selected'");
		if ('row' in newState && !this._updatingReadonlyProperty) throw new Error("<Milestone>: Cannot set read-only property 'row'");
	};

	Milestone.prototype._recompute = function _recompute(changed, state) {
		if (changed.$selection || changed.model) {
			if (this._differs(state.selected, (state.selected = selected$1(state)))) changed.selected = true;
		}

		if (changed.$rowMap || changed.model) {
			if (this._differs(state.row, (state.row = row$1(state)))) changed.row = true;
		}
	};

	/* src\entities\TimeRange.html generated by Svelte v2.16.0 */

	function data$2(){
	    return {
	        resizing: false,
	        currWidth: null,
	        x: null
	    }
	}
	function onstate$2({ changed, current, previous }) {
	    if(!current.resizing){
	        this.set({
	            x: current.left,
	            currWidth: current.width
	        });
	    }
	}
	const file$3 = "src\\entities\\TimeRange.html";

	function create_main_fragment$3(component, ctx) {
		var div1, div0, text_value = ctx.model.label, text, current;

		return {
			c: function create() {
				div1 = createElement("div");
				div0 = createElement("div");
				text = createText(text_value);
				div0.className = "sg-time-range-label svelte-18yq9be";
				addLoc(div0, file$3, 1, 4, 96);
				div1.className = "sg-time-range svelte-18yq9be";
				setStyle(div1, "width", "" + ctx.currWidth + "px");
				setStyle(div1, "left", "" + ctx.x + "px");
				toggleClass(div1, "moving", ctx.resizing);
				addLoc(div1, file$3, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				append(div0, text);
				current = true;
			},

			p: function update(changed, ctx) {
				if ((changed.model) && text_value !== (text_value = ctx.model.label)) {
					setData(text, text_value);
				}

				if (changed.currWidth) {
					setStyle(div1, "width", "" + ctx.currWidth + "px");
				}

				if (changed.x) {
					setStyle(div1, "left", "" + ctx.x + "px");
				}

				if (changed.resizing) {
					toggleClass(div1, "moving", ctx.resizing);
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: run,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div1);
				}
			}
		};
	}

	function TimeRange(options) {
		this._debugName = '<TimeRange>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign(data$2(), options.data);
		if (!('resizing' in this._state)) console.warn("<TimeRange> was created without expected data property 'resizing'");
		if (!('currWidth' in this._state)) console.warn("<TimeRange> was created without expected data property 'currWidth'");
		if (!('x' in this._state)) console.warn("<TimeRange> was created without expected data property 'x'");
		if (!('model' in this._state)) console.warn("<TimeRange> was created without expected data property 'model'");
		this._intro = !!options.intro;

		this._handlers.state = [onstate$2];

		onstate$2.call(this, { changed: assignTrue({}, this._state), current: this._state });

		this._fragment = create_main_fragment$3(this, this._state);

		this.root._oncreate.push(() => {
			this.fire("update", { changed: assignTrue({}, this._state), current: this._state });
		});

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}

		this._intro = true;
	}

	assign(TimeRange.prototype, protoDev);

	TimeRange.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src\entities\TimeRangeHeader.html generated by Svelte v2.16.0 */

	function data$3(){
	    return {
	        resizing: false,
	        currWidth: null,
	        x: null
	    }
	}
	function onstate$3({ changed, current, previous }) {
	    if(!current.resizing){
	        this.set({
	            x: current.left,
	            currWidth: current.width
	        });
	    }
			}
	function drag$2(node) {
	    const { rowContainerElement, resizeHandleWidth } = this.store.get();

	    const ondrop = ({ x, currWidth, event }) => {
	        const { model } = this.get();
	        
	        const newFrom = this.root.utils.roundTo(this.root.columnService.getDateByPosition(x)); 
	        const newTo = this.root.utils.roundTo(this.root.columnService.getDateByPosition(x+currWidth));
	        const newLeft = this.root.columnService.getPositionByDate(newFrom);
	        const newRight = this.root.columnService.getPositionByDate(newTo);
	        
	        Object.assign(model, {
	            from: newFrom,
	            to: newTo
	        });

	        var state = {
	            resizing: false,
	            left: newLeft,
	            width: newRight - newLeft,
	            model
	        };

	        updateEntity(state);
	        window.removeEventListener('mousemove', onmousemove, false);
	    };
	    
	    const updateEntity = (state) => {
	        const { model } = this.get();
	        const { timeRangeMap } = this.store.get();
	        const entity = timeRangeMap[model.id];
	        this.store.updateTimeRange({...entity, ...state});
	    };

	    return new Draggable(node, {
	        onDown: (state) => {
	            updateEntity({...state, resizing: true});
	        }, 
	        onResize: ({x, currWidth}) => {
	            updateEntity({x, currWidth});
	        },
	        dragAllowed: false,
	        resizeAllowed: true,
	        onDrop: ondrop, 
	        container: rowContainerElement, 
	        resizeHandleWidth
	    }, new ComponentPosProvider(this));
	}
	const file$4 = "src\\entities\\TimeRangeHeader.html";

	function create_main_fragment$4(component, ctx) {
		var div2, div0, drag_action, text, div1, drag_action_1, current;

		return {
			c: function create() {
				div2 = createElement("div");
				div0 = createElement("div");
				text = createText("\r\n    ");
				div1 = createElement("div");
				div0.className = "sg-time-range-handle-left svelte-16dwney";
				addLoc(div0, file$4, 1, 4, 80);
				div1.className = "sg-time-range-handle-right svelte-16dwney";
				addLoc(div1, file$4, 2, 4, 140);
				div2.className = "sg-time-range-control svelte-16dwney";
				setStyle(div2, "width", "" + ctx.currWidth + "px");
				setStyle(div2, "left", "" + ctx.x + "px");
				addLoc(div2, file$4, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div0);
				drag_action = drag$2.call(component, div0) || {};
				append(div2, text);
				append(div2, div1);
				drag_action_1 = drag$2.call(component, div1) || {};
				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.currWidth) {
					setStyle(div2, "width", "" + ctx.currWidth + "px");
				}

				if (changed.x) {
					setStyle(div2, "left", "" + ctx.x + "px");
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: run,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div2);
				}

				if (drag_action && typeof drag_action.destroy === 'function') drag_action.destroy.call(component);
				if (drag_action_1 && typeof drag_action_1.destroy === 'function') drag_action_1.destroy.call(component);
			}
		};
	}

	function TimeRangeHeader(options) {
		this._debugName = '<TimeRangeHeader>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign(data$3(), options.data);
		if (!('currWidth' in this._state)) console.warn("<TimeRangeHeader> was created without expected data property 'currWidth'");
		if (!('x' in this._state)) console.warn("<TimeRangeHeader> was created without expected data property 'x'");
		this._intro = !!options.intro;

		this._handlers.state = [onstate$3];

		onstate$3.call(this, { changed: assignTrue({}, this._state), current: this._state });

		this._fragment = create_main_fragment$4(this, this._state);

		this.root._oncreate.push(() => {
			this.fire("update", { changed: assignTrue({}, this._state), current: this._state });
		});

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}

		this._intro = true;
	}

	assign(TimeRangeHeader.prototype, protoDev);

	TimeRangeHeader.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src\column\Column.html generated by Svelte v2.16.0 */

	/**
	 * Column rendered inside gantt body background 
	 */


	const file$5 = "src\\column\\Column.html";

	function create_main_fragment$5(component, ctx) {
		var div, current;

		return {
			c: function create() {
				div = createElement("div");
				div.className = "column svelte-11nl46d";
				setStyle(div, "width", "" + ctx.width + "px");
				setStyle(div, "left", "" + ctx.left + "px");
				addLoc(div, file$5, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.width) {
					setStyle(div, "width", "" + ctx.width + "px");
				}

				if (changed.left) {
					setStyle(div, "left", "" + ctx.left + "px");
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: run,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}
			}
		};
	}

	function Column(options) {
		this._debugName = '<Column>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign({}, options.data);
		if (!('width' in this._state)) console.warn("<Column> was created without expected data property 'width'");
		if (!('left' in this._state)) console.warn("<Column> was created without expected data property 'left'");
		this._intro = !!options.intro;

		this._fragment = create_main_fragment$5(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}

		this._intro = true;
	}

	assign(Column.prototype, protoDev);

	Column.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src\column\ColumnHeader.html generated by Svelte v2.16.0 */

	/**
	 * A row of header cells rendered in header
	 */
	function columnWidth({header, baseWidth, baseDuration}) {
	    const offset = header.offset || 1;
	    const duration = moment.duration(offset, header.unit).asMilliseconds();
	    const ratio = duration / baseDuration;
	    return baseWidth * ratio;
	}

	function columnCount({$width, columnWidth}) {
		return Math.ceil($width / columnWidth);
	}

	function headers({$from, columnWidth, columnCount, header, $width}) {

	    const headers = [];
	    let headerTime = $from.clone().startOf(header.unit);
	    const offset = header.offset || 1;

	    for(let i = 0; i < columnCount; i++){
	        headers.push({
	            width: Math.min(columnWidth, $width), 
	            label: headerTime.format(header.format),
	            from: headerTime.clone(),
	            to: headerTime.clone().add(offset, header.unit),
	            unit: header.unit
	        });
	        headerTime.add(offset, header.unit);
	    }
	    return headers;
	}

	function data$4(){
	    return {
	        headers: [],
	        width: null,

	        baseWidth: null,
	        baseDuration: null,
	    }
	}
	const file$6 = "src\\column\\ColumnHeader.html";

	function click_handler(event) {
		const { component, ctx } = this._svelte;

		component.fire('selectDateTime', { from: ctx.header.from, to: ctx.header.to, unit: ctx.header.unit });
	}

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.header = list[i];
		return child_ctx;
	}

	function create_main_fragment$6(component, ctx) {
		var div, current;

		var each_value = ctx.headers;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(component, get_each_context(ctx, each_value, i));
		}

		return {
			c: function create() {
				div = createElement("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				div.className = "column-header-row svelte-1jynpw1";
				addLoc(div, file$6, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div, null);
				}

				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.headers) {
					each_value = ctx.headers;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block(component, child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value.length;
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: run,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				destroyEach(each_blocks, detach);
			}
		};
	}

	// (2:4) {#each headers as header}
	function create_each_block(component, ctx) {
		var div, text0_value = ctx.header.label || 'N/A', text0, text1;

		return {
			c: function create() {
				div = createElement("div");
				text0 = createText(text0_value);
				text1 = createText("\r\n        ");
				div._svelte = { component, ctx };

				addListener(div, "click", click_handler);
				div.className = "column-header svelte-1jynpw1";
				setStyle(div, "width", "" + ctx.header.width + "px");
				addLoc(div, file$6, 2, 8, 72);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, text0);
				append(div, text1);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				if ((changed.headers) && text0_value !== (text0_value = ctx.header.label || 'N/A')) {
					setData(text0, text0_value);
				}

				div._svelte.ctx = ctx;
				if (changed.headers) {
					setStyle(div, "width", "" + ctx.header.width + "px");
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				removeListener(div, "click", click_handler);
			}
		};
	}

	function ColumnHeader(options) {
		this._debugName = '<ColumnHeader>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}
		if (!options.store) {
			throw new Error("<ColumnHeader> references store properties, but no store was provided");
		}

		init(this, options);
		this._state = assign(assign(this.store._init(["width","from"]), data$4()), options.data);
		this.store._add(this, ["width","from"]);

		this._recompute({ header: 1, baseWidth: 1, baseDuration: 1, $width: 1, columnWidth: 1, $from: 1, columnCount: 1 }, this._state);
		if (!('header' in this._state)) console.warn("<ColumnHeader> was created without expected data property 'header'");
		if (!('baseWidth' in this._state)) console.warn("<ColumnHeader> was created without expected data property 'baseWidth'");
		if (!('baseDuration' in this._state)) console.warn("<ColumnHeader> was created without expected data property 'baseDuration'");
		if (!('$width' in this._state)) console.warn("<ColumnHeader> was created without expected data property '$width'");

		if (!('$from' in this._state)) console.warn("<ColumnHeader> was created without expected data property '$from'");
		this._intro = !!options.intro;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$6(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}

		this._intro = true;
	}

	assign(ColumnHeader.prototype, protoDev);

	ColumnHeader.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('columnWidth' in newState && !this._updatingReadonlyProperty) throw new Error("<ColumnHeader>: Cannot set read-only property 'columnWidth'");
		if ('columnCount' in newState && !this._updatingReadonlyProperty) throw new Error("<ColumnHeader>: Cannot set read-only property 'columnCount'");
		if ('headers' in newState && !this._updatingReadonlyProperty) throw new Error("<ColumnHeader>: Cannot set read-only property 'headers'");
	};

	ColumnHeader.prototype._recompute = function _recompute(changed, state) {
		if (changed.header || changed.baseWidth || changed.baseDuration) {
			if (this._differs(state.columnWidth, (state.columnWidth = columnWidth(state)))) changed.columnWidth = true;
		}

		if (changed.$width || changed.columnWidth) {
			if (this._differs(state.columnCount, (state.columnCount = columnCount(state)))) changed.columnCount = true;
		}

		if (changed.$from || changed.columnWidth || changed.columnCount || changed.header || changed.$width) {
			if (this._differs(state.headers, (state.headers = headers(state)))) changed.headers = true;
		}
	};

	class GanttUtils {
	    constructor(gantt) {
	        this.gantt = gantt;
	    }
	    /**
	     * Returns position of date on a line if from and to represent length of width
	     * @param {*} date
	     */
	    getPositionByDate(date) {
	        const { from, to, width } = this.gantt.store.get();
	        return getPositionByDate(date, from, to, width);
	    }
	    getDateByPosition(x) {
	        const { from, to, width } = this.gantt.store.get();
	        return getDateByPosition(x, from, to, width);
	    }
	    /**
	     *
	     * @param {Moment} date - Date
	     * @returns {Moment} rounded date passed as parameter
	     */
	    roundTo(date) {
	        const { magnetUnit, magnetOffset } = this.gantt.store.get();
	        let value = date.get(magnetUnit);
	        value = Math.round(value / magnetOffset);
	        date.set(magnetUnit, value * magnetOffset);
	        //round all smaller units to 0
	        const units = ['millisecond', 'second', 'minute', 'hour', 'date', 'month', 'year'];
	        const indexOf = units.indexOf(magnetUnit);
	        for (let i = 0; i < indexOf; i++) {
	            date.set(units[i], 0);
	        }
	        return date;
	    }
	}
	function getPositionByDate(date, from, to, width) {
	    if (!date) {
	        return undefined;
	    }
	    let durationTo = date.diff(from, 'milliseconds');
	    let durationToEnd = to.diff(from, 'milliseconds');
	    return durationTo / durationToEnd * width;
	}
	function getDateByPosition(x, from, to, width) {
	    let durationTo = x / width * to.diff(from, 'milliseconds');
	    let dateAtPosition = from.clone().add(durationTo, 'milliseconds');
	    return dateAtPosition;
	}
	// Returns the object on the left and right in an array using the given cmp function.
	// The compare function defined which property of the value to compare (e.g.: c => c.left)
	function getIndicesOnly(input, value, comparer, strict) {
	    let lo = -1;
	    let hi = input.length;
	    while (hi - lo > 1) {
	        let mid = Math.floor((lo + hi) / 2);
	        if (strict ? comparer(input[mid]) < value : comparer(input[mid]) <= value) {
	            lo = mid;
	        }
	        else {
	            hi = mid;
	        }
	    }
	    if (!strict && input[lo] !== undefined && comparer(input[lo]) === value) {
	        hi = lo;
	    }
	    return [lo, hi];
	}
	function get$1(input, value, comparer, strict) {
	    let res = getIndicesOnly(input, value, comparer, strict);
	    return [input[res[0]], input[res[1]]];
	}
	//# sourceMappingURL=utils.js.map

	/* src\column\ColumnHeaders.html generated by Svelte v2.16.0 */



	/**
	 * Container component for header rows 
	 */
	function minHeader({$headers, $columnWidth, $columnUnit, $columnOffset}) {
	    let result = null; 
	    let minDuration = null;

	    [...$headers, {unit: $columnUnit, offset: $columnOffset}].forEach(header => {
	        
	        const offset = header.offset || 1;
	        const duration = moment.duration(offset, header.unit).asMilliseconds();
	        if(duration < minDuration || minDuration === null) {
	            minDuration = duration;
	            result = header;
	        }
	    });

	    return result;
	}

	function baseHeaderWidth({$from, $to, $width, minHeader}) {
	    return getPositionByDate($from.clone().add(minHeader.offset || 1, minHeader.unit), $from, $to, $width) | 0;
	}

	function baseHeaderDuration({minHeader}) {
	    return moment.duration(minHeader.offset || 1, minHeader.unit).asMilliseconds();
	}

	function data$5(){
	    return {
	        headers: []
	    }
	}
	function get_each_context$1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.header = list[i];
		return child_ctx;
	}

	function create_main_fragment$7(component, ctx) {
		var each_anchor, current;

		var each_value = ctx.$headers;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$1(component, get_each_context$1(ctx, each_value, i));
		}

		function outroBlock(i, detach, fn) {
			if (each_blocks[i]) {
				each_blocks[i].o(() => {
					if (detach) {
						each_blocks[i].d(detach);
						each_blocks[i] = null;
					}
					if (fn) fn();
				});
			}
		}

		return {
			c: function create() {
				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				each_anchor = createComment();
			},

			m: function mount(target, anchor) {
				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].i(target, anchor);
				}

				insert(target, each_anchor, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.$headers || changed.baseHeaderWidth || changed.baseHeaderDuration) {
					each_value = ctx.$headers;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$1(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$1(component, child_ctx);
							each_blocks[i].c();
						}
						each_blocks[i].i(each_anchor.parentNode, each_anchor);
					}
					for (; i < each_blocks.length; i += 1) outroBlock(i, 1);
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				each_blocks = each_blocks.filter(Boolean);
				const countdown = callAfter(outrocallback, each_blocks.length);
				for (let i = 0; i < each_blocks.length; i += 1) outroBlock(i, 0, countdown);

				current = false;
			},

			d: function destroy$$1(detach) {
				destroyEach(each_blocks, detach);

				if (detach) {
					detachNode(each_anchor);
				}
			}
		};
	}

	// (1:0) {#each $headers as header}
	function create_each_block$1(component, ctx) {
		var current;

		var columnheader_initial_data = {
		 	header: ctx.header,
		 	baseWidth: ctx.baseHeaderWidth,
		 	baseDuration: ctx.baseHeaderDuration
		 };
		var columnheader = new ColumnHeader({
			root: component.root,
			store: component.store,
			data: columnheader_initial_data
		});

		columnheader.on("selectDateTime", function(event) {
			component.fire("selectDateTime", event);
		});

		return {
			c: function create() {
				columnheader._fragment.c();
			},

			m: function mount(target, anchor) {
				columnheader._mount(target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var columnheader_changes = {};
				if (changed.$headers) columnheader_changes.header = ctx.header;
				if (changed.baseHeaderWidth) columnheader_changes.baseWidth = ctx.baseHeaderWidth;
				if (changed.baseHeaderDuration) columnheader_changes.baseDuration = ctx.baseHeaderDuration;
				columnheader._set(columnheader_changes);
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				if (columnheader) columnheader._fragment.o(outrocallback);
				current = false;
			},

			d: function destroy$$1(detach) {
				columnheader.destroy(detach);
			}
		};
	}

	function ColumnHeaders(options) {
		this._debugName = '<ColumnHeaders>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}
		if (!options.store) {
			throw new Error("<ColumnHeaders> references store properties, but no store was provided");
		}

		init(this, options);
		this._state = assign(assign(this.store._init(["headers","columnWidth","columnUnit","columnOffset","from","to","width"]), data$5()), options.data);
		this.store._add(this, ["headers","columnWidth","columnUnit","columnOffset","from","to","width"]);

		this._recompute({ $headers: 1, $columnWidth: 1, $columnUnit: 1, $columnOffset: 1, $from: 1, $to: 1, $width: 1, minHeader: 1 }, this._state);
		if (!('$headers' in this._state)) console.warn("<ColumnHeaders> was created without expected data property '$headers'");
		if (!('$columnWidth' in this._state)) console.warn("<ColumnHeaders> was created without expected data property '$columnWidth'");
		if (!('$columnUnit' in this._state)) console.warn("<ColumnHeaders> was created without expected data property '$columnUnit'");
		if (!('$columnOffset' in this._state)) console.warn("<ColumnHeaders> was created without expected data property '$columnOffset'");
		if (!('$from' in this._state)) console.warn("<ColumnHeaders> was created without expected data property '$from'");
		if (!('$to' in this._state)) console.warn("<ColumnHeaders> was created without expected data property '$to'");
		if (!('$width' in this._state)) console.warn("<ColumnHeaders> was created without expected data property '$width'");
		this._intro = !!options.intro;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$7(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}

		this._intro = true;
	}

	assign(ColumnHeaders.prototype, protoDev);

	ColumnHeaders.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('minHeader' in newState && !this._updatingReadonlyProperty) throw new Error("<ColumnHeaders>: Cannot set read-only property 'minHeader'");
		if ('baseHeaderWidth' in newState && !this._updatingReadonlyProperty) throw new Error("<ColumnHeaders>: Cannot set read-only property 'baseHeaderWidth'");
		if ('baseHeaderDuration' in newState && !this._updatingReadonlyProperty) throw new Error("<ColumnHeaders>: Cannot set read-only property 'baseHeaderDuration'");
	};

	ColumnHeaders.prototype._recompute = function _recompute(changed, state) {
		if (changed.$headers || changed.$columnWidth || changed.$columnUnit || changed.$columnOffset) {
			if (this._differs(state.minHeader, (state.minHeader = minHeader(state)))) changed.minHeader = true;
		}

		if (changed.$from || changed.$to || changed.$width || changed.minHeader) {
			if (this._differs(state.baseHeaderWidth, (state.baseHeaderWidth = baseHeaderWidth(state)))) changed.baseHeaderWidth = true;
		}

		if (changed.minHeader) {
			if (this._differs(state.baseHeaderDuration, (state.baseHeaderDuration = baseHeaderDuration(state)))) changed.baseHeaderDuration = true;
		}
	};

	const moment$1 = moment;
	function findByPosition(columns, x) {
	    const result = get$1(columns, x, c => c.left);
	    return result;
	}
	function findByDate(columns, x) {
	    const result = get$1(columns, x, c => c.from);
	    return result;
	}
	class ColumnService {
	    constructor(gantt) {
	        this.gantt = gantt;
	    }
	    get columns() {
	        return this.gantt.get().columns;
	    }
	    getColumnByDate(date) {
	        const columns = findByDate(this.columns, date);
	        return !columns[0] ? columns[1] : columns[0];
	    }
	    getColumnByPosition(x) {
	        const columns = findByPosition(this.columns, x);
	        return !columns[0] ? columns[1] : columns[0];
	    }
	    getPositionByDate(date) {
	        if (!date)
	            return null;
	        const column = this.getColumnByDate(date);
	        // partials
	        let durationTo = date.diff(column.from, 'milliseconds');
	        const position = durationTo / column.duration * column.width;
	        //multiples - skip every nth col, use other duration
	        return column.left + position;
	    }
	    getDateByPosition(x) {
	        const column = this.getColumnByPosition(x);
	        // partials
	        x = x - column.left;
	        let positionDuration = column.duration / column.width * x;
	        const date = moment$1(column.from).add(positionDuration, 'milliseconds');
	        return date;
	    }
	}
	//# sourceMappingURL=column.js.map

	/* src\column\Columns.html generated by Svelte v2.16.0 */



	/**
	 * Container component for columns rendered as gantt body background
	 */
	function columnWidth$1({ $from, $to, $width, $columnOffset, $columnUnit }) {
		return getPositionByDate( $from.clone().add($columnOffset, $columnUnit), $from, $to, $width) | 0;
	}

	function columnCount$1({ $width, columnWidth }) {
		return Math.ceil($width / columnWidth);
	}

	function columns({$from, columnWidth, columnCount, $columnOffset, $columnUnit, $to, $width}) {
	    const columns = [];
	    let columnFrom = $from.clone();
	    let left = 0;
	    for (let i = 0; i < columnCount; i++) {
	        const from = columnFrom.clone();
	        const to = columnFrom.add($columnOffset, $columnUnit);
	        const duration = to.diff(from, 'milliseconds');

	        columns.push({
	            width: columnWidth,
	            from,
	            left,
	            duration
	        });
	        left += columnWidth;
	        columnFrom = to;
	    }
	    return columns;
	}

	function data$6() {
	    return {
	        columns: []
	    };
	}
	function onstate$4({current, changed, previous}) {
	    if(changed.columns) {
	        console.log('columnsGEnerated');
	        this.fire('columnsGenerated');
	    }
	}
	const file$8 = "src\\column\\Columns.html";

	function get_each_context$2(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.column = list[i];
		return child_ctx;
	}

	function create_main_fragment$8(component, ctx) {
		var div, current;

		var each_value = ctx.columns;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$2(component, get_each_context$2(ctx, each_value, i));
		}

		function outroBlock(i, detach, fn) {
			if (each_blocks[i]) {
				each_blocks[i].o(() => {
					if (detach) {
						each_blocks[i].d(detach);
						each_blocks[i] = null;
					}
					if (fn) fn();
				});
			}
		}

		return {
			c: function create() {
				div = createElement("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				div.className = "sg-columns svelte-g45u1z";
				addLoc(div, file$8, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].i(div, null);
				}

				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.columns) {
					each_value = ctx.columns;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$2(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$2(component, child_ctx);
							each_blocks[i].c();
						}
						each_blocks[i].i(div, null);
					}
					for (; i < each_blocks.length; i += 1) outroBlock(i, 1);
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				each_blocks = each_blocks.filter(Boolean);
				const countdown = callAfter(outrocallback, each_blocks.length);
				for (let i = 0; i < each_blocks.length; i += 1) outroBlock(i, 0, countdown);

				current = false;
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				destroyEach(each_blocks, detach);
			}
		};
	}

	// (2:1) {#each columns as column}
	function create_each_block$2(component, ctx) {
		var current;

		var column_spread_levels = [
			ctx.column
		];

		var column_initial_data = {};
		for (var i = 0; i < column_spread_levels.length; i += 1) {
			column_initial_data = assign(column_initial_data, column_spread_levels[i]);
		}
		var column = new Column({
			root: component.root,
			store: component.store,
			data: column_initial_data
		});

		return {
			c: function create() {
				column._fragment.c();
			},

			m: function mount(target, anchor) {
				column._mount(target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var column_changes = changed.columns ? getSpreadUpdate(column_spread_levels, [
					ctx.column
				]) : {};
				column._set(column_changes);
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				if (column) column._fragment.o(outrocallback);
				current = false;
			},

			d: function destroy$$1(detach) {
				column.destroy(detach);
			}
		};
	}

	function Columns(options) {
		this._debugName = '<Columns>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}
		if (!options.store) {
			throw new Error("<Columns> references store properties, but no store was provided");
		}

		init(this, options);
		this._state = assign(assign(this.store._init(["from","to","width","columnOffset","columnUnit"]), data$6()), options.data);
		this.store._add(this, ["from","to","width","columnOffset","columnUnit"]);

		this._recompute({ $from: 1, $to: 1, $width: 1, $columnOffset: 1, $columnUnit: 1, columnWidth: 1, columnCount: 1 }, this._state);
		if (!('$from' in this._state)) console.warn("<Columns> was created without expected data property '$from'");
		if (!('$to' in this._state)) console.warn("<Columns> was created without expected data property '$to'");
		if (!('$width' in this._state)) console.warn("<Columns> was created without expected data property '$width'");
		if (!('$columnOffset' in this._state)) console.warn("<Columns> was created without expected data property '$columnOffset'");
		if (!('$columnUnit' in this._state)) console.warn("<Columns> was created without expected data property '$columnUnit'");
		this._intro = !!options.intro;

		this._handlers.state = [onstate$4];

		this._handlers.destroy = [removeFromStore];

		onstate$4.call(this, { changed: assignTrue({}, this._state), current: this._state });

		this._fragment = create_main_fragment$8(this, this._state);

		this.root._oncreate.push(() => {
			this.fire("update", { changed: assignTrue({}, this._state), current: this._state });
		});

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}

		this._intro = true;
	}

	assign(Columns.prototype, protoDev);

	Columns.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('columnWidth' in newState && !this._updatingReadonlyProperty) throw new Error("<Columns>: Cannot set read-only property 'columnWidth'");
		if ('columnCount' in newState && !this._updatingReadonlyProperty) throw new Error("<Columns>: Cannot set read-only property 'columnCount'");
		if ('columns' in newState && !this._updatingReadonlyProperty) throw new Error("<Columns>: Cannot set read-only property 'columns'");
	};

	Columns.prototype._recompute = function _recompute(changed, state) {
		if (changed.$from || changed.$to || changed.$width || changed.$columnOffset || changed.$columnUnit) {
			if (this._differs(state.columnWidth, (state.columnWidth = columnWidth$1(state)))) changed.columnWidth = true;
		}

		if (changed.$width || changed.columnWidth) {
			if (this._differs(state.columnCount, (state.columnCount = columnCount$1(state)))) changed.columnCount = true;
		}

		if (changed.$from || changed.columnWidth || changed.columnCount || changed.$columnOffset || changed.$columnUnit || changed.$to || changed.$width) {
			if (this._differs(state.columns, (state.columns = columns(state)))) changed.columns = true;
		}
	};

	/* src\ui\ContextMenu.html generated by Svelte v2.16.0 */

	function data$7() {
	    return {
	        actions: [],
	        top: 0,
	        left: 0
	    }
	}
	var methods$2 = {
	    position(point) {
	        this.set({top: point.y, left: point.x});
	    },
	    execute(event, action) {
	        event.stopPropagation();
	        action.action();

	        this.options.onactionend();
	        //close();
	    },
	    close() {
	        //this.refs.yolo.remove();
	        this.destroy();
	    },
	    isTarget(event) {
	        return this.refs.contextMenu === event.target;
	    }
	};

	function oncreate$1(dsds) {
	    this.position(this.options.position);
	    //this.set({ actions: this.options.actions });
	}
	const file$9 = "src\\ui\\ContextMenu.html";

	function click_handler$1(event) {
		const { component, ctx } = this._svelte;

		component.execute(event, ctx.action);
	}

	function get_each_context$3(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.action = list[i];
		return child_ctx;
	}

	function create_main_fragment$9(component, ctx) {
		var div, current;

		var each_value = ctx.actions;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$3(component, get_each_context$3(ctx, each_value, i));
		}

		return {
			c: function create() {
				div = createElement("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				div.className = "context-menu svelte-1dijfv8";
				setStyle(div, "top", "" + ctx.top + "px");
				setStyle(div, "left", "" + ctx.left + "px");
				addLoc(div, file$9, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div, null);
				}

				component.refs.contextMenu = div;
				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.actions) {
					each_value = ctx.actions;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$3(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$3(component, child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value.length;
				}

				if (changed.top) {
					setStyle(div, "top", "" + ctx.top + "px");
				}

				if (changed.left) {
					setStyle(div, "left", "" + ctx.left + "px");
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: run,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				destroyEach(each_blocks, detach);

				if (component.refs.contextMenu === div) component.refs.contextMenu = null;
			}
		};
	}

	// (2:4) {#each actions as action}
	function create_each_block$3(component, ctx) {
		var div, text_value = ctx.action.label, text;

		return {
			c: function create() {
				div = createElement("div");
				text = createText(text_value);
				div._svelte = { component, ctx };

				addListener(div, "click", click_handler$1);
				div.className = "context-option svelte-1dijfv8";
				addLoc(div, file$9, 2, 8, 117);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, text);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				if ((changed.actions) && text_value !== (text_value = ctx.action.label)) {
					setData(text, text_value);
				}

				div._svelte.ctx = ctx;
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				removeListener(div, "click", click_handler$1);
			}
		};
	}

	function ContextMenu(options) {
		this._debugName = '<ContextMenu>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data$7(), options.data);
		if (!('top' in this._state)) console.warn("<ContextMenu> was created without expected data property 'top'");
		if (!('left' in this._state)) console.warn("<ContextMenu> was created without expected data property 'left'");
		if (!('actions' in this._state)) console.warn("<ContextMenu> was created without expected data property 'actions'");
		this._intro = !!options.intro;

		this._fragment = create_main_fragment$9(this, this._state);

		this.root._oncreate.push(() => {
			oncreate$1.call(this);
			this.fire("update", { changed: assignTrue({}, this._state), current: this._state });
		});

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}

		this._intro = true;
	}

	assign(ContextMenu.prototype, protoDev);
	assign(ContextMenu.prototype, methods$2);

	ContextMenu.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src\ui\Resizer.html generated by Svelte v2.16.0 */



	function data$8() {
	    return {
	        x: 240
	    }
	}
	function oncreate$2(){
	    this.dragOptions.container =  this.root.refs.ganttElement;
	}
	function resizer(node) {
	    
	    const dragOptions = this.dragOptions = {
	        onDown: ({x, y}) => {

	        }, 
	        onDrag: ({x}) => {
	            this.set({x, dragging: true});
	            this.fire('resize', { left: x });
	            setCursor('col-resize');

	        },
	        onDrop: ({ x }) => {
	            this.set({x, dragging: false});
	            this.fire('resize', { left: x });
	            setCursor('default');
	        }, 
	        dragAllowed: true,
	        resizeAllowed: false,
	        
	        container: this.root.refs.ganttElement, 
	    };

	    return new Draggable(node, dragOptions, new ComponentPosProvider(this));
	}
	const file$10 = "src\\ui\\Resizer.html";

	function create_main_fragment$10(component, ctx) {
		var div, resizer_action, current;

		return {
			c: function create() {
				div = createElement("div");
				div.className = "sg-resize svelte-3im8rp";
				setStyle(div, "left", "" + ctx.x + "px");
				addLoc(div, file$10, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				resizer_action = resizer.call(component, div) || {};
				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.x) {
					setStyle(div, "left", "" + ctx.x + "px");
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: run,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				if (resizer_action && typeof resizer_action.destroy === 'function') resizer_action.destroy.call(component);
			}
		};
	}

	function Resizer(options) {
		this._debugName = '<Resizer>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign(data$8(), options.data);
		if (!('x' in this._state)) console.warn("<Resizer> was created without expected data property 'x'");
		this._intro = !!options.intro;

		this._fragment = create_main_fragment$10(this, this._state);

		this.root._oncreate.push(() => {
			oncreate$2.call(this);
			this.fire("update", { changed: assignTrue({}, this._state), current: this._state });
		});

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}

		this._intro = true;
	}

	assign(Resizer.prototype, protoDev);

	Resizer.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	// this file is not typescript because of typescript not recognizing svelte components as modules

	function Store(state, options) {
		this._handlers = {};
		this._dependents = [];

		this._computed = blankObject();
		this._sortedComputedProperties = [];

		this._state = assign({}, state);
		this._differs = options && options.immutable ? _differsImmutable : _differs;
	}

	assign(Store.prototype, {
		_add(component, props) {
			this._dependents.push({
				component: component,
				props: props
			});
		},

		_init(props) {
			const state = {};
			for (let i = 0; i < props.length; i += 1) {
				const prop = props[i];
				state['$' + prop] = this._state[prop];
			}
			return state;
		},

		_remove(component) {
			let i = this._dependents.length;
			while (i--) {
				if (this._dependents[i].component === component) {
					this._dependents.splice(i, 1);
					return;
				}
			}
		},

		_set(newState, changed) {
			const previous = this._state;
			this._state = assign(assign({}, previous), newState);

			for (let i = 0; i < this._sortedComputedProperties.length; i += 1) {
				this._sortedComputedProperties[i].update(this._state, changed);
			}

			this.fire('state', {
				changed,
				previous,
				current: this._state
			});

			this._dependents
				.filter(dependent => {
					const componentState = {};
					let dirty = false;

					for (let j = 0; j < dependent.props.length; j += 1) {
						const prop = dependent.props[j];
						if (prop in changed) {
							componentState['$' + prop] = this._state[prop];
							dirty = true;
						}
					}

					if (dirty) {
						dependent.component._stage(componentState);
						return true;
					}
				})
				.forEach(dependent => {
					dependent.component.set({});
				});

			this.fire('update', {
				changed,
				previous,
				current: this._state
			});
		},

		_sortComputedProperties() {
			const computed = this._computed;
			const sorted = this._sortedComputedProperties = [];
			const visited = blankObject();
			let currentKey;

			function visit(key) {
				const c = computed[key];

				if (c) {
					c.deps.forEach(dep => {
						if (dep === currentKey) {
							throw new Error(`Cyclical dependency detected between ${dep} <-> ${key}`);
						}

						visit(dep);
					});

					if (!visited[key]) {
						visited[key] = true;
						sorted.push(c);
					}
				}
			}

			for (const key in this._computed) {
				visit(currentKey = key);
			}
		},

		compute(key, deps, fn) {
			let value;

			const c = {
				deps,
				update: (state, changed, dirty) => {
					const values = deps.map(dep => {
						if (dep in changed) dirty = true;
						return state[dep];
					});

					if (dirty) {
						const newValue = fn.apply(null, values);
						if (this._differs(newValue, value)) {
							value = newValue;
							changed[key] = true;
							state[key] = value;
						}
					}
				}
			};

			this._computed[key] = c;
			this._sortComputedProperties();

			const state = assign({}, this._state);
			const changed = {};
			c.update(state, changed, true);
			this._set(state, changed);
		},

		fire,

		get,

		on,

		set(newState) {
			const oldState = this._state;
			const changed = this._changed = {};
			let dirty = false;

			for (const key in newState) {
				if (this._computed[key]) throw new Error(`'${key}' is a read-only computed property`);
				if (this._differs(newState[key], oldState[key])) changed[key] = dirty = true;
			}
			if (!dirty) return;

			this._set(newState, changed);
		}
	});

	class GanttApi {
	    constructor() {
	        this.listeners = [];
	        this.listenersMap = {};
	    }
	    registerEvent(featureName, eventName) {
	        if (!this[featureName]) {
	            this[featureName] = {};
	        }
	        const feature = this[featureName];
	        if (!feature.on) {
	            feature.on = {};
	            feature.raise = {};
	        }
	        let eventId = 'on:' + featureName + ':' + eventName;
	        feature.raise[eventName] = (...params) => {
	            //todo add svelte? event listeners, looping isnt effective unless rarely used
	            this.listeners.forEach(listener => {
	                if (listener.eventId === eventId) {
	                    listener.handler(params);
	                }
	            });
	        };
	        // Creating on event method featureName.oneventName
	        feature.on[eventName] = (handler) => {
	            // track our listener so we can turn off and on
	            let listener = {
	                handler: handler,
	                eventId: eventId
	            };
	            this.listenersMap[eventId] = listener;
	            this.listeners.push(listener);
	            const removeListener = () => {
	                const index = this.listeners.indexOf(listener);
	                this.listeners.splice(index, 1);
	            };
	            return removeListener;
	        };
	    }
	}
	//# sourceMappingURL=api.js.map

	class SelectionManager {
	    constructor(store) {
	        this.store = store;
	        this.store.set({ selection: [] });
	    }
	    selectSingle(item) {
	        this.store.set({ selection: [item] });
	    }
	    toggleSelection(item) {
	        const { selection } = this.store.get();
	        const index = selection.indexOf(item);
	        if (index !== -1) {
	            selection.splice(index, 1);
	        }
	        else {
	            selection.push(item);
	        }
	        this.store.set({ selection });
	    }
	    clearSelection() {
	        this.store.set({ selection: [] });
	    }
	}
	//# sourceMappingURL=selectionManager.js.map

	class TaskFactory {
	    constructor(gantt) {
	        this.gantt = gantt;
	    }
	    createTask(model) {
	        // id of task, every task needs to have a unique one
	        //task.id = task.id || undefined;
	        // completion %, indicated on task
	        model.amountDone = model.amountDone || 0;
	        // css classes
	        model.classes = model.classes || '';
	        // datetime task starts on, currently moment-js object
	        model.from = model.from || null;
	        // datetime task ends on, currently moment-js object
	        model.to = model.to || null;
	        // label of task
	        model.label = model.label || undefined;
	        // html content of task, will override label
	        model.html = model.html || undefined;
	        // show button bar
	        model.showButton = model.showButton || false;
	        // button classes, useful for fontawesome icons
	        model.buttonClasses = model.buttonClasses || '';
	        // html content of button
	        model.buttonHtml = model.buttonHtml || '';
	        // enable dragging of task
	        model.enableDragging = model.enableDragging === undefined ? true : model.enableDragging;
	        const left = this.gantt.columnService.getPositionByDate(model.from) | 0;
	        const right = this.gantt.columnService.getPositionByDate(model.to) | 0;
	        return {
	            model,
	            left: left,
	            width: right - left,
	            height: this.getHeight(model),
	            top: this.getPosY(model)
	        };
	    }
	    createTasks(tasks) {
	        return tasks.map(task => this.createTask(task));
	    }
	    row(resourceId) {
	        return this.gantt.store.get().rowMap[resourceId];
	    }
	    getHeight(model) {
	        return this.row(model.resourceId).height - 2 * this.gantt.store.get().rowPadding;
	    }
	    getPosY(model) {
	        return this.row(model.resourceId).y + this.gantt.store.get().rowPadding;
	    }
	}
	//# sourceMappingURL=task.js.map

	class RowFactory {
	    constructor(gantt) {
	        this.gantt = gantt;
	    }
	    createRow(row, y) {
	        // defaults
	        // id of task, every task needs to have a unique one
	        //row.id = row.id || undefined;
	        // css classes
	        row.classes = row.classes || '';
	        // html content of row
	        row.contentHtml = row.contentHtml || undefined;
	        // enable dragging of tasks to and from this row 
	        row.enableDragging = row.enableDragging === undefined ? true : row.enableDragging;
	        // height of row element
	        const height = row.height || this.gantt.store.get().rowHeight;
	        return {
	            model: row,
	            y,
	            height
	        };
	    }
	    createRows(rows) {
	        let y = 0;
	        const result = rows.map((currentRow, i) => {
	            const row = this.createRow(currentRow, y);
	            y += row.height;
	            return row;
	        });
	        return result;
	    }
	}
	//# sourceMappingURL=row.js.map

	class TimeRangeFactory {
	    constructor(gantt) {
	        this.gantt = gantt;
	    }
	    create(model) {
	        // enable dragging
	        model.enableResizing = model.enableResizing === undefined ? true : model.enableResizing;
	        const left = this.gantt.columnService.getPositionByDate(model.from);
	        const right = this.gantt.columnService.getPositionByDate(model.to);
	        return {
	            model,
	            left: left,
	            width: right - left,
	            resizing: false
	        };
	    }
	}
	//# sourceMappingURL=timeRange.js.map

	class GanttStore extends Store {
	    constructor(data) {
	        super(Object.assign({
	            taskIds: [],
	            taskMap: {},
	            rowIds: [],
	            rowMap: {},
	            timeRangeMap: {},
	            columns: []
	        }, data), {
	            immutable: !true
	        });
	        this.compute('allTasks', ['taskIds', 'taskMap'], (ids, entities) => {
	            return ids.map(id => entities[id]);
	        });
	        this.compute('allRows', ['rowIds', 'rowMap'], (ids, entities) => {
	            return ids.map(id => entities[id]);
	        });
	    }
	    addTask(task) {
	        const { taskIds, taskMap } = this.get();
	        const newState = add(task, { ids: taskIds, entities: taskMap });
	        this.set({ taskIds: newState.ids, taskMap: newState.entities });
	    }
	    addAllTask(tasks) {
	        const newState = addAll(tasks);
	        this.set({ taskIds: newState.ids, taskMap: newState.entities });
	    }
	    addAllRow(rows) {
	        const newState = addAll(rows);
	        this.set({ rowIds: newState.ids, rowMap: newState.entities });
	    }
	    addRow(row) {
	        const { rowIds, rowMap } = this.get();
	        const newState = add(row, { ids: rowIds, entities: rowMap });
	        this.set({ rowIds: newState.ids, rowMap: newState.entities });
	    }
	    updateTask(task) {
	        const { taskMap } = this.get();
	        this.set({ taskMap: update(task, { entities: taskMap }).entities });
	    }
	    updateRow(row) {
	        const { rowMap } = this.get();
	        this.set({ rowMap: update(row, { entities: rowMap }) });
	    }
	    addTimeRange(timeRange) {
	        const { timeRangeMap } = this.get();
	        const newState = add(timeRange, { ids: [], entities: timeRangeMap });
	        this.set({ timeRangeMap: newState.entities });
	    }
	    updateTimeRange(timeRange) {
	        const { timeRangeMap } = this.get();
	        const n = update(timeRange, { entities: timeRangeMap });
	        this.set({ timeRangeMap: n.entities });
	    }
	}
	function add(entity, state) {
	    return {
	        ids: [...state.ids, entity.model.id],
	        entities: Object.assign({}, state.entities, { [entity.model.id]: entity })
	    };
	}
	function addAll(entities) {
	    const ids = [];
	    const newEntities = {};
	    for (const entity of entities) {
	        ids.push(entity.model.id);
	        newEntities[entity.model.id] = entity;
	    }
	    return {
	        ids: ids,
	        entities: newEntities
	    };
	}
	function update(entity, state) {
	    return {
	        entities: Object.assign({}, state.entities, { [entity.model.id]: entity })
	    };
	}
	// add(entity){
	//     const { ids, entities } = this.get();
	//     this.set({
	//         ids: [ ...ids, entity.id ],
	//         entities: {
	//             ...entities,
	//             [entity.id]: entity
	//         }
	//     });
	// }
	// addMany(entityArr){
	//     const { entities } = this.get();
	//     const newEntities = {
	//         ...entities,
	//         ...entityArr
	//     }
	//     this.set({
	//         ids: Object.keys(newEntities),
	//         entities: newEntities
	//     });
	// }
	// update(entity){
	//     const { entities } = this.get();
	//     this.set({
	//         entities: {
	//             ...entities,
	//             [entity.id]: entity
	//         }
	//     });
	// }
	// remove(id){
	//     const { ids, entities } = this.get();
	//     const { [id]: entity, ...newEntities } = entities;
	//     this.set({
	//         ids: ids.filter(i => i === id),
	//         entities: newEntities
	//     });
	// }
	//# sourceMappingURL=store.js.map

	/* src\Gantt.html generated by Svelte v2.16.0 */




	let SvelteGantt;

	function rightScrollbarVisible({ $visibleHeight, rowContainerHeight }) {
		return rowContainerHeight > $visibleHeight;
	}

	function rowContainerHeight({ $allRows, $rowHeight }) {
		return $allRows.length * $rowHeight;
	}

	function startIndex({ $scrollTop, $rowHeight }) {
		return Math.floor($scrollTop / $rowHeight);
	}

	function endIndex({ startIndex, $visibleHeight, $rowHeight, $allRows }) {
		return Math.min(startIndex + Math.ceil($visibleHeight / $rowHeight), $allRows.length - 1);
	}

	function paddingTop({ startIndex, $rowHeight }) {
		return startIndex * $rowHeight;
	}

	function paddingBottom({ $allRows, endIndex, $rowHeight }) {
		return ($allRows.length - endIndex - 1) * $rowHeight;
	}

	function visibleRows({ $allRows, startIndex, endIndex }) {
		return $allRows.slice(startIndex, endIndex + 1);
	}

	function visibleTasks({ $taskMap, visibleRows, rowTaskMap }) {
	    const visibleTasks = [];
	    visibleRows.forEach(row => {
	        if (!rowTaskMap[row.model.id]) return;

	        rowTaskMap[row.model.id].forEach(id => {
	            visibleTasks.push($taskMap[id]);
	        });
	    });
	    return visibleTasks;
	}

	function rowTaskMap({ $allTasks }) {
	    const reducer = (cache, task) => {
	        if (!cache[task.model.resourceId]) cache[task.model.resourceId] = [];

	        cache[task.model.resourceId].push(task.model.id);
	        return cache;
	    };
	    return $allTasks.reduce(reducer, {});
	}

	function data$9() {
	    return {
	        tableWidth: 240,

	        scrollables: [],
	        visibleRows: [],
	        visibleTasks: [],
	        _ganttBodyModules: [],
	        _ganttTableModules: [],
	        _modules: [],

	        columns: [],

	        rows: [],

	        paddingTop: 0,
	        paddingBottom: 0,
	        Task,
	        Milestone,

	        zooming: false
	    };
	}
	var methods$3 = {
	    onresize({ left }) {
	        this.set({tableWidth: left});
	        setTimeout(() => {
	            this.refreshTasks();
	        }, 0);
	    },
	    refreshTasksDebounced() {
	        if(!this._refreshTasksDebounced) {
	            this._refreshTasksDebounced = debounce(() => { this.refreshTasks(); }, 250, false);
	        }

	        this._refreshTasksDebounced();
	    },
	    onwheel(e) {
	        if (e.ctrlKey) {
	            e.preventDefault();
	            const { width, minWidth, zoom, zoomLevels } = this.store.get();
	            this.set({ zooming: true });

	            let columnOptions = {
	                columnUnit: "minute",
	                columnOffset: 15,
	                minWidth
	            };

	            let newZoom = zoom;
	            if (event.deltaY > 0) {
	                newZoom--;
	            } else {
	                newZoom++;
	            }

	            if (zoomLevels[newZoom]) {
	                Object.assign(columnOptions, zoomLevels[newZoom], { zoom: newZoom });
	            }

	            const scale = columnOptions.minWidth / width;
	            const node = this.refs.mainContainer;
	            const mousepos = getRelativePos(node, e);
	            const before = node.scrollLeft + mousepos.x;
	            const after = before * scale;
	            const scrollLeft = after - mousepos.x;

	            this.store.set(columnOptions);
	            this.root.api.gantt.raise.viewChanged();
	            node.scrollLeft = scrollLeft;
	            this.stoppedZooming();
	            this.refreshTasks();
	        }
	    },
	    onWindowResizeEventHandler(event) {
	        if (this.store.get().stretchTimelineWidthToFit) {
	            this.refreshTasks();
	        }
	    },
	    adjustVisibleDateRange({ from, to, unit }) {
	        this.store.set({
	            from: from.clone(),
	            to: to.clone()
	        });
	        this.refreshTasks();
	    },
	    initRows(rowsData) {
	        const rows = this.rowFactory.createRows(rowsData);
	        this.store.addAllRow(rows);
	    },
	    initTasks(taskData) {
	        const tasks = this.taskFactory.createTasks(taskData);
	        this.store.addAllTask(tasks);
	    },
	    initTimeRanges(timeRangeData) {
	        const timeRangeMap = {};

	        for (let i = 0; i < timeRangeData.length; i++) {
	            const currentTimeRange = timeRangeData[i];
	            const timeRange = this.timeRangeFactory.create(currentTimeRange);
	            timeRangeMap[currentTimeRange.id] = timeRange;
	        }

	        this.store.set({ timeRangeMap });
	    },
	    initGantt() {
	        if (!this.store.get().gantt) {
	            this.store.set({
	                bodyElement: this.refs.mainContainer,
	                rowContainerElement: this.refs.rowContainer,
	                gantt: this
	            });

	            this.selectionManager = new SelectionManager(this.store);
	            this.utils = new GanttUtils(this);
	            this.api = new GanttApi();
	            this.taskFactory = new TaskFactory(this);
	            this.rowFactory = new RowFactory(this);
	            this.timeRangeFactory = new TimeRangeFactory(this);
	            this.dndManager = new DragDropManager(this);
	            this.columnService = new ColumnService(this);

	            this.api.registerEvent("tasks", "move");
	            this.api.registerEvent("tasks", "select");
	            this.api.registerEvent("tasks", "switchRow");
	            this.api.registerEvent("tasks", "moveEnd");
	            this.api.registerEvent("tasks", "changed");

	            this.api.registerEvent("gantt", "viewChanged");
	        }
	    },
	    initModule(module) {
	        const moduleOptions = Object.assign(
	        {
	            _gantt: this,
	            _options: this.get()
	        }, {}); //merge with module specific data, modules[module.constructor.key]);
	        module.initModule(moduleOptions);

	        const { _modules } = this.get();
	        _modules.push(module);
	    },
	    broadcastModules(event, data) {
	        const { _modules } = this.get();
	        _modules.forEach(module => {
	            if (typeof module[event] === "function") {
	                module[event](data);
	            }
	        });
	    },
	    updateVisibleEntities() {
	        const { timeRangeMap } = this.store.get();
	        for (const id in timeRangeMap) {
	            const timeRange = timeRangeMap[id];

	            const newLeft = this.root.columnService.getPositionByDate(timeRange.model.from) | 0;
	            const newRight = this.root.columnService.getPositionByDate(timeRange.model.to) | 0;

	            timeRange.left = newLeft;
	            timeRange.width = newRight - newLeft;
	        }

	        this.store.set({ timeRangeMap });
	    },
	    refreshTasks() {
	        const { allTasks } = this.store.get();
	        allTasks.forEach(task => {
	            const newLeft = this.root.columnService.getPositionByDate(task.model.from) | 0;
	            const newRight = this.root.columnService.getPositionByDate(task.model.to) | 0;

	            task.left = newLeft;
	            task.width = newRight - newLeft;
	        });
	        this.store.set({ taskMap: this.store.get().taskMap });
	        this.updateVisibleEntities();
	    },
	    updateView(options) {
	        // {from, to, headers, width}
	        this.store.set(options);

	        this.refreshTasks();

	        this.broadcastModules("updateView", options); //{ from, to, headers });
	    },
	    selectTask(id) {
	        const { taskMap } = this.get();
	        const task = taskMap[id];
	        if (task) {
	            this.selectionManager.selectSingle(task);
	        }
	    }
	};

	function oncreate$3() {
	    const { initialRows, initialTasks } = this.get();

	    this.store.compute('width', ['visibleWidth', 'minWidth', 'stretchTimelineWidthToFit'], (visible, min, stretch) => {
	        return stretch && visible > min ? visible : min;
	    });

	    this.stoppedZooming = debounce(() => { this.set({ zooming: false }); }, 250, false);

	    this.initGantt();
	    this.initRows(initialRows);

	    this.store.set({
	        visibleHeight: this.refs.mainContainer.clientHeight,
	        visibleWidth: this.refs.mainContainer.clientWidth
	    });

	    this.initTasks(initialTasks);
	    this.broadcastModules("onGanttCreated");
	}
	function setup(component) {
	  SvelteGantt = component;
	  SvelteGantt.defaults = {
	    // datetime timeline starts on, currently moment-js object
	    from: null,
	    // datetime timeline ends on, currently moment-js object
	    to: null,
	    // width of main gantt area in px
	    minWidth: 800, //rename to timelinewidth
	    // should timeline stretch width to fit, true overrides timelineWidth
	    stretchTimelineWidthToFit: false,
	    // minimum unit of time task date values will round to
	    magnetUnit: "minute",
	    // amount of units task date values will round to
	    magnetOffset: 15,
	    // duration unit of columns
	    columnUnit: "minute",
	    // duration width of column
	    columnOffset: 15,
	    // list of headers used for main gantt area
	    // unit: time unit used, e.g. day will create a cell in the header for each day in the timeline
	    // format: datetime format used for header cell label
	    headers: [
	      { unit: "day", format: "DD.MM.YYYY" },
	      { unit: "hour", format: "HH" }
	    ],
	    zoomLevels: [
	      {
	        headers: [
	          { unit: "day", format: "DD.MM.YYYY" },
	          { unit: "hour", format: "HH" }
	        ],
	        minWidth: 800,
	        stretchTimelineWidthToFit: true
	      },
	      {
	        headers: [
	          { unit: "hour", format: "ddd D/M, H A" },
	          { unit: "minute", format: "mm", offset: 15 }
	        ],
	        minWidth: 5000,
	        stretchTimelineWidthToFit: false
	      }
	    ],
	    zoom: 0,
	    // height of a single row in px
	    rowHeight: 52,
	    rowPadding: 6,
	    // modules used in gantt
	    modules: [],
	    // enables right click context menu
	    enableContextMenu: false,
	    // sets top level gantt class which can be used for styling
	    classes: "",
	    // width of handle for resizing task
	    resizeHandleWidth: 10,
	    // handler of button clicks
	    onTaskButtonClick: null, // e.g. (task) => {debugger},
	    // task content factory function
	    taskContent: null, // e.g. (task) => '<div>Custom task content</div>'

	    rows: [],
	    tasks: [],
	    _timeRanges: []
	  };

	  SvelteGantt.create = function(target, data, options) {
	    // bind gantt modules
	    const ganttModules = {
	      ganttBodyModules: [],
	      ganttTableModules: [],
	      defaults: {}
	    };

	    if (options.modules) {
	      options.modules.forEach(module => {
	        module.bindToGantt(ganttModules);
	      });
	    }

	    // initialize gantt state
	    const newData = {
	      initialRows: data.rows,
	      initialTasks: data.tasks,
	      _ganttBodyModules: ganttModules.ganttBodyModules,
	      _ganttTableModules: ganttModules.ganttTableModules
	    };

	    // initialize all the gantt options
	    const ganttOptions = Object.assign(
	      {
	        scrollTop: 0,
	        scrollLeft: 0
	      },
	      SvelteGantt.defaults,
	      ganttModules.defaults,
	      options
	    );

	    const store = new GanttStore(ganttOptions);

	    return new SvelteGantt({
	      target,
	      data: newData,
	      store
	    });
	  };
	}
	function scrollable(node) {
	    const { scrollables } = this.get();

	    const onscroll = event => {
	        const { scrollTop, scrollLeft } = node;

	        scrollables.forEach(scrollable => {
	            if (scrollable.orientation === "horizontal") {
	                scrollable.node.scrollLeft = scrollLeft;
	            } else {
	                scrollable.node.scrollTop = scrollTop;
	            }
	        });

	        //TODO: only for vertical scroll
	        this.store.set({ scrollTop, scrollLeft });

	        this.broadcastModules("updateVisible", { scrollTop });
	    };

	    node.addEventListener("scroll", onscroll);
	    return {
	        destroy() {
	            node.removeEventListener("scroll", onscroll, false);
	        }
	    };
	}
	function horizontalScrollListener(node) {
	    const { scrollables } = this.get();
	    scrollables.push({ node, orientation: "horizontal" });
	}
	const file$11 = "src\\Gantt.html";

	function get_each5_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.module = list[i];
		return child_ctx;
	}

	function get_each4_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.task = list[i];
		return child_ctx;
	}

	function get_each3_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.id = list[i][0];
		child_ctx.timeRange = list[i][1];
		return child_ctx;
	}

	function get_each2_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.row = list[i];
		return child_ctx;
	}

	function get_each1_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.id = list[i][0];
		child_ctx.timeRange = list[i][1];
		return child_ctx;
	}

	function get_each0_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.module = list[i];
		return child_ctx;
	}

	function create_main_fragment$11(component, ctx) {
		var div9, each0_blocks_1 = [], each0_lookup = blankObject(), text0, div8, div2, div1, div0, text1, each1_blocks_1 = [], each1_lookup = blankObject(), horizontalScrollListener_action, div2_resize_listener, text2, div7, div6, columns_updating = {}, text3, div4, div3, each2_blocks_1 = [], each2_lookup = blankObject(), text4, div5, each3_blocks_1 = [], each3_lookup = blankObject(), text5, each4_blocks_1 = [], each4_lookup = blankObject(), text6, each5_blocks_1 = [], each5_lookup = blankObject(), div7_resize_listener, scrollable_action, div9_class_value, current;

		function onwindowresize(event) {
			component.onWindowResizeEventHandler(event);	}
		window.addEventListener("resize", onwindowresize);

		var each0_value = ctx._ganttTableModules;

		const get_key = ctx => ctx.module.key;

		for (var i = 0; i < each0_value.length; i += 1) {
			let child_ctx = get_each0_context(ctx, each0_value, i);
			let key = get_key(child_ctx);
			each0_blocks_1[i] = each0_lookup[key] = create_each_block_5(component, key, child_ctx);
		}

		var columnheaders = new ColumnHeaders({
			root: component.root,
			store: component.store
		});

		columnheaders.on("selectDateTime", function(event) {
			component.adjustVisibleDateRange(event);
		});

		var each1_value = ctx.Object.entries(ctx.$timeRangeMap);

		const get_key_1 = ctx => ctx.timeRange.id;

		for (var i = 0; i < each1_value.length; i += 1) {
			let child_ctx = get_each1_context(ctx, each1_value, i);
			let key = get_key_1(child_ctx);
			each1_blocks_1[i] = each1_lookup[key] = create_each_block_4(component, key, child_ctx);
		}

		function div2_resize_handler() {
			component.store.set({ headerHeight: div2.clientHeight });
		}

		var columns_initial_data = {};
		if (ctx.columns  !== void 0) {
			columns_initial_data.columns = ctx.columns ;
			columns_updating.columns = true;
		}
		var columns = new Columns({
			root: component.root,
			store: component.store,
			data: columns_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!columns_updating.columns && changed.columns) {
					newState.columns = childState.columns;
				}
				component._set(newState);
				columns_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			columns._bind({ columns: 1 }, columns.get());
		});

		columns.on("columnsGenerated", function(event) {
			component.refreshTasksDebounced();
		});

		var each2_value = ctx.visibleRows;

		const get_key_2 = ctx => ctx.row.model.id;

		for (var i = 0; i < each2_value.length; i += 1) {
			let child_ctx = get_each2_context(ctx, each2_value, i);
			let key = get_key_2(child_ctx);
			each2_blocks_1[i] = each2_lookup[key] = create_each_block_3(component, key, child_ctx);
		}

		var each3_value = ctx.Object.entries(ctx.$timeRangeMap);

		const get_key_3 = ctx => ctx.timeRange.id;

		for (var i = 0; i < each3_value.length; i += 1) {
			let child_ctx = get_each3_context(ctx, each3_value, i);
			let key = get_key_3(child_ctx);
			each3_blocks_1[i] = each3_lookup[key] = create_each_block_2(component, key, child_ctx);
		}

		var each4_value = ctx.visibleTasks;

		const get_key_4 = ctx => ctx.task.model.id;

		for (var i = 0; i < each4_value.length; i += 1) {
			let child_ctx = get_each4_context(ctx, each4_value, i);
			let key = get_key_4(child_ctx);
			each4_blocks_1[i] = each4_lookup[key] = create_each_block_1(component, key, child_ctx);
		}

		var each5_value = ctx._ganttBodyModules;

		const get_key_5 = ctx => ctx.module.key;

		for (var i = 0; i < each5_value.length; i += 1) {
			let child_ctx = get_each5_context(ctx, each5_value, i);
			let key = get_key_5(child_ctx);
			each5_blocks_1[i] = each5_lookup[key] = create_each_block$4(component, key, child_ctx);
		}

		function div7_resize_handler() {
			component.store.set({ visibleHeight: div7.clientHeight, visibleWidth: div7.clientWidth });
		}

		function wheel_handler(event) {
			component.onwheel(event);
		}

		return {
			c: function create() {
				div9 = createElement("div");

				for (i = 0; i < each0_blocks_1.length; i += 1) each0_blocks_1[i].c();

				text0 = createText("\r\n\r\n\t");
				div8 = createElement("div");
				div2 = createElement("div");
				div1 = createElement("div");
				div0 = createElement("div");
				columnheaders._fragment.c();
				text1 = createText("\r\n\t\t\t\t\t");

				for (i = 0; i < each1_blocks_1.length; i += 1) each1_blocks_1[i].c();

				text2 = createText("\r\n\r\n\t\t");
				div7 = createElement("div");
				div6 = createElement("div");
				columns._fragment.c();
				text3 = createText("\r\n\t\t\t\t");
				div4 = createElement("div");
				div3 = createElement("div");

				for (i = 0; i < each2_blocks_1.length; i += 1) each2_blocks_1[i].c();

				text4 = createText("\r\n\t\t\t\t");
				div5 = createElement("div");

				for (i = 0; i < each3_blocks_1.length; i += 1) each3_blocks_1[i].c();

				text5 = createText("\r\n\r\n\t\t\t\t\t");

				for (i = 0; i < each4_blocks_1.length; i += 1) each4_blocks_1[i].c();

				text6 = createText("\r\n\t\t\t\t");

				for (i = 0; i < each5_blocks_1.length; i += 1) each5_blocks_1[i].c();
				div0.className = "header-container svelte-1fs3xpk";
				setStyle(div0, "width", "" + ctx.$width + "px");
				addLoc(div0, file$11, 11, 4, 630);
				div1.className = "sg-header-scroller svelte-1fs3xpk";
				addLoc(div1, file$11, 10, 3, 563);
				component.root._aftercreate.push(div2_resize_handler);
				div2.className = "sg-header svelte-1fs3xpk";
				toggleClass(div2, "right-scrollbar-visible", ctx.rightScrollbarVisible);
				addLoc(div2, file$11, 9, 2, 423);
				setStyle(div3, "transform", "translateY(" + ctx.paddingTop + "px)");
				addLoc(div3, file$11, 25, 5, 1359);
				div4.className = "sg-rows svelte-1fs3xpk";
				setStyle(div4, "height", "" + ctx.rowContainerHeight + "px");
				addLoc(div4, file$11, 24, 4, 1275);
				div5.className = "sg-foreground svelte-1fs3xpk";
				addLoc(div5, file$11, 31, 4, 1531);
				div6.className = "content svelte-1fs3xpk";
				setStyle(div6, "width", "" + ctx.$width + "px");
				addLoc(div6, file$11, 22, 3, 1136);
				component.root._aftercreate.push(div7_resize_handler);
				addListener(div7, "wheel", wheel_handler);
				div7.className = "sg-timeline-body svelte-1fs3xpk";
				toggleClass(div7, "zooming", ctx.zooming);
				addLoc(div7, file$11, 20, 2, 946);
				div8.className = "sg-timeline sg-view svelte-1fs3xpk";
				addLoc(div8, file$11, 8, 1, 386);
				div9.className = div9_class_value = "sg-gantt " + ctx.$classes + " svelte-1fs3xpk";
				addLoc(div9, file$11, 1, 0, 65);
			},

			m: function mount(target, anchor) {
				insert(target, div9, anchor);

				for (i = 0; i < each0_blocks_1.length; i += 1) each0_blocks_1[i].i(div9, null);

				append(div9, text0);
				append(div9, div8);
				append(div8, div2);
				append(div2, div1);
				append(div1, div0);
				columnheaders._mount(div0, null);
				append(div0, text1);

				for (i = 0; i < each1_blocks_1.length; i += 1) each1_blocks_1[i].i(div0, null);

				horizontalScrollListener_action = horizontalScrollListener.call(component, div1) || {};
				div2_resize_listener = addResizeListener(div2, div2_resize_handler);
				component.refs.mainHeaderContainer = div2;
				append(div8, text2);
				append(div8, div7);
				append(div7, div6);
				columns._mount(div6, null);
				append(div6, text3);
				append(div6, div4);
				append(div4, div3);

				for (i = 0; i < each2_blocks_1.length; i += 1) each2_blocks_1[i].i(div3, null);

				component.refs.rowContainer = div4;
				append(div6, text4);
				append(div6, div5);

				for (i = 0; i < each3_blocks_1.length; i += 1) each3_blocks_1[i].i(div5, null);

				append(div5, text5);

				for (i = 0; i < each4_blocks_1.length; i += 1) each4_blocks_1[i].i(div5, null);

				append(div6, text6);

				for (i = 0; i < each5_blocks_1.length; i += 1) each5_blocks_1[i].i(div6, null);

				div7_resize_listener = addResizeListener(div7, div7_resize_handler);
				component.refs.mainContainer = div7;
				scrollable_action = scrollable.call(component, div7) || {};
				component.refs.ganttElement = div9;
				current = true;
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				const each0_value = ctx._ganttTableModules;
				each0_blocks_1 = updateKeyedEach(each0_blocks_1, component, changed, get_key, 1, ctx, each0_value, each0_lookup, div9, outroAndDestroyBlock, create_each_block_5, "i", text0, get_each0_context);

				const each1_value = ctx.Object.entries(ctx.$timeRangeMap);
				each1_blocks_1 = updateKeyedEach(each1_blocks_1, component, changed, get_key_1, 1, ctx, each1_value, each1_lookup, div0, outroAndDestroyBlock, create_each_block_4, "i", null, get_each1_context);

				if (!current || changed.$width) {
					setStyle(div0, "width", "" + ctx.$width + "px");
				}

				if (changed.rightScrollbarVisible) {
					toggleClass(div2, "right-scrollbar-visible", ctx.rightScrollbarVisible);
				}

				var columns_changes = {};
				if (!columns_updating.columns && changed.columns) {
					columns_changes.columns = ctx.columns ;
					columns_updating.columns = ctx.columns  !== void 0;
				}
				columns._set(columns_changes);
				columns_updating = {};

				const each2_value = ctx.visibleRows;
				each2_blocks_1 = updateKeyedEach(each2_blocks_1, component, changed, get_key_2, 1, ctx, each2_value, each2_lookup, div3, outroAndDestroyBlock, create_each_block_3, "i", null, get_each2_context);

				if (!current || changed.paddingTop) {
					setStyle(div3, "transform", "translateY(" + ctx.paddingTop + "px)");
				}

				if (!current || changed.rowContainerHeight) {
					setStyle(div4, "height", "" + ctx.rowContainerHeight + "px");
				}

				const each3_value = ctx.Object.entries(ctx.$timeRangeMap);
				each3_blocks_1 = updateKeyedEach(each3_blocks_1, component, changed, get_key_3, 1, ctx, each3_value, each3_lookup, div5, outroAndDestroyBlock, create_each_block_2, "i", text5, get_each3_context);

				const each4_value = ctx.visibleTasks;
				each4_blocks_1 = updateKeyedEach(each4_blocks_1, component, changed, get_key_4, 1, ctx, each4_value, each4_lookup, div5, outroAndDestroyBlock, create_each_block_1, "i", null, get_each4_context);

				const each5_value = ctx._ganttBodyModules;
				each5_blocks_1 = updateKeyedEach(each5_blocks_1, component, changed, get_key_5, 1, ctx, each5_value, each5_lookup, div6, outroAndDestroyBlock, create_each_block$4, "i", null, get_each5_context);

				if (!current || changed.$width) {
					setStyle(div6, "width", "" + ctx.$width + "px");
				}

				if (changed.zooming) {
					toggleClass(div7, "zooming", ctx.zooming);
				}

				if ((!current || changed.$classes) && div9_class_value !== (div9_class_value = "sg-gantt " + ctx.$classes + " svelte-1fs3xpk")) {
					div9.className = div9_class_value;
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				outrocallback = callAfter(outrocallback, 8);

				const countdown = callAfter(outrocallback, each0_blocks_1.length);
				for (i = 0; i < each0_blocks_1.length; i += 1) each0_blocks_1[i].o(countdown);

				if (columnheaders) columnheaders._fragment.o(outrocallback);

				const countdown_1 = callAfter(outrocallback, each1_blocks_1.length);
				for (i = 0; i < each1_blocks_1.length; i += 1) each1_blocks_1[i].o(countdown_1);

				if (columns) columns._fragment.o(outrocallback);

				const countdown_2 = callAfter(outrocallback, each2_blocks_1.length);
				for (i = 0; i < each2_blocks_1.length; i += 1) each2_blocks_1[i].o(countdown_2);

				const countdown_3 = callAfter(outrocallback, each3_blocks_1.length);
				for (i = 0; i < each3_blocks_1.length; i += 1) each3_blocks_1[i].o(countdown_3);

				const countdown_4 = callAfter(outrocallback, each4_blocks_1.length);
				for (i = 0; i < each4_blocks_1.length; i += 1) each4_blocks_1[i].o(countdown_4);

				const countdown_5 = callAfter(outrocallback, each5_blocks_1.length);
				for (i = 0; i < each5_blocks_1.length; i += 1) each5_blocks_1[i].o(countdown_5);

				current = false;
			},

			d: function destroy$$1(detach) {
				window.removeEventListener("resize", onwindowresize);

				if (detach) {
					detachNode(div9);
				}

				for (i = 0; i < each0_blocks_1.length; i += 1) each0_blocks_1[i].d();

				columnheaders.destroy();

				for (i = 0; i < each1_blocks_1.length; i += 1) each1_blocks_1[i].d();

				if (horizontalScrollListener_action && typeof horizontalScrollListener_action.destroy === 'function') horizontalScrollListener_action.destroy.call(component);
				div2_resize_listener.cancel();
				if (component.refs.mainHeaderContainer === div2) component.refs.mainHeaderContainer = null;
				columns.destroy();

				for (i = 0; i < each2_blocks_1.length; i += 1) each2_blocks_1[i].d();

				if (component.refs.rowContainer === div4) component.refs.rowContainer = null;

				for (i = 0; i < each3_blocks_1.length; i += 1) each3_blocks_1[i].d();

				for (i = 0; i < each4_blocks_1.length; i += 1) each4_blocks_1[i].d();

				for (i = 0; i < each5_blocks_1.length; i += 1) each5_blocks_1[i].d();

				div7_resize_listener.cancel();
				removeListener(div7, "wheel", wheel_handler);
				if (component.refs.mainContainer === div7) component.refs.mainContainer = null;
				if (scrollable_action && typeof scrollable_action.destroy === 'function') scrollable_action.destroy.call(component);
				if (component.refs.ganttElement === div9) component.refs.ganttElement = null;
			}
		};
	}

	// (3:1) {#each _ganttTableModules as module (module.key)}
	function create_each_block_5(component, key_1, ctx) {
		var first, text, current;

		var switch_value = ctx.module;

		function switch_props(ctx) {
			var switch_instance_initial_data = {
			 	rowContainerHeight: ctx.rowContainerHeight,
			 	paddingTop: ctx.paddingTop,
			 	paddingBottom: ctx.paddingBottom,
			 	tableWidth: ctx.tableWidth,
			 	visibleRows: ctx.visibleRows
			 };
			return {
				root: component.root,
				store: component.store,
				data: switch_instance_initial_data
			};
		}

		if (switch_value) {
			var switch_instance = new switch_value(switch_props(ctx));
		}

		function switch_instance_init(event) {
			component.initModule(event.module);
		}

		if (switch_instance) switch_instance.on("init", switch_instance_init);

		var resizer = new Resizer({
			root: component.root,
			store: component.store
		});

		resizer.on("resize", function(event) {
			component.onresize(event);
		});

		return {
			key: key_1,

			first: null,

			c: function create() {
				first = createComment();
				if (switch_instance) switch_instance._fragment.c();
				text = createText("\r\n\r\n    ");
				resizer._fragment.c();
				this.first = first;
			},

			m: function mount(target, anchor) {
				insert(target, first, anchor);

				if (switch_instance) {
					switch_instance._mount(target, anchor);
				}

				insert(target, text, anchor);
				resizer._mount(target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var switch_instance_changes = {};
				if (changed.rowContainerHeight) switch_instance_changes.rowContainerHeight = ctx.rowContainerHeight;
				if (changed.paddingTop) switch_instance_changes.paddingTop = ctx.paddingTop;
				if (changed.paddingBottom) switch_instance_changes.paddingBottom = ctx.paddingBottom;
				if (changed.tableWidth) switch_instance_changes.tableWidth = ctx.tableWidth;
				if (changed.visibleRows) switch_instance_changes.visibleRows = ctx.visibleRows;

				if (switch_value !== (switch_value = ctx.module)) {
					if (switch_instance) {
						const old_component = switch_instance;
						old_component._fragment.o(() => {
							old_component.destroy();
						});
					}

					if (switch_value) {
						switch_instance = new switch_value(switch_props(ctx));
						switch_instance._fragment.c();
						switch_instance._mount(text.parentNode, text);

						switch_instance.on("init", switch_instance_init);
					} else {
						switch_instance = null;
					}
				}

				else if (switch_value) {
					switch_instance._set(switch_instance_changes);
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				outrocallback = callAfter(outrocallback, 2);

				if (switch_instance) switch_instance._fragment.o(outrocallback);
				if (resizer) resizer._fragment.o(outrocallback);
				current = false;
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(first);
				}

				if (switch_instance) switch_instance.destroy(detach);
				if (detach) {
					detachNode(text);
				}

				resizer.destroy(detach);
			}
		};
	}

	// (14:5) {#each Object.entries($timeRangeMap) as [id, timeRange] (timeRange.id)}
	function create_each_block_4(component, key_1, ctx) {
		var first, current;

		var timerangeheader_spread_levels = [
			ctx.timeRange
		];

		var timerangeheader_initial_data = {};
		for (var i = 0; i < timerangeheader_spread_levels.length; i += 1) {
			timerangeheader_initial_data = assign(timerangeheader_initial_data, timerangeheader_spread_levels[i]);
		}
		var timerangeheader = new TimeRangeHeader({
			root: component.root,
			store: component.store,
			data: timerangeheader_initial_data
		});

		return {
			key: key_1,

			first: null,

			c: function create() {
				first = createComment();
				timerangeheader._fragment.c();
				this.first = first;
			},

			m: function mount(target, anchor) {
				insert(target, first, anchor);
				timerangeheader._mount(target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var timerangeheader_changes = (changed.Object || changed.$timeRangeMap) ? getSpreadUpdate(timerangeheader_spread_levels, [
					ctx.timeRange
				]) : {};
				timerangeheader._set(timerangeheader_changes);
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				if (timerangeheader) timerangeheader._fragment.o(outrocallback);
				current = false;
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(first);
				}

				timerangeheader.destroy(detach);
			}
		};
	}

	// (27:6) {#each visibleRows as row (row.model.id)}
	function create_each_block_3(component, key_1, ctx) {
		var first, current;

		var row_initial_data = { row: ctx.row };
		var row = new Row({
			root: component.root,
			store: component.store,
			data: row_initial_data
		});

		return {
			key: key_1,

			first: null,

			c: function create() {
				first = createComment();
				row._fragment.c();
				this.first = first;
			},

			m: function mount(target, anchor) {
				insert(target, first, anchor);
				row._mount(target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var row_changes = {};
				if (changed.visibleRows) row_changes.row = ctx.row;
				row._set(row_changes);
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				if (row) row._fragment.o(outrocallback);
				current = false;
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(first);
				}

				row.destroy(detach);
			}
		};
	}

	// (33:5) {#each Object.entries($timeRangeMap) as [id, timeRange] (timeRange.id)}
	function create_each_block_2(component, key_1, ctx) {
		var first, current;

		var timerange_spread_levels = [
			ctx.timeRange
		];

		var timerange_initial_data = {};
		for (var i = 0; i < timerange_spread_levels.length; i += 1) {
			timerange_initial_data = assign(timerange_initial_data, timerange_spread_levels[i]);
		}
		var timerange = new TimeRange({
			root: component.root,
			store: component.store,
			data: timerange_initial_data
		});

		return {
			key: key_1,

			first: null,

			c: function create() {
				first = createComment();
				timerange._fragment.c();
				this.first = first;
			},

			m: function mount(target, anchor) {
				insert(target, first, anchor);
				timerange._mount(target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var timerange_changes = (changed.Object || changed.$timeRangeMap) ? getSpreadUpdate(timerange_spread_levels, [
					ctx.timeRange
				]) : {};
				timerange._set(timerange_changes);
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				if (timerange) timerange._fragment.o(outrocallback);
				current = false;
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(first);
				}

				timerange.destroy(detach);
			}
		};
	}

	// (37:5) {#each visibleTasks as task (task.model.id)}
	function create_each_block_1(component, key_1, ctx) {
		var first, switch_instance_anchor, current;

		var switch_value = ctx.task.model.type === 'milestone' ? ctx.Milestone : ctx.Task;

		function switch_props(ctx) {
			var switch_instance_initial_data = {
			 	model: ctx.task.model,
			 	left: ctx.task.left,
			 	width: ctx.task.width,
			 	height: ctx.task.height,
			 	top: ctx.task.top
			 };
			return {
				root: component.root,
				store: component.store,
				data: switch_instance_initial_data
			};
		}

		if (switch_value) {
			var switch_instance = new switch_value(switch_props(ctx));
		}

		return {
			key: key_1,

			first: null,

			c: function create() {
				first = createComment();
				if (switch_instance) switch_instance._fragment.c();
				switch_instance_anchor = createComment();
				this.first = first;
			},

			m: function mount(target, anchor) {
				insert(target, first, anchor);

				if (switch_instance) {
					switch_instance._mount(target, anchor);
				}

				insert(target, switch_instance_anchor, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var switch_instance_changes = {};
				if (changed.visibleTasks) switch_instance_changes.model = ctx.task.model;
				if (changed.visibleTasks) switch_instance_changes.left = ctx.task.left;
				if (changed.visibleTasks) switch_instance_changes.width = ctx.task.width;
				if (changed.visibleTasks) switch_instance_changes.height = ctx.task.height;
				if (changed.visibleTasks) switch_instance_changes.top = ctx.task.top;

				if (switch_value !== (switch_value = ctx.task.model.type === 'milestone' ? ctx.Milestone : ctx.Task)) {
					if (switch_instance) {
						const old_component = switch_instance;
						old_component._fragment.o(() => {
							old_component.destroy();
						});
					}

					if (switch_value) {
						switch_instance = new switch_value(switch_props(ctx));
						switch_instance._fragment.c();
						switch_instance._mount(switch_instance_anchor.parentNode, switch_instance_anchor);
					} else {
						switch_instance = null;
					}
				}

				else if (switch_value) {
					switch_instance._set(switch_instance_changes);
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				if (switch_instance) switch_instance._fragment.o(outrocallback);
				current = false;
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(first);
					detachNode(switch_instance_anchor);
				}

				if (switch_instance) switch_instance.destroy(detach);
			}
		};
	}

	// (42:4) {#each _ganttBodyModules as module (module.key)}
	function create_each_block$4(component, key_1, ctx) {
		var first, switch_instance_anchor, current;

		var switch_value = ctx.module;

		function switch_props(ctx) {
			return {
				root: component.root,
				store: component.store
			};
		}

		if (switch_value) {
			var switch_instance = new switch_value(switch_props(ctx));
		}

		function switch_instance_init(event) {
			component.initModule(event.module);
		}

		if (switch_instance) switch_instance.on("init", switch_instance_init);

		return {
			key: key_1,

			first: null,

			c: function create() {
				first = createComment();
				if (switch_instance) switch_instance._fragment.c();
				switch_instance_anchor = createComment();
				this.first = first;
			},

			m: function mount(target, anchor) {
				insert(target, first, anchor);

				if (switch_instance) {
					switch_instance._mount(target, anchor);
				}

				insert(target, switch_instance_anchor, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				if (switch_value !== (switch_value = ctx.module)) {
					if (switch_instance) {
						const old_component = switch_instance;
						old_component._fragment.o(() => {
							old_component.destroy();
						});
					}

					if (switch_value) {
						switch_instance = new switch_value(switch_props(ctx));
						switch_instance._fragment.c();
						switch_instance._mount(switch_instance_anchor.parentNode, switch_instance_anchor);

						switch_instance.on("init", switch_instance_init);
					} else {
						switch_instance = null;
					}
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				if (switch_instance) switch_instance._fragment.o(outrocallback);
				current = false;
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(first);
					detachNode(switch_instance_anchor);
				}

				if (switch_instance) switch_instance.destroy(detach);
			}
		};
	}

	function Gantt(options) {
		this._debugName = '<Gantt>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}
		if (!options.store) {
			throw new Error("<Gantt> references store properties, but no store was provided");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(assign(assign({ Object : Object }, this.store._init(["visibleHeight","allRows","rowHeight","scrollTop","taskMap","allTasks","classes","headerHeight","width","timeRangeMap","visibleWidth"])), data$9()), options.data);
		this.store._add(this, ["visibleHeight","allRows","rowHeight","scrollTop","taskMap","allTasks","classes","headerHeight","width","timeRangeMap","visibleWidth"]);

		this._recompute({ $allRows: 1, $rowHeight: 1, $visibleHeight: 1, rowContainerHeight: 1, $scrollTop: 1, startIndex: 1, endIndex: 1, $allTasks: 1, $taskMap: 1, visibleRows: 1, rowTaskMap: 1 }, this._state);
		if (!('$visibleHeight' in this._state)) console.warn("<Gantt> was created without expected data property '$visibleHeight'");

		if (!('$allRows' in this._state)) console.warn("<Gantt> was created without expected data property '$allRows'");
		if (!('$rowHeight' in this._state)) console.warn("<Gantt> was created without expected data property '$rowHeight'");
		if (!('$scrollTop' in this._state)) console.warn("<Gantt> was created without expected data property '$scrollTop'");


		if (!('$taskMap' in this._state)) console.warn("<Gantt> was created without expected data property '$taskMap'");


		if (!('$allTasks' in this._state)) console.warn("<Gantt> was created without expected data property '$allTasks'");
		if (!('$classes' in this._state)) console.warn("<Gantt> was created without expected data property '$classes'");
		if (!('_ganttTableModules' in this._state)) console.warn("<Gantt> was created without expected data property '_ganttTableModules'");


		if (!('tableWidth' in this._state)) console.warn("<Gantt> was created without expected data property 'tableWidth'");
		if (!('$headerHeight' in this._state)) console.warn("<Gantt> was created without expected data property '$headerHeight'");

		if (!('$width' in this._state)) console.warn("<Gantt> was created without expected data property '$width'");

		if (!('$timeRangeMap' in this._state)) console.warn("<Gantt> was created without expected data property '$timeRangeMap'");
		if (!('zooming' in this._state)) console.warn("<Gantt> was created without expected data property 'zooming'");
		if (!('$visibleWidth' in this._state)) console.warn("<Gantt> was created without expected data property '$visibleWidth'");
		if (!('columns' in this._state)) console.warn("<Gantt> was created without expected data property 'columns'");

		if (!('Milestone' in this._state)) console.warn("<Gantt> was created without expected data property 'Milestone'");
		if (!('Task' in this._state)) console.warn("<Gantt> was created without expected data property 'Task'");
		if (!('_ganttBodyModules' in this._state)) console.warn("<Gantt> was created without expected data property '_ganttBodyModules'");
		this._intro = !!options.intro;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$11(this, this._state);

		this.root._oncreate.push(() => {
			oncreate$3.call(this);
			this.fire("update", { changed: assignTrue({}, this._state), current: this._state });
		});

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}

		this._intro = true;
	}

	assign(Gantt.prototype, protoDev);
	assign(Gantt.prototype, methods$3);

	Gantt.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('rowContainerHeight' in newState && !this._updatingReadonlyProperty) throw new Error("<Gantt>: Cannot set read-only property 'rowContainerHeight'");
		if ('rightScrollbarVisible' in newState && !this._updatingReadonlyProperty) throw new Error("<Gantt>: Cannot set read-only property 'rightScrollbarVisible'");
		if ('startIndex' in newState && !this._updatingReadonlyProperty) throw new Error("<Gantt>: Cannot set read-only property 'startIndex'");
		if ('endIndex' in newState && !this._updatingReadonlyProperty) throw new Error("<Gantt>: Cannot set read-only property 'endIndex'");
		if ('paddingTop' in newState && !this._updatingReadonlyProperty) throw new Error("<Gantt>: Cannot set read-only property 'paddingTop'");
		if ('paddingBottom' in newState && !this._updatingReadonlyProperty) throw new Error("<Gantt>: Cannot set read-only property 'paddingBottom'");
		if ('visibleRows' in newState && !this._updatingReadonlyProperty) throw new Error("<Gantt>: Cannot set read-only property 'visibleRows'");
		if ('rowTaskMap' in newState && !this._updatingReadonlyProperty) throw new Error("<Gantt>: Cannot set read-only property 'rowTaskMap'");
		if ('visibleTasks' in newState && !this._updatingReadonlyProperty) throw new Error("<Gantt>: Cannot set read-only property 'visibleTasks'");
	};

	Gantt.prototype._recompute = function _recompute(changed, state) {
		if (changed.$allRows || changed.$rowHeight) {
			if (this._differs(state.rowContainerHeight, (state.rowContainerHeight = rowContainerHeight(state)))) changed.rowContainerHeight = true;
		}

		if (changed.$visibleHeight || changed.rowContainerHeight) {
			if (this._differs(state.rightScrollbarVisible, (state.rightScrollbarVisible = rightScrollbarVisible(state)))) changed.rightScrollbarVisible = true;
		}

		if (changed.$scrollTop || changed.$rowHeight) {
			if (this._differs(state.startIndex, (state.startIndex = startIndex(state)))) changed.startIndex = true;
		}

		if (changed.startIndex || changed.$visibleHeight || changed.$rowHeight || changed.$allRows) {
			if (this._differs(state.endIndex, (state.endIndex = endIndex(state)))) changed.endIndex = true;
		}

		if (changed.startIndex || changed.$rowHeight) {
			if (this._differs(state.paddingTop, (state.paddingTop = paddingTop(state)))) changed.paddingTop = true;
		}

		if (changed.$allRows || changed.endIndex || changed.$rowHeight) {
			if (this._differs(state.paddingBottom, (state.paddingBottom = paddingBottom(state)))) changed.paddingBottom = true;
		}

		if (changed.$allRows || changed.startIndex || changed.endIndex) {
			if (this._differs(state.visibleRows, (state.visibleRows = visibleRows(state)))) changed.visibleRows = true;
		}

		if (changed.$allTasks) {
			if (this._differs(state.rowTaskMap, (state.rowTaskMap = rowTaskMap(state)))) changed.rowTaskMap = true;
		}

		if (changed.$taskMap || changed.visibleRows || changed.rowTaskMap) {
			if (this._differs(state.visibleTasks, (state.visibleTasks = visibleTasks(state)))) changed.visibleTasks = true;
		}
	};

	setup(Gantt);

	return Gantt;

}(moment));
//# sourceMappingURL=svelteGantt.js.map
