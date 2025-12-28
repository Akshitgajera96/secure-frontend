import { Shield, Lock, Printer, Eye, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Background grid */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}
        />
        
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

        <Navbar />

        <div className="relative container mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-8 animate-fade-in">
            <Lock className="h-4 w-4" />
            <span>Enterprise-grade document security</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Print-Only PDF Viewer
            <span className="block text-gradient mt-2">Maximum Security</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Banking-grade document protection. View and print PDFs without the ability to download, copy, or extract content. Perfect for confidential documents.
          </p>

          <div className="flex items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link to="/upload">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-14 px-8 text-lg">
                Upload Document
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/demo">
              <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-secondary h-14 px-8 text-lg">
                View Demo
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-24 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              True Document Protection
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Unlike other viewers, our platform keeps your PDFs in vector format for crisp printing while blocking all extraction methods.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Eye,
                title: "View Only Mode",
                description: "Documents are displayed securely without exposing the raw PDF file. No downloads, no saves, no extraction."
              },
              {
                icon: Printer,
                title: "Controlled Printing",
                description: "Print through our secure pipeline with watermarks. Track print counts and set limits per document."
              },
              {
                icon: Lock,
                title: "Full Security",
                description: "Blocked: right-click, keyboard shortcuts, text selection, drag-and-drop, and browser print function."
              }
            ].map((feature, i) => (
              <div 
                key={i}
                className="group p-8 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 animate-fade-in"
                style={{ animationDelay: `${0.4 + i * 0.1}s` }}
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Badge */}
      <section className="py-16 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
            {[
              "No Download",
              "No Copy",
              "No Save As",
              "No Print Screen",
              "Watermarked Prints",
              "Session Controlled"
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>SecurePDF — Enterprise document security platform</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
