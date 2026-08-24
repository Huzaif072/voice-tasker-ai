"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Mic, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#use-cases", label: "Use Cases" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const sections = navLinks
      .map((link) => document.getElementById(link.href.slice(1)))
      .filter((section): section is HTMLElement => Boolean(section));

    if (sections.length === 0) return;

    let frame = 0;
    const updateActiveSection = () => {
      const activationLine = window.scrollY + 112;
      let current: string | null = null;

      for (const section of sections) {
        const sectionTop = section.getBoundingClientRect().top + window.scrollY;
        if (sectionTop <= activationLine) current = `#${section.id}`;
      }

      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) {
        current = `#${sections[sections.length - 1].id}`;
      }

      setActiveSection(current);
    };

    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateActiveSection();
      });
    };

    updateActiveSection();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  function closeMenu() {
    setOpen(false);
  }

  function linkClass(href: string, mobile = false) {
    const active = activeSection === href;
    if (mobile) {
      return active
        ? "rounded-lg bg-violet-500/10 px-3 py-3 text-sm text-violet-300 transition-colors hover:bg-violet-500/15 hover:text-white"
        : "rounded-lg px-3 py-3 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white";
    }

    return active
      ? "relative text-sm text-violet-300 transition-colors after:absolute after:-bottom-3 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-violet-400"
      : "text-sm text-slate-400 transition-colors hover:text-slate-200";
  }

  return (
    <nav aria-label="Primary navigation" className="glass-nav fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2" onClick={closeMenu}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600">
            <Mic className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-100">VoiceTasker AI</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={activeSection === link.href ? "location" : undefined}
              className={linkClass(link.href)}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-slate-300 transition-colors hover:text-white sm:block"
          >
            Log in
          </Link>
          <Link href="/signup" className="hidden sm:block">
            <Button size="sm" className="rounded-full">
              Try Free
            </Button>
          </Link>
          <button
            type="button"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
            className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white md:hidden"
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                key={open ? "close" : "menu"}
                initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="block"
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden border-t border-slate-800/80 bg-slate-950/95 backdrop-blur md:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4">
              {navLinks.map((link, index) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  aria-current={activeSection === link.href ? "location" : undefined}
                  onClick={closeMenu}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.18 }}
                  className={linkClass(link.href, true)}
                >
                  {link.label}
                </motion.a>
              ))}
              <Link
                href="/login"
                onClick={closeMenu}
                className="mt-2 rounded-lg px-3 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white sm:hidden"
              >
                Log in
              </Link>
              <Link href="/signup" onClick={closeMenu} className="mt-2 sm:hidden">
                <Button size="sm" className="w-full rounded-full">
                  Try Free
                </Button>
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </nav>
  );
}
