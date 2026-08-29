class WireMarkCompare extends HTMLElement {
  connectedCallback() {
    const input = this.querySelector('input[type="range"]');
    if (!(input instanceof HTMLInputElement)) return;
    const update = () => this.style.setProperty('--reveal', `${input.value}%`);
    input.addEventListener('input', update);
    update();
  }
}

if (!customElements.get('wiremark-compare')) customElements.define('wiremark-compare', WireMarkCompare);
