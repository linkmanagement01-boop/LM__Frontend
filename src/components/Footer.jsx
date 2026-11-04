import { Facebook, Twitter, Linkedin, Youtube, Instagram, ArrowRight } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative bg-white text-slate-800 border-t border-slate-200 pt-20 overflow-hidden font-sans">

      {/* Background Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      {/* Glow Effect */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#7C3AED]/5 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="container mx-auto px-6 relative z-10 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 lg:gap-24 mb-16">

          {/* Column 1: About Us */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">About Us</h3>
              <div className="h-1 w-12 bg-[#7C3AED] rounded-full"></div>
            </div>

            <p className="text-slate-600 leading-relaxed text-[15px] font-medium max-w-md">
              Link Management is a Publisher Aggregator Platform which connects publishers and bloggers with Advertisers (Brands, Agencies and Resellers). The Platform is intended to help Publishers and Bloggers monetize their blogs/websites and open up a stable revenue stream for themselves.
            </p>
          </div>

          {/* Column 2: Useful Links */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Useful Links</h3>
              <div className="h-1 w-12 bg-[#7C3AED] rounded-full"></div>
            </div>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: "Home", href: "/" },
                { name: "About Us", href: "#about" },
                { name: "Careers", href: "#" },
                { name: "FAQs", href: "#" },
                { name: "Videos", href: "#" },
                { name: "Contact", href: "#" },
                { name: "Privacy Policy", href: "#" },
                { name: "Login", href: "/login" },
              ].map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="group flex items-center gap-2 text-slate-500 font-medium hover:text-[#7C3AED] transition-all duration-300 text-[15px]"
                  >
                    <span className="w-1.5 h-1.5 bg-[#7C3AED] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Follow Us */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Follow Us</h3>
              <div className="h-1 w-12 bg-[#7C3AED] rounded-full"></div>
            </div>

            <div className="space-y-4">
              {[
                { name: "Twitter", icon: Twitter },
                { name: "Facebook", icon: Facebook },
                { name: "LinkedIn", icon: Linkedin },
                { name: "YouTube", icon: Youtube },
                { name: "Instagram", icon: Instagram },
              ].map((social) => (
                <a
                  key={social.name}
                  href="#"
                  className="flex items-center gap-4 text-slate-500 font-medium hover:text-[#7C3AED] transition-colors duration-300 group"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center group-hover:border-[#7C3AED]/30 group-hover:bg-[#7C3AED]/5 transition-all shadow-sm">
                    <social.icon className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <span className="text-[15px] font-semibold">{social.name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-slate-200 pt-8 pb-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 font-medium text-sm">
            &copy; {new Date().getFullYear()} linkmanagement.net, A Venture of <a href="https://rankmeup.in/" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:text-[#5B21B6] transition-colors">RankMeUP</a> Services. All Rights Reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-slate-500 font-medium hover:text-[#7C3AED] text-sm transition-colors">Terms of Service</a>
            <a href="#" className="text-slate-500 font-medium hover:text-[#7C3AED] text-sm transition-colors">Privacy Policy</a>
          </div>
        </div>
      </div>

    </footer>
  );
}
