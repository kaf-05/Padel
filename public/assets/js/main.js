
document.addEventListener('DOMContentLoaded', async () => {
  const headerContainer = document.createElement('header');
  document.body.prepend(headerContainer);

  let user = null;
  try {
    const response = await fetch('/api/me');
    if (response.ok) {
      const data = await response.json();
      user = data.user;
    }
  } catch (error) {
    console.error('Error fetching user status:', error);
  }

  renderHeader(headerContainer, user);
});

function renderHeader(container, user) {
  const homeUrl = user ? "/index.html" : "/login.html";
  let headerHTML = `
    <div class="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center">
      <a href="${homeUrl}" class="text-2xl font-bold text-primary">Padel Booking</a>
      <div class="flex items-center">
  `;

  if (user) {
    headerHTML += `
      <span class="text-gray-800 dark:text-white mr-4">Hola, ${user.name}</span>
      <a href="/reservations.html" class="text-primary hover:underline mr-4">Mis Reservas</a>
    `;
    if (user.role === 'admin') {
      headerHTML += `<a href="/admin.html" class="text-primary hover:underline mr-4">Admin Dashboard</a>`;
    }
    headerHTML += `<a href="#" id="logout-btn" class="text-primary hover:underline">Salir</a>`;
  } else {
    headerHTML += `
      <a href="/login.html" class="text-primary hover:underline">Iniciar Sesión</a>
      <a href="/register.html" class="ml-4 text-primary hover:underline">Registrarse</a>
    `;
  }

  headerHTML += `
      </div>
    </div>
  `;
  container.innerHTML = headerHTML;

  if (user) {
    document.getElementById('logout-btn').addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await fetch('/api/logout', { method: 'POST' });
        // No es necesario eliminar la cookie manualmente desde el cliente,
        // el servidor ya se encarga de invalidarla.
        window.location.href = '/login.html';
      } catch (error) {
        console.error('Logout failed:', error);
      }
    });
  }
}
