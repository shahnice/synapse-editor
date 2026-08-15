#!/bin/bash

# Create Directories
mkdir -p src/components src/app/api/ai src/app/api/documents/\[id\] src/lib

# 1. Middleware
cat << 'EOF' > src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher('/sign-in(.*)', '/sign-up(.*)')

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
EOF

# 2. Layout
cat << 'EOF' > src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Synapse Editor",
  description: "AI-Powered Notion Clone",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en" className="dark">
        <body className={`${inter.className} bg-zinc-950 text-zinc-100`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
EOF

# 3. Prisma Lib
cat << 'EOF' > src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
EOF

# 4. Editor Component
cat << 'EOF' > src/components/Editor.tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import { useState } from "react";
import { Sparkles } from "lucide-react";

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
}

export default function Editor({ content, onChange }: EditorProps) {
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Start writing, or type '/ai' to generate..." }),
      Highlight,
      Typography,
    ],
    content,
    editorProps: {
      attributes: {
        class: "min-h-[500px] w-full focus:outline-none prose prose-invert prose-zinc max-w-none",
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      if (text.includes("/ai")) {
        setShowAiMenu(true);
      }
      onChange(editor.getHTML());
    },
  });

  const handleAiGenerate = async () => {
    if (!aiPrompt) return;
    setIsAiLoading(true);
    
    const currentContent = editor!.getText();
    const cleanedContent = currentContent.replace("/ai", "").trim();
    
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, context: cleanedContent }),
      });
      const data = await res.json();
      
      editor!.commands.setContent(`<p>${cleanedContent}</p><p>${data.text}</p>`);
    } catch (error) {
      console.error(error);
    }
    
    setAiPrompt("");
    setShowAiMenu(false);
    setIsAiLoading(false);
  };

  return (
    <div className="relative flex-1 overflow-y-auto p-8">
      {showAiMenu && (
        <div className="absolute top-0 right-0 mt-2 mr-2 w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-4 z-50">
          <div className="flex items-center gap-2 text-blue-400 font-semibold mb-3">
            <Sparkles size={16} /> AI Assistant
          </div>
          <input
            autoFocus
            type="text"
            placeholder="e.g., Write a summary of this..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-100"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAiGenerate()}
          />
          <button
            onClick={handleAiGenerate}
            disabled={isAiLoading}
            className="mt-3 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            {isAiLoading ? "Generating..." : "Generate"}
          </button>
          <button 
            onClick={() => { setShowAiMenu(false); setAiPrompt(""); }}
            className="mt-2 w-full text-zinc-500 text-sm hover:text-zinc-300"
          >
            Cancel
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
EOF

# 5. AI API Route
cat << 'EOF' > src/app/api/ai/route.ts
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
EOF

# 6. Documents API Route
cat << 'EOF' > src/app/api/documents/route.ts
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
EOF

# 7. Document [id] API Route
cat << 'EOF' > 'src/app/api/documents/[id]/route.ts'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    await prisma.document.update({
      where: { id: params.id, userId },
      data: { title: body.title, content: body.content },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return new Response("Error updating document", { status: 500 });
  }
}
EOF

# 8. Main Page
cat << 'EOF' > src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { FileText, Plus } from "lucide-react";
import Editor from "@/components/Editor";

interface Document {
  id: string;
  title: string;
  content: string;
}

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setDocuments(data);
      if (data.length > 0) setActiveDoc(data[0]);
    };
    fetchDocs();
  }, []);

  const createDocument = async () => {
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled Document" }),
    });
    const newDoc = await res.json();
    setDocuments([newDoc, ...documents]);
    setActiveDoc(newDoc);
  };

  const saveDocument = async (content: string) => {
    if (!activeDoc) return;
    fetch(`/api/documents/${activeDoc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: activeDoc.title, content }),
    });
  };

  const updateTitle = (title: string) => {
    if (!activeDoc) return;
    const updatedDoc = { ...activeDoc, title };
    setActiveDoc(updatedDoc);
    setDocuments(documents.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    fetch(`/api/documents/${activeDoc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content: activeDoc.content }),
    });
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <aside className="w-64 border-r border-zinc-800 p-4 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-bold text-zinc-50">
              Synapse<span className="text-blue-500">.</span>
            </h1>
            <UserButton afterSignOutUrl="/" />
          </div>
          
          <button 
            onClick={createDocument}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} /> New Page
          </button>

          <div className="mt-6 space-y-1 max-h-[70vh] overflow-y-auto">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setActiveDoc(doc)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                  activeDoc?.id === doc.id 
                    ? "bg-zinc-800 text-zinc-100" 
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                }`}
              >
                <FileText size={14} />
                {doc.title}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {activeDoc ? (
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-zinc-800 p-4 shrink-0">
            <input 
              type="text" 
              value={activeDoc.title}
              onChange={(e) => updateTitle(e.target.value)}
              className="bg-transparent text-3xl font-bold text-zinc-200 outline-none placeholder:text-zinc-700 w-full"
            />
          </div>
          <Editor content={activeDoc.content} onChange={saveDocument} />
        </main>
      ) : (
        <main className="flex-1 flex items-center justify-center text-zinc-600">
          Select or create a document to get started.
        </main>
      )}
    </div>
  );
}
EOF

echo "✅ All files created successfully!"
