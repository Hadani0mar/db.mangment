declare module 'arabic-reshaper' {
  export function reshape(text: string): string;
  const arabicReshaper: {
    reshape: (text: string) => string;
  };
  export default arabicReshaper;
}

