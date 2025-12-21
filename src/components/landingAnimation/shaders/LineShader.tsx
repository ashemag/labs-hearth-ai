import { shaderMaterial } from "@react-three/drei";
import { Color, MeshStandardMaterial, Texture, Vector2, Vector3 } from "three";
import vertex from "@/components/landingAnimation/shaders/lineVert.glsl";
import fragment from "@/components/landingAnimation/shaders/linesFrag.glsl";
import { extend, MaterialNode, MaterialProps, useFrame } from "@react-three/fiber";
import { forwardRef, useImperativeHandle, useRef } from "react";


const LineShaderImp = shaderMaterial({
  uTime: 0,
  uMouse: new Vector2(0, 0),
  uSize: new Vector2(1, 1),
  uTexture: new Texture(),
  uRayOrigin: new Vector3(0, 0, 0),
  uColor: new Color(0.125, 0.0, 0.5),
  uResolution: typeof window !== 'undefined' ? new Vector2(window.innerWidth, window.innerHeight) : new Vector2(1, 1),
}, vertex, fragment, (imp) => { if (imp) {
  //imp.wireframe = true
} })

extend({ LineShaderImp })

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      lineShaderImp: MaterialNode<never, typeof MeshStandardMaterial>
    }
  }
}

export type LineShaderUniforms = {
  uTime?: number
  uMouse?: Vector2
  uSize?: Vector2
  uTexture?: Texture
  uRayOrigin?: Vector3
  uResolution?: Vector2
  uColor?: Color
}

type Props = LineShaderUniforms & MaterialProps

const LineShader = forwardRef<LineShaderUniforms, Props>(({...props}: Props, ref) => {
  const localRef = useRef<Props>(null!)
  useImperativeHandle(ref, () => localRef.current)
  useFrame((state, delta) => {
    localRef.current.uTime! += delta
    localRef.current.uMouse = state.pointer
    localRef.current.uRayOrigin = state.camera.position
  })
  /* @ts-expect-error/hotfix*/
  return <lineShaderImp key={LineShaderImp.key} ref={localRef} attach="material" {...props} />
})
LineShader.displayName = 'LineShader'
export default LineShader;
