import { StateGraph, END, START } from "@langchain/langgraph";
import { GraphState, type GraphStateType } from "./state.js";
import {
  routerNode,
  profileAnalystNode,
  marketResearcherNode,
  matchScorerNode,
  resumeTailorNode,
  interviewCoachNode,
  humanApprovalNode,
} from "./nodes.js";

function routeAfterOrchestrator(state: GraphStateType): string {
  if (state.humanApprovalNeeded) return "human_approval";
  if (state.error) return END;

  switch (state.currentAgent) {
    case "profile-analyst":
      return "profile_analyst";
    case "market-researcher":
      return "market_researcher";
    case "match-scorer":
      return "match_scorer";
    case "resume-tailor":
      return "resume_tailor";
    case "interview-coach":
      return "interview_coach";
    case "orchestrator":
      return END;
    default:
      return END;
  }
}

function routeAfterAgent(state: GraphStateType): string {
  if (state.error) return END;
  return "router";
}

function routeAfterHumanApproval(state: GraphStateType): string {
  if (state.humanApprovalResponse === "rejected") return END;
  return "router";
}

export function createAgentGraph() {
  const graph = new StateGraph(GraphState)
    .addNode("router", routerNode)
    .addNode("profile_analyst", profileAnalystNode)
    .addNode("market_researcher", marketResearcherNode)
    .addNode("match_scorer", matchScorerNode)
    .addNode("resume_tailor", resumeTailorNode)
    .addNode("interview_coach", interviewCoachNode)
    .addNode("human_approval", humanApprovalNode)
    .addEdge(START, "router")
    .addConditionalEdges("router", routeAfterOrchestrator, {
      profile_analyst: "profile_analyst",
      market_researcher: "market_researcher",
      match_scorer: "match_scorer",
      resume_tailor: "resume_tailor",
      interview_coach: "interview_coach",
      human_approval: "human_approval",
      [END]: END,
    })
    .addConditionalEdges("profile_analyst", routeAfterAgent, {
      router: "router",
      [END]: END,
    })
    .addConditionalEdges("market_researcher", routeAfterAgent, {
      router: "router",
      [END]: END,
    })
    .addConditionalEdges("match_scorer", routeAfterAgent, {
      router: "router",
      [END]: END,
    })
    .addConditionalEdges("resume_tailor", routeAfterAgent, {
      router: "router",
      [END]: END,
    })
    .addConditionalEdges("interview_coach", routeAfterAgent, {
      router: "router",
      [END]: END,
    })
    .addConditionalEdges("human_approval", routeAfterHumanApproval, {
      router: "router",
      [END]: END,
    });

  return graph.compile();
}
