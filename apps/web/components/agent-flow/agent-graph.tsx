"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Brain,
  Search,
  Target,
  FileText,
  MessageSquare,
  Zap,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { AgentName, AgentStatus } from "@agenthire/shared";

interface AgentNodeData {
  label: string;
  agentName: AgentName;
  icon: "brain" | "search" | "target" | "file" | "message" | "zap";
  [key: string]: unknown;
}

const ICON_MAP = {
  brain: Brain,
  search: Search,
  target: Target,
  file: FileText,
  message: MessageSquare,
  zap: Zap,
} as const;

const STATUS_CONFIG: Record<
  AgentStatus,
  { border: string; glow: string; dot: string; label: string }
> = {
  idle: {
    border: "border-agent-idle/40",
    glow: "agent-glow-idle",
    dot: "bg-agent-idle",
    label: "Idle",
  },
  thinking: {
    border: "border-agent-thinking/60",
    glow: "agent-glow-thinking",
    dot: "bg-agent-thinking animate-pulse",
    label: "Thinking",
  },
  executing: {
    border: "border-agent-executing/60",
    glow: "agent-glow-executing",
    dot: "bg-agent-executing animate-pulse",
    label: "Executing",
  },
  "waiting-for-human": {
    border: "border-agent-waiting/60",
    glow: "agent-glow-waiting",
    dot: "bg-agent-waiting animate-pulse",
    label: "Waiting",
  },
  error: {
    border: "border-agent-error/60",
    glow: "agent-glow-error",
    dot: "bg-agent-error",
    label: "Error",
  },
  complete: {
    border: "border-agent-complete/60",
    glow: "agent-glow-complete",
    dot: "bg-agent-complete",
    label: "Complete",
  },
};

function AgentNode({ data }: NodeProps<Node<AgentNodeData>>) {
  const agentStatuses = useAppStore((state) => state.agentStatuses);
  const status = agentStatuses[data.agentName] ?? "idle";
  const config = STATUS_CONFIG[status];
  const Icon = ICON_MAP[data.icon];

  return (
    <div
      className={`relative rounded-xl border bg-bg-card px-4 py-3 ${config.border} ${config.glow} min-w-[150px] transition-all duration-300`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-border-secondary !border-bg-primary !h-2 !w-2"
      />

      <div className="flex items-center gap-2.5">
        <div className={`rounded-lg p-1 ${status !== "idle" ? "bg-bg-tertiary" : ""}`}>
          <Icon className={`h-4 w-4 ${status !== "idle" ? "text-text-primary" : "text-text-secondary"}`} />
        </div>
        <div>
          <p className="text-xs font-semibold text-text-primary">
            {data.label}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <div className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
            <span className="text-[10px] font-medium text-text-muted">{config.label}</span>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-border-secondary !border-bg-primary !h-2 !w-2"
      />
    </div>
  );
}

const nodeTypes = { agentNode: AgentNode };

const INITIAL_NODES: Node<AgentNodeData>[] = [
  {
    id: "orchestrator",
    type: "agentNode",
    position: { x: 220, y: 0 },
    data: { label: "Orchestrator", agentName: "orchestrator", icon: "zap" },
  },
  {
    id: "profile-analyst",
    type: "agentNode",
    position: { x: 0, y: 120 },
    data: {
      label: "Profile Analyst",
      agentName: "profile-analyst",
      icon: "brain",
    },
  },
  {
    id: "market-researcher",
    type: "agentNode",
    position: { x: 220, y: 120 },
    data: {
      label: "Market Researcher",
      agentName: "market-researcher",
      icon: "search",
    },
  },
  {
    id: "match-scorer",
    type: "agentNode",
    position: { x: 440, y: 120 },
    data: {
      label: "Match Scorer",
      agentName: "match-scorer",
      icon: "target",
    },
  },
  {
    id: "resume-tailor",
    type: "agentNode",
    position: { x: 100, y: 240 },
    data: {
      label: "Resume Tailor",
      agentName: "resume-tailor",
      icon: "file",
    },
  },
  {
    id: "interview-coach",
    type: "agentNode",
    position: { x: 340, y: 240 },
    data: {
      label: "Interview Coach",
      agentName: "interview-coach",
      icon: "message",
    },
  },
];

const INITIAL_EDGES: Edge[] = [
  {
    id: "e-orch-profile",
    source: "orchestrator",
    target: "profile-analyst",
    animated: true,
  },
  {
    id: "e-orch-market",
    source: "orchestrator",
    target: "market-researcher",
    animated: true,
  },
  {
    id: "e-orch-match",
    source: "orchestrator",
    target: "match-scorer",
    animated: true,
  },
  {
    id: "e-profile-resume",
    source: "profile-analyst",
    target: "resume-tailor",
  },
  {
    id: "e-market-match",
    source: "market-researcher",
    target: "match-scorer",
  },
  {
    id: "e-match-resume",
    source: "match-scorer",
    target: "resume-tailor",
  },
  {
    id: "e-match-interview",
    source: "match-scorer",
    target: "interview-coach",
  },
  {
    id: "e-resume-interview",
    source: "resume-tailor",
    target: "interview-coach",
  },
];

export function AgentGraph() {
  const [nodes, , onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, , onEdgesChange] = useEdgesState(INITIAL_EDGES);

  const defaultViewport = useMemo(() => ({ x: 30, y: 30, zoom: 0.85 }), []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      defaultViewport={defaultViewport}
      fitView={false}
      nodesDraggable={true}
      nodesConnectable={false}
      elementsSelectable={true}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
