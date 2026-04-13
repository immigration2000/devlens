"use client";

import { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";

interface GraphNode {
  id: string;
  label: string;
  type: string;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface DependencyGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width?: number;
  height?: number;
}

const TYPE_COLORS: Record<string, string> = {
  function_declaration: "#3b82f6",
  variable_declarator: "#22c55e",
  class_declaration: "#f59e0b",
  arrow_function: "#8b5cf6",
  call_expression: "#ef4444",
  default: "#6b7280",
};

/**
 * D3 Force-directed dependency graph.
 * Shows functions/variables as nodes and their relationships as edges.
 */
export default function DependencyGraph({
  nodes,
  edges,
  width = 500,
  height = 350,
}: DependencyGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Generate sample data if no real data
  const graphData = useMemo(() => {
    if (nodes.length > 0) return { nodes, edges };

    // Demo data for visualization
    return {
      nodes: [
        { id: "main", label: "main()", type: "function_declaration" },
        { id: "counter", label: "counter", type: "variable_declarator" },
        { id: "updateDisplay", label: "updateDisplay()", type: "function_declaration" },
        { id: "increment", label: "increment()", type: "arrow_function" },
        { id: "decrement", label: "decrement()", type: "arrow_function" },
        { id: "reset", label: "reset()", type: "arrow_function" },
        { id: "display", label: "display", type: "variable_declarator" },
      ],
      edges: [
        { source: "main", target: "updateDisplay" },
        { source: "main", target: "increment" },
        { source: "main", target: "decrement" },
        { source: "main", target: "reset" },
        { source: "increment", target: "counter" },
        { source: "decrement", target: "counter" },
        { source: "reset", target: "counter" },
        { source: "updateDisplay", target: "display" },
        { source: "updateDisplay", target: "counter" },
      ],
    };
  }, [nodes, edges]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    // Arrow marker
    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#475569");

    // Force simulation
    const simulation = d3.forceSimulation(graphData.nodes as any)
      .force("link", d3.forceLink(graphData.edges as any).id((d: any) => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Edges
    const link = g.selectAll(".link")
      .data(graphData.edges)
      .enter().append("line")
      .attr("class", "link")
      .attr("stroke", "#334155")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrow)");

    // Nodes
    const node = g.selectAll(".node")
      .data(graphData.nodes)
      .enter().append("g")
      .attr("class", "node")
      .call(d3.drag<any, any>()
        .on("start", (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on("drag", (event, d: any) => {
          d.fx = event.x; d.fy = event.y;
        })
        .on("end", (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
      );

    // Node circles
    node.append("circle")
      .attr("r", 10)
      .attr("fill", (d: any) => TYPE_COLORS[d.type] || TYPE_COLORS.default)
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 2);

    // Node labels
    node.append("text")
      .text((d: any) => d.label)
      .attr("x", 14)
      .attr("y", 4)
      .attr("font-size", "10px")
      .attr("fill", "#94a3b8")
      .attr("font-family", "monospace");

    // Tooltip on hover
    node.append("title")
      .text((d: any) => `${d.label} (${d.type})`);

    // Tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, [graphData, width, height]);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">의존성 그래프</h3>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> 함수</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> 변수</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> 화살표</span>
        </div>
      </div>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full"
        style={{ background: "#0f172a" }}
      />
    </div>
  );
}
