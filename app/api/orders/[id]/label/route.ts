import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import jsPDF from 'jspdf';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDatabase();
    
    const order = await getQuery(db, `
      SELECT o.id, o.customer_name, o.feteer_type, o.meat_selection, o.cheese_selection, 
             o.has_cheese, o.extra_nutella, o.notes, o.status, o.price, o.created_at
      FROM orders o 
      WHERE o.id = ?
    `, [parseInt(id)]);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Create PDF label - increased height to prevent clipping
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [100, 180] // 100mm x 180mm label (increased height)
    });

    // Function to sanitize text and remove Arabic characters
    const sanitizeText = (text: string): string => {
      if (!text) return '';
      
      // First, handle common replacements
      const cleanText = text
        .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, '') // Remove Arabic
        .replace(/[^\x00-\x7F]/g, '') // Remove all non-ASCII characters
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
      
      // If the result is empty or very short, provide fallbacks
      if (!cleanText || cleanText.length < 2) {
        if (text.includes('فطير') || text.includes('Mixed') || text.includes('Sweet')) {
          return 'Feteer Order';
        }
        if (text.includes('customer') || text.length > 5) {
          return 'Customer';
        }
        return 'Item';
      }
      
      return cleanText;
    };

    // Set fonts
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);

    let yPos = 20;
    const margin = 10;
    const lineHeight = 8;

    // Customer name (main title) - sanitized
    pdf.text(`#${order.id} - ${sanitizeText(order.customer_name)}`, margin, yPos);
    yPos += lineHeight * 1.5;

    // Feteer type - sanitized
    pdf.setFontSize(14);
    pdf.text(sanitizeText(order.feteer_type), margin, yPos);
    yPos += lineHeight;

 

    // Order details
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(14);

    if (sanitizeText(order.feteer_type) === 'Mixed Meat' && order.meat_selection) {
      pdf.text('MEAT SELECTION:', margin, yPos);
      yPos += lineHeight;
      pdf.setFontSize(13);
      const meats = sanitizeText(order.meat_selection).split(',').join(', ');
      pdf.text(meats, margin + 5, yPos);
      yPos += lineHeight;
      
      const cheeseText = order.has_cheese ? 'WITH CHEESE' : 'NO CHEESE';
      pdf.text(cheeseText, margin + 5, yPos);
      yPos += lineHeight * 1.5;
    }

    // Extra toppings
    if (order.extra_nutella) {
      pdf.text('EXTRA TOPPINGS:', margin, yPos);
      yPos += lineHeight;
      pdf.text('• Extra Nutella (+$2.00)', margin + 5, yPos);
      yPos += lineHeight * 1.5;
    }

    // Notes - sanitized
    if (order.notes && order.notes.trim()) {
      const sanitizedNotes = sanitizeText(order.notes);
      if (sanitizedNotes) {
        pdf.text('SPECIAL NOTES:', margin, yPos);
        yPos += lineHeight;
        pdf.setFontSize(12);
        
        // Word wrap for notes
        const noteWords = sanitizedNotes.split(' ');
        let currentLine = '';
        const maxWidth = 80; // mm
        
        for (const word of noteWords) {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          const textWidth = pdf.getTextWidth(testLine);
          
          if (textWidth > maxWidth && currentLine) {
            pdf.text(currentLine, margin + 5, yPos);
            yPos += lineHeight;
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        
        if (currentLine) {
          pdf.text(currentLine, margin + 5, yPos);
          yPos += lineHeight;
        }
      }
    }

    // Price and timestamp at bottom
    yPos = 100; // Near bottom (adjusted for taller label)
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`TOTAL: $${order.price.toFixed(2)}`, margin, yPos);
    

    // Add a separator line
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos - 5, 100 - margin, yPos - 5);
    

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="label-${id}.pdf"`,
        'X-Auto-Print': 'true', // Custom header to trigger auto-print
      },
    });

  } catch (error) {
    console.error('Error generating label:', error);
    return NextResponse.json({ error: 'Failed to generate label' }, { status: 500 });
  }
}

function getQuery(db: any, query: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err: any, row: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}