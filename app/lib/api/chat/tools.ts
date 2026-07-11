export const QXT_TOOLS = [
  {
    type: "function",
    function: {
      name: "math_calculator",
      description:
        "Perform precise mathematical calculations. Use this tool for ANY numeric or arithmetic operation instead of guessing.",

      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description:
              "A valid mathematical expression (e.g., 45*18, (10+5)/3, sqrt(16), 2^10).",
          },
        },
        required: ["expression"],
        additionalProperties: false,
      },
    },
  },

  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search the internet for up-to-date, real-time, or recent information. Use for news, current events, or unknown facts.",

      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to look up.",
          },
          max_results: {
            type: "number",
            description: "Number of results to return (default is 5).",
            minimum: 1,
            maximum: 10,
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },

  {
    type: "function",
    function: {
      name: "python_executor",
      description:
        "Execute safe Python code in a sandboxed environment. No internet or file system access. Use for calculations, data processing, or logic execution.",

      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description:
              "Valid Python code. Must be self-contained and safe to execute.",
          },
        },
        required: ["code"],
        additionalProperties: false,
      },
    },
  },
] as const;

/* ======================================================
   🔥 OPTIONAL: TYPE (Strong typing للـ tools)
====================================================== */

export type QxtTool = (typeof QXT_TOOLS)[number];