import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import particleVert from './shaders/particleVert.glsl'
import {
  Color,
  DynamicDrawUsage, Group, InstancedMesh,
  LineSegments, Mesh, MeshPhysicalMaterial, NoBlending,
  PerspectiveCamera, ShaderMaterial,
  Spherical,
  Vector3
} from "three";
import { Instance, Instances } from "@react-three/drei";
import CustomShaderMaterial from "three-custom-shader-material"
import LineShader from "@/components/landingAnimation/shaders/LineShader";

const NetworkGraphComponent = () => {

  return (
    <div className="absolute inset-0 -z-10">
      <div className="absolute w-full min-h-full bg-gradient-to-t from-white from-0% to-transparent to-10% z-10"></div>
      <Canvas className="min-h-full">
        <directionalLight position={[1, 2, 3]} intensity={15.5} />
        <Scene />
      </Canvas>
    </div>
  );
};

export default NetworkGraphComponent;

type ParticleMaterial = {
  uniforms: {
    uRayOrigin: { value: Vector3 }
  }
}

function Scene() {

  const size = useThree((state) => state.size);
  const [small, setSmall] = useState(size.width < 1025);
  const count = useRef(500);
  const connDist = useRef(150);
  const maxConnections = useRef(20);
  const groupRef = useRef<Group>(null!);
  const segsRef = useRef<LineSegments>(null!);
  const partShaderRef = useRef<ShaderMaterial & ParticleMaterial>(null!);
  const camera = useThree((state) => state.camera as PerspectiveCamera);
  const cameraMoveTo = useRef(new Vector3(
    small ? 0 : -300, small ? -275 : 0, small ? 1900 : 1300)
  );
  const resetCamera = useCallback(() => {
    camera.position.set(0, 0, 1000);
    camera.far = 700;
    camera.fov = 15;
    camera.near = 1;
    camera.updateProjectionMatrix();
    moveFinished.current = false;
    fadeFinished.current = false;
  }, [camera]);
  const moveLerp = useRef(0.000001);
  const moveFinished = useRef(false);
  const fadeFinished = useRef(false);
  const instancesRef = useRef<InstancedMesh>(null!);
  const instanceRefs = useRef<Mesh[]>([]);
  const instances = useRef<React.ReactNode[]>([]);
  const brandColors = useRef(["#744f42", "#a7715f", "#c19b8f", "#d3b8af", "#ede2df"]);

  const [
    particleData,
    positions,
    segments,
    colors
  ] = useMemo(() => {
    const data = [];
    const poses = new Float32Array(count.current * 3)
    const segs = new Float32Array(count.current * count.current * 3)
    const cols = new Float32Array(count.current * count.current * 3)
    for (let i = 0; i < count.current; i++) {
      const spherical = new Spherical(
        -400 + Math.random() * 800,
        Math.random() * Math.PI,
        2 * Math.PI * Math.random()
      )
      const pos = new Vector3().setFromSpherical(spherical);
      const velocity = new Vector3(
        -1 + Math.random() * 2,
        -1 + Math.random() * 2,
        -1 + Math.random() * 2
      );
      data.push({velocity, numConnections: 0});
      instances.current.push(
        <Instance
          ref={(ref) => instanceRefs.current[i] = ref as Mesh}
          key={`Instance-${i}`}
          color={brandColors.current[i % 5]}
          rotation={[Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI]}
          position={pos}
        />)
      poses[i * 3] = pos.x;
      poses[i * 3 + 1] = pos.y;
      poses[i * 3 + 2] = pos.z;
    }
    return [data, poses, segs, cols];
  }, []);

  useEffect(() => {
    resetCamera();
  }, [resetCamera]);

  useEffect(() => {
    let change = false;
    if (small && size.width > 1024) {
      setSmall(false);
      change = true;
      cameraMoveTo.current.x = -300;
      cameraMoveTo.current.y = 0;
      cameraMoveTo.current.z = 1300;
    } else if (!small && size.width < 1025) {
      setSmall(true);
      change = true;
      cameraMoveTo.current.x = 0;
      cameraMoveTo.current.y = -275;
      cameraMoveTo.current.z = 1900;
    }
    if (change) {
      resetCamera();
    }
  }, [resetCamera, small, size.width]);

  useFrame(() => {
    let vertexpos = 0;
    let colorpos = 0;
    let numConnected = 0;

    for (let a = 0; a < count.current; a++) particleData[a].numConnections = 0;

    for (let i = 0; i < count.current; i++) {

      const seekerData = particleData[i];
      const seeker = new Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);

      positions[i * 3] += seekerData.velocity.x;
      positions[i * 3 + 1] += seekerData.velocity.y;
      positions[i * 3 + 2] += seekerData.velocity.z;

      instanceRefs.current[i].position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])

      if (seeker.length() > 400) {
        const normal = seeker.clone().normalize();
        seekerData.velocity = seekerData.velocity.clone()
          .sub(normal.multiplyScalar(normal.dot(seekerData.velocity)));
      }

      for (let j = i + 1; j < count.current; j++) {

        const testData = particleData[j];
        if (testData.numConnections >= maxConnections.current
          || seekerData.numConnections >= maxConnections.current) continue;
        const test = new Vector3(positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]);
        const dist = seeker.distanceTo(test);

        if (dist < connDist.current) {
          seekerData.numConnections++;
          testData.numConnections++;
          const alpha = 1 - (dist / connDist.current) * 0.625 + .375;
          segments[vertexpos++] = positions[i * 3];
          segments[vertexpos++] = positions[i * 3 + 1];
          segments[vertexpos++] = positions[i * 3 + 2];
          segments[vertexpos++] = positions[j * 3];
          segments[vertexpos++] = positions[j * 3 + 1];
          segments[vertexpos++] = positions[j * 3 + 2];

          colors[colorpos++] = alpha;  // light .7922, default .6549, lighter .8275
          colors[colorpos++] = alpha;  // light .6666, default .4431, lighter .7216
          colors[colorpos++] = alpha;  // light .6235, default .3725, lighter .6863

          colors[colorpos++] = alpha;
          colors[colorpos++] = alpha;
          colors[colorpos++] = alpha;
          numConnected++;
        }
      }
    }

    segsRef.current.geometry.setDrawRange(0, numConnected * 2);
    segsRef.current.geometry.attributes.position.needsUpdate = true;
    segsRef.current.geometry.attributes.col.needsUpdate = true;

    if (!moveFinished.current) {

      if (fadeFinished.current) {
        camera.position.lerp(cameraMoveTo.current, moveLerp.current);
        moveLerp.current *= 1.075;
        if (camera.fov < 45) camera.fov += 10 * moveLerp.current;
        if (camera.position.distanceTo(cameraMoveTo.current) < 1) moveFinished.current = true;
      } else {
        if (camera.far < 4000) camera.far += 1000 * moveLerp.current;
        else {
          fadeFinished.current = true;
          moveLerp.current = 0.000001;
        }
      }

      camera.updateProjectionMatrix();
      moveLerp.current += 0.00025;
    } else {
      groupRef.current.rotation.x += 0.001;
      groupRef.current.rotation.y += 0.001;
    }

    partShaderRef.current.uniforms.uRayOrigin.value = camera.position;
  })

  return <>
    <group ref={groupRef}>

      <Instances ref={instancesRef} limit={500} range={500}>
        <tetrahedronGeometry args={[3, 5]} />
        <CustomShaderMaterial
          baseMaterial={MeshPhysicalMaterial}
          ref={partShaderRef}
          uniforms={{
            uRayOrigin: { value: new Vector3(0, 0, 0) },
            uFar: { value: small ? 700 : 800 },
            uNear: { value: small ? -900 : 500 }
          }}
          vertexShader={particleVert}
          roughness={1}
          metalness={1}
          clearcoat={0.58}
          clearcoatRoughness={0.25}
          emissive={"#a7715f"}
          silent
        />
        {instances.current}
      </Instances>

      <lineSegments ref={segsRef}>
        <bufferGeometry drawRange={{ start: 0, count: 0 }}>
          <bufferAttribute
            attach="attributes-position"
            count={segments.length / 3}
            array={segments}
            itemSize={3}
            usage={DynamicDrawUsage}
          />
          <bufferAttribute
            attach="attributes-col"
            count={segments.length / 3}
            array={colors}
            itemSize={3}
            usage={DynamicDrawUsage}
          />
        </bufferGeometry>
        <LineShader
          uColor={new Color(0.6549, 0.4431, 0.3725)}
          blending={NoBlending}
          transparent
        />
      </lineSegments>
    </group>
    <fog attach="fog" color="white" near={small ? 1700 : 1100} far={small ? 2800 : 2200} />
  </>
}
