export interface GuideChannel {
  id: string;
  name: string;
}

interface GuideOptions {
  button: HTMLElement;
  overlay: HTMLElement;
  list: HTMLElement;
  channels: GuideChannel[];
  onSelect: (index: number) => void;
}

export const createGuide = ({
  button,
  overlay,
  list,
  channels,
  onSelect,
}: GuideOptions) => {
  const isOpen = (): boolean => overlay.classList.contains('open');

  const rows = channels.map((channel, index) => {
    const row = document.createElement('button');
    row.className = 'guide-row';
    row.innerHTML = `
      <span class="guide-number">${String(index + 1).padStart(2, '0')}</span>
      <img src="${import.meta.env.BASE_URL}thumbnails/${channel.id}.png" alt="" />
      <span class="guide-name">${channel.name}</span>
      <span class="guide-now">on now</span>
    `;
    row.addEventListener('click', () => {
      close();
      onSelect(index);
    });
    list.appendChild(row);
    return row;
  });

  const setCurrent = (index: number): void => {
    rows.forEach((row, rowIndex) => {
      row.classList.toggle('current', rowIndex === index);
    });
  };

  const _setOpen = (open: boolean): void => {
    overlay.classList.toggle('open', open);
    overlay.inert = !open;
    overlay.setAttribute('aria-hidden', String(!open));
    button.setAttribute('aria-expanded', String(open));
  };

  const open = (): void => {
    _setOpen(true);
    (rows.find((row) => row.classList.contains('current')) ?? rows[0]).focus();
  };

  const close = (): void => {
    if (!isOpen()) return;
    _setOpen(false);
    button.focus();
  };

  const _moveFocus = (step: number): void => {
    const focused = rows.indexOf(document.activeElement as HTMLButtonElement);
    rows[(focused + step + rows.length) % rows.length].focus();
  };

  button.addEventListener('click', () => (isOpen() ? close() : open()));

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      _moveFocus(e.key === 'ArrowDown' ? 1 : -1);
    }
  });

  _setOpen(false);

  return { isOpen, setCurrent };
};
