// Находим элементы по id
const avatarInput = document.getElementById('avatar-input');
const avatarPreview = document.getElementById('avatar-preview');

// Слушаем изменение поля загрузки файла
avatarInput.addEventListener('change', function (event) {
  const file = event.target.files[0];

  if (file) {
    // Создаем временный URL для локального файла и подставляем в src картинки
    avatarPreview.src = URL.createObjectURL(file);
  }
});
