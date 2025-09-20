document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('design-canvas');
    const ctx = canvas.getContext('2d');
    const toolItems = document.querySelectorAll('.tool-item');
    const saveBtn = document.getElementById('save-project');
    const downloadBtn = document.getElementById('download-plan');
    const deleteBtn = document.getElementById('delete-element');
    const applyBtn = document.getElementById('apply-properties');
    const toolsPanel = document.getElementById('tools-panel');
    const propertiesPanel = document.getElementById('properties-panel');
    const instructionsPanel = document.getElementById('instructions-panel');
    const toggleToolsBtn = document.getElementById('toggle-tools');
    const togglePropertiesBtn = document.getElementById('toggle-properties');
    const toggleInstructionsBtn = document.getElementById('toggle-instructions');
    const closePanelBtns = document.querySelectorAll('.close-panel');
    const roomTypeSelect = document.getElementById('room-type');
    
    // Новые кнопки
    const clearAllBtn = document.getElementById('clear-all');
    const restoreBtn = document.getElementById('restore-deleted');
    const groupBtn = document.getElementById('group-elements');
    const ungroupBtn = document.getElementById('ungroup-elements');
    
    // Установка размеров canvas
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        draw();
    }
    
    // Масштабирование
    let scale = 1;
    const scaleStep = 0.1;
    const minScale = 0.5;
    const maxScale = 3;
    
    // Позиция
    let offsetX = 0;
    let offsetY = 0;
    
    // Перемещение холста
    let isDragging = false;
    let isRightDragging = false;
    let lastX, lastY;
    
    // Текущий инструмент
    let currentTool = 'room';
    
    // Элементы на плане
    let elements = [];
    const roomLabels = [];
    
    // История удалений
    let deletionHistory = [];
    const MAX_HISTORY = 50;
    
    // Выбранный элемент
    let selectedElement = null;
    
    // Множественное выделение
    let selectedElements = new Set();
    let isMultiSelect = false;
    
    // Группы объектов
    let groups = [];
    
    // Режим рисования комнаты
    let isDrawingRoom = false;
    let roomStartX, roomStartY;
    
    // Перемещение элемента
    let isDraggingElement = false;
    let dragElement = null;
    let dragOffsetX, dragOffsetY;
    
    // Перемещение группы
    let isDraggingGroup = false;
    let dragGroup = null;
    let dragStartX, dragStartY;
    
    // Изменение размера элемента
    let isResizing = false;
    let resizeElement = null;
    let resizeHandle = null;
    
    // Перемещение метки комната
    let isDraggingLabel = false;
    let dragLabel = null;
    
    // Подсветка комнаты при перемещении
    let currentRoomHighlight = null;
    
    // Инициализация
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Отрисовка сцены
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Рисуем сетку
        drawGrid();
        
        // Рисуем комнаты (подложка)
        elements.forEach(element => {
            if (element.type === 'room') {
                drawRoomBackground(element);
            }
        });
        
        // Рисуем все элементы
        elements.forEach(element => {
            drawElement(element);
        });
        
        // Рисуем группы
        groups.forEach(group => {
            drawGroup(group);
        });
        
        // Рисуем временную комнату при создании
        if (isDrawingRoom) {
            drawTempRoom();
        }
        
        // Подсветка выбранных элементов
        selectedElements.forEach(element => {
            highlightElement(element);
        });
        
        // Подсветка выбранного элемента (для свойств)
        if (selectedElement) {
            highlightSelectedElement(selectedElement);
        }
        
        // Подсветка текущей комнаты при перемещении мебели
        if (currentRoomHighlight && (isDraggingElement || isDraggingGroup)) {
            drawRoomHighlight(currentRoomHighlight);
        }
    }
    
    // Отрисовка сетки
    function drawGrid() {
        const gridSize = 20 * scale;
        const offsetGridX = offsetX % gridSize;
        const offsetGridY = offsetY % gridSize;
        
        ctx.beginPath();
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        
        // Вертикальные линии
        for (let x = -offsetGridX; x < canvas.width; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
        }
        
        // Горизонтальные линии
        for (let y = -offsetGridY; y < canvas.height; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
        }
        
        ctx.stroke();
        
        // Оси
        ctx.beginPath();
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        
        // Вертикальная ось
        ctx.moveTo(-offsetX, 0);
        ctx.lineTo(-offsetX, canvas.height);
        
        // Горизонтальная ось
        ctx.moveTo(0, -offsetY);
        ctx.lineTo(canvas.width, -offsetY);
        
        ctx.stroke();
    }
    
    // Отрисовка фона комнаты
    function drawRoomBackground(room) {
        const x = room.x * scale - offsetX;
        const y = room.y * scale - offsetY;
        const width = room.width * scale;
        const height = room.height * scale;
        
        ctx.fillStyle = 'rgba(236, 240, 241, 0.3)';
        ctx.fillRect(x, y, width, height);
    }
    
    // Отрисовка элемента
    function drawElement(element) {
        // Пропускаем элементы, которые в группах
        if (element.groupId) return;
        
        const x = element.x * scale - offsetX;
        const y = element.y * scale - offsetY;
        const width = element.width * scale;
        const height = element.height * scale;
        
        ctx.save();
        
        // Поворот элемента
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(element.rotation * Math.PI / 180);
        ctx.translate(-centerX, -centerY);
        
        // Рисуем элемент
        if (element.type === 'wall') {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + width, y + height);
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 4 * scale;
            ctx.stroke();
        } else if (element.type === 'room') {
            // Комната - только контур без заливки
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]);
            ctx.strokeRect(x, y, width, height);
            ctx.setLineDash([]);
        } else if (element.type === 'room-label') {
            // Для меток рисуем текст
            ctx.fillStyle = element.color;
            ctx.font = `${Math.min(16 * scale, 16)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(element.name, x, y);
        } else {
            // Для мебели рисуем изображение
            if (element.image) {
                ctx.drawImage(element.image, x, y, width, height);
            } else {
                // Fallback если изображение не загружено
                ctx.fillStyle = element.color;
                ctx.fillRect(x, y, width, height);
            }
            
            // Название элемента
            ctx.fillStyle = '#333';
            ctx.font = `${Math.min(12 * scale, 14)}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(element.name, x + width/2, y + height + 15 * scale);
        }
        
        ctx.restore();
    }
    
    // Отрисовка группы
    function drawGroup(group) {
        const elementsInGroup = elements.filter(el => el.groupId === group.id);
        if (elementsInGroup.length === 0) return;
        
        // Находим границы группы
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        elementsInGroup.forEach(element => {
            minX = Math.min(minX, element.x);
            minY = Math.min(minY, element.y);
            maxX = Math.max(maxX, element.x + element.width);
            maxY = Math.max(maxY, element.y + element.height);
        });
        
        const x = minX * scale - offsetX;
        const y = minY * scale - offsetY;
        const width = (maxX - minX) * scale;
        const height = (maxY - minY) * scale;
        
        // Рисуем границу группы
        ctx.strokeStyle = '#9b59b6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(x, y, width, height);
        ctx.setLineDash([]);
        
        // Рисуем элементы группы
        elementsInGroup.forEach(element => {
            drawElement(element);
        });
        
        // Подписываем группу
        ctx.fillStyle = '#9b59b6';
        ctx.font = `${Math.min(14 * scale, 14)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(`Группа (${elementsInGroup.length} элементов)`, x + width/2, y - 10);
    }
    
    // Отрисовка подсветки комнаты
    function drawRoomHighlight(room) {
        const x = room.x * scale - offsetX;
        const y = room.y * scale - offsetY;
        const width = room.width * scale;
        const height = room.height * scale;
        
        ctx.fillStyle = 'rgba(52, 152, 219, 0.1)';
        ctx.fillRect(x, y, width, height);
        
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
    }
    
    // Отрисовка временной комнаты
    function drawTempRoom() {
        const x = roomStartX * scale - offsetX;
        const y = roomStartY * scale - offsetY;
        const width = (currentX - roomStartX) * scale;
        const height = (currentY - roomStartY) * scale;
        
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(x, y, width, height);
        ctx.setLineDash([]);
        
        // Размеры комнаты
        ctx.fillStyle = '#3498db';
        ctx.font = `${12 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(`${(Math.abs(width) / scale).toFixed(1)}м x ${(Math.abs(height) / scale).toFixed(1)}м`, 
                     x + width/2, y + height/2);
    }
    
    // Подсветка элемента
    function highlightElement(element) {
        const x = element.x * scale - offsetX;
        const y = element.y * scale - offsetY;
        const width = element.type === 'room-label' ? 0 : element.width * scale;
        const height = element.type === 'room-label' ? 0 : element.height * scale;
        
        ctx.save();
        
        if (element.type === 'room-label') {
            ctx.beginPath();
            ctx.arc(x, y, 20 * scale, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(231, 76, 60, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            ctx.strokeStyle = 'rgba(231, 76, 60, 0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);
        }
        
        ctx.restore();
    }
    
    // Подсветка выбранного элемента (для свойств)
    function highlightSelectedElement(element) {
        const x = element.x * scale - offsetX;
        const y = element.y * scale - offsetY;
        const width = element.type === 'room-label' ? 0 : element.width * scale;
        const height = element.type === 'room-label' ? 0 : element.height * scale;
        
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        
        if (element.type === 'room-label') {
            // Для текста рисуем круг вокруг
            ctx.beginPath();
            ctx.arc(x, y, 20 * scale, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.strokeRect(x, y, width, height);
        }
        
        ctx.setLineDash([]);
        
        // Маркеры изменения размера (только для не-текстовых элементов)
        if (element.type !== 'room-label' && element.type !== 'wall' && element.type !== 'room') {
            drawResizeHandles(element);
        }
    }
    
    // Рисуем маркеры изменения размера
    function drawResizeHandles(element) {
        const x = element.x * scale - offsetX;
        const y = element.y * scale - offsetY;
        const width = element.width * scale;
        const height = element.height * scale;
        
        // Угловые маркеры
        const handles = [
            { x: x + width, y: y + height, type: 'se' } // Юго-восточный угол
        ];
        
        // Отрисовка маркеров
        handles.forEach(handle => {
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.arc(handle.x, handle.y, 5, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    // Выбор инструмента
    toolItems.forEach(item => {
        item.addEventListener('click', () => {
            toolItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentTool = item.dataset.type;
            
            // Для комнаты активируем режим рисования
            isDrawingRoom = currentTool === 'room';
            
            // Сбрасываем множественное выделение
            selectedElements.clear();
            selectedElement = null;
            draw();
        });
    });
    
    // Координаты мыши в координатах холста
    function getCanvasCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left + offsetX) / scale,
            y: (e.clientY - rect.top + offsetY) / scale
        };
    }
    
    // Словарь русских названий для элементов
    const elementNames = {
        'wall': 'Стена',
        'door': 'Дверь',
        'window': 'Окно',
        'room': 'Комната',
        'room-label': 'Название комнаты',
        'sofa': 'Диван',
        'table': 'Стол',
        'tv': 'Телевизор',
        'armchair': 'Кресло',
        'bookshelf': 'Книжный шкаф',
        'rug': 'Ковер',
        'bed': 'Кровать',
        'wardrobe': 'Шкаф',
        'dresser': 'Комод',
        'mirror': 'Зеркало',
        'nightstand': 'Тумбочка',
        'lamp': 'Лампа',
        'fridge': 'Холодильник',
        'oven': 'Плита',
        'sink': 'Раковина',
        'cabinet': 'Шкафчик',
        'dishwasher': 'Посудомоечная машина',
        'table-kitchen': 'Обеденный стол',
        'bathtub': 'Ванна',
        'shower': 'Душ',
        'toilet': 'Унитаз',
        'sink-bathroom': 'Раковина',
        'cabinet-bathroom': 'Шкафчик для ванной',
        'mirror-bathroom': 'Зеркало в ванной',
        'plant': 'Растение',
        'lamp-floor': 'Торшер',
        'chair': 'Стул',
        'desk': 'Письменный стол',
        'washing-machine': 'Стиральная машина',
        'heater': 'Обогреватель'
    };
    
    // URL изображений для элементов (вид сверху)
    const elementImageUrls = {
        'wall': 'https://img.freepik.com/free-icon/wall_318-258200.jpg?size=626&ext=jpg',
        'door': 'https://cdn3.iconfinder.com/data/icons/construction-2-flat/58/Construction_-_Flat_-_080_-_Door_Plan-1024.png',
        'window': 'https://iconsvg.co/icon/08dbb3cd-1b79-4e73-8115-fe9e24ffc7a2.svg',
        'room': 'https://pngimg.com/uploads/square/square_PNG41.png',
        'room-label': 'https://cdn-icons-png.flaticon.com/512/447/447031.png',
        'sofa': 'https://sanatmobilya.com/wp-content/uploads/2024/10/sofa-1.png',
        'table': 'https://thumbs.dreamstime.com/b/desk-chair-top-view-outline-icon-linear-style-sign-mobile-concept-web-design-workspace-interior-furniture-simple-line-131362916.jpg',
        'tv': 'https://cdn2.iconfinder.com/data/icons/ios-7-icons/50/tv-1024.png',
        'armchair': 'https://cdn-icons-png.freepik.com/512/99/99342.png',
        'bookshelf': 'https://cdn3.iconfinder.com/data/icons/furniture-outline-7/60/Furniture_ISO_-_Outline_-_056_-_Book_Case-1024.png',
        'rug': 'https://cdn-icons-png.flaticon.com/512/874/874381.png',
        'bed': 'https://cdn4.iconfinder.com/data/icons/bedding/48/70_bedding-blanket-duvet-bedroom-bed-double-1024.png',
        'wardrobe': 'https://avatars.mds.yandex.net/i?id=5d467a97d5c074025d277a26d96eeea09f28e543-9589172-images-thumbs&n=13',
        'dresser': 'https://avatars.mds.yandex.net/i?id=b16d3a2685c8642ae00653f1301d19ec_l-5220681-images-thumbs&n=13',
        'mirror': 'https://cdn3.iconfinder.com/data/icons/interiors-furnitures-lined/1024/mirror-2-1024.png',
        'nightstand': 'https://avatars.mds.yandex.net/i?id=b16d3a2685c8642ae00653f1301d19ec_l-5220681-images-thumbs&n=13',
        'lamp': 'https://avatars.mds.yandex.net/i?id=546b7d00ba2a5a8763f284ee85b2288b_l-7822413-images-thumbs&n=13',
        'fridge': 'https://avatars.mds.yandex.net/i?id=1c9914bdfc74863d4f8a4e7e842bf630_l-4406871-images-thumbs&n=13',
        'oven': 'https://avatars.mds.yandex.net/i?id=fa92629e7e8a45d916fc4e5e303e7b07_l-8312178-images-thumbs&n=13',
        'sink': 'https://images.icon-icons.com/2070/PNG/512/sink_icon_126779.png',
        'cabinet': 'https://static.vecteezy.com/system/resources/previews/016/598/905/non_2x/cupboard-icon-design-free-vector.jpg',
        'dishwasher': 'https://cdn4.iconfinder.com/data/icons/cleaning-35/64/dishwasher-machine-cleaning-dish-1024.png',
        'table-kitchen': 'https://cdn-icons-png.freepik.com/512/11936/11936207.png',
        'bathtub': 'https://cdn-icons-png.freepik.com/512/99/99333.png',
        'shower': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Shower_symbol.svg/640px-Shower_symbol.svg.png',
        'toilet': 'https://cdn-icons-png.flaticon.com/512/1047/1047139.png',
        'sink-bathroom': 'https://cdn-icons-png.flaticon.com/512/14396/14396472.png',
        'cabinet-bathroom': 'https://cdn-icons-png.flaticon.com/512/14396/14396483.png',
        'mirror-bathroom': 'https://cdn-icons-png.flaticon.com/512/14396/14396481.png',
        'plant': 'https://cdn-icons-png.flaticon.com/512/14396/14396486.png',
        'lamp-floor': 'https://cdn-icons-png.flaticon.com/512/14396/14396487.png',
        'chair': 'https://cdn-icons-png.flaticon.com/512/14396/14396488.png',
        'desk': 'https://cdn-icons-png.flaticon.com/512/14396/14396489.png',
        'washing-machine': 'https://cdn-icons-png.flaticon.com/512/14396/14396490.png',
        'heater': 'https://cdn-icons-png.flaticon.com/512/14396/14396491.png'
    };
    
    // Создание нового элемента
    function createElement(type, x, y, width, height) {
        const nameInput = document.getElementById('element-name');
        const colorInput = document.getElementById('element-color');
        const roomType = roomTypeSelect.value;
        
        // Для стен делаем горизонтальное размещение
        if (type === 'wall') {
            width = Math.max(width, 0.5);
            height = 0.1; // Толщина стены
        }
        
        // Для комнат делаем минимальный размер
        if (type === 'room') {
            width = Math.max(width, 1);
            height = Math.max(height, 1);
        }
        
        const newElement = {
            id: Date.now(),
            type: type,
            name: elementNames[type] || type,
            x: type === 'wall' ? Math.round(x / 10) * 10 : x, // Привязка к сетке для стен
            y: type === 'wall' ? Math.round(y / 10) * 10 : y,
            width: width,
            height: height,
            color: colorInput.value,
            roomType: roomType,
            rotation: 0
        };
        
        // Загрузка изображения
        const img = new Image();
        img.src = elementImageUrls[type] || '';
        newElement.image = img;
        
        // Определяем комнату для мебели
        if (type !== 'wall' && type !== 'door' && type !== 'window' && type !== 'room' && type !== 'room-label') {
            newElement.roomId = findRoomAt(x + width/2, y + height/2)?.id || null;
        }
        
        elements.push(newElement);
        selectedElement = newElement;
        updatePropertiesPanel(newElement);
        draw();
    }
    
    // Создание метки комнаты
    function createRoomLabel(x, y) {
        const labelText = prompt('Введите название комнаты:', 'Гостиная') || 'Комната';
        const roomType = roomTypeSelect.value;
        
        const label = {
            id: Date.now(),
            type: 'room-label',
            name: labelText,
            x: x,
            y: y,
            width: 0,
            height: 0,
            color: '#000',
            roomType: roomType,
            rotation: 0
        };
        
        elements.push(label);
        selectedElement = label;
        updatePropertiesPanel(label);
        draw();
    }
    
    // Поиск комнаты по координатам
    function findRoomAt(x, y) {
        for (let i = elements.length - 1; i >= 0; i--) {
            const el = elements[i];
            if (el.type === 'room' && 
                x >= el.x && x <= el.x + el.width &&
                y >= el.y && y <= el.y + el.height) {
                return el;
            }
        }
        return null;
    }
    
    // Проверка, находится ли элемент в комнате
    function isElementInRoom(element, room) {
        if (!room) return true;
        
        const elementRight = element.x + element.width;
        const elementBottom = element.y + element.height;
        const roomRight = room.x + room.width;
        const roomBottom = room.y + room.height;
        
        return (
            element.x >= room.x &&
            element.y >= room.y &&
            elementRight <= roomRight &&
            elementBottom <= roomBottom
        );
    }
    
    // Ограничение позиции элемента в пределах комнаты
    function constrainToRoom(element, newX, newY) {
        if (!element.roomId) return { x: newX, y: newY };
        
        const room = elements.find(r => r.id === element.roomId);
        if (!room) return { x: newX, y: newY };
        
        let constrainedX = newX;
        let constrainedY = newY;
        
        // Проверка границ по X
        if (newX < room.x) {
            constrainedX = room.x;
        } else if (newX + element.width > room.x + room.width) {
            constrainedX = room.x + room.width - element.width;
        }
        
        // Проверка границ по Y
        if (newY < room.y) {
            constrainedY = room.y;
        } else if (newY + element.height > room.y + room.height) {
            constrainedY = room.y + room.height - element.height;
        }
        
        return { x: constrainedX, y: constrainedY };
    }
    
    // Создание группы элементов
    function createGroup() {
        if (selectedElements.size < 2) {
            alert('Выберите хотя бы 2 элемента для группировки');
            return;
        }
        
        // Увеличиваем лимит группировки
        if (selectedElements.size > 50) {
            alert('Можно группировать не более 50 элементов');
            return;
        }
        
        const groupId = Date.now();
        const groupElements = [];
        
        selectedElements.forEach(element => {
            element.groupId = groupId;
            // Сохраняем оригинальные позиции для перемещения группы
            element.originalX = element.x;
            element.originalY = element.y;
            groupElements.push(element);
        });
        
        groups.push({
            id: groupId,
            elementIds: Array.from(selectedElements).map(el => el.id),
            roomId: groupElements[0].roomId || null
        });
        
        selectedElements.clear();
        draw();
    }
    
    // Удаление группы
    function ungroup() {
        if (!selectedElement) {
            alert('Выберите элемент из группы');
            return;
        }
        
        const groupId = selectedElement.groupId;
        if (!groupId) {
            alert('Элемент не принадлежит группе');
            return;
        }
        
        // Удаляем группу
        groups = groups.filter(group => group.id !== groupId);
        
        // Удаляем привязку элементов к группе
        elements.forEach(element => {
            if (element.groupId === groupId) {
                delete element.groupId;
            }
        });
        
        selectedElement = null;
        draw();
    }
    
    // Начало рисования комнаты
    let currentX, currentY;
    
    canvas.addEventListener('mousedown', (e) => {
        const pos = getCanvasCoordinates(e);
        
        // Правая кнопка мыши - перемещение карты
        if (e.button === 2) {
            isRightDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            canvas.style.cursor = 'grabbing';
            return;
        }
        
        // Проверка на маркер изменения размера
        if (selectedElement) {
            const handleX = (selectedElement.x + selectedElement.width) * scale - offsetX;
            const handleY = (selectedElement.y + selectedElement.height) * scale - offsetY;
            const dist = Math.sqrt(Math.pow(e.clientX - handleX, 2) + Math.pow(e.clientY - handleY, 2));
            
            if (dist < 10) {
                isResizing = true;
                resizeElement = selectedElement;
                return;
            }
        }
        
        // Проверка на элемент
        for (let i = elements.length - 1; i >= 0; i--) {
            const el = elements[i];
            
            if (el.type === 'room-label') {
                // Для меток проверяем область вокруг текста
                const dist = Math.sqrt(Math.pow(pos.x - el.x, 2) + Math.pow(pos.y - el.y, 2));
                if (dist < 20) {
                    // Множественное выделение
                    if (e.ctrlKey) {
                        if (selectedElements.has(el)) {
                            selectedElements.delete(el);
                        } else {
                            selectedElements.add(el);
                        }
                        selectedElement = el;
                    } else {
                        selectedElements.clear();
                        selectedElements.add(el);
                        selectedElement = el;
                    }
                    updatePropertiesPanel(el);
                    isDraggingLabel = true;
                    dragLabel = el;
                    dragOffsetX = pos.x - el.x;
                    dragOffsetY = pos.y - el.y;
                    draw();
                    return;
                }
            } else {
                // Для других элементов
                if (pos.x >= el.x && pos.x <= el.x + el.width &&
                    pos.y >= el.y && pos.y <= el.y + el.height) {
                    // Множественное выделение
                    if (e.ctrlKey) {
                        if (selectedElements.has(el)) {
                            selectedElements.delete(el);
                        } else {
                            selectedElements.add(el);
                        }
                        selectedElement = el;
                    } else {
                        selectedElements.clear();
                        selectedElements.add(el);
                        selectedElement = el;
                    }
                    updatePropertiesPanel(el);
                    isDraggingElement = true;
                    dragElement = el;
                    dragOffsetX = pos.x - el.x;
                    dragOffsetY = pos.y - el.y;
                    
                    // Проверка на группу
                    if (el.groupId) {
                        isDraggingGroup = true;
                        dragGroup = groups.find(g => g.id === el.groupId);
                        dragStartX = pos.x;
                        dragStartY = pos.y;
                    }
                    
                    draw();
                    return;
                }
            }
        }
        
        // Если не попали в элемент, начинаем рисование
        if (currentTool === 'room') {
            isDrawingRoom = true;
            roomStartX = pos.x;
            roomStartY = pos.y;
            selectedElements.clear();
            selectedElement = null;
        } else if (currentTool === 'room-label') {
            createRoomLabel(pos.x, pos.y);
            selectedElements.clear();
        } else if (currentTool) {
            createElement(currentTool, pos.x, pos.y, 
                         parseFloat(document.getElementById('element-width').value),
                         parseFloat(document.getElementById('element-height').value));
            selectedElements.clear();
        }
        
        // Если кликнули на пустое место, сбрасываем выделение
        if (!e.ctrlKey) {
            selectedElements.clear();
            selectedElement = null;
            draw();
        }
        
        // Сбрасываем подсветку комнаты
        currentRoomHighlight = null;
    });
    
    // Перемещение мыши
    canvas.addEventListener('mousemove', (e) => {
        const pos = getCanvasCoordinates(e);
        currentX = pos.x;
        currentY = pos.y;
        
        if (isRightDragging) {
            offsetX -= (e.clientX - lastX);
            offsetY -= (e.clientY - lastY);
            lastX = e.clientX;
            lastY = e.clientY;
            draw();
        } else if (isDrawingRoom) {
            draw();
        } else if (isDraggingElement && dragElement) {
            // Рассчитываем новую позицию
            let newX = currentX - dragOffsetX;
            let newY = currentY - dragOffsetY;
            
            // Для стен делаем привязку к сетке
            if (dragElement.type === 'wall') {
                newX = Math.round(newX / 10) * 10;
                newY = Math.round(newY / 10) * 10;
            }
            
            // Ограничиваем перемещение мебели в пределах комнаты
            if (dragElement.roomId) {
                const constrainedPos = constrainToRoom(dragElement, newX, newY);
                newX = constrainedPos.x;
                newY = constrainedPos.y;
                
                // Подсвечиваем текущую комнату
                currentRoomHighlight = elements.find(r => r.id === dragElement.roomId);
            }
            
            dragElement.x = newX;
            dragElement.y = newY;
            
            draw();
        } else if (isDraggingLabel && dragLabel) {
            dragLabel.x = currentX - dragOffsetX;
            dragLabel.y = currentY - dragOffsetY;
            draw();
        } else if (isDraggingGroup && dragGroup) {
            const dx = currentX - dragStartX;
            const dy = currentY - dragStartY;
            
            // Перемещаем все элементы группы
            const groupElements = elements.filter(el => el.groupId === dragGroup.id);
            
            groupElements.forEach(element => {
                let newX = element.originalX + dx;
                let newY = element.originalY + dy;
                
                // Ограничиваем перемещение в пределах комнаты
                if (element.roomId) {
                    const constrainedPos = constrainToRoom(element, newX, newY);
                    newX = constrainedPos.x;
                    newY = constrainedPos.y;
                }
                
                element.x = newX;
                element.y = newY;
            });
            
            // Подсвечиваем комнату группы
            if (dragGroup.roomId) {
                currentRoomHighlight = elements.find(r => r.id === dragGroup.roomId);
            }
            
            draw();
        } else if (isResizing && resizeElement) {
            let newWidth = currentX - resizeElement.x;
            let newHeight = currentY - resizeElement.y;
            
            // Обеспечиваем минимальный размер
            if (resizeElement.type !== 'room-label') {
                newWidth = Math.max(newWidth, 0.5);
                newHeight = Math.max(newHeight, 0.5);
            }
            
            // Ограничиваем размеры в пределах комнаты
            if (resizeElement.roomId) {
                const room = elements.find(r => r.id === resizeElement.roomId);
                if (room) {
                    const maxWidth = room.x + room.width - resizeElement.x;
                    const maxHeight = room.y + room.height - resizeElement.y;
                    newWidth = Math.min(newWidth, maxWidth);
                    newHeight = Math.min(newHeight, maxHeight);
                }
            }
            
            resizeElement.width = newWidth;
            resizeElement.height = newHeight;
            
            updatePropertiesPanel(resizeElement);
            draw();
        }
        
        // Подсветка элементов при наведении
        if (!isDraggingElement && !isDraggingLabel && !isResizing && !isDrawingRoom && !isDraggingGroup) {
            let hoveredElement = null;
            
            for (let i = elements.length - 1; i >= 0; i--) {
                const el = elements[i];
                
                if (el.type === 'room-label') {
                    const dist = Math.sqrt(Math.pow(pos.x - el.x, 2) + Math.pow(pos.y - el.y, 2));
                    if (dist < 20) {
                        hoveredElement = el;
                        break;
                    }
                } else {
                    if (pos.x >= el.x && pos.x <= el.x + el.width &&
                        pos.y >= el.y && pos.y <= el.y + el.height) {
                        hoveredElement = el;
                        break;
                    }
                }
            }
            
            if (hoveredElement) {
                canvas.style.cursor = 'move';
            } else {
                canvas.style.cursor = 'default';
            }
        }
    });
    
    // Отпускание кнопки мыши
    canvas.addEventListener('mouseup', (e) => {
        if (isDrawingRoom) {
            const pos = getCanvasCoordinates(e);
            const width = pos.x - roomStartX;
            const height = pos.y - roomStartY;
            
            if (Math.abs(width) > 0.5 && Math.abs(height) > 0.5) {
                createElement('room', roomStartX, roomStartY, width, height);
            }
            
            isDrawingRoom = false;
            draw();
        }
        
        isDraggingElement = false;
        dragElement = null;
        isDraggingLabel = false;
        dragLabel = null;
        isResizing = false;
        resizeElement = null;
        isRightDragging = false;
        isDraggingGroup = false;
        dragGroup = null;
        canvas.style.cursor = 'default';
        
        // Обновляем оригинальные позиции в группе
        if (dragGroup) {
            const groupElements = elements.filter(el => el.groupId === dragGroup.id);
            groupElements.forEach(element => {
                element.originalX = element.x;
                element.originalY = element.y;
            });
        }
        
        // Сбрасываем подсветку комнаты
        currentRoomHighlight = null;
    });
    
    // Обновление панели свойств
    function updatePropertiesPanel(element) {
        document.getElementById('element-name').value = element.name;
        
        if (element.type === 'room-label') {
            document.getElementById('element-width').disabled = true;
            document.getElementById('element-height').disabled = true;
            document.getElementById('room-type-group').style.display = 'block';
        } else {
            document.getElementById('element-width').disabled = false;
            document.getElementById('element-height').disabled = false;
            document.getElementById('element-width').value = element.width.toFixed(1);
            document.getElementById('element-height').value = element.height.toFixed(1);
            document.getElementById('room-type-group').style.display = element.type === 'room' ? 'block' : 'none';
        }
        
        document.getElementById('element-color').value = element.color;
        document.getElementById('element-rotation').value = element.rotation;
        roomTypeSelect.value = element.roomType;
    }
    
    // Функция добавления в историю удалений
    function addToHistory(elementsToSave, type) {
        // Не сохраняем пустые операции
        if (!elementsToSave || elementsToSave.length === 0) return;
        
        // Ограничиваем размер истории
        if (deletionHistory.length >= MAX_HISTORY) {
            deletionHistory.shift(); // Удаляем самую старую запись
        }
        
        if (type === 'single') {
            deletionHistory.push({
                type: 'single',
                element: elementsToSave[0],
                timestamp: new Date()
            });
        } else {
            deletionHistory.push({
                type: type,
                elements: elementsToSave,
                timestamp: new Date()
            });
        }
    }
    
    // Удаление элемента
    deleteBtn.addEventListener('click', () => {
        if (selectedElement) {
            const index = elements.findIndex(el => el.id === selectedElement.id);
            if (index !== -1) {
                // Сохраняем удаляемый элемент в истории
                addToHistory([elements[index]], 'single');
                
                elements.splice(index, 1);
                selectedElement = null;
                draw();
            }
        }
    });
    
    // Очистка всего холста
    clearAllBtn.addEventListener('click', () => {
        if (elements.length === 0) {
            alert('На холсте уже нет элементов!');
            return;
        }
        
        // Сохраняем текущее состояние в истории
        addToHistory([...elements], 'clear');
        
        // Очищаем холст
        elements = [];
        groups = [];
        selectedElements.clear();
        selectedElement = null;
        draw();
        
        alert('Все элементы удалены. Вы можете восстановить их, нажав "Восстановить".');
    });
    
    // Восстановление удаленных элементов
    restoreBtn.addEventListener('click', () => {
        if (deletionHistory.length === 0) {
            alert('Нет элементов для восстановления');
            return;
        }
        
        const historyItem = deletionHistory.pop();
        
        if (historyItem.type === 'single') {
            // Восстановление одного элемента
            elements.push(historyItem.element);
            alert(`Восстановлен элемент: ${historyItem.element.name}`);
        } else if (historyItem.type === 'clear') {
            // Восстановление всех элементов
            elements = [...historyItem.elements];
            alert(`Восстановлено ${historyItem.elements.length} элементов`);
        } else if (historyItem.type === 'multiple') {
            // Восстановление группы элементов
            elements.push(...historyItem.elements);
            alert(`Восстановлено ${historyItem.elements.length} элементов`);
        }
        
        draw();
    });
    
    // Группировка элементов
    groupBtn.addEventListener('click', createGroup);
    
    // Разгруппировка элементов
    ungroupBtn.addEventListener('click', ungroup);
    
    // Сохранение проекта
    saveBtn.addEventListener('click', () => {
        const projectData = JSON.stringify({
            elements: elements,
            groups: groups
        });
        localStorage.setItem('interiorProject', projectData);
        alert('Проект успешно сохранен!');
    });
    
    // Скачивание плана
    downloadBtn.addEventListener('click', () => {
        const projectData = JSON.stringify({
            elements: elements,
            groups: groups
        }, null, 2);
        const blob = new Blob([projectData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'interior-design-plan.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    
    // Переключение панелей
    function togglePanel(panel, btn) {
        const isActive = panel.classList.contains('active');
        
        // Закрываем все панели
        toolsPanel.classList.remove('active');
        propertiesPanel.classList.remove('active');
        instructionsPanel.classList.remove('active');
        
        // Снимаем активность со всех кнопок
        document.querySelectorAll('.control-btn').forEach(b => {
            b.classList.remove('active');
        });
        
        // Открываем нужную панель
        if (!isActive) {
            panel.classList.add('active');
            btn.classList.add('active');
        }
    }
    
    toggleToolsBtn.addEventListener('click', () => togglePanel(toolsPanel, toggleToolsBtn));
    togglePropertiesBtn.addEventListener('click', () => togglePanel(propertiesPanel, togglePropertiesBtn));
    toggleInstructionsBtn.addEventListener('click', () => togglePanel(instructionsPanel, toggleInstructionsBtn));
    
    // Закрытие панелей
    closePanelBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const panel = e.target.closest('.tools-panel, .properties-panel, .instructions-panel');
            panel.classList.remove('active');
            
            // Снимаем активность с кнопки
            document.querySelectorAll('.control-btn').forEach(b => {
                b.classList.remove('active');
            });
        });
    });
    
    // Запрещаем контекстное меню на холсте
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    // Масштабирование колесом мыши
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        // Ctrl+колесо для более точного масштабирования
        const zoomFactor = e.ctrlKey ? 0.05 : 0.1;
        const delta = e.deltaY > 0 ? -zoomFactor : zoomFactor;
        const newScale = Math.min(maxScale, Math.max(minScale, scale + delta));
        
        // Масштабирование относительно курсора
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / scale;
        const mouseY = (e.clientY - rect.top) / scale;
        
        scale = newScale;
        
        // Корректировка смещения для сохранения позиции курсора
        offsetX = mouseX * scale - (e.clientX - rect.left);
        offsetY = mouseY * scale - (e.clientY - rect.top);
        
        draw();
    });
    
    // Загрузка сохраненного проекта
    const savedProject = localStorage.getItem('interiorProject');
    if (savedProject) {
        try {
            const parsed = JSON.parse(savedProject);
            elements = parsed.elements || [];
            groups = parsed.groups || [];
            
            // Перезагружаем изображения
            elements.forEach(element => {
                if (elementImageUrls[element.type]) {
                    const img = new Image();
                    img.src = elementImageUrls[element.type];
                    element.image = img;
                }
            });
            
            draw();
        } catch (e) {
            console.error('Ошибка загрузки проекта:', e);
        }
    }
    
    // Обработка клавиши Ctrl для множественного выбора
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Control') {
            isMultiSelect = true;
            canvas.style.cursor = 'crosshair';
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.key === 'Control') {
            isMultiSelect = false;
            canvas.style.cursor = 'default';
        }
    });
});