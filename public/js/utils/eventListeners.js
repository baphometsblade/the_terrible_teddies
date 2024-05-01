export function addEventListenerToSelector(selector, event, handler) {
  document.querySelectorAll(selector).forEach((element) => {
    element.addEventListener(event, handler);
    console.log(
      `Added event listener for ${event} on elements matching ${selector}`
    );
  });
}
