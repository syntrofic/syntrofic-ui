const paths = {
  search: '<path fill-rule="evenodd" d="M3 10.5a7.5 7.5 0 1 1 13.5 4.5l4.3 4.3-1.5 1.5-4.3-4.3A7.5 7.5 0 0 1 3 10.5Zm2 0a5.5 5.5 0 1 0 11 0 5.5 5.5 0 0 0-11 0Z"/>',
  theme: '<circle cx="12" cy="12" r="4.4"/><path opacity=".72" d="M11 2h2v4h-2zm0 16h2v4h-2zM2 11h4v2H2zm16 0h4v2h-4zM4.2 5.6l1.4-1.4 2.8 2.8L7 8.4zm11.4 11.4 1.4-1.4 2.8 2.8-1.4 1.4zM4.2 18.4 7 15.6 8.4 17l-2.8 2.8ZM15.6 7l2.8-2.8 1.4 1.4L17 8.4Z"/>',
  moon: '<path d="M17.7 15.3A7.8 7.8 0 0 1 10 5.1l.5-1.6A8.9 8.9 0 1 0 20.5 14l-1.4.8a5 5 0 0 1-1.4.5Z"/><path opacity=".56" d="m16.5 3 .9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9Z"/>',
  menu: '<rect x="4" y="6" width="16" height="2" rx="1"/><rect x="4" y="11" width="16" height="2" rx="1"/><rect x="4" y="16" width="11" height="2" rx="1"/>',
  close: '<path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4Z"/>',
  layout: '<rect x="3" y="4" width="18" height="16" rx="3" opacity=".22"/><path d="M6 4h12a3 3 0 0 1 3 3v2H3V7a3 3 0 0 1 3-3Zm-3 7h6v9H6a3 3 0 0 1-3-3Z"/>',
  chart: '<rect x="4" y="12" width="4" height="8" rx="1.5" opacity=".42"/><rect x="10" y="8" width="4" height="12" rx="1.5" opacity=".68"/><rect x="16" y="4" width="4" height="16" rx="1.5"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="3" opacity=".22"/><path d="M6 4h12a3 3 0 0 1 3 3v2H3V7a3 3 0 0 1 3-3Z"/><path opacity=".65" d="M5.5 11h3v2.5h-3zm5 0h3v2.5h-3zm5 0h3v2.5h-3zm-10 4.5h3V18h-3zm5 0h3V18h-3zm5 0h3V18h-3Z"/>',
  form: '<rect x="5" y="3" width="14" height="18" rx="3" opacity=".22"/><rect x="8" y="7" width="8" height="2" rx="1"/><rect x="8" y="11" width="8" height="2" rx="1"/><rect x="8" y="15" width="5" height="2" rx="1"/>',
  message: '<path fill-rule="evenodd" d="M3 6.5A3.5 3.5 0 0 1 6.5 3h11A3.5 3.5 0 0 1 21 6.5v7a3.5 3.5 0 0 1-3.5 3.5H11l-5 4v-4.1a3.5 3.5 0 0 1-3-3.4Zm4 2v2h10v-2Zm0 4v2h6v-2Z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3" opacity=".22"/><path d="m3 16 5-5 4 4 3-3 6 5v.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5Z"/><circle cx="15.5" cy="8.5" r="1.5"/>',
  native: '<path fill-rule="evenodd" d="M6 5.5A2.5 2.5 0 0 1 8.5 3h7A2.5 2.5 0 0 1 18 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 18.5Zm2 1v10h8v-10Zm2.5 12v1h3v-1Z"/><path opacity=".52" d="m9 13 2-4 2 3 2-2v5H9Z"/>',
  vue: '<path d="M2 5h5.3L12 12.7 16.7 5H22L12 21Z"/><path opacity=".52" d="M7.3 5h2.9l1.8 3 1.8-3h2.9L12 12.7Z"/>',
  palette: '<circle cx="9" cy="9" r="5" opacity=".48"/><circle cx="15" cy="9" r="5" opacity=".76"/><circle cx="12" cy="15" r="5"/>',
  spark: '<path d="m10 3 2.1 4.9L17 10l-4.9 2.1L10 17l-2.1-4.9L3 10l4.9-2.1Z"/><path opacity=".57" d="m17.5 11 1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5Z"/>',
  cube: '<path d="m12 3 9 4.5-9 4.6-9-4.6Z"/><path opacity=".74" d="m3 9.4 8 4v8l-8-4Z"/><path opacity=".43" d="m21 9.4-8 4v8l8-4Z"/>',
  code: '<path d="m7.6 6 1.5 1.5L4.6 12l4.5 4.5L7.6 18l-6-6Zm8.8 0 6 6-6 6-1.5-1.5 4.5-4.5-4.5-4.5Z"/><path opacity=".52" d="m12.6 4 2 .5-3.2 15.5-2-.5Z"/>',
}

export function icon(name) {
  if (!Object.hasOwn(paths, name)) throw new Error('Unknown site icon ' + name)
  return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${paths[name]}</svg>`
}
