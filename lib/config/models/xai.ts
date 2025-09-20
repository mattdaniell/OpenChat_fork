import { gateway } from "@ai-sdk/gateway";
import {
  FILE_UPLOAD_FEATURE,
  PDF_PROCESSING_FEATURE,
  REASONING_FEATURE,
  REASONING_FEATURE_BASIC,
  REASONING_FEATURE_DISABLED,
  TOOL_CALLING_FEATURE,
} from "../features";
import { openrouter } from "../openrouter";

export const XAI_MODELS = [
  {
    id: "x-ai/grok-4-fast-thinking",
    name: "Grok 4 Fast",
    subName: "Thinking",
    provider: "openrouter",
    displayProvider: "xai",
    premium: false,
    usesPremiumCredits: false,
    skipRateLimit: true,
    description:
      "Fast, cost-efficient version of Grok-4 with near-identical reasoning quality.\nSupports 2M token context, real-time X data, web search, and tool use.\nOptimized for speed and lower token usage while maintaining strong performance.",
    api_sdk: openrouter("x-ai/grok-4-fast:free"),
    features: [
      FILE_UPLOAD_FEATURE,
      PDF_PROCESSING_FEATURE,
      REASONING_FEATURE,
      TOOL_CALLING_FEATURE,
    ],
  },
  {
    id: "x-ai/grok-4-fast",
    name: "Grok 4 Fast",
    provider: "openrouter",
    displayProvider: "xai",
    premium: false,
    usesPremiumCredits: false,
    skipRateLimit: true,
    description:
      "Fast, cost-efficient version of Grok-4 with reasoning disabled to be extra fast.\nSupports 2M token context, real-time X data, web search, and tool use.\nOptimized for speed and lower token usage while maintaining strong performance.",
    api_sdk: openrouter("x-ai/grok-4-fast:free"),
    features: [
      FILE_UPLOAD_FEATURE,
      PDF_PROCESSING_FEATURE,
      TOOL_CALLING_FEATURE,
    ],
  },
  {
    id: "grok-4",
    name: "Grok 4",
    provider: "xai",
    premium: true,
    usesPremiumCredits: true,
    description: `xAI's most advanced reasoning model with frontier-level intelligence.\nFeatures real-time X data access, advanced reasoning, and native tool use.\nExcels at mathematical reasoning, coding, and complex problem-solving.`,
    api_sdk: gateway("xai/grok-4"),
    features: [REASONING_FEATURE_BASIC, TOOL_CALLING_FEATURE],
  },
  {
    id: "grok-3",
    name: "Grok 3",
    provider: "xai",
    premium: true,
    usesPremiumCredits: true,
    description: `xAI's flagship model.\nFeatures real-time X data access.`,
    api_sdk: gateway("xai/grok-3-latest"),
    features: [REASONING_FEATURE_DISABLED],
  },
  {
    id: "grok-3-mini",
    name: "Grok 3 Mini",
    provider: "xai",
    premium: false,
    usesPremiumCredits: false,
    description:
      "Cost-efficient reasoning model from xAI.\nExcels at STEM tasks requiring less world knowledge.",
    api_sdk: gateway("xai/grok-3-mini"),
    features: [REASONING_FEATURE_BASIC, TOOL_CALLING_FEATURE],
  },
];
