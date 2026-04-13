/**
 * DOM Mock Library
 * Provides minimal browser DOM API for sandboxed code execution
 * This is injected before user code runs
 */

export const DOM_MOCK_CODE = `
(function setupDOMMock(globalThis) {
  // Mock element class
  class MockElement {
    constructor() {
      this.textContent = '';
      this.innerHTML = '';
      this.style = {};
      this.className = '';
      this.id = '';
      this.tagName = 'DIV';
      this._listeners = {};
      this._children = [];
      this._parent = null;
      this._attributes = {};
    }

    addEventListener(event, handler) {
      if (!this._listeners[event]) {
        this._listeners[event] = [];
      }
      this._listeners[event].push(handler);
    }

    removeEventListener(event, handler) {
      if (this._listeners[event]) {
        this._listeners[event] = this._listeners[event].filter(h => h !== handler);
      }
    }

    setAttribute(name, value) {
      this._attributes[name] = value;
      if (name === 'class') this.className = value;
      if (name === 'id') this.id = value;
    }

    getAttribute(name) {
      return this._attributes[name] || null;
    }

    appendChild(child) {
      this._children.push(child);
      child._parent = this;
      return child;
    }

    removeChild(child) {
      const idx = this._children.indexOf(child);
      if (idx > -1) {
        this._children.splice(idx, 1);
        child._parent = null;
      }
      return child;
    }

    querySelector(selector) {
      return this._children[0] || new MockElement();
    }

    querySelectorAll(selector) {
      return this._children;
    }

    getBoundingClientRect() {
      return {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        bottom: 0,
        right: 0
      };
    }

    getContext(type) {
      if (type === '2d') {
        return new MockCanvasContext();
      }
      return null;
    }

    cloneNode(deep) {
      const clone = new MockElement();
      clone.textContent = this.textContent;
      clone.innerHTML = this.innerHTML;
      clone.className = this.className;
      clone.id = this.id;
      clone.tagName = this.tagName;
      if (deep) {
        for (const child of this._children) {
          clone.appendChild(child.cloneNode(true));
        }
      }
      return clone;
    }

    contains(node) {
      if (this === node) return true;
      for (const child of this._children) {
        if (child.contains(node)) return true;
      }
      return false;
    }

    remove() {
      if (this._parent) {
        this._parent.removeChild(this);
      }
    }
  }

  class MockCanvasContext {
    constructor() {
      this.fillStyle = '#000000';
      this.strokeStyle = '#000000';
      this.lineWidth = 1;
      this.font = '10px sans-serif';
      this.textAlign = 'start';
      this.textBaseline = 'alphabetic';
    }

    fillRect(x, y, w, h) {}
    clearRect(x, y, w, h) {}
    strokeRect(x, y, w, h) {}
    drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) {}
    fillText(text, x, y, maxWidth) {}
    strokeText(text, x, y, maxWidth) {}
    measureText(text) {
      return { width: text ? text.length * 6 : 0 };
    }

    beginPath() {}
    moveTo(x, y) {}
    lineTo(x, y) {}
    stroke() {}
    fill() {}
    arc(x, y, r, startAngle, endAngle, counterclockwise) {}
    arcTo(x1, y1, x2, y2, radius) {}
    closePath() {}
    clip() {}

    createLinearGradient(x0, y0, x1, y1) {
      return {
        addColorStop: (offset, color) => {},
        colorStops: []
      };
    }

    createRadialGradient(x0, y0, r0, x1, y1, r1) {
      return {
        addColorStop: (offset, color) => {},
        colorStops: []
      };
    }

    createPattern(image, repetition) {
      return null;
    }

    getImageData(sx, sy, sw, sh) {
      return {
        data: new Uint8ClampedArray(),
        width: sw,
        height: sh
      };
    }

    putImageData(imageData, dx, dy) {}

    save() {}
    restore() {}
    scale(x, y) {}
    rotate(angle) {}
    translate(x, y) {}
    transform(a, b, c, d, e, f) {}
    setTransform(a, b, c, d, e, f) {}
  }

  // Global document object
  const mockDocument = {
    getElementById: function(id) {
      const el = new MockElement();
      el.id = id;
      return el;
    },
    querySelector: function(selector) {
      return new MockElement();
    },
    querySelectorAll: function(selector) {
      return [new MockElement()];
    },
    getElementsByClassName: function(className) {
      return [new MockElement()];
    },
    getElementsByTagName: function(tagName) {
      return [new MockElement()];
    },
    getElementsByName: function(name) {
      return [new MockElement()];
    },
    createElement: function(tagName) {
      const el = new MockElement();
      el.tagName = tagName.toUpperCase();
      return el;
    },
    createElementNS: function(ns, tagName) {
      return this.createElement(tagName);
    },
    createTextNode: function(text) {
      return { textContent: text, nodeType: 3 };
    },
    createComment: function(text) {
      return { textContent: text, nodeType: 8 };
    },
    body: new MockElement(),
    head: new MockElement(),
    html: new MockElement(),
    documentElement: new MockElement(),
    addEventListener: function(event, handler) {},
    removeEventListener: function(event, handler) {},
    addEventListener: function(event, handler) {},
    write: function(html) {},
    writeln: function(html) {},
    open: function() {},
    close: function() {},
    location: {
      href: '',
      protocol: 'http:',
      hostname: 'localhost',
      pathname: '/',
      search: '',
      hash: ''
    },
    title: 'Sandbox',
    referrer: '',
    cookie: '',
    domain: 'localhost',
    lastModified: new Date().toISOString(),
    readyState: 'complete',
    nodeType: 9,
    nodeValue: null,
    childNodes: []
  };

  // Global window object
  const mockWindow = {
    document: mockDocument,
    location: mockDocument.location,
    window: null, // Will be set below
    self: null,   // Will be set below
    top: null,    // Will be set below
    parent: null, // Will be set below
    frameElement: null,
    frames: [],
    length: 0,
    name: '',
    status: '',
    defaultStatus: '',
    closed: false,
    innerHeight: 600,
    innerWidth: 800,
    outerHeight: 600,
    outerWidth: 800,
    pageXOffset: 0,
    pageYOffset: 0,
    screenX: 0,
    screenY: 0,
    screenLeft: 0,
    screenTop: 0,
    scrollX: 0,
    scrollY: 0,
    devicePixelRatio: 1,

    // Methods
    alert: function(msg) {
      console.log('[ALERT] ' + String(msg));
    },
    confirm: function(msg) {
      console.log('[CONFIRM] ' + String(msg));
      return true;
    },
    prompt: function(msg, defaultValue) {
      console.log('[PROMPT] ' + String(msg));
      return defaultValue || '';
    },
    print: function() {},
    open: function(url, target, features) {
      return mockWindow;
    },
    close: function() {},
    focus: function() {},
    blur: function() {},
    scroll: function(x, y) {},
    scrollTo: function(x, y) {},
    scrollBy: function(x, y) {},
    moveBy: function(x, y) {},
    moveTo: function(x, y) {},
    resizeBy: function(w, h) {},
    resizeTo: function(w, h) {},
    setInterval: setInterval,
    setTimeout: setTimeout,
    clearInterval: clearInterval,
    clearTimeout: clearTimeout,
    setImmediate: typeof setImmediate !== 'undefined' ? setImmediate : null,
    clearImmediate: typeof clearImmediate !== 'undefined' ? clearImmediate : null,
    requestAnimationFrame: function(fn) {
      return setTimeout(fn, 16);
    },
    cancelAnimationFrame: function(id) {
      clearTimeout(id);
    },
    getComputedStyle: function(elem) {
      return {
        getPropertyValue: (prop) => ''
      };
    },
    matchMedia: function(query) {
      return {
        matches: false,
        addListener: function() {},
        removeListener: function() {},
        addEventListener: function() {},
        removeEventListener: function() {}
      };
    },
    addEventListener: function(event, handler) {},
    removeEventListener: function(event, handler) {},
    dispatchEvent: function(event) {
      return true;
    }
  };

  // Circular references
  mockWindow.window = mockWindow;
  mockWindow.self = mockWindow;
  mockWindow.top = mockWindow;
  mockWindow.parent = mockWindow;

  // Assign to global
  globalThis.window = mockWindow;
  globalThis.document = mockDocument;
  globalThis.Element = MockElement;
  globalThis.HTMLElement = MockElement;
  globalThis.Canvas = class Canvas extends MockElement {
    getContext(type) {
      return new MockCanvasContext();
    }
  };

  // Common global APIs
  globalThis.navigator = {
    userAgent: 'Node.js Sandbox',
    platform: 'Linux',
    language: 'en-US',
    languages: ['en-US'],
    onLine: false,
    plugins: [],
    mimeTypes: []
  };

  globalThis.location = mockDocument.location;
})
(globalThis);
`;

export const getDOMMockCode = (): string => DOM_MOCK_CODE;
