"use client";

import { useState, useCallback } from "react";
import { Paperclip, X, FileText, Image, File } from "lucide-react";

interface UploadedFile {
  filename: string;
  path: string;
  size: number;
  type: string;
  textContent?: string | null;
}

interface FileUploadProps {
  onFileUploaded: (file: UploadedFile) => void;
  children: React.ReactNode;
}

export default function FileUpload({ onFileUploaded, children }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        onFileUploaded(data);
      }
    } catch (e) {
      console.error("Upload failed:", e);
    }
    setUploading(false);
  }, [onFileUploaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className="relative"
    >
      {children}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-400 rounded-xl flex items-center justify-center z-10">
          <div className="text-blue-400 flex items-center gap-2">
            <Paperclip className="w-5 h-5" />
            <span>Drop file here</span>
          </div>
        </div>
      )}
      {uploading && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10 rounded-xl">
          <span className="text-white text-sm">Uploading...</span>
        </div>
      )}
    </div>
  );
}
