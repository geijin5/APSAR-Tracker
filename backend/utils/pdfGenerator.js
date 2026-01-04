const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate PDF for a completed checklist
 */
function generateCompletedChecklistPDF(checklist, user, template) {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 50, bottom: 50, left: 50, right: 50 }
  });

  // Header with APSAR branding
  doc.fontSize(20).font('Helvetica-Bold').text('APSAR Tracker', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica').text('Anaconda Pintler Search and Rescue', { align: 'center' });
  doc.moveDown(1);
  
  // Horizontal line
  doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
  doc.moveDown(1);

  // Checklist Information
  doc.fontSize(16).font('Helvetica-Bold').text('Completed Checklist', { align: 'center' });
  doc.moveDown(1);

  // Checklist Details
  doc.fontSize(10).font('Helvetica');
  doc.text(`Checklist Type: ${checklist.templateType || template?.type || 'N/A'}`, { align: 'left' });
  doc.text(`Checklist Name: ${checklist.templateName || template?.name || 'N/A'}`, { align: 'left' });
  doc.text(`Completed By: ${checklist.completedBy || user?.firstName + ' ' + user?.lastName || 'N/A'}`, { align: 'left' });
  doc.text(`Completed Date: ${checklist.completedDate || new Date(checklist.completedDateTime).toLocaleDateString() || 'N/A'}`, { align: 'left' });
  if (checklist.completedTime) {
    doc.text(`Completed Time: ${checklist.completedTime}`, { align: 'left' });
  }
  doc.moveDown(1);

  // Horizontal line
  doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
  doc.moveDown(1);

  // Checklist Items
  doc.fontSize(12).font('Helvetica-Bold').text('Checklist Items', { align: 'left' });
  doc.moveDown(0.5);

  const items = checklist.items || [];
  items.forEach((item, index) => {
    const startY = doc.y;
    
    // Checkbox and item text
    doc.fontSize(10).font('Helvetica');
    
    // Draw checkbox (checked or unchecked)
    const checkboxSize = 8;
    const checkboxX = 50;
    const checkboxY = doc.y;
    
    // Draw checkbox border
    doc.rect(checkboxX, checkboxY, checkboxSize, checkboxSize).stroke();
    
    // If completed, draw checkmark
    if (item.completed) {
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('✓', checkboxX + 1, checkboxY - 2);
      doc.fontSize(10).font('Helvetica');
    }
    
    // Item text
    const itemTextX = checkboxX + checkboxSize + 10;
    doc.text(`${index + 1}. ${item.item || item.title || 'N/A'}`, itemTextX, checkboxY - 2);
    
    // Required indicator
    if (item.required) {
      doc.fontSize(8).font('Helvetica-Bold').fillColor('red');
      doc.text('(Required)', itemTextX + 150, checkboxY - 2);
      doc.fillColor('black');
    }
    
    // Category (if exists)
    if (item.category) {
      doc.fontSize(8).font('Helvetica-Oblique').fillColor('gray');
      doc.text(`[${item.category}]`, itemTextX + 200, checkboxY - 2);
      doc.fillColor('black');
    }
    
    doc.moveDown(0.3);
    
    // Item description (if exists)
    if (item.description) {
      doc.fontSize(8).font('Helvetica').fillColor('gray');
      doc.text(item.description, itemTextX, doc.y, { width: 450 });
      doc.fillColor('black');
      doc.moveDown(0.2);
    }
    
    // Notes (if exists and completed)
    if (item.completed && item.notes) {
      doc.fontSize(8).font('Helvetica-Oblique').fillColor('blue');
      doc.text(`Notes: ${item.notes}`, itemTextX, doc.y, { width: 450 });
      doc.fillColor('black');
      doc.moveDown(0.2);
    }
    
    doc.moveDown(0.3);
    
    // Page break if needed
    if (doc.y > 700) {
      doc.addPage();
    }
  });

  doc.moveDown(1);
  
  // Horizontal line
  doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
  doc.moveDown(1);

  // Completion Summary
  doc.fontSize(10).font('Helvetica');
  doc.text(`Total Items: ${checklist.totalItems || items.length}`, { align: 'left' });
  doc.text(`Completed Items: ${checklist.completedItems || items.filter(i => i.completed).length}`, { align: 'left' });
  doc.text(`Completion Percentage: ${checklist.completionPercentage || 0}%`, { align: 'left' });
  doc.text(`Status: ${checklist.status || 'N/A'}`, { align: 'left' });
  
  // Overall notes (if exists)
  if (checklist.notes) {
    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica-Bold').text('Overall Notes:', { align: 'left' });
    doc.fontSize(9).font('Helvetica').text(checklist.notes, { align: 'left', width: 500 });
  }

  // Footer
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).font('Helvetica').fillColor('gray');
    doc.text(
      `Page ${i + 1} of ${pageCount} | Generated on ${new Date().toLocaleDateString()}`,
      50,
      750,
      { align: 'center', width: 512 }
    );
    doc.fillColor('black');
  }

  return doc;
}

