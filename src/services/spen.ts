import { Platform } from 'react-native';

export interface SPenEvent {
  type: 'hover' | 'press' | 'release' | 'move';
  x: number;
  y: number;
  pressure: number;
  tilt: { x: number; y: number };
  timestamp: number;
}

export interface SPenStroke {
  points: Array<{ x: number; y: number; pressure: number }>;
  color: string;
  width: number;
}

export interface SPenDrawing {
  strokes: SPenStroke[];
  width: number;
  height: number;
  timestamp: number;
}

/**
 * S Pen stylus support for Samsung Galaxy Tab S10 FE.
 * Handles pressure-sensitive input, hover detection, and drawing capture.
 */
export class SPenService {
  private enabled = false;
  private pressureSensitivity = true;
  private currentStroke: SPenStroke | null = null;
  private strokes: SPenStroke[] = [];
  private onDrawingComplete: ((drawing: SPenDrawing) => void) | null = null;
  private onTextRecognized: ((text: string) => void) | null = null;
  private canvasWidth = 0;
  private canvasHeight = 0;
  private isDrawing = false;
  private strokeColor = '#FFFFFF';
  private strokeWidth = 2;

  constructor(enabled = true, pressureSensitivity = true) {
    this.enabled = enabled;
    this.pressureSensitivity = pressureSensitivity;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setPressureSensitivity(enabled: boolean) {
    this.pressureSensitivity = enabled;
  }

  setStrokeColor(color: string) {
    this.strokeColor = color;
  }

  setStrokeWidth(width: number) {
    this.strokeWidth = width;
  }

  setCanvasSize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  setOnDrawingComplete(callback: (drawing: SPenDrawing) => void) {
    this.onDrawingComplete = callback;
  }

  setOnTextRecognized(callback: (text: string) => void) {
    this.onTextRecognized = callback;
  }

  /**
   * Check if the device supports S Pen.
   */
  static isSPenAvailable(): boolean {
    if (Platform.OS !== 'android') return false;
    // Samsung tablets with S Pen have toolType support
    // This check is best-effort; real detection requires native module
    return true;
  }

  /**
   * Handle a touch/stylus event from the canvas.
   * Call this from onTouchStart, onTouchMove, onTouchEnd handlers.
   */
  handleTouchEvent(
    type: 'start' | 'move' | 'end',
    x: number,
    y: number,
    pressure?: number,
    toolType?: 'finger' | 'stylus'
  ) {
    if (!this.enabled) return;

    // Only process stylus events if we can detect tool type
    // On S Pen, toolType will be 'stylus'
    const effectivePressure = this.pressureSensitivity ? (pressure || 0.5) : 1.0;
    const effectiveWidth = this.pressureSensitivity
      ? this.strokeWidth * (0.5 + effectivePressure)
      : this.strokeWidth;

    switch (type) {
      case 'start':
        this.isDrawing = true;
        this.currentStroke = {
          points: [{ x, y, pressure: effectivePressure }],
          color: this.strokeColor,
          width: effectiveWidth,
        };
        break;

      case 'move':
        if (this.isDrawing && this.currentStroke) {
          this.currentStroke.points.push({ x, y, pressure: effectivePressure });
        }
        break;

      case 'end':
        if (this.currentStroke && this.currentStroke.points.length > 1) {
          this.strokes.push(this.currentStroke);
        }
        this.currentStroke = null;
        this.isDrawing = false;
        break;
    }
  }

  /**
   * Get the current drawing state for rendering.
   */
  getCurrentStrokes(): SPenStroke[] {
    const result = [...this.strokes];
    if (this.currentStroke) result.push(this.currentStroke);
    return result;
  }

  /**
   * Finalize the drawing and trigger callbacks.
   */
  finalizeDrawing(): SPenDrawing | null {
    if (this.strokes.length === 0) return null;

    const drawing: SPenDrawing = {
      strokes: [...this.strokes],
      width: this.canvasWidth,
      height: this.canvasHeight,
      timestamp: Date.now(),
    };

    this.onDrawingComplete?.(drawing);
    return drawing;
  }

  /**
   * Convert strokes to a simple text description for the AI.
   */
  describeDrawing(): string {
    if (this.strokes.length === 0) return 'Empty canvas';

    const totalPoints = this.strokes.reduce((s, st) => s + st.points.length, 0);
    const avgPressure = this.strokes.reduce(
      (s, st) => s + st.points.reduce((ps, p) => ps + p.pressure, 0) / st.points.length,
      0
    ) / this.strokes.length;

    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const stroke of this.strokes) {
      for (const p of stroke.points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }

    return [
      `S Pen drawing: ${this.strokes.length} strokes, ${totalPoints} points`,
      `Bounding box: (${Math.round(minX)},${Math.round(minY)}) to (${Math.round(maxX)},${Math.round(maxY)})`,
      `Canvas: ${this.canvasWidth}x${this.canvasHeight}`,
      `Avg pressure: ${avgPressure.toFixed(2)}`,
      `[User drew something with the S Pen. Describe what you think it might be based on the stroke data, or ask the user what they drew.]`,
    ].join('\n');
  }

  /**
   * Export strokes as SVG path data.
   */
  toSVG(): string {
    const paths = this.strokes.map(stroke => {
      if (stroke.points.length < 2) return '';
      const d = stroke.points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
        .join(' ');
      return `<path d="${d}" stroke="${stroke.color}" stroke-width="${stroke.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    }).join('\n');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.canvasWidth}" height="${this.canvasHeight}">\n${paths}\n</svg>`;
  }

  clearCanvas() {
    this.strokes = [];
    this.currentStroke = null;
    this.isDrawing = false;
  }

  undo(): SPenStroke | null {
    return this.strokes.pop() || null;
  }
}

let sPenInstance: SPenService | null = null;

export function getSPenService(enabled = true, pressureSensitivity = true): SPenService {
  if (!sPenInstance) {
    sPenInstance = new SPenService(enabled, pressureSensitivity);
  }
  return sPenInstance;
}
