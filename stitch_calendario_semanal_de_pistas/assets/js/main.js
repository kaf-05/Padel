document.addEventListener('DOMContentLoaded', () => {
  const headerContainer = document.createElement('header');
  document.body.prepend(headerContainer);

  const token = getCookie('token');
  let user = null;
  if (token) {
    try {
      user = JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      console.error('Error parsing token:', e);
    }
  }

  renderHeader(headerContainer, user);
});

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

function renderHeader(container, user) {
  const homeUrl = user ? "/calendario_semanal_de_pistas_2/code.html" : "/inicio_de_sesion/code.html";
  let headerHTML = `
    <div class="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center">
      <a href="${homeUrl}" class="text-2xl font-bold text-primary">Padel Booking</a>
      <div class="flex items-center">
  `;

  if (user) {
    headerHTML += `
      <span class="text-gray-800 dark:text-white mr-4">Hola, ${user.name}</span>
      <a href="/mis_reservas/code.html" class="text-primary hover:underline mr-4">Mis Reservas</a>
    `;
    if (user.role === 'admin') {
      headerHTML += `<a href="/dashboard_de_administración/code.html" class="text-primary hover:underline mr-4">Admin Dashboard</a>`;
    }
    headerHTML += `<a href="#" id="logout-btn" class="text-primary hover:underline">Salir</a>`;
  } else {
    headerHTML += `
      <a href="/inicio_de_sesion/code.html" class="text-primary hover:underline">Iniciar Sesión</a>
      <a href="/registro_de_usuario/code.html" class="ml-4 text-primary hover:underline">Registrarse</a>
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
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.href = '/inicio_de_sesion/code.html';
      } catch (error) {
        console.error('Logout failed:', error);
      }
    });
  }
}
