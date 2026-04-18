import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CustomToolForm } from "@/components/custom-tools/tool-form";

export const dynamic = "force-dynamic";

export default function NewCustomToolPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href="/app/tools"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Wróć do listy
        </Link>
        <PageHeader
          title="Nowy custom tool"
          description="Zdefiniuj parametry i formułę. Przykład: parametry kwh i tariff, formuła kwh * tariff + 15. Agent zobaczy to narzędzie i będzie mógł je wywołać, gdy operator go o to poprosi."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Definicja</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomToolForm
            mode="create"
            initial={{
              name: "",
              description: "",
              parameters: [
                {
                  name: "kwh",
                  type: "number",
                  description: "Zużycie energii w kWh",
                  required: true,
                },
                {
                  name: "tariff",
                  type: "number",
                  description: "Stawka taryfy w zł/kWh",
                  required: true,
                  default: 0.85,
                },
                {
                  name: "fixed_fee",
                  type: "number",
                  description: "Opłata stała w zł",
                  required: false,
                  default: 12,
                },
              ],
              formula: "kwh * tariff + fixed_fee",
              responseTemplate:
                "Miesięczny koszt: {{kwh}} kWh × {{tariff}} zł/kWh + {{fixed_fee}} zł = {{result}} zł",
              enabled: true,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
