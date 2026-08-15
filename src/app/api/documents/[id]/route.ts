import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const document = await prisma.document.findFirst({
      where: { id, userId },
    });
    if (!document) return new Response("Not found", { status: 404 });

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    return new Response("Error fetching document", { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const existing = await prisma.document.findFirst({
      where: { id, userId },
    });
    if (!existing) return new Response("Not found", { status: 404 });

    const body = await req.json();
    console.log(`[PATCH] doc=${id} title=${JSON.stringify(body.title)} contentLen=${body.content?.length ?? "absent"}`);
    // undefined fields are skipped by Prisma, so partial updates are safe
    const document = await prisma.document.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error updating document:", error);
    return new Response("Error updating document", { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const existing = await prisma.document.findFirst({
      where: { id, userId },
    });
    if (!existing) return new Response("Not found", { status: 404 });

    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return new Response("Error deleting document", { status: 500 });
  }
}
