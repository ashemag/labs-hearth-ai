uniform vec3 uRayOrigin;
uniform float uTime;
uniform float uFar;
uniform float uNear;

void main() {
    float dis = uRayOrigin.z;
    float scale = (dis - uFar) / uNear;
    mat4 scalingMatrix = mat4(
        scale, 0.0, 0.0, 0.0,
        0.0, scale, 0.0, 0.0,
        0.0, 0.0, scale, 0.0,
        0.0, 0.0, 0.0, 1.0
    );
    csm_Position = (scalingMatrix * vec4(csm_Position, 1.0)).xyz;
}
