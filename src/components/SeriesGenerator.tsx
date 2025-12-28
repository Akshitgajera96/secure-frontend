import { useState, useRef } from 'react';
import { Layers, FileUp, Download, Loader2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

interface SeriesGeneratorProps {
  userId: string;
}

export const SeriesGenerator = ({ userId }: SeriesGeneratorProps) => {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [startNumber, setStartNumber] = useState(500);
  const [endNumber, setEndNumber] = useState(1000);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { token } = useAuth();

  const handleTemplateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.name.endsWith('.svg')) {
        setTemplateFile(file);
        setGeneratedPdfUrl(null);
        toast.success(`Template loaded: ${file.name}`);
      } else {
        toast.error('Please upload a PDF or SVG template');
      }
    }
  };

  const handleGenerate = async () => {
    if (!templateFile) {
      toast.error('Please upload a template first');
      return;
    }

    if (startNumber >= endNumber) {
      toast.error('Start number must be less than end number');
      return;
    }

    if (endNumber - startNumber > 1000) {
      toast.error('Maximum 1000 numbers per batch');
      return;
    }

    if (!token) {
      toast.error('Not authenticated');
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      const templateBase64 = await fileToBase64(templateFile);

      const res = await api.post(
        '/api/series/generate',
        {
          templateBase64,
          templateType: templateFile.type,
          startNumber,
          endNumber,
          userId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          responseType: 'blob',
        }
      );

      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      setGeneratedPdfUrl(url);
      setProgress(100);
      toast.success(`Generated ${endNumber - startNumber + 1} numbered designs!`);
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate series');
    } finally {
      setIsGenerating(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const base64ToBlob = (base64: string, type: string): Blob => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type });
  };

  const handleDownload = () => {
    if (generatedPdfUrl) {
      const a = document.createElement('a');
      a.href = generatedPdfUrl;
      a.download = `series_${startNumber}-${endNumber}.pdf`;
      a.click();
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Layers className="h-5 w-5 text-primary" />
          Batch Series Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Upload */}
        <div className="space-y-2">
          <Label className="text-muted-foreground">Template (PDF or SVG)</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.svg"
            onChange={handleTemplateSelect}
            className="hidden"
          />
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            {templateFile ? (
              <div className="flex items-center justify-center gap-2 text-foreground">
                <FileUp className="h-5 w-5 text-primary" />
                <span>{templateFile.name}</span>
              </div>
            ) : (
              <div className="text-muted-foreground">
                <FileUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Click to upload template</p>
                <p className="text-xs mt-1">PDF or SVG with [NUMBER] placeholder</p>
              </div>
            )}
          </div>
        </div>

        {/* Number Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startNumber" className="text-muted-foreground">Start Number</Label>
            <Input
              id="startNumber"
              type="number"
              value={startNumber}
              onChange={(e) => setStartNumber(parseInt(e.target.value) || 0)}
              min={1}
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endNumber" className="text-muted-foreground">End Number</Label>
            <Input
              id="endNumber"
              type="number"
              value={endNumber}
              onChange={(e) => setEndNumber(parseInt(e.target.value) || 0)}
              min={1}
              className="bg-background border-border"
            />
          </div>
        </div>

        {/* Info */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-2">
            <Settings2 className="h-4 w-4 text-primary mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p><strong className="text-foreground">Total designs:</strong> {Math.max(0, endNumber - startNumber + 1)}</p>
              <p><strong className="text-foreground">Layout:</strong> 4 per A4 sheet (2×2 grid)</p>
              <p><strong className="text-foreground">Format:</strong> Vector PDF, CMYK, 3mm bleed</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Generating...</span>
              <span className="text-foreground">{progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleGenerate}
            disabled={!templateFile || isGenerating}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Layers className="h-4 w-4 mr-2" />
                Generate Series
              </>
            )}
          </Button>

          {generatedPdfUrl && (
            <Button
              onClick={handleDownload}
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
