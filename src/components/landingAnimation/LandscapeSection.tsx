import { motion } from "framer-motion";
import Image from "next/image";

export default function LandscapeSection() {

  return <div className="flex flex-col w-screen min-h-max items-center justify-center">
    <div className="relative max-w-[1000px] w-1/2 top-[-20px] min-w-[300px] lg:w-1/3 font-semibold text-[16px] text-brand-purple-dark pb-5">
      <motion.div initial={{ filter: "blur(8px)" }}
                  whileInView={{ filter: "blur(0px)" }}
                  viewport={{ margin: "-180px", once: true }}
                  style={{ willChange: "filter" }}
                  className="pb-2 lg:pb-5">
        Picture yourself navigating a terrain filled with hills and valleys.
        This is the landscape of the people you are connected to.
        Each step you take represents a relational action - something you do to connect with your people.
      </motion.div>
      <motion.div initial={{ filter: "blur(16px)" }}
                  whileInView={{ filter: "blur(0px)" }}
                  viewport={{ margin: "-180px", once: true }}
                  style={{ willChange: "filter" }}
                  className="py-2 lg:py-5 will">
        But how do you get there?
        It’s daunting to decide which steps to take.
      </motion.div>
      <motion.div initial={{ filter: "blur(16px)" }}
                  whileInView={{ filter: "blur(0px)" }}
                  viewport={{ margin: "-180px", once: true }}
                  style={{ willChange: "filter" }}
                  className="py-2 lg:py-5 will">
        Hearth is your guide across this landscape, offering you paths to the highest points.
      </motion.div>
    </div>

    <motion.div initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 2, duration: 2 } }}
                whileInView={{ opacity: 1 }}
                viewport={{ margin: "-180px", once: true }}
                style={{ willChange: 'filter' }}
                className="relative w-1/2 min-w-[300px] lg:w-1/3 max-h-[560px] max-w-[1024px]
                  border-2 border-white rounded-2xl will">

      <motion.div initial={{ filter: 'blur(16px)' }}
                  whileInView={{ filter: 'blur(0px)' }}
                  viewport={{ margin: '-180px', once: true }}
                  style={{ willChange: 'filter'}}
                  className="relative w-full h-full bg-white rounded-2xl overflow-hidden will">
        <div className="absolute w-full h-full whiteFeatherMaskMedium"></div>
        <div className="absolute w-full h-full whiteFeatherMaskSmall"></div>
        <Image src="/product/hearth_landscape.webp"
               alt="An abstract of a hilly landscape"
               width={1024}
               height={667.4} />
      </motion.div>
    </motion.div>
  </div>
}
