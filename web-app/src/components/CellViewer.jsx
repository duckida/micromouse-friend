import React from 'react';
import './CellViewer.css';

export function CellViewer({ sensingPoints }) {
  const defaultPoints = [
    { sf: '-', sl: '-', sr: '-' },
    { sf: '-', sl: '-', sr: '-' },
    { sf: '-', sl: '-', sr: '-' }
  ];

  const points = sensingPoints || defaultPoints;

  return (
    <div className="cell-viewer">
      <div className="cell-viewer-container">
        <div className="cell-viewer-number cell-viewer-number-top">
          {points[0]?.sf || '-'}
        </div>

        <div className="cell-viewer-number cell-viewer-number-left">
          <span>{points[0]?.sl || '-'}</span>
          <span>{points[1]?.sl || '-'}</span>
          <span>{points[2]?.sl || '-'}</span>
        </div>

        <div className="cell-viewer-circle">
          <div className="cell-viewer-triangle"></div>
        </div>

        <div className="cell-viewer-number cell-viewer-number-right">
          <span>{points[0]?.sr || '-'}</span>
          <span>{points[1]?.sr || '-'}</span>
          <span>{points[2]?.sr || '-'}</span>
        </div>
      </div>
    </div>
  );
}

export default CellViewer;
