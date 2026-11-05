/**
 * Ícones do Atlassian Design System (@atlaskit/icon/core, Apache-2.0),
 * embutidos como SVG para não trazer o pacote e suas dependências para o
 * navegador. Os glifos são constantes daqui, nunca dados externos.
 *
 * Para acrescentar um ícone, copie o `dangerouslySetGlyph` de
 * `@atlaskit/icon/core/<nome>.js`.
 */
const ICONS = {
  'calendar': `<path fill="currentcolor" fill-rule="evenodd" d="M4.5 2.5v2H6v-2h4v2h1.5v-2H13a.5.5 0 0 1 .5.5v3h-11V3a.5.5 0 0 1 .5-.5zm-2 5V13a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V7.5zm9-6.5H13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1.5V0H6v1h4V0h1.5z" clip-rule="evenodd"/>`,
  'audio': `<path fill="currentcolor" fill-rule="evenodd" d="M14.746 1.188A.75.75 0 0 1 15 1.75V11a3 3 0 1 1-3-3h1.5V5.85L7 6.662V12a3 3 0 1 1-3-3h1.5V2.75a.75.75 0 0 1 .657-.744l8-1a.75.75 0 0 1 .59.182M5.5 10.5H4A1.5 1.5 0 1 0 5.5 12zM7 5.15l6.5-.812V2.6L7 3.412zm6.5 4.35H12a1.5 1.5 0 1 0 1.5 1.5z" clip-rule="evenodd"/>`,
  'people-group': `<path fill="currentcolor" fill-rule="evenodd" d="M9 4.5a2 2 0 1 1 4 0 2 2 0 0 1-4 0M11 1a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7M3 5.5a1 1 0 1 1 2 0 1 1 0 0 1-2 0M4 3a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M2.625 9A2.625 2.625 0 0 0 0 11.625V13h1.5v-1.375c0-.621.504-1.125 1.125-1.125H5V9zM6 12.5A3.5 3.5 0 0 1 9.5 9h3a3.5 3.5 0 0 1 3.5 3.5V14h-1.5v-1.5a2 2 0 0 0-2-2h-3a2 2 0 0 0-2 2V14H6z" clip-rule="evenodd"/>`,
  'office-building': `<path fill="currentcolor" fill-rule="evenodd" d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12.5h1V16H1v-1.5h1zm1.5 12.5h2v-3.75a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 .75.75v3.75h2V2a.5.5 0 0 0-.5-.5H4a.5.5 0 0 0-.5.5zm5.5 0v-3H7v3zm-2-10H5V3h2zm4 0H9V3h2zM5 6h2v1.5H5zm4 0h2v1.5H9z" clip-rule="evenodd"/>`,
  'person': `<path fill="currentcolor" fill-rule="evenodd" d="M8 1.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4 4a4 4 0 1 1 8 0 4 4 0 0 1-8 0m-2 9a3.75 3.75 0 0 1 3.75-3.75h4.5A3.75 3.75 0 0 1 14 13v2h-1.5v-2a2.25 2.25 0 0 0-2.25-2.25h-4.5A2.25 2.25 0 0 0 3.5 13v2H2z" clip-rule="evenodd"/>`,
  'add': `<path fill="currentcolor" d="M8.75 1.5v5.75h5.75v1.5H8.75v5.75h-1.5V8.75H1.5v-1.5h5.75V1.5z"/>`,
  'chevron-left': `<path fill="currentcolor" d="m9.97 1.47-6 6a.75.75 0 0 0-.052 1.004l.052.056 6 6 1.06-1.06L5.56 8l5.47-5.47z"/>`,
  'chevron-right': `<path fill="currentcolor" d="m6.03 1.47 6 6a.75.75 0 0 1 .052 1.004l-.052.056-6 6-1.06-1.06L10.44 8 4.97 2.53z"/>`,
  'log-out': `<path fill="currentcolor" fill-rule="evenodd" d="M3 2.5h5V1H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5v-1.5H3a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5m11.78 4.97-3.5-3.5-1.06 1.06 2.22 2.22H6v1.5h6.44l-2.22 2.22 1.06 1.06 3.5-3.5a.75.75 0 0 0 0-1.06" clip-rule="evenodd"/>`,
  'search': `<path fill="currentcolor" fill-rule="evenodd" d="M7 2.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9M1 7a6 6 0 1 1 10.74 3.68l3.29 3.29-1.06 1.06-3.29-3.29A6 6 0 0 1 1 7" clip-rule="evenodd"/>`,
  'edit': `<path fill="currentcolor" fill-rule="evenodd" d="M11.586.854a2 2 0 0 1 2.828 0l.732.732a2 2 0 0 1 0 2.828L10.01 9.551a2 2 0 0 1-.864.51l-3.189.91a.75.75 0 0 1-.927-.927l.91-3.189a2 2 0 0 1 .51-.864zm1.768 1.06a.5.5 0 0 0-.708 0l-.585.586L13.5 3.94l.586-.586a.5.5 0 0 0 0-.708zM12.439 5 11 3.56 7.51 7.052a.5.5 0 0 0-.128.216l-.54 1.891 1.89-.54a.5.5 0 0 0 .217-.127zM3 2.501a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V10H15v3.001a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2h3v1.5z" clip-rule="evenodd"/>`,
  'delete': `<path fill="currentcolor" fill-rule="evenodd" d="M5 .75A.75.75 0 0 1 5.75 0h4.5a.75.75 0 0 1 .75.75V2.5h3.5V4h-1v10a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V4h-1V2.5H5zM6.5 2.5h3v-1h-3zM4 4v10a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V4zm1.75 9V5.5h1.5V13zm3 0V5.5h1.5V13z" clip-rule="evenodd"/>`,
  'fullscreen-enter': `<path fill="currentcolor" fill-rule="evenodd" d="M13 2.5h-3V1h3a2 2 0 0 1 2 2v3h-1.5V3a.5.5 0 0 0-.5-.5m-10 0a.5.5 0 0 0-.5.5v3H1V3a2 2 0 0 1 2-2h3v1.5zM2.5 10v3a.5.5 0 0 0 .5.5h3V15H3a2 2 0 0 1-2-2v-3zm11 3v-3H15v3a2 2 0 0 1-2 2h-3v-1.5h3a.5.5 0 0 0 .5-.5" clip-rule="evenodd"/>`,
  'link-external': `<path fill="currentcolor" fill-rule="evenodd" d="M3 2.5a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5v-3H15v3a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h3v1.5zM10 1h4.25a.75.75 0 0 1 .75.75V6h-1.5V3.56L7.53 9.53 6.47 8.47l5.97-5.97H10z" clip-rule="evenodd"/>`,
  'cross': `<path fill="currentcolor" d="M13.53 3.53 9.06 8l4.47 4.47-1.06 1.06L8 9.06l-4.47 4.47-1.06-1.06L6.94 8 2.47 3.53l1.06-1.06L8 6.94l4.47-4.47z"/>`,
  'chevron-down': `<path fill="currentcolor" d="m14.53 6.03-6 6a.75.75 0 0 1-1.004.052l-.056-.052-6-6 1.06-1.06L8 10.44l5.47-5.47z"/>`,
  'check-mark': `<path fill="currentcolor" d="m13.959 3.97-7.25 9a.75.75 0 0 1-1.163.007l-3.5-4.25 1.158-.954 2.914 3.539 6.673-8.283z"/>`,
  'sidebar-collapse': `<path fill="currentcolor" fill-rule="evenodd" d="M2 2.5a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h2v-11zm3.5 0v11H14a.5.5 0 0 0 .5-.5V3a.5.5 0 0 0-.5-.5zM0 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm7.97 4.47 2.5-2.5 1.06 1.06L9.56 8l1.97 1.97-1.06 1.06-2.5-2.5a.75.75 0 0 1 0-1.06" clip-rule="evenodd"/>`,
  'sidebar-expand': `<path fill="currentcolor" fill-rule="evenodd" d="M14 2.5a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-.5.5h-2v-11zm-3.5 0v11H2a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5zM16 3a2 2 0 0 0-2-2H2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2zM8.03 7.47l-2.5-2.5-1.06 1.06L6.44 8 4.47 9.97l1.06 1.06 2.5-2.5a.75.75 0 0 0 0-1.06" clip-rule="evenodd"/>`,
  'filter': `<path fill="currentcolor" d="M11 12v1.5H5V12zm2-4.75v1.5H3v-1.5zm2-4.75V4H1V2.5z"/>`,
  'show-more-vertical': `<path fill="currentcolor" fill-rule="evenodd" d="M6.5 1.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0m0 6.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0m0 6.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0" clip-rule="evenodd"/>`,
  'person-add': `<path fill="currentcolor" d="M1 12.75A3.75 3.75 0 0 1 4.75 9H9v1.5H4.75a2.25 2.25 0 0 0-2.25 2.25V15H1zM9.5 4a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0M11 4a4 4 0 1 1-8 0 4 4 0 0 1 8 0m2.75 6v2.25H16v1.5h-2.25V16h-1.5v-2.25H10v-1.5h2.25V10z"/>`,
  'link': `<path fill="currentcolor" fill-rule="evenodd" d="M8.22 2.22a3.932 3.932 0 1 1 5.56 5.56l-2.25 2.25-1.06-1.06 2.25-2.25a2.432 2.432 0 0 0-3.44-3.44L7.03 5.53 5.97 4.47zm3.06 3.56-5.5 5.5-1.06-1.06 5.5-5.5zM2.22 8.22l2.25-2.25 1.06 1.06-2.25 2.25a2.432 2.432 0 0 0 3.44 3.44l2.25-2.25 1.06 1.06-2.25 2.25a3.932 3.932 0 1 1-5.56-5.56" clip-rule="evenodd"/>`,
  'person-remove': `<path fill="currentcolor" d="M1 12.75A3.75 3.75 0 0 1 4.75 9H9v1.5H4.75a2.25 2.25 0 0 0-2.25 2.25V15H1zM9.5 4a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0M11 4a4 4 0 1 1-8 0 4 4 0 0 1 8 0m4.78 7.28L14.06 13l1.72 1.72-1.06 1.06L13 14.06l-1.72 1.72-1.06-1.06L11.94 13l-1.72-1.72 1.06-1.06L13 11.94l1.72-1.72z"/>`,
  'arrow-left': `<path fill="currentcolor" fill-rule="evenodd" d="m1.22 7.47 5-5 1.06 1.06-3.72 3.72H15v1.5H3.56l3.72 3.72-1.06 1.06-5-5a.75.75 0 0 1 0-1.06" clip-rule="evenodd"/>`,
  'retry': `<path fill="currentcolor" fill-rule="evenodd" d="M1 8a7 7 0 0 1 12.5-4.33V1H15v5a.75.75 0 0 1-.75.75H9.5v-1.5h3.264a5.5 5.5 0 1 0 .665 3.63l1.482.24A7.002 7.002 0 0 1 1 8" clip-rule="evenodd"/>`,
  'text': `<path fill="currentcolor" d="M11 1v1.5H6.25V15h-1.5V2.5H0V1zm1 12V8h-2V6.5h2V4h1.5v2.5H16V8h-2.5v5a.5.5 0 0 0 .5.5h2V15h-2a2 2 0 0 1-2-2"/>`,
};

/** @param {{name: keyof typeof ICONS, size?: number}} props */
export function Icon({ name, size = 16 }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}
