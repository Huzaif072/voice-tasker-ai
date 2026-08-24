"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CTASection() {
  return (
    <section className="px-6 py-20 lg:px-8 xl:py-24">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl px-8 py-16 text-center"
        style={{
          background: "linear-gradient(135deg, #5B21B6 0%, #7C3AED 50%, #6D28D9 100%)",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(56,189,248,0.2),transparent_60%)]" />
        <div className="relative">
          <h2 className="text-3xl font-bold text-white lg:text-4xl">
            Ready to plan your day by voice?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-violet-200">
            Join the early-access community and help shape a more natural way to manage work.
          </p>
          <Link href="/signup" className="mt-8 inline-block">
            <Button
              size="lg"
              className="bg-white text-violet-700 shadow-none hover:bg-violet-50"
            >
              Join early access
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
