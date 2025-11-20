document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM ELEMENTS
    const productNameInput = document.getElementById('productName');
    const productQuantityInput = document.getElementById('productQuantity');
    const productPriceInput = document.getElementById('productPrice');
    const addUpdateBtn = document.getElementById('addUpdateBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const inventoryTableBody = document.querySelector('#inventoryTable tbody');
    const emptyMessage = document.getElementById('emptyMessage');
    
    // Loan Form Elements (NEW)
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
    
    // Muestra el formulario de préstamo y esconde el CRUD principal
    function showLoanForm(itemId) {
        const item = inventory.find(i => i.id === itemId);
        if (!item || item.availableStock === 0) {
            alert('No hay stock disponible para prestar este artículo.');
            return;
        }

        loaningItemId = itemId;
        loanProductName.textContent = item.name;
        loanProductStock.textContent = item.availableStock;
        loanQuantityInput.max = item.availableStock; // Set max for validation

        crudForm.style.display = 'none';
        loanForm.style.display = 'grid';
        
        loanQuantityInput.value = 1;
        borrowerNameInput.value = '';
        dueDateInput.value = '';
        borrowerNameInput.focus();
    }
    
    // Esconde el formulario de préstamo y muestra el CRUD principal
    function hideLoanForm() {
        loaningItemId = null;
        loanForm.style.display = 'none';
        crudForm.style.display = 'grid';
        cancelEdit(); // Ensure CRUD form is in 'Add' mode
    }

    // Valida que los campos del formulario principal tengan valores válidos
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

    // R: Renderiza la tabla de inventario
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
                        <button class="btn btn-info btn-sm" onclick="showLoanForm(${item.id})">Prestar</button>
                        <button class="btn btn-primary btn-sm" onclick="editItem(${item.id})">Editar</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteItem(${item.id})">Eliminar</button>
                    </td>
                `;
            });
        }
        renderLoans(); // Always update loans when inventory changes
    }

    // C: Agrega un nuevo producto
    function addItem() {
        const name = productNameInput.value.trim();
        const totalStock = parseInt(productQuantityInput.value);
        const price = parseFloat(productPriceInput.value);

        if (!validateForm(name, totalStock, price)) return;

        const newItem = {
            id: Date.now(),
            name,
            totalStock, 
            availableStock: totalStock, // Available stock equals total stock initially
            price
        };

        inventory.push(newItem);
        clearForm();
        renderItems();
        alert('Producto agregado exitosamente.');
    }

    // U: Carga datos para editar
    function editItem(id) {
        const itemToEdit = inventory.find(item => item.id === id);
        if (itemToEdit) {
            // Solo se puede editar el stock total si no hay préstamos pendientes
            const loanedCount = itemToEdit.totalStock - itemToEdit.availableStock;
            if (loanedCount > 0) {
                 alert(`No puedes modificar el Stock Total (actualmente ${itemToEdit.totalStock}) porque hay ${loanedCount} unidades prestadas. Solo puedes editar Nombre y Precio.`);
            }
            
            productNameInput.value = itemToEdit.name;
            productQuantityInput.value = itemToEdit.totalStock; // Muestra el stock total
            productPriceInput.value = itemToEdit.price;
            productQuantityInput.disabled = (loanedCount > 0); // Deshabilitar edición de cantidad si está prestado

            addUpdateBtn.textContent = 'Actualizar';
            addUpdateBtn.classList.remove('btn-primary');
            addUpdateBtn.classList.add('btn-info');
            cancelBtn.style.display = 'inline-block';
            editingItemId = id; 
        }
        hideLoanForm();
    }

    // U: Actualiza un producto existente
    function updateItem() {
        const name = productNameInput.value.trim();
        const newTotalStock = parseInt(productQuantityInput.value);
        const price = parseFloat(productPriceInput.value);

        if (!validateForm(name, newTotalStock, price)) return;

        const itemIndex = inventory.findIndex(item => item.id === editingItemId);
        if (itemIndex !== -1) {
            const item = inventory[itemIndex];
            const loanedCount = item.totalStock - item.availableStock;
            
            // Validation if trying to reduce stock below the loaned amount
            if (newTotalStock < loanedCount) {
                alert(`Error: No puedes establecer un Stock Total menor a la cantidad prestada (${loanedCount}).`);
                return;
            }
            
            // Calculate change in stock and update availableStock
            const stockDifference = newTotalStock - item.totalStock;
            item.availableStock += stockDifference;
            
            // Update item properties
            item.name = name;
            item.totalStock = newTotalStock;
            item.price = price;

            alert('Producto actualizado exitosamente.');
        }

        clearForm();
        renderItems();
        cancelEdit(); 
    }
    
    // D: Elimina un producto
    function deleteItem(id) {
        const item = inventory.find(i => i.id === id);
        if (item && item.availableStock !== item.totalStock) {
            alert('No se puede eliminar el producto porque tiene unidades prestadas. Regrese el stock primero.');
            return;
        }
        
        if (confirm('¿Estás seguro de que quieres eliminar este producto y todos sus datos?')) {
            inventory = inventory.filter(i => i.id !== id);
            // También elimina préstamos asociados (aunque deberían ser cero aquí)
            loans = loans.filter(loan => loan.productId !== id); 
            renderItems();
            alert('Producto eliminado exitosamente.');
        }
    }

    // Cancela el modo edición
    function cancelEdit() {
        clearForm();
        productQuantityInput.disabled = false;
        addUpdateBtn.textContent = 'Agregar Producto';
        addUpdateBtn.classList.remove('btn-info');
        addUpdateBtn.classList.add('btn-primary');
        cancelBtn.style.display = 'none';
        editingItemId = null; 
    }

    // --- LOAN ACTIONS ---

    // C: Procesa y registra un nuevo préstamo
    function processLoan() {
        const productId = loaningItemId;
        const item = inventory.find(i => i.id === productId);
        
        const quantity = parseInt(loanQuantityInput.value);
        const borrower = borrowerNameInput.value.trim();
        const dueDate = dueDateInput.value;
        
        // Basic validation
        if (!borrower || !dueDate || isNaN(quantity) || quantity <= 0 || quantity > item.availableStock) {
            alert('Por favor, complete todos los campos y asegúrese de que la cantidad sea válida y esté en stock.');
            return;
        }

        // 1. Register the loan transaction
        const newLoan = {
            id: Date.now(),
            productId: productId,
            productName: item.name,
            borrower: borrower,
            quantity: quantity,
            loanDate: new Date().toISOString().split('T')[0], // Today's date (YYYY-MM-DD)
            dueDate: dueDate,
            isReturned: false 
        };
        loans.push(newLoan);
        
        // 2. Update inventory stock
        item.availableStock -= quantity;

        alert(`Préstamo de ${quantity} x ${item.name} a ${borrower} registrado.`);
        
        hideLoanForm();
        renderItems();
    }
    
    // U: Marca un préstamo como devuelto y actualiza el stock
    function registerReturn(loanId) {
        if (!confirm('¿Confirmar la devolución de este ítem?')) return;

        const loanIndex = loans.findIndex(l => l.id === loanId);
        if (loanIndex !== -1) {
            const loan = loans[loanIndex];
            
            // 1. Update loan status
            loan.isReturned = true;
            
            // 2. Update inventory stock
            const item = inventory.find(i => i.id === loan.productId);
            if (item) {
                item.availableStock += loan.quantity;
            }

            alert(`Devolución de ${loan.productName} registrada y stock actualizado.`);
            renderItems(); // Re-render both tables
        }
    }

    // R: Renderiza la tabla de préstamos (pendientes o no devueltos a tiempo)
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
                // Cálculo de días de retraso
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
                    <button class="btn btn-primary btn-sm" onclick="registerReturn(${loan.id})">Marcar Devolución</button>
                </td>
            `;
            hasLoanToShow = true;
        });
        
        emptyLoanMessage.style.display = hasLoanToShow ? 'none' : 'block';
    }


    // --- EVENT LISTENERS ---

    addUpdateBtn.addEventListener('click', () => {
        if (editingItemId) {
            updateItem();
        } else {
            addItem();
        }
    });

    cancelBtn.addEventListener('click', cancelEdit);
    processLoanBtn.addEventListener('click', processLoan); // NEW: Process loan
    cancelLoanBtn.addEventListener('click', hideLoanForm); // NEW: Cancel loan form

    // Initial render
    renderItems();

    // Export functions to global scope for HTML onclick
    window.showLoanForm = showLoanForm;
    window.editItem = editItem;
    window.deleteItem = deleteItem;
    window.registerReturn = registerReturn; // NEW
});



