"use client";
import React, { useMemo } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { TextureLoader, LinearFilter } from "three";

const PartialCylinderShell = ( props :{ size:number} ) => {

    const [mouseX, setMouseX] = React.useState(0);

    React.useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            setMouseX(event.clientX);
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);
    // Load texture
    const texture = useLoader(TextureLoader, "/img/FU-2.png");
    const texture2 = useLoader(TextureLoader, "/img/FU-2.png");
    const texture3 = useLoader(TextureLoader, "/img/FU-2.png");


    texture.minFilter = LinearFilter; // enhances texture quality
    texture.magFilter = LinearFilter;

    return (
        <Canvas style={{ width: props.size, height: props.size }}> 
            {/* Lights */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} />

            {/* Partial Cylindrical Shell */}
            <mesh rotation={[0, mouseX * 0.004, 0]}>

                {/*
          args: [
            radiusTop,
            radiusBottom,
            height,
            radialSegments,
            heightSegments,
            openEnded,
            thetaStart,   // start angle in radians
            thetaLength   // arc length in radians
          ]
        */}
                <cylinderGeometry
                    args={[1.5, 1.5, 4, 64, 1, true, 0, Math.PI * 0.55]} // 270° shell
                />
                <meshStandardMaterial
                    map={texture}
                    side={2} // double-sided
                    toneMapped={true}
                />
            </mesh>



            <mesh rotation={[0, mouseX * 0.004, 0]}>

                <cylinderGeometry
                    args={[1.5, 1.5, 4, 64, 1, true, 1.9, Math.PI * 0.55]} // 270° shell
                />
                <meshStandardMaterial
                    map={texture2}
                    side={2} // double-sided
                    toneMapped={true}
                />
            </mesh>

            <mesh rotation={[0, mouseX * 0.004, 0]}>

                <cylinderGeometry
                    args={[1.5, 1.5, 4, 64, 1, true, 3.8, Math.PI * 0.55]} // 270° shell
                />
                <meshStandardMaterial
                    map={texture3}
                    side={2} // double-sided
                    toneMapped={true}
                />
            </mesh>

            {/* Controls */}
            <OrbitControls enableZoom={false} enablePan={false} />
        </Canvas>
    );
};

export default PartialCylinderShell;
