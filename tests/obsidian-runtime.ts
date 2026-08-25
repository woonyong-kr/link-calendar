export class TFile {
  basename = "";
  extension = "md";
  parent: TFolder | null = null;
  path = "";
}

export class TFolder {
  children: (TFile | TFolder)[] = [];
  name = "";
  path = "";
}

export class ItemView {
  contentEl = document.createElement("div");

  constructor(public leaf: unknown) {}

  registerDomEvent(
    target: EventTarget,
    type: string,
    callback: EventListenerOrEventListenerObject,
  ): void {
    target.addEventListener(type, callback);
  }
}

class MenuItem {
  onClick(_action: () => void): this {
    return this;
  }

  setIcon(_icon: string): this {
    return this;
  }

  setTitle(_title: string): this {
    return this;
  }
}

export class Menu {
  addItem(configure: (item: MenuItem) => void): this {
    configure(new MenuItem());
    return this;
  }

  showAtMouseEvent(_event: MouseEvent): void {}
}

export function setIcon(element: HTMLElement, icon: string): void {
  element.dataset.icon = icon;
}
