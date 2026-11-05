const VISIBLE_MS = 3000;

export const createOsd = (element: HTMLElement) => {
  const number = element.querySelector<HTMLElement>('.osd-number')!;
  const name = element.querySelector<HTMLElement>('.osd-name')!;
  const hint = element.querySelector<HTMLElement>('.osd-hint')!;
  let hideTimer: number | undefined;

  const show = (
    channel: number,
    channelName: string,
    channelHint = ''
  ): void => {
    number.textContent = `CH ${String(channel).padStart(2, '0')}`;
    name.textContent = channelName;
    hint.textContent = channelHint;
    element.classList.add('visible');

    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(
      () => element.classList.remove('visible'),
      VISIBLE_MS
    );
  };

  return { show };
};
