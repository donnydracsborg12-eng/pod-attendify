import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "soft" | "glass" | "neon";
}

export function AnimatedCard({ 
  children, 
  className, 
  delay = 0, 
  variant = "soft" 
}: AnimatedCardProps) {
  const variants = {
    soft: "card-soft",
    glass: "card-glass",
    neon: "card-glass animate-glow"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5, 
        delay,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      whileHover={{ 
        scale: 1.02,
        y: -5,
        transition: { duration: 0.2 }
      }}
      className={cn(variants[variant], className)}
    >
      {children}
    </motion.div>
  );
}

interface StaggeredContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggeredContainer({ 
  children, 
  className,
  staggerDelay = 0.1 
}: StaggeredContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface FloatingElementProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
}

export function FloatingElement({ 
  children, 
  className,
  intensity = 1 
}: FloatingElementProps) {
  return (
    <motion.div
      animate={{
        y: [0, -10 * intensity, 0],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface GlowButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "neon";
  className?: string;
  disabled?: boolean;
}

export function GlowButton({ 
  children, 
  onClick, 
  variant = "primary",
  className,
  disabled = false
}: GlowButtonProps) {
  const variants = {
    primary: "btn-primary",
    secondary: "btn-neon",
    neon: "btn-neon animate-glow"
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={cn(variants[variant], className)}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.button>
  );
}

interface PulseIconProps {
  children: ReactNode;
  className?: string;
  pulseColor?: string;
}

export function PulseIcon({ 
  children, 
  className,
  pulseColor = "primary"
}: PulseIconProps) {
  return (
    <motion.div
      className={cn("relative", className)}
      animate={{
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.3, 0, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background: `radial-gradient(circle, hsl(var(--${pulseColor}) / 0.3) 0%, transparent 70%)`
        }}
      />
    </motion.div>
  );
}
