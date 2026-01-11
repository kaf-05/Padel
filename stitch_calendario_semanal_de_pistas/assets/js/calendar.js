
document.addEventListener('DOMContentLoaded', () => {
    const monthYearElement = document.getElementById('month-year');
    const weekDaysContainer = document.getElementById('week-days');
    const scheduleContainer = document.getElementById('schedule-container');
    const prevWeekButton = document.getElementById('prev-week');
    const nextWeekButton = document.getElementById('next-week');
    const todayButton = document.getElementById('today-btn');

    let currentDate = new Date();
    let selectedDate = new Date();
    let courts = [];

    async function initializeCalendar() {
        try {
            const courtsResponse = await fetch('/api/courts');
            courts = await courtsResponse.json();
            if (!courts.length) {
                scheduleContainer.innerHTML = '<p class="text-red-500">No hay pistas configuradas.</p>';
                return;
            }
            renderWeek();
            fetchScheduleForDate(selectedDate);
        } catch (error) {
            console.error('Error initializing calendar:', error);
            scheduleContainer.innerHTML = '<p class="text-red-500">Error al cargar el calendario.</p>';
        }
    }

    function renderWeek() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Monday of the current week
        const startOfWeek = new Date(currentDate);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);

        monthYearElement.textContent = startOfWeek.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        weekDaysContainer.innerHTML = '';

        for (let i = 0; i < 7; i++) {
            const weekDay = new Date(startOfWeek);
            weekDay.setDate(startOfWeek.getDate() + i);

            const dayElement = document.createElement('div');
            dayElement.dataset.date = weekDay.toISOString().split('T')[0];

            const isSelected = weekDay.toDateString() === selectedDate.toDateString();
            const isToday = weekDay.toDateString() === today.toDateString();

            let classes = 'flex flex-col items-center justify-center min-w-[60px] h-[72px] rounded-xl border transition-colors cursor-pointer ';
            if (isSelected) {
                classes += 'bg-primary text-black shadow-lg transform scale-105 ring-2 ring-primary ring-offset-2 ring-offset-white dark:ring-offset-background-dark';
            } else if (isToday) {
                 classes += 'border-primary bg-primary/10';
            }else {
                classes += 'border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark hover:border-primary';
            }

            dayElement.className = classes;
            dayElement.innerHTML = `
                <span class="text-xs font-medium">${weekDay.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}</span>
                <span class="text-lg font-bold">${weekDay.getDate()}</span>
            `;

            dayElement.addEventListener('click', () => {
                selectedDate = new Date(weekDay);
                renderWeek();
                fetchScheduleForDate(selectedDate);
            });

            weekDaysContainer.appendChild(dayElement);
        }
    }

    async function fetchScheduleForDate(date) {
        scheduleContainer.innerHTML = '<p>Cargando horarios...</p>';
        const dateString = date.toISOString().split('T')[0];

        try {
            const scheduleResponse = await fetch(`/api/schedule?date=${dateString}`);
            const schedule = await scheduleResponse.json();
            renderSchedule(schedule, dateString);
        } catch (error) {
            console.error('Error fetching schedule:', error);
            scheduleContainer.innerHTML = '<p class="text-red-500">Error al cargar los horarios.</p>';
        }
    }

    function renderSchedule(schedule, dateString) {
        scheduleContainer.innerHTML = '';
        const timeSlots = generateTimeSlots();
        const court = courts[0]; // Assuming one court for simplicity

        timeSlots.forEach(slot => {
            const slotDateTime = new Date(`${dateString}T${slot}:00`);
            const isBooked = schedule.some(booking =>
                new Date(booking.start_time).getTime() === slotDateTime.getTime() && booking.court_id === court.id
            );

            const slotElement = document.createElement('div');
            let content = '';

            if (isBooked) {
                slotElement.className = 'relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-gray-50 dark:bg-[#15201b] border border-gray-100 dark:border-gray-800 opacity-90';
                content = `
                    <div class="flex items-center gap-4 opacity-60">
                        <div class="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-500"><span class="material-symbols-outlined">block</span></div>
                        <div>
                            <h4 class="text-lg font-bold text-gray-500 dark:text-gray-400">${slot} - ${getEndTime(slot)}</h4>
                            <p class="text-sm text-gray-400">${court.name} • ${court.type}</p>
                        </div>
                    </div>
                    <span class="text-xs text-gray-400 font-medium italic">Reservado</span>
                `;
            } else {
                 slotElement.className = 'group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md hover:border-primary/30';
                 content = `
                    <div class="flex items-center gap-4">
                         <div class="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary"><span class="material-symbols-outlined">sports_tennis</span></div>
                        <div>
                            <h4 class="text-lg font-bold text-text-main dark:text-white">${slot} - ${getEndTime(slot)}</h4>
                            <p class="text-sm text-text-secondary">${court.name} • ${court.type}</p>
                        </div>
                    </div>
                    <button data-court-id="${court.id}" data-date="${dateString}" data-slot="${slot}" class="w-full sm:w-auto mt-2 sm:mt-0 px-5 py-2.5 bg-primary hover:bg-primary-dark text-black text-sm font-bold rounded-lg transition-colors shadow-sm">
                        <span>Reservar</span>
                    </button>
                `;
            }
            slotElement.innerHTML = content;
            scheduleContainer.appendChild(slotElement);
        });
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

    function getEndTime(startTime) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        date.setMinutes(date.getMinutes() + 90);
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    scheduleContainer.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-slot]');
        if (button) {
            const { courtId, date, slot } = button.dataset;
            window.location.href = `/confirmar_reserva/code.html?courtId=${courtId}&date=${date}&slot=${slot}`;
        }
    });

    prevWeekButton.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 7);
        renderWeek();
    });

    nextWeekButton.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 7);
        renderWeek();
    });

    todayButton.addEventListener('click', () => {
        currentDate = new Date();
        selectedDate = new Date();
        renderWeek();
        fetchScheduleForDate(selectedDate);
    });

    initializeCalendar();
});
