import { Suspense } from 'react';
import { Canvas, useLoader, extend } from '@react-three/fiber';
import { ShaderMaterial, Vector2 } from 'three';
import { TextureLoader } from 'three/src/loaders/TextureLoader';
import { useThree, useFrame } from '@react-three/fiber';

extend({ ShaderMaterial });

const IMAGE_ASPECT_RATIO = 1.78431372549;

const calculateScaleFactors = (texture, containerSize) => {
  const containerAspectRatio = containerSize.x / containerSize.y;
  const imageAspectRatio = texture.image.width / texture.image.height;

  let scaleFactorX = 1;
  let scaleFactorY = 1;

  const landscapeFactor = imageAspectRatio / containerAspectRatio;
  const portraitFactor = containerAspectRatio / imageAspectRatio;

  const isLandscapeModeContainer = containerAspectRatio >= 1;
  const isContainerRatioStronger = containerAspectRatio >= imageAspectRatio;

  if (isContainerRatioStronger) {
    scaleFactorY = isLandscapeModeContainer ? landscapeFactor : portraitFactor;
  } else {
    scaleFactorX = isLandscapeModeContainer ? landscapeFactor : portraitFactor;
  }

  return { scaleFactorX, scaleFactorY };
};

const calculateAspectFill = (aspectRatio, viewport) => {
  const viewportAspect = viewport.width / viewport.height;
  if (aspectRatio > viewportAspect) {
    return [viewport.width, viewport.width / aspectRatio];
  } else {
    return [viewport.height * aspectRatio, viewport.height];
  }
};

const ImageDepth = ({ image, depthMap }) => {
  const { size, viewport } = useThree();
  const { scaleFactorX, scaleFactorY } = calculateScaleFactors(
    image,
    new Vector2(viewport.width, viewport.height)
  );

  const uniforms = {
    mouse: { value: new Vector2() },
    colorMap: { value: image },
    depthMap: { value: depthMap },
    uScaleFactorX: {
      value: scaleFactorX,
    },
    uScaleFactorY: {
      value: scaleFactorY,
    },
  };

  useFrame(({ mouse }) => {
    uniforms.mouse.value.x = (mouse.x * 4 * viewport.width) / size.width;
    uniforms.mouse.value.y = (mouse.y * 4 * viewport.height) / size.height;
  });

  console.log([viewport.width, viewport.height, 1]);
  const [width, height] = calculateAspectFill(IMAGE_ASPECT_RATIO, viewport);

  return (
    <mesh position={[0, 0, 0.4]} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry attach="geometry" />
      <shaderMaterial
        attach="material"
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`}
        fragmentShader={`
        uniform sampler2D colorMap;
        uniform sampler2D depthMap;
        uniform float uScaleFactorX;
        uniform float uScaleFactorY;
        varying vec2 vUv;
        uniform vec2 mouse;
        void main() {
          vec2 st = (vUv * 2.0 - 1.0);
          st.x *= uScaleFactorX; 
          st.y *= uScaleFactorY;
          st = st * 0.5 + 0.5;
          
          vec4 depth = texture2D(depthMap, st);
          gl_FragColor = texture2D(colorMap, st + mouse*depth.r);
        }`} //vUv + mouse*depth.r
      />
    </mesh>
  );
};

const Background = () => {
  const colorMap = useLoader(TextureLoader, '/background.jpeg');
  const depthMap = useLoader(TextureLoader, '/background-depth.jpeg');

  return (
    <Canvas style={{ width: '100%', height: '100%', background: '#000' }}>
      <Suspense fallback={null}>
        <ImageDepth image={colorMap} depthMap={depthMap} />
      </Suspense>
    </Canvas>
  );
};

export default Background;
