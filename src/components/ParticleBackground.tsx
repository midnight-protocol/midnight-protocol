
import React, { useEffect, useRef, memo } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  char: string;
}

const ParticleBackgroundComponent = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles
    const chars = ['0', '1', '|', '-', '/', '\\', '+', '*'];
    const particleCount = Math.min(50, Math.floor(window.innerWidth / 40));
    
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: Math.random() * 0.5 + 0.1,
      opacity: Math.random() * 0.3 + 0.1,
      char: chars[Math.floor(Math.random() * chars.length)]
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.fillStyle = '#22D3EE';

      particlesRef.current.forEach(particle => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around screen
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y > canvas.height) {
          particle.y = 0;
          particle.x = Math.random() * canvas.width;
        }

        // Draw particle
        ctx.globalAlpha = particle.opacity;
        ctx.fillText(particle.char, particle.x, particle.y);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none opacity-20 z-0"
      style={{ background: 'transparent' }}
    />
  );
};

export const ParticleBackground = memo(ParticleBackgroundComponent);
