export function createElementEx(type, attrs) {
  var element = document.createElement(type);
  for (const attr in attrs) {
    element.setAttribute(attr, attrs[attr]);
  }
  return element;
}
