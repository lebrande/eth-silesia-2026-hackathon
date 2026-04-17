// Component format: {{type param1="val1" param2="val2"}}
// Used in message text, parsed by widget.js on the client side.

type ComponentParams = Record<string, string>;

export function buildComponent(type: string, params?: ComponentParams): string {
  if (!params || Object.keys(params).length === 0) return `{{${type}}}`;

  const parts = Object.entries(params)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");

  return `{{${type} ${parts}}}`;
}
