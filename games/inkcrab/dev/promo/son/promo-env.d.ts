declare module '*?url' {
  const url: string;
  export default url;
}

interface ImportMeta {
  /** Vite's eager glob import (only the form dewy.ts uses). */
  glob(pattern: string, options: { eager: true; query: string; import: 'default' }): Record<string, string>;
}
