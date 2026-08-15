import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    const document = await prisma.document.create({
      data: {
        title: body.title || "Untitled",
        userId,
      },
    });
    return NextResponse.json(document);
  } catch (error) {
    return new Response("Error creating document", { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const documents = await prisma.document.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(documents);
  } catch (error) {
    return new Response("Error fetching documents", { status: 500 });
  }
}
