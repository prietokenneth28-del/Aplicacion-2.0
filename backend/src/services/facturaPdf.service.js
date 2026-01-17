import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

// Configuración de rutas (para ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLORS = {
    primary: "#1e3a8a",      // Azul corporativo profundo
    secondary: "#64748b",    // Gris pizarra para textos secundarios
    accent: "#3b82f6",       // Azul brillante para destacados
    tableHeader: "#f1f5f9",  // Gris muy claro para cabeceras
    tableRow: "#f8fafc",     // Blanco humo para filas alternas
    border: "#e2e8f0",       // Gris suave para líneas
    success: "#059669",      // Verde esmeralda para el total
    text: "#1e293b",         // Gris oscuro casi negro para lectura
    white: "#ffffff"
};

export const generarFacturaPDF = (factura, cliente, detalle, res) => {
    const doc = new PDFDocument({
        margin: 50,
        size: "A4",
        bufferPages: true, // Importante para numeración de páginas
        font: 'Helvetica'
    });

    // Configurar Headers de respuesta
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=Factura_${factura.numerofactura || 'N'}.pdf`);
    
    doc.pipe(res);

    // Separar datos
    const servicios = detalle.filter(d => d.tipo === "SERVICIO");
    const repuestos = detalle.filter(d => d.tipo === "REPUESTO");
    const insumos   = detalle.filter(d => d.tipo === "INSUMO");

    // Constantes de diseño (Grid)
    const PAGE_WIDTH = doc.page.width;
    const PAGE_HEIGHT = doc.page.height;
    const MARGIN = 50;
    const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
    const COL_VALOR_WIDTH = 100;
    const COL_DESC_WIDTH = CONTENT_WIDTH - COL_VALOR_WIDTH;
    const X_DESC = MARGIN + 10;
    const X_VALOR = PAGE_WIDTH - MARGIN - 10;
    
    // Límite Y para contenido antes de saltar página (Footer empieza aprox en 790)
    // Dejamos espacio suficiente (150px) para el bloque de totales si es necesario
    const PAGE_BREAK_Y = PAGE_HEIGHT - 150; 

    /* ================= HELPER: FORMATEAR MONEDA ================= */
    const formatCurrency = (amount) => {
        return Number(amount).toLocaleString('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    };

    /* ================= 1. ENCABEZADO ================= */
    const drawHeader = () => {
        // Logo
        const logoPath = path.join(__dirname, "../assets/logo.png");
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, MARGIN, 45, { width: 70 });
        }

        // Datos de la Empresa (Izquierda)
        doc.fillColor(COLORS.primary)
           .fontSize(16)
           .font('Helvetica-Bold')
           .text("ROGERS PRIETO", 130, 50)
           .fontSize(9)
           .font('Helvetica')
           .fillColor(COLORS.secondary)
           .text("Servicio de Electro-Mecánica Industrial", 130, 70)
           .text("Calle 44 No 68B - 44 Sur, Bogotá", 130, 83)
           .text("322 3718397  •  menstror@gmail.com", 130, 96);

        // Caja de Datos de Factura (Derecha)
        const boxWidth = 200;
        const boxX = PAGE_WIDTH - MARGIN - boxWidth;
        const boxY = 45;

        // Fondo caja
        doc.roundedRect(boxX, boxY, boxWidth, 85, 4)
           .fillOpacity(0.05)
           .fill(COLORS.primary);
        doc.fillOpacity(1); // Reset opacidad

        // Borde caja
        doc.strokeColor(COLORS.accent)
           .lineWidth(1)
           .roundedRect(boxX, boxY, boxWidth, 85, 4)
           .stroke();

        // Contenido caja
        doc.fillColor(COLORS.primary)
           .fontSize(10)
           .font('Helvetica-Bold')
           .text("RECIBO", boxX, boxY + 15, { width: boxWidth, align: 'center' });

        doc.fontSize(14)
           .fillColor(COLORS.text)
           .text(`Nº ${factura.numerofactura || '----'}`, boxX, boxY + 35, { width: boxWidth, align: 'center' });

        doc.fontSize(9)
           .font('Helvetica')
           .fillColor(COLORS.secondary)
           .text(`Fecha: ${new Date(factura.fechaexp).toLocaleDateString()}`, boxX, boxY + 60, { width: boxWidth, align: 'center' });
    };

    /* ================= 2. INFO CLIENTE ================= */
    const drawClientInfo = (y) => {
        doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 70, 4)
           .fill(COLORS.tableHeader);

        const col1 = MARGIN + 20;
        const col2 = PAGE_WIDTH / 2;

        // Etiqueta sección
        doc.fillColor(COLORS.accent)
           .fontSize(8)
           .font('Helvetica-Bold')
           .text("CLIENTE", col1, y + 15);

        // Datos Columna 1
        doc.fillColor(COLORS.text)
           .fontSize(11)
           .font('Helvetica-Bold')
           .text(cliente.nombre || "Consumidor Final", col1, y + 30);
        
        doc.font('Helvetica')
           .fontSize(9)
           .fillColor(COLORS.secondary)
           .text(`ID/NIT: ${cliente.documento || '---'}`, col1, y + 45)
           .text(`Tel: ${cliente.telefono || '---'}`, col1, y + 57);

        // Datos Columna 2 (Vehículo)
        doc.fillColor(COLORS.accent)
           .fontSize(8)
           .font('Helvetica-Bold')
           .text("VEHÍCULO", col2, y + 15);

        doc.fillColor(COLORS.text)
           .fontSize(11)
           .font('Helvetica-Bold')
           .text(`${cliente.marca || ''} ${cliente.modelo || ''} ${cliente.año || ''}`, col2, y + 30);

        doc.font('Helvetica')
           .fontSize(9)
           .fillColor(COLORS.secondary)
           .text(`Placa: ${cliente.placa || '---'}`, col2, y + 45)
           .text(`Kilometraje: ${cliente.kilometraje ? cliente.kilometraje + ' km' : 'N/A'}`, col2, y + 57);

        return y + 90; // Retornar nueva posición Y
    };

    /* ================= 3. TABLAS DE DETALLE ================= */
    const drawTableHeader = (y) => {
        doc.rect(MARGIN, y, CONTENT_WIDTH, 20).fill(COLORS.primary);
        doc.fillColor(COLORS.white)
           .fontSize(9)
           .font('Helvetica-Bold')
           .text("DESCRIPCIÓN DEL ÍTEM", X_DESC, y + 6)
           .text("VALOR", X_VALOR - COL_VALOR_WIDTH, y + 6, { width: COL_VALOR_WIDTH, align: 'right' });
        return y + 20;
    };

    const drawTableRow = (desc, valor, y, isAlternate) => {
        if (isAlternate) {
            doc.rect(MARGIN, y, CONTENT_WIDTH, 20).fill(COLORS.tableRow);
        }
        
        doc.fillColor(COLORS.text)
           .fontSize(9)
           .font('Helvetica')
           .text(desc, X_DESC, y + 6, { width: COL_DESC_WIDTH - 20 })
           .text(formatCurrency(valor), X_VALOR - COL_VALOR_WIDTH, y + 6, { width: COL_VALOR_WIDTH, align: 'right' });
        
        // Línea sutil divisoria
        doc.moveTo(MARGIN, y + 20)
           .lineTo(PAGE_WIDTH - MARGIN, y + 20)
           .strokeColor(COLORS.border)
           .lineWidth(0.5)
           .stroke();

        return y + 20;
    };

    // Función de control de salto de página
    const checkPageBreak = (y) => {
        // Usamos PAGE_BREAK_Y (aprox 690px) para asegurar espacio para totales y footer
        if (y > PAGE_BREAK_Y) { 
            doc.addPage();
            // En nueva página, pintamos solo la cabecera de la tabla
            return drawTableHeader(50); 
        }
        return y;
    };

    /* ================= LOGICA DE RENDERIZADO ================= */
    
    // 1. Dibujar Header Fijo (Solo primera página)
    drawHeader();
    
    // 2. Dibujar Info Cliente
    let currentY = drawClientInfo(150);

    // 3. Dibujar Secciones (Servicios, Repuestos, Insumos)
    const renderSection = (titulo, items) => {
        if (items.length > 0) {
            currentY = checkPageBreak(currentY + 30); // Verificar espacio antes del título
            
            // Título de la sección
            doc.fillColor(COLORS.primary)
               .fontSize(10)
               .font('Helvetica-Bold')
               .text(titulo, MARGIN, currentY);
            
            currentY += 15;
            currentY = drawTableHeader(currentY);

            items.forEach((item, index) => {
                currentY = checkPageBreak(currentY);
                currentY = drawTableRow(item.descripcion, item.valor, currentY, index % 2 !== 0);
            });
            
            currentY += 10; // Espacio después de la tabla
        }
    };

    renderSection("SERVICIOS REALIZADOS", servicios);
    renderSection("REPUESTOS INSTALADOS", repuestos);
    renderSection("INSUMOS UTILIZADOS", insumos);

    /* ================= 4. TOTALES ================= */
    // Verificar si cabe el bloque completo de totales (aprox 120px de altura)
    // Si estamos muy abajo, forzamos salto de página para que el total no quede cortado ni pise el footer
    if (currentY > PAGE_HEIGHT - 250) {
        doc.addPage();
        currentY = 50;
    }

    // Alineamos la caja de totales a la derecha
    const TOTALS_WIDTH = 250;
    const TOTALS_X = PAGE_WIDTH - MARGIN - TOTALS_WIDTH;
    
    // Línea gruesa separadora
    doc.moveTo(TOTALS_X, currentY)
       .lineTo(PAGE_WIDTH - MARGIN, currentY)
       .strokeColor(COLORS.primary)
       .lineWidth(2)
       .stroke();
    
    currentY += 10;

    const drawTotalLine = (label, value, isBold = false, isBig = false) => {
        const y = currentY;
        doc.fillColor(COLORS.text)
           .fontSize(isBig ? 12 : 9)
           .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
           .text(label, TOTALS_X + 10, y);
        
        doc.fillColor(isBig ? COLORS.success : COLORS.text)
           .text(formatCurrency(value), PAGE_WIDTH - MARGIN - 110, y, { width: 100, align: 'right' });
        
        currentY += (isBig ? 25 : 18);
    };

    if (factura.totalservicios > 0) drawTotalLine("Total Servicios:", factura.totalservicios);
    if (factura.totalrepuestos > 0) drawTotalLine("Total Repuestos:", factura.totalrepuestos);
    if (factura.totalinsumos > 0)   drawTotalLine("Total Insumos:", factura.totalinsumos);
    
    // Espacio antes del total
    currentY += 5;
    
    // Total General Grande (Calculado sumando partes si no viene en el objeto)
    const totalGeneral = Number(factura.totales?.total || 
                        (Number(factura.totalservicios||0) + Number(factura.totalrepuestos||0) + Number(factura.totalinsumos||0)));

    doc.rect(TOTALS_X, currentY - 5, TOTALS_WIDTH, 30)
       .fill(COLORS.tableHeader); // Fondo suave para el total
    
    drawTotalLine("TOTAL A PAGAR", totalGeneral, true, true);

    
    // Finalizar documento
    doc.end();
};