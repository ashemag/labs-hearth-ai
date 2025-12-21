import { motion } from "framer-motion";
import Image from "next/image";

export default function InnKeeperSection() {
  return (
    <div className="pb-20 flex flex-col w-screen min-h-max items-center justify-center">
      <div className="max-w-[1000px] w-1/2 min-w-[300px] lg:w-1/3 font-semibold text-[16px] text-brand-purple-dark py-10">
        <motion.div
          initial={{ filter: "blur(16px)" }}
          whileInView={{ filter: "blur(0px)" }}
          viewport={{ margin: "-180px", once: true }}
          style={{ willChange: "filter" }}
          className="py-2 lg:py-5 will"
        >
          But this is a lifelong journey - what does <i>home</i> look like along the way?
        </motion.div>
        <motion.div
          initial={{ filter: "blur(16px)" }}
          whileInView={{ filter: "blur(0px)" }}
          viewport={{ margin: "-180px", once: true }}
          style={{ willChange: "filter" }}
          className="py-2 lg:py-5"
        >
          Imagine stepping into a charming inn, where every room is filled with your friends, coworkers, customers,
          mentors, family, and more: all the people in your life - thoughtfully arranged to resonate with you today.
        </motion.div>
        <motion.div
          initial={{ filter: "blur(16px)" }}
          whileInView={{ filter: "blur(0px)" }}
          viewport={{ margin: "-180px", once: true }}
          style={{ willChange: "filter" }}
          className="py-2 lg:py-5"
        >
          The inn is part of a greater space, and you receive invites from teammates to shared rooms. At the heart of
          your inn is the innkeeper, stoking a fire to keep everyone warm.
        </motion.div>
        <motion.div
          initial={{ filter: "blur(16px)" }}
          whileInView={{ filter: "blur(0px)" }}
          viewport={{ margin: "-180px", once: true }}
          style={{ willChange: "filter" }}
          className="py-2 lg:py-5"
        >
          {`As you enter, the innkeeper greets you with a smile, “Welcome home, boss! Here’s the latest from today—how may
          I be of service?”`}
        </motion.div>
        <motion.div
          initial={{ filter: "blur(16px)" }}
          whileInView={{ filter: "blur(0px)" }}
          viewport={{ margin: "-180px", once: true }}
          style={{ willChange: "filter" }}
          className="py-2 lg:py-5"
        >
          {`Meet Hearth: your guide and your innkeeper. Let’s begin 🔥`}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 2, duration: 2 } }}
        whileInView={{ opacity: 1 }}
        style={{ willChange: "filter" }}
        viewport={{ margin: "-20px", once: true }}
        className="relative w-1/2 min-w-[300px] lg:w-1/3 max-h-[560px] max-w-[1024px] rounded-2xl"
      >
        <motion.div
          initial={{ filter: "blur(16px)" }}
          whileInView={{ filter: "blur(0px)" }}
          viewport={{ margin: "-180px", once: true }}
          style={{ willChange: "filter" }}
          className="relative w-full h-full bg-white rounded-2xl blur-lg overflow-hidden"
        >
          <div className="absolute w-full h-full whiteFeatherMask"></div>
          <div className="absolute w-full h-full whiteFeatherMaskSmall"></div>
          <Image src="/product/hearth_inn.webp" alt="A Sketch of an Inn" width={1024} height={667.4} />
        </motion.div>
      </motion.div>
    </div>
  );
}
