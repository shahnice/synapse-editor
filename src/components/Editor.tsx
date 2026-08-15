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
      Placeholder.configure({ placeholder: "Start writing, or type '/ai ' to generate..." }),
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
      const { from } = editor.state.selection;
      
      // Grab the last 10 characters typed to check for the command
      const textBeforeCursor = editor.state.doc.textBetween(
        Math.max(0, from - 10),
        from,
        "\n"
      );

      if (textBeforeCursor.endsWith("/ai")) {
        setShowAiMenu(true);
      }

      onChange(editor.getHTML());
    },
  });

  const handleAiGenerate = async () => {
    if (!aiPrompt || !editor) return;
    setIsAiLoading(true);
    
    // Remember where the cursor is
    const { from } = editor.state.selection;
    const startOfAiCommand = from - 3; // "/ai" is 3 characters long
    
    try {
      const context = editor.getText();
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, context }),
      });
      const data = await res.json();
      
      // Delete the "/ai" text and insert the AI response exactly there
      editor.chain().focus()
        .deleteRange({ from: startOfAiCommand, to: from })
        .insertContent(data.text)
        .run();
        
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