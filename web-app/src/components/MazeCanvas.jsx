// MazeCanvas Component
// Renders maze visualization on HTML canvas

import React, { useRef, useEffect, useCallback } from 'react';
import { renderMaze } from '../utils/mazeRenderer.js';
import './MazeCanvas.css';

/**
 * @typedef {Object} MazeCanvasProps
 * @property {import('../utils/telemetryParser.js').MazeState|null} mazeState - Maze state to render
 * @property {Object} settings - Render settings
 * @property {boolean} settings.showCosts - Whether to show cost values
 * @property {boolean} settings.showWalls - Whether to show walls
 * @property {number} settings.backdropOpacity - Opacity of backdrop image (0-1)
 * @property {Array} pathHistory - Array of {x, y} points visited
 * @property {string|null} backdropImage - Data URL of backdrop image
 */

/**
 * Maze canvas component
 * @param {MazeCanvasProps} props - Component props
 */
export function MazeCanvas({ mazeState, settings, pathHistory = [], backdropImage = null }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const backdropImageRef = useRef(null);
  const backdropUrlRef = useRef(null);

  // Load backdrop image when data URL changes
  useEffect(() => {
    // Skip if URL hasn't changed
    if (backdropImage === backdropUrlRef.current) {
      return;
    }
    
    backdropUrlRef.current = backdropImage;
    
    if (!backdropImage) {
      backdropImageRef.current = null;
      return;
    }

    const img = new Image();
    img.onload = () => {
      backdropImageRef.current = img;
    };
    img.onerror = () => {
      console.error('Failed to load backdrop image');
      backdropImageRef.current = null;
    };
    img.src = backdropImage;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [backdropImage]);

  // Handle canvas resize
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size accounting for device pixel ratio
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }, []);

  // Set up resize observer
  useEffect(() => {
    resizeCanvas();
    
    const observer = new ResizeObserver(resizeCanvas);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => observer.disconnect();
  }, [resizeCanvas]);

  // Render maze when state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Use requestAnimationFrame for smooth updates
    animationFrameRef.current = requestAnimationFrame(() => {
      // Adjust context for device pixel ratio
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.scale(1/dpr, 1/dpr);
      
      renderMaze(ctx, mazeState, settings, pathHistory, backdropImageRef.current);
      
      ctx.restore();
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mazeState, settings, pathHistory, backdropImage]);

  return (
    <div className="maze-canvas-container" ref={containerRef}>
      <canvas ref={canvasRef} className="maze-canvas" />
    </div>
  );
}

export default MazeCanvas;