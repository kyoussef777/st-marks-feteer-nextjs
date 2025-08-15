import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/database-hybrid';
import jsPDF from 'jspdf';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const order = await getOrderById(parseInt(id));

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

    // Function to wrap text to fit within label width
    const wrapText = (text: string, maxWidth: number, pdf: jsPDF): string[] => {
      if (!text) return [];
      
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const textWidth = pdf.getTextWidth(testLine);
        
        if (textWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      return lines;
    };

    // Function to add wrapped text and return new Y position
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, pdf: jsPDF, lineHeight: number): number => {
      const lines = wrapText(text, maxWidth, pdf);
      let currentY = y;
      
      for (const line of lines) {
        pdf.text(line, x, currentY);
        currentY += lineHeight;
      }
      
      return currentY;
    };

    // Set fonts
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);

    let yPos = 20;
    const margin = 10;
    const lineHeight = 8;
    const maxWidth = 80; // mm - maximum width for text

    // Customer name (main title) - with wrapping
    const customerText = `#${order.id} - ${sanitizeText(order.customer_name)}`;
    yPos = addWrappedText(customerText, margin, yPos, maxWidth, pdf, lineHeight);
    yPos += lineHeight * 0.5;

    // Item type and name - with wrapping
    pdf.setFontSize(14);
    let itemText = '';
    
    if (order.item_type === 'sweet') {
      if ((order as any).sweet_selections) {
        // Handle multiple sweets
        try {
          const sweetSelections = JSON.parse((order as any).sweet_selections);
          const sweetsList = Object.entries(sweetSelections)
            .filter(([_, quantity]) => (quantity as number) > 0)
            .map(([sweetName, quantity]) => `${sanitizeText(sweetName)} (${quantity})`)
            .join(', ');
          itemText = `SWEETS: ${sweetsList}`;
        } catch (error) {
          itemText = `SWEET: ${sanitizeText(order.sweet_type || 'Multiple Items')}`;
        }
      } else {
        itemText = `SWEET: ${sanitizeText(order.sweet_type || '')}`;
      }
    } else {
      itemText = `FETEER: ${sanitizeText(order.feteer_type || '')}`;
    }
    
    yPos = addWrappedText(itemText, margin, yPos, maxWidth, pdf, lineHeight);
    yPos += lineHeight * 0.5;

    // Order details
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);

    // Feteer-specific details
    if (order.item_type === 'feteer' && sanitizeText(order.feteer_type || '') === 'Mixed Meat' && order.meat_selection) {
      pdf.setFont('helvetica', 'bold');
      yPos = addWrappedText('MEAT SELECTION:', margin, yPos, maxWidth, pdf, lineHeight);
      
      pdf.setFont('helvetica', 'normal');
      const meats = sanitizeText(order.meat_selection).split(',').join(', ');
      yPos = addWrappedText(meats, margin + 5, yPos, maxWidth - 5, pdf, lineHeight);
      
      const cheeseText = order.has_cheese ? 'WITH CHEESE' : 'NO CHEESE';
      yPos = addWrappedText(cheeseText, margin + 5, yPos, maxWidth - 5, pdf, lineHeight);
      yPos += lineHeight * 0.5;
    }

    // Sweet-specific details
    if (order.item_type === 'sweet') {
      pdf.setFont('helvetica', 'bold');
      
      if ((order as any).sweet_selections) {
        try {
          const sweetSelections = JSON.parse((order as any).sweet_selections);
          const totalItems = Object.values(sweetSelections).reduce((sum: number, qty: any) => sum + qty, 0);
          yPos = addWrappedText(`DESSERT ORDER (${totalItems} items)`, margin, yPos, maxWidth, pdf, lineHeight);
          
          pdf.setFont('helvetica', 'normal');
          Object.entries(sweetSelections).forEach(([sweetName, quantity]) => {
            if ((quantity as number) > 0) {
              yPos = addWrappedText(`• ${sanitizeText(sweetName)}: ${quantity}`, margin + 5, yPos, maxWidth - 5, pdf, lineHeight);
            }
          });
        } catch (error) {
          yPos = addWrappedText('DESSERT ORDER', margin, yPos, maxWidth, pdf, lineHeight);
          pdf.setFont('helvetica', 'normal');
        }
      } else {
        yPos = addWrappedText('DESSERT ORDER', margin, yPos, maxWidth, pdf, lineHeight);
        pdf.setFont('helvetica', 'normal');
      }
      
      yPos += lineHeight * 0.5;
    }

    // Extra toppings
    if (order.extra_nutella) {
      pdf.setFont('helvetica', 'bold');
      yPos = addWrappedText('EXTRA TOPPINGS:', margin, yPos, maxWidth, pdf, lineHeight);
      
      pdf.setFont('helvetica', 'normal');
      yPos = addWrappedText('• Extra Nutella (+$2.00)', margin + 5, yPos, maxWidth - 5, pdf, lineHeight);
      yPos += lineHeight * 0.5;
    }

    // Notes - with proper wrapping
    if (order.notes && order.notes.trim()) {
      const sanitizedNotes = sanitizeText(order.notes);
      if (sanitizedNotes) {
        pdf.setFont('helvetica', 'bold');
        yPos = addWrappedText('SPECIAL NOTES:', margin, yPos, maxWidth, pdf, lineHeight);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        yPos = addWrappedText(sanitizedNotes, margin + 5, yPos, maxWidth - 5, pdf, lineHeight);
        yPos += lineHeight * 0.5;
      }
    }

    // Ensure we don't exceed the label height
    const minBottomSpace = 30; // Reserve space for price and footer
    if (yPos > 180 - minBottomSpace) {
      yPos = 180 - minBottomSpace;
    }

    // Add a separator line before the footer
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos + 5, 100 - margin, yPos + 5);
    yPos += 15;

    // Price and status at bottom
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    yPos = addWrappedText(`TOTAL: $${order.price.toFixed(2)}`, margin, yPos, maxWidth, pdf, lineHeight);
    
    // Timestamp (converted to EST)
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    const date = new Date(order.created_at);
    const estDate = new Date(date.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const timeText = `Ordered: ${estDate.toLocaleDateString()} ${estDate.toLocaleTimeString()} EST`;
    yPos = addWrappedText(timeText, margin, yPos, maxWidth, pdf, lineHeight);
    

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

