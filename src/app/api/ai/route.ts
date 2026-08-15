import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { prompt, context } = await req.json();
    
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
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }
}
