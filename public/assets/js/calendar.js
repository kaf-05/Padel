
document.addEventListener('DOMContentLoaded', () => {
    const monthYearElement = document.getElementById('month-year');
    const weekRangeElement = document.getElementById('week-range');
    const scheduleGrid = document.getElementById('schedule-grid');
    const prevWeekButton = document.getElementById('prev-week');
    const nextWeekButton = document.getElementById('next-week');
    const todayButton = document.getElementById('today-btn');

    let currentDate = new Date();
    let courts = [];
    let currentUser = null;

    async function initializeCalendar() {
        await fetchUserStatus();
        try {
            const courtsResponse = await fetch('/api/courts');
            courts = await courtsResponse.json();
            if (!courts.length) {
                scheduleGrid.innerHTML = '<p class="text-red-500">No hay pistas configuradas.</p>';
                return;
            }
            renderWeekGrid();
        } catch (error) {
            console.error('Error initializing calendar:', error);
            scheduleGrid.innerHTML = '<p class="text-red-500">Error al cargar el calendario.</p>';
        }
    }

    async function fetchUserStatus() {
        try {
            const response = await fetch('/api/me');
            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
            }
        } catch (error) {
            console.error('Error fetching user status:', error);
        }
    }

    async function renderWeekGrid() {
        scheduleGrid.innerHTML = '<p>Cargando horarios...</p>';
        const startOfWeek = getStartOfWeek(currentDate);

        monthYearElement.textContent = startOfWeek.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        weekRangeElement.textContent = `${startOfWeek.getDate()} - ${endOfWeek.getDate()} de ${endOfWeek.toLocaleDateString('es-ES', { month: 'long' })}`;

        const timeSlots = generateTimeSlots();
        const days = Array.from({ length: 7 }, (_, i) => {
            const day = new Date(startOfWeek);
            day.setDate(day.getDate() + i);
            return day;
        });

        const schedule = await fetchScheduleForWeek(startOfWeek);

        let table = '<table class="w-full border-collapse">';
        // Header
        table += '<thead><tr class="border-b dark:border-gray-700"><th class="w-24"></th>';
        days.forEach(day => {
            table += `<th class="p-4 text-center text-sm font-medium text-gray-500 dark:text-gray-400">${day.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}<br><span class="text-lg font-bold text-gray-800 dark:text-white">${day.getDate()}</span></th>`;
        });
        table += '</tr></thead>';

        // Body
        table += '<tbody>';
        timeSlots.forEach(slot => {
            table += `<tr class="border-b dark:border-gray-700"><td class="p-4 text-center text-sm font-bold">${slot}</td>`;
            days.forEach(day => {
                const dateString = day.toISOString().split('T')[0];
                const slotDateTime = new Date(`${dateString}T${slot}:00`);
                const isBooked = schedule.some(booking => new Date(booking.start_time).getTime() === slotDateTime.getTime());

                let cellClass = 'p-2 text-center ';
                let cellContent = '';

                if (isBooked) {
                    cellClass += 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed';
                    cellContent = '<span class="text-gray-400">Ocupado</span>';
                } else {
                    cellClass += 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors cursor-pointer';
                    if (currentUser) {
                        cellContent = `<button data-court-id="${courts[0].id}" data-date="${dateString}" data-slot="${slot}" class="w-full h-full">Reservar</button>`;
                    } else {
                        cellContent = '<span class="text-xs text-center">Inicia sesión para reservar</span>';
                    }
                }
                table += `<td class="${cellClass}">${cellContent}</td>`;
            });
            table += '</tr>';
        });
        table += '</tbody></table>';

        scheduleGrid.innerHTML = table;
    }

    async function fetchScheduleForWeek(startOfWeek) {
        const dateString = startOfWeek.toISOString().split('T')[0];
         try {
            const scheduleResponse = await fetch(`/api/schedule?date=${dateString}`);
            return await scheduleResponse.json();
        } catch (error) {
            console.error('Error fetching schedule:', error);
            return [];
        }
    }

    function getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }

    function generateTimeSlots() {
        const slots = [];
        let hour = 9;
        let minute = 0;
        while (hour < 22) {
            slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
            minute += 90;
            if (minute >= 60) {
                hour += Math.floor(minute / 60);
                minute %= 60;
            }
        }
        return slots;
    }

    scheduleGrid.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-slot]');
        if (button && currentUser) {
            const { courtId, date, slot } = button.dataset;
            window.location.href = `/confirm.html?courtId=${courtId}&date=${date}&slot=${slot}`;
        }
    });

    prevWeekButton.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 7);
        renderWeekGrid();
    });

    nextWeekButton.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 7);
        renderWeekGrid();
    });

    todayButton.addEventListener('click', () => {
        currentDate = new Date();
        renderWeekGrid();
    });

    initializeCalendar();
});
