'use client';
import { ThemeProvider as NextThemeProvider } from 'next-themes';

const ThemeProvider = ({ children, ...props }) => {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange={false}
      {...props}
    >
      {children}
    </NextThemeProvider>
  );
};

export default ThemeProvider;