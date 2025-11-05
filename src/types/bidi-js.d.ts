declare module 'bidi-js' {
  export function from_string(text: string, options?: { rtl?: boolean }): string;
  export const bidi: {
    from_string: (text: string, options?: { rtl?: boolean }) => string;
  };
  export default bidi;
}

