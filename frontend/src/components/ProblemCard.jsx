import { motion } from "framer-motion";

/**
 * کارت نمایش سؤال ریاضی
 * @param {{ text: string }} props
 */
export default function ProblemCard({ text }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="mx-auto mt-6 p-6 bg-white/80 backdrop-blur rounded-2xl shadow-xl text-4xl font-bold text-center text-slate-800"
    >
      {text}
    </motion.div>
  );
}
