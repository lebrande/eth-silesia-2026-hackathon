import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomToolForm } from "@/components/custom-tools/tool-form";
import { getCustomTool } from "@/lib/server/custom-tools.server";
import {
  deleteCustomToolAction,
  toggleCustomToolAction,
} from "@/lib/actions/custom-tools.action";
import { db } from "@/db";
import { users } from "@/db/schema";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomToolEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tool = await getCustomTool(id);
  if (!tool) notFound();

  let author: { name: string | null; email: string } | null = null;
  if (tool.createdByUserId) {
    const [row] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, tool.createdByUserId))
      .limit(1);
    if (row) author = row;
  }

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
          title={tool.name}
          description={
            <span>
              {tool.enabled ? (
                <Badge variant="success">aktywne</Badge>
              ) : (
                <Badge variant="muted">wyłączone</Badge>
              )}{" "}
              <span className="ml-2 text-xs">
                autor: {author?.name || author?.email || "—"} · utworzone{" "}
                {formatDateTime(tool.createdAt)}
              </span>
            </span>
          }
          actions={
            <div className="flex items-center gap-2">
              <form action={toggleCustomToolAction}>
                <input type="hidden" name="id" value={tool.id} />
                <input
                  type="hidden"
                  name="enabled"
                  value={tool.enabled ? "false" : "true"}
                />
                <Button variant="outline" size="sm" type="submit">
                  {tool.enabled ? "Wyłącz" : "Włącz"}
                </Button>
              </form>
              <form action={deleteCustomToolAction}>
                <input type="hidden" name="id" value={tool.id} />
                <Button variant="danger" size="sm" type="submit">
                  <Trash2 className="h-3.5 w-3.5" />
                  Usuń
                </Button>
              </form>
            </div>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edycja</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomToolForm mode="edit" tool={tool} />
        </CardContent>
      </Card>
    </div>
  );
}
