document.addEventListener('DOMContentLoaded', () => {
  const addEventListenerToSelector = (selector, event, handler) => {
    document.querySelectorAll(selector).forEach((element) => {
      element.addEventListener(event, handler);
    });
  };

  const loadAndApplyCSS = (teddyId, animationCSS) => {
    if (!document.getElementById(`css-${teddyId}`)) {
      const head = document.head;
      const link = document.createElement('link');

      link.id = `css-${teddyId}`;
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = animationCSS;
      link.media = 'all';
      head.appendChild(link);

      console.log(`CSS for ${teddyId} loaded and applied.`);
    }
  };

  const startAnimationAndSound = (teddyId, image) => {
    const audio = new Audio(`/assets/sounds/${teddyId}.wav`);
    image.classList.add(`${teddyId}-animation`);
    audio.play().catch((error) => {
      console.error('Error playing audio:', error.message);
      console.error(error.stack);
    });

    console.log(`Animation and sound initiated for ${teddyId}.`);
  };

  addEventListenerToSelector('.card', 'click', function () {
    const teddyId = this.getAttribute('data-teddy-id');
    const image = document.querySelector(`#img-${teddyId}`);
    const animationCSS = `/assets/animations/${teddyId}.css`;

    loadAndApplyCSS(teddyId, animationCSS);
    startAnimationAndSound(teddyId, image);
  });
});
