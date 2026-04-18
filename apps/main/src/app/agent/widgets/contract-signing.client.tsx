"use client";

import { useState } from "react";
import { Check, QrCode } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ContractSigningData } from "@/graphs/chat/chat.widgets.shared";
import { MockQr } from "./mock-qr.client";

type UiStatus = "reading" | "accepted" | "signed";

function initialStatus(s: ContractSigningData["status"]): UiStatus {
  if (s === "signed") return "signed";
  if (s === "accepted") return "accepted";
  return "reading";
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function ContractSigningWidget({
  data,
}: {
  data: ContractSigningData;
}) {
  const [status, setStatus] = useState<UiStatus>(() =>
    initialStatus(data.status),
  );
  const [signing, setSigning] = useState(false);

  async function sign() {
    setSigning(true);
    await new Promise((r) => setTimeout(r, 1000));
    setStatus("signed");
    setSigning(false);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Umowa — taryfa {data.metadata.tariffCode}</CardTitle>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Klient: {data.metadata.customerName}</span>
          <span>
            Wchodzi w życie: {formatDate(data.metadata.effectiveFrom)}
          </span>
        </div>
      </CardHeader>

      <Separator />

      <CardContent>
        {status === "reading" ? (
          <div className="flex flex-col gap-3">
            <div className="max-h-64 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 text-sm">
              {data.sections.map((s, i) => (
                <div key={i} className={i > 0 ? "mt-3" : ""}>
                  <div className="font-semibold">{s.title}</div>
                  <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
            <Button onClick={() => setStatus("accepted")}>
              Akceptuję warunki
            </Button>
          </div>
        ) : null}

        {status === "accepted" ? (
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-2 text-sm text-success">
              <Check className="h-4 w-4" /> Warunki zaakceptowane
            </div>
            <div className="flex items-start gap-4">
              <div className="text-primary">
                <MockQr size={120} />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  Zeskanuj QR w aplikacji mObywatel lub kliknij przycisk, aby
                  podpisać.
                </p>
                <Button onClick={sign} disabled={signing}>
                  <QrCode className="h-4 w-4" />
                  {signing ? "Podpisywanie…" : "Podpisz mObywatelem"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {status === "signed" ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="h-5 w-5" />
            </div>
            <div className="text-base font-semibold">Umowa podpisana</div>
            <p className="text-sm text-muted-foreground">
              Od {formatDate(data.metadata.effectiveFrom)} jesteś na taryfie{" "}
              {data.metadata.tariffCode}.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
