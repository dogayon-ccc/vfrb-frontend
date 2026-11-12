import 'react';

// Lets style={{ '--i': 2 }} type-check everywhere (CSS custom properties).
declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
