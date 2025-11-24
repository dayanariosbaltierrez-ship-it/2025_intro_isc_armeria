
document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM ELEMENTS
    const productNameInput = document.getElementById('productName');
    const productQuantityInput = document.getElementById('productQuantity');
    const productPriceInput = document.getElementById('productPrice');
    const addUpdateBtn = document.getElementById('addUpdateBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const inventoryTableBody = document.querySelector('#inventoryTable tbody');
    const emptyMessage = document.getElementById('emptyMessage');
    
    // Loan Form Elements (kept for compatibility but not used as UI anymore)
    const crudForm = document.getElementById('crud-form');
    const loanForm = document.getElementById('loan-form');
    const loanProductName = document.getElementById('loanProductName');
    const loanProductStock = document.getElementById('loanProductStock');
    const loanQuantityInput = document.getElementById('loanQuantity');
    const borrowerNameInput = document.getElementById('borrowerName');
    const dueDateInput = document.getElementById('dueDate');
    const processLoanBtn = document.getElementById('processLoanBtn');
    const cancelLoanBtn = document.getElementById('cancelLoanBtn');
    const loansTableBody = document.querySelector('#loansTable tbody');
    const emptyLoanMessage = document.getElementById('emptyLoanMessage');

    // 2. STATE VARIABLES
    let inventory = []; // Main product list
    let loans = []; // List of all loan transactions (NEW)
    let editingItemId = null; 
    let loaningItemId = null; // ID of the product currently being loaned (NEW)

    // --- UTILITY & VIEW FUNCTIONS ---

    function clearForm() {
        productNameInput.value = '';
        productQuantityInput.value = '';
        productPriceInput.value = '';
        productNameInput.focus();
    }
    
    function showLoanForm(itemId) {
        // Now uses prompts to collect loan data instead of showing a separate form
        const item = inventory.find(i => i.id === itemId);
        if (!item) {
            alert('Artículo no encontrado.');
            return;
        }
        const maxAvailable = item.availableStock;
        if (maxAvailable <= 0) {
            alert('No hay stock disponible para prestar este artículo.');
            return;
        }

        // Prompt borrower name
        const borrower = prompt('Nombre del prestatario:');
        if (!borrower) {
            alert('Préstamo cancelado (falta nombre del prestatario).');
            return;
        }

        // Prompt quantity
        let qtyStr = prompt(`Cantidad a prestar (Disponible: ${maxAvailable}):`, '1');
        if (qtyStr === null) { alert('Préstamo cancelado.'); return; }
        let qty = parseInt(qtyStr);
        if (isNaN(qty) || qty <= 0 || qty > maxAvailable) {
            alert('Cantidad inválida. Operación cancelada.');
            return;
        }

        // Prompt due date (YYYY-MM-DD)
        const defaultDue = new Date(Date.now() + 7*24*60*60*1000).toISOString().slice(0,10);
        const dueDate = prompt('Fecha límite de devolución (YYYY-MM-DD):', defaultDue);
        if (!dueDate) { alert('Préstamo cancelado (falta fecha límite).'); return; }

        // Register loan
        const newLoan = {
            id: Date.now(),
            productId: itemId,
            productName: item.name,
            borrower: borrower.trim(),
            quantity: qty,
            loanDate: new Date().toISOString().split('T')[0],
            dueDate: dueDate,
            isReturned: false
        };
        loans.push(newLoan);
        item.availableStock -= qty;
        alert(`Préstamo registrado: ${qty} x ${item.name} a ${borrower}`);
        renderItems();
    }
    
    function hideLoanForm() {
        // kept for compatibility; prompts version does not use the form UI
        loaningItemId = null;
        loanForm.style.display = 'none';
        crudForm.style.display = 'grid';
        cancelEdit();
    }

    function validateForm(name, quantity, price) {
        if (!name || name.trim() === '') {
            alert('El nombre del producto es requerido.');
            productNameInput.focus();
            return false;
        }
        if (isNaN(quantity) || quantity < 0) {
            alert('La cantidad no puede ser negativa.');
            productQuantityInput.focus();
            return false;
        }
        if (isNaN(price) || price < 0) {
            alert('El precio no puede ser negativo.');
            productPriceInput.focus();
            return false;
        }
        return true;
    }

    // --- INVENTORY CRUD ---

    function renderItems() {
        inventoryTableBody.innerHTML = '';
        
        if (inventory.length === 0) {
            emptyMessage.style.display = 'block';
        } else {
            emptyMessage.style.display = 'none';
            inventory.forEach(item => {
                const stockDisplayClass = item.availableStock < 5 && item.availableStock > 0 ? 'stock-low' : '';
                const row = inventoryTableBody.insertRow();
                row.setAttribute('data-id', item.id);

                row.innerHTML = `
                    <td data-label="Nombre">${item.name}</td>
                    <td data-label="Stock Total">${item.totalStock}</td>
                    <td data-label="Stock Disponible" class="${stockDisplayClass}">${item.availableStock}</td>
                    <td data-label="Precio">$${item.price.toFixed(2)}</td>
                    <td data-label="Acciones" class="actions-cell">
                        <button class="btn btn-info btn-sm" onclick="window._showLoanPrompt(${item.id})">Prestar</button>
                        <button class="btn btn-primary btn-sm" onclick="window._editPrompt(${item.id})">Editar</button>
                        <button class="btn btn-danger btn-sm" onclick="window._deletePrompt(${item.id})">Eliminar</button>
                    </td>
                `;
            });
        }
        renderLoans(); // Always update loans when inventory changes
    }

    // Add item via prompts (used by Add/Actualizar button)
    function addItemWithPrompt() {
        const name = prompt('Nombre del producto:');
        if (name === null) { alert('Operación cancelada.'); return; }
        const qtyStr = prompt('Cantidad total (número entero >= 0):', '1');
        if (qtyStr === null) { alert('Operación cancelada.'); return; }
        const priceStr = prompt('Precio (por ejemplo 199.99):', '0.00');
        if (priceStr === null) { alert('Operación cancelada.'); return; }

        const totalStock = parseInt(qtyStr);
        const price = parseFloat(priceStr);
        if (!validateForm(name, totalStock, price)) return;

        const newItem = {
            id: Date.now(),
            name: name.trim(),
            totalStock, 
            availableStock: totalStock,
            price
        };

        inventory.push(newItem);
        alert('Producto agregado exitosamente.');
        renderItems();
    }

    // Edit item via prompts
    function editItem(id) {
        const itemToEdit = inventory.find(item => item.id === id);
        if (!itemToEdit) { alert('Artículo no encontrado.'); return; }

        const loanedCount = itemToEdit.totalStock - itemToEdit.availableStock;
        const cannotChangeStock = loanedCount > 0;

        const newName = prompt('Nuevo nombre del producto:', itemToEdit.name);
        if (newName === null) { alert('Edición cancelada.'); return; }

        let newTotalStock = itemToEdit.totalStock;
        if (!cannotChangeStock) {
            const stockStr = prompt('Nuevo Stock Total (entero):', String(itemToEdit.totalStock));
            if (stockStr === null) { alert('Edición cancelada.'); return; }
            newTotalStock = parseInt(stockStr);
        } else {
            // inform user stock can't be changed
            alert(`No puedes modificar el Stock Total porque hay ${loanedCount} unidades prestadas.`);
        }

        const priceStr = prompt('Nuevo precio:', String(itemToEdit.price.toFixed(2)));
        if (priceStr === null) { alert('Edición cancelada.'); return; }
        const newPrice = parseFloat(priceStr);

        if (!validateForm(newName, newTotalStock, newPrice)) return;

        // Validate not reducing below loaned count
        if (newTotalStock < (itemToEdit.totalStock - itemToEdit.availableStock)) {
            alert('No puedes reducir el stock por debajo de lo que está prestado.');
            return;
        }

        const stockDiff = newTotalStock - itemToEdit.totalStock;
        itemToEdit.availableStock += stockDiff;
        itemToEdit.name = newName.trim();
        itemToEdit.totalStock = newTotalStock;
        itemToEdit.price = newPrice;

        alert('Producto actualizado exitosamente.');
        renderItems();
    }

    // Wrapper for prompt-based edit (exported to window)
    function editItemPromptWrapper(id) {
        editItem(id);
    }

    // Delete item via prompt confirmation
    function deleteItem(id) {
        const item = inventory.find(i => i.id === id);
        if (!item) { alert('Artículo no encontrado.'); return; }
        if (item.availableStock !== item.totalStock) {
            alert('No se puede eliminar el producto porque tiene unidades prestadas. Regrese el stock primero.');
            return;
        }
        const confirmText = prompt(`Para confirmar la eliminación escribe "ELIMINAR". Producto: ${item.name}`);
        if (confirmText !== 'ELIMINAR') {
            alert('Eliminación cancelada.');
            return;
        }
        inventory = inventory.filter(i => i.id !== id);
        loans = loans.filter(loan => loan.productId !== id);
        alert('Producto eliminado exitosamente.');
        renderItems();
    }

    // Register return via prompt confirmation
    function registerReturn(loanId) {
        const loan = loans.find(l => l.id === loanId);
        if (!loan) { alert('Préstamo no encontrado.'); return; }
        const confirmText = prompt(`Confirme devolución escribiendo "SI". Préstamo: ${loan.productName} (${loan.quantity}) por ${loan.borrower}`);
        if (!confirmText || confirmText.toUpperCase() !== 'SI') {
            alert('Devolución cancelada.');
            return;
        }

        // Mark returned and update stock
        loan.isReturned = true;
        const item = inventory.find(i => i.id === loan.productId);
        if (item) item.availableStock += loan.quantity;
        alert('Devolución registrada correctamente.');
        renderItems();
    }

    // Renders loans table
    function renderLoans() {
        loansTableBody.innerHTML = '';
        const today = new Date().setHours(0, 0, 0, 0);
        let hasLoanToShow = false;

        loans.filter(l => !l.isReturned).forEach(loan => {
            const dueDate = new Date(loan.dueDate).setHours(0, 0, 0, 0);
            
            let statusText = 'Pendiente (a tiempo)';
            let statusClass = 'status-on-time';
            let daysLate = 0;

            if (dueDate < today) {
                const diffTime = Math.abs(today - dueDate);
                daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                statusText = `¡Vencido! (${daysLate} días de retraso)`;
                statusClass = 'status-late';
            }

            const row = loansTableBody.insertRow();
            row.className = statusClass;
            
            row.innerHTML = `
                <td data-label="Producto">${loan.productName}</td>
                <td data-label="Prestatario">${loan.borrower}</td>
                <td data-label="Cant. Prestada">${loan.quantity}</td>
                <td data-label="Fecha Préstamo">${loan.loanDate}</td>
                <td data-label="Fecha Límite">${loan.dueDate}</td>
                <td data-label="Días Retraso">${daysLate > 0 ? daysLate : '-'}</td>
                <td data-label="Estado">${statusText}</td>
                <td data-label="Acciones" class="actions-cell">
                    <button class="btn btn-primary btn-sm" onclick="window._returnPrompt(${loan.id})">Marcar Devolución</button>
                </td>
            `;
            hasLoanToShow = true;
        });
        
        emptyLoanMessage.style.display = hasLoanToShow ? 'none' : 'block';
    }

    // --- EVENT LISTENERS ---

    // Attach to Add/Actualizar button: now prompts for data
    addUpdateBtn.addEventListener('click', () => {
        // If editingItemId is set, go through prompt update flow for that item
        if (editingItemId) {
            editItem(editingItemId);
            editingItemId = null;
            cancelEdit();
        } else {
            addItemWithPrompt();
        }
    });

    cancelBtn.addEventListener('click', () => {
        // Reset any editing state
        editingItemId = null;
        cancelEdit();
        alert('Modo edición cancelado.');
    });

    // processLoanBtn and cancelLoanBtn kept for compatibility but not used
    processLoanBtn.addEventListener('click', () => { alert('Este botón no se usa: las acciones de préstamo ahora se realizan vía prompts en los botones de la tabla.'); });
    cancelLoanBtn.addEventListener('click', hideLoanForm);

    // Initial render
    renderItems();

    // Export prompt-based functions to global scope for onclick handlers in the table
    window._showLoanPrompt = showLoanForm;
    window._editPrompt = editItemPromptWrapper;
    window._deletePrompt = deleteItem;
    window._returnPrompt = registerReturn;
});
