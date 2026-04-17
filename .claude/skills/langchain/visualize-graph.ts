// @ts-nocheck
import { resolve } from "path";
import { writeFileSync } from "fs";
import { basename } from "path";

function transformMermaid(rawMermaid: string): string {
  const lines = rawMermaid.split("\n");
  const nodes: string[] = [];
  const edges: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip config and style lines
    if (
      trimmed.startsWith("%%{") ||
      trimmed.startsWith("classDef") ||
      trimmed === "graph TD;" ||
      trimmed === ""
    ) {
      continue;
    }

    // Node definition: nodeName(<p>label</p>) or nodeName(label)
    const nodeMatch = trimmed.match(/^(\w+)\((?:<p>)?([^<)]+)(?:<\/p>)?\)$/);
    if (nodeMatch) {
      const [, name, label] = nodeMatch;
      if (name === "__start__" || name === "__end__") {
        // Terminal nodes - stadium shape
        nodes.push(`    ${name.toUpperCase()}([${label}])`);
      } else {
        // Regular nodes
        nodes.push(`    ${name}[${label}]`);
      }
      continue;
    }

    // Edge: A --> B; or A -->|label| B;
    const edgeMatch = trimmed.match(
      /^(\w+)\s*(-->|-.->)(?:\|"?([^"|]+)"?\|)?\s*(\w+);?$/,
    );
    if (edgeMatch) {
      const [, from, , label, to] = edgeMatch;
      const fromName = from === "__start__" ? "__START__" : from;
      const toName = to === "__end__" ? "__END__" : to;

      if (label) {
        edges.push(`    ${fromName} -->|"${label}"| ${toName}`);
      } else {
        edges.push(`    ${fromName} --> ${toName}`);
      }
    }
  }

  return ["graph TD", ...nodes, "", ...edges].join("\n");
}

async function main() {
  const [graphPath, outputPath] = process.argv.slice(2);

  if (!graphPath || !outputPath) {
    console.error(
      "Usage: tsx visualize-graph.ts <graph-file.ts> <output-file.md>",
    );
    process.exit(1);
  }

  const absGraphPath = resolve(process.cwd(), graphPath);
  const absOutputPath = resolve(process.cwd(), outputPath);

  const module = await import(absGraphPath);

  // Find the exported StateGraph (uncompiled) - first export that has .compile method
  const graph = Object.values(module).find(
    (exp: any) => exp && typeof exp.compile === "function",
  ) as any;

  if (!graph) {
    console.error("No StateGraph export found in", graphPath);
    console.error("Exports:", Object.keys(module).join(", "));
    process.exit(1);
  }

  const compiled = graph.compile();
  const rawMermaid = compiled.getGraph().drawMermaid();
  const mermaid = transformMermaid(rawMermaid);

  const name = basename(outputPath, ".graph.md");
  const md = `# ${name} graph

\`\`\`mermaid
${mermaid}
\`\`\`

## Notes

- Diagram shows static edges from \`addEdge()\`
- Command routing edges need to be added manually (see visualization.md)
`;

  writeFileSync(absOutputPath, md);
  console.log(`Written: ${absOutputPath}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
