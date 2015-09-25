var Mochi = {
    comparatorRegistry: null,
    reprRegistry: null,
    
    // comparisons

    /** @id MochiKit.Base.typeMatcher */
    typeMatcher: function (/* typ */) {
        var types = {};
        for (var i = 0; i < arguments.length; i++) {
            var typ = arguments[i];
            types[typ] = typ;
        }
        return function () {
            for (var i = 0; i < arguments.length; i++) {
                if (!(typeof(arguments[i]) in types)) {
                    return false;
                }
            }
            return true;
        };
    },

    /** @id MochiKit.Base.isArrayLike */
    isArrayLike: function () {
        for (var i = 0; i < arguments.length; i++) {
            var o = arguments[i];
            var typ = typeof(o);
            if (
                (typ != 'object' && !(typ == 'function' && typeof(o.item) == 'function')) ||
                o === null ||
                typeof(o.length) != 'number' ||
                o.nodeType === 3 ||
                o.nodeType === 4
            ) {
                return false;
            }
        }
        return true;
    },

    /** @id MochiKit.Base.isDateLike */
    isDateLike: function () {
        for (var i = 0; i < arguments.length; i++) {
            var o = arguments[i];
            if (typeof(o) != "object" || o === null
                    || typeof(o.getTime) != 'function') {
                return false;
            }
        }
        return true;
    },

    /** @id MochiKit.Base.registerComparator */
    registerComparator: function (name, check, comparator, /* optional */ override) {
        Mochi.comparatorRegistry.register(name, check, comparator, override);
    },

    _primitives: {'boolean': true, 'string': true, 'number': true},

    /** @id MochiKit.Base.compare */
    compare: function (a, b) {
        if (a == b) {
            return 0;
        }
        var aIsNull = (typeof(a) == 'undefined' || a === null);
        var bIsNull = (typeof(b) == 'undefined' || b === null);
        if (aIsNull && bIsNull) {
            return 0;
        } else if (aIsNull) {
            return -1;
        } else if (bIsNull) {
            return 1;
        }
        var m = Mochi;
        // bool, number, string have meaningful comparisons
        var prim = m._primitives;
        if (!(typeof(a) in prim && typeof(b) in prim)) {
            try {
                return m.comparatorRegistry.match(a, b);
            } catch (e) {
                if (e != m.NotFound) {
                    throw e;
                }
            }
        }
        if (a < b) {
            return -1;
        } else if (a > b) {
            return 1;
        }
        // These types can't be compared
        var repr = m.repr;
        throw new TypeError(repr(a) + " and " + repr(b) + " can not be compared");
    },

    /** @id MochiKit.Base.compareDateLike */
    compareDateLike: function (a, b) {
        return Mochi.compare(a.getTime(), b.getTime());
    },

    /** @id MochiKit.Base.compareArrayLike */
    compareArrayLike: function (a, b) {
        var compare = Mochi.compare;
        var count = a.length;
        var rval = 0;
        if (count > b.length) {
            rval = 1;
            count = b.length;
        } else if (count < b.length) {
            rval = -1;
        }
        for (var i = 0; i < count; i++) {
            var cmp = compare(a[i], b[i]);
            if (cmp) {
                return cmp;
            }
        }
        return rval;
    },

    // representations

    /** @id MochiKit.Base.registerRepr */
    registerRepr: function (name, check, wrap, /* optional */override) {
        Mochi.reprRegistry.register(name, check, wrap, override);
    },

    /** @id MochiKit.Base.repr */
    repr: function (o) {
        if (typeof(o) == "undefined") {
            return "undefined";
        } else if (o === null) {
            return "null";
        }
        try {
            if (typeof(o.__repr__) == 'function') {
                return o.__repr__();
            } else if (typeof(o.repr) == 'function' && o.repr != arguments.callee) {
                return o.repr();
            }
            return Mochi.reprRegistry.match(o);
        } catch (e) {
            if (typeof(o.NAME) == 'string' && (
                    o.toString == Function.prototype.toString ||
                    o.toString == Object.prototype.toString
                )) {
                return o.NAME;
            }
        }
        try {
            var ostring = (o + "");
        } catch (e) {
            return "[" + typeof(o) + "]";
        }
        if (typeof(o) == "function") {
            ostring = ostring.replace(/^\s+/, "").replace(/\s+/g, " ");
            ostring = ostring.replace(/,(\S)/, ", $1");
            var idx = ostring.indexOf("{");
            if (idx != -1) {
                ostring = ostring.substr(0, idx) + "{...}";
            }
        }
        return ostring;
    },

    /** @id MochiKit.Base.reprArrayLike */
    reprArrayLike: function (o) {
        var m = Mochi;
        return "[" + m.map(m.repr, o).join(", ") + "]";
    },

    /** @id MochiKit.Base.reprString */
    reprString: function (o) {
        return ('"' + o.replace(/(["\\])/g, '\\$1') + '"'
            ).replace(/[\f]/g, "\\f"
            ).replace(/[\b]/g, "\\b"
            ).replace(/[\n]/g, "\\n"
            ).replace(/[\t]/g, "\\t"
            ).replace(/[\v]/g, "\\v"
            ).replace(/[\r]/g, "\\r");
    },

    /** @id MochiKit.Base.reprNumber */
    reprNumber: function (o) {
        return o + "";
    },

    initialize: function() {
        Mochi.comparatorRegistry = new Mochi.AdapterRegistry();
        Mochi.reprRegistry = new Mochi.AdapterRegistry();

        // comparisons
        Mochi.registerComparator("dateLike", Mochi.isDateLike, Mochi.compareDateLike);
        Mochi.registerComparator("arrayLike", Mochi.isArrayLike, Mochi.compareArrayLike);

        // representations
        Mochi.registerRepr("arrayLike", Mochi.isArrayLike, Mochi.reprArrayLike);
        Mochi.registerRepr("string", Mochi.typeMatcher("string"), Mochi.reprString);
        Mochi.registerRepr("numbers", Mochi.typeMatcher("number", "boolean"), Mochi.reprNumber);
    }
}

/** @id MochiKit.Base.AdapterRegistry */
Mochi.AdapterRegistry = function () {
    this.pairs = [];
};

Mochi.AdapterRegistry.prototype = {
    /** @id MochiKit.Base.AdapterRegistry.prototype.register */
    register: function (name, check, wrap, /* optional */ override) {
        if (override) {
            this.pairs.unshift([name, check, wrap]);
        } else {
            this.pairs.push([name, check, wrap]);
        }
    },

    /** @id MochiKit.Base.AdapterRegistry.prototype.match */
    match: function (/* ... */) {
        for (var i = 0; i < this.pairs.length; i++) {
            var pair = this.pairs[i];
            if (pair[1].apply(this, arguments)) {
                return pair[2].apply(this, arguments);
            }
        }
        throw Mochi.NotFound;
    },

    /** @id MochiKit.Base.AdapterRegistry.prototype.unregister */
    unregister: function (name) {
        for (var i = 0; i < this.pairs.length; i++) {
            var pair = this.pairs[i];
            if (pair[0] == name) {
                this.pairs.splice(i, 1);
                return true;
            }
        }
        return false;
    }
};

Mochi.NamedError = function (name) {
    this.message = name;
    this.name = name;
};
Mochi.NamedError.prototype = new Error();
Mochi.NamedError.prototype.repr = function () {
    if (this.message && this.message != this.name) {
        return this.name + "(" + Mochi.repr(this.message) + ")";
    } else {
        return this.name + "()";
    }
};
Mochi.NamedError.prototype.toString = function() {
    Mochi.repr(this)
};

/** @id MochiKit.Base.NotFound */
Mochi.NotFound = new Mochi.NamedError("MochiKit.Base.NotFound");

Mochi.initialize();