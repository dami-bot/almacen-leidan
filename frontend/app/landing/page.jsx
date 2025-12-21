"use client";

import React, { useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function TronLanding() {
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const cardsRef = useRef(null);

  const heroInView = useInView(leftRef, { amount: 0.25 });
  const rightInView = useInView(rightRef, { amount: 0.25 });
  const cardsInView = useInView(cardsRef, { amount: 0.15 });

  // GSAP scroll animations
  useEffect(() => {
    const sections = gsap.utils.toArray("section, main");

    sections.forEach((sec, i) => {
      gsap.fromTo(
        sec,
        { opacity: 0, x: i % 2 === 0 ? -150 : 150 },
        {
          opacity: 1,
          x: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sec,
            start: "top 85%",
            end: "bottom 60%",
            toggleActions: "play none none reverse",
          },
        }
      );
    });
  }, []);

  const sideVariant = (side = "left") => ({
    hidden: { opacity: 0, x: side === "left" ? -120 : 120, scale: 0.98 },
    visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.8, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.5 } },
  });

  const fadeVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
  };

  return (
    <div className="min-h-screen relative bg-black text-white overflow-hidden font-sans">
      {/* Neon grid background */}
      <div className="absolute inset-0 -z-10 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-b from-[#00121a] via-black to-[#000814]" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full bg-[conic-gradient(at_50%_50%,rgba(0,255,255,0.02),transparent_10%)]" />
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,#00f0ff05_0px,#00f0ff05_1px,#0000_1px,#0000_40px)] animate-[gridMove_30s_linear_infinite]" />
        </div>
      </div>

      {/* 🔹 Fondo TRON con rejilla en perspectiva + pulso */}
      <div className="absolute inset-0 -z-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(#00ffff22 1px, transparent 1px), linear-gradient(90deg, #00ffff22 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            transform: "perspective(600px) rotateX(65deg)",
            transformOrigin: "center top",
            animation: "gridMove 20s linear infinite",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#000c14] via-black to-[#00131a] opacity-80" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full bg-[#00f0ff33] opacity-20 animate-pulseNeon"></div>
        </div>
      </div>

      {/* 🔸 Contenedor principal */}
      <div className="relative z-10">
        {/* HEADER */}
        <header className="w-full py-6 px-6 sm:px-12 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg border border-[#00f0ff] bg-gradient-to-br from-[#001b2b]/40 to-transparent flex items-center justify-center shadow-[0_0_20px_#00f0ff33]">
              <div className="w-6 h-6 bg-[linear-gradient(135deg,#00f0ff,#00b3ff)] rounded-sm" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-widest">E-TRON STORE</h1>
              <p className="text-xs opacity-70">Futuristic e-commerce</p>
            </div>
          </div>
          <nav className="hidden md:flex gap-6 items-center text-sm opacity-90">
            <a className="px-3 py-2 rounded-md hover:opacity-100 opacity-80">Productos</a>
            <a className="px-3 py-2 rounded-md hover:opacity-100 opacity-80">Colecciones</a>
            <a className="px-3 py-2 rounded-md hover:opacity-100 opacity-80">Contacto</a>
            <button className="px-4 py-2 rounded-md border border-[#00f0ff] hover:shadow-[0_0_20px_#00f0ff66]">Entrar</button>
          </nav>
        </header>

        {/* HERO */}
        <section className="px-6 sm:px-12 lg:px-24 pt-12 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <motion.div
              ref={leftRef}
              initial="hidden"
              animate={heroInView ? "visible" : "hidden"}
              variants={sideVariant("left")}
              className="space-y-6 max-w-xl"
            >
              <div className="inline-block px-3 py-1 rounded-md bg-black/30 border border-[#00f0ff55] backdrop-blur-md">
                <span className="text-xs uppercase tracking-wider">Nuevo lanzamiento</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight">
                Productos con estética <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] to-[#7cf5ff]">cyber-neón</span>.
              </h2>
              <p className="text-lg opacity-80">
                Experiencia visual inspirada en TRON.  
              </p>
              <div className="flex gap-4 items-center">
                <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#00e5ff] to-[#00a3ff] text-black font-semibold shadow-[0_10px_30px_#00a3ff33]">Comprar ahora</button>
                <a className="text-sm opacity-80 hover:underline">Ver catálogo</a>
              </div>
              <div className="mt-6 flex gap-4">
                <div className="text-xs opacity-80">Envío a todo el país</div>
                <div className="text-xs opacity-80">Soporte 24/7</div>
              </div>
            </motion.div>

            {/* Visual / mockup */}
            <motion.div
              ref={rightRef}
              initial="hidden"
              animate={rightInView ? "visible" : "hidden"}
              variants={sideVariant("right")}
              className="flex items-center justify-center relative"
            >
              <div className="w-full max-w-md h-72 sm:h-96 rounded-2xl border border-[#00f0ff55] overflow-hidden shadow-[0_20px_60px_#00f0ff22] bg-gradient-to-br from-[#00121a]/70 to-transparent relative">
                <img src="/cupcake.jpg" alt="Producto" className="w-full h-full object-cover opacity-95" style={{ mixBlendMode: 'screen' }} />
                {/* overlay líneas neon */}
                <div className="absolute inset-0 pointer-events-none">
                  <svg className="w-full h-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="g1" x1="0" x2="1">
                        <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="#7cf5ff" stopOpacity="0.06" />
                      </linearGradient>
                    </defs>
                    <rect x="0" y="0" width="100%" height="100%" fill="url(#g1)" />
                  </svg>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Productos destacados */}
        <main ref={cardsRef} className="px-6 sm:px-12 lg:px-24 mt-16 grid gap-8">
          <h3 className="text-2xl font-bold mb-6">Productos destacados</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1,2,3,4,5,6].map((n,i)=> {
              const side = i % 2 === 0 ? "left" : "right";
              return (
                <motion.article
                  key={n}
                  initial="hidden"
                  animate={cardsInView ? "visible" : "hidden"}
                  variants={sideVariant(side)}
                  className="relative rounded-xl border border-[#00f0ff33] bg-black/30 p-4 overflow-hidden hover:shadow-[0_0_20px_#00f0ff66] hover:scale-105 transition-all duration-300"
                >
                  <div className="absolute -inset-1 blur-[30px] opacity-30" />
                  <div className="flex items-center gap-4">
                    <div className="w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden border border-[#00f0ff55]">
                      <img src="/cupcake.jpg" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">Producto {n}</h4>
                      <p className="text-sm opacity-70">Descripción corta y contundente con estilo neon.</p>
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          <div className="text-xs opacity-60">desde</div>
                          <div className="font-bold">${(49+n*10).toFixed(2)}</div>
                        </div>
                        <button className="px-3 py-2 rounded-md border border-[#00f0ff]">Agregar</button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </main>

        {/* CTA */}
        <section className="px-6 sm:px-12 lg:px-24 mt-20 mb-14">
          <motion.div initial="hidden" whileInView="visible" variants={fadeVariant} className="rounded-2xl p-8 bg-gradient-to-r from-[#00121a]/60 to-[#000000]/40 border border-[#00f0ff33] flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold">Listo para llevar tu setup al futuro?</h3>
              <p className="opacity-80">Suscribite y recibí 10% OFF en tu primera compra + acceso anticipado a drops.</p>
            </div>
            <div className="flex gap-4">
              <input placeholder="Tu email" className="px-4 py-3 rounded-md bg-black/50 border border-[#00f0ff22] outline-none" />
              <button className="px-6 py-3 rounded-md bg-gradient-to-r from-[#00e5ff] to-[#00a3ff] text-black font-semibold">Suscribirse</button>
            </div>
          </motion.div>
        </section>

        {/* FOOTER */}
        <footer className="px-6 sm:px-12 lg:px-24 py-8 border-t border-[#00f0ff11]">
          <div className="flex flex-col md:flex-row md:justify-between gap-6">
            <div>
              <div className="font-bold">E-TRON STORE</div>
              <div className="text-sm opacity-80">© {new Date().getFullYear()} - Diseño inspirado en estética cyber-neón.</div>
            </div>
            <div className="flex gap-6 items-center opacity-80">
              <a>Política</a>
              <a>Soporte</a>
              <a>Contacto</a>
            </div>
          </div>
        </footer>

      </div> {/* cierre contenedor principal */}

      {/* STYLES */}
      <style jsx global>{`
        @keyframes gridMove { from { background-position: 0 0 } to { background-position: 2000px 0 } }
        @keyframes pulseNeon { 0% { opacity: 0.15; } 50% { opacity: 0.35; } 100% { opacity: 0.15; } }
        .animate-pulseNeon { animation: pulseNeon 3s ease-in-out infinite; }

        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        .font-sans { font-family: 'Orbitron', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; }
      `}</style>
    </div>
  );
}
