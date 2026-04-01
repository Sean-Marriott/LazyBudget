"use client";

import { Sankey, Tooltip, ResponsiveContainer } from "recharts";
import type { SankeyNodeProps, SankeyLinkProps } from "recharts";
import { getCategoryColor } from "@/lib/utils/categories";
import { formatCurrency } from "@/lib/utils/currency";

const INCOME_COLOR = "#9ece6a";
const SAVINGS_COLOR = "#73daca";

/**
 * Selects the hex color used to render a Sankey node based on its name.
 *
 * @param name - The node's name (e.g., "Income", "Savings", or a category)
 * @returns A hex color string; uses specific colors for "Income" and "Savings", otherwise the color associated with the category name.
 */
function getNodeColor(name: string): string {
  if (name === "Income") return INCOME_COLOR;
  if (name === "Savings") return SAVINGS_COLOR;
  return getCategoryColor(name);
}

interface Props {
  income: number;
  spending: { category: string; total: number }[];
  height?: number;
  compact?: boolean;
}

/**
 * Render a Sankey node as an SVG group containing a colored rounded rectangle and optional labels.
 *
 * The node's fill color is derived from `payload.name`. When `payload.depth === 0` the labels are
 * positioned to the left; otherwise they are positioned to the right. If `compact` is true, labels
 * are omitted.
 *
 * @param compact - When true, hide the node name and value labels
 * @returns An SVG `<g>` element representing the node (rounded rect plus optional text labels)
 */
function CustomNode({ x, y, width, height, payload, compact }: SankeyNodeProps & { compact: boolean }) {
  const color = getNodeColor(payload.name);
  const isSource = payload.depth === 0;
  const labelX = isSource ? x - 8 : x + width + 8;
  const textAnchor = isSource ? "end" : "start";

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} rx={2} />
      {!compact && (
        <>
          <text
            x={labelX}
            y={y + height / 2 - 6}
            textAnchor={textAnchor}
            fill="#c0caf5"
            fontSize={11}
            fontWeight={500}
          >
            {payload.name}
          </text>
          <text
            x={labelX}
            y={y + height / 2 + 8}
            textAnchor={textAnchor}
            fill="#a9b1d6"
            fontSize={10}
          >
            {formatCurrency(payload.value)}
          </text>
        </>
      )}
    </g>
  );
}

/**
 * Render an SVG path for a Sankey link using the provided geometry and the target node's color.
 *
 * @param payload - Sankey link payload; the target node's `name` is used to determine the link fill color
 * @returns An SVG `<path>` element representing the link filled with the target node color (20% opacity) and no stroke
 */
function CustomLink({
  sourceX,
  targetX,
  sourceY,
  targetY,
  sourceControlX,
  targetControlX,
  linkWidth,
  payload,
}: SankeyLinkProps) {
  const color = getNodeColor(payload.target.name);
  const d = [
    `M${sourceX},${sourceY - linkWidth / 2}`,
    `C${sourceControlX},${sourceY - linkWidth / 2}`,
    ` ${targetControlX},${targetY - linkWidth / 2}`,
    ` ${targetX},${targetY - linkWidth / 2}`,
    `L${targetX},${targetY + linkWidth / 2}`,
    `C${targetControlX},${targetY + linkWidth / 2}`,
    ` ${sourceControlX},${sourceY + linkWidth / 2}`,
    ` ${sourceX},${sourceY + linkWidth / 2}`,
    "Z",
  ].join(" ");
  return <path d={d} fill={color} fillOpacity={0.2} stroke="none" />;
}

/**
 * Render a Sankey diagram visualizing income, spending by category, and optional savings.
 *
 * Renders a centered "No data — sync to see cashflow." message when `income` is 0 and `spending` is empty.
 *
 * @param income - Total income amount used as the Sankey source
 * @param spending - Array of spending entries; each item should include `category` and `total`
 * @param height - Height of the rendered chart in pixels (default: 300)
 * @param compact - When true, uses a tighter layout and hides node labels (default: false)
 * @returns A React element containing the cashflow Sankey diagram or the no-data message
 */
export function CashflowSankey({ income, spending, height = 300, compact = false }: Props) {
  if (income === 0 && spending.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-sm text-muted-foreground"
      >
        No data — sync to see cashflow.
      </div>
    );
  }

  const totalExpenses = spending.reduce((sum, s) => sum + s.total, 0);
  const savings = income - totalExpenses;

  const nodes: { name: string }[] = [
    { name: "Income" },
    ...spending.map((s) => ({ name: s.category })),
  ];

  // Sankey requires all link values > 0; cap spending at income to avoid zero/negative savings link
  const links: { source: number; target: number; value: number }[] = spending.map((s, i) => ({
    source: 0,
    target: i + 1,
    value: Math.max(s.total, 0.01),
  }));

  if (savings > 0) {
    nodes.push({ name: "Savings" });
    links.push({ source: 0, target: nodes.length - 1, value: savings });
  }

  const margin = compact
    ? { top: 8, right: 80, bottom: 8, left: 60 }
    : { top: 20, right: 150, bottom: 20, left: 110 };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Sankey
        data={{ nodes, links }}
        nodePadding={compact ? 12 : 20}
        nodeWidth={10}
        iterations={32}
        node={(props: SankeyNodeProps) => <CustomNode {...props} compact={compact} />}
        link={(props: SankeyLinkProps) => <CustomLink {...props} />}
        margin={margin}
      >
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value)), ""]}
          contentStyle={{
            backgroundColor: "#1a1b26",
            border: "1px solid #2e3250",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#c0caf5",
          }}
        />
      </Sankey>
    </ResponsiveContainer>
  );
}
