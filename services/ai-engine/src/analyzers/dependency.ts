import { redis, publishRiskWarning } from '../lib/redis';
import { DevLensEvent } from '@devlens/shared';

interface DependencyNode {
  file: string;
  imports: Set<string>;
  importedBy: Set<string>;
}

interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  updateCount: number;
  lastPersisted: number;
}

const PERSIST_INTERVAL = 10; // Persist every 10 updates

async function loadGraph(sessionId: string): Promise<DependencyGraph> {
  try {
    const graphKey = `session:${sessionId}:dependency-graph`;
    const graphData = await redis.get(graphKey);

    if (graphData) {
      const parsed = JSON.parse(graphData);
      const nodes = new Map<string, DependencyNode>();

      for (const [file, node] of Object.entries(parsed.nodes)) {
        nodes.set(file, {
          file,
          imports: new Set((node as any).imports),
          importedBy: new Set((node as any).importedBy),
        });
      }

      return {
        nodes,
        updateCount: parsed.updateCount || 0,
        lastPersisted: parsed.lastPersisted || Date.now(),
      };
    }

    return {
      nodes: new Map(),
      updateCount: 0,
      lastPersisted: Date.now(),
    };
  } catch (error) {
    console.warn(
      `[${new Date().toISOString()}] Could not load graph, starting fresh:`,
      error
    );
    return {
      nodes: new Map(),
      updateCount: 0,
      lastPersisted: Date.now(),
    };
  }
}

async function saveGraph(sessionId: string, graph: DependencyGraph): Promise<void> {
  try {
    const graphKey = `session:${sessionId}:dependency-graph`;
    const nodesObj: Record<string, any> = {};

    for (const [file, node] of graph.nodes) {
      nodesObj[file] = {
        file: node.file,
        imports: Array.from(node.imports),
        importedBy: Array.from(node.importedBy),
      };
    }

    const graphData = {
      nodes: nodesObj,
      updateCount: graph.updateCount,
      lastPersisted: Date.now(),
    };

    await redis.set(graphKey, JSON.stringify(graphData));
    await redis.expire(graphKey, 86400); // 24 hours
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error saving graph:`,
      error
    );
  }
}

function detectCycles(graph: DependencyGraph): string[][] {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const current = graph.nodes.get(node);
    if (current) {
      for (const neighbor of current.imports) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recursionStack.has(neighbor)) {
          // Cycle detected
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            cycles.push([...path.slice(cycleStart), neighbor]);
          }
        }
      }
    }

    recursionStack.delete(node);
  }

  for (const [file] of graph.nodes) {
    if (!visited.has(file)) {
      dfs(file, []);
    }
  }

  return cycles;
}

export async function updateDependencyGraph(event: DevLensEvent): Promise<void> {
  try {
    const sessionId = event.sessionId;
    const data = event.data as any;

    if (!data || !data.files) {
      console.warn(
        `[${new Date().toISOString()}] Invalid structure_change event:`,
        event.id
      );
      return;
    }

    // Load current graph
    const graph = await loadGraph(sessionId);

    // Process files
    for (const file of data.files) {
      const fileName = file.name;

      if (file.action === 'added' || file.action === 'modified') {
        // Add or update node
        let node = graph.nodes.get(fileName);
        if (!node) {
          node = { file: fileName, imports: new Set(), importedBy: new Set() };
          graph.nodes.set(fileName, node);
        }

        // Update imports
        const newImports = new Set(file.imports || []);
        const oldImports = node.imports;

        // Remove old edges
        for (const oldImport of oldImports) {
          const importedNode = graph.nodes.get(oldImport);
          if (importedNode) {
            importedNode.importedBy.delete(fileName);
          }
        }

        // Add new edges
        for (const newImport of newImports) {
          let importedNode = graph.nodes.get(newImport);
          if (!importedNode) {
            importedNode = {
              file: newImport,
              imports: new Set(),
              importedBy: new Set(),
            };
            graph.nodes.set(newImport, importedNode);
          }
          importedNode.importedBy.add(fileName);
        }

        node.imports = newImports;
      } else if (file.action === 'deleted') {
        // Remove node
        const node = graph.nodes.get(fileName);
        if (node) {
          // Remove incoming edges
          for (const importer of node.importedBy) {
            const importerNode = graph.nodes.get(importer);
            if (importerNode) {
              importerNode.imports.delete(fileName);
            }
          }

          // Remove outgoing edges
          for (const imported of node.imports) {
            const importedNode = graph.nodes.get(imported);
            if (importedNode) {
              importedNode.importedBy.delete(fileName);
            }
          }

          graph.nodes.delete(fileName);
        }
      }
    }

    graph.updateCount++;

    // Detect circular dependencies
    const cycles = detectCycles(graph);
    if (cycles.length > 0) {
      console.warn(
        `[${new Date().toISOString()}] Circular dependencies detected:`,
        cycles
      );

      await publishRiskWarning(sessionId, {
        type: 'circular-dependency',
        severity: 'high',
        cycles,
        message: `Circular dependency detected: ${cycles
          .map((c) => c.join(' -> '))
          .join('; ')}`,
        timestamp: new Date().toISOString(),
      });
    }

    // Persist periodically
    if (graph.updateCount % PERSIST_INTERVAL === 0) {
      await saveGraph(sessionId, graph);
      console.log(
        `[${new Date().toISOString()}] Persisted dependency graph for session ${sessionId} (${
          graph.nodes.size
        } nodes)`
      );
    } else {
      // Still update Redis for current session
      await saveGraph(sessionId, graph);
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error updating dependency graph:`,
      error
    );
  }
}
