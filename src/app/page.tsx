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

  useEffect(() => {
    if (!activeDoc) return;
    const timer = setTimeout(() => {
      fetch(`/api/documents/${activeDoc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: activeDoc.content }),
      }).then(() => {
        setDocuments(prev =>
          prev.map(d => (d.id === activeDoc.id ? { ...d, content: activeDoc.content } : d))
        );
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [activeDoc?.id, activeDoc?.content]);

  const selectDocument = async (doc: Document) => {
    const res = await fetch(`/api/documents/${doc.id}`);
    if (res.ok) setActiveDoc(await res.json());
  };

  const updateTitle = (title: string) => {
    if (!activeDoc) return;
    const updatedDoc = { ...activeDoc, title };
    setActiveDoc(updatedDoc);
    setDocuments(documents.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    fetch(`/api/documents/${activeDoc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
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
            <UserButton />
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
                onClick={() => selectDocument(doc)}
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
          <Editor
            key={activeDoc.id}
            content={activeDoc.content}
            onChange={(content) => setActiveDoc({ ...activeDoc, content })}
          />
        </main>
      ) : (
        <main className="flex-1 flex items-center justify-center text-zinc-600">
          Select or create a document to get started.
        </main>
      )}
    </div>
  );
}