/**
 * Generate PDF for a checklist template (blank checklist)
 */
function generateTemplateChecklistPDF(template, user) {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 50, bottom: 50, left: 50, right: 50 }
  });

  // Header with APSAR branding
  doc.fontSize(20).font('Helvetica-Bold').text('APSAR Tracker', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica').text('Anaconda Pintler Search and Rescue', { align: 'center' });
  doc.moveDown(1);
  
  // Horizontal line
  doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
  doc.moveDown(1);

  // Checklist Information
  doc.fontSize(16).font('Helvetica-Bold').text('Checklist Template', { align: 'center' });
  doc.moveDown(1);

  // Checklist Details
  doc.fontSize(10).font('Helvetica');
  doc.text(`Checklist Type: ${template.type || 'N/A'}`, { align: 'left' });
  doc.text(`Checklist Name: ${template.name || 'N/A'}`, { align: 'left' });
  if (template.category) {
    doc.text(`Category: ${template.category}`, { align: 'left' });
  }
  doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'left' });
  if (user) {
    doc.text(`Prepared For: ${user.firstName} ${user.lastName}`, { align: 'left' });
  }
  doc.moveDown(1);

  // Description (if exists)
  if (template.description) {
    doc.fontSize(9).font('Helvetica-Oblique').fillColor('gray');
    doc.text(template.description, { align: 'left', width: 500 });
    doc.fillColor('black');
    doc.moveDown(1);
  }

  // Horizontal line
  doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
  doc.moveDown(1);

  // Checklist Items
  doc.fontSize(12).font('Helvetica-Bold').text('Checklist Items', { align: 'left' });
  doc.moveDown(0.5);

  const items = template.items || [];
  items.forEach((item, index) => {
    const startY = doc.y;
    
    // Checkbox and item text
    doc.fontSize(10).font('Helvetica');
    
    // Draw checkbox (empty for blank template)
    const checkboxSize = 8;
    const checkboxX = 50;
    const checkboxY = doc.y;
    
    // Draw checkbox border
    doc.rect(checkboxX, checkboxY, checkboxSize, checkboxSize).stroke();
    
    // Item text
    const itemTextX = checkboxX + checkboxSize + 10;
    doc.text(`${index + 1}. ${item.title || 'N/A'}`, itemTextX, checkboxY - 2);
    
    // Required indicator
    if (item.required) {
      doc.fontSize(8).font('Helvetica-Bold').fillColor('red');
      doc.text('(Required)', itemTextX + 150, checkboxY - 2);
      doc.fillColor('black');
    }
    
    // Category (if exists)
    if (item.category) {
      doc.fontSize(8).font('Helvetica-Oblique').fillColor('gray');
      doc.text(`[${item.category}]`, itemTextX + 200, checkboxY - 2);
      doc.fillColor('black');
    }
    
    doc.moveDown(0.3);
    
    // Item description (if exists)
    if (item.description) {
      doc.fontSize(8).font('Helvetica').fillColor('gray');
      doc.text(item.description, itemTextX, doc.y, { width: 450 });
      doc.fillColor('black');
      doc.moveDown(0.3);
    }
    
    // Space for notes
    doc.moveDown(0.5);
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('lightgray');
    doc.text('Notes: _________________________________________________', itemTextX, doc.y, { width: 450 });
    doc.fillColor('black');
    doc.moveDown(0.5);
    
    doc.moveDown(0.3);
    
    // Page break if needed
    if (doc.y > 700) {
      doc.addPage();
    }
  });

  // Signature lines at the end
  doc.moveDown(2);
  doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
  doc.moveDown(1);
  
  doc.fontSize(10).font('Helvetica-Bold').text('Signatures', { align: 'left' });
  doc.moveDown(1);
  
  doc.fontSize(9).font('Helvetica');
  doc.text('Completed By: _________________________________', 50, doc.y, { width: 250 });
  doc.text('Date: _______________', 350, doc.y);
  doc.moveDown(1.5);
  
  doc.text('Reviewed By: _________________________________', 50, doc.y, { width: 250 });
  doc.text('Date: _______________', 350, doc.y);

  // Footer
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).font('Helvetica').fillColor('gray');
    doc.text(
      `Page ${i + 1} of ${pageCount} | Generated on ${new Date().toLocaleDateString()}`,
      50,
      750,
      { align: 'center', width: 512 }
    );
    doc.fillColor('black');
  }

  return doc;
}

module.exports = {
  generateCompletedChecklistPDF,
  generateTemplateChecklistPDF
};

