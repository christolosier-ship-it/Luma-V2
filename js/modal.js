/**
 * modal.js — Modal sheet manager
 */

const Modal = {

  show(contentHtml) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = contentHtml;
    overlay.classList.remove('hidden');

    // Close on overlay click (outside box)
    overlay.addEventListener('click', Modal._overlayClick);
  },

  hide() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('hidden');
    document.getElementById('modal-content').innerHTML = '';
    overlay.removeEventListener('click', Modal._overlayClick);
  },

  _overlayClick(e) {
    if (e.target === document.getElementById('modal-overlay')) {
      Modal.hide();
    }
  },
};
