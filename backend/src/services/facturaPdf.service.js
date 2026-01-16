import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

const COLORS = {
    primary: "#1a365d",      // Azul oscuro corporativo
    secondary: "#2d3748",    // Gris oscuro
    accent: "#2b6cb0",       // Azul principal
    success: "#38a169",      // Verde para totales
    light: "#f7fafc",        // Fondo claro
    border: "#e2e8f0",       // Color bordes
    warning: "#d69e2e",      // Amarillo para destacar
    text: "#2d3748",         // Texto principal
    muted: "#718096"         // Texto secundario
};

export const generarFacturaPDF = (factura, cliente, detalle, res) => {
    const doc = new PDFDocument({ 
        margin: 40, 
        size: "A4",
        bufferPages: true,
        font: 'Helvetica'
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `inline; filename=Factura_${factura.numerofactura}_${cliente.placa}.pdf`
    );

    doc.pipe(res);

    // Separar detalle
    const servicios = detalle.filter(d => d.tipo === "SERVICIO");
    const repuestos = detalle.filter(d => d.tipo === "REPUESTO");
    const insumos   = detalle.filter(d => d.tipo === "INSUMO");

    /* ================= ENCABEZADO ================= */
    const drawHeader = () => {
        // Fondo encabezado
        doc.rect(0, 0, doc.page.width, 140)
           .fill(COLORS.light);
        
        // Logo
        const logoPath = path.resolve("../assets/logo.png");
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 40, 40, { width: 80 });
        }
        
        // Datos empresa
        doc.fillColor(COLORS.primary)
           .fontSize(14)
           .font('Helvetica-Bold')
           .text("ROGERS PRIETO", 130, 45)
           .fontSize(10)
           .font('Helvetica')
           .text("Servicio de Electro-Mecánica Industrial", 130, 65)
           .text("Nit: [NUMERO NIT]", 130, 80)
           .text("Calle 44 No 68B - 44 Sur", 130, 95)
           .text("Tel: 322 3718397 | Email: [correo@empresa.com]", 130, 110);
        
        // Recuadro de factura
        const facturaBoxWidth = 180;
        const facturaBoxX = doc.page.width - facturaBoxWidth - 40;
        
        doc.roundedRect(facturaBoxX, 40, facturaBoxWidth, 90, 5)
           .lineWidth(2)
           .stroke(COLORS.accent);
        
        doc.fillColor(COLORS.primary)
           .fontSize(16)
           .font('Helvetica-Bold')
           .text("FACTURA", facturaBoxX + 10, 50);
        
        doc.fontSize(10)
           .text(`Nº ${factura.numerofactura}`, facturaBoxX + 10, 75);
        
        const fechaFormateada = new Date(factura.fechaexp).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
        
        doc.text(fechaFormateada, facturaBoxX + 10, 95);
        
        // Estado
        doc.fillColor(COLORS.success)
           .fontSize(11)
           .font('Helvetica-Bold')
           .text("PAGADA", facturaBoxX + facturaBoxWidth - 45, 95, { align: 'right' });
        
        // Línea divisoria
        doc.moveTo(40, 140)
           .lineTo(doc.page.width - 40, 140)
           .lineWidth(1)
           .strokeColor(COLORS.border)
           .stroke();
    };

    /* ================= DATOS CLIENTE ================= */
    const drawClientInfo = () => {
        doc.moveDown(3);
        
        // Título sección cliente
        doc.fillColor(COLORS.primary)
           .fontSize(12)
           .font('Helvetica-Bold')
           .text("DATOS DEL CLIENTE", 40, 160);
        
        // Recuadro información cliente
        const clientBoxY = 175;
        const clientBoxHeight = 80;
        
        doc.roundedRect(40, clientBoxY, doc.page.width - 80, clientBoxHeight, 5)
           .fill(COLORS.light);
        
        // Columnas para datos cliente
        const col1 = 50;
        const col2 = 200;
        const col3 = 350;
        
        doc.fillColor(COLORS.text)
           .fontSize(10)
           .text("Nombre:", col1, clientBoxY + 15)
           .font('Helvetica-Bold')
           .text(cliente.nombre, col1 + 40, clientBoxY + 15);
        
        doc.font('Helvetica')
           .text("Teléfono:", col1, clientBoxY + 35)
           .font('Helvetica-Bold')
           .text(cliente.telefono || "No registrado", col1 + 40, clientBoxY + 35);
        
        doc.font('Helvetica')
           .text("Vehículo:", col2, clientBoxY + 15)
           .font('Helvetica-Bold')
           .text(`${cliente.marca} ${cliente.modelo}`, col2 + 45, clientBoxY + 15);
        
        doc.font('Helvetica')
           .text("Placa:", col2, clientBoxY + 35)
           .font('Helvetica-Bold')
           .text(cliente.placa, col2 + 45, clientBoxY + 35);
        
        doc.font('Helvetica')
           .text("Kilometraje:", col3, clientBoxY + 15)
           .font('Helvetica-Bold')
           .text(cliente.kilometraje ? `${cliente.kilometraje} km` : "No registrado", col3 + 55, clientBoxY + 15);
        
        // Línea después de cliente
        doc.moveTo(40, clientBoxY + clientBoxHeight + 10)
           .lineTo(doc.page.width - 40, clientBoxY + clientBoxHeight + 10)
           .strokeColor(COLORS.border)
           .stroke();
        
        return clientBoxY + clientBoxHeight + 20;
    };

    /* ================= TABLA DE DETALLES ================= */
    const drawDetailTable = (titulo, items, startY) => {
        if (items.length === 0) return startY;
        
        // Título sección
        doc.fillColor(COLORS.accent)
           .fontSize(11)
           .font('Helvetica-Bold')
           .text(titulo, 40, startY);
        
        const tableTop = startY + 10;
        const colDesc = 50;
        const colValor = 460;
        const tableWidth = 515;
        const rowHeight = 22;
        
        // Encabezado tabla
        doc.fillColor(COLORS.primary)
           .rect(40, tableTop, tableWidth, rowHeight)
           .fill();
        
        doc.fillColor('#FFFFFF')
           .fontSize(10)
           .text("DESCRIPCIÓN", colDesc, tableTop + 6)
           .text("VALOR", colValor, tableTop + 6, { align: 'right' });
        
        let currentY = tableTop + rowHeight;
        
        // Filas de la tabla
        items.forEach((item, index) => {
            if (currentY > 700) {
                doc.addPage();
                currentY = 60;
            }
            
            // Fondo alternado
            if (index % 2 === 0) {
                doc.fillColor(COLORS.light)
                   .rect(40, currentY, tableWidth, rowHeight)
                   .fill();
            }
            
            // Descripción con límite de caracteres
            let descripcion = item.descripcion;
            if (descripcion.length > 80) {
                descripcion = descripcion.substring(0, 80) + '...';
            }
            
            doc.fillColor(COLORS.text)
               .fontSize(9)
               .text(descripcion, colDesc, currentY + 6, { width: 380 })
               .text(formatearMoneda(item.valor), colValor, currentY + 6, { align: 'right' });
            
            currentY += rowHeight;
        });
        
        // Línea inferior
        doc.strokeColor(COLORS.border)
           .moveTo(40, currentY)
           .lineTo(40 + tableWidth, currentY)
           .stroke();
        
        // Subtotal de la sección
        const subtotal = items.reduce((sum, item) => sum + Number(item.valor), 0);
        
        doc.fillColor(COLORS.muted)
           .fontSize(9)
           .text(`Subtotal ${titulo.toLowerCase()}: ${formatearMoneda(subtotal)}`, 
                 400, currentY + 5, { align: 'right' });
        
        return currentY + 25;
    };

    /* ================= RESUMEN DE TOTALES ================= */
    const drawTotals = (startY) => {
        const totalsBoxX = 300;
        const totalsBoxWidth = 255;
        
        // Recuadro totales
        doc.roundedRect(totalsBoxX, startY, totalsBoxWidth, 120, 5)
           .lineWidth(1)
           .stroke(COLORS.border);
        
        const colLabel = totalsBoxX + 15;
        const colValue = totalsBoxX + totalsBoxWidth - 15;
        
        let y = startY + 15;
        
        // Servicios
        doc.fillColor(COLORS.text)
           .fontSize(10)
           .text("Servicios:", colLabel, y);
        
        doc.text(formatearMoneda(factura.totalservicios), colValue, y, { align: 'right' });
        y += 20;
        
        // Repuestos
        doc.text("Repuestos:", colLabel, y);
        doc.text(formatearMoneda(factura.totalrepuestos), colValue, y, { align: 'right' });
        y += 20;
        
        // Insumos
        doc.text("Insumos:", colLabel, y);
        doc.text(formatearMoneda(factura.totalinsumos), colValue, y, { align: 'right' });
        y += 25;
        
        // Línea divisoria
        doc.moveTo(colLabel, y)
           .lineTo(colValue, y)
           .strokeColor(COLORS.border)
           .stroke();
        y += 10;
        
        // Total
        const totalGeneral = Number(factura.totalservicios) + 
                            Number(factura.totalrepuestos) + 
                            Number(factura.totalinsumos);
        
        doc.fillColor(COLORS.primary)
           .fontSize(14)
           .font('Helvetica-Bold')
           .text("TOTAL A PAGAR:", colLabel, y);
        
        doc.fillColor(COLORS.success)
           .fontSize(16)
           .text(formatearMoneda(totalGeneral), colValue, y - 2, { align: 'right' });
        
        // IVA (si aplica)
        doc.fillColor(COLORS.muted)
           .fontSize(8)
           .text("*IVA incluido según normativa vigente", colLabel, y + 25);
    };

    /* ================= PIE DE PÁGINA ================= */
    const drawFooter = () => {
        const footerY = doc.page.height - 70;
        
        // Línea superior
        doc.moveTo(40, footerY)
           .lineTo(doc.page.width - 40, footerY)
           .strokeColor(COLORS.border)
           .stroke();
        
        // Información de pago
        doc.fillColor(COLORS.muted)
           .fontSize(8)
           .text("MÉTODOS DE PAGO", 40, footerY + 10, { width: 150 });
        
        doc.fontSize(7)
           .text("• Efectivo\n• Transferencia\n• Tarjeta débito/crédito", 
                 40, footerY + 20, { width: 150, lineGap: 3 });
        
        // Términos
        doc.fontSize(8)
           .text("TÉRMINOS Y CONDICIONES", 220, footerY + 10, { width: 200 });
        
        doc.fontSize(7)
           .text("Garantía de 30 días en repuestos y servicios.\nEsta factura es un documento tributario electrónico.", 
                 220, footerY + 20, { width: 200, lineGap: 3 });
        
        // Información contacto
        doc.fontSize(8)
           .text("CONTACTO", 450, footerY + 10);
        
        doc.fontSize(7)
           .text("servicios@rogersprieto.com\nTel: 322 3718397\nHorario: L-V 8am-6pm", 
                 450, footerY + 20, { lineGap: 3 });
        
        // Marca de agua/firma
        doc.fillColor(COLORS.light)
           .fontSize(30)
           .opacity(0.1)
           .text("Rogers Prieto", doc.page.width / 2, doc.page.height / 2, { align: 'center' })
           .opacity(1);
        
        // Nota legal
        doc.fillColor(COLORS.secondary)
           .fontSize(7)
           .text("Documento generado electrónicamente - Válido sin firma física según ley 1234 de 2018", 
                 40, doc.page.height - 20, { align: 'center', width: 515 });
    };

    /* ================= EJECUCIÓN PRINCIPAL ================= */
    drawHeader();
    let currentY = drawClientInfo();
    
    // Tablas de detalles
    currentY = drawDetailTable("SERVICIOS", servicios, currentY);
    currentY = drawDetailTable("REPUESTOS", repuestos, currentY);
    currentY = drawDetailTable("INSUMOS", insumos, currentY);
    
    // Totales
    drawTotals(currentY);
    
    // Pie de página
    drawFooter();

    doc.end();
};

/* ================= FUNCIÓN AUXILIAR ================= */
function formatearMoneda(valor) {
    const numero = Number(valor) || 0;
    return `$${numero.toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })}`;
}