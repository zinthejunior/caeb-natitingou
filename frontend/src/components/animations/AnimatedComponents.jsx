/**
 * CAEB Natitingou - Composants d'animation avancés
 * Effets "WOW" avec Framer Motion pour une expérience immersive
 */

import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useSpring, useInView, AnimatePresence } from "framer-motion";

// ============================================================
// ANIMATIONS DE TEXTE
// ============================================================

/**
 * Texte qui apparait lettre par lettre avec effet de vague
 */
export function WaveText({ text, className = "", delay = 0 }) {
  const letters = text.split("");
  
  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.03, delayChildren: delay },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
    },
  };

  return (
    <motion.span
      className={`inline-flex flex-wrap ${className}`}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {letters.map((letter, index) => (
        <motion.span key={index} variants={child} className="inline-block">
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </motion.span>
  );
}

/**
 * Texte avec effet de révélation par masque
 */
export function RevealText({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div
        initial={{ y: "100%" }}
        animate={isInView ? { y: 0 } : { y: "100%" }}
        transition={{
          duration: 0.8,
          delay,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * Texte avec effet de brillance dorée au survol
 */
export function ShimmerText({ children, className = "" }) {
  return (
    <motion.span
      className={`relative inline-block ${className}`}
      whileHover="hover"
    >
      <span className="relative z-10">{children}</span>
      <motion.span
        className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--library-accent)] to-transparent opacity-0"
        style={{ mixBlendMode: "overlay" }}
        variants={{
          hover: {
            opacity: [0, 0.6, 0],
            x: ["-100%", "100%"],
            transition: { duration: 0.6, ease: "easeInOut" },
          },
        }}
      />
    </motion.span>
  );
}

// ============================================================
// ANIMATIONS D'ENTRÉE
// ============================================================

/**
 * Entrée avec effet de zoom et rotation 3D
 */
export function ZoomRotateIn({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, scale: 0.8, rotateX: 15 }}
      animate={isInView ? { opacity: 1, scale: 1, rotateX: 0 } : {}}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{ perspective: 1000 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Entrée avec effet de glissement depuis les côtés
 */
export function SlideIn({ children, direction = "left", delay = 0, className = "" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const directions = {
    left: { x: -100, y: 0 },
    right: { x: 100, y: 0 },
    up: { x: 0, y: 100 },
    down: { x: 0, y: -100 },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, ...directions[direction] }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Entrée avec effet de rebond élastique
 */
export function BounceIn({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, scale: 0.3 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Entrée avec effet de blur et scale
 */
export function BlurIn({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, filter: "blur(20px)", scale: 1.1 }}
      animate={isInView ? { opacity: 1, filter: "blur(0px)", scale: 1 } : {}}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// EFFETS DE PARALLAXE
// ============================================================

/**
 * Parallaxe simple au scroll
 */
export function ParallaxSection({ children, speed = 0.5, className = "" }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [100 * speed, -100 * speed]);
  const smoothY = useSpring(y, { stiffness: 100, damping: 30 });

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div style={{ y: smoothY }}>{children}</motion.div>
    </div>
  );
}

/**
 * Image avec effet de parallaxe zoom
 */
export function ParallaxImage({ src, alt, className = "" }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1.2, 1]);
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.img
        src={src}
        alt={alt}
        style={{ scale, y }}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

// ============================================================
// CARTES ET ÉLÉMENTS INTERACTIFS
// ============================================================

/**
 * Carte avec effet de tilt 3D avancé
 */
export function TiltCard({ children, className = "" }) {
  const ref = useRef(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    setRotateX((-mouseY / rect.height) * 20);
    setRotateY((mouseX / rect.width) * 20);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: 1000,
        transformStyle: "preserve-3d",
      }}
      animate={{
        rotateX,
        rotateY,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Bouton avec effet de ripple et glow
 */
export function GlowButton({ children, onClick, className = "" }) {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newRipple = { x, y, id: Date.now() };
    setRipples((prev) => [...prev, newRipple]);
    
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
    
    onClick?.(e);
  };

  return (
    <motion.button
      className={`relative overflow-hidden ${className}`}
      onClick={handleClick}
      whileHover={{ scale: 1.02, boxShadow: "0 0 30px var(--library-accent-glow)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {children}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full bg-white/30 pointer-events-none"
            initial={{ width: 0, height: 0, x: ripple.x, y: ripple.y, opacity: 0.5 }}
            animate={{ width: 300, height: 300, x: ripple.x - 150, y: ripple.y - 150, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>
    </motion.button>
  );
}

// ============================================================
// ÉLÉMENTS DÉCORATIFS ANIMÉS
// ============================================================

/**
 * Cercles flottants animés pour arrière-plan
 */
export function FloatingOrbs({ count = 5, className = "" }) {
  const orbs = Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * 200 + 100,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 10 + 15,
    delay: Math.random() * 5,
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {orbs.map((orb) => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full bg-[var(--library-accent)] opacity-10 blur-3xl"
          style={{
            width: orb.size,
            height: orb.size,
            left: `${orb.x}%`,
            top: `${orb.y}%`,
          }}
          animate={{
            x: [0, 50, -30, 0],
            y: [0, -40, 30, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{
            duration: orb.duration,
            delay: orb.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/**
 * Particules scintillantes
 */
export function SparkleParticles({ count = 20, className = "" }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 3 + 2,
    delay: Math.random() * 2,
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-[var(--library-accent)]"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/**
 * Grille animée futuriste
 */
export function AnimatedGrid({ className = "" }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(var(--library-accent) 1px, transparent 1px),
            linear-gradient(90deg, var(--library-accent) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
          opacity: 0.05,
        }}
        animate={{
          backgroundPosition: ["0px 0px", "50px 50px"],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}

// ============================================================
// CONTENEUR D'ANIMATION AU SCROLL
// ============================================================

/**
 * Conteneur qui anime ses enfants séquentiellement au scroll
 */
export function StaggerContainer({ children, className = "", staggerDelay = 0.1 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
    >
      {Array.isArray(children)
        ? children.map((child, index) => (
            <motion.div key={index} variants={itemVariants}>
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  );
}

/**
 * Compteur animé
 */
export function AnimatedCounter({ value, duration = 2, className = "" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    
    let start = 0;
    const end = parseInt(value.replace(/\D/g, ""), 10);
    const suffix = value.replace(/[\d,]/g, "");
    const increment = end / (duration * 60);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [isInView, value, duration]);

  const suffix = value.replace(/[\d,]/g, "");

  return (
    <span ref={ref} className={className}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

/**
 * Indicateur de progression au scroll
 */
export function ScrollProgress({ className = "" }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  return (
    <motion.div
      className={`fixed top-0 left-0 right-0 h-1 bg-[var(--library-accent)] origin-left z-50 ${className}`}
      style={{ scaleX }}
    />
  );
}

/**
 * Curseur personnalisé animé
 */
export function CustomCursor() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e) => {
      if (e.target.tagName === "BUTTON" || e.target.tagName === "A" || e.target.closest("button") || e.target.closest("a")) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  return (
    <>
      <motion.div
        className="fixed w-4 h-4 rounded-full bg-[var(--library-accent)] mix-blend-difference pointer-events-none z-[9999]"
        animate={{
          x: mousePosition.x - 8,
          y: mousePosition.y - 8,
          scale: isHovering ? 2.5 : 1,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
      />
      <motion.div
        className="fixed w-8 h-8 rounded-full border-2 border-[var(--library-accent)] pointer-events-none z-[9998]"
        animate={{
          x: mousePosition.x - 16,
          y: mousePosition.y - 16,
          scale: isHovering ? 1.5 : 1,
        }}
        transition={{ type: "spring", stiffness: 150, damping: 15 }}
      />
    </>
  );
}

// ============================================================
// LOADER ANIMÉ
// ============================================================

/**
 * Loader avec effet de livre qui s'ouvre
 */
export function BookLoader({ className = "" }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <motion.div
        className="relative w-16 h-20"
        style={{ perspective: 400 }}
      >
        {/* Page gauche */}
        <motion.div
          className="absolute left-0 w-8 h-full bg-[var(--library-surface)] rounded-l-md border-l-2 border-y-2 border-[var(--library-accent)]"
          style={{ transformOrigin: "right center" }}
          animate={{
            rotateY: [0, -180, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {/* Page droite */}
        <div className="absolute right-0 w-8 h-full bg-[var(--library-surface)] rounded-r-md border-r-2 border-y-2 border-[var(--library-accent)]" />
        {/* Reliure */}
        <div className="absolute left-1/2 -translate-x-1/2 w-1 h-full bg-[var(--library-accent)]" />
      </motion.div>
    </div>
  );
}
