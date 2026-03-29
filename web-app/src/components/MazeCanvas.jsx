// MazeCanvas Component
// Renders maze visualization on HTML canvas

import React, { useRef, useEffect, useCallback } from 'react';
import { renderMaze, calculateLayout } from '../utils/mazeRenderer.js';
import './MazeCanvas.css';

/**
 * @typedef {Object} MazeCanvasProps
 * @property {import('../utils/telemetryParser.js').MazeState|null} mazeState - Maze state to render
 * @property {Object} settings - Render settings
 * @property {boolean} settings.showCosts - Whether to show cost values
 * @property {boolean} settings.showWalls - Whether to show walls
 */

/**
 * Maze canvas component
 * @param {MazeCanvasProps} props - Component props
 */
export function MazeCanvas({ mazeState, settings }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);

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
      if (mazeState) {
        // Adjust context for device pixel ratio
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.scale(1/dpr, 1/dpr);
        
        renderMaze(ctx, mazeState, settings);
        
        ctx.restore();
      } else {
        // Clear canvas if no maze state
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw placeholder text
        ctx.fillStyle = '#999999';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Connect to robot to view maze', canvas.width / 2, canvas.height / 2);
      }
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mazeState, settings]);

  return (
    <div className="maze-canvas-container" ref={containerRef}>
      <canvas ref={canvasRef} className="maze-canvas" />
    </div>
  );
}

export default MazeCanvas;