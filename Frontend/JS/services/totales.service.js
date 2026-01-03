export const calcularTotal = (items = []) =>
    items.reduce((t, i) => t + Number(i.valor), 0);

export const calcularTotalesFactura = ({
    servicios = [],
    repuestos = [],
    insumos = [],
    garantia = false,
    incluyeRepuestos = false
}) => {

    const totalServicios = calcularTotal(servicios);
    const totalRepuestos = calcularTotal(repuestos);
    const totalInsumos = calcularTotal(insumos);

    const total = totalServicios + totalRepuestos + totalInsumos;

    // Omar
    let totalOmar = totalInsumos;
    if (!garantia) {
        const repOmar = incluyeRepuestos ? totalRepuestos * 0.15 * 0.30 : 0;
        totalOmar += repOmar + totalServicios * 0.4;
    }

    // Rogers
    let totalRogers = totalServicios;
    if (!garantia) {
        const repRogers = incluyeRepuestos ? totalRepuestos * 0.15 * 0.70 : 0;
        totalRogers = repRogers + totalServicios * 0.6;
    }

    return {
        totalServicios,
        totalRepuestos,
        totalInsumos,
        total,
        totalOmar,
        totalRogers
    };
};
