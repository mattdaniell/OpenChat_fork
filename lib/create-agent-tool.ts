import type { Tool, UIMessage, UIMessageStreamWriter } from "ai";
import { convertToModelMessages, stepCountIs, streamText, tool } from "ai";
import { z } from "zod";
import { getComposioTools } from "@/lib/composio-server";
import type { ConnectorStatusLists } from "@/lib/connector-utils";

const toolNameSchema = z.string().min(1, "Tool name is required");

const toolListSchema = z.union([
  toolNameSchema,
  z.array(toolNameSchema).min(1, "At least one tool is required"),
]);

const createAgentInputSchema = z.object({
  tool: toolListSchema.describe(
    'One or more connector toolkits to enable (e.g. "GMAIL", "NOTION").'
  ),
  task: z
    .string()
    .min(1, "Task description is required")
    .max(2000, "Task must be 2000 characters or less")
    .describe("High-level task for the delegated agent to complete."),
  context: z
    .string()
    .max(5000, "Context must be 5000 characters or less")
    .optional()
    .describe(
      "Optional context from previous operations to provide to the agent."
    ),
});

export type CreateAgentInput = z.infer<typeof createAgentInputSchema> & {
  tool: string | string[];
  context?: string;
};

type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONValue }
  | JSONValue[];

type CreateAgentToolOptions = {
  userId?: string;
  availableToolkits: string[];
  model: string;
  systemPrompt?: string;
  maxSteps?: number;
  providerOptions?: Record<string, Record<string, JSONValue>>;
  connectorsStatus?: ConnectorStatusLists;
  writer: UIMessageStreamWriter;
};

const buildInnerSystemPrompt = (
  task: string,
  requestedToolkits: string[],
  connectorsStatus?: ConnectorStatusLists
): string => {
  const enabledList = connectorsStatus?.enabled ?? [];
  const disabledList = connectorsStatus?.disabled ?? [];
  const notConnectedList = connectorsStatus?.notConnected ?? [];

  return `You are a focused operations agent. Your job is to complete the task provided by the supervisor using ONLY the enabled tools.\n\nTask: ${task}\nEnabled toolkits available to you: ${requestedToolkits.join(", ")}\nOther toolkits for context:\n- Enabled (outside request): ${
    enabledList
      .filter((slug) => !requestedToolkits.includes(slug))
      .join(", ") || "none"
  }\n- Disabled: ${disabledList.join(", ") || "none"}\n- Not connected: ${notConnectedList.join(", ") || "none"}\n\nWork autonomously using the supplied tools. Prefer minimal reasoning tokens and return a concise summary once finished.`;
};

export const createAgentTool = ({
  userId,
  availableToolkits,
  model,
  systemPrompt,
  maxSteps = 8,
  providerOptions,
  connectorsStatus,
  writer,
}: CreateAgentToolOptions): Tool<CreateAgentInput, string> => {
  const connectorListDescription =
    availableToolkits.length > 0
      ? availableToolkits.join(", ")
      : "(no connectors available)";

  return tool<CreateAgentInput, string>({
    description: `Create a temporary agent that can use specific connectors to complete a task. Provide the connectors via the \`tool\` field, the high-level goal via \`task\`, and optional context from previous operations via \`context\`. Available connectors: ${connectorListDescription}.`,
    inputSchema: createAgentInputSchema,
    async execute(input) {
      const toolValues = Array.isArray(input.tool) ? input.tool : [input.tool];

      const requestedToolkits = Array.from(
        new Set(
          toolValues
            .map((rawValue) => rawValue.trim())
            .filter((value) => value.length > 0)
            .map((value) => value.toUpperCase())
        )
      );

      if (requestedToolkits.length === 0) {
        throw new Error("At least one connector toolkit must be specified.");
      }

      if (!userId) {
        throw new Error("User session required to use connectors.");
      }

      const availableSet = new Set(
        availableToolkits.map((slug) => slug.toUpperCase())
      );
      const unavailable = requestedToolkits.filter(
        (slug) => !availableSet.has(slug)
      );

      if (unavailable.length > 0) {
        throw new Error(
          `Unavailable connectors requested: ${unavailable.join(", ")}. Enable them in settings and try again.`
        );
      }

      const rawTools = await getComposioTools(userId, requestedToolkits);
      const filteredTools: Record<string, Tool> = {};
      for (const [toolName, candidate] of Object.entries(rawTools)) {
        if (
          candidate &&
          typeof candidate === "object" &&
          "execute" in candidate &&
          typeof (candidate as Tool).execute === "function"
        ) {
          filteredTools[toolName] = candidate as Tool;
        }
      }

      if (Object.keys(filteredTools).length === 0) {
        throw new Error(
          "No connector tools available for the requested selection."
        );
      }

      const innerSystem =
        systemPrompt ??
        buildInnerSystemPrompt(input.task, requestedToolkits, connectorsStatus);

      // Build messages array based on whether context is provided
      const messages: UIMessage[] = [];

      // Add context message if provided
      if (input.context) {
        messages.push({
          id: "create-agent-context",
          role: "user",
          parts: [
            {
              type: "text",
              text: `Context from previous operations:\n\n${input.context}`,
            },
          ],
        });
      }

      // Add task message
      messages.push({
        id: "create-agent-task",
        role: "user",
        parts: [{ type: "text", text: input.task }],
      });

      // Stream the agent's work using standard AI SDK streaming
      const result = streamText({
        model,
        system: innerSystem,
        messages: convertToModelMessages(messages),
        tools: filteredTools,
        stopWhen: stepCountIs(maxSteps),
        providerOptions,
      });

      // Generate unique boundary ID for this agent execution
      const boundaryId = `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Inject start boundary marker
      writer.write({
        type: "data-agent-boundary",
        id: `${boundaryId}-start`,
        data: {
          type: "start",
          agentId: "create_agent",
          boundaryId,
          timestamp: new Date().toISOString(),
          task: input.task,
          toolkits: requestedToolkits,
          context: input.context,
        },
        transient: false, // Keep in message history for boundary detection
      });

      // Let AI SDK handle all the streaming naturally
      writer.merge(result.toUIMessageStream());

      // Wait for completion and return result
      const finalText = (await result.text).trim();

      // Inject end boundary marker
      writer.write({
        type: "data-agent-boundary",
        id: `${boundaryId}-end`,
        data: {
          type: "end",
          agentId: "create_agent",
          boundaryId,
          timestamp: new Date().toISOString(),
          result: finalText,
        },
        transient: false, // Keep in message history for boundary detection
      });
      return finalText.length > 0
        ? finalText
        : "Delegated agent completed without additional commentary.";
    },
  });
};
