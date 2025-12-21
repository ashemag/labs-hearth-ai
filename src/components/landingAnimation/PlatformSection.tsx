import { motion } from "framer-motion";
import { useRive } from '@rive-app/react-canvas';

export default function PlatformSection() {
  const colorString =
    `${'#a7715f'}, 10deg, 
    ${'#ffffff'}, 150deg, 
    ${'#a7715f'}, 180deg, 
    ${'#c19b8f'}, 210deg, 
    ${'#ffffff'}, 340deg, 
    ${'#c19b8f'})`

  return <div style={{ perspective: '1000px' }}
              className="py-[10vh] flex flex-col w-screen
                        lg:h-screen items-center justify-center text-4xl text-brand-purple-dark">
    <motion.div initial={{ background: 'conic-gradient(from 0.0turn at 50% 50%, ' + colorString }}
                whileInView={{ background: 'conic-gradient(from 1.0turn at 50% 50%,' + colorString }}
                transition={{ repeat: Infinity, repeatType: 'loop', duration: 10, ease: 'linear' }}
                style={{ willChange: 'filter', transform: 'translate3d(0, 0, -50px)' }}
                className="absolute w-[90vw] h-[60vw] lg:h-[80vh] blur-3xl opacity-50" />
    <EdgeFlare />
  </div>
}

function EdgeFlare() {
  const { RiveComponent } = useRive({
    src: "/product/product_image_animation.riv",
    autoplay: true,
    stateMachines: "Platform Glow and Scale",
  });

  return <motion.div initial={{
                       transform: 'rotateX(30deg) scale(0.9)',
                       perspective: '200px'
                     }}
                     whileInView={{
                       transform:  'rotateX(0deg) scale(1)',
                       transition: { duration: 1.0, ease: 'easeInOut'}
                     }}
                     viewport={{ margin: "-180px", once: true }}
                     style={{ willChange: 'transform' }}
                     className="w-[90vw] h-[60vw] lg:w-[80vw] lg:h-[51.5vw]
                        max-h-[644.2px] max-w-[1024px] rounded-2xl drop-shadow-2xl">
    <RiveComponent />
  </motion.div>
}

