import { useState, useCallback } from 'react';
import { Upload, FileText, Shield, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
}

export const UploadZone = ({ onFileSelect, isUploading = false }: UploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');

      if (isPdf || isSvg) {
        setSelectedFile(file);
        onFileSelect(file);
      } else {
        toast.error('Only PDF and SVG files are allowed');
      }
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');

      if (isPdf || isSvg) {
        setSelectedFile(file);
        onFileSelect(file);
      } else {
        toast.error('Only PDF and SVG files are allowed');
        e.target.value = '';
      }
    }
  }, [onFileSelect]);

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={cn(
        "relative border-2 rounded-xl p-12 transition-all duration-300 cursor-pointer group",
        isDragging 
          ? "border-primary bg-primary/5 scale-[1.02]" 
          : "border-border hover:border-primary/50 hover:bg-card/50",
        selectedFile && "border-primary bg-primary/5"
      )}
    >
      <input
        type="file"
        accept=".pdf,.svg,application/pdf,image/svg+xml"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isUploading}
      />
      
      <div className="flex flex-col items-center gap-4 text-center">
        {selectedFile ? (
          <>
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center animate-scale-in">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <div className="animate-fade-in">
              <h3 className="text-lg font-semibold text-foreground">
                {selectedFile.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </>
        ) : (
          <>
            <div className={cn(
              "h-16 w-16 rounded-full bg-secondary flex items-center justify-center transition-all duration-300",
              isDragging && "bg-primary/20 scale-110"
            )}>
              {isDragging ? (
                <FileText className="h-8 w-8 text-primary animate-pulse" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {isDragging ? "Drop your PDF or SVG here" : "Upload PDF or SVG Document"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Drag and drop or click to browse
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3 w-3 text-primary" />
              <span>Documents are encrypted and securely stored</span>
            </div>
          </>
        )}
      </div>

      {isUploading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <div className="text-center">
            <div className="h-10 w-10 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Uploading securely...</p>
          </div>
        </div>
      )}
    </div>
  );
};
