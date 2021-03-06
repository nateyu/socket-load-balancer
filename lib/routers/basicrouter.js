/*jslint node: true, nomen: true, es5: true */
/**
 * Developed By Carlo Bernaschina (GitHub - B3rn475)
 * www.bernaschina.com
 *
 * Distributed under the MIT Licence
 */
"use strict";

var events = require('events'),
    path = require('path'),
    util = require('util');

function nope() {}

function isIPRoute(route) {
    if (typeof route.port === undefined) {
        return false;
    }
    if (typeof route.port !== 'number') {
        return false;
    }
    return true;
}

function isLocalSocketRoute(route) {
    if (typeof route.path === undefined) {
        return false;
    }
    if (typeof route.path !== 'string') {
        return false;
    }
    return true;
}

function BasicRouter(options, onRouteAdded, onRouteRemoved) {
    if (!(this instanceof BasicRouter)) {
        return new BasicRouter(options, onRouteAdded, onRouteRemoved);
    }
    if (typeof onRouteAdded !== 'function') {
        throw new Error('Missing onRouteAdded callback');
    }
    if (typeof onRouteRemoved !== 'function') {
        throw new Error('Missing onRouteRemoved callback');
    }
    events.EventEmitter.call(this);

    options = options || {};

    var self = this,
        hosts = {}, // hosts lookup for removal and avoid duplicates
        paths = {}; // paths lookup for removal and avoid duplicates

    function addIPRoute(route) {
        var KO,
            internal,
            fixedhost;
        if (route.host !== undefined) {
            if (typeof route.host !== 'string') {
                KO = true;
            } else {
                if (route.localAddress !== undefined) {
                    if (typeof route.localAddress !== 'string') {
                        KO = true;
                    }
                }
            }
        }
        if (KO) {
            throw new Error('Error adding ip Route - Invalid Route');
        }
        fixedhost = route.host || 'localhost';
        if (hosts[fixedhost] === undefined) { // no routes known for the host
            hosts[fixedhost] = {};
        }
        if (hosts[fixedhost][route.port] === undefined) { // no routes known for port on the particular host
            internal = {
                host: route.host,
                port: route.port
            }; // avoid side effects and allow lookup
            if (internal.host !== undefined) {
                internal.localAddress = route.localAddress;
            }
            hosts[fixedhost][route.port] = internal; // register in the lookup
            onRouteAdded(internal); // emit private event
            self.emit('routeAdded', {
                port: internal.port,
                host: internal.host,
                localAddress: internal.localAddress
            }); // emit public event (avoid side effects)
        }
    }

    function addLocalSocketRoute(route) {
        var resolvedPath = path.resolve(route.path),
            internal;
        if (paths[resolvedPath] === undefined) { // no routes known for the path
            internal = {
                path: resolvedPath
            }; // avoid side effects and allow lookup
            paths[resolvedPath] = internal; // register in the lookup
            onRouteAdded(internal); // emit private event
            self.emit('routeAdded', {
                path: internal.path
            }); // emit public event (avoid side effects)
        }
    }

    this.addRoute = function (route) {
        if (util.isArray(route)) {
            route.forEach(this.addRoute, this);
        } else if (typeof route === 'object') {
            if (isIPRoute(route)) {
                addIPRoute(route);
            } else if (isLocalSocketRoute(route)) {
                addLocalSocketRoute(route);
            } else {
                throw new Error('Error adding Route - Invalid Route');
            }
        } else {
            throw new Error('Error adding Route - Route is not an Object');
        }
        return this;
    };

    function removeIPRoute(route) {
        var KO,
            internal,
            fixedhost;
        if (route.host !== undefined) {
            if (typeof route.host !== 'string') {
                KO = true;
            } else {
                if (route.localAddress !== undefined) {
                    if (typeof route.localAddress !== 'string') {
                        KO = true;
                    }
                }
            }
        }
        if (KO) {
            throw new Error('Error removing ip Route - Invalid Route');
        }
        fixedhost = route.host || 'localhost';
        if (hosts[fixedhost] !== undefined && hosts[fixedhost][route.port] !== undefined) { // the route is registered
            internal = hosts[fixedhost][route.port];
            delete hosts[fixedhost][route.port];
			if (Object.keys(hosts[fixedhost]).length === 0) {
				delete hosts[fixedhost];
			}
            onRouteRemoved(internal); // emit private event
            self.emit('routeRemoved', {
                port: internal.port,
                host: internal.host,
                localAddress: internal.localAddress
            }); // emit public event (avoid side effects)
        }
        return self;
    }

    function removeLocalSocketRoute(route) {
        var resolvedPath = path.resolve(route.path),
            internal;
        if (paths[resolvedPath] !== undefined) { // the route is registered
            internal = paths[resolvedPath];
            delete paths[resolvedPath];
            onRouteRemoved(internal); // emit private event
            self.emit('routeRemoved', {
                path: internal.path
            }); // emit public event (avoid side effects)
        }
        return self;
    }

    this.removeRoute = function (route) {
        if (util.isArray(route)) {
            route.forEach(this.removeRoute, this);
        } else if (typeof route === 'object') {
            if (isIPRoute(route)) {
                removeIPRoute(route);
            } else if (isLocalSocketRoute(route)) {
                removeLocalSocketRoute(route);
            } else {
                throw new Error('Error removing Route - Invalid Route');
            }
        } else {
            throw new Error('Error removing Route - Route is not an Object');
        }
        return this;
    };

    if (util.isArray(options.routes)) {
        this.addRoute(options.routes);
    }
    
    this.getRoutes = function () {
        var routes = [];
        Object.keys(hosts).forEach(function (host) {
            var ports = hosts[host];
            Object.keys(ports).forEach(function (port) {
                routes.push({
                    host: host,
                    port: parseInt(port, 10)
                });
            });
        });
        Object.keys(paths).forEach(function (path) {
            routes.push({path: path});
        });
        return routes;
    };
}
util.inherits(BasicRouter, events.EventEmitter);

exports.Router = BasicRouter;
