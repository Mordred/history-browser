"use strict";

var _extends = function (child, parent) {
  child.prototype = Object.create(parent.prototype, {
    constructor: {
      value: child,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  child.__proto__ = parent;
};

var History = require('aurelia-history').History;
var routeStripper = /^[#\/]|\s+$/g;

var rootStripper = /^\/+|\/+$/g;

var isExplorer = /msie [\w.]+/;

var trailingSlash = /\/$/;

function updateHash(location, fragment, replace) {
  if (replace) {
    var href = location.href.replace(/(javascript:|#).*$/, "");
    location.replace(href + "#" + fragment);
  } else {
    location.hash = "#" + fragment;
  }
}

function extend(obj) {
  var rest = Array.prototype.slice.call(arguments, 1);

  for (var i = 0, length = rest.length; i < length; i++) {
    var source = rest[i];

    if (source) {
      for (var prop in source) {
        obj[prop] = source[prop];
      }
    }
  }

  return obj;
}

var BrowserHistory = (function (History) {
  var BrowserHistory = function BrowserHistory() {
    this.interval = 50;
    this.active = false;
    this.previousFragment = "";
    this._checkUrlCallback = this.checkUrl.bind(this);

    if (typeof window !== "undefined") {
      this.location = window.location;
      this.history = window.history;
    }
  };

  _extends(BrowserHistory, History);

  BrowserHistory.prototype.getHash = function (window) {
    var match = (window || this).location.href.match(/#(.*)$/);
    return match ? match[1] : "";
  };

  BrowserHistory.prototype.getFragment = function (fragment, forcePushState) {
    if (!fragment) {
      if (this._hasPushState || !this._wantsHashChange || forcePushState) {
        fragment = this.location.pathname + this.location.search;
        var root = this.root.replace(trailingSlash, "");
        if (!fragment.indexOf(root)) {
          fragment = fragment.substr(root.length);
        }
      } else {
        fragment = this.getHash();
      }
    }

    return fragment.replace(routeStripper, "");
  };

  BrowserHistory.prototype.activate = function (options) {
    if (this.active) {
      throw new Error("History has already been activated.");
    }

    this.active = true;

    this.options = extend({}, { root: "/" }, this.options, options);
    this.root = this.options.root;
    this._wantsHashChange = this.options.hashChange !== false;
    this._wantsPushState = !!this.options.pushState;
    this._hasPushState = !!(this.options.pushState && this.history && this.history.pushState);

    var fragment = this.getFragment();

    this.root = ("/" + this.root + "/").replace(rootStripper, "/");

    if (this._hasPushState) {
      window.onpopstate = this._checkUrlCallback;
    } else if (this._wantsHashChange && ("onhashchange" in window)) {
      window.addEventListener("hashchange", this._checkUrlCallback);
    } else if (this._wantsHashChange) {
      this._checkUrlInterval = setInterval(this._checkUrlCallback, this.interval);
    }

    this.fragment = fragment;

    var loc = this.location;
    var atRoot = loc.pathname.replace(/[^\/]$/, "$&/") === this.root;

    if (this._wantsHashChange && this._wantsPushState) {
      if (!this._hasPushState && !atRoot) {
        this.fragment = this.getFragment(null, true);
        this.location.replace(this.root + this.location.search + "#" + this.fragment);
        return true;
      } else if (this._hasPushState && atRoot && loc.hash) {
        this.fragment = this.getHash().replace(routeStripper, "");
        this["this"].replaceState({}, document.title, this.root + this.fragment + loc.search);
      }
    }

    if (!this.options.silent) {
      return this.loadUrl();
    }
  };

  BrowserHistory.prototype.deactivate = function () {
    window.onpopstate = null;
    window.removeEventListener("hashchange", this._checkUrlCallback);
    clearInterval(this._checkUrlInterval);
    this.active = false;
  };

  BrowserHistory.prototype.checkUrl = function () {
    var current = this.getFragment();

    if (current === this.fragment && this.iframe) {
      current = this.getFragment(this.getHash(this.iframe));
    }

    if (current === this.fragment) {
      return false;
    }

    if (this.iframe) {
      this.navigate(current, false);
    }

    this.loadUrl();
  };

  BrowserHistory.prototype.loadUrl = function (fragmentOverride) {
    var fragment = this.fragment = this.getFragment(fragmentOverride);

    return this.options.routeHandler ? this.options.routeHandler(fragment) : false;
  };

  BrowserHistory.prototype.navigate = function (fragment, options) {
    if (fragment && fragment.indexOf("://") != -1) {
      window.location.href = fragment;
      return true;
    }

    if (!this.active) {
      return false;
    }

    if (options === undefined) {
      options = {
        trigger: true
      };
    } else if (typeof options === "boolean") {
      options = {
        trigger: options
      };
    }

    fragment = this.getFragment(fragment || "");

    if (this.fragment === fragment) {
      return;
    }

    this.fragment = fragment;

    var url = this.root + fragment;

    if (fragment === "" && url !== "/") {
      url = url.slice(0, -1);
    }

    if (this._hasPushState) {
      this.history[options.replace ? "replaceState" : "pushState"]({}, document.title, url);
    } else if (this._wantsHashChange) {
      updateHash(this.location, fragment, options.replace);

      if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
        if (!options.replace) {
          this.iframe.document.open().close();
        }

        updateHash(this.iframe.location, fragment, options.replace);
      }
    } else {
      return this.location.assign(url);
    }

    if (options.trigger) {
      return this.loadUrl(fragment);
    } else {
      this.previousFragment = fragment;
    }
  };

  BrowserHistory.prototype.navigateBack = function () {
    this.history.back();
  };

  return BrowserHistory;
})(History);

exports.BrowserHistory = BrowserHistory;