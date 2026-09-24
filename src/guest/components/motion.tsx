import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * Motion system for the guest site. One easing curve and three durations keep
 * movement consistent; everything collapses to an instant change when the
 * guest prefers reduced motion (MotionConfig reducedMotion="user" at the root).
 */
export const EASE = [0.22, 1, 0.36, 1] as const;
export const DUR = { fast: 0.18, base: 0.35, slow: 0.6 } as const;

/** Fades and lifts content into view once, as it scrolls in. */
export function Reveal({ children, delay = 0, y = 18, className, as = 'div' }: { children: ReactNode; delay?: number; y?: number; className?: string; as?: 'div' | 'section' | 'li' }) {
  const reduce = useReducedMotion();
  const Comp = motion[as] as typeof motion.div;
  if (reduce) return <Comp className={className}>{children}</Comp>;
  return (
    <Comp className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '0px 0px -60px 0px' }} transition={{ duration: DUR.slow, ease: EASE, delay }}>
      {children}
    </Comp>
  );
}

/** Staggered children for grids and rows (each child should be a StaggerItem). */
export function Stagger({ children, className, ...rest }: HTMLMotionProps<'ul'>) {
  return (
    <motion.ul className={className} initial="hidden" whileInView="show" viewport={{ once: true, margin: '0px 0px -40px 0px' }} variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }} {...rest}>
      {children}
    </motion.ul>
  );
}

export function StaggerItem({ children, className, ...rest }: HTMLMotionProps<'li'>) {
  return (
    <motion.li className={className} variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE } } }} {...rest}>
      {children}
    </motion.li>
  );
}

/** Route-level transition: a short cross-fade with a slight rise. */
export function PageTransition({ children, id }: { children: ReactNode; id: string }) {
  return (
    <motion.div key={id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DUR.base, ease: EASE }}>
      {children}
    </motion.div>
  );
}
