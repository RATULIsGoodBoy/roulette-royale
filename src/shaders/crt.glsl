// CRT Scanline & Distortion Shader
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_intensity;
uniform float u_damage;
uniform sampler2D u_texture;

varying vec2 vUv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    vec2 uv = vUv;
    
    // Scanlines
    float scanline = sin(uv.y * u_resolution.y * 0.003) * 0.5 + 0.5;
    scanline = pow(scanline, 2.0) * u_intensity;
    
    // RGB Shift (Chromatic Aberration) - increases with damage
    float shift = u_damage * 0.02;
    float r = texture2D(u_texture, uv + vec2(shift, 0.0)).r;
    float g = texture2D(u_texture, uv).g;
    float b = texture2D(u_texture, uv - vec2(shift, 0.0)).b;
    
    // Vignette
    vec2 center = uv - 0.5;
    float vignette = 1.0 - dot(center, center) * 0.8;
    
    // Noise
    float noise = random(uv * u_time) * u_damage * 0.3;
    
    // Final color
    vec3 color = vec3(r, g, b);
    color *= vignette;
    color -= scanline * 0.3;
    color += noise;
    
    // Gamma correction
    color = pow(color, vec3(1.0/2.2));
    
    gl_FragColor = vec4(color, 1.0);
}
