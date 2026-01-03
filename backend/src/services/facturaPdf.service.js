
import path from "path";
import fs from "fs";

import PDFDocument from "pdfkit";

const COLORS = {
  text: "#111111",
  muted: "#777777",
  line: "#E5E5E5",
  tableHeader: "#F2F2F2"
};

export const generarFacturaPDF = (factura, cliente, detalle, res) => {

  const doc = new PDFDocument({ size: "A4", margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename=factura_${factura.numerofactura}.pdf`
  );

  doc.pipe(res);

  /* ================= ENCABEZADO ================= */
  doc
    .fontSize(10)
    .fillColor(COLORS.muted)
    .text("TU LOGO", 50, 50);

  doc
    .text(
      `N.º ${String(factura.numerofactura).padStart(6, "0")}`,
      400,
      50,
      { align: "right" }
    );

  doc
    .moveDown(2)
    .fontSize(36)
    .fillColor(COLORS.text)
    .text("FACTURA");

  doc
    .moveDown(0.5)
    .fontSize(12)
    .text(`Fecha: ${factura.fechaexp.toISOString().split("T")[0]}`);

  /* ================= CLIENTE / EMPRESA ================= */
  doc.moveDown(2);

  const y = doc.y;

  doc
    .fontSize(11)
    .fillColor(COLORS.text)
    .text("Facturado a:", 50, y)
    .moveDown(0.5)
    .fontSize(10)
    .text(cliente.nombre)
    .text(`Placa: ${cliente.placa}`)
    .text(`Vehículo: ${cliente.marca} ${cliente.modelo}`)
    .text(`Teléfono: ${cliente.telefono || "—"}`);

  doc
    .fontSize(11)
    .text("Emitido por:", 350, y)
    .moveDown(0.5)
    .fontSize(10)
    .text("Servicio Electromecánico Industrial")
    .text("Rogers Prieto")
    .text("Tel: 322 371 8397");

  /* ================= TABLA ================= */
  doc.moveDown(3);

  const tableTop = doc.y;

  doc
    .rect(50, tableTop, 500, 25)
    .fill(COLORS.tableHeader);

  doc
    .fillColor(COLORS.text)
    .fontSize(10)
    .text("Descripción", 60, tableTop + 8)
    .text("Cant.", 300, tableTop + 8)
    .text("Precio", 360, tableTop + 8)
    .text("Importe", 460, tableTop + 8, { align: "right" });

  let yRow = tableTop + 30;

  detalle.forEach(item => {

    doc
      .strokeColor(COLORS.line)
      .moveTo(50, yRow)
      .lineTo(550, yRow)
      .stroke();

    doc
      .fillColor(COLORS.text)
      .fontSize(9)
      .text(item.descripcion, 60, yRow + 6, { width: 220 })
      .text("1", 300, yRow + 6)
      .text(
        `$ ${Number(item.valor).toLocaleString("es-CO")}`,
        360,
        yRow + 6
      )
      .text(
        `$ ${Number(item.valor).toLocaleString("es-CO")}`,
        460,
        yRow + 6,
        { align: "right" }
      );

    yRow += 25;
  });

  /* ================= TOTAL ================= */
  doc
    .strokeColor(COLORS.line)
    .moveTo(50, yRow + 5)
    .lineTo(550, yRow + 5)
    .stroke();

  const total =
    Number(factura.totalservicios) +
    Number(factura.totalrepuestos) +
    Number(factura.totalinsumos);

  doc
    .moveDown(2)
    .fontSize(12)
    .text("TOTAL", 360)
    .fontSize(14)
    .text(
      `$ ${total.toLocaleString("es-CO")}`,
      460,
      doc.y - 18,
      { align: "right" }
    );

  /* ================= PIE ================= */
  doc
    .moveDown(3)
    .fontSize(10)
    .text("Método de pago: Efectivo");

  doc
    .fontSize(9)
    .fillColor(COLORS.muted)
    .moveDown(0.5)
    .text("¡Gracias por confiar en nosotros!");

  doc.end();
};
