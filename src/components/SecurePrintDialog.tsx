import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, AlertTriangle, Shield, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface SecurePrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmPrint: () => void;
  remainingPrints: number;
  maxPrints: number;
  documentTitle: string;
  isPrinting: boolean;
}

export const SecurePrintDialog = ({
  open,
  onOpenChange,
  onConfirmPrint,
  remainingPrints,
  maxPrints,
  documentTitle,
  isPrinting
}: SecurePrintDialogProps) => {
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleConfirm = () => {
    if (agreedToTerms && remainingPrints > 0) {
      onConfirmPrint();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Shield className="h-5 w-5 text-primary" />
            Secure Print Request
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            You are about to print a protected document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Document Info */}
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <p className="text-sm text-muted-foreground">Document</p>
            <p className="font-medium text-foreground truncate">{documentTitle}</p>
          </div>

          {/* Print Count */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
            <span className="text-sm text-muted-foreground">Prints Remaining</span>
            <span className={`font-mono font-bold ${remainingPrints <= 1 ? 'text-destructive' : 'text-primary'}`}>
              {remainingPrints} / {maxPrints}
            </span>
          </div>

          {/* Warning */}
          <div className="flex gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Print-Only Access</p>
              <p className="text-muted-foreground mt-1">
                This document is protected. Each print is watermarked and logged. 
                Unauthorized distribution is prohibited.
              </p>
            </div>
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-start gap-3">
            <Checkbox 
              id="terms" 
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              className="mt-1"
            />
            <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
              I understand this print will be watermarked with my identity and timestamp. 
              I agree not to distribute or share this document.
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPrinting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!agreedToTerms || remainingPrints <= 0 || isPrinting}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          >
            {isPrinting ? (
              <>
                <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Preparing...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4" />
                Print Document
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
