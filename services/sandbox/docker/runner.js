#!/usr/bin/env node
/**
 * Runner script that executes inside the sandbox container
 * Reads code from /sandbox/code.js or stdin
 * Executes with time and resource limits
 * Outputs JSON result to stdout
 */

import { readFileSync } from 'fs';
import { vm } from 'vm';

// DOM Mock Library - injected into every execution
const DOM_MOCK_CODE = `
(function setupDOMMock(globalThis) {
  // Mock element
  class MockElement {
    constructor() {
      this.textContent = '';
      this.innerHTML = '';
      this.style = {};
      this.className = '';
      this.id = '';
      this._listeners = {};
      this._children = [];
      this._parent = null;
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

    appendChild(child) {
      this._children.push(child);
      child._parent = this;
      return child;
    }

    removeChild(child) {
      this._children = this._children.filter(c => c !== child);
      child._parent = null;
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
  }

  class MockCanvasContext {
    fillRect(x, y, w, h) {}
    clearRect(x, y, w, h) {}
    drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) {}
    fillText(text, x, y) {}
    strokeText(text, x, y) {}
    measureText(text) { return { width: 0 }; }
    beginPath() {}
    moveTo(x, y) {}
    lineTo(x, y) {}
    stroke() {}
    fill() {}
    arc(x, y, r, sa, ea) {}
    closePath() {}
  }

  // Global document object
  const mockDocument = {
    getElementById: function(id) {
      return new MockElement();
    },
    querySelector: function(selector) {
      return new MockElement();
    },
    querySelectorAll: function(selector) {
      return [new MockElement()];
    },
    createElement: function(tagName) {
      const el = new MockElement();
      el.tagName = tagName.toUpperCase();
      return el;
    },
    createTextNode: function(text) {
      return { textContent: text };
    },
    body: new MockElement(),
    head: new MockElement(),
    addEventListener: function(event, handler) {},
    removeEventListener: function(event, handler) {}
  };

  // Console capture
  const consoleLogs = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalInfo = console.info;
  const originalDebug = console.debug;

  console.log = function(...args) {
    consoleLogs.push(args.map(a => String(a)).join(' '));
  };
  console.warn = function(...args) {
    consoleLogs.push('[WARN] ' + args.map(a => String(a)).join(' '));
  };
  console.error = function(...args) {
    consoleLogs.push('[ERROR] ' + args.map(a => String(a)).join(' '));
  };
  console.info = function(...args) {
    consoleLogs.push('[INFO] ' + args.map(a => String(a)).join(' '));
  };
  console.debug = function(...args) {
    consoleLogs.push('[DEBUG] ' + args.map(a => String(a)).join(' '));
  };

  // Store for access in sandboxed code
  globalThis.__consoleLogs = consoleLogs;

  // Alert mock
  globalThis.alert = function(msg) {
    consoleLogs.push('[ALERT] ' + String(msg));
  };

  // Window object with limited APIs
  globalThis.window = {
    document: mockDocument,
    alert: globalThis.alert,
    console: console,
    document: mockDocument,
    clearTimeout: clearTimeout,
    clearInterval: clearInterval,
    setTimeout: setTimeout,
    setInterval: setInterval
  };

  // Attach to global
  globalThis.document = mockDocument;
  globalThis.Element = MockElement;
  globalThis.Canvas = class Canvas extends MockElement {
    getContext(type) {
      return new MockCanvasContext();
    }
  };
})
(globalThis);
`;

/**
 * Main execution function
 */
async function executeCode() {
  const startTime = Date.now();
  const output = [];
  const errors = [];
  let success = true;
  let result = null;

  try {
    // Read code from file or stdin
    let code;
    try {
      code = readFileSync('/sandbox/code.js', 'utf-8');
    } catch (e) {
      // Try reading from stdin (not implemented for now)
      throw new Error('No code file found at /sandbox/code.js');
    }

    // Prepare sandbox context
    const sandbox = {
      console: {
        log: (...args) => output.push(args.map(a => String(a)).join(' ')),
        warn: (...args) => output.push('[WARN] ' + args.map(a => String(a)).join(' ')),
        error: (...args) => output.push('[ERROR] ' + args.map(a => String(a)).join(' ')),
        info: (...args) => output.push('[INFO] ' + args.map(a => String(a)).join(' ')),
        debug: (...args) => output.push('[DEBUG] ' + args.map(a => String(a)).join(' ')),
      },
      process: {
        version: process.version,
        memoryUsage: () => process.memoryUsage()
      },
      Buffer: Buffer,
      setTimeout: (fn, delay) => {
        if (delay > 5000) throw new Error('setTimeout delay exceeds 5000ms');
        return setTimeout(fn, delay);
      },
      setInterval: (fn, delay) => {
        if (delay > 5000) throw new Error('setInterval delay exceeds 5000ms');
        return setInterval(fn, delay);
      },
      setImmediate: setImmediate,
    };

    // Inject DOM mock before user code
    const wrappedCode = DOM_MOCK_CODE + '\n' + code;

    // Compile and run with timeout
    const script = new vm.Script(wrappedCode, {
      filename: 'user-code.js',
      displayErrors: true,
      timeout: 5000,
    });

    // Create context with timeout
    const context = vm.createContext(sandbox, {
      name: 'SandboxContext',
      codeGeneration: { strings: false, wasm: false },
    });

    // Execute script
    result = script.runInContext(context, {
      timeout: 5000,
      displayErrors: true,
    });

    // Capture final console logs if any
    output.push(...(sandbox.__consoleLogs || []));

  } catch (err) {
    success = false;

    // Parse error details
    const errorObj = {
      message: err.message || String(err),
      type: err.constructor.name,
      line: 0,
      column: 0,
    };

    // Extract line number from stack if available
    if (err.stack) {
      const match = err.stack.match(/(\d+):(\d+)/);
      if (match) {
        errorObj.line = parseInt(match[1], 10);
        errorObj.column = parseInt(match[2], 10);
      }
    }

    errors.push(errorObj);
  }

  // Check memory usage
  try {
    const memUsage = process.memoryUsage();
    const memMB = memUsage.heapUsed / 1024 / 1024;
    if (memMB > 128) {
      errors.push({
        message: `Memory limit exceeded: ${memMB.toFixed(2)}MB > 128MB`,
        type: 'MemoryError',
        line: 0,
      });
      success = false;
    }
  } catch (e) {
    // Ignore
  }

  const duration = Date.now() - startTime;

  // Output result as JSON
  const resultObj = {
    success,
    output,
    errors,
    duration_ms: duration,
    result: result !== null ? String(result) : null,
  };

  console.log(JSON.stringify(resultObj));
  process.exit(success ? 0 : 1);
}

// Run immediately
executeCode().catch(err => {
  console.log(JSON.stringify({
    success: false,
    output: [],
    errors: [{
      message: err.message || String(err),
      type: 'FatalError',
      line: 0,
    }],
    duration_ms: 0,
  }));
  process.exit(1);
});
