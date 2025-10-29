import React from 'react';
import { format } from 'date-fns';

const PrintLayout = ({ 
  title, 
  subtitle, 
  headerInfo = {}, 
  children, 
  footer,
  showDate = true,
  showLogo = true 
}) => {
  return (
    <div className="print-layout">
      {/* Print-specific styles */}
      <style jsx>{`
        @media print {
          .print-layout {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.4;
            color: black;
            background: white;
            margin: 0;
            padding: 20px;
            max-width: none;
            box-shadow: none;
            border: none;
          }
          
          .print-header {
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          
          .print-logo {
            font-size: 24pt;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
          }
          
          .print-title {
            font-size: 18pt;
            font-weight: bold;
            margin: 10px 0;
          }
          
          .print-subtitle {
            font-size: 14pt;
            color: #666;
            margin-bottom: 15px;
          }
          
          .print-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 20px;
          }
          
          .print-info-item {
            margin-bottom: 5px;
          }
          
          .print-info-label {
            font-weight: bold;
            display: inline-block;
            min-width: 120px;
          }
          
          .print-content {
            margin: 20px 0;
          }
          
          .print-footer {
            border-top: 1px solid #ccc;
            margin-top: 30px;
            padding-top: 15px;
            font-size: 10pt;
            color: #666;
            text-align: center;
          }
          
          .print-page-break {
            page-break-before: always;
          }
          
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          
          .print-table th,
          .print-table td {
            border: 1px solid #333;
            padding: 8px;
            text-align: left;
            vertical-align: top;
          }
          
          .print-table th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          
          .print-checklist-item {
            display: flex;
            align-items: flex-start;
            margin: 10px 0;
            padding: 5px 0;
          }
          
          .print-checkbox {
            width: 15px;
            height: 15px;
            border: 2px solid #333;
            margin-right: 10px;
            flex-shrink: 0;
            margin-top: 2px;
          }
          
          .print-checkbox.checked {
            position: relative;
          }
          
          .print-checkbox.checked::after {
            content: '✓';
            position: absolute;
            top: -3px;
            left: 2px;
            font-size: 14px;
            font-weight: bold;
          }
          
          .no-print {
            display: none !important;
          }
        }
        
        @page {
          margin: 0.75in;
          size: letter;
        }
      `}</style>

      {/* Header */}
      <div className="print-header">
        {showLogo && (
          <div className="print-logo">
            APSAR Tracker - Anaconda Pintler SAR
          </div>
        )}
        
        <div className="print-title">{title}</div>
        
        {subtitle && (
          <div className="print-subtitle">{subtitle}</div>
        )}
        
        <div className="print-info-grid">
          {showDate && (
            <div className="print-info-item">
              <span className="print-info-label">Print Date:</span>
              {format(new Date(), 'MMM dd, yyyy hh:mm a')}
            </div>
          )}
          
          {Object.entries(headerInfo).map(([label, value]) => (
            <div key={label} className="print-info-item">
              <span className="print-info-label">{label}:</span>
              {value}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="print-content">
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className="print-footer">
          {footer}
        </div>
      )}
    </div>
  );
};

export default PrintLayout;
