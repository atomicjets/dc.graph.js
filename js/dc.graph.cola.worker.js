/*!
 *  dc.graph 0.8.0
 *  http://dc-js.github.io/dc.graph.js/
 *  Copyright 2015-2019 AT&T Intellectual Property & the dc.graph.js Developers
 *  https://github.com/dc-js/dc.graph.js/blob/master/AUTHORS
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */
/**
 * The entire dc.graph.js library is scoped under the **dc_graph** name space. It does not introduce
 * anything else into the global name space.
 *
 * Like in dc.js and most libraries built on d3, most `dc_graph` functions are designed to allow function chaining, meaning they return the current diagram
 * instance whenever it is appropriate.  The getter forms of functions do not participate in function
 * chaining because they return values that are not the diagram.
 * @namespace dc_graph
 * @version 0.8.0
 * @example
 * // Example chaining
 * diagram.width(600)
 *      .height(400)
 *      .nodeDimension(nodeDim)
 *      .nodeGroup(nodeGroup);
 */

var dc_graph = {
    version: '0.8.0',
    constants: {
        CHART_CLASS: 'dc-graph'
    }
};

function get_original(x) {
    return x.orig;
}

function identity(x) {
    return x;
};

var property = function (defaultValue, unwrap) {
    if(unwrap === undefined)
        unwrap = get_original;
    else if(unwrap === false)
        unwrap = identity;
    var value = defaultValue, react = null;
    var cascade = [];
    var ret = function (_) {
        if (!arguments.length) {
            return value;
        }
        if(react)
            react(_);
        value = _;
        return this;
    };
    ret.cascade = function (n, f) {
        for(var i = 0; i<cascade.length; ++i) {
            if(cascade[i].n === n) {
                if(f)
                    cascade[i].f = f;
                else cascade.splice(i, 1);
                return ret;
            } else if(cascade[i].n > n) {
                cascade.splice(i, 0, {n: n, f: f});
                return ret;
            }
        }
        cascade.push({n: n, f: f});
        return ret;
    };
    ret._eval = function(o, n) {
        if(n===0 || !cascade.length)
            return dc_graph.functor_wrap(ret(), unwrap)(o);
        else {
            var last = cascade[n-1];
            return last.f(o, function() {
                return ret._eval(o, n-1);
            });
        }
    };
    ret.eval = function(o) {
        return ret._eval(o, cascade.length);
    };
    ret.react = function(_) {
        if (!arguments.length) {
            return react;
        }
        react = _;
        return this;
    };
    return ret;
};

function named_children() {
    var _children = {};
    var f = function(id, object) {
        if(arguments.length === 1)
            return _children[id];
        // do not notify unnecessarily
        if(_children[id] === object)
            return this;
        if(_children[id])
            _children[id].parent(null);
        _children[id] = object;
        if(object)
            object.parent(this);
        return this;
    };
    f.enum = function() {
        return Object.keys(_children);
    };
    f.nameOf = function(o) {
        var found = Object.entries(_children).find(function(kv) {
            return kv[1] == o;
        });
        return found ? found[0] : null;
    };
    return f;
}

function deprecated_property(message, defaultValue) {
    var prop = property(defaultValue);
    var ret = function() {
        if(arguments.length) {
            console.warn(message);
            prop.apply(property, arguments);
            return this;
        }
        return prop();
    };
    ['cascade', '_eval', 'eval', 'react'].forEach(function(method) {
        ret[method] = prop[method];
    });
    return ret;
}

function deprecation_warning(message) {
    var said = false;
    return function() {
        if(said)
            return;
        console.warn(message);
        said = true;
    };
}

function deprecate_function(message, f) {
    var dep = deprecation_warning(message);
    return function() {
        dep();
        return f.apply(this, arguments);
    };
}

// http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

function is_ie() {
    var ua = window.navigator.userAgent;

    return(ua.indexOf('MSIE ') > 0 ||
           ua.indexOf('Trident/') > 0 ||
           ua.indexOf('Edge/') > 0);
}

function is_safari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

