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
