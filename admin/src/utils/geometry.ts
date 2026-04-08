import * as math from 'mathjs';
// @ts-ignore
import ClipperLib from 'clipper-lib';

export const GRID_SIZE = 20;
export const SNAP_THRESHOLD = 10;

export const snapToGrid = (value: number): number => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
};

export interface Point {
    x: number;
    y: number;
}

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
}

/**
 * Calculates the bounding box of a rotated rectangle.
 */
export const getRotatedBounds = (rect: Rect) => {
    const { x, y, width, height, rotation = 0 } = rect;
    const rad = (rotation * Math.PI) / 180;
    
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    const corners = [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height }
    ];
    
    const rotatedCorners = corners.map(p => ({
        x: x + p.x * cos - p.y * sin,
        y: y + p.x * sin + p.y * cos
    }));
    
    const minX = Math.min(...rotatedCorners.map(p => p.x));
    const maxX = Math.max(...rotatedCorners.map(p => p.x));
    const minY = Math.min(...rotatedCorners.map(p => p.y));
    const maxY = Math.max(...rotatedCorners.map(p => p.y));
    
    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
};

/**
 * Uses ClipperLib to subtract one polygon from another.
 * Useful for creating window/door openings in walls.
 */
export const subtractPolygon = (subject: Point[], clip: Point[]) => {
    const subj = [subject.map(p => ({ X: p.x, Y: p.y }))];
    const clp = [clip.map(p => ({ X: p.x, Y: p.y }))];
    
    const clipper = new ClipperLib.Clipper();
    const solution = new (ClipperLib as any).Paths();
    
    clipper.AddPaths(subj, ClipperLib.PolyType.ptSubject, true);
    clipper.AddPaths(clp, ClipperLib.PolyType.ptClip, true);
    
    clipper.Execute(ClipperLib.ClipType.ctDifference, solution, ClipperLib.PolyFillType.pftEvenOdd, ClipperLib.PolyFillType.pftEvenOdd);
    
    return solution.map((path: any) => path.map((p: any) => ({ x: p.X, y: p.Y })));
};

/**
 * Precision math for architectural measurements.
 */
export const formatMeasurement = (pixels: number, scale: number = 0.05): string => {
    // scale: 1px = 5cm by default
    const meters = pixels * scale;
    return math.format(meters, { precision: 2 }) + 'm';
};
