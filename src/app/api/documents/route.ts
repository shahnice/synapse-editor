import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEMO_USER_ID } from "@/lib/demoUser";

export async function POST(req: Request) {
  try {
    const userId = DEMO_USER_ID;

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
    const documents = await prisma.document.findMany({
      where: { userId: DEMO_USER_ID },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(documents);
  } catch (error) {
    return new Response("Error fetching documents", { status: 500 });
  }
}
