export function createElementEx(type, attrs) {
  var element = document.createElement(type);
  for (const attr in attrs) {
    element.setAttribute(attr, attrs[attr]);
  }
  return element;
}

export function getIconUrl(id, isHighRes = false) {
  // ui/icon/002000/002075.tex"     for low quality
  // ui/icon/002000/002075_hr1.tex" for high quality
  //
  // v2.xivapi.com/api/asset/ui/icon/[Thousands digit of ID, padded 6 digits]/[ID, padded 6 digits]

  const thousand = id - (id % 1000);
  const paddedThousand = String(thousand).padStart(6, "0");
  const paddedId = String(id).padStart(6, "0");

  if (isHighRes) {
    return `https://v2.xivapi.com/api/asset/ui/icon/${paddedThousand}/${paddedId}_hr1.tex?format=png`;
  }
  return `https://v2.xivapi.com/api/asset/ui/icon/${paddedThousand}/${paddedId}.tex?format=png`;
}

export class CustomTable extends HTMLTableElement {
  constructor() {
    super();

    this.customHeaders = [];
    this.classList.add("table-base");
  }

  connectedCallback() {
    const colgroup = createElementEx("colgroup");
    const thead = this.createTHead();
    const headerRow = thead.insertRow(0);

    let headers = [];
    for (const headerInfo of this.customHeaders) {
      const header = new ExtendedHeader(headerInfo);
      if (header.condition()) {
        let col = createElementEx("col");
        if (header.colWidth) {
          col.style.width = `${header.colWidth}px`;
          col.style.minWidth = `${header.colWidth}px`;
        } else {
          col.style.width = `100%`;
        }

        colgroup.append(col);
        headerRow.appendChild(header);
        headers.push(header);
      }
    }
    this.customHeaders = headers;
    this.createTBody();
    this.prepend(colgroup);
  }
}

class ExtendedHeader extends HTMLTableCellElement {
  callback = () => {};
  condition = () => true;
  headerClasses = [];
  colClasses = [];
  name = "";
  colWidth = 0;

  constructor(obj) {
    super();

    for (const key of Object.keys(obj)) {
      if (key in this) {
        this[key] = obj[key];
      }
    }
  }

  connectedCallback() {
    super.textContent = this.name;
    super.classList.add(...this.headerClasses);
  }
}

if (!customElements.get("table-extended")) customElements.define("table-extended", CustomTable, { extends: "table" });
if (!customElements.get("th-extended")) customElements.define("th-extended", ExtendedHeader, { extends: "th" });
