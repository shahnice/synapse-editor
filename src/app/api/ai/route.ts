import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const { prompt, context, openaiApiKey } = await req.json();

    if (!openaiApiKey) {
      return NextResponse.json({ error: "Missing OpenAI API key" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an AI writing assistant inside a Notion-like editor. Return only the requested text, no markdown formatting, no conversational filler.",
        },
        {
          role: "user",
          content: `Context: ${context}\n\nInstruction: ${prompt}`,
        },
      ],
    });

    return NextResponse.json({ text: response.choices[0].message.content });
  } catch (error) {
    if (error instanceof OpenAI.AuthenticationError) {
      return NextResponse.json({ error: "Invalid OpenAI API key" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }
}
