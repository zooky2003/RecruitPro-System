export default function GlassCard({ children, className }) {
  // වෙනම className එකක් දුන්නොත් ඒක ගන්නවා, නැත්නම් default විදිහට 'max-w-md p-10' ගන්නවා (Login page එකට ගැලපෙන්න).
  const layoutClasses = className ? className : "max-w-md p-10";

  return (
    <div className={`w-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2rem] shadow-2xl z-10 ${layoutClasses}`}>
      {children}
    </div>
  );
}