// polyfill Object.assign for IE
// it's just too useful to do without
if (typeof Object.assign != 'function') {
  // Must be writable: true, enumerable: false, configurable: true
  Object.defineProperty(Object, "assign", {
    value: function assign(target, varArgs) { // .length of function is 2
      'use strict';
      if (target == null) { // TypeError if undefined or null
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var to = Object(target);

      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];

        if (nextSource != null) { // Skip over if undefined or null
          for (var nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true
  });
}


// https://tc39.github.io/ecma262/#sec-array.prototype.includes
if (!Array.prototype.includes) {
  Object.defineProperty(Array.prototype, 'includes', {
    value: function(valueToFind, fromIndex) {

      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      // 1. Let O be ? ToObject(this value).
      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If len is 0, return false.
      if (len === 0) {
        return false;
      }

      // 4. Let n be ? ToInteger(fromIndex).
      //    (If fromIndex is undefined, this step produces the value 0.)
      var n = fromIndex | 0;

      // 5. If n >= 0, then
      //  a. Let k be n.
      // 6. Else n < 0,
      //  a. Let k be len + n.
      //  b. If k < 0, let k be 0.
      var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

      function sameValueZero(x, y) {
        return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
      }

      // 7. Repeat, while k < len
      while (k < len) {
        // a. Let elementK be the result of ? Get(O, ! ToString(k)).
        // b. If SameValueZero(valueToFind, elementK) is true, return true.
        if (sameValueZero(o[k], valueToFind)) {
          return true;
        }
        // c. Increase k by 1.
        k++;
      }

      // 8. Return false
      return false;
    }
  });
}

if (!Object.entries) {
  Object.entries = function( obj ){
    var ownProps = Object.keys( obj ),
        i = ownProps.length,
        resArray = new Array(i); // preallocate the Array
    while (i--)
      resArray[i] = [ownProps[i], obj[ownProps[i]]];
    return resArray;
  };
}

// https://github.com/KhaledElAnsari/Object.values
Object.values = Object.values ? Object.values : function(obj) {
    var allowedTypes = ["[object String]", "[object Object]", "[object Array]", "[object Function]"];
    var objType = Object.prototype.toString.call(obj);

    if(obj === null || typeof obj === "undefined") {
	throw new TypeError("Cannot convert undefined or null to object");
    } else if(!~allowedTypes.indexOf(objType)) {
	return [];
    } else {
	// if ES6 is supported
	if (Object.keys) {
	    return Object.keys(obj).map(function (key) {
		return obj[key];
	    });
	}

	var result = [];
	for (var prop in obj) {
	    if (obj.hasOwnProperty(prop)) {
		result.push(obj[prop]);
	    }
	}

	return result;
    }
};

function getBBoxNoThrow(elem) {
    // firefox seems to have issues with some of my texts
    // just catch for now
    try {
        return elem.getBBox();
    } catch(xep) {
        return {x: 0, y: 0, width:0, height: 0};
    }
}

// create or re-use objects in a map, delete the ones that were not reused
function regenerate_objects(preserved, list, need, key, assign, create, destroy) {
    if(!create) create = function(k, o) { };
    if(!destroy) destroy = function(k) { };
    var keep = {};
    function wrap(o) {
        var k = key(o);
        if(!preserved[k])
            create(k, preserved[k] = {}, o);
        var o1 = preserved[k];
        assign(o1, o);
        keep[k] = true;
        return o1;
    }
    var wlist = list.map(wrap);
    if(need)
        need.forEach(function(k) {
            if(!preserved[k]) { // hasn't been created, needs to be
                create(k, preserved[k] = {}, null);
                assign(preserved[k], null);
            }
            if(!keep[k]) { // wasn't in list, should be
                wlist.push(preserved[k]);
                keep[k] = true;
            }
        });
    // delete any objects from last round that are no longer used
    for(var k in preserved)
        if(!keep[k]) {
            destroy(k, preserved[k]);
            delete preserved[k];
        }
    return wlist;
}

/**
 * `dc_graph.graphviz_attrs defines a basic set of attributes which layout engines should
 * implement - although these are not required, they make it easier for clients and
 * modes (like expand_collapse) to work with multiple layout engines.
 *
 * these attributes are {@link http://www.graphviz.org/doc/info/attrs.html from graphviz}
 * @class graphviz_attrs
 * @memberof dc_graph
 * @return {Object}
 **/
dc_graph.graphviz_attrs = function() {
    return {
        /**
         * Direction to draw ranks.
         * @method rankdir
         * @memberof dc_graph.graphviz_attrs
         * @instance
         * @param {String} [rankdir='TB'] 'TB', 'LR', 'BT', or 'RL'
         **/
        rankdir: property('TB'),
        /**
         * Spacing in between nodes in the same rank.
         * @method nodesep
         * @memberof dc_graph.graphviz_attrs
         * @instance
         * @param {String} [nodesep=40]
         **/
        nodesep: property(40),
        /**
         * Spacing in between ranks.
         * @method ranksep
         * @memberof dc_graph.graphviz_attrs
         * @instance
         * @param {String} [ranksep=40]
         **/
        ranksep: property(40)
    };
};

// graphlib-dot seems to wrap nodes in an extra {value}
// actually this is quite a common problem with generic libs
function nvalue(n) {
    return n.value.value ? n.value.value : n.value;
}

// apply standard accessors to a diagram in order to style it as graphviz would
// this is a work in progress
dc_graph.apply_graphviz_accessors = function(diagram) {
    diagram
        .nodeLabel(function(n) {
            var label = nvalue(n).label;
            if(label === undefined)
                label = n.key;
            return label && label.split(/\n|\\n/);
        })
        .nodeRadius(function(n) {
            // should do width & height instead, #25
            return nvalue(n).radius || 25;
        })
        .nodeShape(function(n) { return nvalue(n).shape; })
        .nodeFill(function(n) { return nvalue(n).fillcolor || 'white'; })
        .nodeOpacity(function(n) {
            // not standard gv
            return nvalue(n).opacity || 1;
        })
        .nodeLabelFill(function(n) { return nvalue(n).fontcolor || 'black'; })
        .nodeTitle(function(n) {
            return nvalue(n).tooltip !== undefined ?
                nvalue(n).tooltip :
                diagram.nodeLabel()(n);
        })
        .nodeStrokeWidth(function(n) {
            // it is debatable whether a point === a pixel but they are close
            // https://graphicdesign.stackexchange.com/questions/199/point-vs-pixel-what-is-the-difference
            var penwidth = nvalue(n).penwidth;
            return penwidth !== undefined ? +penwidth : 1;
        })
        .edgeLabel(function(e) { return e.value.label ? e.value.label.split(/\n|\\n/) : ''; })
        .edgeStroke(function(e) { return e.value.color || 'black'; })
        .edgeOpacity(function(e) {
            // not standard gv
            return e.value.opacity || 1;
        })
        .edgeArrowSize(function(e) {
            return e.value.arrowsize || 1;
        })
        // need directedness to default these correctly, see #106
        .edgeArrowhead(function(e) {
            var head = e.value.arrowhead;
            return head !== undefined ? head : 'vee';
        })
        .edgeArrowtail(function(e) {
            var tail = e.value.arrowtail;
            return tail !== undefined ? tail : null;
        })
        .edgeStrokeDashArray(function(e) {
            switch(e.value.style) {
            case 'dotted':
                return [1,5];
            }
            return null;
        });
};

dc_graph.snapshot_graphviz = function(diagram) {
    var xDomain = diagram.x().domain(), yDomain = diagram.y().domain();
    return {
        nodes: diagram.nodeGroup().all().map(function(n) {
            return diagram.getWholeNode(n.key);
        })
            .filter(function(x) { return x; })
            .map(function(n) {
                return {
                    key: diagram.nodeKey.eval(n),
                    label: diagram.nodeLabel.eval(n),
                    fillcolor: diagram.nodeFillScale()(diagram.nodeFill.eval(n)),
                    penwidth: diagram.nodeStrokeWidth.eval(n),
                    // not supported as input, see dc.graph.js#25
                    // width: n.cola.dcg_rx*2,
                    // height: n.cola.dcg_ry*2,

                    // not graphviz attributes
                    // until we have w/h
                    radius: diagram.nodeRadius.eval(n),
                    // does not seem to exist in gv
                    opacity: diagram.nodeOpacity.eval(n),
                    // should be pos
                    x: n.cola.x,
                    y: n.cola.y
                };
            }),
        edges: diagram.edgeGroup().all().map(function(e) {
            return diagram.getWholeEdge(e.key);
        }).map(function(e) {
            return {
                key: diagram.edgeKey.eval(e),
                source: diagram.edgeSource.eval(e),
                target: diagram.edgeTarget.eval(e),
                color: diagram.edgeStroke.eval(e),
                arrowsize: diagram.edgeArrowSize.eval(e),
                opacity: diagram.edgeOpacity.eval(e),
                // should support dir, see dc.graph.js#106
                arrowhead: diagram.edgeArrowhead.eval(e),
                arrowtail: diagram.edgeArrowtail.eval(e)
            };
        }),
        bounds: {
            left: xDomain[0],
            top: yDomain[0],
            right: xDomain[1],
            bottom: yDomain[1]
        }
    };
};

/**
 * `dc_graph.cola_layout` is an adaptor for cola.js layouts in dc.graph.js
 * @class cola_layout
 * @memberof dc_graph
 * @param {String} [id=uuid()] - Unique identifier
 * @return {dc_graph.cola_layout}
 **/
dc_graph.cola_layout = function(id) {
    var _layoutId = id || uuid();
    var _d3cola = null;
    var _dispatch = d3.dispatch('tick', 'start', 'end');
    var _flowLayout;
    // node and edge objects shared with cola.js, preserved from one iteration
    // to the next (as long as the object is still in the layout)
    var _nodes = {}, _edges = {};
    var _options;

    function init(options) {
        _options = options;
        _d3cola = cola.d3adaptor()
            .avoidOverlaps(true)
            .size([options.width, options.height])
            .handleDisconnected(options.handleDisconnected);

        if(_d3cola.tickSize) // non-standard
            _d3cola.tickSize(options.tickSize);

        switch(options.lengthStrategy) {
        case 'symmetric':
            _d3cola.symmetricDiffLinkLengths(options.baseLength);
            break;
        case 'jaccard':
            _d3cola.jaccardLinkLengths(options.baseLength);
            break;
        case 'individual':
            _d3cola.linkDistance(function(e) {
                return e.dcg_edgeLength || options.baseLength;
            });
            break;
        case 'none':
        default:
        }
        if(options.flowLayout) {
            _d3cola.flowLayout(options.flowLayout.axis, options.flowLayout.minSeparation);
        }
    }

    function data(nodes, edges, constraints) {
        var wnodes = regenerate_objects(_nodes, nodes, null, function(v) {
            return v.dcg_nodeKey;
        }, function(v1, v) {
            v1.dcg_nodeKey = v.dcg_nodeKey;
            v1.width = v.width;
            v1.height = v.height;
            v1.fixed = !!v.dcg_nodeFixed;
            _options.nodeAttrs.forEach(function(key) {
                v1[key] = v[key];
            });

            if(v1.fixed && typeof v.dcg_nodeFixed === 'object') {
                v1.x = v.dcg_nodeFixed.x;
                v1.y = v.dcg_nodeFixed.y;
            }
            else {
                // should we support e.g. null to unset x,y?
                if(v.x !== undefined)
                    v1.x = v.x;
                if(v.y !== undefined)
                    v1.y = v.y;
            }
        });
        var wedges = regenerate_objects(_edges, edges, null, function(e) {
            return e.dcg_edgeKey;
        }, function(e1, e) {
            e1.dcg_edgeKey = e.dcg_edgeKey;
            // cola edges can work with indices or with object references
            // but it will replace indices with object references
            e1.source = _nodes[e.dcg_edgeSource];
            e1.target = _nodes[e.dcg_edgeTarget];
            e1.dcg_edgeLength = e.dcg_edgeLength;
            _options.edgeAttrs.forEach(function(key) {
                e1[key] = e[key];
            });
        });

        // cola needs each node object to have an index property
        wnodes.forEach(function(v, i) {
            v.index = i;
        });

        var groups = null;
        if(engine.groupConnected()) {
            var components = cola.separateGraphs(wnodes, wedges);
            groups = components.map(function(g) {
                return {leaves: g.array.map(function(n) { return n.index; })};
            });
        }

        function dispatchState(event) {
            // clean up extra setcola annotations
            wnodes.forEach(function(n) {
                Object.keys(n).forEach(function(key) {
                    if(/^get/.test(key) && typeof n[key] === 'function')
                        delete n[key];
                });
            });
            _dispatch[event](
                wnodes,
                wedges.map(function(e) {
                    return {dcg_edgeKey: e.dcg_edgeKey};
                })
            );
        }
        _d3cola.on('tick', /* _tick = */ function() {
            dispatchState('tick');
        }).on('start', function() {
            _dispatch.start();
        }).on('end', /* _done = */ function() {
            dispatchState('end');
        });

        if(_options.setcolaSpec) {
            console.log('generating setcola constrains');
            var setcola_result = setcola
                .nodes(wnodes)
                .links(wedges)
                .constraints(_options.setcolaSpec)
                .gap(10) //default value is 10, can be customized in setcolaSpec
                .layout();

            _d3cola.nodes(setcola_result.nodes)
                .links(setcola_result.links)
                .constraints(setcola_result.constraints)
                .groups(groups);
        } else {
            _d3cola.nodes(wnodes)
                .links(wedges)
                .constraints(constraints)
                .groups(groups);
        }

    }

    function start() {
        _d3cola.start(engine.unconstrainedIterations(),
                      engine.userConstraintIterations(),
                      engine.allConstraintsIterations(),
                      engine.gridSnapIterations());
    }

    function stop() {
        if(_d3cola)
            _d3cola.stop();
    }

    var graphviz = dc_graph.graphviz_attrs(), graphviz_keys = Object.keys(graphviz);
    graphviz.rankdir(null);

    var engine = Object.assign(graphviz, {
        layoutAlgorithm: function() {
            return 'cola';
        },
        layoutId: function() {
            return _layoutId;
        },
        supportsWebworker: function() {
            return true;
        },
        parent: property(null),
        on: function(event, f) {
            if(arguments.length === 1)
                return _dispatch.on(event);
            _dispatch.on(event, f);
            return this;
        },
        init: function(options) {
            this.optionNames().forEach(function(option) {
                options[option] = options[option] || this[option]();
            }.bind(this));
            init(options);
            return this;
        },
        data: function(graph, nodes, edges, constraints) {
            data(nodes, edges, constraints);
        },
        start: function() {
            start();
        },
        stop: function() {
            stop();
        },
        optionNames: function() {
            return ['handleDisconnected', 'lengthStrategy', 'baseLength', 'flowLayout',
                    'tickSize', 'groupConnected', 'setcolaSpec']
                .concat(graphviz_keys);
        },
        passThru: function() {
            return ['annotateNode', 'annotateEdge', 'extractNodeAttrs', 'extractEdgeAttrs'];
        },
        propagateOptions: function(options) {
            options.nodeAttrs = Object.keys(engine.extractNodeAttrs());
            options.edgeAttrs = Object.keys(engine.extractEdgeAttrs());
        },
        populateLayoutNode: function() {},
        populateLayoutEdge: function() {},
        annotateNode: function(lv, v) {
            Object.keys(engine.extractNodeAttrs()).forEach(function(key) {
                lv[key] = engine.extractNodeAttrs()[key](v.orig);
            });
        },
        annotateEdge: function(le, e) {
            Object.keys(engine.extractEdgeAttrs()).forEach(function(key) {
                le[key] = engine.extractEdgeAttrs()[key](e.orig);
            });
        },
        /**
         * Instructs cola.js to fit the connected components.
         * @method handleDisconnected
         * @memberof dc_graph.cola_layout
         * @instance
         * @param {Boolean} [handleDisconnected=true]
         * @return {Boolean}
         * @return {dc_graph.cola_layout}
         **/
        handleDisconnected: property(true),
        /**
         * Currently, three strategies are supported for specifying the lengths of edges:
         * * 'individual' - uses the `edgeLength` for each edge. If it returns falsy, uses the
         * `baseLength`
         * * 'symmetric', 'jaccard' - compute the edge length based on the graph structure around
         * the edge. See
         * {@link https://github.com/tgdwyer/WebCola/wiki/link-lengths the cola.js wiki}
         * for more details.
         * 'none' - no edge lengths will be specified
         * @method lengthStrategy
         * @memberof dc_graph.cola_layout
         * @instance
         * @param {Function|String} [lengthStrategy='symmetric']
         * @return {Function|String}
         * @return {dc_graph.cola_layout}
         **/
        lengthStrategy: property('symmetric'),
        /**
         * Gets or sets the default edge length (in pixels) when the `.lengthStrategy` is
         * 'individual', and the base value to be multiplied for 'symmetric' and 'jaccard' edge
         * lengths.
         * @method baseLength
         * @memberof dc_graph.cola_layout
         * @instance
         * @param {Number} [baseLength=30]
         * @return {Number}
         * @return {dc_graph.cola_layout}
         **/
        baseLength: property(30),
        /**
         * If `flowLayout` is set, it determines the axis and separation for
         * {@link http://marvl.infotech.monash.edu/webcola/doc/classes/cola.layout.html#flowlayout cola flow layout}.
         * If it is not set, `flowLayout` will be calculated from the {@link dc_graph.graphviz_attrs#rankdir rankdir}
         * and {@link dc_graph.graphviz_attrs#ranksep ranksep}; if `rankdir` is also null (the
         * default for cola layout), then there will be no flow.
         * @method flowLayout
         * @memberof dc_graph.cola_layout
         * @instance
         * @param {Object} [flowLayout=null]
         * @example
         * // No flow (default)
         * diagram.flowLayout(null)
         * // flow in x with min separation 200
         * diagram.flowLayout({axis: 'x', minSeparation: 200})
         **/
        flowLayout: function(flow) {
            if(!arguments.length) {
                if(_flowLayout)
                    return _flowLayout;
                var dir = engine.rankdir();
                switch(dir) {
                case 'LR': return {axis: 'x', minSeparation: engine.ranksep() + engine.parent().nodeRadius()*2};
                case 'TB': return {axis: 'y', minSeparation: engine.ranksep() + engine.parent().nodeRadius()*2};
                default: return null; // RL, BT do not appear to be possible (negative separation) (?)
                }
            }
            _flowLayout = flow;
            return this;
        },
        unconstrainedIterations: property(10),
        userConstraintIterations: property(20),
        allConstraintsIterations: property(20),
        gridSnapIterations: property(0),
        tickSize: property(1),
        groupConnected: property(false),
        setcolaSpec: property(null),
        extractNodeAttrs: property({}), // {attr: function(node)}
        extractEdgeAttrs: property({})
    });
    return engine;
};

dc_graph.cola_layout.scripts = ['d3.js', 'cola.js', 'setcola.js'];

var _layouts;

function postResponse(event, layoutId) {
    return function() {
        var message = {
            response: event,
            layoutId: layoutId
        };
        message.args = Array.prototype.slice.call(arguments);
        postMessage(message);
    };
}

onmessage = function(e) {
    var args = e.data.args;
    switch(e.data.command) {
    case 'init':
        // find a function under dc_graph that has `scripts`
        var layout_name;
        for(var name in dc_graph) {
            if(typeof dc_graph[name] === 'function' && dc_graph[name].scripts)
                layout_name = name;
        }
        if(!_layouts) {
            _layouts = {};
            importScripts.apply(null, dc_graph[layout_name].scripts);
        }

        _layouts[args.layoutId] = dc_graph[layout_name]()
            .on('tick', postResponse('tick', args.layoutId))
            .on('start', postResponse('start', args.layoutId))
            .on('end', postResponse('end', args.layoutId))
            .init(args.options);
        break;
    case 'data':
        if(_layouts)
            _layouts[args.layoutId].data(args.graph, args.nodes, args.edges, args.constraints);
        break;
    case 'start':
        // if(args.initialOnly) {
        //     if(args.showLayoutSteps)
        //         _tick();
        //     _done();
        // }
        // else
        _layouts[args.layoutId].start();
        break;
    case 'stop':
        if(_layouts)
            _layouts[args.layoutId].stop();
        break;
    }
};


//# sourceMappingURL=dc.graph.cola.worker.js.map