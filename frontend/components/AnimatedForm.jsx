'use client';

export default function AnimatedForm({ onSubmit, children }) {
  // Simplified AnimatedForm using native HTML and Tailwind CSS focus states
  // We stripped out GSAP, AnimeJS, and Velocity to drastically speed up rendering
  return (
    <form onSubmit={onSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* We apply a generic wrapper class that expects children to be standard inputs.
          To get the 'animated' feel, inputs should use Tailwind:
          focus:scale-[1.02] transition-all focus:ring-2 focus:ring-blue-500 
      */}
      {children}
    </form>
  );
}