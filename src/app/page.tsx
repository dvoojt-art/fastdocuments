import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  Zap, 
  ArrowRight, 
  ShieldCheck,
  LayoutGrid, Shield, Users
} from "lucide-react"
import { ChevronUp } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Floating Circles Layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-0">
        <div className="absolute top-[50%] left-[90%] w-5 h-5 rounded-full bg-black animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[60%] left-[5%] w-7 h-7 rounded-full bg-black animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[25%] right-[15%] w-16 h-16 rounded-full bg-gray-400/50 animate-float" style={{ animationDelay: '2.5s' }}></div>
        <div className="absolute bottom-[40%] left-[30%] w-8 h-8 rounded-full bg-gray-400/50 animate-float" style={{ animationDelay: '3.5s' }}></div>
        <div className="absolute top-[60%] right-[25%] w-10 h-10 rounded-full bg-yellow-500/50 animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-[60%] left-[10%] w-20 h-20 rounded-full bg-yellow-500/50 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Navigation */}
      <header className="px-6 h-20 flex items-center relative z-10 bg-[#0f326e] border-b border-white/10">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="bg-primary h-10 w-10 rounded-full flex items-center justify-center text-primary-foreground font-headline font-bold text-2xl">
              F
            </div>
            <div className="flex flex-col">
              <span className="font-headline font-bold text-2xl tracking-tight text-white leading-none">FastDocs</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mt-1">Callb<span className="relative inline-block">o<ChevronUp className="absolute -top-[0.2em] left-1/2 -translate-x-1/2 h-[0.5em] w-[0.5em] text-primary" strokeWidth={4} /></span>x Inc. Davao</span>
            </div>
          </div>
        </div>
        <nav className="ml-auto flex gap-6 items-center">
          <Button asChild size="lg" className="rounded-full font-bold bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-none px-8 h-10">
            <Link href="#features">Learn More</Link>
          </Button>
        </nav>
        </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 px-6 text-center">
          <div className="container mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 px-5 py-1.5 text-xs font-bold uppercase tracking-widest bg-background/50 backdrop-blur-sm text-foreground mb-10 shadow-sm hover:bg-primary hover:text-primary-foreground transition-all duration-300 group cursor-default">
              <Zap className="h-3.5 w-3.5 fill-primary text-primary group-hover:fill-primary-foreground group-hover:text-primary-foreground transition-colors" />
              INSTANT GENERATION
            </div>
            <h1 className="text-6xl font-headline font-bold tracking-tighter sm:text-7xl md:text-8xl leading-[0.9] mb-8 text-foreground">
              Callb<span className="relative inline-block">o<ChevronUp className="absolute -top-[0.2em] left-1/2 -translate-x-1/2 h-[0.5em] w-[0.5em] text-primary" strokeWidth={4} /></span>x Davao <br />
              <span className="text-foreground">e-Documents Portal</span>
            </h1>
            <p className="mx-auto max-w-[650px] text-lg md:text-xl font-medium leading-relaxed opacity-60 mb-12">
              The centralized hub to request and access official HR documents and certificates instantly without manual typing!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 mb-40">
              <Button asChild size="lg" className="h-16 px-12 rounded-full text-lg font-bold group shadow-none border-2  text-[#0f326e] hover:bg-[#0f326e] hover:text-white transition-all">
                <Link href="/login">
                  <Shield className="ml-2 h-5 w-5"/>
                  Admin Console
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-16 px-12 rounded-full text-lg font-bold group shadow-none border-2 border-[#0f326e] text-[#0f326e] hover:bg-[#0f326e] hover:text-white transition-all">
                <Link href="/login">
                  Member Hub
                  <Users className="ml-2 h-5 w-5"/>
                </Link>
              </Button>
            </div>

            {/* Features Section */}
            <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-80 max-w-6xl mx-auto pb-20">
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-primary h-12 w-12 rounded-full flex items-center justify-center text-primary-foreground">
                  <Zap className="h-6 w-6 fill-current"/>
                </div>
                <h3 className="text-xl font-bold font-headline uppercase">Fast Turnaround</h3>
                <p className="text-sm font-medium opacity-60 leading-relaxed">
                  Generate employment certificates and clearance documents in minutes, not days.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-primary h-12 w-12 rounded-full flex items-center justify-center text-primary-foreground">
                  <ShieldCheck className="h-6 w-6"/>
                </div>
                <h3 className="text-xl font-bold font-headline uppercase">Secure Access</h3>
                <p className="text-sm font-medium opacity-60 leading-relaxed">
                  Authenticated and encrypted document storage ensures your data remains private.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-primary h-12 w-12 rounded-full flex items-center justify-center text-primary-foreground">
                  <LayoutGrid className="h-6 w-6"/>
                </div>
                <h3 className="text-xl font-bold font-headline uppercase">Unified Hub</h3>
                <p className="text-sm font-medium opacity-60 leading-relaxed">
                  Manage all your requests and digital copies from a single, intuitive interface.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full bg-[#0f326e] text-white py-8 px-6 relative z-10 border-t border-white/10">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-primary h-6 w-6 rounded-full flex items-center justify-center text-primary-foreground font-headline font-bold text-xs">
              F
            </div>
            <span className="font-headline font-bold text-lg text-white">FastDocs</span>
          </div>
          <p className="text-sm font-medium opacity-80 italic text-center">
            Empowering the Davao workforce through digital transformation.
          </p>
          <nav className="flex gap-8">
            <Link className="text-sm font-bold hover:underline underline-offset-4 text-white/80 hover:text-white" href="/terms">Terms</Link>
            <Link className="text-sm font-bold hover:underline underline-offset-4 text-white/80 hover:text-white" href="/privacy">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
