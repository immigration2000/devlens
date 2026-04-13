"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ExecutionResult {
  success: boolean;
  output?: string;
  errors?: string[];
}

export interface ConsoleMessage {
  level: "log" | "warn" | "error" | "info";
  args: string[];
  timestamp: string;
}

interface GamePreviewProps {
  code: string;
  questId: string;
  isRunning?: boolean;
  onExecutionResult?: (result: ExecutionResult) => void;
  onConsoleMessage?: (message: ConsoleMessage) => void;
  htmlScaffold?: string;
}

/**
 * Sandboxed Game Preview with iframe.
 * Uses postMessage to send code to iframe — avoids full document rewrite on each change.
 */
export const GamePreview = ({
  code,
  questId,
  isRunning = false,
  onExecutionResult,
  onConsoleMessage,
  htmlScaffold,
}: GamePreviewProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoPreview, setAutoPreview] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [iframeReady, setIframeReady] = useState(false);
  const previewTimeoutRef = useRef<NodeJS.Timeout>();
  // Keep latest callbacks in refs to avoid stale closures
  const onResultRef = useRef(onExecutionResult);
  const onConsoleRef = useRef(onConsoleMessage);
  onResultRef.current = onExecutionResult;
  onConsoleRef.current = onConsoleMessage;

  // Build the iframe bootstrap document (loaded once, listens for code via postMessage)
  const bootstrapHtml = useCallback(() => {
    const scaffold = htmlScaffold || "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body></body></html>";
    // Inject a listener script before </body>
    const listenerScript = `
<script>
window.__runUserCode = function(code) {
  // Reset DOM to scaffold state (remove dynamically added elements)
  document.querySelectorAll('[data-dynamic]').forEach(el => el.remove());

  // Override console
  ['log','error','warn','info'].forEach(level => {
    console[level] = function(...args) {
      window.parent.postMessage({ type: 'console', level, args: args.map(String) }, '*');
    };
  });

  // Override error handling
  window.onerror = function(msg, src, line) {
    window.parent.postMessage({ type: 'error', message: String(msg), line: line || 0 }, '*');
    return true;
  };

  try {
    var fn = new Function(code);
    fn();
    window.parent.postMessage({ type: 'result', success: true, output: 'Code executed successfully' }, '*');
  } catch(e) {
    window.parent.postMessage({ type: 'error', message: e.message || String(e), line: 0 }, '*');
  }
};

window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'execute') {
    window.__runUserCode(event.data.code);
  }
});

window.parent.postMessage({ type: 'ready' }, '*');
</script>`;

    // Insert listener before </body> or at end
    if (scaffold.includes('</body>')) {
      return scaffold.replace('</body>', listenerScript + '</body>');
    }
    return scaffold + listenerScript;
  }, [htmlScaffold]);

  // Initialize iframe with bootstrap HTML (once per scaffold change)
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    setIframeReady(false);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(bootstrapHtml());
    doc.close();
  }, [bootstrapHtml, questId]);

  // Handle messages from iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (!message || typeof message !== 'object') return;

      if (message.type === "ready") {
        setIframeReady(true);
        setIsLoading(false);
      } else if (message.type === "result") {
        setIsLoading(false);
        setErrors([]);
        onResultRef.current?.({ success: true, output: message.output });
      } else if (message.type === "error") {
        setIsLoading(false);
        const errorMsg = message.message ? `Line ${message.line || "?"}: ${message.message}` : "Unknown error";
        setErrors([errorMsg]);
        onResultRef.current?.({ success: false, errors: [errorMsg] });
      } else if (message.type === "console") {
        onConsoleRef.current?.({
          level: message.level || "log",
          args: message.args || [],
          timestamp: new Date().toISOString(),
        });
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Send code to iframe via postMessage (no document rewrite)
  const executeInIframe = useCallback(() => {
    if (!iframeRef.current?.contentWindow || !iframeReady) return;
    setErrors([]);
    iframeRef.current.contentWindow.postMessage({ type: 'execute', code }, '*');
  }, [code, iframeReady]);

  // Auto-preview on code change (debounced)
  useEffect(() => {
    if (!autoPreview || isRunning || !iframeReady) return;

    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    previewTimeoutRef.current = setTimeout(() => {
      setIsLoading(true);
      executeInIframe();
    }, 500);

    return () => {
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, [code, autoPreview, isRunning, iframeReady, executeInIframe]);

  // Execute on manual run
  useEffect(() => {
    if (!isRunning || !iframeReady) return;
    setIsLoading(true);
    executeInIframe();
  }, [isRunning, iframeReady, executeInIframe]);

  return (
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-700">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-100">게임 미리보기</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoPreview}
            onChange={(e) => setAutoPreview(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600"
          />
          <span className="text-xs text-gray-400">자동 미리보기</span>
        </label>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col relative">
        {errors.length > 0 && (
          <div className="absolute top-0 left-0 right-0 bg-danger-900 border-b border-danger-700 p-3 z-10">
            <p className="text-xs text-danger-200 font-mono">{errors[0]}</p>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-5">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-gray-700 border-t-primary-500 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-400">실행 중...</p>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          title={`game-preview-${questId}`}
          sandbox="allow-scripts allow-same-origin"
          className="w-full h-full bg-white"
          style={{ border: "none", opacity: isLoading ? 0.5 : 1 }}
        />
      </div>
    </div>
  );
};

export default GamePreview;
