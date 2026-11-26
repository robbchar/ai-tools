// The visiting fox: faces left, feet on y=0, about 85 tall. Its head and leg pairs animate,
// so those groups carry no transform of their own.
export const FOX_BODY =
  '<path class="fox" d="M28 -38C70 -62 100 -34 84 -12C72 2 52 -14 36 -28Z"/>' +
  '<circle class="fox-light" cx="84" cy="-16" r="9"/>' +
  '<g class="leg-b"><rect class="fox-dark" x="22" y="-28" width="6" height="28" rx="2"/><rect class="fox-dark" x="32" y="-28" width="6" height="28" rx="2"/></g>' +
  '<ellipse class="fox" cx="12" cy="-38" rx="34" ry="16"/>' +
  '<g class="leg-a"><rect class="fox-dark" x="-16" y="-28" width="6" height="28" rx="2"/><rect class="fox-dark" x="-6" y="-28" width="6" height="28" rx="2"/></g>' +
  '<ellipse class="fox-light" cx="-14" cy="-36" rx="10" ry="11"/>' +
  '<g class="head">' +
  '<path class="fox" d="M-14 -66L-12 -82L-2 -64Z"/><path class="fox" d="M-26 -64L-28 -80L-16 -64Z"/>' +
  '<path class="fox" d="M-6 -62C-10 -48 -16 -42 -24 -40L-50 -46L-28 -66Z"/>' +
  '<path class="fox-light" d="M-50 -46L-30 -43L-22 -40L-34 -40Z"/>' +
  '<circle class="fox-dark" cx="-51" cy="-46" r="3"/><circle class="fox-dark" cx="-22" cy="-56" r="2.5"/>' +
  '</g>'
