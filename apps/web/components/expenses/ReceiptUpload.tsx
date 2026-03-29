import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, X, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { OcrResult } from '@/types';
import api from '@/lib/api';

interface ReceiptUploadProps {
  onScanComplete: (data: OcrResult, fileUrl: string) => void;
  onSkip: () => void;
}

export function ReceiptUpload({ onScanComplete, onSkip }: ReceiptUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
    onDropRejected: () => {
      toast.error('File rejected. Please upload an image or PDF under 10MB.');
    }
  });

  const handleScan = async () => {
    if (!file) return;

    setIsScanning(true);
    setProgress(10); // Start progress

    const formData = new FormData();
    formData.append('receipt', file);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 15, 90));
      }, 500);

      const response = await api.post('/ocr/scan', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearInterval(progressInterval);
      setProgress(100);

      const { data, fileUrl } = response.data.data;
      
      setTimeout(() => {
        toast.success('Receipt scanned successfully');
        onScanComplete(data, fileUrl);
      }, 500);

    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Failed to scan receipt. Please enter details manually.');
      setIsScanning(false);
      setProgress(0);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-2">Upload Receipt</h2>
        <p className="text-muted-foreground text-sm">
          We&apos;ll automatically extract the amount, date, and vendor for you.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full"
          >
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
                flex flex-col items-center justify-center min-h-[300px] bg-card hover:bg-muted/50
                ${isDragActive ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border'}
                ${isDragReject ? 'border-destructive bg-destructive/5' : ''}
              `}
            >
              <input {...getInputProps()} />
              
              <div className={`p-4 rounded-full mb-4 transition-colors ${isDragActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <UploadCloud className="w-8 h-8" />
              </div>
              
              <h3 className="text-lg font-medium text-foreground mb-1">
                {isDragActive ? 'Drop receipt here' : 'Drag & drop your receipt'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Supports JPG, PNG, WEBP, and PDF up to 10MB
              </p>
              
              <div className="px-4 py-2 rounded-lg bg-background border border-border text-sm font-medium shadow-sm pointer-events-none">
                Browse Files
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={onSkip}
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
              >
                Skip and enter details manually
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-card border border-border rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-muted rounded-xl text-primary">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground truncate max-w-[200px] sm:max-w-xs">
                    {file.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              {!isScanning && (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {isScanning ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" /> 
                    {progress === 100 ? 'Processing complete' : 'Extracting details...'}
                  </span>
                  <span className="text-muted-foreground font-mono">{progress}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary rounded-full relative"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "easeInOut" }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                  </motion.div>
                </div>
                <p className="text-xs text-center text-muted-foreground animate-pulse">
                  Applying OCR magic to read your receipt
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors flex-1"
                >
                  Choose Another
                </button>
                <button
                  type="button"
                  onClick={handleScan}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 flex-[2] shadow-sm shadow-primary/20"
                >
                  Scan Receipt
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
