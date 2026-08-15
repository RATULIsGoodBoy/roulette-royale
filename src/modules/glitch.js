// CRT & Glitch Post-Processing System
import { events } from './events.js';

class GlitchSystem {
  constructor() {
    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.uniforms = {};
    this.startTime = Date.now();
    this.damageLevel = 0;
    this.shakeIntensity = 0;
    this.init();
  }

  async init() {
    // Create canvas for post-processing
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'crt-overlay';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '9998';
    document.body.appendChild(this.canvas);

    try {
      this.gl = this.canvas.getContext('webgl');
      if (!this.gl) throw new Error('WebGL not supported');
      
      await this.setupShader();
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.animate();
      
      // Listen for damage events
      events.on('PLAYER_HIT', (data) => {
        this.triggerDamage(data.intensity || 0.5);
      });
      
      events.on('GUNSHOT', (data) => {
        this.triggerShake(data.isLive ? 0.8 : 0.3);
      });
    } catch (e) {
      console.warn('CRT shader disabled:', e.message);
      this.fallbackCSS();
    }
  }

  async setupShader() {
    const gl = this.gl;
    
    // Load shader source
    const response = await import('../shaders/crt.glsl?raw');
    const fragmentSource = response.default;
    
    const vertexSource = `
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        vUv.y = 1.0 - vUv.y;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    // Compile shaders
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);

    // Create program
    this.program = gl.createProgram();
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw new Error('Shader program failed to link');
    }

    // Get uniform locations
    this.uniforms = {
      u_resolution: gl.getUniformLocation(this.program, 'u_resolution'),
      u_time: gl.getUniformLocation(this.program, 'u_time'),
      u_intensity: gl.getUniformLocation(this.program, 'u_intensity'),
      u_damage: gl.getUniformLocation(this.program, 'u_damage'),
      u_texture: gl.getUniformLocation(this.program, 'u_texture'),
    };

    // Setup buffer
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1,  1,
      -1,  1,  1, -1,   1,  1,
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(this.program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  }

  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${error}`);
    }

    return shader;
  }

  resize() {
    if (!this.canvas || !this.gl) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  triggerDamage(intensity) {
    this.damageLevel = Math.min(this.damageLevel + intensity, 1.0);
    // Decay damage over time
    setTimeout(() => {
      this.damageLevel = Math.max(this.damageLevel - 0.3, 0);
    }, 2000);
  }

  triggerShake(intensity) {
    this.shakeIntensity = intensity;
    setTimeout(() => {
      this.shakeIntensity = 0;
    }, 300);
  }

  fallbackCSS() {
    // CSS-only fallback if WebGL fails
    this.canvas.style.background = `
      repeating-linear-gradient(
        0deg,
        rgba(0, 0, 0, 0.15) 0px,
        rgba(0, 0, 0, 0.15) 1px,
        transparent 1px,
        transparent 2px
      )
    `;
    this.canvas.style.animation = 'scanline 10s linear infinite';
  }

  animate() {
    if (!this.gl || !this.program) {
      requestAnimationFrame(() => this.animate());
      return;
    }

    const gl = this.gl;
    const time = (Date.now() - this.startTime) / 1000;

    gl.useProgram(this.program);

    // Update uniforms
    gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uniforms.u_time, time);
    gl.uniform1f(this.uniforms.u_intensity, 0.5 + Math.sin(time * 2) * 0.1);
    gl.uniform1f(this.uniforms.u_damage, this.damageLevel);

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(() => this.animate());
  }
}

export const glitch = new GlitchSystem();
