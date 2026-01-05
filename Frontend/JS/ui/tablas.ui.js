export const crearTablaEditable = ({
    form,
    inputDesc,
    inputValor,
    tablaBody,
    onChange
}) => {

    let items = [];

    const render = () => {
        tablaBody.innerHTML = "";

        items.forEach((item, index) => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${item.desc}</td>
                <td class="text-end">$ ${Number(item.valor).toLocaleString("es-CO")}</td>
                <td>
                    <button class="btn btn-warning btn-sm me-1">✏️</button>
                    <button class="btn btn-danger btn-sm">🗑️</button>
                </td>
            `;

            // Editar
            tr.children[2].children[0].onclick = () => {
                inputDesc.value = item.desc;
                inputValor.value = item.valor;
                items.splice(index, 1);
                render();
                onChange(items);
            };

            // Eliminar
            tr.children[2].children[1].onclick = () => {
                items.splice(index, 1);
                render();
                onChange(items);
            };

            tablaBody.appendChild(tr);
        });

        onChange(items);
    };

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        if (!inputDesc.value) return;

        items.push({
            desc: inputDesc.value,
            valor: Number(inputValor.value)
        });

        form.reset();
        render();
    });

    return {
        getItems: () => items,
        setItems: (data = []) => {
            items = data;
            render();
        },
        clear: () => {
            items = [];
            render();
        }
    };
};
