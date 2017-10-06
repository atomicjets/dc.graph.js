function port_name(nodeId, edgeId, portName) {
    return (nodeId ? 'node/' + nodeId : 'edge/' + edgeId) + '/' + portName;
};
function split_port_name(portname) {
    var parts = portname.split('/');
    if(parts[0] === 'node')
        return {
            nodeKey: parts[1],
            name: parts[2]
        };
    else return {
        edgeKey: parts[1],
        name: parts[2]
    };
}

dc_graph.place_ports = function(diagram, nodes, wnodes, edges, wedges, ports, wports) {
    var node_ports = {};

    // assemble port-lists for nodes, again because we don't have a metagraph.
    wports.forEach(function(p) {
        var nid = diagram.nodeKey.eval(p.node);
        var np = node_ports[nid] = node_ports[nid] || [];
        np.push(p);
    });

    function norm(v) {
        var len = Math.hypot(v[0], v[1]);
        return [v[0]/len, v[1]/len];
    }
    function edge_vec(n, e) {
        var dy = e.target.cola.y - e.source.cola.y,
            dx = e.target.cola.x - e.source.cola.x;
        if(e.source !== n)
            dy = -dy, dx = -dx;
        return norm([dx, dy]);
    }
    function is_ccw(u, v) {
        return u[0]*v[1] - u[1]*v[0] > 0;
    }
    function in_bounds(v, bounds) {
        // assume bounds are ccw
        return is_ccw(bounds[0], v) && is_ccw(v, bounds[1]);
    }
    function clip(v, bounds) {
        if(is_ccw(v, bounds[0]))
            return bounds[0];
        else if(is_ccw(bounds[1], v))
            return bounds[1];
        else return v;
    }
    function a_to_v(a) {
        return [Math.cos(a), Math.sin(a)];
    }
    function v_to_a(v) {
        return Math.atan2(v[1], v[0]);
    }
    function project(n, p) {
        p.pos = diagram.shape(n.dcg_shape.shape).intersect_vec(n, p.vec[0]*1000, p.vec[1]*1000);
    }
    // calculate port positions (currently very stupid)
    for(var nid in node_ports) {
        var n = nodes[nid],
            nports = node_ports[nid];
        nports.forEach(function(p) {
            if(p.edges.length) {
                var vecs = p.edges.map(edge_vec.bind(null, n));
                p.vec = [
                    d3.sum(vecs, function(v) { return v[0]; })/vecs.length,
                    d3.sum(vecs, function(v) { return v[1]; })/vecs.length
                ];
            } else p.vec = p.vec || undefined;
            if(p.orig) { // only specified ports have bounds
                var bounds = diagram.portBounds.eval(p);
                if(Array.isArray(bounds[0]))
                    p.bounds = bounds;
                else p.bounds = bounds.map(a_to_v);
            }
        });
        var inside = [], outside = [], unplaced = [];
        nports.forEach(function(p) {
            if(!p.vec)
                unplaced.push(p);
            else if(p.bounds && !in_bounds(p.vec, p.bounds))
               outside.push(p);
            else
                inside.push(p);
        });

        // for now, just shunt outside ports into their bounds and then place unplaced
        // would like to use 1D force directed here
        outside.forEach(function(p) {
            p.vec = clip(p.vec, p.bounds);
            inside.push(p);
        });
        // project any we know onto the border
        inside.forEach(function(p) {
            project(n, p);
        });
        // place any remaining by trying random spots within the range until it misses all or we give up
        var patience = dc_graph.place_ports.NFAILS;
        while(unplaced.length) {
            var p = unplaced[0];
            var bang = p.bounds.map(v_to_a);
            if(bang[0] > bang[1])
                bang[1] += 2*Math.PI;
            p.vec = a_to_v(bang[0] + Math.random()*(bang[1] - bang[0]));
            project(n, p);
            if(!patience-- || inside.every(function(p2) {
                return Math.hypot(p2.pos.x - p.pos.x, p2.pos.y - p.pos.y) > dc_graph.place_ports.MIN_DISTANCE;
            })) {
                inside.push(p);
                unplaced.shift();
                if(!patience)
                    console.warn('ran out of patience placing a port');
                patience = dc_graph.place_ports.NFAILS;
            }
        }
    }

    // propagate port positions to edge endpoints
    wedges.forEach(function(e) {
        var name = diagram.edgeSourcePortName.eval(e);
        e.sourcePort.pos = name ? ports[port_name(diagram.nodeKey.eval(e.source), null, name)].pos :
            ports[port_name(null, diagram.edgeKey.eval(e), 'source')].pos;
        name = diagram.edgeTargetPortName.eval(e);
        e.targetPort.pos = name ? ports[port_name(diagram.nodeKey.eval(e.target), null, name)].pos :
            ports[port_name(null, diagram.edgeKey.eval(e), 'target')].pos;
    });
    return node_ports;
};
dc_graph.place_ports.MIN_DISTANCE = 30;
dc_graph.place_ports.NFAILS = 5;
