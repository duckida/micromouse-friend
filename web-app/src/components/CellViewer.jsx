import React from 'react';
import './CellViewer.css';

export function CellViewer({ sensingPoints, activeIndex }) {
  const defaultPoints = [
    { sf: '-', sl: '-', sr: '-' },
    { sf: '-', sl: '-', sr: '-' },
    { sf: '-', sl: '-', sr: '-' }
  ];

  const points = sensingPoints || defaultPoints;

  const getCellClass = (index) => {
    const classes = ['cell-viewer-cell'];
    if (activeIndex === index) {
      classes.push('active');
    }
    return classes.join(' ');
  };

  return (
    <div className="cell-viewer">
      <div className="cell-viewer-container">
        <div className="cell-viewer-number cell-viewer-number-top">
          {points[2]?.sf || points[1]?.sf || points[0]?.sf || '-'}
        </div>

        <div className={getCellClass(2)}>
          <span className="cell-label">3</span>
          <span className="cell-value">{points[2]?.sl || '-'}</span>
          <span className="cell-value">{points[2]?.sr || '-'}</span>
        </div>

        <div className={getCellClass(1)}>
          <span className="cell-label">2</span>
          <span className="cell-value">{points[1]?.sl || '-'}</span>
          <span className="cell-value">{points[1]?.sr || '-'}</span>
        </div>

        <div className={getCellClass(0)}>
          <span className="cell-label">1</span>
          <span className="cell-value">{points[0]?.sl || '-'}</span>
          <span className="cell-value">{points[0]?.sr || '-'}</span>
        </div>

        <div className="cell-viewer-circle">
          <div className="cell-viewer-triangle"></div>
        </div>
      </div>
    </div>
  );
}

export default CellViewer;
