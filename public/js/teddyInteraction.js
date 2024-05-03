import { addEventListenerToSelector } from './utils/eventListeners';

addEventListenerToSelector('.card', 'click', function () {
  const teddyId = this.getAttribute('data-teddy-id');
  const image = document.querySelector(`#img-${teddyId}`);
  const audio = new Audio(`/assets/sounds/${teddyId}.wav`);

  image.classList.add(`${teddyId}-animation`);
  audio.play().catch((error) => {
    console.error('Error playing audio:', error.message, error.stack);
  });
});
