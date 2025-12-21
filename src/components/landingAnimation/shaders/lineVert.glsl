varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vPoints;
varying vec3 vColor;
uniform float uTime;
uniform vec2 uResolution;
uniform sampler2D uTexture;
uniform vec3 uRayOrigin;
uniform vec2 uMouse;
uniform vec2 uSize;
attribute vec3 col;

void main() {
    vUv = uv;
    vColor = col;
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vPosition = modelPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * modelPosition;
}
