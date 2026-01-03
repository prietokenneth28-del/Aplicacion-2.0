import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

const COLORS = {
    primary: "#2C3E50",
    secondary: "#95A5A6",
    light: "#ECF0F1",
    text: "#2D3436"
};

export const generarFacturaPDF = (factura, cliente, detalle, res) => {

    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `inline; filename=factura_${factura.numerofactura}.pdf`
    );

    doc.pipe(res);

    /* ======================================================
       SEPARAR DETALLE
    ====================================================== */
    const servicios = detalle.filter(d => d.tipo === "SERVICIO");
    const repuestos = detalle.filter(d => d.tipo === "REPUESTO");
    const insumos   = detalle.filter(d => d.tipo === "INSUMO");

    /* ======================================================
       LOGO
    ====================================================== */
    const logoPath = path.resolve("../assets/logo.png");
    if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 40, { width: 110 });
    }

    /* ======================================================
       DATOS EMPRESA
    ====================================================== */
    doc
        .fillColor(COLORS.primary)
        .fontSize(10)
        .text("SERVICIO DE ELECTRO-MECANICA INDUSTRIAL", 200, 40, { align: "right" })
        .text("Rogers Prieto", { align: "right" })
        .text("Tel: 322 3718397", { align: "right" })
        .text("Dirección: Calle 44 No 68B - 44sur", { align: "right" });

    doc.moveDown(4);

    /* ======================================================
       TÍTULO
    ====================================================== */
    doc
        .fontSize(18)
        .text("FACTURA:", 40, 40, { align: "left" })
        //.moveDown(0.5)
        .fontSize(11)
        .text(`Factura Nº ${factura.numerofactura}`, { align: "left" })
        .text(`Fecha: ${factura.fechaexp.toISOString().split("T")[0]}`, { align: "left" });

    doc.moveDown(2);

    /* ======================================================
       BLOQUE CLIENTE
    ====================================================== */
    const blockY = doc.y;

    doc
        .fontSize(11)
        .fillColor(COLORS.primary)
        .text("DATOS DEL CLIENTE", 40, blockY);

    doc
        .fillColor(COLORS.text)
        .fontSize(10)
        .text(`Nombre: ${cliente.nombre}`, 40, blockY + 18)
        .text(`Placa: ${cliente.placa}`)
        .text(`Vehículo: ${cliente.marca} ${cliente.modelo}`)
        .text(`Teléfono: ${cliente.telefono || "—"}`);

    doc.moveDown(4);

    /* ======================================================
       FUNCIÓN TABLA
    ====================================================== */
    const dibujarTabla = (titulo, items, startY) => {

        if (items.length === 0) return startY;

        const rowHeight = 20;
        const colDesc = 60;
        const colValor = 420;
        const tableWidth = 500;

        doc
            .fillColor(COLORS.primary)
            .fontSize(12)
            .text(titulo, 40, startY);

        let y = startY + 15;

        doc
            .rect(40, y, tableWidth, rowHeight)
            .fill(COLORS.light);

        doc
            .fillColor(COLORS.primary)
            .fontSize(10)
            .text("Descripción", colDesc, y + 5)
            .text("Valor", colValor, y + 5, { width: 100, align: "right" });

        y += rowHeight;

        items.forEach(item => {

            if (y > 700) {
                doc.addPage();
                y = 60;
            }

            doc
                .strokeColor(COLORS.secondary)
                .moveTo(40, y)
                .lineTo(540, y)
                .stroke();

            doc
                .fillColor(COLORS.text)
                .fontSize(9)
                .text(item.descripcion, colDesc, y + 5, { width: 330 })
                .text(
                    `$ ${Number(item.valor).toLocaleString("es-CO")}`,
                    colValor,
                    y + 5,
                    { width: 100, align: "right" }
                );

            y += rowHeight;
        });

        doc.moveTo(40, y).lineTo(540, y).stroke();

        return y + 15;
    };

    /* ======================================================
       TABLAS
    ====================================================== */
    let currentY = doc.y + 10;

    currentY = dibujarTabla("SERVICIOS", servicios, currentY);
    currentY = dibujarTabla("REPUESTOS", repuestos, currentY);
    currentY = dibujarTabla("INSUMOS", insumos, currentY);

    /* ======================================================
       TOTALES
    ====================================================== */
    const totalsX = 330;
    const totalsWidth = 200;
    const totalsY = currentY + 10;

    doc
        .fillColor(COLORS.text)
        .fontSize(10)
        .text("Total Servicios:", totalsX, totalsY)
        .text(`$ ${Number(factura.totalservicios).toLocaleString("es-CO")}`,
            totalsX, totalsY, { width: totalsWidth, align: "right" });

    doc
        .text("Total Repuestos:", totalsX, totalsY + 15)
        .text(`$ ${Number(factura.totalrepuestos).toLocaleString("es-CO")}`,
            totalsX, totalsY + 15, { width: totalsWidth, align: "right" });

    doc
        .text("Total Insumos:", totalsX, totalsY + 30)
        .text(`$ ${Number(factura.totalinsumos).toLocaleString("es-CO")}`,
            totalsX, totalsY + 30, { width: totalsWidth, align: "right" });

    doc
        .strokeColor(COLORS.secondary)
        .moveTo(totalsX, totalsY + 50)
        .lineTo(totalsX + totalsWidth, totalsY + 50)
        .stroke();

    doc
        .fillColor(COLORS.primary)
        .fontSize(12)
        .text("TOTAL", totalsX, totalsY + 60)
        .text(
            `$ ${(
                Number(factura.totalservicios) +
                Number(factura.totalrepuestos) +
                Number(factura.totalinsumos)
            ).toLocaleString("es-CO")}`,
            totalsX,
            totalsY + 60,
            { width: totalsWidth, align: "right" }
        );

    /* ======================================================
       PIE
    ====================================================== */
    doc
        .fillColor(COLORS.secondary)
        .fontSize(8)
        .text(
            "Documento generado electrónicamente. Válido sin firma.",
            40,
            760,
            { align: "center", width: 500 }
        );

    doc.end();
};
